# APK size and production data cleanup

Reviewed: 10 October 2026. No APK built or updated. No hosted data deleted.

## Measured APK size

Artifact: `app/releases/amanot-1.0.2-live.apk`, 96,723,400 bytes (96.7 MB / 92.2 MiB). These measurements describe the delivered older APK, not a newly built development candidate.

ZIP entry compressed sizes, grouped and rounded:

| Contents | MiB |
| --- | ---: |
| x86 native libraries | 19.21 |
| x86_64 native libraries | 18.56 |
| arm64-v8a native libraries | 18.00 |
| armeabi-v7a native libraries | 12.53 |
| Android DEX code | 14.16 |
| Resources and other files | 5.28 |
| Assets (mostly JavaScript bundle) | 3.76 |

Native libraries account for about 74% of the archive. The JavaScript bundle is about 3.74 MiB. React Native and Hermes are included separately for each CPU architecture. Native libraries in this artifact are stored without ZIP compression.

## Next build optimization

1. For directly shared phone APKs, evaluate excluding x86 and x86_64 while retaining both ARM architectures. Their entries currently occupy 37.77 MiB; removing them alone gives an arithmetic estimate of 54.4 MiB (57 MB). This is not a verified future build size. It would remove Intel/emulator compatibility; retain the universal build profile for those devices.
2. Evaluate native library compression for direct APK delivery. Measure download size, installed size and startup behavior before choosing it.
3. Inspect bundled fonts/icons and unused native dependencies. Do not remove dependencies based only on package names; check runtime and config-plugin use first.
4. For Google Play, the existing `production` EAS profile produces an AAB. Play generates device-specific downloads. Measure the actual download size in Play Console; the universal APK size is not that size.
5. When the owner authorizes the next APK build, compare its contents with this baseline and test installation/login, photo upload, PDF sharing, navigation and PIN storage on a physical Android phone.

References: [Expo app size](https://docs.expo.dev/distribution/app-size/), [Android app size](https://developer.android.com/topic/performance/reduce-apk-size).

## Production data cleanup

Supabase member and financial rows are remote data. Deleting them does not materially reduce APK download size.

Demo mode, optional database demo seed, and records entered into the hosted backend are separate. The release profiles disable demo mode. Local disposable database tests do not require hosted cleanup. Hosted test rows still require explicit identification; this review has not inventoried or classified them.

Before the first real accounting period:

1. Confirm whether every existing hosted member/transaction is a test or whether real records are mixed in. Identify the exact organization and records to reset; retain the owner account and approved settings.
2. Take an independent encrypted database and private-photo backup. Verify that it can be restored. A rollback schema in the same database is not a substitute.
3. Inventory members, Auth accounts, deposits, withdrawals, expenses, projects/investments, distributions, balances, notices, history and private photos. Review foreign keys and derived totals against the current schema before drafting deletion SQL.
4. Execute only the reviewed cleanup scope. Keep database changes transactional where possible. Auth and object-storage cleanup are separate operations and need a recovery/retry plan.
5. Reconcile cash/bank balances, dues, member balances and approved distribution snapshots after cleanup. Enter only owner-confirmed opening balances; do not silently replace real balances with zero.
6. Log out/reset local test sessions and confirm the retained owner can sign in to the clean live organization. Future UI tests should use demo mode or a separate test backend.

### Owner confirmation and hosted inventory

On 10 October 2026 the owner confirmed that all existing data is test data and the admin account must be retained.

A read-only query against the Amanot hosted project found: 1 member, 1 profile (admin), 1 Auth user, 2 transactions, 12 audit logs, and no expenses, projects, approvals, profit distributions, profit shares, notices or SMS logs. The query included storage-object counts, but that last result was outside the visible grid; do not claim storage was verified empty. These counts are an observation, not a backup or a cleanup result.

Retain the admin Auth identity, PIN credentials, role and linked profile/member record. Clear its test financial balances and dues as part of the eventual reset, rather than deleting its login identity. Preserve the schema, security policies, migrations and association configuration. Inspect cash accounts and member dues fields before preparing the final reset transaction.

### Revised scope: remove admin too

The owner's subsequent instruction supersedes admin retention: remove all old accounts, including admin, so a new owner can register the association afresh.

Live recheck confirmed 1 Auth user, 1 member, 2 transactions, 5 cash accounts, 1 settings row and **0 storage objects**. The hosted first-admin guard checks whether profiles exist. The current application exposes new association registration; the first successful registration on an empty backend creates a super admin. This backend supports one association, not independent association creation by every new user. After the first registration, the admin adds members.

Prepared manual reset: `app/supabase/maintenance/reset-test-data.sql`. It requires an explicit SQL confirmation setting, rejects nonempty storage, uses an explicit table list without CASCADE, removes app rows and Auth users, resets receipt numbering, restores five empty default cash accounts, preserves RLS/functions/migrations, and verifies the uninitialized state. Auth user foreign keys in the hosted inventory cascade to sessions, identities and MFA data. Private historical migration rollback snapshots and platform operational logs are outside this active-data reset.

The accounting suite passed **21 checks**, including refusal without confirmation, refusal when storage contains files, old data/account removal, session cascade, empty balances, fresh super-admin bootstrap with the new association name and refusal of a second bootstrap. These use local PGlite with mocked auth hashing; live GoTrue account creation and physical-device registration are not claimed.

The dashboard currently reports no automated backups. Independent export/restore remains unverified. No hosted record has been deleted. There is no verified normal recovery path after deletion. Final action-time confirmation is required for permanent browser-driven deletion; request it with the exact prepared scope. A new owner must enter their own phone and PIN during registration. APK updates remain on hold at the owner's request.

### Later change: multiple societies

The owner clarified that this is a public Play Store app for multiple societies, with one phone belonging to one society. Migration 011 now provides society isolation and independent registration; see `MULTI_SOMITI.md`. The earlier single-society description above is historical. Existing test records remain in their legacy society. The old global reset now refuses to run on this schema; prepare a society-scoped cleanup instead of deleting every society/account. No permanent deletion was performed.
