const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async({db,sql,one,pass,denied,root})=>{
  const first='00000000-0000-4000-8000-000000000099';
  const second='00000000-0000-4000-8000-000000000088';
  const signup=async(id,phone,name,extra={})=>sql('insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values($1,$2,$3::jsonb,md5(\'amanot:983725\'))',[
    id,phone+'@member.amanot.app',JSON.stringify({phone,pin:'983725',name,somiti_name:name+' Society',bootstrap:true,...extra})]);
  const login=async(id)=>{await db.exec('reset role');await sql("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
  let a,b,memberA,memberB;
  await pass('multi-society migration preserves the legacy organization and data',async()=>{
    await sql("select set_config('request.jwt.claim.sub',$1,false)",[first]);
    const ownerMember=(await one('select member_id from profiles where id=$1',[first])).member_id;
    await sql('select record_deposit($1,array[]::text[],250,0,250,\'bank\')',[ownerMember]);
    const ledgerBefore=await one("select jsonb_agg(to_jsonb(t)-'somiti_id' order by id) ledger from transactions t");
    const before=await one('select count(*) n from members');
    await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/011_multiple_somitis.sql'),'utf8'));
    assert.equal(Number((await one('select count(*) n from members')).n),Number(before.n));
    a=(await one('select somiti_id from profiles where id=$1',[first])).somiti_id;
    assert.ok(a);
    assert.deepEqual((await one("select jsonb_agg(to_jsonb(t)-'somiti_id' order by id) ledger from transactions t")).ledger,ledgerBefore.ledger);
    await denied('update transactions set amount=1');
  });
  await pass('another phone registers an independent society and cannot choose its tenant/role',async()=>{
    await signup(second,'01799000088','Second',{somiti_id:a,role:'platform_admin'});
    const p=await one('select somiti_id,role from profiles where id=$1',[second]);b=p.somiti_id;
    assert.notEqual(a,b);assert.equal(p.role,'super_admin');
    assert.equal(Number((await one('select count(*) n from cash_accounts where somiti_id=$1',[b])).n),5);
    assert.equal(Number((await one('select sum(amount) total from cash_accounts where somiti_id=$1',[b])).total),0);
    assert.equal((await one('select info from somiti_settings where somiti_id=$1',[b])).info.name,'Second Society');
  });
  await pass('one phone cannot register another society',async()=>{
    await denied(`insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values('00000000-0000-4000-8000-000000000077','01799000099@member.amanot.app','{"phone":"01799000099","pin":"983725","name":"Duplicate","somiti_name":"Duplicate","bootstrap":true}',md5('amanot:983725'))`);
  });
  await pass('each society can issue SM-002 and maintain independent settings',async()=>{
    await login(first);
    memberA=await one('select * from public.add_member($1::jsonb)',[JSON.stringify({name:'A member',phone:'01799000066',initialPin:'948275',monthlyAmount:1000})]);
    await sql('select update_somiti_info($1::jsonb)',[JSON.stringify({name:'First society',profitReservePct:5})]);
    await login(second);
    memberB=await one('select * from public.add_member($1::jsonb)',[JSON.stringify({name:'B member',phone:'01799000055',initialPin:'948275',monthlyAmount:2000})]);
    assert.ok(memberA.id);assert.ok(memberB.id);assert.notEqual(memberA.id,memberB.id);
    assert.equal(memberA.code,memberB.code);
    assert.equal((await one('select info from somiti_settings')).info.name,'Second Society');
    assert.equal(Number((await one('select count(*) n from somiti_settings')).n),1);
    assert.equal(Number((await one('select count(*) n from profiles')).n),1);
    assert.equal(Number((await one('select count(id) n from members')).n),2);
  });
  await pass('staff RPCs cannot read, edit, delete, promote or reset another society member',async()=>{
    await login(second);
    await assert.rejects(()=>sql('select add_member($1::jsonb)',[JSON.stringify({name:'Duplicate phone',phone:'01799000066',initialPin:'948275'})]),/এই ফোন নম্বরে/);
    assert.equal((await sql('select id from members where id=$1',[memberA.id])).rows.length,0);
    await denied('select update_member($1,\'{"name":"Hacked"}\')',[memberA.id]);
    await denied('select delete_member($1)',[memberA.id]);
    await denied('select set_member_app_role($1,\'admin\')',[memberA.id]);
    await denied('select admin_reset_member_pin($1,\'948275\')',[memberA.id]);
    await denied('select set_member_documents($1,$2,null)',[memberA.id,memberA.id+'/avatar.jpg']);
    await denied('select record_deposit($1,array[]::text[],500,0,500,\'cash\')',[memberA.id]);
  });
  await pass('deposits and expenses affect only their own society cash and ledger',async()=>{
    await login(first);
    await sql('select record_deposit($1,array[]::text[],1000,0,1000,\'cash\')',[memberA.id]);
    assert.equal(Number((await one("select amount from cash_accounts where id='ca2'")).amount),1000);
    await login(second);
    assert.equal(Number((await one('select count(*) n from transactions')).n),0);
    assert.equal(Number((await one("select amount from cash_accounts where id='ca2'")).amount),0);
    await sql('select record_deposit($1,array[]::text[],2000,0,2000,\'cash\')',[memberB.id]);
    await sql("select add_expense('B expense','Rent',100,'cash','B-VOUCHER')");
    assert.equal(Number((await one("select amount from cash_accounts where id='ca2'")).amount),1900);
    await login(first);
    assert.equal(Number((await one("select amount from cash_accounts where id='ca2'")).amount),1000);
    assert.equal(Number((await one('select count(*) n from expenses')).n),0);
  });
  await pass('summary, annual preview, audit logs and revision are society-scoped',async()=>{
    await login(first);
    const summaryA=await one('select get_somiti_summary() summary');
    const revisionA=(await one('select get_sync_revision() revision')).revision;
    assert.ok(revisionA.includes(a));
    assert.equal((await sql('select actor_id from audit_logs where actor_id=$1',[second])).rows.length,0);
    await login(second);
    const summaryB=await one('select get_somiti_summary() summary');
    assert.notDeepEqual(summaryA.summary,summaryB.summary);
    await sql('select update_somiti_info(\'{"tagline":"Only B changed"}\')');
    await sql('select profit_preview(extract(year from current_date)::int)');
    await login(first);
    assert.equal((await one('select get_sync_revision() revision')).revision,revisionA);
  });
  await pass('private photos are isolated for read, upload and overwrite',async()=>{
    await login(first);
    assert.equal((await one('select is_staff() staff')).staff,true);
    assert.equal((await sql('select id from members where id=$1',[memberA.id])).rows.length,1);
    assert.equal((await one('select is_member_avatar_path($1) valid',[memberA.id+'/avatar.jpg'])).valid,true);
    await sql('insert into storage.objects(id,name,bucket_id) values($1,$2,\'member-documents\')',['00000000-0000-4000-8000-000000000041',memberA.id+'/avatar.jpg']);
    await login(second);
    assert.equal((await sql('select name from storage.objects')).rows.length,0);
    await denied('insert into storage.objects(id,name,bucket_id) values($1,$2,\'member-documents\')',['00000000-0000-4000-8000-000000000042',memberA.id+'/avatar-new.jpg']);
    // PostgreSQL may reject the update at WITH CHECK rather than silently
    // filtering it, depending on the RETURNING/policy plan. Either way the
    // foreign object's contents must remain unchanged.
    try { assert.equal((await sql('update storage.objects set name=$1 where id=$2 returning id',[memberA.id+'/avatar.jpg','00000000-0000-4000-8000-000000000041'])).rows.length,0); }
    catch(error) { assert.match(error.message,/row-level security/); }
  });
  await pass('projects, notices and approvals cannot be operated across societies',async()=>{
    await login(first);
    const projectA=await one('select * from upsert_project($1::jsonb)',[JSON.stringify({name:'A project',investedAmount:100,paymentSource:'cash'})]);
    const noticeA=(await one("select * from add_notice('A only','Private notice')")).id;
    await sql('select update_somiti_info(\'{"autoApproveEnabled":false}\')');
    await sql("select add_expense('A pending','Rent',20,'cash','A-PENDING',null,'pending')");
    const approvalA=await one('select id from approvals limit 1');
    await login(second);
    assert.equal((await sql('select id from projects where id=$1',[projectA.id])).rows.length,0);
    await denied('select record_project_return($1,100,\'cash\')',[projectA.id]);
    await denied('select upsert_project($1::jsonb)',[JSON.stringify({id:projectA.id,name:'Hacked project'})]);
    await denied('select approve_request($1)',[approvalA.id]);
    await denied('select reject_request($1,\'Hacked\')',[approvalA.id]);
    await sql('select delete_notice($1)',[noticeA]); // zero affected rows is safe
    await login(first);
    assert.equal((await sql('select id from notices where id=$1',[noticeA])).rows.length,1);
    await sql('select record_project_return($1,200,\'cash\')',[projectA.id]);
    await login(second);
    const projectB=await one('select * from upsert_project($1::jsonb)',[JSON.stringify({name:'B project',investedAmount:100,paymentSource:'cash'})]);
    await sql('select record_project_return($1,300,\'cash\')',[projectB.id]);
  });
  await pass('two societies can distribute profit in the same year without mixing shares',async()=>{
    const year=Number((await one('select extract(year from current_date)::int y')).y);
    await login(first);
    await sql('select distribute_profit($1,0,0)',[year]);
    assert.equal(Number((await one('select distributed from profit_distributions where year=$1',[year])).distributed),100);
    assert.equal((await one('select member_id from profit_shares where year=$1 and member_id=$2',[year,memberA.id])).member_id,memberA.id);
    assert.equal(Number((await one('select sum(share) total from profit_shares where year=$1',[year])).total),100);
    await login(second);
    assert.equal((await one('select profit_preview($1) p',[year])).p.alreadyDistributed,false);
    await sql('select distribute_profit($1,0,0)',[year]);
    assert.equal(Number((await one('select distributed from profit_distributions where year=$1',[year])).distributed),100);
    assert.equal((await one('select member_id from profit_shares where year=$1',[year])).member_id,memberB.id);
  });
  await pass('invited member activation and mandatory PIN change remain in the inviting society',async()=>{
    await db.exec('reset role');
    const invited='00000000-0000-4000-8000-000000000066';
    await sql(`insert into auth.users(id,email,raw_user_meta_data,encrypted_password) values($1,'01799000066@member.amanot.app',$2::jsonb,md5('amanot:948275'))`,[invited,JSON.stringify({phone:'01799000066',pin:'948275',somiti_id:b,role:'super_admin'})]);
    const p=await one('select somiti_id,role,must_change_pin from profiles where id=$1',[invited]);
    assert.equal(p.somiti_id,a);assert.equal(p.role,'member');assert.equal(p.must_change_pin,true);
    await login(invited);
    assert.equal((await one('select session_ready() ready')).ready,false);
    assert.equal((await one("select change_own_pin('948275','572849') result")).result.ok,true);
    await db.exec('reset role');
    await sql('insert into auth.sessions(id,user_id) values($1,$1)',[invited]);
    await login(invited);
    assert.equal((await one('select session_ready() ready')).ready,true);
    assert.equal(Number((await one('select count(id) n from members')).n),1);
    assert.equal((await one('select id from members')).id,memberA.id);
    assert.equal((await one('select info from somiti_settings')).info.name,'First society');
    await denied("select add_notice('Unauthorized','Member cannot write')");
  });
  await pass('direct table writes and caller-supplied cross-society links are rejected',async()=>{
    await login(second);
    assert.equal((await sql('update somiti_settings set info=\'{}\' returning id')).rows.length,0);
    await db.exec('reset role');
    await assert.rejects(()=>sql("insert into sms_logs(somiti_id,recipient_phone,member_id,message) values($1,'01799000066',$2,'cross society')",[b,memberA.id]),/foreign key/);
    const role=await one("select rolcanlogin,rolbypassrls,rolsuper from pg_roles where rolname='amanot_rpc'");
    assert.equal(role.rolcanlogin,false);assert.equal(role.rolbypassrls,false);assert.equal(role.rolsuper,false);
  });
  await pass('legacy global cleanup cannot wipe the multi-society backend',async()=>{
    await assert.rejects(()=>db.exec(fs.readFileSync(path.join(root,'supabase/maintenance/reset-test-data.sql'),'utf8')),/Legacy global reset disabled/);
    await db.exec('rollback');
    assert.equal(Number((await one('select count(*) n from somitis')).n),2);
  });
};
