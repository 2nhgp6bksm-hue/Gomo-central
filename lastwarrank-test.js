const MAX_LASTWARRANK_BYTES = 1_500_000;
const ALLOWED_HOSTS = new Set(["lastwarrank.com", "www.lastwarrank.com"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function htmlToText(value) {
  return decodeHtmlEntities(String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHtml(html) {
  const match = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? htmlToText(match[1]).slice(0, 180) : null;
}

function parseCompactNumber(value) {
  if (value == null) return null;
  const text = String(value).trim().replace(/\s+/g, "");
  if (!text || text === "—" || text === "-") return null;
  const match = text.match(/^([0-9]+(?:[.,][0-9]+)?)\s*([KMBT])?$/i);
  if (!match) return null;
  const numeric = Number(match[1].replace(",", "."));
  if (!Number.isFinite(numeric)) return null;
  const factor = ({ K: 1e3, M: 1e6, B: 1e9, T: 1e12 })[(match[2] || "").toUpperCase()] || 1;
  const result = Math.round(numeric * factor);
  return Number.isSafeInteger(result) ? result : null;
}

function compactToken(value) {
  if (value == null) return null;
  const text = String(value).replace(/\u00a0/g, " ");
  const match = text.match(/(?:^|[^\d])([0-9]+(?:[.,][0-9]+)?\s*[KMBT])(?:$|[^\p{L}\d])/iu);
  if (!match) return null;
  const raw = match[1].replace(/\s+/g, "");
  return { raw, value: parseCompactNumber(raw) };
}

function parseHq(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (/[KMBT]/i.test(text)) return null;
  const labeled = text.match(/\b(?:base|hq|headquarters?|qg)\D{0,8}(\d{1,2})\b/i);
  const plain = text.match(/^\s*(?:lv\.?\s*)?#?\s*(\d{1,2})\s*$/i);
  const match = labeled || plain;
  if (!match) return null;
  const hq = Number(match[1]);
  return Number.isInteger(hq) && hq >= 1 && hq <= 50 ? hq : null;
}

function extractMetric(text, label) {
  const pattern = new RegExp(`${label}\\s*[:·-]?\\s*([0-9]+(?:[.,][0-9]+)?\\s*[KMBT]?)`, "i");
  const match = text.match(pattern);
  return match ? { raw: match[1].replace(/\s+/g, ""), value: parseCompactNumber(match[1]) } : { raw: null, value: null };
}

function extractSnapshot(text) {
  const match = text.match(/Data snapshot\s*:\s*(.{1,100}?\bGMT\b)/i);
  if (!match) return { raw: null, observedAt: null };
  const raw = match[1].trim();
  const parsed = new Date(raw);
  return { raw, observedAt: Number.isNaN(parsed.getTime()) ? null : parsed.toISOString() };
}

function extractCells(rowHtml) {
  const cells = [];
  const cellPattern = /<t([dh])\b[^>]*>([\s\S]*?)<\/t\1>/gi;
  let cellMatch;
  while ((cellMatch = cellPattern.exec(rowHtml))) {
    cells.push({ html: cellMatch[2], text: htmlToText(cellMatch[2]) });
  }
  return cells;
}

function normalizeHeader(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function headerMap(rows) {
  for (const row of rows.slice(0, 6)) {
    const cells = extractCells(row);
    if (!cells.length) continue;
    const labels = cells.map((cell) => normalizeHeader(cell.text));
    const heroIndex = labels.findIndex((label) => /\bhero\s*power\b|\bthp\b/.test(label));
    const powerIndex = labels.findIndex((label, index) => index !== heroIndex && /\bpower\b/.test(label) && !/\bhero\b|\bthp\b/.test(label));
    const hqIndex = labels.findIndex((label) => /\bbase\b|\bhq\b|\bqg\b/.test(label));
    const nameIndex = labels.findIndex((label) => /\bmember\b|\bcommander\b|\bplayer\b|\bname\b/.test(label));
    if (heroIndex >= 0 && powerIndex >= 0 && hqIndex >= 0) {
      return { heroIndex, powerIndex, hqIndex, nameIndex: nameIndex >= 0 ? nameIndex : 0 };
    }
  }
  return null;
}

function playerAnchorName(rowHtml) {
  const anchors = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(rowHtml))) {
    const attrs = match[1] || "";
    if (!/href\s*=\s*["'][^"']*\/player\//i.test(attrs)) continue;
    const text = htmlToText(match[2]).trim();
    if (text) anchors.push(text);
  }
  return anchors.sort((a, b) => a.length - b.length)[0] || null;
}

function cleanName(value) {
  let text = String(value || "").replace(/\s+/g, " ").trim();
  text = text.replace(/^\s*#?\d{1,3}\s*[.)-]?\s+/, "").trim();
  return text;
}

function looksLikeName(value) {
  const text = cleanName(value);
  if (!text || text.length > 80) return false;
  if (!/[\p{L}]/u.test(text)) return false;
  if (/^(hero\s*power|power|base|hq|qg|member|members|player|name)$/i.test(text)) return false;
  if (compactToken(text)?.raw === text.replace(/\s+/g, "")) return false;
  return true;
}

function valueAt(cells, index) {
  if (index == null || index < 0 || index >= cells.length) return { raw: null, value: null };
  const token = compactToken(cells[index].text);
  return token || { raw: null, value: null };
}

function inferMember(cells, rowHtml, map) {
  if (!cells.length) return null;
  const texts = cells.map((cell) => cell.text);
  const joined = texts.join(" ");
  if (/hero\s*power/i.test(joined) && /\bpower\b/i.test(joined) && /\b(base|hq|qg)\b/i.test(joined)) return null;

  let name = playerAnchorName(rowHtml);
  let hero = { raw: null, value: null };
  let power = { raw: null, value: null };
  let hq = null;

  if (map) {
    name = name || texts[map.nameIndex];
    hero = valueAt(cells, map.heroIndex);
    power = valueAt(cells, map.powerIndex);
    hq = parseHq(texts[map.hqIndex]);
  }

  if (!map || (hero.value == null && power.value == null && hq == null)) {
    const compact = texts
      .map((text, index) => ({ index, token: compactToken(text) }))
      .filter((item) => item.token?.value != null);

    const hqCandidates = texts
      .map((text, index) => ({ index, value: parseHq(text) }))
      .filter((item) => item.value != null);

    const hqCandidate = hqCandidates.length ? hqCandidates[hqCandidates.length - 1] : null;
    hq = hq ?? hqCandidate?.value ?? null;

    const numericBeforeHq = hqCandidate
      ? compact.filter((item) => item.index < hqCandidate.index)
      : compact;

    if (hero.value == null && numericBeforeHq[0]) hero = numericBeforeHq[0].token;
    if (power.value == null && numericBeforeHq[1]) power = numericBeforeHq[1].token;

    if (!name) {
      const numericIndexes = new Set(compact.map((item) => item.index));
      const hqIndexes = new Set(hqCandidates.map((item) => item.index));
      const candidate = texts.find((text, index) => !numericIndexes.has(index) && !hqIndexes.has(index) && looksLikeName(text));
      name = candidate || texts.find(looksLikeName) || null;
    }
  }

  name = cleanName(name);
  if (!looksLikeName(name)) return null;
  if (hero.value == null && power.value == null && hq == null) return null;

  return {
    name,
    heroPower: hero.value,
    power: power.value,
    hq,
    raw: {
      heroPower: hero.raw,
      power: power.raw,
      hq: hq == null ? null : String(hq),
    },
  };
}

function extractTableMembers(html) {
  const rows = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) && rows.length < 140) rows.push(rowMatch[1]);

  const map = headerMap(rows);
  const members = [];
  const seen = new Set();

  for (const row of rows) {
    const cells = extractCells(row);
    const member = inferMember(cells, row, map);
    if (!member) continue;
    const key = member.name.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    members.push(member);
    if (members.length >= 100) break;
  }

  const debugRows = rows.slice(0, 6).map((row) => extractCells(row).map((cell) => cell.text).filter(Boolean));
  return { members, rows, map, debugRows };
}

async function readBoundedText(response) {
  const announced = Number(response.headers.get("content-length") || 0);
  if (announced > MAX_LASTWARRANK_BYTES) throw new Error("LastWarRank response is larger than the safety limit");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_LASTWARRANK_BYTES) {
      await reader.cancel();
      throw new Error("LastWarRank response exceeded the safety limit");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function resolveUrl(env) {
  const raw = String(env.LASTWARRANK_URL || "").trim();
  if (!raw) throw new Error("LASTWARRANK_URL is not configured");
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("LASTWARRANK_URL must use HTTPS");
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new Error("LASTWARRANK_URL host is not allowed");
  return url;
}

export async function handleLastWarRankTest(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method Not Allowed" }, 405);

  let url;
  try {
    url = resolveUrl(env);
  } catch (error) {
    return json({ ok: false, source: "lastwarrank", error: error.message }, 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (compatible; GoMoCore-LastWarRank-Test/0.2; +https://github.com/)",
      },
    });

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!response.ok) {
      if (response.body) await response.body.cancel();
      return json({
        ok: false,
        source: "lastwarrank",
        url: url.toString(),
        httpStatus: response.status,
        error: `LastWarRank HTTP ${response.status}`,
      }, 502);
    }
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      if (response.body) await response.body.cancel();
      return json({ ok: false, source: "lastwarrank", httpStatus: response.status, error: "Unexpected content type" }, 502);
    }

    const html = await readBoundedText(response);
    const visibleText = htmlToText(html);
    const parsedRoster = extractTableMembers(html);
    const members = parsedRoster.members;
    const totalPower = extractMetric(visibleText, "Total\\s+Power");
    const armyKills = extractMetric(visibleText, "Army\\s+Kills");
    const snapshot = extractSnapshot(visibleText);

    return json({
      ok: true,
      source: "lastwarrank",
      mode: "read_only_probe",
      url: url.toString(),
      fetchedAt: new Date().toISOString(),
      page: {
        title: titleFromHtml(html),
        bytes: new TextEncoder().encode(html).byteLength,
        snapshot: snapshot.raw,
        observedAt: snapshot.observedAt,
      },
      alliance: {
        totalPower: totalPower.value,
        totalPowerRaw: totalPower.raw,
        armyKills: armyKills.value,
        armyKillsRaw: armyKills.raw,
      },
      roster: {
        extractedMembers: members.length,
        members: members.slice(0, 100),
      },
      diagnostics: {
        tableRowsDetected: parsedRoster.rows.length,
        headerMap: parsedRoster.map,
        sampleRows: members.length ? undefined : parsedRoster.debugRows,
        containsHeroPower: /Hero\s*Power/i.test(visibleText),
        containsArmyKills: /Army\s*Kills/i.test(visibleText),
        containsDataSnapshot: /Data\s+snapshot/i.test(visibleText),
        parser: members.length ? "html_table_v2" : "page_readable_parser_needs_adjustment",
      },
      safety: {
        writesToD1: false,
        writesToOtherSites: false,
        changesCanonicalData: false,
      },
    });
  } catch (error) {
    const message = error?.name === "AbortError" ? "LastWarRank request timed out" : (error?.message || String(error));
    return json({ ok: false, source: "lastwarrank", url: url.toString(), error: message }, 502);
  } finally {
    clearTimeout(timeout);
  }
}
