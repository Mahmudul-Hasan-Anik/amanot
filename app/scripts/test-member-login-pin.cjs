const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
let cursor=0;const slots=[],shares=[];
const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useRef:v=>{const i=cursor++;return slots[i]??(slots[i]={current:v})},useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],v=>slots[i]=v]}};
const deps={react:{__esModule:true,default:React,...React},'react-native':{Modal:'Modal',View:'View',Text:'Text',ScrollView:'Scroll',Share:{share:async p=>shares.push(p)},StyleSheet:{create:s=>s}},'./Button':{Button:'Button'},'../i18n/useLanguage':{useLanguage:()=>({l:en=>en})},'../theme/colors':{colors:{}},'../theme/typography':{typography:{fontFamily:{}}}};
const exportsFixture={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/components/MemberLoginPin.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports:exportsFixture,require:n=>{if(n in deps)return deps[n];throw Error(n)}});
const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
const member={name:'Fixture',code:'M-001',phone:'01700000000'};
let calls=0,closed=0,finish;let fail=true;const gate=new Promise(resolve=>finish=resolve);
const props={member,onClose:()=>closed++,onIssue:async()=>{calls++;if(fail)throw Error('Connection failed');await gate;return '983725'}};
const render=()=>{cursor=0;return nodes(exportsFixture.MemberLoginPin(props));};
const button=id=>render().find(n=>n.props.testID===id);
async function main(){
 assert.equal(calls,0,'Opening the dialog must not reset a PIN');assert.equal(button('share-member-login-pin'),undefined);
 await button('generate-member-login-pin').props.onPress();assert.equal(calls,1);assert.ok(render().some(n=>n.props.accessibilityRole==='alert'));
 fail=false;const generate=button('generate-member-login-pin').props.onPress,pending=generate();await generate();assert.equal(calls,2,'Double tap only makes one request');assert.equal(button('generate-member-login-pin').props.loading,true);
 render().find(n=>n.type==='Modal').props.onRequestClose();assert.equal(closed,0,'Cannot dismiss during issuance');finish();await pending;
 assert.equal(button('generate-member-login-pin'),undefined);assert.equal(shares.length,0,'Never automatically shares credentials');
 const card=render().find(n=>n.type===exportsFixture.LoginPinCard);assert.equal(card.props.pin,'983725');const pin=nodes(exportsFixture.LoginPinCard(card.props)).find(n=>n.props.testID==='temporary-login-pin');assert.equal(pin.props.selectable,true);assert.equal(pin.props.children[0],'983725');
 await button('share-member-login-pin').props.onPress();assert.ok(shares[0].message.includes(member.phone));assert.ok(shares[0].message.includes('983725'));
 render().find(n=>n.type==='Modal').props.onRequestClose();assert.equal(closed,1);
 console.log('PASS member login PIN: explicit issuance, retry errors, duplicate tap guard, pending close guard, selectable credentials and user-initiated sharing.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
