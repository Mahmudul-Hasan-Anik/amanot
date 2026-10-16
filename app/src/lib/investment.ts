import { toEnglishDigits } from './bengali';

export type EmergencyContact = { name: string; relation: string; phone: string };
export type InvestmentContract = {
  id: string; memberId?: string; number: string; recipientName: string;
  phone: string; whatsapp: string; address: string; nid: string;
  fatherName: string; motherName: string; contacts: EmergencyContact[];
  principal: number; profitPct: number; profitAmount: number; termMonths: number;
  disbursedDate: string; firstDueDate: string; purpose: string;
};
export type NewInvestment = Omit<InvestmentContract, 'number' | 'profitAmount'> & {
  paymentMethod: 'cash' | 'bank' | 'bkash' | 'nagad';
};
export type InvestmentProposal = {id:string; status:'submitted'|'approved'|'rejected'|'disbursed'; payload:NewInvestment; created_at:string; approved_at?:string; disbursed_at?:string; decision_note:string};
export type InvestmentPayment = {
  id: string; projectId: string; amount: number; paymentMethod: NewInvestment['paymentMethod'];
  date: string; note: string;
};
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function parseInvestmentAmount(value: string): number {
  const text = toEnglishDigits(value).trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return NaN;
  const amount = Number(text);
  return Number.isFinite(amount) && amount <= 999999999999.99 ? amount : NaN;
}
export function isoToday() {
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=(type:string)=>parts.find(p=>p.type===type)!.value;
  return part('year')+'-'+part('month')+'-'+part('day');
}
export function validISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value+'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
}
export function monthDate(first: string, offset: number) {
  if (!validISODate(first)) throw new Error('Invalid date');
  const [y,m,day] = first.split('-').map(Number);
  const end = new Date(Date.UTC(y,m+offset,0));
  return `${end.getUTCFullYear()}-${String(end.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(day,end.getUTCDate())).padStart(2,'0')}`;
}
export function contractAmounts(principal: number, pct: number) {
  const profit = roundMoney(principal*pct/100);
  return { profit, total: roundMoney(principal+profit) };
}
export function allocateInvestmentPayment(principal: number, profit: number, collected: number, amount: number) {
  if (![principal,profit,collected,amount].every(n=>Number.isFinite(n)&&n===roundMoney(n)) || principal<=0 || profit<0 || collected<0 || amount<=0 || roundMoney(collected+amount)>roundMoney(principal+profit)) throw new Error('Invalid repayment amount');
  const principalPart = roundMoney(Math.min(amount,Math.max(0,principal-collected)));
  return { principalPart, profitPart: roundMoney(amount-principalPart) };
}
export function investmentSchedule(c: InvestmentContract, collected: number, today=isoToday()) {
  const totalMinor = Math.round((c.principal+c.profitAmount)*100);
  const regularMinor = Math.floor(totalMinor/c.termMonths);
  let prior = 0;
  return Array.from({length:c.termMonths},(_,i)=>{
    const amount = (i===c.termMonths-1 ? totalMinor-regularMinor*(c.termMonths-1) : regularMinor)/100;
    const paid = roundMoney(Math.min(amount,Math.max(0,collected-prior)));
    const dueDate=monthDate(c.firstDueDate,i);prior=roundMoney(prior+amount);
    const remaining=roundMoney(amount-paid);
    return {number:i+1,dueDate,amount,paid,remaining,overdue:remaining>0&&dueDate<today};
  });
}
export function normalizeContactPhone(value: string) {
  let digits=toEnglishDigits(value).replace(/[\s()+-]/g,'');
  if (/^01[3-9]\d{8}$/.test(digits)) digits='88'+digits;
  return /^8801[3-9]\d{8}$/.test(digits) ? digits : '';
}
export function validateNewInvestment(d: NewInvestment): string | null {
  if (!d.recipientName.trim() || !normalizeContactPhone(d.phone)) return 'recipient';
  if (!/^\d+$/.test(toEnglishDigits(d.nid).trim()) || !d.fatherName.trim() || !d.motherName.trim()) return 'identity';
  if (d.whatsapp && !normalizeContactPhone(d.whatsapp)) return 'whatsapp';
  if (!Number.isFinite(d.principal)||d.principal<=0||!Number.isFinite(d.profitPct)||d.profitPct<0||d.profitPct>100) return 'terms';
  if (!Number.isInteger(d.termMonths)||d.termMonths<1||d.termMonths>120||(d.principal+contractAmounts(d.principal,d.profitPct).profit)*100<d.termMonths) return 'terms';
  if (!validISODate(d.disbursedDate)||!validISODate(d.firstDueDate)||d.firstDueDate<d.disbursedDate) return 'dates';
  const contacts=d.contacts.filter(c=>c.name.trim()||c.relation.trim()||c.phone.trim());
  if (!contacts.length||contacts.length>3||contacts.some(c=>!c.name.trim()||!c.relation.trim()||!normalizeContactPhone(c.phone))) return 'contacts';
  return null;
}
export function investmentReminder(c: InvestmentContract,collected: number,society: string,bengali: boolean,today=isoToday()) {
  const schedule=investmentSchedule(c,collected,today);
  const overdue=roundMoney(schedule.filter(s=>s.overdue).reduce((sum,s)=>sum+s.remaining,0));
  const next=schedule.find(s=>s.remaining>0);
  if (!next) return null;
  const money=(n:number)=>new Intl.NumberFormat(bengali?'bn-BD':'en-BD',{maximumFractionDigits:2}).format(n);
  const text=bengali
    ? `প্রিয় ${c.recipientName}, আপনার বিনিয়োগ ${c.number}-এর কিস্তির তারিখ ${next.dueDate}। এই কিস্তিতে অবশিষ্ট ৳${money(next.remaining)}। মেয়াদোত্তীর্ণ কিস্তির মোট বাকি ৳${money(overdue)}। মোট অবশিষ্ট ৳${money(roundMoney(c.principal+c.profitAmount-collected))}। অনুগ্রহ করে সমিতির সঙ্গে যোগাযোগ করুন। — ${society}`
    : `Dear ${c.recipientName}, investment ${c.number}: installment date ${next.dueDate}, installment balance BDT ${money(next.remaining)}, overdue installments BDT ${money(overdue)}, total outstanding BDT ${money(roundMoney(c.principal+c.profitAmount-collected))}. Please contact the society. — ${society}`;
  const phone=normalizeContactPhone(c.whatsapp||c.phone);
  return {text,url:phone?`https://wa.me/${phone}?text=${encodeURIComponent(text)}`:null};
}
