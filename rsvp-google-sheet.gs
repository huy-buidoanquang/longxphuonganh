// Lưu "Xác nhận tham dự" và "Sổ lưu bút" vào Google Sheet, trả danh sách lời chúc cho thiệp.
// 1. Tạo Google Sheet → Tiện ích mở rộng → Apps Script → dán file này vào.
// 2. Triển khai → Tùy chọn triển khai mới → Ứng dụng web, "Bất kỳ ai" được truy cập.
// 3. Chép URL ứng dụng web vào data-endpoint của <form id="rsvp-form"> trong index.html.
// Thêm dấu ' trước giá trị bắt đầu bằng = + - @ để Sheet không chạy nó như công thức
const safe = v => (/^[=+\-@]/.test(v || '') ? "'" : '') + String(v || '').slice(0, 1000);

function sheet(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(header);
  return sh;
}

function doPost(e) {
  const p = e.parameter;
  if (p.type === 'wish') sheet('Lời chúc', ['Thời gian', 'Tên', 'Lời chúc']).appendRow([new Date(), safe(p.name), safe(p.message)]);
  else sheet('Tham dự', ['Thời gian', 'Họ tên', 'Tham dự', 'Số người', 'Lời nhắn']).appendRow([new Date(), safe(p.name), safe(p.attend), safe(p.guests), safe(p.message)]);
  return ContentService.createTextOutput('ok');
}

// Sổ lưu bút: 200 lời chúc mới nhất
function doGet() {
  const rows = sheet('Lời chúc', ['Thời gian', 'Tên', 'Lời chúc']).getDataRange().getValues().slice(1);
  const clean = v => String(v).replace(/^'/, '');
  const out = rows.reverse().slice(0, 200).map(r => ({ time: new Date(r[0]).getTime(), name: clean(r[1]), message: clean(r[2]) }));
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
