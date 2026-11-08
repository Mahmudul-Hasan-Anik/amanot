import { useRef, useState } from 'react';
import { Keyboard, ScrollView, View } from 'react-native';

/** Keep error messages beside fields and bring the first invalid field into view. */
export function useFormValidation(){
  const scrollRef=useRef<ScrollView>(null),contentRef=useRef<View>(null);
  const anchors=useRef<Record<string,View|null>>({});
  const [errors,setErrors]=useState<Record<string,string>>({});
  const fieldProps=(key:string)=>({collapsable:false as const,ref:(node:View|null)=>{anchors.current[key]=node;}});
  const clear=(key?:string)=>setErrors(previous=>{if(!key)return {};const next={...previous};delete next[key];return next;});
  const toTop=()=>scrollRef.current?.scrollTo({y:0,animated:true});
  /** Scroll to the highest invalid field on screen (error keys are not in screen order). */
  const reveal=(keys?:string|string[])=>{
    Keyboard.dismiss();
    const list=(Array.isArray(keys)?keys:keys?[keys]:[]).filter(k=>k!=='_form');
    requestAnimationFrame(()=>{
      const content=contentRef.current;
      const targets=list.map(k=>anchors.current[k]).filter((n):n is View=>!!n);
      if(!content||!targets.length){toTop();return;}
      let pending=targets.length,top=Infinity;
      const done=()=>{if(--pending>0)return;if(Number.isFinite(top))scrollRef.current?.scrollTo({y:Math.max(0,top-16),animated:true});else toTop();};
      targets.forEach(t=>t.measureLayout(content,(_x,y)=>{top=Math.min(top,y);done();},done));
    });
  };
  const show=(next:Record<string,string>)=>{setErrors(next);reveal(Object.keys(next));};
  return {scrollRef,contentRef,errors,fieldProps,clear,reveal,show};
}
