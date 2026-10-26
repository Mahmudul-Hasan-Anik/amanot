const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const cache=new Map();
function load(file,dependencies={}) {
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,require:name=>{
    if(name in dependencies)return dependencies[name];
    const target=path.resolve(path.dirname(file),name+'.ts');
    if(!cache.has(target))cache.set(target,load(target));
    return cache.get(target);
  }});return exports;
}
const allocation=load(path.join(__dirname,'../src/lib/profitAllocation.ts'));
const {calculateProfitAllocation:calc,parseProfitPercent:parse}=allocation;
assert.equal(parse('১২.৫০'),12.5);
for(const bad of ['', ' ', '-1', '101', '1.234', '1x', 'Infinity', 'NaN']) assert.equal(parse(bad),null,bad);
assert.equal(calc(1000,60,41),null);
assert.equal(calc(1000,0,0).distributed,1000);
assert.equal(calc(1000,100,0).distributed,0);
assert.equal(calc(1000,'১২.৫','৭.২৫').distributed,802.5);
const pennies=calc(0.03,10,10);
assert.equal(Math.round((pennies.reserveFund+pennies.managementFund+pennies.distributed)*100),3);
// The distribution screen now runs on the server's taka-month preview
// (profit_preview_fy); see scripts/test-digital-khata-db.cjs for the posting checks.
{
  const src=fs.readFileSync(path.join(__dirname,'../app/(admin)/distribution.tsx'),'utf8');
  assert.ok(src.includes('profitPreviewFy')&&src.includes('distributeProfitFy'),'screen uses the fiscal-year API');
  assert.ok(src.includes("disabled={!complete || !rulesValid"),'distribution waits for the year to close');
  assert.ok(src.includes('canManage && !done && REMOTE'),'only admin can distribute');
}
// Taka-month profit (client example: same deposit, different months).
{
  const {takaMonthShares,fiscalPeriod,fiscalYearOf}=allocation;
  assert.equal(JSON.stringify(fiscalPeriod(2027)),JSON.stringify({start:'2026-07-01',end:'2027-07-01'}));
  assert.equal(fiscalYearOf('2026-10-26'),2027);assert.equal(fiscalYearOf('2027-06-30'),2027);assert.equal(fiscalYearOf('2026-03-01',1),2026);
  const p=fiscalPeriod(2024);
  const m=(id,date,amount)=>({id,name:id,code:id,balanceNow:amount,events:[{date,delta:amount}]});
  const rows=takaMonthShares([m('A','2023-06-20',50000),m('B','2024-02-10',50000),m('C','2024-06-05',50000)],p.start,p.end,'full',9000);
  const by=Object.fromEntries(rows.map(r=>[r.memberId,r]));
  assert.equal(by.A.takaMonths,600000);assert.equal(by.B.takaMonths,200000);assert.equal(by.C,undefined,'June deposit counts from July');
  assert.equal(by.A.share,6750);assert.equal(by.B.share,2250);
  const rate=takaMonthShares([m('A','2023-06-20',50000)],p.start,p.end,'rate',0,10);assert.equal(rate[0].share,5000);
  // Withdrawal counts from its own month: 50,000 all year, 20,000 withdrawn in March.
  const w={id:'W',name:'W',code:'W',balanceNow:30000,events:[{date:'2023-01-10',delta:50000},{date:'2024-03-15',delta:-20000}]};
  assert.equal(takaMonthShares([w],p.start,p.end,'rate',0,12)[0].takaMonths,50000*8+30000*4);
  console.log('taka-month profit checks passed');
}
