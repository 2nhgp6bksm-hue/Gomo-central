// GoMo Central — branche test : retrait complet de VS Planner et GoMo Coach.
// Cette couche s'appuie sur la version 20.15 existante sans modifier main.
import baseWorker from "./worker-v1.14.js";

const REMOVED_PATHS = new Set([
  "/icons/vs-planner.png",
  "/icons/gomo-coach.png"
]);
const VS_PREFIX = "/vs-planner";

function cleanupClientUi() {
  if (window.__GOMO_CENTRAL_TOOL_CLEANUP__) return;
  window.__GOMO_CENTRAL_TOOL_CLEANUP__ = true;

  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();

  function removeOwner(element) {
    if (!(element instanceof Element)) return;
    const owner = element.closest(
      "a,button,.royal-nav-button,.gomo-quick-card,.tool-card,.nav-item,article,li"
    ) || element;
    owner.remove();
  }

  function removeToolUi() {
    document.querySelectorAll(
      '[data-page="guides"],[data-go="guides"],#guides,' +
      'a[href*="vs-planner"],[data-go*="vs-planner"],[data-url*="vs-planner"],' +
      '[data-tool*="vs-planner"],[data-open*="vs-planner"],' +
      'img[src*="vs-planner"],img[src*="gomo-coach"]'
    ).forEach((element) => {
      if (element.id === "guides") element.remove();
      else removeOwner(element);
    });

    document.querySelectorAll(
      ".royal-nav-button,.gomo-quick-card,.tool-card,.nav-item,a,button"
    ).forEach((element) => {
      const text = normalize(element.textContent);
      const low = text.toLowerCase();
      const isVsButton = element.matches(".royal-nav-button") && low === "vs";
      const isVsPlanner = low.includes("vs planner");
      const isCoach = low.includes("gomo coach");
      const isGuideNav = element.matches("[data-page='guides'],[data-go='guides']");
      if (isVsButton || isVsPlanner || isCoach || isGuideNav) removeOwner(element);
    });

    const root = document.body || document.documentElement;
    if (root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const value = node.nodeValue || "";
        if (!/(VS Planner|GoMo Coach)/i.test(value)) return;
        node.nodeValue = value
          .replace(/\s*,\s*VS Planner\s*,?\s*/gi, ", ")
          .replace(/\s*,\s*GoMo Coach\s*,?\s*/gi, ", ")
          .replace(/\bVS Planner\b/gi, "")
          .replace(/\bGoMo Coach\b/gi, "")
          .replace(/,\s*,/g, ",")
          .replace(/\s{2,}/g, " ")
          .replace(/^\s*,\s*|\s*,\s*$/g, "")
          .trim();
      });
    }

    if (location.hash === "#guides" || location.pathname.startsWith(VS_PREFIX)) {
      history.replaceState(null, "", "/#home");
    }
  }

  removeToolUi();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeToolUi, { once:true });
  }
  window.addEventListener("pageshow", removeToolUi);

  const observer = new MutationObserver(() => queueMicrotask(removeToolUi));
  const startObserver = () => {
    if (document.documentElement) observer.observe(document.documentElement, { childList:true, subtree:true });
  };
  if (document.documentElement) startObserver();
  else document.addEventListener("DOMContentLoaded", startObserver, { once:true });
}

function cleanupBootMarkup() {
  return `<style id="gomo-central-cleanup-style">
    #guides,[data-page="guides"],[data-go="guides"],
    a[href*="vs-planner"],img[src*="vs-planner"],img[src*="gomo-coach"]{display:none!important}
  </style><script>(${cleanupClientUi.toString()})();</script>`;
}

function noStoreHeaders(headers) {
  const next = new Headers(headers);
  next.delete("content-length");
  next.delete("etag");
  next.set("cache-control", "no-store, no-cache, must-revalidate");
  return next;
}

async function cleanHtml(response) {
  if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return response;
  const rewritten = new HTMLRewriter()
    .on("head", { element(element) { element.append(cleanupBootMarkup(), { html:true }); } })
    .on("#guides", { element(element) { element.remove(); } })
    .on('[data-page="guides"]', { element(element) { element.remove(); } })
    .on('[data-go="guides"]', { element(element) { element.remove(); } })
    .transform(response);
  return new Response(rewritten.body, {
    status: rewritten.status,
    statusText: rewritten.statusText,
    headers: noStoreHeaders(rewritten.headers)
  });
}

async function appendCleanupScript(response) {
  const source = await response.text();
  const headers = noStoreHeaders(response.headers);
  headers.set("content-type", "application/javascript; charset=utf-8");
  return new Response(`${source}\n;(${cleanupClientUi.toString()})();\n`, {
    status:response.status,
    statusText:response.statusText,
    headers
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

    if (
      url.pathname === VS_PREFIX ||
      url.pathname.startsWith(`${VS_PREFIX}/`) ||
      REMOVED_PATHS.has(url.pathname)
    ) {
      return removedResponse();
    }

    const response = await baseWorker.fetch(request, env, ctx);
    if (!response.ok) return response;

    if (url.pathname === "/assets/app-v1.5.js" || url.pathname === "/assets/gomo-v19.js") {
      return appendCleanupScript(response);
    }

    return cleanHtml(response);
  }
};
