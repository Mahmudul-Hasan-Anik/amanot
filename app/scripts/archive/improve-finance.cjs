const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
function edit(p,fn){p=path.join(root,p);fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')));}
edit('app/(admin)/distribution.tsx',s=>s
  .replace('const year = 2026;', 'const year = new Date().getFullYear();\n  const [saving, setSaving] = useState(false);\n  const [previewError, setPreviewError] = useState<string | null>(null);')
  .replace("if (REMOTE) api.profitPreview(year).then(setPreview).catch(() => {});", "if (REMOTE) api.profitPreview(year).then(v => { setPreview(v); setPreviewError(null); }).catch(e => setPreviewError(e.message));")
  .replace(/  \/\/ Page 20 Baseline[\s\S]*?  const handleApprove =/, `  const totalProjectProfit = preview ? Number(preview.projectProfit) : projects.reduce((sum,p) => sum + p.netProfit,0);
  const otherIncome = 0;
  const operatingExpense = preview ? Number(preview.expenses) : Number(somitiInfo.monthlyExpense || 0);
  const netProfit = preview ? Number(preview.netProfit) : totalProjectProfit - operatingExpense;
  const reservePercent = Number(preview?.reservePct ?? 10);
  const directorPercent = Number(preview?.managementPct ?? 10);
  const reserveFund = Math.round(netProfit * reservePercent) / 100;
  const directorFund = Math.round(netProfit * directorPercent) / 100;
  const distributableProfit = Number(preview?.distributed ?? Math.max(0, netProfit-reserveFund-directorFund));
  const eligibleMembers = members.filter(m => m.status !== 'inactive' && m.totalDeposit > 0);
  const totalMembersDeposit = Number(preview?.totalDeposit ?? eligibleMembers.reduce((sum,m)=>sum+m.totalDeposit,0));
  const totalMemberCount = preview?.shares?.length ?? eligibleMembers.length;
  const sampleMembers = (preview?.shares ?? eligibleMembers.map(m=>({memberId:m.id,name:m.name,baseDeposit:m.totalDeposit}))).map((m:any,index:number)=>({
    id:m.memberId,name:m.name,initial:m.name.slice(0,1),totalDeposit:Number(m.baseDeposit),
    profitShare: Number(m.share ?? (totalMembersDeposit>0 ? Math.round(Number(m.baseDeposit)/totalMembersDeposit*distributableProfit*100)/100 : 0)),
    avatarBg:colors.avatarPastels[index%colors.avatarPastels.length].bg,avatarColor:colors.avatarPastels[index%colors.avatarPastels.length].text,
  }));

  const handleApprove =`)
  .replace('    // Instant / auto approve per user directive', "    if (saving || isApproved || distributableProfit <= 0 || totalMembersDeposit <= 0 || (REMOTE && (!preview || previewError))) return;")
  .replace('    const executeApproval = async () => {', '    const executeApproval = async () => {\n      setSaving(true);')
  .replace("          return;\n        }\n      }", "          setSaving(false);\n          return;\n        }\n      }\n      setSaving(false);")
  .replace('onPress={handleApprove}', 'onPress={handleApprove} disabled={saving || isApproved || distributableProfit <= 0 || (REMOTE && !preview)}')
  .replace('        {/* 4-Step Stepper Card */}', `        {previewError && <TouchableOpacity onPress={loadPreview}><Text style={{color: colors.danger, marginBottom:12}}>{previewError} · {l('Retry','আবার চেষ্টা')}</Text></TouchableOpacity>}
        {REMOTE && !preview && !previewError && <Text>{l('Loading annual accounts…','বার্ষিক হিসাব লোড হচ্ছে…')}</Text>}
        {/* 4-Step Stepper Card */}`)
  .replace("'Reserve and director percentages were set by the management committee and are locked from January 2026.'", "'Shares are calculated from the member savings balances at the time of approval.'")
);
edit('app/(admin)/receipt/[id].tsx',s=>s
  .replace('getTransactionById(id as string) || transactions[0]', 'getTransactionById(id as string)')
  .replace("const amount = txn?.amount || 4100;", 'const amount = txn?.amount ?? 0;')
  .replace('const lateFee = txn?.lateFee !== undefined ? txn.lateFee : 100;', 'const lateFee = txn?.lateFee ?? 0;')
  .replace('const totalDepositNow = (member?.totalDeposit || 108000) + baseDeposit;', 'const totalDepositNow = member?.totalDeposit ?? 0;')
  .replace("const trxIdStr = txn?.trxId || 'BK7X29QM4L';", "const trxIdStr = txn?.trxId || '—';")
  .replace('  return (\n    <SafeAreaView', `  if (!txn) return <SafeAreaView style={styles.container}><View style={{padding:24}}><Text>{l('Receipt not found. Refresh accounts and try again.','রসিদ পাওয়া যায়নি। হিসাব আপডেট করে আবার চেষ্টা করুন।')}</Text><TouchableOpacity onPress={()=>router.replace('/(admin)/(tabs)/collection')}><Text style={{color:colors.primary,marginTop:16}}>{l('Back to collections','আদায়ের তালিকায় ফিরুন')}</Text></TouchableOpacity></View></SafeAreaView>;
  return (
    <SafeAreaView`)
  .replace("'Receipt sent via WhatsApp ✓', 'হোয়াটসঅ্যাপে রসিদ পাঠানো হয়েছে ✓'", "'Receipt ready to share', 'রসিদ শেয়ার করার জন্য প্রস্তুত'")
);
edit('src/store/somitiStore.ts',s=>s
  .replace('}) => Member;', '}) => Promise<Member>;')
  .replace("addMember: (data) => {", `addMember: async (data) => {
        if (REMOTE) {
          const member = api.mapMember(await api.addMember({ ...data, id: api.uuid() }));
          await get().syncFromServer();
          return member;
        }`)
  .replace('transferCash: (fromId: string, toId: string, amount: number, note?: string) => boolean;', 'transferCash: (fromId: string, toId: string, amount: number, note?: string) => Promise<boolean>;')
  .replace('transferCash: (fromId, toId, amount, note) => {', `transferCash: async (fromId, toId, amount, note) => {
        if (REMOTE) { await api.transferCash(fromId,toId,amount,note); await get().syncFromServer(); return true; }`)
);
edit('app/(admin)/member/new.tsx',s=>s
  .replace('  const handleSubmit = () => {','  const [saving,setSaving] = useState(false);\n  const handleSubmit = async () => {\n    if (saving) return;')
  .replace('    const newMember = addMember({','    setSaving(true);\n    try {\n    const newMember = await addMember({')
  .replace('    setShowSuccessModal(true);','    setShowSuccessModal(true);\n    } catch(e:any) { Alert.alert(l(\'Save failed\',\'সংরক্ষণ ব্যর্থ\'),e.message); } finally {setSaving(false);}')
  .replace('onPress={handleSubmit}','onPress={handleSubmit} disabled={saving}')
);
edit('app/(admin)/finance.tsx',s=>s
  .replace('  const handleTransferSubmit = () => {','  const handleTransferSubmit = async () => {\n    try {')
  .replace('    transferCash(fromAccount, toAccount, amt, note);','    if (!await transferCash(fromAccount, toAccount, amt, note)) return;')
  .replace('  };\n\n  const getAccountIcon',"    } catch(e:any) { Alert.alert(l('Transfer failed','স্থানান্তর ব্যর্থ'),e.message); }\n  };\n\n  const getAccountIcon")
  .replace(/  const expenseCategories = useMemo\(\(\) => \{[\s\S]*?  const netAmount = totalIncome - totalExpense;/, `  const periodTransactions = transactions.filter(t=>inMonth(t.dateISO,selectedMonthKey));
  const periodExpenses = expenses.filter(e=>e.status==='approved' && inMonth((e as any).dateISO,selectedMonthKey));
  const totalExpense = periodTransactions.filter(t=>t.type==='expense').reduce((sum,t)=>sum+t.amount,0);
  const totalIncome = periodTransactions.filter(t=>t.type==='deposit'||t.type==='profit').reduce((sum,t)=>sum+t.amount,0);
  const groups = periodExpenses.reduce<Record<string,number>>((acc,e)=>{acc[e.category]=(acc[e.category]||0)+e.amount;return acc;},{});
  const expenseCategories = Object.entries(groups).map(([name,amount])=>({id:name,nameBn:name,nameEn:name,amount,pct:totalExpense>0?Math.round(amount/totalExpense*100):0}));
  const netAmount = totalIncome-totalExpense;`)
  .replace(/  const recentTxnsList = useMemo\(\(\) => \[[\s\S]*?\], \[\]\);/, `  const recentTxnsList = periodTransactions.slice(0,10).map(t=>({id:t.id,titleBn:t.note||t.memberName,titleEn:t.note||t.memberName,metaBn:t.date+' · '+t.paymentMethod,metaEn:t.date+' · '+t.paymentMethod,amount:t.type==='expense'?-t.amount:t.amount,isIncome:t.type!=='expense'}));`)
);
edit('app/(member)/index.tsx',s=>s.replace('const year = 2026;','const year = new Date().getFullYear();').replace('(member as any).estimatedProfit2026 || (member as any).profit2025 || 7714','(member as any).profitBalance ?? (member as any).profit2025 ?? 0')
  .replace("(t.months || []).includes(BENGALI_MONTHS_FULL[mNum - 1])", "(t.months || []).some((month:string) => month === `${year}-${String(mNum).padStart(2,'0')}` || month === BENGALI_MONTHS_FULL[mNum - 1])"));
