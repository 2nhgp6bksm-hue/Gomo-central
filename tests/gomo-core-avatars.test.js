import test from "node:test";
import assert from "node:assert/strict";
import {
  enrichCoreMembersWithAvatars,
  handleCoreMemberAvatar,
} from "../gomo-core-avatars.js";

const CORE_ORIGIN = "https://gomo-core-test.example";
const ASSISTANT_ORIGIN = "https://gomo-assistant-v2.gjp86wh7p2.workers.dev";
const GOMO_ID = "gomo_54becf01-9972-4808-bd4c-747ef19c0976";
const OTHER_GOMO_ID = "gomo_5d55b504-21f6-4c1e-b3b4-91505bd06237";

class MemoryCache {
  constructor() {
    this.values = new Map();
  }

  async match(request) {
    const response = this.values.get(new Request(request).url);
    return response ? response.clone() : undefined;
  }

  async put(request, response) {
    this.values.set(new Request(request).url, response.clone());
  }
}

function context() {
  const pending = [];
  return {
    waitUntil(promise) { pending.push(promise); },
    async flush() { await Promise.all(pending); },
  };
}

function member(overrides = {}) {
  return {
    gomoId: GOMO_ID,
    name: "AVILLAI",
    avatarUrl: "https://lastintel.io/legacy-avatar.jpg",
    ...overrides,
  };
}

function catalog(members = [catalogEntry()]) {
  return {
    schema_version: 2,
    generated_at: "2026-08-27T02:35:09.685Z",
    source: "GoMo Assistant",
    members,
  };
}

function catalogEntry(overrides = {}) {
  return {
    member_id: 39,
    gomo_id: GOMO_ID,
    pseudo: "AVILLAI",
    avatar_url: `${ASSISTANT_ORIGIN}/member-avatars-central/39/avatar-v3.jpg`,
    avatar_version: 3,
    avatar_updated_at: "2026-08-27T02:35:09.685Z",
    avatar_source: "central",
    ...overrides,
  };
}

function assistant(catalogValue = catalog(), image = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])) {
  let available = true;
  let imageReads = 0;
  return {
    setAvailable(value) { available = value; },
    get imageReads() { return imageReads; },
    async fetch(request) {
      if (!available) throw new Error("assistant unavailable");
      const path = new URL(request.url).pathname;
      if (path === "/api/public/members") {
        return Response.json(catalogValue, {
          headers: { "cache-control": "public, max-age=60" },
        });
      }
      if (path === "/member-avatars-central/39/avatar-v3.jpg") {
        imageReads += 1;
        return new Response(request.method === "HEAD" ? null : image, {
          headers: {
            "content-type": "image/jpeg",
            "content-length": String(image.byteLength),
            etag: '"avatar-v3"',
          },
        });
      }
      return new Response("not found", { status: 404 });
    },
  };
}

function environment(binding, coreDb = null) {
  return {
    GOMO_ASSISTANT: binding,
    GOMO_ASSISTANT_PUBLIC_ORIGIN: ASSISTANT_ORIGIN,
    CORE_DB: coreDb,
  };
}

test.beforeEach(() => {
  globalThis.caches = { default: new MemoryCache() };
});

test.afterEach(() => {
  delete globalThis.caches;
});

test("associe une photo Assistant par gomoId et publie une URL Core versionnée", async () => {
  const ctx = context();
  const result = await enrichCoreMembersWithAvatars(
    [member()],
    new Request(`${CORE_ORIGIN}/api/core/members`),
    environment(assistant()),
    ctx,
  );
  await ctx.flush();

  assert.equal(result.members[0].avatarUrl, `${CORE_ORIGIN}/api/core/members/${GOMO_ID}/avatar?v=3`);
  assert.equal(result.members[0].avatarVersion, 3);
  assert.equal(result.members[0].avatarMatch, "gomoId");
  assert.equal(result.avatarStats.matched, 1);
  assert.equal(result.avatarStats.ambiguous, 0);
});

test("ne remplace jamais un gomoId différent sur la seule égalité du pseudo", async () => {
  const ctx = context();
  const binding = assistant(catalog([catalogEntry({ gomo_id: OTHER_GOMO_ID })]));
  const original = member();
  const result = await enrichCoreMembersWithAvatars(
    [original],
    new Request(`${CORE_ORIGIN}/api/core/members`),
    environment(binding),
    ctx,
  );
  await ctx.flush();

  assert.deepEqual(result.members[0], original);
  assert.equal(result.avatarStats.matched, 0);
  assert.equal(result.avatarStats.missing, 1);
});

test("conserve la photo existante si le catalogue Assistant est indisponible", async () => {
  const binding = assistant();
  binding.setAvailable(false);
  const original = member();
  const result = await enrichCoreMembersWithAvatars(
    [original],
    new Request(`${CORE_ORIGIN}/api/core/members`),
    environment(binding),
    context(),
  );

  assert.deepEqual(result.members[0], original);
  assert.equal(result.avatarStats.catalogAvailable, false);
});

test("réutilise le dernier catalogue valide si Assistant tombe ensuite", async () => {
  const binding = assistant();
  const env = environment(binding);
  const req = new Request(`${CORE_ORIGIN}/api/core/members`);
  const firstContext = context();
  await enrichCoreMembersWithAvatars([member()], req, env, firstContext);
  await firstContext.flush();

  binding.setAvailable(false);
  const second = await enrichCoreMembersWithAvatars([member()], req, env, context());
  assert.equal(second.members[0].avatarVersion, 3);
  assert.equal(second.avatarCatalogSource, "edge-cache");
  assert.equal(second.avatarStats.catalogAvailable, true);
});

test("sert et met en cache une photo versionnée sans second appel à Assistant", async () => {
  const binding = assistant();
  const env = environment(binding);
  const ctx = context();
  const url = new URL(`${CORE_ORIGIN}/api/core/members/${GOMO_ID}/avatar?v=3`);

  const first = await handleCoreMemberAvatar(new Request(url), env, ctx, url, GOMO_ID);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("content-type"), "image/jpeg");
  assert.equal(first.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(first.headers.get("x-gomo-core-avatar-cache"), "MISS");
  assert.deepEqual(new Uint8Array(await first.arrayBuffer()), new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
  await ctx.flush();
  assert.equal(binding.imageReads, 1);

  binding.setAvailable(false);
  const second = await handleCoreMemberAvatar(new Request(url), env, context(), url, GOMO_ID);
  assert.equal(second.status, 200);
  assert.equal(second.headers.get("x-gomo-core-avatar-cache"), "HIT");
  assert.deepEqual(new Uint8Array(await second.arrayBuffer()), new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
  assert.equal(binding.imageReads, 1);
});

test("redirige une ancienne version vers la version courante", async () => {
  const env = environment(assistant());
  const ctx = context();
  const url = new URL(`${CORE_ORIGIN}/api/core/members/${GOMO_ID}/avatar?v=2`);
  const response = await handleCoreMemberAvatar(new Request(url), env, ctx, url, GOMO_ID);
  await ctx.flush();

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), `${CORE_ORIGIN}/api/core/members/${GOMO_ID}/avatar?v=3`);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("retombe sur la dernière photo LastIntel si Assistant et le cache sont indisponibles", async () => {
  const binding = assistant();
  binding.setAvailable(false);
  const coreDb = {
    prepare() {
      return {
        bind() {
          return { async first() { return { avatar_url: "https://lastintel.io/member/known.jpg" }; } };
        },
      };
    },
  };
  const env = environment(binding, coreDb);
  const url = new URL(`${CORE_ORIGIN}/api/core/members/${GOMO_ID}/avatar?v=3`);
  const response = await handleCoreMemberAvatar(new Request(url), env, context(), url, GOMO_ID);

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://lastintel.io/member/known.jpg");
  assert.equal(response.headers.get("cache-control"), "no-store");
});
