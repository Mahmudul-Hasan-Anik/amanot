# Amanot — Client feedback follow-through audit

তারিখ: ১৬ অক্টোবর ২০২৬

**পরবর্তী অবস্থা:** এই audit-এর implementation সম্পন্ন হয়েছে। বর্তমান সমাধান, পরীক্ষা ও release সীমা দেখুন [CLIENT_FEEDBACK_FIXES.md](CLIENT_FEEDBACK_FIXES.md)। নিচের findings মূল audit-এর ঐতিহাসিক বিবরণ।

## পরিধি ও সীমা

সদস্যের manual number ও M/S/D category, বাবা-মায়ের নাম, ভর্তি ফি অপসারণ, voluntary savings, investment principal-first recovery, whole-contract percentage, proposal → approval → disbursement এবং WhatsApp reminder-এর সঙ্গে বাকি app মিলিয়ে source ও disposable PostgreSQL পরীক্ষা করা হয়েছে। এটি audit; এই ধাপে app/backend পরিবর্তন, production-এ সদস্য বা টাকা যোগ এবং APK build করা হয়নি। Physical Android UI ও SMS/WhatsApp delivery পরীক্ষা করা হয়নি।

আগের ধাপে live database-এ বাদ পড়া 018/019 update প্রয়োগ হয়েছে। এই audit-এ সেই সমস্যাকে এখনো চলমান বলে গণনা করা হয়নি।

## আগে ঠিক করতে হবে

### A01 — Dashboard এবং Finance-এর আয় এক নিয়মে হিসাব হচ্ছে না — P1

- `supabase/migrations/007_asset_balances_roles.sql:76`: summary RPC-তে deposit ও `type='profit'` transaction-এর পুরো amount যোগ হয়। নতুন investment collection-এর এই amount-এর মধ্যে ফেরত আসা মূলধনও থাকে। 020 ledger summary/profit calculation ঠিক করেছে, কিন্তু এই monthlyIncome expression বদলায়নি।
- `app/(admin)/(tabs)/index.tsx:84` summary-এর monthlyIncome দেখায়; `app/(admin)/finance.tsx:150` recognized profit ব্যবহার করে।
- Disposable PostgreSQL-এ নিশ্চিত ফল: ৳১,০০,০০০ principal recovery + ৳১০,০০০ profit recovery → Dashboard income ৳১,১০,০০০; ledger profit ৳১০,০০০; deposits/expenses শূন্য।
- করণীয়: dashboard, finance, reports-এর জন্য একই authoritative financial definition; savings receipts, principal recovery ও realized profit আলাদা দেখানো। Reversal ও disbursement-এর sign-ও মিলিয়ে পরীক্ষা করতে হবে। Savings-কে operating profit হিসেবে গণনা করা যাবে না।

### A02 — Voluntary deposit-এর রসিদে বানানো মাস দেখায় — P1

- `app/(admin)/receipt/[id].tsx:62`: months খালি হলে August, September 2026 বসে। নতুন deposit API ইচ্ছাকৃতভাবে `months: []` পাঠায়; ফলে নতুন জমাতেই fallback ব্যবহার হবে। Screen ও share text দুটোতেই প্রভাব পড়ে।
- করণীয়: নতুন voluntary receipt-এ জমার প্রকৃত date, amount, method, comment দেখানো; installment/month row লুকানো। পুরোনো transaction-এ সত্যিকারের months/late fee থাকলে historical তথ্য বজায় রাখা।

### A03 — Savings reminder-এর পুরোনো নিয়ম নতুন flow-এর সঙ্গে মেলে না — P1

- `app/(admin)/(tabs)/index.tsx:318` এখনও পুরোনো reminder page খোলে।
- `app/(admin)/reminder.tsx:61`: due member না থাকলে সব active member recipient হয়; default template এখনও overdue savings। Voluntary savings চালুর পরে অযথা zero-dues reminder প্রস্তুত করতে পারে।
- External investment recipients সদস্যের তালিকায় নেই, তাই এই reminder page তাদের খুঁজে পায় না। Contract detail-এর manual WhatsApp reminder আলাদাভাবে আছে ও কার্যকর।
- করণীয়: সাধারণ সঞ্চয়ের notice ও investment installment reminder পৃথক করা; dashboard reminder-এ investment due queue যুক্ত করা; overdue recipient না থাকলে empty state দেখানো, সবাইকে fallback নয়। কখনো WhatsApp opening-কে delivered বলবে না।

### A04 — Deposit date-এর accounting guard অসম্পূর্ণ — P1

- `app/(admin)/deposit/new.tsx:142` valid date format যাচাই করে; `supabase/migrations/019_deposit_date_and_comment.sql` supplied date পোস্ট করে। Future date বা finalized accounting year ঠেকানোর guard নেই।
- Investment posting-এর জন্য 020-এ Dhaka date ও closed-year guard আছে; savings posting-এ একই সীমা নেই। এটি source-confirmed gap; audit-এ production-এ এমন posting করা হয়নি।
- করণীয়: প্রকৃত posting date-এর agreed policy server-এ enforce করা, future financial posting বন্ধ, finalized-year handling এক করা। অনুমোদিত opening-balance/import যেন আলাদা audited পথ হয়।

## নতুন requirement অনুযায়ী UI/flow update

### A05 — Central Approvals নতুন investment proposal গোনে না — P2

- Dashboard, More badge এবং `app/(admin)/approvals.tsx` শুধু পুরোনো `approvals` collection ব্যবহার করে। নতুন proposal আলাদা `investmentProposals`-এ।
- ফলে investment approval pending থাকলেও “No pending approvals” দেখা সম্ভব। Investment tab থেকে proposal খোলা যায়; approval backend dead নয়।
- করণীয়: expense এবং investment approval আলাদা tab/section ও badge; approved কিন্তু undistributed proposal-এর জন্য পৃথক “টাকা প্রদান বাকি” count। Expense auto-approval কখনো investment disbursement চালাবে না।

### A06 — Members filter/status এখনো বকেয়াভিত্তিক — P2

- `app/(admin)/(tabs)/members.tsx:41`, `:164`: highest dues sort, due filter ও due badge আছে। 018-এর পরে নতুন savings dues সব শূন্য, তাই এগুলো নিয়মিত ব্যবহারযোগ্য নয়।
- করণীয়: General / Share Holder / Director category filter ও badge; active/inactive আলাদা রাখুন। বাবা-মায়ের নাম দিয়ে একই নামের সদস্য চিনতে search/detail সহায়তা যোগ করা যায়। Category এবং app permission আলাদা থাকবে।

### A07 — Member থেকে “View all transactions” সঠিক ব্যক্তিকে নির্বাচন করে না — P2

- `app/(admin)/member/[id].tsx:519` statement route-এ `?memberId=...` পাঠায়। `src/screens/Statements.tsx:13` route params পড়ে না; target শুরু হয় `all` দিয়ে।
- করণীয়: param যাচাই করে single-member statement খুলতে হবে; back/refresh-এ selection ঠিক রাখতে হবে।

### A08 — Statements ও reports-এ পুরোনো dues এবং export mismatch — P2

- `src/screens/Statements.tsx`: Overdue selection, dues card এবং dues column এখনও আছে।
- `src/utils/reportExport.ts:18`, `:27`: monthly export-এ dues এবং আলাদা overdue report আছে।
- `app/(admin)/reports.tsx`: English “Project Report”; সব export-এর header/footer এখনও বাংলা। “Export all” শুধু report 4/member balances CSV দেয়।
- Cash & Bank Book বর্তমান balance list দেয়, account-wise transaction book নয়। Annual distribution report নির্বাচিত year-এর immutable share snapshot-এর বদলে member-এর latest stored profit field ব্যবহার করে; UI selector শুধু month।
- করণীয়: voluntary savings report, investment due report, principal/profit/expense breakdown, year-scoped distribution snapshot, সত্যিকারের account ledger; export-এর label ও content মিলতে হবে, BN/EN-ও একইভাবে মানতে হবে। Historical dues/late-fee records অযথা মুছে ফেলা যাবে না।

### A09 — টাকার দশমিক সর্বত্র একইভাবে দেখা যায় না — P2

- `src/lib/money.ts:26` formatter amount round করে পূর্ণ টাকা দেখায়। Investment screens precise formatter নেয়, কিন্তু সাধারণ deposit receipt/dashboard/finance সেই formatter নেয় না।
- করণীয়: financial amount display/export-এ প্রয়োজন হলে দুই decimal; ৳১০০.৫০ যেন রসিদে ৳১০১ না হয়। Integer member number কখনো monetary formatter দিয়ে বদলানো যাবে না।

### A10 — নতুন society owner এখনো legacy SM-001 পায় — P2 / product decision

- `supabase/migrations/011_multiple_somitis.sql:176`: registration bootstrap owner-কে SM-001 দেয়; নতুন manual category/number input ওই পথে নেই।
- Legacy identity fields ইচ্ছাকৃতভাবে locked, তাই category mapping app থেকে করা যায় না। সাধারণ new-member flow ঠিক আছে।
- করণীয়: registration-এ owner-এর category/manual number নেওয়া হবে, নাকি owner শুধু administrative account হবে—নিয়ম স্থির করে controlled mapping। পুরোনো member number/UUID/transactions অনুমান করে বদলানো যাবে না।

### A11 — Proposal lifecycle-এর অসম্পূর্ণ ব্যবহারযোগ্যতা — P2 / enhancement

- Submitted proposal edit/withdraw এবং rejected proposal থেকে correction/resubmit-এর পথ নেই। Approved proposal-এর cancellation-ও নেই। বর্তমান approval/disbursement কার্যকর; এগুলো নতুন enhancement, dead feature নয়।
- করণীয়: financial posting-এর আগে controlled amendment/withdraw/reproposal, decision history এবং filter। Posted contract terms পরিবর্তন করলে আলাদা agreed correction policy লাগবে।

### A12 — Backup ও release verification নতুন schema পুরোপুরি যাচাই করে না — P2

- `scripts/backup.cjs:84` full database dump নেয়; নতুন table বাদ পড়ে যায়—এমন প্রমাণ নেই।
- কিন্তু `businessMetrics()` শুধু members/profiles/transactions/cash totals মিলায়; investment contracts/proposals/payment events, principal/profit split ও schedules-এর reconciliation নেই।
- `scripts/check-backend.cjs` initialization/anonymous privacy দেখে; deployed identity/voluntary/workflow capability সব যাচাই করে না। এই ফাঁকেই আগে missing update থাকা অবস্থায় সাধারণ health check পাস করতে পেরেছে।
- করণীয়: versioned backend capability check ও release gate; restore rehearsal-এ নতুন investment records এবং balances reconcile করা। Readiness guard সরিয়ে সমস্যাটি আড়াল করা যাবে না।

## নিশ্চিত dead / misleading feature

| জায়গা | বর্তমান অবস্থা | করণীয় |
|---|---|---|
| More → Meetings & Notices (`more.tsx:211`) | `/(admin)/meetings` route নেই; notices route আছে | Notices-এ সঠিক link দিন; meetings module চাইলে আলাদা implement |
| More → Documents (`more.tsx:226`) | `/(admin)/documents` route নেই | আপাতত hide; বাস্তব document workflow চাইলে implement |
| Settings → Backup (`settings.tsx:137`) | শুধু সফল alert; dump/encryption/upload হয় না | মিথ্যা success সরিয়ে owner-managed backup-এর সঠিক অবস্থা/নির্দেশনা |
| Society → Constitution download (`somiti.tsx:352`) | শুধু “Downloading…” alert | আসল file থাকলে download, না থাকলে unavailable/hide |
| Society → Registration certificate download (`somiti.tsx:375`) | শুধু “Downloading…” alert | আসল file থাকলে download, না থাকলে unavailable/hide |
| Reminder → Push Notification (`reminder.tsx:153`) | selectable হলেও handler বলে unavailable | Supported না হওয়া পর্যন্ত hide/স্পষ্ট disabled |
| Settings → New Investment approval row (`settings.tsx:276`) | Touchable + chevron, কোনো onPress নেই | Read-only policy row করুন বা workflow/rules খুলুন |

SMS delivery/provider audit করা হয়নি; SMS/OTP বর্তমানে user-approved scope-এর বাইরে। SMS UI-কে live integration হয়েছে বলে উপস্থাপন করা উচিত নয়। Manual WhatsApp investment reminder dead নয়।

## Dead code বনাম প্রয়োজনীয় compatibility

- Dashboard-এ removed target/dues cards-এর calculation/styles, member home-এর hidden installment receipt state এবং settings-এর unused monthly/late-fee setters পরিষ্কার করা যায়। `src/lib/api.ts:350` staff sync-এ পুরোনো `refresh_dues` call-এর প্রয়োজনও পুনর্বিবেচনা করা উচিত।
- Legacy project route/RPC, old member ID mapping, transaction months/late_fee fields সরাসরি delete করা উচিত নয়; পুরোনো হিসাব ও APK compatibility এগুলোর ওপর নির্ভর করতে পারে।
- Mock/demo data-তে পুরোনো fixed dues আছে। Live data হিসেবে গণনা করা হয়নি; কিন্তু client demo যেন নতুন requirement-এর বিপরীত ছবি না দেখায়, তাই fixtures-ও update করা উচিত।
- MEMBER category “Director” এবং profit allocation-এর “Director share” বর্তমানে একই জিনিস নয়। Category বদলালে extra management profit স্বয়ংক্রিয়ভাবে পাওয়ার নিয়ম user দেননি; audit থেকে নতুন নিয়ম বানানো হয়নি।

## প্রস্তাবিত কাজের ক্রম

1. A01–A04: financial summary, truthful receipt/reminder, posting date guard।
2. Broken menu/fake success বন্ধ, A05 central approvals, A07 member statement link।
3. A06 category filtering, A08 reports/exports, A09 exact amount display।
4. A10 identity migration decision, A11 proposal lifecycle, A12 deployment/restore verification ও demo cleanup।
5. Admin/cashier/member, BN/EN, member/external recipient, partial/advance repayment, reversal, same-name societies ও unchanged-menu caching regression; তারপর user চাইলে APK rebuild ও physical Android test।

## যাচাই

- Source route scan: দুটি missing literal destination পাওয়া গেছে—meetings ও documents।
- Disposable PostgreSQL investment suite: ১৯ checks passed; same-tenant money posting, cross-tenant rejection, workflow, reversal, recognized profit এবং closed investment year যাচাই হয়েছে। Audit probe-তে A01-এর summary mismatch reproduced। Production-এ কোনো fixture লেখা হয়নি।
- TypeScript এবং existing report-query suite passed। বর্তমান tests pass করলেও cross-screen semantic mismatch ধরেনি; A01/A02/A05/A07-এর জন্য dedicated regression দরকার।
- Audit evidence মূলত source ও disposable DB; সব listed issue physical phone-এ আলাদা reproduce হয়েছে—এমন দাবি করা হয়নি।
