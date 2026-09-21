import coreV04 from "./gomo-core-entry-v04.js";

const SHELL_VERSION = "0.5.0-test";

function redirectToCore(request) {
  const url = new URL(request.url);
  url.pathname = "/core/";
  url.search = "";
  url.hash = "";
  return Response.redirect(url.toString(), 308);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // GoMo Core devient l'accueil de la branche de test.
    // L'ancien portail GoMo Central n'est plus chargé à la racine.
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return redirectToCore(request);
    }

    const response = await coreV04.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set("x-gomo-core-shell-version", SHELL_VERSION);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  async scheduled(event, env, ctx) {
    if (typeof coreV04.scheduled === "function") {
      return coreV04.scheduled(event, env, ctx);
    }
  },
};
