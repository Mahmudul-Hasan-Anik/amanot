# Amanot — web, Android and backend setup

Current launch scope: Android app first, iOS later, Supabase Free, no public Web launch. Web exports are development/testing tools. The current launch plan is `../IMPLEMENTATION_PLAN.md`.

The preview APK uses **demo mode**: data stays on the device; OTP is 482700; SMS is simulated. Production uses Supabase. Building the app does not deploy its database or SMS function.

## Run and verify

From `app/`:

```powershell
npm ci
npm run typecheck
npm run test:accounting
$env:EXPO_PUBLIC_DEMO_MODE='true'
npm run web
```

For a live web export, configure `.env` and run `npm run build:web`. Publish `dist/` to an HTTPS static host with SPA fallback to `index.html`. Run `npm run build:web:demo` for `dist-demo/`. Both commands explicitly set the mode and clear Metro's cache so an earlier export cannot leak its mode into the next build. `.npmrc` keeps local and EAS installs consistent with the dependency lock.

For the demo, use admin phone `01711223344`, OTP `482700`, PIN `1234`. Preview with `node scripts/serve-web.cjs dist-demo 8082`.

Accounting tests load the SQL schema and every migration into a disposable PostgreSQL/PGlite database. They verify posting, duplicate protection, balances, dues, distribution and permissions. Hosted authentication, password hashing, storage delivery, SMS providers and Android device behavior need integration testing; the test uses auth/storage scaffolding and test-only hashing stubs.

## Database deployment

For a **new empty Supabase project**, run `supabase/schema.sql` once, then these migrations in order:

1. `002_dues.sql`
2. `003_notices_profit_guards.sql`
3. `004_auto_approval_sms.sql`
4. `005_accounting_integrity.sql`
5. `006_member_documents.sql`
6. `007_asset_balances_roles.sql`
7. `008_profile_photo_only.sql`

For an existing project, take a database backup and apply only migrations that have not already been applied. Do not rerun the base schema over a migrated database. Migration 005 converts legacy month indexes to the migration's current year and starts tracked dues no earlier than that year's January. Reconcile old balances and prior-year dues with the original ledger before using real money; the legacy data has no reliable year metadata.

Migration 006 creates a private `member-documents` image bucket with a 5 MB limit. Staff can upload, and members can read their own files. Migration 007 adds the Nagad account and protects the last super administrator. The app requires all migrations for its current RPCs.

Migration 008 replaces the old document-upload policy: only profile photos may be uploaded, at most 120 KB (122,880 bytes), as JPEG/PNG/WebP. NID numbers remain in member records; NID images are no longer collected. Existing stored files are not automatically deleted. The app checks actual image bytes at selection and again before upload. Apply 008 after the historical 004–007 bundle, never before rerunning that older bundle.

Migration 008 was applied to the live project on 9 October 2026; SQL verification returned `file_size_limit=122880` and `public_access=false`. Run `npm run test:profile-photo` for the actual client validator's boundary/format checks. Rebuild the Android APK to receive the new form and client checks.

Copy `.env.example` to `.env` and set the project URL and public anon key. Never put a service-role key or an SMS provider key in `EXPO_PUBLIC_*` variables. Restart Expo after changing environment variables.

The existing registration flow creates the first super administrator. The schema uses synthetic email accounts for phone/PIN authentication; configure the email auth provider according to this flow. Demo seed data is optional and only belongs in a disposable test project. Staff accounting operations and admin approvals are checked by SQL functions and RLS. The live app locks protected screens until its authenticated session and PIN are verified.

Dues are refreshed when the application synchronizes through `refresh_dues()`. An optional server schedule should call `public.refresh_member_dues(null)` using a privileged server context. Do not call the removed `accrue_monthly_dues()` example from older setup notes.

## SMS

Deploy `supabase/functions/send-sms/index.ts` as the `send-sms` Supabase Edge Function. Its default provider is `mock`, which logs a simulated result and sends nothing.

For actual Greenweb SMS, configure the function's server secrets `SMS_PROVIDER=greenweb` and `SMS_API_KEY`. Keep the API key on the server. Test a consented recipient after deployment. A provider acceptance response is not a delivery receipt. Elitbuzz/SSL and push notifications are not implemented by this function. WhatsApp actions prepare a message for the user to send.

## Android

```powershell
npx eas-cli@latest build --platform android --profile preview
```

`preview` creates an installable demo APK. Use `npx eas-cli@latest build --platform android --profile release` for an installable live APK. `release` uses the production EAS environment and explicitly disables demo mode; its public backend variables are configured. `app.config.js` rejects missing backend configuration and demo-enabled release builds. `production` creates a live Play Store AAB. Android signing credentials are managed by EAS. Test the downloaded APK on a device before distributing it to members. See `../ANDROID_RELEASE.md` for the current build and rollout gates.

## Delivery status

On 9 October 2026, migrations 004–007 were applied atomically to Supabase project `yhkidajopoqjqushcpwq`. A restricted backup of the business tables and function definitions is retained in `amanot_backup_20261009`. Post-deployment checks confirmed member retention, unchanged existing ledger rows, private backup access, private document storage and the new accounting fields. The `send-sms` Edge Function is deployed with JWT verification enabled and the default simulated provider.

The preview APK is a demo testing deliverable; the live web export uses the configured Supabase project for testing. The signed live Android APK build finished successfully (1.0.1, code 2); download details are in `../ANDROID_RELEASE.md`. Hosted login integration, account reconciliation, independent backup recovery and Android device checks remain before member rollout. GitHub database health checks are configured three times daily; the first manual run passed. Public Web hosting is outside the launch scope, and real SMS is deferred until budget is available. No live ledger entry or real member SMS was created during verification. The dependency audit still reports inherited toolchain/transitive advisories; major forced downgrades were avoided.
