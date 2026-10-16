const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),assert=require('node:assert/strict');
const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/backend-health.yml'),'utf8');
const script=workflow.split('        run: |')[1].trimEnd().split(/\r?\n/).slice(1).map(line=>line.slice(10)).join('\n');
const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
const fixture='curl(){ if [ "$FIXTURE_RESPONSE" = transport-failure ]; then return 22; fi; printf "%s" "$FIXTURE_RESPONSE"; }\n';
for(const [response,success] of [['true',true],['false',true],['null',false],['',false],['{}',false],['{"error":"denied"}',false],['transport-failure',false]]){
 const result=spawnSync(bash,['--noprofile','--norc','-c',fixture+script],{encoding:'utf8',env:{...process.env,SUPABASE_URL:'https://fixture.invalid',SUPABASE_ANON_KEY:'fixture-key',FIXTURE_RESPONSE:response}});
 if(result.error)throw result.error;
 assert.equal(result.status===0,success,'Unexpected result for '+JSON.stringify(response));
 assert.equal(result.stdout.includes('fixture-key'),false);
}
for(const missing of ['SUPABASE_URL','SUPABASE_ANON_KEY']){
 const result=spawnSync(bash,['--noprofile','--norc','-c',fixture+script],{encoding:'utf8',env:{...process.env,SUPABASE_URL:'https://fixture.invalid',SUPABASE_ANON_KEY:'fixture-key',FIXTURE_RESPONSE:'false',[missing]:''}});
 assert.notEqual(result.status,0);
}
console.log('PASS workflow shell: true/false are healthy; malformed/empty/error responses, transport failure and missing configuration fail safely.');
