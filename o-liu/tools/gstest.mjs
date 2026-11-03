// node o-liu/tools/gstest.mjs: kiểm thử rsvp-google-sheet.gs trên máy với Google Sheet giả lập (không gọi Google)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../rsvp-google-sheet.gs'), 'utf8');

function fakeSheet(rows = []) {
  const sh = {
    rows, getLastRow: () => rows.length, getLastColumn: () => Math.max(0, ...rows.map(r => r.length)),
    appendRow: r => { rows.push([...r]); },
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => rows[r - 1 + i]?.[c - 1 + j] ?? '')),
      setValues: v => v.forEach((row, i) => row.forEach((x, j) => { const R = rows[r - 1 + i] || (rows[r - 1 + i] = []); while (R.length < c - 1 + j) R.push(''); R[c - 1 + j] = x; })),
    }),
    getDataRange: () => ({ getValues: () => { const w = sh.getLastColumn(); return rows.map(r => Array.from({ length: w }, (_, j) => r[j] ?? '')); } }),
  };
  return sh;
}
function load(sheets = {}) {
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = fakeSheet()) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    Date, Math, JSON, String, parseFloat, isFinite,
  };
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  return { ...ctx, sheets };
}
const results = []; let fails = 0;
const check = (n, ok, info = '') => { results.push(`${ok ? 'ĐẠT ' : 'LỖI '} ${n}${info ? ' — ' + info : ''}`); if (!ok) fails++; };
const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
const KEY = 'abcdefghijklmnopqrstuvwx', KEY2 = 'zzzzzzzzzzzzzzzzzzzzzzzz';

const g = load();
g.doPost({ parameter: { type: 'rsvp', name: '=HYPERLINK("x")', attend: 'Có', guests: '2', message: 'Khách nhà trai' } });
const rs = g.sheets['Tham dự'].rows;
check('xác nhận tham dự: thêm một dòng, chặn công thức', rs.length === 2 && rs[1][1] === `'=HYPERLINK("x")` && rs[1][2] === 'Có' && rs[1][3] === '2', JSON.stringify(rs[1]));

g.doPost({ parameter: { type: 'wish', id: 'w1abc', name: 'Lan', message: 'Chúc mừng!', sig: SIG, x: '33.333', y: '120', s: '9', side: 'bride', key: KEY } });
let ws = g.sheets['Lời chúc'].rows;
check('lời chúc: tiêu đề đủ 10 cột', JSON.stringify(ws[0]) === JSON.stringify(['Thời gian', 'Tên', 'Lời chúc', 'Mã', 'Chữ ký', 'X', 'Y', 'Cỡ', 'Bên', 'Khoá sửa']));
check('lời chúc: lưu mã, chữ ký, vị trí (giới hạn 0–100), cỡ (0,5–2,5), bên, khoá', ws.length === 2 && ws[1][3] === 'w1abc' && ws[1][4] === SIG && ws[1][5] === 33.33 && ws[1][6] === 100 && ws[1][7] === 2.5 && ws[1][8] === 'bride' && ws[1][9] === KEY, JSON.stringify(ws[1].slice(1, 4).concat(ws[1].slice(5))));
const t0 = ws[1][0];
let out = JSON.parse(g.doGet().s);
check('đọc lời chúc: trả mã, chữ ký, vị trí, không trả khoá', out.length === 1 && out[0].id === 'w1abc' && out[0].sig === SIG && out[0].x === 33.33 && out[0].s === 2.5 && out[0].side === 'bride' && !JSON.stringify(out).includes(KEY), JSON.stringify({ ...out[0], sig: out[0].sig.length }));

g.doPost({ parameter: { type: 'wish', id: 'w1abc', name: 'Lan', message: 'Sửa lời chúc', sig: SIG, x: '40', y: '50', s: '1.2', side: 'bride', key: KEY } });
ws = g.sheets['Lời chúc'].rows;
check('gửi lại cùng mã + đúng khoá: sửa dòng cũ, giữ thời gian', ws.length === 2 && ws[1][2] === 'Sửa lời chúc' && ws[1][5] === 40 && ws[1][0] === t0, JSON.stringify(ws[1].slice(1, 3)));
g.doPost({ parameter: { type: 'wish', id: 'w1abc', name: 'Kẻ xấu', message: 'Ghi đè', key: KEY2 } });
g.doPost({ parameter: { type: 'wish', id: 'w1abc', name: 'Kẻ xấu', message: 'Ghi đè không khoá' } });
ws = g.sheets['Lời chúc'].rows;
check('cùng mã mà sai hoặc thiếu khoá: không sửa, không thêm', ws.length === 2 && ws[1][2] === 'Sửa lời chúc', JSON.stringify(ws.map(r => r[2])));

g.doPost({ parameter: { type: 'wish', id: 'bad id!"', name: '@cmd', message: 'x'.repeat(2500), sig: 'javascript:alert(1)', x: 'abc', side: 'hacker', key: 'short' } });
ws = g.sheets['Lời chúc'].rows; const last = ws[ws.length - 1];
check('dữ liệu lạ: tự tạo mã, bỏ chữ ký không phải PNG, giá trị mặc định, cắt 2000 ký tự', ws.length === 3 && /^w[a-z0-9]+$/.test(last[3]) && last[1] === "'@cmd" && last[2].length === 2000 && last[4] === '' && last[5] === 50 && last[7] === 1.5 && last[8] === '' && last[9] === '', JSON.stringify([last[1], last[3], last[4], last[5], last[7], last[8], last[9]]));
check('chữ ký quá 45000 ký tự: bỏ', (() => { const h = load(); h.doPost({ parameter: { type: 'wish', id: 'big', name: 'A', message: 'B', sig: 'data:image/png;base64,' + 'A'.repeat(45000) } }); return h.sheets['Lời chúc'].rows[1][4] === ''; })());
out = JSON.parse(g.doGet().s);
check('đọc lời chúc: mới nhất trước', out.length === 2 && out[0].name === '@cmd' && out[1].id === 'w1abc', out.map(w => w.name).join(','));

// sheet cũ (bản trước chỉ có 3 cột) vẫn đọc được và được thêm cột
const old = fakeSheet([['Thời gian', 'Tên', 'Lời chúc'], [new Date('2026-10-01T10:00:00Z'), 'Bình', "'=Chúc"]]);
const o = load({ 'Lời chúc': old });
out = JSON.parse(o.doGet().s);
check('sheet cũ 3 cột: đọc được, tên/lời chúc bỏ dấu \'', out.length === 1 && out[0].name === 'Bình' && out[0].message === '=Chúc' && out[0].id === '' && out[0].sig === '' && out[0].x === 50 && out[0].s === 1.5, JSON.stringify(out[0]));
check('sheet cũ 3 cột: tiêu đề được bổ sung đủ cột', old.rows[0].length === 10 && old.rows[0][9] === 'Khoá sửa');
o.doPost({ parameter: { type: 'wish', id: 'w2', name: 'Chi', message: 'Hạnh phúc', key: KEY } });
check('sheet cũ: thêm lời chúc mới bình thường', old.rows.length === 3 && old.rows[2][3] === 'w2');

console.log(results.join('\n')); console.log(`\n${results.length - fails}/${results.length} đạt`);
process.exit(fails ? 1 : 0);
