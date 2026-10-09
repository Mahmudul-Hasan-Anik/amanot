# Amanot — Android launch-এর বাকি কাজ ও implementation plan

তারিখ: ৯ অক্টোবর ২০২৬

## সর্বশেষ development update

**ব্যবহারকারীর নতুন নির্দেশ: এখন APK build/update নয়; সব issue local-এ ঠিক করার পর ব্যবহারকারী বললে APK বানাতে হবে।** আগের 1.0.3 build বাতিল। ফোন ছাড়া PIN route-এ ঢোকা, invalid internal email, stale activation status ও logout-এর পর late login response-এর guards এবং বাংলা auth error mapping যোগ হয়েছে। Phone/API payload, PIN-screen, live-auth, typecheck/token checks ও local bundle build পাস; browser-এ missing-phone redirect এবং refresh পাস। বাস্তব owner login-এর ফল user যাচাই করবেন; credentials বদলানো হয়নি।

PIN-screen hotfix: 1.0.2-এ ৬-digit live PIN লিখতে গিয়ে ৪ digit-এ demo verification চলছিল। Branch-টি demo mode-এ সীমাবদ্ধ করা হয়েছে, local preview rebuild ও ৪-digit/no-alert browser check পাস; screen-handler regression, typecheck ও live-auth tests পাস। 1.0.3/code 4 local candidate; জমা দেওয়া Android build ব্যবহারকারীর নির্দেশে বাতিল। PIN reset বা database migration লাগে না।

ব্যবহারকারীর নির্দেশে **বাস্তব ফোনের পরীক্ষা এবং original খাতা/opening balance reconciliation এখন skip** করা হয়েছে। এগুলো পাস হয়েছে বলা হচ্ছে না। আগের সময়ের table প্রাথমিক estimate; বর্তমান ফল নিচে।

- **সম্পন্ন ও live deployed:** migrations 009/010; শক্ত ৬-digit PIN, প্রথম login-এ বাধ্যতামূলক verified change, random temporary PIN/৭২ ঘণ্টা expiry, recovery permission ও session revocation। বর্তমান credential বদলানো হয়নি। Provider minimum password 13, secure/current-password change enabled, sign-in/sign-up 10/5 মিনিট/IP। PIN-change lock ৫ ভুলে ১৫ মিনিট; login-এর per-account lock নয়।
- **সম্পন্ন code:** Android protected session storage; plaintext live financial/NID cache বন্ধ; background lock; revision-ভিত্তিক sync, unchanged snapshot বাদ, ৫ মিনিট active polling; save/role/notice/member/settings action server-confirmed; privacy/support page।
- **সম্পন্ন tooling:** encrypted database+photo backup, integrity validation ও disposable local restore command; [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md)। Owner destination/secret/PostgreSQL tools ছাড়া আসল export/restore করা হয়নি।
- **Checks পাস:** TypeScript/token, ১৮ accounting, ১১ security, ৬ image-validator এবং auth/session/sync/save-failure/backup regression suites। SQL tests disposable; hashing/GoTrue sessions fixture। Hosted ledger unchanged, private rollback ও ১২০ KB photo policy যাচাই হয়েছে।
- **নতুন Android build সম্পন্ন:** 1.0.2/code 3, signed live release APK download ও SHA-256/archive/native-module checks পাস; [ANDROID_RELEASE.md](ANDROID_RELEASE.md)-এ link ও checksum। পুরোনো APK-তে বাধ্যতামূলক PIN-change screen নেই।
- **সীমাবদ্ধতা:** ৫০০ concurrent user load পরীক্ষা হয়নি; staff report এখনো পূর্ণ history fetch করে; global revision change member snapshot-ও invalidate করে। Production dependency audit clean নয়: ৮ moderate/১৪ high/০ critical; [SECURITY_REVIEW.md](SECURITY_REVIEW.md)।
- **Owner-dependent pending:** deferred phone/ledger checks, independent backup/restore, support phone/email ও retention সিদ্ধান্ত, pilot feedback/rollout approval। Public Web, paid SMS, store submission ও iOS আগের মতো deferred।

## সিদ্ধান্ত ও লক্ষ্য

প্রথম release শুধু Android app। পরে iOS। Public Web launch বা hosting এখন scope-এ নেই; Web preview কেবল development/testing-এর জন্য। এখন কোনো বাজেট নেই, তাই Supabase Free backend রাখব। VPS বা backend migration এখন করব না।

প্রথম লক্ষ্য: অল্প কয়েকজন অনুমোদিত ব্যবহারকারীকে **live Supabase যুক্ত signed Android APK** দিয়ে pilot চালানো। Demo APK-কে live হিসাবের app হিসেবে দেওয়া যাবে না। Play Store release আলাদা ধাপ। বাস্তব SMS ও iOS release এখন স্থগিত।

সদস্যের NID **শুধু নম্বর** রাখা হবে; NID image upload নয়। Optional profile photo JPEG/PNG/WebP সর্বোচ্চ **১২০ KB (১২২,৮৮০ bytes)**; বড় file নির্বাচন/upload প্রত্যাখ্যান করতে হবে। ৫০০ profile photo সর্বোচ্চ প্রায় ৫৮.৬ MiB হবে, পুরোনো/orphan files বাদে। Private storage ও role permissions থাকবে।

এই file একটি পরিকল্পনা—নিচের pending কাজগুলো এখনো সম্পন্ন বলে ধরে নেওয়া যাবে না।

## এখন কী প্রস্তুত

- Expo/React Native app; staff ও member flow, বাংলা/ইংরেজি UI।
- জমা, বকেয়া, খরচ, project ও profit হিসাবের backend functions; duplicate posting এবং balance guards।
- Statements, analytics, PDF/CSV export ও private member-document upload-এর implementation।
- Matching live Supabase project-এ migrations 004–008 এবং `send-sms` function deploy হয়েছে। SMS এখন simulated।
- Migration-এর আগে business tables/functions-এর restricted backup নেওয়া হয়েছে; deployment checks-এ পুরোনো member ও ledger অক্ষত পাওয়া গেছে।
- TypeScript/token checks এবং disposable PostgreSQL/PGlite-এ ১৮টি accounting check এবং ৬টি profile-photo check পাস। Browser-এ demo login ও CSV download যাচাই হয়েছে।
- Signed demo APK আগে build হয়েছে। এখন `release` profile live APK বানায়; production EAS environment configure করা হয়েছে এবং version 1.0.1 (code 2)-এর signed live build সফল হয়েছে। `preview` demo APK এবং `production` live AAB বানায়। বিস্তারিত `ANDROID_RELEASE.md`।

এসব যাচাই বাস্তব Android device, hosted login, সব role-এর permissions বা production recovery পরীক্ষা করার বিকল্প নয়।

GitHub database health-check publish/configure হয়েছে; প্রথম manual run সফল। প্রতিদিন বাংলাদেশ সময় ৭:১৭, ১৫:১৭ ও ২৩:১৭-তে query হবে। PIN-change failure handling ও member dashboard-এর কৃত্রিম তথ্য সরানো হয়েছে। Hosted permission/read-only checks এবং live-mode auth-store regression checks পাস; বাস্তব device login এখনো pending।

## কাজের ক্রম, সময় ও কারণ

সময়গুলো আনুমানিক কার্যকর কাজের সময়; নিশ্চিত delivery date নয়। Access, owner-এর তথ্য, device feedback, EAS queue/quota বা নতুন bug পাওয়া গেলে elapsed time বাড়বে। এক দিনের হিসাব প্রায় ৬–৮ ঘণ্টা focused কাজ।

| ধাপ | বাকি কাজ ও implementation | কেন সময় লাগবে | আনুমানিক সময় | শেষ হওয়ার প্রমাণ |
|---|---|---|---|---|
| ১ — জরুরি | Live login, activation, PIN change ও recovery যাচাই; ভুল PIN/expired session/role পরিবর্তনের flow ঠিক করা | Demo auth ও hosted auth আলাদা; বর্তমান phone/PIN ব্যবস্থা synthetic email/password ব্যবহার করে | ১–২ দিন | বাস্তব hosted account দিয়ে login, restart, logout ও recovery; অন্য role-এর screen/RPC access প্রত্যাখ্যান |
| ২ — জরুরি | PIN নিরাপত্তা ও member onboarding শক্ত করা; server-side attempt limits/lockout যাচাই, initial PIN বদলানো বাধ্যতামূলক করা | বর্তমান ৪ সংখ্যার PIN ছোট; UI validation একা brute-force ঠেকায় না; app ও SQL/auth-এর নিয়ম মিলতে হবে | ১–২ দিন | repeated wrong attempts সীমাবদ্ধ; shared/default PIN দিয়ে সদস্য rollout নয়; নিরাপদ recovery flow |
| ৩ — জরুরি | Legacy opening balance, dues year ও member status original records-এর সঙ্গে reconcile করা | পুরোনো month data-তে নির্ভরযোগ্য year ছিল না; code থেকে সঠিক historical year অনুমান করা যাবে না | ০.৫–১ দিন + owner-এর যাচাই | অনুমোদিত opening balances ও dues; totals ledger/cash/project হিসাবের সঙ্গে মেলে |
| ৪ | Supabase database health check + GitHub Actions schedule, manual run, retry ও failure notification | HTTP success দেখলেই database সচল প্রমাণ হয় না; workflow সত্যিই schedule থেকে চলছে কি না দেখতে হবে | ২–৪ ঘণ্টা + পরের scheduled run পর্যবেক্ষণ | manual ও scheduled run পাস; failed check workflow fail করে; sensitive data logs-এ নেই |
| ৫ — জরুরি | স্বাধীন backup, encrypted local/off-site copy এবং restore rehearsal | একই database-এর backup schema server loss-এর backup নয়; documents ও auth recovery-ও বিবেচনা করতে হবে | ০.৫–১ দিন | disposable environment-এ database restore; documents উদ্ধার; owner-এর recovery instructions |
| ৬ — জরুরি | Dependency advisories ও application permissions audit; উপযুক্ত version update, hosted RLS/storage tests | কিছু warning toolchain/transitive; forced major downgrade করলে app ভাঙতে পারে; NID/আর্থিক তথ্য private রাখতে হবে | ০.৫–১.৫ দিন | relevant risks resolved বা documented; member অন্য member-এর ledger/document পড়তে পারে না |
| ৭ | Live APK profile, EAS public env, signing ও release-mode build | `.env` থাকলেই remote build সঠিক env পাবে না; config না থাকলে এখন app demo fallback করতে পারে | ২–৪ ঘণ্টা + build queue | `EXPO_PUBLIC_DEMO_MODE=false`; missing live config হলে পরিষ্কার error; signed APK live backend-এ connects |
| ৮ — জরুরি | বাস্তব Android device-এ সম্পূর্ণ flow, slow/offline network ও retry পরীক্ষা; bug fix ও rebuild | Browser test Android file sharing, gallery permissions, keyboard, session persistence বা install/update যাচাই করে না | ১–২ দিন | নিচের device checklist পাস; গুরুত্বপূর্ণ unresolved bug নেই |
| ৯ | সীমিত live pilot; feedback নিয়ে সংশোধন; তারপর বেশি সদস্যকে দেওয়া | বাস্তব ব্যবহারকারীর device ও কাজের ধরন development পরিবেশ থেকে আলাদা | ৩–৭ calendar দিন পর্যবেক্ষণ | authorised entries মেলে, duplicate নেই, support/backup চলমান; owner rollout অনুমোদন করেন |

ধাপ ১–৩ আগে। ধাপ ৪–৬ authentication ও historical হিসাবের কাজের পাশে এগোতে পারে। ধাপ ৭-এর build configuration আগে প্রস্তুত করা যায়, কিন্তু final APK হবে প্রয়োজনীয় fixes-এর পরে। ধাপ ৮ পাস না হলে pilot শুরু নয়। পরিকল্পনার প্রাথমিক পরিসর **প্রায় ৫–১০ কার্যদিবসের প্রস্তুতি + ৩–৭ দিনের pilot**, নতুন সমস্যা বা access delay ছাড়া।

## Login ও SMS ছাড়া initial release

Live app-এ কোনো demo OTP বা "OTP পাঠানো হয়েছে" ধরনের ভুয়া success দেখানো যাবে না। SMS OTP provider কেনার বাজেট নেই, তাই প্রথম release-এ registered phone + নিরাপদ PIN/credential onboarding flow ব্যবহার করব।

Implementation:

1. Supabase provider configuration, existing accounts ও first-admin অবস্থার read-only audit। Existing owner credentials পরিবর্তন owner নিজে করবেন।
2. Admin-approved member activation এবং PIN recovery end-to-end যাচাই। পরিচয় যাচাই ছাড়া reset নয়।
3. নতুন member-এর unique initial credential, প্রথম login-এ change এবং recovery procedure যোগ করা। বর্তমান ৪-digit PIN থেকে অন্তত ৬-digit PIN বা শক্ত credential-এ যাওয়ার প্রয়োজন evaluate করে app/SQL/auth একসঙ্গে migrate করা; সীমিত server attempts বাধ্যতামূলক।
4. Secrets/PIN plaintext app cache, console, analytics বা GitHub logs-এ না রাখা; session/token storage ও logout cleanup review করা।
5. Live SMS action বন্ধ/স্পষ্ট unavailable থাকবে। Simulated SMS-কে delivered বলা যাবে না। WhatsApp ব্যবহারকারী নিজে পাঠাবেন।

## Supabase Free ও GitHub health check

Workflow publish/configure হয়েছে: দিনে ৩ বার বাংলাদেশ সময় ৭:১৭, ১৫:১৭ ও ২৩:১৭-তে ছোট database query। `somiti_initialized` RPC শুধু true/false ফেরত দেয়; member, NID, ledger বা balance নয়। Timeout, bounded retry এবং শূন্য GitHub token permissions আছে। Service-role key ব্যবহার করা হয়নি।

Repository public। Default branch-এ workflow আছে এবং প্রথম manual run সফল: [run #1](https://github.com/Mahmudul-Hasan-Anik/amanot/actions/runs/37946615456)। Actual scheduled run এখনো পর্যবেক্ষণ বাকি। Public repository-তে ৬০ দিন repository activity না থাকলে GitHub schedule disable করতে পারে; দরকার হলে re-enable করতে হবে। Failure notification owner enable করবেন এবং নিয়মিত warning email/usage দেখবেন।

এটি pause-এর ঝুঁকি কমানোর ব্যবস্থা, uptime guarantee নয়। Supabase sufficient database activity বিচার করে; শুধু URL ping যথেষ্ট ধরে নেব না। Pause হলে owner dashboard থেকে resume করবেন। স্বয়ংক্রিয় resume-এর জন্য broad management token যোগ করা initial scope-এ নেই।

## Android device checklist

- Clean install, existing APK update, app close/reopen, background/foreground, session expiration এবং logout। একই signing key ধরে রাখতে হবে।
- Staff/member login; ভুল credential; restricted role দিয়ে নিষিদ্ধ কাজ করা না যায়।
- Deposit, partial payment, late fee, একাধিক year/month, একই submission দুইবার, approve/reject ও insufficient balance।
- Expense, transfer, project capital return, gain/loss ও annual distribution—disposable test data দিয়ে hosted integration; real হিসাবের পরীক্ষা owner-এর অনুমোদনে।
- Network timeout/retry-তে duplicate entry নয়; server নিশ্চিত না করলে success নয়। Pilot-এ offline financial writes বন্ধ থাকবে, pending sync queue নতুন করে বানানো scope-এ নেই। Cached data stale হলে label দিতে হবে।
- PDF/CSV download/share, বাংলা rendering, gallery permissions, profile ছবির ১২০ KB boundary, বড়/ভুল file rejection, NID image upload denial, signed URL এবং অন্য member-এর profile image access denial।
- ছোট screen, Android back button, keyboard, font size, loading/error/retry এবং low-end phone behaviour।
- Test data এবং real member records আলাদা রাখা; production-এ demo seed নয়।

## Backup ও operation

প্রথমে owner-এর নিয়ন্ত্রিত encrypted backup destination নির্ধারণ করব। Credentials chat/Git-এ নয়; protected local/server environment ব্যবহার করব। প্রথম pilot-এর আগে full snapshot, পরে দৈনিক বা কাজের পর export; retention ও restore steps লিখব। Database dump-এর বাইরে private bucket files ও signing credential recovery আলাদাভাবে রাখব। Public repo বা অসুরক্ষিত GitHub artifacts-এ member/NID/financial dump রাখা যাবে না।

Free quota পর্যবেক্ষণ: database size, profile photo storage, egress, auth usage, function calls এবং EAS/Actions allowance। NID image collection বন্ধ; শুধুই নম্বর রাখা হবে। Backup copy-ও storage ব্যবহার করে। Quota কাছাকাছি গেলে retention ও paid plan-এর সিদ্ধান্ত নিতে হবে; keep-alive quota সমস্যার সমাধান নয়।

## খরচ ছাড়া বিতরণ এবং পরে store release

এখন signed APK সীমিত সদস্যকে direct download/install দিয়ে দেওয়া হবে। এটি Play Store release নয়; install permission, update link, version এবং release notes পরিষ্কার দিতে হবে। অনুমোদিত users-ই account পাবে। Store ছাড়লেও privacy notice, data collection explanation এবং support contact app-এর মধ্যে লাগবে।

Play Store পরে: developer account, testing/review requirements, privacy/data-safety declaration ও signed AAB। Google-এর বর্তমান registration fee একবার USD 25; account type অনুযায়ী testing requirements আছে। এখন এগুলো কেনা বা submission করা scope-এ নেই।

iOS পরে: Android stable হওয়ার পর iPhone UI/device testing, Apple signing, TestFlight/App Store প্রস্তুতি ও review। Standard Apple Developer Program annual fee বর্তমানে USD 99; সাধারণ store distribution-কে zero-budget ধরে পরিকল্পনা করা যাবে না।

## Owner-এর কাছ থেকে প্রয়োজন হবে

- আসল Android test phone ও app testing feedback।
- opening balance/পুরোনো dues-এর বিশ্বস্ত হিসাব এবং pilot-এর অনুমোদিত সদস্য।
- Supabase/GitHub/EAS-এ প্রয়োজনীয় access; কোনো password বা secret chat-এ পাঠাতে হবে না।
- Backup রাখার নিয়ন্ত্রিত জায়গা, support contact ও pilot শেষে rollout সিদ্ধান্ত।

## এখন scope-এ নেই

Public Web launch, VPS/Neon migration, paid SMS OTP, push notification, automatic WhatsApp sending, offline posting queue, Play Store submission এবং iOS release। User/বাজেট বাড়লে এগুলোর অগ্রাধিকার আবার ঠিক করব।

## Release gate

Live signed APK, verified auth/permissions, reconciled opening accounts, repeat-safe hosted accounting, tested backups/restore, private documents, passed device checklist এবং owner-approved pilot—সবগুলো ছাড়া "production-ready" বলা হবে না। প্রতিটি ধাপের ফল ও pending blocker এই plan-এ update করব।

## বর্তমান policy-এর সূত্র

৯ অক্টোবর ২০২৬-এ যাচাই; release-এর সময় পরিবর্তিত rules আবার যাচাই করতে হবে।

- [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing): Free project-এ গত সপ্তাহের sufficient database activity; keep-alive guarantee নয়।
- [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows): schedule delay হতে পারে; public repository-তে ৬০ দিন inactivity-তে schedule disabled হতে পারে।
- [Google Play account setup](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en): registration fee ও testing requirements।
- [Apple Developer enrollment](https://developer.apple.com/help/account/membership/program-enrollment/): annual membership fee।

Related files: `app/AUDIT.md`, `app/SETUP.md`, `app/eas.json`। এই plan-ই বর্তমান Android-only launch scope নির্ধারণ করে।
