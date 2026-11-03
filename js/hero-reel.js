// 히어로 쇼릴 오버랩: showreel/src/template.html 의 15초 모션그래픽을 바탕 없이 홍보영상 위에 얹음
(async () => {
const hero = document.querySelector('.hero'), reel = hero && hero.querySelector('.reel');
if (!reel) return;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SVG = {};
await Promise.all([['teba', 'images/TEBA.svg'], ['tsu', 'images/Tsu.svg']].map(async ([k, u]) => { SVG[k] = await (await fetch(u)).text(); }));
await document.fonts.ready;
const stage = reel.querySelector('.reel__stage'), scenesEl = reel.querySelector('.reel__scenes');

/* ───────── 기본 도구 ───────── */
const D = 15, FPS = 24, W = 1920, H = 1080;
const C = '#F1F1F1', K = C, R = '#B32A2D';   // 영상 위에 얹으므로 선·글자는 모두 크림, 포인트만 레드
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t, a, b) => cl((t - a) / (b - a));                    // 구간 진행률 0→1
const L = (a, b, k) => a + (b - a) * k;
const eo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);           // expo out
const ei = x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10);           // expo in
const eio = x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
const bo = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };  // back out
const qo = x => 1 - Math.pow(1 - x, 4);
const $ = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstElementChild; };
const brush = (id, w) => {
  const t = SVG[id];
  const vb = t.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const h = w * vb[3] / vb[2];
  return { html: t.replace('<svg', `<svg class="brush" width="${w}" height="${h}"`), h };
};

/* 방향성 모션 블러: 요소마다 전용 SVG 필터, 프레임 이동량으로 세기 결정 */
const fx = reel.querySelector('defs'); let fxN = 0;
function blurOf(el) {
  if (!el._fb) {
    const id = 'mb' + (fxN++);
    fx.insertAdjacentHTML('beforeend', `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter>`);
    el._fb = { id, g: fx.lastElementChild.firstElementChild, on: false };
  }
  return el._fb;
}
function mb(el, dx, dy) {
  const sx = Math.min(42, Math.abs(dx) * .5), sy = Math.min(42, Math.abs(dy) * .5);
  if (sx < .4 && sy < .4) { if (el._fb && el._fb.on) { el.style.filter = 'none'; el._fb.on = false; } return; }
  const f = blurOf(el);
  f.g.setAttribute('stdDeviation', `${sx.toFixed(1)} ${sy.toFixed(1)}`);
  if (!f.on) { el.style.filter = `url(#${f.id})`; f.on = true; }
}
/* 위치 함수 f(t) → {x,y,s,sx,sy,r,o}. 직전 프레임과의 차이로 블러까지 자동 */
function A(el, f, t, blur = true) {
  const p = f(t), q = blur ? f(t - 1 / 60) : p;
  const x = p.x || 0, y = p.y || 0;
  el.style.transform = `translate3d(${x}px,${y}px,0) scale(${p.sx ?? p.s ?? 1},${p.sy ?? p.s ?? 1}) rotate(${p.r || 0}deg)`;
  el.style.opacity = p.o ?? 1;
  if (blur) mb(el, x - (q.x || 0), y - (q.y || 0));
}

/* ───────── 장면 ───────── */
const scenes = [];
const S = (start, end, theme, build) => {
  const root = $(`<div class="sc ${theme}"></div>`);
  scenesEl.appendChild(root);
  const add = (h) => { const e = $(h); root.appendChild(e); return e; };
  const render = build(add, root);
  scenes.push({ start, end, theme, root, render });
};
const vticks = (x, y, h, step, big, len = 8, bigLen = 18) => {
  let s = ''; for (let i = 0, n = Math.round(h / step); i <= n; i++)
    s += `<div class="hl" style="left:${x}px;top:${y + i * step}px;width:${i % big ? len : bigLen}px;height:1px"></div>`;
  return s;
};
const ticks = (x, y, w, step, big, len = 8, bigLen = 18, cls = '') => {
  let h = ''; for (let i = 0, n = Math.round(w / step); i <= n; i++)
    h += `<div class="hl ${cls}" style="left:${x + i * step}px;top:${y}px;width:1px;height:${i % big ? len : bigLen}px"></div>`;
  return h;
};

/* 01 ─ ORIGIN (크림) : 첫 프레임부터 화면을 채우는 テバツ */
S(0, 2.1, 'cream', (add) => {
  const tb = brush('teba', 1320), ts = brush('tsu', 420);
  const teba = add(`<div class="a">${tb.html}</div>`);
  const tsu = add(`<div class="a">${ts.html}</div>`);
  const grid = add(`<div class="a" style="width:1920px;height:1080px">
      <div class="hl" style="left:120px;top:772px;width:1680px;height:1px"></div>
      ${ticks(120, 772, 1680, 20, 5, 6, 16)}
      <div class="dot-v" style="left:1336px;top:120px;height:600px"></div></div>`);
  const lab = add(`<div class="a m" style="left:120px;top:96px">SC.01 — ORIGIN<br><span style="opacity:1">テバ + ツ / 2026</span></div>`);
  const lab2 = add(`<div class="a m" style="left:1480px;top:96px">TEBATSU<br>JAPANESE KITCHEN</div>`);
  const word = [...'테바츠'].map((ch, i) => add(`<div class="a g" style="font-size:200px;left:${120 + i * 186}px;top:820px">${ch}</div>`));
  const serif = add(`<div class="mask" style="left:760px;top:836px;width:900px;height:80px"><div class="a s" style="font-size:66px">a small Japan, in one bowl.</div></div>`);
  const sl = serif.firstElementChild;
  const mono = add(`<div class="a m" style="left:762px;top:930px">EST. PYEONGTAEK — KR &nbsp;·&nbsp; 1 OWNER / 1 KITCHEN</div>`);
  const seal = add(`<div class="seal" style="left:1680px;top:836px;width:120px;height:120px;font:900 64px/1 'Pretendard Variable'">テ</div>`);
  return (t) => {
    A(teba, t => ({ x: L(60, -40, eo(P(t, 0, 2.1))) + L(-260, 0, eo(P(t, 0, .55))), y: 150, s: L(1.12, 1, eo(P(t, 0, .7))) }), t);
    A(tsu, t => ({ x: L(1560, 1380, eo(P(t, 0, .6))) - L(0, 20, P(t, .6, 2.1)), y: 190 + L(-70, 0, eo(P(t, 0, .6))) }), t);
    A(grid, t => ({ sx: 1, o: 1 }), t, false);
    word.forEach((w, i) => A(w, t => { const k = eo(P(t, .08 + i * .07, .5 + i * .07)); return { x: L(1500, 0, k), o: k > 0 ? 1 : 0 }; }, t));
    A(sl, t => ({ y: L(90, 0, eo(P(t, .5, 1.0))) }), t);
    A(mono, t => ({ o: P(t, .75, .95) > 0 ? (Math.floor(t * 30) % 2 || t > .95 ? 1 : 0) : 0 }), t, false);
    A(seal, t => { const k = P(t, .62, 1.0); return { s: k ? bo(k) : 0, r: L(-24, 0, eo(k)) }; }, t, false);
  };
});

/* 02 ─ WARMTH (먹) : 좌우로 휘몰아치는 세 단어 */
S(2.1, 4.4, 'ink', (add) => {
  add(`<div class="a" style="width:1920px;height:1080px">
      <div class="dot-h" style="left:120px;top:400px;width:1040px"></div>
      <div class="dot-h" style="left:120px;top:660px;width:1040px"></div>
      ${vticks(1236, 150, 780, 30, 5, 6, 14)}</div>`);
  const vline = add(`<div class="hl" style="left:1236px;top:150px;width:1px;height:780px;transform-origin:0 0"></div>`);
  const w = ['온기가', '머무는', '곳'].map((s, i) => add(`<div class="a g" style="font-size:236px;left:120px;top:${150 + i * 260}px">${s}</div>`));
  const dot = add(`<div class="a" style="left:400px;top:820px;width:56px;height:56px;border-radius:50%;background:${R}"></div>`);
  const lab = add(`<div class="a m" style="left:1290px;top:150px">SC.02 — WARMTH<br>온기 / 溫氣</div>`);
  const sm = add(`<div class="mask" style="left:1290px;top:620px;width:560px;height:150px"><div class="a s" style="font-size:66px;line-height:1.05">where warmth<br>lingers.</div></div>`);
  const sml = sm.firstElementChild;
  const kr = add(`<div class="a m kr" style="left:1290px;top:820px;font-size:22px;line-height:1.55">마음을 담아내는 한 그릇,<br>지친 일상에 잠시 쉬어가는 나루터.</div>`);
  return (t) => {
    vline.style.transform = `scaleY(${eo(P(t, .05, .7))})`;
    const dir = [1, -1, 1];
    w.forEach((el, i) => A(el, t => { const a = i * .13, k = eo(P(t, a, a + .4)); return { x: dir[i] * L(i ? 2100 : 1500, 0, k) + L(0, -26, P(t, a + .4, 2.3)) }; }, t));  // 첫 단어만 화면 안에서 출발(빈 프레임 방지)
    A(dot, t => { const k = P(t, .62, .92); return { s: k ? bo(k) : 0 }; }, t, false);
    A(lab, t => ({ o: 1 }), t, false);
    A(sml, t => ({ y: L(160, 0, eo(P(t, .7, 1.2))) }), t);
    A(kr, t => ({ y: L(24, 0, eo(P(t, .95, 1.4))), o: eo(P(t, .95, 1.4)) }), t, false);
  };
});

/* 03 ─ SALES (크림) : 0 → 2,100 카운트, 눈금자 위 마커 */
S(4.4, 6.9, 'cream', (add) => {
  const lab = add(`<div class="a m" style="left:120px;top:96px">SC.03 — MONTHLY SALES<br><span class="kr">본점 · 17평 · 1인 매장</span></div>`);
  const num = add(`<div class="a g red" style="font-size:400px;left:104px;top:196px;font-variant-numeric:tabular-nums;letter-spacing:-0.055em">0</div>`);
  const unit = add(`<div class="a g" style="font-size:120px;left:1380px;top:440px">만원</div>`);
  const sr = add(`<div class="mask" style="left:1386px;top:226px;width:440px;height:160px"><div class="a s" style="font-size:60px;line-height:1.05">word of mouth.<br>no ads.</div></div>`);
  const srl = sr.firstElementChild;
  const RX = 120, RW = 1680, MAX = 2400;
  let rh = `<div class="hl" style="left:${RX}px;top:700px;width:${RW}px;height:1px"></div>`;
  for (let v = 0; v <= MAX; v += 50) {
    const x = RX + RW * v / MAX, big = v % 500 === 0;
    rh += `<div class="hl" style="left:${x}px;top:${big ? 684 : 692}px;width:1px;height:${big ? 16 : 8}px"></div>`;
    if (big) rh += `<div class="m" style="position:absolute;left:${x + 6}px;top:662px;font-size:12px">${v.toLocaleString()}</div>`;
  }
  const ruler = add(`<div class="a" style="width:1920px;height:1080px;transform-origin:120px 700px">${rh}</div>`);
  const mk = add(`<div class="a" style="width:0;height:0"><div style="position:absolute;left:-9px;top:-18px;width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:14px solid ${K}"></div><div class="hl" style="left:0;top:-4px;width:1px;height:40px"></div></div>`);
  const cols = [['DAILY AVG.', '80만'], ['NET / MONTH', '800만'], ['PEAK MONTH', '2,400만']].map(([l, v], i) =>
    add(`<div class="a" style="left:${120 + i * 572}px;top:800px"><div class="m">${String(i + 1).padStart(2, '0')} — ${l}</div><div class="g" style="font-size:96px;margin-top:20px">${v}</div></div>`));
  const seps = [1, 2].map(i => add(`<div class="hl" style="left:${120 + i * 572 - 40}px;top:800px;width:1px;height:150px;transform-origin:0 0"></div>`));
  return (t) => {
    const k = eo(P(t, .1, 1.15)), v = Math.round(2100 * k);
    num.textContent = v.toLocaleString();
    A(num, t => ({ y: L(60, 0, eo(P(t, 0, .4))) }), t);
    A(unit, t => ({ x: L(300, 0, eo(P(t, .9, 1.3))), o: P(t, .9, .95) }), t);
    A(srl, t => ({ y: L(170, 0, eo(P(t, .35, .85))) }), t);
    A(ruler, t => ({ sx: eo(P(t, 0, .6)) }), t, false);
    A(mk, t => ({ x: RX + RW * (2100 * eo(P(t, .1, 1.15))) / MAX, y: 700 }), t);
    cols.forEach((c, i) => A(c, t => { const k = eo(P(t, 1.2 + i * .1, 1.65 + i * .1)); return { y: L(140, 0, k), o: k ? 1 : 0 }; }, t));
    seps.forEach((s, i) => s.style.transform = `scaleY(${eo(P(t, 1.25 + i * .1, 1.7 + i * .1))})`);
  };
});

/* 04 ─ ONE (먹) : 거대한 1, 붉은 원이 그려진다 */
S(6.9, 9.0, 'ink', (add) => {
  const one = add(`<div class="a g" style="font-size:1120px;left:130px;top:-20px;letter-spacing:-0.08em;line-height:1">1</div>`);
  const ring = add(`<svg class="ov" width="1920" height="1080"><circle cx="420" cy="560" r="400" fill="none" stroke="${R}" stroke-width="5" pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="1000" transform="rotate(-90 420 560)"/></svg>`);
  const circ = ring.querySelector('circle');
  const lab = add(`<div class="a m" style="left:1000px;top:96px">SC.04 — ONE OWNER / ONE KITCHEN</div>`);
  const lines = ['점주 혼자.', '작은 매장.', '낮은 위험.'].map((s, i) => {
    const m = add(`<div class="mask" style="left:1000px;top:${240 + i * 190}px;width:820px;height:170px"><div class="a g" style="font-size:150px;top:8px">${s}</div></div>`);
    add(`<div class="dot-h" style="left:1000px;top:${240 + i * 190 + 176}px;width:800px"></div>`);
    return m.firstElementChild;
  });
  const mono = add(`<div class="a m" style="left:1000px;top:840px">14–17 PY &nbsp;·&nbsp; RENT 100–150 &nbsp;·&nbsp; HALL FIRST, DELIVERY BONUS</div>`);
  const sr = add(`<div class="a s" style="font-size:58px;left:1000px;top:900px">one owner, one kitchen.</div>`);
  return (t) => {
    A(one, t => ({ s: L(1.35, 1, eo(P(t, 0, .55))), x: L(-160, 0, eo(P(t, 0, .55))) }), t);
    circ.setAttribute('stroke-dashoffset', 1000 * (1 - qo(P(t, .3, 1.1))));
    ring.style.transform = `rotate(${L(0, 8, P(t, .3, 2.1))}deg)`; ring.style.transformOrigin = '420px 560px';
    A(lab, t => ({ o: t > .15 ? 1 : 0 }), t, false);
    lines.forEach((l, i) => A(l, t => ({ y: L(190, 0, eo(P(t, .3 + i * .14, .72 + i * .14))) }), t));
    A(mono, t => ({ o: t > 1.0 ? 1 : 0 }), t, false);
    A(sr, t => ({ x: L(-60, 0, eo(P(t, 1.05, 1.5))), o: eo(P(t, 1.05, 1.5)) }), t);
  };
});

/* 05 ─ STEPS (크림) : 9단계 필름스트립이 휙 지나간다 */
S(9.0, 11.3, 'cream', (add) => {
  const steps = [['가맹상담', '본사 · 매장 방문'], ['점포개발', '상권 · 입지 분석'], ['가맹계약', '본계약 체결'], ['점포계약', '실측 · 서류 검토'], ['인테리어', '현장관리 · 간판'], ['점주교육', '서비스 · 조리'], ['물류공급', '본사 미팅'], ['시범운영', '오픈 최종점검'], ['입고 · 오픈', '본사 대표 파견']];
  const CW = 640;
  const strip = add(`<div class="a" style="top:250px">${steps.map(([n, d], i) => `
      <div style="position:absolute;left:${i * CW}px;top:0;width:${CW - 40}px;height:400px;border:1px solid ${K}">
        <div class="m" style="position:absolute;left:28px;top:22px">STEP ${String(i + 1).padStart(2, '0')}</div>
        <div class="m" style="position:absolute;right:28px;top:22px">${String(i + 1).padStart(2, '0')}/09</div>
        <div class="g" style="position:absolute;left:24px;top:150px;font-size:118px">${n}</div>
        <div class="m kr" style="position:absolute;left:30px;bottom:26px;font-size:22px">${d}</div>
      </div>`).join('')}</div>`);
  const lab = add(`<div class="a m" style="left:120px;top:96px">SC.05 — OPENING GUIDE<br>9 STEPS / 0 GUESSWORK</div>`);
  const TX = 120, TW = 1680;
  let th = `<div class="hl" style="left:${TX}px;top:760px;width:${TW}px;height:1px"></div>`;
  for (let i = 0; i < 9; i++) { const x = TX + TW * i / 8; th += `<div class="hl" style="left:${x}px;top:752px;width:1px;height:17px"></div><div class="m" style="position:absolute;left:${x - 10}px;top:776px;font-size:12px">${String(i + 1).padStart(2, '0')}</div>`; }
  add(`<div class="a" style="width:1920px;height:1080px">${th}</div>`);
  const dot = add(`<div class="a" style="width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:${R}"></div>`);
  const sr = add(`<div class="a s" style="font-size:60px;left:120px;top:850px">from the first call to the first bowl.</div>`);
  const big = add(`<div class="mask" style="left:860px;top:200px;width:960px;height:520px"><div class="a g" style="font-size:560px;top:-10px;left:60px;letter-spacing:-0.06em">09</div></div>`).firstElementChild;
  const bigL = add(`<div class="a m" style="left:1560px;top:736px;text-align:right">FINAL STEP — OPEN</div>`);
  const pos = t => eio(P(t, .15, 1.55));                         // 0 → 1 (STEP01 → STEP09)
  return (t) => {
    A(strip, t => ({ x: TX - pos(t) * CW * 8 + L(260, 0, eo(P(t, 0, .3))) }), t);
    A(dot, t => ({ x: TX + TW * pos(t), y: 760 }), t);
    A(sr, t => ({ y: L(50, 0, eo(P(t, 1.5, 1.9))), o: eo(P(t, 1.5, 1.9)) }), t);
    A(big, t => ({ y: L(560, 0, eo(P(t, 1.45, 1.9))) }), t);
    A(bigL, t => ({ o: t > 1.75 ? 1 : 0 }), t, false);
  };
});

/* 06 ─ NAME (먹) : テバ(방주) + ツ(나루터) */
S(11.3, 13.3, 'ink', (add) => {
  const tb = brush('teba', 900), ts = brush('tsu', 330);
  const teba = add(`<div class="a">${tb.html}</div>`);
  const tsu = add(`<div class="a">${ts.html}</div>`);
  const plus = add(`<div class="a g red" style="font-size:220px;left:1105px;top:240px">+</div>`);
  const dims = add(`<div class="a" style="width:1920px;height:1080px">
      <div class="hl" style="left:120px;top:150px;width:900px;height:1px"></div>
      <div class="hl" style="left:120px;top:142px;width:1px;height:17px"></div><div class="hl" style="left:1019px;top:142px;width:1px;height:17px"></div>
      <div class="m" style="position:absolute;left:120px;top:112px">TEBA — HEBREW / תֵּבָה</div>
      <div class="hl" style="left:1380px;top:150px;width:420px;height:1px"></div>
      <div class="hl" style="left:1380px;top:142px;width:1px;height:17px"></div><div class="hl" style="left:1799px;top:142px;width:1px;height:17px"></div>
      <div class="m" style="position:absolute;left:1380px;top:112px">TSU — JAPANESE / 津</div>
      <div class="dot-h" style="left:120px;top:760px;width:1680px"></div></div>`);
  const k1 = add(`<div class="mask" style="left:120px;top:640px;width:900px;height:120px"><div class="a g" style="font-size:112px;top:6px">방주</div></div>`).firstElementChild;
  const s1 = add(`<div class="a s" style="font-size:58px;left:120px;top:800px">the ark — a vessel that keeps.</div>`);
  const k2 = add(`<div class="mask" style="left:1380px;top:640px;width:440px;height:120px"><div class="a g" style="font-size:112px;top:6px">나루터</div></div>`).firstElementChild;
  const s2 = add(`<div class="a s" style="font-size:58px;left:1380px;top:800px">the ferry.</div>`);
  return (t) => {
    A(teba, t => ({ x: L(-1100, 120, eo(P(t, .02, .45))) + L(0, 24, P(t, .45, 2)), y: 220 }), t);
    A(tsu, t => ({ x: L(2300, 1420, eo(P(t, .1, .52))) - L(0, 24, P(t, .52, 2)), y: 196 }), t);
    A(plus, t => { const k = P(t, .48, .78); return { s: k ? bo(k) : 0, r: L(90, 0, eo(k)) }; }, t, false);
    A(dims, t => ({ o: t > .3 ? 1 : 0 }), t, false);
    A(k1, t => ({ y: L(130, 0, eo(P(t, .6, 1.0))) }), t);
    A(k2, t => ({ y: L(130, 0, eo(P(t, .72, 1.12))) }), t);
    A(s1, t => ({ y: L(40, 0, eo(P(t, .95, 1.35))), o: eo(P(t, .95, 1.35)) }), t);
    A(s2, t => ({ y: L(40, 0, eo(P(t, 1.05, 1.45))), o: eo(P(t, 1.05, 1.45)) }), t);
  };
});

/* 07 ─ END CARD (크림) */
S(13.3, 15, 'cream', (add) => {
  const lab = add(`<div class="a m" style="left:120px;top:96px">SC.07 — FRANCHISE / 가맹 모집</div>`);
  const word = [...'테바츠'].map((ch, i) => add(`<div class="mask" style="left:${112 + i * 340}px;top:180px;width:360px;height:400px"><div class="a g" style="font-size:372px;top:20px">${ch}</div></div>`).firstElementChild);
  const sr = add(`<div class="mask" style="left:120px;top:600px;width:1300px;height:100px"><div class="a s" style="font-size:84px">franchise partners wanted.</div></div>`).firstElementChild;
  const line = add(`<div class="hl" style="left:120px;top:760px;width:1680px;height:1px;transform-origin:0 0"></div>`);
  const tk = add(`<div class="a" style="width:1920px;height:1080px">${ticks(120, 760, 1680, 40, 6, 5, 12)}</div>`);
  const c1 = add(`<div class="a" style="left:120px;top:800px"><div class="m">CALL</div><div class="g" style="font-size:72px;margin-top:14px;letter-spacing:-0.02em">010-5419-0401</div></div>`);
  const c2 = add(`<div class="a" style="left:1040px;top:800px"><div class="m">WEB</div><div class="m" style="font-size:30px;margin-top:22px;letter-spacing:.02em">DAONCOMPANY.GITHUB.IO/TEBATSU</div></div>`);
  const seal = add(`<div class="seal" style="left:1620px;top:250px;width:180px;height:180px;font:900 96px/1 'Pretendard Variable'">テ</div>`);
  return (t) => {
    A(lab, t => ({ o: 1 }), t, false);
    word.forEach((w, i) => A(w, t => ({ y: L(420, 0, eo(P(t, i * .07, .42 + i * .07))) }), t));
    A(sr, t => ({ y: L(110, 0, eo(P(t, .4, .85))) }), t);
    line.style.transform = `scaleX(${eo(P(t, 0, .7))})`;
    A(tk, t => ({ o: t > .7 ? 1 : 0 }), t, false);
    A(c1, t => ({ y: L(60, 0, eo(P(t, .6, 1.0))), o: eo(P(t, .6, 1.0)) }), t);
    A(c2, t => ({ y: L(60, 0, eo(P(t, .7, 1.1))), o: eo(P(t, .7, 1.1)) }), t);
    A(seal, t => { const k = P(t, .75, 1.15); return { s: k ? bo(k) : 0, r: L(-24, 0, eo(k)) }; }, t, false);
  };
});

/* ───────── 모서리 HUD (히어로 네 모서리에 고정) ───────── */
const hudEl = hero.querySelector('.reel__hud');
hudEl.querySelector('.reel__ticks').innerHTML = scenes.slice(1).map(s => `<i style="left:${s.start / D * 100}%"></i>`).join('');
const tcEl = hudEl.querySelector('.reel__tc'), scEl = hudEl.querySelector('.reel__sc'), fillEl = hudEl.querySelector('.reel__fill');
const tcStr = t => { const f = Math.min(D * FPS - 1, Math.floor(t * FPS)), s = Math.floor(f / FPS); return `TC 00:00:${String(s).padStart(2, '0')}:${String(f % FPS).padStart(2, '0')}`; };

/* ───────── 선 전환: 머리카락 선이 지나가며 앞 장면을 자르고 다음 장면을 드러냄 ───────── */
const WIN = .2, WOUT = .14, DIRS = ['l', 'b', 'r', 't', 'l', 'b'];
const edge = reel.querySelector('.reel__edge');
const cut = (side, k) => ({ l: [W * k, 0, W, H], r: [0, 0, W * (1 - k), H], t: [0, H * k, W, H], b: [0, 0, W, H * (1 - k)] })[side];   // 선이 지나간 뒤 남는 영역
const inset = ([x0, y0, x1, y1]) => `inset(${y0}px ${W - x1}px ${H - y1}px ${x0}px)`;
const line = (side, k) => ({ l: [W * k - 1, 0, 2, H], r: [W * (1 - k) - 1, 0, 2, H], t: [0, H * k - 1, W, 2], b: [0, H * (1 - k) - 1, W, 2] })[side];

function render(t) {
  t = cl(t, 0, D - 1e-4);
  let i = scenes.findIndex(s => t >= s.start && t < s.end); if (i < 0) i = scenes.length - 1;
  const sc = scenes[i];
  scenes.forEach((s, j) => s.root.style.display = j === i ? 'block' : 'none');
  sc.render(t - sc.start);
  let clip = 'none', ln = null;
  if (scenes[i + 1] && t > sc.end - WIN) { const k = ei(P(t, sc.end - WIN, sc.end)); clip = inset(cut(DIRS[i], k)); ln = line(DIRS[i], k); }
  else if (scenes[i - 1] && t < sc.start + WOUT) {
    const side = DIRS[i - 1], k = eo(P(t, sc.start, sc.start + WOUT));
    const keep = cut(side, k), opp = { l: [0, 0, W * k, H], r: [W * (1 - k), 0, W, H], t: [0, 0, W, H * k], b: [0, H * (1 - k), W, H] }[side];
    clip = inset(opp); ln = k < 1 ? line(side, k) : null;
  }
  sc.root.style.clipPath = clip;
  if (ln) Object.assign(edge.style, { display: 'block', left: ln[0] + 'px', top: ln[1] + 'px', width: ln[2] + 'px', height: ln[3] + 'px' });
  else edge.style.display = 'none';
  tcEl.textContent = tcStr(t);
  scEl.textContent = `SC ${String(i + 1).padStart(2, '0')} / 07`;
  fillEl.style.transform = `scaleX(${t / D})`;
}

/* ───────── 히어로 크기에 맞춤(16:9 유지) + 재생 ───────── */
function fit() {
  const r = reel.getBoundingClientRect(), s = Math.min(r.width / W, r.height / H);
  stage.style.transform = `translate(${(r.width - W * s) / 2}px,${(r.height - H * s) / 2}px) scale(${s})`;
}
new ResizeObserver(fit).observe(reel); fit();
reel.classList.add('is-ready'); hero.classList.add('has-reel');
if (reduce) { render(D - .05); return; }                 // 동작 줄이기: 엔딩 카드 한 장면만
let clock = 0, last = null, visible = true, held = false;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
const loop = (now) => {
  if (visible && !document.hidden && !held) { if (last != null) clock = (clock + Math.min(.1, (now - last) / 1000)) % D; last = now; render(clock); } else last = null;
  requestAnimationFrame(loop);
};
render(0); requestAnimationFrame(loop);
window.reelSeek = (t) => { held = true; clock = t; render(t); };     // 검수용: 그 시점에 멈춤
})();
