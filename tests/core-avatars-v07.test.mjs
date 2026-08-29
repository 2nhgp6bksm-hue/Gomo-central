import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const wranglerConfig = JSON.parse(
  fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
);

test("la v0.7 utilise Assistant par Service Binding sans stockage photo Core", () => {
  assert.equal(wranglerConfig.name, "gomo-core-test");
  assert.equal(wranglerConfig.main, "gomo-core-entry-v071.js");
  assert.equal(wranglerConfig.kv_namespaces, undefined);
  assert.equal(wranglerConfig.r2_buckets, undefined);
  assert.deepEqual(
    wranglerConfig.services.find((binding) => binding.binding === "GOMO_ASSISTANT"),
    { binding: "GOMO_ASSISTANT", service: "gomo-assistant-v2" },
  );
});
