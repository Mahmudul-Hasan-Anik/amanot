// Owner-operated tool. Secrets come only from the process environment; no
// connection URL, passphrase, service key, member record or path is logged.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {encrypt,decrypt,validate,digest,MAX_BYTES}=require('./backup-crypto.cjs');
const {failure,classifyPostgres,step,formatDiagnostic}=require('./backup-diagnostics.cjs');
function argumentsFor(argv) {
  const result={};
  for(let i=0;i<argv.length;i++) {
    const name=argv[i];
    if(['--diagnose','--create','--inspect','--rehearse','--database-only'].includes(name)) result[name]=true;
    else if(['--output','--input','--photos-output'].includes(name)&&argv[i+1]) result[name]=argv[++i];
    else throw Error('Unsupported backup argument.');
  }
  return result;
}
function pgEnvironment(connection,local=false) {
  const uri=new URL(connection||'');
  if(!['postgres:','postgresql:'].includes(uri.protocol)||!uri.username||!uri.password) throw failure('configuration');
  const host=uri.hostname.replace(/^\[|\]$/g,'');
  const database=decodeURIComponent(uri.pathname.slice(1));
  if(local&&(!['localhost','127.0.0.1','::1'].includes(host)||!/^amanot_restore_[a-z0-9_]+$/.test(database))) throw Error('Restore is restricted to a local disposable database named amanot_restore_*.');
  return {...process.env,PGHOST:host,PGPORT:uri.port||'5432',PGUSER:decodeURIComponent(uri.username),PGPASSWORD:decodeURIComponent(uri.password),PGDATABASE:database,PGCONNECT_TIMEOUT:'15',PGSSLMODE:local?'disable':'verify-full',PGSSLROOTCERT:local?'':process.env.PGSSLROOTCERT||'system'};
}
async function run(program,args,env,input) {
  return new Promise((resolve,reject)=>{
    const child=spawn(program,args,{env,windowsHide:true,stdio:['pipe','pipe','pipe']});
    let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;child.kill();},5*60*1000);
    child.on('close',()=>clearTimeout(timeout));
    child.on('error',()=>clearTimeout(timeout));
    const chunks=[];let length=0;
    child.on('error',()=>reject(failure('missing_tool')));
    child.stdout.on('data',b=>{length+=b.length;if(length>MAX_BYTES){child.kill();reject(failure('size'));}else chunks.push(b);});
    // Inspect a bounded private buffer only to select an allowlisted category.
    let stderr='';child.stderr.on('data',b=>{if(stderr.length<32768)stderr=(stderr+b.toString()).slice(0,32768);});child.stdin.on('error',()=>{});
    child.on('close',code=>{const reason=timedOut?'timeout':classifyPostgres(stderr);stderr='';code===0?resolve(Buffer.concat(chunks)):reject(failure(reason));});
    child.stdin.end(input);
  });
}
async function photosFromStorage(env) {
  const uri=new URL(process.env.AMANOT_SUPABASE_URL||'');
  if(uri.protocol!=='https:'||!uri.hostname.endsWith('.supabase.co')) throw Error('A valid hosted Supabase URL is required.');
  const key=process.env.AMANOT_SUPABASE_SERVICE_KEY;
  if(!key) throw failure('configuration');
  const manifest=JSON.parse((await step('storage-manifest',()=>run('psql',['-X','-A','-t','--set','ON_ERROR_STOP=1','--command',"select coalesce(json_agg(name order by name),'[]'::json) from storage.objects where bucket_id='member-documents' and name ~ '^[0-9a-fA-F-]{36}/avatar(-[0-9a-fA-F-]{36})?\\.(jpg|jpeg|png|webp)$'"],env))).toString().trim());
  if(!Array.isArray(manifest)||manifest.length>10000) throw Error('Invalid Storage manifest.');
  const photos=[];
  for(const name of manifest) {
    const response=await fetch(`${uri.origin}/storage/v1/object/member-documents/${name.split('/').map(encodeURIComponent).join('/')}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw failure([401,403].includes(response.status)?'storage_auth':response.status===404?'storage_missing':'storage_http');
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length>5*1024*1024) throw Error('Unexpected profile photo size.');
    photos.push({path:name,sha256:digest(bytes),data:bytes.toString('base64')});
  }
  return photos;
}
async function businessMetrics(env) {
  const query="select json_build_object('members',(select count(*)::text from public.members),'profiles',(select count(*)::text from public.profiles),'transactions',(select count(*)::text from public.transactions),'transactionAmount',(select coalesce(sum(amount),0)::text from public.transactions),'cashAmount',(select coalesce(sum(amount),0)::text from public.cash_accounts))";
  return JSON.parse((await run('psql',['-X','-A','-t','--set','ON_ERROR_STOP=1','--command',query],env)).toString().trim());
}
function verifyMetrics(expected,actual) {
  const keys=['members','profiles','transactions','transactionAmount','cashAmount'];
  if(!expected||keys.some(k=>typeof expected[k]!=='string'||expected[k]!==actual[k])) throw Error('Restored business counts or totals differ from the source snapshot.');
}
async function main(argv=process.argv.slice(2)) {
  const args=argumentsFor(argv),password=process.env.AMANOT_BACKUP_PASSPHRASE;
  if([args['--diagnose'],args['--create'],args['--inspect'],args['--rehearse']].filter(Boolean).length!==1) throw failure('configuration');
  if(args['--diagnose']) {
    const env=await step('configuration',()=>pgEnvironment(process.env.AMANOT_DATABASE_URL));
    await step('database-connect',()=>run('psql',['-X','-A','-t','--set','ON_ERROR_STOP=1','--command','select revision from public.sync_clock where id=1'],env));
    await step('database-metrics',()=>businessMetrics(env));
    await step('database-dump',()=>run('pg_dump',['--schema-only','--format=custom','--no-owner','--exclude-schema=amanot_backup_*'],env));
    console.log('Database connection, required tables and schema export checks passed. No backup was created; data export, Storage and real restore are not verified.');
    return;
  }
  if(typeof password!=='string'||password.length<16) throw failure('invalid_passphrase');
  if(args['--create']) {
    if(!args['--output']?.endsWith('.amanotbak')) throw Error('Choose an output ending in .amanotbak.');
    const env=await step('configuration',()=>pgEnvironment(process.env.AMANOT_DATABASE_URL));
    const revision=()=>run('psql',['-X','-A','-t','--set','ON_ERROR_STOP=1','--command','select revision from public.sync_clock where id=1'],env).then(b=>b.toString().trim());
    const before=await step('database-connect',revision);
    const metrics=await step('database-metrics',()=>businessMetrics(env));
    // Keep GRANT/REVOKE ACLs: SECURITY DEFINER RPC permissions are part of the
    // recovery boundary. The rehearsal cluster must have the platform roles.
    const dump=await step('database-dump',()=>run('pg_dump',['--format=custom','--no-owner','--exclude-schema=amanot_backup_*'],env));
    const photos=args['--database-only']?[]:await step('storage-photos',()=>photosFromStorage(env));
    if(await step('snapshot-check',revision)!==before) throw failure('changed');
    const bundle={format:1,createdAt:new Date().toISOString(),databaseOnly:!!args['--database-only'],metrics,database:{data:dump.toString('base64'),sha256:digest(dump)},photos};
    const summary=await step('encrypt',()=>validate(bundle)),encrypted=await step('encrypt',()=>encrypt(bundle,password));
    await step('write-backup',()=>{fs.mkdirSync(path.dirname(path.resolve(args['--output'])),{recursive:true});fs.writeFileSync(args['--output'],encrypted,{mode:0o600,flag:'wx'});});
    console.log(JSON.stringify({status:'encrypted_backup_created',...summary,sha256:digest(encrypted)}));
    return;
  }
  if(!args['--input']) throw Error('An encrypted --input backup is required.');
  const bundle=decrypt(fs.readFileSync(args['--input']),password),summary=validate(bundle);
  if(args['--inspect']) { console.log(JSON.stringify({status:'integrity_verified',...summary}));return; }
  const env=pgEnvironment(process.env.AMANOT_RESTORE_DATABASE_URL,true);
  const count=(await run('psql',['-X','-A','-t','--set','ON_ERROR_STOP=1','--command',"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' and c.relkind in ('r','p','v','m','S')"],env)).toString().trim();
  if(count!=='0') throw Error('Restore target is not empty. Use a fresh local disposable database.');
  if(bundle.photos.length&&!args['--photos-output']) throw Error('Choose a private --photos-output directory for the recovered profile files.');
  const photosOutput=args['--photos-output']&&path.resolve(args['--photos-output']);
  if(photosOutput&&fs.existsSync(photosOutput)) throw Error('Photo restore directory already exists; choose a new empty location.');
  await run('pg_restore',['--no-owner','--exit-on-error','--dbname',env.PGDATABASE],env,Buffer.from(bundle.database.data,'base64'));
  verifyMetrics(bundle.metrics,await businessMetrics(env));
  if(photosOutput) for(const photo of bundle.photos) {
    const destination=path.resolve(photosOutput,...photo.path.split('/'));
    if(!destination.startsWith(photosOutput+path.sep)) throw Error('Unsafe profile file path.');
    fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,Buffer.from(photo.data,'base64'),{mode:0o600,flag:'wx'});
  }
  console.log(JSON.stringify({status:'local_restore_completed',metricsVerified:true,...summary}));
}
if(require.main===module) main().catch(error=>{console.error(formatDiagnostic(error));process.exitCode=1;});
module.exports={main,pgEnvironment,argumentsFor,verifyMetrics,run};
