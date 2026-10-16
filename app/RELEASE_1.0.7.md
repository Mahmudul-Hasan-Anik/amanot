# Amanot Android 1.0.7

- Android versionCode: 8
- Package: com.amanot.app
- Profile: release (live backend; demo disabled)
- EAS build: 208190ba-559a-404e-a5b2-b106df401191
- Build page: https://expo.dev/accounts/anik13dev/projects/amanot/builds/208190ba-559a-404e-a5b2-b106df401191
- APK target: releases/amanot-1.0.7-live.apk
- Download: https://expo.dev/artifacts/eas/4GeRYPmMmpZj8opERAmOgHugi2VfWXmmsgKwmAuaOkc.apk
- Bytes: 23,932,658 (22.82 MiB; 784,934 bytes smaller than 1.0.6)
- SHA256: 6f9098343a110a819e7e216696a47991a29c8a5047ff1ea62ae4c71b9f36af1e
- Signing certificate SHA256: 341161b1edb81cf969856f3decc0698d813dd77c6cd8e5badd323c9d14d703ff

Includes the recent member identity and temporary PIN changes, voluntary deposits, investment proposal/approval/disbursement and collection workflow, savings withdrawals, form validation, login/cache improvements, investment request cards and unused-code cleanup.

Release configuration, TypeScript, member-login PIN and approval-menu checks passed before upload. Repository-root EAS ignore rules exclude private environment files, backups, build artifacts and development-only files. The inspected source archive contained 124 files and no private inputs.

Physical Android installation, login timing and device layout still require a phone check. The APK inspection script checks v2 signatures/content digests and compares the previous signing certificate; it does not replace Android package-manager compatibility checks or runtime testing.

Downloaded APK passed ZIP CRC, v2 signature and content-digest verification. Manifest is 1.0.7/code 8, package com.amanot.app, with ARM64 and ARMv7 native libraries. SecureStore/Crypto native modules, two DEX files and the app bundle are present. Certificate matches 1.0.6 and versionCode increased, allowing an in-place update subject to Android device compatibility. A separate in-memory tampering check was rejected without changing the original APK.
