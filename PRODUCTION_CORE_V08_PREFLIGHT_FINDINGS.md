# GoMo Core v0.8 — Preflight findings (NO PRODUCTION DEPLOY)

Date: 2026-09-07

## Safety result

The production-preparation preflight stopped before any production dry-run or active-traffic deployment because the live Core topology did not match the previously documented production assumption.

- Candidate Core commit validated locally: `6472e5a320e8981b5b954ff7f4b922299151970c`
- Local regression suite: 30/30 passed
- Syntax checks: passed
- Read-only production D1 checks: passed before the topology gate
- No migration applied
- No backfill applied
- No manual Core refresh executed
- No active-traffic production deployment executed by this preparation workflow

## Blocking discrepancy

Previously expected production Core D1:

- Name: `gomo-core-db`
- ID: `ac1b5094-c1f9-4706-b29b-8507e6f85a92`

Read-only Cloudflare Worker settings for `gomo-central` currently report:

- `CORE_DB` ID: `45ca2537-70d2-409c-9db1-2fa1772c0a2d`
- This ID is the dedicated v0.8 test D1 (`gomo-core-v08-read-test-db`)
- `CORE_CURRENT_READS=1`
- `GOMO_CORE_MODE=test`
- Cron: `15 * * * *`
- `GOMO_ASSISTANT` -> `gomo-assistant-v2`
- `SHINY` -> `gomo-shiny-central`

Because the D1 binding differed from the expected production D1, the safety gate failed and the Wrangler production dry-run was skipped.

## Active deployment audit

A separate read-only active-deployment audit then confirmed the current public state:

### `gomo-central`

- Active version: `39ba06b8-957e-4a0c-b802-19c898b4c933`
- Traffic: 100%
- Deployment ID: `951d73b8-8bf1-46b2-aca1-2ee3f7dd3ab0`
- `/api/core/status`: HTTP 200
- Core version: `0.8.0-read-optimization-test`
- Mode: `shared-data-test`
- Members: 94

### `gomo-core-test`

- Active version: `292b7ce8-efbe-4415-92b8-879c4c8fb7b3`
- Traffic: 100%
- `/api/core/status`: HTTP 200
- Core version: `0.8.0-read-optimization-test`
- Mode: `shared-data-test`
- Members: 94

### `gomo-central-site`

- Active version: `cde7c2da-3861-47c2-81cf-33e7b3f66dbc`
- Traffic: 100%
- `/api/core/status`: HTTP 404

## Interpretation

`gomo-central` is currently the public Core endpoint and is already serving the v0.8 test application at 100% traffic while its Worker settings point to the dedicated test D1. Therefore the previous plan — "promote v0.8 from test D1 to the separate production D1" — cannot safely proceed until the existing live topology is reconciled.

The application field `productionUntouched: true` must not be used as evidence of infrastructure isolation because the live Cloudflare binding currently points `gomo-central` to the test D1.

## Locked safety branches

- Main snapshot before preparation: `eecfedc139f94d2b57c475fe2e053a3f97adc26e`
- Backup branch: `backup/main-before-core-v08-2026-09-07`
- Preparation branch: `prepare/core-v08-production-2026-09-07`

## Required next step — read only

Before any production change, trace the deployment history of `gomo-central` to identify:

1. when `gomo-central` became bound to D1 `45ca2537-70d2-409c-9db1-2fa1772c0a2d`;
2. which prior active version was the last known stable Core version using the intended production topology;
3. whether `gomo-core-db` (`ac1b5094-c1f9-4706-b29b-8507e6f85a92`) is still the intended production database;
4. whether the safe target should be to rebind the current v0.8 application to `gomo-core-db`, or formally promote the currently live test D1 after a separate data-consistency decision.

Until that read-only investigation is complete: do not merge `main`, do not change Worker bindings, do not migrate/backfill D1, do not manually refresh Core, and do not deploy to active production traffic.
