import type { Member } from '../mocks/mockData';
export type WithdrawalMethod = 'cash'|'bank'|'bkash'|'nagad';
export type Withdrawal = {
 id:string;member_id:string;member_name:string;member_code:string;amount:number;
 reason:string;preferred_method:WithdrawalMethod;status:'submitted'|'approved'|'rejected'|'cancelled'|'paid'|'reversed';
 created_at:string;decision_note:string;payment_note:string;reversal_reason:string;
 paid_transaction_id?:string;reversal_transaction_id?:string;payment_method?:WithdrawalMethod;payment_date?:string;payment_reference:string;
};
/** Deposit and distributed profit can both be withdrawn (client decision, Oct 2026). */
export function withdrawalAvailable(member:Pick<Member,'totalDeposit'|'profitBalance'>,requests:Withdrawal[]) {
 const reserved=requests.filter(r=>r.status==='approved').reduce((sum,r)=>sum+Number(r.amount),0);
 return Math.max(0,Math.round((member.totalDeposit-reserved)*100)/100);
}
export function savingsBreakdown(member:Pick<Member,'id'|'totalDeposit'|'profitBalance'|'totalWithdrawn'>,requests:Withdrawal[]) {
 const cents=(n:number)=>Math.round(n*100);
 const principal=Math.max(0,cents(member.totalDeposit)-cents(member.profitBalance||0));
 const withdrawn=cents(member.totalWithdrawn||0);
 const reserved=requests.filter(r=>r.member_id===member.id&&r.status==='approved').reduce((n,r)=>n+cents(r.amount),0);
 return {paidIn:(principal+withdrawn)/100,withdrawn:withdrawn/100,profit:member.profitBalance||0,principal:principal/100,balance:member.totalDeposit,reserved:reserved/100,available:Math.max(0,cents(member.totalDeposit)-reserved)/100};
}
export function pendingDays(createdAt:string,now=new Date()):number {
 const start=new Date(createdAt).getTime();
 return Number.isFinite(start)?Math.max(0,Math.floor((now.getTime()-start)/86400000)):0;
}
