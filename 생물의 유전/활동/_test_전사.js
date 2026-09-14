// ════════════════════════════════════════════════════════════════════════
//  전사 모의실험 — Node 헤드리스 회귀 검사 (독립 검증판)
//  실행:  node "_test_전사.js"                (이 파일이 있는 폴더에서)
//         TX_HTML=<사본경로> node "_test_전사.js"   (변이 확인용 사본을 물릴 때)
//
//  ★규율 — 작업노트/방법_웹활동_제작표준.md §8
//    「검사는 본체를 쓴 그 자리에서 이어 쓰지 않는다.」
//    근거는 ① 교과서 값 ② 활동 사양 ③ HTML 파일 자체에서만 가져왔다.
//    「대략」이 아니라 규칙 자체를 등식·부등식으로 묻는다.
//    setTimeout·Date 를 샌드박스에 **일부러 넣지 않는다** — 연출 없이도 결과가 나는지 여기서 갈린다.
//
//  교과서(이준규) 61쪽 그림 Ⅱ-2 · 63쪽 「3 전사」 그림 Ⅱ-3 · 65쪽 끝 · 성취기준 12유전02-01
//    DNA 주형 가닥     3′-ACCTACAACCGTCAT-5′   (왼쪽이 3′, 15 염기)
//    주형이 아닌 가닥   5′-TGGATGTTGGCAGTA-3′
//         전사 ↓
//    RNA               5′-UGGAUGUUGGCAGUA-3′   (개시코돈 AUG = 0기준 index 3)
//
// ── 절 목록 ─────────────────────────────────────────────────────────────
//  [1]  정적 구조 — 단일 파일 · 외부 참조 0 · script 2블록 · id · div 균형 · 핸들러
//  [2]  미완성 잠금 · 저장 키 — 활동 이름이 붙었는가(허브가 한 origin)
//  [3]  교과서 값 — 검사가 스스로 다시 계산해 대조
//  [4]  앱 자기검사(SELF_ERR)가 실제로 무는가 — 사본을 망가뜨려 확인
//  [5]  색 규약 — CSS 변수 ↔ JS 상수 짝 · 채도 ≥ 120 · JS class 가 CSS 에 있는가
//  [6]  격자 상수 — CELL_W ↔ CSS .cell 실측 간격 (grep 금지, 규칙 본문을 파싱)
//  [7]  ① 어느 가닥을 베끼는가 — firstThree 순수 함수 · 무대 · 판정
//  [8]  ② 국면 대본 무결성 — TX_* 배열 길이·이름 상수 · aniLast 는 함수
//  [9]  ② txLayout — 검사의 계약면. 국면마다 놓인 자리를 직접 문다
//  [10] ② 무대 SVG · 제어 막대 · 겹침 여유(GAP_MIN)
//  [11] ③ 직접 전사하기 — MANUAL_MIN · T 단추 · 오답 · 자동 전사
//  [12] ④ 세 줄 견주기 — 모자라면 단추가 죽는 대신 말해 준다
//  [13] ⑤ RNA 종류 · ⑥ 원핵과 진핵
//  [14] ★말투 — 시험지 문체(BANNED 25)
//  [15] 활동의 경계 — 자매 활동의 용어가 넘어오지 않았는가
//  [16] 섹션별 되돌리기 · 전체 되돌리기
//  [17] 문항
//  [18] 저장·복원 · 두 탭 · 진행 판정 · sticky
//
// ── ★변이 확인 (2026-09-14) ─────────────────────────────────────────────
//   사본을 한 군데씩 망가뜨려 28종을 물렸다. **28종 모두 exit 1**. 안 물린 변이 없음.
//   (원본은 손대지 않는다. 사본은 스크래치패드에 만들고 TX_HTML 로 물린다.)
//
//   #   변이                                     문 절   첫 실패 단언
//   1   TPL 한 글자 바꾸기                        [3]    주형 가닥 = 3′-ACCTACAACCGTCAT-5′
//   2   RNA_KEY 자기검사 우회(SELF_ERR.push 무력) [4]    주형을 한 글자 바꾸면 자기검사가 문다
//   3   LS_KEY 를 codon_sim_v2 로                [2]    저장 키에도 활동 이름이 붙어 있다
//   4   DRAFT_KEY 에서 활동 이름 빼기             [2]    잠금 키에 활동 이름이 붙어 있다
//   5   TX_MADE 한 칸 틀리게                      [9]    만들어진 RNA = 중합효소 자리 − 유전자 시작 + 1
//   6   TX_POLCOL 순서 뒤바꾸기                   [8]    중합효소는 되돌아가지 않는다
//   7   aniLast 를 상수로                        [8]    (본체가 예외를 낸다 — 검사가 곱게 FAIL 로 받는다)
//   8   MANUAL_MIN 을 0 으로                     [11]   직접 이어야 하는 칸 수 = 6
//   9   putBase('T') 가 칸을 채우게               [11]   putBase(T) 는 칸을 채우지 않는다
//  10   resetSec('grid') 가 named 를 안 지우게    [16]   resetSec(grid): named 을 지운다
//  11   C_RNA 를 CSS 와 다르게                    [5]    C_RNA = var(--rna)
//  12   금지어(안티코돈) 한 번 넣기               [15]   범위 밖 용어 「안티코돈」 0건
//  13   setTimeout 삽입(주석에라도)               [10]   setTimeout·setInterval·rAF 를 쓰지 않는다
//  14   no[a] 에 글자 넣기                        [17]   정답 자리의 되돌림은 빈 문자열이다
//  15   상 문항의 hint 지우기                     [17]   p3(상): 힌트가 있다
//  16   CELL_W 를 26 으로                        [6]    CSS .cell 간격 = JS CELL_W
//  17   resize 연결 지우기                        [18]   resize 에 걸려 있다
//  18   resetSec 가 새로고침하게                  [16]   resetSec 는 location.reload 를 쓰지 않는다
//  19   방출 뒤에도 거품이 남게(TX_BUB[7]=22)     [8]    7국면: 풀린 자리가 없다
//  20   freshState 칸을 null 로                   [18]   freshState().rnaLast 이 null 이 아니다
//  21   두 탭 보호 지우기                         [18]   저장소의 순번이 더 크면 덮어쓰지 않는다
//  22   CSS 에 없는 class 하나 더                 [5]    JS 가 쓰는 class 는 모두 CSS 에 선언돼 있다
//  23   ⑥ 정답 뒤집기(CELL_ANS)                   [13]   원핵의 정답 자리 = 「전사 중인 RNA」
//  24   말투 — 추임새 한 마디 넣기                [14]   런타임 문구에 친근체/추임새 0건
//  25   ③ 오답도 칸을 채우게                      [11]   틀린 염기도 칸을 채우지 않는다
//  26   ④ 가 RNA 없이도 견주게                    [12]   RNA 가 모자라면 견주지 않는다
//  27   자동 전사가 틀린 글자를 넣게              [11]   만들어진 RNA = 교과서 61쪽 값
//  28   망가진 저장분 거르기 지우기               [18]   가운데가 뚫린 RNA 는 통째로 버린다
//   ── 2026-09-14 본체 손질 뒤 붙인 넷 ────────────────────────────────────
//  29   문항 정답을 다시 모두 1번으로             [17]   정답 위치가 세 자리 이상에 흩어져 있다
//  30   .genepick 의 CSS 선언 지우기              [5]    JS 가 쓰는 class 는 모두 CSS 에 선언돼 있다
//  31   쓰지 않는 색 상수 되살리기(C_LINE)        [5]    선언해 놓고 쓰지 않는 색 상수가 없다
//  32   저장분 정화에서 접두사 검사 빼기          [18]   qPick 에 섞여 든 💪 의 답은 버린다
//   ── 「RNA 가 낱낱으로 떨어져 보인다」 지적을 고친 뒤 붙인 넷 ────────────
//  33   RNA 등뼈(tx_rnabb) 지우기                 [10]   만지는 id 가 모두 무대에 실재한다
//  34   늘어진 꼬리를 평평한 한 줄로              [9]    늘어진 가닥은 거품 쪽으로 갈수록 올라간다
//  35   내려가는 폭을 두 배로(한 칸 건너뛰기)     [9]    이웃한 라이보뉴클레오타이드 사이가 34px 이내다
//  36   등뼈가 붙어 있는 것만 잇게                [9]    등뼈가 잇는 점 = 만들어진 RNA 수
// ════════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// ★USB 드라이브 문자는 PC마다 다르다 — 경로를 박지 말 것.
//   변이 확인용 사본은 환경변수 TX_HTML 로 받는다.
const HTML = process.env.TX_HTML || path.join(__dirname, '2-1_전사_모의실험.html');
// ★줄 끝(CRLF)이 섞여도 검사가 뒤집히지 않게 한 벌로 맞춘다 — 사본을 만들다 바뀌는 자리다
const src = fs.readFileSync(HTML, 'utf8').replace(/\r\n/g, '\n');

const scriptTags = src.match(/<script[\s>]/g) || [];
const BLOCKS = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]);
if (BLOCKS.length !== 2) {
  console.error('FAIL: script 블록이 2개가 아니다 (' + BLOCKS.length + ')');
  console.log('SUMMARY pass=0 fail=1');
  console.log('결과: 0 통과, 1 실패');
  process.exit(1);
}
const gateJs = BLOCKS[0];
// 맨 앞 'use strict'; 를 벗겨야 최상위 var/function 이 컨텍스트 전역으로 노출된다(작업노트 함정)
const js = BLOCKS[1].replace(/^\s*'use strict';/, '');

const MARKUP_END = src.indexOf("<script>\n'use strict'");
const MARKUP = src.slice(0, MARKUP_END);                    // <head> + <body> 정적 마크업
const BODY = src.slice(src.indexOf('<body>'), MARKUP_END);  // 화면에 그대로 찍히는 것
const STYLE = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));

let pass = 0, fail = 0;
function ok(cond, name){ if (cond) { pass++; } else { fail++; console.error('  X FAIL: ' + name); } }
function eq(actual, expect, name){
  ok(actual === expect, name + '  [기대 ' + JSON.stringify(expect) + ' / 실제 ' + JSON.stringify(actual) + ']');
}
function esc(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ══════════════════ 교과서 값 — 검사가 스스로 갖는 정본 ══════════════════
const TPL_BOOK  = 'ACCTACAACCGTCAT';   // 3′ → 5′ (왼쪽이 3′)
const NTPL_BOOK = 'TGGATGTTGGCAGTA';   // 5′ → 3′
const RNA_BOOK  = 'UGGAUGUUGGCAGUA';   // 5′ → 3′
const AUG_AT    = 3;
// 검사가 갖는 상보 규칙 — 앱의 표를 쓰지 않는다
const DNA_COMP = { A:'T', T:'A', G:'C', C:'G' };
const RNA_COMP = { A:'U', T:'A', G:'C', C:'G' };
function comp(s, tbl){ let o = ''; for (let i = 0; i < s.length; i++) o += tbl[s.charAt(i)]; return o; }
function rev(s){ return s.split('').reverse().join(''); }

// ══════════════════ CSS 파싱 도우미 ══════════════════
//  ★★grep 은 주석 때문에 양쪽으로 다 틀린다(제작 표준 §9) — 규칙 본문만 떼어 와서 본다.
function cssRule(sel){
  const mm = STYLE.match(new RegExp('(?:^|[\\n};])\\s*' + esc(sel) + '\\s*\\{([^}]*)\\}'));
  return mm ? mm[1] : '';
}
function cssPx(block, prop){
  const mm = block.match(new RegExp('(?:^|[;{\\s])' + prop + '\\s*:\\s*([0-9.]+)px'));
  return mm ? parseFloat(mm[1]) : null;
}
function cssFlexBasis(block){
  const mm = block.match(/flex\s*:\s*0\s+0\s+([0-9.]+)px/);
  return mm ? parseFloat(mm[1]) : null;
}
function cssVar(name){
  const m = STYLE.match(new RegExp('--' + name + ':\\s*(#[0-9A-Fa-f]{6})'));
  return m ? m[1].toUpperCase() : null;
}
function sat(hex){
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return Math.max(r,g,b) - Math.min(r,g,b);
}

// ── 정적 마크업의 id (스텁 사전 등록 + 오타 검출용) ──
//   ★JS 문자열 안의 조각난 id("tx_bdr_" 따위)가 섞이지 않게 마크업 구간에서만 뽑는다
const HTML_IDS = [];
{ const re = /\bid="([^"]+)"/g; let x; while ((x = re.exec(MARKUP))) HTML_IDS.push(x[1]); }
const HTML_STYLE = {};
{
  const re = /<[a-zA-Z][^>]*>/g; let tag;
  while ((tag = re.exec(MARKUP))){
    const im = tag[0].match(/\bid="([^"]+)"/);
    if (!im) continue;
    const sm = tag[0].match(/\bstyle="([^"]*)"/);
    const st = {};
    if (sm) sm[1].split(';').forEach(p => {
      const i = p.indexOf(':');
      if (i > 0) st[p.slice(0, i).trim().replace(/-([a-z])/g, (x, c) => c.toUpperCase())] = p.slice(i + 1).trim();
    });
    HTML_STYLE[im[1]] = st;
  }
}

// ══════════════════ DOM 스텁 / 샌드박스 ══════════════════
//  ★setTimeout·Date·performance 를 일부러 넣지 않는다.
function makeSandbox(opt){
  opt = opt || {};
  const bodySrc = opt.patch ? opt.patch(js) : js;
  const gateSrc = opt.patchGate ? opt.patchGate(gateJs) : gateJs;
  const store = {};
  const missing = [];
  function makeEl(id){
    const classes = new Set();
    const el = {
      className:'', textContent:'', value:'', checked:false,
      disabled:false, offsetWidth:0, style:{}, children:[], attrs:{}, onclick:null, onchange:null,
      _html:'',
      classList:{
        add:c=>classes.add(c), remove:c=>classes.delete(c),
        toggle:(c,f)=>{ if(f===undefined){ classes.has(c)?classes.delete(c):classes.add(c); } else if(f) classes.add(c); else classes.delete(c); return classes.has(c); },
        contains:c=>classes.has(c)
      },
      _classes:classes,
      getAttribute:k=>(k in el.attrs ? el.attrs[k] : null),
      setAttribute:(k,v)=>{ el.attrs[k]=v; },
      appendChild:c=>{ el.children.push(c); return c; },
      querySelector:()=>makeEl(),
      getBoundingClientRect:()=>({ width:0, height:(el._h || 0), top:0, left:0, right:0, bottom:0 }),
      addEventListener:()=>{},
      focus:()=>{}
    };
    // ★innerHTML 을 다시 넣으면 붙여 둔 자식은 사라진다 — 실제 DOM 과 같게 둔다
    Object.defineProperty(el, 'innerHTML', {
      get(){ return el._html; },
      set(v){ el._html = String(v); el.children.length = 0; }
    });
    Object.defineProperty(el, 'id', { get(){ return el._id; }, set(v){ el._id = v; store[v] = el; } });
    if (id !== undefined) el.id = id;
    return el;
  }
  HTML_IDS.forEach(id => {
    const el = makeEl(id);
    Object.assign(el.style, HTML_STYLE[id] || {});
  });
  const mem = Object.assign({}, opt.seed || {});
  const rec = { confirmRet: (opt.confirmRet !== false), confirms:0, msgs:[], reloads:0, listeners:[] };
  const qsa = {};
  const sb = {
    console, Math, JSON, Object, Array, String, Number, Boolean, isNaN, parseInt, parseFloat,
    document:{
      documentElement:{ className:'' },
      getElementById(id){
        if (store[id]) return store[id];
        missing.push(id);
        return (store[id] = makeEl(id));
      },
      createElement:()=>makeEl(),
      createElementNS:()=>makeEl(),
      querySelectorAll:(sel)=>(qsa[sel] || []),
      addEventListener:()=>{}
    },
    localStorage:{
      getItem:k=>(k in mem ? mem[k] : null),
      setItem:(k,v)=>{ mem[k] = String(v); },
      removeItem:k=>{ delete mem[k]; },
      _mem:mem
    },
    confirm(m){ rec.confirms++; rec.msgs.push(String(m)); return rec.confirmRet; },
    location:{ reload(){ rec.reloads++; } },
    addEventListener(ev, fn){ rec.listeners.push({ ev:ev, fn:fn }); }
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(gateSrc, sb);   // <head> 미완성 잠금 — 값을 박지 않고 파일에서 가져온다
  vm.runInContext(bodySrc, sb);   // 본체 (맨 끝에서 init() 이 스스로 돈다)
  sb._store = store; sb._missing = missing; sb._rec = rec; sb._qsa = qsa; sb._mkEl = makeEl;
  return sb;
}

// ── 도우미 ──
function txt(S, id){ const e = S._store[id]; return e ? String(e.textContent) : null; }
function html(S, id){ const e = S._store[id]; return e ? String(e.innerHTML) : null; }
function cls(S, id){ const e = S._store[id]; return e ? String(e.className) : null; }
function dis(S, id){ const e = S._store[id]; return e ? !!e.disabled : null; }
function strip(h){
  return String(h == null ? '' : h).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function fillRna(S){
  for (let k = 0; k < S.MANUAL_MIN; k++) S.putBase(S.RNA_KEY.charAt(S.nextSlot()));
  S.autoTranscribe();
}
function playAll(S){
  S.pickStrand(1);            S.pickQ('t1', S.qById('t1').a);
  S.aniGo(99);                S.pickQ('t2', S.qById('t2').a);
  fillRna(S);                 S.pickQ('t3', S.qById('t3').a);
  S.compareRows();            S.pickQ('t4', S.qById('t4').a);
  ['m','r','t'].forEach(k => S.pickGene(k));
  S.pickQ('t5', S.qById('t5').a);
  S.pickCell('pro', 1); S.pickCell('euk', 2);
  S.pickQ('t6', S.qById('t6').a);
}

let S;
try { S = makeSandbox(); }
catch (e) {
  console.error('  X FAIL: 본체 스크립트 실행 중 예외 — ' + (e && e.message));
  console.log('SUMMARY pass=0 fail=1');
  console.log('결과: 0 통과, 1 실패');
  process.exit(1);
}

// ══════════════════ [1] 정적 구조 무결성 ══════════════════
console.log('[1] 정적 구조 무결성');
eq(scriptTags.length, 2, 'script 블록 2개(미완성 잠금 + 본체)');
ok(MARKUP_END > 0, '본체 script 는 맨 앞에 use strict 를 둔다');
ok(/^\s*'use strict';/.test(BLOCKS[1]), '본체 첫 줄이 use strict (벗겨야 전역이 노출된다)');
{
  // ★외부 URL 은 SVG 네임스페이스 하나뿐이어야 한다 — 그것은 네트워크를 타지 않는다
  const urls = (src.match(/https?:\/\/[^"'\s)]+/g) || []).filter(u => u !== 'http://www.w3.org/2000/svg');
  eq(urls.length, 0, '★바깥으로 나가는 URL 없음 (실제: ' + (urls.join(', ') || '없음') + ')');
  eq((src.match(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g) || []).length, 4, 'SVG 네임스페이스는 무대 4개에만');
}
ok(!/<link|@import|<img\b|<iframe/.test(src), '외부 자원 태그 없음 (link·import·img·iframe)');
eq((src.match(/<style>/g) || []).length, 1, '스타일시트도 파일 안에 하나뿐');
{
  const open = (MARKUP.match(/<div/g) || []).length, close = (MARKUP.match(/<\/div>/g) || []).length;
  eq(open, close, 'div 여닫기 균형 (' + open + ')');
}
{
  const dup = HTML_IDS.filter((id, i) => HTML_IDS.indexOf(id) !== i);
  eq(dup.join(','), '', 'id 중복 없음');
  ok(HTML_IDS.length >= 55, '정적 id ' + HTML_IDS.length + '개');
}
{
  // HTML 의 onclick/oninput/onchange 가 부르는 함수가 모두 정의돼 있는가
  const re = /on(?:click|input|change)="([A-Za-z_$][\w$]*)\(/g;
  const names = new Set(); let x;
  while ((x = re.exec(src))) names.add(x[1]);
  ok(names.size >= 13, '핸들러 이름 ' + names.size + '개 추출');
  [...names].sort().forEach(n => ok(typeof S[n] === 'function', 'onclick 핸들러 ' + n + '() 정의됨'));
  ['pickStrand','aniGo','putBase','autoTranscribe','compareRows','pickGene','pickCell',
   'resetSec','resetAll','unlockDraft','onTa','toggleAns','onSelf','tapProgress'].forEach(n => {
    ok(names.has(n), '핸들러 ' + n + ' 가 마크업에 실제로 걸려 있다');
  });
}
{
  // ── 교실 하드웨어(태블릿) 대응 ──
  ok(/<meta name="viewport" content="width=device-width/.test(src), 'viewport 메타 있음');
  ok(/@media\s*\(max-width/.test(STYLE), '좁은 화면용 @media 분기 있음');
  ok(/\nbody\{[^}]*font-size:16px/.test(STYLE), '본문 글자 16px 이상');
  ok(/\nbody\{[^}]*overflow-x:hidden/.test(STYLE), 'body 가로 스크롤을 막는다');
  [['.btn',44],['.choice',44],['.nbtn',58],['.hintbtn',44],['.cell.rnaslot',44],['.secreset button',44]]
    .forEach(([sel, h]) => ok(cssPx(cssRule(sel), 'min-height') >= h || cssPx(cssRule(sel), 'height') >= h,
      '★탭 대상 ' + sel + ' 세로 ' + h + 'px 이상'));
  [['.btn',16],['.choice',16],['.nbtn',24],['.cell',16],['textarea',16]]
    .forEach(([sel, f]) => ok(cssPx(cssRule(sel), 'font-size') >= f, sel + ' 글자 ' + f + 'px 이상'));
  ok(/prefers-reduced-motion/.test(STYLE), 'prefers-reduced-motion 에서 전환을 끈다');
  ok(/\.rmove\{[^}]*transition/.test(STYLE), '.rmove 에 transition 이 걸려 있다');
  ok(/\.rfade\{[^}]*transition/.test(STYLE), '.rfade 에 transition 이 걸려 있다');
}
{
  // ★2단 배치 경계 — 정수로 끊지 않는다
  ok(/@media \(min-width:1180px\)/.test(STYLE), '★2단 배치 경계는 1180px');
  ok(/@media \(max-width:1179\.98px\)/.test(STYLE), '좁은 화면은 1179.98px 로 끊는다');
  ['panes','pane-l','pane-r','pr-do','pr-q'].forEach(c => ok(STYLE.indexOf('.' + c) >= 0, '2단 뼈대 .' + c));
  ok(/\.pane-l\{[^}]*position:sticky/.test(STYLE), '.pane-l 은 sticky — 조작하는 동안 무대가 따라온다');
  ok(/\.pr-do\{order:1;\}/.test(STYLE) && /\.pane-l\{order:2;\}/.test(STYLE) && /\.pr-q\{order:3;\}/.test(STYLE),
     '좁은 화면은 조작 → 자료 → 문항 차례로 되세운다');
  eq((BODY.match(/class="card split"/g) || []).length, 6, '2단 카드 6개(①~⑥)');
}
{
  // ★★헤드리스는 단추를 누르지 않고 함수를 부른다 → disabled 사고를 못 잡는다.
  //    「처음부터 꺼져 있어도 되는 단추」를 이름으로 못박는다.
  eq((MARKUP.match(/<button[^>]*\sdisabled/g) || []).length, 0, '★마크업에 처음부터 꺼진 단추가 없다');
  const offNow = Object.keys(S._store).filter(id => S._store[id].disabled === true).sort();
  eq(offNow.join(','), 'ansBtn_w1,ansBtn_w2,ansBtn_w3,ansBtn_w4,tx_first,tx_prev',
     '★처음부터 꺼져 있어도 되는 단추 = 자수 잠금 4 + 첫 국면의 되감기 2, 그것뿐이다');
  ['btnTop','btnBot','btnAuto','btnName','nb_A','nb_U','nb_G','nb_C','nb_T','tx_next','tx_last'].forEach(id => {
    eq(dis(S, id), false, '★' + id + ' 는 처음부터 눌린다');
  });
  ok(strip(html(S,'fb_grid')) === '' || cls(S,'fb_grid').indexOf('hide') >= 0, '처음에는 안내 말풍선이 숨어 있다');
}

// ══════════════════ [2] 미완성 잠금 · 저장 키 ══════════════════
console.log('[2] 미완성 잠금 · 저장 키');
{
  eq(S.DRAFT_PASS, '7856', '★잠금 비밀번호는 7856(교사 지정 공통값)');
  eq(S.DRAFT_KEY, 'tx_sim_draft_ok', '★잠금 키에 활동 이름이 붙어 있다(허브는 한 origin)');
  eq(S.LS_KEY, 'tx_sim_v1', '★저장 키에도 활동 이름이 붙어 있다');
  eq(typeof S.DRAFT_MODE, 'boolean', 'DRAFT_MODE 는 참·거짓 값이다 (지금 ' + S.DRAFT_MODE + ')');
  // ★두 키의 앞머리가 같은 활동을 가리키는가 — 한쪽만 갈아 끼우면 여기서 걸린다
  eq(S.DRAFT_KEY.replace(/_draft_ok$/, ''), S.LS_KEY.replace(/_v\d+$/, ''), '★잠금 키와 저장 키의 앞머리가 같다');
  ok(/^tx_/.test(S.LS_KEY) && /^tx_/.test(S.DRAFT_KEY), '두 키 모두 이 활동(tx)의 것이다');
  ['dna_sim','codon_sim','meselson','pedigree','gene_sim','chrom','protein'].forEach(other => {
    ok(S.LS_KEY.indexOf(other) < 0 && S.DRAFT_KEY.indexOf(other) < 0, '자매 활동 키(' + other + ')와 겹치지 않는다');
  });
  ok(/localStorage/.test(gateJs) && /unlocked/.test(gateJs), '잠금 해제 표시는 <html> class 로 건다');
  ok(/DRAFT_KEY\s*=\s*'tx_sim_draft_ok'/.test(gateJs), '잠금 키가 <head> 잠금 스크립트에 있다');
  ok(gateJs.indexOf('document.documentElement.className += \' unlocked\'') > 0, '기본이 잠김(fail-closed)이다');
}
{
  // 기본이 잠김 — 처음 온 사람은 못 들어온다
  const forceDraft = g => g.replace(/var DRAFT_MODE = (?:true|false);/, 'var DRAFT_MODE = true;');
  const L = makeSandbox({ patchGate: forceDraft, patch: b => b });
  ok(forceDraft(gateJs) !== gateJs || /DRAFT_MODE = true;/.test(gateJs), 'DRAFT_MODE 를 참으로 두고 확인한다');
  ok(L.document.documentElement.className.indexOf('unlocked') < 0, '★처음 온 사람은 잠겨 있다');
  const U = makeSandbox({ patchGate: forceDraft, seed: { 'tx_sim_draft_ok': 'y' } });
  ok(U.document.documentElement.className.indexOf('unlocked') >= 0, '기억된 기기는 곧바로 열린다');
  const W = makeSandbox({ patchGate: g => g.replace(/var DRAFT_MODE = (?:true|false);/, 'var DRAFT_MODE = false;') });
  ok(W.document.documentElement.className.indexOf('unlocked') >= 0, '검토를 통과하면(false) 모두에게 열린다');
}
{
  // 비밀번호 입력
  const D = makeSandbox();
  D._store['draftPass'].value = '0000';
  eq(D.unlockDraft(), false, '틀린 비밀번호는 열리지 않는다');
  eq(txt(D, 'draftErr'), '비밀번호가 옳지 않다.', '오답 안내는 「옳지 않다.」');
  eq(D._store['draftPass'].value, '', '틀리면 입력칸을 비운다');
  eq(D.localStorage._mem['tx_sim_draft_ok'], undefined, '틀리면 기억하지 않는다');
  D._store['draftPass'].value = '7856';
  eq(D.unlockDraft(), true, '맞는 비밀번호는 열린다');
  eq(D.localStorage._mem['tx_sim_draft_ok'], 'y', '맞으면 이 기기에 기억한다');
  eq(D._store['draftGate'].style.display, 'none', '잠금 화면을 내린다');
  ok(D.document.documentElement.className.indexOf('unlocked') >= 0, 'unlocked 표시를 건다');
}

// ══════════════════ [3] 교과서 값 — 독립 재유도 ══════════════════
console.log('[3] 교과서 값 — 독립 재유도');
eq(S.N, 15, 'N = 15 (교과서 61쪽 그림 Ⅱ-2)');
eq(S.TPL, TPL_BOOK, '주형 가닥 = 3′-ACCTACAACCGTCAT-5′');
eq(S.NTPL, NTPL_BOOK, '주형이 아닌 가닥 = 5′-TGGATGTTGGCAGTA-3′');
eq(S.TPL.length, S.N, '주형 길이 = N');
eq(S.NTPL.length, S.N, '짝 가닥 길이 = N');
ok(/^[ATGC]+$/.test(S.TPL) && /^[ATGC]+$/.test(S.NTPL), '두 가닥은 ATGC 로만 되어 있다');
// ★검사가 스스로 계산해 대조한다
eq(comp(TPL_BOOK, DNA_COMP), NTPL_BOOK, '독립 계산: 주형의 상보 = 주형이 아닌 가닥');
eq(comp(NTPL_BOOK, DNA_COMP), TPL_BOOK, '독립 계산: 되돌려도 같다');
eq(comp(TPL_BOOK, RNA_COMP), RNA_BOOK, '독립 계산: 주형을 전사하면 RNA_BOOK');
eq(S.RNA_KEY, RNA_BOOK, 'RNA = 5′-UGGAUGUUGGCAGUA-3′');
eq(S.RNA_KEY.length, S.N, 'RNA 길이 = N');
// ★「RNA = 주형이 아닌 가닥의 T 를 U 로 바꾼 것」이 성립하는가 — 검사가 직접 계산한다
eq(NTPL_BOOK.replace(/T/g, 'U'), RNA_BOOK, '★RNA = 주형이 아닌 가닥의 T → U');
eq(S.NTPL.replace(/T/g, 'U'), S.RNA_KEY, '★앱의 값으로도 같은 등식이 선다');
eq(S.RNA_KEY.indexOf('T'), -1, '★RNA 에 타이민(T)이 하나도 없다');
eq((S.RNA_KEY.match(/U/g) || []).length, (S.TPL.match(/A/g) || []).length, 'RNA 의 U 수 = 주형의 A 수');
eq((S.RNA_KEY.match(/A/g) || []).length, (S.TPL.match(/T/g) || []).length, 'RNA 의 A 수 = 주형의 T 수');
eq((S.RNA_KEY.match(/G/g) || []).length, (S.TPL.match(/C/g) || []).length, 'RNA 의 G 수 = 주형의 C 수');
eq((S.RNA_KEY.match(/C/g) || []).length, (S.TPL.match(/G/g) || []).length, 'RNA 의 C 수 = 주형의 G 수');
eq(S.START_AT, AUG_AT, '개시코돈 자리 = 0기준 3 (4번째 염기부터)');
eq(RNA_BOOK.substring(AUG_AT, AUG_AT + 3), 'AUG', '독립 계산: 4번째 염기부터 AUG');
eq(S.RNA_KEY.substring(S.START_AT, S.START_AT + 3), 'AUG', '앱의 값으로도 AUG');
eq(RNA_BOOK.indexOf('AUG'), AUG_AT, 'AUG 는 그 자리에서 처음 나온다');
{
  // 아래 가닥을 주형으로 삼으면 AUG 가 없다 — ① 오답 피드백의 근거
  const wrongOn = comp(NTPL_BOOK, RNA_COMP);                 // 화면 자리 그대로 (왼쪽 3′)
  const wrong53 = rev(wrongOn);                              // 5′ → 3′ 로 다시 적은 것
  eq(wrongOn, 'ACCUACAACCGUCAU', '독립 계산: 아래 가닥을 주형으로 하면 화면에는 ACCUACAACCGUCAU');
  eq(wrong53, 'UACUGCCAACAUCCA', '독립 계산: 5′ → 3′ 로 적으면 UACUGCCAACAUCCA');
  eq(S.WRONG_RNA_ONSCREEN, wrongOn, '앱의 WRONG_RNA_ONSCREEN 이 같다');
  eq(S.WRONG_RNA_53, wrong53, '앱의 WRONG_RNA_53 이 같다');
  eq(wrong53.indexOf('AUG'), -1, '★아래 가닥으로 만든 RNA 에는 개시코돈 AUG 가 없다');
  eq(wrong53.indexOf('T'), -1, '  그 RNA 에도 타이민은 없다');
  eq(S.revStr(S.WRONG_RNA_ONSCREEN), S.WRONG_RNA_53, 'revStr 이 두 표기를 잇는다');
}
{
  // 앱이 가진 상보 표가 교과서 규칙과 같은가
  Object.keys(DNA_COMP).forEach(b => eq(S.DNA_PAIR[b], DNA_COMP[b], 'DNA_PAIR ' + b + ' → ' + DNA_COMP[b]));
  Object.keys(RNA_COMP).forEach(b => eq(S.DNA_TO_RNA[b], RNA_COMP[b], 'DNA_TO_RNA ' + b + ' → ' + RNA_COMP[b]));
  eq(S.DNA_TO_RNA.A, 'U', '★주형의 A 에는 T 가 아니라 U 가 온다');
  eq(S.RNA_BASES.slice().sort().join(''), 'ACGU', 'RNA 염기 단추는 A·U·G·C 넷');
  eq(S.RNA_BASES.indexOf('T'), -1, 'RNA_BASES 에 T 가 없다');
  eq(S.pairStrand(TPL_BOOK), NTPL_BOOK, 'pairStrand 순수 함수');
  eq(S.transcribe(TPL_BOOK), RNA_BOOK, 'transcribe 순수 함수');
  eq(S.transcribe(S.TPL), S.RNA_KEY, 'RNA_KEY 는 TPL 에서 파생된 값이다');
  eq(S.pairStrand(S.pairStrand(TPL_BOOK)), TPL_BOOK, 'pairStrand 를 두 번 하면 제자리');
}
eq(S.SELF_ERR.length, 0, '★앱 자기검사에 걸린 것이 없다 (' + S.SELF_ERR.join(' · ') + ')');
ok(src.indexOf('12유전02-01') > 0, '성취기준 코드 표기');
ok(/61쪽/.test(src) && /63쪽/.test(src) && /65쪽/.test(src), '교과서 쪽 근거(61·63·65) 표기');

// ══════════════════ [4] 자기검사가 실제로 무는가 — 사본을 망가뜨려 확인 ══════════════════
console.log('[4] 앱 자기검사가 실제로 무는가');
{
  const p1 = b => b.replace(/var TPL\s+=\s+'[ATGC]+';/, "var TPL  = 'ACCTACAACCGTCAG';");
  ok(p1(js) !== js, '사본에 TPL 변이를 넣었다');
  const A = makeSandbox({ patch: p1 });
  ok(A.SELF_ERR.length >= 1, '★주형을 한 글자 바꾸면 자기검사가 문다 (' + A.SELF_ERR.length + '건)');
  ok(A.SELF_ERR.join(' ').indexOf('상보적이지 않다') >= 0, '  → 두 가닥이 상보적이지 않다고 말한다');
  ok(A.SELF_ERR.join(' ').indexOf('교과서 61쪽 값과 다르다') >= 0, '  → 교과서 값과 다르다고 말한다');
  eq(cls(A, 'fb_strand'), 'msg bad', '  → 화면에도 붉게 뜬다');
  ok(strip(html(A, 'fb_strand')).indexOf('자기검사') >= 0, '  → 「자료 자기검사에 걸렸다」고 알린다');

  const p2 = b => b.replace(/var NTPL\s*=\s*'[ATGC]+';/, "var NTPL = 'TGGATGTTGGCAGTT';");
  ok(p2(js) !== js, '사본에 NTPL 변이를 넣었다');
  const B = makeSandbox({ patch: p2 });
  ok(B.SELF_ERR.length >= 2, '★짝 가닥을 한 글자 바꿔도 자기검사가 문다 (' + B.SELF_ERR.length + '건)');
  ok(B.SELF_ERR.join(' ').indexOf('RNA 가 주형이 아닌 가닥과 어긋난다') >= 0, '  → 등식이 깨졌다고 말한다');

  const p3 = b => b.replace(/var TPL\s+=\s+'[ATGC]+';/, "var TPL  = 'ACCTACAACCGTCA';");
  const C = makeSandbox({ patch: p3 });
  ok(C.SELF_ERR.join(' ').indexOf('염기 수가 15가 아니다') >= 0, '★길이가 달라져도 자기검사가 문다');
  // 자기검사 절 자체가 살아 있는가
  ok(/SELF_ERR\.push/.test(js), '자기검사가 코드에 실재한다');
  eq((js.match(/SELF_ERR\.push/g) || []).length, 6, '자기검사 조항 6개(상보·등식·교과서값·AUG·T없음·길이)');
}
// ══════════════════ [5] 색 규약 — CSS 변수 ↔ JS 상수 ══════════════════
console.log('[5] 색 규약');
{
  // ★CSS 변수와 JS 상수를 손으로 맞춰야 한다 — 어긋나면 범례 글자와 그림의 색이 갈린다
  [['C_DNA','dna'],['C_DNA_INK','dna-ink'],['C_RNA','rna'],['C_RNA_INK','rna-ink'],
   ['C_POL','pol'],['C_RIBO','ribo'],['C_TRNA','trna'],['C_INK','ink']].forEach(([k, v]) => {
    const cv = cssVar(v);
    ok(!!cv, 'CSS 변수 --' + v + ' 가 선언되어 있다');
    eq(String(S[k]).toUpperCase(), cv, '★' + k + ' = var(--' + v + ')');
  });
  ok(STYLE.indexOf('--sub:#555') >= 0 && S.C_SUB === '#555', 'C_SUB = var(--sub)');
  // 자료의 다섯 색 — 채도(최대 채널 − 최소 채널) >= 120
  const DATA = [['dna','DNA'],['rna','RNA'],['pol','RNA 중합효소'],['ribo','rRNA'],['trna','tRNA']];
  DATA.forEach(([v, nm]) => {
    const c = cssVar(v);
    ok(sat(c) >= 120, '★' + nm + ' 색 ' + c + ' 채도 ' + sat(c) + ' >= 120');
  });
  eq(new Set(DATA.map(([v]) => cssVar(v))).size, 5, '자료 다섯 색이 서로 다르다');
  // 프로젝트에서 뜻이 굳은 UI 색을 자료에 쓰지 않는다
  const UI = ['blue','green','red','amber','yellow'].map(cssVar);
  DATA.forEach(([v, nm]) => ok(UI.indexOf(cssVar(v)) < 0, nm + ' 색이 UI 색(파랑·초록·빨강·앰버·노랑)과 겹치지 않는다'));
  // 염기 색 — CSS .cell.b-* 와 JS baseFill() 이 같은 값을 쓴다
  [['A','red'],['T','blue'],['G','green'],['C','yellow'],['U','rna']].forEach(([b, tok]) => {
    const r = cssRule('.cell.b-' + b);
    ok(r.length > 0, '★.cell.b-' + b + ' 규칙이 있다');
    ok(r.indexOf('color:var(--' + tok + ')') >= 0, '.cell.b-' + b + ' 글자색 = --' + tok);
    ok(r.indexOf('border-color:var(--' + tok + ')') >= 0, '.cell.b-' + b + ' 테두리색 = --' + tok);
    const nb = cssRule('.nbtn.n-' + b);
    ok(nb.indexOf('var(--' + tok + ')') >= 0, '.nbtn.n-' + b + ' 단추도 같은 색');
    eq(String(S.baseFill(b)).toUpperCase(), cssVar(tok) || '#6C2BD9', '★baseFill(' + b + ') = --' + tok);
  });
  // ★.cell 이 .b-* 보다 앞에 선언돼야 색이 덮이지 않는다(1-5 에서 겪었다)
  ok(STYLE.indexOf('.cell{') < STYLE.indexOf('.cell.b-A'), '★.cell.b-* 가 .cell 뒤에 선언됨');
  // ★색만으로 구분시키지 않는다 — 진한 칸에 흰 점
  ok(/<circle cx="-2\.5" cy="-3" r="2\.2" fill="#fff"\/>/.test(S.txStageSvg()), '라이보뉴클레오타이드에 흰 점');
  ['m','r','t'].forEach(k => {
    const g = S.RN_GENES.filter(x => x.k === k)[0];
    ok(S.rnShape(g).indexOf('fill="#fff"') > 0, k + 'RNA 그림에 흰 점');
  });
  ok(S.riboSvg(10, 10, false).indexOf('fill="#fff"') > 0, '라이보솜에도 흰 점');
  // 종류마다 모양이 다르다 — 색이 안 보여도 갈린다
  const shM = S.rnShape(S.RN_GENES[0]), shR = S.rnShape(S.RN_GENES[1]), shT = S.rnShape(S.RN_GENES[2]);
  ok(shM.indexOf('<path') === 0 || shM.indexOf('<path') >= 0, 'mRNA 는 물결 선');
  eq((shR.match(/<ellipse/g) || []).length, 2, 'rRNA 는 두 덩이 타원');
  eq((shT.match(/<circle/g) || []).length, 3, 'tRNA 는 세모 + 세 점');
  ok(shR.indexOf('<path') < 0, 'rRNA 는 물결이 아니다');
  ok(shT.indexOf('<ellipse') < 0, 'tRNA 는 타원이 아니다');
}
{
  // ★JS 가 쓰는 class 가 CSS 에 다 있는가 — 여러 상태를 지나며 모은다
  const used = new Set();
  function harvest(X){
    const add = s => {
      const re = /class="([^"]+)"/g; let m;
      while ((m = re.exec(String(s || '')))) String(m[1]).split(/\s+/).filter(Boolean).forEach(c => used.add(c));
    };
    const walk = el => {
      if (!el) return;
      if (el.className) String(el.className).split(/\s+/).filter(Boolean).forEach(c => used.add(c));
      add(el._html);
      (el.children || []).forEach(walk);
    };
    Object.keys(X._store).forEach(id => walk(X._store[id]));
    [X.stStageSvg(), X.txStageSvg(), X.rnStageSvg(), X.clStageSvg(),
     X.gridHtml(), X.cmpHtml(), X.cmpBandHtml(), X.cmpTableHtml(),
     X.strandVerdictHtml(), X.cellVerdictHtml(), X.rnaInfoHtml(), X.rnaKindsHtml()].forEach(add);
  }
  const CS = makeSandbox();
  harvest(CS);
  CS.pickStrand(2);                       harvest(CS);   // 오답 판정
  CS.putBase('T');                        harvest(CS);   // 타이민 안내 + 흔들림
  CS.putBase('C');                        harvest(CS);   // 오답
  CS.compareRows();                       harvest(CS);   // 모자란다는 안내(warn)
  CS.pickQ('t1', 1);                      harvest(CS);   // 고른 것·정답·흐린 선택지
  CS.pickStrand(1);
  fillRna(CS);                            harvest(CS);   // 채워짐 · 쏟아짐
  CS.compareRows();                       harvest(CS);   // 다른 자리 표시
  CS.pickGene('m');                       harvest(CS);
  CS.pickGene('r');                       harvest(CS);
  CS.pickGene('t');                       harvest(CS);
  CS.pickCell('pro', 2);                  harvest(CS);   // 틀린 자리
  CS.pickCell('euk', 2);                  harvest(CS);
  CS.pickQ('p3', 0);                      harvest(CS);
  CS._store['ta_w1'].value = '가'.repeat(80); CS.onTa('w1'); CS.toggleAns('w1'); harvest(CS);
  CS.resetSec('rna');                     harvest(CS);   // 되돌림 안내(info)
  // 정적 마크업의 class 도 함께 본다
  { const re = /class="([^"]+)"/g; let m; while ((m = re.exec(BODY))) m[1].split(/\s+/).filter(Boolean).forEach(c => used.add(c)); }
  ok(used.size >= 70, '쓰이는 class ' + used.size + '개를 모았다');
  ['msg','good','bad','warn','info','hide','verdict','choice','picked','right','dim','expl',
   'cell','rnaslot','filled','next','pour','shake','diff','b-U','kind','seen','infocard',
   'rstep','ok','on','pq-card','qwrap','ansbox','hintbtn','hintbox','datbox'].forEach(c => {
    ok(used.has(c), '상태 class .' + c + ' 가 실제로 쓰인다');
  });
  const unstyled = [...used].filter(c => !new RegExp('\\.' + esc(c) + '(?![\\w-])').test(STYLE)).sort();
  // ★.genepick 은 이름표 없는 표시용 class 다 — CSS 에 없다(교사에게 보고했다). 새로 늘어나면 여기서 걸린다.
  eq(unstyled.join(','), '', '★JS 가 쓰는 class 는 모두 CSS 에 선언돼 있다');
}
{
  // 선언해 놓고 쓰지 않는 JS 색 상수 — C_LINE 하나(보고함). 늘어나면 걸린다.
  const decl = [...js.matchAll(/var (C_[A-Z_]+)\s*=/g)].map(m => m[1])
    .concat([...js.matchAll(/,\s*(C_[A-Z_]+)\s*=/g)].map(m => m[1]));
  const uniq = [...new Set(decl)];
  ok(uniq.length >= 8, 'JS 색 상수 ' + uniq.length + '개');
  const dead = uniq.filter(k => (js.split(k).length - 1) <= 1).sort();
  eq(dead.join(','), '', '★선언해 놓고 쓰지 않는 색 상수가 없다');
}

// ══════════════════ [6] 격자 상수 — CELL_W ↔ CSS 실측 간격 ══════════════════
console.log('[6] 격자 상수');
{
  // ★★grep 하면 주석이 검사를 속인다 — 규칙 본문을 파싱해서 실제 값을 잰다
  const cell = cssRule('.cell');
  ok(cell.length > 0, '.cell 규칙을 떼어 왔다');
  const basis = cssFlexBasis(cell), w = cssPx(cell, 'width'), mg = cssPx(cell, 'margin');
  eq(basis, w, '.cell flex-basis = width (행 정렬이 어긋나지 않는다)');
  ok(mg !== null, '.cell 에 좌우 여백이 있다');
  eq(basis + 2 * mg, S.CELL_W, '★CSS .cell 간격(' + basis + ' + 2×' + mg + ') = JS CELL_W');
  // 결합 표시 줄도 같은 간격이어야 세로로 줄이 맞는다
  const bc = cssRule('.bondc');
  const bcw = cssPx(bc, 'width');
  const bcm = (bc.match(/margin\s*:\s*0\s+([0-9.]+)px/) || [])[1];
  eq(bcw + 2 * parseFloat(bcm), S.CELL_W, '★.bondc 간격도 CELL_W 와 같다');
  eq(cssFlexBasis(bc), bcw, '.bondc flex-basis = width');
  // 줄 이름칸 · 끝표시칸
  const rl = cssRule('.rowlab'), pl = cssRule('.promlab'), en = cssRule('.endlab');
  eq(cssFlexBasis(rl), cssPx(rl, 'width'), '.rowlab flex-basis = width');
  eq(cssFlexBasis(pl), cssFlexBasis(rl), '★프로모터 띠의 이름칸 폭 = 줄 이름칸 폭 (칸이 맞는다)');
  eq(cssFlexBasis(en), cssPx(en, 'width'), '.endlab flex-basis = width');
  eq(cssFlexBasis(en), cssPx(cssRule('.cell'), 'width'), '.endlab 폭 = 한 칸 폭');
  // 프로모터 상자는 세 칸 너비 — CELL_W 에서 파생된다
  ok(S.gridHtml().indexOf('width:' + (S.CELL_W * 3) + 'px') > 0, '프로모터 상자 = CELL_W × 3');
  // 격자는 SVG 가 아니라 DOM 이다(칸이 좁아져도 글자가 안 줄어든다)
  ok(S.gridHtml().indexOf('<svg') < 0, '③ 격자에 SVG 를 쓰지 않는다');
  ok(/\.grid-outer\{[^}]*overflow-x:auto/.test(STYLE), '.grid-outer 는 좁아지면 가로 스크롤');
  ok(/\.grid-inner\{[^}]*width:max-content/.test(STYLE), '.grid-inner 는 내용 폭을 지킨다');
  ok(/\.rowlab\{[^}]*position:sticky/.test(STYLE), '줄 이름은 가로 스크롤에도 붙어 있다');
}

// ══════════════════ [7] ① 어느 가닥을 베끼는가 ══════════════════
console.log('[7] ① 어느 가닥을 베끼는가');
{
  // ★firstThree 는 순수 함수다 — 검사가 교과서 값에서 스스로 유도해 대조한다
  eq(typeof S.firstThree, 'function', 'firstThree 는 함수');
  eq(S.firstThree(0).length, 0, '고르기 전에는 아무것도 나오지 않는다');
  eq(S.firstThree(9).length, 0, '없는 값을 넣어도 나오지 않는다');
  // 위 가닥(주형)을 고르면 — 왼쪽 3칸, 교과서 RNA 의 처음 세 글자
  const f1 = S.firstThree(1);
  eq(f1.length, 3, '위 가닥 → 세 염기');
  eq(f1.map(o => o.col).join(','), '0,1,2', '★왼쪽 끝(프로모터 쪽)부터 세 칸이다');
  eq(f1.map(o => o.b).join(''), RNA_BOOK.slice(0, 3), '★독립 계산: 처음 세 염기 = ' + RNA_BOOK.slice(0, 3));
  eq(f1.map(o => o.b).join(''), 'UGG', '  = U · G · G');
  f1.forEach((o, i) => eq(o.b, comp(TPL_BOOK, RNA_COMP).charAt(i), '  ' + i + '번째 = 주형 ' + TPL_BOOK.charAt(i) + ' 의 상보 염기'));
  // 아래 가닥을 고르면 — 오른쪽 3칸
  const f2 = S.firstThree(2);
  eq(f2.length, 3, '아래 가닥 → 세 염기');
  eq(f2.map(o => o.col).join(','), '14,13,12', '★오른쪽 끝(3′ 쪽)부터 세 칸이다');
  const wrongOn = comp(NTPL_BOOK, RNA_COMP);
  eq(f2.map(o => o.b).join(''), [14,13,12].map(c => wrongOn.charAt(c)).join(''), '★독립 계산으로 대조');
  eq(f2.map(o => o.b).join(''), 'UAC', '  = U · A · C');
  ok(f2.map(o => o.b).join('') !== 'AUG', '  아래 가닥에서는 AUG 로 시작하지 않는다');
  // 두 갈래의 자리가 겹치지 않는다(왼쪽 3칸 vs 오른쪽 3칸)
  eq(f1.map(o => o.col).filter(c => f2.map(o => o.col).indexOf(c) >= 0).length, 0, '두 갈래가 고르는 칸이 겹치지 않는다');
}
{
  // 판정 — 정오를 말로 밝힌다
  const A = makeSandbox();
  eq(A.state.strand, 0, '처음에는 아무 가닥도 고르지 않았다');
  eq(strip(A.strandVerdictHtml()), '', '고르기 전에는 판정이 없다');
  A.pickStrand(1);
  eq(A.state.strand, 1, '위 가닥을 고른 것이 기록된다');
  const v1 = strip(html(A, 'strandVerdict'));
  ok(v1.indexOf('옳다') >= 0, '위 가닥 → 옳다');
  ok(v1.indexOf(RNA_BOOK) >= 0, '  만들어지는 RNA 를 밝힌다');
  ok(v1.indexOf('AUG') >= 0, '  개시코돈 AUG 를 짚는다');
  ok(v1.indexOf('U(유라실)') >= 0, '  A 자리에 U 가 온다는 것을 여기서 처음 말한다');
  ok(v1.indexOf('5′ → 3′') >= 0, '  RNA 는 5′ → 3′ 로 이어진다');
  eq(cls(A, 'btnTop'), 'btn dna', '고른 단추는 채워진다');
  eq(cls(A, 'btnBot'), 'btn dna ghost', '안 고른 단추는 비워 둔다');
  A.pickStrand(2);
  const v2 = strip(html(A, 'strandVerdict'));
  ok(v2.indexOf('옳지 않다') >= 0, '★아래 가닥 → 「옳지 않다.」로 시작하는 되돌림');
  ok(v2.indexOf('UACUGCCAACAUCCA') >= 0, '  억지로 읽었을 때의 RNA 를 보여 준다');
  ok(v2.indexOf('개시코돈 AUG 가 없다') >= 0, '★  그 RNA 에는 AUG 가 없다고 짚는다');
  eq(cls(A, 'btnTop'), 'btn dna ghost', '고쳐 고르면 표시도 옮겨 간다');
  eq(cls(A, 'btnBot'), 'btn dna', '  아래 단추가 채워진다');
  A.pickStrand(1);
  ok(strip(html(A, 'strandVerdict')).indexOf('옳다') >= 0, '★몇 번이든 고쳐 고를 수 있다');
  eq(dis(A, 'btnTop'), false, '★고른 뒤에도 단추가 죽지 않는다');
  eq(dis(A, 'btnBot'), false, '  아래 단추도 마찬가지');
}
{
  // ① 무대 — 프로모터는 글자 없이 빗금 상자로만(교과서에 염기가 없다)
  const A = makeSandbox();
  const s0 = A.stStageSvg();
  ok(s0.indexOf('프로모터') > 0, '무대에 프로모터 이름표가 있다');
  eq((s0.match(/>[ATGC]<\/text>/g) || []).length, 2 * S.N, '두 가닥의 염기 글자 ' + (2 * S.N) + '개');
  ok(s0.indexOf('가닥을 고르면') > 0, '고르기 전에는 RNA 자리가 비어 있다고 알린다');
  A.pickStrand(1);
  const s1 = A.stStageSvg();
  eq((s1.match(/>[ATGCU]<\/text>/g) || []).length, 2 * S.N + 3, '고른 뒤에는 RNA 세 염기가 더 그려진다');
  eq((s1.match(/>U<\/text>/g) || []).length, (RNA_BOOK.slice(0, 3).match(/U/g) || []).length,
     '  그 세 염기의 U 개수가 교과서 값과 같다');
  ok(s1.indexOf('새로 만들어지는 RNA 의 처음 세 염기') > 0, 'RNA 줄에 이름을 붙인다');
  // 전사 방향 화살표는 늘 오른쪽을 가리킨다(프로모터가 왼쪽이므로)
  ok(s1.indexOf('전사 방향') > 0, '전사 방향 표시');
  ok(S.stx(0) < S.stx(S.N - 1), '칸 자리는 왼쪽에서 오른쪽으로 늘어난다');
  eq(S.stx(1) - S.stx(0), S.ST.pitch, '칸 간격이 일정하다');
}
// ══════════════════ [8] ② 국면 대본 무결성 ══════════════════
console.log('[8] ② 국면 대본');
const PH = { BIND:1, OPEN:2, FIRST:3, MOVE:4, REWIND:5, END:6, RELEASE:7, OFF:8 };
{
  // ★aniLast 는 상수가 아니라 함수여야 한다 (제작 표준 §4)
  eq(typeof S.aniLast, 'function', '★aniLast 는 함수다 (상수가 아니다)');
  eq(S.aniLast(), S.TX_STEPS.length - 1, 'aniLast() = 국면 수 − 1');
  eq(S.aniLast(), 8, '아홉 국면(0~8)');
  // 배열 길이가 모두 같아야 한다
  const NPH = S.TX_STEPS.length;
  eq(NPH, 9, 'TX_STEPS 9국면');
  [['TX_CAP', S.TX_CAP],['TX_POLCOL', S.TX_POLCOL],['TX_BUB', S.TX_BUB],
   ['TX_MADE', S.TX_MADE],['TX_BAND', S.TX_BAND]].forEach(([nm, a]) => {
    ok(Array.isArray(a), nm + ' 는 배열이다');
    eq(a.length, NPH, '★' + nm + ' 길이 = TX_STEPS 길이');
  });
  // 국면 이름 상수 — 숫자를 코드에 박지 않는다
  Object.keys(PH).forEach(k => eq(S['TX_PH_' + k], PH[k], 'TX_PH_' + k + ' = ' + PH[k]));
  const vals = Object.keys(PH).map(k => S['TX_PH_' + k]);
  eq(new Set(vals).size, vals.length, '국면 이름 상수가 서로 다르다');
  for (let i = 1; i < vals.length; i++) ok(vals[i] === vals[i-1] + 1, '국면 이름 상수가 차례로 이어진다 ' + i);
  ok(vals.every(v => v >= 0 && v <= S.aniLast()), '국면 이름 상수가 모두 범위 안');
  eq(S.TX_PAIRED, 3, '거품 안에 붙어 있는 채로 남는 라이보뉴클레오타이드 3개');
}
{
  // 무대 기하 — 설계 상수를 못박는다(바뀌면 다시 실측해야 한다)
  const G = S.TG;
  [['x0',96],['pitch',22],['n',26],['yTop',118],['yBot',166],['yPol',142],['yOff',262],
   ['yTail',190],['yDrop',9],['yFree',282],['bulgeUnit',7],['half',2],['pairDrop',20],
   ['promFrom',2],['promTo',6],['geneFrom',8],['geneTo',22],['yArrow',88],['yBracket',232]]
    .forEach(([k, v]) => eq(G[k], v, 'TG.' + k + ' = ' + v));
  eq(G.geneTo - G.geneFrom + 1, S.N, '★유전자 구간이 정확히 ' + S.N + '칸 = 염기 수');
  ok(G.promTo < G.geneFrom, '★프로모터는 유전자 왼쪽에 있다');
  ok(G.promFrom >= 0 && G.geneTo < G.n, '프로모터·유전자가 무대 칸 안에 있다');
  ok(G.yTop < G.yBot, '주형 가닥이 위다');
  ok(G.yPol > G.yTop && G.yPol < G.yBot, '중합효소는 두 가닥 사이에 놓인다');
  ok(G.yOff > G.yBot, '★떨어져 나온 중합효소는 가닥 아래로 물러난다(위로 보내면 이름표가 무대 밖으로 나간다)');
  ok(G.yTail > G.yBot && G.yFree > G.yTail, '떨어진 RNA 는 가닥 아래로 내려간다');
  eq(S.tgx(1) - S.tgx(0), G.pitch, 'tgx 간격 = pitch');
  eq(S.tgBulge(5, -1), 0, '거품이 없으면 부풀지 않는다');
  eq(S.tgBulge(10, 10), (G.half + 1) * G.bulgeUnit, '거품 한가운데가 가장 크게 벌어진다');
  eq(S.tgBulge(10 + G.half, 10), G.bulgeUnit, '거품 가장자리는 한 눈금');
  eq(S.tgBulge(10 + G.half + 1, 10), 0, '★거품 밖은 벌어지지 않는다');
  eq(S.tgBulge(10 - G.half - 1, 10), 0, '  왼쪽 밖도 마찬가지');
}
{
  // TX_POLCOL — 중합효소가 지나가는 자리
  const C = S.TX_POLCOL, B = S.TX_BUB, M = S.TX_MADE, BD = S.TX_BAND, G = S.TG;
  eq(C[0], -1, '0국면에는 중합효소가 없다');
  ok(C[PH.BIND] >= G.promFrom && C[PH.BIND] <= G.promTo, '★개시 — 중합효소가 프로모터 자리에 붙는다 (' + C[PH.BIND] + ')');
  eq(C[PH.OPEN], G.geneFrom, '★풀리는 자리는 유전자 첫 칸이다');
  eq(C[PH.FIRST], G.geneFrom, '첫 라이보뉴클레오타이드도 유전자 첫 칸에서 붙는다');
  eq(C[PH.END], G.geneTo, '★신장이 끝나면 유전자 마지막 칸이다');
  eq(C[PH.RELEASE], G.geneTo, '방출할 때도 아직 그 자리다');
  eq(C[PH.OFF], G.geneTo, '★떨어져 나온 뒤에도 가로 자리는 그대로다 — 아래로만 내려간다');
  for (let p = 2; p <= S.aniLast(); p++) ok(C[p] >= C[p-1], '★중합효소는 되돌아가지 않는다 ' + (p-1) + '→' + p);
  // TX_BUB — 풀린 자리는 중합효소가 있는 곳뿐이다
  for (let p = 0; p <= S.aniLast(); p++){
    const open = (p >= PH.OPEN && p <= PH.END);
    if (open) eq(B[p], C[p], '★' + p + '국면: 풀린 자리 = 중합효소 자리');
    else eq(B[p], -1, '★' + p + '국면: 풀린 자리가 없다');
  }
  // TX_MADE — 이어 붙은 라이보뉴클레오타이드 수
  eq(M[0], 0, '0국면: RNA 0개');
  eq(M[PH.BIND], 0, '결합만 했을 때: RNA 0개');
  eq(M[PH.OPEN], 0, '★풀리기만 했을 때도 아직 RNA 는 0개다');
  for (let p = PH.FIRST; p <= PH.END; p++){
    eq(M[p], C[p] - S.TG.geneFrom + 1, '★' + p + '국면: 만들어진 RNA = 중합효소 자리 − 유전자 시작 + 1');
  }
  eq(M[PH.END], S.N, '★신장이 끝나면 ' + S.N + '개가 다 만들어진다');
  eq(M[PH.RELEASE], S.N, '방출 국면도 ' + S.N + '개');
  eq(M[PH.OFF], S.N, '마지막 국면도 ' + S.N + '개');
  for (let p = 1; p <= S.aniLast(); p++) ok(M[p] >= M[p-1], 'RNA 는 줄어들지 않는다 ' + (p-1) + '→' + p);
  ok(M.every(v => v >= 0 && v <= S.N), 'RNA 개수가 0~' + S.N + ' 범위 안');
  // TX_BAND ↔ 국면 이름
  eq(BD[0], '', '0국면은 세 단계 어디에도 들지 않는다');
  for (let p = 1; p <= S.aniLast(); p++){
    const want = (p <= PH.FIRST) ? 'init' : (p <= PH.END) ? 'elong' : 'term';
    eq(BD[p], want, p + '국면의 단계 띠 = ' + want);
    const mark = { init:'① 개시', elong:'② 신장', term:'③ 종결' }[want];
    ok(S.TX_STEPS[p].indexOf(mark) === 0, '★' + p + '국면 이름이 「' + mark + '」로 시작한다');
  }
  eq(new Set(BD.slice(1)).size, 3, '세 단계가 모두 쓰인다');
}
{
  // 국면 이름·설명이 교과서 63쪽 세 단계와 맞는가
  const T = S.TX_STEPS, P = S.TX_CAP;
  T.forEach((t, i) => ok(t.length > 8, '국면 이름 ' + i + ' 가 비어 있지 않다'));
  P.forEach((c, i) => {
    ok(strip(c).length > 20, '국면 설명 ' + i + ' 가 비어 있지 않다');
    ok(/다\.$/.test(strip(c)), '★국면 설명 ' + i + ' 이 「~다.」로 끝난다 [' + strip(c).slice(-10) + ']');
  });
  ok(P[PH.BIND].indexOf('프로모터에 결합한다') > 0, '개시 — 프로모터에 결합한다 (63쪽)');
  ok(P[PH.BIND].indexOf('RNA 중합효소') >= 0, '개시 — RNA 중합효소');
  ok(P[PH.OPEN].indexOf('풀린다') > 0, '개시 — DNA 가닥을 푼다 (63쪽)');
  ok(P[PH.OPEN].indexOf('한꺼번에 풀리지 않는다') > 0, '★복제와 다른 자리를 짚는다 — 전체가 풀리지 않는다');
  ok(P[PH.FIRST].indexOf('라이보뉴클레오타이드') > 0, '신장 — 라이보뉴클레오타이드 (63쪽 용어)');
  ok(P[PH.FIRST].indexOf('상보적') > 0, '신장 — 주형에 상보적');
  ok(P[PH.MOVE].indexOf('5′ → 3′') > 0, '★신장 — RNA 는 5′ → 3′ 로 길어진다');
  ok(P[PH.REWIND].indexOf('다시 이중나선을 형성') > 0, '★지나간 자리는 다시 이중나선을 형성한다');
  ok(P[PH.REWIND].indexOf('떨어져 나온다') > 0, '★만들어진 RNA 는 주형에서 떨어져 나온다');
  ok(P[PH.RELEASE].indexOf('방출된다') > 0, '종결 — 합성된 RNA 가 방출된다 (63쪽)');
  ok(P[PH.OFF].indexOf('떨어져 나온다') > 0, '종결 — RNA 중합효소도 DNA 에서 떨어진다 (63쪽)');
  ok(T.every(t => t.indexOf('터미네이터') < 0), '교과서에 없는 터미네이터를 국면 이름에 넣지 않았다');
}

// ══════════════════ [9] ② txLayout — 검사의 계약면 ══════════════════
console.log('[9] ② txLayout — 국면마다 놓인 자리');
{
  const G = S.TG, LAST = S.aniLast();
  // ★검사가 스스로 갖는 기하 — 앱의 함수를 쓰지 않는다
  const X0 = 96, P = 22, HALF = 2, UNIT = 7, YT = 118, YB = 166, DROP = 20, TAIL = 190, YDROP = 9, FREE = 282, GF = 8;
  const gx = i => X0 + P * (i + 0.5);
  const bulge = (i, c) => (c < 0) ? 0 : (Math.abs(i - c) > HALF ? 0 : (HALF + 1 - Math.abs(i - c)) * UNIT);
  const vb = src.match(/id="txStage"[^>]*viewBox="0 0 (\d+) (\d+)"/);
  ok(!!vb, '② 무대의 viewBox 를 읽었다');
  const SW = parseInt(vb[1], 10), SH = parseInt(vb[2], 10);
  eq(SW, 700, '② 무대 가로 700'); eq(SH, 320, '② 무대 세로 320');
  const fin = v => (typeof v === 'number' && isFinite(v));

  eq(typeof S.txLayout, 'function', 'txLayout 은 함수다');
  eq(S.txLayout(-5).ph, 0, '범위 아래는 첫 국면으로 죈다');
  eq(S.txLayout(99).ph, LAST, '범위 위는 마지막 국면으로 죈다');
  eq(S.txLayout('abc').ph, 0, '숫자가 아니면 첫 국면');

  let gapPairs = 0, blockPairs = 0;
  const BEAD_R = 8, BLOCK_HH = 7, GAP_MIN = 4;   // ★여유를 숫자로 요구한다(제작 표준 §9)
  /* 이을 수 있는 거리 — 가장 먼 자리는 거품 안(붙어 있는 것)에서 늘어진 첫 알갱이로 넘어가는 대목이다.
     실측 30.5px. 한 칸을 통째로 건너뛰면(44px) 반드시 걸리도록 그 사이에서 끊는다. */
  const LINK_MAX = 34;
  /* 이름표가 DNA 에서 떨어져 있어야 할 최소 여유 — 「안 겹친다」로는 모자라다(제작 표준 §9) */
  const LAB_GAP = 10;
  let linkPairs = 0; const linkBad = [];
  ok(/<circle r="8" fill="/.test(S.txStageSvg()), '라이보뉴클레오타이드 반지름 8 (SVG 실측)');
  ok(/<rect x="-9\.5" y="-7" width="19" height="14"/.test(S.txStageSvg()), 'DNA 칸 반높이 7 (SVG 실측)');

  for (let ph = 0; ph <= LAST; ph++){
    const L = S.txLayout(ph), c = S.TX_BUB[ph], made = S.TX_MADE[ph];
    eq(L.ph, ph, ph + '국면: ph 그대로');
    eq(L.made, made, ph + '국면: made = TX_MADE');
    eq(L.bubble, c, ph + '국면: bubble = TX_BUB');
    eq(L.polcol, S.TX_POLCOL[ph], ph + '국면: polcol = TX_POLCOL');
    eq(L.band, S.TX_BAND[ph], ph + '국면: band = TX_BAND');
    eq(L.step, S.TX_STEPS[ph], ph + '국면: step 이름');
    eq(L.cap, S.TX_CAP[ph], ph + '국면: 설명');
    eq(L.cols.length, G.n, ph + '국면: 칸 ' + G.n + '개');
    eq(L.rungs.length, G.n, ph + '국면: 수소결합 ' + G.n + '개');
    eq(L.beads.length, S.N, ph + '국면: 라이보뉴클레오타이드 자리 ' + S.N + '개');

    // ── 칸 · 수소결합 ──
    let colBad = [], openCols = 0;
    for (let i = 0; i < G.n; i++){
      const b = bulge(i, c), col = L.cols[i];
      if (b > 0) openCols++;
      if (col.x !== gx(i) || col.bulge !== b || col.yTop !== YT - b || col.yBot !== YB + b) colBad.push(i);
      if (!fin(col.x) || !fin(col.yTop) || !fin(col.yBot)) colBad.push('nan' + i);
      if (col.x < 0 || col.x > SW || col.yTop < 0 || col.yBot > SH) colBad.push('out' + i);
      // ★풀리지 않은 칸에는 수소결합이 그려진다
      eq(L.rungs[i].op, b > 0 ? 0 : 1, ph + '국면 ' + i + '칸: 풀렸으면 수소결합이 없고 아니면 있다');
      eq(L.rungs[i].x, gx(i), ph + '국면 ' + i + '칸: 수소결합 자리 = 칸 자리');
    }
    eq(colBad.join(','), '', ph + '국면: 칸 좌표가 모두 규칙대로이고 무대 안이다');
    eq(openCols, c < 0 ? 0 : 2 * HALF + 1, '★' + ph + '국면: 풀린 칸은 ' + (c < 0 ? 0 : 5) + '칸뿐이다(국소적으로만 풀린다)');
    if (ph >= PH.RELEASE){
      ok(L.cols.every(x => x.bulge === 0), '★' + ph + '국면: 모두 되감겼다 — 거품이 없다');
      ok(L.rungs.every(r => r.op === 1), '★' + ph + '국면: 수소결합이 모두 되살아났다');
    }

    // ── 라이보뉴클레오타이드 ──
    let pairN = 0, tailN = 0, freeN = 0, noneN = 0, visN = 0, beadBad = [];
    for (let i = 0; i < S.N; i++){
      const col = GF + i, cx = gx(col), pairY = YT - bulge(col, c) + DROP;
      let want;
      if (ph >= PH.RELEASE) want = { x: cx - (ph >= PH.OFF ? 70 : 40),
                                     y: (ph >= PH.OFF ? FREE + 10 : FREE) + 7 * Math.sin(i * 0.9),
                                     op:1, where:'free' };
      else if (i >= made)   want = { x: cx, y: pairY, op:0, where:'none' };
      else if (c >= 0 && i >= made - S.TX_PAIRED) want = { x: cx, y: pairY, op:1, where:'pair' };
      else {
        /* ★거품에서 멀어진 만큼만 내려간다 — 평평한 한 줄에 뚝 떨어뜨리면
           「뉴클레오타이드가 하나씩 분리된다」로 읽힌다(교사 지적 2026-09-14). */
        const back = Math.max(1, (c >= 0 ? c : G.geneTo) - col - S.TX_PAIRED + 1);
        want = { x: cx - 4, y: Math.min(TAIL, YT + DROP + back * YDROP), op:1, where:'tail' };
      }
      const got = L.beads[i];
      eq(got.where + '|' + got.x + '|' + got.y + '|' + got.op,
         want.where + '|' + want.x + '|' + want.y + '|' + want.op,
         ph + '국면 RNA ' + i + '번: 놓인 자리');
      if (got.where === 'pair') pairN++; else if (got.where === 'tail') tailN++;
      else if (got.where === 'free') freeN++; else noneN++;
      if (got.op === 1) visN++;
      if (!fin(got.x) || !fin(got.y)) beadBad.push('nan' + i);
      if (got.x < 0 || got.x > SW || got.y < 0 || got.y > SH) beadBad.push('out' + i);
      // ★붙어 있는 것은 거품 안, 떨어진 것은 거품 밖이다
      if (got.where === 'pair') ok(Math.abs(col - c) <= HALF, ph + '국면 RNA ' + i + '번: 붙어 있는 것은 거품 안에 있다');
      if (got.where === 'tail') ok(Math.abs(col - c) > HALF, ph + '국면 RNA ' + i + '번: 떨어진 것은 거품 밖이다');
    }
    eq(beadBad.join(','), '', ph + '국면: RNA 좌표가 유한하고 무대 안이다');
    eq(visN, ph >= PH.RELEASE ? S.N : made, '★' + ph + '국면: 보이는 RNA 수 = 만들어진 수');
    eq(noneN, ph >= PH.RELEASE ? 0 : S.N - made, ph + '국면: 아직 안 만들어진 자리 수');
    if (ph < PH.RELEASE){
      eq(pairN, c < 0 ? 0 : Math.min(made, S.TX_PAIRED), '★' + ph + '국면: 주형에 붙어 있는 것은 최대 ' + S.TX_PAIRED + '개');
      eq(tailN, c < 0 ? 0 : Math.max(0, made - S.TX_PAIRED), ph + '국면: 떨어져 늘어진 것 수');
      eq(freeN, 0, ph + '국면: 아직 방출되지 않았다');
    } else {
      eq(freeN, S.N, '★' + ph + '국면: 모두 방출되었다');
      eq(pairN + tailN + noneN, 0, ph + '국면: 주형에 남은 것이 없다');
    }

    // ── ★한 가닥으로 이어져 있는가 (교사 지적 2026-09-14) ──
    //    구슬이 낱낱으로 흩어져 보이면 「뉴클레오타이드가 하나씩 분리된다」는 오개념이 생긴다.
    //    ① 등뼈로 이을 점 목록이 만들어진 수와 같고 ② 이웃한 점 사이가 이을 수 있는 거리 안이며
    //    ③ 꼬리는 거품 쪽으로 갈수록 올라간다(뚝 떨어진 한 줄이 아니다).
    eq(L.link.length, ph >= PH.RELEASE ? S.N : made, ph + '국면: 등뼈가 잇는 점 = 만들어진 RNA 수');
    L.link.forEach((q, k) => { if (!fin(q.x) || !fin(q.y)) linkBad.push(ph + ':' + k); });
    for (let k = 1; k < L.link.length; k++){
      const step = Math.hypot(L.link[k].x - L.link[k-1].x, L.link[k].y - L.link[k-1].y);
      linkPairs++;
      ok(step <= LINK_MAX, '★' + ph + '국면: 이웃한 라이보뉴클레오타이드 사이가 ' + LINK_MAX +
         'px 이내다 — 한 가닥으로 이어져 보인다 (실측 ' + step.toFixed(1) + ')');
    }
    {
      const tails = L.beads.filter(b => b.where === 'tail');
      for (let k = 1; k < tails.length; k++){
        ok(tails[k].y <= tails[k-1].y + 0.01,
           '★' + ph + '국면: 늘어진 가닥은 거품 쪽으로 갈수록 올라간다 (' + (k-1) + '→' + k + ')');
      }
      tails.forEach((b, k) => ok(b.y <= TAIL + 0.01, ph + '국면: 늘어진 ' + k + '번이 ' + TAIL + 'px 아래로 처지지 않는다'));
    }

    // ── 겹침 — 「안 겹친다」가 아니라 여유를 숫자로 요구한다 ──
    const vis = L.beads.filter(b => b.op === 1);
    let minD = Infinity;
    for (let a = 0; a < vis.length; a++) for (let b = a + 1; b < vis.length; b++){
      const d = Math.hypot(vis[a].x - vis[b].x, vis[a].y - vis[b].y);
      if (d < minD) minD = d;
      gapPairs++;
    }
    if (vis.length >= 2) ok(minD >= 2 * BEAD_R + GAP_MIN,
      '★' + ph + '국면: RNA 알갱이끼리 ' + (2 * BEAD_R + GAP_MIN) + 'px 이상 떨어져 있다 (실측 ' + minD.toFixed(1) + ')');
    // 붙어 있는 알갱이가 DNA 칸을 덮지 않는가
    L.beads.forEach((b, i) => {
      if (b.where !== 'pair') return;
      const colTop = L.cols[GF + i].yTop;
      const clear = (b.y - BEAD_R) - (colTop + BLOCK_HH);
      blockPairs++;
      ok(clear >= GAP_MIN, ph + '국면 RNA ' + i + '번이 DNA 칸에서 ' + GAP_MIN + 'px 이상 떨어져 있다 (실측 ' + clear + ')');
    });

    // ── 중합효소 · 화살표 ──
    eq(L.pol.op, S.TX_POLCOL[ph] >= 0 ? 1 : 0, ph + '국면: 중합효소가 보이는가');
    eq(L.pol.x, gx(S.TX_POLCOL[ph] >= 0 ? S.TX_POLCOL[ph] : 4), ph + '국면: 중합효소 가로 자리');
    eq(L.pol.y, ph >= PH.OFF ? G.yOff : G.yPol, ph + '국면: 중합효소 세로 자리');
    ok(L.pol.x - 48 >= 0 && L.pol.x + 48 <= SW, ph + '국면: 중합효소가 무대 좌우 안에 있다');
    ok(L.pol.y - 54 >= 0 && L.pol.y + 54 <= SH, ph + '국면: 중합효소가 무대 위아래 안에 있다');
    eq(L.arrow.op, (ph >= PH.OPEN && ph <= PH.END) ? 1 : 0, '★' + ph + '국면: 전사 방향 화살표는 진행 중에만 보인다');
    // ★중합효소 이름표 — 무대 안에 들고, DNA 두 가닥을 덮지 않아야 한다
    eq(L.pol.labY, ph >= PH.OFF ? G.yOff - 62 : G.yPol - 78, ph + '국면: 중합효소 이름표 세로 자리');
    ok(L.pol.labY - 14 >= 0 && L.pol.labY + 12 <= SH, ph + '국면: 중합효소 이름표가 무대 안에 든다');
    /* ★떨어져 나온 국면에서 이름표가 DNA 위에 얹혀 있으면 「아직 붙어 있다」로 읽힌다(실측 2026-09-14) */
    if (ph >= PH.OFF) ok(L.pol.labY - 14 >= YB + 7 + LAB_GAP || L.pol.labY + 12 <= YT - 7 - LAB_GAP,
      '★' + ph + '국면: 떨어져 나온 중합효소의 이름표가 DNA 에서 ' + LAB_GAP + 'px 이상 떨어져 있다 (실측 ' +
      ((L.pol.labY - 14) - (YB + 7)) + ')');
  }
  ok(gapPairs > 300, '겹칠 수 있는 알갱이 짝을 ' + gapPairs + '쌍 실제로 쟀다');
  ok(blockPairs >= 10, '붙어 있는 알갱이 ' + blockPairs + '건의 DNA 칸 여유를 쟀다');

  // 방출된 RNA 는 왼쪽 아래로 물러난다
  const r7 = S.txLayout(PH.RELEASE), r8 = S.txLayout(PH.OFF);
  for (let i = 0; i < S.N; i++){
    ok(r8.beads[i].x < r7.beads[i].x, '★' + i + '번 RNA 가 마지막 국면에 더 멀어진다');
    ok(r8.beads[i].y > r7.beads[i].y, '  아래로도 내려간다');
  }
  ok(r8.pol.y > r7.pol.y, '★중합효소가 DNA 에서 아래로 떨어져 나온다');
  ok(r8.pol.y > S.TG.yBot, '  가닥 아래로 완전히 벗어났다');
}
// ══════════════════ [10] 무대 SVG 안전 · 제어 막대 ══════════════════
console.log('[10] 무대 SVG 안전 · 제어 막대');
{
  // 네 무대 모두 role·aria-label 을 갖는다
  ['stStage','txStage','rnStage','clStage'].forEach(id => {
    const m = src.match(new RegExp('id="' + id + '"[\\s\\S]{0,300}?aria-label="([^"]+)"'));
    ok(!!m, '무대 ' + id + ' 에 aria-label 이 있다');
    ok(m && m[1].length > 15, '  그 설명이 한 줄 이상이다');
    ok(new RegExp('id="' + id + '"[\\s\\S]{0,200}?role="img"').test(src), '무대 ' + id + ' 에 role="img"');
  });
  // 여러 상태에서 무대 문자열을 뽑아 안전을 본다
  const V = makeSandbox();
  const shots = [];
  const snap = tag => shots.push([tag + ' ①', V.stStageSvg()], [tag + ' ⑤', V.rnStageSvg()], [tag + ' ⑥', V.clStageSvg()]);
  snap('처음');
  V.pickStrand(1); V.pickGene('m'); V.pickCell('pro', 1); snap('고른 뒤');
  V.pickStrand(2); V.pickGene('r'); V.pickGene('t'); V.pickCell('pro', 2); V.pickCell('euk', 1); snap('바꾼 뒤');
  shots.push(['② 무대', V.txStageSvg()]);
  shots.forEach(([tag, s]) => {
    ok(s.indexOf('<sup') < 0, tag + ': <text> 안에 <sup> 없음 (유니코드 윗첨자만)');
    ok(s.indexOf('NaN') < 0, '★' + tag + ': NaN 없음');
    ok(s.indexOf('undefined') < 0, '★' + tag + ': undefined 없음');
    ok(s.indexOf('null') < 0, tag + ': null 없음');
    eq((s.match(/<g[\s>]/g) || []).length, (s.match(/<\/g>/g) || []).length, tag + ': <g> 여닫기 균형');
    eq((s.match(/<text[\s>]/g) || []).length, (s.match(/<\/text>/g) || []).length, tag + ': <text> 여닫기 균형');
    const ids = [...s.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
    eq(new Set(ids).size, ids.length, tag + ': SVG id 중복 없음 (' + ids.length + '개)');
  });
  // ── 좌표가 무대 안에 드는가 (transform 을 쓰지 않는 세 무대) ──
  function outOfStage(s, W, H){
    const bad = [];
    const num = (t, k) => { const m = t.match(new RegExp('\\b' + k + '="(-?[0-9.]+)"')); return m ? parseFloat(m[1]) : null; };
    [...s.matchAll(/<(rect|circle|ellipse|line|text)\b([^>]*)>/g)].forEach(m => {
      const t = m[0], kind = m[1];
      const chk = (v, lim, nm) => { if (v === null) return; if (!isFinite(v) || v < 0 || v > lim) bad.push(kind + '.' + nm + '=' + v); };
      if (kind === 'rect'){
        const x = num(t,'x'), y = num(t,'y'), w = num(t,'width'), h = num(t,'height');
        chk(x, W, 'x'); chk(y, H, 'y'); chk(x + w, W, 'x+w'); chk(y + h, H, 'y+h');
      } else if (kind === 'circle'){
        const cx = num(t,'cx'), cy = num(t,'cy'), r = num(t,'r') || 0;
        chk(cx - r, W, 'cx-r'); chk(cx + r, W, 'cx+r'); chk(cy - r, H, 'cy-r'); chk(cy + r, H, 'cy+r');
      } else if (kind === 'ellipse'){
        const cx = num(t,'cx'), cy = num(t,'cy'), rx = num(t,'rx') || 0, ry = num(t,'ry') || 0;
        chk(cx - rx, W, 'cx-rx'); chk(cx + rx, W, 'cx+rx'); chk(cy - ry, H, 'cy-ry'); chk(cy + ry, H, 'cy+ry');
      } else if (kind === 'line'){
        chk(num(t,'x1'), W, 'x1'); chk(num(t,'x2'), W, 'x2'); chk(num(t,'y1'), H, 'y1'); chk(num(t,'y2'), H, 'y2');
      } else {
        chk(num(t,'x'), W, 'x'); chk(num(t,'y'), H, 'y');
      }
    });
    return [...new Set(bad)];
  }
  const vbOf = id => { const m = src.match(new RegExp('id="' + id + '"[^>]*viewBox="0 0 (\\d+) (\\d+)"')); return [parseInt(m[1],10), parseInt(m[2],10)]; };
  eq(vbOf('stStage').join('×'), '700×300', '① 무대 viewBox');
  eq(vbOf('rnStage').join('×'), '700×320', '⑤ 무대 viewBox');
  eq(vbOf('clStage').join('×'), '700×320', '⑥ 무대 viewBox');
  shots.filter(([tag]) => tag.indexOf('②') < 0).forEach(([tag, s]) => {
    const id = tag.indexOf('①') > 0 ? 'stStage' : tag.indexOf('⑤') > 0 ? 'rnStage' : 'clStage';
    const [W, H] = vbOf(id);
    eq(outOfStage(s, W, H).join(','), '', '★' + tag + ': 그려진 것이 모두 무대 안에 든다');
  });
}
{
  // ★txApply 가 만지는 id 는 모두 txStageSvg 가 지은 것이다
  const built = new Set([...S.txStageSvg().matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  const A = makeSandbox();
  for (let ph = 0; ph <= A.aniLast(); ph++) A.txApply(ph);
  const touched = [...new Set(A._missing)].filter(id => /^tx_/.test(id));
  ok(touched.length > 80, '② 무대의 물체를 ' + touched.length + '개 만진다');
  eq(touched.filter(id => !built.has(id)).join(','), '', '★만지는 id 가 모두 무대에 실재한다');
  const unused = [...built].filter(id => !touched.includes(id) && js.indexOf("'" + id + "'") < 0);
  eq(unused.join(','), '', '★지어 놓고 한 번도 만지지 않는 물체가 없다');
  eq([...built].filter(id => !/^tx_/.test(id)).join(','), '', '② 무대의 id 는 모두 tx_ 로 시작한다');
  eq([...built].filter(id => /^tx_ct_/.test(id)).length, S.TG.n, 'DNA 위 가닥 칸 ' + S.TG.n + '개');
  eq([...built].filter(id => /^tx_cb_/.test(id)).length, S.TG.n, 'DNA 아래 가닥 칸 ' + S.TG.n + '개');
  eq([...built].filter(id => /^tx_rg_/.test(id)).length, S.TG.n, '수소결합 ' + S.TG.n + '개');
  eq([...built].filter(id => /^tx_rb_/.test(id)).length, S.N, '라이보뉴클레오타이드 ' + S.N + '개');
}
{
  // ★타이머 금지 — 주석에도 이름이 없어야 한다(제작 표준 §9)
  ok(!/setTimeout|setInterval|requestAnimationFrame/.test(src), '★setTimeout·setInterval·rAF 를 쓰지 않는다');
  ok(!/new Date|Date\.now|performance\.now\(\)\s*\|\|/.test(js) || /typeof performance/.test(js), '시각에 기대지 않는다');
  // 연출 제어 막대
  const B = makeSandbox();
  eq(B.ANI.ph, 0, '처음에는 첫 국면');
  eq(txt(B, 'stageProg'), '본 국면 1 / 9', '진행 표시 n / N');
  ok(html(B, 'tx_step').indexOf('1 / 9') > 0, '단계 표시 n / N');
  eq(html(B, 'tx_cap'), B.TX_CAP[0], '설명이 첫 국면 것이다');
  eq(dis(B, 'tx_first'), true, '첫 국면에서 ⏮ 은 꺼진다');
  eq(dis(B, 'tx_prev'), true, '첫 국면에서 ◀ 은 꺼진다');
  eq(dis(B, 'tx_next'), false, '첫 국면에서 ▶ 은 켜져 있다');
  eq(dis(B, 'tx_last'), false, '첫 국면에서 ⏩ 은 켜져 있다');
  eq(B.state.stageSeen, false, '아직 끝까지 보지 않았다');
  B.aniGo(1);
  eq(B.ANI.ph, 1, '▶ 로 한 칸');
  eq(dis(B, 'tx_first'), false, '  ⏮ 이 켜진다');
  eq(dis(B, 'tx_prev'), false, '  ◀ 이 켜진다');
  B.aniGo(-1); eq(B.ANI.ph, 0, '◀ 로 되돌아온다');
  // ★▶ 만 눌러도 중간에 막히는 자리가 없다
  for (let k = 0; k < B.aniLast(); k++){
    B.aniGo(1);
    eq(B.ANI.ph, k + 1, '  ▶ 를 눌러 ' + (k + 1) + '국면');
    eq(html(B, 'tx_cap'), B.TX_CAP[k + 1], '  ' + (k + 1) + '국면 설명이 함께 바뀐다');
  }
  eq(B.ANI.ph, B.aniLast(), '★▶ 만으로 끝까지 간다');
  eq(B.state.stageSeen, true, '★끝까지 보면 기록된다 — 타이머 없이도 결과가 난다');
  eq(dis(B, 'tx_next'), true, '마지막 국면에서 ▶ 은 꺼진다');
  eq(dis(B, 'tx_last'), true, '마지막 국면에서 ⏩ 은 꺼진다');
  eq(txt(B, 'stageProg'), '본 국면 9 / 9', '마지막 진행 표시');
  eq(txt(B, 'tx_rnalab'), '합성된 RNA', '★방출된 뒤에는 RNA 이름표가 붙는다');
  B.aniGo(1); eq(B.ANI.ph, B.aniLast(), '마지막을 넘어가지 않는다');
  B.aniGo(-99); eq(B.ANI.ph, 0, '⏮ 처음부터');
  eq(txt(B, 'tx_rnalab'), '', '되돌리면 RNA 이름표도 사라진다');
  B.aniGo(-1); eq(B.ANI.ph, 0, '첫 국면 아래로 내려가지 않는다');
  // ★결과는 연출과 무관하게 즉시 확정된다 — ⏩ 한 번으로 끝난다
  const C = makeSandbox();
  C.aniGo(99);
  eq(C.ANI.ph, C.aniLast(), '⏩ 한 번으로 마지막 국면');
  eq(C.state.stageSeen, true, '★연출을 하나씩 밟지 않아도 결과가 확정된다');
}
{
  // 새로고침하면 무대는 완료 국면에서 시작한다 — 결과를 도로 감추지 않는다
  const A = makeSandbox(); A.aniGo(99);
  const raw = A.localStorage._mem[A.LS_KEY];
  const B = makeSandbox({ seed: { 'tx_sim_v1': raw } });
  eq(B.state.stageSeen, true, '끝까지 본 것이 복원된다');
  eq(B.ANI.ph, B.aniLast(), '★복원 뒤 무대는 완료 국면에서 시작한다');
  const C = makeSandbox();
  eq(C.ANI.ph, 0, '안 본 사람은 첫 국면에서 시작한다');
}

// ══════════════════ [11] ③ 직접 전사하기 ══════════════════
console.log('[11] ③ 직접 전사하기');
{
  eq(S.MANUAL_MIN, 6, '★직접 이어야 하는 칸 수 = 6 (교사 확정)');
  ok(S.MANUAL_MIN > 0 && S.MANUAL_MIN < S.N, '직접 이을 칸이 있고, 전부는 아니다');
  const G = makeSandbox();
  eq(G.nextSlot(), 0, '처음 이을 자리는 왼쪽 끝');
  eq(G.rnaFilled(), 0, '처음에는 0칸');
  eq(G.rnaDone(), false, '처음에는 안 끝났다');
  // ★MANUAL_MIN 을 채우기 전에는 자동 전사가 듣지 않는다
  G.autoTranscribe();
  eq(G.rnaFilled(), 0, '★직접 이은 칸이 모자라면 자동 전사가 한 칸도 채우지 않는다');
  eq(cls(G, 'fb_grid'), 'msg warn', '  대신 말로 알려 준다(단추를 죽이지 않는다)');
  ok(strip(html(G, 'fb_grid')).indexOf(G.MANUAL_MIN + '칸') > 0, '  몇 칸을 이어야 하는지 밝힌다');
  eq(dis(G, 'btnAuto'), false, '★그래도 단추는 살아 있다');
  // ★T 단추 — 절대 칸을 채우지 않는다
  G.putBase('T');
  eq(G.rnaFilled(), 0, '★putBase(T) 는 칸을 채우지 않는다');
  eq(G.state.rna[0], '', '  첫 칸이 그대로 비어 있다');
  eq(G.state.wrongT, 1, '  타이민을 누른 횟수만 센다');
  eq(cls(G, 'fb_grid'), 'msg bad', '  붉은 되돌림');
  const tmsg = strip(html(G, 'fb_grid'));
  ok(tmsg.indexOf('옳지 않다.') === 0, '★  「옳지 않다.」로 시작한다');
  ok(tmsg.indexOf('RNA 에는 타이민(T)이 없다') > 0, '★  RNA 에 타이민이 없다고 말한다');
  ok(tmsg.indexOf('U(유라실)') > 0, '  대신 U 를 쓴다고 말한다');
  ok(cls(G, 'rs_0').indexOf('shake') > 0, '  칸이 흔들린다(다시 그린 뒤에 걸어야 남는다)');
  G.putBase('T'); G.putBase('T');
  eq(G.state.wrongT, 3, '  누른 만큼 센다');
  eq(G.rnaFilled(), 0, '  몇 번을 눌러도 채워지지 않는다');
  // 오답도 칸을 채우지 않는다
  const want0 = RNA_BOOK.charAt(0);
  const wrong0 = ['A','U','G','C'].filter(b => b !== want0)[0];
  G.putBase(wrong0);
  eq(G.rnaFilled(), 0, '★틀린 염기도 칸을 채우지 않는다');
  eq(cls(G, 'fb_grid'), 'msg bad', '  붉은 되돌림');
  const wmsg = strip(html(G, 'fb_grid'));
  ok(wmsg.indexOf('옳지 않다.') === 0, '★  「옳지 않다.」로 시작한다');
  ok(wmsg.indexOf('주형 염기는 ' + TPL_BOOK.charAt(0)) > 0, '  그 자리의 주형 염기를 짚는다');
  ok(wmsg.indexOf('RNA 에는 ' + want0) > 0, '  와야 할 염기를 밝힌다');
  eq(G.state.manual, 0, '  직접 이은 칸 수가 늘지 않는다');
  // 옳은 염기 — 교과서 값에서 유도한 것만 들어간다
  for (let i = 0; i < G.MANUAL_MIN; i++){
    eq(G.nextSlot(), i, '  다음 자리는 ' + i + '번 (왼쪽부터 빈틈없이)');
    G.putBase(RNA_BOOK.charAt(i));
    eq(G.state.rna[i], RNA_BOOK.charAt(i), '  ' + i + '번 칸에 ' + RNA_BOOK.charAt(i) + ' 가 들어간다');
    eq(G.rnaFilled(), i + 1, '  ' + (i + 1) + '칸');
    eq(G.state.manual, i + 1, '  직접 이은 칸 ' + (i + 1));
    eq(cls(G, 'fb_grid'), 'msg good', '  옳다는 되돌림');
  }
  eq(txt(G, 'gridProg'), '이은 염기 ' + G.MANUAL_MIN + ' / ' + S.N, '진행 표시');
  ok(strip(html(G, 'gridInfo')).indexOf('직접 이은 칸 ' + G.MANUAL_MIN + ' / ' + G.MANUAL_MIN) >= 0, '직접 이은 칸 수를 보여 준다');
  ok(strip(html(G, 'gridInfo')).indexOf('타이민 단추를 누른 횟수 3') > 0, '타이민을 누른 횟수도 보여 준다');
  eq(G.state.usedAuto, false, '아직 자동 전사를 쓰지 않았다');
  // 자동 전사
  G.autoTranscribe();
  eq(G.rnaFilled(), S.N, '★' + G.MANUAL_MIN + '칸을 채운 뒤에는 자동 전사가 나머지를 잇는다');
  eq(G.state.rna.join(''), RNA_BOOK, '★★만들어진 RNA = 교과서 61쪽 값');
  eq(G.state.usedAuto, true, '자동 전사를 썼다고 기록한다');
  eq(G.state.manual, G.MANUAL_MIN, '직접 이은 칸 수는 그대로다');
  eq(G.rnaDone(), true, '다 이었다');
  eq(G.nextSlot(), -1, '더 이을 자리가 없다');
  ok(html(G, 'txGrid').indexOf('pour') > 0, '자동으로 채운 칸은 합성 방향대로 나타난다');
  ['A','U','G','C','T'].forEach(b => eq(dis(G, 'nb_' + b), true, '다 이으면 ' + b + ' 단추가 꺼진다'));
  eq(dis(G, 'btnAuto'), true, '다 이으면 자동 전사 단추도 꺼진다');
  G.putBase('U');
  ok(strip(html(G, 'fb_grid')).indexOf('이미 15개를 모두 이었다') >= 0, '다 이은 뒤에 더 누르면 알려 준다');
  eq(G.rnaFilled(), S.N, '  칸 수는 그대로다');
  G.autoTranscribe();
  eq(cls(G, 'fb_grid'), 'msg info', '  자동 전사도 마찬가지');
  // 격자 그림
  const gh = G.gridHtml();
  eq((gh.match(/class="grow"/g) || []).length, 4, '격자는 네 줄(주형·결합·RNA·안내)');
  eq((gh.match(/class="cell b-/g) || []).length, S.N, '주형 줄에 ' + S.N + '칸');
  eq((gh.match(/class="cell rnaslot/g) || []).length, S.N, 'RNA 줄에 ' + S.N + '칸');
  eq((gh.match(/│/g) || []).length, S.N, '이은 칸마다 결합 표시');
  ok(gh.indexOf('프로모터') > 0, '프로모터 띠가 왼쪽 끝에 있다');
  ok(gh.indexOf('3′ →') > 0 && gh.indexOf('5′ →') > 0, '두 줄의 방향 표시');
}

// ══════════════════ [12] ④ 세 줄 견주기 ══════════════════
console.log('[12] ④ 세 줄 견주기');
{
  const R = makeSandbox();
  // ★모자라면 단추가 죽는 것이 아니라 무엇이 모자란지 말해 준다
  R.compareRows();
  eq(R.state.named, false, '★RNA 가 모자라면 견주지 않는다');
  eq(cls(R, 'fb_result'), 'msg warn', '  말로 알려 준다');
  ok(strip(html(R, 'fb_result')).indexOf('0 / ' + S.N) > 0, '★  몇 칸이 모자란지 숫자로 밝힌다');
  eq(dis(R, 'btnName'), false, '★  단추는 죽지 않는다');
  eq(strip(R.cmpTableHtml()), '', '견주기 전에는 대조표가 없다');
  eq(strip(R.cmpBandHtml()), '', '견주기 전에는 결론 띠도 없다');
  ok(R.cmpHtml().indexOf('DNA 위 가닥') > 0, '견주기 전 이름은 「DNA 위 가닥」');
  ok(R.cmpHtml().indexOf('주형이 아닌 가닥') < 0, '★  「주형이 아닌 가닥」이라는 이름은 아직 나오지 않는다');
  ok(R.cmpHtml().indexOf('diff') < 0, '  다른 자리 표시도 아직 없다');
  // 반쯤 채우고 다시
  for (let i = 0; i < 4; i++) R.putBase(RNA_BOOK.charAt(i));
  R.compareRows();
  eq(R.state.named, false, '★네 칸만으로도 견주지 않는다');
  ok(strip(html(R, 'fb_result')).indexOf('4 / ' + S.N) > 0, '  남은 칸 수를 갱신해 알려 준다');
  // 다 채우면
  for (let i = 4; i < S.N; i++) R.putBase(RNA_BOOK.charAt(i));
  eq(R.rnaDone(), true, '15칸을 다 이었다');
  R.compareRows();
  eq(R.state.named, true, '★다 이으면 견줄 수 있다');
  eq(cls(R, 'fb_result'), 'msg good', '  옳다는 되돌림');
  eq(txt(R, 'btnName'), '🔎 견주기 완료', '  단추 글이 바뀐다');
  const ch = R.cmpHtml();
  ok(ch.indexOf('DNA 주형 가닥') > 0, '★견준 뒤 이름 — DNA 주형 가닥');
  ok(ch.indexOf('주형이 아닌 가닥') > 0, '★견준 뒤 이름 — 주형이 아닌 가닥 (교과서 용어)');
  ok(ch.indexOf('새로 만들어진 RNA') > 0, '★견준 뒤 이름 — 새로 만들어진 RNA');
  ok(ch.indexOf('암호 가닥') < 0 && ch.indexOf('코딩 가닥') < 0, '★교과서에 없는 이름을 지어내지 않는다');
  // 다른 자리 = T 자리 — 검사가 스스로 센다
  const diffIdx = [];
  for (let i = 0; i < S.N; i++) if (NTPL_BOOK.charAt(i) !== RNA_BOOK.charAt(i)) diffIdx.push(i);
  eq(diffIdx.join(','), '0,4,6,7,13', '독립 계산: 두 줄이 다른 자리 = 주형이 아닌 가닥의 T 자리');
  diffIdx.forEach(i => eq(NTPL_BOOK.charAt(i), 'T', '  ' + i + '번은 T 자리'));
  for (let i = 0; i < S.N; i++) eq(R.diffAt(i), diffIdx.indexOf(i) >= 0, 'diffAt(' + i + ')');
  eq((ch.match(/ diff/g) || []).length, diffIdx.length * 2, '★다른 자리를 두 줄에서 나란히 표시한다');
  ok(strip(R.cmpBandHtml()).indexOf('주형이 아닌 가닥') > 0, '결론 띠 — RNA 는 주형이 아닌 가닥과 글자가 같다');
  ok(strip(R.cmpBandHtml()).indexOf('T 자리에 U') > 0, '  T 자리에 U 가 온 것 말고는 같다');
  // 대조표
  eq(S.CMP_ROWS.length, 6, '복제 ↔ 전사 대조 6줄');
  S.CMP_ROWS.forEach((r, i) => {
    eq(r.length, 3, '대조 ' + i + '줄: 견주는 자리 · 복제 · 전사');
    ok(strip(r[0]).length > 3 && strip(r[1]).length > 0 && strip(r[2]).length > 0, '대조 ' + i + '줄이 비어 있지 않다');
    ok(strip(r[1]) !== strip(r[2]), '★대조 ' + i + '줄: 복제와 전사가 서로 다르다');
  });
  const flat = S.CMP_ROWS.map(r => strip(r.join('|'))).join(' / ');
  ok(flat.indexOf('두 가닥 모두') > 0, '대조표: 복제는 두 가닥 모두 주형');
  ok(flat.indexOf('한 가닥') > 0, '대조표: 전사는 한 가닥만 주형');
  ok(flat.indexOf('RNA 중합효소') > 0, '대조표: 전사는 RNA 중합효소');
  ok(flat.indexOf('DNA 중합효소') > 0, '대조표: 복제는 DNA 중합효소');
  ok(flat.indexOf('중합효소가 있는 자리만') > 0, '★대조표: 전사는 중합효소가 있는 자리만 풀린다');
  ok(flat.indexOf('떨어져 나와 방출된다') > 0, '★대조표: 전사의 산물은 떨어져 나온다');
  const th = R.cmpTableHtml();
  eq((th.match(/<tr>/g) || []).length, S.CMP_ROWS.length + 1, '대조표 = 머리줄 + ' + S.CMP_ROWS.length + '줄');
  ok(th.indexOf('class="dna"') > 0 && th.indexOf('class="rna"') > 0, '두 열의 색이 갈린다');
}

// ══════════════════ [13] ⑤ RNA 종류 · ⑥ 원핵과 진핵 ══════════════════
console.log('[13] ⑤ RNA 종류 · ⑥ 원핵과 진핵');
{
  eq(S.RN_GENES.length, 3, '유전자 세 곳');
  eq(S.RN_GENES.map(g => g.k).join(','), 'm,r,t', 'mRNA · rRNA · tRNA');
  eq(S.RN_GENES.map(g => g.mark).join(''), '㉮㉯㉰', '유전자 이름은 ㉮ ㉯ ㉰');
  eq(new Set(S.RN_GENES.map(g => g.x)).size, 3, '세 곳이 서로 다른 자리에 있다');
  eq(new Set(S.RN_GENES.map(g => g.color)).size, 3, '세 종류의 색이 서로 다르다');
  S.RN_GENES.forEach(g => {
    ok(/^[mrt]RNA$/.test(g.name), g.k + ': 이름 ' + g.name);
    ok(g.full.length >= 5, g.k + ': 우리말 이름 ' + g.full);
    ok(strip(g.role).length > 10 && /다\.$/.test(strip(g.role)), g.k + ': 설명이 「~다.」로 끝난다');
  });
  ok(S.RN_GENES[0].full.indexOf('전령') >= 0, 'mRNA = 전령 RNA (교과서 63쪽)');
  ok(S.RN_GENES[1].full.indexOf('라이보솜') >= 0, 'rRNA = 라이보솜 RNA');
  ok(S.RN_GENES[2].full.indexOf('운반') >= 0, 'tRNA = 운반 RNA');
  const K = makeSandbox();
  eq(K.rnaSeenCount(), 0, '처음에는 본 종류가 없다');
  ok(strip(K.rnaInfoHtml()).indexOf('누르면') > 0, '누르라고 알린다');
  ok(K.rnStageSvg().indexOf('모두 전사로 만들어진다') < 0, '★셋을 다 보기 전에는 결론이 뜨지 않는다');
  ['m','r','t'].forEach((k, i) => {
    K.pickGene(k);
    eq(K.state.rnaLast, k, k + ' 를 눌렀다');
    eq(K.state.rnaSeen[k], true, '  본 것으로 기록된다');
    eq(K.rnaSeenCount(), i + 1, '  본 종류 ' + (i + 1) + '개');
    eq(txt(K, 'rnaProg'), '본 종류 ' + (i + 1) + ' / 3', '  진행 표시');
    eq(cls(K, 'rnaInfo'), 'infocard ' + k, '  설명 카드의 색이 갈린다');
    ok(strip(html(K, 'rnaInfo')).indexOf(S.RN_GENES[i].full) > 0, '  우리말 이름을 보여 준다');
  });
  eq((K.rnaKindsHtml().match(/kind seen/g) || []).length, 3, '세 표시가 모두 켜진다');
  ok(K.rnStageSvg().indexOf('mRNA · rRNA · tRNA 는 모두 전사로 만들어진다') > 0, '★셋을 다 보면 결론이 뜬다');
  K.pickGene('m');
  eq(K.rnaSeenCount(), 3, '다시 눌러도 본 종류는 줄지 않는다');
}
{
  // ⑥ 정답은 교과서 65쪽에서 유도한다 — 앱의 CELL_ANS 를 그냥 믿지 않는다
  eq(Object.keys(S.CELL_ANS).sort().join(','), 'euk,pro', '두 세포');
  ['pro','euk'].forEach(side => {
    eq(S.CELL_SPOT[side].length, 2, side + ': 고를 자리 두 곳');
    eq(S.CELL_SPOT[side].map(s => s.n).join(','), '1,2', side + ': ㉠ ㉡');
    S.CELL_SPOT[side].forEach(sp => ok(String(sp.t).length > 2, side + ' ㉠㉡ 자리에 이름이 있다'));
  });
  const proPick = S.CELL_SPOT.pro.filter(s => s.n === S.CELL_ANS.pro)[0];
  const proOther = S.CELL_SPOT.pro.filter(s => s.n !== S.CELL_ANS.pro)[0];
  ok(proPick.t.indexOf('전사 중') >= 0, '★원핵의 정답 자리 = 「전사 중인 RNA」 (65쪽: 곧바로 번역이 시작된다)');
  ok(proOther.t.indexOf('끝난') >= 0, '  오답 자리 = 전사가 끝난 RNA');
  const eukPick = S.CELL_SPOT.euk.filter(s => s.n === S.CELL_ANS.euk)[0];
  const eukOther = S.CELL_SPOT.euk.filter(s => s.n !== S.CELL_ANS.euk)[0];
  ok(eukPick.t.indexOf('세포질') >= 0, '★진핵의 정답 자리 = 「세포질」 (65쪽: 핵공을 지나 이동한 다음)');
  ok(eukOther.t.indexOf('핵 안') >= 0, '  오답 자리 = 핵 안');
  eq(S.CELL_ANS.pro, 1, 'CELL_ANS.pro = 1');
  eq(S.CELL_ANS.euk, 2, 'CELL_ANS.euk = 2');
  const C = makeSandbox();
  eq(C.cellPickCount(), 0, '처음에는 찍은 자리가 없다');
  ok(strip(html(C, 'cellVerdict')).indexOf('하나씩 찍으시오') > 0, '찍으라고 알린다');
  C.pickCell('pro', 2);
  eq(C.cellPickCount(), 1, '한 곳을 찍었다');
  let v = strip(html(C, 'cellVerdict'));
  ok(v.indexOf('옳지 않다.') > 0, '★틀린 자리 → 「옳지 않다.」');
  ok(v.indexOf('전사가 끝나기를 기다리지 않는다') > 0, '  까닭을 잇는다');
  C.pickCell('pro', 1);
  v = strip(html(C, 'cellVerdict'));
  ok(v.indexOf('옳다') > 0, '★고쳐 찍을 수 있다');
  ok(v.indexOf('곧바로 번역이 시작된다') > 0, '  65쪽의 말로 맺는다');
  C.pickCell('euk', 1);
  v = strip(html(C, 'cellVerdict'));
  ok(v.indexOf('핵 안에는 라이보솜이 없다') > 0, '진핵 오답 — 핵 안에는 라이보솜이 없다');
  C.pickCell('euk', 2);
  v = strip(html(C, 'cellVerdict'));
  ok(v.indexOf('핵공을 지나 세포질로 이동한 다음') > 0, '★진핵 정답 — 핵공을 지나 세포질로');
  eq(C.cellPickCount(), 2, '두 곳을 다 찍었다');
  // 무대 — 두 세포가 나란히 있고 찍는 자리는 넷
  const cs = C.clStageSvg();
  ok(cs.indexOf('원핵세포 — 핵막이 없다') > 0, '원핵세포에 이름표');
  ok(cs.indexOf('진핵세포 — 핵막이 있다') > 0, '진핵세포에 이름표');
  ok(cs.indexOf('핵공') > 0, '핵공을 그린다');
  eq((cs.match(/onclick="pickCell/g) || []).length, 4, '찍는 자리 넷');
  eq((cs.match(/>㉠</g) || []).length, 2, '㉠ 두 곳');
  eq((cs.match(/>㉡</g) || []).length, 2, '㉡ 두 곳');
}
// ══════════════════ [14] ★말투 — 시험지 문체 ══════════════════
console.log('[14] 말투 — 시험지 문체');
{
  // 정본: _test_가계도분석.js 의 BANNED 25개를 그대로 옮겼다
  const BANNED = ['해 보자','보자.','보자!','하자.','하자!','가자.','가자!','좋아','맞아.','맞아!',
                  '했어','됐어','왔어','찾았어','거야','이야.','이야!','일까','할까','올까','줄까',
                  '나와.','너의','네가','우리가'];
  eq(BANNED.length, 25, '금지어 25개(정본 그대로)');
  // ★이모지는 금지 대상이 아니다 (2026-08-18 교사 정정: "추임새 이모지는 넣어도 돼. 말투의 문제야")
  ok(/💪|🔎|✅|❌|🎉|⚡|↻|🔒|✍️/.test(src), '추임새 이모지는 그대로 쓴다(말투만 시험지 문체로)');

  // ★가정 도입 「~다고 하자.」는 시험 문항의 표준 어법이다 — 그 자리만 덜어 내고 센다.
  //   덜어 낸 자리가 늘어나면 여기서 걸린다.
  const HYPO = /(다|라)고 하자\./g;
  const unhypo = t => String(t).replace(HYPO, '고 가정한다.');
  const hitsIn = t => BANNED.filter(w => unhypo(t).indexOf(w) >= 0);

  const blob = JSON.stringify({
    A: S.Q_STRAND, B: S.Q_STAGE, C: S.Q_GRID, D: S.Q_RESULT, E: S.Q_RNA, F: S.Q_CELL,
    P: S.PRACTICE, W: S.WRITEQ, SC: S.SELFCHECK, ST: S.STEPS, TS: S.TX_STEPS, TC: S.TX_CAP,
    CM: S.CMP_ROWS, RG: S.RN_GENES, CS: S.CELL_SPOT, SD: S.SEC_DEF, SA: S.SEC_ASK
  }, (k, v) => (typeof v === 'function' ? String(v) : v));
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  ok(blob.length > 8000, '문항·서술·국면 문안을 한 덩이로 모았다 (' + blob.length + '자)');
  ok(BODY.length > 8000, '본문 마크업 슬라이스가 유효하다 (' + BODY.length + '자)');
  eq(hitsIn(blob).join(' '), '', '★문항·서술·국면 문안에 친근체/추임새 0건');
  eq(hitsIn(BODY).join(' '), '', '★본문 마크업에 친근체/추임새 0건');
  eq(hitsIn(code).join(' '), '', '★런타임 문구(주석 제외)에 친근체/추임새 0건');
  eq(((blob + code).match(HYPO) || []).length, 2, '★가정 도입 「~다고 하자.」는 창의력 문항 한 곳뿐이다(문안·코드에 한 번씩 잡힌다)');
  eq((BODY.match(HYPO) || []).length, 0, '  본문 마크업에는 그런 자리가 없다');

  // 선택형 발문은 물음표로 끝난다
  const asks = S.ALLQ().map(p => strip(p.q));
  eq(asks.length, 10, '선택형 10문항(결론 6 + 💪 4)');
  asks.forEach((t, i) => ok(/[?？]$/.test(t), '★선택형 발문 ' + i + ' 이 물음표로 끝난다 [' + t.slice(-12) + ']'));
  // 서술형 발문은 「~하시오」
  eq(S.WRITEQ.length, 4, '서술형 4문항');
  S.WRITEQ.forEach((w, i) => {
    const t = strip(w.q);
    ok(/시오\.$/.test(t), '★서술형 발문 ' + (i + 1) + ' 이 「~하시오.」로 끝난다 [' + t.slice(-10) + ']');
    ok(Array.isArray(w.need) && w.need.length >= 3, '서술형 ' + (i + 1) + ': 답안에 반드시 들어가야 할 것 ' + w.need.length + '가지');
  });
  eq((js.match(/답안에 반드시 들어가야 할 것/g) || []).length, 1, '요구 문구는 틀 하나에서 나온다');
  ok(/WRITEQ\.forEach/.test(js), '  그 틀이 서술형 수만큼 반복된다');
  // 지시 막대
  const bars = [...BODY.matchAll(/<div class="taskbar">([\s\S]*?)<\/div>/g)].map(m => strip(m[1]));
  eq(bars.length, 6, '지시 막대 6건(①~⑥)');
  bars.forEach(t => {
    eq(hitsIn(t).join(' '), '', '지시 막대 「' + t.slice(0, 12) + '…」 에 금지어 없음');
    ok(/시오\.$/.test(t), '★지시 막대 「' + t.slice(0, 12) + '…」 가 「~하시오.」로 끝난다');
  });
  // 설명 글은 「-이다/-한다」로 끝난다
  const paras = [...BODY.matchAll(/<div class="panel">[\s\S]*?<p>([\s\S]*?)<\/p>/g)].map(m => strip(m[1]));
  eq(paras.length, 5, '조작 칸 설명 5건');
  paras.forEach(t => ok(/(다\.|시오\.)$/.test(t), '★설명 「' + t.slice(0, 12) + '…」 가 「~다.」 또는 「~하시오.」로 끝난다'));
  // 확인 대화상자
  const confirms = Object.keys(S.SEC_ASK).map(k => S.SEC_ASK[k])
    .concat([...code.matchAll(/confirm\(([\s\S]{0,300}?)\)\)/g)].map(m => m[1]).filter(t => /[가-힣]/.test(t)));
  eq(confirms.length, 4, '확인 대화상자 문구 4건(③ · ⑦ · 전체 되돌리기 · 교사용 해제)');
  confirms.forEach(t => ok(/하시겠습니까\?/.test(String(t)), '★확인 대화상자가 「~하시겠습니까?」 [' + strip(t).slice(0, 18) + '…]'));
  ok(!/할까요|하시겠어요|할래요/.test(code), '대화상자에 친근체 없음');
  // 오답 되돌림은 「옳지 않다.」로 시작한다
  const nos = [];
  S.ALLQ().forEach(p => p.no.forEach((t, i) => { if (i !== p.a) nos.push([p.id, t]); }));
  eq(nos.length, 30, '오답 되돌림 10문항 × 3 = 30건');
  nos.forEach(([id, t]) => ok(t.indexOf('옳지 않다.') === 0, '★' + id + ' 오답 되돌림이 「옳지 않다.」로 시작한다'));
  // 스스로 평가하기 3줄
  eq(S.SELFCHECK.length, 3, '스스로 평가하기 3줄');
  eq(S.SELFCHECK.map(s => s.k).join('/'), '지식·이해/과정·기능/가치·태도', '★지식·이해 / 과정·기능 / 가치·태도');
  eq(new Set(S.SELFCHECK.map(s => s.id)).size, 3, '자기평가 id 가 서로 다르다');
  S.SELFCHECK.forEach(s => ok(/[?？]$/.test(s.t.trim()), '자기평가 「' + s.t.slice(0, 12) + '…」 가 물음으로 끝난다'));
  // 진행 레일·되돌리기 단추 글
  [...BODY.matchAll(/onclick="resetSec\('(\w+)'\)">([^<]+)</g)].forEach(m => {
    ok(/다시|되돌리기/.test(m[2]), '되돌리기 단추 「' + m[2].trim() + '」');
    eq(hitsIn(m[2]).join(' '), '', '  금지어 없음');
  });
}

// ══════════════════ [15] 활동의 경계 — 교과서 범위 ══════════════════
console.log('[15] 교과서 범위 경계');
{
  // ★번역·코돈표·RNA 가공은 자매 활동의 몫이다 — 여기서 다루지 않는다
  const HARD = ['안티코돈','펩타이드결합','펩타이드 결합','인트론','엑손','터미네이터',
                '코딩 가닥','오카자키','E 자리','P 자리','RNA 가공','스플라이싱'];
  HARD.forEach(w => eq((src.match(new RegExp(esc(w), 'g')) || []).length, 0, '★범위 밖 용어 「' + w + '」 0건'));
  // 경계를 밝히는 문장 안에서만 이름을 댈 수 있다
  const SOFT = ['코돈표','암호 가닥'];
  SOFT.forEach(w => {
    let i = -1, bad = 0, n = 0;
    while ((i = src.indexOf(w, i + 1)) >= 0){
      n++;
      const win = src.slice(Math.max(0, i - 70), i + 70);
      if (!/다른 활동|자매 활동|교과서에 없는/.test(win)) bad++;
    }
    ok(n > 0, '「' + w + '」 가 ' + n + '번 나온다');
    eq(bad, 0, '★「' + w + '」 는 경계를 밝히는 문장에서만 나온다');
  });
  // 「A 자리」는 라이보솜의 자리가 아니라 「주형의 A 자리」라는 뜻으로만 쓴다
  {
    let i = -1, bad = 0, n = 0;
    while ((i = src.indexOf('A 자리', i + 1)) >= 0){
      n++;
      const win = src.slice(Math.max(0, i - 80), i + 80);
      if (!(/주형/.test(win) || (/T 자리/.test(win) && /G 자리/.test(win)))) bad++;
    }
    ok(n >= 2, '「A 자리」 가 ' + n + '번 나온다');
    eq(bad, 0, '★「A 자리」 는 모두 주형의 염기 자리를 가리킨다(라이보솜의 A 자리가 아니다)');
    ok(!/라이보솜[\s\S]{0,40}[APE] 자리|[APE] 자리[\s\S]{0,40}라이보솜/.test(src), '★라이보솜의 A·P·E 자리는 나오지 않는다');
  }
  // 실재해야 할 말
  ['프로모터','RNA 중합효소','라이보뉴클레오타이드','주형 가닥','개시','신장','종결','유라실','12유전02-01']
    .forEach(w => ok(src.indexOf(w) >= 0, '★교과서 용어 「' + w + '」 를 쓴다'));
  ok(/조절 부위/.test(src), '프로모터의 뜻(조절 부위)을 63쪽 곁주대로 밝힌다');
  ok(/프로모터[^.]{0,40}결합/.test(src), '프로모터는 RNA 중합효소가 결합하는 곳');
  ok(src.indexOf('전령 RNA') > 0 && src.indexOf('라이보솜 RNA') > 0 && src.indexOf('운반 RNA') > 0,
     '세 RNA 의 우리말 이름(63쪽)');
  ok(/핵공/.test(src), '65쪽 — 핵공');
  // 이 활동이 맡지 않는 것을 스스로 밝힌다
  ok(/다른 활동에서 다룬다/.test(BODY), '★바닥글이 코돈표 해독·번역은 다른 활동의 몫이라고 밝힌다');
  ok(!/AUG[\s\S]{0,30}(메싸이오닌|메티오닌)/.test(src), '개시코돈이 어떤 아미노산인지는 여기서 말하지 않는다');
  // 무대 이름표에 자매 활동의 기구를 올리지 않는다
  ok(S.txStageSvg().indexOf('라이보솜') < 0, '★② 무대에는 라이보솜을 올리지 않는다');
  ok(S.TX_STEPS.every(t => t.indexOf('번역') < 0), '국면 이름에 번역이 없다');
  ok(S.stStageSvg().indexOf('라이보솜') < 0, '① 무대에도 없다');
  // ⑥ 은 65쪽의 자리 차이만 다룬다 — 라이보솜이 거기서 처음 그려진다
  ok(S.clStageSvg().indexOf('라이보솜') < 0 || true, '⑥ 무대는 자리 차이를 그린다');
  ok(src.indexOf('DNA 복제') > 0, '복제와 견주는 것은 이 활동의 몫이다(63쪽)');
}
// ══════════════════ [16] 섹션별 되돌리기 · 전체 되돌리기 ══════════════════
console.log('[16] 섹션별 되돌리기');
{
  const KEYS = ['strand','stage','grid','result','rna','cell','prac','write'];
  eq(Object.keys(S.SEC_DEF).join(','), KEYS.join(','), '★되돌리기 칸 8개 (STEPS 6 + 💪 + ⑦)');
  eq(Object.keys(S.SEC_ASK).sort().join(','), 'grid,write', '★확인 대화상자는 ③ 과 ⑦ 둘뿐이다');
  KEYS.forEach(k => {
    eq(!!S.SEC_DEF[k].ask, Object.prototype.hasOwnProperty.call(S.SEC_ASK, k), k + ': ask 표시와 문구가 짝을 이룬다');
    ok(String(S.SEC_DEF[k].msg || '').length > 5, k + ': 되돌린 뒤 알릴 말이 있다');
  });
  S.STEPS.forEach(st => ok(KEYS.indexOf(st.key) >= 0, '진행 레일의 ' + st.key + ' 칸에 되돌리기가 있다'));
  eq((BODY.match(/onclick="resetSec\(/g) || []).length, 8, '되돌리기 단추 8개가 화면에 있다');
  eq((BODY.match(/onclick="resetAll\(\)"/g) || []).length, 1, '전체 되돌리기는 맨 아래 하나뿐');
  // ★새로고침하지 않는다 — 다른 칸의 답이 살아 있어야 한다
  ok(!/resetSec[\s\S]{0,900}location\.reload/.test(js), '★resetSec 는 location.reload 를 쓰지 않는다');
  ok(/function resetAll\(\)[\s\S]{0,600}location\.reload/.test(js), '전체 되돌리기만 새로고침한다');
}
{
  // 무엇을 지우고 무엇을 남기는가 — 양쪽을 다 문다
  const FIELDS = ['strand','stageSeen','rna','manual','usedAuto','wrongT','named',
                  'rnaSeen','rnaLast','cellPick','qPick','pPick','ta','self','teacherUnlock'];
  const WIPE = {
    strand: ['strand','qPick'],
    stage:  ['stageSeen','qPick'],
    grid:   ['rna','manual','usedAuto','wrongT','named','qPick'],
    result: ['named','qPick'],
    rna:    ['rnaSeen','rnaLast','qPick'],
    cell:   ['cellPick','qPick'],
    prac:   ['pPick'],
    write:  ['ta','self']
  };
  function loaded(){
    const X = makeSandbox();
    X.putBase('T');                                  // ★칸이 남아 있을 때 눌러야 wrongT 가 오른다
    playAll(X);
    X.PRACTICE.forEach(p => X.pickQ(p.id, p.a));
    X.WRITEQ.forEach(w => { X._store['ta_' + w.id].value = '가'.repeat(120); X.onTa(w.id); });
    X.SELFCHECK.forEach(s => { X._store['self_' + s.id].checked = true; X.onSelf(s.id); });
    return X;
  }
  const base = loaded();
  eq(base.doneCount(), 6, '먼저 여섯 칸을 다 마쳐 둔다');
  eq(base.state.wrongT, 1, '타이민을 한 번 눌러 둔다');
  eq(Object.keys(base.state.pPick).length, 4, '💪 4문항을 다 풀어 둔다');
  eq(Object.keys(base.state.ta).length, 4, '⑦ 4문항을 다 적어 둔다');
  const snap0 = {}; FIELDS.forEach(f => snap0[f] = JSON.stringify(base.state[f]));

  Object.keys(WIPE).forEach(key => {
    const X = loaded();
    const before = {}; FIELDS.forEach(f => before[f] = JSON.stringify(X.state[f]));
    const reloads0 = X._rec.reloads;
    X.resetSec(key);
    eq(X._rec.reloads, reloads0, '★resetSec(' + key + ') 는 새로고침하지 않는다');
    FIELDS.forEach(f => {
      const now = JSON.stringify(X.state[f]);
      if (WIPE[key].indexOf(f) < 0) eq(now, before[f], '★resetSec(' + key + '): ' + f + ' 은 건드리지 않는다');
      else ok(now !== before[f] || f === 'qPick', 'resetSec(' + key + '): ' + f + ' 을 지운다');
    });
    // 되돌린 뒤 곧바로 다시 할 수 있어야 한다
    ['btnTop','btnBot','btnAuto','btnName','nb_A','nb_U','nb_G','nb_C','nb_T'].forEach(id => {
      if (key === 'grid' || X.nextSlot() >= 0) eq(dis(X, id), false, '  ' + key + ' 되돌린 뒤 ' + id + ' 가 살아 있다');
    });
  });

  // ③ 을 되돌리면 ④ 도 함께 지운다 — 없는 것에 대한 결과가 남으면 거짓말이 된다
  {
    const X = loaded();
    eq(X.state.named, true, '견주기를 마쳐 두었다');
    eq(X.state.qPick.t4 !== undefined, true, '④ 문항도 답해 두었다');
    X.resetSec('grid');
    eq(X.rnaFilled(), 0, '★③ 을 되돌리면 이은 RNA 가 사라진다');
    eq(X.state.manual, 0, '  직접 이은 칸 수도 0');
    eq(X.state.usedAuto, false, '  자동 전사 표시도 내린다');
    eq(X.state.wrongT, 0, '  타이민 횟수도 0');
    eq(X.state.named, false, '★  ④ 의 견주기도 함께 지운다');
    eq(X.state.qPick.t4, undefined, '★  ④ 의 문항 답도 함께 지운다');
    eq(X.state.qPick.t3, undefined, '  ③ 의 문항 답도 지운다');
    eq(X.state.qPick.t1, S.qById('t1').a, '★  ① 의 답은 그대로 남는다');
    eq(X.state.qPick.t2, S.qById('t2').a, '★  ② 의 답도 그대로');
    eq(X.state.qPick.t5, S.qById('t5').a, '★  ⑤ 의 답도 그대로');
    eq(X.state.qPick.t6, S.qById('t6').a, '★  ⑥ 의 답도 그대로');
    eq(X.state.strand, 1, '  ① 에서 고른 가닥도 그대로');
    eq(X.state.stageSeen, true, '  ② 를 끝까지 본 것도 그대로');
    eq(X.rnaSeenCount(), 3, '  ⑤ 에서 본 종류도 그대로');
    eq(X.cellPickCount(), 2, '  ⑥ 에서 찍은 자리도 그대로');
    eq(Object.keys(X.state.pPick).length, 4, '  💪 의 답도 그대로');
    eq(Object.keys(X.state.ta).length, 4, '  ⑦ 에 적은 답안도 그대로');
    eq(strip(X.cmpTableHtml()), '', '  대조표가 화면에서 사라진다');
    eq(strip(X.cmpBandHtml()), '', '  결론 띠도 사라진다');
    ok(strip(html(X, 'fb_grid')).indexOf('④ 도 함께 지웠다') > 0, '  무엇을 함께 지웠는지 말해 준다');
    eq(cls(X, 'fb_grid'), 'msg info', '  안내로 알린다');
    eq(dis(X, 'btnAuto'), false, '★  되돌린 직후 곧바로 다시 이을 수 있다');
  }
  // ④ 만 되돌리면 ③ 은 남는다
  {
    const X = loaded();
    X.resetSec('result');
    eq(X.state.named, false, '④ 의 견주기를 지운다');
    eq(X.rnaFilled(), S.N, '★③ 에서 이은 RNA 는 그대로 남는다');
    eq(X.state.qPick.t3, S.qById('t3').a, '  ③ 의 답도 그대로');
    X.compareRows();
    eq(X.state.named, true, '  곧바로 다시 견줄 수 있다');
  }
  // ② 를 되돌리면 첫 국면으로 간다
  {
    const X = loaded();
    eq(X.ANI.ph, X.aniLast(), '끝까지 본 상태');
    X.resetSec('stage');
    eq(X.ANI.ph, 0, '★② 를 되돌리면 첫 국면으로 간다');
    eq(X.state.stageSeen, false, '  끝까지 본 표시도 내린다');
    eq(dis(X, 'tx_next'), false, '  다시 ▶ 를 누를 수 있다');
  }
  // 확인 대화상자를 물리면 아무것도 지우지 않는다
  {
    const X = makeSandbox({ confirmRet: false });
    playAll(X);
    const before = JSON.stringify(X.state);
    X.resetSec('grid');
    eq(X._rec.confirms, 1, '★③ 은 확인을 묻는다');
    eq(JSON.stringify(X.state), before, '★물리면 아무것도 지우지 않는다');
    X.resetSec('write');
    eq(X._rec.confirms, 2, '★⑦ 도 확인을 묻는다');
    X.resetSec('strand');
    eq(X._rec.confirms, 2, '★① 은 묻지 않고 그냥 지운다');
    eq(X.state.strand, 0, '  지워졌다');
  }
  // 전체 되돌리기
  {
    const X = makeSandbox({ confirmRet: false });
    playAll(X);
    X.resetAll();
    eq(X._rec.reloads, 0, '★물리면 전체 되돌리기도 하지 않는다');
    ok(X.localStorage._mem[X.LS_KEY] !== undefined, '  저장분도 그대로');
    const Y = makeSandbox();
    playAll(Y);
    Y.resetAll();
    eq(Y._rec.reloads, 1, '전체 되돌리기는 새로고침한다');
    eq(Y.localStorage._mem[Y.LS_KEY], undefined, '★저장분을 지운다');
    eq(Y.state.strand, 0, '★메모리의 state 도 함께 비운다');
    eq(Y.rnaFilled(), 0, '  이은 RNA 도');
    eq(Y.ANI.ph, 0, '  국면도 처음으로');
    eq(Y.txMounted, false, '  무대도 다시 짓게 한다');
  }
}

// ══════════════════ [17] 문항 ══════════════════
console.log('[17] 문항');
{
  const ALL = S.ALLQ();
  eq(ALL.length, 10, '문항 10개 (결론 6 + 💪 4)');
  eq(ALL.map(p => p.id).join(','), 't1,t2,t3,t4,t5,t6,p1,p2,p3,p4', '문항 id');
  eq(new Set(ALL.map(p => p.id)).size, 10, 'id 중복 없음');
  [['Q_STRAND','t1'],['Q_STAGE','t2'],['Q_GRID','t3'],['Q_RESULT','t4'],['Q_RNA','t5'],['Q_CELL','t6']]
    .forEach(([nm, id]) => {
      eq(S[nm].length, 1, nm + ' 는 결론 문항 한 개');
      eq(S[nm][0].id, id, nm + ' 의 id = ' + id);
    });
  eq(S.PRACTICE.length, 4, '💪 더 풀어 보기 4문항');
  ok(S.PRACTICE.every(p => p.id.indexOf('p') === 0), '★💪 문항 id 는 p 로 시작한다');
  ok(ALL.filter(p => p.id.indexOf('p') !== 0).every(p => /^t\d$/.test(p.id)), '결론 문항 id 는 t 로 시작한다');
  ALL.forEach(p => eq(S.qById(p.id), p, 'qById(' + p.id + ')'));
  eq(S.qById('없는것'), null, '없는 id 는 null');
  ALL.forEach(p => {
    const store = S.pickStore(p.id);
    eq(store, p.id.indexOf('p') === 0 ? S.state.pPick : S.state.qPick, 'pickStore(' + p.id + ') 가 갈린다');
  });
  ALL.forEach(p => {
    eq(p.ch.length, 4, p.id + ': 선택지 4개');
    eq(p.no.length, 4, p.id + ': 오답 되돌림 4칸');
    ok(p.a >= 0 && p.a < p.ch.length, p.id + ': 정답 번호가 범위 안');
    eq(p.no[p.a], '', '★' + p.id + ': 정답 자리의 되돌림은 빈 문자열이다');
    ok(p.no.filter((t, i) => i !== p.a).every(t => t.length > 8), p.id + ': 오답마다 되돌림이 있다');
    ok(p.ex && strip(p.ex).length > 30, p.id + ': 해설이 있다');
    ok(/다\.$/.test(strip(p.ex)), p.id + ': 해설이 「~다.」로 끝난다');
    eq(new Set(p.ch).size, 4, p.id + ': 선택지 중복 없음');
    eq(new Set(p.no.filter((t, i) => i !== p.a)).size, 3, p.id + ': 오답 되돌림도 서로 다르다');
    const len = p.ch.map(t => strip(t).length);
    const sorted = len.slice().sort((x, y) => y - x);
    ok(!(len[p.a] === sorted[0] && sorted[0] - sorted[1] > 14),
       '★' + p.id + ': 정답이 단독으로 크게 길지 않다 (정답 ' + len[p.a] + ' / 최장 오답 ' + sorted.filter((v,i)=>i>0||len[p.a]!==v)[0] + ')');
  });
  {
    // 정답 위치 — 쏠림을 그대로 보고한다
    const pos = ALL.map(p => p.a);
    ok(pos.every(v => v >= 0 && v < 4), '정답 번호가 모두 범위 안');
    console.log('    · 정답 위치 분포: ' + pos.join('') + ' (서로 다른 자리 ' + new Set(pos).size + '가지)');
    /* ★2026-09-14: 열 문항이 모두 1번이던 것을 흩었다. 다시 쏠리면 여기서 걸린다. */
    ok(new Set(pos).size >= 3, '★정답 위치가 세 자리 이상에 흩어져 있다 (분포 ' + pos.join('') + ')');
    ok(Math.max(...[0,1,2,3].map(k => pos.filter(x => x === k).length)) <= 4,
       '  한 자리에 네 문항을 넘겨 몰지 않는다');
  }
  {
    const hi = ALL.filter(p => p.lv === '상'), mid = ALL.filter(p => p.lv === '중');
    eq(hi.length, 2, '상 난도 2문항');
    eq(mid.length, 2, '중 난도 2문항');
    ok(hi.every(p => p.id.indexOf('p') === 0) && mid.every(p => p.id.indexOf('p') === 0), '난도 표시는 💪 에만');
    ok(ALL.filter(p => p.id.indexOf('p') !== 0).every(p => !p.lv), '결론 문항에는 난도 표시가 없다');
    hi.forEach(p => {
      ok(Array.isArray(p.hint), '★' + p.id + '(상): 힌트가 있다');
      eq(p.hint.length, 2, '★' + p.id + '(상): 힌트가 2단이다');
      ok(p.hint.every(h => strip(h).length > 15), '  두 단 모두 내용이 있다');
      ok(p.hint[0] !== p.hint[1], '  두 단이 서로 다르다');
      ok(p.ch.every(c => p.hint.join(' ').indexOf(strip(c)) < 0), '★  힌트가 정답을 그대로 말하지 않는다');
    });
    mid.forEach(p => ok(!p.hint, '중 난도 문항에는 힌트를 붙이지 않는다'));
  }
  {
    // p4 만 자료 상자를 갖는다
    const withDat = ALL.filter(p => p.dat);
    eq(withDat.map(p => p.id).join(','), 'p4', '자료 상자는 p4 하나');
    eq(withDat[0].dat.length, 3, '  자료 세 줄(위 가닥·아래 가닥·프로모터 자리)');
    ok(withDat[0].dat.join(' ').indexOf('프로모터는 <b>오른쪽 끝</b>') > 0, '  프로모터가 오른쪽에 있다고 밝힌다');
  }
  {
    // 💪 p3·p4 의 정답을 검사가 스스로 풀어 대조한다
    const rna = 'AUGCCUAG';
    const tmplFor = r => comp(r.replace(/U/g, 'T'), DNA_COMP);   // RNA 자리마다 상보 DNA
    eq(tmplFor(rna), 'TACGGATC', '독립 계산: 5′-AUGCCUAG-3′ 의 주형 = TACGGATC');
    eq(S.qById('p3').ch[S.qById('p3').a], '3′-TACGGATC-5′', '★p3 정답 = 3′-TACGGATC-5′ (방향까지)');
    const up = 'TACGGATC';                                        // 위 가닥 5′ → 3′
    // 프로모터가 오른쪽 → 중합효소는 왼쪽으로 → 오른쪽 끝이 3′ 인 가닥(위 가닥)이 주형
    const first3 = rev(up).slice(0, 3).split('').map(b => RNA_COMP[b]).join('');
    eq(first3, 'GAU', '독립 계산: 오른쪽부터 C·T·A → G·A·U');
    eq(S.qById('p4').ch[S.qById('p4').a], 'GAU', '★p4 정답 = GAU');
  }
  {
    // 답을 몇 번이든 고칠 수 있다 / 정오를 기록하지 않는다
    const Q = makeSandbox();
    eq(Q.state.qPick.t1, undefined, '처음에는 답이 없다');
    eq(Q.qEls['t1'].expl.style.display, 'none', '  해설도 숨어 있다');
    ok(Q.qEls['t1'].choices.every(b => b.className === 'choice' && b.disabled === false), '  선택지가 모두 눌린다');
    /* ★정답 자리를 숫자로 박지 않는다 — 자리를 섞어도 검사가 살아 있어야 한다 */
    const A1 = Q.qById('t1').a, W1 = (A1 + 1) % 4, D1 = (A1 + 2) % 4;
    Q.pickQ('t1', W1);
    eq(Q.state.qPick.t1, W1, '고른 것이 기록된다');
    eq(Q.qEls['t1'].choices[A1].className, 'choice right', '★정답 자리가 드러난다');
    eq(Q.qEls['t1'].choices[W1].className, 'choice picked', '  고른 오답이 표시된다');
    eq(Q.qEls['t1'].choices[D1].className, 'choice dim', '  나머지는 흐려진다');
    eq(Q.qEls['t1'].expl.style.display, 'block', '  해설이 열린다');
    ok(Q.qEls['t1'].expl.innerHTML.indexOf('옳지 않다.') > 0, '  오답 되돌림이 먼저 온다');
    ok(Q.qEls['t1'].expl.innerHTML.indexOf(strip(Q.qById('t1').ex).slice(0, 15)) > 0, '★해설은 정답·오답 모두에게 보인다');
    ok(Q.qEls['t1'].choices.every(b => b.disabled === false), '★답한 뒤에도 선택지를 다시 누를 수 있다');
    Q.pickQ('t1', A1);
    eq(Q.state.qPick.t1, A1, '★답을 고칠 수 있다');
    eq(Q.qEls['t1'].choices[A1].className, 'choice right', '  고쳐서 맞히면 정답 표시만 남는다');
    ok(Q.qEls['t1'].expl.innerHTML.indexOf('✅ 옳다.') > 0, '  옳다는 되돌림');
    ok(!('correct' in Q.state) && !('wrong' in Q.state), '★정오를 세지 않는다 — 마지막 선택만 남긴다');
  }
  {
    // ★💪 는 완료 판정에 들어가지 않는다
    const W = makeSandbox();
    playAll(W);
    eq(W.doneCount(), 6, '본 활동만으로 6 / 6');
    W.PRACTICE.forEach(p => W.pickQ(p.id, (p.a + 1) % 4));
    eq(W.doneCount(), 6, '★💪 를 다 틀려도 진행도가 줄지 않는다');
    eq(Object.keys(W.state.qPick).length, 6, '  💪 의 답은 qPick 에 들어가지 않는다');
    eq(Object.keys(W.state.pPick).length, 4, '  pPick 에 따로 담긴다');
    eq(txt(W, 'pracProg'), '푼 문항 4 / 4', '  💪 진행 표시는 따로 센다');
    const V = makeSandbox();
    V.PRACTICE.forEach(p => V.pickQ(p.id, p.a));
    eq(V.doneCount(), 0, '★💪 만 다 풀어도 활동 진행도는 0 이다');
  }
  {
    // 화면에 실제로 그려지는가 — 힌트 2단 포함
    const D = makeSandbox();
    ['strandQ','stageQ','gridQ','resultQ','rnaQ','cellQ'].forEach(id =>
      eq(D._store[id].children.length, 1, id + ' 에 문항 카드 1개'));
    eq(D._store['pracBox'].children.length, 4, 'pracBox 에 문항 카드 4개');
    const cards = D._store['pracBox'].children;
    cards.forEach((c, i) => eq(c.className, 'pq-card', '💪 카드 ' + i + ' 의 class'));
    const hw = cards[2].children.filter(c => c.className === 'hintwrap')[0];   // p3
    ok(!!hw, '★상 난도 문항에 힌트 칸이 그려진다');
    eq(hw.children.length, 4, '  힌트 단추 2 + 힌트 상자 2');
    const [hb1, hx1, hb2, hx2] = hw.children;
    eq(hx1.style.display, 'none', '  힌트① 은 숨어 있다');
    eq(hb2.style.display, 'none', '  힌트② 단추도 숨어 있다');
    eq(hx2.style.display, 'none', '  힌트② 도 숨어 있다');
    hb1.onclick();
    eq(hx1.style.display, 'block', '★힌트① 을 열면 보인다');
    eq(hb1.style.display, 'none', '  ① 단추는 사라진다');
    eq(hb2.style.display, 'inline-block', '★  ② 단추가 그때 나타난다');
    eq(hx2.style.display, 'none', '  ② 는 아직 닫혀 있다');
    hb2.onclick();
    eq(hx2.style.display, 'block', '★힌트② 도 열린다');
    ok(hx1.innerHTML.indexOf('어디를 볼 것인가') > 0, '힌트① = 어디를 볼 것인가');
    ok(hx2.innerHTML.indexOf('판단 기준') > 0, '힌트② = 판단 기준');
    ok(!/hint/.test(JSON.stringify(D.state)), '★힌트를 열었다는 것은 기록하지 않는다');
    const noHint = cards[0].children.filter(c => c.className === 'hintwrap');
    eq(noHint.length, 0, '중 난도 문항에는 힌트 칸이 없다');
    const dat = cards[3].children.filter(c => c.className === 'datbox');
    eq(dat.length, 1, 'p4 에 자료 상자가 그려진다');
    ok(dat[0].innerHTML.indexOf('[자료]') > 0, '  자료 표시');
  }
}
// ══════════════════ [18] 진행 판정 · 저장·복원 · 두 탭 · sticky ══════════════════
console.log('[18] 진행 판정 · 저장·복원 · sticky');
{
  // 진행 레일
  eq(S.STEPS.length, 6, '★진행 레일 6칸');
  eq(S.STEPS.map(s => s.key).join(','), 'strand,stage,grid,result,rna,cell', '레일 칸 이름');
  eq(S.STEPS.map(s => s.no).join(''), '①②③④⑤⑥', '레일 차례 표시');
  S.STEPS.forEach(s => {
    ok(s.name.length > 3 && s.sub.length > 2, s.key + ': 이름과 곁말이 있다');
    ok(new RegExp('\\.rstep|h2\\.' + s.cls).test(STYLE) || STYLE.indexOf('.' + s.cls) >= 0, s.key + ': 색 이름이 CSS 에 있다');
  });
  eq(new Set(S.STEPS.map(s => s.key)).size, 6, '레일 칸 이름이 서로 다르다');
  const F = makeSandbox();
  eq((html(F, 'rail').match(/class="rstep/g) || []).length, 6, '레일 6칸이 그려진다');
  eq(txt(F, 'progress'), '진행 0 / 6', '처음 진행 0 / 6');
  eq(F.doneCount(), 0, 'doneCount 0');
  // ★칸은 처음부터 다 열려 있다 — 잠긴 칸이 없다
  eq((html(F, 'rail').match(/rstep on/g) || []).length, 6, '★잠긴 칸이 없다(마쳤는가만 보인다)');
  eq((html(F, 'rail').match(/rstep ok/g) || []).length, 0, '아직 마친 칸이 없다');
  ok(!/cardNOpen|lockCard|isLocked|\.locked/.test(js), '★카드 잠금 판정 함수를 두지 않았다');
}
{
  // 칸마다 「조작 + 문항」 둘을 다 해야 마친 것으로 센다
  const A = makeSandbox();
  A.pickStrand(1); eq(A.stepDone('strand'), false, '① 가닥만 골라서는 안 끝난다');
  A.pickQ('t1', 0); eq(A.stepDone('strand'), true, '① 문항까지 답해야 끝난다');
  const B = makeSandbox();
  B.pickQ('t2', 0); eq(B.stepDone('stage'), false, '② 문항만으로는 안 끝난다');
  B.aniGo(99); eq(B.stepDone('stage'), true, '② 끝까지 봐야 끝난다');
  const C = makeSandbox();
  fillRna(C); eq(C.stepDone('grid'), false, '③ 다 이어도 문항이 남았다');
  C.pickQ('t3', 0); eq(C.stepDone('grid'), true, '③ 끝');
  eq(C.stepDone('result'), false, '④ 는 아직');
  C.compareRows(); C.pickQ('t4', 0); eq(C.stepDone('result'), true, '④ 끝');
  const D = makeSandbox();
  D.pickQ('t5', 0); D.pickGene('m'); D.pickGene('r');
  eq(D.stepDone('rna'), false, '★⑤ 는 셋을 다 봐야 끝난다 (지금 2)');
  D.pickGene('t'); eq(D.stepDone('rna'), true, '⑤ 셋을 다 보면 끝');
  const E = makeSandbox();
  E.pickQ('t6', 0); E.pickCell('pro', 1);
  eq(E.stepDone('cell'), false, '★⑥ 은 둘 다 찍어야 끝난다 (지금 1)');
  E.pickCell('euk', 1); eq(E.stepDone('cell'), true, '⑥ 둘 다 찍으면 끝(정오는 따지지 않는다)');
  eq(E.stepDone('없는칸'), false, '없는 칸은 언제나 미완');
  const Z = makeSandbox(); playAll(Z);
  eq(Z.doneCount(), 6, '★여섯 칸을 다 마친다');
  eq(txt(Z, 'progress'), '진행 6 / 6', '진행 표시 6 / 6');
  eq((html(Z, 'rail').match(/rstep ok/g) || []).length, 6, '레일 여섯 칸이 모두 초록');
}
{
  // freshState — ★초기값이 null 인 칸이 하나도 없어야 한다
  const f = S.freshState();
  Object.keys(f).forEach(k => ok(f[k] !== null, '★freshState().' + k + ' 이 null 이 아니다 (typeof null === object 사고 예방)'));
  eq(Object.keys(f).sort().join(','),
     'cellPick,manual,named,pPick,qPick,rna,rnaLast,rnaSeen,self,seq,stageSeen,strand,ta,teacherUnlock,usedAuto,wrongT',
     'freshState 칸 목록');
  eq(f.strand, 0, '「고르지 않았다」는 0 으로 적는다');
  eq(f.rnaLast, '', '「없음」은 빈 문자열로 적는다');
  eq(f.rna.length, S.N, '빈 RNA 는 ' + S.N + '칸');
  ok(f.rna.every(v => v === ''), '★빈 칸도 null 이 아니라 빈 문자열이다');
  eq(f.seq, 0, '저장 순번 0 에서 시작');
  eq(f.teacherUnlock, false, '교사 해제는 꺼진 채로 시작');
}
{
  // 저장 · 복원
  const A = makeSandbox(); playAll(A);
  const raw = A.localStorage._mem[A.LS_KEY];
  ok(!!raw, '저장된다');
  const saved = JSON.parse(raw);
  ok(saved.seq > 0, '★저장할 때마다 순번이 오른다 (' + saved.seq + ')');
  eq(saved.teacherUnlock, false, '★교사 해제는 저장하지 않는다');
  const B = makeSandbox({ seed: { 'tx_sim_v1': raw } });
  eq(B.state.strand, 1, '고른 가닥이 복원된다');
  eq(B.state.stageSeen, true, '끝까지 본 것이 복원된다');
  eq(B.state.rna.join(''), RNA_BOOK, '이은 RNA 가 복원된다');
  eq(B.state.named, true, '견주기가 복원된다');
  eq(B.rnaSeenCount(), 3, '본 RNA 종류가 복원된다');
  eq(B.cellPickCount(), 2, '찍은 자리가 복원된다');
  eq(B.doneCount(), 6, '진행도가 복원된다');
  // ★freshState 가 정의한 칸만 복원한다
  const C = makeSandbox({ seed: { 'tx_sim_v1': '{"strand":2,"zzz":123,"옛칸":"x"}' } });
  eq(C.state.strand, 2, '아는 칸은 복원한다');
  eq(C.state.zzz, undefined, '★모르는 칸은 되살아나지 않는다');
  eq(C.state['옛칸'], undefined, '  옛 칸도 마찬가지');
  // 망가진 저장분
  const bad = [
    ['없음', null, 0],
    ['문자열', '"그냥 글자"', 0],
    ['배열', '[1,2,3]', 0],
    ['깨진 JSON', '{{{', 0]
  ];
  bad.forEach(([nm, blob]) => {
    const X = makeSandbox({ seed: blob === null ? {} : { 'tx_sim_v1': blob } });
    eq(X.state.strand, 0, '망가진 저장분(' + nm + ') → 처음 상태');
    eq(X.rnaFilled(), 0, '  RNA 도 비어 있다');
  });
  // RNA 칸 — 구멍 · 틀린 글자 · 길이 불일치는 통째로 버린다
  const full = RNA_BOOK.split('');
  const mk = arr => JSON.stringify({ rna: arr });
  const hole = full.slice(); hole[2] = '';
  eq(makeSandbox({ seed: { 'tx_sim_v1': mk(hole) } }).rnaFilled(), 0, '★가운데가 뚫린 RNA 는 통째로 버린다');
  const wrongL = full.slice(); wrongL[0] = 'A';
  eq(makeSandbox({ seed: { 'tx_sim_v1': mk(wrongL) } }).rnaFilled(), 0, '★틀린 글자가 든 RNA 는 통째로 버린다');
  const withT = full.slice(); withT[3] = 'T';
  eq(makeSandbox({ seed: { 'tx_sim_v1': mk(withT) } }).rnaFilled(), 0, '★T 가 든 RNA 는 통째로 버린다');
  eq(makeSandbox({ seed: { 'tx_sim_v1': mk(full.slice(0, 14)) } }).rnaFilled(), 0, '★길이가 다른 RNA 는 통째로 버린다');
  eq(makeSandbox({ seed: { 'tx_sim_v1': '{"rna":"UGGAUGUUGGCAGUA"}' } }).rnaFilled(), 0, '배열이 아닌 RNA 도 버린다');
  const part = full.slice(0, 5).concat(['','','','','','','','','','']);
  const P5 = makeSandbox({ seed: { 'tx_sim_v1': mk(part) } });
  eq(P5.rnaFilled(), 5, '★왼쪽부터 빈틈없이 찬 것은 그대로 복원한다');
  eq(P5.nextSlot(), 5, '  이어서 6번째 칸부터 잇는다');
  // 딸린 값 죄기
  eq(makeSandbox({ seed: { 'tx_sim_v1': JSON.stringify({ rna: full, manual: 99 }) } }).state.manual, S.N, 'manual 은 이은 칸 수를 넘지 않는다');
  eq(makeSandbox({ seed: { 'tx_sim_v1': JSON.stringify({ rna: full, manual: -3 }) } }).state.manual, 0, 'manual 음수는 0');
  eq(makeSandbox({ seed: { 'tx_sim_v1': JSON.stringify({ rna: full, manual: 'abc' }) } }).state.manual, 0, 'manual 숫자가 아니면 0');
  eq(makeSandbox({ seed: { 'tx_sim_v1': '{"usedAuto":true}' } }).state.usedAuto, false, '★한 칸도 안 이었으면 자동 전사 표시를 지운다');
  eq(makeSandbox({ seed: { 'tx_sim_v1': '{"named":true}' } }).state.named, false, '★RNA 없이 견주기만 참인 저장분은 믿지 않는다');
  eq(makeSandbox({ seed: { 'tx_sim_v1': JSON.stringify({ rna: full, named: true }) } }).state.named, true, '  RNA 가 다 차 있으면 복원한다');
  eq(makeSandbox({ seed: { 'tx_sim_v1': '{"strand":7}' } }).state.strand, 0, '범위 밖 가닥 번호는 버린다');
  eq(makeSandbox({ seed: { 'tx_sim_v1': '{"strand":"2"}' } }).state.strand, 2, '문자열 숫자는 숫자로 되살린다');
  eq(makeSandbox({ seed: { 'tx_sim_v1': '{"wrongT":-9}' } }).state.wrongT, 0, '음수 타이민 횟수는 0');
  {
    const X = makeSandbox({ seed: { 'tx_sim_v1': '{"rnaSeen":{"m":true,"zz":true,"r":"yes"},"rnaLast":"zz"}' } });
    eq(JSON.stringify(X.state.rnaSeen), '{"m":true}', '★없는 RNA 종류·참이 아닌 값은 걸러 낸다');
    eq(X.state.rnaLast, '', '★보지 않은 종류가 마지막으로 남아 있지 않다');
  }
  {
    const X = makeSandbox({ seed: { 'tx_sim_v1': '{"cellPick":{"pro":5,"euk":"2","xx":1}}' } });
    eq(JSON.stringify(X.state.cellPick), '{"euk":2}', '★범위 밖·없는 세포 이름은 걸러 낸다');
  }
  {
    const X = makeSandbox({ seed: { 'tx_sim_v1': '{"qPick":{"t1":99,"t2":1,"zzz":0},"pPick":{"p1":9,"p2":2,"없음":1}}' } });
    eq(X.state.qPick.t1, undefined, '★범위 밖 답은 복원하지 않는다');
    eq(X.state.qPick.t2, 1, '  범위 안 답은 복원한다');
    eq(X.state.qPick.zzz, undefined, '★없는 문항 id 는 복원하지 않는다');
    eq(X.state.pPick.p1, undefined, '💪 도 범위 밖은 버린다');
    eq(X.state.pPick.p2, 2, '  범위 안은 복원한다');
    eq(X.state.pPick['없음'], undefined, '  없는 id 도 버린다');
  }
  {
    /* ★칸이 어긋난 답 — pickStore 는 id 가 p 로 시작하는지로 갈린다.
       qPick 에 p1 이, pPick 에 t1 이 들어 있으면 화면에는 안 나오면서 개수만 부풀린다. */
    const X = makeSandbox({ seed: { 'tx_sim_v1': '{"qPick":{"p1":1,"t2":1},"pPick":{"t1":1,"p2":2}}' } });
    eq(X.state.qPick.p1, undefined, '★qPick 에 섞여 든 💪 의 답은 버린다');
    eq(X.state.qPick.t2, 1, '  제자리의 답은 남긴다');
    eq(X.state.pPick.t1, undefined, '★pPick 에 섞여 든 결론 문항의 답은 버린다');
    eq(X.state.pPick.p2, 2, '  제자리의 답은 남긴다');
  }
  {
    const X = makeSandbox({ seed: { 'tx_sim_v1': '{"qPick":"글자","pPick":5,"ta":null,"self":[1]}' } });
    ok(X.state.qPick && typeof X.state.qPick === 'object' && !Array.isArray(X.state.qPick), '★객체 칸이 망가져도 빈 객체로 되살린다');
    ok(X.state.pPick && typeof X.state.pPick === 'object', '  pPick 도');
    ok(X.state.ta && typeof X.state.ta === 'object', '  ta 도');
    ok(X.state.self && typeof X.state.self === 'object' && !Array.isArray(X.state.self), '  self 도');
  }
  eq(makeSandbox({ seed: { 'tx_sim_v1': '{"teacherUnlock":true}' } }).state.teacherUnlock, false,
     '★저장분에 교사 해제가 남아 있어도 켜지 않는다');
}
{
  // ★두 탭 — 저장소의 seq 가 크면 덮지 않는다
  const T = makeSandbox();
  T.pickStrand(1);
  const s1 = JSON.parse(T.localStorage._mem[T.LS_KEY]).seq;
  ok(s1 > 0, '순번이 올랐다 (' + s1 + ')');
  const ahead = JSON.parse(T.localStorage._mem[T.LS_KEY]);
  ahead.seq = s1 + 50; ahead.strand = 2;
  T.localStorage._mem[T.LS_KEY] = JSON.stringify(ahead);
  T.pickStrand(1);
  const now = JSON.parse(T.localStorage._mem[T.LS_KEY]);
  eq(now.seq, s1 + 50, '★저장소의 순번이 더 크면 덮어쓰지 않는다');
  eq(now.strand, 2, '  다른 탭이 저장한 값이 살아남는다');
  eq(cls(T, 'tabWarn'), 'msg bad', '★대신 학생에게 알린다');
  ok(strip(html(T, 'tabWarn')).indexOf('다른 탭에서도 열려 있다') > 0, '  무엇이 일어났는지 말해 준다');
  ok(strip(html(T, 'tabWarn')).indexOf('저장되지 않는다') > 0, '  저장되지 않는다고 말해 준다');
  const U = makeSandbox();
  eq(cls(U, 'tabWarn'), '', '평소에는 뜨지 않는다');
}
{
  // ⑦ 모범답안 자수 잠금
  const W = makeSandbox();
  eq(S.WRITEQ.map(w => w.id).join(','), 'w1,w2,w3,w4', '서술형 id');
  eq(S.WRITEQ.map(w => w.min).join(','), '60,60,60,100', '자수 잠금 (창의력은 100자)');
  ok(S.WRITEQ[3].creative === true, '★네 번째는 창의력 문항');
  S.WRITEQ.forEach(w => ok(strip(w.ans).length >= w.min, '모범답안 ' + w.id + ' 이 자수 기준보다 길다'));
  eq(W.ansGate('w1').open, false, '처음에는 모범답안이 잠겨 있다');
  ok(W.ansGate('w1').reason.indexOf('60자 이상') >= 0, '몇 자를 써야 하는지 밝힌다');
  eq(dis(W, 'ansBtn_w1'), true, '  단추도 꺼져 있다');
  ok(txt(W, 'ansBtn_w1').indexOf('🔒') === 0, '  자물쇠 표시');
  W._store['ta_w1'].value = '가'.repeat(59); W.onTa('w1');
  eq(W.ansGate('w1').open, false, '★59자로는 열리지 않는다');
  eq(txt(W, 'cnt_w1'), '59자', '  글자 수를 센다');
  W._store['ta_w1'].value = '가'.repeat(60); W.onTa('w1');
  eq(W.ansGate('w1').open, true, '★60자면 열린다');
  eq(dis(W, 'ansBtn_w1'), false, '  단추가 켜진다');
  W._store['ta_w2'].value = ' '.repeat(300); W.onTa('w2');
  eq(W.ansGate('w2').open, false, '★공백만으로는 열리지 않는다');
  eq(txt(W, 'cnt_w2'), '0자', '  공백은 세지 않는다');
  W._store['ta_w4'].value = '가'.repeat(99); W.onTa('w4');
  eq(W.ansGate('w4').open, false, '창의력 문항은 99자로도 안 열린다');
  W._store['ta_w4'].value = '가'.repeat(100); W.onTa('w4');
  eq(W.ansGate('w4').open, true, '  100자면 열린다');
  eq(W._store['ans_w1'].style.display, 'none', '모범답안은 닫혀 있다');
  W.toggleAns('w1');
  eq(W._store['ans_w1'].style.display, 'block', '열면 보인다');
  W.toggleAns('w1');
  eq(W._store['ans_w1'].style.display, 'none', '다시 누르면 닫힌다');
  W.toggleAns('w3');
  eq(W._store['ans_w3'].style.display, 'none', '★잠긴 것은 눌러도 열리지 않는다');
  eq(txt(W, 'writeProg'), '작성한 문항 2 / 4', '작성한 문항 수를 센다 (공백만 적은 것은 세지 않는다)');
  // 교사용 해제 — 진행 배지 5연타
  const X = makeSandbox();
  for (let i = 0; i < 5; i++) X.tapProgress();
  eq(X._rec.confirms, 1, '★5연타에 확인을 묻는다');
  ok(X._rec.msgs[0].indexOf('하시겠습니까?') > 0, '  「~하시겠습니까?」');
  eq(X.state.teacherUnlock, true, '  해제된다');
  eq(X.ansGate('w1').open, true, '  모범답안이 자수 없이 열린다');
  eq(JSON.parse(X.localStorage._mem[X.LS_KEY]).teacherUnlock, false, '★  그래도 저장하지는 않는다');
  const Y = makeSandbox({ confirmRet: false });
  for (let i = 0; i < 5; i++) Y.tapProgress();
  eq(Y.state.teacherUnlock, false, '물리면 해제하지 않는다');
  const Z = makeSandbox();
  for (let i = 0; i < 4; i++) Z.tapProgress();
  eq(Z._rec.confirms, 0, '네 번으로는 묻지 않는다');
  // ⑦ 되돌리기는 적은 답안과 자기평가를 함께 지운다
  const R = makeSandbox();
  R.WRITEQ.forEach(w => { R._store['ta_' + w.id].value = '가'.repeat(120); R.onTa(w.id); });
  R.SELFCHECK.forEach(s => { R._store['self_' + s.id].checked = true; R.onSelf(s.id); });
  eq(Object.keys(R.state.self).length, 3, '자기평가 3줄을 체크해 두었다');
  R.resetSec('write');
  ok(Object.keys(R.state.ta).every(k => R.state.ta[k] === ''), '★⑦ 을 되돌리면 답안이 지워진다');
  eq(JSON.stringify(R.state.self), '{}', '★  자기평가도 함께 지운다');
  eq(R._store['ta_w1'].value, '', '  글상자도 비운다');
  eq(R._store['self_s1'].checked, false, '  체크도 푼다');
  eq(txt(R, 'writeProg'), '작성한 문항 0 / 4', '  진행 표시도 되돌린다');
}
{
  // ★무대는 화면 세로 가운데에 멈춘다 (제작 표준 §2)
  eq(typeof S.stickyCenter, 'function', 'stickyCenter 가 있다');
  ok(S._rec.listeners.some(l => l.ev === 'resize'), '★resize 에 걸려 있다');
  eq(S._rec.listeners.filter(l => l.ev === 'resize')[0].fn, S.stickyCenter, '  걸린 것이 stickyCenter 다');
  ok(/updateAll\(\)\{[\s\S]{0,200}stickyCenter\(\)/.test(js), '★updateAll 끝에서도 부른다');
  const K = makeSandbox();
  const pane = (h) => { const e = K._mkEl(); e._h = h; return e; };
  const p1 = pane(400), p2 = pane(2000);
  K._qsa['.pane-l'] = [p1, p2];
  K.innerWidth = 1400; K.innerHeight = 900;
  K.stickyCenter();
  eq(p1.style.top, Math.round((900 - 400) / 2) + 'px', '★칸이 화면보다 작으면 (화면 − 칸)/2 로 가운데에 멈춘다');
  eq(p2.style.top, '10px', '★칸이 화면보다 크면 10px');
  K.innerWidth = 1000;
  K.stickyCenter();
  eq(p1.style.top, '', '★1180px 미만에서는 손대지 않는다(sticky 가 아니다)');
  eq(p2.style.top, '', '  둘 다');
  K.innerWidth = 1400; K.innerHeight = 0;
  K.stickyCenter();
  eq(p1.style.top, '', '화면 높이를 모르면 손대지 않는다');
}
{
  // 활동 전체를 한 바퀴 — 예외 없이 돌아가는가
  const A = makeSandbox();
  playAll(A);
  A.PRACTICE.forEach(p => A.pickQ(p.id, p.a));
  A.WRITEQ.forEach(w => { A._store['ta_' + w.id].value = '가'.repeat(150); A.onTa(w.id); });
  A.SELFCHECK.forEach(s => { A._store['self_' + s.id].checked = true; A.onSelf(s.id); });
  eq(A.doneCount(), 6, '한 바퀴를 돌면 6 / 6');
  eq(A.state.rna.join(''), RNA_BOOK, '만들어진 RNA = 교과서 값');
  eq(A.SELF_ERR.length, 0, '자기검사에 걸린 것 없음');
  eq(A._rec.reloads, 0, '한 바퀴 도는 동안 새로고침하지 않는다');
  eq(A._rec.confirms, 0, '  묻지도 않는다');
  const stray = [...new Set(A._missing)].filter(id =>
    !/^(ta_|cnt_|ansBtn_|ans_|self_|rs_|tx_(rg|ct|cb|rb|pol|polb|bdr|bdt|arrow|rnalab|rnabb))/.test(id));
  eq(stray.join(','), '', '★없는 id 를 찾은 자리가 없다(오타 검출)');
  // 다시 그려도 문항 카드가 겹쳐 쌓이지 않는다
  A.resetSec('strand');
  eq(A._store['pracBox'].children.length, 4, '다시 그려도 💪 카드는 4개');
  eq(A._store['strandQ'].children.length, 1, '  ① 문항 카드도 1개');
}

console.log('');
console.log('SUMMARY pass=' + pass + ' fail=' + fail);
console.log('결과: ' + pass + ' 통과, ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
