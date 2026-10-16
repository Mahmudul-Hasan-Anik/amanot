import {useRef,useState} from 'react';
import {Keyboard,ScrollView,View} from 'react-native';

/** Keep error messages beside fields and bring the first invalid field into view. */
export function useFormValidation(){
  const scrollRef=useRef<ScrollView>(null),contentRef=useRef<View>(null);
  const anchors=useRef<Record<string,View|null>>({});
  const [errors,setErrors]=useState<Record<string,string>>({});
  const fieldProps=(key:string)=>({collapsable:false as const,ref:(node:View|null)=>{anchors.current[key]=node;}});
  const clear=(key?:string)=>setErrors(previous=>{if(!key)return {};const next={...previous};delete next[key];return next;});
  const reveal=(key?:string)=>{
    Keyboard.dismiss();
    requestAnimationFrame(()=>{
      const target=key?anchors.current[key]:null;
      if(target&&contentRef.current){
        target.measureLayout(contentRef.current,(_x,y)=>scrollRef.current?.scrollTo({y:Math.max(0,y-16),animated:true}),()=>scrollRef.current?.scrollTo({y:0,animated:true}));
      }else scrollRef.current?.scrollTo({y:0,animated:true});
    });
  };
  const show=(next:Record<string,string>)=>{setErrors(next);reveal(Object.keys(next)[0]);};
  return {scrollRef,contentRef,errors,fieldProps,clear,reveal,show};
}
