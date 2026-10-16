import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { escapeHtml } from './pdfExport';
import {financeNote} from '../i18n/financeLabels';
import { colors } from '../theme/colors';
import type { SomitiState } from '../store/somitiStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchLedgerSummary, fetchTransactionHistory, fetchDistributionShares } from '../lib/api';
import {investmentSchedule} from '../lib/investment';
import { monthRange, signedTransactionAmount } from '../lib/ledger';

export type Report = { title:string; columns:string[]; rows:Array<Array<string|number>>; language?:'bn'|'en' };
export async function buildReportForExport(state:SomitiState,id:string,month:string,language:'bn'|'en'='bn'):Promise<Report>{
 const remote=isSupabaseConfigured(),range=monthRange(month),year=Number(month.slice(0,4));
 let base:any=state;
 if(remote&&['3','6','7','9','all'].includes(id))base={...base,transactions:await fetchTransactionHistory(range)};
 if(remote&&['8','all'].includes(id))base={...base,distributionShares:await fetchDistributionShares(year)};
 if(remote&&id==='1'){
  const summary=await fetchLedgerSummary(range.from,range.to);const report=buildReport({...state,transactions:[]},id,month,language);
  report.rows=state.members.map(m=>[m.code,m.name,Number(summary.collections[m.id]||0)]);return report;
 }
 if(id==='all'){
  const reports=['1','2','3','4','5','6','7','8','9'].map(key=>buildReport(base,key,month,language));
  const width=Math.max(...reports.map(r=>r.columns.length));
  return {language,title:language==='en'?'All reports':'সকল রিপোর্ট',columns:[language==='en'?'Report':'রিপোর্ট',...Array.from({length:width},(_,i)=>String(i+1))],rows:reports.flatMap(r=>[[r.title,...r.columns,...Array(width-r.columns.length).fill('')],...r.rows.map(row=>[r.title,...row,...Array(width-row.length).fill('')])])};
 }
 return buildReport(base,id,month,language);
}
export function buildReport(state:SomitiState,id:string,month:string,language:'bn'|'en'='bn'):Report{
 const l=(en:string,bn:string)=>language==='en'?en:bn,tx=state.transactions.filter(t=>t.dateISO?.startsWith(month)),members=state.members;
 const make=(en:string,bn:string,columns:[string,string][],rows:Report['rows']):Report=>({language,title:l(en,bn),columns:columns.map(c=>l(...c)),rows});
 const signed=signedTransactionAmount;
 if(id==='9'||id==='6')return make(id==='6'?'Cash movements by payment method':'Monthly ledger',id==='6'?'মাধ্যমভিত্তিক টাকা আসা-যাওয়া':'মাসিক লেজার',[['Date','তারিখ'],['Receipt','রসিদ'],['Type','ধরন'],['Description','বিবরণ'],['Amount','পরিমাণ'],['Method','মাধ্যম']],tx.map(t=>[t.dateISO||t.date,t.receiptNo,t.type,financeNote(t.note||t.memberName,language==='bn'),signed(t),t.paymentMethod]));
 if(id==='2')return make('Overdue investment installments (current)','বিনিয়োগের মেয়াদোত্তীর্ণ কিস্তি (বর্তমান)',[['Contract','চুক্তি'],['Recipient','গ্রহীতা'],['Due date','কিস্তির তারিখ'],['Outstanding installment','কিস্তির বাকি'],['Phone','ফোন']],state.projects.flatMap(p=>p.contract?investmentSchedule(p.contract,p.returnedAmount).filter(r=>r.overdue).map(r=>[p.contract!.number,p.name,r.dueDate,r.remaining,p.contract!.phone]):[]));
 if(id==='5')return make('Investment report (current)','বিনিয়োগ রিপোর্ট (বর্তমান)',[['Contract','চুক্তি'],['Recipient','গ্রহীতা'],['Principal','মূলধন'],['Agreed profit','চুক্তির প্রফিট'],['Collected','মোট আদায়'],['Principal outstanding','মূলধন বাকি'],['Realized net profit','আদায়কৃত নিট প্রফিট'],['Total outstanding','মোট বাকি'],['Status','অবস্থা']],state.projects.map(p=>[p.contract?.number||p.id,p.name,p.investedAmount,p.contract?.profitAmount??'',p.returnedAmount,p.remainingAmount,p.netProfit,p.contract?Math.max(0,p.contract.principal+p.contract.profitAmount-p.returnedAmount):p.remainingAmount,p.status]));
 if(id==='8'){
  const year=Number(month.slice(0,4)),shares=(state as any).distributionShares;
  return make('Approved distribution snapshot · '+year,'অনুমোদিত বণ্টনের snapshot · '+year,[['ID','আইডি'],['Member','সদস্য'],['Year','বছর'],['Savings at approval','অনুমোদনের সময় সঞ্চয়'],['Allocated profit','বণ্টিত লাভ']],shares?shares.map((r:any)=>{const m=members.find(m=>m.id===r.member_id);return [m?.code||r.member_id,m?.name||'—',r.year,Number(r.base_deposit),Number(r.share)]}):members.filter(m=>m.lastProfitYear===year).map(m=>[m.code,m.name,year,'',m.profit2025||0]));
 }
 if(id==='4')return make('Member savings balances (current)','সদস্যদের সঞ্চয়ের ব্যালেন্স (বর্তমান)',[['ID','আইডি'],['Member','সদস্য'],['Category','ক্যাটাগরি'],['Remaining balance','অবশিষ্ট ব্যালেন্স'],['Net withdrawals','নিট উত্তোলন'],['Profit balance','লাভের ব্যালেন্স']],members.map(m=>[m.code,m.name,m.memberCategory||'',m.totalDeposit,m.totalWithdrawn||0,m.profitBalance||0]));
 if(id==='7')return make('Deposit receipts','জমার রসিদসমূহ',[['Receipt','রসিদ'],['Date','তারিখ'],['Member','সদস্য'],['Deposit','জমা'],['Method','মাধ্যম']],tx.filter(t=>t.type==='deposit').map(t=>[t.receiptNo,t.dateISO||t.date,t.memberName,t.amount,t.paymentMethod]));
 if(id==='3')return make('Savings, investment recoveries and expenses','সঞ্চয়, বিনিয়োগ ফেরত ও ব্যয়',[['Date','তারিখ'],['Receipt','রসিদ'],['Type','ধরন'],['Description','বিবরণ'],['Cash movement','টাকার প্রবাহ'],['Principal recovered','মূলধন ফেরত'],['Profit recovered','প্রফিট আদায়']],tx.filter(t=>t.type!=='transfer'||t.investmentReversal||t.investmentDisbursement).map(t=>[t.dateISO||t.date,t.receiptNo,t.type,t.note||t.memberName,signed(t),t.principalPart===undefined?'':(t.investmentReversal?-1:1)*t.principalPart,t.profitPart===undefined?'':(t.investmentReversal?-1:1)*t.profitPart]));
 const collected=new Map<string,number>();for(const t of tx)if(t.type==='deposit')collected.set(t.memberId,(collected.get(t.memberId)||0)+t.amount);
 return make('Monthly savings collection','মাসিক সঞ্চয় আদায়',[['ID','আইডি'],['Member','সদস্য'],['Collected','জমা']],members.map(m=>[m.code,m.name,collected.get(m.id)||0]));
}

export function reportHtml(report: Report, somiti: string, period: string): string {
  return `<!doctype html><html lang="${report.language||'bn'}"><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>
  body{font-family:'Nirmala UI','Hind Siliguri',sans-serif;color:${colors.text};padding:24px;font-size:12px}h1{font-size:24px;margin-bottom:6px}h2{font-size:18px;color:${colors.primary}}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid ${colors.border};padding:8px;text-align:left}th{background:${colors.primarySoft}}thead{display:table-header-group}tr{break-inside:avoid}footer{margin-top:20px;color:${colors.textSecondary}}@page{size:A4;margin:15mm}</style></head><body>
  <h1>${escapeHtml(somiti)}</h1><h2>${escapeHtml(report.title)}</h2><p>${escapeHtml(period)}</p>
  <table><thead><tr>${report.columns.map(c=>`<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${report.rows.length?report.rows.map(row=>`<tr>${row.map(v=>`<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${report.columns.length}">${report.language==='en'?'No records for this selection':'এই সময়ের তথ্য নেই'}</td></tr>`}</tbody></table><footer>${report.language==='en'?'Amanot · Prepared:':'আমানত · প্রস্তুত:'} ${escapeHtml(new Date().toLocaleDateString(report.language==='en'?'en-GB':'bn-BD'))}</footer></body></html>`;
}

export function reportCsv(report: Report): string {
  const cell=(value:unknown)=>{let s=String(value??'');if (/^[=+\-@\t\r]/.test(s)) s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  return '\ufeff'+[report.columns,...report.rows].map(row=>row.map(cell).join(',')).join('\r\n');
}

export async function exportReport(report: Report, somiti: string, period: string, format:'PDF'|'CSV'): Promise<void> {
  const filename=`amanot-${period.replace(/[^0-9A-Za-z-]/g,'')}-${Date.now()}`;
  if (Platform.OS==='web') {
    if (format==='PDF') {
      const win=window.open('','_blank');
      if (!win) throw new Error('ব্রাউজারে popup অনুমতি দিন');
      win.onload=()=>{ win.document.fonts.ready.then(()=>win.print()); };
      win.document.write(reportHtml(report,somiti,period));win.document.close();
    } else {
      const url=URL.createObjectURL(new Blob([reportCsv(report)],{type:'text/csv;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download=filename+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    return;
  }
  let uri:string;
  if (format==='PDF') uri=(await Print.printToFileAsync({html:reportHtml(report,somiti,period)})).uri;
  else { uri=FileSystem.cacheDirectory+filename+'.csv';await FileSystem.writeAsStringAsync(uri,reportCsv(report)); }
  if (!await Sharing.isAvailableAsync()) throw new Error('এই ডিভাইসে ফাইল শেয়ার করা যাচ্ছে না');
  await Sharing.shareAsync(uri,{mimeType:format==='PDF'?'application/pdf':'text/csv'});
}
