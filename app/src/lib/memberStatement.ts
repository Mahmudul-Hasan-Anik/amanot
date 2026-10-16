import type { Member } from '../mocks/mockData';
import type { Transaction } from '../store/somitiStore';
import type { Report } from '../utils/reportExport';
import { financeNote } from '../i18n/financeLabels';
/** Full, revision-consistent history only; allocated profit is shown separately. */
export function buildMemberStatement(member:Member,history:Transaction[],language:'bn'|'en'):Report{
 const l=(en:string,bn:string)=>language==='en'?en:bn;
 const entries=history.filter(t=>t.memberId===member.id&&['deposit','withdrawal','withdrawal_reversal'].includes(t.type)).sort((a,b)=>(a.dateISO||'').localeCompare(b.dateISO||'')||(a.createdAt||'').localeCompare(b.createdAt||'')||a.id.localeCompare(b.id));
 const delta=(t:Transaction)=>Math.round(t.amount*100)*(t.type==='withdrawal'?-1:1);
 const closing=Math.round((member.totalDeposit-(member.profitBalance||0))*100);
 let running=closing-entries.reduce((sum,t)=>sum+delta(t),0);
 if(running<0)throw new Error(l('Savings history does not reconcile with the balance. Refresh or contact your administrator.','সঞ্চয়ের ইতিহাস ও ব্যালেন্স মিলছে না। আপডেট করুন অথবা অ্যাডমিনকে জানান।'));
 const rows:Report['rows']=[[l('Opening own savings','নিজের জমার প্রারম্ভিক ব্যালেন্স'),'','',0,0,0,running/100]];
 const labels:Record<string,string>={deposit:'Deposit',withdrawal:'Savings withdrawal',withdrawal_reversal:'Withdrawal reversal'};
 for(const t of entries){running+=delta(t);rows.push([t.dateISO||t.date,t.receiptNo,financeNote(t.note||labels[t.type]||t.type,language==='bn'),t.type==='deposit'?t.amount:0,t.type==='withdrawal'?t.amount:0,t.type==='withdrawal_reversal'?t.amount:0,running/100]);}
 rows.push([l('Closing own savings','নিজের জমার সমাপনী ব্যালেন্স'),'','',0,0,0,closing/100]);
 rows.push([l('Allocated profit (separate)','বণ্টিত লাভ (আলাদা)'),'','',0,0,0,member.profitBalance||0]);
 rows.push([l('Total remaining balance','মোট অবশিষ্ট ব্যালেন্স'),'','',0,0,0,member.totalDeposit]);
 return {language,title:`${l('Member statement','সদস্যের স্টেটমেন্ট')} · ${member.name} (${member.code})`,columns:[l('Date / summary','তারিখ / সারাংশ'),l('Receipt','রসিদ'),l('Description','বিবরণ'),l('Deposit','জমা'),l('Withdrawal','উত্তোলন'),l('Reversal','সংশোধন'),l('Own savings balance / summary','নিজের জমার ব্যালেন্স / সারাংশ')],rows};
}
