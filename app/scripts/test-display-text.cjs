const assert=require('assert');
const d=require('./display-fixtures.cjs').displayFixture('../lib/displayText');
// Bengali stored dates are shown in English on the English screen, and the reverse.
assert.equal(d.displayDate('৮ নভেম্বর ২০২৬',false),'8 November 2026');
assert.equal(d.displayDate('৮ জুলাই',false),'8 July');
assert.equal(d.displayDate('৮ নভেম্বর ২০২৬',false,'2026-11-08',{short:true}),'8 Nov 2026');
assert.equal(d.displayDate('2026-11-08',true),'৮ নভেম্বর ২০২৬');
assert.equal(d.displayDate('',false),'');
assert.equal(d.localDigits('#১০১৭',false),'#1017');
assert.equal(d.localDigits('1017',true),'১০১৭');
// Default account names follow the language; renamed accounts keep their own name.
assert.equal(d.accountLabel({type:'cashier',name:'কোষাধ্যক্ষের হাতে'},false),'Cash in hand (cashier)');
assert.equal(d.accountLabel({type:'bkash',name:'বিকাশ'},false),'bKash');
assert.equal(d.accountLabel({type:'bank',name:'Sonali Bank'},true),'Sonali Bank');
assert.equal(d.roleTitle('সভাপতি · সুপার অ্যাডমিন',false),'President · Super admin');
assert.equal(d.roleTitle('সভাপতি',true),'সভাপতি');
assert.equal(d.roleTitle('Custom title',false),'Custom title');
assert.equal(d.displayRelative(new Date().toISOString(),false).startsWith('Today '),true);
console.log('PASS display text: Bengali dates/digits in English mode, account names, role titles, relative times.');
