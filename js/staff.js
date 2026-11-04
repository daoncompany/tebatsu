// 스텝 페이지: 비밀번호 로그인 → 글쓰기 · 목록에서 삭제
// 비밀번호 확인은 웹앱(서버)이 매 요청마다 함. 브라우저에는 탭을 닫으면 지워지는 sessionStorage에만 보관.
(() => {
  const KEY = 'tebatsu-staff';
  const store = {
    get: () => { try { return sessionStorage.getItem(KEY); } catch { return null; } },
    set: (v) => { try { sessionStorage.setItem(KEY, v); } catch {} },
    clear: () => { try { sessionStorage.removeItem(KEY); } catch {} },
  };
  let password = store.get();

  const $ = (s) => document.querySelector(s);
  const loginForm = $('#loginForm'), writeForm = $('#writeForm'), panel = $('.panel'), logout = $('.staff__logout');
  const list = $('#postList'), listMsg = $('#listMsg');
  const say = (el, text, ok) => { el.textContent = text; el.classList.toggle('is-ok', !!ok); };

  const show = (on) => {
    loginForm.hidden = on; panel.hidden = !on; logout.hidden = !on;
    if (on) load(); else loginForm.password.focus();
  };
  const kick = (text) => {
    password = null; store.clear(); show(false);
    say(loginForm.querySelector('.msg'), text || '다시 로그인해 주세요.');
  };
  const failed = (err, el) => {
    if (err.code === 'auth') return kick('비밀번호가 바뀌었거나 맞지 않습니다. 다시 로그인해 주세요.');
    say(el, err.message && !/^HTTP|fetch/i.test(err.message) ? err.message : '서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  };

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = loginForm.querySelector('.msg'), btn = loginForm.querySelector('button');
    const pw = loginForm.password.value;
    if (!pw) return say(msg, '비밀번호를 입력해 주세요.');
    btn.disabled = true; say(msg, '확인 중…', true);
    try {
      await api.send('login', { password: pw });
      password = pw; store.set(pw); loginForm.reset(); say(msg, '');
      show(true);
    } catch (err) {
      say(msg, err.code === 'auth' || err.code === 'locked' ? err.message : '서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      loginForm.password.select();
    } finally { btn.disabled = false; }
  });

  logout.addEventListener('click', () => kick('로그아웃되었습니다.'));

  writeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = writeForm.querySelector('.msg'), btn = writeForm.querySelector('button');
    const data = Object.fromEntries(new FormData(writeForm));
    data.title = data.title.trim(); data.body = data.body.trim();
    if (!data.title) { writeForm.title.focus(); return say(msg, '제목을 입력해 주세요.'); }
    if (!data.body) { writeForm.body.focus(); return say(msg, '본문을 입력해 주세요.'); }
    btn.disabled = true; say(msg, '등록 중…', true);
    try {
      await api.send('create', { password, ...data });
      writeForm.reset(); say(msg, '등록되었습니다.', true);
      load();
    } catch (err) { failed(err, msg); } finally { btn.disabled = false; }
  });

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  async function load() {
    say(listMsg, '불러오는 중…', true);
    try {
      const { posts = [] } = await api.posts();
      say(listMsg, '');
      if (!posts.length) return list.replaceChildren(el('li', 'slist__empty', '등록된 게시물이 없습니다.'));
      list.replaceChildren(...posts.map((p) => {
        const li = el('li');
        const meta = el('span', 'slist__meta');
        meta.append(el('b', '', p.tag), p.date);
        const del = el('button', 'slist__del', '삭제');
        del.type = 'button';
        del.addEventListener('click', () => remove(p, del));
        li.append(el('span', 'slist__title', p.title), del, meta);
        return li;
      }));
    } catch (err) { failed(err, listMsg); }
  }

  async function remove(p, btn) {
    if (!confirm(`‘${p.title}’ 게시물을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return;
    btn.disabled = true; say(listMsg, '삭제 중…', true);
    try {
      await api.send('delete', { password, id: p.id });
      say(listMsg, '삭제되었습니다.', true);
      load();
    } catch (err) { btn.disabled = false; failed(err, listMsg); }
  }

  $('#reload').addEventListener('click', load);
  show(!!password);
})();
