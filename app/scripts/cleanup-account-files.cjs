// Owner maintenance only. Supply a server key privately through the process
// environment; never use an EXPO_PUBLIC variable or commit the key.
async function cleanup({base,key,fetchImpl=fetch}){
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base||'')||!key)throw Error('A valid Supabase URL and server-only key are required.');
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const call=async(path,method='GET',body)=>{
   const response=await fetchImpl(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('Cleanup request failed ('+response.status+'); pending items remain retryable.');
   return response.status===204?null:response.json();
 };
 let completed=0;
 for(;;){
   const pending=await call('/rest/v1/account_file_cleanup?completed_at=is.null&select=member_id&limit=100');
   if(!Array.isArray(pending))throw Error('Invalid cleanup list');
   if(!pending.length)break;
   for(const {member_id:id} of pending){
     if(!/^[0-9a-f-]{36}$/.test(id))throw Error('Invalid cleanup prefix');
     for(;;){
       const files=await call('/storage/v1/object/list/member-documents','POST',{prefix:id+'/',limit:100,offset:0,sortBy:{column:'name',order:'asc'}});
       if(!Array.isArray(files))throw Error('Invalid file list');
       if(!files.length)break;
       const prefixes=files.map(f=>{if(!f.name||f.name.includes('/')||f.name==='.'||f.name==='..')throw Error('Unexpected nested object');return id+'/'+f.name;});
       await call('/storage/v1/object/member-documents','DELETE',{prefixes});
     }
     await call('/rest/v1/account_file_cleanup?member_id=eq.'+id,'PATCH',{completed_at:new Date().toISOString()});completed++;
   }
 }
 return completed;
}
module.exports={cleanup};
if(require.main===module)cleanup({base:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY}).then(n=>console.log('Completed pending photo cleanups:',n)).catch(e=>{console.error(e.message);process.exitCode=1;});
