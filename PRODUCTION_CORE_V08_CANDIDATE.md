# GoMo Core v0.8 — Production candidate (no deploy)

Prepared on 2026-09-07.

## Locked references

- Current production main snapshot: `eecfedc139f94d2b57c475fe2e053a3f97adc26e`
- Backup branch: `backup/main-before-core-v08-2026-09-07`
- Validated test source: `6472e5a320e8981b5b954ff7f4b922299151970c`
- Test branch: `test/core-d1-read-optimization`
- Preparation branch: `prepare/core-v08-production-2026-09-07`

## Important merge rule

Do **not** merge the full test branch into `main`.

The branches diverged substantially from an old merge base. The test branch contains many Core validation files and test-specific/deleted site assets that are unrelated to the production-site branch. Production promotion must therefore be a targeted Core Worker deployment from the validated Core application, not a wholesale branch merge.

## Validated test state

- Core version: `0.8.0-read-optimization-test`
- Canonical members: 94
- LastIntel: 94 / ok
- LastRank: 94 / ok
- LastWarRank: 80 / ok
- Membership authority: LastIntel
- Production untouched: true
- Unchanged-member write suppression: enabled
- Current-state reads: enabled
- Dedicated test D1: `gomo-core-v08-read-test-db`
- Test D1 ID: `45ca2537-70d2-409c-9db1-2fa1772c0a2d`
- Test Cron: `15 * * * *`

Observed 24 h test metrics before production preparation:

- ~87k rows read
- ~9k rows written
- ~385 total queries
- ~186 write queries

## Production target — verify again immediately before deploy

- Worker: `gomo-central`
- D1: `gomo-core-db`
- D1 ID: `ac1b5094-c1f9-4706-b29b-8507e6f85a92`
- Expected Cron: `15 * * * *`
- Required bindings: `CORE_DB`, `GOMO_ASSISTANT`, `SHINY`, `AI`
- `CORE_CURRENT_READS=1`

## Mandatory final preflight before any deploy

1. Confirm the production Worker settings and bindings are unchanged.
2. Confirm the production D1 ID is exactly the expected ID.
3. Confirm the production Cron is exactly `15 * * * *`.
4. Capture the current production Worker version for immediate rollback.
5. Run the full Core test suite and syntax checks against the exact candidate source.
6. Run Wrangler dry-run only; no D1 migration, backfill or manual refresh.
7. Confirm `/api/core/status`, `/api/core/members`, and `/api/core/power` expectations for the post-deploy smoke test: HTTP 200 and 94 members.
8. Stop and request explicit final authorization before deploying.

## Rollback policy

If the later production smoke test fails, rollback immediately to the production Worker version captured in preflight. Do not migrate, backfill, manually refresh, merge `main`, or alter the production D1 schema as part of this v0.8 promotion.

## Current state

**PREPARED — NOT DEPLOYED.**
