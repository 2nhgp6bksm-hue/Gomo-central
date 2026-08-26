const PUBLIC_CATALOG_KEY = "catalog/members.json";
const MAX_CATALOG_BYTES = 512 * 1024;
const MAX_AVATAR_BYTES = 120 * 1024;
const GOMO_ID_PATTERN = /^gomo_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CENTRAL_PATH_PATTERN = /^\/member-avatars-central\/(\d+)\/(avatar-v(\d+)\.(webp|jpg|png))$/;

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function validGomoId(value) {
  return GOMO_ID_PATTERN.test(String(value || ""));
}

function assistantOrigin(env) {
  try {
    const url = new URL(String(env.GOMO_ASSISTANT_PUBLIC_ORIGIN || ""));
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function trustedAssistantAvatarUrl(value, env) {
  const expectedOrigin = assistantOrigin(env);
  if (!expectedOrigin) return null;
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && url.origin === expectedOrigin ? url : null;
  } catch {
    return null;
  }
}

function trustedLastIntelAvatarUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const hostname = url.hostname.toLocaleLowerCase();
    return url.protocol === "https:" && (hostname === "lastintel.io" || hostname.endsWith(".lastintel.io"))
      ? url
      : null;
  } catch {
    return null;
  }
}

async function readAvatarCatalog(env) {
  if (!env.MEMBER_AVATARS) return null;
  const value = await env.MEMBER_AVATARS.get(PUBLIC_CATALOG_KEY, { type: "text", cacheTtl: 60 });
  if (!value || typeof value !== "string" || value.length > MAX_CATALOG_BYTES) return null;
  try {
    const catalog = JSON.parse(value);
    return Array.isArray(catalog?.members) ? catalog : null;
  } catch {
    return null;
  }
}

function avatarIndex(catalog, env) {
  const byGomoId = new Map();
  const byName = new Map();
  for (const raw of catalog?.members || []) {
    const memberId = Number(raw?.member_id);
    const pseudo = String(raw?.pseudo || "").trim();
    const gomoId = validGomoId(raw?.gomo_id) ? String(raw.gomo_id) : null;
    const avatarUrl = trustedAssistantAvatarUrl(raw?.avatar_url, env)?.href || null;
    const avatarSource = ["central", "library"].includes(String(raw?.avatar_source))
      ? String(raw.avatar_source)
      : "default";
    const avatarVersion = Math.max(0, Number(raw?.avatar_version || 0));
    if (!Number.isSafeInteger(memberId) || memberId < 1 || !pseudo) continue;
    const entry = {
      memberId,
      pseudo,
      gomoId,
      avatarUrl,
      avatarSource,
      avatarVersion: Number.isSafeInteger(avatarVersion) ? avatarVersion : 0,
      avatarUpdatedAt: raw?.avatar_updated_at || null,
    };
    if (gomoId) {
      if (byGomoId.has(gomoId)) byGomoId.set(gomoId, null);
      else byGomoId.set(gomoId, entry);
    }
    const normalized = normalizeName(pseudo);
    if (!normalized) continue;
    if (byName.has(normalized)) byName.set(normalized, null);
    else byName.set(normalized, entry);
  }
  return { byGomoId, byName };
}

function catalogEntryForMember(member, index) {
  if (validGomoId(member?.gomoId) && index.byGomoId.get(member.gomoId)) {
    return index.byGomoId.get(member.gomoId);
  }
  return index.byName.get(normalizeName(member?.name)) || null;
}

function canonicalAvatarUrl(origin, gomoId, version) {
  const url = new URL(`/api/core/members/${encodeURIComponent(gomoId)}/avatar`, origin);
  if (Number.isSafeInteger(version) && version > 0) url.searchParams.set("v", String(version));
  return url.href;
}

async function enrichCoreMembersWithAvatars(members, env, origin, catalogOverride = undefined) {
  if (!Array.isArray(members) || !members.length || !env.MEMBER_AVATARS) return members;
  try {
    const catalog = catalogOverride === undefined ? await readAvatarCatalog(env) : catalogOverride;
    if (!catalog) return members;
    const index = avatarIndex(catalog, env);
    return members.map((member) => {
      const entry = catalogEntryForMember(member, index);
      if (!entry?.avatarUrl || entry.avatarSource === "default" || !validGomoId(member?.gomoId)) return member;
      return {
        ...member,
        avatarUrl: canonicalAvatarUrl(origin, member.gomoId, entry.avatarVersion),
        avatarVersion: entry.avatarVersion,
        avatarUpdatedAt: entry.avatarUpdatedAt,
        avatarSource: "gomo-core-central",
      };
    });
  } catch (error) {
    console.warn(JSON.stringify({
      event: "gomo_core_avatar_catalog_unavailable",
      error: error instanceof Error ? error.message : String(error),
    }));
    return members;
  }
}

async function memberNames(db, gomoId) {
  if (!db) return [];
  const result = await db.prepare(`SELECT current_name AS name FROM core_members WHERE gomo_id=?
    UNION SELECT alias AS name FROM core_member_aliases WHERE gomo_id=?`).bind(gomoId, gomoId).all();
  return [...new Set((result.results || []).map((row) => normalizeName(row.name)).filter(Boolean))];
}

async function resolveCatalogEntry(env, gomoId, catalog) {
  const index = avatarIndex(catalog, env);
  if (index.byGomoId.get(gomoId)) return index.byGomoId.get(gomoId);
  const names = await memberNames(env.CORE_DB, gomoId);
  const matches = new Map();
  for (const name of names) {
    const entry = index.byName.get(name);
    if (entry) matches.set(entry.memberId, entry);
  }
  return matches.size === 1 ? [...matches.values()][0] : null;
}

function publicImageHeaders(contentType, cacheControl, extra = {}) {
  return {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  };
}

function redirectAvatar(request, url, cacheControl = "public, max-age=300") {
  const headers = new Headers(publicImageHeaders("text/plain; charset=utf-8", cacheControl, { Location: url.href }));
  return new Response(request.method === "HEAD" ? null : "Avatar disponible", { status: 302, headers });
}

function storedContentType(filename, metadata) {
  const stored = String(metadata?.contentType || "").toLocaleLowerCase();
  if (["image/webp", "image/jpeg", "image/png"].includes(stored)) return stored;
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg")) return "image/jpeg";
  return "image/webp";
}

function validEtag(value) {
  const etag = String(value || "");
  return /^"[a-f0-9]{64}"$/.test(etag) ? etag : null;
}

async function latestSourceAvatar(env, gomoId) {
  if (!env.CORE_DB) return null;
  const row = await env.CORE_DB.prepare(`SELECT avatar_url FROM core_canonical_snapshots
    WHERE gomo_id=? AND avatar_url IS NOT NULL AND trim(avatar_url)<>''
    ORDER BY observed_at DESC LIMIT 1`).bind(gomoId).first();
  return trustedLastIntelAvatarUrl(row?.avatar_url);
}

async function handleCoreMemberAvatar(request, env, url, gomoId) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "If-None-Match",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=utf-8", Allow: "GET, HEAD, OPTIONS" },
    });
  }
  if (!validGomoId(gomoId)) return new Response("Avatar not found", { status: 404 });
  if (!env.MEMBER_AVATARS) {
    console.error(JSON.stringify({ event: "gomo_core_avatar_binding_missing", binding: "MEMBER_AVATARS" }));
    return new Response("Avatar storage unavailable", { status: 503 });
  }

  const catalog = await readAvatarCatalog(env);
  const entry = catalog ? await resolveCatalogEntry(env, gomoId, catalog) : null;
  if (entry?.avatarUrl && entry.avatarSource !== "default") {
    const avatarUrl = trustedAssistantAvatarUrl(entry.avatarUrl, env);
    const centralMatch = avatarUrl?.pathname.match(CENTRAL_PATH_PATTERN);
    if (centralMatch && Number(centralMatch[1]) === entry.memberId) {
      const filename = centralMatch[2];
      const fileVersion = Number(centralMatch[3]);
      if (entry.avatarVersion > 0 && entry.avatarVersion !== fileVersion) {
        console.warn(JSON.stringify({
          event: "gomo_core_avatar_catalog_version_mismatch",
          gomoId,
          catalogVersion: entry.avatarVersion,
          fileVersion,
        }));
        return redirectAvatar(request, avatarUrl, "no-store");
      }
      const currentVersion = fileVersion;
      if (String(url.searchParams.get("v") || "") !== String(currentVersion)) {
        const versioned = new URL(url);
        versioned.searchParams.set("v", String(currentVersion));
        return redirectAvatar(request, versioned, "no-store");
      }

      const key = `members/${entry.memberId}/${filename}`;
      const record = await env.MEMBER_AVATARS.getWithMetadata(key, {
        type: request.method === "HEAD" ? "arrayBuffer" : "stream",
        cacheTtl: 31536000,
      });
      if (record.value) {
        const size = Number(record.metadata?.size || 0);
        if (Number.isFinite(size) && size > MAX_AVATAR_BYTES) {
          if (request.method === "GET" && typeof record.value.cancel === "function") await record.value.cancel().catch(() => undefined);
          return new Response("Avatar invalid", { status: 502 });
        }
        const etag = validEtag(record.metadata?.etag);
        if (etag && request.headers.get("If-None-Match") === etag) {
          if (request.method === "GET" && typeof record.value.cancel === "function") await record.value.cancel().catch(() => undefined);
          return new Response(null, {
            status: 304,
            headers: publicImageHeaders(storedContentType(filename, record.metadata), "public, max-age=31536000, immutable", { ETag: etag }),
          });
        }
        const extra = etag ? { ETag: etag } : {};
        if (Number.isSafeInteger(size) && size > 0) extra["Content-Length"] = String(size);
        return new Response(request.method === "HEAD" ? null : record.value, {
          status: 200,
          headers: publicImageHeaders(storedContentType(filename, record.metadata), "public, max-age=31536000, immutable", extra),
        });
      }
    }

    if (avatarUrl) return redirectAvatar(request, avatarUrl);
  }

  const sourceAvatar = await latestSourceAvatar(env, gomoId);
  if (sourceAvatar) return redirectAvatar(request, sourceAvatar);
  return new Response("Avatar not found", {
    status: 404,
    headers: { "Cache-Control": "public, max-age=60", "Access-Control-Allow-Origin": "*" },
  });
}

export {
  enrichCoreMembersWithAvatars,
  handleCoreMemberAvatar,
  normalizeName,
  readAvatarCatalog,
  validGomoId,
};
