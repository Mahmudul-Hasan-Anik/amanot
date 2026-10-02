-- ==============================================================================
-- আমানত (Amanat) - সমিতি ম্যানেজমেন্ট সিস্টেম: সম্পূর্ণ Supabase SQL স্কিমা
-- ট্যাগলাইন: হিসাবে ইনসাফ, আমানতে সুরক্ষা
-- সংস্করণ: ১.০ (প্রোডাকশন রেডি)
-- ==============================================================================

-- এক্সটেনশনসমূহ সক্রিয়করণ
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ১. সমিতি সেটিংস টেবিল
CREATE TABLE IF NOT EXISTS somiti_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name VARCHAR(100) NOT NULL DEFAULT 'আমানত সমিতি',
    tagline VARCHAR(150) DEFAULT 'হিসাবে ইনসাফ, আমানতে সুরক্ষা',
    reg_no VARCHAR(50) DEFAULT '১২৮৯/২০২২',
    established_year VARCHAR(20) DEFAULT '২০২২',
    address TEXT DEFAULT 'বাড়ি ১২, রোড ৪, সেক্টর ৯, উত্তরা, ঢাকা',
    phone VARCHAR(20) DEFAULT '+৮৮০ ১৭১১-২২৩৩৪৪',
    email VARCHAR(100) DEFAULT 'info@amanot.org',
    authority VARCHAR(100) DEFAULT 'সমবায় অধিদপ্তর',
    default_monthly NUMERIC(12,2) NOT NULL DEFAULT 2000.00,
    due_day INT NOT NULL DEFAULT 10,
    grace_days INT NOT NULL DEFAULT 5,
    late_fee NUMERIC(12,2) NOT NULL DEFAULT 100.00,
    reserve_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    director_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    total_fund NUMERIC(14,2) NOT NULL DEFAULT 4850000.00,
    cash_and_bank NUMERIC(14,2) NOT NULL DEFAULT 930000.00,
    project_invested NUMERIC(14,2) NOT NULL DEFAULT 3920000.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ২. ব্যবহারকারী প্রোফাইল টেবিল
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('super_admin', 'admin', 'cashier', 'field_worker', 'member')),
    pin_hash VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ৩. সদস্য মাস্টার টেবিল
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    whatsapp VARCHAR(20),
    nid VARCHAR(50),
    address TEXT NOT NULL,
    nominee_name VARCHAR(100),
    nominee_relation VARCHAR(50),
    nominee_phone VARCHAR(20),
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    monthly_amount NUMERIC(12,2) NOT NULL DEFAULT 2000.00,
    total_deposit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    due_months INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'due', 'partial', 'inactive')),
    role VARCHAR(50) DEFAULT 'সাধারণ সদস্য',
    profit_2025 NUMERIC(12,2) DEFAULT 0.00,
    estimated_profit_2026 NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ৪. ক্যাশ ও ব্যাংক অ্যাকাউন্ট টেবিল
CREATE TABLE IF NOT EXISTS cash_accounts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    holder VARCHAR(100),
    amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    note TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ৫. প্রকল্প ও বিনিয়োগ টেবিল
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL,
    location VARCHAR(150),
    manager VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'delayed', 'completed')),
    invested_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    returned_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    net_profit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    roi_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    start_date VARCHAR(50),
    expected_end VARCHAR(50),
    recovery_pct INT NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ৬. মাস্টার লেজার ও লেনদেন টেবিল (Immutable Event-Sourced Ledger)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no VARCHAR(50) UNIQUE NOT NULL,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    member_name VARCHAR(100),
    member_code VARCHAR(20),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(14,2) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'expense', 'transfer', 'profit', 'loan')),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'bkash', 'nagad', 'bank')),
    trx_id VARCHAR(100),
    note TEXT,
    months TEXT[],
    late_fee NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ৭. খরচ ভাউচার টেবিল
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_no VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_source VARCHAR(50) NOT NULL,
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ৮. অনুমোদন টেবিল (মেকার-চেকার ওয়ার্কফ্লো)
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('expense', 'investment', 'correction')),
    title VARCHAR(200) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    detail TEXT NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    date_str VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_new BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ৯. অপরিবর্তনীয় অডিট লগ টেবিল
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ট্রিগার: ট্রানজ্যাকশন টেবিল অপরিবর্তনীয় (Immutable) রাখা
-- ==============================================================================
CREATE OR REPLACE FUNCTION prevent_transaction_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'ত্রুটি: লেজার ট্রানজ্যাকশন আপডেট করা নিষিদ্ধ। ভুল হলে বিপরীত সমন্বয় এন্ট্রি দিন।';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'ত্রুটি: লেজার ট্রানজ্যাকশন ডিলিট করা নিষিদ্ধ। অপরিবর্তনীয় অডিট নীতি প্রযোজ্য।';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_transaction_update_delete ON transactions;
CREATE TRIGGER trg_prevent_transaction_update_delete
BEFORE UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION prevent_transaction_modification();

-- ==============================================================================
-- সিড ডেটা (Initial Seed Data)
-- ==============================================================================
INSERT INTO somiti_settings (id, name, tagline, reg_no, established_year, address, phone, total_fund, cash_and_bank, project_invested)
VALUES (1, 'আমানত', 'হিসাবে ইনসাফ, আমানতে সুরক্ষা', '১২৮৯/২০২২', '২০২২', 'উত্তরা, ঢাকা', '+৮৮০ ১৭১১-২২৩৩৪৪', 4850000, 930000, 3920000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO cash_accounts (id, name, holder, amount, note) VALUES
('bank', 'ইসলামী ব্যাংক বাংলাদেশ লি.', 'হিসাব নং: ২০৫০১২৩৪৫৬৭৮', 760000, 'প্রধান চলতি হিসাব'),
('cashier', 'কোষাধ্যক্ষের হাত', 'মাহমুদা খাতুন', 120000, 'দৈনিক খরচ ও ক্যাশ ইন হ্যান্ড'),
('bkash', 'বিকাশ মার্চেন্ট', '০১৭০০-০০০০০০', 38000, 'অনলাইন কিস্তি আদায়'),
('collector', 'মাঠকর্মী (সুমন মিয়া)', 'সুমন মিয়া', 12000, 'আজ সংগৃহীত কিস্তি')
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, name, type, location, manager, status, invested_amount, returned_amount, net_profit, roi_pct, start_date, expected_end, recovery_pct, remaining_amount) VALUES
('p1', 'সাইট এ: জমি প্রকল্প', 'জমি', 'উত্তরা', 'জাহিদ হাসান', 'ongoing', 1500000, 420000, 180000, 12, 'মার্চ ২০২৫', 'ডিসেম্বর ২০২৬', 28, 1080000),
('p2', 'দোকান ভাড়া প্রকল্প', 'ভাড়া', 'মিরপুর', 'আনোয়ার হোসেন', 'ongoing', 1020000, 240000, 62000, 6, 'জানুয়ারি ২০২৫', 'ডিসেম্বর ২০২৭', 24, 780000),
('p3', 'পোল্ট্রি খামার', 'কৃষি', 'গাজীপুর', 'মাহমুদা খাতুন', 'ongoing', 600000, 180000, 45000, 7.5, 'ফেব্রুয়ারি ২০২৫', 'জুন ২০২৬', 30, 420000),
('p4', 'সাইট বি: নির্মাণ প্রকল্প', 'নির্মাণ', 'সাভার', 'করিম উদ্দিন', 'delayed', 800000, 95000, 25000, 3.1, 'জানুয়ারি ২০২৫', 'মার্চ ২০২৭', 12, 705000)
ON CONFLICT (id) DO NOTHING;

-- প্রাথমিক সদস্যবৃন্দ
INSERT INTO members (code, name, phone, whatsapp, address, nominee_name, nominee_relation, monthly_amount, total_deposit, due_amount, due_months, status, role) VALUES
('SM-001', 'আনোয়ার হোসেন', '০১৭১১-২২৩৩৪৪', '০১৭১১-২২৩৩৪৪', 'বাড়ি ১২, রোড ৪, উত্তরা', 'নাজমা আক্তার', 'স্ত্রী', 3000, 144000, 0, 0, 'paid', 'সভাপতি · সুপার অ্যাডমিন'),
('SM-042', 'করিম উদ্দিন', '০১৭১২-৩৪৫৬৭৮', '০১৭১২-৩৪৫৬৭৮', 'উত্তরা, ঢাকা', 'রাশেদা বেগম', 'স্ত্রী', 2000, 108000, 4100, 2, 'due', 'সাধারণ সদস্য'),
('SM-007', 'জাহিদ হাসান', '০১৭৩৩-৪৪৫৫৬৬', '০১৭৩৩-৪৪৫৫৬৬', 'ঢাকা', 'তাসলিমা', 'স্ত্রী', 2500, 120000, 0, 0, 'paid', 'সাধারণ সম্পাদক'),
('SM-056', 'নাসরিন আক্তার', '০১৭২৪-৯৯৮৮৭৭', '০১৭২৪-৯৯৮৮৭৭', 'ঢাকা', 'কামাল', 'স্বামী', 1500, 72000, 1000, 1, 'partial', 'সাধারণ সদস্য'),
('SM-012', 'মাহমুদা খাতুন', '০১৮১২-১১২২৩৩', '০১৮১২-১১২২৩৩', 'ঢাকা', 'রফিজুল', 'ভাই', 2000, 102000, 0, 0, 'paid', 'কোষাধ্যক্ষ'),
('SM-033', 'রফিকুল ইসলাম', '০১৯১৫-৬৬৭৭৮৮', '০১৯১৫-৬৬৭৭৮৮', 'ঢাকা', 'জাহানারা', 'মা', 2000, 96000, 6300, 3, 'due', 'সাধারণ সদস্য'),
('SM-061', 'শাহানা পারভীন', '০১৭৫০-১১২২৩৩', '০১৭৫০-১১২২৩৩', 'ঢাকা', 'আকবর', 'স্বামী', 1000, 48000, 0, 0, 'paid', 'সাধারণ সদস্য'),
('SM-078', 'সুমন মিয়া', '০১৮৮৮-৯৯০০১১', '০১৮৮৮-৯৯০০১১', 'ঢাকা', 'আমেনা', 'বোন', 2000, 60000, 0, 0, 'inactive', 'মাঠকর্মী'),
('SM-090', 'হাবিবুর রহমান', '০১৯৯৯-২২৩৩৪৪', '০১৯৯৯-২২৩৩৪৪', 'ঢাকা', 'সালমা', 'স্ত্রী', 3000, 130000, 0, 0, 'paid', 'সাধারণ সদস্য')
ON CONFLICT (code) DO NOTHING;

-- প্রাথমিক অনুমোদন আইটেম
INSERT INTO approvals (type, title, amount, detail, created_by, date_str, is_new) VALUES
('expense', 'ব্যয়: সভার আপ্যায়ন', 12500, 'বার্ষিক সাধারণ সভার দুপুরের খাবার (১০০ জন) · উৎস: কোষাধ্যক্ষের হাতে', 'কোষাধ্যক্ষ', 'আজ সকাল ১০:২০', true),
('investment', 'বিনিয়োগ: সাইট বি', 200000, '৩য় কিস্তি · ব্যাংক থেকে প্রদান · প্রজেক্ট বর্তমানে বিলম্বিত', 'কোষাধ্যক্ষ', 'গতকাল', false),
('correction', 'সংশোধন: রসিদ #১০৭১', 500, 'ভুল পরিমাণ এন্ট্রি হয়েছিল। মূল এন্ট্রি মুছে যাবে না, বিপরীত এন্ট্রি যোগ হবে।', 'সম্পাদক', 'গতকাল', false);
