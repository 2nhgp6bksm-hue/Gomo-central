import baseWorker from "./worker-v1.9.js";

const HERO_URL = "/gomo-central-mascotte-hero.webp?v=1.10.3";

const heroImageHandler = {
  element(element) {
    element.setAttribute("src", HERO_URL);
    element.setAttribute("alt", "Mascotte royale GoMo");
    element.removeAttribute("srcset");
    element.removeAttribute("loading");
    element.setAttribute(
      "style",
      "width:100%;height:auto;max-height:none;object-fit:cover;object-position:center;display:block;"
    );
  }
};
const rankingLabelHandler = {
  element(element) {
    const currentStyle = element.getAttribute("style") || "";
    element.setAttribute(
      "style",
      currentStyle + "; font-size:8.5px!important;white-space:nowrap!important;"
    );
  }
};
export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    if (!response) return response;

    const url = new URL(request.url);
    const headers = new Headers(response.headers);
    headers.set("x-gomo-central-version", "1.10.2");

    const contentType = headers.get("content-type") || "";
    const isHomeHtml =
      response.ok &&
      contentType.includes("text/html") &&
      (url.pathname === "/" || url.pathname === "/index.html");

    if (isHomeHtml) {
      headers.delete("content-length");
      headers.delete("etag");
      headers.set("cache-control", "no-store, no-cache, must-revalidate");

      const rewritten = new HTMLRewriter()
  .on("#home .home-emblem img", heroImageHandler)
  .on('#home [data-gomo-quick="ranking"]', rankingLabelHandler)
  .transform(response);

      return new Response(rewritten.body, {
        status: rewritten.status,
        statusText: rewritten.statusText,
        headers
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
