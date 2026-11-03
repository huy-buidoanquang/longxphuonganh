// Lưu "Xác nhận tham dự" và "Sổ lưu bút" (lời chúc kèm chữ ký) vào Google Sheet, trả danh sách lời chúc cho thiệp.
// 1. Tạo Google Sheet → Tiện ích mở rộng → Apps Script → dán file này vào (thay toàn bộ nội dung cũ).
// 2. Triển khai → Tùy chọn triển khai mới → Ứng dụng web, "Bất kỳ ai" được truy cập.
//    Đã triển khai từ trước: Triển khai → Quản lý triển khai → bút chì → Phiên bản: "Phiên bản mới" → Triển khai (giữ nguyên URL).
// 3. Dán URL ứng dụng web vào ô "Link Google Apps Script" ở trang quản trị (mục "Xác nhận tham dự & lời chúc") rồi bấm Lưu.
// Kiểm thử trên máy (giả lập Google Sheet): node o-liu/tools/gstest.mjs

// Thêm dấu ' trước giá trị bắt đầu bằng = + - @ để Sheet không chạy nó như công thức
const safe = (v, max) => { const s = String(v == null ? '' : v).slice(0, max || 1000); return (/^[=+\-@]/.test(s) ? "'" : '') + s; };
const clean = v => String(v == null ? '' : v).replace(/^'/, '');
const num = (v, lo, hi, d) => { const n = parseFloat(v); return isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 100) / 100)) : d; };
const WISH = ['Thời gian', 'Tên', 'Lời chúc', 'Mã', 'Chữ ký', 'X', 'Y', 'Cỡ', 'Bên', 'Khoá sửa'];

function sheet(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(header);
  else if (sh.getLastColumn() < header.length) sh.getRange(1, 1, 1, header.length).setValues([header]); // sheet cũ chỉ có 3 cột
  return sh;
}

function doPost(e) {
  const p = e.parameter, lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (p.type === 'wish') saveWish(p);
    else sheet('Tham dự', ['Thời gian', 'Họ tên', 'Tham dự', 'Số người', 'Lời nhắn']).appendRow([new Date(), safe(p.name, 100), safe(p.attend, 20), safe(p.guests, 5), safe(p.message, 1000)]);
  } finally { lock.releaseLock(); }
  return ContentService.createTextOutput('ok');
}

// Lời chúc: mã do thiệp tạo. Gửi lại cùng mã kèm đúng khoá sửa (chỉ trình duyệt đã gửi biết) thì sửa dòng cũ;
// mã đã có mà sai/thiếu khoá thì bỏ qua, để không ai sửa được lời chúc của người khác.
function saveWish(p) {
  const sh = sheet('Lời chúc', WISH);
  const id = /^[A-Za-z0-9_-]{1,40}$/.test(p.id || '') ? p.id : 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const key = /^[a-z0-9]{24}$/.test(p.key || '') ? p.key : '';
  const sig = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(p.sig || '') && p.sig.length <= 45000 ? p.sig : '';
  const side = p.side === 'groom' || p.side === 'bride' ? p.side : '';
  const row = [safe(p.name, 100), safe(p.message, 2000), id, sig, num(p.x, 0, 100, 50), num(p.y, 0, 100, 50), num(p.s, 0.5, 2.5, 1.5), side, key];
  const n = sh.getLastRow();
  if (n > 1) {
    const cols = sh.getRange(2, 4, n - 1, 7).getValues(); // cột D..J: Mã … Khoá sửa
    for (let i = cols.length - 1; i >= 0; i--) if (String(cols[i][0]) === id) {
      if (key && String(cols[i][6]) === key) sh.getRange(i + 2, 2, 1, row.length).setValues([row]); // giữ thời gian gửi lần đầu
      return;
    }
  }
  sh.appendRow([new Date()].concat(row));
}

// Sổ lưu bút: 300 lời chúc mới nhất (không trả khoá sửa)
function doGet() {
  const rows = sheet('Lời chúc', WISH).getDataRange().getValues().slice(1);
  const out = rows.reverse().slice(0, 300).map(r => ({
    time: new Date(r[0]).getTime(), name: clean(r[1]), message: clean(r[2]), id: clean(r[3]), sig: String(r[4] || ''),
    x: r[5] === '' ? 50 : +r[5], y: r[6] === '' ? 50 : +r[6], s: r[7] === '' ? 1.5 : +r[7], side: String(r[8] || ''),
  }));
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
