import baseWorker from "./worker-v1.9.js";

const HERO_URL = "/gomo-central-mascotte-hero.webp?v=1.10.3";

const HOME_PATCH = String.raw`
;(() => {
  const HERO_URL = "/gomo-central-mascotte-hero.webp?v=1.10.3";

  function applyGoMoHomePatch() {
    const hero = document.querySelector("#home .home-emblem img");
    if (hero) {
      hero.src = HERO_URL;
      hero.alt = "Mascotte royale GoMo";
      hero.removeAttribute("srcset");
      hero.removeAttribute("loading");
      hero.style.width = "100%";
      hero.style.height = "auto";
      hero.style.maxHeight = "none";
      hero.style.objectFit = "cover";
      hero.style.objectPosition = "center";
      hero.style.display = "block";
    }

    const rankingLabel = [...document.querySelectorAll("#home *")]
      .find((el) => el.children.length === 0 && el.textContent.trim() === "Classement");

    if (rankingLabel) {
      rankingLabel.style.setProperty("font-size", "8.5px", "important");
      rankingLabel.style.setProperty("white-space", "nowrap", "important");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyGoMoHomePatch, { once: true });
  } else {
    applyGoMoHomePatch();
  }

  setTimeout(applyGoMoHomePatch, 50);
  setTimeout(applyGoMoHomePatch, 300);
  window.addEventListener("pageshow", applyGoMoHomePatch);
})();
`;

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

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    if (!response) return response;

    const url = new URL(request.url);
    const headers = new Headers(response.headers);
    headers.set("x-gomo-central-version", "1.10.3");

    // Cette route passe déjà par le Worker selon wrangler.jsonc.
    // On y ajoute donc le correctif d'accueil de manière fiable.
    if (url.pathname === "/assets/app-v1.5.js" && response.ok) {
      const source = await response.text();
      headers.delete("content-length");
      headers.delete("etag");
      headers.set("content-type", "application/javascript; charset=utf-8");
      headers.set("cache-control", "no-store, no-cache, must-revalidate");

      return new Response(`${source}\n${HOME_PATCH}`, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    // Garde un fallback si l'accueil passe un jour directement par le Worker.
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
