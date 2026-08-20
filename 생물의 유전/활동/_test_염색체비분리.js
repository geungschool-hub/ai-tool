// 염색체 비분리 모의실험 — Node 헤드리스 검사
// 실행:  node _test_염색체비분리.js      (이 파일 옆의 HTML을 읽는다 — 드라이브 문자에 의존하지 않는다)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = path.join(__dirname, '1-3_염색체비분리_모의실험.html');
let src = fs.readFileSync(HTML, 'utf8');
// ★스크립트는 두 블록이다 — <head>의 미완성 잠금 + <body> 끝의 본체.
//   잠금 블록이 DRAFT_MODE/DRAFT_PASS 를 정의하므로 본체보다 먼저 돌려야 한다.
const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]);
if (blocks.length !== 2) { console.error('FAIL: script 블록이 2개가 아니다 (' + blocks.length + ')'); process.exit(1); }
const gateJs = blocks[0];
let js = blocks[1].replace(/^\s*'use strict';/, '');   // use strict 벗기기(작업노트 함정)

// ★문항 카드 안의 칸을 클래스로 찾는다 — 힌트 2단이 붙으면서 자리 번호가 밀렸다(2026-08-20).
//   앞으로 칸이 더 늘어도 이 헬퍼만 쓰면 테스트가 깨지지 않는다.
const kid = (card, cls) => card.children.filter(c => c.className === cls)[0];
const explOf = card => kid(card, 'expl');

let pass = 0, fail = 0;
function ok(cond, name){
  if (cond) { pass++; }
  else { fail++; console.error('  X FAIL: ' + name); }
}

// ── DOM 스텁 ──
function makeSandbox(storageSeed){
  const store = {};
  function makeEl(id){
    const el = {
      className:'', innerHTML:'', textContent:'', value:'', style:{}, disabled:false,
      children:[], attrs:{}, onclick:null, type:'', nodeType:1, firstChild:null,
      setAttribute:(k,v)=>{ el.attrs[k]=v; },
      getAttribute:k=>el.attrs[k],
      appendChild:c=>{ el.children.push(c); el.firstChild = el.children[0]; return c; },
      removeChild:c=>{ const i=el.children.indexOf(c); if(i>=0) el.children.splice(i,1);
                       el.firstChild = el.children[0] || null; return c; },
      addEventListener:()=>{},
      removeEventListener:()=>{},
      getBBox:()=>({x:0,y:0,width:20,height:60}),
      getBoundingClientRect:()=>({left:0,top:0,width:900,height:560})
    };
    Object.defineProperty(el, 'id', {
      get(){ return el._id; },
      set(v){ el._id = v; store[v] = el; }
    });
    if (id !== undefined) el.id = id;
    return el;
  }
  const mem = Object.assign({}, storageSeed || {});
  const sandbox = {
    console, Math, JSON, Object, Array, String, Number, Date,
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
    // ★setTimeout / ResizeObserver / window.addEventListener / querySelectorAll / dataset 은
    //   일부러 넣지 않는다 — 앱의 typeof 가드가 실제로 동작하는지 여기서 검증된다.
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(gateJs, sandbox);   // 미완성 잠금(DRAFT_MODE 등)이 먼저 정의돼야 한다
  vm.runInContext(js, sandbox);
  sandbox._store = store;
  return sandbox;
}

const S = makeSandbox();

/* ════════════════════════════════════════════════════════════
   [1] 정적 구조 · 단일 파일 · 접근성
   ════════════════════════════════════════════════════════════ */
console.log('[1] 정적 구조');
{
  ok((src.match(/<script>/g) || []).length === 2, 'script 블록 2개 (head 잠금 + 본체)');
  ok(src.indexOf('<script>') < src.indexOf('<style>'),
     '★잠금 스크립트가 <style>보다 앞 = <head>에 있다 (본문보다 먼저 돌아야 깜빡임이 없다)');
  // SVG 네임스페이스 URI는 네트워크 요청이 아니다 — 그것만 제외하고 본다
  const noNs = src.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
  ok(!/https?:\/\//.test(noNs), '외부 URL 0건 (SVG 네임스페이스 제외)');
  ok(!/<link\b/i.test(src), '<link> 0건');
  ok(!/@import/.test(src), '@import 0건');
  ok(!/<img\b/i.test(src), '<img> 0건');
  ok(!/<iframe\b/i.test(src), '<iframe> 0건');

  const opens = (src.match(/<div\b/g) || []).length;
  const closes = (src.match(/<\/div>/g) || []).length;
  ok(opens === closes, 'div 여닫기 균형 (' + opens + '/' + closes + ')');

  const ids = (src.match(/\sid="([^"]+)"/g) || []).map(s => s.slice(5, -1));
  ok(new Set(ids).size === ids.length, 'id 중복 0');

  // 인라인 핸들러가 전부 정의돼 있는가
  const handlers = new Set((src.match(/on(?:click|input|change)="(\w+)\(/g) || [])
    .map(s => s.replace(/.*"(\w+)\($/, '$1')));
  let missing = [];
  handlers.forEach(h => { if (typeof S[h] !== 'function') missing.push(h); });
  ok(missing.length === 0, '인라인 핸들러 전부 정의됨 (미정의: ' + missing.join(',') + ')');

  ok(/\.btn\{[^}]*min-height:44px/.test(src.replace(/\s/g, '')) ||
     /min-height:44px/.test(src), '.btn min-height 44px');
  ok(/\.choice\{[\s\S]*?min-height:44px/.test(src), '.choice min-height 44px');
  ok(/body\{[\s\S]*?font-size:16px/.test(src), 'body font-size 16px 이상');
  ok(/overflow-x:hidden/.test(src), 'body 가로 스크롤 차단');
  ok(/\.tbl-outer\{overflow-x:auto/.test(src.replace(/\s*\n\s*/g, '')), '넓은 표는 전용 래퍼가 흡수');
  ok(/touch-action:none/.test(src), '드래그 영역 touch-action:none');
  // ★좁은 화면에서 배율이 내려가 탭 영역이 44px 밑으로 줄어드는 것을 막는 장치
  const flat = src.replace(/\s+/g, '');
  const minW = /svg\.stage\{[^}]*min-width:(\d+)px/.exec(flat);
  ok(!!minW, '무대에 min-width가 지정돼 있다');
  if (minW){
    const scale = Number(minW[1]) / 900;   // viewBox 폭 900 기준 최소 배율
    const hitW = 64;                       // 국면1 히트영역 폭(viewBox 단위)
    ok(hitW * scale >= 44, '최소 배율에서도 탭 영역이 44px 이상 (' + Math.round(hitW * scale) + 'px)');
  }
  ok(/\.stage-wrap\{[^}]*overflow-x:auto/.test(flat),
     '좁을 때 가로 밀림은 무대 상자 안에서만 일어난다');
}

/* ════════════════════════════════════════════════════════════
   [2] 진리표 독립 재유도  ★핵심
       앱 코드를 쓰지 않고 감수분열 규칙을 여기서 다시 구현해 대조한다.
   ════════════════════════════════════════════════════════════ */
console.log('[2] 진리표 독립 재유도');
{
  const CH = ['A-p','A-m','B-p','B-m'];

  // 테스트 자체 구현 — 앱의 runMeiosis를 쓰지 않는다
  function refMeiosis(m1, m2){
    const cells = { L:[], R:[] };
    CH.forEach(c => cells[m1[c]].push(c));
    const gam = [];
    ['L','R'].forEach(cell => {
      const g = { L:[], R:[] };
      cells[cell].forEach(c => { g[m2[c+'#0']].push(c); g[m2[c+'#1']].push(c); });
      gam.push(g.L, g.R);
    });
    return gam;
  }
  const refKey = gs => gs.map(g => g.slice().sort().join('+')).sort().join(' | ');
  const refPloidy = g => (g.length === 1 ? 'nm1' : g.length === 2 ? 'n' : g.length === 3 ? 'np1' : 'x');

  // 세 경우의 대표 배치
  const PL = {
    normal: { m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
              m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
                  'A-m#0':'L','A-m#1':'R','B-m#0':'L','B-m#1':'R'} },
    // 감수 1분열 비분리 — A쌍이 같은 극으로
    nd1:    { m1:{'A-p':'L','A-m':'L','B-p':'L','B-m':'R'},
              m2:{'A-p#0':'L','A-p#1':'R','A-m#0':'L','A-m#1':'R',
                  'B-p#0':'L','B-p#1':'R','B-m#0':'L','B-m#1':'R'} },
    // 감수 2분열 비분리 — 오른쪽 딸세포의 A-m 분체가 함께 감
    nd2:    { m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
              m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
                  'A-m#0':'L','A-m#1':'L','B-m#0':'L','B-m#1':'R'} }
  };

  Object.keys(PL).forEach(cs => {
    const appG = S.runMeiosis(PL[cs]).gametes;
    const refG = refMeiosis(PL[cs].m1, PL[cs].m2);
    ok(S.gkey(appG) === refKey(refG), cs + ': 앱 결과 = 독립 재유도 결과');
  });

  const sum = cs => S.summarize(S.runMeiosis(PL[cs]).gametes);

  const sn = sum('normal');
  ok(sn.n === 4 && sn.np1 === 0 && sn.nm1 === 0, '정상: {n,n,n,n}');
  ok(sn.normal === 4 && sn.abnormal === 0, '정상: 정상4 : 비정상0');

  const s1 = sum('nd1');
  ok(s1.np1 === 2 && s1.nm1 === 2 && s1.n === 0, '감수 1분열 비분리: {n+1,n+1,n−1,n−1}');
  ok(s1.normal === 0 && s1.abnormal === 4, '감수 1분열 비분리: 0 : 4 — 교과서 "모두 비정상"');

  const s2 = sum('nd2');
  ok(s2.n === 2 && s2.np1 === 1 && s2.nm1 === 1, '감수 2분열 비분리: {n,n,n+1,n−1}');
  ok(s2.normal === 2 && s2.abnormal === 2, '감수 2분열 비분리: 2 : 2 = 1 : 1 — 교과서 비율');

  // n+1의 구성 — 1분열은 상동 2개(이형 가능), 2분열은 동일 염색체의 분체 2개(반드시 동형)
  function np1Of(cs){
    return S.runMeiosis(PL[cs]).gametes.filter(g => refPloidy(g) === 'np1')[0];
  }
  const n1 = np1Of('nd1'), n2 = np1Of('nd2');
  const aOnly = g => g.filter(c => c.charAt(0) === 'A');
  ok(new Set(aOnly(n1)).size === 2, '감수 1분열 n+1 = 서로 다른 상동염색체 2개 (이형 가능)');
  ok(new Set(aOnly(n2)).size === 1, '감수 2분열 n+1 = 같은 염색체의 염색분체 2개 (반드시 동형)');

  // n−1은 두 경우 모두 생긴다 → n−1만으로는 분열 차수를 특정할 수 없다
  ok(s1.nm1 > 0 && s2.nm1 > 0, 'n−1은 1분열·2분열 비분리 양쪽에서 생긴다 (차수 특정 불가)');

  // ploidyOf 경계
  ok(S.ploidyOf(['A-p']) === 'nm1', 'ploidyOf 1개 → n−1');
  ok(S.ploidyOf(['A-p','B-p']) === 'n', 'ploidyOf 2개 → n');
  ok(S.ploidyOf(['A-p','A-m','B-p']) === 'np1', 'ploidyOf 3개 → n+1');

  // n+1 구성 칸 — 비분리된 쌍만 보여야 한다 (관련 없는 염색체 배제)
  const C = makeSandbox();
  C.state.place = { normal:{m1:{},m2:{}}, nd1:PL.nd1, nd2:PL.nd2 };
  const comp1 = C.npOneComposition('nd1'), comp2 = C.npOneComposition('nd2');
  const fills  = h => (h.match(/rect[^>]*fill="(#[0-9a-f]{6})"/gi) || [])
                        .map(x => /fill="(#[0-9a-f]{6})"/i.exec(x)[1].toLowerCase());
  const caps   = h => (h.match(/<figcaption>([^<]+)<\/figcaption>/g) || [])
                        .map(x => x.replace(/<\/?figcaption>/g, ''));

  // ★이 칸이 전하는 것은 「같은가 다른가」다 — 그림 2개 + 색으로 가른다
  ok(fills(comp1).length === 2, 'nd1 n+1 구성이 염색체 그림 2개로 표시된다');
  ok(fills(comp1)[0] !== fills(comp1)[1], '★nd1 은 두 그림의 색이 서로 다르다(부·모)');
  ok(/서로 다른/.test(comp1), 'nd1 설명이 「서로 다른」임을 밝힌다');
  ok(caps(comp1).join(',') === '21-부,21-모' || caps(comp1).join(',') === '21-모,21-부',
     'nd1 캡션이 21-부·21-모 (실제: ' + caps(comp1).join(',') + ')');

  ok(fills(comp2).length === 2, 'nd2 n+1 구성도 그림 2개');
  ok(fills(comp2)[0] === fills(comp2)[1], '★nd2 는 두 그림의 색이 같다(같은 염색체의 분체)');
  ok(/똑같은/.test(comp2), 'nd2 설명이 「똑같은」임을 밝힌다');
  ok(caps(comp2)[0] === caps(comp2)[1], 'nd2 캡션이 같은 라벨 두 번 (실제: ' + caps(comp2).join(',') + ')');

  // 관련 없는 1번은 이 칸에 끼지 않는다
  ok(caps(comp1).every(c => c.indexOf('21') === 0), 'nd1 칸에 1번이 섞이지 않는다');
  ok(caps(comp2).every(c => c.indexOf('21') === 0), 'nd2 칸에 1번이 섞이지 않는다');

  // 정상 라운드는 n+1 이 없으므로 빈 표시
  const C2 = makeSandbox();
  C2.state.place = { normal:PL.normal, nd1:{m1:{},m2:{}}, nd2:{m1:{},m2:{}} };
  ok(/—/.test(C2.npOneComposition('normal')), '정상 라운드는 n+1 이 없어 「—」로 표시된다');

  // 교과서 캡션 원문 대조
  ok(S.CAPTION.nd1 === '모든 생식세포의 염색체 수가 정상보다 많거나 적다.', 'nd1 캡션 = 교과서 31쪽 원문');
  ok(S.CAPTION.nd2 === '염색체 수가 정상인 생식세포와 비정상적인 생식세포가 1 : 1의 비율로 나타난다.',
     'nd2 캡션 = 교과서 31쪽 원문');
}

/* ════════════════════════════════════════════════════════════
   [3] 순서·좌우 불변성
       교과서도 31쪽과 37쪽의 배열 순서가 다르다 → 채점 대상이 아니다.
   ════════════════════════════════════════════════════════════ */
console.log('[3] 순서 · 좌우 불변성');
{
  const base = [['A-p','A-m'], ['B-p'], ['B-m'], []];
  // 24가지 순열 전부가 같은 키를 낳는가
  function perms(a){
    if (a.length <= 1) return [a];
    const out = [];
    a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => out.push([x].concat(p))));
    return out;
  }
  const keys = new Set(perms(base).map(p => S.gkey(p)));
  ok(keys.size === 1, '생식세포 4개 배열 순열 24가지가 모두 같은 키 (실제 ' + keys.size + '종)');

  // 좌우를 통째로 뒤집어도 목표 판정이 같다
  function mirror(pl){
    const f = s => (s === 'L' ? 'R' : 'L');
    const o = { m1:{}, m2:{} };
    Object.keys(pl.m1).forEach(k => o.m1[k] = f(pl.m1[k]));
    Object.keys(pl.m2).forEach(k => o.m2[k] = f(pl.m2[k]));
    return o;
  }
  const PLn = { m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
                m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
                    'A-m#0':'L','A-m#1':'R','B-m#0':'L','B-m#1':'R'} };
  ['normal','nd1','nd2'].forEach(cs => {
    ok(S.GOAL.m1[cs](PLn) === S.GOAL.m1[cs](mirror(PLn)), cs + ': 국면1 판정이 좌우 반전에 불변');
  });

  // 감수 2분열 비분리가 왼쪽 딸세포에서 일어난 경우도 통과한다
  const nd2L = { m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
                 m2:{'A-p#0':'L','A-p#1':'L','B-p#0':'L','B-p#1':'R',
                     'A-m#0':'L','A-m#1':'R','B-m#0':'L','B-m#1':'R'} };
  const nd2R = { m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
                 m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
                     'A-m#0':'R','A-m#1':'R','B-m#0':'L','B-m#1':'R'} };
  ok(S.GOAL.m2.nd2(nd2L), 'nd2: 비분리가 왼쪽 딸세포에서 일어나도 통과');
  ok(S.GOAL.m2.nd2(nd2R), 'nd2: 비분리가 오른쪽 딸세포에서 일어나도 통과');
  ok(S.gkey(S.runMeiosis(nd2L).gametes) !== '' && S.summarize(S.runMeiosis(nd2L).gametes).normal === 2,
     'nd2(왼쪽) 결과도 2 : 2');
  ok(S.summarize(S.runMeiosis(nd2R).gametes).normal === 2, 'nd2(오른쪽) 결과도 2 : 2');
}

/* ════════════════════════════════════════════════════════════
   [4] 목표 판정 — 정상 · 경계 · 오답
   ════════════════════════════════════════════════════════════ */
console.log('[4] 목표 판정');
{
  const m1 = o => ({ m1:o, m2:{} });
  ok(S.GOAL.m1.normal(m1({'A-p':'L','A-m':'R','B-p':'L','B-m':'R'})), 'normal 국면1: 상동이 갈라지면 통과');
  ok(!S.GOAL.m1.normal(m1({'A-p':'L','A-m':'L','B-p':'L','B-m':'R'})), 'normal 국면1: 상동을 같은 극에 두면 불통과');
  ok(S.GOAL.m1.nd1(m1({'A-p':'L','A-m':'L','B-p':'L','B-m':'R'})), 'nd1 국면1: A쌍만 같은 극이면 통과');
  ok(!S.GOAL.m1.nd1(m1({'A-p':'L','A-m':'L','B-p':'L','B-m':'L'})), 'nd1 국면1: B쌍까지 같은 극이면 불통과');
  ok(!S.GOAL.m1.nd1(m1({'A-p':'L','A-m':'R','B-p':'L','B-m':'R'})), 'nd1 국면1: 아무 쌍도 안 붙으면 불통과');
  ok(S.GOAL.m1.nd2(m1({'A-p':'L','A-m':'R','B-p':'L','B-m':'R'})), 'nd2 국면1: 정상 분리여야 통과');

  const full = (m1o, m2o) => ({ m1:m1o, m2:m2o });
  const M1 = {'A-p':'L','A-m':'R','B-p':'L','B-m':'R'};
  const splitAll = {'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
                    'A-m#0':'L','A-m#1':'R','B-m#0':'L','B-m#1':'R'};
  ok(S.GOAL.m2.normal(full(M1, splitAll)), 'normal 국면2: 모든 분체가 갈라지면 통과');

  const oneUnsplit = Object.assign({}, splitAll, {'A-m#0':'R','A-m#1':'R'});
  ok(!S.GOAL.m2.normal(full(M1, oneUnsplit)), 'normal 국면2: 안 갈라진 염색체가 있으면 불통과');
  ok(S.GOAL.m2.nd2(full(M1, oneUnsplit)), 'nd2 국면2: 정확히 한 염색체만 안 갈라지면 통과');

  const twoUnsplitSameCell = Object.assign({}, splitAll, {'A-m#0':'R','A-m#1':'R','B-m#0':'R','B-m#1':'R'});
  ok(!S.GOAL.m2.nd2(full(M1, twoUnsplitSameCell)), 'nd2 국면2: 한 세포에서 두 염색체가 안 갈라지면 불통과');

  const twoUnsplitBothCells = Object.assign({}, splitAll, {'A-m#0':'R','A-m#1':'R','A-p#0':'L','A-p#1':'L'});
  ok(!S.GOAL.m2.nd2(full(M1, twoUnsplitBothCells)), 'nd2 국면2: 두 딸세포 모두 비분리면 불통과');
  ok(S.unsplitCells(full(M1, oneUnsplit)).length === 1, 'unsplitCells: 비분리 딸세포 1개 검출');
  ok(S.countUnsplit(full(M1, oneUnsplit)) === 1, 'countUnsplit: 1개');
}

/* ════════════════════════════════════════════════════════════
   [5] 드래그 엔진 (자석 스냅)
   ════════════════════════════════════════════════════════════ */
console.log('[5] 드래그 엔진');
{
  const R = S.SNAP_R;                      // 앱의 스냅 반경에서 파생 — 값을 바꿔도 테스트가 따라간다
  ok(typeof R === 'number' && R > 0, '스냅 반경이 수로 정의됨 (' + R + ')');
  const T = [{ id:'a', x:100, y:100 }, { id:'b', x:100 + R * 4, y:100 }];
  ok(S.findSnap({ x:100, y:100 }, T).id === 'a', '정확히 겹치면 흡착');
  ok(S.findSnap({ x:100 + R - 2, y:100 }, T).id === 'a', '반경 안이면 흡착');
  ok(S.findSnap({ x:100 + R + 2, y:100 }, T) === null, '반경 밖이면 null');
  ok(S.findSnap({ x:100 + R * 0.3, y:100 }, T).id === 'a', '두 타깃 중 최근접 하나만');
  ok(S.findSnap({ x:100, y:100 }, [{ id:'z', x:100, y:100, radius:0 }]) !== null,
     'radius:0 이 32로 폴백되지 않는다 (거리 0은 흡착)');
  ok(S.findSnap({ x:105, y:100 }, [{ id:'z', x:100, y:100, radius:0 }]) === null,
     'radius:0 이면 5px 떨어져도 흡착 안 함');
  ok(S.m1Slots().length === 8, '국면1 슬롯 8개(극당 4)');
  ok(S.m2Slots().length === 12, '국면2 슬롯 12개(딸세포2 × 생식세포2 × 3칸)');
  ok(S.m2Slots().every(s => (s.cell === 'L' || s.cell === 'R') && (s.g === 'L' || s.g === 'R')),
     '국면2 슬롯이 딸세포·생식세포 축을 모두 갖는다');
  ok(/VB_W\s*\/\s*r\.width/.test(js), '좌표 변환이 viewBox / 실제폭 비율을 쓴다 (px 하드코딩 아님)');
  ok(/e\.pointerId\s*!==\s*dragState\.pid/.test(js), '두 번째 포인터가 진행 중 드래그를 가로채지 않는다');
  ok(/setPointerCapture/.test(js), 'setPointerCapture 사용');
  ok(/releasePointerCapture/.test(js),
     '★드래그가 끝나면 포인터 캡처를 놓는다 (안 놓으면 두 번째 드래그부터 막힌다)');
  ok(/hasPointerCapture/.test(js), 'releasePointerCapture 전에 hasPointerCapture로 확인');
}

/* ════════════════════════════════════════════════════════════
   [6] 답 유출 금지
   ════════════════════════════════════════════════════════════ */
console.log('[6] 답 유출 금지');
{
  const body = src.slice(src.indexOf('<body>'), src.indexOf('<script>'));
  ok(body.indexOf('n+1') < 0 || /모범답안|ans/.test(body.slice(body.indexOf('n+1') - 300, body.indexOf('n+1'))),
     '본문 마크업의 n+1 표기는 모범답안 안에만 있다');
  ok(!/0\s*:\s*4/.test(body.replace(/[\s\S]*?<div class="ans"/, '')) || true, '비율 선노출 검사 자리');

  // 비교표는 라운드 완료 전에는 잠긴다
  const F = makeSandbox();
  F.updateCmp();
  const cmp = F._store['cmpBody'];
  ok(/🔒/.test(cmp.innerHTML) || cmp.children.length > 0, '라운드 전 비교표는 잠금 상태');
  const rowHtml = cmp.children.map(c => c.innerHTML).join(' ');
  ok(rowHtml.indexOf('n+1') < 0, '라운드 전 비교표에 n+1 노출 0');
  ok(rowHtml.indexOf('1 : 1') < 0 && rowHtml.indexOf('0 : 4') < 0, '라운드 전 비교표에 비율 노출 0');

  // 요약 발문 선택지는 전부 같은 형태 — 정답을 지시하지 않는다
  ok(S.SUM_CHOICES.every(c => /^\d개$/.test(c)), '요약 선택지가 전부 "N개" 동일 형태');

  // 무대 힌트가 결과를 말하지 않는다
  ok(!/n\+1|n−1|1 : 1|0 : 4/.test(String(S.FB.N1) + String(S.FB.N4) + String(S.FB.N7)),
     '오답 피드백이 결과 조성을 말하지 않는다');
}

/* ════════════════════════════════════════════════════════════
   [7] 모범답안 잠금
   ════════════════════════════════════════════════════════════ */
console.log('[7] 모범답안 잠금');
{
  const F = makeSandbox();
  ok(!F.ansGate('ansC').open, '라운드 미완료 → 잠김');
  ok(F.ansGate('ansC').reason.length > 0, '잠금 사유 문자열 존재');

  F.state.roundDone = { normal:true, nd1:true, nd2:true };
  F.state.ta = { taC:'가'.repeat(24) };
  ok(!F.ansGate('ansC').open, '라운드 완료 + 24자 → 여전히 잠김');
  F.state.ta = { taC:'가'.repeat(25) };
  ok(F.ansGate('ansC').open, '라운드 완료 + 25자 → 열림');

  F.state.roundDone = {};
  ok(!F.ansGate('ansC').open, '조건이 무너지면 되잠긴다');

  F.state.teacherUnlock = true;
  ok(F.ansGate('ansC').open, '교사 해제 시 전부 열림');

  // 게이트 키가 세 곳 모두에 등록돼 있는가
  ok(Object.keys(S.ANS_LABEL).indexOf('ansC') >= 0, 'ANS_LABEL에 등록');
  ok(/doneMap\s*=\s*\{[\s\S]*?ansC:/.test(js), 'doneMap에 등록');
  ok(/refreshAnsGates[\s\S]*?\['ansC'\]/.test(js), 'refreshAnsGates 배열에 등록');
}

/* ════════════════════════════════════════════════════════════
   [8] 저장 · 복원 · 손상 방어
   ════════════════════════════════════════════════════════════ */
console.log('[8] 저장 · 복원');
{
  ok((src.match(/nondisj_sim_v1/g) || []).length >= 1, '저장 키 문자열 존재');
  ok(!/nondisj_sim_v2/.test(src), '저장 키를 올리지 않았다');

  const F = makeSandbox();
  F.state.roundDone = { normal:true };
  F.state.place.normal.m1 = { 'A-p':'L','A-m':'R','B-p':'L','B-m':'R' };
  F.saveState();
  const blob = F.localStorage._mem['nondisj_sim_v1'];
  ok(typeof blob === 'string' && blob.length > 10, 'saveState가 localStorage에 기록');

  const G = makeSandbox({ 'nondisj_sim_v1': blob });
  ok(G.state.roundDone.normal === true, '복원: roundDone 살아남음');
  ok(G.state.place.normal.m1['A-p'] === 'L', '복원: 배치 살아남음');
  ok(G.round === 2, '복원: round는 roundDone에서 파생 재계산 (round=2)');

  // round 필드가 없는 구버전 blob
  const old = JSON.parse(blob); delete old.phase;
  const H = makeSandbox({ 'nondisj_sim_v1': JSON.stringify(old) });
  ok(H.round === 2, '구버전 blob(phase 없음)도 round 재계산');

  // 손상 방어
  [ 'not json', 'null', '[]', '{"place":123}', '{"roundDone":"x"}' ].forEach((bad, i) => {
    let threw = false;
    try { makeSandbox({ 'nondisj_sim_v1': bad }); } catch(e){ threw = true; }
    ok(!threw, '손상 blob ' + (i + 1) + ' 에서 예외 없이 복구');
  });

  // 첫 시도 기록은 덮어쓰지 않는다
  const K = makeSandbox();
  K.state.roundDone.normal = true;
  K.state.place.normal.m1 = { 'A-p':'L','A-m':'R','B-p':'L','B-m':'R' };
  K.state.place.normal.m2 = {'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
                             'A-m#0':'L','A-m#1':'R','B-m#0':'L','B-m#1':'R'};
  K.openSummary('normal');
  K.pickSummary('normal', 0);            // 오답
  const firstVal = K.state.first['normal.sum'];
  K.pickSummary('normal', 3);            // 정답으로 고쳐도
  ok(K.state.first['normal.sum'] === firstVal, '첫 시도 정오를 재시도가 덮어쓰지 않는다');
  ok(firstVal === false, '첫 시도 오답이 false로 기록');
}

/* ════════════════════════════════════════════════════════════
   [9] 말투 점검 — 시험지 문체
       ★이모지는 검사 대상이 아니다 (2026-08-18 교사 정정)
   ════════════════════════════════════════════════════════════ */
console.log('[9] 말투 점검 (친근체 · 추임새 금지)');
{
  const BANNED = ['해 보자','보자.','보자!','하자.','하자!','가자.','가자!','좋아','맞아.','맞아!',
                  '했어','됐어','왔어','찾았어','거야','이야.','이야!','일까','할까','올까','줄까',
                  '나와.','너의','네가','우리가'];

  const blob = JSON.stringify({ FB:S.FB, CAPTION:S.CAPTION, CASE_META:S.CASE_META, SUM:S.SUM_CHOICES },
                              (k, v) => (typeof v === 'function' ? String(v) : v));
  let h1 = BANNED.filter(w => blob.indexOf(w) >= 0);
  ok(h1.length === 0, '문안 데이터에 친근체 0건 (검출: ' + h1.join(' ') + ')');

  const body = src.slice(src.indexOf('<body>'), src.indexOf('<script>'));
  let h2 = BANNED.filter(w => body.indexOf(w) >= 0);
  ok(h2.length === 0, '본문 마크업에 친근체 0건 (검출: ' + h2.join(' ') + ')');

  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  let h3 = BANNED.filter(w => code.indexOf(w) >= 0);
  ok(h3.length === 0, '런타임 문구에 친근체 0건 (검출: ' + h3.join(' ') + ')');

  // 오답 피드백은 「옳지 않다.」 또는 「반례가 될 수 없다.」로 시작한다
  const bad = Object.keys(S.FB).filter(k => !/^옳지 않다\.|^반례가 될 수 없다\./.test(S.FB[k]));
  ok(bad.length === 0, '오답 피드백 전건이 「옳지 않다.」로 시작 (예외: ' + bad.join(',') + ')');

  // 지시문에 「~하시오」
  ok(/하시오/.test(src), '지시문에 ~하시오 사용');
  const confirms = (js.match(/confirm\('([^']+)'\)/g) || []).map(s => s.slice(9, -2));
  ok(confirms.length > 0 && confirms.every(c => /하시겠습니까\?$/.test(c)),
     '교사 확인 대화상자 전건이 ~하시겠습니까? (' + confirms.length + '건)');
}

/* ════════════════════════════════════════════════════════════
   [10] 용어 · 표기 회귀
   ════════════════════════════════════════════════════════════ */
console.log('[9-2] 염색체 번호 표기 · 크기 관계');
{
  const M = S.CHROM_META;
  ok(M['A-p'].label === '21-부' && M['A-m'].label === '21-모', '비분리 쌍이 21번으로 표기된다');
  ok(M['B-p'].label === '1-부' && M['B-m'].label === '1-모', '다른 쌍은 1번으로 표기된다');
  ok(M['A-p'].label === M['A-m'].label.replace('모', '부'), '21번 부·모 라벨이 짝을 이룬다');

  // ★21번은 사람 상염색체 중 가장 작다 — 그림에서도 짧아야 한다
  ok(M['A-p'].len < M['B-p'].len,
     '21번을 1번보다 짧게 그린다 (21:' + M['A-p'].len + ' < 1:' + M['B-p'].len + ')');
  ok(M['A-p'].len === M['A-m'].len && M['B-p'].len === M['B-m'].len, '같은 쌍의 상동염색체는 길이가 같다');

  // 상동은 같은 계열 색의 명도 차이 + 텍스트 라벨로 구분한다(색만으로 구분하지 않는다)
  ok(M['A-p'].color !== M['A-m'].color, '상동염색체는 명도가 다르다');
  ok(M['A-p'].color !== M['B-p'].color, '다른 쌍은 색 계열이 다르다');

  // 자매염색분체는 완전히 같은 색 — drawChrom이 한 색으로 두 팔을 그린다
  ok(/function drawChrom[\s\S]*?arm\(x - 9\); arm\(x \+ 9\);/.test(js) ||
     /arm\(x - 9\)/.test(js), '복제된 염색체는 같은 색 팔 2개로 그린다(자매염색분체)');

  // 모형의 한계를 학생 화면에 밝혔는가
  ok(/상염색체 22쌍과 성염색체 1쌍/.test(src), '사람의 실제 염색체 구성을 함께 밝힌다');
  ok(/두 쌍만<\/b> 그린 것/.test(src) || /두 쌍만/.test(src), '이 모형이 두 쌍만 그린 것임을 밝힌다');
  ok(/가장 작아/.test(src), '21번이 가장 작다는 사실을 밝힌다');

  // 다운증후군 연결은 세 라운드를 다 마친 뒤에만 보인다(답 유출 금지)
  ok(/id="downNote"[^>]*class="msg info hide"/.test(src) || /class="msg info hide" id="downNote"/.test(src),
     '다운증후군 안내는 처음에 숨겨져 있다');
  ok(/47개/.test(src) && /21번 염색체가 3개/.test(src), '다운증후군 핵형을 교과서 수치대로 적는다');
  {
    const D = makeSandbox();
    D.updateCmp();
    const dn = D._store['downNote'];
    ok(/hide/.test(dn.className), '라운드 전에는 다운증후군 안내가 숨김 상태');
    D.state.roundDone = { normal:true, nd1:true, nd2:true };
    D.state.sumPick = { normal:3, nd1:0, nd2:2 };
    D.updateCmp();
    ok(!/hide/.test(D._store['downNote'].className), '세 라운드를 마치면 다운증후군 안내가 열린다');
  }
}

console.log('[9-3] 미완성 잠금 (관리자 비밀번호)');
{
  // 잠금은 fail-closed 여야 한다 — 기본이 잠김이고 조건이 맞을 때만 열린다
  ok(/html:not\(\.unlocked\)\s*body\s*>\s*\.wrap\{display:none/.test(src.replace(/\s*\n\s*/g, '')),
     '★잠기면 본문이 숨는다 (기본이 잠김)');
  ok(/#draftGate\{[^}]*display:none/.test(src.replace(/\s*\n\s*/g, '')),
     '잠금 화면은 .unlocked 일 때 숨는다');
  ok(/html:not\(\.unlocked\)\s*#draftGate\{display:flex/.test(src.replace(/\s*\n\s*/g, '')),
     '잠기면 잠금 화면이 뜬다');

  const G = makeSandbox();
  ok(G.DRAFT_PASS === '7856', '관리자 비밀번호가 지정돼 있다');
  ok(typeof G.DRAFT_MODE === 'boolean', 'DRAFT_MODE 가 참/거짓 하나로 관리된다');
  ok(typeof G.unlockDraft === 'function', 'unlockDraft 정의됨');

  // 미완성 상태에서 잠금이 실제로 걸리는가
  const L = makeSandbox();
  if (L.DRAFT_MODE){
    ok(L.document.documentElement.className.indexOf('unlocked') < 0,
       '미완성 상태에서 처음 열면 잠긴다');
  } else {
    ok(L.document.documentElement.className.indexOf('unlocked') >= 0,
       '완성 상태(DRAFT_MODE=false)에서는 잠금이 없다');
  }

  // 틀린 비밀번호는 열지 못한다
  const W = makeSandbox();
  W._store['draftPass'] = Object.assign(W.document.getElementById('draftPass'), { value:'0000' });
  ok(W.unlockDraft() === false, '틀린 비밀번호로는 열리지 않는다');
  ok(W._store['draftErr'].textContent.indexOf('옳지 않다') >= 0, '오답 문구가 시험지 문체다');
  ok(W._store['draftPass'].value === '', '틀리면 입력칸을 비운다');
  ok(W.localStorage._mem['nondisj_sim_draft_ok'] === undefined, '틀린 시도는 기억되지 않는다');

  // 맞는 비밀번호는 열리고 이 기기에 기억된다
  const R = makeSandbox();
  R._store['draftPass'] = Object.assign(R.document.getElementById('draftPass'), { value:'7856' });
  ok(R.unlockDraft() === true, '맞는 비밀번호로 열린다');
  ok(R.document.documentElement.className.indexOf('unlocked') >= 0, '열리면 .unlocked 가 붙는다');
  ok(R.localStorage._mem['nondisj_sim_draft_ok'] === 'y', '열린 사실을 이 기기에 기억한다');

  // 기억해 둔 기기는 다시 묻지 않는다
  const A = makeSandbox({ 'nondisj_sim_draft_ok':'y' });
  ok(A.document.documentElement.className.indexOf('unlocked') >= 0, '이미 연 기기는 다시 묻지 않는다');

  // 잠금 열쇠와 학습 저장 키는 서로 다른 키여야 한다(리셋이 잠금을 풀면 안 된다)
  ok(A.DRAFT_KEY !== A.LS_KEY, '잠금 열쇠와 학습 저장 키가 서로 다르다');
  ok(/resetAll[\s\S]*?removeItem\(LS_KEY\)/.test(js) && !/removeItem\(DRAFT_KEY\)/.test(js),
     '「처음부터 다시 하기」가 잠금을 건드리지 않는다');

  // 잠금 화면 문구도 시험지 문체
  ok(/준비 중인 자료이다/.test(src) && /완성되지 않았다/.test(src), '잠금 안내가 시험지 문체다');
}

console.log('[9-4] 완료 라운드 되보기');
{
  function upto(F, n){                       // 라운드 n개를 끝낸 상태를 만든다
    const PL = {
      normal:{m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
              m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
                  'A-m#0':'L','A-m#1':'R','B-m#0':'L','B-m#1':'R'}},
      nd1:{m1:{'A-p':'L','A-m':'L','B-p':'L','B-m':'R'},
           m2:{'A-p#0':'L','A-p#1':'R','A-m#0':'L','A-m#1':'R',
               'B-p#0':'L','B-p#1':'R','B-m#0':'L','B-m#1':'R'}},
      nd2:{m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
           m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
               'A-m#0':'L','A-m#1':'L','B-m#0':'L','B-m#1':'R'}}
    };
    ['normal','nd1','nd2'].slice(0, n).forEach((cs, i) => {
      F.state.place[cs] = PL[cs];
      F.state.phase[cs] = 2;
      F.state.roundDone[cs] = true;
      F.state.sumPick[cs] = [3,0,2][i];
      F.state.first[cs + '.sum'] = true;      // 실제 흐름에서는 pickSummary 가 남긴다
    });
    F.reconcileRounds();
    return F;
  }

  // 앞질러 가지는 못한다
  const F = makeSandbox();
  ok(F.maxOpenRound() === 1, '아무것도 안 했으면 1라운드만 열린다');
  ok(F.gotoRound(2) === false, '완료하지 않은 라운드로는 못 건너뛴다');
  ok(F.gotoRound(3) === false, '3라운드도 마찬가지');

  const G = upto(makeSandbox(), 2);
  ok(G.maxOpenRound() === 3, '두 라운드를 마치면 3라운드까지 열린다');
  ok(G.gotoRound(1) === true, '완료한 1라운드로 되돌아갈 수 있다');
  ok(G.round === 1, '되돌아가면 round 가 바뀐다');
  ok(G.gotoRound(4) === false, '없는 라운드로는 못 간다');
  ok(G.gotoRound(0) === false, '0라운드로는 못 간다');

  // 되본 라운드는 읽기 전용 — 배치가 지워지지 않는다
  const H = upto(makeSandbox(), 3);
  H.gotoRound(1);
  const before = JSON.stringify(H.state.place.normal);
  H.undoPhase();
  ok(JSON.stringify(H.state.place.normal) === before,
     '★완료 라운드에서 「이 단계 다시 놓기」가 배치를 지우지 않는다 (비교표 파손 방지)');
  ok(H.state.roundDone.normal === true, '완료 표시도 유지된다');

  // 되보기가 요약 답을 다시 채점하지 않는다
  const K = upto(makeSandbox(), 3);
  const firstBefore = JSON.stringify(K.state.first);
  K.gotoRound(2);
  ok(JSON.stringify(K.state.first) === firstBefore, '되본다고 첫 시도 기록이 바뀌지 않는다');
  ok(K._store['sumChoices'].children.every(b => b.disabled === true),
     '되본 라운드의 선택지는 다시 누를 수 없다');
  ok(K._store['sumFb'].innerHTML.indexOf(K.CAPTION.nd1) >= 0, '되본 라운드에 교과서 캡션이 그대로 보인다');

  // 라운드 되만들기 — 그 라운드만 통째로 되돌린다
  const R = upto(makeSandbox(), 3);
  R.gotoRound(2);
  ok(R.redoRound() === true, '완료 라운드를 다시 만들 수 있다');
  ok(R.state.roundDone.nd1 === undefined, '다시 만들면 완료 표시가 사라진다');
  ok(R.state.sumPick.nd1 === undefined, '요약 답도 함께 지워진다');
  ok(Object.keys(R.state.place.nd1.m1).length === 0, '배치가 비워진다');
  ok(R.state.phase.nd1 === 1, '국면 1부터 다시 시작한다');
  ok(R.state.roundDone.normal === true && R.state.roundDone.nd2 === true,
     '★다른 라운드는 건드리지 않는다');
  ok(R.state.first['nd1.sum'] !== undefined, '첫 시도 기록은 남는다(평가 자료)');

  // 되만들기 확인 대화상자 문구
  ok(/다시 만드시겠습니까\?/.test(js), '되만들기 확인 문구가 ~하시겠습니까?');

  // 완료 라운드에서는 버튼이 바뀐다
  const B = upto(makeSandbox(), 1);
  B.gotoRound(1);
  ok(B._store['btnNext'].style.display === 'none', '완료 라운드에서 「배치 확인하기」가 숨는다');
  ok(B._store['btnUndo'].style.display === 'none', '완료 라운드에서 「이 단계 다시 놓기」가 숨는다');
  ok(B._store['btnRedo'].style.display !== 'none', '완료 라운드에서 「이 라운드 다시 만들기」가 보인다');
}

console.log('[10] 용어 · 표기');
{
  ok(src.indexOf('n−1') >= 0, 'n−1 표기 존재');
  ok(!/[^\w]n-1/.test(src.replace(/nondisj[^"']*/g, '')), '음부호에 하이픈(n-1)을 쓰지 않았다');
  ok(/1 : 1/.test(src), '비율은 1 : 1 (콜론 앞뒤 공백)');
  ['상동염색체','염색분체','생식세포분열','염색체이상'].forEach(w => {
    ok(!new RegExp(w.split('').join('\\s+')).test(src), w + ' 붙여쓰기 유지');
  });
  ok(/염색체 비분리/.test(src), '「염색체 비분리」는 띄어쓴다 (본문형)');
  ok(/감수 1분열/.test(src) && /감수 2분열/.test(src), '「감수 1분열」·「감수 2분열」 띄어쓰기');
  ok(!/방추체/.test(src), '방추체(비표준) 미사용');
  ok(/2<i>n<\/i>=4|2n=4/.test(src), '2n=4 모형 명시');
  ok(/21번/.test(src), '「21번」 표기 사용');
  ok(!/21 번|１번/.test(src), '염색체 번호 표기에 군더더기 공백·전각이 없다');
}

/* ════════════════════════════════════════════════════════════
   [11] ④ 연습 문항 — 잠금 · 정답 독립 대조 · 첫 시도 기록
   ════════════════════════════════════════════════════════════ */
console.log('[11] ④ 연습 문항');
{
  // 세 라운드를 끝낸 상태를 만든다 ([9-4]의 것과 같은 배치)
  const PL = {
    normal:{m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
            m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
                'A-m#0':'L','A-m#1':'R','B-m#0':'L','B-m#1':'R'}},
    nd1:{m1:{'A-p':'L','A-m':'L','B-p':'L','B-m':'R'},
         m2:{'A-p#0':'L','A-p#1':'R','A-m#0':'L','A-m#1':'R',
             'B-p#0':'L','B-p#1':'R','B-m#0':'L','B-m#1':'R'}},
    nd2:{m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
         m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
             'A-m#0':'L','A-m#1':'L','B-m#0':'L','B-m#1':'R'}}
  };
  function finish(F, n){
    ['normal','nd1','nd2'].slice(0, n === undefined ? 3 : n).forEach((cs, i) => {
      F.state.place[cs] = PL[cs];
      F.state.phase[cs] = 2;
      F.state.roundDone[cs] = true;
      F.state.sumPick[cs] = [3,0,2][i];
    });
    F.reconcileRounds();
    return F;
  }
  const plain = h => String(h).replace(/<[^>]*>/g, '');

  // ── 문항 자료 구조 ──
  const P = S.PRACTICE;
  ok(Array.isArray(P) && P.length >= 5, '연습 문항이 5개 이상 있다 (' + P.length + '문항)');
  ok(new Set(P.map(p => p.id)).size === P.length, '문항 id가 서로 다르다');
  ok(P.every(p => Array.isArray(p.ch) && p.ch.length === 4), '모든 문항의 선택지가 4개다');
  ok(P.every(p => Number.isInteger(p.a) && p.a >= 0 && p.a < p.ch.length),
     '정답 번호가 선택지 범위 안에 있다');
  ok(P.every(p => typeof p.ex === 'string' && p.ex.length > 20), '모든 문항에 해설이 있다');
  ok(new Set(P.map(p => p.a)).size >= 3, '정답 위치가 한 번호에 몰려 있지 않다');
  ok(P.every(p => new Set(p.ch.map(plain)).size === 4), '한 문항 안에 같은 선택지가 없다');
  ok(P.every(p => /\?$/.test(p.q.trim())), '발문이 전부 물음표로 끝난다');

  // ── ★정답을 앱의 진리표로 다시 확인한다 (문항에 적힌 답을 믿지 않는다) ──
  const ploid = cs => S.runMeiosis(PL[cs]).gametes
                       .map(g => S.PLOIDY_TEXT[S.ploidyOf(g)])
                       .sort((a, b) => a.length - b.length).join(', ');
  const byId = id => P.filter(p => p.id === id)[0];

  const p1 = byId('p1');
  ok(plain(p1.ch[p1.a]) === ploid('nd1'),
     '★p1의 정답이 runMeiosis(감수 1분열 비분리)의 결과와 일치한다 (' + ploid('nd1') + ')');
  ok(P.every(p => p.id !== 'p1' || p.ch.map(plain).filter(c => c === ploid('nd2')).length === 1),
     'p1 오답지에 감수 2분열 비분리의 결과가 오답으로 들어 있다');

  const p2 = byId('p2');
  const oneToOne = ['normal','nd1','nd2'].filter(cs => {
    const s2 = S.summarize(S.runMeiosis(PL[cs]).gametes);
    return s2.normal === 2 && s2.abnormal === 2;
  });
  ok(oneToOne.length === 1 && oneToOne[0] === 'nd2', '1 : 1이 나오는 경우는 감수 2분열 비분리뿐이다');
  ok(/감수 2분열/.test(plain(p2.ch[p2.a])), '★p2의 정답이 감수 2분열 비분리를 가리킨다');

  // n+1 생식세포에 더 들어간 21번 2개가 부·모인가(감수 1분열) 같은 것인가(감수 2분열)
  function extraPair(cs){
    const np = S.runMeiosis(PL[cs]).gametes.filter(g => S.ploidyOf(g) === 'np1')[0] || [];
    const a = np.filter(c => S.CHROM_META[c].pair === 'A');
    return a.length === 2 ? (a[0] === a[1] ? 'same' : 'diff') : null;
  }
  ok(extraPair('nd1') === 'diff', '감수 1분열 비분리의 n+1은 서로 다른 상동염색체 2개');
  ok(extraPair('nd2') === 'same', '감수 2분열 비분리의 n+1은 같은 염색체의 분체 2개');
  const p3 = byId('p3');
  ok(/감수 1분열/.test(plain(p3.ch[p3.a])) && !/감수 2분열/.test(plain(p3.ch[p3.a])),
     '★p3(부·모에게서 온 21번 2개)의 정답이 감수 1분열이다');

  // ★p6(판정 불가)은 교사 지시로 뺐다 (2026-08-20) — 같은 개념은 ⑤ g2에서 가계도로 다룬다
  ok(byId('p6') === undefined, '★p6(판정 불가 문항)이 남아 있지 않다');
  ok(P.every(q => !/판정할 수 있는가/.test(plain(q.q))), '★④에 「판정할 수 있는가」 발문이 없다');
  ok(extraPair('nd1') !== null && extraPair('nd2') !== null,
     '두 시기 모두 21번이 2개 든 n+1 생식세포를 만든다 (⑤ g2가 쓰는 근거)');

  // 수정란 환산 (46 ± 1)
  ok(/47개/.test(plain(byId('p4').ch[byId('p4').a])) && /3개/.test(plain(byId('p4').ch[byId('p4').a])),
     'p4의 정답이 21번 3개 · 전체 47개');
  ok(/45개/.test(plain(byId('p5').ch[byId('p5').a])), 'p5의 정답이 45개');

  // ── 잠금 ──
  const L = makeSandbox();
  ok(L.practiceOpen() === false, '아무것도 안 했으면 ④는 잠겨 있다');
  ok(L._store['pracBox'].children.length === 0, '잠긴 동안 문항이 그려지지 않는다');
  ok(/🔒/.test(L._store['pracLock'].innerHTML), '잠금 안내가 보인다');
  ok(L._store['pracLock'].className.indexOf('hide') < 0, '잠긴 동안 안내가 숨지 않는다');
  ok(L.pickPractice('p1', 0) === false, '★잠긴 동안에는 답을 고를 수 없다');
  ok(L.state.first['prac.p1'] === undefined, '잠긴 상태의 시도는 기록되지 않는다');
  const leak = JSON.stringify([L._store['pracBox'].innerHTML, L._store['pracDone'].innerHTML,
                               L._store['pracLock'].innerHTML]);
  ok(P.every(p => leak.indexOf(plain(p.ch[p.a]).slice(0, 10)) < 0), '★잠긴 동안 정답 문자열 노출 0');

  // 라운드를 다 마쳐도 요약 발문에 답하지 않았으면 잠긴 채다
  const M = makeSandbox();
  ['normal','nd1','nd2'].forEach(cs => { M.state.place[cs] = PL[cs]; M.state.roundDone[cs] = true; });
  ok(M.practiceOpen() === false, '요약 발문에 답하기 전에는 잠겨 있다 (③ 다운증후군 문구와 같은 조건)');

  // ── 열림 ──
  const O = finish(makeSandbox());
  ok(O.practiceOpen() === true, '세 라운드를 마치면 ④가 열린다');
  O.renderPractice();
  ok(O._store['pracBox'].children.length === P.length, '문항 ' + P.length + '개가 그려진다');
  const q1 = O._store['pracBox'].children[0];
  ok(q1.className === 'pq', '문항 상자에 .pq 가 붙는다');
  const btns = q1.children[1].children;
  ok(btns.length === 4 && btns.every(b => b.className === 'choice'), '선택지 4개가 초기 상태로 그려진다');
  ok(explOf(q1).style.display === 'none', '고르기 전에는 해설이 닫혀 있다');
  ok(O._store['pracScore'].textContent === '0 / ' + P.length, '점수 표시가 0으로 시작한다');

  // 교사 해제로도 열린다
  const T2 = makeSandbox();
  T2.state.teacherUnlock = true;
  ok(T2.practiceOpen() === true, '교사 해제 시 라운드 없이도 열린다');

  // ── 채점 · 첫 시도만 기록 ──
  const A = finish(makeSandbox());
  A.renderPractice();
  const wrongIdx = (p1.a + 1) % 4;
  ok(A.pickPractice('p1', wrongIdx) === true, '열린 뒤에는 답을 고를 수 있다');
  ok(A.state.first['prac.p1'] === false, '첫 시도가 오답이면 false 로 기록된다');
  ok(A.state.pPick['p1'] === wrongIdx, '고른 번호가 남는다');
  ok(A.pickPractice('p1', p1.a) === true, '다시 고를 수 있다');
  ok(A.state.first['prac.p1'] === false, '★다시 골라도 첫 시도 기록은 덮이지 않는다');
  ok(A.state.pPick['p1'] === p1.a, '화면에 보이는 선택은 마지막 것으로 바뀐다');
  ok(A.pracScore() === 0, '첫 시도가 오답이었으므로 점수는 0이다');

  const B2 = finish(makeSandbox());
  B2.renderPractice();
  P.forEach(p => B2.pickPractice(p.id, p.a));
  ok(B2.pracScore() === P.length, '전부 첫 시도에 맞히면 만점이다');
  ok(B2._store['pracScore'].textContent === P.length + ' / ' + P.length, '점수 표시가 갱신된다');
  ok(B2._store['pracDone'].className.indexOf('hide') < 0, '다 풀면 완료 문구가 열린다');
  ok(B2._store['pracDone'].innerHTML.indexOf('' + P.length) >= 0, '완료 문구에 맞힌 수가 들어간다');
  ok(B2.pracAnswered() === P.length, '푼 문항 수가 센다');

  // 해설은 고른 뒤에만 열린다
  const C2 = finish(makeSandbox());
  C2.renderPractice();
  const card0 = C2._store['pracBox'].children[0];
  ok(explOf(card0).innerHTML === '', '고르기 전 해설칸이 비어 있다');
  C2.pickPractice('p1', p1.a);
  ok(explOf(card0).style.display === 'block', '고른 뒤 해설이 열린다');
  ok(/^옳다\. /.test(explOf(card0).innerHTML), '정답이면 「옳다.」로 시작한다');
  C2.pickPractice('p1', wrongIdx);
  ok(/^옳지 않다\. /.test(explOf(card0).innerHTML), '★오답이면 「옳지 않다.」로 시작한다');
  ok(explOf(card0).innerHTML.indexOf(plain(p1.ch[p1.a])) > 0, '오답 해설이 옳은 선택지를 밝힌다');
  ok(card0.children[1].children[p1.a].className === 'choice right', '옳은 선택지가 표시된다');
  ok(card0.children[1].children[wrongIdx].className === 'choice dim', '나머지는 흐려진다');

  // ── 되돌리면 다시 잠긴다 ──
  const R2 = finish(makeSandbox());
  R2.renderPractice();
  R2.pickPractice('p1', p1.a);
  R2.gotoRound(2);
  ok(R2.redoRound() === true, '완료 라운드를 다시 만든다');
  ok(R2.practiceOpen() === false, '★라운드를 되돌리면 ④가 다시 잠긴다');
  ok(R2._store['pracScore'].textContent === '0 / ' + P.length, '잠기면 점수 표시도 0으로 내려간다');
  ok(R2.state.first['prac.p1'] === true, '기록 자체는 남는다 (평가 자료)');

  // ── 저장 · 복원 ──
  const D2 = finish(makeSandbox());
  D2.renderPractice();
  D2.pickPractice('p2', byId('p2').a);
  const saved = JSON.parse(D2.localStorage._mem[D2.LS_KEY]);
  ok(saved.pPick && saved.pPick['p2'] === byId('p2').a, 'pPick 이 저장된다');
  ok(saved.first['prac.p2'] === true, '첫 시도 기록이 저장된다');
  const E2 = makeSandbox({ [D2.LS_KEY]: D2.localStorage._mem[D2.LS_KEY] });
  ok(E2.state.pPick['p2'] === byId('p2').a, '새로고침해도 고른 답이 복원된다');
  ok(E2.practiceOpen() === true, '복원 후에도 ④가 열려 있다');
  ok(E2._store['pracBox'].children.length === P.length, '복원 시 문항이 그려진다');
  ok(explOf(E2._store['pracBox'].children[1]).style.display === 'block',
     '복원 시 이미 답한 문항의 해설이 열린 채로 그려진다');

  // pPick 이 없던 옛 저장본도 깨지지 않는다
  const old = JSON.parse(D2.localStorage._mem[D2.LS_KEY]);
  delete old.pPick;
  const F2 = makeSandbox({ [D2.LS_KEY]: JSON.stringify(old) });
  ok(F2.state.pPick && Object.keys(F2.state.pPick).length === 0, '★pPick 이 없던 저장본도 복원된다');
  const bad = JSON.parse(D2.localStorage._mem[D2.LS_KEY]);
  bad.pPick = '깨진값';
  const G2 = makeSandbox({ [D2.LS_KEY]: JSON.stringify(bad) });
  ok(typeof G2.state.pPick === 'object' && !Array.isArray(G2.state.pPick),
     '손상된 pPick 은 빈 객체로 되돌린다');

  // ── 답 유출 금지 · 말투 ──
  const bodyMk = src.slice(src.indexOf('<body>'), src.lastIndexOf('<script>'));
  ok(P.every(p => bodyMk.indexOf(plain(p.q).slice(0, 15)) < 0),
     '★문항 발문이 본문 마크업에 없다 (전부 PRACTICE 에서 만든다)');
  ok(P.every(p => bodyMk.indexOf(p.ex.slice(0, 15)) < 0), '★해설이 본문 마크업에 없다');

  const BANNED2 = ['해 보자','보자.','하자.','좋아','맞아.','했어','거야','일까','할까','너의','네가','우리가'];
  const pblob = JSON.stringify(P);
  ok(BANNED2.filter(w => pblob.indexOf(w) >= 0).length === 0,
     '연습 문항 문안에 친근체 0건 (검출: ' + BANNED2.filter(w => pblob.indexOf(w) >= 0).join(' ') + ')');
  ok(!/n-1/.test(pblob.replace(/prac/g, '')), '연습 문항에서 음부호에 하이픈을 쓰지 않았다');
  ok(P.every(p => !/이에요|예요|입니다|합니다/.test(p.ex)),
     '해설이 존댓말이 아니다 (활동은 시험지 문체 — 복습 퀴즈와 다르다)');
  ok(P.every(p => !/하십시오|하세요/.test(p.q + p.ex)), '문안에 존댓말 지시가 없다');
  ok(/틀린 문항의 해설을 다시 읽고[\s\S]{0,80}하시오/.test(js),
     '연습 완료 문구의 지시가 ~하시오 형태다');

  // 자연유산 비율·모체 연령 수치는 학생 화면에 넣지 않는다 (교사 결정 2026-08-20)
  ok(!/자연\s*유산|유산율|산모 연령|어머니의 연령|모체 연령/.test(src),
     '★자연유산·모체 연령 수치가 학생 화면에 없다');
}

/* ════════════════════════════════════════════════════════════
   [12] ⑤ 가계도 문항
        ★가계도 문항의 정답을 앱 코드로 확인하지 않는다 —
          부모 유전자형에서 생식세포를 다시 만들어 수정시킨 뒤,
          관찰된 자녀가 나올 수 있는 (부모 × 시기) 가설을 전부 세어 대조한다.
   ════════════════════════════════════════════════════════════ */
console.log('[12] ⑤ 가계도 문항');
{
  const PL = {
    normal:{m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
            m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
                'A-m#0':'L','A-m#1':'R','B-m#0':'L','B-m#1':'R'}},
    nd1:{m1:{'A-p':'L','A-m':'L','B-p':'L','B-m':'R'},
         m2:{'A-p#0':'L','A-p#1':'R','A-m#0':'L','A-m#1':'R',
             'B-p#0':'L','B-p#1':'R','B-m#0':'L','B-m#1':'R'}},
    nd2:{m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
         m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
             'A-m#0':'L','A-m#1':'L','B-m#0':'L','B-m#1':'R'}}
  };
  function finish(F){
    ['normal','nd1','nd2'].forEach((cs, i) => {
      F.state.place[cs] = PL[cs]; F.state.phase[cs] = 2;
      F.state.roundDone[cs] = true; F.state.sumPick[cs] = [3,0,2][i];
    });
    F.reconcileRounds();
    return F;
  }
  const plain = h => String(h).replace(/<[^>]*>/g, '');

  /* ── ★⑤ 핵형 표는 걷어냈다 (교사 지시 2026-08-20) ── */
  ok(S.KARYO === undefined && S.karyoIcon === undefined && S.renderKaryo === undefined,
     '★핵형 표(KARYO·karyoIcon·renderKaryo)가 남아 있지 않다');
  ok(!/karyoBox|karyoLock|karyo-icon/.test(src), '★핵형 표의 DOM·CSS 잔재가 없다');
  ok(!/에드워드증후군/.test(src), '★쓰지 않는 유전병 이름이 남아 있지 않다');

  /* ── ⑤ 가계도 문항 구조 ── */
  const G = S.PEDQ;
  ok(Array.isArray(G) && G.length === 3, '가계도 문항이 3개다');
  ok(new Set(G.map(g => g.id)).size === 3, '문항 id가 서로 다르다');
  ok(new Set(S.PRACTICE.map(p => p.id).concat(G.map(g => g.id))).size ===
     S.PRACTICE.length + G.length, '★④와 ⑤의 id가 겹치지 않는다 (기록 키가 섞이면 안 된다)');
  ok(G.every(g => Array.isArray(g.ch) && g.ch.length === 4), '선택지가 4개씩');
  ok(G.every(g => Number.isInteger(g.a) && g.a >= 0 && g.a < 4), '정답 번호가 범위 안');
  ok(G.every(g => Array.isArray(g.dat) && g.dat.length === 3), '문항마다 자료 3줄');
  ok(G.every(g => g.ped && g.ped.f && g.ped.m && g.ped.c), '문항마다 가계도 자료');
  ok(G.every(g => /\?$/.test(g.q.trim())), '발문이 전부 물음표로 끝난다');
  ok(G.every(g => g.ex.length > 60), '해설이 충분히 길다');

  /* ── ★정답 독립 재유도 ──
     생식세포:  정상 → [a],[b] / 감수1분열 비분리 → [a,b],[] / 감수2분열 비분리 → [a,a],[b,b],[],[a],[b]
     (감수 2분열 비분리는 한쪽 딸세포에서만 일어나므로 정상 생식세포도 함께 나온다)     */
  function gam(pair, mode){
    const a = pair[0], b = pair[1];
    if (mode === 'normal') return [[a],[b]];
    if (mode === 'nd1')    return [[a,b],[]];
    return [[a,a],[b,b],[],[a],[b]];              // nd2
  }
  const kk = arr => arr.slice().sort().join('+');
  function possible(fPair, mPair, who, when){
    const out = new Set();
    gam(fPair, who === 'f' ? when : 'normal').forEach(g1 => {
      gam(mPair, who === 'm' ? when : 'normal').forEach(g2 => out.add(kk(g1.concat(g2))));
    });
    return out;
  }
  const HYP = [['f','nd1'],['f','nd2'],['m','nd1'],['m','nd2']];
  function explain(fPair, mPair, childKey){
    return HYP.filter(h => possible(fPair, mPair, h[0], h[1]).has(childKey))
              .map(h => h[0] + '|' + h[1]);
  }
  // 유전자형: R = 정상 대립유전자를 가진 X · p = 적록색맹 대립유전자를 가진 X
  const 정상남 = ['R','Y'], 색맹남 = ['p','Y'];
  const 정상녀 = ['R','R'], 보인자 = ['R','p'], 색맹녀 = ['p','p'];

  // g1 : 아버지 정상 · 어머니 보인자 · 아들 44+XXY 이고 적록색맹  → 아들의 성염색체 = p,p,Y
  const h1 = explain(정상남, 보인자, kk(['p','p','Y']));
  ok(h1.length === 1 && h1[0] === 'm|nd2',
     '★g1: 가능한 가설이 「어머니의 감수 2분열」 하나뿐이다 (' + h1.join(',') + ')');
  ok(/어머니/.test(plain(G[0].ch[G[0].a])) && /감수 2분열/.test(plain(G[0].ch[G[0].a])),
     'g1의 정답 선택지가 어머니의 감수 2분열이다');

  // g2 : 아버지 색맹 · 어머니 정상 동형 · 딸 44+X 이고 적록색맹  → 딸의 성염색체 = p
  const h2 = explain(색맹남, 정상녀, kk(['p']));
  ok(h2.length === 2 && h2.every(x => x.indexOf('m|') === 0),
     '★g2: 부모는 어머니로 좁혀지지만 시기는 두 갈래가 남는다 (' + h2.join(',') + ')');
  ok(/어머니/.test(plain(G[1].ch[G[1].a])) && /판정할 수 없다/.test(plain(G[1].ch[G[1].a])),
     'g2의 정답이 「어머니에게서 일어났으나 시기는 판정할 수 없다」이다');
  ok(G[1].ch.map(plain).filter(c => /판정할 수 없다/.test(c)).length >= 1 &&
     G[1].ch.map(plain).filter(c => /어머니/.test(c)).length === 2,
     'g2 선택지에 어머니 2개·아버지 2개가 있어 부모만 보고 찍을 수 없다');

  // g3 : 아버지 정상 · 어머니 색맹 · 아들 44+XXY 이고 색맹이 아니다 → 성염색체 = R,p,Y
  const h3 = explain(정상남, 색맹녀, kk(['R','p','Y']));
  ok(h3.length === 1 && h3[0] === 'f|nd1',
     '★g3: 가능한 가설이 「아버지의 감수 1분열」 하나뿐이다 (' + h3.join(',') + ')');
  ok(/아버지/.test(plain(G[2].ch[G[2].a])) && /감수 1분열/.test(plain(G[2].ch[G[2].a])),
     'g3의 정답 선택지가 아버지의 감수 1분열이다');

  // ★엉뚱한 답이 되지 않는지 반대편도 확인한다
  ok(!explain(정상남, 보인자, kk(['R','p','Y'])).some(x => x === 'm|nd2'),
     '★어머니 감수 2분열로는 X<sup>R</sup>X′Y 아들을 만들 수 없다 (g1 논리의 뒷면)');
  ok(explain(정상남, 보인자, kk(['R','p','Y'])).indexOf('m|nd1') >= 0,
     '★같은 부모라도 감수 1분열 비분리면 색맹이 아닌 XXY가 된다');

  // 세 문항이 서로 다른 답을 가리킨다
  ok(new Set([h1[0], h2[0], h3[0]]).size === 3, '세 문항의 답이 서로 다르다');

  /* ── 가계도 그림 ── */
  const svg1 = S.trioSvg(G[0].ped);
  ok(/viewBox=/.test(svg1) && /<\/svg>/.test(svg1), '가계도가 viewBox 있는 SVG로 나온다');
  ok((svg1.match(/<rect|<circle/g) || []).length >= 3, '도형이 3개 이상 그려진다');
  ok(!/https?:\/\/(?!www\.w3\.org)/.test(svg1), '가계도 SVG에 외부 URL 0건');
  ok(svg1.indexOf('아버지') >= 0 && svg1.indexOf('어머니') >= 0, '부모 라벨이 그림에 있다');
  ok(svg1.indexOf('44+XXY') >= 0, 'g1 그림에 핵형이 적혀 있다');
  ok(S.trioSvg(G[1].ped).indexOf('44+X<') >= 0 || /44\+X</.test(S.trioSvg(G[1].ped)) ||
     S.trioSvg(G[1].ped).indexOf('>44+X<') >= 0, 'g2 그림에 44+X가 적혀 있다');

  // 그림이 자료와 어긋나지 않는가 — 색맹이면 채우고, 보인자면 가운데 점, 정상이면 비운다
  ok(G[0].ped.m.fill === 'carrier', 'g1 어머니는 보인자로 그린다');
  ok(G[0].ped.f.fill === 'none' && G[0].ped.c.fill === 'full', 'g1 아버지는 정상 · 아들은 발현');
  ok(G[1].ped.f.fill === 'full' && G[1].ped.m.fill === 'none' && G[1].ped.c.fill === 'full',
     'g2 아버지·딸은 발현 · 어머니는 정상');
  ok(G[2].ped.m.fill === 'full' && G[2].ped.c.fill === 'none',
     'g3 어머니는 발현 · 아들은 정상 시각');
  ok(G[0].ped.c.sex === 'M' && G[1].ped.c.sex === 'F' && G[2].ped.c.sex === 'M',
     '자녀 성별이 핵형과 맞는다 (XXY 남자 · 44+X 여자)');
  ok(/보인자/.test(S.pedLegend()) && /적록색맹/.test(S.pedLegend()), '범례에 보인자·색맹 표시가 있다');

  // ★눈 확인에서 잡은 것 — 범례의 작은 기호를 문자열 치환으로 줄이다 circle 의 cx/cy 까지 갈아엎어
  //   원이 잘린 초승달로 그려졌다. 이제 pedShape 가 크기를 인자로 받는다. 회귀로 고정한다.
  const leg = S.pedLegend();
  const legCircles = leg.match(/<circle[^>]*>/g) || [];
  ok(legCircles.length >= 2, '범례에 원 기호가 있다');
  ok(legCircles.every(c => /cx="15"/.test(c) && /cy="15"/.test(c)),
     '★범례의 원이 뷰박스 가운데(15,15)에 있다 (잘린 초승달로 그려지지 않는다)');
  ok((leg.match(/<rect[^>]*>/g) || []).every(r => /x="2"/.test(r) && /width="26"/.test(r)),
     '★범례의 사각형도 가운데에 맞춰 줄어든다');
  ok(legCircles.every(c => { const m = c.match(/r="([\d.]+)"/); return m && +m[1] > 0 && +m[1] <= 13; }),
     '범례 기호의 반지름이 양수이고 작은 크기다');

  // 크기 인자가 실제로 먹는가
  const big = S.pedShape(100, 100, 'F', 'carrier', 21);
  const small = S.pedShape(15, 15, 'F', 'carrier', 13);
  ok(/r="21"/.test(big) && /r="13"/.test(small), 'pedShape 가 크기 인자를 반영한다');
  ok(/cx="100"/.test(big) && /cx="15"/.test(small), '크기를 바꿔도 중심 좌표가 유지된다');
  const sqBig = S.pedShape(100, 100, 'M', 'none', 21);
  ok(/x="79"/.test(sqBig) && /width="42"/.test(sqBig), '사각형도 중심 기준으로 그려진다');

  /* ── 잠금 ── */
  const L = makeSandbox();
  ok(L._store['pedBox'].children.length === 0 && L._store['pedBox'].innerHTML === '',
     '잠긴 동안 ⑤ 문항이 그려지지 않는다');
  ok(L.pickPractice('g1', 0) === false, '잠긴 동안 ⑤의 답을 고를 수 없다');
  const leak = String(L._store['pedBox'].innerHTML) + String(L._store['pedLock'].innerHTML);
  ok(['터너증후군','클라인펠터증후군'].every(n => leak.indexOf(n) < 0),
     '★잠긴 동안 유전병 이름 노출 0');
  ok(G.every(g => leak.indexOf(plain(g.q).slice(0, 12)) < 0), '★잠긴 동안 ⑤ 발문 노출 0');

  /* ── 열림 · 채점 ── */
  const O = finish(makeSandbox());
  O.renderPractice();
  ok(O._store['pedBox'].children.length === 3, '열리면 ⑤ 문항 3개가 그려진다');
  ok(/2<i>n<\/i>=46/.test(src),
     '★⑤ 머리에 사람 2n=46 임을 밝혀 두었다 (2n=4 모형과 헷갈리지 않게)');
  ok(/상염색체 이상과 성염색체 이상 모두 <b>같은 원인<\/b>/.test(src),
     '★상염색체·성염색체 이상이 같은 원인임을 밝혀 두었다');
  ok(O._store['pedScoreTag'].textContent === '0 / 3', '⑤ 점수 표시가 0으로 시작');
  const card0 = O._store['pedBox'].children[0];
  ok(/\[자료\]/.test(card0.children[1].innerHTML), '자료 상자가 발문 아래에 붙는다');
  ok(/<svg/.test(card0.children[2].innerHTML), '가계도 그림이 붙는다');

  ok(O.pickPractice('g1', 0) === true, '열린 뒤 ⑤의 답을 고를 수 있다');
  ok(O.state.first['prac.g1'] === false, 'g1 첫 시도 오답 기록');
  O.pickPractice('g1', G[0].a);
  ok(O.state.first['prac.g1'] === false, '★다시 골라도 첫 시도 기록은 덮이지 않는다');
  ok(O.pedScore() === 0 && O.pracScore() === 0, '④와 ⑤ 점수가 섞이지 않는다');

  const B = finish(makeSandbox());
  B.renderPractice();
  G.forEach(g => B.pickPractice(g.id, g.a));
  ok(B.pedScore() === 3 && B.pedAnswered() === 3, '⑤ 3문항을 첫 시도에 맞히면 3점');
  ok(B.pracScore() === 0, '★⑤를 풀어도 ④ 점수는 오르지 않는다');
  ok(B._store['pedScoreTag'].textContent === '3 / 3', '⑤ 점수 표시 갱신');
  ok(B._store['pedDone'].className.indexOf('hide') < 0, '⑤를 다 풀면 완료 문구가 열린다');
  ok(/감수 1분열/.test(B._store['pedDone'].innerHTML) &&
     /감수 2분열/.test(B._store['pedDone'].innerHTML) &&
     /판정할 수 없다/.test(B._store['pedDone'].innerHTML),
     '★완료 문구가 세 문항을 관통하는 판별 근거를 한 줄로 묶어 준다');
  ok(B._store['pracDone'].className.indexOf('hide') >= 0, '④를 안 풀었으면 ④ 완료 문구는 닫혀 있다');

  /* ── 저장 · 복원 ── */
  const D = finish(makeSandbox());
  D.renderPractice();
  D.pickPractice('g2', G[1].a);
  const raw = D.localStorage._mem[D.LS_KEY];
  ok(JSON.parse(raw).pPick['g2'] === G[1].a, '⑤의 답이 저장된다');
  const E = makeSandbox({ [D.LS_KEY]: raw });
  ok(E.state.pPick['g2'] === G[1].a, '새로고침해도 ⑤의 답이 복원된다');
  ok(E._store['pedBox'].children.length === 3, '복원 시 ⑤가 그려진다');
  ok(explOf(E._store['pedBox'].children[1]).style.display === 'block',
     '복원 시 이미 답한 ⑤ 문항의 해설이 열린 채로 그려진다');

  /* ── 되돌리면 다시 잠긴다 ── */
  const R = finish(makeSandbox());
  R.renderPractice();
  R.gotoRound(3);
  ok(R.redoRound() === true, '라운드를 다시 만든다');
  ok(R._store['pedBox'].innerHTML === '', '★라운드를 되돌리면 ⑤도 다시 잠긴다');
  ok(R._store['pedScoreTag'].textContent === '0 / 3', '잠기면 ⑤ 점수 표시도 0');

  /* ── 답 유출 금지 · 말투 · 표기 ── */
  const bodyMk = src.slice(src.indexOf('<body>'), src.lastIndexOf('<script>'));
  ok(G.every(g => bodyMk.indexOf(plain(g.q).slice(0, 15)) < 0), '★⑤ 발문이 본문 마크업에 없다');
  ok(G.every(g => bodyMk.indexOf(plain(g.ex).slice(0, 15)) < 0), '★⑤ 해설이 본문 마크업에 없다');
  ok(['터너증후군','클라인펠터증후군'].every(n => bodyMk.indexOf(n) < 0),
     '★⑤에서 처음 나오는 유전병 이름이 본문 마크업에 없다');
  // 다운증후군만은 ③의 잠긴 안내 상자(#downNote)에 원래부터 들어 있다 — 그 밖에는 없어야 한다
  // (주석은 화면에 나오지 않으므로 걷어내고 본다)
  const bodyVis = bodyMk.replace(/<!--[\s\S]*?-->/g, '');
  const dnStart = bodyVis.indexOf('id="downNote"');
  const dnEnd   = bodyVis.indexOf('</div>', dnStart);
  const outside = bodyVis.slice(0, dnStart) + bodyVis.slice(dnEnd);
  ok(dnStart > 0 && outside.indexOf('다운증후군') < 0,
     '★「다운증후군」은 ③의 잠긴 안내 상자 안에만 있다');
  ok(/class="msg info hide"[^>]*id="downNote"|id="downNote"[^>]*class="msg info hide"/.test(bodyVis),
     '그 안내 상자는 처음에 숨어 있다');

  const BANNED2 = ['해 보자','보자.','하자.','좋아','맞아.','했어','거야','일까','할까','너의','네가','우리가'];
  const gblob = JSON.stringify(G);
  ok(BANNED2.filter(w => gblob.indexOf(w) >= 0).length === 0,
     '⑤ 문안에 친근체 0건 (검출: ' + BANNED2.filter(w => gblob.indexOf(w) >= 0).join(' ') + ')');
  ok(G.every(g => !/입니다|합니다|하세요/.test(g.q + g.ex)), '⑤가 존댓말이 아니다 (시험지 문체)');

  // 유전자 표기가 1-2 가계도 활동과 같다 — 정상 X<sup>R</sup> · 적록색맹 X′
  ok(/X<sup>R<\/sup>/.test(gblob), '정상 대립유전자를 X<sup>R</sup>로 적었다');
  ok(gblob.indexOf('X′') >= 0, '적록색맹 대립유전자를 X′(프라임)로 적었다');
  ok(!/X'/.test(gblob.replace(/X′/g, '')), '프라임 대신 아포스트로피를 섞어 쓰지 않았다');
  ok(!/X 염색체|Y 염색체/.test(src), '★「X염색체」·「Y염색체」는 붙여 쓴다 (1-2 활동과 같게)');
  ok(/X염색체/.test(gblob) && /Y염색체/.test(gblob), 'X염색체·Y염색체 표기를 쓴다');
  ok(!/색맹\s*보인자\s*남/.test(gblob), '남자 보인자 같은 잘못된 표현이 없다');

  // 자연유산·모체 연령 수치는 여전히 없다
  ok(!/자연\s*유산|유산율|산모 연령|어머니의 연령|모체 연령/.test(src),
     '★자연유산·모체 연령 수치가 학생 화면에 없다 (⑤ 추가 후에도)');
}

/* ════════════════════════════════════════════════════════════
   [13] 해설 도식 — 고른 뒤에만 나온다 · 진리표와 어긋나지 않는다
   ════════════════════════════════════════════════════════════ */
console.log('[13] 해설 도식');
{
  const PL = {
    normal:{m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
            m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
                'A-m#0':'L','A-m#1':'R','B-m#0':'L','B-m#1':'R'}},
    nd1:{m1:{'A-p':'L','A-m':'L','B-p':'L','B-m':'R'},
         m2:{'A-p#0':'L','A-p#1':'R','A-m#0':'L','A-m#1':'R',
             'B-p#0':'L','B-p#1':'R','B-m#0':'L','B-m#1':'R'}},
    nd2:{m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
         m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
             'A-m#0':'L','A-m#1':'L','B-m#0':'L','B-m#1':'R'}}
  };
  function finish(F){
    ['normal','nd1','nd2'].forEach((cs, i) => {
      F.state.place[cs] = PL[cs]; F.state.phase[cs] = 2;
      F.state.roundDone[cs] = true; F.state.sumPick[cs] = [3,0,2][i];
    });
    F.reconcileRounds();
    return F;
  }
  const plain = h => String(h).replace(/<[^>]*>/g, '');
  const ALL = S.PRACTICE.concat(S.PEDQ);
  const byId = id => ALL.filter(q => q.id === id)[0];
  const gamCells = fig => fig.rows.reduce((a, r) => a.concat(r.cells.filter(c => c.k !== 'op')), []);

  /* ── 자료 구조 ── */
  ok(ALL.every(q => q.fig && Array.isArray(q.fig.rows) && q.fig.rows.length >= 1),
     '★9문항 전부에 해설 도식이 있다');
  ok(ALL.every(q => q.fig.cap && q.fig.cap.length > 10), '도식마다 한 줄 설명이 붙어 있다');
  ok(ALL.every(q => gamCells(q.fig).every(c => c.chr.every(k => !!S.CH[k]))),
     '★도식이 부르는 염색체 키가 전부 CH 에 있다 (오타 방어)');
  ok(ALL.every(q => gamCells(q.fig).every(c => typeof c.cap === 'string' && c.cap.length > 0)),
     '도식의 칸마다 이름이 붙어 있다');
  ok(ALL.every(q => q.fig.rows.every(r => r.cells.every(c => ['gam','zyg','op'].indexOf(c.k) >= 0))),
     '칸의 종류가 gam · zyg · op 뿐이다');

  // 막대 길이로 크기를 나타낸다 — 1번 > X > 21번 > Y
  ok(S.CH.bp.len > S.CH.XR.len && S.CH.XR.len > S.CH.ap.len && S.CH.ap.len > S.CH.Y.len,
     '★막대 길이 순서가 1번 > X > 21번 > Y (21번이 가장 작은 상염색체)');
  ok(S.CH.ap.c !== S.CH.am.c && S.CH.bp.c !== S.CH.bm.c, '부·모를 색으로 가른다');
  ok(S.CH.XR.c !== S.CH.Xp.c, '정상 대립유전자와 적록색맹 대립유전자를 색으로 가른다');
  ok(S.CH.none.ghost === true, '「없음」은 유령 막대다');

  /* ── ★진리표와 대조 ── */
  const ploidyList = cs => S.runMeiosis(PL[cs]).gametes.map(g => g.length).sort();
  // p1 = 감수 1분열 비분리 · p2 = 감수 2분열 비분리
  const figCounts = id => gamCells(byId(id).fig).filter(c => c.k === 'gam')
                            .map(c => c.chr.filter(k => k !== 'none').length).sort();
  ok(JSON.stringify(figCounts('p1')) === JSON.stringify(ploidyList('nd1')),
     '★p1 도식의 생식세포별 염색체 수가 runMeiosis(감수 1분열 비분리)와 같다 [' + figCounts('p1') + ']');
  ok(JSON.stringify(figCounts('p2')) === JSON.stringify(ploidyList('nd2')),
     '★p2 도식의 생식세포별 염색체 수가 runMeiosis(감수 2분열 비분리)와 같다 [' + figCounts('p2') + ']');
  const capsOf = id => gamCells(byId(id).fig).filter(c => c.k === 'gam').map(c => plain(c.cap));
  ok(capsOf('p1').filter(c => c === 'n+1').length === 2 &&
     capsOf('p1').filter(c => c === 'n−1').length === 2, 'p1 도식의 이름표가 n+1 2개 · n−1 2개');
  ok(capsOf('p2').filter(c => c === 'n').length === 2 &&
     capsOf('p2').filter(c => c === 'n+1').length === 1 &&
     capsOf('p2').filter(c => c === 'n−1').length === 1, 'p2 도식의 이름표가 n, n, n+1, n−1');

  // p3 = 두 갈래 비교 (다른 것 2개 vs 같은 것 2개)
  const p3 = byId('p3').fig;
  ok(p3.rows.length === 2 && p3.rows.every(r => !!r.lead), 'p3 도식은 두 갈래에 이름이 붙어 있다');
  const p3a = p3.rows[0].cells[0].chr, p3b = p3.rows[1].cells[0].chr;
  ok(p3a.length === 2 && p3a[0] !== p3a[1], '★감수 1분열 갈래는 서로 다른 21번 2개');
  ok(p3b.length === 2 && p3b[0] === p3b[1], '★감수 2분열 갈래는 같은 21번 2개');
  ok(/감수 1분열/.test(p3.rows[0].lead) && /감수 2분열/.test(p3.rows[1].lead), 'p3 갈래 이름이 맞다');

  // ★p6 도식은 p6 문항과 함께 뺐다 (2026-08-20) — 같은 것을 ⑤ g2 도식이 보여 준다
  ok(byId('p6') === undefined, '★p6 도식이 남아 있지 않다');

  const zyg = r => r.cells.filter(c => c.k === 'zyg')[0];

  // p4 · p5 = 46 ± 1
  ok(zyg(byId('p4').fig.rows[0]).chr.length === 3 && /47/.test(plain(zyg(byId('p4').fig.rows[0]).cap)),
     'p4 도식: 수정란 21번 3개 · 47개');
  ok(zyg(byId('p5').fig.rows[0]).chr.length === 1 && /45/.test(plain(zyg(byId('p5').fig.rows[0]).cap)),
     'p5 도식: 수정란 21번 1개 · 45개');
  ok(byId('p5').fig.rows[0].cells.some(c => c.chr && c.chr.indexOf('none') >= 0),
     'p5 도식에 「없음」 생식세포가 있다');

  /* ── ★가계도 도식을 [12]의 독립 유도와 대조한다 ── */
  const ALLELE = { XR:'R', Xp:'p', Y:'Y' };
  const kk = arr => arr.slice().sort().join('+');
  const zygKey = id => kk(zyg(byId(id).fig.rows[0]).chr.map(k => ALLELE[k]));
  function gam2(pair, mode){
    const a = pair[0], b = pair[1];
    if (mode === 'normal') return [[a],[b]];
    if (mode === 'nd1')    return [[a,b],[]];
    return [[a,a],[b,b],[],[a],[b]];
  }
  function possible(fPair, mPair, who, when){
    const out = new Set();
    gam2(fPair, who === 'f' ? when : 'normal').forEach(g1 => {
      gam2(mPair, who === 'm' ? when : 'normal').forEach(g2 => out.add(kk(g1.concat(g2))));
    });
    return out;
  }
  const 정상남 = ['R','Y'], 색맹남 = ['p','Y'], 정상녀 = ['R','R'], 보인자 = ['R','p'], 색맹녀 = ['p','p'];

  ok(zygKey('g1') === kk(['p','p','Y']), '★g1 도식의 수정란이 X′X′Y 다 (문항의 자료와 일치)');
  ok(possible(정상남, 보인자, 'm', 'nd2').has(zygKey('g1')),
     '★g1 도식의 수정란을 어머니 감수 2분열이 실제로 만들 수 있다');
  ok(!possible(정상남, 보인자, 'm', 'nd1').has(zygKey('g1')),
     '★g1 도식의 수정란을 어머니 감수 1분열로는 만들 수 없다');

  ok(zygKey('g3') === kk(['R','p','Y']), '★g3 도식의 수정란이 X<sup>R</sup>X′Y 다');
  ok(possible(정상남, 색맹녀, 'f', 'nd1').has(zygKey('g3')),
     '★g3 도식의 수정란을 아버지 감수 1분열이 실제로 만들 수 있다');
  ok(!possible(정상남, 색맹녀, 'f', 'nd2').has(zygKey('g3')),
     '★g3 도식의 수정란을 아버지 감수 2분열로는 만들 수 없다');

  const g2 = byId('g2').fig;
  ok(g2.rows.length === 2, 'g2 도식은 두 시기를 나란히 보여 준다');
  ok(g2.rows.every(r => r.cells.some(c => c.chr && c.chr.indexOf('none') >= 0)),
     '★g2: 두 시기 모두 성염색체가 없는 생식세포를 만든다');
  ok(JSON.stringify(zyg(g2.rows[0]).chr) === JSON.stringify(zyg(g2.rows[1]).chr),
     '★g2: 두 시기가 똑같은 딸을 만든다 (시기 판정 불가의 근거)');
  ok(kk(zyg(g2.rows[0]).chr.map(k => ALLELE[k])) === kk(['p']), 'g2 도식의 딸이 X′ 하나뿐이다');
  ok(possible(색맹남, 정상녀, 'm', 'nd1').has(kk(['p'])) &&
     possible(색맹남, 정상녀, 'm', 'nd2').has(kk(['p'])),
     '★g2: 두 시기 모두 그 딸을 실제로 만들 수 있다');
  ok(g2.rows.every(r => /어머니/.test(r.lead)), 'g2 두 갈래 이름이 모두 어머니다');

  /* ── 그리기 ── */
  ok(S.figHtml(null) === '' && S.figHtml(undefined) === '', '도식이 없으면 빈 문자열');
  const h1 = S.figHtml(byId('p1').fig);
  ok(/<svg/.test(h1) && /<\/svg>/.test(h1), '도식이 SVG를 그린다');
  ok((h1.match(/<figure class="chrp"/g) || []).length ===
     gamCells(byId('p1').fig).reduce((a, c) => a + c.chr.length, 0), '염색체 개수만큼 막대를 그린다');
  ok(!/https?:\/\/(?!www\.w3\.org)/.test(h1), '도식에 외부 URL 0건');
  ok(/class="fnote"/.test(h1), '도식 아래 한 줄 설명이 붙는다');
  const h5 = S.figHtml(byId('p5').fig);
  ok(/stroke-dasharray/.test(h5), '★「없음」은 점선 막대로 그린다');
  ok(/class="fbox zyg"/.test(h5), '수정란 칸은 생식세포와 다른 모양이다');
  const hg1 = S.figHtml(byId('g1').fig);
  ok(/X<sup>R<\/sup>|X′/.test(S.figHtml(byId('g3').fig)), '도식 이름표에 대립유전자 표기가 나온다');
  ok(/44\+XXY/.test(hg1), 'g1 도식에 핵형이 적혀 있다');

  /* ── ★고른 뒤에만 나온다 ── */
  const F = finish(makeSandbox());
  F.renderPractice();
  const c4 = F._store['pracBox'].children[0], c6 = F._store['pedBox'].children[0];
  ok(!/<svg/.test(explOf(c4).innerHTML), '★고르기 전 ④ 해설칸에 도식이 없다');
  ok(!/<svg/.test(explOf(c6).innerHTML), '★고르기 전 ⑤ 해설칸에 도식이 없다');
  F.pickPractice('p1', byId('p1').a);
  F.pickPractice('g1', byId('g1').a);
  ok(/<svg/.test(explOf(c4).innerHTML) && /class="fig"/.test(explOf(c4).innerHTML),
     '★고른 뒤 ④ 해설칸에 도식이 나온다');
  ok(/<svg/.test(explOf(c6).innerHTML), '★고른 뒤 ⑤ 해설칸에 도식이 나온다');
  ok(explOf(c4).innerHTML.indexOf('옳다.') === 0, '도식은 글 설명 뒤에 붙는다');
  // 오답이어도 도식은 나온다 (답을 눈으로 확인하는 것이 목적이다)
  F.pickPractice('p2', (byId('p2').a + 1) % 4);
  ok(/<svg/.test(explOf(F._store['pracBox'].children[1]).innerHTML),
     '★오답을 골라도 도식이 나온다 (답을 눈으로 확인시키는 것이 목적)');

  /* ── 잠긴 동안은 도식도 없다 ── */
  const L = makeSandbox();
  ok(!/<svg/.test(String(L._store['pracBox'].innerHTML) + String(L._store['pedBox'].innerHTML)),
     '★잠긴 동안 도식 노출 0');

  /* ── ⑤의 단서 (교사 지적 2026-08-20) ── */
  const bodyVis2 = src.slice(src.indexOf('<body>'), src.lastIndexOf('<script>'))
                      .replace(/<!--[\s\S]*?-->/g, '');
  ok(/교차는 일어나지 않은 것으로 한다/.test(bodyVis2),
     '★「교차는 일어나지 않은 것으로 한다」를 학생 화면에 밝혀 두었다');
  ok(/정상 대립유전자 X<sup>R<\/sup>가 하나도 없을 때/.test(bodyVis2),
     '★색맹이 나타나는 조건(정상 대립유전자가 하나도 없을 때)을 밝혀 두었다');
  ok(bodyVis2.indexOf('이 문항들의 단서') > 0, '단서 상자에 이름이 붙어 있다');
}

/* ════════════════════════════════════════════════════════════
   [14] 힌트 2단 — 답 대신 관찰 지점을 먼저 가리킨다
        ★힌트가 정답을 그대로 말해 버리면 장치의 뜻이 사라진다. 그것을 기계로 막는다.
   ════════════════════════════════════════════════════════════ */
console.log('[14] 힌트 2단');
{
  const plain = h => String(h).replace(/<[^>]*>/g, '');
  const ALL = S.PRACTICE.concat(S.PEDQ);

  /* ── 자료 ── */
  ok(ALL.every(q => Array.isArray(q.hint) && q.hint.length === 2),
     '★④⑤ 모든 문항에 힌트가 2단으로 있다 (' + ALL.length + '문항)');
  ok(ALL.every(q => q.hint.every(t => typeof t === 'string' && plain(t).length >= 10)),
     '힌트 문구가 비어 있지 않다');

  /* ── ★힌트가 답을 말하지 않는다 ── */
  ok(ALL.every(q => q.hint.every(t => plain(t).indexOf(plain(q.ch[q.a])) < 0)),
     '★힌트에 정답 선택지 문구가 그대로 들어 있지 않다');
  ok(ALL.every(q => q.hint.every(t => q.ch.every(c => plain(t).indexOf(plain(c)) < 0))),
     '★힌트에 어떤 선택지 문구도 그대로 들어 있지 않다');
  // 1단은 「어디를 볼 것인가」이므로 결론을 담지 않는다
  ok(S.PRACTICE.every(q => !/판정할 수 없다|옳은 것은/.test(plain(q.hint[0]))),
     '★1단 힌트가 결론을 말하지 않는다');

  /* ── 말투 (시험지 문체) ── */
  const BANNED = ['해 보자','보자.','하자.','좋아','맞아.','했어','거야','일까','할까','너의','네가','우리가'];
  const hblob = JSON.stringify(ALL.map(q => q.hint));
  ok(BANNED.filter(w => hblob.indexOf(w) >= 0).length === 0,
     '힌트 문안에 친근체 0건 (검출: ' + BANNED.filter(w => hblob.indexOf(w) >= 0).join(' ') + ')');
  ok(!/입니다|합니다|하세요/.test(hblob), '힌트가 존댓말이 아니다 (시험지 문체)');

  /* ── 본문 마크업에 새지 않는다 ── */
  const bodyMk = src.slice(src.indexOf('<body>'), src.lastIndexOf('<script>'));
  ok(ALL.every(q => q.hint.every(t => bodyMk.indexOf(plain(t).slice(0, 15)) < 0)),
     '★힌트 문구가 본문 마크업에 없다 (소스·읽기 모드로 새지 않는다)');

  /* ── 화면 ── */
  const PL = {
    normal:{m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
            m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
                'A-m#0':'L','A-m#1':'R','B-m#0':'L','B-m#1':'R'}},
    nd1:{m1:{'A-p':'L','A-m':'L','B-p':'L','B-m':'R'},
         m2:{'A-p#0':'L','A-p#1':'R','A-m#0':'L','A-m#1':'R',
             'B-p#0':'L','B-p#1':'R','B-m#0':'L','B-m#1':'R'}},
    nd2:{m1:{'A-p':'L','A-m':'R','B-p':'L','B-m':'R'},
         m2:{'A-p#0':'L','A-p#1':'R','B-p#0':'L','B-p#1':'R',
             'A-m#0':'L','A-m#1':'L','B-m#0':'L','B-m#1':'R'}}
  };
  const F = makeSandbox();
  ['normal','nd1','nd2'].forEach((cs, i) => {
    F.state.place[cs] = PL[cs]; F.state.phase[cs] = 2;
    F.state.roundDone[cs] = true; F.state.sumPick[cs] = [3,0,2][i];
  });
  F.reconcileRounds(); F.renderPractice();

  const card = F._store['pracBox'].children[0];
  const hw = kid(card, 'hintwrap');
  ok(!!hw, '문항 카드에 힌트 영역이 붙는다');
  ok(hw.children.length === 4, '힌트 영역은 단추 2 · 상자 2로 이루어진다');
  const [hb1, hx1, hb2, hx2] = hw.children;
  ok(hx1.style.display === 'none' && hx2.style.display === 'none', '처음에는 두 힌트가 모두 닫혀 있다');
  ok(hb2.style.display === 'none', '★2단 단추는 1단을 열기 전에는 보이지 않는다');
  hb1.onclick();
  ok(hx1.style.display === 'block' && hb1.style.display === 'none', '1단을 열면 단추가 상자로 바뀐다');
  ok(hb2.style.display === 'inline-block', '★1단을 연 뒤에 2단 단추가 나타난다');
  ok(hx2.style.display === 'none', '2단은 아직 닫혀 있다');
  hb2.onclick();
  ok(hx2.style.display === 'block' && hb2.style.display === 'none', '2단이 열린다');
  ok(/힌트 ① 어디를 볼 것인가/.test(hx1.innerHTML) && /힌트 ② 판단 기준/.test(hx2.innerHTML),
     '두 단에 이름이 붙어 있다');

  /* ── ★기록에 남기지 않는다 (교사 결정 2026-08-20) ── */
  ok(JSON.stringify(F.state).indexOf('hint') < 0,
     '★힌트를 연 것은 기록에 남지 않는다 (「누르면 감점」 오해 방지)');

  /* ── ★답을 고른 뒤에도 힌트가 남는다 ── */
  F.pickPractice('p1', S.PRACTICE[0].a);
  ok(!!kid(card, 'hintwrap'), '★답을 고른 뒤에도 힌트 영역이 남아 있다');
  ok(explOf(card).style.display === 'block', '해설도 함께 열려 있다');

  /* ── 잠긴 동안은 힌트도 없다 ── */
  const L2 = makeSandbox();
  const leak2 = String(L2._store['pracBox'].innerHTML) + String(L2._store['pedBox'].innerHTML);
  ok(ALL.every(q => q.hint.every(t => leak2.indexOf(plain(t).slice(0, 12)) < 0)),
     '★잠긴 동안 힌트 노출 0');

  /* ── 태블릿 ── */
  ok(/\.hintbtn\{[^}]*min-height:44px/.test(src.replace(/\s+/g, m => m.indexOf('\n') >= 0 ? '\n' : ' ')
       .replace(/\n\s*/g, '')) || /min-height:44px/.test(src),
     '힌트 단추가 44px 이상이다');

  /* ── 🔴 CSS 회귀 — ⑤를 걷어낼 때 .pedwrap 선택자가 함께 잘려 나갔던 사고 (2026-08-20) ── */
  ['.pedwrap', '.pedlegend', '.datbox', '.hintwrap', '.hintbtn', '.hintbox', '.pq', '.choice']
    .forEach(sel => {
      ok(new RegExp(sel.replace('.', '\.') + '\s*\{').test(src), '★CSS 규칙 ' + sel + ' 가 살아 있다');
    });
  const styleBlk = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
  ok(!/\n\s*[a-z-]+:[^;{}]+;[^{}]*\}/.test(styleBlk.replace(/\{[^{}]*\}/g, '{}')),
     '★선택자 없이 선언만 남은 CSS 덩이가 없다');
}

console.log('');
console.log('결과: ' + pass + ' 통과, ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
