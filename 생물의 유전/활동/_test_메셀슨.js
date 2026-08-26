// 메셀슨과 스탈 — DNA 복제 방식 가려내기 · Node 헤드리스 회귀 검사
// 실행:  node _test_메셀슨.js      (이 파일 옆의 HTML을 읽는다 — 드라이브 문자에 의존하지 않는다)
//
// ★이 검사가 지키는 것은 「설계에서 못 박은 것」이다(작업노트/_재개지점.md · _설계재료_메셀슨/).
//   - 띠는 그려 넣은 그림이 아니라 **가닥 조성에서 계산된다**
//   - 띠의 **높이 = 밀도 / 굵기 = 양** — 절대 섞지 않는다
//   - ¹⁵N 칸 총합은 어느 모델·어느 세대에서나 **언제나 16**
//   - **1회 복제로는 분산적을 지울 수 없다** → G1 문항(c1)은 G2 공개 **전**에만 물어야 한다
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = path.join(__dirname, '1-5_메셀슨스탈_모의실험.html');
let src = fs.readFileSync(HTML, 'utf8');

// ★스크립트는 두 블록이다 — <head>의 미완성 잠금 + <body> 끝의 본체.
const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]);
if (blocks.length !== 2) { console.error('FAIL: script 블록이 2개가 아니다 (' + blocks.length + ')'); process.exit(1); }
const gateJs = blocks[0];
let js = blocks[1].replace(/^\s*'use strict';/, '');   // use strict 벗기기(작업노트 함정)

let pass = 0, fail = 0;
function ok(cond, name){
  if (cond) { pass++; }
  else { fail++; console.error('  X FAIL: ' + name); }
}

// ── DOM 스텁 ──
// ★innerHTML 은 접근자로 둔다 — '' 를 넣으면 children 도 비워야 한다.
//   그냥 값 프로퍼티로 두면 renderQuizInto 가 다시 그릴 때마다 카드가 쌓여
//   「문항이 4개인가」 같은 검사가 거짓으로 통과한다.
function makeSandbox(storageSeed){
  const store = {};
  function makeEl(id){
    const el = {
      className:'', textContent:'', value:'', style:{}, disabled:false, checked:false,
      children:[], attrs:{}, onclick:null, type:'', nodeType:1, firstChild:null, _html:'',
      setAttribute:(k,v)=>{ el.attrs[k]=v; },
      getAttribute:k=>el.attrs[k],
      appendChild:c=>{ el.children.push(c); el.firstChild = el.children[0]; return c; },
      removeChild:c=>{ const i=el.children.indexOf(c); if(i>=0) el.children.splice(i,1);
                       el.firstChild = el.children[0] || null; return c; },
      addEventListener:()=>{},
      removeEventListener:()=>{},
      focus:()=>{},
      getBBox:()=>({x:0,y:0,width:20,height:60}),
      getBoundingClientRect:()=>({left:0,top:0,width:900,height:560})
    };
    Object.defineProperty(el, 'innerHTML', {
      get(){ return el._html; },
      set(v){ el._html = String(v); if (el._html === ''){ el.children = []; el.firstChild = null; } }
    });
    Object.defineProperty(el, 'id', {
      get(){ return el._id; },
      set(v){ el._id = v; store[v] = el; }
    });
    if (id !== undefined) el.id = id;
    return el;
  }
  const mem = Object.assign({}, storageSeed || {});
  const sandbox = {
    console, Math, JSON, Object, Array, String, Number, RegExp,
    document: {
      getElementById: id => store[id] || (store[id] = makeEl(id)),
      createElement: () => makeEl(),
      createElementNS: () => makeEl(),
      addEventListener: () => {},
      documentElement: { className: '' }
    },
    localStorage: {
      getItem: k => (k in mem ? mem[k] : null),
      setItem: (k,v) => { mem[k] = String(v); },
      removeItem: k => { delete mem[k]; },
      _mem: mem
    },
    confirm: () => true,
    location: { reload(){} }
    // ★setTimeout / Date / requestAnimationFrame 은 일부러 넣지 않는다 —
    //   앱의 typeof 가드가 실제로 동작하는지, 연출 없이도 결과가 나는지 여기서 검증된다.
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(gateJs, sandbox);
  vm.runInContext(js, sandbox);
  sandbox._store = store;
  return sandbox;
}
const S = makeSandbox();

/* 활동을 끝까지 밀어 주는 도우미 — 잠금 뒤에 있는 것을 보려면 앞을 실제로 마쳐야 한다 */
function finishBal(D){
  ['L','H'].forEach(t => ['L','H'].forEach(b => { D.balPickSet('top', t); D.balPickSet('bot', b); D.balRun(); }));
  D.Q_BAL.forEach(p => D.pickQ(p.id, p.a));
}
function finishRep(D){
  D.MODELS.forEach(m => D.repRun(m.id));
  D.Q_REP.forEach(p => D.pickQ(p.id, p.a));
}
function finishCmp(D){
  D.cmpReveal(1);
  D.pickQ('c1', 0);
  D.cmpReveal(2);
  D.Q_CMP.slice(1).forEach(p => D.pickQ(p.id, p.a));
}

/* ════════════════════════════════════════════════════════════
   [1] 정적 구조 · 단일 파일 · 접근성
   ════════════════════════════════════════════════════════════ */
console.log('[1] 정적 구조');
{
  ok((src.match(/<script>/g) || []).length === 2, 'script 블록 2개 (head 잠금 + 본체)');
  ok(src.indexOf('<script>') < src.indexOf('<style>'),
     '★잠금 스크립트가 <style>보다 앞 = <head>에 있다');
  const ext = src.match(/(src|href)\s*=\s*["'](?!#)[^"']*["']/g) || [];
  ok(ext.length === 0, '외부 파일 참조 0 (실제: ' + ext.join(', ') + ')');
  ok(!/https?:\/\//.test(src.replace(/xmlns="[^"]*"/g, '')),
     'SVG 네임스페이스를 뺀 http(s) 주소 0');
  ok(!/__SCRIPT__/.test(src), '★자리표시 __SCRIPT__ 가 남아 있지 않다 (JS 1·2·3부가 실제로 조립되었다)');
  ok(/<meta name="viewport"[^>]*width=device-width/.test(src), 'viewport 메타 있음');
  ok(/lang="ko"/.test(src), 'lang="ko"');
  ok(/min-height:44px/.test(src), '버튼 최소 높이 44px 규약');
  ok(/font-size:16px/.test(src), '기준 폰트 16px');
  ok(/prefers-reduced-motion/.test(src), '움직임 줄이기 설정 대응');
  /* ★2026-08-26 교사 검토 통과 — 학생에게 열었다.
     다시 닫으려면 DRAFT_MODE 를 true 로 바꾸고 **아래 세 단언도 함께 뒤집을 것.** */
  ok(/DRAFT_MODE = false/.test(src), '★잠금이 풀려 있다 — 학생이 바로 들어온다');
  ok(S.document.documentElement.className.indexOf('unlocked') >= 0,
     '★빈 저장소로 들어와도 잠금 화면이 뜨지 않는다');
  ok(/var DRAFT_PASS/.test(src) && /id="draftGate"/.test(src),
     '★잠금 장치 자체는 남아 있다 — 다시 닫을 때와 다음 활동이 그대로 복제해 쓴다');
  /* ★비밀번호는 **교사 지정 7856** 이다 (작업노트/git백업_커밋정책.md · 2026-08-18 지시).
     활동마다 다른 값을 쓰면 교사가 반마다 다른 번호를 외워야 한다.
     실제로 이 활동이 한때 '5815' 로 배포된 적이 있어(2026-08-26) 여기서 못 박는다. */
  ok(S.DRAFT_PASS === '7856', '★잠금 비밀번호가 교사 지정값 7856 이다 (실제: ' + S.DRAFT_PASS + ')');
  ok(S.DRAFT_KEY === 'meselson_sim_draft_ok', '잠금 기억 키는 이 활동 고유값이다');
  /* ★geungschool-hub.github.io 는 **모든 활동이 한 origin 을 쓴다** — localStorage 가 공유된다.
     그래서 잠금 키·상태 키에 활동 이름을 붙여야 서로 지우지 않는다. */
  ok(S.LS_KEY === 'meselson_sim_v1' && S.LS_KEY !== S.DRAFT_KEY, '상태 키도 이 활동 고유값이다');
  /* ★잠금을 다시 켰을 때 fail-closed 인지 — 장치 자체를 검사한다.
     지금은 DRAFT_MODE=false 라 gate 스크립트를 직접 돌려 확인한다. */
  {
    const vm2 = require('vm');
    const box = { localStorage:{ getItem:() => null }, document:{ documentElement:{ className:'' } } };
    vm2.createContext(box);
    vm2.runInContext(gateJs.replace('DRAFT_MODE = false', 'DRAFT_MODE = true'), box);
    ok(box.document.documentElement.className.indexOf('unlocked') < 0,
       '★다시 잠그면 처음 들어온 사람에게 잠금 화면이 뜬다 (fail-closed)');
    const box2 = { localStorage:{ getItem:k => (k === 'meselson_sim_draft_ok' ? 'y' : null) },
                   document:{ documentElement:{ className:'' } } };
    vm2.createContext(box2);
    vm2.runInContext(gateJs.replace('DRAFT_MODE = false', 'DRAFT_MODE = true'), box2);
    ok(box2.document.documentElement.className.indexOf('unlocked') >= 0,
       '한 번 푼 기기는 다시 묻지 않는다 (교사가 번호를 반복 입력하지 않게)');
  }
  ok(src.indexOf('🔄 처음부터 다시 하기') > 0, '다시 하기 버튼');
  ok(/id="progress"/.test(src) && /onclick="tapProgress\(\)"/.test(src), '진행 배지 · 교사용 5연타');
  ok(/@media \(min-width:1180px\)/.test(src) && /@media \(max-width:1179\.98px\)/.test(src),
     '★2단 경계는 1180px 이다 (1-4 §3-2 계승)');
  ok(!/@media \(max-width:1179px\)/.test(src),
     '★1179px 로 정수로 끊지 않는다 — 1179~1180 사이 소수 폭이 두 규칙 어디에도 안 걸린다');
  ok(/\.spinning\{[^}]*transform-box:fill-box/.test(src),
     '★.spinning 에 transform-box:fill-box 가 있다 — 없으면 무대 한가운데를 축으로 크게 휘돈다');
  ok(/\.spinning\{[^}]*infinite/.test(src),
     '★회전은 infinite 다 — 단계를 손으로 넘길 수 있으므로 머무는 동안 계속 돈다');
  ['balAni','repAni','cmpAni'].forEach(id =>
    ok(src.indexOf('id="' + id + '"') > 0, '무대 아래 연출 막대 자리 ' + id));
}

/* ════════════════════════════════════════════════════════════
   [2] ★밀도 기계 — 이 활동의 심장
   ════════════════════════════════════════════════════════════ */
console.log('[2] 밀도 기계');
{
  const HH = { top:'HHHHHHHH', bot:'HHHHHHHH' };
  const HL = { top:'HHHHHHHH', bot:'LLLLLLLL' };
  const LH = { top:'LLLLLLLL', bot:'HHHHHHHH' };
  const LL = { top:'LLLLLLLL', bot:'LLLLLLLL' };

  ok(S.hOfMol(HH) === 16 && S.hOfMol(LL) === 0 && S.hOfMol(HL) === 8, '¹⁵N 칸 세기');
  ok(S.f15Of(HH) === 1 && S.f15Of(LL) === 0 && S.f15Of(HL) === 0.5, 'f15 = ¹⁵N 칸 / 16');

  // ★위·아래를 바꾸어도 같은 자리 — ② 무대의 숨은 문항이다
  ok(S.f15Of(HL) === S.f15Of(LH), '★¹⁵N 가닥이 위든 아래든 f15 가 같다');
  ok(S.bandY(S.f15Of(HL)) === S.bandY(S.f15Of(LH)), '★따라서 띠가 같은 자리에 앉는다');

  // 높이 = 밀도. 무거울수록 아래(y가 크다)
  ok(S.bandY(0) === 34 && S.bandY(0.5) === 64 && S.bandY(1) === 94, '띠 높이 34/64/94');
  ok(S.bandY(1) > S.bandY(0.5) && S.bandY(0.5) > S.bandY(0), '★무거울수록 아래에 있다');
  ok(S.bandY(0.25) > S.bandY(0) && S.bandY(0.25) < S.bandY(0.5),
     '★분산적 G2(f15 0.25) 는 가벼운 자리와 중간 자리 **사이**다 (비상 39쪽 예시답안과 같은 자리)');

  /* ══ 굵기 = 그 무게를 가진 DNA **분자의 개수**. 밀도와 절대로 섞지 않는다 ══
     ⚠ 2026-08-26 교사 지적 — 분율로 그리면 P 의 띠(1개)가 G2 의 띠(2개)보다 굵어져
       「굵기 = 양」이라 써 놓고 정반대를 보여 준다. 개수 비례로 바꿨다.
     ★옛 검사(`rt > 2` 따위)는 옛 식으로도 통과했다. 그래서 여기서는 **규칙 자체**를 문다. */
  ok(S.bandT(2) === 2 * S.bandT(1) && S.bandT(3) === 3 * S.bandT(1),
     '★굵기가 분자 개수에 정비례한다 (1:2:3 = ' + S.bandT(1) + ':' + S.bandT(2) + ':' + S.bandT(3) + ')');
  ok(S.bandT(4) <= 26, '★가장 굵은 띠(4개)도 26px 이하다 — 시험관 아래 곡면을 넘지 않는다');
  ok(S.bandT(1) >= 5, '★가장 얇은 띠(1개)도 5px 은 된다 — 있는데 안 보이면 안 된다');
  ok(S.bandT(1) !== S.bandY(1), '★굵기와 높이는 다른 값에서 나온다');
  {
    /* ★교사가 짚은 바로 그 지점 — P 의 띠 1개와 G2 의 띠 1개는 **같은 굵기**여야 한다 */
    const consHeavy = S.bandsFor('cons', 2).filter(b => b.f15 === 1)[0];
    ok(S.bandT(S.REAL_BANDS[0][0].n) === S.bandT(consHeavy.n),
       '★P 의 띠(분자 1개)와 보존적 G2 의 무거운 띠(분자 1개)가 같은 굵기다');
    /* ★중간 무게의 DNA 는 세대가 지나도 늘 2개 — 띠 굵기가 그대로여야 Q10 의 요점이 산다 */
    const mid1 = S.bandsFor('semi', 1).filter(b => b.f15 === 0.5)[0];
    const mid2 = S.bandsFor('semi', 2).filter(b => b.f15 === 0.5)[0];
    ok(mid1.n === 2 && mid2.n === 2 && S.bandT(mid1.n) === S.bandT(mid2.n),
       '★중간 무게의 띠는 G1 에서 G2 로 가도 굵기가 그대로다 (분자 수가 늘 2개이므로)');
    /* ★한 시험관의 굵기 총합 = 그 세대의 분자 수 */
    [[0, S.REAL_BANDS[0]], [1, S.bandsFor('semi', 1)], [2, S.bandsFor('semi', 2)]].forEach(pair => {
      const tot = pair[1].reduce((a, b) => a + S.bandT(b.n), 0);
      const mols = pair[1].reduce((a, b) => a + b.n, 0);
      ok(tot === mols * S.bandT(1), '★G' + pair[0] + ' 의 굵기 총합이 분자 수(' + mols + ')에 비례한다');
    });
    /* ★모든 띠에 개수가 실려 있다 — 없으면 굵기를 그릴 수 없다 */
    const all = [].concat(S.REAL_BANDS[0], S.REAL_BANDS[1], S.REAL_BANDS[2]);
    S.MODELS.forEach(m => { all.push.apply(all, S.bandsFor(m.id, 1)); all.push.apply(all, S.bandsFor(m.id, 2)); });
    ok(all.every(b => typeof b.n === 'number' && b.n >= 1), '★모든 띠가 분자 개수 n 을 싣고 있다');
  }
  {
    // 같은 분율이면 밀도가 달라도 굵기가 같다 = 「굵으면 무겁다」 오개념을 앱이 심지 않는다
    const a = S.bandsOf([HH, LL]);
    ok(a.length === 2 && a[0].n === 1 && a[1].n === 1, '★같은 개수 → 같은 굵기 (밀도와 무관)');
    ok(S.bandT(a[0].n) === S.bandT(a[1].n), '두 띠의 굵기가 같다');
    ok(a[0].f15 === 0 && a[1].f15 === 1, '띠는 가벼운 것부터 차례로 나온다');
  }

  // 색 — 두 질소 색 사이를 f15 로 섞는다
  ok(S.bandColor(0).toLowerCase() === S.C_N14.toLowerCase(), 'f15 0 → ¹⁴N 색');
  ok(S.bandColor(1).toLowerCase() === S.C_N15.toLowerCase(), 'f15 1 → ¹⁵N 색');
  ok(S.bandColor(0.5) !== S.C_N14 && S.bandColor(0.5) !== S.C_N15, 'f15 0.5 → 두 색을 섞은 한 색');
  ok(/^#[0-9a-f]{6}$/.test(S.bandColor(0.25)), '색은 언제나 6자리 hex 다');

  // 이름 — f15 하나에서만 나온다
  ok(S.bandName(1) === '무거운 DNA' && S.bandName(0.5) === '중간 무게의 DNA' && S.bandName(0) === '가벼운 DNA',
     '교과서가 정한 세 이름');
  ok(S.bandName(0.25) === '중간보다 가벼운 DNA', '★분산적 G2 는 「중간보다 가벼운」이라 부른다');
  ok(S.molName(HL) === '¹⁴N-¹⁵N' && S.molName(LH) === '¹⁴N-¹⁵N', '★중간 띠 라벨은 ¹⁴N-¹⁵N 순서 (비상 39쪽 표기)');
  ok(S.molName(HH) === '¹⁵N-¹⁵N' && S.molName(LL) === '¹⁴N-¹⁴N', '무거운·가벼운 분자 이름');

  // ★CSS 변수와 손으로 맞춘 두 색 — 어긋나면 범례 글자와 옆의 가닥 그림이 다른 색이 된다.
  //   src 전체에서 찾으면 JS 리터럴 자신이 걸려 늘 통과한다. :root 블록만 본다.
  const root = src.slice(src.indexOf(':root{'), src.indexOf('}', src.indexOf(':root{')));
  const varOf = n => (root.match(new RegExp('--' + n + ':\\s*(#[0-9A-Fa-f]{6})')) || [])[1] || '';
  ok(varOf('n15').toLowerCase() === S.C_N15.toLowerCase(), '★CSS --n15 가 JS 의 C_N15 와 같은 값이다');
  ok(varOf('n14').toLowerCase() === S.C_N14.toLowerCase(), '★CSS --n14 가 JS 의 C_N14 와 같은 값이다');
  ok(/--n14-ink:/.test(root), '★옅은 --n14 를 글자에 그대로 쓰지 않도록 짙은 짝을 둔다');
  /* ★2026-08-26 교사 지시: 「¹⁴N 을 연보라로 하니 잘 안 보인다. 확 다른 색, 채도가 높은 색으로」
     채도 = 가장 큰 채널과 가장 작은 채널의 차. 옛 연보라 #C9B6E8 은 50 뿐이었다. */
  {
    const spread = h => { const c = [1,3,5].map(i => parseInt(h.substr(i,2),16));
                          return Math.max.apply(null,c) - Math.min.apply(null,c); };
    const dist = (a,b) => { const p = i => parseInt(a.substr(i,2),16) - parseInt(b.substr(i,2),16);
                            return Math.sqrt(p(1)*p(1) + p(3)*p(3) + p(5)*p(5)); };
    ok(spread(S.C_N14) >= 120, '★¹⁴N 은 채도가 높다 (실측 ' + spread(S.C_N14) + ' · 옛 연보라는 50 이었다)');
    ok(dist(S.C_N14, S.C_N15) >= 150, '★두 질소 색이 확 다르다 (실측 ' + Math.round(dist(S.C_N14, S.C_N15)) + ')');
    ok(S.bandColor(0.5) !== S.bandColor(0) && S.bandColor(0.5) !== S.bandColor(1),
       '★섞은 중간색도 두 끝과 구별된다');
  }
  ok(varOf('n15') !== S.C_GEAR && varOf('n15') !== S.C_GEARD &&
     varOf('n14') !== S.C_GEAR && varOf('n14') !== S.C_GEARD,
     '★회색은 질소 색으로 쓰지 않는다 (기구 전용)');
}

/* ★JS 가 만들어 내는 class 이름에 CSS 가 실제로 있는가.
   CLAUDE.md 「CSS — 색상 변형 클래스 누락 주의」의 기계 검사판이다.
   빠져도 화면은 뜨므로 조용히 무너진다 — .mcard 4종이 통째로 빠져 있던 것을 이 검사가 잡았다. */
{
  const cssText = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
  const used = new Set();
  // class="..." 안에서 **글자로 확정된 이름**만 거둔다. 문자열 이어붙이기 조각은 거르고,
  // 상태 변형(on·hide 처럼 다른 규칙에 붙어 있는 것)은 known 으로 뺀다.
  (js.match(/class="[^"]*"/g) || []).forEach(m => {
    m.slice(7, -1).split(/\s+/).forEach(c => { if (/^[a-zA-Z][\w-]*$/.test(c)) used.add(c); });
  });
  const known = new Set(['hide','on','ok','right','picked','dim','filled','ghost','real','gray',
                         'm1','m2','m3','teal','amber','green','good','warn','info','bad','wait','hl',
                         'h','l','g','r','y','out','keep','imp','new','old','sm','lg','xl','xs']);
  const missing = [];
  used.forEach(c => {
    if (known.has(c)) return;
    // class="' + cls + '" 처럼 **변수로 이어붙인 자리**는 class 이름이 아니라 변수 이름이다.
    // 이름 바로 앞뒤에 + 가 붙어 있으면 걸러 낸다(진짜 class 이름은 따옴표 안에서 끝난다).
    if (new RegExp("\\+\\s*" + c + "\\b").test(js) || new RegExp("\\b" + c + "\\s*\\+").test(js)) return;
    if (!new RegExp('\\.' + c.replace(/-/g, '\\-') + '(?![\\w-])').test(cssText)) missing.push(c);
  });
  ok(missing.length === 0, '★JS 가 쓰는 class 가 모두 CSS 에 있다 (빠진 것: ' + (missing.join(', ') || '없음') + ')');
  ['modelrow','mcard','mname','mdesc','minitube','verdict'].forEach(c =>
    ok(new RegExp('\\.' + c + '[\\s{.,:>]').test(cssText), '★.' + c + ' CSS 가 있다'));
  ok(/\.mcard svg\{[^}]*max-width/.test(cssText),
     '★.mcard svg 에 max-width 가 있다 — 없으면 300×132 도해가 카드 너비까지 부풀어 오른다');
}

/* ════════════════════════════════════════════════════════════
   [3] 모델 데이터 — ★¹⁵N 칸 총합은 언제나 16
   ════════════════════════════════════════════════════════════ */
console.log('[3] 모델 데이터');
{
  ok(S.MODELS.length === 3, '복제모델 3개');
  ok(S.MODELS.map(m => m.id).join(',') === 'cons,semi,disp', '차례는 보존적 → 반보존적 → 분산적');
  ok(S.hOfMol(S.MOL_P[0]) === 16, '어버이(P) 는 두 가닥 모두 ¹⁵N');

  S.MODELS.forEach(m => {
    [1, 2].forEach(gen => {
      const mols = S.molsOf(m.id, gen);
      let sum = 0;
      mols.forEach(x => { sum += S.hOfMol(x); });
      ok(sum === 16, '★' + m.name + ' G' + gen + ' 의 ¹⁵N 칸 총합 = 16 (실제 ' + sum + ')');
      ok(mols.length === (gen === 1 ? 2 : 4), m.name + ' G' + gen + ' 분자 수 ' + (gen === 1 ? 2 : 4));
      mols.forEach(x => ok(x.top.length === 8 && x.bot.length === 8, m.name + ' G' + gen + ' 가닥은 8칸'));
    });
  });

  // 보존적 — 가닥이 섞이지 않는다 = 중간 무게 분자가 하나도 없다
  ['G1','G2'].forEach((k, i) => {
    const mols = S.molsOf('cons', i + 1);
    ok(mols.every(x => S.molKind(x) === 'HH' || S.molKind(x) === 'LL'),
       '★보존적 ' + k + ' 에는 중간 무게의 DNA 가 하나도 없다');
  });
  // 반보존적 — 모든 분자가 「어버이 가닥 1 + 새 가닥 1」이거나 완전히 새것
  ok(S.molsOf('semi', 1).every(x => S.molKind(x) === 'HL'), '★반보존적 G1 은 두 분자 모두 ¹⁴N-¹⁵N');
  {
    const g2 = S.molsOf('semi', 2).map(S.molKind).sort().join(',');
    ok(g2 === 'HL,HL,LL,LL', '★반보존적 G2 = 중간 2 : 가벼운 2 (1 : 1)');
  }
  // 분산적 — 한 가닥 안에서 섞인다. 네 분자의 조성이 모두 같다.
  ok(S.molsOf('disp', 1).every(x => S.f15Of(x) === 0.5), '★분산적 G1 도 f15 0.5 — 반보존적과 예상이 같다');
  ok(S.molsOf('disp', 2).every(x => S.f15Of(x) === 0.25), '★분산적 G2 는 네 분자 모두 f15 0.25');
  ok(S.bandsFor('disp', 2).length === 1, '★그래서 분산적 G2 는 띠가 하나뿐 — 이것이 배제 근거다');
  ok(S.molsOf('disp', 1).some(x => /HL|LH/.test(x.top)), '분산적은 한 가닥 안에서 H·L 이 섞인다');

  // ★세 모델의 G1 예상 띠
  ok(S.bandsFor('cons', 1).length === 2, '보존적 G1 = 띠 2개 → 1세대에서 어긋난다');
  ok(S.bandsFor('semi', 1).length === 1 && S.bandsFor('disp', 1).length === 1,
     '★반보존적·분산적 G1 = 둘 다 띠 1개 → 1회 복제로는 못 가른다');
  ok(S.bandsFor('semi', 1)[0].f15 === S.bandsFor('disp', 1)[0].f15,
     '★두 모델의 G1 띠는 **같은 자리**에 앉는다 — 이 활동의 논리적 급소');
  // ★세 모델의 G2 예상 띠
  ok(S.bandsFor('semi', 2).length === 2, '반보존적 G2 = 띠 2개 (실제와 같다)');
  ok(S.bandsFor('cons', 2).length === 2, '보존적 G2 = 띠 2개');
  {
    const c = S.bandsFor('cons', 2);
    const light = c.filter(b => b.f15 === 0)[0], heavy = c.filter(b => b.f15 === 1)[0];
    ok(light && heavy && Math.abs(light.ratio - 0.75) < 1e-9 && Math.abs(heavy.ratio - 0.25) < 1e-9,
       '★보존적 G2 = 가벼운 3 : 무거운 1');
    const rt = S.bandT(light.n) / S.bandT(heavy.n);
    ok(rt === 3, '★보존적 G2 는 가벼운 띠가 무거운 띠의 **정확히 3배** 굵다 (분자 수 3 : 1 그대로)');
    ok(light.n === 3 && heavy.n === 1, '분자 수도 3 : 1 이다');
  }
  {
    const s2 = S.bandsFor('semi', 2);
    ok(s2.every(b => Math.abs(b.ratio - 0.5) < 1e-9), '★반보존적 G2 두 띠의 굵기가 같다');
  }
  ok(S.DISP_G2_AT_MIDDLE === false,
     '★교과서 그림 스위치는 꺼 두는 것이 정본이다 (어긋나는 것은 그림이 아니라 해설 문장이다)');
}

/* ════════════════════════════════════════════════════════════
   [4] 실제 실험 결과 — 교과서 46쪽 그림 Ⅰ-31
   ════════════════════════════════════════════════════════════ */
console.log('[4] 실제 결과');
{
  ok(S.REAL_BANDS[0].length === 1 && S.REAL_BANDS[0][0].f15 === 1, 'P = 무거운 띠 하나');
  ok(S.REAL_BANDS[1].length === 1 && S.REAL_BANDS[1][0].f15 === 0.5, 'G1 = 중간 무게의 띠 하나');
  ok(S.REAL_BANDS[2].length === 2, 'G2 = 띠 둘');
  ok(S.REAL_BANDS[2].every(b => b.ratio === 0.5), '★G2 두 띠의 굵기가 비슷하다 (1 : 1)');
  ok(S.REAL_BANDS[2].map(b => b.f15).sort().join(',') === '0,0.5', 'G2 = 가벼운 + 중간 무게');

  // 실제 결과와 세 모델의 대조 — 배제는 언제나 「띠 개수」로 한다
  ok(S.cmpBands('real', 1).length !== S.cmpBands('cons', 1).length, '★G1 에서 보존적이 어긋난다 (띠 개수)');
  ok(S.cmpBands('real', 1).length === S.cmpBands('semi', 1).length &&
     S.cmpBands('real', 1).length === S.cmpBands('disp', 1).length, '★G1 에서 반보존적·분산적은 살아남는다');
  ok(S.cmpBands('real', 2).length !== S.cmpBands('disp', 2).length, '★G2 에서 분산적이 어긋난다 (띠 개수)');
  ok(S.cmpBands('real', 2).length === S.cmpBands('semi', 2).length, '★G2 에서 반보존적만 남는다');
}

/* ════════════════════════════════════════════════════════════
   [5] SVG 안전 — <text> 안에서 그림이 끊기지 않는다
   ════════════════════════════════════════════════════════════ */
console.log('[5] SVG 안전');
{
  const stages = [];
  S.MODELS.forEach(m => { stages.push(S.repStageSvg(m.id)); stages.push(S.repTubesSvg(m.id)); });
  S.BAL_COMBOS.forEach(c => stages.push(S.balStageSvg(c)));
  stages.push(S.balStageSvg(null), S.repStageSvg(null), S.cmpStageSvg());
  S.MODELS.forEach(m => stages.push(S.modelMiniSvg(m.id)));

  ok(stages.every(g => !/<text[^>]*>[^<]*<(sup|sub|b|strong)\b/.test(g)),
     '★<text> 안에 <sup>·<b> 가 없다 — 넣으면 HTML 파서가 <svg> 를 통째로 닫아 그림이 끊긴다');
  ok(stages.some(g => g.indexOf('¹⁵N') >= 0), '★무대 글자는 유니코드 윗첨자 ¹⁵N 을 쓴다');
  ok(stages.every(g => {
    const open = (g.match(/<svg\b/g) || []).length, close = (g.match(/<\/svg>/g) || []).length;
    return open === close && open >= 1;
  }), '무대 SVG 태그가 모두 닫혀 있다');
  ok(stages.every(g => /role="img"/.test(g) && /aria-label="/.test(g)), '무대마다 aria-label 이 있다');
  ok(stages.every(g => !/NaN|undefined|Infinity/.test(g)), '★좌표에 NaN·undefined 가 없다');
  ok(S.nLegendHtml().indexOf('<sup>15</sup>N') > 0, '★HTML 범례에서는 <sup> 를 쓴다 (검색·복사에 유리하다)');

  // 문항 안의 작은 원심분리관
  const mini = S.miniTubeSvg(S.REAL_BANDS[2]);
  ok(/^<svg/.test(mini) && /<\/svg>$/.test(mini), '문항용 작은 관도 온전한 SVG 다');
  ok(!/NaN/.test(mini), '작은 관 좌표에 NaN 이 없다');
}

/* ════════════════════════════════════════════════════════════
   [6] 연출 엔진 — ★aniLast 는 상수가 아니라 함수다
   ════════════════════════════════════════════════════════════ */
console.log('[6] 연출 엔진');
{
  ok(typeof S.aniLast === 'function', '★aniLast 가 함수다 (1-4 의 상수 4 를 그대로 쓰면 6국면 무대가 4에서 멈춘다)');
  ok(S.aniLast('rep', 'cons') === 7, '★rep 무대는 국면 8개 (0~7) — 복제를 「① 분리 → ② 합성」으로 나눴다');
  ok(S.REP_LAST === 7, 'REP_LAST 가 국면 수와 맞는다');
  ok(S.aniLast('bal', 'HH') === 5, 'bal 무대는 국면 6개');
  ok(S.aniLast('cmp', 'g2') === 5 && S.aniLast('cmp', 'g1') === 3,
     '★cmp 는 G1 공개 때 4국면, G2 공개 때 6국면 — 아직 안 본 장면을 미리 보여 주지 않는다');
  S.MODELS.forEach(m => {
    const st = S.aniSteps('rep', m.id);
    ok(st.length === 8, m.name + ' 국면 이름 8개');
    ok(st[2] === m.actSep && st[3] === m.actSyn && st[5] === m.actSep2 && st[6] === m.actSyn2,
       '★' + m.name + ' 은 분리·합성 국면에 제 이름을 갖는다 (「' + m.actSep + '」 → 「' + m.actSyn + '」)');
    ok(st[2] !== st[3], '★' + m.name + ' 의 분리와 합성은 다른 이름이다');
  });
  ok(S.ANI_MS.rep.length === 8, '국면마다 머무는 시간이 정해져 있다');
  // 손으로 넘기기
  const D = makeSandbox();
  finishBal(D);
  D.repRun('semi');
  ok(D.ani.ph === D.aniLast('rep', 'semi'), '★setTimeout 이 없는 환경에서는 곧바로 마지막 국면이 된다 (결과가 늦지 않는다)');
  D.aniGo('rep', 'semi', -1);
  ok(D.ani.ph === D.aniLast('rep', 'semi') - 1, '◀ 이전이 한 국면 뒤로 간다');
  D.aniGo('rep', 'semi', -99);
  ok(D.ani.ph === 0, '처음보다 앞으로는 가지 않는다');
  D.aniSkip('rep', 'semi');
  ok(D.ani.ph === D.aniLast('rep', 'semi'), '⏩ 끝까지');
  // ★잡고 있던 무대를 놓는다 — 떠나는 무대가 중간 그림에 얼어붙지 않는다
  D.aniGo('rep', 'semi', -2);
  D.repRun('disp');
  ok(D.ani.st === 'rep' && D.ani.id === 'disp' && D.ani.ph === D.aniLast('rep', 'disp'),
     '★다른 모델로 옮기면 앞 무대를 놓고 새 무대를 잡는다');
  ok(D.aniOf('rep', 'semi') === D.aniLast('rep', 'semi'),
     '★떠난 무대는 완료 국면으로 되돌아간다 (중간 그림에 얼어붙지 않는다)');
  const bar = D.aniBarHtml('rep', 'disp', 'm3');
  ok(/⏮ 처음부터/.test(bar) && /◀ 이전/.test(bar) && /▶ 다음/.test(bar) && /⏩ 끝까지/.test(bar), '제어 막대 단추 4개');
  ok(/8 \/ 8/.test(bar), '단계 번호가 국면 수와 맞는다');
  ok(D.aniBarHtml('rep', null, '') === '', '고른 것이 없으면 막대를 그리지 않는다');
}

/* ════════════════════════════════════════════════════════════
   [7] ② 무대 — 저울·조립
   ════════════════════════════════════════════════════════════ */
console.log('[7] ② 무게를 재는 법');
{
  const D = makeSandbox();
  const $ = id => D._store[id];
  ok(D.BAL_COMBOS.length === 4, '조합 4개');
  ok(D.balDoneCount() === 0, '처음에는 만든 조합이 없다');
  ok($('balRunBtn').disabled === true, '★두 가닥을 다 고르기 전에는 실행 단추가 꺼져 있다');
  D.balPickSet('top', 'H');
  ok($('balRunBtn').disabled === true, '한쪽만 골라도 아직 꺼져 있다');
  D.balPickSet('bot', 'L');
  ok($('balRunBtn').disabled === false, '둘 다 고르면 켜진다');
  D.balRun();
  ok(D.state.balRun['HL'] === true && D.state.balLast === 'HL', '실행한 조합이 기록된다');
  ok($('balProg').textContent === '만들어 본 조합 1 / 4', '진행 표시');
  ok($('balQwrap').style.display === 'none', '★네 조합을 다 만들기 전에는 결론 문항이 잠겨 있다');

  // ★위·아래를 바꾸어도 띠는 같은 자리
  D.balPickSet('top', 'L'); D.balPickSet('bot', 'H'); D.balRun();
  ok(D.bandY(D.f15Of(D.balMol(D.balComboById('HL')))) === D.bandY(D.f15Of(D.balMol(D.balComboById('LH')))),
     '★HL 과 LH 의 띠가 같은 자리에 앉는다');
  D.balPickSet('top', 'L'); D.balPickSet('bot', 'L'); D.balRun();
  D.balPickSet('top', 'H'); D.balPickSet('bot', 'H'); D.balRun();
  ok(D.balDoneCount() === 4, '네 조합을 모두 만들었다');
  ok($('balQwrap').style.display === 'block', '★네 조합을 다 만들면 결론 문항이 열린다');
  /* ★시험관 눈금 이름은 1.15배로 커진다 — 무대(680) 안에 들어와야 한다.
     x=536 에 두었더니 「중간 무게의 DNA」가 오른쪽으로 잘렸다(2026-08-26 눈 확인). */
  ok(/tubeSvg\(500, 44, 1\.15/.test(js), '★② 시험관은 x=500 에 있다 (더 오른쪽이면 눈금 이름이 잘린다)');
  ok(/<sup>15<\/sup>N 가닥이 몇 개인가/.test($('balFb').innerHTML),
     '★마무리 문구가 「¹⁵N 가닥이 몇 개인가」를 짚는다 (HTML 이므로 <sup> 표기다)');
  ok($('balTbody').innerHTML.indexOf('아직 만들지 않았다') < 0, '표가 네 줄 모두 채워졌다');
  ok(D.stepDone('bal') === false, '★조합만 다 만들어서는 ② 가 끝나지 않는다 — 결론 문항이 남았다');
  D.Q_BAL.forEach(p => D.pickQ(p.id, p.a));
  ok(D.stepDone('bal') === true, '결론 문항까지 답해야 ② 가 끝난다');
}

/* ════════════════════════════════════════════════════════════
   [8] ③ 무대 — 세 모델 굴리기
   ════════════════════════════════════════════════════════════ */
console.log('[8] ③ 세 모델 굴리기');
{
  const D = makeSandbox();
  const $ = id => D._store[id];
  ok($('repBody').style.display === 'none', '★②를 마치기 전에는 ③이 잠겨 있다');
  ok(/🔒/.test($('repLock').innerHTML), '잠금 안내가 뜬다');
  finishBal(D);
  ok($('repBody').style.display === 'block', '②를 마치면 ③이 열린다');

  D.repRun('cons');
  ok(D.state.repRun['cons'] === true && D.state.repLast === 'cons', '굴린 모델이 기록된다');
  ok($('repProg').textContent === '굴려 본 모델 1 / 3', '진행 표시');
  ok($('repQwrap').style.display === 'none', '★셋을 다 굴리기 전에는 결론 문항이 잠겨 있다');
  ok($('repTbody').innerHTML.indexOf('아직 굴리지 않았다') < 0,
     '★모델을 굴리면 P·G1·G2 세 줄이 모두 채워진다 (연출과 무관하게 결과가 확정된다)');
  D.repRun('semi'); D.repRun('disp');
  ok(D.repDoneCount() === 3 && $('repQwrap').style.display === 'block', '셋을 다 굴리면 결론 문항이 열린다');

  // 무대가 모델마다 실제로 다르다 — 같으면 활동이 실패한다
  const gs = D.MODELS.map(m => D.repStageSvg(m.id));
  ok(gs[0] !== gs[1] && gs[1] !== gs[2] && gs[0] !== gs[2], '★세 모델의 무대 그림이 서로 다르다');
  ok(/원본은 열리지 않는다/.test(gs[0]) && /따로 만든다/.test(gs[0]),
     '★보존적 주석 — ① 열리지 않는다 / ② 따로 만든다 가 **따로** 있다');
  ok(/주형/.test(gs[1]) && /갈라지기만 하였다/.test(gs[1]) && /하나씩 만들어졌다/.test(gs[1]),
     '★반보존적 주석 — ① 갈라지기만 / ② 새 가닥이 만들어졌다 가 **따로** 있다');
  ok(/조각으로 잘린다/.test(gs[2]) && /다시 이어진다/.test(gs[2]),
     '★분산적 주석 — ① 잘린다 / ② 이어진다 가 **따로** 있다');
  /* ★분리와 합성의 글이 실제로 달라야 두 사건이 갈린다 */
  D.MODELS.forEach(m => {
    const T = D.REP_ANNO_TXT[D.repCast(m.id).dup];
    ok(T.sep.join('') !== T.syn.join(''), m.name + ' 의 분리 문구와 합성 문구가 다르다');
    ok(/^①/.test(T.sep[0]) && /^②/.test(T.syn[0]), '★' + m.name + ' 문구가 ①·②로 차례를 밝힌다');
  });
  ok(!/두 가닥이 붙어 있다/.test(gs[1]) && !/두 가닥이 붙어 있다/.test(gs[2]),
     '★「열리지 않는다」는 보존적에만 나온다');
  ok(!/조각으로 잘린다/.test(gs[0]) && !/조각으로 잘린다/.test(gs[1]),
     '★조각내기는 분산적에만 나온다');
  D.MODELS.forEach(m => { D.repRun(m.id); D.aniSkip('rep', m.id); });

  /* ══ ★가닥 대본 — 이 무대의 심장 ══
     chromolab 처럼 「같은 key = 같은 물체」다. key 가 세대를 건너 이어지면 화면에서
     그 가닥은 **미끄러져 이동**하고, 끊기면 사라졌다 새로 생긴다.
     그러므로 대본이 곧 「어버이 가닥이 어떻게 되는가」라는 이 활동의 답이다. */
  D.MODELS.forEach(m => {
    const id = m.id;
    // (1) 대본이 MODELS 와 어긋나지 않는다 — 칸의 정본은 MODELS 하나다
    [0, 1, 2].forEach(gen => {
      const slots = D.repSlots(id, gen), mols = D.molsOf(id, gen);
      ok(slots.length === mols.length, id + ' G' + gen + ' 슬롯 수가 MODELS 와 같다');
      slots.forEach((sl, i) => {
        ok(D.repCellsOf(id, sl[0]) === mols[i].top && D.repCellsOf(id, sl[1]) === mols[i].bot,
           '★' + id + ' G' + gen + ' 슬롯 ' + i + ' 의 칸이 MODELS 와 같다');
      });
    });
    // (2) 같은 key 는 세대가 바뀌어도 칸이 같다 — 아니면 「같은 가닥」이라 부를 수 없다
    D.repKeys(id).forEach(k => {
      const seen = [];
      [0, 1, 2].forEach(gen => D.repSlots(id, gen).forEach((sl, i) => {
        if (sl[0] === k) seen.push(D.molsOf(id, gen)[i].top);
        if (sl[1] === k) seen.push(D.molsOf(id, gen)[i].bot);
      }));
      ok(seen.every(c => c === seen[0]), '★' + id + ' 의 가닥 ' + k + ' 는 세대가 바뀌어도 칸이 같다');
    });
    // (3) 국면이 바뀌어도 가닥 개수는 늘 같다 = 노드를 새로 만들지 않는다
    const n0 = D.repLayout(id, 0).strands.length;
    for (let ph = 0; ph <= D.REP_LAST; ph++){
      ok(D.repLayout(id, ph).strands.length === n0, id + ' 국면 ' + ph + ' 의 가닥 개수가 일정하다');
      ok(D.repLayout(id, ph).sum === 16, '★' + id + ' 국면 ' + ph + ' 에서도 ¹⁵N 칸 합계가 16 이다');
    }
  });

  // (4) ★반보존적 — 어버이 가닥 A·B 가 끝까지 살아남아 **서로 다른 딸 분자**로 갈라진다
  {
    const g1 = D.repSlots('semi', 1), g2 = D.repSlots('semi', 2);
    const slotOf = (slots, k) => slots.findIndex(sl => sl.indexOf(k) >= 0);
    ok(slotOf(g1, 'A') >= 0 && slotOf(g1, 'B') >= 0, '반보존적 G1 에 A·B 가 모두 남는다');
    ok(slotOf(g1, 'A') !== slotOf(g1, 'B'), '★반보존적 G1 에서 A 와 B 가 서로 다른 분자로 갈라진다');
    ok(slotOf(g2, 'A') >= 0 && slotOf(g2, 'B') >= 0, '★반보존적 G2 에도 A·B 가 그대로 남는다');
    ok(slotOf(g2, 'A') !== slotOf(g2, 'B'), '반보존적 G2 에서도 둘은 다른 분자에 있다');
  }
  // (5) ★보존적 — A 와 B 가 한 번도 떨어지지 않는다
  {
    [1, 2].forEach(gen => {
      const sl = D.repSlots('cons', gen).find(x => x.indexOf('A') >= 0);
      ok(sl && sl.indexOf('B') >= 0, '★보존적 G' + gen + ' 에서 A 와 B 는 같은 분자에 붙어 있다');
    });
  }
  // (6) ★분산적 — 어버이 가닥의 정체가 살아남지 않는다
  {
    const g2 = D.repKeys('disp').filter(k => D.repSlots('disp', 2).some(sl => sl.indexOf(k) >= 0));
    ok(g2.indexOf('A') < 0 && g2.indexOf('B') < 0,
       '★분산적 G2 에는 어버이 가닥 key 가 하나도 남지 않는다 (조각나 섞였으므로)');
    ok(D.repSlots('disp', 1).every(sl => sl.every(k => k !== 'A' && k !== 'B')),
       '★분산적은 G1 에서 이미 어버이 가닥이 사라진다');
  }
  // (7) ★복제 국면 — 두 딸 분자가 **어버이가 있던 x 에 겹쳐** 놓인다(거기서 나왔음을 보이려고)
  D.MODELS.forEach(m => {
    /* 합성 국면(3·6) — 딸 분자가 어버이 x 에 겹쳐 만들어지는 중 */
    const f3 = D.repFrame(m.id, 3);
    ok(f3.stage === 'synth' && f3.duplexes.length === 2, m.id + ' 국면 3 은 딸 분자 2개를 합성 중이다');
    ok(f3.duplexes.every(d => d.x === D.REP_X.P[0]), '★' + m.id + ' 합성 중인 두 딸 분자가 어버이 x 에 겹쳐 있다');
    ok(f3.duplexes[0].y !== f3.duplexes[1].y, '두 딸 분자는 세로로 어긋나 있다');
    const f6 = D.repFrame(m.id, 6);
    ok(f6.duplexes.length === 4, m.id + ' 국면 6 은 딸 분자 4개를 합성 중이다');
    ok(f6.duplexes[0].x === D.REP_X.G1[0] && f6.duplexes[1].x === D.REP_X.G1[0] &&
       f6.duplexes[2].x === D.REP_X.G1[1] && f6.duplexes[3].x === D.REP_X.G1[1],
       '★' + m.id + ' 합성 중인 딸 분자들이 제 어버이 x 에서 나온다');
    /* ★분리 국면(2·5) — **새 가닥이 아직 하나도 없어야 한다** (2026-08-26 교사 지시) */
    [2, 5].forEach(ph => {
      const f = D.repFrame(m.id, ph);
      ok(f.stage === 'separate', m.id + ' 국면 ' + ph + ' 은 분리 단계다');
      const L = D.repLayout(m.id, ph);
      const shownNew = L.strands.filter(x => x.op === 1 && D.repIsNewAt(m.id, x.key, f.gen));
      ok(shownNew.length === 0,
         '★' + m.id + ' 분리 국면(' + ph + ')에는 새 가닥이 하나도 보이지 않는다 (있으면 두 사건이 뭉개진다)');
      const nSyn = D.repLayout(m.id, ph + 1).strands.filter(x => x.op === 1).length;
      const nSep = L.strands.filter(x => x.op === 1).length;
      ok(nSyn > nSep, '★' + m.id + ' 합성 국면에서 가닥이 늘어난다 (' + nSep + ' → ' + nSyn + ')');
    });
  });
  /* ★분산적의 분리 국면에는 **가닥이 하나도 남지 않는다** — 조각났기 때문이다.
     어버이 분자를 남겨 두면 온전한 분자 위에 조각 구름이 겹쳐
     「이전 단계 그림이 남은」 꼴이 된다(2026-08-26 교사 지적). */
  [2, 5].forEach(ph => {
    const f = D.repFrame('disp', ph);
    ok(f.duplexes.length === 0, '★분산적 분리 국면(' + ph + ')에는 놓인 분자가 하나도 없다');
    ok(D.repLayout('disp', ph).strands.every(x => x.op === 0),
       '★분산적 분리 국면(' + ph + ')에는 보이는 가닥이 하나도 없다 (조각 구름만 남는다)');
    ok(D.repLayout('disp', ph + 1).strands.some(x => x.op === 1),
       '분산적 합성 국면(' + (ph + 1) + ')에서 다시 가닥이 나타난다');
  });
  /* ★조각 구름은 분리 국면에만 그린다 — 합성 국면까지 남기면 이어 붙은 분자 위에 겹친다 */
  {
    const dot = /<circle[^>]*r="1\.7"/g;
    const sep2 = (D.repAnnoSvg('disp', 2).match(dot) || []).length;
    const syn3 = (D.repAnnoSvg('disp', 3).match(dot) || []).length;
    const sep5 = (D.repAnnoSvg('disp', 5).match(dot) || []).length;
    const syn6 = (D.repAnnoSvg('disp', 6).match(dot) || []).length;
    ok(syn3 === 0 && syn6 === 0, '★분산적 합성 국면에는 조각 구름이 없다 (' + syn3 + ' · ' + syn6 + ')');
    ok(sep2 === 16, '★P 를 자른 조각은 16칸 모두 ¹⁵N 이다 (실측 ' + sep2 + ')');
    ok(sep5 === 16, '★G1 을 자른 조각도 ¹⁵N 칸 합계가 16 이다 — 두 무리에 8칸씩 (실측 ' + sep5 + ')');
    ok((D.repAnnoSvg('cons', 2).match(dot) || []).length === 0 &&
       (D.repAnnoSvg('semi', 2).match(dot) || []).length === 0,
       '조각 구름은 분산적에만 있다');
  }

  /* ★보존적은 **분리 단계가 없다** — 어버이 분자가 제자리에 그대로 있다 */
  {
    const f = D.repFrame('cons', 2);
    ok(f.duplexes.length === 1 && f.duplexes[0].y === D.REP_ROW.P,
       '★보존적의 분리 국면에는 어버이 분자가 열리지 않고 제자리에 있다');
    const g = D.repFrame('semi', 2);
    ok(g.duplexes.length === 2 && g.duplexes[0].y !== D.REP_ROW.P,
       '★반보존적의 분리 국면에는 두 가닥이 갈라져 벌어진다');
  }
  /* ★복제가 시작되면 「그 세대의 결과」 표시를 내린다 (2026-08-26 교사 지적) */
  D.MODELS.forEach(m => {
    ok(D.repLayout(m.id, 4).rowG1 === true && D.repLayout(m.id, 5).rowG1 === false,
       '★' + m.id + ' G1 이 복제되기 시작하면 G1 이름표를 내린다');
    ok(D.repLayout(m.id, 4).ghost0 === true && D.repLayout(m.id, 5).ghost0 === false,
       '★' + m.id + ' 복제 중에는 혈통선·자취를 지운다 — 완성된 세대에만 남긴다');
    [2, 3, 5, 6].forEach(ph => ok(D.repLayout(m.id, ph).ghost0 === false || ph < 2,
       m.id + ' 복제 국면 ' + ph + ' 에는 자취가 없다'));
  });
  // (8) 라벨은 조립된 분자에만 붙는다 — 복제 중인 것에 「¹⁴N-¹⁵N」을 달면 거짓말이 된다
  D.MODELS.forEach(m => {
    [0, 1, 4, 7].forEach(ph => ok(D.repLayout(m.id, ph).labels.every(l => l.op === 1),
      m.id + ' 국면 ' + ph + ' 은 조립 상태 — 라벨이 보인다'));
    [2, 3, 5, 6].forEach(ph => ok(D.repLayout(m.id, ph).labels.every(l => l.op === 0),
      '★' + m.id + ' 국면 ' + ph + ' 은 복제 중 — 분자 이름표를 붙이지 않는다'));
  });
  // (9-0) ★지나간 세대의 자취 — 가닥이 아래로 이동해 윗줄이 비므로 흐린 자취와 혈통선을 남긴다
  D.MODELS.forEach(m => {
    ok(D.repLayout(m.id, 3).ghost0 === false && D.repLayout(m.id, 4).ghost0 === true,
       '★' + m.id + ' G1 이 완성되면 어버이 자취가 남는다');
    ok(D.repLayout(m.id, 6).ghost1 === false && D.repLayout(m.id, 7).ghost1 === true,
       '★' + m.id + ' G2 가 완성되면 G1 자취가 남는다');
  });
  ok(/rs_ghost0/.test(gs[1]) && /rs_ghost1/.test(gs[1]), '자취 그룹이 무대에 있다');

  // (9) 배지는 국면 1 부터 ¹⁴N 이다
  ok(D.repLayout('semi', 0).rowP === true && D.repLayout('semi', 2).rowP === false, '★국면 2 부터 P 이름표를 내린다 (위 가닥이 그 자리로 올라온다)');
  ok(D.repLayout('semi', 0).med15 === true && D.repLayout('semi', 1).med15 === false,
     '★배지는 국면 1 에서 ¹⁴N 으로 바뀐다');
  // (10) 가닥이 놓이지 않는 국면에서는 **제자리에서** 투명하다 (없는 데서 날아오지 않는다)
  {
    const at = (id, k, ph) => D.repLayout(id, ph).strands.find(s2 => s2.key === k);
    const n1a = at('semi', 'n1', 2), n1b = at('semi', 'n1', 3);
    ok(n1a.op === 0 && n1b.op === 1, '★반보존적의 새 가닥 n1 은 분리(2)에는 없고 합성(3)에서 나타난다');
    ok(n1a.x === n1b.x && n1a.y === n1b.y, '★나타나기 전에도 나타날 자리에 있다 (날아오지 않는다)');
  }

  ok(D.stepDone('rep') === false, '★셋을 굴린 것만으로는 ③이 끝나지 않는다');
  D.Q_REP.forEach(p => D.pickQ(p.id, p.a));
  ok(D.stepDone('rep') === true, '결론 문항까지 답해야 ③이 끝난다');
}

/* ════════════════════════════════════════════════════════════
   [9] ★④ 대조 — 이 활동의 논리적 급소
       1회 복제로는 분산적을 지울 수 없다 → c1 은 G2 공개 **전**에만 물어야 한다
   ════════════════════════════════════════════════════════════ */
console.log('[9] ④ 대조 · 배제 논리');
{
  const D = makeSandbox();
  const $ = id => D._store[id];
  ok($('cmpBody').style.display === 'none', '★③을 마치기 전에는 ④가 잠겨 있다');
  finishBal(D); finishRep(D);
  ok($('cmpBody').style.display === 'block', '③을 마치면 ④가 열린다');

  ok($('cmpQwrap').style.display === 'none', 'G1 을 공개하기 전에는 판단 문항이 잠겨 있다');
  ok($('cmpG2Btn').disabled === true, '★G1 을 공개하기 전에는 G2 단추가 꺼져 있다');

  D.cmpReveal(1);
  ok(D.state.cmpStage === 1, 'G1 공개');
  ok($('cmpQwrap').style.display === 'block', 'G1 을 공개하면 판단 문항이 열린다');
  ok($('cmpQ').children.length === 1, '★G2 공개 전에는 문항이 c1 하나뿐이다 (문항 은행 §6 「Q7의 잠금 규칙」)');
  ok(D.cmpQList().length === 1 && D.cmpQList()[0].id === 'c1', 'cmpQList 가 c1 만 내놓는다');
  ok($('cmpG1Btn').disabled === true, 'G1 단추는 다시 누를 수 없다');
  ok($('cmpG2Btn').disabled === true && /🔒/.test($('cmpG2Btn').textContent),
     '★c1 에 답하기 전에는 G2 단추가 잠겨 있다');

  D.cmpReveal(2);
  ok(D.state.cmpStage === 1, '★c1 을 건너뛰고 G2 를 공개할 수 없다 (잠금이 깨지면 c1 의 근거가 무너진다)');

  D.pickQ('c1', 0);
  ok($('cmpG2Btn').disabled === false, 'c1 에 답하면 G2 단추가 열린다');
  ok(/hide/.test($('hoG1').className) === false, '★「1세대가 답하지 못한 것」 배너가 뜬다');
  ok(/반보존적과 분산적/.test($('hoG1').innerHTML), '배너가 남은 두 모델을 이름으로 짚는다');
  ok(/몇 개 들어 있는지/.test($('hoG1').innerHTML),
     '★배너가 「¹⁵N 이 어떻게 놓였는지가 아니라 몇 개 들어 있는지」를 짚는다');

  D.cmpReveal(2);
  ok(D.state.cmpStage === 2, 'G2 공개');
  ok($('cmpQ').children.length === 4, '★G2 를 공개해야 c2~c4 가 나온다');
  ok(D.state.qPick['c1'] === 0, '★다시 그려도 c1 의 답이 남아 있다');
  ok(/hide/.test($('hoG1').className) === true, 'G2 를 공개하면 「아직 못 가른다」 배너가 내려간다');
  ok(/그림 설명/.test($('cmpNote').innerHTML) && /조금 가벼운 쪽/.test($('cmpNote').innerHTML),
     '★보충 문구가 「그림」이 아니라 「그림 설명(문장)」과의 차이를 말한다');
  ok(!/그림은 분산적 복제의 2세대 띠를/.test(src),
     '★사실이 아닌 옛 문구(「교과서 그림이 분산적 G2 띠를 중간 자리에 그렸다」)가 남아 있지 않다');
  ok(!/세 배 굵다/.test(src), '★「가벼운 띠가 세 배 굵다」는 틀린 문구가 남아 있지 않다 (실제 ≒1.7배)');
  ok(/세 배 많다/.test(src), '★대신 「가벼운 DNA 가 세 배 많다」로 쓴다');

  ok(D.stepDone('cmp') === false, '★두 세대를 공개한 것만으로는 ④가 끝나지 않는다');
  ok($('pracBody').style.display === 'none', '④를 마치기 전에는 더 풀어 보기가 잠겨 있다');
  D.Q_CMP.slice(1).forEach(p => D.pickQ(p.id, p.a));
  ok(D.stepDone('cmp') === true, '판단 문항까지 답해야 ④가 끝난다');
  ok($('pracBody').style.display === 'block', '④를 마치면 더 풀어 보기가 열린다');
  ok($('progress').textContent === '진행 3 / 3', '진행 배지 3 / 3');
  ok(/hide/.test($('cmpDone').className) === false && /반보존적 복제만 남았다/.test($('cmpDone').innerHTML),
     '★마무리 문구가 뜬다');

  // 대조 무대의 판정 배지
  const g = D.cmpStageSvg();
  ok(/1세대에서 어긋난다/.test(g), '보존적에 「1세대에서 어긋난다」');
  ok(/띠가 하나뿐이다/.test(g), '분산적에 「띠가 하나뿐이다」');
  ok(/예상이 똑같다/.test(g), '★반보존적과 분산적 사이에 「예상이 똑같다」가 그려진다');
  ok(/이것이다/.test(g), '반보존적에 최종 판정');
}

/* ════════════════════════════════════════════════════════════
   [10] 문항 은행 정합성 — 정본은 _설계재료_메셀슨/03_문항은행.md
   ════════════════════════════════════════════════════════════ */
console.log('[10] 문항');
{
  const ALL = S.ALLQ();
  ok(S.Q_INTRO.length === 1, '도입 1문항');
  ok(S.Q_BAL.length === 3 && S.Q_REP.length === 3 && S.Q_CMP.length === 4, '② 3 · ③ 3 · ④ 4');
  ok(S.PRACTICE.length === 4, '더 풀어 보기 4문항');
  ok(ALL.length === 15, '선택형 모두 15문항 (도입 1 + 은행 14)');

  const ids = ALL.map(p => p.id);
  ok(new Set(ids).size === ids.length, '★id 가 활동 전체에서 유일하다');
  ok(S.PRACTICE.every(p => p.id.indexOf('p') === 0), '★연습 문항 id 는 p 로 시작한다 (pickStore 가 이름으로 가른다)');
  ok(ALL.filter(p => p.id.indexOf('p') === 0).length === S.PRACTICE.length,
     '★연습이 아닌 문항 id 는 p 로 시작하지 않는다 — 시작하면 답이 엉뚱한 칸에 저장된다');
  ok(S.Q_CMP[0].id === 'c1', '★c1 이 ④의 첫 문항이다 (G2 공개 단추가 이 이름을 읽는다)');

  ALL.forEach(p => {
    ok(Array.isArray(p.ch) && p.ch.length >= 4, p.id + ' 선택지 4개 이상');
    ok(typeof p.a === 'number' && p.a >= 0 && p.a < p.ch.length, p.id + ' 정답 번호가 범위 안이다');
    ok(Array.isArray(p.no) && p.no.length === p.ch.length, '★' + p.id + ' 되돌림 문구가 선택지 수와 같다');
    ok(p.no[p.a] === '', '★' + p.id + ' 정답 자리의 되돌림은 비어 있다');
    p.no.forEach((t, i) => ok(i === p.a || (t && t.length > 5), '★' + p.id + ' 선택지 ' + (i + 1) + ' 되돌림이 비어 있지 않다'));
    ok(typeof p.ex === 'string' && p.ex.length > 20, p.id + ' 정답 풀이가 있다');
    ok(/[?？]$/.test(String(p.q).trim()), '★' + p.id + ' 발문이 물음표로 끝난다');
    ok(!/\bp\.a\b/.test(p.ex), p.id + ' 풀이에 코드 조각이 섞이지 않았다');
  });

  // 정답 위치가 한 자리에 쏠리지 않는다
  {
    const cnt = {};
    S.ALLQ().forEach(p => { cnt[p.a] = (cnt[p.a] || 0) + 1; });
    const max = Math.max.apply(null, Object.keys(cnt).map(k => cnt[k]));
    ok(max <= 5, '★정답 위치가 한 자리에 쏠리지 않는다 (최다 ' + max + '건)');
  }
  // ★정답이 단독으로 가장 긴 선택지인 문항이 없다 (내용을 몰라도 찍히는 것을 막는다)
  {
    const strip = s => String(s).replace(/<[^>]+>/g, '');
    const bad = S.ALLQ().filter(p => {
      const L = p.ch.map(c => strip(c).length);
      const a = L[p.a];
      return L.every((l, i) => i === p.a || l < a);
    }).map(p => p.id);
    ok(bad.length === 0, '★정답이 단독 최장인 문항 0건 (실제: ' + (bad.join(',') || '없음') + ')');
  }
  // 힌트는 2단이거나 없다
  ALL.forEach(p => ok(!p.hint || p.hint.length === 2, p.id + ' 힌트는 2단이다'));
  ok(S.PRACTICE.filter(p => p.lv === '상').every(p => p.hint), '★난도 상 문항에는 힌트가 있다');
}

/* ════════════════════════════════════════════════════════════
   [11] ⑤ 정리하기 — 서술 3 + 창의력 1
   ════════════════════════════════════════════════════════════ */
console.log('[11] ⑤ 정리하기');
{
  const D = makeSandbox();
  const $ = id => D._store[id];
  ok(D.WRITEQ.length === 4, '서술 3 + 창의력 1');
  ok(D.WRITEQ.filter(w => w.creative).length === 1, '창의력 1문항');
  ok(D.WRITEQ[3].creative === true, '창의력은 맨 뒤에 온다 (앞 세 개의 번호가 1·2·3이 된다)');
  D.WRITEQ.forEach(w => {
    ok(/시오\.?$/.test(String(w.q).replace(/<[^>]+>/g, '').trim()), '★' + w.id + ' 발문이 「~하시오」로 끝난다');
    ok(Array.isArray(w.need) && w.need.length >= 3, w.id + ' 채점 요소 3개 이상');
    ok(typeof w.ans === 'string' && w.ans.length > 80, w.id + ' 모범답안이 있다');
    ok(typeof w.min === 'number' && w.min >= 60, w.id + ' 최소 글자 수');
  });
  ok(D.SELFCHECK.length === 3, '자기평가 3줄');
  ok(D.SELFCHECK.map(s => s.k).join(',') === '지식·이해,과정·기능,가치·태도', '자기평가 세 영역');

  // ★모범답안은 스스로 서술한 뒤에 열린다
  const w1 = D.WRITEQ[0];
  ok($('ansBtn_' + w1.id).disabled === true, '★아무것도 쓰지 않으면 모범답안이 잠겨 있다');
  ok(/🔒/.test($('ansBtn_' + w1.id).textContent), '잠금 표시');
  $('ta_' + w1.id).value = '가'.repeat(w1.min - 1);
  D.onTa(w1.id);
  ok($('ansBtn_' + w1.id).disabled === true, '한 글자 모자라면 아직 잠겨 있다');
  ok($('cnt_' + w1.id).textContent === (w1.min - 1) + '자', '글자 수가 세어진다');
  $('ta_' + w1.id).value = '가'.repeat(w1.min);
  D.onTa(w1.id);
  ok($('ansBtn_' + w1.id).disabled === false, '★최소 글자 수를 채우면 열린다');
  ok($('writeProg').textContent === '작성한 문항 1 / 4', '작성 진행 표시');
  D.toggleAns(w1.id);
  ok($('ans_' + w1.id).style.display === 'block', '모범답안이 펼쳐진다');
  D.toggleAns(w1.id);
  ok($('ans_' + w1.id).style.display === 'none', '다시 접힌다');
  // 공백만으로는 열리지 않는다
  $('ta_' + w1.id).value = ' '.repeat(400);
  D.onTa(w1.id);
  ok($('ansBtn_' + w1.id).disabled === true, '★공백만 채워서는 열리지 않는다');
}

/* ════════════════════════════════════════════════════════════
   [12] 저장 · 복원 · 두 탭
   ════════════════════════════════════════════════════════════ */
console.log('[12] 저장 · 복원');
{
  const D = makeSandbox();
  finishBal(D); finishRep(D); finishCmp(D);
  D.PRACTICE.forEach(p => D.pickQ(p.id, p.a));
  D._store['ta_w1'].value = '나'.repeat(120);
  D.onTa('w1');
  D.document.getElementById('self_s1').checked = true;   // 스텁은 innerHTML 을 파싱하지 않는다
  D.onSelf('s1');

  const raw = D.localStorage._mem[D.LS_KEY];
  ok(!!raw, '저장이 이루어졌다');
  const saved = JSON.parse(raw);
  ok(saved.teacherUnlock === false, '★교사 해제는 저장하지 않는다 (새로고침하면 도로 잠긴다)');
  ok(typeof saved.seq === 'number' && saved.seq > 0, '★seq 가 저장된다 (두 탭이 서로를 지우지 않게 하는 표)');
  ok(saved.cmpStage === 2 && Object.keys(saved.balRun).length === 4, '무대 진행이 저장된다');

  // 새로 연 탭에서 복원
  const E = makeSandbox({ [D.LS_KEY]: raw });
  ok(E.balDoneCount() === 4 && E.repDoneCount() === 3 && E.state.cmpStage === 2, '★새로고침해도 진행이 남는다');
  ok(E.stepDone('bal') && E.stepDone('rep') && E.stepDone('cmp'), '완료 판정도 복원된다');
  ok(E._store['progress'].textContent === '진행 3 / 3', '진행 배지가 복원된다');
  ok(E._store['ta_w1'].value.length === 120, '서술 답안이 복원된다');
  ok(E._store['self_s1'].checked === true, '자기평가 체크가 복원된다');
  ok(E._store['cmpQ'].children.length === 4, '★G2 를 이미 공개한 상태로 복원되면 c2~c4 도 함께 나온다');
  ok(E.state.teacherUnlock === false, '★교사 해제는 복원되지 않는다');
  ok(E.ani.auto === false && E.aniOf('bal', E.state.balLast) === E.aniLast('bal', E.state.balLast),
     '★복원한 무대는 완료 국면에서 시작한다 — 새로고침이 결과를 도로 감추지 않는다');

  // ★두 탭 — 저장소의 seq 가 더 크면 덮어쓰지 않는다
  const F = makeSandbox({ [D.LS_KEY]: raw });
  const bumped = JSON.parse(raw); bumped.seq = saved.seq + 50;
  F.localStorage.setItem(F.LS_KEY, JSON.stringify(bumped));
  F._store['ta_w2'].value = '다'.repeat(90);
  F.onTa('w2');
  ok(JSON.parse(F.localStorage._mem[F.LS_KEY]).seq === saved.seq + 50,
     '★다른 탭이 더 새로운 것을 저장했으면 덮어쓰지 않는다');
  ok(/hide/.test(F._store['tabWarn'].className) === false, '★대신 학생에게 알린다 (조용히 잃지 않는다)');

  // 망가진 저장분
  const G = makeSandbox({ [D.LS_KEY]: '{{{ 망가진 JSON' });
  ok(G.balDoneCount() === 0 && G.state.cmpStage === 0, '★망가진 저장분은 조용히 버리고 처음부터 시작한다');
  const H = makeSandbox({ [D.LS_KEY]: JSON.stringify({ balLast:'없는조합', repLast:'없는모델', cmpStage:99, teacherUnlock:true }) });
  ok(H.state.balLast === null && H.state.repLast === null, '★없는 이름은 걸러 낸다 (무대가 빈 채로 뜨지 않는다)');
  ok(H.state.cmpStage === 0, '★범위 밖 cmpStage 는 0 으로 되돌린다');
  ok(H.state.teacherUnlock === false, '★저장분에 남은 교사 해제는 켜지지 않는다');
}

/* ════════════════════════════════════════════════════════════
   [13] 교사용 해제 · 처음부터 다시 하기
   ════════════════════════════════════════════════════════════ */
console.log('[13] 교사용 해제 · 되돌리기');
{
  const D = makeSandbox();
  ok(D._store['repBody'].style.display === 'none', '처음에는 ③이 잠겨 있다');
  for (let i = 0; i < 5; i++) D.tapProgress();
  ok(D.state.teacherUnlock === true, '진행 배지 5연타로 열린다');
  ok(D._store['repBody'].style.display === 'block' && D._store['cmpBody'].style.display === 'block',
     '★교사용 해제는 모든 잠금을 연다');
  ok(D._store['balQwrap'].style.display === 'block', '무대 안 결론 문항도 열린다');
  ok(D.ansGate('w1').open === true, '모범답안도 열린다');
  ok(JSON.parse(D.localStorage._mem[D.LS_KEY]).teacherUnlock === false,
     '★그래도 저장분에는 남지 않는다 (2026-08-25 교사 지시)');
  ok(D._store['cmpQ'].children.length === 1,
     '★교사 해제로도 c2~c4 를 앞당기지 않는다 — G2 를 공개해야 나온다 (배제 논리를 지킨다)');

  // 미완성 잠금
  ok(D.unlockDraft() === false, '빈 비밀번호로는 열리지 않는다');
  D._store['draftPass'].value = D.DRAFT_PASS;
  ok(D.unlockDraft() === true, '비밀번호가 맞으면 열린다');
  ok(D.localStorage._mem[D.DRAFT_KEY] === 'y', '★이 기기에 기억해 교사가 다시 입력하지 않게 한다');

  // 되돌리기
  const E = makeSandbox();
  finishBal(E);
  E.resetAll();
  ok(!(E.LS_KEY in E.localStorage._mem), '저장소가 비워졌다');
  ok(E.balDoneCount() === 0 && E.state.balLast === null, '★메모리의 state 도 함께 비워진다');
  ok(E.balPick.top === null && E.balPick.bot === null, '★고르던 가닥도 비워진다');
  E.onTa('w1');
  ok(!(E.LS_KEY in E.localStorage._mem) || Object.keys(JSON.parse(E.localStorage._mem[E.LS_KEY]).balRun).length === 0,
     '★되돌린 뒤 무엇을 눌러도 옛 진행이 되살아나지 않는다');
}

/* ════════════════════════════════════════════════════════════
   [14] 말투 점검 — 시험지 문체
        금지어 정본은 `_test_가계도분석.js` 의 BANNED 다. 어긋나면 그 파일을 따른다.
        ★이모지는 금지 대상이 아니다 (2026-08-18 교사 정정: "추임새 이모지는 넣어도 돼. 말투의 문제야")
   ════════════════════════════════════════════════════════════ */
console.log('[14] 말투 점검');
{
  const BANNED = ['해 보자','보자.','보자!','하자.','하자!','가자.','가자!','좋아','맞아.','맞아!',
                  '했어','됐어','왔어','찾았어','거야','이야.','이야!','일까','할까','올까','줄까',
                  '나와.','너의','네가','우리가'];
  const D = makeSandbox();

  // (1) 문항·서술형·자기평가 문안 전수
  const blob = JSON.stringify({ I:D.Q_INTRO, B:D.Q_BAL, R:D.Q_REP, C:D.Q_CMP, P:D.PRACTICE,
                                W:D.WRITEQ, S:D.SELFCHECK });
  let hits = [];
  BANNED.forEach(w => { if (blob.indexOf(w) >= 0) hits.push(w); });
  ok(hits.length === 0, '문항·서술형·자기평가에 친근체/추임새 0건 (검출: ' + hits.join(' ') + ')');

  // (2) 무대 캡션 · 국면 이름 · 모델 설명
  const stage = JSON.stringify({ M:D.MODELS, A:D.ANI_STEPS, B:D.ANI_STEPS_BY_ID });
  let hits2 = [];
  BANNED.forEach(w => { if (stage.indexOf(w) >= 0) hits2.push(w); });
  ok(hits2.length === 0, '무대 캡션·국면 이름에 친근체/추임새 0건 (검출: ' + hits2.join(' ') + ')');

  // (3) 화면에 그대로 찍히는 정적 마크업
  const body = src.slice(src.indexOf('<body>'), src.lastIndexOf('<script>'));
  let hits3 = [];
  BANNED.forEach(w => { if (body.indexOf(w) >= 0) hits3.push(w); });
  ok(hits3.length === 0, '본문 마크업에 친근체/추임새 0건 (검출: ' + hits3.join(' ') + ')');

  // (4) 런타임 문구 — 주석을 걷어낸 스크립트 전체
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '')
                 .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  let hits4 = [];
  BANNED.forEach(w => { if (code.indexOf(w) >= 0) hits4.push(w); });
  ok(hits4.length === 0, '런타임 문구에 친근체/추임새 0건 (검출: ' + hits4.join(' ') + ')');

  // (5) 지시문은 「~하시오」 · 확인 대화상자는 「~하시겠습니까?」
  ok(/조립대:/.test(body) && /실행하시오/.test(body), '★조작 지시가 「~하시오」다');
  ok(/고르시오/.test(body), '★모델 고르기 지시가 「~하시오」다');
  ok(!/해 보시오[^.]*\?/.test(body), '지시문에 물음표가 섞이지 않았다');
  const confirms = code.match(/confirm\('([\s\S]*?)'\)/g) || [];
  ok(confirms.length >= 2 && confirms.every(c => /하시겠습니까/.test(c)),
     '★확인 대화상자 ' + confirms.length + '건이 모두 「~하시겠습니까?」다');

  // (6) 오답 되돌림은 「옳지 않다.」로 시작한다
  const wrongs = [];
  D.ALLQ().forEach(p => p.no.forEach((t, i) => { if (i !== p.a) wrongs.push(t); }));
  ok(wrongs.length > 0 && wrongs.every(t => /^옳지 않다\./.test(t)),
     '★오답 되돌림 ' + wrongs.length + '건이 모두 「옳지 않다.」로 시작한다');
}

/* ════════════════════════════════════════════════════════════
   [15] 자매 활동과의 경계 — 이 활동은 복제 「기작」을 다루지 않는다
   ════════════════════════════════════════════════════════════ */
console.log('[15] 활동의 경계');
{
  const blob = JSON.stringify({ I:S.Q_INTRO, B:S.Q_BAL, R:S.Q_REP, C:S.Q_CMP, P:S.PRACTICE, W:S.WRITEQ });
  ['프라이머','오카자키','헬리케이스','헬리카제','중합효소','3′ 말단','선도 가닥','지연 가닥'].forEach(w =>
    ok(blob.indexOf(w) < 0, '★문항에 복제 기작 용어 「' + w + '」가 없다 (자매 활동 dna-sim 의 몫이다)'));
  ok(/DNA 복제 모의실험/.test(src), '★바닥글이 자매 활동을 가리킨다');
  ok(/방사성 동위원소가 아니다/.test(src),
     '★¹⁵N 이 방사성이 아님을 밝힌다 (앞 단원 허시·체이스와 구별된다)');
}

/* ════════════════════════════════════════════════════════════ */
console.log('\n결과: ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
