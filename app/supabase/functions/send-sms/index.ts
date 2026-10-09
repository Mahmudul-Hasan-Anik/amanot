// Deploy with `supabase functions deploy send-sms`.
// Secrets stay in the Edge Function: SMS_PROVIDER=mock|greenweb, SMS_API_KEY.
// Greenweb response contract: https://bdbulksms.net/bulk-sms-api-bd-english.php
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(request:Request)=>{
  if(request.method==='OPTIONS') return new Response(null,{headers:cors});
  if(request.method!=='POST') return json({error:'Method not allowed'},405);
  const authorization=request.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer ')) return json({error:'Login required'},401);
  const base=Deno.env.get('SUPABASE_URL')!;
  const headers={'apikey':Deno.env.get('SUPABASE_ANON_KEY')!,'Authorization':authorization,'Content-Type':'application/json'};
  const provider=Deno.env.get('SMS_PROVIDER')||'mock';
  let phone='',message='',payload:Record<string,unknown>={},responseData:unknown={};
  try {
    const role=await fetch(base+'/rest/v1/rpc/is_staff',{method:'POST',headers,body:'{}'});
    if(!role.ok||await role.json()!==true) return json({error:'Staff permission required'},403);
    payload=await request.json();
    const digits=String(payload.phone||'').replace(/[০-৯]/g,c=>String('০১২৩৪৫৬৭৮৯'.indexOf(c))).replace(/\D/g,'');
    phone=digits.length>=10?'0'+digits.slice(-10):digits;message=String(payload.message||'').trim();
    if(!/^01[3-9]\d{8}$/.test(phone)||!message||message.length>1600) return json({error:'Invalid phone or message'},400);
    if(provider==='mock') responseData={simulated:true};
    else if(provider==='greenweb') {
      const key=Deno.env.get('SMS_API_KEY');if(!key) return json({error:'SMS provider is not configured'},503);
      const response=await fetch('https://api.greenweb.com.bd/api.php?json',{method:'POST',body:new URLSearchParams({token:key,to:phone,message,json:'1'}),signal:AbortSignal.timeout(20000)});
      const result=await response.json();
      const accepted=response.ok&&Array.isArray(result)&&result.length===1&&result[0].status==='SENT';
      // Store only status, never provider requests or credentials.
      responseData={status:result?.[0]?.status||'FAILED',message:result?.[0]?.statusmsg||''};
      if(!accepted) throw new Error(String(result?.[0]?.statusmsg||'SMS provider rejected the message'));
    } else return json({error:'Unsupported SMS provider'},503);
    const log=await fetch(base+'/rest/v1/rpc/log_sms',{method:'POST',headers,body:JSON.stringify({p_phone:phone,p_message:message,p_template:payload.templateType||'custom',p_recipient_name:payload.recipientName||null,p_member_id:payload.memberId||null,p_provider:provider,p_status:provider==='mock'?'queued':'sent',p_response:responseData})});
    return json({success:true,provider,simulated:provider==='mock',auditSaved:log.ok});
  } catch(error) {
    if(phone&&message) await fetch(base+'/rest/v1/rpc/log_sms',{method:'POST',headers,body:JSON.stringify({p_phone:phone,p_message:message,p_template:payload.templateType||'custom',p_recipient_name:payload.recipientName||null,p_member_id:payload.memberId||null,p_provider:provider,p_status:'failed',p_response:{error:error instanceof Error?error.message:'SMS failed'}})}).catch(()=>{});
    return json({success:false,error:error instanceof Error?error.message:'SMS failed'},502);
  }
});
