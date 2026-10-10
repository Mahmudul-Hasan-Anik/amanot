# Multiple societies — implementation and verification

Status: 10 October 2026. Migration 011 is deployed to the existing Supabase project. No APK was built or updated. No existing account or financial record was deleted.

## Agreed behavior

- Different phone numbers can register different societies in the same app/backend.
- One phone/account belongs to one society for this version. Society switching and multiple memberships are outside this version.
- The registering owner becomes super admin of their own society. That admin adds members and can assign additional administrators inside that society.
- Public registration is available in production builds. It was previously hidden behind `__DEV__`.
- New societies receive their own settings, five empty cash/payment accounts and an independent sync revision. Existing data was assigned to one legacy society without changing financial values.

## Isolation

Members, profiles, settings, cash accounts, projects, transactions, expenses, approvals, audit logs, notices, annual distributions, shares, SMS logs and sync clocks have a required `somiti_id`.

Restrictive RLS policies bind both reads and writes to the authenticated account's society. Business RPC functions run as the dedicated `amanot_rpc` role, which cannot log in, inherit other roles, own app tables or bypass RLS. Platform Auth hooks and credential operations retain their required platform privileges; admin PIN resets explicitly verify the target's society first. This matters because table owners normally bypass RLS. [PostgreSQL row security documentation](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).

Composite foreign keys prevent a record being linked to a member/project/expense/distribution in another society. Settings IDs, cash-account IDs, member codes and distribution years can repeat between societies. Phone ownership remains globally unique for active member records.

Private profile-photo policies restrict reads, uploads and overwrites to members of the caller's society, while retaining the existing member/staff permissions and 120 KiB limit. The deployed `send-sms` function verifies a selected recipient through caller-bound RLS before contacting the provider. No real SMS was sent during verification.

The app clears the previous account's in-memory snapshot on registration or profile/role changes. An unexpected account change locks the PIN gate. A registration response arriving after logout cannot unlock the app.

## Verification completed

- 34 local accounting/isolation checks, including populated-ledger migration preservation, immutable-ledger protection after backfill, two independent registrations, duplicate-phone denial, repeating member codes, separate deposits/expenses, cross-society mutation denial, projects/approvals/notices, same-year profit distribution, invited-member activation/PIN upgrade, private photos and revision isolation.
- 11 local security checks against migration 011, including PIN attempts, session revocation, expiry and photo access.
- Auth-store regression checks cover duplicate registration, trimmed names/Bengali PIN, clearing old account data, account switching and cancellation after logout.
- SMS handler tests exercise the real handler with mocked HTTP: missing login/staff role, foreign or mismatched recipient denial before provider access, and own-recipient acceptance.
- TypeScript and design-token checks passed. Production-mode local web export is used only as an app preview.
- The production-mode registration form was opened at 360px app width: society/admin names, phone, six-digit PIN, one-phone/one-society guidance and the submit button all fit. No hosted registration was submitted during this visual check.
- Hosted migration/schema verification: all 14 restrictive tenant policies, restricted RPC role, scoped business function ownership, migration record and enabled ledger trigger confirmed.
- Hosted pre/post fingerprints of members, transactions, cash accounts and settings matched after ignoring the newly added society column. Existing 1 Auth account and 2 transactions remain.
- Hosted anonymous API health and member privacy checks passed.

Local PostgreSQL fixtures use mocked Auth hashing/session scaffolding. They do not prove real GoTrue sign-up, delivery of messages, or physical-device behavior. No synthetic account or transaction was added to the hosted project for these tests.

## Deployment and maintenance

Fresh installation: apply `app/supabase/schema.sql`, migrations 002–010 in order, then 011. Existing installation through 010: apply only 011. Migration 011 is atomic and runs once. Do not replay older schema/migration bundles after it; they contain obsolete single-society Auth hooks/policies.

For an existing ledger, 011 temporarily disables only the immutable-ledger trigger while backfilling the society column, then reenables it within the same transaction. Failed execution rolls back the trigger state and schema changes. The first hosted attempt was blocked by that trigger and rolled back; the corrected migration passed the populated-ledger fixture and was then applied successfully.

`app/supabase/maintenance/reset-test-data.sql` is the old single-society global reset. It now refuses execution when the multi-society schema exists. Any cleanup must identify the specific disposable society and its Auth users/files, preserve other societies and verify recovery/approval separately. The owner-requested old test-data cleanup remains pending; no permanent deletion confirmation was received.

## Before public rollout

The owner still needs to test real registration/login on Android with their own phone/PIN. This was previously deferred along with device testing. Registration currently uses phone plus PIN; it does not verify phone ownership by SMS OTP. Independent encrypted backup/restore and existing broader release gates remain unverified as recorded in `BACKUP_RECOVERY.md` and `ANDROID_RELEASE.md`.

All societies share this Supabase project's free-tier resources. Prior single-society capacity assumptions must be reassessed against combined members, transactions, photos and usage before broad rollout. No paid service or new project was created.
