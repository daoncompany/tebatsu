// Apps Script 웹앱 연결 (index.html · staff.html 공용)
// 서버 코드: apps-script/Code.gs
const API_URL = 'https://script.google.com/macros/s/AKfycbweINcQXLUpdsjPNK0Fe5Nym4uJU16chwKFznru1f2frOtATPGCIfE-4MdRPMbm7tuV/exec';

const api = {
  // 게시물 목록 (최신순)
  async posts() {
    const res = await fetch(API_URL + '?action=posts', { cache: 'no-store' });
    return api._read(res);
  },
  // 문의(contact) · 스텝 로그인(login) / 글쓰기(post) / 삭제(delete)
  // text/plain 으로 보내야 CORS 사전요청 없이 Apps Script 에 닿음
  async send(action, data) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...data }),
    });
    return api._read(res);
  },
  async _read(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const out = await res.json();
    if (!out.ok) { const err = new Error(out.error || '요청을 처리하지 못했습니다.'); err.code = out.code; throw err; }
    return out;
  },
};
