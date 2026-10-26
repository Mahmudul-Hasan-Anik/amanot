import { toEnglishDigits } from './bengali';

export type EmergencyContact = { name: string; relation: string; phone: string };
export type InvestmentContract = {
  id: string; memberId?: string; number: string; recipientName: string;
  phone: string; whatsapp: string; address: string; nid: string;
  fatherName: string; motherName: string; contacts: EmergencyContact[];
  principal: number; profitPct: number; profitAmount: number; termMonths: number;
  disbursedDate: string; firstDueDate: string; purpose: string;
  /** Account the money left from (cash = cashier). */
  paymentMethod?: 'cash' | 'bank' | 'bkash' | 'nagad';
};
export type NewInvestment = Omit<InvestmentContract, 'number' | 'profitAmount'> & {
  paymentMethod: 'cash' | 'bank' | 'bkash' | 'nagad';
};
export type InvestmentProposal = {id:string; status:'submitted'|'approved'|'rejected'|'withdrawn'|'disbursed'; payload:NewInvestment; created_at:string; approved_at?:string; disbursed_at?:string; decision_note:string};
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
/** Ordered field errors follow the form. Identity and emergency contacts are optional (client decision). */
export function investmentFieldErrors(d: NewInvestment): Record<string,string> {
  const errors:Record<string,string>={};
  if(!d.recipientName.trim())errors.recipientName='required';
  if(!normalizeContactPhone(d.phone))errors.phone='phone';
  if(d.whatsapp&&!normalizeContactPhone(d.whatsapp))errors.whatsapp='phone';
  const nid=toEnglishDigits(d.nid||'').trim();
  if(nid&&!/^\d+$/.test(nid))errors.nid='nid';
  d.contacts.forEach((c,index)=>{
    if(!(c.name.trim()||c.relation.trim()||c.phone.trim()))return;
    if(!c.name.trim())errors['contact.'+index+'.name']='required';
    if(!normalizeContactPhone(c.phone))errors['contact.'+index+'.phone']='phone';
  });
  if(d.contacts.filter(c=>c.name.trim()||c.relation.trim()||c.phone.trim()).length>3)errors['contact.0.name']='contacts';
  if(!Number.isFinite(d.principal)||d.principal<=0)errors.principal='amount';
  if(!Number.isFinite(d.profitPct)||d.profitPct<0||d.profitPct>100)errors.profitPct='rate';
  if(!Number.isInteger(d.termMonths)||d.termMonths<1||d.termMonths>120||(d.principal+contractAmounts(d.principal,d.profitPct).profit)*100<d.termMonths)errors.termMonths='duration';
  if(!validISODate(d.disbursedDate))errors.disbursedDate='date';
  if(!validISODate(d.firstDueDate))errors.firstDueDate='date';
  else if(validISODate(d.disbursedDate)&&d.firstDueDate<d.disbursedDate)errors.firstDueDate='dueDate';
  return errors;
}
export function validateNewInvestment(d: NewInvestment): string | null {
  const key=Object.keys(investmentFieldErrors(d))[0];
  if(!key)return null;
  if(key==='recipientName'||key==='phone')return 'recipient';
  if(key==='whatsapp')return 'whatsapp';
  if(['nid','fatherName','motherName'].includes(key))return 'identity';
  if(key.startsWith('contact.'))return 'contacts';
  if(key==='disbursedDate'||key==='firstDueDate')return 'dates';
  return 'terms';
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
