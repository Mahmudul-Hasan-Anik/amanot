import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Button } from './Button';
import { useLanguage } from '../i18n/useLanguage';
import { REMOTE } from '../store/somitiStore';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export function RemoteDataState({query,children,enabled=true}:{query:{data:unknown;loading:boolean;error:string|null;reload:()=>void};children:React.ReactNode;enabled?:boolean}) {
  const { l } = useLanguage();
  if (REMOTE && enabled && (query.loading || query.error || query.data===undefined)) return <View style={{flex:1,justifyContent:'center',padding:24,gap:12}}>
    {query.error ? <><Text style={{color:colors.danger,fontFamily:typography.fontFamily.regular}}>{l('Could not load these records. Try again.','এই তথ্য আনা যায়নি। আবার চেষ্টা করুন।')}</Text><Button title={l('Retry','আবার চেষ্টা করুন')} onPress={query.reload}/></> : <ActivityIndicator color={colors.primary} />}
  </View>;
  return <>{children}</>;
}
