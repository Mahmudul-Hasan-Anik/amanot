# Manual member identities — 15 October 2026

Implementation is complete locally. Production migration 016 was applied on 15 October 2026 after explicit user approval. The live deployment returned identity_migration_applied=true, existing_member_rows_preserved=true and ledger_preserved=true. Evidence: member-identity-migration-success.png. APK was not rebuilt.

New members require an explicit General Member / Share Holder / Director category and a manually entered digits-only number. Bengali input is normalized to ASCII and leading zeros remain. Backend derives M-/S-/D- code. Category changes require confirmation, preserve the number/UUID/accounting/app permission, and write an audit event. Edit modal scrolls on small displays; the number stays read-only. Search and member selectors use the updated code; receipt display prefers the current member code. Historical immutable transaction party_code snapshots are preserved.

Migration 016 adds nullable identity columns for existing rows without guessing their category/number. A unique index reserves exact numeric strings per society across categories, including known legacy SM/M/S/D suffixes and soft-deleted rows. Thus 001 and 1 are distinct text identifiers; no fixed length is imposed. Existing legacy code/number mapping needs explicit approval separately. An approved operator mapping can fill previously unassigned fields; ordinary app writes cannot do this. New registration's bootstrap owner remains a legacy identity until mapped; the member-add form never auto-generates a number.

Live read-only preflight found 2 existing members, zero legacy suffix conflict groups, and both business RPCs owned by amanot_rpc. The deployment transaction compared existing member rows and ledger before committing and confirmed both unchanged. No test members were added and no old IDs were altered. The temporary verification table was dropped on commit; existing RLS policies were retained.

The API temporarily falls back to legacy read columns if the migration is missing, so existing login still works. Creating a new member is blocked with a migration message until the new schema exists. After deployment, older APKs cannot create new members without category/number; they can continue reading their existing data. Release an updated APK when requested.

Verification: TypeScript, UI form handlers and number/prefix validation, pre-migration API compatibility, 12 disposable PostgreSQL checks (repeatability, manual identity, duplicate/legacy/soft-delete reservation, immutable number, unchanged accounting, tenant/role isolation), profile loading, live-auth mocks, sync/settings/report regressions and token checks passed. No live write test or physical phone test performed.

Run: npm run test:member-identity-ui; npm run test:member-identity-api; npm run test:member-identity-db.
Deployment source: supabase/migrations/016_member_identity.sql.
