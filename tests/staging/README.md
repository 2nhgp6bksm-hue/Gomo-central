# GoMo — staged integration, not activated (2026-10-15)

This is **preparation only**. The existing `.github/workflows/lastwar-tools-probe-once.yml` and `tests/lastwar-tools-probe.mjs` are unchanged. No schedule, live supplier call, or new active workflow has been introduced.

Files:
- `gomo-archive-real-staged.mjs`: preflight and single-request encrypted capture, using the tested archive modules.
- `gomo-archive-public.pem`: public encryption key only (never a private key).
- `gomo-archive-real-workflow.yml.template`: inactive template, intentionally outside `.github/workflows`.

Before any future real activation:
1. Run the separate fictitious-only integration test. It calls the staged script with an injected mock supplier, storing only under `_tests/staging/` in the private archive. It never receives the LastWar Tools secret.
2. Confirm that the target date has no valid snapshot in **all** private archives (including Library). The staged script checks the private GitHub archive, but cannot discover Library-only snapshots. Enter the verified number of other daily supplier attempts, including failed calls, as `prior_requests`; the private `_attempts` directory records every new attempt before calling the supplier. A second attempt needs separate approval. Older or outside-workflow calls must be counted manually.
3. Check the current token price and available balance when possible; historical 2-token price is not a guaranteed future tariff. The owner has authorized a first uncertain-cost request, not an unlimited number.
4. Confirm the environment secret is scoped to `gomo-archive-test` and the archive token to the private archive repo only.
5. Explicitly obtain approval to enable the workflow template; retain manual dispatch only unless the owner separately authorizes scheduled supplier collection.
6. Keep the original J0–J13 and any later snapshots intact. Never overwrite an existing path.
7. Validate recovery and compare by UID to the previous valid snapshot. This staged code archives the raw response; it does not yet perform historical UID comparison.

Failure behavior: no automatic supplier retries; every attempted supplier call first reserves a daily slot, including an HTTP error or uncertain outcome. An encrypted recovery copy appears in logs once a valid response can be sealed. Archive writes are create-only and readback verified. A supplier HTTP failure has no member payload to recover. No private key is present in the workflow.

The TEST workflow `gomo-staging-fake-test.yml` uses the same staged function and a mock supplier; its encrypted files and attempt ledger are in `_tests/staging/`, so they do not count as real captures. A real manual capture remains disabled until explicit approval.

**No activation without explicit owner validation.**
