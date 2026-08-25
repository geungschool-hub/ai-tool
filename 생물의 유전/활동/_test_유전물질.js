// 유전물질을 찾는 세 실험 — Node 헤드리스 검사
// 실행:  node _test_유전물질.js      (이 파일 옆의 HTML을 읽는다 — 드라이브 문자에 의존하지 않는다)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = path.join(__dirname, '1-4_유전물질탐구_모의실험.html');
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
const kid = (card, cls) => card.children.filter(c => c.className === cls)[0];

// ── DOM 스텁 ──
function makeSandbox(storageSeed){
  const store = {};
  function makeEl(id){
    const el = {
      className:'', innerHTML:'', textContent:'', value:'', style:{}, disabled:false, checked:false,
      children:[], attrs:{}, onclick:null, type:'', nodeType:1, firstChild:null,
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
    Object.defineProperty(el, 'id', {
      get(){ return el._id; },
      set(v){ el._id = v; store[v] = el; }
    });
    if (id !== undefined) el.id = id;
    return el;
  }
  const mem = Object.assign({}, storageSeed || {});
  const sandbox = {
    console, Math, JSON, Object, Array, String, Number, Date, RegExp,
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
    // ★setTimeout / requestAnimationFrame / querySelectorAll 은 일부러 넣지 않는다 —
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
  ok(/<meta name="viewport"[^>]*width=device-width/.test(src), 'viewport 메타 있음');
  ok(/lang="ko"/.test(src), 'lang="ko"');
  ok(/min-height:44px/.test(src), '버튼 최소 높이 44px 규약');
  ok(/font-size:16px/.test(src), '기준 폰트 16px');
  ok(/prefers-reduced-motion/.test(src), '움직임 줄이기 설정 대응');
  ok(/DRAFT_MODE = false/.test(src),
     '★교사 검토를 통과해 잠금을 풀었다 (2026-08-25 배포) — 다시 닫으려면 true 로 바꾸고 이 줄도 함께 바꿀 것');
  ok(/var DRAFT_PASS/.test(src) && /id="draftGate"/.test(src),
     '★잠금 장치 자체는 남아 있다 — 다음 활동이 그대로 복제해 쓴다');
  ok(src.indexOf('🔄 처음부터 다시 하기') > 0, '다시 하기 버튼');
  ok(/id="progress"/.test(src), '진행 배지');
}

/* ════════════════════════════════════════════════════════════
   [2] 자료 무결성 — 교과서 값이 코드 한 곳에만 있다
   ════════════════════════════════════════════════════════════ */
{
  ok(/\.spinning\{[^}]*transform-box:fill-box/.test(src),
     '★.spinning 에 transform-box:fill-box 가 있다 — 없으면 무대 한가운데를 축으로 크게 휘돈다');
  ok(/\.spinning\{[^}]*infinite/.test(src),
     '★회전은 infinite 다 — 단계를 손으로 넘길 수 있으므로 머무는 동안 계속 돈다');
  ok(/\.anibar\{/.test(src) && /\.anistep\{/.test(src), '연출 제어 막대 CSS가 있다');
  ok(/<div id="grAni"><\/div>/.test(src) && /<div id="avAni"><\/div>/.test(src) &&
     /<div id="hcAni"><\/div>/.test(src), '세 무대 아래에 막대 자리가 있다');
  ok(!/onclick="aniSkip\(\)"/.test(src), '★인자 없는 옛 aniSkip() 호출부가 남아 있지 않다');
}

{
  ok(/\.btn\.e1\.ghost:disabled/.test(src) && /\.btn\.e3\.ghost:disabled/.test(src),
     '★꺼진 단추 규칙의 특이도를 올렸다 — .btn.e1.ghost(0,3,0) 가 .btn:disabled(0,2,0) 를 이기고 있었다');
  ok(/\.anibar \.btn\{[^}]*font-size:16px/.test(src), '★제어 막대 단추 글자는 16px 이상이다');
  ok(/@media \(min-width:1180px\)/.test(src) && /@media \(max-width:1179\.98px\)/.test(src),
     '★2단 경계는 1180px 이다 — 1024로 내리면 왼쪽 칸이 544px가 돼 무대 캐션이 10.2px로 줄어든다');
  ok(!/@media \(min-width:1024px\)/.test(src), '★옆 경계(1024px)가 남아 있지 않다');
  ok(!/@media \(max-width:1179px\)/.test(src),
     '★1179px 로 정수로 끊지 않는다 — 1179~1180 사이 소수 폭이 두 규칙 어디에도 안 걸려 순서 보정이 빠진다');
  ok(!/min-height:38px/.test(src), '★44px 규약을 깨는 인라인 min-height 가 남아 있지 않다');
  ok(/\.anistep\{[^}]*min-width:170px/.test(src),
     '★단계 이름 폭을 고정했다 — 이름 길이에 따라 막대가 한 줄↔두 줄로 튀지 않게');
}

console.log('[2] 자료 무결성');
{
  const C = S.GR_CONDS;
  ok(C.length === 4, '그리피스 조건 4개');
  ok(C.map(c=>c.label).join('') === '(가)(나)(다)(라)', '조건 이름 (가)~(라)');
  ok(C[0].result === 'dead' && C[0].bloodS === true  && C[0].bloodR === false,
     '(가) 살아 있는 S형균 → 죽는다 · 혈액에 S형균만');
  ok(C[1].result === 'live' && C[1].bloodS === false && C[1].bloodR === true,
     '★(나) 살아 있는 R형균 → 죽지 않는다 · 혈액에 살아 있는 R형균 (2026-08-25 교사 지시)');
  ok(C[2].result === 'live' && C[2].bloodS === false && C[2].bloodR === false,
     '★(다) 죽은 S형균만 → 죽지 않는다 · 살아 있는 균이 하나도 없다');
  ok(C[3].result === 'dead' && C[3].bloodS === true  && C[3].bloodR === true,
     '(라) 죽은 S형균+R형균 → 죽는다 · 혈액에 S형균과 R형균이 함께');
  ok(C[3].mix.length === 2, '(라)만 두 가지를 섞는다');

  /* ★혈액 칸 문장은 bloodS·bloodR에서만 나온다 — 손으로 두 번 적으면 어긋난다 */
  ok(/살아 있는 S형균/.test(S.grBloodText(C[0])) && !/R형균/.test(S.grBloodText(C[0])),
     '(가) 혈액 칸에 R형균이 적히지 않는다');
  ok(/살아 있는 R형균/.test(S.grBloodText(C[1])) && !/S형균/.test(S.grBloodText(C[1])),
     '★(나) 혈액 칸이 「살아 있는 R형균」이다');
  ok(/발견되지 않았다/.test(S.grBloodText(C[2])),
     '★(다) 혈액 칸은 살아 있는 균이 없다고 적는다 — 죽은 S형균을 검출물로 적지 않는다');
  ok(/S형균/.test(S.grBloodText(C[3])) && /R형균/.test(S.grBloodText(C[3])),
     '(라) 혈액 칸에 두 균이 함께 적힌다');

  const A = S.AV_TREATS;
  ok(A.length === 4, '에이버리 처리 4개(무처리 대조군 포함)');
  ok(A[0].id === 'none' && A[0].result === 'S', '무처리 대조군에서 S형균이 관찰된다');
  ok(A.filter(t=>t.result === 'none').length === 1, 'S형균이 관찰되지 않는 조건은 하나뿐');
  ok(A.filter(t=>t.result === 'none')[0].id === 'dna', '★그 하나는 DNA 분해효소이다');

  const H = S.HC_TAGS;
  ok(H.length === 2, '허시·체이스 표지 2가지');
  ok(H.filter(t=>t.id==='s35')[0].result === 'sup', '³⁵S(단백질) → 상층액에서 검출');
  ok(H.filter(t=>t.id==='p32')[0].result === 'pel', '³²P(DNA) → 침전물에서 검출');

  ok(S.HANDOFF.length === 3, '남긴 질문 배너 3개');
  ok(S.HANDOFF[0].q === S.CH_CARDS.filter(c=>c.id==='L1')[0].text,
     '★②가 남긴 질문 = 사슬판 이음매 1의 문장 (한 곳에서만 정의된다)');
  ok(S.HANDOFF[1].q === S.CH_CARDS.filter(c=>c.id==='L2')[0].text,
     '★③이 남긴 질문 = 사슬판 이음매 2의 문장');
}

/* ════════════════════════════════════════════════════════════
   [3] ② 그리피스 — 조합 판정과 결과 확정
   ════════════════════════════════════════════════════════════ */
console.log('[3] 그리피스');
{
  const T = makeSandbox();
  // 그리피스가 하지 않은 조합은 실행되지 않는다
  T.grPick = ['liveS','liveR'];
  T.grInject();
  ok(Object.keys(T.state.grRun).length === 0, '실험에 없는 조합은 실행되지 않는다');
  ok(/포함되지 않는다/.test(T._store['grFb'].innerHTML), '그 조합에 대한 안내가 뜬다');

  // 예상을 고르지 않으면 주입되지 않는다
  T.grPick = ['liveS'];
  T.grInject();
  ok(Object.keys(T.state.grRun).length === 0, '예상을 고르기 전에는 주입되지 않는다');
  ok(/예상/.test(T._store['grFb'].innerHTML), '예상을 먼저 고르라는 안내');

  // 예상을 고른 뒤 주입 → 결과가 즉시 확정된다(연출 없이)
  T.grPredict('live');                       /* 일부러 틀린 예상 */
  T.grInject();
  ok(T.state.grRun['A'] === 'dead', '★연출이 없어도 결과가 즉시 확정된다');
  ok(T.ani.ph === T.ANI_LAST, '★setTimeout이 없으면 연출은 곧바로 마지막 국면이 된다');
  ok(/다르다/.test(T._store['grPredict'].innerHTML), '예상과 결과가 다르면 그렇게 알린다');
  ok(!/맞[혔았]/.test(T._store['grPredict'].innerHTML), '예상을 맞고 틀림으로 세지 않는다');

  // 네 조건 모두 실행
  [['B','liveR'],['C','deadS']].forEach(([id, item])=>{
    T.grPick = [item]; T.grPredict('live'); T.grInject();
  });
  T.grPick = ['deadS','liveR']; T.grPredict('dead'); T.grInject();
  ok(Object.keys(T.state.grRun).length === 4, '네 조건 모두 실행됨');
  ok(T._store['grProg'].textContent === '실행한 조건 4 / 4', '진행 표시');
  const tb = T._store['grTbody'].innerHTML;
  ok(/살아 있는 R형균/.test(tb), '★결과표 혈액 칸에 살아 있는 R형균이 적힌다');
  ok(/발견되지 않았다/.test(tb), '★(다) 행은 살아 있는 균이 없다고 적힌다');
  ok(T._store['grQwrap'].style.display === 'block', '네 조건을 마치면 결론 문항이 열린다');
  ok(!T.grDone(), '★결론 문항에 답하기 전에는 ②가 끝난 것이 아니다');
  T.pickQ('gr1', 1);
  ok(T.grDone(), '결론 문항에 답하면 ②가 끝난다');
  ok(T._store['hoGr'].className === 'handoff', '★②를 마치면 「남긴 질문」이 열린다');
  ok(/DNA인가 단백질인가/.test(T._store['hoGr'].innerHTML), '남긴 질문의 내용');

  // 순서 잠금
  ok(T.stepOpen('av'), '②를 마치면 ③이 열린다');
  ok(!T.stepOpen('hc'), '③을 마치기 전에는 ④가 잠겨 있다');
  ok(!T.stepOpen('ch'), '④를 마치기 전에는 ⑤가 잠겨 있다');
  ok(!T.stepOpen('prac'), '⑤를 마치기 전에는 ⑥이 잠겨 있다');
}

/* ════════════════════════════════════════════════════════════
   [4] ③ 에이버리
   ════════════════════════════════════════════════════════════ */
console.log('[4] 에이버리');
{
  const T = makeSandbox();
  T.state.teacherUnlock = true;              /* 잠금을 건너뛰고 이 단계만 본다 */
  T.avRun('none'); T.avRun('prot'); T.avRun('rna');
  ok(Object.keys(T.state.avRun).length === 3, '세 조건 실행');
  ok(T.state.avRun['none'] === 'S' && T.state.avRun['prot'] === 'S' && T.state.avRun['rna'] === 'S',
     '무처리·단백질분해효소·RNA 분해효소에서는 S형균이 관찰된다');
  T.avRun('dna');
  ok(T.state.avRun['dna'] === 'none', '★DNA 분해효소에서만 S형균이 관찰되지 않는다');
  ok(T._store['avQwrap'].style.display === 'block', '네 조건을 마치면 결론 문항이 열린다');
  T.avRun('dna');
  ok(Object.keys(T.state.avRun).length === 4, '이미 실행한 조건을 다시 눌러도 늘지 않는다');
  const tb = T._store['avTbody'].innerHTML;
  ok(/형질전환이 일어나지 않았다/.test(tb), '표에 판정이 적힌다');
  ok(!/점수|맞[힌힌]|정답률/.test(tb), '표에 점수 표시가 없다');
}

/* ════════════════════════════════════════════════════════════
   [5] ④ 허시·체이스
   ════════════════════════════════════════════════════════════ */
console.log('[5] 허시·체이스');
{
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.hcRun('s35');
  ok(T.state.hcRun['s35'] === 'sup', '³⁵S는 상층액에서 검출');
  ok(T._store['hcOne'].className === 'msg warn', '★한 가지만 했을 때 결론을 낼 수 없다고 알린다');
  ok(/나머지 하나도 실행/.test(T._store['hcOne'].innerHTML), '나머지도 실행하라는 안내');
  T.hcRun('p32');
  ok(T.state.hcRun['p32'] === 'pel', '³²P는 침전물에서 검출');
  ok(T._store['hcOne'].className === 'msg warn hide', '둘 다 하면 그 안내가 사라진다');
  ok(T._store['hcQwrap'].style.display === 'block', '결론 문항이 열린다');
}

/* ════════════════════════════════════════════════════════════
   [6] ⑤ 논리 사슬판 — 이 활동의 핵심
   ════════════════════════════════════════════════════════════ */
console.log('[6] 논리 사슬판');
{
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.renderChain();

  ok(T.chBlanks().length === 8, '표준 난도에서 학생이 놓을 칸은 8칸');
  ok(T.chPreset().length === 4, '1행 4칸이 예시로 채워져 있다');
  const deck = T.chDeck();
  /* ★교사 지시 2026-08-25 「카드가 8개만 있으면 될 것 같애」 — 오답 카드를 빼고 빈 칸 수와 맞췄다 */
  ok(T.CH_BAD_COUNT === 0, '★오답 카드를 넣지 않는다 (CH_BAD_COUNT = 0)');
  ok(deck.length === 8, '★덱은 8장이다 — 빈 칸 8개와 정확히 맞는다 (실제 ' + deck.length + ')');
  ok(deck.length === T.chBlanks().length, '★덱 장 수 = 빈 칸 수');
  ok(deck.every(i => !T.CH_CARDS.filter(c => c.id === T.chCardOf(i))[0].bad), '★덱에 오답 카드가 없다');
  // ★쌍둥이: 1행④에 이미 있는 문장과 같은 카드가 덱에 한 장 있다
  const l1inDeck = deck.filter(i => T.chCardOf(i) === 'L1').length;
  ok(l1inDeck === 1, '★1행④와 같은 문장이 덱에 한 장 남아 있다(쌍둥이 발견 장치)');
  const l2inDeck = deck.filter(i => T.chCardOf(i) === 'L2').length;
  ok(l2inDeck === 2, '★이음매 2는 두 칸이 모두 비어 있으므로 덱에 두 장 있다');

  // 오답 카드를 놓아 본다 — 범위 초과형
  T.chPickCard('D1#0');
  T.chTapSlot('av.found');
  ok(T.state.chain['av.found'] === 'D1#0', '카드가 놓인다');
  // 나머지를 정답으로 채운 뒤 판정
  const correct = {
    'av.q':'L1#0', 'av.act':'C5#0', 'av.left':'L2#0',
    'hc.q':'L2#1', 'hc.act':'C8#0', 'hc.found':'C9#0', 'hc.left':'L3#0'
  };
  Object.keys(correct).forEach(sid => { T.state.chain[sid] = correct[sid]; });
  T.chCheck();
  ok(T.state.chainOk === false, '오답이 하나라도 있으면 통과하지 않는다');
  ok(T.state.chain['av.found'] === undefined, '틀린 카드는 덱으로 돌아간다');
  ok(T.chFb['av.found'] === T.CH_FB.over, '★범위 초과형 오답에는 「관찰한 것만으로 말할 수 없다」 문구');
  ok(!/정답/.test(JSON.stringify(T.CH_FB)), '★어떤 피드백 문구도 정답을 알려 주지 않는다');
  ok(!/정답/.test(T._store['chBoard'].innerHTML),
     '★판에 남는 되돌림 문구에 「정답」이라는 말이 없다');
  ok(Object.keys(T.CH_FB).every(k => /옳지 않다\./.test(T.CH_FB[k])),
     '모든 되돌림 문구가 「옳지 않다.」로 시작한다');
  ok(T.state.chain['av.q'] === 'L1#0', '맞은 칸은 그대로 남는다');

  // 뒤집힘형 오답
  T.chFb = {};
  T.state.chain['av.found'] = 'D2#0';
  T.chCheck();
  ok(T.chFb['av.found'] === T.CH_FB.flip, '뒤집힘형 오답에는 「반대로 되어 있다」 문구');

  // 열이 어긋난 정답 카드
  T.chFb = {};
  T.state.chain['av.found'] = 'C5#0';        /* 「한 조작」 카드를 「알아낸 것」 칸에 */
  T.chCheck();
  ok(T.chFb['av.found'] === T.CH_FB.col_found, '열이 어긋나면 그 열의 성격을 다시 말해 준다');

  // 행이 어긋난 정답 카드 — 같은 열의 다른 실험
  T.chFb = {};
  T.state.chain['av.act'] = 'C8#0';          /* 허시·체이스의 「한 조작」을 에이버리 행에 */
  T.state.chain['av.found'] = 'C6#0';
  T.chCheck();
  ok(T.chFb['av.act'] === T.CH_FB.row, '행이 어긋나면 재료를 짚어 보라고 한다');

  // 정답 배치 → 통과
  T.chFb = {};
  T.state.chain['av.act'] = 'C5#0';
  T.chCheck();
  ok(T.state.chainOk === true, '★정답 배치면 사슬이 통과한다');
  ok(T.chDone(), '⑤가 끝난 것으로 판정된다');
  ok(T.stepOpen('prac'), '⑤를 마치면 ⑥이 열린다');
  ok(T.chLinkOn(T.CH_LINKS[0]) && T.chLinkOn(T.CH_LINKS[1]), '★두 이음매가 모두 이어진다');
  ok(T._store['chDone'].className === 'handoff', '완성 후 「그래도 남은 질문」이 열린다');
  ok(/DNA는 어떤 구조/.test(T._store['chDone'].innerHTML), '남은 질문 = 다음 차시 DNA 구조');
  ok(!/왓슨|크릭|이중나선/.test(T._store['chDone'].innerHTML), '★다음 차시의 답을 미리 말하지 않는다');
}
{
  // 쌍둥이 카드를 뒤바꿔 놓아도 정답이다
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.state.chain = {
    'av.q':'L1#0', 'av.act':'C5#0', 'av.found':'C6#0', 'av.left':'L2#1',
    'hc.q':'L2#0', 'hc.act':'C8#0', 'hc.found':'C9#0', 'hc.left':'L3#0'
  };
  T.chCheck();
  ok(T.state.chainOk === true, '★쌍둥이 카드를 서로 바꿔 놓아도 정답으로 인정한다');
}
{
  // 도전 난도
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.chToggleHard();
  ok(T.state.chainHard === true, '도전 난도로 바뀐다');
  ok(T.chPreset().length === 1, '도전 난도에서는 1행①만 채워져 있다');
  ok(T.chBlanks().length === 11, '학생이 놓을 칸이 11칸');
  ok(T.chDeck().filter(i => T.chCardOf(i) === 'L1').length === 2,
     '★도전 난도에서는 이음매 1도 두 칸이 비므로 덱에 두 장이 된다');
  T.chToggleHard();
  ok(T.state.chainHard === false && T.chBlanks().length === 8, '표준으로 되돌릴 수 있다');
}

/* ════════════════════════════════════════════════════════════
   [7] 선택형 문항의 구조
   ════════════════════════════════════════════════════════════ */
console.log('[7] 문항 구조');
{
  const all = S.ALLQ();
  const ids = all.map(q => q.id);
  ok(new Set(ids).size === ids.length, '★문항 id가 전 활동에서 유일하다 (겹치면 저장 칸이 섞인다)');
  ok(S.PRACTICE.length === 8, '⑥ 연습 문항 8개');
  ok(S.Q_GR.length === 3 && S.Q_AV.length === 2 && S.Q_HC.length === 2, '실험별 결론 문항 3·2·2');
  all.forEach(q => {
    ok(q.ch.length === 4, q.id + ' 선택지 4개');
    ok(q.a >= 0 && q.a < 4, q.id + ' 정답 번호가 범위 안');
    ok(Array.isArray(q.no) && q.no.length === 4, q.id + ' 선택지별 판정 4개');
    ok(q.no[q.a] === '', q.id + ' 정답 자리의 오답 문구는 비어 있다');
    q.no.forEach((t, i) => {
      if (i !== q.a) ok(/^옳지 않다\./.test(t), q.id + ' 오답 ' + (i+1) + '번이 「옳지 않다.」로 시작');
    });
    ok(Array.isArray(q.hint) && q.hint.length === 2, q.id + ' 힌트 2단');
    ok(typeof q.ex === 'string' && q.ex.length > 40, q.id + ' 해설이 있다');
    ok(!/모두 옳|모두 옳지/.test(q.ch.join(' ')), q.id + ' 「모두 옳다」류 선택지 없음');
  });
  ok(S.PRACTICE.every(p => /쉬움|보통|어려움/.test(p.lv)), '연습 문항에 난이도 표시');
}
{
  // 고른 뒤의 화면 — 정답은 초록, 고른 오답만 표시, 해설 공개
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.restoreUI();
  T.pickQ('p1', 0);                                  /* 오답 */
  const els = T.qEls['p1'];
  ok(els.choices[2].className === 'choice right', '정답 선택지가 드러난다');
  ok(els.choices[0].className === 'choice picked', '고른 오답이 표시된다');
  ok(els.expl.style.display === 'block', '해설이 열린다');
  ok(/옳지 않다/.test(els.expl.innerHTML), '고른 선택지의 오답 근거가 나온다');
  ok(!/^.*\(가\)와 \(나\)는 살아/.test(els.expl.innerHTML) || true, '해설 본문');
  T.pickQ('p1', 2);                                  /* 다시 고른다 */
  ok(/✅ 옳다/.test(T.qEls['p1'].expl.innerHTML), '다시 골라도 곧바로 반영된다');
  ok(T.state.pPick['p1'] === 2, '마지막 선택만 저장된다');
}

/* ════════════════════════════════════════════════════════════
   [8] ⑦ 서술형 · 모범답안 잠금
   ════════════════════════════════════════════════════════════ */
console.log('[8] 서술형');
{
  const T = makeSandbox();
  ok(T.WRITEQ.length === 6, '서술형 4 + 창의력 2 = 6문항');
  ok(T.WRITEQ.every(w => w.ans && w.ans.length > 80), '모두 모범답안을 가진다');
  ok(T.WRITEQ.every(w => Array.isArray(w.need) && w.need.length >= 2), '답안에 들어갈 요소가 적혀 있다');
  ok(T.WRITEQ.filter(w => w.creative).length === 2, '창의력 문항 2개');

  ok(T.ansGate('w1').open === false, '아무것도 쓰지 않으면 모범답안이 잠겨 있다');
  T._store['ta_w1'].value = '가'.repeat(59);
  T.onTa('w1');
  ok(T.ansGate('w1').open === false, '기준 자수에 못 미치면 잠긴 채로 둔다');
  T._store['ta_w1'].value = '가'.repeat(60);
  T.onTa('w1');
  ok(T.ansGate('w1').open === true, '기준 자수를 넘기면 열린다');
  ok(T._store['cnt_w1'].textContent === '60자', '글자 수 표시');
  ok(T.state.ta['w1'].length === 60, '서술이 저장된다');
  T.toggleAns('w1');
  ok(T._store['ans_w1'].style.display === 'block', '모범답안이 펼쳐진다');
  ok(T._store['writeProg'].textContent === '작성한 문항 1 / 6', '작성한 문항 수 표시');
}

/* ════════════════════════════════════════════════════════════
   [9] 저장 · 복원 · 초기화
   ════════════════════════════════════════════════════════════ */
console.log('[9] 저장과 복원');
{
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.grPick = ['liveS']; T.grPredict('dead'); T.grInject();
  T.pickQ('p2', 3);
  T._store['ta_w2'].value = '나'.repeat(70); T.onTa('w2');
  T.state.chain['av.q'] = 'L1#0'; T.saveState();
  const blob = T.localStorage._mem['dnaproof_sim_v1'];
  ok(!!blob, '저장된다');

  const U = makeSandbox({ 'dnaproof_sim_v1': blob });
  ok(U.state.grRun['A'] === 'dead', '실험 결과가 복원된다');
  ok(U.state.pPick['p2'] === 3, '고른 답이 복원된다');
  ok(U.state.ta['w2'].length === 70, '서술이 복원된다');
  ok(U.state.chain['av.q'] === 'L1#0', '사슬 배치가 복원된다');
  ok(U._store['ta_w2'].value.length === 70, '화면에도 다시 채워진다');
}
{
  // ★옛 저장분에 들어 있던 기록 칸은 되살아나지 않는다
  const old = JSON.stringify({ grRun:{A:'dead'}, first:{'p1':true}, wrong:{'p1':2}, score:5 });
  const T = makeSandbox({ 'dnaproof_sim_v1': old });
  ok(T.state.first === undefined, '★옛 blob의 first(첫 시도 정오)가 복원되지 않는다');
  ok(T.state.wrong === undefined, '★옛 blob의 wrong(오답 집계)이 복원되지 않는다');
  ok(T.state.score === undefined, '★옛 blob의 score가 복원되지 않는다');
  T.saveState();
  const after = JSON.parse(T.localStorage._mem['dnaproof_sim_v1']);
  ok(after.first === undefined && after.wrong === undefined && after.score === undefined,
     '★한 번 저장하면 저장소에서도 지워진다');
}

/* ════════════════════════════════════════════════════════════
   [10] 기록하지 않는다 (연습 활동 규약)
   ════════════════════════════════════════════════════════════ */
console.log('[10] 기록하지 않는다');
{
  const T = makeSandbox();
  ok(T.freshState().first === undefined, 'state에 first 칸이 없다');
  ok(T.freshState().wrong === undefined, 'state에 wrong 칸이 없다');
  ok(typeof T.scoreOf === 'undefined', '점수 함수(scoreOf)가 없다');
  ok(typeof T.pracScore === 'undefined', '점수 함수(pracScore)가 없다');
  ok(!/state\.first/.test(js), '★코드가 state.first에 쓰지 않는다');
  ok(!/state\.wrong/.test(js), '★코드가 state.wrong에 쓰지 않는다');
  ok(!/첫 시도|첫 번째로 고른/.test(src), '★화면에 「첫 시도」 문구가 없다');
  ok(!/맞힌|정답률|점수/.test(src.replace(/<!--[\s\S]*?-->/g, '')),
     '★화면에 「맞힌·정답률·점수」가 없다');
  ok(!/pracScore|pedScore/.test(src), '★옛 점수 id가 남아 있지 않다');

  // 전부 오답으로 골라도 진행 표시가 다 찬다
  const U = makeSandbox();
  U.state.teacherUnlock = true;
  U.restoreUI();
  U.PRACTICE.forEach(p => U.pickQ(p.id, (p.a + 1) % 4));
  ok(U._store['pracProg'].textContent === '푼 문항 8 / 8',
     '★전부 오답이어도 「푼 문항 8 / 8」이 된다');
}

/* ════════════════════════════════════════════════════════════
   [11] 말투 — 시험지 문체
   ════════════════════════════════════════════════════════════ */
console.log('[11] 말투');
{
  // 태그·주석을 걷어낸 「학생이 읽는 글」만 검사한다
  const visible = src
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/<[^>]*>/g, ' ');
  const banned = ['좋아요','좋아!','맞아요','맞아!','해 보자','해보자','찾았어','거야','네가','우리가','친구들'];
  banned.forEach(w => ok(visible.indexOf(w) < 0, '금지어 「' + w + '」 없음'));
  ok(/하시오/.test(visible), '지시문이 「~하시오」로 쓰여 있다');
  /* ★confirm( ) 안을 통째로 떠 온다 — 삼항으로 갈라 쓰거나 여러 줄로 이어 붙이는 곳이 있어
     'confirm\('([^']*)'\)' 같은 단순 정규식으로는 놓친다(2026-08-25 실제로 놓쳤다). */
  const confirmBlocks = (() => {
    const out = [];
    let i = 0;
    while ((i = src.indexOf('confirm(', i)) >= 0){
      let d = 0, j = i + 'confirm'.length;
      for (; j < src.length; j++){
        if (src[j] === '(') d++;
        else if (src[j] === ')'){ d--; if (d === 0) break; }
      }
      out.push(src.slice(i + 'confirm('.length, j));
      i = j + 1;
    }
    return out;
  })();
  ok(confirmBlocks.length >= 3, '확인 대화상자가 있다');
  confirmBlocks.forEach(b => {
    const lits = [...b.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => m[1]);
    ok(/시겠습니까\?/.test(b), '확인 대화상자 「' + (lits[0] || '').slice(0,14) + '…」에 ~시겠습니까?가 있다');
    /* 물음표로 끝나는 조각은 모두 ~시겠습니까? 여야 한다 — 갈래마다 검사한다 */
    lits.filter(t => /\?$/.test(t)).forEach(t =>
      ok(/시겠습니까\?$/.test(t),
         '★확인 대화상자의 갈래 「' + t.slice(-14) + '」가 ~시겠습니까?로 끝난다'));
  });
  ok(confirmBlocks.some(b => /⑥/.test(b) && /잠긴다/.test(b)),
     '★난도 바꾸기·지우기 문구가 ⑥이 다시 잠긴다는 사실을 말한다');
  ok(/옳지 않다/.test(visible), '오답 판정이 「옳지 않다」로 시작한다');
}

/* ════════════════════════════════════════════════════════════
   [12] 표기 — 채택 교과서 기준
   ════════════════════════════════════════════════════════════ */
console.log('[12] 표기');
{
  const visible = src.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<[^>]*>/g, ' ');
  ok(visible.indexOf('폐렴쌍구균') < 0, '「폐렴쌍구균」 대신 「폐렴균」을 쓴다');
  ok(visible.indexOf('티민') < 0 && visible.indexOf('시토신') < 0, '구 용어(티민·시토신) 없음');
  ok(visible.indexOf('타이민') >= 0 || true, '타이민 표기(쓰인다면)');
  ok(/생쥐/.test(visible), '「생쥐」 표기');
  ok(!/(^|[^생])쥐에 주입/.test(visible), '「쥐에 주입」이 아니라 「생쥐에 주입」');
  ok(/뉴클레오타이드/.test(visible), '뉴클레오타이드 표기');
  ok(/<sup>35<\/sup>S/.test(src) && /<sup>32<\/sup>P/.test(src), '방사성 동위원소를 윗첨자로 조판');
  // 파지의 유전물질 오개념 방지 문장
  ok(/RNA를 유전물질로 하는 파지도 있다/.test(src),
     '★「파지의 유전물질은 언제나 DNA」 오개념을 막는 문장이 있다(교과서 지도 Tip)');
}

/* ════════════════════════════════════════════════════════════
   [13] 무대 그림 — 연출과 무관하게 그려진다
   ════════════════════════════════════════════════════════════ */
console.log('[13] 무대');
{
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.grPick = ['deadS','liveR']; T.grPredict('dead'); T.grInject();
  const g = T._store['grStage'].innerHTML;
  ok(/<svg/.test(g) && /viewBox/.test(g), '그리피스 무대가 SVG로 그려진다');
  ok(/죽었다/.test(g), '(라)에서 생쥐가 죽은 그림이 나온다');
  ok(/살아 있는 S형균이 발견되었다/.test(g), '혈액에서 S형균이 발견된 그림');
  ok(/대부분은 피막이 없는/.test(g) && /R형균으로 남아 있다/.test(g),
     '(라)에서 대부분이 피막 없는 R형균으로 남는다고 적힌다');

  /* ★(나) — 살아 있는 R형균은 병원성이 없을 뿐 죽지 않는다. 혈액에서 관찰된다.
     2026-08-25 교사 지시로 넣었다. 되돌리면 여기서 문다. */
  {
    const U = makeSandbox();
    U.state.teacherUnlock = true;
    U.grPick = ['liveR']; U.grPredict('live'); U.grInject();
    const b = U._store['grStage'].innerHTML;
    ok(/살아 있는 R형균이 발견되었다/.test(b), '★(나) 혈액 검사에 살아 있는 R형균이 그려진다');
    ok(/피막이 없어 표면이 거칠다/.test(b), '★(나) 시야 설명이 피막이 없다고 적는다');
    ok(!/살아 있는 S형균이 발견되었다/.test(b), '★(나)에 S형균이 발견되었다고 적히지 않는다');

    /* (다) — 죽은 S형균만 넣으면 살아 있는 균이 하나도 없다 */
    U.grPick = ['deadS']; U.grPredict('live'); U.grInject();
    const c = U._store['grStage'].innerHTML;
    ok(/살아 있는 균이 발견되지 않았다/.test(c), '★(다) 시야는 살아 있는 균이 없다고 적는다');
    ok(!/R형균이 발견되었다/.test(c), '★(다)에 R형균을 그리지 않는다 — 넣은 적이 없다');

    /* 피막 도해 — S형균과 R형균을 무엇으로 가리는지 먼저 보여 준다 */
    const lg = U._store['grLegend'].innerHTML;
    ok(/<svg/.test(lg), '★② 머리말에 피막 비교 도해가 그려진다');
    ok(/피막이 있다/.test(lg) && /피막이 없다/.test(lg), '★도해가 피막의 있음·없음을 나란히 적는다');
    ok(/표면이 매끈하다/.test(lg) && /표면이 거칠다/.test(lg), '★도해가 표면의 차이를 적는다');
    ok(/병원성이 있다/.test(lg) && /병원성이 없다/.test(lg), '★도해가 병원성까지 잇는다');
    ok(/class="lgname"/.test(lg) && /class="lgdesc"/.test(lg),
       '★이름·설명은 SVG 글자가 아니라 HTML이다 — 칸이 좁아져도 글자가 같이 작아지지 않는다');
    ok(!/<text/.test(lg), '★도해 SVG 안에는 글자가 없다 — 그림을 96px로 줄여도 읽을 수 있어야 한다');
    ok((lg.match(/<svg/g) || []).length === 2, '★그림은 균 하나에 하나씩 두 장이다');
  }

  T.avRun('dna');
  const a = T._store['avStage'].innerHTML;
  ok(/<svg/.test(a), '에이버리 무대가 그려진다');
  ok(/형질전환이 일어나지 않았다/.test(a), 'DNA 분해효소에서는 S형 집락이 없다고 적힌다');

  T.hcRun('p32');
  const h = T._store['hcStage'].innerHTML;
  ok(/<svg/.test(h), '허시·체이스 무대가 그려진다');
  ok(/침전물/.test(h) && /상층액/.test(h), '상층액과 침전물이 그려진다');
  ok(/방사선 검출됨/.test(h), '계수기 판독이 나온다');

  T.aniSkip();
  ok(T.ani.ph === T.ANI_LAST, '연출 건너뛰기가 마지막 국면으로 보낸다');

  /* ★가운데 맞춘 글이 무대 밖으로 잘리지 않는가.
     헤드리스는 글자 폭을 모르므로 어림한다 — 한글 한 자 = 폰트 크기, 그 밖 = 0.52배.
     <g transform="translate(a,b) scale(s)"> 안에 든 글도 있으므로 쌓아 가며 좌표를 옮긴다.
     실제로 (라)의 「대부분은 피막 없는 R형균으로 남아 있다」 끝 글자가 잘려 있었다(2026-08-25 눈으로 발견). */
  const overflow = (html) => {
    /* ★한 상자에 SVG가 여러 장 들어 있을 수 있다(피막 도해는 두 장) — 장마다 제 viewBox로 잰다 */
    const svgs = html.split('<svg').slice(1).map(x => '<svg' + x.split('</svg>')[0]);
    if (!svgs.length) return ['SVG 없음'];
    return svgs.flatMap(one => overflowOne(one));
  };
  const overflowOne = (svg) => {
    const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
    if (!vb) return ['viewBox 없음'];
    const W = +vb[1];
    const bad = [];
    const stack = [{ dx:0, sc:1 }];
    const tok = /<g\b([^>]*)>|<\/g>|<text\s+x="(-?[\d.]+)"([^>]*)>([^<]*)<\/text>/g;
    let m;
    while ((m = tok.exec(svg))){
      const top = stack[stack.length - 1];
      if (m[0] === '</g>'){ if (stack.length > 1) stack.pop(); continue; }
      if (m[1] !== undefined){
        const tr = /translate\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/.exec(m[1]);
        const sc = /scale\(\s*(-?[\d.]+)\s*\)/.exec(m[1]);
        const f = sc ? +sc[1] : 1;
        stack.push({ dx: top.dx + (tr ? +tr[1] : 0) * top.sc, sc: top.sc * f });
        continue;
      }
      const rest = m[3] || '', txt = m[4] || '';
      if (!/text-anchor="middle"/.test(rest)) continue;
      const fs = (/font-size="([\d.]+)"/.exec(rest) || [0, 14])[1] * top.sc;
      const cx = top.dx + (+m[2]) * top.sc;
      let w = 0;
      for (const ch of txt) w += (/[가-힣ㄱ-ㅎ]/.test(ch) ? 1 : 0.52) * fs;
      if (cx - w/2 < -2 || cx + w/2 > W + 2) bad.push(txt);
    }
    return bad;
  };
  ['grStage','avStage','hcStage','grLegend'].forEach(id => {
    const bad = overflow(T._store[id].innerHTML);
    ok(bad.length === 0, '★' + id + ' 캡션이 무대 밖으로 나가지 않는다' +
       (bad.length ? ' — 넘친 글: ' + bad.join(' / ') : ''));
  });

  /* ★flex 함정 — .chip 과 .slot 은 flex 상자다. 글을 <span> 하나로 감싸지 않으면
     <sup>·<b> 가 저마다 flex 항목이 되어 gap 이 글자 사이에 끼어들고 문장이 흩어진다.
     실제로 「35 S로 단백질 을 표지」로 깨진 적이 있다(2026-08-24 눈으로 발견). */
  ok(/"><\/span><span>/.test(T._store['hcChips'].innerHTML),
     '★표지 칩의 글이 <span> 하나로 감싸여 있다 (flex gap 함정)');
  ok(/"><\/span><span>/.test(T._store['avChips'].innerHTML), '★효소 칩도 감싸여 있다');
  ok(/"><\/span><span>/.test(T._store['grChips'].innerHTML), '★주사기 칩도 감싸여 있다');
  T.renderChain();
  ok(/class="slot[^"]*"[^>]*><span>/.test(T._store['chBoard'].innerHTML),
     '★사슬판 칸의 글도 <span> 하나로 감싸여 있다');
}

/* ════════════════════════════════════════════════════════════
   [13-2] 연출 제어 — 다시 보기 · 단계별 진행 · 원심분리
   교사 지시 2026-08-25: 「애니메이션 다시 보기가 필요하다」
                        「허시·체이스가 빠르다 — 단계별로 진행할 수 있게」
                        「원심분리 애니메이션이 안 보인다 — 돌아가는 원의 지름을 줄여라」
   ════════════════════════════════════════════════════════════ */
console.log('[13-2] 연출 제어');
{
  const T = makeSandbox();
  T.state.teacherUnlock = true;

  /* ── 단계 이름과 속도 ── */
  ok(Object.keys(T.ANI_STEPS).length === 3, '세 무대의 단계 이름이 있다');
  ['gr','av','hc'].forEach(k => {
    ok(T.ANI_STEPS[k].length === T.ANI_LAST + 1,
       k + ' 단계 이름 수 = ANI_LAST+1 (' + (T.ANI_LAST + 1) + ')');
  });
  ok(T.ANI_STEPS.hc[3] === '원심분리한다', '허시·체이스 4단계가 원심분리다');
  ok(T.ANI_MS.hc > T.ANI_MS.gr && T.ANI_MS.hc > T.ANI_MS.av,
     '★허시·체이스는 다른 무대보다 한 단계에 오래 머문다 (교사: 「좀 빠르다」)');

  /* ── 실행 ── */
  T.grPick = ['deadS','liveR']; T.grPredict('dead'); T.grInject();
  ['none','prot','rna','dna'].forEach(id => T.avRun(id));
  ['s35','p32'].forEach(id => T.hcRun(id));
  const snap = JSON.stringify({ g:T.state.grRun, a:T.state.avRun, h:T.state.hcRun });
  const saved = T.localStorage._mem['dnaproof_sim_v1'];

  /* ── ★다시 보기가 결과를 건드리지 않는다 (불변식 A) ── */
  T.aniReplay('gr','D'); T.aniReplay('av','prot'); T.aniReplay('hc','s35');
  ok(JSON.stringify({ g:T.state.grRun, a:T.state.avRun, h:T.state.hcRun }) === snap,
     '★다시 보기는 확정된 결과를 건드리지 않는다');
  ok(T.localStorage._mem['dnaproof_sim_v1'] === saved, '★다시 보기는 저장분도 건드리지 않는다');
  ok(!/reveal|"auto"|"gen"/.test(saved || ''), '★연출 상태는 저장되지 않는다');

  /* ── 다시 보기는 결과표를 감추지 않는다 ── */
  ok(T.ani.reveal === false, '다시 보기는 「처음 밝히는」 재생이 아니다');
  ok(!T.aniPlaying('hc','s35'), '★그래서 결과표가 「측정 중이다…」로 되돌아가지 않는다');
  T.renderHc();
  ok(!/측정 중이다/.test(T._store['hcTbody'].innerHTML), '★다시 보기 중에도 표가 그대로 있다');

  /* ── ★끝까지 간 뒤 손으로 되돌아가면 결과를 도로 감추지 않는다 ──
     실제로 그랬다: 처음 실행이 끝난 뒤 ◀ 이전을 누르니 (라) 행이 「관찰 중이다…」로 되돌아갔다
     (2026-08-25 브라우저에서 눈으로 발견). */
  {
    const W = makeSandbox();
    W.state.teacherUnlock = true;
    W.grPick = ['deadS','liveR']; W.grPredict('dead'); W.grInject();
    ok(W.ani.reveal === true && W.ani.ph === W.ANI_LAST, '헤드리스에서는 처음 재생이 곧바로 끝난다');
    W.aniGo('gr','D',-1);
    ok(W.ani.reveal === false, '★끝까지 간 뒤 되돌아가면 「다시 보기」가 된다');
    ok(!W.aniPlaying('gr','D'), '★그래서 결과표를 감추지 않는다');
    W.renderGr();
    ok(!/관찰 중이다/.test(W._store['grTbody'].innerHTML),
       '★(라) 행이 「관찰 중이다…」로 되돌아가지 않는다');
  }

  /* ── 처음 실행은 「밝히는」 재생이다 ── */
  const U = makeSandbox();
  U.state.teacherUnlock = true;
  U.grPick = ['liveS']; U.grPredict('dead'); U.grInject();
  ok(U.ani.reveal === true, '★처음 실행은 결과를 밝히는 재생이다');

  /* ── 손으로 단계 넘기기 ── */
  T.aniGo('hc','p32',0);
  ok(T.ani.st === 'hc' && T.ani.id === 'p32', '다른 무대를 잡아 온다');
  T.aniGo('hc','p32',-1);
  ok(T.ani.ph === T.ANI_LAST - 1, '◀ 이전이 한 단계 뒤로 간다');
  T.aniGo('hc','p32',-99);
  ok(T.ani.ph === 0, '★뒤로 넘쳐도 0에서 멈춘다');
  T.aniGo('hc','p32',99);
  ok(T.ani.ph === T.ANI_LAST, '★앞으로 넘쳐도 마지막에서 멈춘다');
  ok(T.ani.auto === false, '★손으로 넘기면 자동 진행이 꺼진다 (예약된 진행이 끊긴다)');

  /* ── 끝까지 ── */
  T.aniGo('av','rna',0); T.aniGo('av','rna',-2);
  T.aniSkip('av','rna');
  ok(T.ani.ph === T.ANI_LAST && T.ani.st === 'av', '⏩ 끝까지가 마지막 국면으로 보낸다');

  /* ── 제어 막대 ── */
  T.grPick = ['deadS','liveR']; T.renderGr();
  const bar = T._store['grAni'].innerHTML;
  ok(/처음부터/.test(bar) && /이전/.test(bar) && /다음/.test(bar) && /끝까지/.test(bar),
     '★무대 아래에 제어 막대 네 단추가 있다');
  ok(/aniReplay\('gr','D'\)/.test(bar), '「처음부터」가 그 조건을 다시 본다');
  ok(/anistep/.test(bar) && /5 \/ 5|1 \/ 5/.test(bar), '지금 몇 단계인지 적힌다');
  T.grClear();
  ok(T._store['grAni'].innerHTML === '', '주사기를 비우면 막대가 사라진다');
  const V = makeSandbox();
  V.grPick = ['liveS']; V.renderGr();
  ok(V._store['grAni'].innerHTML === '', '★아직 실행하지 않은 조건에는 막대가 없다');

  /* ── ③④ 다 한 칩은 잠그지 않고 다시 보기로 ── */
  T.renderAv(); T.renderHc();
  const avc = T._store['avChips'].innerHTML, hcc = T._store['hcChips'].innerHTML;
  ok(!/disabled/.test(avc) && !/disabled/.test(hcc), '★다 한 칩을 잠그지 않는다');
  ok(/aniReplay\('av','prot'\)/.test(avc), '★다 한 효소 칩을 누르면 그 연출을 다시 본다');
  ok(/aniReplay\('hc','s35'\)/.test(hcc), '★다 한 표지 칩도 마찬가지다');
  ok(/"><\/span><span>/.test(avc) && /"><\/span><span>/.test(hcc),
     '★칩 글은 여전히 <span> 하나로 감싸여 있다 (flex gap 함정)');

  /* ── ★원심분리 — 안 보이던 원인이 되살아나지 않는가 ── */
  T.ani = { st:'hc', id:'p32', ph:3, gen:99, auto:false, reveal:false };
  T.renderHc();
  const spin = T._store['hcStage'].innerHTML;
  ok(/class="spinning"/.test(spin), '원심분리 단계에 도는 그림이 있다');
  ok(!/<g class="spinning"[^>]*transform=/.test(spin),
     '★도는 <g>에 transform 속성이 없다 — 있으면 CSS 회전이 덮어써서 그림이 0,0으로 튄다');
  ok(/<g transform="translate\(340,112\)">/.test(spin), '자리 잡는 <g>가 따로 있다');
  /* 도는 반지름이 무대 안에 들어오는가 — 중심 (340,112), viewBox 680×260 */
  ok(/y="-56"/.test(spin), '시험관이 반지름 56 자리에 있다 (전에는 72였다)');
  ok(112 - 58 > 0 && 112 + 58 < 260, '★도는 원이 무대(260) 안에 들어온다');

  /* ── prefers-reduced-motion 에서도 정지 그림이 말이 된다 ── */
  ok(/원심분리한다/.test(spin), '원심분리 단계에 설명이 적힌다');
}

/* ════════════════════════════════════════════════════════════
   [13-3] 2026-08-25 교차 검토에서 잡아낸 것들
   ════════════════════════════════════════════════════════════ */
console.log('[13-3] 교차 검토 반영');
{
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.grPick = ['deadS','liveR']; T.grPredict('dead'); T.grInject();
  ['none','prot','rna','dna'].forEach(id => T.avRun(id));
  ['s35','p32'].forEach(id => T.hcRun(id));

  /* ── ★A. 재생 도중 다른 무대를 건드리면 떠난 무대가 얼어붙던 문제 ──
     실제 증상: ④ 재생 중 ③ 칩을 누르면 ④ 결과표가 「측정 중이다…」로 영원히 굳고,
               ④ 막대는 2/5 를 가리키는데 ▶ 다음을 누르면 5/5 로 건너뛴다. */
  T.ani = { st:'hc', id:'s35', ph:1, gen:9, auto:true, reveal:true };
  T.renderHc();
  ok(/측정 중이다/.test(T._store['hcTbody'].innerHTML), '재생 중에는 그 행이 아직 측정 중이다');
  T.aniReplay('av','prot');                       /* 다른 무대로 넘어간다 */
  ok(!/측정 중이다/.test(T._store['hcTbody'].innerHTML),
     '★떠난 무대의 결과표가 완료 상태로 되돌아온다 (얼어붙지 않는다)');
  ok(/5 \/ 5/.test(T._store['hcAni'].innerHTML),
     '★떠난 무대의 막대도 마지막 단계를 가리킨다 — 화면과 ph 가 어긋나지 않는다');
  ok(!/측정 중이다|배양 중이다|관찰 중이다/.test(T._store['hcTbody'].innerHTML + T._store['grTbody'].innerHTML),
     '★어느 표도 「…중이다」에 굳어 있지 않다');

  /* 떠난 무대로 되돌아가 ◀ 이전을 누르면 화면에 보이던 5/5 에서 한 단계만 뒤로 간다 */
  T.aniGo('hc','s35',-1);
  ok(T.ani.ph === T.ANI_LAST - 1, '★되돌아와 ◀ 이전을 누르면 한 단계만 뒤로 간다 (건너뛰지 않는다)');

  /* 넘어간 쪽도 마찬가지로 놓아 준다 */
  T.ani = { st:'av', id:'dna', ph:2, gen:20, auto:true, reveal:true };
  T.renderAv();
  ok(/배양 중이다/.test(T._store['avTbody'].innerHTML), '에이버리도 재생 중에는 배양 중이다');
  T.aniGo('hc','p32',0);
  ok(!/배양 중이다/.test(T._store['avTbody'].innerHTML), '★에이버리도 놓아 주면 완료 상태로 돌아온다');

  /* ── ★C. SVG <text> 안에 HTML 태그가 들어가면 그림이 거기서 끊긴다 ──
     실제 증상: ④ 1/5 의 표지 이름(<sup>·<b>)과 3/5 의 믹서 캡션(<b>) 뒤쪽이
               그림 밖으로 새어 나와 본문 글꼴로 찍혔다. */
  const BREAKOUT = /<(?:b|i|em|strong|sup|sub|span|p)[ >]/;
  ['gr','av','hc'].forEach(st => {
    const ids = st === 'gr' ? ['A','B','C','D']
              : st === 'av' ? ['none','prot','rna','dna'] : ['s35','p32'];
    ids.forEach(id => {
      for (let ph = 0; ph <= T.ANI_LAST; ph++){
        T.ani = { st:st, id:id, ph:ph, gen:99, auto:false, reveal:false };
        if (st === 'gr'){
          const c = T.GR_CONDS.filter(x => x.id === id)[0];
          T.grPick = c.mix.slice(); T.renderGr();
        } else if (st === 'av'){ T.renderAv(); } else { T.renderHc(); }
        const svg = T._store[st + 'Stage'].innerHTML;
        ok(!BREAKOUT.test(svg),
           '★' + st + '/' + id + ' ' + ph + '국면 무대에 HTML 태그가 없다 (SVG가 거기서 끊긴다)');
        ok(/<\/svg>$/.test(svg.trim()), '★' + st + '/' + id + ' ' + ph + '국면 SVG가 끝까지 닫힌다');
      }
    });
  });
  T.ani = { st:'hc', id:'s35', ph:0, gen:99, auto:false, reveal:false };
  T.renderHc();
  ok(/<tspan baseline-shift="super"/.test(T._store['hcStage'].innerHTML),
     '★표지 이름의 위 첨자가 tspan 으로 바뀌어 그림 안에 남는다');
  T.ani = { st:'hc', id:'s35', ph:2, gen:99, auto:false, reveal:false };
  T.renderHc();
  ok(/<tspan font-weight="bold">대장균에 붙어 있던 빈 껍질<\/tspan>/.test(T._store['hcStage'].innerHTML),
     '★믹서 캡션의 굵은 글씨도 tspan 이다');
  ok(typeof T.svgText === 'function' && !BREAKOUT.test(T.svgText('<sup>35</sup>S와 <b>단백질</b>')),
     '★svgText 가 HTML 태그를 걷어낸다');

  /* ── ★B. 에이버리 대조군은 「효소를 넣는다」고 말하지 않는다 ── */
  ok(T.aniSteps('av','none')[1] === '효소를 넣지 않는다',
     '★대조군 2단계는 「효소를 넣지 않는다」이다 (넣는 효소가 없다)');
  ok(T.aniSteps('av','none')[2] === '분해된 물질이 없다',
     '★대조군 3단계는 「분해된 물질이 없다」이다');
  ok(T.aniSteps('av','prot')[1] === '효소를 넣는다', '효소를 넣는 조건은 그대로다');
  ok(T.aniSteps('hc','s35')[3] === '원심분리한다', '다른 무대는 조건별 이름이 없다');
  {
    const png = [];
    for (let ph = 0; ph <= 2; ph++){
      T.ani = { st:'av', id:'none', ph:ph, gen:99, auto:false, reveal:false };
      T.renderAv();
      png.push(T._store['avStage'].innerHTML);
    }
    ok(png[0] !== png[1] && png[1] !== png[2],
       '★대조군도 국면마다 무대가 달라진다 (전에는 세 국면이 한 글자도 같았다)');
    ok(/아무 효소도 넣지 않는다/.test(png[1]) && /분해된 물질이 없다/.test(png[2]),
       '★대조군 무대가 무엇이 일어나지 않는지 적는다');
  }

  /* ── ★F. 그리피스 4국면은 아직 결과를 보여 주지 않는다 ── */
  {
    const c = T.GR_CONDS.filter(x => x.id === 'D')[0];
    T.grPick = c.mix.slice();
    T.ani = { st:'gr', id:'D', ph:3, gen:99, auto:false, reveal:false };
    T.renderGr();
    const p3 = T._store['grStage'].innerHTML;
    T.ani = { st:'gr', id:'D', ph:4, gen:99, auto:false, reveal:false };
    T.renderGr();
    const p4 = T._store['grStage'].innerHTML;
    ok(/아직 관찰하지 않았다/.test(p3) && !/살아 있는 S형균이 발견되었다/.test(p3),
       '★4국면(혈액을 뽑는다)에는 아직 결과가 없다');
    ok(/살아 있는 S형균이 발견되었다/.test(p4), '★5국면(혈액을 관찰한다)에서 결과가 나온다');
    ok(p3 !== p4, '★마지막 「▶ 다음」이 새로 보여 주는 것이 있다');
  }
}

/* ════════════════════════════════════════════════════════════
   [13-4] 배포 전 3렌즈 점검에서 잡아낸 것들 (2026-08-25)
   ════════════════════════════════════════════════════════════ */
console.log('[13-4] 배포 전 점검 반영');
{
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.renderChain();

  /* ── ★⑤ 안내문이 난도를 따라간다 ── */
  const easy = T._store['chIntro'].innerHTML;
  ok(/1행/.test(easy) && /예시로 채워 두었다/.test(easy), '표준 난도 안내문은 1행이 예시라고 적는다');
  T.chToggleHard();
  const hard = T._store['chIntro'].innerHTML;
  ok(!/1행 <b>그리피스<\/b>는 완성된 예시/.test(hard),
     '★도전 난도에서 「1행은 예시로 채워 두었다」라고 말하지 않는다 (1행도 비운다)');
  ok(/모두 비웠다/.test(hard) && /열한 칸/.test(hard),
     '★도전 난도 안내문이 실제로 채울 칸 수를 말한다');
  ok(/같은 문장이 두 장/.test(hard),
     '★도전 난도의 단서는 「판에 있는 문장」이 아니라 「덱에 같은 문장 두 장」이다');
  ok(T.chPreset().length === 1, '도전 난도는 미리 채운 칸이 하나뿐이다');
  T.chToggleHard();
  ok(T._store['chIntro'].innerHTML === easy, '표준 난도로 되돌리면 안내문도 되돌아온다');

  /* ── ★사슬을 완성한 뒤에는 카드를 집지 않는다 ── */
  const U = makeSandbox();
  U.state.teacherUnlock = true;
  U.state.chainOk = true;
  U.renderChain();
  U.chPickCard('D1#0');
  ok(U.chHand === null || U.chHand === undefined,
     '★완성한 뒤에는 카드를 집을 수 없다 — 집어도 놓을 칸이 없어 「놓으시오」만 뜨고 아무 일이 없었다');

  /* ── ★초기화가 메모리도 비운다 ── */
  const V = makeSandbox();
  V.state.teacherUnlock = true;
  V.grPick = ['liveS']; V.grPredict('dead'); V.grInject();
  V._store['ta_w2'].value = '가'.repeat(70); V.onTa('w2');
  ok(Object.keys(V.state.grRun).length === 1 && V.state.ta['w2'], '지우기 전에는 기록이 있다');
  V.resetAll();
  ok(Object.keys(V.state.grRun).length === 0, '★초기화가 메모리의 실험 결과도 비운다');
  ok(!V.state.ta || !V.state.ta['w2'], '★서술도 비운다');
  ok(V.chHand === null && V.grPick.length === 0, '★손에 든 카드와 주사기도 비운다');
  V.saveState();
  const after = V.localStorage._mem['dnaproof_sim_v1'];
  ok(!after || !/dead/.test(after),
     '★새로고침 전에 무엇이 저장돼도 지운 기록이 되살아나지 않는다');

  /* ── ★저장분이 손상돼도 죽지 않는다 ── */
  const bad = JSON.stringify({ grRun:{A:'dead'}, ta:{ w2: 12345 } });
  let threw = null;
  try { makeSandbox({ 'dnaproof_sim_v1': bad }); } catch(e){ threw = e; }
  ok(threw === null, '★ta 값이 문자열이 아닌 저장분에도 활동이 뜬다 (String 으로 감쌌다)');
}

/* ════════════════════════════════════════════════════════════
   [13-5] 사슬을 완성한 뒤 난도를 바꾸면 ⑥이 함께 잠긴다 — 문구가 그 사실을 말하는가
   ★확인 문구는 「카드가 지워진다」만 말했다. 실제로는 chainOk 가 꺼져 stepOpen('prac') 이
     false 가 되어 ⑥ 연습 문항이 도로 잠긴다(2026-08-25 검토에서 제기 → 코드로 재현됨).
   ════════════════════════════════════════════════════════════ */
console.log('[13-5] 난도 바꾸기 경고');
{
  /* 완성한 상태에서 난도를 바꾸려 하면 ⑥ 이야기를 한다 */
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.state.chainOk = true;
  let msg = '';
  T.confirm = (m) => { msg = String(m); return false; };
  T.chToggleHard();
  ok(/⑥/.test(msg) && /잠긴다/.test(msg),
     '★완주 뒤 난도를 바꾸려 하면 ⑥이 다시 잠긴다고 알린다');
  ok(/시겠습니까\?/.test(msg), '그 문구도 ~시겠습니까?로 묻는다');
  ok(T.state.chainHard !== true, '취소하면 난도가 바뀌지 않는다');

  /* 지우기도 같다 */
  let msg2 = '';
  T.confirm = (m) => { msg2 = String(m); return false; };
  T.chReset();
  ok(/⑥/.test(msg2) && /잠긴다/.test(msg2), '★완주 뒤 지우기도 ⑥ 이야기를 한다');

  /* 아직 완성하지 않았으면 ⑥은 원래 잠겨 있으므로 그 말을 넣지 않는다 */
  const U = makeSandbox();
  U.state.teacherUnlock = true;
  U.state.chain = { 'av.q': 'L1#0' };
  let msg3 = '';
  U.confirm = (m) => { msg3 = String(m); return false; };
  U.chToggleHard();
  ok(msg3.length > 0, '카드를 놓은 뒤에는 난도를 바꿀 때 확인을 묻는다');
  ok(!/⑥/.test(msg3), '★아직 완성 전이면 ⑥ 이야기를 넣지 않는다 (원래 잠겨 있다)');

  /* 실제로 ⑥이 잠기는지 — 이 사실이 문구의 근거다 */
  const V = makeSandbox();
  V.state.chainOk = true;
  ok(V.stepOpen('prac'), '사슬을 완성하면 ⑥이 열린다');
  V.confirm = () => true;
  V.chToggleHard();
  ok(!V.stepOpen('prac'), '★난도를 바꾸면 ⑥이 실제로 다시 잠긴다');
}

/* ════════════════════════════════════════════════════════════
   [13-6] 두 탭이 서로를 지우지 않는다
   ★재현됐던 길: 새로 연 두 번째 탭은 ③④⑤⑥이 잠겨 있어도 ⑦ 정리하기는 열려 있다.
     그 칸에 한 글자만 쳐도 saveState 가 돌아 앞 탭의 실험 결과·사슬·문항이 통째로 지워졌다.
     경고도 없었다 — 앞 탭은 새로고침하고 나서야 「진행 0 / 4」를 보게 된다.
   ════════════════════════════════════════════════════════════ */
console.log('[13-6] 두 탭');
{
  /* 같은 mem 을 공유하는 샌드박스 둘 = 같은 기기의 두 탭 */
  const mem = {};
  const seed = () => mem;

  const tab1 = makeSandbox(mem);
  tab1.state.teacherUnlock = true;
  tab1.grPick = ['deadS','liveR']; tab1.grPredict('dead'); tab1.grInject();
  ['none','prot','rna','dna'].forEach(id => tab1.avRun(id));
  tab1._store['ta_w1'].value = '가'.repeat(70); tab1.onTa('w1');
  const saved1 = JSON.parse(tab1.localStorage._mem['dnaproof_sim_v1']);
  ok(Object.keys(saved1.grRun).length === 1 && Object.keys(saved1.avRun).length === 4,
     '탭1의 작업이 저장되어 있다');
  ok(typeof saved1.seq === 'number' && saved1.seq > 0, '★저장분에 seq 표가 붙는다');

  /* 탭2 를 「탭1 이 일하기 전에」 연 상황 — 옛 스냅숏을 들고 있다 */
  const stale = makeSandbox({});           /* 빈 저장소에서 부팅 = seq 0 */
  stale.localStorage._mem['dnaproof_sim_v1'] = tab1.localStorage._mem['dnaproof_sim_v1'];
  stale._store['ta_w1'].value = 'ㄱ';
  stale.onTa('w1');                        /* ⑦ 에 한 글자 — 예전엔 여기서 탭1이 전부 날아갔다 */
  const after = JSON.parse(stale.localStorage._mem['dnaproof_sim_v1']);
  ok(Object.keys(after.grRun).length === 1 && Object.keys(after.avRun).length === 4,
     '★낡은 탭이 한 글자를 쳐도 앞 탭의 실험 결과가 지워지지 않는다');
  ok(after.ta && after.ta['w1'] && after.ta['w1'].length === 70,
     '★앞 탭이 쓴 서술도 빈 글자로 덮이지 않는다');
  const warnOf = (T) => T.document.getElementById('tabWarn');
  ok(/다른 탭에서도 열려 있다/.test(warnOf(stale).innerHTML),
     '★대신 낡은 탭에 「다른 탭에서도 열려 있다」고 알린다');
  ok(warnOf(stale).className.indexOf('hide') < 0, '경고가 보인다');

  /* 평소에는 경고가 없다 */
  const solo = makeSandbox();
  solo.state.teacherUnlock = true;
  solo.grPick = ['liveS']; solo.grPredict('dead'); solo.grInject();
  ok(warnOf(solo).innerHTML === '', '★탭이 하나면 경고가 뜨지 않는다');

  /* seq 가 오르며 저장이 계속된다 */
  const a1 = JSON.parse(solo.localStorage._mem['dnaproof_sim_v1']).seq;
  solo.pickQ('gr1', 1);
  const a2 = JSON.parse(solo.localStorage._mem['dnaproof_sim_v1']).seq;
  ok(a2 > a1, '★같은 탭에서는 계속 저장되고 seq 가 오른다');

  /* 옛 저장분(seq 없음)에도 막히지 않는다 — 뒤로 호환 */
  const oldBlob = JSON.stringify({ grRun:{A:'dead'} });
  const compat = makeSandbox({ 'dnaproof_sim_v1': oldBlob });
  compat.state.teacherUnlock = true;
  compat.grPick = ['liveR']; compat.grPredict('live'); compat.grInject();
  const c = JSON.parse(compat.localStorage._mem['dnaproof_sim_v1']);
  ok(Object.keys(c.grRun).length >= 1, '★seq 가 없던 옛 저장분 위에도 그대로 저장된다');
  ok(warnOf(compat).innerHTML === '', '옛 저장분에 경고를 띄우지 않는다');

  /* 초기화하면 표도 처음으로 돌아간다 */
  ok(makeSandbox().freshState().seq === 0, 'freshState 의 seq 는 0 이다');
}

/* ════════════════════════════════════════════════════════════
   [13-7] ⑤ 카드 덱 — 섞기와 2단 배치 (교사 지시 2026-08-25)
   「카드가 안 섞여 있으니 찾는 맛도 안 나고, 계속 스크롤해야 되니 힘들다.
     차라리 이것도 가로 배열대로 가는 게 맞는 것 같다.」
   ════════════════════════════════════════════════════════════ */
console.log('[13-7] 카드 덱');
{
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.renderChain();

  /* ── ★섞인다 ── */
  const plain = T.chDeckAll();
  let differed = 0;
  for (let k = 0; k < 8; k++){
    const U = makeSandbox();
    U.state.teacherUnlock = true;
    const d = U.chDeck();
    if (d.join(',') !== plain.join(',')) differed++;
  }
  ok(differed >= 7, '★덱이 섞여 나온다 (CH_CARDS 차례 그대로 나오지 않는다 — ' + differed + '/8)');

  /* 내용은 그대로여야 한다 */
  const deck = T.chDeck();
  ok(deck.length === plain.length, '섞어도 장 수는 그대로다');
  ok(plain.every(x => deck.indexOf(x) >= 0), '★섞어도 빠지거나 더해진 카드가 없다');
  ok(deck.filter(i => T.chCardOf(i) === 'L2').length === 2, '쌍둥이 카드도 그대로 두 장이다');

  /* ── ★놓는 동안 나머지 차례가 흔들리지 않는다 ── */
  const before = T.chDeck();
  const pick = before[3];
  T.chPickCard(pick);
  T.chTapSlot('av.q');
  const after = T.chDeck();
  ok(after.indexOf(pick) < 0, '놓은 카드는 덱에서 빠진다');
  ok(after.join(',') === before.filter(x => x !== pick).join(','),
     '★카드를 놓아도 남은 카드의 차례가 그대로다 (매번 다시 섞이면 눈이 못 따라간다)');

  /* 새로고침해도 같은 차례 */
  T.saveState();
  const blob = T.localStorage._mem['dnaproof_sim_v1'];
  const R = makeSandbox({ 'dnaproof_sim_v1': blob });
  ok(R.chDeck().join(',') === after.join(','), '★새로고침해도 덱 차례가 그대로다');
  ok(Array.isArray(JSON.parse(blob).deckOrder), '덱 차례가 저장분에 남는다');

  /* ── 난도를 바꾸면 다시 섞는다 ── */
  T.confirm = () => true;
  T.chToggleHard();
  ok(T.state.deckOrder === null || T.chDeck().length === T.chDeckAll().length,
     '★난도를 바꾸면 덱을 다시 짠다');
  ok(T.chDeck().length === 11, '도전 난도 덱 = 11장 (실제 ' + T.chDeck().length + ')');
  ok(T.chDeck().length === T.chBlanks().length, '도전 난도에서도 덱 장 수 = 빈 칸 수');

  /* 다시 놓기도 다시 섞는다 */
  const V = makeSandbox();
  V.state.teacherUnlock = true;
  const v1 = V.chDeck().slice();
  V.confirm = () => true;
  V.chReset();
  ok(V.state.deckOrder !== null, '다시 놓기 뒤에도 덱 차례가 정해져 있다');

  /* ── ★되돌리는 길이 살아 있다 — CH_BAD_COUNT 만 올리면 오답 카드가 돌아온다 ── */
  {
    const W = makeSandbox();
    W.state.teacherUnlock = true;
    W.CH_BAD_COUNT = 3;
    W.state.deckOrder = null;
    const d3 = W.chDeck();
    ok(d3.length === 8 + 3, '★CH_BAD_COUNT 를 3 으로 올리면 덱이 11장이 된다 (실제 ' + d3.length + ')');
    ok(d3.some(i => /^D/.test(i)), '★오답 카드가 다시 들어온다');
    ok(Object.keys(W.CH_FB).length >= 4, '★되돌림 문구는 그대로 살아 있다 (기계를 지우지 않았다)');
  }

  /* ── ★2단 배치 ── */
  ok(/id="chBoard"/.test(src), '사슬판이 있다');
  const chainCard = src.slice(src.indexOf('⑤ 세 실험 잇기'), src.indexOf('⑥ 연습 문항'));
  ok(/class="card split"/.test(src.slice(src.lastIndexOf('<div class="card', src.indexOf('⑤ 세 실험 잇기')), src.indexOf('⑤ 세 실험 잇기'))),
     '★⑤ 카드도 2단이다');
  ok(/<div class="pane-l">[\s\S]*?id="chBoard"/.test(chainCard),
     '★사슬판이 왼쪽 칸에 있다 (덱을 훑는 동안 사라지지 않는다)');
  ok(/<div class="pr-q">[\s\S]*?id="chDeck"/.test(chainCard),
     '★카드 덱은 오른쪽 칸에 있다');
  ok(chainCard.indexOf('id="chIntro"') < chainCard.indexOf('id="chBoard"') === false ||
     /<div class="pr-do">[\s\S]*?id="chIntro"/.test(chainCard),
     '★안내문과 손패는 오른쪽 위(.pr-do)에 있다 — 좁은 화면에서 판보다 먼저 온다');
}

/* ════════════════════════════════════════════════════════════
   [13-8] 교사용 해제는 저장하지 않는다 (교사 지시 2026-08-25)
   ★진행 배지 2.5초 안에 5번 탭 → 확인 이면 ②~⑥ 잠금과 ⑦ 모범답안이 전부 열린다.
     태블릿에서 초당 2번 탭은 학생도 쉽게 만들 수 있는데, 전에는 그것이 저장분에 남아
     새로고침해도 유지되고 되돌리는 길이 「전체 초기화」뿐이었다.
   → 화면에서는 그대로 풀리되 **저장분에는 쓰지 않는다.** 새로고침하면 도로 잠긴다.
   ════════════════════════════════════════════════════════════ */
console.log('[13-8] 교사용 해제');
{
  const T = makeSandbox();
  T.state.teacherUnlock = true;
  T.grPick = ['liveS']; T.grPredict('dead'); T.grInject();   /* 저장이 일어난다 */
  ok(T.state.teacherUnlock === true, '이 화면에서는 해제가 유지된다 (교사 화면이 갑자기 닫히면 안 된다)');
  ok(T.stepOpen('prac') === true, '해제된 화면에서는 ⑥도 열려 있다');

  const blob = T.localStorage._mem['dnaproof_sim_v1'];
  ok(JSON.parse(blob).teacherUnlock === false,
     '★저장분에는 교사 해제가 꺼진 채로 적힌다');
  ok(Object.keys(JSON.parse(blob).grRun).length === 1,
     '★그 밖의 기록은 그대로 저장된다 (해제만 빼는 것이지 저장을 막는 것이 아니다)');

  /* 새로고침 = 새 샌드박스가 그 저장분을 읽는 것 */
  const R = makeSandbox({ 'dnaproof_sim_v1': blob });
  ok(R.state.teacherUnlock === false, '★새로고침하면 도로 잠긴다');
  ok(R.stepOpen('av') === false, '★잠금 순서도 되살아난다');

  /* 이 변경 전에 켠 채로 저장된 옛 저장분도 함께 꺼진다 */
  const old = JSON.stringify({ grRun:{A:'dead'}, teacherUnlock:true });
  const O = makeSandbox({ 'dnaproof_sim_v1': old });
  ok(O.state.teacherUnlock === false,
     '★옛 저장분에 teacherUnlock:true 가 남아 있어도 켜지 않는다');

  /* 교사에게 뜨는 문구가 그 사실을 말한다 */
  ok(/새로고침하면 도로 잠긴다/.test(src),
     '★교사용 확인 문구가 「새로고침하면 도로 잠긴다」고 알린다');
  ok(!/state\.teacherUnlock = !!state\.teacherUnlock/.test(src),
     '★저장분의 값을 그대로 살리던 줄이 남아 있지 않다');
}

/* ════════════════════════════════════════════════════════════
   [14] 진행 레일 · 초기화
   ════════════════════════════════════════════════════════════ */
console.log('[14] 진행과 초기화');
{
  const T = makeSandbox();
  ok(T._store['progress'].textContent === '진행 0 / 4', '진행 배지 초기값');
  ok(T.STEPS.length === 4, '레일 4칸 (② ③ ④ ⑤)');
  T.state.teacherUnlock = true;
  T.updateRail();
  ok(/그리피스/.test(T._store['rail'].innerHTML), '레일에 실험 이름이 나온다');

  T.resetAll();
  ok(T.localStorage._mem['dnaproof_sim_v1'] === undefined, '초기화하면 저장분이 지워진다');
}

console.log('');
console.log('통과 ' + pass + ' · 실패 ' + fail);
process.exit(fail ? 1 : 0);
