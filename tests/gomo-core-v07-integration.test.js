import test from "node:test";
import assert from "node:assert/strict";
import core from "../gomo-core-entry-v071.js";

const CORE_ORIGIN = "https://core.test";
const ASSISTANT_ORIGIN = "https://gomo-assistant-v2.gjp86wh7p2.workers.dev";
const GOMO_ID = "gomo_54becf01-9972-4808-bd4c-747ef19c0976";

class MemoryCache {
  constructor() { this.values = new Map(); }
  async match(request) {
    const value = this.values.get(new Request(request).url);
    return value ? value.clone() : undefined;
  }
  async put(request, response) {
    this.values.set(new Request(request).url, response.clone());
  }
}

class Statement {
  constructor(sql, params = []) {
    this.sql = sql;
    this.params = params;
  }
  bind(...params) { return new Statement(this.sql, params); }
  async first() {
    if (this.sql.includes("sqlite_master") && this.sql.includes("core_sync_metadata")) {
      return { name: "core_sync_metadata" };
    }
    if (this.sql.includes("sqlite_master") && this.sql.includes("core_public_reports")) {
      return { name: "core_public_reports" };
    }
    if (this.sql.includes("WHERE s.status='ok'")) {
      return {
        sync_id: "sync-test",
        started_at: "2026-08-27T17:00:00.000Z",
        completed_at: "2026-08-27T17:01:00.000Z",
        status: "ok",
        metadata_json: "{}",
      };
    }
    return null;
  }
  async all() {
    if (this.sql.includes("FROM core_canonical_snapshots c")) {
      return {
        results: [{
          gomo_id: GOMO_ID,
          name: "AVILLAI",
          rank: "R3",
          hq: 35,
          power: 123,
          hero_power: 45,
          kills: 67,
          avatar_url: "https://lastintel.io/legacy.jpg",
          confidence: 95,
          confidence_level: "high",
          flags_json: "[]",
          field_sources_json: "{}",
          observed_at: "2026-08-27T17:01:00.000Z",
          active: 1,
          membership_status: "confirmed",
        }],
      };
    }
    return { results: [] };
  }
}

function context() {
  const pending = [];
  return {
    waitUntil(promise) { pending.push(promise); },
    async flush() { await Promise.all(pending); },
  };
}

function environment() {
  return {
    CORE_DB: {
      prepare(sql) { return new Statement(sql); },
      async batch() { return []; },
    },
    GOMO_ASSISTANT_PUBLIC_ORIGIN: ASSISTANT_ORIGIN,
    GOMO_ASSISTANT: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === "/api/public/members") {
          return Response.json({
            schema_version: 2,
            generated_at: "2026-08-27T17:02:00.000Z",
            source: "GoMo Assistant",
            members: [{
              member_id: 39,
              gomo_id: GOMO_ID,
              pseudo: "AVILLAI",
              avatar_url: `${ASSISTANT_ORIGIN}/member-avatars-central/39/avatar-v3.jpg`,
              avatar_version: 3,
              avatar_source: "central",
              avatar_updated_at: "2026-08-27T17:02:00.000Z",
            }],
          });
        }
        if (path === "/member-avatars-central/39/avatar-v3.jpg") {
          return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
            headers: { "content-type": "image/jpeg", etag: '"v3"' },
          });
        }
        return new Response("not found", { status: 404 });
      },
    },
  };
}

test.beforeEach(() => {
  globalThis.caches = { default: new MemoryCache() };
});

test.afterEach(() => {
  delete globalThis.caches;
});

test("la route membres v0.7 publie le contrat avatar central complet", async () => {
  const ctx = context();
  const response = await core.fetch(
    new Request(`${CORE_ORIGIN}/api/core/members`),
    environment(),
    ctx,
  );
  const body = await response.json();
  await ctx.flush();

  assert.equal(response.status, 200);
  assert.equal(body.coreVersion, "0.7.2-test");
  assert.equal(body.avatarContractVersion, 1);
  assert.equal(body.avatarStats.matched, 1);
  assert.equal(body.avatarStats.ambiguous, 0);
  assert.equal(body.members[0].avatarVersion, 3);
  assert.equal(
    body.members[0].avatarUrl,
    `${CORE_ORIGIN}/api/core/members/${GOMO_ID}/avatar?v=3`,
  );
});

test("la route avatar v0.7 diffuse l'image versionnée", async () => {
  const ctx = context();
  const url = new URL(`${CORE_ORIGIN}/api/core/members/${GOMO_ID}/avatar?v=3`);
  const response = await core.fetch(new Request(url), environment(), ctx);
  await ctx.flush();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.deepEqual(
    new Uint8Array(await response.arrayBuffer()),
    new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
  );
});
