// 테바츠 홈페이지 웹앱 — 가맹 문의 저장·메일 발송 + 테바츠 소식(게시판) 글쓰기·삭제·목록
// 연결된 구글 시트의 확장 프로그램 → Apps Script 에 붙여넣기
// 준비: ⚙ 프로젝트 설정 → 스크립트 속성
//   STAFF_KEY = 스텝 페이지 비밀번호 (글쓰기·삭제용)
//   MAIL_TO   = 문의 알림 받을 메일 (쉼표로 여러 개, 비우면 아래 기본값)
// 배포: 배포 → 새 배포 → 웹 앱, 실행: 나, 액세스: 모든 사용자.
//       코드를 고치면 "배포 관리 → 수정(연필) → 버전: 새 버전 → 배포"까지 해야 반영됨 (주소 유지)
//
// 요청 (사이트 js/api.js)
//   GET  ?action=posts                                   → { ok, posts:[{id,date,cat,title,body}] }
//   POST {action:'contact', name, phone, message, ...}   → { ok }
//   POST {action:'login',  key}                          → { ok }
//   POST {action:'post',   key, cat, title, body}        → { ok, post }
//   POST {action:'delete', key, id}                      → { ok }
//   실패 시 { ok:false, error:'안내 문구', code:'empty|denied|locked|notfound|busy|bad' }
//   본문은 JSON(text/plain) 또는 일반 폼 전송 둘 다 받음

const MAIL_TO_DEFAULT = 'daoncompany4512@gmail.com';
const TZ = 'Asia/Seoul';
const CONTACT_HEAD = ['접수일시', '이름', '연락가능 시간대', '연락처', '이메일', '희망 창업 지역', '내용', '유입(UTM)'];
const POST_TAB = '소식';
const POST_HEAD = ['ID', '작성일', '분류', '제목', '내용'];
const CATS = ['공지', '신규소식'];
const MAX_FAILS = 10;        // 비밀번호 10회 틀리면
const LOCK_SEC = 600;        // 10분 잠금

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'posts') return json({ ok: true, posts: posts() });
  return json(err('bad', '알 수 없는 요청입니다.'));
}

function doPost(e) {
  const p = params(e);
  try {
    switch (p.action || 'contact') {
      case 'contact': return json(contact(p));
      case 'login':   staff(p.key); return json({ ok: true });
      case 'post':    staff(p.key); return json(writePost(p));
      case 'delete':  staff(p.key); return json(deletePost(p));
      default:        return json(err('bad', '알 수 없는 요청입니다.'));
    }
  } catch (x) {
    if (x.code) return json(x);                       // 우리가 던진 안내용 오류
    console.error(x);                                 // 그 밖의 오류는 실행 기록에 남김
    return json(err('server', '일시적인 오류입니다. 잠시 후 다시 시도해 주세요.'));
  }
}

/* ── 가맹 문의: 첫 번째 탭에 한 줄 + 메일 ── */
function contact(p) {
  if (p.website) return { ok: true };                 // 숨김 칸을 채운 스팸봇은 조용히 무시
  const v = (k, n) => String(p[k] == null ? '' : p[k]).trim().slice(0, n);
  const row = [now(), v('name', 50), v('callTime', 100), v('phone', 30), v('email', 100), v('region', 100), v('message', 3000), v('utm', 300)];
  if (!row[1] || !row[3] || !row[6]) throw err('empty', '필수 항목을 입력해 주세요.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  locked(() => append(head(ss.getSheets()[0], CONTACT_HEAD), row));

  // 메일은 잠금 밖에서. 실패해도 시트 저장은 끝났으니 접수 성공으로 응답
  try {
    const to = prop('MAIL_TO') || MAIL_TO_DEFAULT;
    const body = CONTACT_HEAD.map((h, i) => `${h}: ${row[i] || '-'}`).join('\n') + '\n\n시트: ' + ss.getUrl();
    MailApp.sendEmail({ to, subject: `[테바츠 가맹문의] ${row[1]} / ${row[3]}`, body, replyTo: isMail(row[4]) ? row[4] : undefined });
  } catch (x) {
    console.error('메일 발송 실패', x);
  }
  return { ok: true };
}

/* ── 소식 게시판 ── */
function posts() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(POST_TAB);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, POST_HEAD.length).getDisplayValues()
    .filter((r) => r[0] && r[3])                      // 빈 줄·손으로 지우다 남은 줄 제외
    .map(([id, date, cat, title, body]) => ({ id, date, cat: CATS.indexOf(cat) < 0 ? '신규소식' : cat, title, body }))
    .reverse();                                       // 최신 글이 위로
}

function writePost(p) {
  const title = String(p.title || '').trim().slice(0, 120);
  const body = String(p.body || '').trim().slice(0, 20000);
  if (!title || !body) throw err('empty', '제목과 본문을 입력해 주세요.');
  const post = {
    id: Utilities.getUuid().slice(0, 8),
    date: Utilities.formatDate(new Date(), TZ, 'yyyy.MM.dd'),
    cat: CATS.indexOf(p.cat) < 0 ? '신규소식' : p.cat,
    title, body,
  };
  locked(() => append(postSheet(), [post.id, post.date, post.cat, post.title, post.body]));
  return { ok: true, post };
}

function deletePost(p) {
  const id = String(p.id || '');
  return locked(() => {
    const sh = postSheet();
    const n = sh.getLastRow() - 1;
    const ids = n > 0 ? sh.getRange(2, 1, n, 1).getDisplayValues().map((r) => r[0]) : [];
    const i = id ? ids.indexOf(id) : -1;
    if (i < 0) throw err('notfound', '이미 삭제되었거나 없는 게시물입니다.');
    sh.deleteRow(i + 2);
    return { ok: true };
  });
}

/* ── 도구 ── */
// 비밀번호 확인 + 연속 실패 잠금
function staff(k) {
  const key = prop('STAFF_KEY');
  if (!key) throw err('denied', '웹앱에 STAFF_KEY 가 설정되지 않았습니다.');
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('staffFails') || 0);
  if (fails >= MAX_FAILS) throw err('locked', '비밀번호를 여러 번 틀려 잠겼습니다. 10분 뒤 다시 시도해 주세요.');
  if (String(k || '') !== key) {
    cache.put('staffFails', String(fails + 1), LOCK_SEC);
    throw err('denied', '비밀번호가 맞지 않습니다.');
  }
}

// JSON 본문(text/plain) · 폼 전송 모두 지원
function params(e) {
  const p = Object.assign({}, (e && e.parameter) || {});
  const raw = e && e.postData && e.postData.contents;
  if (raw && /^\s*\{/.test(raw)) { try { Object.assign(p, JSON.parse(raw)); } catch (x) {} }
  return p;
}

function postSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return head(ss.getSheetByName(POST_TAB) || ss.insertSheet(POST_TAB), POST_HEAD);
}

// 탭이 비어 있으면 1행에 제목줄
function head(sh, h) {
  if (sh.getLastRow() > 0) return sh;
  sh.appendRow(h);
  sh.getRange(1, 1, 1, h.length).setFontWeight('bold').setBackground('#1f1f1f').setFontColor('#ccac78');
  sh.setFrozenRows(1);
  return sh;
}

// 한 줄 추가: 모든 칸을 텍스트로 (01012345678 → 1012345678 숫자 변환 방지) + 수식 주입 방지
function append(sh, row) {
  const r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, row.length).setNumberFormat('@').setValues([row.map(safe)]);
}
// =,+,-,@ 로 시작하면 앞에 ' 를 붙여 수식으로 실행되지 않게
function safe(v) {
  v = String(v == null ? '' : v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

// 시트 쓰기만 잠금 (메일 발송 등은 밖에서)
function locked(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw err('busy', '요청이 몰려 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  try { return fn(); } finally { lock.releaseLock(); }
}

function prop(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function err(code, error) { return { ok: false, code, error }; }
function isMail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')); }
function now() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'); }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
