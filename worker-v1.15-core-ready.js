// GoMo Central — préparation à l'intégration de la future version définitive de GoMo Core.
// Cette couche est inactive par défaut et ne contacte aucune source tant que
// GOMO_CORE_ENABLED n'est pas explicitement positionné à "true".
import centralWorker from "./worker-v1.14.js";

const VERSION = "20.16-core-ready";
const BRIDGE_PREFIX = "/api/central-core";
const ROUTES = new Map([
  [`${BRIDGE_PREFIX}/status`, "/api/core/status"],
  [`${BRIDGE_PREFIX}/members`, "/api/core/members"],
  [`${BRIDGE_PREFIX}/power`, "/api/core/power"],
  [`${BRIDGE_PREFIX}/precision`, "/api/core/precision"],
]);

function enabled(env) {
  return String(env.GOMO_CORE_ENABLED || "").toLowerCase() === "true";
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
      "x-gomo-central-core-ready-version": VERSION,
      ...extraHeaders,
    },
  });
}

function sourceConfiguration(env) {
  const serviceBinding = Boolean(env.GOMO_CORE && typeof env.GOMO_CORE.fetch === "function");
  let baseUrl = null;
  if (env.GOMO_CORE_BASE_URL) {
    try {
      const parsed = new URL(String(env.GOMO_CORE_BASE_URL));
      if (parsed.protocol === "https:") baseUrl = parsed.origin;
    } catch {}
  }
  return { serviceBinding, baseUrl };
}

function health(env) {
  const source = sourceConfiguration(env);
  return json({
    ok: true,
    centralVersion: VERSION,
    integrationPrepared: true,
    integrationEnabled: enabled(env),
    coreSourceConfigured: source.serviceBinding || Boolean(source.baseUrl),
    preferredTransport: source.serviceBinding ? "service-binding" : source.baseUrl ? "https" : "not-configured",
    readOnlyRoutes: ["status", "members", "power", "precision"],
    writeRoutesExposed: false,
    safety: {
      noCoreRequestWhileDisabled: true,
      noRefreshProxy: true,
      noLiveUpstreamProxy: true,
      noAdminSecretForwarding: true,
      existingCentralWorkerPreserved: true,
    },
  });
}

function forwardedHeaders(request) {
  const headers = new Headers();
  headers.set("accept", "application/json");
  const etag = request.headers.get("if-none-match");
  if (etag) headers.set("if-none-match", etag);
  return headers;
}

async function fetchCore(request, env, upstreamPath) {
  if (!enabled(env)) {
    return json({
      ok: false,
      error: "GoMo Core integration is prepared but not enabled",
      integrationEnabled: false,
      centralVersion: VERSION,
    }, 503);
  }

  const source = sourceConfiguration(env);
  if (!source.serviceBinding && !source.baseUrl) {
    return json({
      ok: false,
      error: "GoMo Core source is not configured",
      integrationEnabled: true,
      centralVersion: VERSION,
    }, 503);
  }

  const method = request.method;
  if (method !== "GET" && method !== "HEAD") {
    return json({ error: "Method Not Allowed" }, 405, { allow: "GET, HEAD" });
  }

  const headers = forwardedHeaders(request);
  let response;

  if (source.serviceBinding) {
    const target = new URL(`https://gomo-core.internal${upstreamPath}`);
    response = await env.GOMO_CORE.fetch(new Request(target, { method, headers }));
  } else {
    const target = new URL(upstreamPath, `${source.baseUrl}/`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      response = await fetch(target, { method, headers, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  const outHeaders = new Headers();
  for (const name of ["content-type", "cache-control", "etag", "last-modified"]) {
    const value = response.headers.get(name);
    if (value) outHeaders.set(name, value);
  }
  outHeaders.set("x-content-type-options", "nosniff");
  outHeaders.set("x-robots-tag", "noindex, nofollow");
  outHeaders.set("x-gomo-central-core-bridge", VERSION);
  outHeaders.set("x-gomo-central-core-transport", source.serviceBinding ? "service-binding" : "https");

  return new Response(method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: outHeaders,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === `${BRIDGE_PREFIX}/health`) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ error: "Method Not Allowed" }, 405, { allow: "GET, HEAD" });
      }
      const response = health(env);
      return request.method === "HEAD"
        ? new Response(null, { status: response.status, headers: response.headers })
        : response;
    }

    const upstreamPath = ROUTES.get(url.pathname);
    if (upstreamPath) {
      try {
        return await fetchCore(request, env, upstreamPath);
      } catch (error) {
        console.error("GoMo Central Core bridge", error instanceof Error ? error.message : String(error));
        return json({
          ok: false,
          error: "GoMo Core temporarily unavailable",
          centralVersion: VERSION,
        }, 503);
      }
    }

    return centralWorker.fetch(request, env, ctx);
  },
};
