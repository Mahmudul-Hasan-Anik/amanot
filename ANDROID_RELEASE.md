# Amanot Android release — 9 October 2026

## Delivery

Version **1.0.1**, Android version code **2**, package `com.amanot.app`.
This is a signed **live-backend pilot APK**, not the earlier demo APK. Broad member rollout is pending the checks below.

EAS build ID: `028162a8-c0c1-44d8-8ea2-ef5593d10854`.
Build status: **FINISHED**. [Download signed live APK](https://expo.dev/artifacts/eas/fC6FXqCluEM0IZ_e3zRVI1kLcb0-JxxvhhiAAPKDlIU.apk).

Local copy: `app/dist/releases/amanot-1.0.1-live.apk` (ignored build artifact).
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
