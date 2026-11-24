# Amanot — optimization and remaining release work

Updated: 10 October 2026. No APK/AAB built, no hosted data deleted in this update. SMS OTP remains excluded.

## Changes completed

- Direct live APK profiles now compress native libraries. Existing R8 code minification, resource shrinking and two ARM architectures remain enabled.
- Optional `release-arm64` inherits the live `release` environment and builds only ARM64. It will not install on 32-bit ARM or Intel devices. Default `release` retains 32-bit ARM support; development retains emulator architectures. `production` stays an AAB with modern native packaging.
- JavaScript bundle compression is left off to preserve Hermes startup behavior. Native compression can increase installed disk use and extraction time; physical-device checks remain required.
- `npm run check:release` checks all release profiles against the installed Expo plugin, including rejection of demo configuration. It creates no native build and makes no network requests.
- `scripts/apk-size.ps1 -ApkPath <path>` reports actual ZIP entry sizes by architecture and category without modifying the APK.
- Initial and forced snapshots now load only 50 recent transactions and 50 recent expenses. Revision polling and the 45-minute refresh update this bounded snapshot/image URLs; they do not download the full ledger.
- Migration 014 supplies RLS-protected keyset pagination and authoritative monthly totals. Finance, analytics and collection use server totals; member/project/history screens load their own scope. Older receipts are fetched directly instead of relying on the recent cache.
- Exports fetch the complete requested month/member history on demand and reject changing snapshots after one retry. Finance PDF/CSV controls now create actual reports.
- Clearing the local session invalidates in-flight data responses even if the same user logs back in before a request finishes.
- Member list reads only its member state, renders a limited window, supports real name/ID/dues sorting, functional filter selection, Bengali-digit search and an empty result message. Due filter and count now both use positive dues.
- Live settings reload description no longer describes resetting demo data.
- Development test/capture scripts and audit output are excluded from EAS source upload. This reduces upload clutter, not APK runtime size.

## Actual old APK measurement

`app/releases/amanot-1.0.2-live.apk`: **96,723,400 bytes = 96.7 MB = 92.24 MiB**. Windows often labels MiB as MB.

| ZIP contents | MiB |
|---|---:|
| x86 and x86_64 native libraries | 37.77 |
| ARM64 native libraries | 18.00 |
| 32-bit ARM native libraries | 12.53 |
| DEX | 14.16 |
| Assets | 3.76 |
| Resources/other | 5.28 |

Subtracting Intel entry bytes alone gives **54.47 MiB**; ARM64 alone gives **41.93 MiB**. These are arithmetic comparisons of the old archive, **not predicted or measured new APK sizes**. Compression and shrinking will change the result. Installed disk use is separate from download size.

For Play Store, use the existing AAB profile so users download device-specific packages. Actual Play download size requires a built bundle and Play Console measurement. No 10–20 MB guarantee is justified by the current evidence.

## Checks and limits

Sync regressions cover bounded snapshots, periodic refresh and stale data after same-user re-login. Ledger SQL tests cover 1001 same-timestamp rows, decimal totals, date boundaries, paid-month filtering, tenant/member isolation and anonymous denial. Hook tests cover filter races, duplicate requests, retry and lock/logout. Export tests distinguish authoritative totals and full scoped history from the recent cache. Release-config validation passed without native build. Accounting (34), security (11), readiness (9), deletion handler, backup, photo (6), session storage, live/phone auth, TypeScript and design-token checks passed. SQL/Auth/Storage fixtures do not replace hosted/device tests.

Current npm production audit rechecked: **0 moderate, 14 high, 0 critical**. Remaining advisories need review/compatible upstream fixes; no forced framework downgrade was applied. The project is not security-certified.

Both live and demo local preview exports passed. Browser verification confirmed highest-dues sorting, seven matching due members, filter selector and Bengali `SM-০৪২` search resolving `SM-042`. The final member-list screenshot is saved in the task proof directory. No hosted records were changed by these demo checks.

## Remaining work — do not mark these complete

| Work | Current limitation / next implementation step |
|---|---|
| Native optimization verification | APK build is on owner hold. When authorized, compare both download and installed size; test install, startup, PIN, photo picker, PDF/share and update on Android. |
| Hosted registration/deletion | Test real Auth sign-up/PIN flows and authenticated photo/account deletion using an owner-approved disposable society. No current account was deleted. |
| Independent backup and restore | Tooling exists; owner backup destination, secret and real export/restore rehearsal remain required. Synthetic backup tests are not recovery proof. |
| Old test-data cleanup | All old data including admin was identified as test data earlier. The old global reset refuses multi-society schema. Prepare an exact tenant-scoped inventory, verified backup and reviewed cleanup; permanent deletion still pending. |
| Dependency advisories | 14 high findings remain. Audit fixes must keep Expo/React Native compatible. |
| Large histories / quota | Transaction paging/server totals implemented and migration 014 deployed. Members/projects/approvals metadata still loads fully; exports collect the requested scope in memory. Real concurrent load and quota consumption remain unmeasured. |
| Store launch | Owner support/retention details, privacy/deletion public links, signing/store listing and store/device checks remain. APK/AAB upload has not been performed. |

Sources: [Expo build properties](https://docs.expo.dev/versions/latest/sdk/build-properties/), [Android size guidance](https://developer.android.com/topic/performance/reduce-apk-size).
