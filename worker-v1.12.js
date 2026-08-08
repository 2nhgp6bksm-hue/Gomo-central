// GoMo Central v20.12 — restauration de l’image GoMo Assistant uniquement.
import baseWorker from "./worker-v1.11.js";

const ASSISTANT_IMAGE_PATH = "/icons/gomo-assistant.png";
const ASSISTANT_IMAGE_FALLBACK = "https://raw.githubusercontent.com/2nhgp6bksm-hue/Gomo-central/main/icons/gomo-assistant.png";

function assistantImageRequest(request) {
  const url = new URL(request.url);
  url.pathname = ASSISTANT_IMAGE_PATH;
  url.search = "";
  url.hash = "";
  return new Request(url.toString(), request);
}

async function serveAssistantImage(request, env) {
  if (env?.ASSETS?.fetch) {
    const asset = await env.ASSETS.fetch(assistantImageRequest(request));
    if (asset.ok) {
      const headers = new Headers(asset.headers);
      headers.set("cache-control", "public, max-age=3600");
      return new Response(asset.body, {
        status: asset.status,
        statusText: asset.statusText,
        headers
      });
    }
  }

  return Response.redirect(ASSISTANT_IMAGE_FALLBACK, 302);
}

function rewriteAssistantImage(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("text/html")) return response;

  const handler = {
    element(element) {
      element.setAttribute("src", `${ASSISTANT_IMAGE_PATH}?v=20.12`);
    }
  };

  return new HTMLRewriter()
    .on('img[src="icons/gomo-assistant.png"]', handler)
    .on('img[src="/icons/gomo-assistant.png"]', handler)
    .transform(response);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === ASSISTANT_IMAGE_PATH) {
      return serveAssistantImage(request, env);
    }

    const response = await baseWorker.fetch(request, env, ctx);
    return rewriteAssistantImage(response);
  }
};
