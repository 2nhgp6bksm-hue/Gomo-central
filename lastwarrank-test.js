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

function parseHq(value) {
  if (value == null) return null;
  const match = String(value).match(/\b(\d{1,2})\b/);
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

function extractTableMembers(html) {
  const members = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) && members.length < 120) {
    const cells = [];
    const cellPattern = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) cells.push(htmlToText(cellMatch[1]));
    if (cells.length < 4) continue;
    if (/hero\s*power/i.test(cells.join(" ")) && /power/i.test(cells.join(" ")) && /base|hq/i.test(cells.join(" "))) continue;

    const name = cells[0]?.trim();
    const heroPower = parseCompactNumber(cells[1]);
    const power = parseCompactNumber(cells[2]);
    const hq = parseHq(cells[3]);
    if (!name || name.length > 80) continue;
    if (heroPower == null && power == null && hq == null) continue;
    members.push({ name, heroPower, power, hq, raw: { heroPower: cells[1], power: cells[2], hq: cells[3] } });
  }
  return members;
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
        "User-Agent": "Mozilla/5.0 (compatible; GoMoCore-LastWarRank-Test/0.1; +https://github.com/)",
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
    const members = extractTableMembers(html);
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
        tableRowsDetected: (html.match(/<tr\b/gi) || []).length,
        containsHeroPower: /Hero\s*Power/i.test(visibleText),
        containsArmyKills: /Army\s*Kills/i.test(visibleText),
        containsDataSnapshot: /Data\s+snapshot/i.test(visibleText),
        parser: members.length ? "html_table" : "page_readable_parser_needs_adjustment",
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
