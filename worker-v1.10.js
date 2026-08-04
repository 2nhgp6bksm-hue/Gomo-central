import baseWorker from "./worker-v1.9.js";

const HERO_PATCH = String.raw`
;(() => {
  const HERO_URL = "/gomo-central-royal-main.webp?v=1.10";

  function installRoyalHeroStyle() {
    if (document.getElementById("gomo-royal-hero-style")) return;

    const style = document.createElement("style");
    style.id = "gomo-royal-hero-style";
    style.textContent = [
      "#home .home-emblem {",
      "  overflow: hidden !important;",
      "  border-radius: 28px !important;",
      "}",
      "",
      "#home .home-emblem img {",
      "  width: 100% !important;",
      "  height: auto !important;",
      "  max-height: none !important;",
      "  aspect-ratio: 870 / 832 !important;",
      "  object-fit: cover !important;",
      "  object-position: center !important;",
      "  display: block !important;",
      "}",
      "",
      "@media (max-width: 700px) {",
      "  #home .home-emblem {",
      "    border-radius: 22px !important;",
      "  }",
      "",
      "  #home .home-emblem img {",
      "    aspect-ratio: 870 / 832 !important;",
      "  }",
      "}"
    ].join("\\n");
    document.head.appendChild(style);
  }

  function applyRoyalHero() {
    const image = document.querySelector("#home .home-emblem img");
    if (!image) return;

    image.src = HERO_URL;
    image.alt = "Mascotte royale GoMo";
    image.removeAttribute("srcset");
    image.removeAttribute("loading");
  }

  function apply() {
    installRoyalHeroStyle();
    applyRoyalHero();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }

  window.addEventListener("pageshow", apply);
})();
`;

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    if (!response) return response;

    const url = new URL(request.url);
    const headers = new Headers(response.headers);
    headers.set("x-gomo-central-version", "1.10");

    if (url.pathname === "/assets/app-v1.5.js" && response.ok) {
      const source = await response.text();
      headers.delete("content-length");
      headers.delete("etag");
      headers.set("content-type", "application/javascript; charset=utf-8");
      headers.set("cache-control", "no-store");

      return new Response(`${source}\n${HERO_PATCH}`, {
        status: response.status,
        statusText: response.statusText,
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
