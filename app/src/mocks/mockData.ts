export interface Member {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  phone: string;
  whatsapp?: string;
  nid?: string;
  address: string;
  nomineeName: string;
  nomineeNameEn?: string;
  nomineeRelation: string;
  nomineePhone?: string;
  joinDate: string;
  monthlyAmount: number;
  totalDeposit: number;
  dueAmount: number;
  dueMonths: number;
  status: 'paid' | 'due' | 'partial' | 'inactive';
  role?: string;
  profit2025?: number;
  estimatedProfit2026?: number;
  monthsStatus?: Record<number, 'paid' | 'due' | 'upcoming'>;
  recentTxns?: Array<{ date: string; title: string; amount: number; receiptNo?: string; type: string }>;
  nextFollowup?: { date: string; note: string };
}

export interface Project {
  id: string;
  name: string;
  type: string; // জমি, ভাড়া, কৃষি, নির্মাণ
  location: string;
  manager: string;
  status: 'ongoing' | 'delayed' | 'completed';
  investedAmount: number;
  returnedAmount: number;
  netProfit: number;
  roiPct: number;
  startDate: string;
  expectedEnd: string;
  recoveryPct: number;
  remainingAmount: number;
}

export interface PendingApproval {
  id: string;
  type: 'expense' | 'investment' | 'correction';
  title: string;
  amount: number;
  amountDisplay?: string;
  detail: string;
  createdBy: string;
  dateStr: string;
  isNew?: boolean;
  attachmentType?: 'image' | 'document';
  attachmentTitle?: string;
  status?: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

export interface CashAccount {
  id: string;
  type?: 'bank' | 'cashier' | 'bkash' | 'field';
  name: string;
  holder?: string;
  amount: number;
  note?: string;
}

export const mockSomitiInfo = {
  name: 'আমানত সমিতি',
  nameEn: 'Amanot Somiti',
  tagline: 'সমিতির সব হিসাব, এক জায়গায়',
  regNo: '১২৮৯/২০২২',
  establishedYear: '২০২২',
  address: 'উত্তরা, ঢাকা',
  phone: '০১৭১২-৩৪৫৬৭৮',
  email: 'info@amanot.org',
  authority: 'উপজেলা সমবায় কার্যালয়, উত্তরা',
  committeeTenure: '২০২৫–২০২৭',
  bankName: 'ইসলামী ব্যাংক বাংলাদেশ (মিরপুর শাখা)',
  bankAccountNo: '2050-1402-1028-900',
  bkashNo: '০১৭১২-৩৪৫৬৭৮',
  nagadNo: '০১৮১২-৩৪৫৬৭৮',
  totalMembersCount: 100,
  activeMembersCount: 96,
  dueMembersCount: 22,
  inactiveMembersCount: 4,
  totalFund: 4850000,
  monthlyFundGrowth: 4.5,
  projectInvested: 3920000,
  projectInvestedPct: 81,
  cashAndBank: 930000,
  cashAndBankPct: 19,
  monthlyTarget: 210000,
  monthlyCollected: 164000,
  monthlyCollectedPct: 78,
  monthlyRemaining: 46000,
  paidCount: 78,
  dueCount: 22,
  partialCount: 4,
  unpaidCount: 18,
  totalDueAmount: 53500,
  dueBreakdown: {
    month1: 12,
    month2: 7,
    month3Plus: 3,
  },
  monthlyIncome: 182400,
  monthlyExpense: 12800,
  monthlyNet: 169600,
  yearlyProjectProfit: 312000,
  expenseApprovalLimit: 10000,
};

export const mockMembers: Member[] = [
  {
    id: '1',
    code: 'SM-001',
    name: 'আনোয়ার হোসেন',
    nameEn: 'Anwar Hossain',
    phone: '০১৭১১-২২৩৩৪৪',
    whatsapp: '০১৭১১-২২৩৩৪৪',
    address: 'বাড়ি ১২, রোড ৪, সেক্টর ৯, উত্তরা',
    nomineeName: 'নাজমা আক্তার',
    nomineeNameEn: 'Nazma Akter',
    nomineeRelation: 'স্ত্রী',
    joinDate: 'জানুয়ারি ২০২২',
    monthlyAmount: 3000,
    totalDeposit: 144000,
    dueAmount: 0,
    dueMonths: 0,
    status: 'paid',
    role: 'সভাপতি · সুপার অ্যাডমিন',
  },
  {
    id: '2',
    code: 'SM-042',
    name: 'করিম উদ্দিন',
    nameEn: 'Karim Uddin',
    phone: '০১৭১২-৩৪৫৬৭৮',
    whatsapp: '০১৭১২-৩৪৫৬৭৮',
    nid: '১৯৮৫ ২৬১২ ৭৪৪৯ ০৩১',
    address: '[ঠিকানা]',
    nomineeName: 'রাশেদা বেগম',
    nomineeNameEn: 'Rasheda Begum',
    nomineeRelation: 'স্ত্রী',
    joinDate: 'জানুয়ারি ২০২২',
    monthlyAmount: 2000,
    totalDeposit: 108000,
    dueAmount: 4100, // আগস্ট, সেপ্টে + ১০০ বিলম্ব ফি
    dueMonths: 2,
    status: 'due',
    profit2025: 7800,
    estimatedProfit2026: 5786,
    monthsStatus: {
      0: 'paid', 1: 'paid', 2: 'paid', 3: 'paid', 4: 'paid', 5: 'paid', 6: 'paid',
      7: 'due', 8: 'due', 9: 'upcoming', 10: 'upcoming', 11: 'upcoming'
    },
    recentTxns: [
      { date: '৮ জুলাই', title: 'জুলাই মাসের জমা', amount: 2000, receiptNo: '#১০৪২', type: 'বিকাশ' },
      { date: '৯ জুন', title: 'জুন মাসের জমা', amount: 2000, receiptNo: '#০৯৮৭', type: 'হাতে নগদ' },
      { date: '১৫ জানুয়ারি', title: '২০২৫ সালের লাভের অংশ', amount: 7800, type: 'বার্ষিক বণ্টন' },
    ],
    nextFollowup: {
      date: '৩ অক্টোবর',
      note: '২৮ সেপ্টেম্বর কল: "মাসের শুরুতে দেবেন"'
    }
  },
  {
    id: '3',
    code: 'SM-007',
    name: 'জাহিদ হাসান',
    phone: '০১৭৩৩-৪৪৫৫৬৬',
    address: 'ঢাকা',
    nomineeName: 'তাসলিমা',
    nomineeRelation: 'স্ত্রী',
    joinDate: 'জানুয়ারি ২০২২',
    monthlyAmount: 2500,
    totalDeposit: 120000,
    dueAmount: 0,
    dueMonths: 0,
    status: 'paid',
    role: 'সাধারণ সম্পাদক',
  },
  {
    id: '4',
    code: 'SM-056',
    name: 'নাসরিন আক্তার',
    phone: '০১৭২৪-৯৯৮৮৭৭',
    address: 'ঢাকা',
    nomineeName: 'কামাল',
    nomineeRelation: 'স্বামী',
    joinDate: 'মার্চ ২০২২',
    monthlyAmount: 1500,
    totalDeposit: 72000,
    dueAmount: 1000, // ৫০০ জমা · ১০০০ বাকি
    dueMonths: 1,
    status: 'partial',
  },
  {
    id: '5',
    code: 'SM-012',
    name: 'মাহমুদা খাতুন',
    phone: '০১৮১২-১১২২৩৩',
    address: 'ঢাকা',
    nomineeName: 'রফিজুল',
    nomineeRelation: 'ভাই',
    joinDate: 'জানুয়ারি ২০২২',
    monthlyAmount: 2000,
    totalDeposit: 102000,
    dueAmount: 0,
    dueMonths: 0,
    status: 'paid',
    role: 'কোষাধ্যক্ষ',
  },
  {
    id: '6',
    code: 'SM-033',
    name: 'রফিকুল ইসলাম',
    phone: '০১৯১৫-৬৬৭৭৮৮',
    address: 'ঢাকা',
    nomineeName: 'জাহানারা',
    nomineeRelation: 'মা',
    joinDate: 'জানুয়ারি ২০২২',
    monthlyAmount: 2000,
    totalDeposit: 96000,
    dueAmount: 6300,
    dueMonths: 3,
    status: 'due',
  },
  {
    id: '7',
    code: 'SM-061',
    name: 'শাহানা পারভীন',
    phone: '০১৭৫০-১১২২৩৩',
    address: 'ঢাকা',
    nomineeName: 'আকবর',
    nomineeRelation: 'স্বামী',
    joinDate: 'জুন ২০২২',
    monthlyAmount: 1000,
    totalDeposit: 48000,
    dueAmount: 0,
    dueMonths: 0,
    status: 'paid',
  },
  {
    id: '8',
    code: 'SM-078',
    name: 'সুমন মিয়া',
    phone: '০১৮৮৮-৯৯০০১১',
    address: 'ঢাকা',
    nomineeName: 'আমেনা',
    nomineeRelation: 'বোন',
    joinDate: 'জানুয়ারি ২০২২',
    monthlyAmount: 2000,
    totalDeposit: 60000,
    dueAmount: 0,
    dueMonths: 0,
    status: 'inactive',
    role: 'মাঠকর্মী',
  },
  {
    id: '9',
    code: 'SM-090',
    name: 'হাবিবুর রহমান',
    phone: '০১৯৯৯-২২৩৩৪৪',
    address: 'ঢাকা',
    nomineeName: 'সালমা',
    nomineeRelation: 'স্ত্রী',
    joinDate: 'ফেব্রুয়ারি ২০২২',
    monthlyAmount: 3000,
    totalDeposit: 130000,
    dueAmount: 0,
    dueMonths: 0,
    status: 'paid',
  },
];

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'সাইট এ: জমি প্রকল্প',
    type: 'জমি',
    location: '[স্থান]',
    manager: 'জাহিদ হাসান',
    status: 'ongoing',
    investedAmount: 1500000,
    returnedAmount: 420000,
    netProfit: 180000,
    roiPct: 12,
    startDate: 'মার্চ ২০২৫',
    expectedEnd: 'ডিসেম্বর ২০২৬',
    recoveryPct: 28,
    remainingAmount: 1080000,
  },
  {
    id: 'p2',
    name: 'দোকান ভাড়া প্রকল্প',
    type: 'ভাড়া',
    location: '[স্থান]',
    manager: 'আনোয়ার হোসেন',
    status: 'ongoing',
    investedAmount: 1020000,
    returnedAmount: 240000,
    netProfit: 62000,
    roiPct: 6,
    startDate: 'জানুয়ারি ২০২৫',
    expectedEnd: 'ডিসেম্বর ২০২৭',
    recoveryPct: 24,
    remainingAmount: 780000,
  },
  {
    id: 'p3',
    name: 'পোল্ট্রি খামার',
    type: 'কৃষি',
    location: '[স্থান]',
    manager: 'মাহমুদা খাতুন',
    status: 'ongoing',
    investedAmount: 800000,
    returnedAmount: 560000,
    netProfit: 110000,
    roiPct: 14,
    startDate: 'মে ২০২৫',
    expectedEnd: 'অক্টোবর ২০২৬',
    recoveryPct: 70,
    remainingAmount: 240000,
  },
  {
    id: 'p4',
    name: 'সাইট বি: নির্মাণ',
    type: 'নির্মাণ',
    location: '[স্থান]',
    manager: 'হাবিবুর রহমান',
    status: 'delayed',
    investedAmount: 600000,
    returnedAmount: 0,
    netProfit: -40000,
    roiPct: -7,
    startDate: 'ফেব্রুয়ারি ২০২৫',
    expectedEnd: 'আগস্ট ২০২৬',
    recoveryPct: 0,
    remainingAmount: 600000,
  },
];

export const mockCashAccounts: CashAccount[] = [
  { id: 'ca1', type: 'bank', name: 'ব্যাংক হিসাব', holder: 'ইসলামী ব্যাংক বাংলাদেশ (মিরপুর শাখা)', amount: 760000 },
  { id: 'ca2', type: 'cashier', name: 'কোষাধ্যক্ষের হাতে', holder: 'মাহমুদা খাতুন', amount: 120000 },
  { id: 'ca3', type: 'bkash', name: 'বিকাশ', holder: '০১৭১১-২২৩৩৪৪', amount: 38000 },
  { id: 'ca4', type: 'field', name: 'মাঠকর্মীর হাতে', holder: 'সুমন মিয়া', amount: 12000, note: 'আজ জমা দিতে হবে' },
];

export const mockPendingApprovals: PendingApproval[] = [
  {
    id: 'app1',
    type: 'expense',
    title: 'ব্যয়: সভার আপ্যায়ন',
    amount: 12500,
    detail: 'বার্ষিক সাধারণ সভার দুপুরের খাবার (১০০ জন) · উৎস: কোষাধ্যক্ষের হাতে',
    createdBy: 'মাহমুদা খাতুন (কোষাধ্যক্ষ)',
    dateStr: 'আজ ১০:২০',
    isNew: true,
    attachmentType: 'image',
    attachmentTitle: 'রসিদের ছবি দেখুন',
    status: 'pending',
  },
  {
    id: 'app2',
    type: 'investment',
    title: 'বিনিয়োগ: সাইট বি: নির্মাণ',
    amount: 200000,
    detail: '৩য় কিস্তি · ব্যাংক থেকে প্রদান · প্রজেক্ট বর্তমানে বিলম্বিত',
    createdBy: 'মাহমুদা খাতুন (কোষাধ্যক্ষ)',
    dateStr: 'গতকাল',
    attachmentType: 'document',
    attachmentTitle: 'চুক্তিপত্র',
    status: 'pending',
  },
  {
    id: 'app3',
    type: 'correction',
    title: 'সংশোধন: রসিদ #১০৭১',
    amount: 1500,
    amountDisplay: '৳২,০০০ → ৳১,৫০০',
    detail: '৳২,০০০ → ৳১,৫০০ · কারণ: ভুল পরিমাণ এন্ট্রি হয়েছিল। মূল এন্ট্রি মুছে যাবে না, বিপরীত এন্ট্রি যোগ হবে।',
    createdBy: 'জাহিদ হাসান (সম্পাদক)',
    dateStr: 'গতকাল',
    status: 'pending',
  },
];

export const mockApprovedApprovals: PendingApproval[] = [
  {
    id: 'app-hist-1',
    type: 'expense',
    title: 'ব্যয়: অফিস স্টেশনারি ও খাতা ক্রয়',
    amount: 2500,
    detail: 'রেজিস্টার খাতা ও রসিদ বই ছাপানো · উৎস: কোষাধ্যক্ষের হাতে',
    createdBy: 'মাহমুদা খাতুন (কোষাধ্যক্ষ)',
    dateStr: '৩০ সেপ্টেম্বর ২০২৬',
    approvedAt: '৩০ সেপ্টেম্বর ২০২৬, ১২:১০',
    approvedBy: 'আনোয়ার হোসেন (সভাপতি)',
    status: 'approved',
  },
  {
    id: 'app-hist-2',
    type: 'expense',
    title: 'ব্যয়: মাসিক সভা ও আপ্যায়ন',
    amount: 3200,
    detail: 'সেপ্টেম্বর মাসিক মিটিং নাস্তা খরচ · উৎস: কোষাধ্যক্ষের হাতে',
    createdBy: 'মাহমুদা খাতুন (কোষাধ্যক্ষ)',
    dateStr: '২৮ সেপ্টেম্বর ২০২৬',
    approvedAt: '২৮ সেপ্টেম্বর ২০২৬, ১৮:৩০',
    approvedBy: 'আনোয়ার হোসেন (সভাপতি)',
    status: 'approved',
  },
];

export const mockRejectedApprovals: PendingApproval[] = [
  {
    id: 'app-rej-1',
    type: 'expense',
    title: 'ব্যয়: জরুরি যাতায়াত বিল',
    amount: 1200,
    detail: 'অননুমোদিত দূরপাল্লার ট্যাক্সি ভাড়া বিল',
    createdBy: 'সুমন মিয়া (মাঠকর্মী)',
    dateStr: '২৬ সেপ্টেম্বর ২০২৬',
    rejectedAt: '২৬ সেপ্টেম্বর ২০২৬, ১৪:১৫',
    rejectedBy: 'আনোয়ার হোসেন (সভাপতি)',
    rejectionReason: 'ভাউচার রসিদ ও পূর্বানুমোদন সংযুক্ত নেই',
    status: 'rejected',
  },
];

export const mockTodayFollowups = [
  { id: 'f1', name: 'রফিকুল ইসলাম', note: '৩ মাস বকেয়া · ৳৬,০০০', phone: '০১৯১৫-৬৬৭৭৮৮' },
  { id: 'f2', name: 'নাসরিন আক্তার', note: 'আংশিক · ৳১,০০০ বাকি', phone: '০১৭২৪-৯৯৮৮৭৭' },
  { id: 'f3', name: 'করিম উদ্দিন', note: '২ মাস বকেয়া · ৳৪,১০০', phone: '০১৭১২-৩৪৫৬৭৮' },
];

export const mockAuditLogs = [
  {
    id: 'aud1',
    actor: 'মাহমুদা খাতুন',
    timeStr: 'আজ ১১:৪২',
    title: 'জমা এন্ট্রি: করিম উদ্দিন ৳৪,১০০',
    meta: 'রসিদ #১০৮৮ · Android · Samsung A34',
    category: 'আর্থিক'
  },
  {
    id: 'aud2',
    actor: 'মাহমুদা খাতুন',
    timeStr: 'আজ ১০:২০',
    title: 'ব্যয় এন্ট্রি: সভার আপ্যায়ন ৳১২,৫০০',
    meta: 'অনুমোদনের অপেক্ষায়',
    category: 'আর্থিক'
  },
  {
    id: 'aud3',
    actor: 'জাহিদ হাসান',
    timeStr: 'গতকাল ৬:১৫',
    title: 'সংশোধন অনুরোধ: রসিদ #১০৭১',
    meta: '৳২,০০০ → ৳১,৫০০ · কারণ: ভুল পরিমাণ',
    category: 'আর্থিক'
  },
  {
    id: 'aud4',
    actor: 'আনোয়ার হোসেন',
    timeStr: '২৮ সেপ্টে',
    title: 'সেটিংস: ব্যয় অনুমোদন সীমা',
    meta: '৳৫,০০০ → ৳১০,০০০',
    category: 'সেটিংস'
  },
  {
    id: 'aud5',
    actor: 'জাহিদ হাসান',
    timeStr: '২৫ সেপ্টে',
    title: 'সদস্যের তথ্য: নাসরিন আক্তার',
    meta: 'মোবাইল নম্বর পরিবর্তন',
    category: 'সদস্য'
  },
  {
    id: 'aud6',
    actor: 'আনোয়ার হোসেন',
    timeStr: '১ জানু',
    title: 'সেটিংস: রিজার্ভ ১০%, পরিচালক ১০%',
    meta: 'লক করা হয়েছে · অনুমোদন: জাহিদ হাসান',
    category: 'সেটিংস'
  },
];
