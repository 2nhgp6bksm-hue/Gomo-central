const CATALOG_SCHEMA_VERSION = 2;
const CATALOG_FRESH_MS = 60 * 1000;
const CATALOG_CACHE_SECONDS = 7 * 24 * 60 * 60;
const MAX_CATALOG_BYTES = 512 * 1024;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const GOMO_ID_PATTERN = /^gomo_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CENTRAL_PATH_PATTERN = /^\/member-avatars-central\/(\d+)\/avatar-v(\d+)\.(webp|jpe?g|png)$/i;
const LIBRARY_PATH_PATTERN = /^\/member-avatars\/(\d+)\.(webp|jpe?g|png)$/i;

function log(level, event, details = {}) {
  const method = level === "error" ? "error" : "warn";
  console[method](JSON.stringify({ event, ...details }));
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function validGomoId(value) {
  return GOMO_ID_PATTERN.test(String(value || ""));
}

function normalizedGomoId(value) {
  return validGomoId(value) ? String(value).toLowerCase() : null;
}

function assistantOrigin(env) {
  try {
    const url = new URL(String(env.GOMO_ASSISTANT_PUBLIC_ORIGIN || ""));
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function trustedAssistantAvatar(raw, env, memberId, version, source) {
  const expectedOrigin = assistantOrigin(env);
  if (!expectedOrigin) return null;
  try {
    const url = new URL(String(raw || ""));
    if (
      url.protocol !== "https:" ||
      url.origin !== expectedOrigin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) return null;

    if (source === "central") {
      const match = url.pathname.match(CENTRAL_PATH_PATTERN);
      if (!match || Number(match[1]) !== memberId || Number(match[2]) !== version) return null;
    } else if (source === "library") {
      if (!LIBRARY_PATH_PATTERN.test(url.pathname)) return null;
    } else {
      return null;
    }
    return { href: url.href, path: url.pathname };
  } catch {
    return null;
  }
}

function catalogMember(raw, env) {
  const memberId = Number(raw?.member_id);
  const pseudo = String(raw?.pseudo || "").trim();
  const gomoId = normalizedGomoId(raw?.gomo_id);
  const avatarVersion = Number(raw?.avatar_version);
  const avatarSource = String(raw?.avatar_source || "");
  if (
    !Number.isSafeInteger(memberId) || memberId < 1 ||
    !pseudo ||
    !Number.isSafeInteger(avatarVersion) || avatarVersion < 1 ||
    !["central", "library"].includes(avatarSource)
  ) return null;
  const avatar = trustedAssistantAvatar(raw?.avatar_url, env, memberId, avatarVersion, avatarSource);
  if (!avatar) return null;
  return {
    memberId,
    pseudo,
    normalizedPseudo: normalizeName(pseudo),
    gomoId,
    avatarUrl: avatar.href,
    upstreamPath: avatar.path,
    avatarVersion,
    avatarSource,
    avatarUpdatedAt: raw?.avatar_updated_at || null,
  };
}

function validateCatalog(raw, env) {
  if (
    Number(raw?.schema_version) !== CATALOG_SCHEMA_VERSION ||
    raw?.source !== "GoMo Assistant" ||
    !Array.isArray(raw?.members) ||
    raw.members.length > 500
  ) return null;
  const members = raw.members.map((member) => catalogMember(member, env)).filter(Boolean);
  if (!members.length) return null;
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    generatedAt: raw.generated_at || null,
    source: raw.source,
    members,
  };
}

async function boundedJson(response, maxBytes) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error("response_too_large");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > maxBytes) throw new Error("response_too_large");
  return JSON.parse(new TextDecoder().decode(bytes));
}

function defaultCache() {
  return typeof caches === "undefined" ? null : caches.default;
}

function catalogCacheKey(request) {
  const url = new URL(request.url);
  url.pathname = "/__gomo_core_cache/assistant-members-v2";
  url.search = `?schema=${CATALOG_SCHEMA_VERSION}`;
  return new Request(url.href, { method: "GET" });
}

async function cachedCatalog(cache, key, env) {
  if (!cache) return null;
  const response = await cache.match(key);
  if (!response) return null;
  try {
    const value = await boundedJson(response, MAX_CATALOG_BYTES);
    const catalog = validateCatalog(value?.catalog, env);
    const fetchedAt = Number(value?.fetchedAt || 0);
    return catalog && Number.isFinite(fetchedAt) ? { catalog, fetchedAt } : null;
  } catch (error) {
    log("warn", "gomo_core_avatar_cache_invalid", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function cacheCatalog(cache, key, catalog, ctx) {
  if (!cache) return;
  const cachedCatalog = {
    schema_version: catalog.schemaVersion,
    generated_at: catalog.generatedAt,
    source: catalog.source,
    members: catalog.members.map((entry) => ({
      member_id: entry.memberId,
      pseudo: entry.pseudo,
      gomo_id: entry.gomoId,
      avatar_url: entry.avatarUrl,
      avatar_version: entry.avatarVersion,
      avatar_source: entry.avatarSource,
      avatar_updated_at: entry.avatarUpdatedAt,
    })),
  };
  const response = new Response(JSON.stringify({ fetchedAt: Date.now(), catalog: cachedCatalog }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${CATALOG_CACHE_SECONDS}`,
    },
  });
  const write = cache.put(key, response).catch((error) => {
    log("warn", "gomo_core_avatar_cache_write_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });
  if (ctx?.waitUntil) ctx.waitUntil(write);
  else await write;
}

async function fetchAssistantCatalog(env) {
  if (!env.GOMO_ASSISTANT || typeof env.GOMO_ASSISTANT.fetch !== "function") {
    throw new Error("GOMO_ASSISTANT binding is missing");
  }
  const response = await env.GOMO_ASSISTANT.fetch(new Request(
    "https://gomo-assistant.internal/api/public/members",
    {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    },
  ));
  if (!response.ok) throw new Error(`GoMo Assistant catalog HTTP ${response.status}`);
  return boundedJson(response, MAX_CATALOG_BYTES);
}

async function readAvatarCatalog(request, env, ctx) {
  const cache = defaultCache();
  const key = catalogCacheKey(request);
  const cached = await cachedCatalog(cache, key, env);
  if (cached && Date.now() - cached.fetchedAt <= CATALOG_FRESH_MS) {
    return { catalog: cached.catalog, stale: false, source: "edge-cache" };
  }

  try {
    const raw = await fetchAssistantCatalog(env);
    const catalog = validateCatalog(raw, env);
    if (!catalog) throw new Error("GoMo Assistant catalog is invalid");
    await cacheCatalog(cache, key, catalog, ctx);
    return { catalog, stale: false, source: "gomo-assistant" };
  } catch (error) {
    log("warn", "gomo_core_avatar_catalog_unavailable", {
      fallback: cached ? "last-known-catalog" : "legacy-avatar",
      error: error instanceof Error ? error.message : String(error),
    });
    return cached
      ? { catalog: cached.catalog, stale: true, source: "edge-cache-stale" }
      : { catalog: null, stale: false, source: "legacy-avatar" };
  }
}

function avatarIndex(catalog) {
  const byGomoId = new Map();
  const byName = new Map();
  const ambiguousGomoIds = new Set();
  const ambiguousNames = new Set();
  for (const entry of catalog?.members || []) {
    if (entry.gomoId) {
      if (byGomoId.has(entry.gomoId)) {
        byGomoId.delete(entry.gomoId);
        ambiguousGomoIds.add(entry.gomoId);
      } else if (!ambiguousGomoIds.has(entry.gomoId)) {
        byGomoId.set(entry.gomoId, entry);
      }
    }
    if (!entry.normalizedPseudo) continue;
    if (byName.has(entry.normalizedPseudo)) {
      byName.delete(entry.normalizedPseudo);
      ambiguousNames.add(entry.normalizedPseudo);
    } else if (!ambiguousNames.has(entry.normalizedPseudo)) {
      byName.set(entry.normalizedPseudo, entry);
    }
  }
  return { byGomoId, byName, ambiguousGomoIds, ambiguousNames };
}

function entryForMember(member, index) {
  const gomoId = normalizedGomoId(member?.gomoId);
  if (gomoId && index.byGomoId.has(gomoId)) {
    return { entry: index.byGomoId.get(gomoId), match: "gomoId", ambiguous: false };
  }
  if (gomoId && index.ambiguousGomoIds.has(gomoId)) {
    return { entry: null, match: null, ambiguous: true };
  }

  const name = normalizeName(member?.name);
  if (name && index.ambiguousNames.has(name)) return { entry: null, match: null, ambiguous: true };
  const byName = name ? index.byName.get(name) : null;
  // A pseudo never overrides a different canonical GoMo ID. It is only a safe
  // fallback for a unique Assistant record that has no canonical ID yet.
  if (byName && !byName.gomoId) return { entry: byName, match: "pseudo", ambiguous: false };
  return { entry: null, match: null, ambiguous: false };
}

function canonicalAvatarUrl(request, gomoId, version) {
  const url = new URL(`/api/core/members/${encodeURIComponent(gomoId)}/avatar`, request.url);
  url.searchParams.set("v", String(version));
  return url.href;
}

function emptyStats(total, catalogAvailable, stale) {
  return {
    catalogAvailable,
    catalogStale: stale,
    total,
    matched: 0,
    matchedByGomoId: 0,
    matchedByPseudo: 0,
    central: 0,
    library: 0,
    missing: total,
    ambiguous: 0,
  };
}

async function enrichCoreMembersWithAvatars(members, request, env, ctx) {
  const list = Array.isArray(members) ? members : [];
  const state = await readAvatarCatalog(request, env, ctx);
  if (!state.catalog) {
    return {
      members: list,
      avatarRevision: null,
      avatarCatalogSource: state.source,
      avatarStats: emptyStats(list.length, false, false),
    };
  }

  const index = avatarIndex(state.catalog);
  const stats = emptyStats(list.length, true, state.stale);
  const enriched = list.map((member) => {
    const association = entryForMember(member, index);
    if (association.ambiguous) {
      stats.ambiguous += 1;
      return member;
    }
    const entry = association.entry;
    const gomoId = normalizedGomoId(member?.gomoId);
    if (!entry || !gomoId) return member;

    stats.matched += 1;
    stats.missing -= 1;
    if (association.match === "gomoId") stats.matchedByGomoId += 1;
    if (association.match === "pseudo") stats.matchedByPseudo += 1;
    stats[entry.avatarSource] += 1;
    return {
      ...member,
      avatarUrl: canonicalAvatarUrl(request, gomoId, entry.avatarVersion),
      avatarVersion: entry.avatarVersion,
      avatarUpdatedAt: entry.avatarUpdatedAt,
      avatarSource: `gomo-assistant-${entry.avatarSource}`,
      avatarMatch: association.match,
    };
  });

  return {
    members: enriched,
    avatarRevision: state.catalog.generatedAt,
    avatarCatalogSource: state.source,
    avatarStats: stats,
  };
}

function imageHeaders(source, cacheStatus) {
  const headers = new Headers({
    "content-type": source.headers.get("content-type") || "application/octet-stream",
    "cache-control": "public, max-age=31536000, immutable",
    "access-control-allow-origin": "*",
    "cross-origin-resource-policy": "cross-origin",
    "x-content-type-options": "nosniff",
    "x-gomo-core-avatar-cache": cacheStatus,
  });
  for (const name of ["content-length", "etag", "last-modified"]) {
    const value = source.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function conditionalOrHead(request, response, cacheStatus) {
  const headers = new Headers(response.headers);
  headers.set("x-gomo-core-avatar-cache", cacheStatus);
  const etag = headers.get("etag");
  if (etag && request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function avatarCacheKey(request, gomoId, version) {
  const url = new URL(request.url);
  url.pathname = `/api/core/members/${encodeURIComponent(gomoId)}/avatar`;
  url.search = `?v=${encodeURIComponent(version)}`;
  return new Request(url.href, { method: "GET" });
}

function publicImageResponse(request, upstream) {
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: 200,
    headers: imageHeaders(upstream, "MISS"),
  });
}

function redirect(request, location, cacheControl = "no-store") {
  return new Response(request.method === "HEAD" ? null : "Avatar disponible", {
    status: 302,
    headers: {
      location,
      "content-type": "text/plain; charset=utf-8",
      "cache-control": cacheControl,
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
    },
  });
}

function trustedLegacyAvatar(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "lastintel.io" || host.endsWith(".lastintel.io"))
      ? url.href
      : null;
  } catch {
    return null;
  }
}

async function latestLegacyAvatar(env, gomoId) {
  if (!env.CORE_DB) return null;
  try {
    const row = await env.CORE_DB.prepare(`SELECT avatar_url FROM core_canonical_snapshots
      WHERE gomo_id=? AND avatar_url IS NOT NULL AND trim(avatar_url)<>''
      ORDER BY observed_at DESC LIMIT 1`).bind(gomoId).first();
    return trustedLegacyAvatar(row?.avatar_url);
  } catch (error) {
    log("warn", "gomo_core_legacy_avatar_lookup_failed", {
      gomoId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function memberNames(env, gomoId) {
  if (!env.CORE_DB) return [];
  try {
    const result = await env.CORE_DB.prepare(`SELECT current_name AS name FROM core_members WHERE gomo_id=?
      UNION SELECT alias AS name FROM core_member_aliases WHERE gomo_id=?`).bind(gomoId, gomoId).all();
    return [...new Set((result.results || []).map((row) => normalizeName(row.name)).filter(Boolean))];
  } catch {
    return [];
  }
}

async function entryForAvatarRoute(env, gomoId, index) {
  if (index.byGomoId.has(gomoId)) return index.byGomoId.get(gomoId);
  if (index.ambiguousGomoIds.has(gomoId)) return null;
  const names = await memberNames(env, gomoId);
  const matches = new Map();
  for (const name of names) {
    if (index.ambiguousNames.has(name)) return null;
    const entry = index.byName.get(name);
    if (entry && !entry.gomoId) matches.set(entry.memberId, entry);
  }
  return matches.size === 1 ? [...matches.values()][0] : null;
}

async function assistantAvatar(entry, request, env) {
  if (!env.GOMO_ASSISTANT || typeof env.GOMO_ASSISTANT.fetch !== "function") {
    throw new Error("GOMO_ASSISTANT binding is missing");
  }
  const headers = new Headers({ accept: "image/avif,image/webp,image/png,image/jpeg" });
  const upstream = await env.GOMO_ASSISTANT.fetch(new Request(
    `https://gomo-assistant.internal${entry.upstreamPath}`,
    { method: request.method, headers, signal: AbortSignal.timeout(5000) },
  ));
  if (!upstream.ok) throw new Error(`GoMo Assistant avatar HTTP ${upstream.status}`);
  const contentType = String(upstream.headers.get("content-type") || "").toLowerCase();
  const length = Number(upstream.headers.get("content-length") || 0);
  if (!contentType.startsWith("image/")) throw new Error("GoMo Assistant avatar is not an image");
  if (Number.isFinite(length) && length > MAX_AVATAR_BYTES) throw new Error("GoMo Assistant avatar is too large");
  return upstream;
}

async function legacyOrMissing(request, env, gomoId) {
  const legacy = await latestLegacyAvatar(env, gomoId);
  if (legacy) return redirect(request, legacy);
  return new Response(request.method === "HEAD" ? null : "Avatar not found", {
    status: 404,
    headers: {
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

async function handleCoreMemberAvatar(request, env, ctx, url, rawGomoId) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, HEAD, OPTIONS",
        "access-control-allow-headers": "If-None-Match",
        "access-control-max-age": "86400",
      },
    });
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: {
        "content-type": "application/json; charset=utf-8",
        allow: "GET, HEAD, OPTIONS",
      },
    });
  }

  const gomoId = normalizedGomoId(rawGomoId);
  if (!gomoId) return new Response("Avatar not found", { status: 404 });
  const requestedVersion = Number(url.searchParams.get("v"));
  const versionIsValid = Number.isSafeInteger(requestedVersion) && requestedVersion > 0;
  const cache = defaultCache();
  const key = versionIsValid ? avatarCacheKey(request, gomoId, requestedVersion) : null;
  if (cache && key) {
    const hit = await cache.match(key);
    if (hit) return conditionalOrHead(request, hit, "HIT");
  }

  const state = await readAvatarCatalog(request, env, ctx);
  if (!state.catalog) return legacyOrMissing(request, env, gomoId);
  const entry = await entryForAvatarRoute(env, gomoId, avatarIndex(state.catalog));
  if (!entry) return legacyOrMissing(request, env, gomoId);
  if (!versionIsValid || requestedVersion !== entry.avatarVersion) {
    return redirect(request, canonicalAvatarUrl(request, gomoId, entry.avatarVersion));
  }

  try {
    const upstream = await assistantAvatar(entry, request, env);
    const response = publicImageResponse(request, upstream);
    if (request.method === "GET" && cache && key) {
      const write = cache.put(key, response.clone()).catch((error) => {
        log("warn", "gomo_core_avatar_cache_write_failed", {
          gomoId,
          version: requestedVersion,
          error: error instanceof Error ? error.message : String(error),
        });
      });
      if (ctx?.waitUntil) ctx.waitUntil(write);
      else await write;
    }
    return response;
  } catch (error) {
    log("warn", "gomo_core_avatar_upstream_unavailable", {
      gomoId,
      version: requestedVersion,
      fallback: "legacy-avatar",
      error: error instanceof Error ? error.message : String(error),
    });
    return legacyOrMissing(request, env, gomoId);
  }
}

export {
  enrichCoreMembersWithAvatars,
  handleCoreMemberAvatar,
  normalizeName,
  readAvatarCatalog,
  validGomoId,
};
