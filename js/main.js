const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 메인 영상: 동작 줄이기 설정이면 멈추고 포스터만
if (reduce) document.querySelector('.hero__video').pause();

// 플로팅 버튼: 스크롤 내리면 나타남
(() => {
  const quick = document.querySelector('.quick');
  const on = () => quick.classList.toggle('is-on', scrollY > 300);
  addEventListener('scroll', on, { passive: true }); on();
})();

if (!reduce) {
  // 섹션 공통: 제목·카드 스크롤 진입 시 페이드업, 카드는 0.1초 간격
  const groups = ['.head', '.brand__in', '.story__card', '.points li', '.winwin > *', '.special__title', '.special li',
    '.sales__card', '.check__title', '.check li', '.cost > div', '.cases li', '.steps li', '.support li', '.board', '.form', '.sticker'];
  // 스티커는 시작 위치가 화면 밖이라 직접 감지가 안 됨 → 붙어 있는 섹션이 들어올 때 함께 등장
  const targets = new Map();
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { targets.get(e.target).forEach((el) => el.classList.add('is-in')); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  groups.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
    el.classList.add('reveal');
    el.style.transitionDelay = [...el.parentNode.children].filter((c) => c.matches(sel)).indexOf(el) * 0.1 + 's';
    const t = sel === '.sticker' ? el.parentNode : el;
    if (!targets.has(t)) { targets.set(t, []); io.observe(t); }
    targets.get(t).push(el);
  }));
  // 창업절차 카드는 hover 테두리가 바로 반응하도록 등장 후 지연 제거
  document.querySelectorAll('.steps li').forEach((el) => el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true }));

  // 매출 숫자 카운트업 (1.5초)
  const countIo = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    countIo.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / 1500, 1);
      el.textContent = Math.round(to * (1 - (1 - p) ** 3)).toLocaleString('ko-KR');
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0'; requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => countIo.observe(el));

  // 대표 편지 박스: 살짝 느리게 따라오는 패럴랙스 (PC)
  const letter = document.querySelector('.letter');
  const pc = matchMedia('(min-width: 1200px)');
  let ticking = false;
  const para = () => {
    ticking = false;
    if (!pc.matches) { letter.style.transform = ''; return; }
    const r = letter.getBoundingClientRect();
    const d = r.top + r.height / 2 - innerHeight / 2;
    letter.style.transform = `translateY(${(d * 0.08).toFixed(1)}px)`;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(para); } }, { passive: true });
  para();
}

// 커뮤니티 게시판: 제목을 누르면 같은 섹션에서 본문, '목록 보기'로 복귀
(() => {
  const board = document.querySelector('.board');
  const rows = board.querySelector('.board__rows');
  const pager = board.querySelector('.board__pager');
  const view = board.querySelector('.board__view');
  const list = board.querySelector('.board__list');
  const PER = 10;
  let posts = [], page = 1;

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const note = (text) => { rows.replaceChildren(el('li', 'board__empty', text)); pager.replaceChildren(); };

  const renderList = () => {
    if (!posts.length) return note('등록된 게시물이 없습니다.');
    const pages = Math.ceil(posts.length / PER);
    page = Math.min(page, pages);
    rows.replaceChildren(...posts.slice((page - 1) * PER, page * PER).map((p) => {
      const li = el('li', 'board__row');
      const btn = el('button', 'board__title', p.title);
      btn.type = 'button';
      btn.addEventListener('click', () => open(p));
      li.append(el('span', 'board__tag' + (p.cat === '공지' ? ' is-notice' : ''), p.cat), btn, el('time', 'board__date', p.date));
      return li;
    }));
    pager.replaceChildren();
    if (pages > 1) for (let i = 1; i <= pages; i++) {
      const b = el('button', 'board__page', String(i));
      b.type = 'button';
      if (i === page) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', () => { page = i; renderList(); });
      pager.append(b);
    }
  };

  const top = () => board.closest('section').scrollIntoView({ block: 'start' });
  const open = (p) => {
    view.querySelector('.board__tag').textContent = p.cat;
    view.querySelector('.board__tag').classList.toggle('is-notice', p.cat === '공지');
    view.querySelector('h3').textContent = p.title;
    view.querySelector('time').textContent = p.date;
    view.querySelector('.board__body').textContent = p.body;
    list.hidden = true; view.hidden = false;
    top();
    view.querySelector('h3').focus({ preventScroll: true });
  };
  view.querySelector('.board__back').addEventListener('click', () => {
    view.hidden = true; list.hidden = false;
    top();
    rows.querySelector('button')?.focus({ preventScroll: true });
  });

  api.posts()
    .then((out) => { posts = out.posts || []; renderList(); })
    .catch(() => note('게시물을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
})();

// 가맹 문의 폼: 필수값 확인 후 웹앱으로 전송
(() => {
  // 유입 경로: 처음 들어온 주소의 utm_* 값을 탭이 열려 있는 동안 기억 → 시트 '유입(UTM)' 칸
  const UTM = 'tebatsu-utm';
  const fromUrl = [...new URLSearchParams(location.search)].filter(([k]) => k.startsWith('utm_')).map(([k, v]) => `${k.slice(4)}=${v}`).join(' ');
  let utm = '';
  try { if (fromUrl && !sessionStorage.getItem(UTM)) sessionStorage.setItem(UTM, fromUrl); utm = sessionStorage.getItem(UTM) || ''; } catch { utm = fromUrl; }
  if (!utm && document.referrer && !document.referrer.startsWith(location.origin)) utm = 'ref=' + new URL(document.referrer).hostname;

  const form = document.getElementById('franchiseForm');
  const msg = form.querySelector('.form__msg');
  const btn = form.querySelector('.form__submit');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = [...form.querySelectorAll('[required]')].find((el) => !el.checkValidity());
    if (bad) {
      msg.textContent = bad.type === 'checkbox' ? '개인정보 수집 · 이용에 동의해 주세요.' : '필수 항목(*)을 입력해 주세요.';
      bad.focus();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    delete data.agree;
    data.utm = utm;
    btn.disabled = true;
    msg.textContent = '전송 중입니다…';
    try {
      await api.send('contact', data);
      form.reset();
      msg.textContent = '문의가 접수되었습니다. 빠르게 연락드리겠습니다.';
    } catch {
      msg.textContent = '전송에 실패했습니다. 잠시 후 다시 시도하시거나 010-5419-0401로 연락해 주세요.';
    } finally {
      btn.disabled = false;
    }
  });
})();
