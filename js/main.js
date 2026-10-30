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
    '.sales__card', '.check__title', '.check li', '.cost > div', '.cases li', '.steps li', '.support li', '.news li', '.form'];
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  groups.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
    el.classList.add('reveal');
    el.style.transitionDelay = [...el.parentNode.children].filter((c) => c.matches(sel)).indexOf(el) * 0.1 + 's';
    io.observe(el);
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

// 가맹 문의 폼: 필수값 확인 (전송 연동은 6단계 Apps Script 작업 때 추가)
(() => {
  const form = document.getElementById('franchiseForm');
  const msg = form.querySelector('.form__msg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = [...form.querySelectorAll('[required]')].find((el) => !el.checkValidity());
    if (bad) {
      msg.textContent = bad.type === 'checkbox' ? '개인정보 수집 · 이용에 동의해 주세요.' : '필수 항목(*)을 입력해 주세요.';
      bad.focus();
      return;
    }
    msg.textContent = '문의 전송은 폼 연동 후 동작합니다.';
  });
})();
