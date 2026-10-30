// 메인 슬라이드: 5초 자동 전환 + 점 클릭
(() => {
  const slides = document.querySelectorAll('.hero__slide');
  const dots = document.querySelectorAll('.hero__dots button');
  let cur = 0, timer;
  const go = (i) => {
    slides[cur].classList.remove('is-on'); dots[cur].classList.remove('is-on');
    cur = i % slides.length;
    slides[cur].classList.add('is-on'); dots[cur].classList.add('is-on');
  };
  const play = () => { clearInterval(timer); timer = setInterval(() => go(cur + 1), 5000); };
  dots.forEach((d, i) => d.addEventListener('click', () => { go(i); play(); }));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) play();
})();

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
