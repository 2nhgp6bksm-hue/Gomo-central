import { writeFileSync } from "node:fs";

const [databaseId, adminKey, output = "validation/read-wrangler.generated.json"] = process.argv.slice(2);
if (!databaseId || !adminKey) {
  throw new Error("Usage: node validation/read-write-config.mjs <database-id> <admin-key> [output]");
}

const workerName = process.env.VALIDATION_WORKER_NAME;
const databaseName = process.env.VALIDATION_DATABASE_NAME;
if (!workerName || !databaseName) throw new Error("Validation resource names are required");
if (workerName === "gomo-core-test" || databaseName === "gomo-core-db") {
  throw new Error("Refusing to target a production-named resource");
}
if (databaseId === "ac1b5094-c1f9-4706-b29b-8507e6f85a92") {
  throw new Error("Refusing to target the production D1 database ID");
}

const config = {
  name: workerName,
  main: "read-cloudflare-entry.js",
  compatibility_date: "2026-08-07",
  compatibility_flags: ["nodejs_compat"],
  vars: {
    GOMO_CORE_MODE: "isolated-d1-read-validation",
    GOMO_CORE_ADMIN_KEY: adminKey,
    CORE_CURRENT_READS: "1",
    CORE_PUBLIC_CACHE_SECONDS: "300",
    ALLIANCE_ABBR: "GoMo",
    ALLIANCE_NAME: "God venoM",
    ALLIANCE_ID: "26227dc9fb2945edaee8c7675c8fed5d",
    SERVER_ID: "1591",
    LASTRANK_URL: "https://www.lastrank.fun/a/26227dc9fb2945edaee8c7675c8fed5d",
    LASTINTEL_MCP_URL: "https://mcp.lastintel.io/",
    LASTINTEL_WEB_BASE: "https://lastintel.io/",
    LASTINTEL_ALLIANCE_ID: "jzpvMwRRgPkPWtOgEraW9g",
    LASTWARRANK_URL: "https://www.lastwarrank.com/alliance/MRMCVY2KTB",
    GOMO_ASSISTANT_PUBLIC_ORIGIN: "https://gomo-assistant-v2.gjp86wh7p2.workers.dev",
  },
  d1_databases: [{ binding: "CORE_DB", database_name: databaseName, database_id: databaseId }],
  services: [{ binding: "GOMO_ASSISTANT", service: "gomo-assistant-v2" }],
  observability: { enabled: true },
};

writeFileSync(output, `${JSON.stringify(config, null, 2)}\n`);
