import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTransactionPage } from '../lib/api';
import { isSupabaseConfigured } from '../lib/supabase';
import { LedgerFilter, LedgerPage } from '../lib/ledger';
import { useSomitiStore } from '../store/somitiStore';
import { useAuthStore } from '../features/auth/authStore';

export function useLedgerPage(filter:LedgerFilter={},enabled=true) {
  const local=useSomitiStore(s=>s.transactions);
  const revision=useSomitiStore(s=>s.syncRevision);
  const identity=useAuthStore(s=>`${s.currentUser?.id}:${s.actualRole}:${s.isPinVerified}`);
  const unlocked=useAuthStore(s=>s.isPinVerified&&!s.mustChangePin);
  const key=JSON.stringify([filter,enabled,revision,identity,unlocked]);
  const latestKey=useRef(key);latestKey.current=key;
  const [state,setState]=useState<{key:string;page:LedgerPage;loading:boolean;error:string|null}>({key:'',page:{rows:[],hasMore:false,cursor:null},loading:false,error:null});
  const inFlight=useRef<string|null>(null);
  const generation=useRef(0);
  const load=useCallback(async(append=false)=>{
    if(!enabled || !unlocked || !isSupabaseConfigured() || inFlight.current===key)return;
    inFlight.current=key;
    const request=++generation.current;
    setState(s=>({key,page:append&&s.key===key?s.page:{rows:[],hasMore:false,cursor:null},loading:true,error:null}));
    try {
      const page=await fetchTransactionPage(filter,append&&state.key===key?state.page.cursor:null);
      if(latestKey.current!==key||request!==generation.current)return;
      setState(s=>({key,page:{...page,rows:append?[...new Map([...s.page.rows,...page.rows].map(t=>[t.id,t])).values()]:page.rows},loading:false,error:null}));
    } catch(e:any) {
      if(latestKey.current===key&&request===generation.current)setState(s=>({...s,key,loading:false,error:e.message}));
    } finally {if(inFlight.current===key&&request===generation.current)inFlight.current=null;}
  },[key,state.page.cursor,state.key]);
  useEffect(()=>{latestKey.current=key;load();return ()=>{latestKey.current='unmounted';generation.current++;inFlight.current=null;};},[key]);
  if(!isSupabaseConfigured())return {rows:local.filter(t=>(!filter.from||!!t.dateISO&&t.dateISO>=filter.from)&&(!filter.to||!!t.dateISO&&t.dateISO<filter.to)&&(!filter.memberId||t.memberId===filter.memberId)&&(!filter.projectId||t.memberId===filter.projectId)&&(!filter.paidMonth||t.months?.includes(filter.paidMonth))),loading:false,error:null,hasMore:false,loadMore:()=>{},reload:()=>{}};
  const visible=state.key===key?state:null;
  return {rows:unlocked?visible?.page.rows||[]:[],loading:enabled&&unlocked&&(!visible||visible.loading),error:visible?.error||null,hasMore:unlocked&&(visible?.page.hasMore||false),loadMore:()=>load(true),reload:()=>load(false)};
}
