/**
 * 테바츠 웹앱 (Google Apps Script)
 * - 가맹 문의 저장(+메일 알림)  - 커뮤니티 게시판 목록/글쓰기/삭제
 *
 * 설치
 * 1) 구글 시트에서 [확장 프로그램 > Apps Script]를 열고 이 파일 내용을 Code.gs 에 붙여넣기
 * 2) [프로젝트 설정 > 스크립트 속성]에 추가
 *      STAFF_PASSWORD  스텝 페이지 비밀번호 (필수)
 *      NOTIFY_EMAIL    문의 알림 받을 메일 (선택, 쉼표로 여러 개)
 * 3) [배포 > 배포 관리 > 수정(연필) > 버전: 새 버전 > 배포]
 *      실행 사용자: 나 / 액세스 권한: 모든 사용자
 *    (새 버전으로 배포해야 /exec 주소가 그대로 유지됩니다)
 *
 * 시트(없으면 자동 생성)
 *   문의:   접수일시 | 이름 | 연락처 | 연락가능 시간대 | 이메일 | 희망 창업 지역 | 내용
 *   게시판: id | 구분 | 제목 | 본문 | 작성일
 */

const TZ = 'Asia/Seoul';
const SHEETS = {
  inquiry: { name: '문의', head: ['접수일시', '이름', '연락처', '연락가능 시간대', '이메일', '희망 창업 지역', '내용'] },
  posts: { name: '게시판', head: ['id', '구분', '제목', '본문', '작성일'] },
};
const TAGS = ['공지', '신규소식'];
const MAX_FAILS = 10; // 10분 동안 비밀번호 10회 틀리면 잠시 잠금

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'posts';
  if (action === 'posts') return json({ ok: true, posts: listPosts() });
  return json({ ok: false, error: '알 수 없는 요청입니다.' });
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: '잘못된 요청입니다.' }); }
  try {
    switch (d.action) {
      case 'inquiry': return json(saveInquiry(d));
      case 'login': checkPassword(d.password); return json({ ok: true });
      case 'create': checkPassword(d.password); return json(createPost(d));
      case 'delete': checkPassword(d.password); return json(deletePost(d.id));
      default: return json({ ok: false, error: '알 수 없는 요청입니다.' });
    }
  } catch (err) {
    return json({ ok: false, error: err.message, code: err.code });
  }
}

/* ── 문의 ── */
function saveInquiry(d) {
  if (d.website) return { ok: true }; // 스팸봇(숨김 칸 입력) 조용히 무시
  const v = (k, n) => String(d[k] || '').trim().slice(0, n || 200);
  const row = [now(), v('name', 50), v('phone', 30), v('callTime', 100), v('email', 100), v('region', 100), v('message', 3000)];
  if (!row[1] || !row[2] || !row[6]) throw fail('필수 항목을 입력해 주세요.');
  withLock(() => append(sheet('inquiry'), row));

  const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (to) {
    try {
      MailApp.sendEmail({
        to: to,
        subject: '[테바츠] 가맹 문의 - ' + row[1],
        body: SHEETS.inquiry.head.map((h, i) => h + ': ' + row[i]).join('\n'),
        replyTo: /^[^@\s]+@[^@\s]+$/.test(row[4]) ? row[4] : undefined,
      });
    } catch (err) { /* 메일 실패해도 문의 저장은 완료 */ }
  }
  return { ok: true };
}

/* ── 게시판 ── */
function listPosts() {
  const sh = sheet('posts');
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, 5).getDisplayValues()
    .filter((r) => r[0])
    .map((r) => ({ id: r[0], tag: r[1], title: r[2], body: r[3], date: r[4] }))
    .reverse(); // 최신 글이 아래 행에 쌓이므로 뒤집어서 최신순
}

function createPost(d) {
  const title = String(d.title || '').trim().slice(0, 120);
  const body = String(d.body || '').trim().slice(0, 20000);
  if (!title || !body) throw fail('제목과 본문을 입력해 주세요.');
  const post = {
    id: Utilities.getUuid().slice(0, 8),
    tag: TAGS.indexOf(d.tag) >= 0 ? d.tag : TAGS[0],
    title: title, body: body,
    date: Utilities.formatDate(new Date(), TZ, 'yyyy.MM.dd'),
  };
  withLock(() => append(sheet('posts'), [post.id, post.tag, post.title, post.body, post.date]));
  return { ok: true, post: post };
}

function deletePost(id) {
  id = String(id || '');
  return withLock(() => {
    const sh = sheet('posts');
    const n = sh.getLastRow() - 1;
    const ids = n > 0 ? sh.getRange(2, 1, n, 1).getDisplayValues() : [];
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === id) { sh.deleteRow(i + 2); return { ok: true }; }
    }
    throw fail('이미 삭제되었거나 없는 게시물입니다.');
  });
}

/* ── 공통 ── */
function checkPassword(pw) {
  const real = PropertiesService.getScriptProperties().getProperty('STAFF_PASSWORD');
  if (!real) throw fail('웹앱에 STAFF_PASSWORD 가 설정되지 않았습니다.');
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= MAX_FAILS) throw fail('비밀번호를 여러 번 틀려 잠시 잠겼습니다. 10분 뒤 다시 시도해 주세요.', 'locked');
  if (String(pw || '') !== real) {
    cache.put('fails', String(fails + 1), 600);
    throw fail('비밀번호가 맞지 않습니다.', 'auth');
  }
}

function sheet(key) {
  const conf = SHEETS[key];
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(conf.name);
  if (!sh) {
    sh = ss.insertSheet(conf.name);
    sh.appendRow(conf.head);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, conf.head.length).setFontWeight('bold');
  }
  return sh;
}

// 모든 칸을 텍스트로 저장 (010… 앞자리 0 유지, =로 시작하는 수식 실행 방지)
function append(sh, row) {
  const r = sh.getLastRow() + 1;
  const safe = row.map((v) => (/^[=+\-@]/.test(v) ? "'" + v : v));
  sh.getRange(r, 1, 1, row.length).setNumberFormat('@').setValues([safe]);
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function now() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function fail(msg, code) { const e = new Error(msg); e.code = code; return e; }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
