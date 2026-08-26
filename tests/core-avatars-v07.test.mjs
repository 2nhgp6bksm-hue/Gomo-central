import assert from "node:assert/strict";
import fs from "node:fs";
import {
  enrichCoreMembersWithAvatars,
  handleCoreMemberAvatar,
  validGomoId,
} from "../gomo-core-avatars-v07.js";

const wranglerConfig = JSON.parse(fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
assert.deepEqual(
  wranglerConfig.kv_namespaces.find((binding) => binding.binding === "MEMBER_AVATARS"),
  { binding: "MEMBER_AVATARS", id: "220571117de542e7883c036b34729811" },
);

const centralId = "gomo_11111111-1111-4111-8111-111111111111";
const libraryId = "gomo_22222222-2222-4222-8222-222222222222";
const sourceId = "gomo_33333333-3333-4333-8333-333333333333";
assert.equal(validGomoId(centralId), true);
assert.equal(validGomoId("gomo_not-valid"), false);

const avatarBytes = new Uint8Array(48);
avatarBytes.set(new TextEncoder().encode("RIFF"), 0);
avatarBytes.set(new TextEncoder().encode("WEBP"), 8);
const etag = `"${"a".repeat(64)}"`;
const catalog = JSON.stringify({
  schema_version: 2,
  generated_at: "2026-08-26T20:00:00.000Z",
  members: [
    {
      member_id: 5,
      gomo_id: centralId,
      pseudo: "Membre renommé",
      avatar_url: "https://assistant.test/member-avatars-central/5/avatar-v3.webp",
      avatar_source: "central",
      avatar_version: 3,
      avatar_updated_at: "2026-08-26T19:55:00.000Z",
    },
    {
      member_id: 8,
      gomo_id: null,
      pseudo: "Ancien Nom",
      avatar_url: "https://assistant.test/member-avatars/1102.webp",
      avatar_source: "library",
      avatar_version: 1,
    },
  ],
});

class KVMock {
  async get(key) {
    return key === "catalog/members.json" ? catalog : null;
  }

  async getWithMetadata(key, options) {
    if (key !== "members/5/avatar-v3.webp") return { value: null, metadata: null };
    return {
      value: options?.type === "stream"
        ? new Response(avatarBytes).body
        : avatarBytes.buffer.slice(avatarBytes.byteOffset, avatarBytes.byteOffset + avatarBytes.byteLength),
      metadata: { contentType: "image/webp", size: avatarBytes.byteLength, etag },
    };
  }
}

class StatementMock {
  constructor(sql, database, params = []) {
    this.sql = sql;
    this.database = database;
    this.params = params;
  }

  bind(...params) {
    return new StatementMock(this.sql, this.database, params);
  }

  async all() {
    if (this.sql.includes("core_member_aliases")) {
      const gomoId = this.params[0];
      return { results: (this.database.names[gomoId] || []).map((name) => ({ name })) };
    }
    return { results: [] };
  }

  async first() {
    if (this.sql.includes("core_canonical_snapshots")) {
      return this.params[0] === sourceId
        ? { avatar_url: "https://lastintel.io/api/v1/avatar/source-test?v=4" }
        : null;
    }
    return null;
  }
}

const database = {
  names: {
    [centralId]: ["Membre renommé"],
    [libraryId]: ["Nouveau Nom", "Ancien Nom"],
    [sourceId]: ["Source seulement"],
  },
  prepare(sql) {
    return new StatementMock(sql, this);
  },
};

const env = {
  MEMBER_AVATARS: new KVMock(),
  CORE_DB: database,
  GOMO_ASSISTANT_PUBLIC_ORIGIN: "https://assistant.test",
};

const coreMembers = [
  { gomoId: centralId, name: "Membre renommé", avatarUrl: "https://lastintel.io/old" },
  { gomoId: sourceId, name: "Source seulement", avatarUrl: "https://lastintel.io/source" },
];
const enriched = await enrichCoreMembersWithAvatars(coreMembers, env, "https://core.test");
assert.equal(
  enriched[0].avatarUrl,
  `https://core.test/api/core/members/${centralId}/avatar?v=3`,
);
assert.equal(enriched[0].avatarVersion, 3);
assert.equal(enriched[0].avatarSource, "gomo-core-central");
assert.equal(enriched[1].avatarUrl, "https://lastintel.io/source");

let request = new Request(`https://core.test/api/core/members/${centralId}/avatar`);
let response = await handleCoreMemberAvatar(request, env, new URL(request.url), centralId);
assert.equal(response.status, 302);
assert.equal(response.headers.get("Location"), `https://core.test/api/core/members/${centralId}/avatar?v=3`);
assert.equal(response.headers.get("Cache-Control"), "no-store");

request = new Request(`https://core.test/api/core/members/${centralId}/avatar?v=3`);
response = await handleCoreMemberAvatar(request, env, new URL(request.url), centralId);
assert.equal(response.status, 200);
assert.equal(response.headers.get("Content-Type"), "image/webp");
assert.equal(response.headers.get("Content-Length"), String(avatarBytes.byteLength));
assert.match(response.headers.get("Cache-Control"), /immutable/);
assert.deepEqual(new Uint8Array(await response.arrayBuffer()), avatarBytes);

request = new Request(`https://core.test/api/core/members/${centralId}/avatar?v=3`, {
  headers: { "If-None-Match": etag },
});
response = await handleCoreMemberAvatar(request, env, new URL(request.url), centralId);
assert.equal(response.status, 304);

request = new Request(`https://core.test/api/core/members/${libraryId}/avatar`);
response = await handleCoreMemberAvatar(request, env, new URL(request.url), libraryId);
assert.equal(response.status, 302);
assert.equal(response.headers.get("Location"), "https://assistant.test/member-avatars/1102.webp");

request = new Request(`https://core.test/api/core/members/${sourceId}/avatar`);
response = await handleCoreMemberAvatar(request, env, new URL(request.url), sourceId);
assert.equal(response.status, 302);
assert.equal(response.headers.get("Location"), "https://lastintel.io/api/v1/avatar/source-test?v=4");

const noStorageEnv = { CORE_DB: database, GOMO_ASSISTANT_PUBLIC_ORIGIN: "https://assistant.test" };
const unchanged = await enrichCoreMembersWithAvatars(coreMembers, noStorageEnv, "https://core.test");
assert.deepEqual(unchanged, coreMembers);
request = new Request(`https://core.test/api/core/members/${centralId}/avatar?v=3`);
response = await handleCoreMemberAvatar(request, noStorageEnv, new URL(request.url), centralId);
assert.equal(response.status, 503);

console.log("GoMo Core central avatars: ok");
