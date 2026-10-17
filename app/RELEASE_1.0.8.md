# Amanot Android 1.0.8

- Android versionCode: 9
- Package: com.amanot.app
- Profile: release (live backend; demo disabled)
- EAS build: 5f06452f-1929-4720-be13-875e770559d8
- Build page: https://expo.dev/accounts/anik13dev/projects/amanot/builds/5f06452f-1929-4720-be13-875e770559d8
- Status: FINISHED; downloaded APK verified
- APK target: releases/amanot-1.0.8-live.apk
- Download: https://expo.dev/artifacts/eas/FwdNBlF_aZcxcYUbs42iw9k3sCVQb3Hu_GhYurgCdyM.apk
- Bytes: 24,974,250 (23.82 MiB)
- SHA256: cff03fe5ad790b5c42cc095d1fa067585767b94e9fad4daa1ec93e246285faf6
- Signing certificate SHA256: 341161b1edb81cf969856f3decc0698d813dd77c6cd8e5badd323c9d14d703ff

APK ZIP integrity, v2 signature and content digest verified. Package/version are
com.amanot.app / 1.0.8 / code 9, target SDK 36, ARM64 and ARMv7 native libraries.
The signing certificate matches 1.0.7 and the version code increased. The native
manifest omits SYSTEM_ALERT_WINDOW and RECORD_AUDIO. SecureStore/Crypto native
modules, two DEX files and the JS bundle are present.
The packaged transparent logo has identical alpha and identical visible pixels
on the app background to the latest source asset (Android rewrites PNG bytes).

Includes Amanot launcher artwork and transparent in-app branding, real logos on
the dashboard/PIN screen, canonical saved society names overriding stale English
translations, specific inline PIN-change validation, removal of the legacy PIN
toggle/wording, mobile-sized dialogs and descriptive PDF/CSV filenames. Blocks
the unused SYSTEM_ALERT_WINDOW permission in the native manifest.

TypeScript, release configuration, PIN screen, mobile feedback, society branding,
export files, auth/phone/session, sync, report, member-PIN and approval-menu checks
passed before submission. Disposable database suites passed 11 security and 36
accounting/isolation checks; cryptographic hashing is stubbed in those suites.
The inspected upload package contains 130 files, no private/development inputs,
and matching latest assets/source. The existing remote signing key is retained.

The user explicitly approved uploading source to Expo EAS for this APK build.
No real account PIN or ledger was changed. Physical Android installation, runtime
layout and the exact first-install security warning still require a phone check;
signature verification does not establish Play Protect approval.
