'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1] || process.env.PORT || 5188);
if (!Number.isInteger(port) || port < 1 || port > 65535) { console.error('请输入有效端口，例如 node serve.js --port 5188'); process.exit(1); }
const assets = new Set(['index.html','styles.css','core.js','execution.js','app.js','sw.js','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png']);
const types = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png' };
const server = http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{Allow:'GET, HEAD'}); return res.end(); }
  let file;
  try { file = decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1) || 'index.html'; } catch { res.writeHead(400); return res.end('Bad request'); }
  if (!assets.has(file)) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(__dirname,file),(error,data) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});
server.on('error',error => { console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用，请改用 node serve.js --port 5189` : error.message); process.exit(1); });
server.listen(port,'0.0.0.0',() => {
  console.log('\n  一点 · 每天向前一点\n');
  console.log(`  电脑预览：http://localhost:${port}`);
  const interfaces = Object.entries(os.networkInterfaces()).sort(([a],[b]) => Number(/WLAN|Wi-Fi|无线/i.test(b))-Number(/WLAN|Wi-Fi|无线/i.test(a)));
  for (const [name,group] of interfaces) for (const net of group || []) if (net.family === 'IPv4' && !net.internal) console.log(`  手机访问（${name}）：http://${net.address}:${port}`);
  console.log('\n  手机和电脑连接同一个 Wi-Fi，优先使用 WLAN / Wi-Fi 对应的地址。');
  console.log('  如系统询问网络访问，只需允许可信的专用网络。');
  console.log('  局域网访问需要电脑保持运行。按 Ctrl+C 停止。\n');
});
