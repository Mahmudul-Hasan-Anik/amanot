# Security and development verification — 9 October 2026

Release target: Android 1.0.2 (code 3), Supabase Free, app-only pilot.

## Implemented

- Live credentials now require a non-sequential, non-repeated six-digit PIN. Existing credentials are preserved; the new app accepts legacy four-digit login and forces a verified upgrade before business access. New temporary credentials are cryptographically generated, expire after 72 hours, and are shown once after server confirmation. Unactivated legacy members need a new six-digit temporary PIN from an administrator.
- First login, recovery and direct Auth password updates cannot bypass the business-data gate. PIN change verifies the current password on the server, persists a five-failure/15-minute change lock, revokes existing sessions, and requires login again. Admin self-reset is denied; only a super administrator can reset staff. Activated phone numbers cannot be silently changed without a separate account migration.
- Hosted Supabase sign-in/sign-up rate limit is 10 requests per five minutes per IP. Minimum provider password length is 13 (`amanot:` + six digits). Secure password change and current-password verification are enabled. This is **not per-account failed-login lockout**; shared-IP/NAT users can also encounter the IP limit. Do not claim the PIN-change lock protects the sign-in endpoint.
- Android sessions use Expo SecureStore, with bounded Unicode-safe chunks and serialized writes. Old plaintext sessions are removed, forcing fresh login. Live member/NID/ledger/role data is no longer persisted in AsyncStorage. Lock after at least one minute in the background; backend RLS remains authoritative.
- Migration 009 gates business access on an active member/profile, PIN-upgrade status and an actual valid Auth session created after credential changes. Migration 010 adds a small revision token, coalesces client refreshes and evaluates stable RLS helpers once per query. Active polling is five minutes; unchanged snapshots are skipped, with a 45-minute full refresh for signed image URLs. Staff reports still fetch complete history. Real 500-user concurrent load is **not verified**, and global changes still invalidate member snapshots.
- Member/role/settings/notice writes await server confirmation. Failed saves propagate to the UI without optimistic local success. Financial writes keep existing atomic/idempotent accounting guards. No offline financial posting queue.
- NID number only, private profile photos up to 122,880 bytes, no NID image uploads. In-app privacy/support page added. Owner contact and record-retention policy still require owner values; no contact was invented.
- Owner-operated authenticated encrypted database/photo backups and restricted local restore tooling are provided in [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md). No independent backup or real restore has been performed. In-project rollback schemas are not disaster recovery.

## Verification

TypeScript/design-token checks; 18 accounting and 11 security checks in disposable PGlite; six image checks; live-auth, protected storage, sync/save-failure and encrypted backup regression suites. Auth session tables and password hashing in local SQL tests are fixtures/stubs; these are not real GoTrue/device tests. Hosted read-only verification separately checks real bcrypt availability, migration state, restricted access, unchanged ledger and preserved profiles. No real credential was changed and no financial entry was posted during verification.

Migrations 009/010 deployed transactionally. Owner-only RLS-protected pre-upgrade business tables and function definitions are retained in `amanot_backup_security_20261009`. Migration deployment does not alter existing credential hashes. The prior 1.0.1 APK lacks the required change screen; use 1.0.2.

## Dependency audit limits

Final `npm audit --omit=dev` reports **22** affected dependency nodes: **8 moderate, 14 high, 0 critical**. These are not 22 independent root defects. Compatible dependency upgrades and the `decode-uri-component` 0.5.0 override remove its URI decoding denial-of-service advisory. The remaining roots reported by npm are:

| Root | Advisory | Exposure to review |
|---|---|---|
| `braces` | [Stack exhaustion from deeply nested patterns](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | Expo/Metro file-matching build tooling; avoid untrusted build inputs. |
| `node-forge` | [RSA signature verification DigestAlgorithm handling](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | Expo signing/development tooling; not used by Amanot business functions. |
| `uuid` 3.x | [Buffer bounds checks in v3/v5/v6](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | `xcode` dependency in the iOS project tooling. Android business identifiers use a separate API. |

The audit's proposed automatic fix downgrades Expo to 44.0.6 and breaks the current SDK; it was not applied. Toolchain classification reduces direct Android business exposure but does not establish that the entire dependency tree or APK is vulnerability-free. Recheck compatible upstream fixes before wider rollout; iOS needs its own review.

## Owner-dependent release gates

User explicitly deferred real-device tests and original opening-balance/dues reconciliation. Also pending: independently stored encrypted backup and real restore rehearsal; final support contact and retention policy; realistic usage/quota observation; approved limited pilot and its feedback. These are distinct from implemented development work. Broad production readiness is not certified.
