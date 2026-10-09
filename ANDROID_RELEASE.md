# Amanot Android release — 9 October 2026

## PIN-screen hotfix: 1.0.3 / code 4

Fixed a regression in 1.0.2: entering four digits on the six-digit live PIN screen incorrectly ran demo verification and reset the input. Demo verification is now restricted to demo mode. Live six-digit and explicitly selected legacy four-digit inputs use backend login only. No credential or database change is required.

Local live preview rebuilt and verified by entering four synthetic digits with no alert. `test:pin-screen` exercises the actual screen handlers: six-digit completion, no premature/demo verification, legacy login, backend errors, required PIN upgrade and demo mode. TypeScript and live-auth regressions pass.

**APK updates on hold at the user's explicit request.** Submitted build `2decffeb-187c-4cc0-9f98-f75a27c0d58d` was canceled. Do not start another APK build until the user asks. Version 1.0.3/code 4 is a local development candidate, not a delivered APK. Version 1.0.2 has the PIN-screen bug; test the rebuilt local preview. APK files now live in `app/releases/` (ignored) so web exports do not remove them.

Additional login fix: missing/invalid phone state now redirects PIN deep links/back navigation to login, malformed phone cannot generate an Auth email, activation status is refreshed before login, and stale login responses cannot unlock after logout. Initial activation requires a six-digit PIN. Auth provider errors are translated into user-facing Bengali instructions; no email entry is required. Phone/API payload, PIN-screen and auth-state regression suites cover these cases. No existing credential or live ledger was changed.

## Previous development release: 1.0.2 / code 3

Signed **live-backend pilot** build `91d090e0-5539-4784-8c14-0478d652cb31` finished using the existing signing key. [Build details](https://expo.dev/accounts/anik13dev/projects/amanot/builds/91d090e0-5539-4784-8c14-0478d652cb31). Status: **FINISHED**, 9 October 2026 at 22:06 Bangladesh time. [Download live APK 1.0.2](https://expo.dev/artifacts/eas/ANsmU4B6urvPRFses_6wtSR8Va5zdZYQPNPjmo4ud4c.apk). Supersedes 1.0.1 because the earlier app lacks the required PIN-upgrade screen.

Verified previous local copy: `app/releases/amanot-1.0.2-live.apk` (ignored artifact), **96,723,400 bytes** (about 92.2 MiB). SHA-256: `f669cc7e9ccf50cee8eb641e5229cda519e2dadc52460eef33c7243051c64d32`. Archive inspection confirmed Android manifest, four DEX files, app bundle and native SecureStore/Crypto module symbols. This is not an on-device test or an independent cryptographic signature verification. Repeat archive checks with `app/scripts/verify-apk.ps1 -ApkPath <path>`.

Install/update the new APK, then log in again. Existing plaintext sessions are discarded. Use your existing PIN; select the legacy four-digit option if needed. Before business access, enter the current PIN and choose/confirm a strong six-digit PIN, then log in again. Temporary/recovery PINs are random, expire after 72 hours and require replacement. Unactivated legacy members need a six-digit temporary PIN from an administrator. No real credential was changed during development.

Migrations 009/010 are deployed. Hosted checks passed: real bcrypt, migration records, preserved existing profiles and ledger, private rollback snapshot, denied anonymous PIN change, restricted sync-clock access and private 120 KB photos. Android SecureStore, no persisted live NID/ledger cache, background lock, revision refresh, server-confirmed saves and privacy/support page are included. TypeScript/tokens, 18 accounting, 11 security, six image checks and auth/storage/sync/save-failure/backup suites passed. Local hashing/session/keystore scaffolding is mocked; actual device/GoTrue tests are not claimed.

Supabase minimum password length 13, secure/current-password change enabled; sign-up/sign-in limit 10 per five minutes/IP. Five wrong current-PIN attempts lock PIN changes for 15 minutes. This is not a per-account failed-login lockout.

Encrypted backup/restore tooling is ready, but a real independent backup and restore still require owner environment/credentials: [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md). User explicitly deferred real-device tests and original opening-balance/dues reconciliation. Final support contact/retention, realistic load/quota observation and approved pilot remain owner gates. Broad rollout is not certified production-ready. Final production dependency audit: **8 moderate, 14 high, 0 critical**; scope and remaining roots in [SECURITY_REVIEW.md](SECURITY_REVIEW.md).

GitHub workflow has only the first successful manual run at the latest observation; actual scheduled execution remains pending. Next run is 23:17 Bangladesh time, subject to GitHub scheduling delay.

## Historical delivery: 1.0.1 (superseded)

Version **1.0.1**, Android version code **2**, package `com.amanot.app`.
This is a signed **live-backend pilot APK**, not the earlier demo APK. Broad member rollout is pending the checks below.

EAS build ID: `028162a8-c0c1-44d8-8ea2-ef5593d10854`.
Build status: **FINISHED**. [Download signed live APK](https://expo.dev/artifacts/eas/fC6FXqCluEM0IZ_e3zRVI1kLcb0-JxxvhhiAAPKDlIU.apk).

Earlier local copy: `app/dist/releases/amanot-1.0.1-live.apk` (superseded artifact; later preview exports replaced the dist folder). Use the verified 1.0.2 copy above.
Downloaded size: 96,481,684 bytes (about 92 MiB). Archive header and Android manifest, DEX and JavaScript bundle entries verified; on-device installation/runtime testing remains pending.
SHA-256: `410914a07b19bcfbb6475c8417b319a1940f8229e8b2902fe15e25cf1d0c0e97`.

Build command from `app`:

```powershell
npx eas-cli@latest build --platform android --profile release
```

The release profile uses the production EAS environment with demo mode disabled. Public Supabase URL and anon key are configured there; no service-role key belongs in the app. The config guard rejects release builds with missing backend configuration or demo mode enabled. `preview` remains a demo APK; `production` produces an AAB for a later store release.

## Included and checked

- Live Supabase migrations through 008: NID number only, private JPEG/PNG/WebP profile photos up to 122,880 bytes (120 KiB). No NID image collection.
- Login rejects inactive profiles and demo role bypass. PIN changes and resets wait for backend success before showing success.
- Member dashboard shows actual payment records, transactions and notices. Missing payment/contact settings no longer display invented numbers.
- TypeScript and design-token checks, 18 disposable-database accounting/permission checks, 6 image-validator checks and live-mode auth-store regression checks passed.
- Hosted read-only checks passed: database RPC reachable, anonymous member reads denied, staff summary/member reads allowed and PIN hash private. This does not replace an actual device login test.
- No real ledger transaction, credential reset or SMS was created during verification. SMS remains simulated.

## Database health schedule

Workflow `.github/workflows/backend-health.yml` is published on GitHub main. Its first manual run succeeded:
https://github.com/Mahmudul-Hasan-Anik/amanot/actions/runs/37946615456

It runs at 07:17, 15:17 and 23:17 Bangladesh time. It queries the existing initialization RPC, without fetching member records. Repository variable `SUPABASE_URL` and secret `SUPABASE_ANON_KEY` are configured; this is the same public client key, with no privileged server key.

This reduces inactivity risk, but does not guarantee an always-on free service. Check workflow failures and the Supabase dashboard. GitHub can disable scheduled workflows in public repositories after 60 days without repository activity; re-enable the schedule when needed. Scheduled runs can be delayed.

## Owner/device checks before member rollout

1. Install this live APK on an Android phone. Login using the real authorized account; never use the demo OTP as a live credential.
2. Check wrong PIN, app restart/lock, logout and PIN change. Test separate staff/member accounts and denied cross-role operations.
3. Confirm opening balances, historical dues year, deposits, expenses and profits against original records. Do not post test money to the live ledger.
4. Upload a profile image within 120 KiB, reject a larger image, and confirm another member cannot read it. Check gallery permission, PDF/CSV sharing and Android back navigation.
5. Test recovery from a separately stored database backup. The restricted backup schema in the same project is not an independent disaster-recovery backup.

## Remaining production work

- Harden 4-digit PIN onboarding/recovery, mandatory initial-PIN replacement and server-side attempt limits before broad distribution. Shared/default PINs are unsuitable for member rollout.
- Finish real-device and hosted-auth integration checks, historical accounting reconciliation and independent backup restore rehearsal.
- Reduce full-ledger synchronization for larger membership and check free-tier usage under realistic load.
- Review inherited dependency advisories: current production dependency audit reports 11 moderate and 15 high advisories, zero critical. A forced major downgrade was deliberately not applied; the audit is not clean.
- Real SMS, Play Store publication and iOS release are deferred; they are not included in this APK delivery.
