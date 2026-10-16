import type { Member } from '../mocks/mockData';
export type WithdrawalMethod = 'cash'|'bank'|'bkash'|'nagad';
export type Withdrawal = {
 id:string;member_id:string;member_name:string;member_code:string;amount:number;
 reason:string;preferred_method:WithdrawalMethod;status:'submitted'|'approved'|'rejected'|'cancelled'|'paid'|'reversed';
 created_at:string;decision_note:string;payment_note:string;reversal_reason:string;
 paid_transaction_id?:string;reversal_transaction_id?:string;payment_method?:WithdrawalMethod;payment_date?:string;payment_reference:string;
};
export function withdrawalAvailable(member:Pick<Member,'totalDeposit'|'profitBalance'>,requests:Withdrawal[]) {
 const reserved=requests.filter(r=>r.status==='approved').reduce((sum,r)=>sum+Number(r.amount),0);
 return Math.max(0,Math.round((member.totalDeposit-(member.profitBalance||0)-reserved)*100)/100);
}
