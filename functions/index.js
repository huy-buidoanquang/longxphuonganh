// Cloudflare Pages Function cho trang chủ "/": sửa thẻ xem trước link (Zalo, Messenger, Facebook đọc HTML, không chạy JS).
// - og:url là đúng link khách nhận, giữ ?nha=gai&to=… (để og:url cố định thì Facebook mở thẻ về link gốc, mất tên khách và bản nhà gái)
// - link ?nha=gai dùng các giá trị data-gai (tiêu đề, mô tả, ảnh của bản nhà gái)
// - có ?to= thì tiêu đề thêm "Thân mời <tên khách>"
export async function onRequest({ request, next }) {
  const res = await next();
  if (request.method !== 'GET' || res.status !== 200 || !(res.headers.get('content-type') || '').startsWith('text/html')) return res;
  const url = new URL(request.url), guest = (url.searchParams.get('to') || '').trim().slice(0, 60);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let html = await res.text();
  if (url.searchParams.get('nha') === 'gai') html = html.replace(/content="[^"]*" data-gai="([^"]*)"/g, 'content="$1"');
  html = html.replace(/(<meta property="og:url" content=")[^"]*/, (_, a) => a + esc(url.href));
  if (guest) html = html.replace(/(<meta property="og:title" content=")/, (_, a) => a + esc(`Thân mời ${guest} · `));
  const headers = new Headers(res.headers);
  headers.delete('content-length'); headers.delete('etag');
  return new Response(html, { status: 200, headers });
}
