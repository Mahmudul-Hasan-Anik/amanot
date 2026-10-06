# আমানত — Backend Setup (Supabase)

App ta duita mode e chole:

- **Demo mode** — `.env` na thakle. Ager moto local mock data, dev switcher, OTP 482700.
- **Live mode** — `.env` e Supabase URL + key dile. Sob data server e, real phone + PIN login.

## 1. Supabase project khulun (5 min)

1. https://supabase.com → **New project** (Region: *Southeast Asia (Singapore)*).
2. **Authentication → Sign In / Providers → Email**:
   - Email provider **ON**
   - **Confirm email → OFF** (khub joruri, na hole login hobe na)
3. **SQL Editor → New query** → `supabase/schema.sql` er pura content paste → **Run**.
4. (Optional, test er jonno) `supabase/demo_seed.sql` run korun — 9 jon demo member, sobar first-login PIN `1234`.
5. (Optional) Monthly due auto-add: **Database → Extensions → pg_cron ON**, tarpor SQL Editor e:
   ```sql
   select cron.schedule('amanot-monthly-dues', '5 0 1 * *', 'select public.accrue_monthly_dues()');
   ```

## 2. App ke connect korun

**Project Settings → API** theke `Project URL` ar `anon public` key copy kore `app/.env` file banan:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Tarpor `npx expo start -c` (cache clear kore restart).

## 3. Prothom login

**Notun somiti (demo seed chara):** Login screen e je kono number dile "nibondhito noy" modal ashbe → **সমিতি নিবন্ধন** → somitir naam, apnar naam, phone, 4-digit PIN. Ei prothom user **super admin** hobe. Eta shudhu ekbar kora jay.

**Demo seed run korle:** `01711223344` + PIN `1234` = super admin (আনোয়ার হোসেন). `01712345678` + `1234` = sadharon member.

## Kivabe kaj kore

| Kaj | Ke korte pare |
|---|---|
| Member add / edit, joma, khoroch entry, transfer, project income | Staff (super_admin, admin, cashier, field_worker) |
| Khoroch approve/reject, PIN reset, member delete, somiti info edit | Admin / super admin |
| Role change (`set_member_app_role`) | Shudhu super admin |
| Nijer profile, nijer joma, somitir summary dekha | Sadharon member |

- **Member add:** admin member add korar somoy je PIN den, member sei PIN diye prothom login kore. Tarpor profile theke PIN change korte pare.
- **PIN bhule gele:** admin member er profile theke "Reset PIN" → PIN `1234` hoye jay.
- **Maker-checker:** cashier/field worker er khoroch, ar limit (default ৳10,000) er beshi khoroch → approval e jay.
- **Ledger immutable:** transaction kokhono edit/delete hoy na (database e blocked). Vul hole correction entry.
- **Audit log:** prottek kaj `audit_logs` table e lekha thake.

## Staff role deya (eki somoy UI nai)

SQL Editor e:

```sql
-- role: super_admin | admin | cashier | field_worker | member
update public.members set app_role = 'cashier', role_title = 'কোষাধ্যক্ষ' where code = 'SM-012';
update public.profiles set role = 'cashier' where member_id = (select id from public.members where code = 'SM-012');
```

## Production er age

- PIN 4-digit, tai Supabase **Authentication → Rate Limits** e sign-in limit kom rakhun.
- Android build: `npx eas build -p android` (EAS account lagbe). `.env` er value gulo EAS Secrets e o din.
