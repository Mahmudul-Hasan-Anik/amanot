const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const folder=path.resolve(__dirname,'..',process.argv[2]||'dist');const port=Number(process.argv[3]||8082);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml','.css':'text/css'};
http.createServer((req,res)=>{let file;try{file=path.resolve(folder,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400);res.end();return;}
 if(!file.startsWith(folder+path.sep)&&file!==folder){res.writeHead(403);res.end();return;}
 if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){if(path.extname(file)){res.writeHead(404);res.end();return;}file=path.join(folder,'index.html');}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');
 const stream=fs.createReadStream(file);stream.on('error',()=>{if(!res.headersSent){res.writeHead(503,{'Retry-After':'3'});res.end('Preview is rebuilding. Please refresh shortly.');}else res.destroy();});stream.pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Amanot preview: http://localhost:${port}`));
