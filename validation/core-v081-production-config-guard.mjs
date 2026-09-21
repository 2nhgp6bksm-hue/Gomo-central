import fs from "node:fs";
import { execFileSync } from "node:child_process";

const REFERENCE_COMMIT = "bfee327512b4a9790722d5ae202fdf590eda1b1a";
const PRODUCTION_DATABASE_NAME = "gomo-core-db";
const PRODUCTION_DATABASE_ID = "ac1b5094-c1f9-4706-b29b-8507e6f85a92";
const FORBIDDEN_TEST_DATABASE_NAME = "gomo-core-v08-read-test-db";
const FORBIDDEN_TEST_DATABASE_ID = "45ca2537-70d2-409c-9db1-2fa1772c0a2d";
const FORBIDDEN_TEST_WORKER = "gomo-core-test";

const productionUrl = new URL("../wrangler.production.jsonc", import.meta.url);
const testUrl = new URL("../wrangler.jsonc", import.meta.url);
const productionText = fs.readFileSync(productionUrl, "utf8");
const production = JSON.parse(productionText);
const validatedTest = JSON.parse(fs.readFileSync(testUrl, "utf8"));
const errors = [];

if (production.name !== "gomo-central") errors.push("Worker must be gomo-central");
if (production.main !== validatedTest.main) errors.push("Entrypoint differs from the validated candidate");
if (production.compatibility_date !== validatedTest.compatibility_date) errors.push("Compatibility date differs from the validated candidate");
if (JSON.stringify(production.compatibility_flags || []) !== JSON.stringify(validatedTest.compatibility_flags || [])) {
  errors.push("Compatibility flags differ from the validated candidate");
}

const requiredBusinessVariables = [
  "ALLIANCE_ABBR",
  "ALLIANCE_NAME",
  "ALLIANCE_ID",
  "SERVER_ID",
  "LASTRANK_URL",
  "LASTINTEL_MCP_URL",
  "LASTINTEL_WEB_BASE",
  "LASTINTEL_ALLIANCE_ID",
  "LASTWARRANK_URL",
  "CORE_PUBLIC_CACHE_SECONDS",
  "GOMO_ASSISTANT_PUBLIC_ORIGIN",
];

for (const name of requiredBusinessVariables) {
  if (production.vars?.[name] !== validatedTest.vars?.[name]) {
    errors.push(`${name} differs from the validated candidate`);
  }
}

if (production.vars?.GOMO_CORE_MODE !== validatedTest.vars?.GOMO_CORE_MODE) {
  errors.push("GOMO_CORE_MODE must preserve the validated semantics");
}
if (production.vars?.CORE_CURRENT_READS !== "1") errors.push("CORE_CURRENT_READS must be 1");

if (!Array.isArray(production.d1_databases) || production.d1_databases.length !== 1) {
  errors.push("Exactly one production D1 binding is required");
} else {
  const database = production.d1_databases[0];
  if (database.binding !== "CORE_DB") errors.push("D1 binding must be CORE_DB");
  if (database.database_name !== PRODUCTION_DATABASE_NAME) errors.push("D1 database must be gomo-core-db");
  if (database.database_id !== PRODUCTION_DATABASE_ID) errors.push("Unexpected production D1 id");
}

if (production.triggers !== undefined) errors.push("Production preparation must not declare triggers");
if (production.crons !== undefined) errors.push("Production preparation must not declare crons");
if (production.vars?.GOMO_CORE_ADMIN_KEY !== undefined) errors.push("Admin secret must not be stored as a variable");

if (production.assets?.binding !== "ASSETS") errors.push("ASSETS binding is missing");
if (production.assets?.directory !== validatedTest.assets?.directory) errors.push("Assets directory differs from the validated candidate");
if (JSON.stringify(production.assets?.run_worker_first || []) !== JSON.stringify(validatedTest.assets?.run_worker_first || [])) {
  errors.push("Assets routing differs from the validated candidate");
}

const services = new Map((production.services || []).map((service) => [service.binding, service.service]));
if (services.size !== 2) errors.push("Unexpected number of Service Bindings");
if (services.get("SHINY") !== "gomo-shiny-central") errors.push("SHINY binding is invalid");
if (services.get("GOMO_ASSISTANT") !== "gomo-assistant-v2") errors.push("GOMO_ASSISTANT binding is invalid");
if (production.ai?.binding !== "AI") errors.push("AI binding is missing");

if (productionText.includes(FORBIDDEN_TEST_DATABASE_NAME) || productionText.includes(FORBIDDEN_TEST_DATABASE_ID)) {
  errors.push("Production configuration references the forbidden test D1");
}
if (productionText.includes(FORBIDDEN_TEST_WORKER)) {
  errors.push("Production configuration references the forbidden test Worker");
}

const protectedBusinessFiles = [
  "gomo-core-entry-lastwarrank.js",
  "gomo-core-entry-v07.js",
  "gomo-core-entry-v071.js",
  "gomo-core-v06-engine.js",
  "gomo-core-v06-storage.js",
  "gomo-core-v06-storage-stable-confidence.js",
  "gomo-core-d1-observability.js",
];

try {
  execFileSync("git", ["diff", "--quiet", REFERENCE_COMMIT, "--", ...protectedBusinessFiles], {
    cwd: new URL("..", import.meta.url),
    stdio: "ignore",
  });
} catch {
  errors.push(`Protected Core business files differ from ${REFERENCE_COMMIT}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Core v0.8.1 production configuration guard: OK");
