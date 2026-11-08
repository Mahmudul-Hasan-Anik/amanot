// Shared fixtures for UI tests: the real display helpers and a cash-accounts hook backed by the test store.
const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript');
const root=path.join(__dirname,'..');const cache={};
function mod(rel){
  if(cache[rel])return cache[rel];
  const out={};cache[rel]=out;const dir=path.dirname(rel);
  const code=ts.transpileModule(fs.readFileSync(path.join(root,rel),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{exports:out,require:n=>mod(path.join(dir,n)+'.ts')});
  return out;
}
exports.displayFixture=(name,deps)=>{
  if(/lib\/displayText$/.test(name))return mod('src/lib/displayText.ts');
  if(/hooks\/useCashAccounts$/.test(name)){
    const key=Object.keys(deps||{}).find(k=>k.endsWith('store/somitiStore'));const store=key&&deps[key];
    return {useCashAccounts:()=>store&&store.useSomitiStore?store.useSomitiStore(s=>s.cashAccounts):[]};
  }
  return undefined;
};
