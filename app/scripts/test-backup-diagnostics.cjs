const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const {classifyPostgres,formatDiagnostic,step}=require('./backup-diagnostics.cjs');
const {run}=require('./backup.cjs');
const privateText='SYNTHETIC_PRIVATE_PASSWORD_KEY_NID';
const cases=[
  ['password authentication failed for user '+privateText,'authentication'],
  ['could not translate host name "'+privateText+'" to address','dns'],
  ['server version: 18; pg_dump version: 17; aborting because of server version mismatch','version'],
  ['SSL error: certificate verify failed '+privateText,'tls'],
  ['permission denied for table '+privateText,'permission'],
  ['relation "'+privateText+'" does not exist','missing_schema'],
  ['connection refused '+privateText,'connection'],
  [privateText,'unknown'],
];
for(const [stderr,reason] of cases){
  assert.equal(classifyPostgres(stderr),reason);
  const text=formatDiagnostic({message:stderr,stack:stderr,backupStage:'database-dump',backupReason:reason});
  assert.ok(text.startsWith('[backup:database-dump/'+reason+']'));
  assert.ok(!text.includes(privateText));
}
assert.ok(!formatDiagnostic({message:privateText,backupStage:privateText,backupReason:privateText}).includes(privateText));
assert.match(formatDiagnostic({code:'ENOSPC',message:privateText,backupStage:'write-backup'}),/write-backup\/disk/);
assert.match(formatDiagnostic({cause:{code:'SELF_SIGNED_CERT_IN_CHAIN',message:privateText},backupStage:'storage-photos'}),/storage-photos\/tls/);
async function main(){
  await assert.rejects(()=>step('database-connect',()=>run(process.execPath,['-e',`process.stderr.write(${JSON.stringify(cases[0][0])});process.exit(1)`],process.env)),error=>{
    assert.match(formatDiagnostic(error),/database-connect\/authentication/);
    assert.ok(!formatDiagnostic(error).includes(privateText));return true;
  });
  await assert.rejects(()=>step('database-connect',()=>run(path.join(__dirname,'synthetic-missing-tool.exe'),[],process.env)),error=>{
    assert.match(formatDiagnostic(error),/database-connect\/missing_tool/);return true;
  });
  const result=spawnSync(process.execPath,[path.join(__dirname,'backup.cjs'),'--create','--output','synthetic.amanotbak'],{encoding:'utf8',env:{...process.env,AMANOT_BACKUP_PASSPHRASE:'short',AMANOT_DATABASE_URL:privateText,AMANOT_SUPABASE_SERVICE_KEY:privateText}});
  assert.equal(result.status,1);assert.match(result.stderr,/configuration\/invalid_passphrase/);
  assert.ok(!(result.stdout+result.stderr).includes(privateText));
  const diagnostic=spawnSync(process.execPath,[path.join(__dirname,'backup.cjs'),'--diagnose'],{encoding:'utf8',env:{...process.env,AMANOT_BACKUP_PASSPHRASE:'',AMANOT_DATABASE_URL:privateText}});
  assert.equal(diagnostic.status,1);assert.match(diagnostic.stderr,/configuration\/configuration/);
  assert.ok(!(diagnostic.stdout+diagnostic.stderr).includes(privateText));
  console.log('PASS backup diagnostics: safe stage/reason, PostgreSQL failure categories, private stderr suppression, missing tools, network/TLS/file classification and CLI exit.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
