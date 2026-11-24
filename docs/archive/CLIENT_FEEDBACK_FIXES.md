# Client feedback audit — implemented fixes

১৬ অক্টোবর ২০২৬। APK rebuild করা হয়নি।

| Audit | সমাধান |
|---|---|
| A01 | Summary RPC-তে principal recovery বাদ; Dashboard ও Finance একই recognized-profit rule ব্যবহার করে। |
| A02 | Voluntary receipt-এ বানানো মাস নেই; historical months/late fee থাকলে সত্যিকারের তথ্য থাকে। PDF ও UI amount দশমিক বজায় রাখে। |
| A03 | কেন্দ্রীয় investment overdue queue; member/external দুই ধরনের recipient-এর contract খোলা যায়। আলাদা optional savings notice, explicit preview, কোনো mass fallback overdue demand নেই। Unsupported push/SMS options এই page থেকে সরানো হয়েছে। |
| A04 | Deposit RPC-তে Dhaka business date, future-date ও finalized-year guard; frontend-এও future date আটকায়। |
| A05 | Dashboard/More pending badge ও central Approvals-এ investment queue। Approval needed ও disbursement pending আলাদা লেখা; expense auto-approval অপরিবর্তিত। |
| A06 | M/S/D category filter/badge, savings sort, parents দিয়ে search; savings dues filter বাদ। Profile-এ বকেয়া/month counters বাদ, active/inactive সত্যিকারের status। |
| A07 | Member profile-এর View All → সেই memberId অনুযায়ী single-member statement। অচেনা member ID-তে অন্য সদস্যের profile fallback সরানো হয়েছে। |
| A08 | Investment installment dues report; selected-year immutable distribution snapshot; current-balance report স্পষ্ট current label; payment-method cash movement report সত্যিকারের নাম ও signed rows। BN/EN report headings/footer, combined Export All CSV। |
| A09 | Shared financial display সর্বোচ্চ দুই decimal রাখে; integer amount অযথা .00 যোগ করে না। |
| A10 | Registration-এ owner category/manual number; server validates it. Existing legacy account-এর জন্য explicit one-time admin mapping, permanent number ও tenant checks, audit log; কোনো পুরোনো ID স্বয়ংক্রিয়ভাবে অনুমান করা হয়নি। |
| A11 | Submitted/approved proposal কারণসহ withdraw; rejected/withdrawn proposal থেকে corrected new request, নতুন ID ও নতুন approval প্রয়োজন। Posted contracts withdrawal দিয়ে বদলানো যায় না। |
| A12 | Backend version 22 release/readiness gate। Backup restore metrics-এ contracts/proposals/events-এর full fingerprints ও principal/profit totals; পুরোনো backup-এ investment metrics verified হয়েছে বলে দাবি করে না। |

## Dead feature নিষ্পত্তি

- Meetings & Notices link এখন actual Notices route-এ যায়; অনুপস্থিত Documents route সরানো হয়েছে। Meetings module নতুন করে বানানো হয়নি।
- Settings Backup এখন সত্যিকারের owner-managed encrypted backup-এর নির্দেশনা দেয়; backup হয়েছে বলে মিথ্যা success নেই। App-এর মধ্যে Drive upload যোগ করা হয়নি।
- আসল file ছাড়া Constitution/Registration download row সরানো হয়েছে; document storage feature বানানোর দাবি করা হয়নি।
- Unsupported push selector সরানো হয়েছে। New investment approval policy row থেকে actual Investments page খোলে।
- পুরোনো savings month modal/query, dashboard dues/target/follow-up calculation এবং settings-এর অব্যবহৃত fixed-deposit controls সরানো হয়েছে। Legacy transaction fields ও compatible RPCs রাখা হয়েছে।
- Demo mode-এর fixed obligations normalize করা হয়েছে; obsolete pending legacy investment fixtures সরানো হয়েছে। Production records এই cleanup-এর অংশ নয়।

## Backend deployment

`supabase/migrations/022_feedback_consistency.sql`, reviewable `supabase/deploy_022_investments.sql`। Regenerate: `node scripts/prepare-investment-deploy.cjs --feedback`।

Live deployment passed ledger/cash/member savings/project/expense/distribution financial fingerprints. Read-only verification returned backend version 22, correct income rule, deposit date guard and restored schema privileges. No production test member, deposit, investment, ID mapping or withdrawal was performed.

## Verification

- ২৫ disposable PostgreSQL investment/workflow checks passed: repeated migration, principal/profit reconciliation, closed/future dates, explicit legacy mapping, new-owner registration, withdrawal/reproposal and tenant isolation।
- Existing ৩৬ accounting checks, ৭ ledger query checks, report-query, ledger-sync, settings UI, member identity UI, investment UI, backup, synchronization এবং profit-rule tests passed।
- TypeScript ও production/demo web exports passed। Live anonymous health/version/privacy checks passed।
- Mobile-width browser preview confirmed category filters and correct profile → single-member statement selection। Screenshots under `state/old-app-audit/feedback-*.png` at workspace root।

## Release boundary

Physical Android regression, actual new encrypted backup/restore rehearsal and WhatsApp delivery remain user/device/operator checks; code tests are not a claim that these happened. The new backup tool is ready, but a real restore needs a private backup passphrase and isolated restore destination. APK remains unchanged until requested; installed APKs do not receive the new screens automatically.

Changing a legacy member's category/number mapping requires an administrator to enter and confirm the correct identity. Director membership and additional management profit allocation remain separate; no new category-based payout rule was invented.

## Follow-up UI corrections

Approval tabs now count investment and expense tasks together; the queue appears after the tabs, and the global empty state is shown only when both groups are empty. Member actions use a shared scrollable ActionMenu modal instead of the web number-prompt fallback. TypeScript and dedicated approval/menu regression checks passed; browser preview confirmed menu selection opens Edit Member Info and dismisses the menu. No production member was changed. APK not rebuilt.
