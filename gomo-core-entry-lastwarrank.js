import baseEntry from "./gomo-core-entry.js";
import { handleLastWarRankTest } from "./lastwarrank-test.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/core/lastwarrank-test") {
      return handleLastWarRankTest(request, env);
    }
    return baseEntry.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    if (typeof baseEntry.scheduled === "function") {
      return baseEntry.scheduled(event, env, ctx);
    }
  },
};
