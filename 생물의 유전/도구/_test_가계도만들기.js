// 가계도 만들기 — Node 헤드리스 회귀 검사
// 실행:  node _test_가계도만들기.js        (이 파일 옆의 HTML 을 읽는다 — 드라이브 문자에 안 매인다)
//
// 근거로 삼은 것 (본체 코드가 아니라 사양·실측):
//   · 생물의 유전/중간고사/_중간고사_원안_v2.html  262~300행(6번) · 375~406행(9번) 좌표 실측
//   · 생물의 유전/가계도 예시 이미지.png            평가원 양식 픽셀 실측(2026-09-10)
//   · 생물의 유전/활동/_pedigree_svg.js             퀴즈 데이터 규격 — 독립 오라클로 require 한다
//   · 작업노트/방법_웹활동_제작표준.md              §6 SVG 함정 · §8 회귀 검사와 변이 확인
//
// ★[9] 는 이 검사의 급소다 — 판정 엔진(백트래킹 탐색)을
//   그와 아무 관련 없는 **교과서 국소 규칙 6개**로 다시 유도해 전수 대조한다.

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = path.join(__dirname, '가계도_만들기.html');
const RAW = fs.readFileSync(HTML, 'utf8');
const m = RAW.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!m) { console.error('FAIL: script 블록을 못 찾음'); process.exit(1); }
const JS = m[1].replace(/^\s*'use strict';/, '');   // use strict 벗기기(작업노트 함정)

let pass = 0, fail = 0;
function ok(cond, name){
  if (cond) pass++;
  else { fail++; console.error('  X FAIL: ' + name); }
}
function eq(a, b, name){ ok(a === b, name + '  (기댓값 ' + b + ' · 실제 ' + a + ')'); }
function near(a, b, name, tol){ ok(Math.abs(a-b) <= (tol||0.51), name + '  (기댓값 ' + b + ' · 실제 ' + a + ')'); }

/* ── DOM 스텁 ─────────────────────────────────────────────
   ★setTimeout·ResizeObserver 는 최소한만 둔다. Image·clipboard 는 일부러 안 준다 —
     앱이 그것들 없이도 무너지지 않는지 여기서 검증된다.                    */
function makeSandbox(seed){
  const store = {};
  function el(id){
    const cls = new Set();
    const e = {
      innerHTML:'', textContent:'', value:'', style:{}, dataset:{}, children:[], disabled:false,
      classList:{ add:c=>cls.add(c), remove:c=>cls.delete(c), contains:c=>cls.has(c),
                  toggle:(c,f)=>{ if(f===undefined){cls.has(c)?cls.delete(c):cls.add(c);} else if(f)cls.add(c); else cls.delete(c); } },
      setAttribute(k,v){ e['_'+k]=v; }, getAttribute(k){ return ('_'+k in e) ? e['_'+k] : null; },
      appendChild(c){ e.children.push(c); return c; }, removeChild(){}, remove(){}, insertBefore(){},
      querySelector(){ return null; }, querySelectorAll(){ return []; },
      addEventListener(){}, removeEventListener(){}, select(){}, click(){ },
      getBoundingClientRect(){ return { width:800, height:400, left:0, top:0, right:800, bottom:400 }; }
    };
    e.parentNode = e;
    if (id !== undefined) e.id = id;
    return e;
  }
  const mem = Object.assign({}, seed || {});
  const sb = {
    console, Math, JSON, Object, Array, String, Number, Date, isFinite, parseInt, parseFloat,
    setTimeout: () => 0, clearTimeout: () => {},
    document: {
      getElementById: id => store[id] || (store[id] = el(id)),
      createElement: () => el(), createElementNS: () => el(),
      addEventListener: () => {}, body: el('body'), head: el('head'),
      querySelector(){ return null; }, querySelectorAll(){ return []; },
      execCommand(){ return true; }
    },
    localStorage: {
      getItem: k => (k in mem ? mem[k] : null),
      setItem: (k,v) => { mem[k] = String(v); },
      removeItem: k => { delete mem[k]; },
      _mem: mem
    },
    confirm: () => true, alert: () => {},
    Blob: function(){}, URL: { createObjectURL:()=>'', revokeObjectURL(){} },
    FileReader: function(){}, navigator: {}
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(JS, sb);
  sb._store = store;
  return sb;
}
const S = makeSandbox();

/* 가계도를 짧게 적는 도구 — 검사 안에서만 쓴다 */
function build(people, unions, opts){
  const st = S.freshState();
  Object.assign(st, opts && opts.state || {});
  if (opts && opts.view) Object.assign(st.view, opts.view);
  people.forEach(p => st.people.push({
    id: String(p[0]), sex: p[1],
    traits: [!!p[2], !!p[3], !!p[4]],
    label: null, inText:'', sidePos:'top', sideText:'', dead:false, dx:0
  }));
  unions.forEach((u,i) => st.unions.push({
    id: 'u'+i, a:String(u[0]), b:String(u[1]),
    children:(u[2]||[]).map(String), consang: !!u[3]
  }));
  st.nextId = 500;
  return st;
}

/* ══ 1. 정적 구조 ══ */
console.log('[1] 정적 구조');
ok(!/<script[^>]+src=/i.test(RAW), '외부 script 없음');
ok(!/<link[^>]+href=/i.test(RAW), '외부 stylesheet 없음');
ok(!/https?:\/\/(?!www\.w3\.org)/.test(RAW.replace(/\/\/[^\n]*/g,'')), '외부 주소 없음(w3.org 네임스페이스 제외)');
ok(/<meta name="viewport"/.test(RAW), 'viewport 있음');
ok(RAW.indexOf('pedigree_maker_v1') > 0, '저장 키 이름이 관례대로');
ok(/--blue:\s*#1F4E79/.test(RAW), '교사용 도구 머리 색(배점계산기 관례)');
ok(/@media \(prefers-reduced-motion/.test(RAW), 'reduced-motion 대비');
{ // JS 가 쓰는 class 가 CSS 에 다 있는가
  const css = RAW.slice(RAW.indexOf('<style>'), RAW.indexOf('</style>'));
  ['sec','toolbar','wrap','pane-l','pane-r','row','lab','pal','hyp','verdict','chip','tabs','hint','none','tblscroll']
    .forEach(c => ok(css.indexOf('.'+c) >= 0, 'CSS 에 .' + c + ' 있음'));
}

/* ══ 2. 기하 상수 — 실측값과 유도한 부등식 ══ */
console.log('[2] 기하 상수');
eq(S.STROKE, 1.8, '획 굵기 1.8 (원안 실측)');
eq(S.BUS_UP, 22, '형제 가로선은 자녀 행보다 22 위 (원안 6번 42−64·9번 96−118)');
near(S.U_PER_MM, 300/66, '축척 = viewBox 300 ↔ 66mm', 0.001);
// ★번호를 도형 아래 두면 형제 가로선을 밟는다 — 그 하한을 식으로 문다
eq(S.ROW_MIN_BELOW, S.NUM_DY + S.NUM_DESC + S.NUM_CLEAR + S.BUS_UP, 'ROW 하한이 부등식대로');
ok(S.ROW_MIN_BELOW >= 52, 'ROW 하한 ≥ 52 (원안 9번이 실제로 52다)');
ok(S.freshState().view.row >= S.ROW_MIN_BELOW, '기본값이 그 하한을 지킨다');
eq(S.PATTERNS.length, 8, '무늬 8종');
eq(S.SOLID.gray, '#D3D3D3', '회색 채움 = 예시 이미지 실측값');
ok(S.PATTERNS[1].k === 'hatch' && S.PATTERNS[2].k === 'grid' && S.PATTERNS[3].k === 'gray',
   '★조합 비트마스크가 그대로 무늬 번호 — 1=빗금(가) 2=격자(나) 3=회색(가+나)');
eq(S.PATTERNS[7].k, 'black', '7 = 검정 채움');
eq(S.HYPS.length, 4, '가정 4개');

/* ══ 3. 세대 유도 ══ */
console.log('[3] 세대 유도');
{
  // 배우자로 들어온 사람은 배우자 세대로 끌어올려진다
  const st = build([[1,'M'],[2,'F'],[3,'M'],[4,'F'],[5,'M']],
                   [[1,2,[3]],[3,4,[5]]]);
  const ix = S.index(st);
  eq(ix.gen['1'], 0, '창시자 gen 0');
  eq(ix.gen['3'], 1, '자녀 gen 1');
  eq(ix.gen['4'], 1, '들어온 배우자가 배우자 세대로');
  eq(ix.gen['5'], 2, '손자 gen 2');
  ok(ix.genOk, '순환 없음');
  // 한 사람에게 부모쌍이 둘이면 뒤엣것을 버린다
  const bad = S.normalizeState({ people:[{id:'a',sex:'M'},{id:'b',sex:'F'},{id:'c',sex:'M'},
                                          {id:'d',sex:'M'},{id:'e',sex:'F'}],
    unions:[{id:'u1',a:'a',b:'b',children:['c']},{id:'u2',a:'d',b:'e',children:['c']}] });
  eq(bad.unions[0].children.length + bad.unions[1].children.length, 1, '부모쌍은 한 사람에 하나만');
}

/* ══ 4. 자동 배치 — 답을 아는 세 모양 ══ */
console.log('[4] 자동 배치');
function xs(st){
  const lay = S.layout(st);
  const out = {};
  st.people.forEach(p => out[lay.labels[p.id]] = Math.round(lay.pos[p.id].x * 10) / 10);
  return { x: out, lay: lay };
}
function coupleCenteredOnKids(st, lay){
  return st.unions.every(u => {
    if (!u.children.length) return true;
    const mc = (lay.pos[u.a].x + lay.pos[u.b].x) / 2;
    const cs = u.children.map(c => lay.pos[c].x);
    const mk = (Math.min.apply(null,cs) + Math.max.apply(null,cs)) / 2;
    return Math.abs(mc - mk) < 0.02;
  });
}
{ /* 모양 1 — 창시 부부 + 자녀 3명. 자녀가 넓으므로 부부가 자녀 중앙 위로 */
  const st = build([[1,'M'],[2,'F'],[3,'M'],[4,'F'],[5,'M']], [[1,2,[3,4,5]]]);
  const COL = st.view.col, SP = st.view.spouse;
  const r = xs(st);
  eq(r.x['3'], 0, '모양1 첫 자녀 0');
  eq(r.x['4'], COL, '모양1 둘째 자녀 = 형제 간격');
  eq(r.x['5'], 2*COL, '모양1 셋째 자녀 = 형제 간격 ×2');
  eq(r.x['1'], COL - SP/2, '모양1 아버지 = 자녀 중심 − 부부간격/2');
  eq(r.x['2'], COL + SP/2, '모양1 어머니 = 자녀 중심 + 부부간격/2');
  ok(coupleCenteredOnKids(st, r.lay), '모양1 부부 중점 = 자녀 중심');
}
{ /* 모양 2 — 중간고사 6번 구조. 원안 양식 상수로 */
  const st = build([[1,'M'],[2,'F'],[3,'F',1],[4,'M'],[5,'F'],[6,'M',1]],
                   [[1,2,[3,4]],[4,5,[6]]], { view: S.PRESETS.exam });
  const r = xs(st);
  eq(r.x['1'], 0,   '6번형 Ⅰ-1');
  eq(r.x['2'], 70,  '6번형 Ⅰ-2 (부부 간격 70 = 원안 실측)');
  eq(r.x['3'], 0,   '6번형 Ⅱ-3');
  eq(r.x['4'], 70,  '6번형 Ⅱ-4');
  eq(r.x['5'], 140, '6번형 Ⅱ-5');
  eq(r.x['6'], 105, '6번형 Ⅲ-6 = 4와 5의 중점');
  ok(coupleCenteredOnKids(st, r.lay), '6번형 모든 부부가 자녀 중심 위');
  eq(S.checkLayout(st, r.lay).length, 0, '6번형 경고 0건');
  // 원안은 viewBox 300 ↔ 66mm 였다. 폭이 그 언저리인지.
  const svg = S.pedSVG(st, r.lay, {});
  const w = Number(svg.match(/viewBox="0 0 ([\d.]+)/)[1]);
  ok(w > 250 && w < 340, '6번형 그림 폭이 원안(300)과 같은 자리  (실제 ' + w + ')');
}
{ /* ★모양 3 — 집안을 잇는 결혼 (교사 예시 이미지 2번).
     예시 이미지는 부부 6—7 의 간격을 형제 간격보다 넓혀서 풀었다(실측 124 대 82).
     자동 배치가 같은 해법을 스스로 찾아내야 한다. */
  const st = build([[1,'M'],[2,'F'],[3,'M'],[4,'F'],[5,'M'],[6,'M'],[7,'F'],[8,'F']],
                   [[1,2,[5,6]],[3,4,[7]],[6,7,[8]]]);
  const COL = st.view.col, SP = st.view.spouse;
  const r = xs(st), L = r.lay;
  eq(r.x['1'], 0,   '모양3 Ⅰ-1');
  eq(r.x['2'], SP,  '모양3 Ⅰ-2');
  eq(r.x['3'], SP + COL, '모양3 Ⅰ-3 — 두 집안이 형제 간격만큼 떨어진다');
  eq(r.x['4'], SP + COL + SP, '모양3 Ⅰ-4');
  eq(r.x['5'], 5,   '모양3 Ⅱ-5');
  eq(r.x['6'], 41,  '모양3 Ⅱ-6');
  eq(r.x['7'], 105, '모양3 Ⅱ-7 — 자기 부모(3—4) 중점 아래');
  eq(r.x['8'], 73,  '모양3 Ⅲ-8 — 6과 7의 중점');
  ok(coupleCenteredOnKids(st, L), '모양3 모든 부부가 자녀 중심 위');
  ok(r.x['7'] - r.x['6'] > SP, '★잇는 결혼의 부부 간격이 벌어졌다 (예시 이미지와 같은 해법)');
  eq(S.checkLayout(st, L).length, 0, '모양3 경고 0건');
  eq(L.labels['5'], '5', '번호는 세대 → x 순으로 읽는 차례');
  eq(L.labels['7'], '7', '번호가 예시 이미지와 같이 매겨진다');
}
{ /* ★모양 4 — 집안 셋 + 잇는 결혼. 배우자 집안을 먼저 데려오지 않으면 배치가 폭주한다
     (그 가지를 빼면 실측으로 폭이 210 → 3490 이 됐다) */
  const st = build([[1,'M'],[2,'F'],[3,'M'],[4,'M'],[5,'M'],[6,'F'],
                    [7,'F'],[8,'M'],[9,'F'],[10,'M'],[11,'F'],[12,'M']],
                   [[1,2,[3,4]],[5,6,[7]],[8,9,[10,11]],[11,3,[12]]]);
  const r = xs(st), L = r.lay;
  const maxX = Math.max.apply(null, st.people.map(p => L.pos[p.id].x));
  const cap = st.people.length * (st.view.col + st.view.spouse);
  ok(maxX < cap, '★배치가 폭주하지 않는다  (폭 ' + Math.round(maxX) + ' < 상한 ' + cap + ')');
  ok(coupleCenteredOnKids(st, L), '모양4 모든 부부가 자녀 중심 위');
  eq(S.checkLayout(st, L).length, 0, '모양4 경고 0건');
  ok(Math.abs(L.pos['11'].x - L.pos['3'].x) >= st.view.spouse - 0.01,
     '잇는 부부가 부부 간격 이상 떨어져 있다');
}
{ /* ★번호는 입력 차례가 아니라 화면에서 읽는 차례(세대 → x)로 매긴다 */
  const st = build([[1,'M'],[2,'F'],[3,'M'],[4,'M'],[5,'F'],[6,'M'],[7,'F']],
                   [[1,2,[3,4]],[6,7,[5]],[3,5,[]]]);
  const lay = S.layout(st);
  ok(lay.pos['4'].x < lay.pos['3'].x, '3이 바깥 배우자 쪽 끝으로 밀려 4보다 오른쪽에 온다(전제)');
  ok(Number(lay.labels['4']) < Number(lay.labels['3']),
     '★번호가 입력 차례를 따르지 않고 화면 차례를 따른다  (4→' + lay.labels['4'] +
     ' · 3→' + lay.labels['3'] + ')');
}
{ /* 세대 계산 — 들어온 배우자가 첫 자리(a)여도 끌어올려진다 */
  const st = build([[1,'M'],[2,'F'],[3,'F'],[4,'M'],[5,'M']],
                   [[1,2,[3]],[4,3,[5]]]);      /* 4가 union 의 a 이고, 부모 없는 배우자 */
  const ix = S.index(st);
  eq(ix.gen['4'], 1, '★union 의 a 자리로 들어온 배우자도 배우자 세대로');
  eq(ix.gen['5'], 2, '그 자녀는 한 세대 아래');
}
{ /* 겹침·가로지름 점검이 실제로 무는가 */
  const st = build([[1,'M'],[2,'F'],[3,'M'],[4,'F'],[5,'M']], [[1,2,[3,4,5]]]);
  const lay0 = S.layout(st);
  eq(S.checkLayout(st, lay0).length, 0, '멀쩡한 가계도는 경고 0건');
  st.people[3].dx = -st.view.col + 1;                 /* 4를 3 위로 끌어다 놓는다 */
  ok(S.checkLayout(st, S.layout(st)).some(w => /가깝/.test(w)), '겹치게 놓으면 경고가 뜬다');
  st.people[3].dx = 0;
  st.view.numberPos = 'below'; st.view.row = 40;      /* 번호 아래인데 세대 간격이 모자라다 */
  ok(S.checkLayout(st, S.layout(st)).some(w => /세대 간격/.test(w)), '세대 간격 부족 경고');
}

{ /* ★배치 불변식 퍼즈 — 답을 아는 모양 넷만으로는 그물이 성기다 */
  let seed = 4242;
  const rnd = () => { seed = (seed*1103515245+12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = n => Math.floor(rnd()*n);
  let n = 0, warned = 0, blown = 0, notCentered = 0, unstable = 0;
  for (let t = 0; t < 250; t++){
    const people = [], unions = []; let id = 1; const gen1 = [];
    const nFam = 1 + pick(3);
    for (let f = 0; f < nFam; f++){
      const fa = id++, mo = id++;
      people.push([fa,'M']); people.push([mo,'F']);
      const kids = [];
      for (let k = 0, nk = 1 + pick(3); k < nk; k++){
        const c = id++; people.push([c, rnd()<.5?'M':'F']); kids.push(c); gen1.push(c);
      }
      unions.push([fa, mo, kids]);
    }
    for (let l = 0, nl = pick(3); l < nl; l++){          /* 결혼 — 잇는 것과 들여오는 것 섞어서 */
      const A1 = gen1[pick(gen1.length)];
      let B1;
      if (rnd() < .5) B1 = gen1[pick(gen1.length)];
      else { B1 = id++; people.push([B1, 'F']); }
      if (A1 === B1) continue;
      const pa = people.find(p=>p[0]===A1), pb = people.find(p=>p[0]===B1);
      if (!pa || !pb || pa[1] === pb[1]) continue;
      if (unions.some(u => [u[0],u[1]].indexOf(A1)>=0 || [u[0],u[1]].indexOf(B1)>=0)) continue;
      const kids = [];
      for (let k = 0, nk = 1 + pick(2); k < nk; k++){
        const c = id++; people.push([c, rnd()<.5?'M':'F']); kids.push(c);
      }
      unions.push([A1, B1, kids]);
    }
    const st = build(people, unions);
    const lay = S.layout(st);
    n++;
    if (lay.warn.length) unstable++;
    if (S.checkLayout(st, lay).length) warned++;
    const maxX = Math.max.apply(null, st.people.map(p => lay.pos[p.id].x));
    if (!(maxX < st.people.length * (st.view.col + st.view.spouse))) blown++;
    if (!coupleCenteredOnKids(st, lay)) notCentered++;
    // 같은 입력을 두 번 넣으면 같은 결과 (결정론)
    if (t < 20 && JSON.stringify(S.layout(st).pos) !== JSON.stringify(lay.pos)) notCentered++;
  }
  eq(unstable, 0, '★' + n + '개 무작위 가계도에서 자동 배치가 모두 안정된다');
  eq(blown, 0, '폭이 폭주하는 가계도 0건');
  eq(notCentered, 0, '모든 부부가 자녀 중심 위 · 같은 입력이면 같은 결과');
  /* 실측(4,000건)으로 0 이었다. 느슨하게 두면 배치가 나빠져도 검사가 안 문다. */
  eq(warned, 0, '겹침·가로지름 경고 0건 (' + n + '건 중)');
}

/* ══ 5. 손보기(dx)가 자동 배치를 이긴다 ══ */
console.log('[5] 손보기');
{
  const st = build([[1,'M'],[2,'F'],[3,'M']], [[1,2,[3]]]);
  const base = S.layout(st).pos['3'].x;
  st.people[2].dx = 37;
  eq(S.layout(st).pos['3'].x, base + 37, 'dx 가 자동값 위에 얹힌다');
  st.people[2].dx = 0;
  eq(S.layout(st).pos['3'].x, base, 'dx 0 이면 자동값 그대로');
  // 형제를 더해도 dx 는 살아 있다(오프셋이라 관계가 안 무너진다)
  st.people[2].dx = 12;
  st.people.push({ id:'9', sex:'F', traits:[false,false,false], label:null, inText:'',
                   sidePos:'top', sideText:'', dead:false, dx:0 });
  st.unions[0].children.push('9');
  const after = S.layout(st);
  eq(after.pos['3'].x - S.layout(Object.assign({}, st, {
      people: st.people.map(p => Object.assign({}, p, { dx:0 })) })).pos['3'].x, 12,
     '형제를 더해도 dx 가 그대로 남는다');
}

/* ══ 6. SVG 안전 ══ */
console.log('[6] SVG 안전');
{
  const st = build([[1,'M',1,1],[2,'F',0,1],[3,'M',1,0],[4,'F',0,0]],
                   [[1,2,[3,4]]], { state:{ traitCount:2 } });
  st.people[0].sideText = 'AB형'; st.people[0].dead = true;
  st.people[1].inText = 'A';
  const lay = S.layout(st);
  const svg = S.pedSVG(st, lay, {});
  ok(/^<svg /.test(svg) && /<\/svg>$/.test(svg), 'svg 열고 닫힘');
  ok(svg.indexOf('xmlns=') > 0, 'xmlns 있음 — 없으면 <img> 로 못 그린다(PNG 경로가 죽는다)');
  ok(svg.indexOf('NaN') < 0, 'NaN 0건');
  ok(svg.indexOf('undefined') < 0, 'undefined 0건');
  ok(!/<text[^>]*>[^<]*<(sup|b|i)\b/.test(svg), '<text> 안에 HTML 태그 없음(제작표준 §6)');
  ok(svg.indexOf('foreignObject') < 0, 'foreignObject 없음 — canvas 오염 방지');
  ok(svg.indexOf('aria-label') > 0, 'aria-label 있음');
  ok(!/(href|xlink:href)=/.test(svg), '외부 참조 0 — 이게 깨지면 PNG 가 안 나온다');
  // ★pattern id 는 렌더마다 달라야 한다(같은 문서에 SVG 가 여럿이면 url(#) 은 첫 정의만 잡는다)
  const id1 = (S.pedSVG(st, lay, {}).match(/pattern id="([^"]+)"/) || [])[1];
  const id2 = (S.pedSVG(st, lay, {}).match(/pattern id="([^"]+)"/) || [])[1];
  ok(id1 && id2 && id1 !== id2, 'pattern id 가 렌더마다 다르다  (' + id1 + ' vs ' + id2 + ')');
  /* ★무늬가 도형 한가운데를 기준으로 깔려야 한다 (2026-09-10 교사 지적).
     `patternUnits="userSpaceOnUse"` 는 그 도형의 좌표계로 타일을 깔므로,
     도형을 **원점에 그리고 <g> 로 옮겨야** 한다. 절대좌표로 그리면
     타일이 그림 전체 원점에서 시작해 도형마다 무늬 위상이 어긋난다. */
  {
    const Rr = st.view.symbol / 2, p1 = lay.pos['1'], p2 = lay.pos['2'];
    ok(svg.indexOf('<g transform="translate(' + p1.x + ',' + p1.y + ')"><rect x="' + (-Rr) +
                   '" y="' + (-Rr) + '"') > 0, '★남자 도형이 원점에 그려지고 <g> 로 옮겨진다');
    ok(svg.indexOf('<g transform="translate(' + p2.x + ',' + p2.y + ')"><circle cx="0" cy="0"') > 0,
       '★여자 도형도 원점에 그려진다');
    ok(!new RegExp('<rect x="' + (p1.x - Rr) + '" y="' + (p1.y - Rr) + '"').test(svg),
       '절대좌표로 그린 도형이 남아 있지 않다');
    /* 타일마다 원점(=도형 한가운데)에 무늬가 있어야 좌우가 대칭이 된다 */
    const defs = S.patternDefs('t', ['hatch','bhatch','grid','hline','dots']);
    ok(/id="t-grid"[^>]*>[\s\S]*?M0,0 L0,6[\s\S]*?M6,0 L6,6/.test(defs),
       '★격자 — 마주 보는 변에도 그어 타일 경계에서 굵기가 온전하다');
    ok(/id="t-grid"[^>]*>[\s\S]*?M0,0 L6,0[\s\S]*?M0,6 L6,6/.test(defs), '격자 가로선도 양쪽 변에');
    ok(/id="t-dots"[^>]*>[\s\S]*?cx="0" cy="0"/.test(defs), '★점무늬 — 타일 원점에 점이 온다');
    ok(/id="t-hline"[^>]*>[\s\S]*?M0,0 L6,0/.test(defs), '★가로줄 — 타일 원점을 지난다');
    ok(/id="t-hatch"[^>]*>[\s\S]*?M-1,1 L1,-1/.test(defs), '★빗금 — 타일 원점을 지난다');
    ok(/id="t-bhatch"[^>]*>[\s\S]*?M0,0 L6,6/.test(defs), '★역빗금 — 타일 원점을 지난다');
  }
  // 선 좌표 규칙 — 부부선은 두 도형의 안쪽 모서리를 잇는다
  const R = st.view.symbol / 2;
  const xa = lay.pos['1'].x, xb = lay.pos['2'].x, y = lay.pos['1'].y;
  const want = 'x1="' + (Math.min(xa,xb)+R) + '" y1="' + y + '" x2="' + (Math.max(xa,xb)-R) + '" y2="' + y + '"';
  ok(svg.indexOf(want) > 0, '부부선이 안쪽 모서리를 잇는다 (' + want + ')');
  // 자녀 1명이면 형제 가로선을 그리지 않는다 (원안 9번이 그렇다)
  const one = build([[1,'M'],[2,'F'],[3,'M']], [[1,2,[3]]]);
  const oneLay = S.layout(one);
  const oneSvg = S.pedSVG(one, oneLay, {});
  const busY = oneLay.pos['3'].y - S.BUS_UP;
  ok(oneSvg.indexOf('y1="' + busY + '" x2') < 0 || !/x1="([\d.]+)" y1="[\d.]+" x2="([\d.]+)"/.test(''),
     '자녀 1명 — 가로선 없이 곧게 내린다');
  const mid = (oneLay.pos['1'].x + oneLay.pos['2'].x) / 2;
  ok(oneSvg.indexOf('x1="' + mid + '" y1="' + oneLay.pos['1'].y + '" x2="' + mid +
                    '" y2="' + (oneLay.pos['3'].y - R) + '"') > 0, '자녀 1명 내림선이 도형 윗변까지');
  // 사망 표시
  ok(oneSvg.length > 0 && S.pedSVG(st, lay, {}).length > 0, '사망·옆글자가 있어도 그려진다');
  // PNG 용은 width/height 를 명시해야 한다
  const png = S.pedSVG(st, lay, { explicitSize:true, scale:3 });
  const openTag = s => s.slice(0, s.indexOf('>') + 1);       /* <pattern width=..> 에 걸리지 않게 */
  ok(/ width="[\d.]+" height="[\d.]+"/.test(openTag(png)), 'PNG 용 SVG 에 width/height 명시');
  ok(!/ width="[\d.]+" height="[\d.]+"/.test(openTag(svg)), '미리보기에는 명시하지 않는다(반응형)');
}

/* ══ 7. 무늬·범례 ══ */
console.log('[7] 무늬·범례');
{
  const st = build([[1,'M',1,0],[2,'F',0,1],[3,'M',1,1],[4,'F',0,0]],
                   [[1,2,[3,4]]], { state:{ traitCount:2 } });
  eq(S.maskOf(st, st.people[0]), 1, '(가)만 → 마스크 1');
  eq(S.maskOf(st, st.people[1]), 2, '(나)만 → 마스크 2');
  eq(S.maskOf(st, st.people[2]), 3, '(가)(나) → 마스크 3');
  eq(S.fillKeyOf(st, 0), 'none',  '정상 = 흰색');
  eq(S.fillKeyOf(st, 1), 'hatch', '(가) = 빗금 — 예시 이미지');
  eq(S.fillKeyOf(st, 2), 'grid',  '(나) = 격자 — 예시 이미지');
  eq(S.fillKeyOf(st, 3), 'gray',  '(가)(나) = 회색 채움 — 예시 이미지');
  eq(S.maskName(st, 3), '(가), (나) 발현', '조합 이름이 예시 이미지 문안대로');
  // 형질이 하나면 발현은 검정(중간고사 원안 양식)
  const one = build([[1,'M',1],[2,'F',0]], [], { state:{ traitCount:1 } });
  eq(S.fillKeyOf(one, 1), 'black', '형질 1개면 발현 = 검정 채움');
  // 팔레트에서 바꾼 것이 이긴다
  st.fillOverride['1'] = 5;
  eq(S.fillKeyOf(st, 1), 'bhatch', '팔레트 지정이 기본 규칙을 이긴다');
  delete st.fillOverride['1'];
  // 범례는 '실제로 쓰인 조합 × 성별' 만
  const items = S.legendItems(st);
  eq(items.length, 4, '범례 줄 수 = 쓰인 조합×성별  (1♂ 2♀ 3♂ 0♀)');
  eq(items[0].text, '정상 여자', '범례 첫 줄 = 정상(조합 0)');
  ok(items.map(i => i.text).indexOf('(가), (나) 발현 남자') >= 0, '복합 조합 문안');
  ok(items.every((it,i) => i === 0 || S.popcount(it.mask) >= S.popcount(items[i-1].mask)),
     '범례 차례 = 정상 → 단일 → 복합');
  // 형질 이름을 바꾸면 범례가 따라간다
  st.traitNames[0] = '㉠';
  ok(S.legendItems(st).some(i => i.text.indexOf('㉠') >= 0), '형질 이름을 바꾸면 범례가 따라간다');
  st.traitNames[0] = '(가)';
  /* ★2026-09-10 실제로 겪은 것 — 무늬 단추가 눌리지 않았다.
     단추 안에 <svg><rect> 가 있어서 누른 자리가 도형이었고,
     위임이 `!t.dataset` 로 멈추게 되어 있어 한 칸도 못 올라갔다(dataset 은 모든 원소에 있다). */
  {
    const btn = { dataset:{ fm:'3', fi:'5' }, id:'' };
    const inner = { dataset:{}, id:'', parentNode: btn };
    const rect  = { dataset:{}, id:'', parentNode: inner };
    btn.parentNode = { dataset:{}, id:'traitBody' };
    ok(S.actTarget(rect) === btn, '★무늬 단추 속 도형을 눌러도 단추를 찾아낸다');
    ok(S.actTarget(btn) === btn, '단추를 바로 눌러도 같다');
    const plain = { dataset:{}, id:'opSon' };
    ok(S.actTarget(plain) === plain, 'id 만 있는 단추도 찾는다');
    ok(S.actTarget({ dataset:{}, id:'', parentNode:{ dataset:{}, id:'', parentNode: plain } }) === plain,
       '몇 칸 위에 있어도 찾는다');
    ok(S.actTarget({ dataset:{}, id:'' }) === null, '아무 것도 없으면 null');
    ACT_CHECK: {
      /* 실제 마크업도 그 모양인지 — 단추에 data 가 붙고 그 안에 그림이 들어간다 */
      S.S = st; S.LAY = S.layout(st); S.renderTraits();
      const html = S._store['traitBody'].innerHTML;
      ok(/<button data-fm="\d+" data-fi="\d+"[^>]*>\s*<svg/.test(html),
         '★팔레트 마크업 = <button data-fm data-fi> 안에 <svg>');
      ok(/data-fm="3"[^>]*data-fi="3"[^>]*class="on"/.test(html) ||
         /data-fm="3" data-fi="3" title="[^"]*" class="on"/.test(html),
         '지금 골라진 무늬에 on 표시가 붙는다');
    }
    /* 기본 무늬를 고르면 지정이 지워지고, 다른 것을 고르면 지정된다 */
    eq(S.defaultFillIndex(st, 3), 3, '형질 2개일 때 조합 3의 기본 무늬 = 3(회색)');
    eq(S.defaultFillIndex(one, 1), 7, '형질 1개일 때 발현의 기본 무늬 = 7(검정)');
  }
  /* ★범례 견본 크기 — 교사 예시 이미지 실측(견본 25px / 도형 36px = 0.70)에 맞춘다.
     2026-09-10 교사: 「범례에 나온 예시 그림이 너무 작아」 — 그전엔 0.50 이었다. */
  {
    const g = S.legendGeom(st);
    near(g.sw / st.view.symbol, 0.70, '견본 = 도형의 0.70배 (예시 이미지 실측)', 0.001);
    ok(g.sw / st.view.symbol >= 0.6, '★견본이 도형의 0.6배보다 작지 않다');
    near(g.pitch / g.sw, 1.32, '줄 간격 = 견본의 1.32배', 0.02);
    near(g.tgap / g.sw, 0.40, '글자 왼쪽 여백 = 견본의 0.40배', 0.001);
    ok(g.fs > 8, '범례 글자가 8units 보다 크다 (실제 ' + g.fs.toFixed(1) + ')');
    /* 도형을 키우면 범례도 같이 커진다 */
    const big = JSON.parse(JSON.stringify(st)); big.view.symbol = 40;
    eq(S.legendGeom(big).sw, g.sw * 2, '도형을 두 배로 하면 견본도 두 배');
    /* 「범례 크기」 설정이 먹는다 */
    const z = JSON.parse(JSON.stringify(st)); z.view.legendScale = 1.5;
    near(S.legendGeom(z).sw / g.sw, 1.5, '범례 크기 150% 가 반영된다', 0.001);
    eq(S.normalizeState(z).view.legendScale, 1.5, 'legendScale 이 왕복에서 보존된다');
    eq(S.normalizeState({ view:{ legendScale: 99 } }).view.legendScale, 2.5, '범위 밖 값은 잘라 낸다');
    /* 그림 안에서도 견본이 그만큼 커진다 */
    const svgA = S.pedSVG(st, S.layout(st), {});
    const svgB = S.pedSVG(z, S.layout(z), {});
    const w = t => Number(t.match(/viewBox="0 0 ([\d.]+)/)[1]);
    ok(w(svgB) > w(svgA), '범례를 키우면 그림 폭도 는다');
  }

  /* ★새 단추를 위임에 등록하는 것을 잊으면 눌러도 아무 일이 안 일어난다.
     실제로 무늬 단추에서 그 부류의 사고가 났다 — 화면에 그려진 단추의
     data-* 가 모두 ACT_KEYS 에 있는지 기계로 훑는다. */
  {
    S.S = st; S.LAY = S.layout(st);
    S.renderTraits(); S.renderView();
    let html = '';
    ['traitBody','viewBody'].forEach(id => { html += S._store[id].innerHTML; });
    const keys = new Set();
    let m2, re = /<button[^>]*\sdata-([a-zA-Z]+)=/g;
    while ((m2 = re.exec(html))) keys.add(m2[1]);
    ok(keys.size >= 5, '단추에 붙은 data-* 를 여럿 찾았다 (' + [...keys].join(',') + ')');
    keys.forEach(k => {
      if (k === 'fi') return;                     /* fm 과 짝이라 fm 하나만 등록하면 된다 */
      ok(S.ACT_KEYS.indexOf(k) >= 0, '★data-' + k + ' 가 위임 목록(ACT_KEYS)에 있다');
    });
  }

  /* ★무늬 타일도 도형 크기를 따라간다 — 작은 견본에는 작은 무늬가 들어가야 한다
     (2026-09-10 교사: 「견본 도형이 작은 만큼 안에 들어가는 무늬도 작아져야 해」). */
  {
    ok(S.patternDefs('t', ['grid'], 1).indexOf('patternTransform') < 0, '1배면 변환을 넣지 않는다');
    ok(/patternTransform="scale\(0\.7\)"/.test(S.patternDefs('t', ['grid'], 0.7)),
       '★타일이 배율만큼 줄어든다');
    /* 그림 안에서 본체와 범례가 서로 다른 배율을 쓴다 */
    const g = S.legendGeom(st);
    const svg2 = S.pedSVG(st, S.layout(st), {});
    const px = svg2.indexOf('<defs>') >= 0 ? svg2.slice(0, svg2.indexOf('<g transform')) : '';
    const bodyU = st.view.symbol / S.PAT_BASE, legU = g.sw / S.PAT_BASE;
    ok(px.indexOf('scale(' + Math.round(legU*100)/100 + ')') > 0 || legU === 1,
       '★범례 무늬는 견본 크기에 맞춘 배율로 (' + legU.toFixed(2) + ')');
    ok(legU < bodyU, '견본이 도형보다 작으니 무늬도 작다 (' + legU.toFixed(2) + ' < ' + bodyU.toFixed(2) + ')');
    /* 도형을 키우면 본체 무늬도 같이 커진다 */
    const big = JSON.parse(JSON.stringify(st)); big.view.symbol = 40;
    ok(/scale\(2\)/.test(S.pedSVG(big, S.layout(big), {})), '도형을 두 배로 하면 본체 무늬도 두 배');
    /* 본체와 범례가 같은 id 를 쓰면 한쪽 배율이 다른 쪽까지 바꿔 버린다 */
    const ids = (svg2.match(/pattern id="([^"]+)"/g) || []).map(t => t.slice(12, -1));
    eq(new Set(ids).size, ids.length, '★본체용·범례용 무늬 id 가 서로 다르다');
    /* ★정의해 놓고 안 쓰는 무늬가 있으면 안 된다 —
       범례가 본체 무늬를 가져다 쓰면 범례용 정의가 통째로 붕 뜬다(그러면 범례 무늬가 안 줄어든다). */
    ids.forEach(i2 => ok(svg2.indexOf('url(#' + i2 + ')') > 0,
       '★무늬 ' + i2 + ' 가 실제로 쓰인다(정의만 하고 안 쓰는 것 없음)'));
    ok(ids.some(i2 => /l-[a-z]+$/.test(i2)), '범례 전용 무늬가 따로 정의된다');
  }

  /* ★「이 칸 기본값으로」 — 그 칸이 다루는 것만 되돌리고 가계도는 건드리지 않는다 */
  {
    const saved = S.S, savedLay = S.LAY;
    const w = JSON.parse(JSON.stringify(st));
    w.traitNames[0] = '㉠'; w.fillOverride['1'] = 6; w.legend.texts['0|M'] = '바꾼 문구';
    w.view.symbol = 44; w.view.legendScale = 1.5; w.view.roman = true;
    const nPeople = w.people.length;
    S.S = w; S.LAY = S.layout(w);
    S.resetTraits();
    eq(S.S.traitNames[0], '(가)', '형질 이름이 기본값으로');
    eq(Object.keys(S.S.fillOverride).length, 0, '무늬 지정이 지워진다');
    eq(Object.keys(S.S.legend.texts).length, 0, '범례 문구가 지워진다');
    eq(S.S.view.symbol, 44, '★무늬 칸을 되돌려도 그림 설정은 그대로');
    eq(S.S.people.length, nPeople, '★되돌려도 가계도는 그대로');
    S.resetView();
    eq(S.S.view.symbol, S.freshState().view.symbol, '그림 설정이 기본값으로');
    eq(S.S.view.legendScale, 1, '범례 크기도 기본값으로');
    eq(S.S.view.roman, false, '로마숫자도 기본값으로');
    eq(S.S.people.length, nPeople, '★그림 설정을 되돌려도 가계도는 그대로');
    S.S = saved; S.LAY = savedLay;
  }

  /* ★사람을 고를 때 무대를 다시 그리면 누른 도형이 사라져 더블클릭이 성립하지 않는다.
     2026-09-10 실측으로 겪었다 — 그래서 selectPerson() 은 무대를 건드리지 않아야 한다. */
  {
    const saved = S.S, savedLay = S.LAY;
    const w = build([[1,'M'],[2,'F'],[3,'M']], [[1,2,[3]]], { state:{traitCount:1} });
    S.S = w; S.LAY = S.layout(w);
    S._store['stage'].innerHTML = '<<무대그대로>>';
    S.selectPerson(w.people[2].id);
    eq(S._store['stage'].innerHTML, '<<무대그대로>>', '★사람을 골라도 무대를 다시 그리지 않는다');
    eq(S.sel, w.people[2].id, '고른 사람이 바뀐다');
    /* 고른 표시는 언제나 그려 두고 자리만 옮긴다 */
    const svgSel = S.pedSVG(w, S.LAY, { interactive:true, selected:null });
    ok(/class="pm-sel"[^>]*display:none/.test(svgSel), '고른 사람이 없으면 표시를 숨겨 둔다');
    const svgSel2 = S.pedSVG(w, S.LAY, { interactive:true, selected:w.people[0].id });
    ok(svgSel2.indexOf('class="pm-sel"') > 0 && !/class="pm-sel"[^>]*display:none/.test(svgSel2),
       '고른 사람이 있으면 표시가 보인다');
    S.S = saved; S.LAY = savedLay;
  }

  /* ★가계도에서 더블클릭하면 지운다 */
  {
    const saved = S.S, savedLay = S.LAY, savedSel = S.sel;
    const w = build([[1,'M'],[2,'F'],[3,'M'],[4,'F']], [[1,2,[3,4]]], { state:{traitCount:1} });
    S.S = w; S.LAY = S.layout(w);
    const id3 = w.people[2].id;
    ok(S.dblDelete(id3) === true, '★더블클릭한 사람이 지워진다');
    eq(S.S.people.length, 3, '한 명만 줄어든다');
    ok(!S.S.people.some(p => p.id === id3), '지운 사람이 없어졌다');
    S.sel = w.people[1].id;
    ok(S.dblDelete('') === false, '빈 자리를 더블클릭하면 아무 일도 없다');
    eq(S.sel, w.people[1].id, '★헛 더블클릭이 고른 사람을 바꾸지 않는다');
    ok(S.dblDelete('없는사람') === false, '없는 사람이면 아무 일도 없다');
    eq(S.S.people.length, 3, '헛 더블클릭으로는 줄지 않는다');
    /* 부부를 지우면 그 부부의 연결도 함께 끊긴다 */
    S.dblDelete(w.people[0].id);
    ok(S.S.unions.every(u => u.a !== w.people[0].id && u.b !== w.people[0].id), '딸린 부부가 정리된다');
    S.S = saved; S.LAY = savedLay; S.sel = savedSel;
  }

  // 그림에 안 쓰인 무늬는 <defs> 에 넣지 않는다
  const svg = S.pedSVG(st, S.layout(st), {});
  ok(svg.indexOf('-dots"') < 0, '안 쓰는 무늬는 defs 에 안 들어간다');
  ok(svg.indexOf('-grid"') > 0, '쓰는 무늬는 defs 에 들어간다');
}

/* ══ 8. 판정 — 답을 아는 가계도 ══ */
console.log('[8] 판정 — 답을 아는 가계도');
function V(st, ti){ return S.verdict(st, ti || 0, S.layout(st)); }
function okKeys(v){ return v.hyps.filter(h => h.ok).map(h => h.k).join(','); }
{
  // ① 정상 × 정상 → 발현 딸 : 열성이며, 아버지가 정상인데 딸이 발현이라 X 열성도 아니다
  const a = build([[1,'M'],[2,'F'],[3,'M'],[4,'F',1]], [[1,2,[3,4]]], { state:{traitCount:1} });
  eq(okKeys(V(a)), 'AR', '정상×정상 → 발현 딸 = 상염색체 열성 확정');
  ok(/딸/.test(V(a).hyps.find(h=>h.k==='XR').why), 'X열성 배제 근거가 딸을 짚는다');

  // ② 정상 × 정상 → 발현 아들 : 상열성·X열성 둘 다 가능 = 확정되지 않는다
  const b = build([[1,'M'],[2,'F'],[3,'M',1],[4,'F']], [[1,2,[3,4]]], { state:{traitCount:1} });
  eq(okKeys(V(b)), 'AR,XR', '정상×정상 → 발현 아들 = 상/성 구분 불가');
  ok(V(b).unique === null, '두 가지가 남으면 확정이 아니다');

  // ③ 발현 × 발현 → 정상 자녀 : 우성
  const c = build([[1,'M',1],[2,'F',1],[3,'F']], [[1,2,[3]]], { state:{traitCount:1} });
  ok(okKeys(c && V(c)).indexOf('AR') < 0 && okKeys(V(c)).indexOf('XR') < 0, '발현×발현 → 정상 = 열성 배제');

  // ④ 발현 아버지 → 정상 딸 : X 우성 배제
  const d = build([[1,'M',1],[2,'F'],[3,'F']], [[1,2,[3]]], { state:{traitCount:1} });
  ok(!V(d).hyps.find(h=>h.k==='XD').ok, '발현 아버지 → 정상 딸 = X 우성 불가');

  // ⑤ 정상 어머니 → 발현 아들 : X 우성 배제 (★X 열성은 배제되지 않는다 — 헷갈리는 자리)
  const e = build([[1,'M'],[2,'F'],[3,'M',1]], [[1,2,[3]]], { state:{traitCount:1} });
  ok(!V(e).hyps.find(h=>h.k==='XD').ok, '정상 어머니 → 발현 아들 = X 우성 불가');
  ok(V(e).hyps.find(h=>h.k==='XR').ok, '★그 경우 X 열성은 배제되지 않는다(어머니가 보인자면 된다)');

  // ⑥ 발현 어머니 → 정상 아들 : X 열성 배제
  const f = build([[1,'M'],[2,'F',1],[3,'M']], [[1,2,[3]]], { state:{traitCount:1} });
  ok(!V(f).hyps.find(h=>h.k==='XR').ok, '발현 어머니 → 정상 아들 = X 열성 불가');
  ok(V(f).hyps.find(h=>h.k==='XD').ok, '★그 경우 X 우성은 배제되지 않는다');

  /* ★근거 문장 여섯 줄 — 판정만 맞고 까닭이 사라지면 도구의 값어치가 반이다.
     규칙을 하나 지우면 「유전자형을 모순 없이 배정할 수 없습니다」로 뭉개지므로 여기서 걸린다.
     각 사례는 **그 규칙 하나만** 걸리도록 골랐다(먼저 걸린 규칙이 문장을 차지한다). */
  const why = (st, k) => V(st).hyps.find(h => h.k === k).why;
  ok(/자녀 4에게서 발현되었습니다/.test(why(a,'AD')) && /우성일 수 없습니다$/.test(why(a,'AD')),
     '규칙1 근거: 정상×정상 → 발현 자녀  [' + why(a,'AD') + ']');
  ok(/자녀 3이 정상입니다/.test(why(c,'AR')) && /열성일 수 없습니다$/.test(why(c,'AR')),
     '규칙2 근거: 발현×발현 → 정상 자녀  [' + why(c,'AR') + ']');
  ok(/아버지 1이 발현인데 딸 3이 정상입니다/.test(why(d,'XD')) && /X 우성일 수 없습니다$/.test(why(d,'XD')),
     '규칙3 근거: 발현 아버지 → 정상 딸  [' + why(d,'XD') + ']');
  ok(/아버지 1이 정상인데 딸 4가 발현입니다/.test(why(a,'XR')) && /X 열성일 수 없습니다$/.test(why(a,'XR')),
     '규칙4 근거: 정상 아버지 → 발현 딸  [' + why(a,'XR') + ']');
  const e2 = build([[1,'M',1],[2,'F'],[3,'M',1]], [[1,2,[3]]], { state:{traitCount:1} });
  ok(/어머니 2가 정상인데 아들 3이 발현입니다/.test(why(e2,'XD')) && /X 우성일 수 없습니다$/.test(why(e2,'XD')),
     '규칙5 근거: 정상 어머니 → 발현 아들  [' + why(e2,'XD') + ']');
  ok(/어머니 2가 발현인데 아들 3이 정상입니다/.test(why(f,'XR')) && /X 열성일 수 없습니다$/.test(why(f,'XR')),
     '규칙6 근거: 발현 어머니 → 정상 아들  [' + why(f,'XR') + ']');

  // ⑦ 성립하지 않는 가계도 — 규칙 1과 2가 동시에 걸린다
  const g = build([[1,'M'],[2,'F'],[3,'M',1],[4,'M',1],[5,'F',1],[6,'F']],
                  [[1,2,[3]],[4,5,[6]]], { state:{traitCount:1} });
  eq(okKeys(V(g)), '', '우성도 열성도 아닌 가계도는 네 가정 모두 불가');
  ok(V(g).bad, 'bad 표시가 선다');

  // ⑧ 발현자가 없으면 판정하지 않는다
  const h = build([[1,'M'],[2,'F'],[3,'M']], [[1,2,[3]]], { state:{traitCount:1} });
  eq(V(h).affN, 0, '발현자 0명');

  // ⑨ 중간고사 6번 전체 — 상염색체 열성 확정 + 유전자형 + 확률 1/4
  const q6 = build([[1,'M'],[2,'F'],[3,'F',1],[4,'M'],[5,'F'],[6,'M',1]],
                   [[1,2,[3,4]],[4,5,[6]]], { state:{traitCount:1} });
  const v6 = V(q6);
  eq(okKeys(v6), 'AR', '6번 가계도 = 상염색체 열성 확정');
  eq(v6.unique.poss['1'].join(''), 'Dr', '6번 Ⅰ-1 = 이형접합성(보기 ㄴ)');
  eq(v6.unique.poss['2'].join(''), 'Dr', '6번 Ⅰ-2 = 이형접합성(보기 ㄴ)');
  const pr = S.nextChild(q6, 0, q6.unions[1].id, v6);
  ok(pr.ok, '6번 Ⅱ-4 × Ⅱ-5 확률이 나온다');
  eq(pr.pAff, '1/4', '★6번 보기 ㄷ — 동생에게서 발현될 확률 1/4 (원안 정답과 일치)');
}

/* ══ 9. ★판정 엔진 × 교과서 규칙 오라클 전수 교차 ══
   판정 엔진은 유전자형을 백트래킹으로 배정해 본다.
   오라클은 그와 전혀 다른 방법 — 교과서 국소 규칙 6개다.
   표현형이 모두 알려진 가계도에서는 둘이 반드시 같아야 한다.        */
console.log('[9] 판정 × 규칙 오라클 (퍼즈)');
function oracle(st){
  const ix = S.index(st);
  const A = id => !!ix.byId[id].traits[0];
  let r1=false, r2=false, r3=false, r4=false, r5=false, r6=false;
  st.unions.forEach(u => {
    const pa = ix.byId[u.a], pb = ix.byId[u.b];
    const F = pa.sex === 'M' ? pa : pb, M = pa.sex === 'F' ? pa : pb;
    u.children.forEach(cid => {
      const C = ix.byId[cid];
      if (!A(F.id) && !A(M.id) &&  A(C.id)) r1 = true;   // 정상×정상 → 발현      : 우성 불가
      if ( A(F.id) &&  A(M.id) && !A(C.id)) r2 = true;   // 발현×발현 → 정상      : 열성 불가
      if (C.sex === 'F'){
        if ( A(F.id) && !A(C.id)) r3 = true;             // 발현 아버지 → 정상 딸 : X우성 불가
        if (!A(F.id) &&  A(C.id)) r4 = true;             // 정상 아버지 → 발현 딸 : X열성 불가
      } else {
        if (!A(M.id) &&  A(C.id)) r5 = true;             // 정상 어머니 → 발현 아들: X우성 불가
        if ( A(M.id) && !A(C.id)) r6 = true;             // 발현 어머니 → 정상 아들: X열성 불가
      }
    });
  });
  return { AD: !r1, AR: !r2, XD: !(r1||r3||r5), XR: !(r2||r4||r6) };
}
{
  let seed = 20260910;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = n => Math.floor(rnd() * n);
  let cases = 0, mism = 0, uniq = 0, none = 0;
  for (let t = 0; t < 1200; t++){
    const people = [], unions = [];
    let id = 1;
    const nFam = 1 + pick(2);
    const gen1 = [];
    for (let f = 0; f < nFam; f++){
      const fa = id++, mo = id++;
      people.push([fa,'M',0]); people.push([mo,'F',0]);
      const nk = 1 + pick(3);
      const kids = [];
      for (let k = 0; k < nk; k++){
        const c = id++;
        people.push([c, rnd() < .5 ? 'M' : 'F', 0]);
        kids.push(c); gen1.push(c);
      }
      unions.push([fa, mo, kids]);
    }
    // 손자 세대 — 때로는 두 집안의 자녀끼리(잇는 결혼)
    if (gen1.length >= 2 && rnd() < .75){
      let A, B;
      if (nFam === 2 && rnd() < .5){
        A = gen1[pick(gen1.length)];
        B = gen1[pick(gen1.length)];
        if (A === B) B = gen1[(gen1.indexOf(A)+1) % gen1.length];
      } else {
        A = gen1[pick(gen1.length)];
        B = id++; people.push([B, 'F', 0]);
      }
      const pa = people.find(p => p[0] === A), pb = people.find(p => p[0] === B);
      if (pa && pb && pa[1] !== pb[1]){
        const kids = [];
        const nk = 1 + pick(2);
        for (let k = 0; k < nk; k++){
          const c = id++;
          people.push([c, rnd() < .5 ? 'M' : 'F', 0]);
          kids.push(c);
        }
        unions.push([A, B, kids]);
      }
    }
    // 발현 표시를 무작위로
    people.forEach(p => { p[2] = rnd() < .42 ? 1 : 0; });
    const st = build(people, unions, { state:{ traitCount:1 } });
    const o = oracle(st);
    const v = S.verdict(st, 0, S.layout(st));
    cases++;
    let bad = false;
    v.hyps.forEach(h => { if (h.ok !== o[h.k]) bad = true; });
    if (bad){
      mism++;
      if (mism <= 3) console.error('    갈림: ' + JSON.stringify({ people, unions,
        엔진: v.hyps.map(h=>h.k+':'+h.ok).join(' '), 오라클: JSON.stringify(o) }));
    }
    if (v.unique) uniq++;
    if (v.bad) none++;
  }
  eq(mism, 0, '★' + cases + '개 가계도에서 탐색 판정 = 규칙 오라클 판정');
  ok(uniq > 100, '그중 확정되는 것이 넉넉히 나온다 (' + uniq + '건) — 조건이 헛돌지 않았다');
  ok(none > 0, '성립하지 않는 가계도도 나온다 (' + none + '건)');
}

/* ══ 10. 유전자형과 확률 ══ */
console.log('[10] 유전자형·확률');
{
  // X 열성 — 색맹 전형: 정상 부모 → 색맹 아들. 어머니는 보인자로 확정된다
  const st = build([[1,'M'],[2,'F'],[3,'M',1],[4,'F']], [[1,2,[3,4]]], { state:{traitCount:1} });
  st.people[0].traits[0] = false;
  const v = S.verdict(st, 0, S.layout(st));
  ok(!v.unique, 'X 열성 전형은 상/성이 갈리지 않는다');
  // X 열성만 남게 딸을 발현으로 → 아니, 정상 아버지의 발현 딸은 X열성을 배제한다.
  // 대신 발현 어머니 × 정상 아버지 → 발현 아들 + 정상 딸 로 X 열성만 남긴다
  const x = build([[1,'M'],[2,'F',1],[3,'M',1],[4,'F']], [[1,2,[3,4]]], { state:{traitCount:1} });
  const vx = S.verdict(x, 0, S.layout(x));
  ok(vx.hyps.find(h=>h.k==='XR').ok, '발현 어머니 → 발현 아들 : X 열성 가능');
  // 확률은 분수 문자열이고 약분되어 있다
  const q = build([[1,'M'],[2,'F'],[3,'F',1],[4,'M'],[5,'F'],[6,'M',1]],
                  [[1,2,[3,4]],[4,5,[6]]], { state:{traitCount:1} });
  const vq = S.verdict(q, 0, S.layout(q));
  const r = S.nextChild(q, 0, q.unions[0].id, vq);
  ok(/^\d+(\/\d+)?$/.test(r.pAff), '확률이 분수 문자열');
  eq(r.pAff, '1/4', 'Aa × Aa → 발현 1/4');
  eq(r.pAffM, '1/8', '발현된 남자 1/8');
  eq(r.pNorm, '3/4', '정상 3/4');
  eq(S.frac(2,8), '1/4', '약분한다');
  eq(S.frac(0,8), '0',   '0 은 0');
  eq(S.frac(8,8), '1',   '1 은 1');
  // ★부모가 확정되지 않으면 확률을 내지 않는다
  const u2 = build([[1,'M'],[2,'F'],[3,'M'],[4,'F',1],[5,'M'],[6,'F']],
                   [[1,2,[3,4]],[3,6,[5]]], { state:{traitCount:1} });
  const v2 = S.verdict(u2, 0, S.layout(u2));
  const r2 = S.nextChild(u2, 0, u2.unions[1].id, v2);
  ok(!r2.ok, '★부모 유전자형이 미확정이면 확률을 내지 않는다');
  ok(/단정할 수 없습니다/.test(r2.msg), '그 까닭을 말한다: ' + r2.msg);
  // 가정이 둘 이상이면 아예 내지 않는다
  const many = build([[1,'M'],[2,'F'],[3,'M',1]], [[1,2,[3]]], { state:{traitCount:1} });
  const vm2 = S.verdict(many, 0, S.layout(many));
  ok(!S.nextChild(many, 0, many.unions[0].id, vm2).ok, '가정이 여럿이면 확률을 내지 않는다');
  // 유전자형 표기
  eq(S.genoText(S.HYPS[1], 'Dr', 'M'), 'Aa', '상염색체 표기');
  eq(S.genoText(S.HYPS[3], 'D', 'M'), 'XᴬY', 'X 남자는 반접합 — 유니코드 위첨자(SVG 안전)');
  ok(S.genoText(S.HYPS[3], 'Dr', 'F').indexOf('<') < 0, '유전자형 표기에 태그가 없다');
}

/* ══ 11. 내보내기 — 퀴즈 데이터는 _pedigree_svg.js 로 독립 검증 ══ */
console.log('[11] 내보내기');
{
  const P = require(path.join(__dirname, '..', '활동', '_pedigree_svg.js'));
  const st = build([[1,'M'],[2,'F'],[3,'M',1],[4,'F'],[5,'M'],[6,'F',1]],
                   [[1,2,[3,4]],[4,5,[6]]], { state:{traitCount:1} });
  const lay = S.layout(st);
  const ped = S.toQuizData(st, lay, 0);
  ok(P.checkPedigree(ped) === true, '★내보낸 데이터가 _pedigree_svg.js 의 checkPedigree 를 통과한다');
  const svg = P.pedigreeSVG(ped, { alt:'검사' });
  ok(/^<svg /.test(svg), '퀴즈 렌더러가 그대로 그린다');
  eq(S.quizWarnings(ped).length, 0, '멀쩡한 가계도는 내보내기 경고 0건');
  // 행이 최종 x 오름차순인가 (퀴즈 렌더러는 행 순서만 보고 다시 배치한다)
  ped.gens.forEach((row, g) => {
    for (let i = 1; i < row.length; i++){
      const a = st.people.find(p => lay.labels[p.id] === row[i-1].id);
      const b = st.people.find(p => lay.labels[p.id] === row[i].id);
      ok(lay.pos[a.id].x <= lay.pos[b.id].x, 'Ⅰ' + g + ' 행이 x 오름차순');
    }
  });
  /* ★people 차례와 화면 x 차례가 어긋나는 가계도 — 정렬을 빼면 여기서 걸린다.
     3은 바깥 배우자를 들여 형제 중 오른쪽 끝으로 밀리므로 화면에서는 4가 먼저 온다. */
  const mixed = build([[1,'M'],[2,'F'],[3,'M'],[4,'M'],[5,'F'],[6,'M'],[7,'F']],
                      [[1,2,[3,4]],[6,7,[5]],[3,5,[]]], { state:{traitCount:1} });
  const mLay = S.layout(mixed);
  ok(mLay.pos['4'].x < mLay.pos['3'].x, '3이 오른쪽 끝으로 밀렸다(배치 전제 확인)');
  const mPed = S.toQuizData(mixed, mLay, 0);
  const row1 = mPed.gens[1].map(x => x.id).join(',');
  eq(row1, [mLay.labels['4'], mLay.labels['3'], mLay.labels['5']].join(','),
     '★행이 people 차례가 아니라 화면 x 차례로 나간다');
  ok(P.checkPedigree(mPed) === true, '어긋난 경우도 checkPedigree 통과');
  // 부부가 떨어지면 경고를 낸다
  const far = { gens:[[{id:'1',sex:'M',aff:false},{id:'9',sex:'M',aff:false},{id:'2',sex:'F',aff:false}]],
                couples:[['1','2']], sibs:[] };
  ok(S.quizWarnings(far).some(w => /떨어져/.test(w)), '★부부가 떨어져 있으면 경고한다');
  const gap = { gens:[[{id:'1',sex:'M',aff:false},{id:'2',sex:'F',aff:false}],
                      [{id:'3',sex:'M',aff:false},{id:'9',sex:'F',aff:false},{id:'4',sex:'F',aff:false}]],
                couples:[['1','2']], sibs:[{p:['1','2'],c:['3','4']}] };
  ok(S.quizWarnings(gap).some(w => /연속/.test(w)), '★형제가 연속이 아니면 경고한다');
  // aff 는 고른 형질에서 온다
  const two = build([[1,'M',1,0],[2,'F',0,1]], [], { state:{traitCount:2} });
  const l2 = S.layout(two);
  eq(S.toQuizData(two, l2, 0).gens[0].filter(x=>x.aff).length, 1, '형질 1 기준 발현 1명');
  eq(S.toQuizData(two, l2, 1).gens[0].filter(x=>x.aff).length, 1, '형질 2 기준 발현 1명');
  ok(S.toQuizData(two, l2, 0).gens[0][0].aff !== S.toQuizData(two, l2, 1).gens[0][0].aff,
     '어느 형질로 내보내는지에 따라 값이 갈린다');
  // 리터럴 문자열
  const lit = S.quizLiteral(ped);
  ok(lit.indexOf('gens:') > 0 && lit.indexOf('couples:') > 0 && lit.indexOf('sibs:') > 0, '리터럴 형태');
  ok(/M\(\d+,'[MF]',[01]\)/.test(lit), 'M(id, sex, aff) 형태로 나온다');
}

/* ══ 12. 저장·복원 ══ */
console.log('[12] 저장·복원');
{
  ok(S.normalizeState(null) === null, 'null 은 거른다');
  ok(S.normalizeState([]) === null, '배열은 거른다');
  ok(S.normalizeState('x') === null, '문자열은 거른다');
  const n = S.normalizeState({ people:[{id:'a',sex:'Z'},{id:'a',sex:'F'}], unions:[{a:'a',b:'zz'}],
                               traitCount:9, view:{ symbol:9999, row:-5 } });
  eq(n.people.length, 1, 'id 중복을 거른다');
  eq(n.people[0].sex, 'M', '이상한 성별은 남자로');
  eq(n.unions.length, 0, '없는 사람을 가리키는 부부를 거른다');
  eq(n.traitCount, 2, '범위 밖 형질 수는 기본값');
  ok(n.view.symbol <= 60 && n.view.row >= 20, '범위 밖 크기는 잘라 낸다');
  // 왕복
  const st = build([[1,'M',1,0],[2,'F',0,1],[3,'M',1,1]], [[1,2,[3]]], { state:{traitCount:2} });
  st.people[0].dx = 17; st.fillOverride['3'] = 6; st.legend.texts['0|M'] = '나의 문구';
  const round = S.normalizeState(JSON.parse(JSON.stringify(st)));
  eq(round.people[0].dx, 17, 'dx 가 왕복에서 보존된다');
  eq(round.fillOverride['3'], 6, '팔레트 지정이 왕복에서 보존된다');
  eq(round.legend.texts['0|M'], '나의 문구', '범례 문구가 왕복에서 보존된다');
  eq(JSON.stringify(S.layout(round).pos), JSON.stringify(S.layout(st).pos), '왕복 뒤 배치가 같다');
  // 두 탭 — 저장소의 seq 가 더 크면 덮지 않는다
  const T = makeSandbox({ 'pedigree_maker_v1': JSON.stringify({ seq: 999, people:[], unions:[] }) });
  const mine = T.freshState(); mine.seq = 3;
  eq(T.saveState(mine), false, '★저장소의 seq 가 크면 덮지 않는다(두 탭 사고)');
  mine.seq = 1000;
  eq(T.saveState(mine), true, 'seq 가 크면 저장한다');
  // 망가진 저장본
  const U = makeSandbox({ 'pedigree_maker_v1': '{{{' });
  ok(U.loadState() === null, '망가진 저장본은 null');
}

/* ══ 13. 말투 — 교사용 도구다(존댓말). 학생용 시험지 문체와는 다른 축이다 ══ */
console.log('[13] 말투');
{
  const strings = (JS.match(/'[^'\\\n]{2,120}'/g) || [])
    .concat(RAW.slice(RAW.indexOf('<body'), RAW.indexOf('<script>')).match(/>[^<>{}]{2,80}</g) || [])
    .filter(s => /[가-힣]/.test(s));
  const BANNED = ['해요','했어요','하죠','거예요','네가','우리가','해 보자','해보자','좋아요','ㅎㅎ','~야','하자.'];
  BANNED.forEach(b => {
    const hit = strings.filter(s => s.indexOf(b) >= 0);
    ok(hit.length === 0, '금지어 없음: ' + b + (hit.length ? '  ← ' + hit[0] : ''));
  });
  // confirm 대화상자는 「~하시겠습니까?」
  /* ★문자열을 이어 붙인 confirm 이 있으므로 호출 전체를 떼어 본다 */
  const confirms = JS.match(/confirm\([^\n]*?\)\s*\)/g) || JS.match(/confirm\([^\n]*/g) || [];
  ok(confirms.length >= 3, 'confirm 이 여러 곳에 있다  (' + confirms.length + '개)');
  /* 「삭제하시겠습니까?」「불러오시겠습니까?」처럼 존대 -시- + -겠습니까? 로 끝나야 한다 */
  confirms.forEach(c => ok(/시겠습니까\?/.test(c), 'confirm 이 「~시겠습니까?」: ' + c.slice(0, 50)));
  // 판정 문장은 존댓말 평서로 끝난다
  const st = build([[1,'M'],[2,'F'],[3,'F',1]], [[1,2,[3]]], { state:{traitCount:1} });
  const v = S.verdict(st, 0, S.layout(st));
  v.hyps.filter(h => !h.ok).forEach(h =>
    ok(/(없습니다|않습니다|입니다)$/.test(h.why.trim()), '판정 근거가 존댓말로 끝난다: ' + h.why.slice(-16)));
  // 조사 고르기 — 숫자를 소리 내어 읽었을 때의 받침
  eq(S.J('1','이','가'), '1이', '일 → 받침 있음');
  eq(S.J('2','이','가'), '2가', '이 → 받침 없음');
  eq(S.J('6','이','가'), '6이', '육 → 받침 있음');
  eq(S.J('4','과','와'), '4와', '사 → 받침 없음');
  eq(S.J('10','은','는'), '10은', '십 → 받침 있음');
  eq(S.J('11','은','는'), '11은', '십일 → 받침 있음');
  eq(S.J('12','은','는'), '12는', '십이 → 받침 없음');
}

console.log('');
console.log('결과: ' + pass + ' 통과, ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
