import baseWorker from "./worker-v1.7.js";

const MASCOT_PATCH = String.raw`
;(() => {
  function applyGoMoMascots() {
    const trainImage = document.querySelector("#train .gomo-train-hero img");
    if (trainImage) {
      trainImage.src = "/assets/assets/03_GoMo_Train.png";
      trainImage.alt = "Train GoMo";
      trainImage.removeAttribute("srcset");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyGoMoMascots, { once: true });
  } else {
    applyGoMoMascots();
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest('[data-page="train"], [data-go="train"]')) {
      setTimeout(applyGoMoMascots, 40);
    }
  });

  window.addEventListener("pageshow", applyGoMoMascots);
})();
`;

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    if (!response) return response;

    const url = new URL(request.url);
    const headers = new Headers(response.headers);
    headers.set("x-gomo-central-version", "1.8");

    if (url.pathname === "/assets/app-v1.5.js" && response.ok) {
      const source = await response.text();
      headers.delete("content-length");
      headers.delete("etag");
      headers.set("content-type", "application/javascript; charset=utf-8");
      headers.set("cache-control", "no-store");
      return new Response(`${source}\n${MASCOT_PATCH}`, {
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
