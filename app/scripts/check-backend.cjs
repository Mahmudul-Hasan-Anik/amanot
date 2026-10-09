// Read-only anonymous API smoke check. Never logs the public key or member data.
const fs = require('node:fs');
const path = require('node:path');
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname,'../.env'),'utf8').split(/\r?\n/).filter(l=>/^EXPO_PUBLIC_SUPABASE_(URL|ANON_KEY)=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
async function main() {
  const url=env.EXPO_PUBLIC_SUPABASE_URL, key=env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if(!url?.startsWith('https://')||!key) throw Error('Missing backend configuration');
  const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  const health=await fetch(`${url}/rest/v1/rpc/somiti_initialized`,{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(20000)});
  if(!health.ok || await health.json() !== true) throw Error('Hosted initialization check failed');
  console.log('PASS live database health query');
  const response=await fetch(`${url}/rest/v1/members?select=id&limit=1`,{headers,signal:AbortSignal.timeout(20000)});
  if(response.ok) {
    const rows=await response.json();
    if(!Array.isArray(rows)||rows.length) throw Error('Anonymous member access is not private');
  } else if(![401,403].includes(response.status)) throw Error('Unexpected permission-check response');
  console.log('PASS anonymous member records are private');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
