// GoMo Central — branche test : retrait complet du VS Planner intégré.
// Cette couche s'appuie sur la version 20.15 existante sans modifier main.
import baseWorker from "./worker-v1.14.js";

const REMOVED_PREFIX = "/vs-planner";
const REMOVED_ICON = "/icons/vs-planner.png";

function clientVsPlannerCleanup() {
  if (window.__GOMO_VS_PLANNER_REMOVED__) return;
  window.__GOMO_VS_PLANNER_REMOVED__ = true;

  const isPlannerReference = (element) => {
    if (!(element instanceof Element)) return false;
    const href = element.getAttribute("href") || "";
    const src = element.getAttribute("src") || "";
    const data = [
      element.getAttribute("data-go"),
      element.getAttribute("data-url"),
      element.getAttribute("data-tool"),
      element.getAttribute("data-page"),
      element.getAttribute("data-open")
    ].filter(Boolean).join(" ");
    return /vs-planner/i.test(`${href} ${src} ${data}`) || /\bVS Planner\b/i.test(element.textContent || "");
  };

  const removePlannerUi = () => {
    document.querySelectorAll(
      'a[href*="vs-planner"],img[src*="vs-planner"],[data-go*="vs-planner"],[data-url*="vs-planner"],[data-tool*="vs-planner"],[data-page*="vs-planner"],[data-open*="vs-planner"]'
    ).forEach((element) => {
      const owner = element.closest("a,button,.royal-nav-button,.gomo-quick-card,.tool-card,article,li") || element;
      owner.remove();
    });

    document.querySelectorAll("a,button,.royal-nav-button,.gomo-quick-card,.tool-card,article,li").forEach((element) => {
      if (isPlannerReference(element)) element.remove();
    });

    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (!/VS Planner/i.test(node.nodeValue || "")) return;
      node.nodeValue = (node.nodeValue || "")
        .replace(/\s*,?\s*VS Planner\s*,?/gi, (match) => match.includes(",") ? ", " : "")
        .replace(/\s{2,}/g, " ")
        .replace(/^,\s*|,\s*$/g, "");
    });
  };

  removePlannerUi();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", removePlannerUi, { once:true });
  window.addEventListener("pageshow", removePlannerUi);

  const observer = new MutationObserver(() => queueMicrotask(removePlannerUi));
  const observe = () => observer.observe(document.documentElement, { childList:true, subtree:true });
  if (document.documentElement) observe();
  else document.addEventListener("DOMContentLoaded", observe, { once:true });
}

function appendCleanupScript(response) {
  return response.text().then((source) => {
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("etag");
    headers.set("content-type", "application/javascript; charset=utf-8");
    headers.set("cache-control", "no-store, max-age=0");
    return new Response(`${source}\n;(${clientVsPlannerCleanup.toString()})();\n`, {
      status:response.status,
      statusText:response.statusText,
      headers
    });
  });
}

function removedResponse() {
  return new Response("Not Found", {
    status:404,
    headers:{
      "content-type":"text/plain; charset=utf-8",
      "cache-control":"no-store, max-age=0",
      "x-robots-tag":"noindex, nofollow"
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === REMOVED_PREFIX || url.pathname.startsWith(`${REMOVED_PREFIX}/`) || url.pathname === REMOVED_ICON) {
      return removedResponse();
    }

    const response = await baseWorker.fetch(request, env, ctx);
    if (!response.ok) return response;

    if (url.pathname === "/assets/app-v1.5.js" || url.pathname === "/assets/gomo-v19.js") {
      return appendCleanupScript(response);
    }

    return response;
  }
};
