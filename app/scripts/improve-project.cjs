const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function edit(file, fn) { const p = path.join(root, file); const old = fs.readFileSync(p, 'utf8'); fs.writeFileSync(p, fn(old)); }
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
// Demo data is initialized in the store. An empty list must stay empty, in both modes.
for (const file of walk(path.join(root,'app')).filter(f => f.endsWith('.tsx'))) {
  let s = fs.readFileSync(file,'utf8');
  s = s.replace(/members\.length > 0 \? members : mockMembers/g, 'members')
    .replace(/projects\.length > 0 \? projects : mockProjects/g, 'projects')
    .replace(/cashAccounts\.length > 0 \? cashAccounts : mockCashAccounts/g, 'cashAccounts')
    .replace('storeApprovals && storeApprovals.length > 0 ? storeApprovals : mockPendingApprovals', 'storeApprovals')
    .replace('approvedApprovals && approvedApprovals.length > 0 ? approvedApprovals : mockApprovedApprovals', 'approvedApprovals')
    .replace('rejectedApprovals && rejectedApprovals.length > 0 ? rejectedApprovals : mockRejectedApprovals', 'rejectedApprovals');
  fs.writeFileSync(file,s);
}
edit('src/features/auth/authStore.ts', s => s.replace(/toEnglishDigits\((\w+)\.replace\(\/\\D\/g, ''\)\)/g, "toEnglishDigits($1).replace(/\\D/g, '')")
  .replace("name: 'amanot-auth-storage',", "name: REMOTE ? 'amanot-auth-live' : 'amanot-auth-storage',\n      partialize: ({ isPinVerified, pin, customPins, lastGeneratedOtp, ...state }) => REMOTE ? state : { ...state, isPinVerified, pin, customPins, lastGeneratedOtp },"));
edit('src/store/somitiStore.ts', s => s
  .replace('}) => Transaction;', '}) => Promise<Transaction>;')
  .replace('}) => void;\n\n  // Approvals Actions', '}) => Promise<ExpenseItem>;\n\n  // Approvals Actions')
  .replace('approveRequest: (id: string, actor?: string) => void;', 'approveRequest: (id: string, actor?: string) => Promise<void>;')
  .replace('rejectRequest: (id: string, reason?: string, actor?: string) => void;', 'rejectRequest: (id: string, reason?: string, actor?: string) => Promise<void>;')
  .replace('autoApproveAllPending: () => { approvedCount: number; totalAmount: number };', 'autoApproveAllPending: () => Promise<{ approvedCount: number; totalAmount: number }>;')
  .replace('recordDeposit: (data) => {', `recordDeposit: async (data) => {
        if (!Number.isFinite(data.totalAmount) || data.totalAmount <= 0) throw new Error('জমার পরিমাণ সঠিক নয়');
        if (REMOTE) {
          const saved = api.mapTransaction(await api.recordDeposit({ ...data, id: api.uuid() }));
          await get().syncFromServer();
          if (data.sendSMS) {
            const member = get().members.find(m => m.id === data.memberId);
            if (member) await smsGateway.sendSms({ phone: member.phone, memberId: member.id, recipientName: member.name,
              templateType: 'deposit_receipt', message: smsGateway.templates.depositReceipt({ name: member.name,
                amount: saved.amount, receiptNo: saved.receiptNo, dueAmount: member.dueAmount, somitiName: get().somitiInfo.name }) });
          }
          return saved;
        }`)
  .replace(/        remote\('জমা', \(\) =>[\s\S]*?\n        \);\n/, '')
  .replace('addExpense: (data) => {\n        remote(\'খরচ\', () => api.addExpense(data));', `addExpense: async (data) => {
        if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error('খরচের পরিমাণ সঠিক নয়');
        if (REMOTE) {
          const saved = api.mapExpense(await api.addExpense(data));
          await get().syncFromServer();
          return saved;
        }`)
  .replaceAll('(somiti as any).autoApproveLimit ?? 5000', '(somiti as any).autoApproveThreshold ?? 5000')
  .replace('            approvals: [newApproval, ...get().approvals],\n          });\n          return;', '            approvals: [newApproval, ...get().approvals],\n          });\n          return newExpense;')
  .replace('      },\n\n      // Approvals', '        return newExpense;\n      },\n\n      // Approvals')
  .replace('approveRequest: (id, actor) => {', 'approveRequest: async (id, actor) => {')
  .replace(/        if \(item && REMOTE\) \{[\s\S]*?\n          return;\n        \}/, `        if (REMOTE) {
          await api.approveRequest(id);
          await get().syncFromServer();
          return;
        }`)
  .replaceAll('            get().addExpense({', '            await get().addExpense({')
  .replace('autoApproveAllPending: () => {', `autoApproveAllPending: async () => {
        if (REMOTE) {
          const result: any = await api.autoApproveEligible();
          await get().syncFromServer();
          return { approvedCount: Number(result.approved_count), totalAmount: Number(result.total_amount) };
        }`)
  .replace('eligible.forEach((item) => {', 'for (const item of eligible) {')
  .replace('        const remainingPending', '        const remainingPending')
  .replace("        });\n\n        const remainingPending", "        }\n\n        const remainingPending")
  .replace(/        if \(REMOTE\) \{\n          remote\('স্বয়ংক্রিয় অনুমোদন',[\s\S]*?\n        \}\n/, '')
  .replace('rejectRequest: (id, reason, actor) => {', `rejectRequest: async (id, reason, actor) => {
        if (REMOTE) {
          await api.rejectRequest(id, reason);
          await get().syncFromServer();
          return;
        }`)
  .replace("date: '২ অক্টোবর ২০২৬',", 'date: api.bnDate(new Date().toISOString()),\n          dateISO: new Date().toISOString().slice(0, 10),')
  .replace("date: '২ অক্টোবর',", 'date: api.bnDate(new Date().toISOString(), false),')
  .replace('m.totalDeposit + totalAmount', 'm.totalDeposit + Math.max(0, totalAmount - lateFee)')
  .replace("  lateFee?: number;\n", "  lateFee?: number;\n  dateISO?: string;\n  createdAt?: string;\n", 1)
);
edit('src/lib/api.ts', s => s.replace('function mapExpense(', 'export function mapExpense('));
// The server must finish saving before the screen announces success.
edit('app/(admin)/deposit/new.tsx', s => s
  .replace("const [trxId, setTrxId] = useState('BK7X29QM4L');", "const [trxId, setTrxId] = useState('');\n  const [saving, setSaving] = useState(false);")
  .replace("Number((somitiInfo as any).lateFee ?? 100) || 100", "Number((somitiInfo as any).lateFee ?? 0)")
  .replace("const currentMember: Member = useMemo", "const currentMember: Member | undefined = useMemo")
  .replace("parseInt(toEnglishDigits(customAmount).replace(/\\D/g, ''), 10) || calculatedTotal || 4100", "Number(toEnglishDigits(customAmount).replace(/[^0-9.]/g, ''))")
  .replace('(currentMember?.totalDeposit || 108000)', '(currentMember?.totalDeposit || 0)')
  .replace('const handleConfirmDeposit = () => {', 'const handleConfirmDeposit = async () => {\n    if (saving || !currentMember) return;')
  .replace('    const newTxn = recordDeposit({', '    setSaving(true);\n    try {\n    const newTxn = await recordDeposit({')
  .replace('    router.replace(`/(admin)/receipt/${newTxn.id}`);', "    router.replace(`/(admin)/receipt/${newTxn.id}`);\n    } catch (e: any) { Alert.alert(l('Save failed', 'সংরক্ষণ ব্যর্থ'), e.message); } finally { setSaving(false); }")
  .replace('  return (\n    <SafeAreaView', `  if (!currentMember) return <SafeAreaView style={styles.container}><View style={{padding:24}}><Text>{l('Add a member before recording a deposit.', 'জমা নেওয়ার আগে একজন সদস্য যোগ করুন।')}</Text><TouchableOpacity onPress={() => router.push('/(admin)/member/new')}><Text style={{color: colors.primary, marginTop:16}}>{l('Add member', 'সদস্য যোগ করুন')}</Text></TouchableOpacity></View></SafeAreaView>;
  return (
    <SafeAreaView`)
  .replace('onPress={handleConfirmDeposit}', 'onPress={handleConfirmDeposit} disabled={saving}')
);
edit('app/(admin)/approvals.tsx', s => s
  .replace('const handleApprove = (item: PendingApproval) => {', 'const handleApprove = async (item: PendingApproval) => {\n    try {')
  .replace('    approveRequest(item.id, approverName);', '    await approveRequest(item.id, approverName);')
  .replace('  const handleConfirmReject = () => {', "  const handleConfirmReject = async () => {\n    try {")
  .replace('    rejectRequest(rejectingItem.id, finalReason, approverName);', '    await rejectRequest(rejectingItem.id, finalReason, approverName);')
  .replace('  const handleAutoApproveAll = () => {\n    const result = autoApproveAllPending();', '  const handleAutoApproveAll = async () => {\n    try {\n    const result = await autoApproveAllPending();')
  .replace('  };\n\n  const handleConfirmReject', "    } catch (e: any) { Alert.alert(l('Failed', 'ব্যর্থ'), e.message); }\n  };\n\n  const handleConfirmReject")
  .replace('  };\n\n  const handleAutoApproveAll', "    } catch (e: any) { Alert.alert(l('Failed', 'ব্যর্থ'), e.message); }\n  };\n\n  const handleAutoApproveAll")
  .replace('  };\n\n  const currentList', "    } catch (e: any) { Alert.alert(l('Failed', 'ব্যর্থ'), e.message); }\n  };\n\n  const currentList")
);
edit('app/(admin)/expense/new.tsx', s => s
  .replace("import { safeBack }", "import { todayDMY } from '../../../src/lib/months';\nimport { safeBack }")
  .replace("useState('12500')", "useState('')")
  .replace("useState('30/09/2026')", 'useState(todayDMY())')
  .replace("const numericAmount = Number(toEnglishDigits(rawAmount.replace(/[^\\d]/g, ''))) || 0;", "const numericAmount = Number(toEnglishDigits(rawAmount).replace(/[^0-9.]/g, '')) || 0;")
  .replace('  const handleSubmit = () => {', '  const [saving, setSaving] = useState(false);\n  const handleSubmit = async () => {\n    if (saving) return;')
  .replace('    addExpense({', '    setSaving(true);\n    try {\n    const saved = await addExpense({')
  .replace("    if (status === 'pending') {", "    if (saved.status === 'pending') {")
  .replace("  };\n\n  return (", "    } catch (e: any) { Alert.alert(l('Save failed', 'সংরক্ষণ ব্যর্থ'), e.message); } finally { setSaving(false); }\n  };\n\n  return (")
  .replace('onPress={handleSubmit}', 'onPress={handleSubmit} disabled={saving}')
);
