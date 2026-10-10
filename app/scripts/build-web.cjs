const {spawnSync}=require('node:child_process');
const demo=process.argv.includes('--demo');
const result=spawnSync(process.execPath,[require.resolve('expo/bin/cli'),'export','--platform','web','--output-dir',demo?'dist-demo':'dist','--clear'],{
  stdio:'inherit',env:{...process.env,EXPO_PUBLIC_DEMO_MODE:demo?'true':'false'},
});
if(result.error) console.error(result.error.message);
if(result.status===0){
  require('node:fs').writeFileSync(require('node:path').join(__dirname,'..',demo?'dist-demo':'dist','preview.html'),
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Amanot app preview</title><style>body{margin:0;min-height:100dvh;background:#363941;display:grid;place-items:center}iframe{width:min(390px,100vw);height:min(844px,100dvh);border:0;background:#f5f2ec}</style></head><body><iframe title="Amanot mobile app preview" src="/"></iframe></body></html>');
}
process.exitCode=result.status??1;
