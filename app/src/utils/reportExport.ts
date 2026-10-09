import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { escapeHtml } from './pdfExport';
import { colors } from '../theme/colors';
import type { SomitiState } from '../store/somitiStore';

export type Report = { title: string; columns: string[]; rows: Array<Array<string | number>> };
export function buildReport(state: SomitiState, id: string, month: string): Report {
  const tx = state.transactions.filter(t => t.dateISO?.startsWith(month));
  const members = state.members;
  if (id==='2') return { title:'বকেয়া তালিকা',columns:['আইডি','সদস্য','মাস','বকেয়া','ফোন'],rows:members.filter(m=>m.dueAmount>0).map(m=>[m.code,m.name,m.dueMonths,m.dueAmount,m.phone]) };
  if (id==='5') return { title:'প্রজেক্ট রিপোর্ট',columns:['প্রজেক্ট','বিনিয়োগ','ফেরত','লাভ/ক্ষতি','অবস্থা'],rows:state.projects.map(p=>[p.name,p.investedAmount,p.returnedAmount,p.netProfit,p.status]) };
  if (id==='6') return { title:'নগদ ও ব্যাংক বই',columns:['হিসাব','বর্তমান ব্যালেন্স','দায়িত্বপ্রাপ্ত'],rows:state.cashAccounts.map(a=>[a.name,a.amount,a.holder||'']) };
  if (id==='8') return { title:'লাভ বণ্টন রিপোর্ট',columns:['সদস্য','বছর','শেষ বণ্টন','মোট লাভের ব্যালেন্স'],rows:members.map(m=>[m.name,m.lastProfitYear||'',m.profit2025||0,m.profitBalance||0]) };
  if (id==='4') return { title:'সদস্য স্টেটমেন্ট',columns:['আইডি','সদস্য','মোট সঞ্চয়','মাসিক কিস্তি','বকেয়া'],rows:members.map(m=>[m.code,m.name,m.totalDeposit,m.monthlyAmount,m.dueAmount]) };
  if (id==='7') return { title:'আদায়কারীর রিপোর্ট',columns:['রসিদ','তারিখ','সদস্য','আদায়','মাধ্যম'],rows:tx.filter(t=>t.type==='deposit').map(t=>[t.receiptNo,t.date,t.memberName,t.amount,t.paymentMethod]) };
  if (id==='3') return { title:'আয়-ব্যয় রিপোর্ট',columns:['তারিখ','রসিদ','ধরন','বিবরণ','পরিমাণ'],rows:tx.filter(t=>t.type!=='transfer').map(t=>[t.date,t.receiptNo,t.type,t.note||t.memberName,t.type==='expense'?-t.amount:t.amount]) };
  return { title:'মাসিক আদায় রিপোর্ট',columns:['আইডি','সদস্য','এই মাসে আদায়','বকেয়া'],rows:members.map(m=>[m.code,m.name,tx.filter(t=>t.memberId===m.id&&t.type==='deposit').reduce((sum,t)=>sum+t.amount,0),m.dueAmount]) };
}

export function reportHtml(report: Report, somiti: string, period: string): string {
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>
  body{font-family:'Nirmala UI','Hind Siliguri',sans-serif;color:${colors.text};padding:24px;font-size:12px}h1{font-size:24px;margin-bottom:6px}h2{font-size:18px;color:${colors.primary}}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid ${colors.border};padding:8px;text-align:left}th{background:${colors.primarySoft}}thead{display:table-header-group}tr{break-inside:avoid}footer{margin-top:20px;color:${colors.textSecondary}}@page{size:A4;margin:15mm}</style></head><body>
  <h1>${escapeHtml(somiti)}</h1><h2>${escapeHtml(report.title)}</h2><p>${escapeHtml(period)}</p>
  <table><thead><tr>${report.columns.map(c=>`<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${report.rows.length?report.rows.map(row=>`<tr>${row.map(v=>`<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${report.columns.length}">এই সময়ের তথ্য নেই</td></tr>`}</tbody></table><footer>আমানত · প্রস্তুত: ${escapeHtml(new Date().toLocaleDateString('bn-BD'))}</footer></body></html>`;
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
      win.document.write(reportHtml(report,somiti,period));win.document.close();win.onload=()=>win.print();setTimeout(()=>win.print(),500);
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
