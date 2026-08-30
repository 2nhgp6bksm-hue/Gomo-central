import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ASSISTANT_RETURN_FALLBACK,
  resolveAssistantReturnUrl,
} from "../assistant-return.mjs";

const workerSource = fs.readFileSync(
  new URL("../worker-v1.14.js", import.meta.url),
  "utf8",
);

const productionAssistant =
  "https://gomo-assistant-v2.gjp86wh7p2.workers.dev/";
const previewAssistant =
  "https://9f812742-gomo-assistant-v2.gjp86wh7p2.workers.dev/";

assert.equal(resolveAssistantReturnUrl(productionAssistant), productionAssistant);
assert.equal(resolveAssistantReturnUrl(previewAssistant), previewAssistant);

for (const unsafeReturnUrl of [
  null,
  "",
  "http://gomo-assistant-v2.gjp86wh7p2.workers.dev/",
  "https://evil.example/",
  "https://gomo-assistant-v2.gjp86wh7p2.workers.dev.evil.example/",
  "https://preview-gomo-assistant-v2.gjp86wh7p2.workers.dev.evil.example/",
  "https://user@gomo-assistant-v2.gjp86wh7p2.workers.dev/",
  "https://gomo-assistant-v2.gjp86wh7p2.workers.dev:8443/",
  "javascript:alert(1)",
]) {
  assert.equal(
    resolveAssistantReturnUrl(unsafeReturnUrl),
    ASSISTANT_RETURN_FALLBACK,
  );
}

const dynamicRequest = new URL(
  `https://core.test/core/?returnUrl=${encodeURIComponent(previewAssistant)}`,
);
assert.equal(
  resolveAssistantReturnUrl(dynamicRequest.searchParams.get("returnUrl")),
  previewAssistant,
);

assert.match(workerSource, /url\.pathname === "\/core"/);
assert.match(workerSource, /url\.pathname === "\/core\/"\)/);
assert.match(workerSource, /coreUrl\.pathname = "\/"/);
assert.match(workerSource, /searchParams\.get\("returnUrl"\)/);
assert.ok(workerSource.includes('<base href="/">'));
assert.ok(workerSource.includes('class="gomo-assistant-return"'));
assert.equal(
  workerSource.includes(
    "v2-clean-" + "private-manual-gomo-assistant-v2.gjp86wh7p2.workers.dev",
  ),
  false,
);
assert.equal(workerSource.includes("94cd1ba3-gomo-core-test"), false);

console.log("Core Assistant return backport tests passed");
