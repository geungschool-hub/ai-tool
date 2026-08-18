// 가계도 분석 시뮬레이션 — Node 헤드리스 검사
// 실행:  node _test_가계도분석.js      (이 파일 옆의 HTML을 읽는다 — 드라이브 문자에 의존하지 않는다)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = path.join(__dirname, '1-2_가계도분석_시뮬레이션.html');
let src = fs.readFileSync(HTML, 'utf8');
const m = src.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!m) { console.error('FAIL: script 블록을 못 찾음'); process.exit(1); }
let js = m[1].replace(/^\s*'use strict';/, '');   // use strict 벗기기(작업노트 함정)

let pass = 0, fail = 0;
function ok(cond, name){
  if (cond) { pass++; }
  else { fail++; console.error('  X FAIL: ' + name); }
}

// ── DOM 스텁 ──
function makeSandbox(storageSeed){
  const store = {};
  function makeEl(id){
    const classes = new Set();
    const el = {
      className:'', innerHTML:'', textContent:'', value:'', style:{}, disabled:false,
      children:[], attrs:{}, onclick:null, offsetWidth:0, nodeType:1,
      classList: {
        add:c=>classes.add(c), remove:c=>classes.delete(c),
        toggle:(c,f)=>{ if(f===undefined){ classes.has(c)?classes.delete(c):classes.add(c);} else if(f) classes.add(c); else classes.delete(c); return classes.has(c); },
        contains:c=>classes.has(c)
      },
      _classes: classes,
      setAttribute:(k,v)=>{ el.attrs[k]=v; },
      appendChild:c=>{ el.children.push(c); return c; },
      querySelector:()=>makeEl(),
      addEventListener:()=>{}
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
      addEventListener: () => {}
    },
    localStorage: {
      getItem: k => (k in mem ? mem[k] : null),
      setItem: (k,v) => { mem[k] = String(v); },
      removeItem: k => { delete mem[k]; },
      _mem: mem
    },
    confirm: () => true,
    location: { reload(){} }
    // ★setTimeout / ResizeObserver / window.addEventListener 는 일부러 넣지 않는다
    //   — 앱의 typeof 가드가 실제로 동작하는지 여기서 검증된다.
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox);
  sandbox._store = store;
  return sandbox;
}
const txt = el => (el && (el.innerHTML || el.textContent)) || '';
const disp = (S, id) => (S._store[id] && S._store[id].style && S._store[id].style.display) || '';

const S = makeSandbox();

// ══ 1. 데이터 무결성 ══
console.log('[1] 가계도 데이터 무결성');
for (const [name, P] of [['P1',S.P1],['P2',S.P2],['P3',S.P3]]) {
  const ids = P.members.map(x=>x.id);
  ok(new Set(ids).size === ids.length, name+' id 중복 없음');
  const has = id => ids.includes(id);
  P.couples.forEach(cp => ok(has(cp[0]) && has(cp[1]), name+' couple 참조 '+cp));
  P.sibs.forEach(sb => {
    ok(has(sb.p[0]) && has(sb.p[1]), name+' sib 부모 참조');
    sb.c.forEach(c => ok(has(c), name+' sib 자녀 참조 '+c));
    const py = S.memberById(P, sb.p[0]).y;
    sb.c.forEach(c => ok(S.memberById(P,c).y > py, name+' 자녀가 부모 아래 세대'));
    ok(P.couples.some(cp => (cp[0]===sb.p[0]&&cp[1]===sb.p[1])||(cp[0]===sb.p[1]&&cp[1]===sb.p[0])), name+' sib 부모가 couple에 존재');
  });
}
ok(S.P1.members.length === 12, 'P1 12명');
ok(S.P2.members.length === 14, 'P2 14명');
const aff1 = S.P1.members.filter(x=>x.aff).map(x=>x.id).join(',');
ok(aff1 === '3,6,7,10,11', '자료1 미맹 = 3,6,7,10,11 (실제: '+aff1+')');
const aff2 = S.P2.members.filter(x=>x.aff).map(x=>x.id).join(',');
ok(aff2 === '5,8,9,14', '자료2 색맹 = 5,8,9,14 (실제: '+aff2+')');

// ══ 2. 유전자형 정답을 가계도 구조에서 독립 재유도 ══
console.log('[2] 자료2 유전자형 정답 독립 검증');
{
  const P = S.P2;
  const parentOf = {};
  P.sibs.forEach(sb => {
    const pa = S.memberById(P, sb.p[0]), pb = S.memberById(P, sb.p[1]);
    const father = pa.sex==='M' ? pa : pb, mother = pa.sex==='F' ? pa : pb;
    sb.c.forEach(c => parentOf[c] = [father.id, mother.id]);
  });
  const byId = id => S.memberById(P, id);
  const childrenOf = id => Object.keys(parentOf).filter(c => parentOf[c].includes(id)).map(Number);
  for (const mm of P.members) {
    let expect;
    if (mm.sex === 'M') expect = mm.aff ? 'rY' : 'RY';
    else if (mm.aff) expect = 'rr';
    else {
      const affSon = childrenOf(mm.id).some(c => byId(c).sex==='M' && byId(c).aff);
      const p = parentOf[mm.id];
      const affFather = p && byId(p[0]).aff;
      const affMother = p && byId(p[1]).aff;
      const affDaughter = childrenOf(mm.id).some(c => byId(c).sex==='F' && byId(c).aff);
      expect = (affSon || affFather || affMother || affDaughter) ? 'Rr' : 'UNK';
    }
    ok(S.GENO_KEY[mm.id] === expect, '유전자형 '+mm.id+': 기대 '+expect+' / 정답표 '+S.GENO_KEY[mm.id]);
  }
}
// ══ 3. 관찰 집합·근거 집합 독립 재유도 ══
console.log('[3] 관찰 집합 · 근거 집합 독립 검증');
{
  const P = S.P1;
  const parentOf = {};
  P.sibs.forEach(sb => sb.c.forEach(c => parentOf[c] = sb.p));
  const byId = id => S.memberById(P, id);
  const sorted = a => [...a].sort((x,y)=>x-y);
  const eq = (a,b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

  // ① 관찰 = 미맹인 사람 전원  (③ 근거보다 넓다 — 이 비대칭이 '자료 해석 ≠ 추론'을 만든다)
  const obs1 = P.members.filter(x => x.aff).map(x=>x.id);
  ok(eq(obs1, S.Q1_OBS), 'Q1 관찰 = 미맹 전원 '+sorted(obs1));
  // ③ 근거 = 부모가 모두 정상인 미맹 자녀
  const q1 = P.members.filter(x => x.aff && parentOf[x.id] && parentOf[x.id].every(p => !byId(p).aff)).map(x=>x.id);
  ok(eq(q1, S.Q1_EVIDENCE), 'Q1 근거 = '+sorted(q1));
  ok(S.Q1_OBS.length > S.Q1_EVIDENCE.length, 'Q1: 관찰 ⊃ 근거 (10·3이 걸러진다)');
  ok(S.Q1_OBS.includes(10) && !S.Q1_EVIDENCE.includes(10), 'Q1: 10은 관찰엔 있고 근거엔 없다');

  // ① 관찰 = 미맹인 딸 전원
  const obs2 = P.members.filter(x => x.aff && x.sex==='F').map(x=>x.id);
  ok(eq(obs2, S.Q2_OBS), 'Q2 관찰 = 미맹인 딸 전원 '+sorted(obs2));
  // ③ 근거 = 아버지가 정상인 미맹 딸
  const q2 = P.members.filter(x => {
    if (!(x.aff && x.sex==='F' && parentOf[x.id])) return false;
    const father = parentOf[x.id].map(byId).find(p=>p.sex==='M');
    return father && !father.aff;
  }).map(x=>x.id);
  ok(eq(q2, S.Q2_EVIDENCE), 'Q2 근거 = '+sorted(q2));
  ok(S.Q2_OBS.includes(10) && !S.Q2_EVIDENCE.includes(10), 'Q2: 10은 관찰엔 있고 근거엔 없다(아버지 3이 미맹)');

  const P2 = S.P2, parentOf2 = {};
  P2.sibs.forEach(sb => {
    const pa = S.memberById(P2, sb.p[0]), pb = S.memberById(P2, sb.p[1]);
    sb.c.forEach(c => parentOf2[c] = {f:(pa.sex==='M'?pa:pb).id, m:(pa.sex==='F'?pa:pb).id});
  });
  ok(parentOf2[9].m === 4, '9의 어머니 = 4');
  ok(parentOf2[4].m === 2, '4의 어머니 = 2');
  ok(parentOf2[4].f === 1 && !S.memberById(P2,1).aff, '4의 아버지 = 1(정상)');
  const son5 = S.memberById(P2,5);
  ok(parentOf2[5].m === 2 && son5.aff && son5.sex==='M', '2의 색맹 아들 5 (보인자 근거)');
  ok(JSON.stringify(S.PATH_KEY) === '[2,4,9]', 'PATH_KEY = [2,4,9]');
  ok(parentOf2[9].f === 3 && JSON.stringify(S.PATH_CON) === '[3]', '경로 모순 대상 = 아버지 3');
  ok(S.memberById(S.P3,1).aff && S.memberById(S.P3,2).aff, '도전: 부모 1·2 형질');
  const d3 = S.memberById(S.P3,3);
  ok(!d3.aff && d3.sex==='F', '도전: 3 = 정상 딸');
  ok(JSON.stringify(S.Q3_EVIDENCE)==='[3]' && JSON.stringify(S.Q4_EVIDENCE)==='[3]', '도전 근거 = [3]');
}

// ══ 4. 순수 함수 ══
console.log('[4] 순수 함수');
{
  const all = Object.assign({}, S.GENO_KEY);
  let r = S.gradeGeno(S.GENO_KEY, all);
  ok(r.wrong.length===0 && r.missing.length===0 && r.correct.length===14, 'gradeGeno 전원 정답');
  const one = Object.assign({}, all, {6:'RR'});
  r = S.gradeGeno(S.GENO_KEY, one);
  ok(r.wrong.length===1 && r.wrong[0]===6, 'gradeGeno 오답 검출(6)');
  const miss = Object.assign({}, all); delete miss[13];
  r = S.gradeGeno(S.GENO_KEY, miss);
  ok(r.missing.length===1 && r.missing[0]===13, 'gradeGeno 미입력 검출(13)');
  ok(S.pathStep([2,4,9], [], 9) === 'wrong', 'pathStep: 9 먼저 -> wrong');
  ok(S.pathStep([2,4,9], [], 2) === 'ok', 'pathStep: 2 -> ok');
  ok(S.pathStep([2,4,9], [2], 4) === 'ok', 'pathStep: 4 -> ok');
  ok(S.pathStep([2,4,9], [2,4], 9) === 'finish', 'pathStep: 9 -> finish');
  ok(S.pathStep([2,4,9], [2,4,9], 1) === 'done', 'pathStep: 완료 후 -> done');
  ok(S.pathStep([2,4,9], [2], 5) === 'wrong', 'pathStep: 삼촌 5 -> wrong');

  // 관계 색인
  const r1 = S.buildRelations(S.P1);
  ok(JSON.stringify(r1[8]) === JSON.stringify({parents:[1,2],children:[11,12],spouses:[9],sibs:[5,6,7]}),
     'buildRelations: 8은 자녀이자 부모 — 양방향 모두 잡힌다');
  const r2 = S.buildRelations(S.P2);
  ok(r2[6].parents.length===0 && r2[6].spouses.join(',')==='5' && r2[6].children.join(',')==='11,12',
     'buildRelations: 6은 가계도에 부모가 없는 배우자');
  let blank = 0;
  [['stage1',S.P1],['stage2',S.P2],['stage3',S.P3]].forEach(([sid,P]) => {
    P.members.forEach(mm => {
      const d = S.describeMember(sid, mm.id);
      if (!d) { blank++; return; }
      if (!(d.parents.length || d.children.length || d.spouses.length || d.sibs.length)) blank++;
    });
  });
  ok(blank === 0, '30명 전원 관계 공백 0명 (실제 공백: '+blank+')');

  // 반응형 계산
  ok(S.pedRowPitch(S.P1) === 85,  'P1 같은 세대 최소 간격 85 (실제: '+S.pedRowPitch(S.P1)+')');
  ok(S.pedRowPitch(S.P2) === 100, 'P2 같은 세대 최소 간격 100');
  ok(S.pedRowPitch(S.P3) === 100, 'P3 같은 세대 최소 간격 100');
  ok(S.pedHitSize(S.P1,1).w === 64 && S.pedHitSize(S.P1,1).h === 88, 's=1이면 자연 크기 64×88');
  ok(S.pedHitSize(S.P1,0.6).w * 0.6 >= 43.9, 's=0.6에서 화면상 탭 폭 44px 확보');
  ok(S.pedHitSize(S.P1,0.4).w <= 85-8,  '히트폭이 열 간격(85)을 넘지 않음 — 이웃 오탭 방지');
  ok(S.pedHitSize(S.P2,0.4).w <= 100-8, 'P2도 열 간격 상한 준수');
  ok(S.pedHitSize(S.P1,0.5).h <= 120,   '세로 히트 상한 120(이웃 세대 침범 방지)');

  // 라운드 분할 무결성
  const cov = S.roundCoverage();
  ok(cov.total === 14 && cov.dup.length === 0 && cov.missing.length === 0,
     '라운드 분할이 14명을 빠짐없이 1회씩 덮음');
  ok(S.ROUNDS.length === 3, '라운드 3개');
  const males = S.P2.members.filter(x=>x.sex==='M').map(x=>x.id).sort((a,b)=>a-b).join(',');
  ok(S.ROUNDS[0].ids.slice().sort((a,b)=>a-b).join(',') === males, 'R1 = 남자 전원');
  ok(S.ROUNDS[1].ids.join(',') === '8,12,13', 'R2 = 자신·부모에 근거');
  ok(S.ROUNDS[2].ids.join(',') === '2,4,6', 'R3 = 자녀 역추적');
  ok(S.ROUNDS[2].ids.includes(6), '6은 단독 라운드가 아니라 R3에 포함(위치로 답을 찍지 못하게)');
  {
    const P = S.P2, par = {};
    P.sibs.forEach(sb => {
      const a = S.memberById(P, sb.p[0]), b = S.memberById(P, sb.p[1]);
      sb.c.forEach(c => par[c] = { f:(a.sex==='M'?a:b).id, m:(a.sex==='F'?a:b).id });
    });
    const selfOrParent = id => {
      const mm = S.memberById(P,id), p = par[id];
      return mm.aff || !!(p && (S.memberById(P,p.f).aff || S.memberById(P,p.m).aff));
    };
    ok(S.ROUNDS[1].ids.every(selfOrParent),        'R2 전원 자신·부모에서 확정 가능');
    ok(S.ROUNDS[2].ids.every(id => !selfOrParent(id)), 'R3 전원 자신·부모로는 불가(자녀를 봐야 한다)');
  }
  ok(!S.PATH_KEY.includes(6), '경로 게이트에 6이 없다 → 6을 틀려도 문항4가 열린다');
  {
    const sub = {8:S.GENO_KEY[8], 12:S.GENO_KEY[12], 13:S.GENO_KEY[13]};
    const rr = S.gradeGeno(sub, {8:'Rr', 12:'Rr', 13:'Rr'});
    ok(rr.wrong.length===1 && rr.wrong[0]===8 && rr.correct.length===2,
       'gradeGeno 부분 key로 라운드 채점 가능(기존 순수 함수 재사용)');
  }
  ok(S.gradableSteps() === 28, '채점 대상 단계 28개 — 본 활동 17 + ⑤연습 11 (실제: '+S.gradableSteps()+')');
}

// ══ 5. 반응형 뷰 ══
console.log('[5] 반응형 가계도 뷰');
{
  S.init();
  ok(S.PED.stage1.data === S.P1 && S.PED.stage2.data === S.P2 && S.PED.stage3.data === S.P3 && S.PED.stage4.data === S.P4, 'PED 레지스트리 4개 등록');
  ok(Object.keys(S.PED).length === 4, 'PED에 stage 외 키 없음');
  S.pedFitAll();
  ok(S.PED.stage2.scale === 1, '측정 불가(헤드리스)에서 배율 1 유지 — 예외 없음');
  S.pedZoom('stage1', 1);  ok(Math.abs(S.PED.stage1.scale - 1.25) < 1e-9, '＋ → 1.25배');
  S.pedZoom('stage1', -1); ok(Math.abs(S.PED.stage1.scale - 1) < 1e-9,    '－ → 1배 복귀(부동소수 누적 없음)');
  for (let i=0;i<12;i++) S.pedZoom('stage1', 1);
  ok(S.PED.stage1.scale <= 3.0 + 1e-9, '확대 상한 3.0');
  for (let i=0;i<24;i++) S.pedZoom('stage1', -1);
  ok(S.PED.stage1.scale >= 0.35 - 1e-9, '축소 하한 0.35');
  ok(S._store['pedassist_stage1']._classes.has('show'), '작은 배율 → 번호 단추 자동 노출');
  S.pedFit('stage1');
  ok(S.PED.stage1.mode === 'fit', '화면맞춤 → fit 모드 복귀');
  S.pedToggleAssist('stage1');
  ok(!S._store['pedassist_stage1']._classes.has('show') || S.PED.stage1.assist === true, '번호 단추 수동 토글 동작');
  S.pedToggleFull('stage2'); ok(S.pedFullId === 'stage2', '전체화면 진입(document.body 없어도 예외 없음)');
  S.pedToggleFull('stage2'); ok(S.pedFullId === null,     '전체화면 해제');
  ok(S._store['pedchip_stage1_6'] && S._store['pedchip_stage1_6'].onclick, '번호 단추가 구성원 탭과 같은 핸들러에 연결');
}

// ══ 6. 무반응 회귀 방지 — 탭하면 반드시 반응한다 ══
console.log('[6] 무반응 회귀 방지 (모드 × 구성원 전수)');
{
  const T = makeSandbox();
  T.init();
  let calls = 0;
  const orig = T.highlightFamily;
  T.highlightFamily = function(){ calls++; return orig.apply(null, arguments); };

  const tapAll = (label) => {
    let combos = 0, silent = 0;
    [['stage1', T.P1, T.tapP1], ['stage2', T.P2, T.tapP2], ['stage3', T.P3, T.tapP3], ['stage4', T.P4, T.tapP4]].forEach(([sid,P,fn]) => {
      P.members.forEach(mm => {
        combos++;
        const before = calls;
        fn(mm.id);
        if (calls === before) { silent++; console.error('    무반응: ' + label + ' / ' + sid + '-' + mm.id); }
      });
    });
    return { combos, silent };
  };

  // 상태 ①: 아무것도 안 한 처음 (예전 코드가 100% 무반응이던 지점)
  let r = tapAll('①시작 직후');
  ok(r.silent === 0, '①시작 직후: 37명 전원 반응 (무반응 '+r.silent+')');
  const per = r.combos;

  // 상태 ②: ② 선택지를 기다리는 중 (관찰을 끝낸 뒤)
  T.Q1_OBS.forEach(id => T.tapP1(id));
  T.Q3_EVIDENCE.forEach(()=>{});
  r = tapAll('②선택지 대기');
  ok(r.silent === 0, '②선택지 대기 중: 전원 반응');

  // 상태 ③: 오답을 골라 본 뒤 (예전 코드가 evMode=null 로 되돌아 무반응이던 지점)
  T.questPick('q1', 1);
  r = tapAll('③오답 선택 후');
  ok(r.silent === 0, '③오답 선택 후: 전원 반응');

  // 상태 ④: 전부 완료 (예전 코드가 '복습 불가'였던 지점)
  const F = makeSandbox();
  F.init();
  F.Q1_OBS.forEach(id => F.tapP1(id)); F.questPick('q1',0); F.tapP1(6); F.answerQ1('rec');
  F.Q2_OBS.forEach(id => F.tapP1(id)); F.questPick('q2',0); F.tapP1(11); F.answerQ2('auto');
  Object.keys(F.GENO_KEY).forEach(id => F.chooseGeno(+id, F.GENO_KEY[id]));
  F.gradeP2(); F.gradeP2(); F.gradeP2();
  F.questPick('qp',0); F.tapP2(3); F.questPick('qp',0);
  F.tapP2(2); F.tapP2(4); F.tapP2(9);
  F.questPick('q3',0); F.tapP3(3); F.answerQ3('dom');
  F.questPick('q4',0); F.tapP3(3); F.answerQ4('auto');
  let calls2 = 0;
  const orig2 = F.highlightFamily;
  F.highlightFamily = function(){ calls2++; return orig2.apply(null, arguments); };
  let silent2 = 0, combos2 = 0;
  [['stage1', F.P1, F.tapP1], ['stage2', F.P2, F.tapP2], ['stage3', F.P3, F.tapP3], ['stage4', F.P4, F.tapP4]].forEach(([sid,P,fn]) => {
    P.members.forEach(mm => { combos2++; const b = calls2; fn(mm.id); if (calls2===b) silent2++; });
  });
  ok(silent2 === 0, '④전부 완료 후: 전원 반응 (복습 가능)');
  ok(per * 4 === 148 && combos2 === 37, '총 148 조합 점검 (37명 × 4상태)');

  // 관찰 중에는 흔들지 않는다 — 흔들림은 '판정에서 틀림' 하나로만 쓴다
  const K = makeSandbox(); K.init();
  let shakes = 0; const os = K.flashShake;
  K.flashShake = function(){ shakes++; return os.apply(null, arguments); };
  K.tapP1(3); K.tapP1(6); K.tapP1(7);           // 관찰 정답만 탭 = 흔들림 0
  ok(shakes === 0, '관찰 정답 탭 3회에 흔들림 0회');
  K.tapP1(5);                                     // 관찰 중 정상인 탭 = 오답
  ok(shakes === 1, '관찰 오답 탭에는 흔들림 1회');
  K.tapP1(10); K.tapP1(11);                       // 관찰 완료 → ②가정 단계
  ok(K.curStep('q1').kind === 'pick', '관찰 완료');
  const before = shakes;
  K.tapP1(5); K.tapP1(12);
  ok(shakes === before, '선택지를 기다리는 중에는 탭해도 흔들지 않는다(반응만 준다)');
}

// ══ 7. 문항 4단계 흐름 (관찰 → 가정 → 모순 → 결론) ══
console.log('[7] 문항 4단계 흐름');
{
  const A = makeSandbox(); A.init();
  ok(A.state && A.stepDone() === 0, '초기 진행 0');
  ok(A.activeQuest('stage1') === 'q1', '자료1의 활성 문항 = q1');
  ok(A.curStep('q1').kind === 'tap', 'q1 첫 단계 = 관찰(탭)');

  // ① 관찰 — 미맹 5명을 다 찾아야 넘어간다
  A.tapP1(5);
  ok(A.qstate('q1').obs.length === 0, '관찰: 정상인 5는 안 세어진다');
  A.tapP1(3); A.tapP1(3);
  ok(A.qstate('q1').obs.length === 1, '관찰: 같은 사람 재탭은 중복 안 됨');
  ok(A.curStep('q1').kind === 'tap', '관찰 미완료 — 아직 ①단계');
  A.tapP1(6); A.tapP1(7); A.tapP1(10);
  ok(A.curStep('q1').kind === 'tap', '4/5 — 아직 ①단계');
  A.tapP1(11);
  ok(A.curStep('q1').kind === 'pick', '관찰 5/5 완료 → ②가정 단계로');

  // ② 가정 — 오개념 선택지는 통과시키지 않는다
  A.questPick('q1', 1);
  ok(A.curStep('q1').kind === 'pick', '가정 오답 → 단계 유지');
  ok(A.state.first['q1:1'] === false, '첫 시도 오답이 기록됨');
  A.questPick('q1', 0);
  ok(A.state.first['q1:1'] === false, '첫 시도 기록은 나중 정답으로 덮이지 않는다');
  ok(A.curStep('q1').kind === 'tap', '가정 정답 → ③모순 단계로');

  // ③ 모순 — 관찰에서는 인정된 10·3이 여기서는 거부된다
  A.tapP1(10);
  ok(A.curStep('q1').kind === 'tap', '모순: 10(아버지가 미맹)은 반례가 못 된다');
  A.tapP1(3);
  ok(A.curStep('q1').kind === 'tap', '모순: 3(부모 없음)도 반례가 못 된다');
  A.tapP1(6);
  ok(A.curStep('q1').kind === 'pick', '모순: 6 → ④결론 단계로');
  ok(A.state.q1ev === false, '아직 문항 미완료(결론 전)');

  // ④ 결론
  A.answerQ1('dom');
  ok(A.state.q1ev === false, '결론 오답 → 미완료');
  A.answerQ1('rec');
  ok(A.state.q1ev === true && A.state.q1 === 'rec', '결론 정답 → q1 완료');
  ok(disp(A,'quiz_q2') === 'block', 'q1 완료 → q2 표시');
  ok(A.stepDone() === 1, '진행 1/4');
  ok(A.activeQuest('stage1') === 'q2', '이제 활성 문항 = q2');

  // 문항 2
  A.tapP1(7);
  ok(A.qstate('q2').obs.length === 0, 'Q2 관찰: 미맹이어도 아들 7은 안 세어진다');
  A.tapP1(6); A.tapP1(10); A.tapP1(11);
  ok(A.curStep('q2').kind === 'pick', 'Q2 관찰 3/3 완료');
  A.questPick('q2', 2);
  ok(A.curStep('q2').kind === 'pick', 'Q2 가정: "딸은 미맹이 될 수 없다" 거부');
  A.questPick('q2', 0);
  A.tapP1(10);
  ok(A.curStep('q2').kind === 'tap', 'Q2 모순: 10 거부(아버지 3이 미맹)');
  A.tapP1(1);
  ok(A.curStep('q2').kind === 'tap', 'Q2 모순: 아버지 1을 직접 탭해도 거부(딸을 골라야 한다)');
  A.tapP1(11);
  ok(A.curStep('q2').kind === 'pick', 'Q2 모순: 11 → 결론 단계');
  A.answerQ2('auto');
  ok(A.state.q2ev === true && A.stepDone() === 2, '진행 2/4');

  // 도전 (① 읽기 단계는 자동 통과)
  ok(A.curStep('q3').kind === 'pick', '도전A: ①읽기는 자동 통과 → ②가정부터');
  A.questPick('q3', 1);
  ok(A.curStep('q3').kind === 'pick', '도전A 가정 오답 거부');
  A.questPick('q3', 0);
  A.tapP3(4);
  ok(A.curStep('q3').kind === 'tap', '도전A 모순: 4(형질인 아들)는 반례가 못 된다');
  A.tapP3(3);
  ok(A.curStep('q3').kind === 'pick', '도전A 모순: 3 → 결론');
  A.answerQ3('rec');
  ok(A.state.q3ev === false, '도전A 결론 오답 → 미완료');
  A.answerQ3('dom');
  ok(A.state.q3ev === true, '도전A 완료');
  ok(disp(A,'quiz_q4') === 'block', '도전A 완료 → 도전B 표시');
  ok(A.curStep('q4').kind === 'pick', '도전B도 ①읽기 자동 통과');
  A.questPick('q4', 1);
  ok(A.curStep('q4').kind === 'pick', '도전B 가정 오답 거부');
  A.questPick('q4', 0);
  A.tapP3(4);
  ok(A.curStep('q4').kind === 'tap', '도전B 모순: 아들 4 거부');
  A.tapP3(3);
  A.answerQ4('auto');
  ok(A.state.q4ev === true && A.challengeDone(), '도전B 완료 → 도전 배지');
  ok(A.stepDone() === 2, '도전은 진행 배지(4단계)에 안 들어간다');
}

// ══ 8. 라운드 채점 ══
console.log('[8] 자료2 라운드 채점');
{
  const B = makeSandbox(); B.init();
  ok(B.state.round === 0, '1라운드부터 시작');
  B.tapP2(8);
  ok(disp(B,'sheet') !== 'block', '미래 라운드(8)는 시트가 안 열리고 이유를 알려 준다');
  ok(txt(B._store['roundMsg']).indexOf('2라운드') >= 0, '  → 몇 라운드에서 다루는지 안내');

  B.ROUNDS[0].ids.slice(0,3).forEach(id => B.chooseGeno(id, B.GENO_KEY[id]));
  B.gradeP2();
  ok(B.state.round === 0 && !B.state.graded, '미입력 상태 채점 → 라운드 유지');
  ok(txt(B._store['roundMsg']).indexOf('입력되지 않았다') >= 0, '  → 남은 인원 안내');

  B.ROUNDS[0].ids.forEach(id => B.chooseGeno(id, B.GENO_KEY[id]));
  B.gradeP2();
  ok(B.state.rDone.r1 === true && B.state.round === 1, 'R1 통과 → R2 개방');
  ok(!B.state.allCorrect, 'R1만으로는 allCorrect 아님');
  ok(disp(B,'quizPath') !== 'block', 'R1 단계에선 경로 문항 잠김');
  ok(B.ansGate('ans3Btn').open === true && B.state.rDone.r3 !== true, '정리3 표는 열리되 R3 칸은 잠김');

  B.chooseGeno(8,'Rr'); B.chooseGeno(12,'Rr'); B.chooseGeno(13,'Rr');
  B.gradeP2();
  ok(B.state.rDone.r2 === false && B.state.round === 1, 'R2 오답 → 라운드 유지');
  ok(B.state.wrongCount[8] === 1, '개인별 오답 횟수 기록 → 힌트 단계화');
  B.openSheet(8);
  ok(txt(B._store['sheetHint']).indexOf('[힌트 1]') >= 0, '오답 1회 → 1차 힌트');
  B.gradeP2();
  ok(B.state.wrongCount[8] === 2, '오답 2회');
  B.openSheet(8);
  ok(txt(B._store['sheetHint']).indexOf('[힌트 2]') >= 0, '오답 2회 → 2차 힌트');
  B.chooseGeno(8,'rr'); B.gradeP2();
  ok(B.state.rDone.r2 === true && B.state.round === 2, 'R2 수정 후 통과');

  B.chooseGeno(2,'Rr'); B.chooseGeno(4,'Rr'); B.chooseGeno(6,'RR');
  B.gradeP2();
  ok(!B.state.allCorrect, '6 오답 → allCorrect false');
  ok(B.pathUnlocked() === true && disp(B,'quizPath') === 'block',
     '★2·4·9가 맞으면 6이 틀려도 문항4가 열린다(전원 정답 강제 해제)');
  B.chooseGeno(6,'UNK'); B.gradeP2();
  ok(B.state.allCorrect && B.state.round === 3, '3라운드 전부 통과');
  ok(B.roundsPassed() === 3, 'roundsPassed 3');
  ok(B.stepDone() >= 1, 'allCorrect 가 진행 단계로 잡힌다');

  // 통과 라운드를 '정답으로' 고쳐도 재채점을 요구한다 — UI 반응이 정답을 알려 주지 않게
  B.chooseGeno(1, B.GENO_KEY[1]);
  ok(B.state.rDone.r1 === false && B.state.round === 0 && !B.state.allCorrect,
     '통과 라운드 수정 시 정답이어도 재채점 요구(누수 차단)');
  B.gradeP2();
  ok(B.state.allCorrect && B.state.round === 3, '재채점 후 복귀');
  ok(B.roundBadgeText() === '', 'allCorrect 면 배지 접미사 없음');
  ok(B._store['progress'].textContent.indexOf('진행') === 0, '진행 배지 형식 유지');
}

// ══ 9. 경로 문항 ══
console.log('[9] 경로 문항 (관찰 → 가정 → 모순 → 결론 → 길 그리기)');
{
  const C = makeSandbox(); C.init();
  Object.keys(C.GENO_KEY).forEach(id => C.chooseGeno(+id, C.GENO_KEY[id]));
  C.gradeP2(); C.gradeP2(); C.gradeP2();
  ok(C.state.allCorrect, '14명 전원 정답');
  ok(C.activeQuest('stage2') === 'qp', '경로 문항 활성화');
  ok(C.curStep('qp').kind === 'pick', '①읽기 자동 통과 → ②가정');
  C.questPick('qp', 1);
  ok(C.curStep('qp').kind === 'pick', '가정: "아버지가 보인자다" 거부');
  C.questPick('qp', 2);
  ok(C.curStep('qp').kind === 'pick', '가정: "X를 하나씩 받았다" 거부');
  C.questPick('qp', 0);
  ok(C.curStep('qp').kind === 'tap', '가정 정답 → ③모순');
  C.tapP2(4);
  ok(C.curStep('qp').kind === 'tap', '모순: 어머니 4 거부(지금은 아버지 가정을 검사)');
  C.tapP2(3);
  ok(C.curStep('qp').kind === 'pick', '모순: 아버지 3 → ④결론');
  C.questPick('qp', 2);
  ok(C.curStep('qp').kind === 'pick', '결론: Ⅱ-5(삼촌) 거부');
  C.questPick('qp', 1);
  ok(C.curStep('qp').kind === 'pick', '결론: Ⅰ-1(정상 남자) 거부');
  C.questPick('qp', 0);
  ok(C.curStep('qp').kind === 'path', '결론 정답 → ⑤길 그리기');
  ok(C.pathMode === true, '경로 탭 모드 진입');
  ok(txt(C._store['fb_qp']).indexOf('2 → 4 → 9') < 0, '★정답 경로를 미리 인쇄하지 않는다');
  C.tapP2(9); ok(C.state.path.length===0, '경로: 9 먼저 -> 거부');
  C.tapP2(1); ok(C.state.path.length===0, '경로: 1 -> 거부');
  C.tapP2(2); ok(C.state.path.length===1, '경로: 2 인정');
  C.tapP2(5); ok(C.state.path.length===1, '경로: 5(삼촌) -> 거부');
  C.tapP2(4); C.tapP2(9);
  ok(C.state.pathDone, '경로 완료');
  ok(C.stepDone() === 2, '경로 완료 + 유전자형 완료 = 진행 2/4 (자료1 문항은 아직 안 풀었다)');
  ok(C._store['progress'].textContent.indexOf('진행 2 / 4') === 0, '진행 배지 반영 (실제: '+C._store['progress'].textContent+')');
}

// ══ 10. 답 유출 금지 ══
console.log('[10] 답 유출 금지');
{
  const D = makeSandbox(); D.init();
  // 관찰 인포바에는 사실만 — 유전자형·우열 판정은 한 글자도 없어야 한다
  const leakWords = ['RR','Rr','rr','UNK','우성','열성','보인자','X<sup>R</sup>','X′'];
  let leak = 0;
  [['stage1',D.P1],['stage2',D.P2],['stage3',D.P3],['stage4',D.P4]].forEach(([sid,P]) => {
    P.members.forEach(mm => {
      const s = JSON.stringify(D.describeMember(sid, mm.id));
      leakWords.forEach(w => { if (s.indexOf(w) >= 0) { leak++; console.error('    누출: '+sid+'-'+mm.id+' <- '+w); } });
    });
  });
  ok(leak === 0, 'describeMember 37명에 유전자형·우열 단어 0건');
  let leak2 = 0;
  D.P1.members.forEach(mm => { if (/우성|열성|보인자/.test(D.whoRelHTML('stage1', mm.id))) leak2++; });
  ok(leak2 === 0, '관계 표시(whoRelHTML)에도 판정 단어 없음');

  // 힌트가 같은 라운드 다른 사람의 정답을 말하지 않는다
  let hleak = 0;
  Object.keys(D.GENO_KEY).forEach(id => {
    const R = D.roundOf(+id); if (!R) return;
    const texts = [D.GENO_HINT[id]||'', D.GENO_HINT2[id]||''].join(' ');
    if (texts.indexOf(D.GENO_LABEL[D.GENO_KEY[id]]) >= 0) { hleak++; console.error('    힌트가 자기 정답을 말함: '+id); }
    R.ids.forEach(o => {
      if (o === +id) return;
      if (texts.indexOf(D.GENO_LABEL[D.GENO_KEY[o]]) >= 0) { hleak++; console.error('    힌트('+id+')가 같은 라운드 '+o+'의 정답을 말함'); }
    });
  });
  ok(hleak === 0, '유전자형 힌트가 같은 라운드의 정답을 흘리지 않는다');
  ok(D.ROUNDS[2].lead.indexOf('확정 불가') < 0, 'R3 도입문이 「확정 불가」를 미리 말하지 않는다');
  ok(!/한 명은|한 사람만|하나는 확정|못 한다/.test(D.ROUNDS[2].lead), 'R3 도입문이 「끝내 한 명은 안 된다」를 미리 말하지 않는다');
  ok(D.ROUNDS[2].ask.indexOf('확정 불가') < 0, 'R3 시트 안내도 「확정 불가」를 미리 말하지 않는다');

  // 관찰 단계 발문이 다음 단계의 판별 도구를 넘겨주지 않는다
  const obsQ2 = D.QDEF.q2.steps[0];
  ok(String(obsQ2.ok).indexOf('아버지') < 0, 'Q2 관찰 성공 문안이 「아버지」를 먼저 말하지 않는다');
  const obsQ1 = D.QDEF.q1.steps[0];
  ok(String(obsQ1.prompt).indexOf('부모') < 0, 'Q1 관찰 발문이 「부모」를 먼저 말하지 않는다');

  // ④ 성공 문안이 상염색체를 선취하지 않는다 (기존 파일 708행의 결함)
  ok(String(D.QDEF.q1.steps[3].ok).indexOf('하나씩') < 0, 'Q1 결론 문안이 「부모가 하나씩」으로 상염색체를 선취하지 않는다');

  // 자료1·도전에는 [자료 2] 전용 기호(X′, XᴿR)를 쓰지 않는다 (기존 파일 718·751행의 결함)
  let symLeak = 0;
  ['q1','q2','q3','q4'].forEach(qid => {
    const blob = JSON.stringify(D.QDEF[qid], (k,v) => typeof v === 'function' ? String(v) : v);
    if (blob.indexOf('X′') >= 0 || blob.indexOf('X<sup>R</sup>') >= 0) { symLeak++; console.error('    '+qid+'에 [자료2] 전용 기호'); }
  });
  ok(symLeak === 0, '자료1·도전 문안에 [자료 2] 전용 기호(X′·Xᴿ) 없음');
}

// ══ 11. 모범답안 잠금 ══
console.log('[11] 정리하기 모범답안 잠금');
{
  const E = makeSandbox(); E.init();
  ok(E.ansGate('ans1Btn').open === false, '문항1 미완료 → 모범답안 잠김');
  ok(E.ansGate('ans4Btn').open === false, '경로 미완료 → 모범답안 잠김');
  ok(E.renderAns3 && txt(E._store['ansTable3']).indexOf('🔒') >= 0, '정리3 표: 통과 전 칸이 잠겨 있다');
  ok(txt(E._store['ansTable3']).indexOf('X<sup>R</sup>Y') < 0, '정리3 표: 통과 전에는 정답이 안 보인다');

  E.Q1_OBS.forEach(id => E.tapP1(id)); E.questPick('q1',0); E.tapP1(6); E.answerQ1('rec');
  ok(E.ansGate('ans1Btn').open === false, '활동은 끝났어도 서술 전이면 잠김');
  E._store['ta1'].value = '정상인 부모 사이에서 미맹인 자녀가 나왔기 때문';
  E.onTa();
  ok(E.ansGate('ans1Btn').open === true, '서술 15자 이상 → 모범답안 열림');

  E.ROUNDS[0].ids.forEach(id => E.chooseGeno(id, E.GENO_KEY[id]));
  E.gradeP2();
  ok(txt(E._store['ansTable3']).indexOf('X<sup>R</sup>Y') >= 0, 'R1 통과 → 남자 칸만 열린다');
  ok(txt(E._store['ansTable3']).indexOf('🔒') >= 0, '  → R2·R3 칸은 아직 잠김');

  E.state.teacherUnlock = true; E.refreshAnsGates();
  ok(E.ansGate('ans4Btn').open === true && txt(E._store['ansTable3']).indexOf('🔒') < 0,
     '교사용 해제 → 전부 열림 (수업 정리용)');
}

// ══ 12. 저장 / 복원 ══
console.log('[12] 저장 · 복원');
{
  const G = makeSandbox(); G.init();
  G.Q1_OBS.forEach(id => G.tapP1(id)); G.questPick('q1',0); G.tapP1(6); G.answerQ1('rec');
  G.Q2_OBS.forEach(id => G.tapP1(id)); G.questPick('q2',0); G.tapP1(11); G.answerQ2('auto');
  Object.keys(G.GENO_KEY).forEach(id => G.chooseGeno(+id, G.GENO_KEY[id]));
  G.gradeP2(); G.gradeP2(); G.gradeP2();
  G.questPick('qp',0); G.tapP2(3); G.questPick('qp',0);
  G.tapP2(2); G.tapP2(4); G.tapP2(9);
  G._store['ta1'].value = '정상 부모에게서 미맹 자녀가 나왔다'; G.onTa();
  const blob = G.localStorage._mem['pedigree_sim_v1'];
  ok(!!blob, 'localStorage 저장 키 pedigree_sim_v1 유지');
  const saved = JSON.parse(blob);
  ok(saved.pathDone === true && saved.allCorrect === true, '완료 상태가 저장됨');

  const G2 = makeSandbox({ 'pedigree_sim_v1': blob });
  G2.init();
  ok(G2.state.q1ev && G2.state.q2ev && G2.state.allCorrect && G2.state.pathDone, '복원: 상태 유지');
  ok(G2._store['progress'].textContent === '진행 4 / 4', '복원: 진행 4/4');
  ok(disp(G2,'quiz_q2') === 'block' && disp(G2,'quizPath') === 'block', '복원: 문항 표시 유지');
  ok(G2.qDone('q1') && G2.qDone('q2') && G2.qDone('qp'), '복원: 4단계 진행도 유지');
  ok(G2._store['ta1'].value.length > 0 && G2.ansGate('ans1Btn').open === true, '복원: 서술과 잠금 해제 상태 유지');
  ok(G2.activeQuest('stage1') === null, '복원: 끝난 가계도에는 활성 문항 없음');

  // 라운드 개념이 없던 구버전 저장본도 안전하게 열린다
  const legacy = JSON.stringify({
    q1:'rec', q1ev:true, q2:'auto', q2ev:true,
    geno: Object.assign({}, S.GENO_KEY),
    graded:true, allCorrect:true, path:[2,4,9], pathDone:true, ta:{}
  });
  const G3 = makeSandbox({ 'pedigree_sim_v1': legacy });
  G3.init();
  ok(G3.state.round === 3 && G3.state.rDone.r1 && G3.state.rDone.r3, '구버전 저장본 → 라운드가 자동 재계산됨');
  ok(G3._store['progress'].textContent === '진행 4 / 4', '구버전 저장본도 진행 4/4로 복원');
  ok(G3.state.qs && typeof G3.state.qs === 'object', '구버전에 없던 필드가 안전하게 채워짐');

  // R2까지만 통과한 저장본
  const half = Object.assign({}, S.GENO_KEY); delete half[2]; delete half[4]; delete half[6];
  const G4 = makeSandbox({ 'pedigree_sim_v1': JSON.stringify({ geno:half, graded:true }) });
  G4.init();
  ok(G4.state.round === 2 && !G4.state.allCorrect, 'R2까지 통과한 저장본 → round=2로 복원');
  ok(disp(G4,'quizPath') !== 'block', '  → 2·4가 미확정이라 경로 문항은 아직 잠김');
}

// ══ 13. 말투 점검 — 학생이 읽는 문구는 시험지 문체를 유지한다 ══
console.log('[13] 말투 점검 (친근체 · 추임새 금지)');
{
  const BANNED = ['해 보자','보자.','보자!','하자.','하자!','가자.','가자!','좋아','맞아.','맞아!',
                  '했어','됐어','왔어','찾았어','거야','이야.','이야!','일까','할까','올까','줄까',
                  '나와.','너의','네가','우리가'];
  // ★검사 대상은 「말투」뿐이다 — 이모지는 금지 대상이 아니다.
  //   (2026-08-18 교사 정정: "추임새 이모지는 넣어도 돼. 말투의 문제야")
  const D = makeSandbox();

  // (1) 문항·라운드·힌트 문안 전수
  const blob = JSON.stringify({ QDEF: D.QDEF, ROUNDS: D.ROUNDS, H1: D.GENO_HINT, H2: D.GENO_HINT2, L: D.STEP_LABEL },
                              (k, v) => (typeof v === 'function' ? String(v) : v));
  let hits = [];
  BANNED.forEach(w => { if (blob.indexOf(w) >= 0) hits.push(w); });
  ok(hits.length === 0, '문항·라운드·힌트 문안에 친근체/추임새 0건 (검출: ' + hits.join(' ') + ')');

  // (2) 화면에 그대로 찍히는 정적 마크업 (<body> ~ <script> 사이)
  const body = src.slice(src.indexOf('<body>'), src.indexOf('<script>'));
  let hits2 = [];
  BANNED.forEach(w => { if (body.indexOf(w) >= 0) hits2.push(w); });
  ok(hits2.length === 0, '본문 마크업에 친근체/추임새 0건 (검출: ' + hits2.join(' ') + ')');

  // (3) 런타임 문구 — 주석을 걷어낸 스크립트 전체
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '')
                 .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  let hits3 = [];
  BANNED.forEach(w => { if (code.indexOf(w) >= 0) hits3.push(w); });
  ok(hits3.length === 0, '런타임 문구에 친근체/추임새 0건 (검출: ' + hits3.join(' ') + ')');

  // (4) 지시문은 '~하시오', 설명은 '-이다'로 끝난다 (표본 점검)
  const tapPrompts = [];
  ['q1','q2','q3','q4','qp','q5','q6','q7'].forEach(q => D.QDEF[q].steps.forEach(st => {
    if (st.kind === 'tap') { tapPrompts.push(st.prompt); if (st.banner) tapPrompts.push(st.banner); }
  }));
  ok(tapPrompts.length > 0 && tapPrompts.every(t => /하시오/.test(t)),
     '탭 지시문 ' + tapPrompts.length + '건이 모두 「~하시오」 형태의 지시를 담는다');
  ok(tapPrompts.every(t => /(시오\s*(\([^)]*\))?[.!]?|다\.)$/.test(t.trim())),
     '  → 문장 끝이 「~하시오」 또는 「~이다.」이다 (권유형 없음)');
  const picks = [];
  ['q1','q2','q3','q4','qp','q5','q6','q7'].forEach(q => D.QDEF[q].steps.forEach(st => {
    if (st.kind === 'pick') picks.push(st.prompt);
  }));
  ok(picks.every(t => /[?？]$/.test(t.trim())), '선택형 발문 ' + picks.length + '건이 모두 물음표로 끝난다');
}

// ══ 14. ⑤ 연습 — 혈액형(복대립·상염색체) + 적록색맹(X염색체 열성) ══
console.log('[14] ⑤ 연습 (혈액형 + 적록색맹)');
{
  const S4 = makeSandbox(); S4.init();
  const P = S4.P4, ids = P.members.map(m => m.id);
  const mb = id => S4.memberById(P, id);

  // ── 구조 무결성 (P1~P3와 같은 기준) ──
  ok(P.members.length === 7, 'P4 7명');
  ok(new Set(ids).size === ids.length, 'P4 id 중복 없음');
  ok(P.members.every(m => ['A','B','AB','O'].includes(m.bt)), 'P4 전원에게 혈액형 표기가 있다');
  const aff4 = P.members.filter(m => m.aff).map(m => m.id).join(',');
  ok(aff4 === '3,5,7', '적록색맹 = 3,5,7 (실제: ' + aff4 + ')');
  ok(P.members.filter(m => m.aff).every(m => m.sex === 'M'), '색맹인 사람은 모두 남자 — 여자는 근거로 추론해야 한다');
  const has = id => ids.includes(id);
  P.couples.forEach(cp => ok(has(cp[0]) && has(cp[1]), 'P4 couple 참조 ' + cp));
  P.sibs.forEach(sb => {
    ok(has(sb.p[0]) && has(sb.p[1]), 'P4 sib 부모 참조');
    sb.c.forEach(c => ok(has(c), 'P4 sib 자녀 참조 ' + c));
    const py = mb(sb.p[0]).y;
    sb.c.forEach(c => ok(mb(c).y > py, 'P4 자녀가 부모 아래 세대'));
    ok(P.couples.some(cp => (cp[0]===sb.p[0]&&cp[1]===sb.p[1])||(cp[0]===sb.p[1]&&cp[1]===sb.p[0])),
       'P4 sib 부모가 couple에 존재');
  });

  const parentOf = {}; P.sibs.forEach(sb => sb.c.forEach(c => { parentOf[c] = sb.p.slice(); }));
  const dadOf = id => (parentOf[id] || []).find(x => mb(x).sex === 'M');
  const momOf = id => (parentOf[id] || []).find(x => mb(x).sex === 'F');

  // ── 혈액형 정답표: 표현형 + 전달 규칙만으로 전수 탐색해 「유일해」인지 확인 ──
  const BT_G  = ['AA','Ai','BB','Bi','AB','ii'];
  const BT_PH = { AA:'A', Ai:'A', BB:'B', Bi:'B', AB:'AB', ii:'O' };
  const BT_AL = { AA:['A','A'], Ai:['A','i'], BB:['B','B'], Bi:['B','i'], AB:['A','B'], ii:['i','i'] };
  const btPass = (kid, dad, mom) => {
    const k = BT_AL[kid], pa = BT_AL[dad], ma = BT_AL[mom];
    return (pa.includes(k[0]) && ma.includes(k[1])) || (pa.includes(k[1]) && ma.includes(k[0]));
  };
  const btSolutions = [];
  (function search(i, cur){
    if (btSolutions.length > 1) return;
    if (i === ids.length) {
      for (const id of ids) if (parentOf[id] && !btPass(cur[id], cur[dadOf(id)], cur[momOf(id)])) return;
      btSolutions.push(Object.assign({}, cur));
      return;
    }
    const id = ids[i];
    BT_G.forEach(g => { if (BT_PH[g] === mb(id).bt) { cur[id] = g; search(i+1, cur); } });
  })(0, {});
  ok(btSolutions.length === 1, '혈액형 유전자형이 가계도만으로 유일하게 결정된다 (해 ' + btSolutions.length + '개)');
  ok(btSolutions.length === 1 && ids.every(id => btSolutions[0][id] === S4.P4_BT_KEY[id]),
     '  → 전수 탐색으로 구한 해가 P4_BT_KEY와 일치');
  ok(ids.every(id => BT_PH[S4.P4_BT_KEY[id]] === mb(id).bt), '정답표의 표현형이 가계도 표기와 일치');

  // ── 색맹 정답표: 같은 방식으로 독립 재유도 ──
  const CB_G   = { M:['RY','rY'], F:['RR','Rr','rr'] };
  const CB_AFF = { RY:false, rY:true, RR:false, Rr:false, rr:true };
  const cbPass = (id, cur) => {
    const k = cur[id], momSet = new Set(cur[momOf(id)].split(''));
    if (mb(id).sex === 'M') return momSet.has(k[0]);        // 아들: X는 어머니에게서, Y는 아버지에게서
    const dadX = cur[dadOf(id)][0];                         // 딸: 아버지의 X를 반드시 하나 받는다
    return (k[0] === dadX && momSet.has(k[1])) || (k[1] === dadX && momSet.has(k[0]));
  };
  const cbSolutions = [];
  (function search(i, cur){
    if (cbSolutions.length > 1) return;
    if (i === ids.length) {
      for (const id of ids) if (parentOf[id] && !cbPass(id, cur)) return;
      cbSolutions.push(Object.assign({}, cur));
      return;
    }
    const id = ids[i];
    CB_G[mb(id).sex].forEach(g => { if (CB_AFF[g] === mb(id).aff) { cur[id] = g; search(i+1, cur); } });
  })(0, {});
  ok(cbSolutions.length === 1, '색맹 유전자형이 가계도만으로 유일하게 결정된다 (해 ' + cbSolutions.length + '개)');
  ok(cbSolutions.length === 1 && ids.every(id => cbSolutions[0][id] === S4.P4_CB_KEY[id]),
     '  → 전수 탐색으로 구한 해가 P4_CB_KEY와 일치');
  ok(ids.every(id => S4.P4_CB_KEY[id] !== 'UNK'), '연습 가계도에는 「확정 불가」인 사람이 없다 (③과 대비되는 지점)');

  // ── 확률 정답을 열거로 재계산해 선택지와 대조 (Ⅱ-4 × Ⅱ-5) ──
  const mBT = S4.P4_BT_KEY[4], fBT = S4.P4_BT_KEY[5];
  const mCB = S4.P4_CB_KEY[4], fCB = S4.P4_CB_KEY[5];
  let nA = 0, nBlindSon = 0, nBoth = 0, tot = 0;
  BT_AL[mBT].forEach(ma => BT_AL[fBT].forEach(pa => {
    mCB.split('').forEach(mx => fCB.split('').forEach(fc => {
      tot++;
      const kidBT = BT_PH[[ma, pa].sort().join('')];
      const son   = (fc === 'Y');
      const blind = son ? (mx === 'r') : (mx === 'r' && fc === 'r');
      if (kidBT === 'A') nA++;
      if (son && blind) nBlindSon++;
      if (kidBT === 'A' && son && blind) nBoth++;
    }));
  }));
  ok(nA / tot === 0.5,         '자녀가 A형일 확률 = 1/2 (열거 ' + nA + '/' + tot + ')');
  ok(nBlindSon / tot === 0.25, '자녀가 적록색맹인 남자일 확률 = 1/4 (열거 ' + nBlindSon + '/' + tot + ')');
  ok(nBoth / tot === 0.125,    'A형이면서 적록색맹인 남자일 확률 = 1/8 (열거 ' + nBoth + '/' + tot + ')');
  const okChoice = (qid, si) => S4.QDEF[qid].steps[si].choices.filter(c => c.ok)[0].t;
  ok(okChoice('q7',1) === '1/2' && okChoice('q7',2) === '1/4' && okChoice('q7',3) === '1/8',
     '  → q7 정답 선택지가 1/2 · 1/4 · 1/8로 열거값과 일치');

  // ── 문항 구성 위생 ──
  ['q5','q6','q7'].forEach(qid => {
    const d = S4.QDEF[qid];
    ok((d.labels || []).length === d.steps.length, qid + ' 단계 라벨 수 = 단계 수');
    ok(d.stage === 'stage4', qid + '은 stage4 문항');
    d.steps.forEach((st, i) => {
      if (st.kind === 'pick') {
        ok(st.choices.filter(c => c.ok).length === 1, qid + ' ' + i + '단계 정답 1개');
        ok(st.choices.every(c => c.ok || c.fb), qid + ' ' + i + '단계 오답에 모두 피드백');
      }
      if (st.kind === 'tap') ok(st.ids && st.ids.length > 0, qid + ' ' + i + '단계 탭 대상 존재');
    });
  });
  ok(S4.QORDER.stage4.join(',') === 'q5,q6,q7', 'stage4 문항 순서 q5→q6→q7');

  // ── 답 유출 금지: 연습 인포바에도 유전자형이 없다 ──
  let leak4 = 0;
  ['RR','Rr','rr','I<sup>A</sup>','우성','열성','보인자','X′'].forEach(w => {
    P.members.forEach(mm => { if (JSON.stringify(S4.describeMember('stage4', mm.id)).indexOf(w) >= 0) leak4++; });
  });
  ok(leak4 === 0, 'describeMember(stage4)에 유전자형·판정 단어 0건 (혈액형 표현형만 노출)');

  // ── 문항 흐름 ──
  const F4 = makeSandbox(); F4.init();
  ok(F4.activeQuest('stage4') === 'q5', 'stage4의 첫 문항은 q5');
  ok(disp(F4,'quiz_q6') !== 'block', 'q6은 처음에 닫혀 있다 (마크업의 display:none 유지)');
  F4.Q5_OBS.forEach(id => F4.tapP4(id));
  ok(F4.curStep('q5').kind === 'pick', '색맹 3명 관찰 완료 → 근거 확인 단계');
  F4.questPick('q5', 1);
  ok(F4.curStep('q5').kind === 'pick', '오답을 고르면 단계가 넘어가지 않는다');
  F4.questPick('q5', 0);
  F4.tapP4(6);
  ok(F4.qstate('q5').s === 2, '6(자녀 없음)은 이 단계의 답이 아니다 — 단계 유지');
  F4.tapP4(4);
  ok(F4.qstate('q5').s === 3, '아들 7을 근거로 4를 확정 → 마지막 단계로 이동');
  F4.tapP4(4);
  ok(F4.qstate('q5').s === 3, '마지막 단계에서 4는 근거가 아니다 (근거는 아버지 5)');
  F4.tapP4(5);
  ok(F4.qDone('q5'), 'q5 완료');
  ok(disp(F4,'quiz_q6') === 'block', '  → q6 열림');
  ok(F4.ansGate('ansPBtn').open === false, '연습 미완료 → 정리표 잠김');
  ok(txt(F4._store['ansTableP']).indexOf('🔒') >= 0, '  → 잠금 문구만 보인다');
  F4.tapP4(4);
  ok(!F4.qDone('q6') && F4.qstate('q6').s === 0, 'q6 첫 단계에서 4(AB형)는 결정적 단서가 아니다');
  F4.tapP4(3);
  F4.questPick('q6', 0); F4.questPick('q6', 0); F4.questPick('q6', 0);
  ok(F4.qDone('q6'), 'q6 완료');
  ok(disp(F4,'quiz_q7') === 'block', '  → q7 열림');
  ok(F4.curStep('q7').kind === 'pick', 'q7의 read 단계는 자동 통과');
  F4.questPick('q7', 1); F4.questPick('q7', 1); F4.questPick('q7', 1);
  ok(F4.qDone('q7') && F4.practiceDone(), 'q7 완료 → 연습 완료');
  ok(F4._store['practiceBadge'].style.display === 'inline-block', '연습 완료 배지 표시');
  ok(F4.ansGate('ansPBtn').open === true, '연습 완료 → 정리표 열림');
  const tp = txt(F4._store['ansTableP']);
  ok(tp.indexOf('I<sup>A</sup>i') >= 0 && tp.indexOf('X<sup>R</sup>X′') >= 0, '정리표에 두 형질의 유전자형이 모두 나온다');

  // ── 저장·복원 ──
  const blob4 = F4.localStorage._mem['pedigree_sim_v1'];
  const R4 = makeSandbox({ 'pedigree_sim_v1': blob4 });
  R4.init();
  ok(R4.qDone('q5') && R4.qDone('q6') && R4.qDone('q7'), '새로고침 후 연습 3문항 진행 복원');
  ok(disp(R4,'quiz_q7') === 'block', '  → q7 카드도 열린 채로 복원');
  ok(R4.activeQuest('stage4') === null, '  → 끝난 가계도에는 활성 문항 없음');
}

console.log('');
console.log('결과: ' + pass + ' 통과, ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
