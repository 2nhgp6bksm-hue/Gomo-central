import legacyWorker from "./worker-v1.14.js";

const CORE_VERSION = "0.1.0-test";
const MAX_LASTINTEL_BYTES = 1_000_000;
const MAX_LASTRANK_BYTES = 1_500_000;

const DEFAULTS = Object.freeze({
  allianceAbbr: "GoMo",
  allianceName: "God venoM",
  allianceId: "26227dc9fb2945edaee8c7675c8fed5d",
  serverId: 1591,
  lastRankUrl: "https://www.lastrank.fun/a/26227dc9fb2945edaee8c7675c8fed5d",
  lastIntelEndpoint: "https://mcp.lastintel.io/",
  lastIntelWebBase: "https://lastintel.io/",
  lastIntelAllianceId: "jzpvMwRRgPkPWtOgEraW9g",
});

class SourceError extends Error {
  constructor(source, message) {
    super(message);
    this.name = "SourceError";
    this.source = source;
  }
}

function getConfig(env = {}) {
  return {
    allianceAbbr: env.ALLIANCE_ABBR || DEFAULTS.allianceAbbr,
    allianceName: env.ALLIANCE_NAME || DEFAULTS.allianceName,
    allianceId: env.ALLIANCE_ID || DEFAULTS.allianceId,
    serverId: positiveInteger(env.SERVER_ID, DEFAULTS.serverId),
    lastRankUrl: httpsUrl(env.LASTRANK_URL || DEFAULTS.lastRankUrl, "LASTRANK_URL"),
    lastIntelEndpoint: httpsUrl(env.LASTINTEL_MCP_URL || DEFAULTS.lastIntelEndpoint, "LASTINTEL_MCP_URL"),
    lastIntelWebBase: httpsUrl(env.LASTINTEL_WEB_BASE || DEFAULTS.lastIntelWebBase, "LASTINTEL_WEB_BASE"),
    lastIntelAllianceId: env.LASTINTEL_ALLIANCE_ID || DEFAULTS.lastIntelAllianceId,
  };
}

function httpsUrl(value, label) {
  const url = new URL(String(value));
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS`);
  return url.toString();
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function fetchBoundedText(url, options, { source, maxBytes, timeoutMs = 25_000, acceptedTypes = [] }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      if (response.body) await response.body.cancel();
      throw new SourceError(source, `${source} HTTP ${response.status}`);
    }
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (acceptedTypes.length && !acceptedTypes.some((type) => contentType.includes(type))) {
      if (response.body) await response.body.cancel();
      throw new SourceError(source, `${source} returned an unexpected content type`);
    }
    const announced = Number(response.headers.get("content-length") || 0);
    if (announced > maxBytes) {
      if (response.body) await response.body.cancel();
      throw new SourceError(source, `${source} response is larger than the safety limit`);
    }
    if (!response.body) return "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new SourceError(source, `${source} response exceeded the safety limit`);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    if (error instanceof SourceError) throw error;
    if (error?.name === "AbortError") throw new SourceError(source, `${source} request timed out`);
    throw new SourceError(source, `${source} request failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function callLastIntel(endpoint, name, args, id) {
  const allowed = new Set(["get_alliance", "get_alliance_history"]);
  if (!allowed.has(name)) throw new SourceError("LastIntel", `Tool not allowed: ${name}`);
  const text = await fetchBoundedText(endpoint, {
    method: "POST",
    headers: { Accept: "application/json, text/event-stream", "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } }),
  }, {
    source: "LastIntel",
    maxBytes: MAX_LASTINTEL_BYTES,
    acceptedTypes: ["application/json", "text/event-stream"],
  });

  const message = parseMcpMessage(text);
  if (message.error) throw new SourceError("LastIntel", message.error.message || "MCP error");
  if (message.result?.isError) throw new SourceError("LastIntel", extractTextError(message.result.content) || "Tool failed");
  if (!message.result || message.result.structuredContent == null) throw new SourceError("LastIntel", "No structured data");
  return message.result.structuredContent;
}

function parseMcpMessage(text) {
  try {
    return JSON.parse(text);
  } catch {
    const messages = text.split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean)
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
    const response = messages.find((message) => message.result || message.error);
    if (response) return response;
    throw new SourceError("LastIntel", "Invalid MCP response");
  }
}

function extractTextError(content) {
  return Array.isArray(content) ? content.find((entry) => entry?.type === "text")?.text || null : null;
}

async function fetchLastIntel(config) {
  const [alliance, history] = await Promise.all([
    callLastIntel(config.lastIntelEndpoint, "get_alliance", { allianceId: config.lastIntelAllianceId }, 1),
    callLastIntel(config.lastIntelEndpoint, "get_alliance_history", { allianceId: config.lastIntelAllianceId, hours: 168, stat: "power" }, 2),
  ]);
  if (!alliance || String(alliance.id) !== String(config.lastIntelAllianceId)) throw new SourceError("LastIntel", "Different alliance returned");
  if (Number(alliance.serverId) !== Number(config.serverId)) throw new SourceError("LastIntel", "Different server returned");
  if (String(alliance.tag || "").toLowerCase() !== config.allianceAbbr.toLowerCase()) throw new SourceError("LastIntel", "Different alliance tag returned");
  if (!Array.isArray(alliance.roster) || !alliance.roster.length || alliance.roster.length > 100) throw new SourceError("LastIntel", "Invalid roster");

  const points = Array.isArray(history?.points) ? history.points : [];
  const latest = points.reduce((best, point) => {
    const iso = validIso(point?.observedAt);
    if (!iso) return best;
    return !best || Date.parse(iso) > Date.parse(best) ? iso : best;
  }, null);

  return {
    source: "lastintel",
    updatedAt: latest,
    alliance: {
      id: String(alliance.id),
      abbreviation: alliance.tag,
      name: alliance.name,
      serverId: Number(alliance.serverId),
      totalPower: safeInteger(alliance.power),
      memberCount: safeInteger(alliance.curMember),
    },
    members: alliance.roster.map((member) => normalizeLastIntelMember(member, config.lastIntelWebBase)),
    diagnostics: { historyAvailable: Boolean(history?.hasHistory && points.length), historyPointCount: points.length },
  };
}

function normalizeLastIntelMember(member, webBase) {
  const metrics = member?.metrics && typeof member.metrics === "object" ? member.metrics : {};
  const uid = textOrNull(member?.uid);
  const avatarPath = textOrNull(member?.avatarUrl);
  return {
    sourceId: uid,
    name: textOrNull(member?.name) || "Unknown commander",
    rank: normalizeRank(member?.rank),
    hq: safeInteger(metrics.hq),
    power: safeInteger(member?.power),
    alternatePower: safeInteger(metrics.power),
    heroPower: safeInteger(metrics.heroPower),
    armyPower: safeInteger(metrics.armyPower),
    buildingPower: safeInteger(metrics.buildingPower),
    kills: safeInteger(member?.kills ?? metrics.kills),
    country: textOrNull(member?.country),
    avatarUrl: avatarPath ? new URL(avatarPath, webBase).toString() : null,
  };
}

async function fetchLastRank(config) {
  const html = await fetchBoundedText(config.lastRankUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; GoMoCore/0.1; +https://github.com/)",
    },
  }, {
    source: "LastRank",
    maxBytes: MAX_LASTRANK_BYTES,
    acceptedTypes: ["text/html", "application/xhtml+xml"],
  });

  const parsed = parseLastRankPage(html, config);
  const reported = parsed.alliance.memberCount || parsed.members.length;
  const required = Math.max(Math.min(20, reported), Math.floor(reported * 0.7));
  if (!parsed.members.length || parsed.members.length > 100 || parsed.members.length < Math.max(1, required)) {
    throw new SourceError("LastRank", `Partial or invalid roster (${parsed.members.length}/${reported})`);
  }
  const summedPower = parsed.members.reduce((sum, member) => sum + (member.power || 0), 0);
  const published = parsed.alliance.totalPower;
  if (!Number.isSafeInteger(published) || published <= 0) throw new SourceError("LastRank", "Invalid alliance power");
  if (summedPower > 0) {
    const ratio = published / summedPower;
    if (ratio < 0.7 || ratio > 1.3) throw new SourceError("LastRank", "Alliance power does not match roster");
  }
  return { source: "lastrank", updatedAt: parsed.sourceUpdatedAt, alliance: parsed.alliance, members: parsed.members, diagnostics: parsed.diagnostics };
}

function parseLastRankPage(html, expected) {
  if (typeof html !== "string" || html.length < 100) throw new SourceError("LastRank", "Empty or invalid page");
  const organizations = extractJsonLd(html).filter((entry) => entry && entry["@type"] === "Organization");
  const organization = selectOrganization(organizations, expected.allianceId);
  const flight = extractNextFlightData(html);
  const rawMembers = selectBestMemberArray(extractMemberCandidates(flight));
  if (!rawMembers) throw new SourceError("LastRank", "No complete member list found");
  const members = normalizeLastRankMembers(rawMembers);
  if (!members.length) throw new SourceError("LastRank", "Member list is empty");
  const description = extractDescription(html);
  const allianceId = textOrNull(organization?.identifier) || expected.allianceId;
  const allianceName = textOrNull(organization?.name) || expected.allianceName;
  const allianceAbbr = textOrNull(organization?.alternateName) || expected.allianceAbbr;
  const memberCount = positiveIntegerOrNull(organization?.numberOfEmployees)
    || extractInteger(flight, /"member_count":(\d+)/)
    || extractInteger(description, /(\d+)\s+(?:members?|membres?)/i)
    || members.length;
  const serverId = extractInteger(description, /server\s*#?\s*(\d+)/i)
    || extractInteger(flight, /"serverId":(\d+)/)
    || extractInteger(flight, /"server_id":(\d+)/)
    || expected.serverId;
  if (expected.allianceId && allianceId && allianceId !== expected.allianceId) throw new SourceError("LastRank", "Different alliance returned");
  if (expected.serverId && serverId && Number(serverId) !== Number(expected.serverId)) throw new SourceError("LastRank", "Different server returned");
  const publishedPower = extractPublishedPower(description, flight);
  const summedPower = members.reduce((total, member) => total + member.power, 0);
  return {
    alliance: { id: allianceId, abbreviation: allianceAbbr, name: allianceName, serverId: Number(serverId), totalPower: publishedPower || summedPower, memberCount, listedMemberCount: members.length },
    members,
    sourceUpdatedAt: extractSourceUpdatedAt(flight),
    diagnostics: { publishedPower, summedPower, memberCountMismatch: memberCount !== members.length },
  };
}

function extractJsonLd(html) {
  const results = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    try {
      const parsed = JSON.parse(decodeHtmlEntities(match[1].trim()));
      if (Array.isArray(parsed)) results.push(...parsed); else results.push(parsed);
    } catch {}
  }
  return results;
}

function selectOrganization(organizations, expectedId) {
  return organizations.find((entry) => String(entry.identifier ?? "") === String(expectedId)) || organizations[0] || null;
}

function extractNextFlightData(html) {
  const marker = "self.__next_f.push(";
  let cursor = 0;
  let flight = "";
  while (cursor < html.length) {
    const markerIndex = html.indexOf(marker, cursor);
    if (markerIndex === -1) break;
    const valueStart = markerIndex + marker.length;
    const value = readBalancedJson(html, valueStart);
    if (!value) { cursor = valueStart; continue; }
    try {
      const chunk = JSON.parse(value.text);
      if (chunk[0] === 1 && typeof chunk[1] === "string") flight += chunk[1];
    } catch {}
    cursor = value.end;
  }
  return flight;
}

function extractMemberCandidates(flight) {
  const candidates = [];
  const marker = '"members":';
  let cursor = 0;
  while (cursor < flight.length) {
    const markerIndex = flight.indexOf(marker, cursor);
    if (markerIndex === -1) break;
    let valueStart = markerIndex + marker.length;
    while (/\s/.test(flight[valueStart] || "")) valueStart += 1;
    if (flight[valueStart] === "[") {
      const value = readBalancedJson(flight, valueStart);
      if (value) {
        try { const parsed = JSON.parse(value.text); if (Array.isArray(parsed)) candidates.push(parsed); } catch {}
        cursor = value.end;
        continue;
      }
    }
    cursor = valueStart + 1;
  }
  return candidates;
}

function selectBestMemberArray(candidates) {
  let best = null;
  let bestScore = -1;
  for (const candidate of candidates) {
    const validRows = candidate.filter((row) => row && typeof row === "object" && typeof row.name === "string" && Number.isFinite(Number(row.power)) && (row.public_id != null || row.player_uid != null)).length;
    const score = validRows * 1000 + candidate.length;
    if (validRows > 0 && score > bestScore) { best = candidate; bestScore = score; }
  }
  return best;
}

function normalizeLastRankMembers(rows) {
  const bySourceId = new Map();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const sourceId = textOrNull(row.public_id ?? row.player_uid);
    const name = textOrNull(row.name);
    const power = positiveIntegerOrNull(row.power);
    if (!sourceId || !name || power == null) continue;
    const member = { sourceId, name, rank: normalizeRank(row.alliance_rank ?? row.rank), hq: positiveIntegerOrNull(row.base_level ?? row.hq), power, heroPower: positiveIntegerOrNull(row.hero_power) };
    const existing = bySourceId.get(sourceId);
    if (!existing || completeness(member) > completeness(existing)) bySourceId.set(sourceId, member);
  }
  return [...bySourceId.values()].sort((a, b) => b.power - a.power || a.name.localeCompare(b.name));
}

function completeness(member) {
  return [member.rank, member.hq, member.heroPower].filter((value) => value != null).length;
}

function extractDescription(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attributes = {};
    const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let match;
    while ((match = pattern.exec(tag))) attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
    const key = (attributes.name || attributes.property || "").toLowerCase();
    if ((key === "description" || key === "og:description") && attributes.content) return decodeHtmlEntities(attributes.content);
  }
  return "";
}

function extractPublishedPower(description, flight) {
  const descriptionMatch = description.match(/([0-9][0-9,.\s\u00a0]{5,})\s+(?:power|puissance)/i);
  if (descriptionMatch) {
    const value = digitsToInteger(descriptionMatch[1]);
    if (value) return value;
  }
  const cardMatch = flight.match(/"title":"(?:Fightpower|Fight power|Puissance de combat)"[\s\S]{0,8000}?"currentValue":(\d+)/i);
  return cardMatch ? positiveIntegerOrNull(cardMatch[1]) : null;
}

function extractSourceUpdatedAt(flight) {
  const match = flight.match(/"tKey":"header\.seen","iso":"([^"]+)"/);
  return match ? validIso(match[1]) : null;
}

function readBalancedJson(text, start) {
  const opening = text[start];
  if (opening !== "[" && opening !== "{") return null;
  const closing = opening === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false; else if (character === "\\") escaped = true; else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') { inString = true; continue; }
    if (character === opening) depth += 1;
    if (character === closing && --depth === 0) return { text: text.slice(start, index + 1), end: index + 1 };
  }
  return null;
}

function extractInteger(text, pattern) {
  const match = text?.match(pattern);
  return match ? positiveIntegerOrNull(match[1]) : null;
}

function digitsToInteger(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits ? positiveIntegerOrNull(digits) : null;
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function normalizeName(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function reconcile(lastIntel, lastRank, errors = {}) {
  const entities = [];
  const byName = new Map();
  const addNameIndex = (entity, name) => {
    const key = normalizeName(name);
    if (!key) return;
    const list = byName.get(key) || [];
    if (!list.includes(entity)) list.push(entity);
    byName.set(key, list);
  };

  for (const member of lastIntel?.members || []) {
    const entity = { provisionalId: member.sourceId ? `li:${member.sourceId}` : `name:${normalizeName(member.name)}`, lastIntel: member, lastRank: null, matchMethod: "lastintel_source" };
    entities.push(entity);
    addNameIndex(entity, member.name);
  }

  for (const member of lastRank?.members || []) {
    const matches = byName.get(normalizeName(member.name)) || [];
    const target = matches.length === 1 && !matches[0].lastRank ? matches[0] : null;
    if (target) {
      target.lastRank = member;
      target.matchMethod = "exact_normalized_name";
    } else {
      const entity = { provisionalId: member.sourceId ? `lr:${member.sourceId}` : `name:${normalizeName(member.name)}`, lastIntel: null, lastRank: member, matchMethod: matches.length > 1 ? "ambiguous_name" : "lastrank_only" };
      entities.push(entity);
      addNameIndex(entity, member.name);
    }
  }

  const liTime = validIso(lastIntel?.updatedAt);
  const lrTime = validIso(lastRank?.updatedAt);
  const freshest = sourceFreshest(liTime, lrTime);
  const members = entities.map((entity) => finalizeMember(entity, { liTime, lrTime, freshest }));
  members.sort((a, b) => (b.canonical.power || 0) - (a.canonical.power || 0) || a.name.localeCompare(b.name));

  const conflicts = members.filter((member) => member.flags.some((flag) => flag.endsWith("_conflict")) || member.flags.includes("ambiguous_name")).length;
  const matched = members.filter((member) => member.sources.lastIntel && member.sources.lastRank).length;
  return {
    coreVersion: CORE_VERSION,
    generatedAt: new Date().toISOString(),
    mode: "read_only_test",
    alliance: {
      abbreviation: lastIntel?.alliance?.abbreviation || lastRank?.alliance?.abbreviation || DEFAULTS.allianceAbbr,
      name: lastIntel?.alliance?.name || lastRank?.alliance?.name || DEFAULTS.allianceName,
      serverId: lastIntel?.alliance?.serverId || lastRank?.alliance?.serverId || DEFAULTS.serverId,
    },
    policy: {
      hq: "LastIntel prioritaire; LastRank en secours; conflit visible",
      power: "source la plus fraîche; conflit visible",
      rank: "accord des sources si possible; LastIntel sinon avec vérification",
      deletion: "aucune suppression automatique de membre",
      writesToOtherSites: false,
    },
    freshness: { lastIntel: liTime, lastRank: lrTime, freshest },
    sources: {
      lastIntel: sourceSummary(lastIntel, errors.lastIntel),
      lastRank: sourceSummary(lastRank, errors.lastRank),
    },
    summary: { unionMembers: members.length, matchedBothSources: matched, conflicts, reviewRequired: conflicts },
    members,
  };
}

function finalizeMember(entity, freshness) {
  const li = entity.lastIntel;
  const lr = entity.lastRank;
  const flags = [];
  if (!li) flags.push("missing_lastintel");
  if (!lr) flags.push("missing_lastrank");
  if (entity.matchMethod === "ambiguous_name") flags.push("ambiguous_name");

  const hq = choosePriorityField("hq", li?.hq, lr?.hq, "lastIntel", flags);
  const rank = choosePriorityField("rank", li?.rank, lr?.rank, "lastIntel", flags);
  const power = chooseFreshField("power", li?.power, lr?.power, freshness, flags);
  const heroPower = chooseFreshField("hero_power", li?.heroPower, lr?.heroPower, freshness, flags);
  const confidence = confidenceScore({ entity, fields: [hq, rank, power, heroPower], flags });

  return {
    provisionalId: entity.provisionalId,
    name: li?.name || lr?.name || "Member",
    normalizedName: normalizeName(li?.name || lr?.name),
    matchMethod: entity.matchMethod,
    canonical: {
      hq: hq.value,
      rank: rank.value,
      power: power.value,
      heroPower: heroPower.value,
      kills: li?.kills ?? null,
      country: li?.country ?? null,
      avatarUrl: li?.avatarUrl ?? null,
    },
    confidence: { score: confidence, level: confidence >= 90 ? "high" : confidence >= 70 ? "medium" : "review" },
    fieldSources: { hq: hq.source, rank: rank.source, power: power.source, heroPower: heroPower.source },
    flags,
    sources: {
      lastIntel: li ? { ...li, observedAt: freshness.liTime } : null,
      lastRank: lr ? { ...lr, observedAt: freshness.lrTime } : null,
    },
  };
}

function choosePriorityField(label, primaryValue, fallbackValue, primarySource, flags) {
  if (primaryValue != null && fallbackValue != null && primaryValue !== fallbackValue) flags.push(`${label}_conflict`);
  if (primaryValue != null) return { value: primaryValue, source: primarySource };
  if (fallbackValue != null) return { value: fallbackValue, source: "lastRank" };
  return { value: null, source: null };
}

function chooseFreshField(label, liValue, lrValue, freshness, flags) {
  if (liValue != null && lrValue != null && liValue !== lrValue) flags.push(`${label}_conflict`);
  if (liValue == null && lrValue == null) return { value: null, source: null };
  if (liValue == null) return { value: lrValue, source: "lastRank" };
  if (lrValue == null) return { value: liValue, source: "lastIntel" };
  if (freshness.freshest === "lastRank") return { value: lrValue, source: "lastRank" };
  return { value: liValue, source: "lastIntel" };
}

function sourceFreshest(liTime, lrTime) {
  if (liTime && lrTime) return Date.parse(liTime) >= Date.parse(lrTime) ? "lastIntel" : "lastRank";
  if (liTime) return "lastIntel";
  if (lrTime) return "lastRank";
  return null;
}

function confidenceScore({ entity, fields, flags }) {
  let score = entity.lastIntel && entity.lastRank ? 90 : 72;
  for (const field of fields) if (field.value == null) score -= 4;
  score -= flags.filter((flag) => flag.endsWith("_conflict")).length * 8;
  if (flags.includes("ambiguous_name")) score -= 25;
  if (entity.lastIntel && entity.lastRank) {
    const comparisons = ["hq", "rank", "power", "heroPower"];
    const agreements = comparisons.filter((key) => entity.lastIntel[key] != null && entity.lastRank[key] != null && entity.lastIntel[key] === entity.lastRank[key]).length;
    score += agreements * 2;
  }
  return Math.max(0, Math.min(100, score));
}

function sourceSummary(snapshot, error) {
  return {
    ok: Boolean(snapshot),
    memberCount: snapshot?.members?.length || 0,
    updatedAt: snapshot?.updatedAt || null,
    error: error ? publicError(error) : null,
  };
}

async function collectLiveReport(env) {
  const config = getConfig(env);
  const [liResult, lrResult] = await Promise.allSettled([fetchLastIntel(config), fetchLastRank(config)]);
  const lastIntel = liResult.status === "fulfilled" ? liResult.value : null;
  const lastRank = lrResult.status === "fulfilled" ? lrResult.value : null;
  const errors = {
    lastIntel: liResult.status === "rejected" ? liResult.reason : null,
    lastRank: lrResult.status === "rejected" ? lrResult.reason : null,
  };
  if (!lastIntel && !lastRank) throw new SourceError("GoMo Core", `Both sources failed: ${publicError(errors.lastIntel)}; ${publicError(errors.lastRank)}`);
  return reconcile(lastIntel, lastRank, errors);
}

async function schemaReady(db) {
  if (!db) return false;
  try {
    const row = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='core_sync_runs'").first();
    return Boolean(row?.name);
  } catch {
    return false;
  }
}

async function lastSync(db) {
  if (!db || !(await schemaReady(db))) return null;
  try {
    return await db.prepare("SELECT sync_id, started_at, completed_at, status, lastintel_status, lastrank_status, reconciled_members FROM core_sync_runs ORDER BY started_at DESC LIMIT 1").first();
  } catch {
    return null;
  }
}

async function resolveGomoId(db, member) {
  for (const pair of [["lastintel", member.sources.lastIntel?.sourceId], ["lastrank", member.sources.lastRank?.sourceId]]) {
    if (!pair[1]) continue;
    const linked = await db.prepare("SELECT gomo_id FROM core_source_links WHERE source=? AND source_member_id=?").bind(pair[0], String(pair[1])).first();
    if (linked?.gomo_id) return linked.gomo_id;
  }
  if (member.normalizedName) {
    const aliases = await db.prepare("SELECT DISTINCT gomo_id FROM core_member_aliases WHERE normalized_alias=? LIMIT 2").bind(member.normalizedName).all();
    if ((aliases.results || []).length === 1) return aliases.results[0].gomo_id;
  }
  return `gomo_${crypto.randomUUID()}`;
}

async function persistReport(db, report) {
  if (!db) throw new Error("CORE_DB binding is missing");
  if (!(await schemaReady(db))) throw new Error("GoMo Core schema is not installed");
  const syncId = `sync_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const startedAt = new Date().toISOString();
  await db.prepare("INSERT INTO core_sync_runs(sync_id,started_at,status,lastintel_status,lastrank_status,lastintel_members,lastrank_members,reconciled_members) VALUES(?,?,?,?,?,?,?,?)")
    .bind(syncId, startedAt, "running", report.sources.lastIntel.ok ? "ok" : "error", report.sources.lastRank.ok ? "ok" : "error", report.sources.lastIntel.memberCount, report.sources.lastRank.memberCount, report.members.length).run();

  for (const member of report.members) {
    const gomoId = await resolveGomoId(db, member);
    const now = report.generatedAt;
    await db.batch([
      db.prepare("INSERT INTO core_members(gomo_id,current_name,normalized_name,active,created_at,updated_at) VALUES(?,?,?,1,?,?) ON CONFLICT(gomo_id) DO UPDATE SET current_name=excluded.current_name, normalized_name=excluded.normalized_name, updated_at=excluded.updated_at")
        .bind(gomoId, member.name, member.normalizedName, now, now),
      db.prepare("INSERT INTO core_member_aliases(gomo_id,alias,normalized_alias,source,first_seen,last_seen) VALUES(?,?,?,?,?,?) ON CONFLICT(gomo_id,normalized_alias) DO UPDATE SET alias=excluded.alias,last_seen=excluded.last_seen")
        .bind(gomoId, member.name, member.normalizedName, "core", now, now),
      db.prepare("INSERT INTO core_canonical_snapshots(sync_id,gomo_id,name,rank,hq,power,hero_power,kills,avatar_url,confidence,confidence_level,flags_json,field_sources_json,observed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(syncId, gomoId, member.name, member.canonical.rank, member.canonical.hq, member.canonical.power, member.canonical.heroPower, member.canonical.kills, member.canonical.avatarUrl, member.confidence.score, member.confidence.level, JSON.stringify(member.flags), JSON.stringify(member.fieldSources), now),
    ]);

    for (const [source, observation] of [["lastintel", member.sources.lastIntel], ["lastrank", member.sources.lastRank]]) {
      if (!observation) continue;
      await db.batch([
        db.prepare("INSERT INTO core_source_links(source,source_member_id,gomo_id,first_seen,last_seen) VALUES(?,?,?,?,?) ON CONFLICT(source,source_member_id) DO UPDATE SET gomo_id=excluded.gomo_id,last_seen=excluded.last_seen")
          .bind(source, String(observation.sourceId || member.normalizedName), gomoId, now, now),
        db.prepare("INSERT INTO core_source_observations(sync_id,gomo_id,source,source_member_id,name,rank,hq,power,hero_power,kills,avatar_url,observed_at,fetched_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
          .bind(syncId, gomoId, source, String(observation.sourceId || member.normalizedName), observation.name, observation.rank, observation.hq, observation.power, observation.heroPower, observation.kills ?? null, observation.avatarUrl ?? null, observation.observedAt ?? null, now),
      ]);
    }
  }

  await db.prepare("UPDATE core_sync_runs SET completed_at=?,status='ok',reconciled_members=? WHERE sync_id=?")
    .bind(new Date().toISOString(), report.members.length, syncId).run();
  await db.prepare("INSERT INTO core_audit_log(event_type,details_json,created_at) VALUES('sync_completed',?,?)")
    .bind(JSON.stringify({ syncId, sources: report.sources, summary: report.summary }), new Date().toISOString()).run();
  return { syncId, members: report.members.length };
}

async function readStoredMembers(db) {
  if (!db || !(await schemaReady(db))) return null;
  const sync = await db.prepare("SELECT sync_id,completed_at FROM core_sync_runs WHERE status='ok' ORDER BY completed_at DESC LIMIT 1").first();
  if (!sync?.sync_id) return null;
  const result = await db.prepare("SELECT c.gomo_id,c.name,c.rank,c.hq,c.power,c.hero_power,c.kills,c.avatar_url,c.confidence,c.confidence_level,c.flags_json,c.field_sources_json,c.observed_at FROM core_canonical_snapshots c WHERE c.sync_id=? ORDER BY c.power DESC,c.name COLLATE NOCASE").bind(sync.sync_id).all();
  return {
    coreVersion: CORE_VERSION,
    mode: "stored",
    generatedAt: sync.completed_at,
    syncId: sync.sync_id,
    members: (result.results || []).map((row) => ({
      gomoId: row.gomo_id,
      name: row.name,
      canonical: { rank: row.rank, hq: row.hq, power: row.power, heroPower: row.hero_power, kills: row.kills, avatarUrl: row.avatar_url },
      confidence: { score: row.confidence, level: row.confidence_level },
      flags: safeJson(row.flags_json, []),
      fieldSources: safeJson(row.field_sources_json, {}),
      observedAt: row.observed_at,
    })),
  };
}

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function adminAuthorized(request, env) {
  const expected = String(env.GOMO_CORE_ADMIN_KEY || "");
  if (!expected) return false;
  const provided = request.headers.get("authorization") || "";
  return provided === `Bearer ${expected}`;
}

function publicError(error) {
  if (!error) return null;
  if (error instanceof SourceError) return `${error.source}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

function json(data, status = 200, cache = "no-store") {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
      "x-gomo-core-version": CORE_VERSION,
    },
  });
}

function coreDashboard() {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#07131e"><title>GoMo Core</title><style>
  *{box-sizing:border-box}body{margin:0;padding:calc(env(safe-area-inset-top,0px) + 20px) 14px calc(env(safe-area-inset-bottom,0px) + 30px);background:radial-gradient(circle at top,#183a4e,#07131e 48%,#040b11);color:#f8f5ea;font:15px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:980px;margin:auto}.top{display:flex;align-items:center;justify-content:space-between;gap:12px}.back{color:#f4ca62;text-decoration:none;font-weight:800}.badge{padding:6px 10px;border:1px solid #8b6e31;border-radius:999px;color:#f4ca62;font-size:.75rem;font-weight:800}h1{margin:22px 0 4px;color:#ffe39a;font-size:clamp(2rem,10vw,3.3rem)}.sub{margin:0 0 18px;color:#acc0cc}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.card{padding:14px;border:1px solid rgba(244,202,98,.28);border-radius:18px;background:rgba(8,27,40,.88)}.card b{display:block;color:#ffe39a;font-size:1.35rem}.card small{color:#9db2bf}.sources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.ok{color:#8de0a1}.err{color:#ffaaa2}.table{margin-top:14px;overflow:auto;border:1px solid rgba(244,202,98,.22);border-radius:18px;background:#071725}table{width:100%;border-collapse:collapse;min-width:680px}th,td{padding:10px 12px;border-bottom:1px solid #173344;text-align:left}th{position:sticky;top:0;background:#0d2433;color:#ffe39a}.review{color:#ffc978}.high{color:#92e6a4}.medium{color:#ffe08a}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.toolbar button{min-height:44px;padding:0 14px;border:1px solid #96752c;border-radius:999px;background:#102a39;color:#ffe39a;font:inherit;font-weight:800}.note{padding:12px 14px;border-radius:15px;background:#0d2230;color:#c7d6df}@media(max-width:720px){.grid{grid-template-columns:repeat(2,1fr)}.sources{grid-template-columns:1fr}}
  </style></head><body><main class="wrap"><div class="top"><a class="back" href="/">← GoMo Central</a><span class="badge">TEST · ${CORE_VERSION}</span></div><h1>GoMo Core</h1><p class="sub">Cœur commun de données GoMo · Serveur 1591</p><div class="grid"><div class="card"><b id="members">—</b><small>Membres détectés</small></div><div class="card"><b id="matched">—</b><small>Sources concordantes</small></div><div class="card"><b id="conflicts">—</b><small>À vérifier</small></div><div class="card"><b id="storage">—</b><small>Stockage Core</small></div></div><div class="sources"><div class="card"><strong>LastIntel</strong><p id="li">Chargement…</p></div><div class="card"><strong>LastRank</strong><p id="lr">Chargement…</p></div></div><div class="toolbar"><button id="reload">Actualiser les sources</button></div><p class="note">Mode test : aucune donnée des autres sites n’est modifiée et aucun membre n’est supprimé automatiquement.</p><div class="table"><table><thead><tr><th>Membre</th><th>QG</th><th>Puissance</th><th>Rang</th><th>Source QG</th><th>Confiance</th><th>État</th></tr></thead><tbody id="rows"><tr><td colspan="7">Chargement…</td></tr></tbody></table></div></main><script>
  const fmt=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:1}).format(Number(n)):'—';
  async function status(){try{const r=await fetch('/api/core/status',{cache:'no-store'});const j=await r.json();storage.textContent=j.storage.schemaReady?'D1 prêt':j.storage.configured?'D1 à initialiser':'Lecture seule';}catch{storage.textContent='Erreur';}}
  async function load(){rows.innerHTML='<tr><td colspan="7">Synchronisation des sources…</td></tr>';try{const r=await fetch('/api/core/live',{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Erreur');members.textContent=j.summary.unionMembers;matched.textContent=j.summary.matchedBothSources;conflicts.textContent=j.summary.conflicts;li.innerHTML=j.sources.lastIntel.ok?'<span class="ok">✓ opérationnel</span> · '+j.sources.lastIntel.memberCount+' membres':'<span class="err">✗ '+(j.sources.lastIntel.error||'indisponible')+'</span>';lr.innerHTML=j.sources.lastRank.ok?'<span class="ok">✓ opérationnel</span> · '+j.sources.lastRank.memberCount+' membres':'<span class="err">✗ '+(j.sources.lastRank.error||'indisponible')+'</span>';rows.innerHTML=j.members.map(m=>{const issues=m.flags.filter(f=>f.includes('conflict')||f==='ambiguous_name');return '<tr><td>'+esc(m.name)+'</td><td>'+fmt(m.canonical.hq)+'</td><td>'+fmt(m.canonical.power)+'</td><td>'+(m.canonical.rank||'—')+'</td><td>'+(m.fieldSources.hq||'—')+'</td><td class="'+m.confidence.level+'">'+m.confidence.score+'%</td><td class="'+(issues.length?'review':'high')+'">'+(issues.length?'⚠ '+issues.length:'✓')+'</td></tr>'}).join('');}catch(e){rows.innerHTML='<tr><td colspan="7" class="err">'+esc(e.message)+'</td></tr>';}}
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));reload.onclick=load;status();load();
  </script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-gomo-core-version": CORE_VERSION } });
}

async function handleCoreRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/core") return Response.redirect(new URL("/core/", url).toString(), 308);
  if (url.pathname === "/core/") return coreDashboard();
  if (url.pathname === "/api/core/status") {
    const configured = Boolean(env.CORE_DB);
    const ready = configured ? await schemaReady(env.CORE_DB) : false;
    return json({ coreVersion: CORE_VERSION, mode: "test", alliance: { abbreviation: DEFAULTS.allianceAbbr, serverId: DEFAULTS.serverId }, storage: { configured, schemaReady: ready, lastSync: ready ? await lastSync(env.CORE_DB) : null }, safety: { mainModified: false, otherSitesWritten: false, automaticDeletion: false } });
  }
  if (url.pathname === "/api/core/live") {
    if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method Not Allowed" }, 405);
    try { return json(await collectLiveReport(env), 200, "public, max-age=30"); }
    catch (error) { return json({ error: publicError(error) }, 503); }
  }
  if (url.pathname === "/api/core/members") {
    if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method Not Allowed" }, 405);
    try {
      const stored = env.CORE_DB ? await readStoredMembers(env.CORE_DB) : null;
      return json(stored || await collectLiveReport(env), 200, "public, max-age=30");
    } catch (error) { return json({ error: publicError(error) }, 503); }
  }
  if (url.pathname === "/api/core/refresh") {
    if (request.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
    if (!env.CORE_DB) return json({ error: "CORE_DB is not configured" }, 503);
    if (!adminAuthorized(request, env)) return json({ error: "Unauthorized" }, 401);
    try {
      const report = await collectLiveReport(env);
      const saved = await persistReport(env.CORE_DB, report);
      return json({ ok: true, ...saved, summary: report.summary });
    } catch (error) { return json({ error: publicError(error) }, 503); }
  }
  return json({ error: "Not Found" }, 404);
}

function normalizeRank(value) {
  const numeric = Number.parseInt(String(value ?? "").replace(/^R/i, ""), 10);
  return numeric >= 1 && numeric <= 5 ? `R${numeric}` : null;
}

function safeInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function positiveIntegerOrNull(value) {
  if (value == null || value === "") return null;
  return safeInteger(value);
}

function validIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function textOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/core" || url.pathname.startsWith("/core/") || url.pathname.startsWith("/api/core/")) {
      return handleCoreRequest(request, env, ctx);
    }
    return legacyWorker.fetch(request, env, ctx);
  },
  async scheduled(event, env, ctx) {
    if (!env.CORE_DB) return;
    ctx.waitUntil((async () => {
      try {
        if (!(await schemaReady(env.CORE_DB))) return;
        const report = await collectLiveReport(env);
        await persistReport(env.CORE_DB, report);
      } catch (error) {
        console.error("GoMo Core scheduled sync", publicError(error));
      }
    })());
  },
};
