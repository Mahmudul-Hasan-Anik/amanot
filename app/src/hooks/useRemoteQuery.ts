import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router';
import { useAuthStore } from '../features/auth/authStore';
import { useSomitiStore, REMOTE } from '../store/somitiStore';
import { cachedQuery, readQueryCache } from '../lib/queryCache';

/** Results survive navigation; edits/revision changes invalidate their keys. */
export function useRemoteQuery<T>(name: string, load: () => Promise<T>, enabled = true) {
  const focused = useIsFocused();
  const revision = useSomitiStore(s=>`${s.syncRevision}:${s.dataVersion}`);
  const identity = useAuthStore(s=>`${s.currentUser?.id}:${s.actualRole}:${s.isPinVerified}:${s.mustChangePin}`);
  const unlocked = useAuthStore(s=>s.isPinVerified && !s.mustChangePin);
  const key = JSON.stringify(['report',name,revision,identity]);
  const loader = useRef(load); loader.current = load;
  const [retry,setRetry] = useState(0);
  const force = useRef(false);
  const [state,setState] = useState<{key:string;data?:T;error:string|null;loading:boolean}>({key:'',error:null,loading:false});
  const cached = REMOTE && enabled && unlocked ? readQueryCache<T>(key) : undefined;
  useEffect(()=>{
    if (!REMOTE || !enabled || !focused || !unlocked) return;
    const refresh = force.current; force.current = false;
    const saved = !refresh && readQueryCache<T>(key);
    if (saved) { setState({key,data:saved.data,error:null,loading:false}); return; }
    let cancelled = false;
    setState({key,error:null,loading:true});
    cachedQuery(key,()=>loader.current(),refresh).then(
      data=>{if(!cancelled)setState({key,data,error:null,loading:false})},
      error=>{if(!cancelled)setState({key,error:error?.message || String(error),loading:false})});
    return ()=>{cancelled=true};
  },[key,focused,enabled,unlocked,retry]);
  const visible = state.key===key ? state : null;
  return {data:unlocked && enabled ? (cached ? cached.data : visible?.data) : undefined,
    error:cached ? null : visible?.error || null,
    loading:REMOTE && enabled && unlocked && !cached && (!visible || visible.loading),
    reload:()=>{force.current=true;setRetry(n=>n+1)}};
}
