import { toEnglishDigits } from './bengali';

/** Percentages are explicit: an absent fund/share means zero, never an assumed 10%. */
export function parseProfitPercent(value: string | number): number | null {
  const text = toEnglishDigits(String(value)).trim();
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(text)) return null;
  const percent = Number(text);
  return percent <= 100 ? percent : null;
}

export function calculateProfitAllocation(netProfit: number, reserve: string | number, management: string | number) {
  const reservePct = parseProfitPercent(reserve);
  const managementPct = parseProfitPercent(management);
  if (reservePct === null || managementPct === null || reservePct + managementPct > 100 || !Number.isFinite(netProfit)) return null;
  const cents = Math.max(0, Math.round(netProfit * 100));
  // Match the server's combined deduction; reconcile individual deductions to cents.
  const distributedCents = Math.round(cents * (10000 - Math.round(reservePct * 100) - Math.round(managementPct * 100)) / 10000);
  const reserveCents = Math.round(cents * Math.round(reservePct * 100) / 10000);
  return { reservePct, managementPct, reserveFund: reserveCents / 100, managementFund: (cents - distributedCents - reserveCents) / 100, distributed: distributedCents / 100 };
}

// ---------------------------------------------------------------------------
// Taka-months over the society's fiscal year (client feedback, Oct 2026).
// Mirrors profit_preview_fy on the server; used for the demo and for tests.
// ---------------------------------------------------------------------------
const pad2=(n:number)=>String(n).padStart(2,'0');
const addMonths=(iso:string,k:number)=>{const [y,m]=iso.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+k,1));return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-01`;};

/** Fiscal year label = calendar year it ends in (July 2026–June 2027 = 2027). */
export function fiscalYearOf(iso:string,startMonth=7){const [y,m]=iso.split('-').map(Number);return startMonth>1&&m>=startMonth?y+1:y;}
/** Period of a fiscal year: start inclusive, end exclusive. */
export function fiscalPeriod(fy:number,startMonth=7){const start=startMonth===1?`${fy}-01-01`:`${fy-1}-${pad2(startMonth)}-01`;return {start,end:addMonths(start,12)};}

export type SavingsMember={id:string;name:string;code:string;balanceNow:number;events:{date:string;delta:number}[]};
export type TakaMonthShare={memberId:string;name:string;code:string;balance:number;takaMonths:number;share:number};

/** Balance before a date: today's balance minus everything that happened on/after it. */
export function balanceBefore(m:SavingsMember,date:string){return Math.max(0,m.balanceNow-m.events.filter(e=>e.date>=date).reduce((s,e)=>s+e.delta,0));}

/**
 * Month weight = lower of the balance at the month's start and end:
 * a deposit counts from the next month, a withdrawal from its own month.
 * mode 'full': pool split by taka-months. mode 'rate': taka-months × rate% ÷ 12.
 */
export function takaMonthShares(members:SavingsMember[],start:string,end:string,mode:'full'|'rate',pool:number,ratePct=0):TakaMonthShare[]{
  const months:string[]=[];for(let d=start;d<end;d=addMonths(d,1))months.push(d);
  const rows=members.map(m=>({memberId:m.id,name:m.name,code:m.code,balance:balanceBefore(m,end),
    takaMonths:Math.round(months.reduce((s,ms)=>s+Math.max(0,Math.min(balanceBefore(m,ms),balanceBefore(m,addMonths(ms,1)))),0)*100)/100,share:0})).filter(r=>r.takaMonths>0);
  const total=rows.reduce((s,r)=>s+r.takaMonths,0);
  if(mode==='rate'){rows.forEach(r=>{r.share=Math.round(r.takaMonths*ratePct/1200*100)/100;});return rows;}
  if(total<=0||pool<=0)return rows;
  const cents=Math.round(pool*100);let given=0;
  rows.forEach(r=>{r.share=Math.round(cents*r.takaMonths/total)/100;given+=Math.round(r.share*100);});
  const top=[...rows].sort((a,b)=>b.takaMonths-a.takaMonths||a.memberId.localeCompare(b.memberId))[0];
  top.share=Math.round((top.share*100+cents-given))/100;
  return rows;
}
