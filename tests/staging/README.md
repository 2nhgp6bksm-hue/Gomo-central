# GoMo — staged integration, not activated (2026-10-15)

This is **preparation only**. The existing `.github/workflows/lastwar-tools-probe-once.yml` and `tests/lastwar-tools-probe.mjs` are unchanged. No schedule, live supplier call, or new active workflow has been introduced.

Files:
- `gomo-archive-real-staged.mjs`: preflight and single-request encrypted capture, using the tested archive modules.
- `gomo-archive-public.pem`: public encryption key only (never a private key).
- `gomo-archive-real-workflow.yml.template`: inactive template, intentionally outside `.github/workflows`.

Before any future real activation:
1. Review and test the new integration end-to-end with mock supplier data (zero tokens). The component tests for encryption and private archive are not an end-to-end test of this staged script.
2. Confirm that the target date has no valid snapshot in **all** private archives (including Library), and that the daily count of Alliance Members requests, including failed calls, is within the owner's limits. The staged script checks only the private GitHub archive for existing daily snapshots; it does not discover Library-only snapshots or failed requests.
3. Check the current token price and available balance when possible; historical 2-token price is not a guaranteed future tariff. The owner has authorized a first uncertain-cost request, not an unlimited number.
4. Confirm the environment secret is scoped to `gomo-archive-test` and the archive token to the private archive repo only.
5. Explicitly obtain approval to enable the workflow template; retain manual dispatch only unless the owner separately authorizes scheduled supplier collection.
6. Keep the original J0–J13 and any later snapshots intact. Never overwrite an existing path.
7. Validate recovery and compare by UID to the previous valid snapshot. This staged code archives the raw response; it does not yet perform historical UID comparison.

Failure behavior: no automatic supplier retries, encrypted recovery in logs if capture is sealed, archive writes are create-only and readback verified. No private key is present in the workflow.

**No activation without explicit owner validation.**
