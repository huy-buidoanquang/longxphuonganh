// node ivory/tools/admtest.mjs: kiểm thử mục "Thiệp mẫu Ivory" trong trang quản trị, GitHub API được giả lập (mã truy cập giả, không ghi gì lên GitHub)
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const REPO = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '../..')), OUT = mkdtempSync(join(tmpdir(), 'ivory-admin-test-')); // ảnh chụp, hồ sơ Chrome: thư mục tạm
const sleep = ms => new Promise(r => setTimeout(r, ms));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const f of [join(REPO, p), join(REPO, p, 'index.html')]) { try { const b = readFileSync(f); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); return res.end(b); } catch {} }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port;
const CONTENT_JS = readFileSync(join(REPO, 'content.js'), 'utf8'), INDEX = readFileSync(join(REPO, 'index.html'), 'utf8');
const C0 = JSON.parse(CONTENT_JS.slice(CONTENT_JS.indexOf('{'), CONTENT_JS.lastIndexOf('}') + 1));
const port = 10200 + Math.floor(Math.random() * 90);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(OUT, '.profile')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let tab; for (let i = 0; i < 60 && !tab; i++) { await sleep(250); try { tab = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pend = new Map(), errors = [], calls = []; let treeBody = null;
const reply = (requestId, code, body, ct = 'application/json') => send('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: [{ name: 'content-type', value: ct }, { name: 'access-control-allow-origin', value: '*' }], body: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)).toString('base64') });
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]);
  if (m.method === 'Fetch.requestPaused') {
    const { requestId, request: q } = m.params, u = new URL(q.url), p = u.pathname.replace('/repos/huy-buidoanquang/longxphuonganh', '');
    calls.push(q.method + ' ' + u.pathname);
    if (q.method === 'OPTIONS') return send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: [{ name: 'access-control-allow-origin', value: '*' }, { name: 'access-control-allow-headers', value: '*' }, { name: 'access-control-allow-methods', value: 'GET,POST,PATCH,PUT' }] });
    if (u.host === 'api.vietqr.io') return reply(requestId, 200, { data: [] });
    if (u.host !== 'api.github.com' || u.pathname.includes('longxphuonganh-khach')) return reply(requestId, 404, { message: 'Not Found' });
    if (p === '/git/ref/heads/main') return reply(requestId, 200, { object: { sha: 'testsha' } });
    if (p === '/contents/content.js') return reply(requestId, 200, CONTENT_JS, 'text/plain');
    if (p === '/contents/index.html') return reply(requestId, 200, INDEX, 'text/plain');
    if (p === '/git/commits/testsha') return reply(requestId, 200, { tree: { sha: 't0' } });
    if (p === '/git/trees' && q.method === 'POST') { treeBody = JSON.parse(q.postData); return reply(requestId, 201, { sha: 't1' }); }
    if (p === '/git/commits' && q.method === 'POST') return reply(requestId, 201, { sha: 'c1' });
    if (p === '/git/refs/heads/main' && q.method === 'PATCH') return reply(requestId, 200, { object: { sha: 'c1' } });
    return reply(requestId, 404, { message: 'Not Found' });
  }
});
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
await send('Page.enable'); await send('Runtime.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: 'https://*' }] });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/admin/index.html' }); await sleep(1500);
await ev(`localStorage.setItem('gh-token', JSON.stringify('test-token-khong-that'))`); // mã giả cho bản chạy thử trên máy
await send('Page.reload');
for (let i = 0; i < 40; i++) { await sleep(250); if (await ev(`!!document.querySelector('#editor') && !document.querySelector('#editor').hidden`).catch(() => false)) break; }
const results = []; let fails = 0;
const check = (n, ok, info = '') => { results.push(`${ok ? 'ĐẠT ' : 'LỖI '} ${n}${info ? ' — ' + info : ''}`); if (!ok) fails++; };
const info = await ev(`(() => { const sec = [...document.querySelectorAll('details.sec')].find(d => d.querySelector('summary').textContent.includes('Ivory'));
  const f = sec ? [...sec.querySelectorAll('[data-k]')] : [];
  return { found: !!sec, keys: f.map(e => e.dataset.k), ph: sec?.querySelector('[data-k="ivory.invite"]').placeholder, menusPh: sec?.querySelector('[data-k="ivory.menus"]').placeholder,
    icons: [...document.querySelector('[data-list="trai.schedule"] select').options].map(o => o.value), status: document.querySelector('#status').textContent }; })()`);
check('trang quản trị tải nội dung (GitHub giả lập)', info.status.includes('Chưa có thay đổi'), info.status);
check('có mục "Thiệp mẫu Ivory" với 12 ô', info.found && info.keys.length === 12 && info.keys.every(k => k.startsWith('ivory.')), info.keys.join(','));
check('ô hiện chữ mặc định làm gợi ý (xuống dòng thật)', info.ph === 'Trân trọng\nkính mời!' && info.menusPh === 'Thực đơn thường\nThực đơn chay\nKhông ăn được hải sản', JSON.stringify([info.ph, info.menusPh]));
check('lịch trình có thêm biểu tượng ly rượu, khiêu vũ', JSON.stringify(info.icons) === '["","cake","cook","camera","glass","disco"]', info.icons.join(','));
await ev(`(() => { const set = (k, v) => { const el = document.querySelector('[data-k="' + k + '"]'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  set('ivory.invite', 'Kính mời\\nquý khách!'); set('ivory.menus', 'Cỗ mặn\\nCỗ chay'); })()`);
check('sửa ô Ivory: nút Lưu bật', (await ev(`!document.querySelector('#publish').disabled`)) === true);
await ev(`document.querySelector('#publish').click()`);
for (let i = 0; i < 40 && !(await ev(`document.querySelector('#status').textContent`)).startsWith('Đã lưu'); i++) await sleep(250);
const st = await ev(`document.querySelector('#status').textContent`);
check('bấm Lưu: báo đã lưu', st.startsWith('Đã lưu'), st);
const cjs = treeBody?.tree?.find(t => t.path === 'content.js')?.content || '';
const C1 = cjs ? JSON.parse(cjs.slice(cjs.indexOf('{'), cjs.lastIndexOf('}') + 1)) : {};
check('content.js lưu đúng mục ivory', JSON.stringify(C1.ivory) === JSON.stringify({ invite: 'Kính mời\nquý khách!', menus: 'Cỗ mặn\nCỗ chay' }), JSON.stringify(C1.ivory));
const { ivory, ...rest } = C1;
check('các mục khác của content.js giữ nguyên', JSON.stringify(rest) === JSON.stringify(C0));
check('không lỗi JavaScript', !errors.length, errors.join(' | '));
console.log(results.join('\n')); console.log(`\n${results.length - fails}/${results.length} đạt`);
console.log('gọi API (giả lập):', [...new Set(calls)].join(', '));
ws.close(); chrome.kill(); server.close(); process.exit(fails ? 1 : 0);
