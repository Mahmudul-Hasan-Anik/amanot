const {spawnSync}=require('node:child_process');
const demo=process.argv.includes('--demo');
const result=spawnSync(process.execPath,[require.resolve('expo/bin/cli'),'export','--platform','web','--output-dir',demo?'dist-demo':'dist','--clear'],{
  stdio:'inherit',env:{...process.env,EXPO_PUBLIC_DEMO_MODE:demo?'true':'false'},
});
if(result.error) console.error(result.error.message);
process.exitCode=result.status??1;
