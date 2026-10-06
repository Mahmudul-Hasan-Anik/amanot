-- ==============================================================================
-- আমানত — OPTIONAL demo data (for testing only). Run AFTER schema.sql.
-- Every demo member can log in the first time with PIN 1234.
-- Anwar Hossain (01711223344) becomes super admin.
-- ==============================================================================

update public.somiti_settings set info = info || jsonb_build_object(
  'name', 'আমানত সমিতি', 'nameEn', 'Amanot Somiti', 'regNo', '১২৮৯/২০২২', 'establishedYear', '২০২২',
  'address', 'উত্তরা, ঢাকা', 'phone', '০১৭১২-৩৪৫৬৭৮', 'email', 'info@amanot.org',
  'authority', 'উপজেলা সমবায় কার্যালয়, উত্তরা', 'committeeTenure', '২০২৫–২০২৭',
  'bankName', 'ইসলামী ব্যাংক বাংলাদেশ (মিরপুর শাখা)', 'bankAccountNo', '2050-1402-1028-900',
  'bkashNo', '০১৭১২-৩৪৫৬৭৮', 'nagadNo', '০১৮১২-৩৪৫৬৭৮') where id = 1;

update public.cash_accounts set holder = 'ইসলামী ব্যাংক বাংলাদেশ (মিরপুর শাখা)', amount = 760000 where id = 'ca1';
update public.cash_accounts set holder = 'মাহমুদা খাতুন', amount = 120000 where id = 'ca2';
update public.cash_accounts set holder = '০১৭১১-২২৩৩৪৪', amount = 38000 where id = 'ca3';
update public.cash_accounts set holder = 'সুমন মিয়া', amount = 12000, note = 'আজ জমা দিতে হবে' where id = 'ca4';

insert into public.members (code, name, name_en, phone, whatsapp, address, nominee_name, nominee_relation,
  monthly_amount, total_deposit, due_amount, due_months, status, role_title, app_role, pin_hash, join_date, months_status)
select v.code, v.name, v.name_en, v.phone, v.phone, v.address, v.nominee, v.rel, v.monthly, v.total, v.due, v.due_m,
       v.status, v.title, v.app_role, extensions.crypt('1234', extensions.gen_salt('bf')), date '2022-01-01',
       '{"0":"paid","1":"paid","2":"paid","3":"paid","4":"paid","5":"paid","6":"paid","7":"paid","8":"paid"}'::jsonb
from (values
  ('SM-001','আনোয়ার হোসেন','Anwar Hossain','01711223344','বাড়ি ১২, রোড ৪, সেক্টর ৯, উত্তরা','নাজমা আক্তার','স্ত্রী',3000,144000,0,0,'paid','সভাপতি · সুপার অ্যাডমিন','super_admin'),
  ('SM-042','করিম উদ্দিন','Karim Uddin','01712345678','উত্তরা, ঢাকা','রাশেদা বেগম','স্ত্রী',2000,108000,4100,2,'due','সাধারণ সদস্য','member'),
  ('SM-007','জাহিদ হাসান','Zahid Hasan','01733445566','ঢাকা','তাসলিমা','স্ত্রী',2500,120000,0,0,'paid','সাধারণ সম্পাদক','admin'),
  ('SM-056','নাসরিন আক্তার','Nasrin Akter','01724998877','ঢাকা','কামাল','স্বামী',1500,72000,1000,1,'partial','সাধারণ সদস্য','member'),
  ('SM-012','মাহমুদা খাতুন','Mahmuda Khatun','01812112233','ঢাকা','রফিজুল','ভাই',2000,102000,0,0,'paid','কোষাধ্যক্ষ','cashier'),
  ('SM-033','রফিকুল ইসলাম','Rafiqul Islam','01915667788','ঢাকা','জাহানারা','মা',2000,96000,6300,3,'due','সাধারণ সদস্য','member'),
  ('SM-061','শাহানা পারভীন','Shahana Parvin','01750112233','ঢাকা','আকবর','স্বামী',1000,48000,0,0,'paid','সাধারণ সদস্য','member'),
  ('SM-078','সুমন মিয়া','Sumon Mia','01888990011','ঢাকা','আমেনা','বোন',2000,60000,0,0,'inactive','মাঠকর্মী','field_worker'),
  ('SM-090','হাবিবুর রহমান','Habibur Rahman','01999223344','ঢাকা','সালমা','স্ত্রী',3000,130000,0,0,'paid','সাধারণ সদস্য','member')
) as v(code,name,name_en,phone,address,nominee,rel,monthly,total,due,due_m,status,title,app_role)
where not exists (select 1 from public.members m where m.code = v.code and m.deleted_at is null);

update public.members set months_status = months_status || '{"7":"due","8":"due"}'::jsonb where code = 'SM-042';

insert into public.projects (name, type, location, manager, status, invested_amount, returned_amount, net_profit, roi_pct,
  start_date, expected_end, recovery_pct, remaining_amount)
select * from (values
  ('সাইট এ: জমি প্রকল্প','জমি','উত্তরা','জাহিদ হাসান','ongoing',1500000::numeric,420000::numeric,180000::numeric,12::numeric,'মার্চ ২০২৫','ডিসেম্বর ২০২৬',28,1080000::numeric),
  ('দোকান ভাড়া প্রকল্প','ভাড়া','মিরপুর','আনোয়ার হোসেন','ongoing',1020000,240000,62000,6,'জানুয়ারি ২০২৫','ডিসেম্বর ২০২৭',24,780000),
  ('পোল্ট্রি খামার','কৃষি','গাজীপুর','মাহমুদা খাতুন','ongoing',600000,180000,45000,7.5,'ফেব্রুয়ারি ২০২৫','জুন ২০২৬',30,420000),
  ('সাইট বি: নির্মাণ প্রকল্প','নির্মাণ','সাভার','করিম উদ্দিন','delayed',800000,95000,25000,3.1,'জানুয়ারি ২০২৫','মার্চ ২০২৭',12,705000)
) v where not exists (select 1 from public.projects);
