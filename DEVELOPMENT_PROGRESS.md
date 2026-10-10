# Amanot — একে একে বাকি কাজ

Updated: 10 October 2026. SMS OTP excluded. APK/AAB update remains on owner hold.

## 1. বড় ledger ও report — implemented/deployed

- Login/forced refresh: ৫০টি recent transaction, ৫০টি recent expense; সম্পূর্ণ history download নয়।
- Finance, analytics, collection-এর মোট database থেকে আসে। ছোট cache দিয়ে মোট হিসাব করা হয় না।
- মাস, সদস্য ও project অনুযায়ী cursor pagination; loading, retry, load-more; late responses lock/logout/filter change-এর পরে বাতিল।
- Export-এর সময় নির্বাচিত scope-এর সম্পূর্ণ history আসে; পরিবর্তন চললে একবার retry, তারপর explicit error। CSV ledger-এ transfer থাকে; income/expense-এ transfer বাদ।
- পুরোনো receipt সরাসরি RLS query; missing receipt-এ error, বানানো receipt নয়।
- Migration 014 live deployed; account/transaction counts এবং member/ledger hashes unchanged।
- SQL (৭), hook, snapshot/export, report regression, accounting (৩৪), security (১১), auth/sync, TypeScript/token checks passed। Local live/demo exports passed; browser history route/month selection verified। Browser CSV download capture timed out, so actual downloaded file/native sharing is not verified by that attempt.

সীমা: members/projects/approvals metadata এখনও full read; large export scope memory-তে থাকে। ৫০০ concurrent user বা quota load test হয়নি। SQL Auth fixtures বাস্তব GoTrue/device test নয়।

## 2. Dependency review — reviewed, upstream fixes pending

Audit: ০ moderate, ১৪ high, ০ critical। Root packages braces 3.0.3 ও node-forge 1.4.0-এর latest published version-এ findings রয়ে গেছে। Expo/Metro/signing tooling dependency paths; business code-এ সরাসরি ব্যবহার নেই, কিন্তু এটিকে security clearance বলা যাবে না। Automatic fix Expo 44 downgrade প্রস্তাব করে; current SDK ভাঙবে বলে করা হয়নি।

পরের কাজ: compatible upstream fix প্রকাশিত হলে dependency update, Expo compatibility check, typecheck/export/native smoke test। Local crypto patch বা vulnerability লুকানো হয়নি।

## 3. Hosted flow/device — pending

Owner-controlled disposable society দিয়ে real registration → PIN → invite → collection → report → tenant isolation যাচাই করতে হবে। Credential entry/change ও বাস্তব device install owner করবেন; phone tests আগেই defer করা হয়েছে। Authenticated photo/account deletion-ও disposable account-এ যাচাই বাকি। Anonymous rejection verified; এটি authenticated end-to-end proof নয়।

## 4. Backup/cleanup — tooling ready, actual recovery pending

[BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)-এর encrypted export/restore tooling আছে। Independent destination, private backup secret এবং বাস্তব restore rehearsal দরকার। Current hosted data delete করা হয়নি। Old global reset multi-society schema-এ চলে না; exact tenant inventory ও verified backup-এর পরে reviewed cleanup লাগবে।

Owner এখন [Google Drive folder](https://drive.google.com/drive/folders/1Ad0sggyHrv-p--n9R_ecZK8-J_clZPxQ) নির্বাচন করেছেন; আগের external-drive সিদ্ধান্ত বদলেছে। Login/access verified: Amanot folder Restricted, owner only। Official PostgreSQL 17.11 tools ignored local folder-এ extracted, checksum/version এবং wrapper preflight passed। Wrapper secrets নেওয়ার আগে tools যাচাই করে; create-এর পরে automatic integrity inspection করে। Private database URL/Storage key/passphrase owner terminal-এ দিতে হবে; chat-এ নয়। Actual export, upload, automatic backup এবং Supabase-compatible restore rehearsal এখনও হয়নি।

Backup TLS correction: official Supabase CA local discovery added; `verify-full` retained. Public pooler test with an intentionally invalid dummy password passed TLS and reached authentication rejection. Owner must retry diagnose with the private real URI; no actual export/restore claimed.

## 5. Optimized APK — owner hold

ARM/R8/resource/native compression config ready। অনুমতি পেলে build, actual download/installed size, Android install/startup/PIN/photo/PDF/share/update যাচাই। Old 92.24 MiB APK-র arithmetic breakdown নতুন APK-এর measured size নয়।

## 6. Store preparation — owner details pending

Support contact, retention policy, public privacy/deletion links, Play Console access/signing/listing এবং physical-device checks বাকি। Public web app launch নয়; policy links আলাদা প্রয়োজন। Store upload বা agreement acceptance করা হয়নি।
