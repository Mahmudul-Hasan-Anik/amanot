# Backend health workflow

Workflow: `.github/workflows/backend-health.yml`.

The scheduled GitHub Action calls `somiti_initialized` with the public client key. On the multi-society backend that function checks the authenticated caller's profile; an anonymous caller correctly receives `false`. Both JSON boolean responses (`true` and `false`) therefore indicate a successful RPC. They do not indicate whether a particular member can log in.

The earlier workflow incorrectly required `true`, producing false failures after the multi-society change. The corrected workflow still fails for transport/HTTP errors, missing configuration and non-boolean responses. It never reads member records or requires an admin/service-role key.

Deployed to GitHub `main` in commit `8265eef5fcbd685d388cb4ca43d361a80a26d85e`. Manual verification run #22 completed successfully on 2026-10-16: https://github.com/Mahmudul-Hasan-Anik/amanot/actions/runs/38931096805 . Local workflow file has the same correction; no app/APK changes were deployed by this workflow fix.

Required repository configuration:

- Actions variable `SUPABASE_URL`: project HTTPS URL.
- Actions secret `SUPABASE_ANON_KEY`: public client key used by this existing workflow.

Schedule: three runs per day; a manual `Run workflow` trigger is also available. GitHub schedules can be delayed, run from the default branch, and public-repository schedules may be disabled after 60 days without repository activity.

This is a health monitor, not a guarantee against Supabase's low-activity project pausing. A failed boolean assertion in the old workflow did not mean the preceding database request failed.

Validation: `node app/scripts/test-backend-health.cjs` executes the actual workflow shell with controlled curl replies. It checks healthy true/false, malformed/empty/error replies, HTTP failure and missing configuration. Requires Bash (on Windows, Git Bash). `node app/scripts/check-backend.cjs` performs the existing read-only live API checks without logging credentials or records.
