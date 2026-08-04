import baseWorker from "./worker-v1.10.js";

const SHINY_COPY_PATCH = String.raw`
(() => {
  const COPY_LABEL = '📋 Copier les serveurs';
  const COPIED_LABEL = '✓ Copié';

  function getServers() {
    let nodes = Array.from(document.querySelectorAll('#shinyConfirmed .shiny-chip.confirmed'));
    if (!nodes.length) {
      nodes = Array.from(document.querySelectorAll('#shinyProbable .shiny-chip.probable'));
    }

    return nodes
      .map((node) => String(node.textContent || '').trim())
      .filter((value) => /^\d+$/.test(value));
  }

  async function copyServers(button) {
    const servers = getServers();
    if (!servers.length) return;

    const text = servers.join(', ');
    let copied = false;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (_) {}

    if (!copied) {
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        area.style.pointerEvents = 'none';
        document.body.appendChild(area);
        area.focus();
        area.select();
        copied = document.execCommand('copy');
        area.remove();
      } catch (_) {}
    }

    if (copied) {
      button.textContent = COPIED_LABEL;
      window.setTimeout(() => {
        button.textContent = COPY_LABEL;
      }, 1600);
    }
  }

  function installCopyButton() {
    if (document.getElementById('shinyCopyServers')) return true;

    const actions = document.querySelector('#shiny .shiny-actions');
    if (!actions) return false;

    const button = document.createElement('button');
    button.id = 'shinyCopyServers';
    button.type = 'button';
    button.className = 'shiny-refresh';
    button.textContent = COPY_LABEL;
    button.style.minWidth = '180px';
    button.style.fontSize = '16px';
    button.setAttribute('aria-label', 'Copier la liste des serveurs Shiny du jour');
    button.addEventListener('click', () => copyServers(button));

    actions.appendChild(button);
    return true;
  }

  if (!installCopyButton()) {
    const observer = new MutationObserver(() => {
      if (installCopyButton()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.setTimeout(() => observer.disconnect(), 15000);
  }
})();
`;

const bodyHandler = {
  element(element) {
    element.append(`<script>${SHINY_COPY_PATCH}</script>`, { html: true });
  }
};

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    if (!response) return response;

    const url = new URL(request.url);
    const headers = new Headers(response.headers);
    headers.set("x-gomo-central-version", "1.12.0");

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
        .on("body", bodyHandler)
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
