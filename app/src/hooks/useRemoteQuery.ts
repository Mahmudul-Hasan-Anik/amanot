import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from 'expo-router';
import { useAuthStore } from '../features/auth/authStore';
import { useSomitiStore, REMOTE } from '../store/somitiStore';

/** Account-scoped, focused-screen queries. Financial results stay in memory. */
export function useRemoteQuery<T>(name: string, load: () => Promise<T>, enabled = true) {
  const focused = useIsFocused();
  const revision = useSomitiStore(s=>`${s.syncRevision}:${s.dataVersion}`);
  const identity = useAuthStore(s=>`${s.currentUser?.id}:${s.actualRole}:${s.isPinVerified}:${s.mustChangePin}`);
  const unlocked = useAuthStore(s=>s.isPinVerified && !s.mustChangePin);
  const key = JSON.stringify([name,revision,identity]);
  const loader = useRef(load); loader.current = load;
  const [retry,setRetry] = useState(0);
  const [state,setState] = useState<{key:string;data?:T;error:string|null;loading:boolean}>({key:'',error:null,loading:false});
  useEffect(()=>{
    if (!REMOTE || !enabled || !focused || !unlocked) return;
    let cancelled = false;
    setState({key,error:null,loading:true});
    loader.current().then(data=>{if(!cancelled)setState({key,data,error:null,loading:false})},error=>{if(!cancelled)setState({key,error:error?.message || String(error),loading:false})});
    return ()=>{cancelled=true};
  },[key,focused,enabled,unlocked,retry]);
  const visible = state.key===key ? state : null;
  return {data:unlocked ? visible?.data : undefined,error:visible?.error || null,
    loading:REMOTE && enabled && unlocked && (!visible || visible.loading),reload:()=>setRetry(n=>n+1)};
}
