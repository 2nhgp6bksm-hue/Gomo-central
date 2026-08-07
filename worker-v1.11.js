// GoMo Central v18.12 — Shiny ouvre la page Cloudflare dédiée.
// Le Radar Netlify n'est pas modifié.
import baseWorker from "./worker-v1.10.js";

const SHINY_URL = "https://gomo-shiny-central.gjp86wh7p2.workers.dev/";

const SHINY_ROUTER_SCRIPT = `
<script id="gomo-shiny-router-v1812">
(() => {
  const SHINY_URL = ${JSON.stringify(SHINY_URL)};

  function goToShiny(event) {
    const target = event.target && event.target.closest
      ? event.target.closest('[data-gomo-shiny-open],[data-page="shiny"],[data-go="shiny"],[data-r5-go="shiny-radar"]')
      : null;

    if (!target) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(SHINY_URL);
  }

  document.addEventListener('click', goToShiny, true);

  if (location.hash === '#shiny') {
    window.location.replace(SHINY_URL);
  }
})();
</script>`;

class BodyAppender {
  element(element) {
    element.append(SHINY_ROUTER_SCRIPT, { html: true });
  }
}

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return response;
    }

    return new HTMLRewriter()
      .on("body", new BodyAppender())
      .transform(response);
  }
};
