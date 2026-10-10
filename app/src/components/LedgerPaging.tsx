import React from 'react';
import {Text,View} from 'react-native';
import {Button} from './Button';
import {pageStyles as s} from './Page';
import {useLanguage} from '../i18n/useLanguage';
export function LedgerPaging({loading,error,hasMore,loadMore,reload}:{loading:boolean;error:string|null;hasMore:boolean;loadMore:()=>void;reload:()=>void}) {
  const {l}=useLanguage();
  return <View>{loading&&<Text style={s.text}>{l('Loading transactions…','লেনদেন লোড হচ্ছে…')}</Text>}
    {error&&<><Text style={s.text}>{error}</Text><Button title={l('Retry','আবার চেষ্টা করুন')} onPress={reload}/></>}
    {hasMore&&!error&&<Button title={l('Load more transactions','আরও লেনদেন দেখুন')} loading={loading} onPress={loadMore}/>}</View>;
}
