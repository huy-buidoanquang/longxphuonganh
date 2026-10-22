// Lưu phản hồi "Xác nhận tham dự" vào Google Sheet.
// 1. Tạo Google Sheet → Tiện ích mở rộng → Apps Script → dán file này vào.
// 2. Triển khai → Tùy chọn triển khai mới → Ứng dụng web, "Bất kỳ ai" được truy cập.
// 3. Chép URL ứng dụng web vào data-endpoint của <form id="rsvp-form"> trong index.html.
const FIELDS = ['name', 'phone', 'side', 'attend', 'guests', 'diet', 'song', 'message'];

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getLastRow() === 0) sheet.appendRow(['Thời gian', 'Họ tên', 'Điện thoại', 'Khách của', 'Tham dự', 'Số người', 'Lưu ý món ăn', 'Bài hát', 'Lời chúc']);
  // Thêm dấu ' trước giá trị bắt đầu bằng = + - @ để Sheet không chạy nó như công thức
  const safe = v => (/^[=+\-@]/.test(v || '') ? "'" : '') + String(v || '').slice(0, 1000);
  sheet.appendRow([new Date()].concat(FIELDS.map(k => safe(e.parameter[k]))));
  return ContentService.createTextOutput('ok');
}
