// 메인 영상: 동작 줄이기 설정이면 멈추고 포스터만
if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelector('.hero__video').pause();

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
