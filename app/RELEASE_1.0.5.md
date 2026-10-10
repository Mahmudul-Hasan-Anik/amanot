# Amanot Android 1.0.5

- Android versionCode: 6
- Profile: release (live backend; demo disabled)
- EAS build: 35af3401-a505-497c-99fe-f9edc11567a3
- Completed: 2026-10-10 14:45:50 UTC
- APK: releases/amanot-1.0.5-live.apk
- Download: https://expo.dev/artifacts/eas/cBRXNo9xyZOMqSi3BH4ERU5EL1u8Gkd-PDaStpUtRpk.apk
- Bytes: 24,714,140 (23.57 MiB)
- SHA256: dc3e3f0570e456d165650ada8adc3e2b6229add703e6e225f7a727f096acc487

Includes the settings/deposit inputs, proportional distribution rules/preview, finance language fixes, account-loading improvements and changes documented in PERFORMANCE_CHANGES.md. Uses the existing EAS Android signing credentials.

Validation: release configuration check, TypeScript check, previous targeted regression tests, EAS Gradle assembleRelease success; downloaded artifact contains Android manifest, 3 DEX files, application bundle, native SecureStore and Crypto modules. This is not independent APK signature verification or a physical phone test. Install over the previous app and test login, collection totals, settings, history, language and scrolling on the phone.
