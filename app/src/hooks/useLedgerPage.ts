import { cachedQuery, readQueryCache, writeQueryCache, queryCacheGeneration } from '../lib/queryCache';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTransactionPage } from '../lib/api';
import { isSupabaseConfigured } from '../lib/supabase';
import { LedgerFilter, LedgerPage } from '../lib/ledger';
import { useSomitiStore } from '../store/somitiStore';
import { useAuthStore } from '../features/auth/authStore';

export function useLedgerPage(filter:LedgerFilter={},enabled=true) {
  const focused=useIsFocused();
  const local=useSomitiStore(s=>s.transactions);
  const revision=useSomitiStore(s=>`${s.syncRevision}:${s.dataVersion}`);
  const identity=useAuthStore(s=>`${s.currentUser?.id}:${s.actualRole}:${s.isPinVerified}`);
  const unlocked=useAuthStore(s=>s.isPinVerified&&!s.mustChangePin);
  const key=JSON.stringify(['ledger',filter,revision,identity,unlocked]);
  const latestKey=useRef(key);latestKey.current=key;
  const [state,setState]=useState<{key:string;page:LedgerPage;loading:boolean;error:string|null}>({key:'',page:{rows:[],hasMore:false,cursor:null},loading:false,error:null});
  const inFlight=useRef<string|null>(null);
  const generation=useRef(0);
  const load=useCallback(async(append=false,force=false)=>{
    if(!focused || !enabled || !unlocked || !isSupabaseConfigured() || inFlight.current===key)return;
    inFlight.current=key;
    const request=++generation.current;
    const epoch=queryCacheGeneration();
    setState(s=>({key,page:append&&s.key===key?s.page:{rows:[],hasMore:false,cursor:null},loading:true,error:null}));
    try {
      const previous=append ? readQueryCache<LedgerPage>(key)?.data || (state.key===key?state.page:null) : null;
      const page=append ? await fetchTransactionPage(filter,previous?.cursor) : await cachedQuery(key,()=>fetchTransactionPage(filter),force);
      if(latestKey.current!==key||request!==generation.current||epoch!==queryCacheGeneration())return;
      const merged={...page,rows:append?[...new Map([...(previous?.rows||[]),...page.rows].map(t=>[t.id,t])).values()]:page.rows};
      writeQueryCache(key,merged);
      setState({key,page:merged,loading:false,error:null});
    } catch(e:any) {
      if(latestKey.current===key&&request===generation.current)setState(s=>({...s,key,loading:false,error:e.message}));
    } finally {if(inFlight.current===key&&request===generation.current)inFlight.current=null;}
  },[key,focused,enabled,unlocked,state.page.cursor,state.key]);
  useEffect(()=>{latestKey.current=key;load();return ()=>{latestKey.current='unmounted';generation.current++;inFlight.current=null;};},[key,focused,enabled,unlocked]);
  if(!isSupabaseConfigured())return {rows:local.filter(t=>(!filter.from||!!t.dateISO&&t.dateISO>=filter.from)&&(!filter.to||!!t.dateISO&&t.dateISO<filter.to)&&(!filter.memberId||t.memberId===filter.memberId)&&(!filter.projectId||t.memberId===filter.projectId)&&(!filter.paidMonth||t.months?.includes(filter.paidMonth))),loading:false,error:null,hasMore:false,loadMore:()=>{},reload:()=>{}};
  const saved=unlocked && enabled ? readQueryCache<LedgerPage>(key) : undefined;
  const visible=saved ? {key,page:saved.data,loading:false,error:null} : state.key===key?state:null;
  return {rows:unlocked?visible?.page.rows||[]:[],loading:enabled&&unlocked&&(!visible||visible.loading),error:visible?.error||null,hasMore:unlocked&&(visible?.page.hasMore||false),loadMore:()=>load(true),reload:()=>load(false,true)};
}
