# Client demo — 10 October 2026

Update: owner requested a signed live APK, superseding the previous hold. Live APK **1.0.3/code 4** is built and archive-verified, **23.56 MiB**, 74.5% smaller than the old APK. [Download APK](https://expo.dev/artifacts/eas/KNgjqqYV21uZws3AMWtEHL_LGo23nnMEf29KUNLiClc.apk); local copy `app/releases/amanot-1.0.3-live.apk`. Build/checksum details are in [ANDROID_RELEASE.md](ANDROID_RELEASE.md). Device/recovery/rollout limits below still apply.

আজকের presentation-এর জন্য Android-width local app preview প্রস্তুত। এটি website launch নয়। APK build/update এখনও মালিকের নির্দেশ অনুযায়ী বন্ধ আছে।

## Demo খুলুন

এই কম্পিউটারে: http://localhost:8085/preview.html

- Demo admin number: `01711223344`
- Demo verification code: `482700` — কোনো SMS পাঠানো হয় না।
- Existing demo PIN: `1234`
- Dashboard → members → collection → projects → More → settings/reports দেখাতে পারবেন। Demo data এই browser/device-এ থাকে; live হিসাব বদলায় না।
- Account deletion screen দেখানো যায়, কিন্তু demo-তে deletion বন্ধ।

Server বন্ধ থাকলে `app` folder-এ চালান:

```powershell
npm run build:web:demo
node scripts/serve-web.cjs dist-demo 8085
```

এটি এই কম্পিউটারের localhost; অন্য ফোনে এই URL চলবে না। পুরোনো 1.0.2 APK-তে সর্বশেষ পরিবর্তন নেই।

## Development changes

- SMS OTP যোগ করা হয়নি। Existing phone/PIN login বজায় আছে। পাঁচবার ভুল PIN-এ account-ভিত্তিক ১৫ মিনিটের server lock; direct Auth login-এর নতুন session-ও PIN grant ছাড়া business data পায় না। Invited activation-এর আগে একই gate লাগে। Migration-এর আগের sessions-এর access বজায় থাকে; credential change/revocation rules আগের মতো প্রযোজ্য।
- Registration/login-এর response logout বা নতুন login attempt-এর পরে এলে app unlock হয় না।
- Profile/Settings থেকে নিজের account deletion; current PIN, explicit acknowledgement এবং `DELETE` confirmation লাগে। Last owner-কে ownership transfer করতে হবে অথবা সমিতির নাম লিখে পুরো সমিতি বন্ধ করতে হবে। Society closure অন্য সমিতিকে স্পর্শ করে না।
- Photo cleanup আগে Storage API দিয়ে হয়; ছবি মুছতে ব্যর্থ হলে Auth account থাকে এবং retry করা যায়। তারপর database আবার PIN/owner/file checks করে account/profile মুছে দেয়। NID, address, nominee/contact fields এবং সংশ্লিষ্ট SMS recipient data scrub হয়। Immutable ledger, receipt names, financial amounts and audit history accounting retention-এর জন্য থাকে—UI-তে স্পষ্ট বলা আছে।
- Private file-cleanup acknowledgement/outbox এবং owner retry tool: `app/scripts/cleanup-account-files.cjs`। Server key শুধুমাত্র private process environment-এ দিতে হবে, app বা public variable-এ নয়। Backup copies-এর retention/purge owner-এর দায়িত্ব।
- Initial/forced sync এখন সাম্প্রতিক ৫০টি লেনদেন আনে। মাসিক মোট database-এ হিসাব হয়; history/member/project screens আলাদা scope-এ ৫০টি করে লোড করে। রিপোর্ট export-এর সময় শুধু নির্বাচিত মাস/সদস্যের পুরো history আসে। পুরোনো রসিদ recent cache-এর বাইরে থেকেও আনা যায়; missing receipt-এ বানানো রসিদ দেখায় না।
- Unused React Query/dayjs removed; direct Ionicons এবং ব্যবহৃত চারটি font load হয়। Export assets 42 → 23, JS bundle প্রায় 2.7 MB → 2.3 MB। এটি APK size measurement নয়। Release config-এ ARM architectures, R8 ও resource shrinking যোগ হয়েছে; actual native build/device validation বাকি।
- Scoped `xcode → uuid 11.1.1` upgrade compatible smoke check পাস করেছে। Production dependency audit এখন 0 moderate, 14 high, 0 critical; remaining roots `braces` and `node-forge`, currently published patched releases unavailable. No forced Expo downgrade or unreviewed vendored crypto patch applied.
- Settings আর automatic backup time, verified SMS connection বা active automatic reminder-এর ভুয়া status দেখায় না।

## Deployment / verification

Migrations 012–014 এবং `delete-account` Edge Function deployed to the existing Supabase project. Migration 014-এর ledger queries caller-এর RLS ব্যবহার করে; anonymous access বন্ধ। Deploy-এর আগে/পরে account count ও ledger/member hash অপরিবর্তিত। Handler Auth `/user` দিয়ে caller token যাচাই করে; legacy-only gateway JWT filter ব্যবহার করে না। Server-side privileged key কেবল photo cleanup-এ ব্যবহৃত হয়; target IDs caller-bound RPC থেকে আসে।

34 accounting/isolation checks, 11 security checks and 9 new readiness checks passed in disposable PostgreSQL fixtures. Auth/phone/PIN-screen/session-guard/storage/sync/profit/image/backup regressions and actual Edge-handler HTTP fixtures passed. Delta tests include a late commit outside the overlap and 1001-row pagination. TypeScript/design-token checks passed. Native release config and UUID CommonJS compatibility were checked without building an APK.

Hosted verification confirmed retained Auth/account/ledger data and enabled immutable-ledger protection. Anonymous calls cannot confirm sessions or invoke deletion RPCs; the deployed Edge Function rejects an anonymous user before mutations. No hosted account, credential, photo or financial record was deleted during verification. Old test-data cleanup remains pending.

## Still requires owner/device validation

Real GoTrue registration/login on Android, actual authenticated deletion with photo cleanup on a disposable test account, independent backup/restore, realistic load/quota observation and the final support/retention policy remain unverified. Local Auth hashing/session scaffolding and mocked HTTP do not establish these. This is a client demo/development delivery, not certification for unrestricted public rollout.
