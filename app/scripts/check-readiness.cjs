// Anonymous rejection checks only: no account, credential or ledger mutation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const env=Object.fromEntries(fs.readFileSync(path.join(__dirname,'../.env'),'utf8').split(/\r?\n/).filter(l=>/^EXPO_PUBLIC_SUPABASE_(URL|ANON_KEY)=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
async function main(){
 const base=env.EXPO_PUBLIC_SUPABASE_URL,key=env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 for(const fn of ['confirm_pin_session','preview_account_deletion','delete_my_account']){
   const body=fn==='confirm_pin_session'?{p_pin:'000000'}:{p_pin:'000000',p_close_society:false,p_confirmation:'DELETE'};
   const response=await fetch(base+'/rest/v1/rpc/'+fn,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
   assert.ok([401,403].includes(response.status),fn+' should require authentication');
 }
 const response=await fetch(base+'/functions/v1/delete-account',{method:'POST',headers,body:JSON.stringify({pin:'000000',closeSociety:false,confirmation:'DELETE'}),signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,401);const data=await response.json();assert.ok(data.error);
 console.log('PASS hosted readiness: session grant and deletion RPCs reject anonymous calls; deployed Edge Function rejects anonymous user before mutations.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
