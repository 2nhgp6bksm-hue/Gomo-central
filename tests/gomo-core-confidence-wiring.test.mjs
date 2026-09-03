import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("v07 route refresh through stable confidence persistence", () => {
  const source = readFileSync(new URL("../gomo-core-entry-v07.js", import.meta.url), "utf8");
  assert.match(
    source,
    /import \{ persist \} from "\.\/gomo-core-v06-storage-stable-confidence\.js";/,
  );
  assert.doesNotMatch(
    source,
    /import \{ persist \} from "\.\/gomo-core-v06-storage\.js";/,
  );
});
