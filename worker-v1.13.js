import baseWorker from "./worker-v1.10.js";

const R5_NAV_PATCH = String.raw`
;(() => {
  if (window.__GOMO_R5_NAV_V111__) return;
  window.__GOMO_R5_NAV_V111__ = true;

  const LINKS = {
    "vs-planner": "https://2nhgp6bksm-hue.github.io/-GoMo-VS-Planner-/",
    "shiny-radar": "https://timely-meringue-812f51.netlify.app/",
    "train": "https://chic-sopapillas-82fbc8.netlify.app/?goto=weeklyTrainPlanCard",
    "classements": "https://chic-sopapillas-82fbc8.netlify.app/?goto=weeklyChampionsCard",
    "gomo-assistant": "https://chic-sopapillas-82fbc8.netlify.app/"
  };

  function closeMascot() {
    const panel = document.getElementById("gomo-r5fapper-panel");
    if (panel) panel.classList.remove("open");
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-r5-go]");
    if (!button) return;

    const target = button.getAttribute("data-r5-go");
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (target === "traduction") {
      const communication = document.querySelector(
        '[data-go="communication"], [data-page="communication"]'
      );
      closeMascot();
      if (communication) communication.click();
      return;
    }

    const url = LINKS[target];
    if (url) window.location.href = url;
  }, true);
})();
`;

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    if (!response) return response;

    const url = new URL(request.url);
    const headers = new Headers(response.headers);
    headers.set("x-gomo-central-version", "1.11");

    if (url.pathname === "/assets/app-v1.5.js" && response.ok) {
      const source = await response.text();
      headers.delete("content-length");
      headers.delete("etag");
      headers.set("content-type", "application/javascript; charset=utf-8");
      headers.set("cache-control", "no-store");

      return new Response(`${source}\n${R5_NAV_PATCH}`, {
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
