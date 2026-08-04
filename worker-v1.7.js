import baseWorker from "./worker-v1.6.js";

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    if (!response) return response;
    const headers = new Headers(response.headers);
    headers.set("x-gomo-central-version", "1.7");
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  }
};
