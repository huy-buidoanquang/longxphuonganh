// Vẽ lại ảnh trang trí thiệp Ivory (ivory/art/*.webp) bằng Chrome không giao diện.
//   node ivory/tools/mkart.mjs                 -> vẽ lại tất cả
//   node ivory/tools/mkart.mjs s3.col,ic.gift  -> chỉ vẽ các ảnh này
// Cách vẽ từng ảnh nằm trong artgen.js (toạ độ theo khung ảnh trong ivory/design.js).
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), OUT = join(ROOT, 'art'), only = process.argv[2] || '';
const server = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try { const b = readFileSync(p); res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' }[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const profile = mkdtempSync(join(tmpdir(), 'ivory-art-')), port = 10300 + Math.floor(Math.random() * 90), sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let tab; for (let i = 0; i < 60 && !tab; i++) { await sleep(250); try { tab = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'lỗi'); return r.result.result.value; };
try {
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/tools/artgen.html` }); await sleep(1500);
  let total = 0;
  for (const k of only ? only.split(',') : await ev('ART_KEYS')) {
    const url = await ev(`renderArt(${JSON.stringify(k)}, 'image/webp', ${k === 'bg.paper' ? 0.8 : 0.86})`);
    const b = Buffer.from(url.split(',')[1], 'base64'); total += b.length;
    writeFileSync(join(OUT, k + '.webp'), b);
    console.log(k.padEnd(14), (b.length / 1024).toFixed(0).padStart(5), 'KB');
  }
  console.log('tổng', (total / 1024).toFixed(0), 'KB');
} finally { ws.close(); chrome.kill(); server.close(); setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(0); }, 500); }
