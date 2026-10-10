const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response(null,{headers:cors});
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  const base=Deno.env.get('SUPABASE_URL')!, key=Deno.env.get('SUPABASE_ANON_KEY')!;
  const authorization=req.headers.get('Authorization')||'';
  const headers={apikey:key,Authorization:authorization,'Content-Type':'application/json'};
  try {
    const user=await fetch(base+'/auth/v1/user',{headers});
    if(!user.ok) return json({error:'আবার লগইন করুন।'},401);
    const body=await req.json();
    if(typeof body.pin!=='string' || !/^[0-9০-৯]{4,6}$/.test(body.pin) || typeof body.confirmation!=='string' || typeof body.closeSociety!=='boolean') return json({error:'সঠিক পিন ও নিশ্চিতকরণ দিন।'},400);
    // The server derives all target IDs from the caller. Ignore client-supplied IDs.
    const args={p_pin:body.pin,p_close_society:body.closeSociety,p_confirmation:body.confirmation};
    const result=await fetch(base+'/rest/v1/rpc/preview_account_deletion',{method:'POST',headers,body:JSON.stringify(args)});
    const data=await result.json();
    if(!result.ok || !data.ok) return json({error:data.error||data.message||'অনুরোধ সম্পন্ন হয়নি।'},400);
    const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let cleanupPending=false;
    const adminHeaders={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
    if(!secret) return json({error:'ছবি পরিষ্কারের সেবা প্রস্তুত নেই। সহায়তায় যোগাযোগ করুন।'},503);
    for(const id of data.memberIds || []) {
      try {
        if(!/^[0-9a-f-]{36}$/.test(id)) throw Error('Invalid cleanup prefix');
        for(;;) {
          const listed=await fetch(base+'/storage/v1/object/list/member-documents',{method:'POST',headers:adminHeaders,body:JSON.stringify({prefix:id+'/',limit:100,offset:0,sortBy:{column:'name',order:'asc'}})});
          if(!listed.ok) throw Error('Photo listing failed');
          const files=await listed.json();
          if(!Array.isArray(files)) throw Error('Invalid photo listing');
          if(!files.length) break;
          const paths=files.map((f:{name:string})=>{
            if(!f.name || f.name.includes('/') || f.name==='.' || f.name==='..') throw Error('Unexpected nested photo');
            return id+'/'+f.name;
          });
          const removed=await fetch(base+'/storage/v1/object/member-documents',{method:'DELETE',headers:adminHeaders,body:JSON.stringify({prefixes:paths})});
          if(!removed.ok) throw Error('Photo cleanup failed');
        }
      } catch {return json({error:'ছবি মুছতে সমস্যা হয়েছে; account এখনও মুছে ফেলা হয়নি। আবার চেষ্টা করুন।'},503);}
    }
    // Recheck role, PIN, last-owner rules and remaining files under DB locks.
    const committed=await fetch(base+'/rest/v1/rpc/delete_my_account',{method:'POST',headers,body:JSON.stringify(args)});
    const final=await committed.json();
    if(!committed.ok||!final.ok)return json({error:final.error||final.message||'Account মুছে ফেলা যায়নি। আবার চেষ্টা করুন।'},400);
    for(const id of final.memberIds||[]) {
      try {
        const marked=await fetch(base+'/rest/v1/account_file_cleanup?member_id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:adminHeaders,body:JSON.stringify({completed_at:new Date().toISOString()})});
        if(!marked.ok)cleanupPending=true;
      }catch{cleanupPending=true;}
    }
    return json({ok:true,cleanupPending});
  } catch {
    return json({error:'অনুরোধের ফল যাচাই করা যায়নি। লগইন করে account-এর অবস্থা দেখুন; সমস্যা হলে সহায়তায় যোগাযোগ করুন।'},502);
  }
});
