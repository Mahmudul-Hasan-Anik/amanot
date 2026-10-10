# Amanot Android 1.0.6

- Android versionCode: 7
- Profile: release (live backend; demo disabled)
- EAS build: bc7c6f72-15b9-4260-aed5-02b31feae8a2
- Completed: 2026-10-10 15:40:09 UTC
- APK: releases/amanot-1.0.6-live.apk
- Download: https://expo.dev/artifacts/eas/etRYimQDnwMachBx1QAbjcwdgEl504seARlYiwapEdo.apk
- Bytes: 24,717,592 (23.57 MiB)
- SHA256: 619835924a39310cc4a4fdf803727fcc0a3729a92d8298bde1032a08f43854ed

Includes navigation cache reuse, request coalescing, preserved ledger pages, revision/manual refresh invalidation, cache clearing on lock/logout, registered-login phone lookup reduction and joined profile/member loading. Existing PIN/session/account permission checks remain. See PERFORMANCE_CHANGES.md for scope and automated tests.

Release configuration and TypeScript checks passed before upload. EAS Gradle assembleRelease succeeded with the existing signing credentials. Downloaded APK verified: manifest version 1.0.6, three DEX files, application bundle, native SecureStore/Crypto, cache and joined-profile bundle markers. These checks are not independent signature verification or a phone speed test.

Install over the previous APK. Test PIN login timing and navigation between collection, finance and other screens; first visits may fetch data, while unchanged cached scopes should reuse results. Manual refresh and periodic server revision checks remain.
