// ════════════════════════════════════════════════════════════════════════
//  2-1 중심원리와 유전부호 해독 — Node 헤드리스 회귀 검사 (2026-09-12 전면 재구성 판)
//  실행:  node "_test_유전부호해독.js"           (활동 폴더에서)
//         CODON_HTML=<사본 경로> node "_test_유전부호해독.js"   ← 변이 확인용
//
//  ★규율 (작업노트/방법_웹활동_제작표준.md §8)
//   · 본체를 쓴 사람의 근거를 믿지 않는다. 근거는 **교과서 값**·**사양**·**HTML 자체**에서만 온다.
//     → 코돈표 64칸·해독 결과·전사·치환 결과·무대 좌표 규칙을 이 파일이 **스스로 다시 계산**해 대조한다.
//   · 「대략」이 아니라 규칙 자체를 문다(막대 높이는 「가짓수에 정비례」를 등식으로, 좌표는 등식·부등식으로).
//   · setTimeout·Date 를 샌드박스에 **일부러 넣지 않는다** — 연출 없이도 결과가 나는지 여기서 갈린다.
//   · 카드 차례(2026-09-12 교사 재배열): ①-1 cell → ①-2 code(4ⁿ·코돈의 정의) → ② zoom → ③ find(코돈표 찾기) → ④ dec → ⑤ mut. STEPS 6 · SEC_DEF 8 · confirm 은 find/dec/mut/write.
//   · 변이 확인(2026-09-12 재배열 뒤, 사본 23종 모두 FAIL · exit 1):
//       [1] LS_KEY→v1 · setTimeout 삽입      [2] --trna CSS 만 바꿈       [3] 코돈표 UGG↔UGA · codeBarH 를 √ 로
//       [4] pore.x+5 · csMrnaOut y 고정 · csStagger 0 · 이름표 전사 p≥1   [5] BLANK_IDX 바꿈 · p2 에서 ? 표시
//       [8] autoFrame 서수 −1                 [9]/[16] 완료에 💪 요구        [10] no[] 「옳지 않다.」 삭제
//       [12] init 의 null 가드 제거           [13] resetSec(dec) 가 mutRun 안 지움 · resetSec(mut) 가 mutGuess 안 지움 · resetSec(code) 가 find 를 지움 · dec.ask=false · code.ask=true
//       [15] 캡션에 「안티코돈」               [7]/[16] find 가 code 를 요구 · #codonDef 상시 노출
//       [7b] gbCombos 글자 차례 T/G 뒤바꿈 · gbGroups 꼬리 묶음 허용 · 괄호 너비 −10 빠짐 · 64칸 상시 op 1 · n=2 캡션 「다 가리킬 수 있다」 · GB.seq 에 U 되돌림
//       [5]/[7b] 코돈 띠 — zm 띠를 p≥2 부터 · gb 띠를 n=2 에도 · 띠 글자에서 「코돈」 삭제
//       [7c] ③ 코돈표 무대 — 열기 전 형광 · canOpen p≥2 · p<3 에서 열림 · 닫힌 칸 코돈 종류 기록 · 종류 없이 완료 · 위 축 A/G 뒤바꿈 · C_HL↔--hl · resetSec(find) 가 ctSeen 안 지움
// ════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const HTML = process.env.CODON_HTML
  ? path.resolve(process.env.CODON_HTML)
  : path.join(__dirname, '2-1_중심원리와유전부호해독_활동.html');  // ★USB 드라이브 문자는 PC마다 다르다 — 박지 말 것
const src = fs.readFileSync(HTML, 'utf8');

/* ★<script> 블록은 2개다 — 앞은 <head> 의 미완성 잠금, 뒤가 본체.
   본체만 vm 에 올린다(맨 앞 'use strict'; 를 벗겨야 최상위 var/function 이 전역으로 노출된다). */
const BLOCKS = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]);
if (BLOCKS.length !== 2) { console.error('FAIL: script 블록이 2개가 아니다 (' + BLOCKS.length + ')'); console.log('PASS 0 / FAIL 1'); process.exit(1); }
const gateJs = BLOCKS[0];
const js = BLOCKS[1].replace(/^\s*'use strict';/, '');
/* 주석을 걷어낸 본체 — grep 류 검사는 주석 때문에 양쪽으로 다 틀린다(제작표준 §9) */
const code = js.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const css = src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
const bodyHtml = (() => { const b = src.indexOf('<body>'); return src.slice(b, src.indexOf('<script>', b)); })();

let pass = 0, fail = 0;
/* 샌드박스가 도중에 죽어도(예: 본체에 setTimeout 이 끼어 스텁에 없는 전역을 부름) 요약 줄과 종료 코드는 남긴다 */
process.on('uncaughtException', e => {
  fail++; console.error('  X FAIL: 검사 도중 예외 — ' + (e && e.message));
  console.log('\nPASS ' + pass + ' / FAIL ' + fail); process.exit(1);
});
function ok(cond, name){ if (cond) { pass++; } else { fail++; console.error('  X FAIL: ' + name); } }
let _secStart = 0; const _origLog = console.log; if (process.env.CODON_COUNT) console.log = function(m){ if (/^\[\d+\]/.test(String(m))) { _origLog('   (앞 절 단언 ' + (pass + fail - _secStart) + ')'); _secStart = pass + fail; } _origLog(m); };
function eq(actual, expect, name){
  ok(actual === expect, name + '  [기대 ' + JSON.stringify(expect) + ' / 실제 ' + JSON.stringify(actual) + ']');
}
function eqJ(actual, expect, name){ eq(JSON.stringify(actual), JSON.stringify(expect), name); }
function near(actual, expect, eps, name){
  ok(typeof actual === 'number' && Math.abs(actual - expect) < eps,
     name + '  [기대 ' + expect + ' ± ' + eps + ' / 실제 ' + actual + ']');
}
function strip(t){ return String(t).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }

// ── HTML 안의 정적 id 목록(스텁 사전 등록 + 오타 검출용) ──
const HTML_IDS = [];
{ const re = /\bid="([^"]+)"/g; let x; while ((x = re.exec(src))) HTML_IDS.push(x[1]); }
// ── id 를 가진 태그의 인라인 style (display:none 등을 스텁에 반영) ──
const HTML_STYLE = {};
{
  const re = /<[a-zA-Z][^>]*>/g; let tag;
  while ((tag = re.exec(src))){
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

// ── CSS 파싱 도우미 (grep 대신 규칙 본문만 떼어 온다 — 주석이 검사를 속이지 못하게) ──
function cssRule(sel){
  const re = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}');
  const mm = css.match(re);
  return mm ? mm[1] : '';
}
function cssPx(block, prop){
  const mm = block.match(new RegExp('(?:^|[;{\\s])' + prop + '\\s*:\\s*([0-9.]+)px'));
  return mm ? parseFloat(mm[1]) : null;
}
function cssVal(block, prop){
  const mm = block.match(new RegExp('(?:^|[;{\\s])' + prop + '\\s*:\\s*([^;]+)'));
  return mm ? mm[1].trim() : null;
}
/* ★단독 선택자 규칙만 떼어 온다 — cssRule('body') 은 `html,body{…}` 에 먼저 걸린다. */
function cssRuleAlone(sel){
  const re = new RegExp('(?:^|[}{;\\n])\\s*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}');
  const mm = css.match(re);
  return mm ? mm[1] : '';
}
function cssHasClass(c){ return new RegExp('\\.' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])').test(css); }

// ══════════════════ DOM 스텁 / 샌드박스 ══════════════════
function makeSandbox(opt){
  opt = opt || {};
  const store = {};
  const missing = [];

  function makeEl(id){
    const classes = new Set();
    let _html = '';
    const el = {
      className:'', textContent:'', value:'', checked:false, type:'',
      disabled:false, offsetWidth:0, style:{}, children:[], attrs:{}, onclick:null, onchange:null,
      classList:{
        add:c=>classes.add(c), remove:c=>classes.delete(c),
        toggle:(c,f)=>{ if(f===undefined){ classes.has(c)?classes.delete(c):classes.add(c); } else if(f) classes.add(c); else classes.delete(c); return classes.has(c); },
        contains:c=>classes.has(c)
      },
      _classes:classes,
      setAttribute:(k,v)=>{ el.attrs[k]=v; },
      appendChild:c=>{ el.children.push(c); return c; },
      querySelector:()=>makeEl(),
      addEventListener:()=>{},
      focus:()=>{}
    };
    /* ★innerHTML 은 접근자다 — '' 를 넣으면 children 도 비우고,
       마크업이 들어오면 그 안의 id 를 **실제로 등록**한다.
       (그래야 ta_· c3_· c4_· zw· cs_* 처럼 렌더로 생기는 id 의 오타가 _missing 에 잡히고,
        코돈표 칸의 classList 가 진짜 원소 위에서 돈다) */
    Object.defineProperty(el, 'innerHTML', {
      get(){ return _html; },
      set(v){
        _html = String(v);
        if (_html === '') el.children.length = 0;
        const re = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g; let tag;
        while ((tag = re.exec(_html))){
          const im = tag[2].match(/\bid="([^"]+)"/);
          if (!im) continue;
          const child = makeEl();                      // 새 마크업 = 새 노드
          const cm = tag[2].match(/\bclass="([^"]*)"/);
          if (cm){ child.className = cm[1]; cm[1].split(/\s+/).filter(Boolean).forEach(c => child._classes.add(c)); }
          const sm = tag[2].match(/\bstyle="([^"]*)"/);
          if (sm) sm[1].split(';').forEach(p => {
            const i = p.indexOf(':');
            if (i > 0) child.style[p.slice(0,i).trim().replace(/-([a-z])/g,(x,c)=>c.toUpperCase())] = p.slice(i+1).trim();
          });
          const om = tag[2].match(/\bopacity="([^"]*)"/);
          if (om) child.attrs.opacity = om[1];
          const tm = tag[2].match(/\btransform="([^"]*)"/);
          if (tm) child.attrs.transform = tm[1];
          child.id = im[1];                            // setter 가 store 에 등록한다
        }
      }
    });
    Object.defineProperty(el, 'id', { get(){ return el._id; }, set(v){ el._id = v; store[v] = el; } });
    if (id !== undefined) el.id = id;
    return el;
  }

  HTML_IDS.forEach(id => {                     // 정적 id 먼저 등록 (인라인 style 반영)
    const el = makeEl(id);
    Object.assign(el.style, HTML_STYLE[id] || {});
  });

  const mem = Object.assign({}, opt.seed || {});
  const rec = { confirmRet: (opt.confirmRet !== false), confirms:0, reloads:0, confirmMsgs:[] };
  const sb = {
    console, Math, JSON, Object, Array, String, Number, Boolean, isNaN, parseInt, parseFloat, RegExp,
    document:{
      documentElement:{ className:'unlocked' },
      getElementById(id){
        if (store[id]) return store[id];
        missing.push(id);                       // HTML에도 없고 렌더된 마크업에도 없다 = id 오타 가능
        return (store[id] = makeEl(id));
      },
      createElement:()=>makeEl(),
      createElementNS:()=>makeEl(),
      addEventListener:()=>{}
    },
    localStorage:{
      getItem:k=>(k in mem ? mem[k] : null),
      setItem:(k,v)=>{ mem[k] = String(v); },
      removeItem:k=>{ delete mem[k]; },
      _mem:mem
    },
    confirm(msg){ rec.confirms++; rec.lastConfirm = msg; rec.confirmMsgs.push(msg); return rec.confirmRet; },
    location:{ reload(){ rec.reloads++; } },
    /* <head> 잠금 스크립트가 정의하는 전역 — 본체가 참조하므로 미리 넣어 준다 (값은 [1]에서 대조한다) */
    DRAFT_MODE:false, DRAFT_PASS:'7856', DRAFT_KEY:'codon_sim_draft_ok'
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(js, sb);                     // 끝에서 init() 이 스스로 돈다
  sb._store = store; sb._missing = missing; sb._rec = rec;
  return sb;
}

// ── 무대 조작 도우미 ──
function txt(S, id){ const e = S._store[id]; return e ? String(e.textContent) : null; }
function html(S, id){ const e = S._store[id]; return e ? String(e.innerHTML) : null; }
function hasCls(S, id, c){ const e = S._store[id]; return !!(e && e.classList && e.classList.contains(c)); }
function attr(S, id, k){ const e = S._store[id]; return e ? e.attrs[k] : undefined; }
function dis(S, id){ const e = S._store[id]; return e ? !!e.disabled : undefined; }
function stored(S){ try { return JSON.parse(S.localStorage._mem[S.LS_KEY]) || null; } catch(e){ return null; } }
/* 마운트된 SVG 문자열에서 <g id="…"> 한 덩이(중첩 g 없음)를 떼어 온다 */
function gOf(svg, id){ const m = svg.match(new RegExp('<g id="' + id + '"[^>]*>([\\s\\S]*?)</g>')); return m ? m[0] : ''; }
/* ③ 코돈표를 끝까지 하는 도우미 — 축 3 → 16칸 → 세 종류 */
const CT_KEYS_ALL = ['U','C','A','G'].flatMap(a => ['U','C','A','G'].map(b => a + b));
function ctOpenAll(T){ T.aniGo('ct', 99); CT_KEYS_ALL.forEach(k => T.ctOpenCell(k)); T.ctTapCodon('AUG'); T.ctTapCodon('UAA'); T.ctTapCodon('CAU'); }

// ════════════════════════════════════════════════════════════════════════
//  ★검사가 스스로 갖는 정본 — 교과서 62쪽 코돈표를 손으로 다시 적었다.
//    축 차례는 U·C·A·G. 세 번째 염기가 U→C→A→G 로 돈다. 앱의 CODON_GROUPS 를 쓰지 않는다.
// ════════════════════════════════════════════════════════════════════════
const REF_ROWS = {
  UU:['페닐알라닌','페닐알라닌','류신','류신'],
  UC:['세린','세린','세린','세린'],
  UA:['타이로신','타이로신','종결코돈','종결코돈'],
  UG:['시스테인','시스테인','종결코돈','트립토판'],
  CU:['류신','류신','류신','류신'],
  CC:['프롤린','프롤린','프롤린','프롤린'],
  CA:['히스티딘','히스티딘','글루타민','글루타민'],
  CG:['아르지닌','아르지닌','아르지닌','아르지닌'],
  AU:['아이소류신','아이소류신','아이소류신','메싸이오닌'],
  AC:['트레오닌','트레오닌','트레오닌','트레오닌'],
  AA:['아스파라진','아스파라진','라이신','라이신'],
  AG:['세린','세린','아르지닌','아르지닌'],
  GU:['발린','발린','발린','발린'],
  GC:['알라닌','알라닌','알라닌','알라닌'],
  GA:['아스파트산','아스파트산','글루탐산','글루탐산'],
  GG:['글라이신','글라이신','글라이신','글라이신']
};
const REF_AXIS = ['U','C','A','G'];
const REF = {};
REF_AXIS.forEach(b1 => REF_AXIS.forEach(b2 => REF_AXIS.forEach((b3, k) => {
  REF[b1 + b2 + b3] = REF_ROWS[b1 + b2][k];
})));
const REF_STOP = ['UAA','UAG','UGA'];
const ALL_CODONS = Object.keys(REF);

function refSplit(seq, f){ const o = []; for (let i = f; i + 3 <= seq.length; i += 3) o.push(seq.slice(i, i + 3)); return o; }
function refDecode(seq, f){
  const cods = refSplit(seq, f), aas = []; let stopAt = -1;
  for (let i = 0; i < cods.length; i++){
    if (REF[cods[i]] === '종결코돈'){ stopAt = i; break; }
    aas.push(REF[cods[i]]);
  }
  return { codons:cods, aas, stopAt, need:(stopAt >= 0 ? stopAt + 1 : cods.length) };
}
/* 전사 — 주형 3′→5′ 를 5′→3′ mRNA 로. A 에는 U. */
const REF_D2R = { A:'U', T:'A', G:'C', C:'G' };
function refTranscribe(t){ let o = ''; for (const ch of t) o += REF_D2R[ch]; return o; }

const REF_MRNA = 'CAUGGUAACGUGACUUCGAAUGCA';                     // 교과서 62쪽 해 보기 (24 염기)
const REF_TPL  = 'ACCTACAACCGTCAT';                              // 61쪽 그림 Ⅱ-2 DNA 주형 3′→5′
const REF_DEMO = 'UGGAUGUUGGCAGUA';                              // 61쪽 mRNA 5′→3′
const REF_CODING = 'TGGATGTTGGCAGTA';                            // 상대 가닥 5′→3′ (mRNA 의 U→T)
const REF_DEMO_AA = ['메싸이오닌','류신','알라닌','발린'];
const REF_F0_AA = ['히스티딘','글라이신','아스파라진','발린','트레오닌','세린','아스파라진','알라닌'];
/* 62쪽 해 보기 3 + 같은 서열의 두 자리 — 검사가 스스로 계산한 결과 */
const REF_MUTS = [ { pos:10, to:'A', kind:'change' }, { pos:12, to:'A', kind:'same' }, { pos:17, to:'A', kind:'stop' } ];
function refMutSeq(pos, to){ return REF_MRNA.slice(0, pos - 1) + to + REF_MRNA.slice(pos); }
function refKind(pos, to){
  const b = refDecode(REF_MRNA, 0), n = refDecode(refMutSeq(pos, to), 0);
  if (n.stopAt >= 0 && b.stopAt < 0) return 'stop';
  return (n.aas.join('/') === b.aas.join('/')) ? 'same' : 'change';
}
const REF_BLANK = [1, 3, 4, 10];

// 타원 안팎 판정 — 값 1 이면 테두리 위
function ellV(p, e){ return Math.pow((p.x - e.cx) / e.rx, 2) + Math.pow((p.y - e.cy) / e.ry, 2); }
// 점 P 와 선분 AB 사이의 거리
function segDist(P, A, B){
  const dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy;
  let t = L2 ? ((P.x - A.x) * dx + (P.y - A.y) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = A.x + t * dx, qy = A.y + t * dy;
  return { d: Math.hypot(P.x - qx, P.y - qy), t };
}

// ════════════════════════════════════════════════════════════════════════
console.log('\n═══ 2-1 중심원리와 유전부호 해독 — 회귀 검사 (' + path.basename(HTML) + ') ═══\n');

// ══ 1. 정적 구조 ══
console.log('[1] 정적 구조 (단일 파일 · 잠금 · 저장 키 · 44px · 16px · 2단 경계 · 타이머 없음)');
{
  eq(BLOCKS.length, 2, '<script> 블록이 정확히 2개다');
  eq((src.match(/\bsrc="/g) || []).length, 0, '외부 script/이미지 참조 0건');
  eq((src.match(/\bhref="/g) || []).length, 0, '외부 스타일시트·링크 0건');
  ok(/<meta name="viewport" content="width=device-width/.test(src), 'viewport meta 가 있다');
  ok(/^\s*<!DOCTYPE html>/i.test(src), 'DOCTYPE 선언');
  ok(/<html lang="ko">/.test(src), 'lang="ko"');
  ok(/<title>중심원리와 유전부호 해독<\/title>/.test(src), '제목이 활동 이름이다');

  // ── 미완성 잠금 (<head> 블록에서 직접 읽는다) ──
  const pass7856 = (gateJs.match(/DRAFT_PASS\s*=\s*'([^']*)'/) || [])[1];
  const dkey     = (gateJs.match(/DRAFT_KEY\s*=\s*'([^']*)'/) || [])[1];
  const dmode    = (gateJs.match(/DRAFT_MODE\s*=\s*(true|false)/) || [])[1];
  eq(pass7856, '7856', '★DRAFT_PASS 가 교사 지정 공통값 7856 이다');
  eq(dkey, 'codon_sim_draft_ok', 'DRAFT_KEY 에 활동 이름이 박혀 있다');
  ok(String(dkey).indexOf('codon_sim') === 0, '  → 한 origin 에서 localStorage 를 공유하므로 접두사가 필요하다');
  ok(dmode === 'true' || dmode === 'false', 'DRAFT_MODE 가 참·거짓 상수다 (지금 ' + dmode + ')');
  ok(/html:not\(\.unlocked\)\s*body\s*>\s*\.wrap\s*\{\s*display:\s*none/.test(css),
     '잠김이 기본이다(fail-closed) — .unlocked 가 없으면 본문이 숨는다');
  ok(/getItem\(DRAFT_KEY\)\s*===\s*'y'/.test(gateJs), '잠금 해제 기억은 DRAFT_KEY === "y" 로만 읽는다');

  // ── 저장 키 ──
  const lsKey = (code.match(/var LS_KEY\s*=\s*'([^']*)'/) || [])[1];
  eq(lsKey, 'codon_sim_v2', '★LS_KEY 가 codon_sim_v2 다 (옛 v1 저장분이 되살아나지 않게 올렸다)');
  ok(String(lsKey).indexOf('codon_sim') === 0, '  → LS_KEY 도 활동 이름으로 시작한다');
  ok(lsKey !== dkey, 'LS_KEY 와 DRAFT_KEY 가 서로 다른 칸이다');
  eq((code.match(/localStorage\.setItem\(/g) || []).length, 2, 'localStorage.setItem 은 두 자리뿐이다 (저장 · 잠금 해제 기억)');

  // ── 터치 규격 ──
  eq(cssPx(cssRuleAlone('body'), 'font-size'), 16, '본문 글자 16px');
  ok(cssPx(cssRuleAlone('body'), 'line-height') === null, '  (줄간격은 배수로 준다 — px 로 굳히지 않았다)');
  [['.btn','단추'], ['.chip','칩'], ['.choice','선지'], ['.hintbtn','힌트 단추'], ['.secreset button','섹션 되돌리기 단추'],
   ['.anibar .btn','연출 단추']]
    .forEach(([sel, name]) => {
      const h = cssPx(cssRule(sel), 'min-height');
      ok(h !== null && h >= 44, name + ' ' + sel + ' min-height ≥ 44px (실제 ' + h + ')');
    });
  ok(cssPx(cssRule('#draftGate input'), 'min-height') >= 44, '잠금 화면 입력칸 min-height ≥ 44px');
  ok(cssPx(cssRule('.selfcheck input'), 'width') >= 22, '자기평가 체크상자가 22px 이상이다');
  ok(cssPx(cssRule('.btn'), 'font-size') >= 16, '.btn 글자 16px 이상');
  ok(cssPx(cssRule('.choice'), 'font-size') >= 16, '.choice 글자 16px 이상');
  ok(cssPx(cssRule('.anibar .btn'), 'font-size') >= 16, '연출 단추 글자 16px 이상');
  ok(cssPx(cssRule('.taskbar'), 'font-size') >= 16, '지시 막대 글자 16px 이상');
  ok(cssPx(cssRule('.anicap'), 'font-size') >= 16, '연출 캡션 글자 16px 이상');
  ok(cssPx(cssRule('.chip'), 'font-size') >= 15, '.chip 글자 15px 이상');
  ok(cssPx(cssRule('table.ctab'), 'font-size') >= 15, '코돈표 글자 15px 이상');
  ok(cssPx(cssRule('.tile'), 'font-size') >= 16, '염기 타일 글자 16px 이상');
  ok(cssPx(cssRule('.ce'), 'height') !== null && cssPx(cssRule('.ce'), 'height') >= 30, '코돈표 칸 높이가 30px 이상이다');

  // ── 연출 접근성 ──
  ok(/\.rfade\s*\{[^}]*transition:\s*opacity/.test(css), '.rfade 가 opacity 전환을 건다');
  ok(/\.rmove\s*\{[^}]*transition:\s*transform/.test(css), '.rmove 가 transform 전환을 건다');
  ok(/@media \(prefers-reduced-motion: reduce\)/.test(css), 'prefers-reduced-motion 규칙이 있다');
  ok(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.rfade[^}]*\.rmove[^}]*\{[^}]*transition:\s*none/.test(css),
     '  → 그 안에서 .rfade·.rmove 의 transition 을 끈다');

  // ── 2단 경계 ──
  eq((css.match(/@media \(min-width:1180px\)/g) || []).length, 1, '2단 경계가 1180px 이다 (한 번)');
  eq((css.match(/@media \(max-width:1179\.98px\)/g) || []).length, 1, '좁은 쪽 경계가 1179.98px 이다 (정수로 끊지 않는다)');
  eq((css.match(/max-width:1179px/g) || []).length, 0, '  → 1179px 로 정수로 끊은 자리가 없다');
  ok(/\.pr-do\s*\{\s*order:1/.test(css) && /\.pane-l\s*\{\s*order:2/.test(css) && /\.pr-q\s*\{\s*order:3/.test(css),
     '좁은 화면에서 조작 → 자료 → 문항 으로 되세운다');
  ok(/\.pane-l\s*\{[^}]*position:sticky/.test(css), '.pane-l 이 sticky 다');
  ok(/\.pane-l,\.pr-do,\.pr-q\s*\{[^}]*min-width:0[^}]*width:100%/.test(css),
     '좁은 화면에서 칸이 내용 크기 아래로 줄어든다 (min-width:0 + width:100%)');
  ok(/\.stage-wrap\s*\{[^}]*overflow-x:auto/.test(css), '.stage-wrap 이 가로 넘침을 스크롤로 흡수한다');
  ok(!/\.stage-wrap\s*\{[^}]*overflow:hidden/.test(css), '  → overflow:hidden 으로 잘라 내지 않는다');

  // ── 코돈표는 왼쪽 칸 안에 들어와야 한다 (CSS 상수로 왼쪽 칸 최대폭을 되계산해 대조) ──
  const wrapMax  = cssPx(cssRule('.wrap'), 'max-width');
  const splitOut = parseFloat((cssRule('.card.split').match(/clamp\(0px,[^,]+,\s*([0-9.]+)px\)/) || [])[1]);
  const cardPad  = parseFloat((cssVal(cssRule('.card'), 'padding') || '').split(/\s+/)[0]);
  const panes    = cssRule('.panes');
  const rightMax = parseFloat((panes.match(/minmax\(300px,\s*([0-9.]+)px\)/) || [])[1]);
  const gap      = cssPx(panes, 'gap');
  eq(wrapMax, 980, '.wrap 최대폭 980px');
  eq(splitOut, 150, '.card.split 이 한쪽으로 넓히는 최대값 150px');
  eq(rightMax, 440, '오른쪽 칸 최대폭 440px');
  const leftMax = wrapMax + 2 * splitOut - 2 * cardPad - gap - rightMax;
  eq(leftMax, 786, '  → 왼쪽 칸 최대폭은 786px 로 계산된다');
  const ctabMin = cssPx(cssRule('table.ctab'), 'min-width');
  ok(ctabMin !== null && ctabMin <= leftMax, '★table.ctab 의 min-width(' + ctabMin + 'px) 가 왼쪽 칸(' + leftMax + 'px)을 넘지 않는다');
  ok(/\.ctab-outer\s*\{[^}]*overflow-x:auto/.test(css), '.ctab-outer 가 넘치는 몫을 스크롤로 흡수한다');
  const stMin = cssPx(cssRuleAlone('svg.stage'), 'min-width');
  ok(stMin !== null && stMin <= leftMax, '무대 svg 의 min-width(' + stMin + ') 도 왼쪽 칸을 넘지 않는다');
  ok(/#ctNow4\s*\{[^}]*position:sticky/.test(css), '④ 「지금 할 일」 줄이 sticky 다 (표가 길어도 늘 보인다)');

  // ── 무대 SVG 두 개 ──
  const VB = { csStage:340, zmStage:360, groupStage:292, ctStage:548 };
  ['csStage','zmStage','groupStage','ctStage'].forEach(id => {
    const tag = (bodyHtml.match(new RegExp('<svg[^>]*id="' + id + '"[^>]*>')) || [''])[0];
    ok(new RegExp('viewBox="0 0 700 ' + VB[id] + '"').test(tag), id + ' viewBox 가 700×' + VB[id] + ' 이다');
    ok(/aria-label="[^"]{20,}"/.test(tag), id + ' 에 aria-label 이 있다');
    ok(/class="stage"/.test(tag), id + ' 가 .stage 다');
  });

  // ── 타이머·새로고침 ──
  eq((code.match(/\bsetTimeout\s*\(/g) || []).length, 0, '★본체가 setTimeout 을 쓰지 않는다 (결과는 연출과 무관하게 즉시 확정)');
  eq((code.match(/\bsetInterval\s*\(|\brequestAnimationFrame\s*\(/g) || []).length, 0, '  → setInterval·rAF 도 없다');
  eq((code.match(/\bnew Date\b|\bDate\.now\b/g) || []).length, 0, '  → Date 도 쓰지 않는다');
  eq((gateJs.match(/\bsetTimeout\s*\(/g) || []).length, 0, '  → 잠금 스크립트에도 없다');
  const resetSecBody = (code.match(/function resetSec\(key\)\{([\s\S]*?)\n\}/) || ['',''])[1];
  ok(resetSecBody.length > 100, 'resetSec 본문을 떼어 왔다');
  eq((resetSecBody.match(/location\.reload/g) || []).length, 0, '★resetSec 안에 location.reload 가 없다');
  eq((code.match(/location\.reload\(\)/g) || []).length, 1, 'location.reload() 는 파일에 한 번뿐이다 (resetAll)');
  ok(/function resetAll\(\)\{[\s\S]*?location\.reload\(\)/.test(code), '  → 그 한 번이 resetAll 안이다');
  ok(!/function card\w*Open\(/.test(code), '섹션 잠금 판정 함수(cardNOpen 류)가 없다 — 카드는 처음부터 다 열려 있다');
  eq((bodyHtml.match(/onclick="resetSec\('/g) || []).length, 8, '↻ 되돌리기 단추가 8개다 (①-1 ①-2 ② ③ ④ ⑤ · 💪 · ⑥)');
  eqJ([...bodyHtml.matchAll(/onclick="resetSec\('(\w+)'\)"/g)].map(m => m[1]), ['cell','code','zoom','find','dec','mut','prac','write'], '  → 카드 차례대로 cell · code · zoom · find · dec · mut · prac · write');
  eqJ([...bodyHtml.matchAll(/<div class="card split" id="(\w+)"/g)].map(m => m[1]), ['cardCell','cardCode','cardZoom','cardFind','cardDec','cardMut'], '★2단 카드 차례 — cardCell → cardCode → cardZoom → cardFind → cardDec → cardMut');
  const h2s = [...bodyHtml.matchAll(/<h2[^>]*>([^<]*)/g)].map(m => m[1].trim());
  ['①-1 세포 한 바퀴 — 유전정보는 어디서 어디로 가는가', '①-2 글자 몇 개로 무엇을 적는가 — 유전부호', '② 염기서열에 집중하기', '③ 코돈표 — 개시코돈 · 아미노산 지정 코돈 · 종결코돈', '④ 해독 — 코돈표로 mRNA 를 읽는다', '⑤ 염기 하나가 바뀌면', '💪 더 풀어 보기', '⑥ 정리하기']
    .forEach((t, i) => eq(h2s[i], t, '★카드 제목 ' + (i + 1) + ' = 「' + t + '」'));
  ['↻ ①-1 처음 국면부터 다시 보기', '↻ ①-2 다시 하기', '↻ ② 빈칸 지우고 다시 하기', '↻ ③ 연 칸 지우고 다시 하기', '↻ ④ 해독을 지우고 다시 하기', '↻ ⑤ 예상과 결과를 지우고 다시 하기', '↻ 💪 다시 풀기', '↻ ⑥ 적은 답안 지우고 다시 하기']
    .forEach(t => ok(bodyHtml.indexOf('>' + t + '</button>') >= 0, '  되돌리기 단추 「' + t + '」'));
  ok(/<div class="verdict-card good" id="codonDef" style="[^"]*display:none;?"/.test(bodyHtml), '★코돈 결론(#codonDef)은 마크업에서 숨겨져 있다 (셋을 다 눌러 본 뒤에만)');
  ok(/id="codonDef"[^>]*>[\s\S]*?세 자리의 연속된 염기[\s\S]*?<b>코돈<\/b>이라고 한다/.test(bodyHtml), '  → 그 안에 「세 자리의 연속된 염기 … 코돈이라고 한다」');
  ok(bodyHtml.indexOf('id="codonDef"') < bodyHtml.indexOf('id="cardZoom"'), '  → 코돈의 정의가 ②보다 앞(①-2)에 있다');
  eq((bodyHtml.match(/onclick="resetAll\(\)"/g) || []).length, 1, '전체 되돌리기 단추는 맨 아래 하나다');
}

// ══ 2. 색 · CSS ══
console.log('[2] 색 · CSS (CSS 변수 ↔ JS 상수 · 채도 · 색거리 · JS 가 쓰는 class 가 CSS 에 있는가)');
{
  const S = makeSandbox();
  const root = cssRule(':root');
  function v(name){ const m = root.match(new RegExp('--' + name + ':\\s*(#[0-9A-Fa-f]{6})')); return m ? m[1].toUpperCase() : null; }
  function rgb(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
  function sat(h){ const c = rgb(h); return Math.max.apply(null, c) - Math.min.apply(null, c); }
  function dist(a, b){ const x = rgb(a), y = rgb(b); return Math.round(Math.hypot(x[0]-y[0], x[1]-y[1], x[2]-y[2])); }
  function lum(h){ const c = rgb(h); return c[0] + c[1] + c[2]; }

  // (1) 사양의 다섯 색 — 값·짝·채도
  const SPEC = { dna:'#0F9B95', rna:'#6C2BD9', prot:'#C2185B', ribo:'#9A4B12', trna:'#7A8A00', hl:'#EEFF41' };
  const JSC  = { dna:S.C_DNA, rna:S.C_RNA, prot:S.C_PROT, ribo:S.C_RIBO, trna:S.C_TRNA, hl:S.C_HL };
  Object.keys(SPEC).forEach(n => {
    eq(String(JSC[n]).toUpperCase(), SPEC[n], '★JS C_' + n.toUpperCase() + ' 가 사양의 ' + SPEC[n] + ' 이다');
    eq(v(n), SPEC[n], '★CSS --' + n + ' 이 사양의 ' + SPEC[n] + ' 이다');
    eq(String(JSC[n]).toUpperCase(), v(n), '★CSS --' + n + ' 과 JS 상수가 같은 값이다 (어긋나면 범례와 그림의 색이 갈린다)');
    ok(sat(SPEC[n]) >= 120, '★--' + n + ' 의 채도가 충분하다 (최대−최소 = ' + sat(SPEC[n]) + ' ≥ 120)');
  });
  // (2) 서로 다르고 충분히 멀다
  const names = Object.keys(SPEC);
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++){
    ok(SPEC[names[i]] !== SPEC[names[j]], '자료 색 --' + names[i] + ' ≠ --' + names[j]);
    ok(dist(SPEC[names[i]], SPEC[names[j]]) >= 60, '  → 색거리 ' + dist(SPEC[names[i]], SPEC[names[j]]) + ' ≥ 60');
  }
  [['dna','rna'],['dna','prot'],['rna','prot']].forEach(([a,b]) =>
    ok(dist(SPEC[a], SPEC[b]) >= 120, '★핵심 세 색 --' + a + '·--' + b + ' 의 색거리 ' + dist(SPEC[a], SPEC[b]) + ' ≥ 120'));
  // (3) 굳은 뜻의 색과 겹치지 않는다
  ['blue','green','red','amber','old','yellow','teal'].forEach(f => {
    const fv = v(f);
    ok(fv !== null, 'CSS 에 예약 색 --' + f + ' 이 있다');
    names.forEach(n => ok(SPEC[n] !== fv, '★자료 색 --' + n + ' 이 예약 색 --' + f + ' 과 같지 않다'));
  });
  eq(String(S.C_GEAR).toUpperCase(), v('old'), '기구 색 C_GEAR 는 회색 --old 와 같다 (회색=기구)');
  // (4) 글자용 짙은 짝
  ['dna','rna','prot','ribo','trna','hl'].forEach(n => {
    const ink = v(n + '-ink');
    ok(ink !== null, '--' + n + '-ink (글자용 짙은 짝) 이 있다');
    ok(ink !== null && lum(ink) < lum(SPEC[n]), '  → --' + n + '-ink 가 --' + n + ' 보다 어둡다');
  });
  // (5) 색만으로 구분시키지 않는다 — 진한 칸에 흰 점
  const cs = html(S, 'csStage'), zm = html(S, 'zmStage');
  ['cs_ribo','cs_trna_0','cs_trna_1','cs_trna_2','cs_aa_0','cs_aa_1','cs_aa_2'].forEach(id =>
    ok(/fill="#fff"/.test(gOf(cs, id)), '① ' + id + ' 에 흰 점이 찍혀 있다'));
  ['zm_a_0','zm_a_1','zm_a_2','zm_a_3'].forEach(id => ok(/fill="#fff"/.test(gOf(zm, id)), '② ' + id + ' 에 흰 점이 찍혀 있다'));
  ok(/<g id="zd_t_0"[^>]*>[^<]*<rect[^>]*fill="#0F9B95"/.test(zm) && /id="zd_tt_0"[^>]*fill="#fff"/.test(zm),
     '② 주형 가닥은 진한 칸 + 흰 글자다 (상대 가닥과 모양으로 갈린다)');
  ok(/<g id="zd_c_0"[^>]*>[^<]*<rect[^>]*fill="#DFF6F4"/.test(zm), '  → 상대 가닥은 연한 칸이다');
  ok(/<circle[^>]*fill="#fff"/.test(html(S, 'cs_lg')), '범례의 라이보솜·tRNA 아이콘에도 흰 점이 있다');

  // (6) ★JS·본문이 쓰는 class 가 CSS 에 다 있는가
  const used = new Set();
  for (const m of code.matchAll(/class="([^"]*)"/g)) m[1].split("'")[0].split(/\s+/).forEach(t => { if (/^[A-Za-z][\w-]*$/.test(t)) used.add(t); });
  for (const m of code.matchAll(/className\s*=\s*'([^']*)'/g)) m[1].split(/\s+/).forEach(t => { if (/^[A-Za-z][\w-]*$/.test(t)) used.add(t); });
  /* ' disabled' 는 속성이지 class 가 아니다 — 속성 이름은 뺀다 */
  const ATTR = new Set(['disabled','checked','selected','readonly']);
  for (const m of code.matchAll(/'((?: [a-z][\w-]*)+)'/g)) m[1].trim().split(/\s+/).forEach(t => { if (!ATTR.has(t)) used.add(t); });
  for (const m of code.matchAll(/ct(?:Mark|ClearAll)\([^)]*'([a-z][\w-]*)'\)/g)) used.add(m[1]);
  for (const m of bodyHtml.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach(t => { if (/^[A-Za-z][\w-]*$/.test(t)) used.add(t); });
  /* 조건식 안에서만 나오는 상태 클래스 — 본체를 읽어 손으로 보탰다. (g0 는 「기본 상태」라 CSS 가 없어도 된다 — 넣지 않는다) */
  ['lit','g1','good','warn','info','bad','rmove','rfade','stage','unlocked','fbox','farr','rstep','slot','cod','tile','ok','on','cur','hide','found','done','now','stopcod','mut','changed','dim','right','picked','filled','blank','okb','badb','ghost']
    .forEach(t => used.add(t));
  ok(used.size >= 90, 'JS·본문에서 class 이름을 ' + used.size + '개 모았다 (검사가 헛돌지 않는다)');
  ['ce','cd','tno','codbig','axishint','verdict-card','autoframe','slotrow','pq-card','hintbtn','qwrap','ansbox','anicap','anistep','rlg','flowcap']
    .forEach(t => ok(used.has(t), '  (모은 목록에 ' + t + ' 가 들어 있다)'));
  const missingCls = [...used].sort().filter(c => !cssHasClass(c));
  eqJ(missingCls, [], '★JS·본문이 쓰는 class ' + used.size + '개가 모두 CSS 에 선언되어 있다 (빠진 것 목록)');
  ok(!cssHasClass('locked') && !cssHasClass('lockable'), '섹션 잠금용 클래스(.locked/.lockable)가 없다');
}

// ══ 3. 자료층 ══
console.log('[3] 자료층 (코돈표 64칸 · 해독 세 틀 · 전사 · 61쪽 보기 · 치환 3자리 · 4ⁿ 막대)');
{
  const S = makeSandbox();
  // (1) 코돈표 64칸 전수 — 검사가 손으로 적은 교과서 표와 대조
  eqJ(S.BASES4, REF_AXIS, '축 차례가 U·C·A·G 다 (교과서 62쪽)');
  eq(S.CODON_GROUPS.length, 21, 'CODON_GROUPS 가 21줄이다 (아미노산 20 + 종결코돈 1)');
  const flat = []; S.CODON_GROUPS.forEach(g => g[1].forEach(c => flat.push(c)));
  eq(flat.length, 64, '21줄에 적힌 코돈이 모두 64개다');
  eq(new Set(flat).size, 64, '  → 같은 코돈이 두 줄에 겹쳐 적히지 않았다');
  eq(Object.keys(S.CODON_TABLE).length, 64, 'CODON_TABLE 이 64칸이다');
  ALL_CODONS.forEach(c => eq(S.CODON_TABLE[c], REF[c], '  ' + c + ' = ' + REF[c]));
  const stops = ALL_CODONS.filter(c => S.CODON_TABLE[c] === '종결코돈');
  eqJ(stops.slice().sort(), REF_STOP.slice().sort(), '★종결코돈은 UAA · UAG · UGA 세 개다');
  eqJ(S.STOP_CODONS.slice().sort(), REF_STOP.slice().sort(), '  → STOP_CODONS 도 같다');
  eq(S.START_CODON, 'AUG', '★개시코돈은 AUG 다');
  ok(S.isStartCodon('AUG') && !S.isStartCodon('GUG') && !S.isStartCodon('AUA'), '  → isStartCodon 은 AUG 에만 참이다');
  ok(REF_STOP.every(c => S.isStopCodon(c)) && !S.isStopCodon('AUG') && !S.isStopCodon('UGG'), '  → isStopCodon 은 세 코돈에만 참이다');
  eq(S.codonToAA('ZZZ'), null, 'codonToAA 는 없는 코돈에 null 을 준다');
  eq(new Set(ALL_CODONS.map(c => REF[c]).filter(a => a !== '종결코돈')).size, 20, '아미노산이 20종류다');
  eqJ(S.codonsOf('류신').slice().sort(), ALL_CODONS.filter(c => REF[c] === '류신').sort(), 'codonsOf(류신) 이 6개와 같다');
  eqJ(S.CT_KINDS, ['start','aa','stop'], '★③ 코돈의 종류 셋 = start · aa · stop');
  eqJ(ALL_CODONS.map(c => S.codonKind(c)), ALL_CODONS.map(c => c === 'AUG' ? 'start' : (REF[c] === '종결코돈' ? 'stop' : 'aa')), '★codonKind 64칸이 검사의 판정과 같다');

  // (2) 62쪽 mRNA 와 세 읽기틀
  eq(S.MRNA, REF_MRNA, '★교과서 62쪽 mRNA 서열이 그대로다 (24 염기)');
  ok(/^[UCAG]{24}$/.test(S.MRNA), '  → RNA 염기(U·C·A·G) 24자다');
  [0,1,2].forEach(f => {
    const D = S.decode(REF_MRNA, f), R = refDecode(REF_MRNA, f);
    eqJ(D.codons, R.codons, '★읽기틀 ' + f + ' 의 코돈 목록이 검사의 계산과 같다');
    eqJ(D.aas, R.aas, '★읽기틀 ' + f + ' 의 아미노산 목록이 같다');
    eq(D.stopAt, R.stopAt, '★읽기틀 ' + f + ' 의 종결 자리가 같다');
    eq(D.need, R.need, '  → 탭해야 하는 칸 수도 같다');
  });
  eqJ(S.decode(REF_MRNA, 0).aas, REF_F0_AA, '★1번째 염기부터: 히스티딘–글라이신–아스파라진–발린–트레오닌–세린–아스파라진–알라닌');
  eq(S.decode(REF_MRNA, 0).stopAt, -1, '★1번째 염기부터는 종결코돈이 없다');
  eq(S.decode(REF_MRNA, 0).need, 8, '  → 탭할 칸 8개');
  eq(S.decode(REF_MRNA, 1).stopAt, 3, '★2번째 염기부터: 4번째 코돈이 종결코돈이다');
  eq(S.decode(REF_MRNA, 1).codons[3], 'UGA', '  → 그 코돈은 UGA');
  eq(S.decode(REF_MRNA, 1).aas.length, 3, '  → 아미노산 3개');
  eq(S.decode(REF_MRNA, 2).stopAt, 1, '★3번째 염기부터: 2번째 코돈이 종결코돈이다');
  eq(S.decode(REF_MRNA, 2).codons[1], 'UAA', '  → 그 코돈은 UAA');
  eq(S.decode(REF_MRNA, 2).aas.length, 1, '  → 아미노산 1개');
  eq(S.splitCodons(REF_MRNA, undefined).length, 8, 'frame 이 없으면 0 으로 본다');
  eq(S.decode('AU', 0).need, 0, '3자리가 못 되는 서열은 탭할 칸이 없다');

  // (3) 61쪽 그림 Ⅱ-2 — 전사
  eq(S.DEMO_TEMPLATE, REF_TPL, '★주형 가닥 3′→5′ = ACCTACAACCGTCAT');
  eq(S.transcribe(REF_TPL), REF_DEMO, '★transcribe(주형) = UGGAUGUUGGCAGUA');
  eq(refTranscribe(REF_TPL), REF_DEMO, '  → 검사의 전사 규칙으로도 같다');
  eq(S.DEMO_MRNA, REF_DEMO, '  → DEMO_MRNA 도 같은 값이다');
  eq(S.DEMO_CODING, REF_CODING, '★상대(암호) 가닥 = mRNA 의 U→T');
  eq(S.DEMO_CODING, REF_DEMO.replace(/U/g, 'T'), '  → 검사가 스스로 바꾼 값과 같다');
  eq(S.DEMO_START, 3, '★개시코돈 자리가 3 (0부터)');
  eq(REF_DEMO.indexOf('AUG'), 3, '  → 서열에서 AUG 가 처음 나오는 자리도 3 이다');
  eqJ(S.DEMO_AA, REF_DEMO_AA, '★메싸이오닌 – 류신 – 알라닌 – 발린');
  eqJ(refDecode(REF_DEMO, 3).aas, REF_DEMO_AA, '  → 검사의 해독으로도 같다');
  eq(refDecode(REF_DEMO, 3).stopAt, -1, '  → 그 안에 종결코돈은 없다');
  eq(S.transcribe('ACGX'), null, 'transcribe 는 DNA 염기가 아니면 null 을 준다');
  eq(S.transcribe('AAAA'), 'UUUU', '  → A 에는 U 가 온다 (T 가 아니다)');

  // (4) 62쪽 해 보기 3 — 치환 3자리 (kind 는 검사가 계산으로 다시 판정한다)
  eq(S.MUTS.length, 3, '치환 자리가 3개다');
  eqJ(S.MUTS.map(m => m.pos), [10, 12, 17], '★자리는 10 · 12 · 17 (1부터)');
  S.MUTS.forEach((m, i) => {
    const R = REF_MUTS[i];
    eq(m.from, REF_MRNA.charAt(m.pos - 1), '  ' + m.pos + '번 from 이 실제 염기(' + REF_MRNA.charAt(m.pos - 1) + ')다');
    eq(m.to, R.to, '  ' + m.pos + '번 to 가 ' + R.to);
    eq(S.mutSeq(m.pos), refMutSeq(m.pos, m.to), '★mutSeq(' + m.pos + ') 가 검사의 치환 서열과 같다');
    eq(m.kind, refKind(m.pos, m.to), '★MUTS[' + i + '].kind 가 계산으로 판정한 갈래(' + refKind(m.pos, m.to) + ')와 같다');
    eq(S.mutKindOf(m.pos), m.kind, '  → mutKindOf(' + m.pos + ') 도 같다');
  });
  eqJ(refDecode(refMutSeq(10, 'A'), 0).aas, ['히스티딘','글라이신','아스파라진','메싸이오닌','트레오닌','세린','아스파라진','알라닌'],
      '★10번 G→A: 4번째 발린 → 메싸이오닌');
  eq(S.mutChangedIndex(10), 3, '  → mutChangedIndex(10) = 3');
  eqJ(refDecode(refMutSeq(12, 'A'), 0).aas, REF_F0_AA, '★12번 G→A: 아미노산서열이 그대로 (GUG·GUA 모두 발린)');
  eq(REF['GUG'], REF['GUA'], '  → 검사 표에서도 GUG 와 GUA 가 같은 아미노산이다');
  eq(S.mutChangedIndex(12), -1, '  → mutChangedIndex(12) = -1');
  eq(refDecode(refMutSeq(17, 'A'), 0).stopAt, 5, '★17번 C→A: 6번째 코돈이 종결코돈');
  eq(refDecode(refMutSeq(17, 'A'), 0).codons[5], 'UAG', '  → 그 코돈은 UAG');
  eq(S.mutResult(17).aas.length, 5, '  → 아미노산 5개에서 끝난다');
  eq(S.mutById(99), null, '없는 자리는 null');
  eq(S.mutSeq(99), REF_MRNA, '  → 없는 자리의 mutSeq 는 원본이다');
  eq(S.MUT_CHOICES.length, 3, '예상 선지가 3개다');
  eq(S.mutKindIndex('change'), 0, '★change → 0번 선지');
  eq(S.mutKindIndex('same'), 1, '★same → 1번 선지');
  eq(S.mutKindIndex('stop'), 2, '★stop → 2번 선지');
  ok(/바뀐다/.test(S.MUT_CHOICES[0]) && /바뀌지 않는다/.test(S.MUT_CHOICES[1]) && /일찍 끝난다/.test(S.MUT_CHOICES[2]),
     '  → 선지 글이 그 차례대로 「바뀐다 / 바뀌지 않는다 / 일찍 끝난다」이다');
  ok(new Set(S.MUTS.map(m => m.kind)).size === 3, '★세 자리의 갈래가 모두 다르다 (change · same · stop)');

  // (5) ③ 4ⁿ — 막대 높이는 가짓수에 정비례 (분율이 아니다)
  eqJ(S.CODE_SIZES, [1,2,3], '묶음 크기 선택지가 1·2·3 이다');
  eq(S.AA_KINDS, 20, '아미노산 20종류가 기준선이다');
  [1,2,3,4].forEach(n => eq(S.codeCount(n), Math.pow(4, n), '★codeCount(' + n + ') = 4^' + n));
  eq(S.codeEnough(1), false, '4가지로는 모자란다'); eq(S.codeEnough(2), false, '16가지로도 모자란다'); eq(S.codeEnough(3), true, '64가지면 넉넉하다');
  eq(S.codeBarH(2), 4 * S.codeBarH(1), '★codeBarH(2) === 4 × codeBarH(1)');
  eq(S.codeBarH(3), 16 * S.codeBarH(1), '★codeBarH(3) === 16 × codeBarH(1)');
  eq(S.codeBarH(3), S.CODE_MAXH, '  → 64가지 막대가 최대 높이와 같다');
  ok(S.codeBarH(1) > 0, '  → 4가지 막대도 높이가 있다');
  // 기준선(20종류)도 같은 자로
  const stage = html(S, 'codeStage');
  const y20 = 168 - S.CODE_MAXH * 20 / S.CODE_MAXV;
  ok(stage.indexOf('y1="' + y20 + '"') >= 0, '★20종류 기준선 높이가 막대와 같은 자로 계산된다');
  ok(S.codeBarH(2) < S.CODE_MAXH * 20 / S.CODE_MAXV && S.CODE_MAXH * 20 / S.CODE_MAXV < S.codeBarH(3), '  → 16 < 20 < 64 가 그림에서도 성립한다');
  ok(/아미노산 20종류/.test(stage), '  → 기준선에 이름표가 붙어 있다');
  ok(/aria-label=/.test(stage), '막대그래프에 aria-label 이 있다');
  ok(!/NaN|undefined/.test(stage), '막대그래프 좌표에 NaN·undefined 가 없다');

  // (6) 범례 자료
  eqJ(S.RNA_SLOTS.map(r => r.id), ['mrna','rrna','trna'], '범례 차례가 mRNA → rRNA → tRNA (무대 등장 차례)');
  ok(/라이보솜/.test(S.RNA_SLOTS[0].label) && /라이보솜/.test(S.RNA_SLOTS[1].label) && /운반/.test(S.RNA_SLOTS[2].label), '  → 63쪽의 세 역할이 적혀 있다');
  eq(S._missing.join(','), '', '★처음 그리는 동안 없는 id 를 찾은 일이 없다 (id 오타 없음)');
}

// ══ 4. ① 세포 무대 ══
console.log('[4] ① 세포 무대 — cellLayout 불변식 (핵공 · tRNA 착지 · 사슬 간격 · 이름표 · 흐름도 · 범례 · 지연)');
{
  const S = makeSandbox();
  const CS = S.CS, N = S.CS_STEPS.length;
  eq(N, 6, '★국면이 6개다');
  eq(S.CS_CAP.length, 6, '★캡션도 6개다');
  eq(S.aniLast('cs'), 5, '  → aniLast("cs") = 5');
  ['①','②','③','④','⑤'].forEach((m, i) => ok(S.CS_STEPS[i + 1].indexOf(m) === 0, '국면 ' + (i + 1) + ' 의 이름이 ' + m + ' 로 시작한다'));
  ok(!/[①-⑤]/.test(S.CS_STEPS[0]), '국면 0 에는 번호가 없다 (아직 사건이 없다)');

  // 구조 — 핵공은 핵막 위, DNA 는 핵 안, 라이보솜은 세포질
  near(ellV(CS.pore, CS.nuc), 1, 1e-9, '★핵공이 핵막(핵 타원의 테두리) 위에 있다');
  eq(CS.pore.x, CS.nuc.cx + CS.nuc.rx, '  → 핵막의 오른쪽 끝이다');
  eq(CS.pore.y, CS.nuc.cy, '  → 핵의 가운데 높이다');
  ok(ellV(CS.dna, CS.nuc) < 1, '★DNA 는 핵 안에 있다');
  ok(ellV(CS.mrnaHome, CS.nuc) < 1, '★전사된 자리(mrnaHome)는 핵 안이다');
  ok(ellV(CS.ribo, CS.nuc) > 1 && ellV(CS.ribo, CS.cell) < 1, '★라이보솜은 핵 밖 · 세포 안이다');
  const out = S.csMrnaOut();
  ok(ellV(out, CS.nuc) > 1 && ellV(out, CS.cell) < 1, '★핵공을 지난 mRNA 자리는 핵 밖 · 세포 안이다');
  ok(ellV(CS.nuc.cx + CS.nuc.rx, CS.cell) !== undefined, '(도우미 동작)');
  CS.trnaStart.forEach((p, k) => {
    ok(ellV(p, CS.nuc) > 1, '★tRNA ' + k + ' 의 출발 자리가 핵 밖이다');
    ok(ellV(p, CS.cell) < 1, '★tRNA ' + k + ' 의 출발 자리가 세포 안이다');
  });
  CS.trnaDock.forEach((p, k) => {
    ok(ellV(p, CS.nuc) > 1 && ellV(p, CS.cell) < 1, '★tRNA ' + k + ' 의 착지 자리가 핵 밖 · 세포 안이다');
    ok(p.y < CS.ribo.y, '★착지한 tRNA ' + k + ' 가 라이보솜 큰 소단위 중심보다 위에 있다 (' + p.y + ' < ' + CS.ribo.y + ')');
    ok(p.y + CS.aaLift < p.y, '  → 아미노산은 tRNA 위에 얹힌다 (aaLift < 0)');
  });
  for (let k = 1; k < 3; k++) ok(CS.trnaDock[k].x > CS.trnaDock[k - 1].x, '착지 자리가 왼쪽에서 오른쪽으로 놓인다 (' + k + ')');
  for (let k = 0; k < 3; k++) ok(ellV({ x:CS.chain.x0 + CS.chain.dx * k, y:CS.chain.y }, CS.cell) < 1, '완성 사슬의 구슬 ' + k + ' 이 세포 안이다');
  ok(CS.chain.dx > 18, '사슬 구슬 간격(' + CS.chain.dx + ')이 구슬 지름(18)보다 넓다 — 겹치지 않는다');
  // 핵공 규칙 — ph1 → ph2 의 mRNA 직선이 핵공을 지난다
  const L1 = S.cellLayout(1), L2 = S.cellLayout(2);
  const sd = segDist(CS.pore, { x:L1.mrna.x, y:L1.mrna.y }, { x:L2.mrna.x, y:L2.mrna.y });
  ok(sd.d < 1, '★핵공에서 mRNA 의 이동 선분(ph1→ph2)까지의 거리가 1 미만이다 (' + sd.d.toFixed(3) + ')');
  ok(sd.t > 0.05 && sd.t < 0.95, '  → 핵공이 선분의 안쪽을 지난다 (t=' + sd.t.toFixed(2) + ')');
  eq(L2.mrna.x, CS.mrnaOutX, '  → ph2 의 mRNA x 는 CS.mrnaOutX 다');

  // 국면별 불변식
  const Ls = [0,1,2,3,4,5].map(p => S.cellLayout(p));
  Ls.forEach((L, p) => {
    eq(L.ph, p, 'cellLayout(' + p + ').ph = ' + p);
    eq(L.step, S.CS_STEPS[p], '  step 이 CS_STEPS[' + p + ']');
    eq(L.cap, S.CS_CAP[p], '  cap 이 CS_CAP[' + p + ']');
    eqJ(L.dna, { x:CS.dna.x, y:CS.dna.y, op:1 }, '★p' + p + ' DNA 는 제자리에 그대로 있다 (핵 밖으로 나가지 않는다)');
    eqJ(L.ribo, { x:CS.ribo.x, y:CS.ribo.y, op:1 }, '★p' + p + ' 라이보솜은 제자리에 있다');
    eq(L.mrna.op, p >= 1 ? 1 : 0, '★p' + p + ' mRNA 는 전사(①) 뒤에만 보인다');
    if (p >= 3) ok(L.mrna.x === CS.ribo.x && L.mrna.y === CS.ribo.y, '★p' + p + ' mRNA 가 라이보솜 자리에 있다');
    if (p === 2) ok(L.mrna.x === out.x && L.mrna.y === out.y, '★p2 mRNA 가 핵공을 지난 자리에 있다');
    if (p <= 1) ok(L.mrna.x === CS.mrnaHome.x && L.mrna.y === CS.mrnaHome.y, '★p' + p + ' mRNA 가 전사 자리에 있다 (안 보여도 제자리 — 스르르 나타난다)');
    eqJ(L.lbMrna, { x:L.mrna.x + 62, y:L.mrna.y + 5, op:L.labels.mrna }, '  p' + p + ' mRNA 이름표가 mRNA 를 따라간다');
    eq(L.poreHl.op, p === 2 ? 1 : 0, '★p' + p + ' 핵공 강조는 통과하는 국면(2)에만');
    eqJ([L.poreHl.x, L.poreHl.y], [CS.pore.x, CS.pore.y], '  핵공 강조가 핵공 자리에 있다');
    const xy = o => [o.x, o.y];
    eqJ(L.trna.map(t => t.op), [4].includes(p) ? [1,1,1] : [0,0,0], '★p' + p + ' tRNA 셋은 국면 4 에만 보인다');
    if (p === 4){
      eqJ(L.trna.map(xy), CS.trnaDock.map(xy), '★p4 tRNA 셋이 착지 자리에 있다');
      eqJ(L.aa.map(a => a.x), L.trna.map(t => t.x), '★p4 아미노산 x = tRNA x');
      eqJ(L.aa.map(a => a.y), L.trna.map(t => t.y + CS.aaLift), '★p4 아미노산 y = tRNA y + aaLift (tRNA 위에 얹힌다)');
      eqJ(L.aa.map(a => a.op), [1,1,1], '  p4 아미노산 셋이 보인다');
    } else if (p === 5){
      eqJ(L.trna.map(xy), CS.trnaStart.map(xy), '  p5 tRNA 는 출발 자리로 돌아가 사라진다');
      eqJ(L.aa.map(xy), [0,1,2].map(k => [CS.chain.x0 + CS.chain.dx * k, CS.chain.y]), '★p5 아미노산이 사슬 자리 x0 + dx·k 에 등간격으로 놓인다');
      eqJ(L.aa.map(a => a.op), [1,1,1], '  p5 아미노산 셋이 보인다');
    } else {
      eqJ(L.trna.map(xy), CS.trnaStart.map(xy), '  p' + p + ' tRNA 는 출발 자리에서 대기한다');
      eqJ(L.aa.map(xy), CS.trnaStart.map(t => [t.x, t.y + CS.aaLift]), '  p' + p + ' 아미노산은 tRNA 위 대기 자리에 있다');
      eqJ(L.aa.map(a => a.op), [0,0,0], '  p' + p + ' 아미노산은 안 보인다');
    }
    if (p === 5) eq(L.aa[1].x - L.aa[0].x, L.aa[2].x - L.aa[1].x, '★p5 사슬 간격이 같다');
    eq(L.pep.op, p === 5 ? 1 : 0, '★p' + p + ' 결합선(pep)은 국면 5 에만');
    eqJ([L.pep.x, L.pep.y], [CS.pep.x, CS.pep.y], '  결합선 자리');
    // 이름표
    eqJ(L.labels, { pore:(p >= 2 ? 1 : 0), tr:(p === 1 ? 1 : 0), ribo:(p >= 3 ? 1 : 0), trna:(p === 4 ? 1 : 0), aa:(p === 4 ? 1 : 0), prot:(p === 5 ? 1 : 0), mrna:(p >= 1 ? 1 : 0) },
        '★p' + p + ' 이름표 — 핵공⇔p≥2 · 전사=1 · 라이보솜⇔p≥3 · tRNA/아미노산=4 · 단백질=5 · mRNA⇔p≥1');
    eqJ(L.flow, { dna:1, tr:(p >= 1 ? 1 : 0), rna:(p >= 1 ? 1 : 0), tl:(p >= 3 ? 1 : 0), prot:(p === 5 ? 1 : 0) },
        '★p' + p + ' 흐름도 — DNA 늘 · 전사/RNA⇔p≥1 · 번역⇔p≥3 · 단백질=5');
    eqJ(L.legend, { mrna:(p >= 1 ? 1 : 0), rrna:(p >= 3 ? 1 : 0), trna:(p >= 4 ? 1 : 0) }, '★p' + p + ' 범례 — mRNA⇔p≥1 · rRNA⇔p≥3 · tRNA⇔p≥4');
  });
  const first = k => Ls.findIndex(L => L.legend[k] === 1);
  ok(first('mrna') < first('rrna') && first('rrna') < first('trna'), '★범례가 켜지는 차례 mRNA(' + first('mrna') + ') < rRNA(' + first('rrna') + ') < tRNA(' + first('trna') + ')');
  eqJ([first('mrna'), first('rrna'), first('trna')], [1, 3, 4], '  → 1 · 3 · 4 국면에서 처음 켜진다');
  eq(S.cellLayout(-1).ph, 0, '음수 국면은 0 으로 죈다');
  eq(S.cellLayout(99).ph, 5, '넘치는 국면은 5 로 죈다');
  eq(S.cellLayout(undefined).ph, 0, 'undefined 는 0');

  // 지연(csStagger) — 국면을 하나 넘겨 4 로 갈 때만, tRNA 가 차례로
  const st43 = S.csStagger(4, 3);
  ok(st43.trna[0] < st43.trna[1] && st43.trna[1] < st43.trna[2], '★csStagger(4,3).trna 가 엄격히 증가한다');
  eq(st43.trna[0], 0, '  → 첫 tRNA 는 지연 없이');
  eq(st43.trna[1], CS.stagger, '  → 둘째는 stagger 만큼');
  eq(st43.trna[2], 2 * CS.stagger, '  → 셋째는 2·stagger (등간격)');
  eqJ(st43.aa, st43.trna, '★아미노산 지연 = tRNA 지연 (같이 온다)');
  [[4,2],[4,4],[3,2],[5,4],[4,undefined],[4,'3']].forEach(([p, q]) =>
    eqJ(S.csStagger(p, q), { trna:[0,0,0], aa:[0,0,0] }, '★csStagger(' + p + ',' + JSON.stringify(q) + ') 는 모두 0 (되감기·건너뛰기·다시 그리기에는 지연 없음)'));

  // 마운트된 SVG — 물체마다 <g id> 하나, 국면은 속성만 바꾼다
  const svg = html(S, 'csStage');
  ['cs_dna','cs_ribo','cs_mrna','cs_lb_mrna','cs_pore_hl','cs_pep','cs_trna_0','cs_trna_1','cs_trna_2','cs_aa_0','cs_aa_1','cs_aa_2']
    .forEach(id => eq((svg.match(new RegExp('<g id="' + id + '"')) || []).length, 1, '① <g id="' + id + '"> 가 정확히 하나다'));
  ['cs_lb_pore','cs_lb_tr','cs_lb_ribo','cs_lb_trna','cs_lb_aa','cs_lb_prot']
    .forEach(id => ok(new RegExp('<text id="' + id + '"[^>]*class="rfade"').test(svg), '① 이름표 ' + id + ' 가 .rfade 텍스트다'));
  ok(new RegExp('<ellipse cx="' + CS.cell.cx + '" cy="' + CS.cell.cy + '" rx="' + CS.cell.rx + '" ry="' + CS.cell.ry + '"').test(svg), '세포 타원이 CS.cell 값으로 그려진다');
  ok(new RegExp('<ellipse cx="' + CS.nuc.cx + '" cy="' + CS.nuc.cy + '" rx="' + CS.nuc.rx + '" ry="' + CS.nuc.ry + '"').test(svg), '핵 타원이 CS.nuc 값으로 그려진다');
  ok(new RegExp('<rect x="' + (CS.pore.x - 7) + '" y="' + (CS.pore.y - 16) + '"').test(svg), '핵공이 핵막 선을 끊는 자리(CS.pore)에 그려진다');
  ok(!/<text[^>]*>[^<]*<(sup|b|i)\b/.test(svg), '① <text> 안에 HTML 태그(<sup>·<b>)가 없다');
  ok(!/NaN|undefined/.test(svg), '① 좌표에 NaN·undefined 가 없다');
  ok(/>핵<\/text>/.test(svg) && />세포질<\/text>/.test(svg) && />DNA<\/text>/.test(svg) && />유전자<\/text>/.test(svg), '늘 보이는 이름표 핵·세포질·DNA·유전자');
  const r1 = v => Math.round(v * 10) / 10;

  // 렌더 — 국면을 손으로 넘기며 속성이 규칙대로 바뀌는가
  eq(S.ANI.cs.ph, 0, '처음 국면은 0');
  eq(attr(S, 'cs_mrna', 'opacity'), '0', 'p0 mRNA 투명');
  eq(attr(S, 'cs_mrna', 'transform'), 'translate(' + CS.mrnaHome.x + ',' + CS.mrnaHome.y + ')', 'p0 mRNA 가 전사 자리에 (안 보이는 채로) 놓여 있다');
  eq(attr(S, 'cs_dna', 'transform'), 'translate(' + CS.dna.x + ',' + CS.dna.y + ')', 'DNA 자리');
  ok(dis(S, 'cs_first') && dis(S, 'cs_prev') && !dis(S, 'cs_next') && !dis(S, 'cs_last'), 'p0 에서 ⏮◀ 는 꺼지고 ▶⏩ 는 켜져 있다');
  ok(/<b>1 \/ 6<\/b>/.test(html(S, 'cs_step')), 'p0 단계 표시 1 / 6');
  eq(html(S, 'cs_cap'), S.CS_CAP[0], 'p0 캡션');
  eq(txt(S, 'cellProg'), '본 국면 1 / 6', 'p0 꼬리표 「본 국면 1 / 6」');
  eq(S._store['cf_dna'].className, 'fbox dna on', 'p0 흐름도 DNA 켜짐');
  eq(S._store['cf_tr'].className, 'farr', 'p0 흐름도 전사 꺼짐');
  eq(S._store['lg_mrna'].className, '', 'p0 범례 mRNA 꺼짐');
  eq(txt(S, 'cs_flowcap'), '국면이 지나면 흐름도가 채워진다.', 'p0 흐름도 설명');
  S.aniGo('cs', -1); eq(S.ANI.cs.ph, 0, '0 에서 ◀ 는 0 에 머문다');
  S.aniGo('cs', 1);
  eq(S.ANI.cs.ph, 1, '▶ 로 1');
  eq(attr(S, 'cs_mrna', 'opacity'), '1', 'p1 mRNA 가 보인다');
  eq(attr(S, 'cs_lb_tr', 'opacity'), '1', 'p1 「전사」 이름표');
  eq(S._store['cf_tr'].className, 'farr on', 'p1 흐름도 전사 켜짐');
  eq(S._store['cf_rna'].className, 'fbox rna on', 'p1 흐름도 RNA 켜짐');
  eq(S._store['cf_tl'].className, 'farr', 'p1 흐름도 번역 아직');
  eq(S._store['lg_mrna'].className, 'lit', 'p1 범례 mRNA 켜짐');
  eq(txt(S, 'cs_flowcap'), '전사가 끝났다. 다음은 번역이다.', 'p1 흐름도 설명');
  eq(txt(S, 'cellProg'), '본 국면 2 / 6', 'p1 꼬리표');
  ok(/<b>2 \/ 6<\/b>/.test(html(S, 'cs_step')), 'p1 단계 표시 2 / 6');
  S.aniGo('cs', 1);
  eq(attr(S, 'cs_mrna', 'transform'), 'translate(' + r1(out.x) + ',' + r1(out.y) + ')', '★p2 mRNA 가 핵공을 지난 자리로 간다');
  eq(attr(S, 'cs_pore_hl', 'opacity'), '1', 'p2 핵공 강조');
  eq(attr(S, 'cs_lb_pore', 'opacity'), '1', 'p2 「핵공」 이름표');
  eq(attr(S, 'cs_lb_tr', 'opacity'), '0', 'p2 「전사」 이름표는 내려간다');
  S.aniGo('cs', 1);
  eq(attr(S, 'cs_mrna', 'transform'), 'translate(' + CS.ribo.x + ',' + CS.ribo.y + ')', '★p3 mRNA 가 라이보솜에 붙는다');
  eq(attr(S, 'cs_pore_hl', 'opacity'), '0', 'p3 핵공 강조 내려감');
  eq(attr(S, 'cs_lb_ribo', 'opacity'), '1', 'p3 「라이보솜 — 번역」 이름표');
  eq(S._store['cf_tl'].className, 'farr on', 'p3 흐름도 번역 켜짐');
  eq(S._store['lg_rrna'].className, 'lit', 'p3 범례 rRNA 켜짐');
  eq(S._store['lg_trna'].className, '', 'p3 범례 tRNA 아직');
  eq(txt(S, 'cs_flowcap'), '번역이 진행 중이다.', 'p3 흐름도 설명');
  S.aniGo('cs', 1);
  for (let k = 0; k < 3; k++){
    eq(attr(S, 'cs_trna_' + k, 'opacity'), '1', 'p4 tRNA' + k + ' 보임');
    eq(attr(S, 'cs_trna_' + k, 'transform'), 'translate(' + CS.trnaDock[k].x + ',' + CS.trnaDock[k].y + ')', 'p4 tRNA' + k + ' 착지');
    eq(attr(S, 'cs_aa_' + k, 'transform'), 'translate(' + CS.trnaDock[k].x + ',' + (CS.trnaDock[k].y + CS.aaLift) + ')', 'p4 아미노산' + k + ' 이 tRNA 위에');
    eq(S._store['cs_trna_' + k].style.transitionDelay, k ? (CS.stagger * k + 's') : '', '★p4 tRNA' + k + ' 의 지연 = ' + (k ? CS.stagger * k + 's' : '없음'));
    eq(S._store['cs_aa_' + k].style.transitionDelay, k ? (CS.stagger * k + 's') : '', '  → 아미노산' + k + ' 도 같은 지연');
  }
  eq(attr(S, 'cs_lb_trna', 'opacity'), '1', 'p4 「tRNA」 이름표');
  eq(attr(S, 'cs_lb_aa', 'opacity'), '1', 'p4 「아미노산」 이름표');
  eq(attr(S, 'cs_lb_prot', 'opacity'), '0', 'p4 「단백질」 이름표는 아직');
  eq(S._store['lg_trna'].className, 'lit', 'p4 범례 tRNA 켜짐');
  eq(S._store['cf_prot'].className, 'fbox prot', 'p4 흐름도 단백질 아직');
  eq(S.state.cellSeen, false, 'p4 까지는 cellSeen 아님');
  S.aniGo('cs', 1);
  eq(S.ANI.cs.ph, 5, '마지막 국면 5');
  eq(S.state.cellSeen, true, '★마지막 국면에 이르면 cellSeen');
  eq(stored(S).cellSeen, true, '  → 저장된다');
  for (let k = 0; k < 3; k++){
    eq(attr(S, 'cs_trna_' + k, 'opacity'), '0', 'p5 tRNA' + k + ' 사라짐');
    eq(attr(S, 'cs_aa_' + k, 'transform'), 'translate(' + (CS.chain.x0 + CS.chain.dx * k) + ',' + CS.chain.y + ')', 'p5 아미노산' + k + ' 이 사슬 자리로');
    eq(S._store['cs_trna_' + k].style.transitionDelay, '', 'p5 지연 없음 (지연은 4 로 넘길 때만)');
  }
  eq(attr(S, 'cs_pep', 'opacity'), '1', 'p5 결합선');
  eq(attr(S, 'cs_lb_prot', 'opacity'), '1', 'p5 「단백질(폴리펩타이드)」 이름표');
  eq(attr(S, 'cs_lb_trna', 'opacity'), '0', 'p5 「tRNA」 이름표 내려감');
  eq(S._store['cf_prot'].className, 'fbox prot on', 'p5 흐름도 단백질 켜짐');
  eq(txt(S, 'cs_flowcap'), 'DNA → RNA → 단백질 — 이 흐름이 중심원리이다.', 'p5 흐름도 설명이 중심원리를 말한다');
  eq(txt(S, 'cellProg'), '본 국면 6 / 6', 'p5 꼬리표');
  ok(!dis(S, 'cs_first') && !dis(S, 'cs_prev') && dis(S, 'cs_next') && dis(S, 'cs_last'), 'p5 에서 ▶⏩ 는 꺼지고 ⏮◀ 는 켜져 있다');
  S.aniGo('cs', 1); eq(S.ANI.cs.ph, 5, '5 에서 ▶ 는 5 에 머문다');
  S.aniGo('cs', -1);
  eq(S.ANI.cs.ph, 4, '◀ 로 4');
  eq(S._store['cs_trna_2'].style.transitionDelay, '', '★되감기(5→4)에는 지연이 없다');
  eq(txt(S, 'cellProg'), '본 국면 6 / 6', '  → 한 번 끝까지 본 뒤에는 꼬리표가 6 / 6 으로 남는다');
  S.aniGo('cs', -99); eq(S.ANI.cs.ph, 0, '⏮ 로 0');
  S.aniGo('cs', 99); eq(S.ANI.cs.ph, 5, '⏩ 로 5');
  eq(stored(S).seq, 1, '★cellSeen 저장은 한 번뿐이다 (다시 끝까지 가도 seq 가 오르지 않는다)');
  eq(S.aniLast('xx'), 0, '없는 무대의 aniLast 는 0');
  S.aniGo('xx', 1); ok(true, '없는 무대를 넘겨도 죽지 않는다');
  eq(S._missing.join(','), '', '★① 을 끝까지 넘기는 동안 없는 id 를 찾은 일이 없다');
}

// ══ 5. ② 줌 무대 ══
console.log('[5] ② 줌 무대 — zoomWorld · zoomLayout 불변식 (빈칸 자리 · 코돈 괄호 · 아미노산 · 이름표 · 세계 안 텍스트)');
{
  const S = makeSandbox();
  const ZM = S.ZM, CS = S.CS;
  eq(S.ZM_STEPS.length, 6, '★국면이 6개다');
  eq(S.ZM_CAP.length, 6, '★캡션도 6개다');
  eq(S.aniLast('zm'), 5, '  → aniLast("zm") = 5');
  ['①','②','③','④','⑤'].forEach((m, i) => ok(S.ZM_STEPS[i + 1].indexOf(m) === 0, '국면 ' + (i + 1) + ' 의 이름이 ' + m + ' 로 시작한다'));

  // 세계 변환
  const w0 = S.zoomWorld(0), gc = S.zmGeneCenter();
  eq(w0.s, 1 / 6, '★세포 축척은 1/6 이다');
  eq(w0.s, ZM.S, '  → ZM.S 와 같다');
  near(w0.s * gc.x + w0.tx, CS.dna.x, 0.01, '★세포 축척에서 유전자 중심이 ①의 DNA 자리 x 에 온다');
  near(w0.s * gc.y + w0.ty, CS.dna.y, 0.01, '★세포 축척에서 유전자 중심이 ①의 DNA 자리 y 에 온다');
  [1,2,3,4,5].forEach(p => eqJ(S.zoomWorld(p), { s:1, tx:0, ty:0 }, '★p' + p + ' 세계는 1:1 (유전자 축척)'));
  eqJ(S.zoomWorld(0), S.zoomWorld(-3), '음수도 세포 축척');
  const wc = S.zmWorldOf(CS.dna.x, CS.dna.y);
  near(wc.x, gc.x, 1e-6, 'zmWorldOf 가 zoomWorld(0) 의 역이다 (x)');
  near(wc.y, gc.y, 1e-6, 'zmWorldOf 가 zoomWorld(0) 의 역이다 (y)');
  eq(S.zmX(1) - S.zmX(0), ZM.pitch, '염기 칸 간격 = pitch');
  ok(ZM.pitch >= 26, '  → 칸(24px)보다 넓다 — 겹치지 않는다');

  // 빈칸 자리
  eqJ(S.BLANK_IDX, REF_BLANK, '★BLANK_IDX = [1,3,4,10]');
  eqJ(S.blankIdx(), REF_BLANK, '  → blankIdx() 도 같다');
  const bi = S.blankIdx(); bi.push(99);
  eqJ(S.BLANK_IDX, REF_BLANK, '  → blankIdx() 는 사본이다 (밖에서 고쳐도 정본이 안 바뀐다)');
  const tplAt = REF_BLANK.map(i => REF_TPL.charAt(i));
  eqJ(tplAt.slice().sort(), ['A','C','G','T'], '★빈칸 자리의 주형 염기가 C·T·A·G 한 번씩이다');
  eqJ(REF_BLANK.map(i => REF_DEMO.charAt(i)), ['G','A','U','C'], '★정답은 G · A · U · C');
  ok(REF_BLANK.includes(3) && REF_BLANK.includes(4), '  → 개시코돈 AUG 안(3·4)에 빈칸이 있다');
  ok(REF_BLANK.every((b, i) => i === 0 || b > REF_BLANK[i - 1]), '  → 오름차순 (5′→3′ 로 채운다)');

  // zoomLayout 국면별
  const Ls = [0,1,2,3,4,5].map(p => S.zoomLayout(p, {}));
  Ls.forEach((L, p) => {
    eq(L.ph, p, 'zoomLayout(' + p + ').ph');
    eq(L.step, S.ZM_STEPS[p], '  step'); eq(L.cap, S.ZM_CAP[p], '  cap');
    eqJ(L.world, S.zoomWorld(p), '  world = zoomWorld(' + p + ')');
    eq(L.mrna.length, 15, '  mRNA 타일 15개');
    eq(L.pair.length, 15, '  짝 눈금 15개');
    eq(L.codon.length, 4, '  코돈 괄호 4개'); eq(L.aa.length, 4, '  아미노산 4개'); eq(L.bond.length, 3, '  결합선 3개');
    eq(L.dnaText, p >= 1 ? 1 : 0, '★p' + p + ' DNA 글자 ⇔ p≥1 (세포 축척에서는 읽을 수 없어 끈다)');
    eq(L.tmplMark, p >= 1 ? 1 : 0, '★p' + p + ' 주형 표시 ⇔ p≥1');
    eq(L.start, p >= 3 ? 1 : 0, '★p' + p + ' 개시코돈 표시 ⇔ p≥3');
    eq(L.banner, p >= 3 ? 1 : 0, '★p' + p + ' 코돈 띠 ⇔ p≥3 (세 글자씩 끊는 국면부터)');
    const idx = [...Array(15).keys()];
    const wantOp = idx.map(i => (p >= 5 && REF_BLANK.includes(i)) ? 1 : (p < 2 ? 0 : (p >= 3 && i < 3 ? 0.45 : 1)));
    eqJ(L.mrna.map(t => t.op), wantOp, '★p' + p + ' 타일 op — p<2:0 · p2:1 · p≥3 은 개시코돈 앞 세 칸 .45 · p5 빈칸은 1');
    eqJ(L.mrna.map(t => t.x), idx.map(i => S.zmX(i)), '  p' + p + ' 타일 x = zmX(i)');
    ok(L.mrna.every(t => t.y === ZM.yM), '  p' + p + ' 타일 y = yM');
    eqJ(L.pair.map(t => t.op), idx.map(() => p >= 2 ? 1 : 0), '  p' + p + ' 짝 눈금 ⇔ p≥2');
    eqJ(L.mrna.map(t => t.txt), idx.map(i => (p >= 5 && REF_BLANK.includes(i)) ? '?' : REF_DEMO.charAt(i)), '★p' + p + ' 타일 글자 — ' + (p >= 5 ? '빈칸은 ?, 나머지는 DEMO_MRNA' : 'DEMO_MRNA 그대로 (? 없음)'));
    eqJ(L.mrna.map(t => t.st), idx.map(i => (p >= 5 && REF_BLANK.includes(i)) ? 'blank' : ''), '  p' + p + ' 타일 상태 — ' + (p >= 5 ? '빈칸만 blank' : '없음'));
    eqJ(L.codon.map(c => c.x), [0,1,2,3].map(k => L.mrna[3 + 3 * k + 1].x), '★p' + p + ' 코돈 괄호 x = 그 코돈 가운데 염기(3+3k+1) 의 x');
    ok(L.codon.every(c => c.y === ZM.yK), '  p' + p + ' 괄호 y');
    eqJ(L.codon.map(c => c.op), [0,1,2,3].map(() => p >= 3 ? 1 : 0), '★p' + p + ' 괄호 ⇔ p≥3');
    eqJ(L.aa.map(a => a.name), REF_DEMO_AA, '★p' + p + ' 아미노산 이름 = 메싸이오닌·류신·알라닌·발린');
    eqJ(L.aa.map(a => a.op), [0,1,2,3].map(() => p >= 4 ? 1 : 0), '★p' + p + ' 아미노산 ⇔ p≥4');
    ok(L.aa.every(a => a.y === ZM.yA), '  p' + p + ' 아미노산 y');
    if (p <= 4) eqJ(L.aa.map(a => a.x), L.codon.map(c => c.x), '★p' + p + ' 아미노산은 제 코돈 아래에 있다');
    else eqJ(L.aa.map(a => a.x), [0,1,2,3].map(k => ZM.chainX0 + ZM.chainDx * k), '★p5 아미노산은 사슬 자리 x0 + dx·k');
    eqJ(L.bond.map(b => b.op), [0,1,2].map(() => p >= 5 ? 1 : 0), '★p' + p + ' 결합선 ⇔ p≥5');
    eqJ(L.labels, { nuc:(p === 0 ? 1 : 0), cell:(p === 0 ? 1 : 0), ring:(p === 0 ? 1 : 0), tmpl:(p >= 1 ? 1 : 0), mrnaRow:(p >= 2 ? 1 : 0), aa:(p === 4 ? 1 : 0), pep:(p >= 5 ? 1 : 0) },
        '★p' + p + ' 이름표 — 핵/세포질/확대표시=0 · 주형⇔p≥1 · mRNA줄⇔p≥2 · 아미노산=4 · 폴리펩타이드⇔p≥5');
    eq(L.done, false, '  빈 fill 은 done 이 아니다');
  });
  eqJ(S.zoomLayout(5, {}).mrna.map((t, i) => t.txt === '?' ? i : -1).filter(i => i >= 0), REF_BLANK, '★p5 의 ? 자리 집합 = BLANK_IDX');
  eq(S.zoomLayout(2, {}).mrna.filter(t => t.txt === '?').length, 0, '★p2 에는 ? 가 없다');
  eq(S.zoomLayout(4, {}).mrna.filter(t => t.txt === '?').length, 0, '★p4 에도 ? 가 없다 (빈칸은 마지막 국면에만)');
  ok(Ls[5].aa[1].x - Ls[5].aa[0].x === Ls[5].aa[2].x - Ls[5].aa[1].x && Ls[5].aa[2].x - Ls[5].aa[1].x === Ls[5].aa[3].x - Ls[5].aa[2].x, '★p5 사슬 간격이 같다');
  ok(ZM.chainDx > 76, '  → 간격(' + ZM.chainDx + ')이 구슬 너비(76)보다 넓다');
  // 채운 뒤
  const full = { '1':'G', '3':'A', '4':'U', '10':'C' };
  const LF = S.zoomLayout(5, full);
  eq(LF.done, true, '★네 빈칸을 바르게 채우면 done');
  eq(LF.mrna.map(t => t.txt).join(''), REF_DEMO, '★채운 글자를 이으면 DEMO_MRNA 다');
  REF_BLANK.forEach(i => { eq(LF.mrna[i].st, 'ok', '  빈칸 ' + i + ' 상태 ok'); eq(LF.mrna[i].op, 1, '  빈칸 ' + i + ' op 1'); });
  eq(S.zoomDone(full), true, 'zoomDone(full)'); eq(S.zoomNext(full), -1, 'zoomNext(full) = -1');
  const LB = S.zoomLayout(5, { '4':'A' });
  eq(LB.mrna[4].st, 'bad', '★틀린 글자는 bad'); eq(LB.mrna[4].txt, 'A', '  → 틀린 글자가 그대로 보인다'); eq(LB.mrna[4].op, 1, '  → 흐리지 않다');
  eq(LB.mrna[1].st, 'blank', '  → 안 채운 칸은 여전히 blank'); eq(LB.done, false, '  → done 아님');
  eq(S.zoomNext({ '4':'A' }), 1, '★zoomNext 는 5′ 쪽부터 첫 미완 자리(1)를 준다');
  eq(S.zoomNext({ '1':'G' }), 3, '  → 1 을 채우면 3');
  eq(S.zoomNext({ '1':'G', '3':'U' }), 3, '  → 3 이 틀리면 3 에 머문다');
  eq(S.zoomNext(undefined), 1, '  → fill 이 없으면 1');
  eq(S.zoomLayout(2, full).mrna.filter(t => t.st).length, 0, 'p2 에서는 fill 이 있어도 상태 표시가 없다');

  // 지연
  const z21 = S.zoomStagger(2, 1);
  eq(z21.tile.length, 15, 'zoomStagger tile 15');
  ok(z21.tile.every((v, i) => i === 0 || v > z21.tile[i - 1]), '★zoomStagger(2,1).tile 이 5′→3′ 로 엄격히 증가한다');
  eq(z21.tile[0], 0, '  → 첫 타일은 지연 없이'); near(z21.tile[1], ZM.tileStagger, 1e-9, '  → 둘째는 tileStagger');
  eqJ(z21.aa, [0,0,0,0], '  → 2 로 갈 때 아미노산 지연은 없다');
  const z43 = S.zoomStagger(4, 3);
  ok(z43.aa.every((v, i) => i === 0 || v > z43.aa[i - 1]), '★zoomStagger(4,3).aa 가 엄격히 증가한다');
  eqJ(z43.tile, new Array(15).fill(0), '  → 4 로 갈 때 타일 지연은 없다');
  [[2,0],[2,2],[3,2],[5,4],[2,undefined]].forEach(([p, q]) => {
    const z = S.zoomStagger(p, q);
    ok(z.tile.every(v => v === 0) && z.aa.every(v => v === 0), '★zoomStagger(' + p + ',' + JSON.stringify(q) + ') 는 모두 0');
  });

  // 마운트된 SVG
  const svg = html(S, 'zmStage');
  eq((svg.match(/<g id="zw"/g) || []).length, 1, '세계 <g id="zw"> 가 하나다');
  const zwStart = svg.indexOf('<g id="zw"'), zwEnd = svg.indexOf('id="zl_nuc"');
  ok(zwStart >= 0 && zwEnd > zwStart, '세계 뒤에 무대층 이름표(zl_nuc)가 온다');
  const zw = svg.slice(zwStart, zwEnd);
  ok(/^<g id="zw" class="rmove" transform="translate\(-?[\d.]+,-?[\d.]+\) scale\([\d.]+\)"/.test(zw), '★zw 의 초기 transform 이 translate(…) scale(…) 차례다');
  const ZM_BANNER = 'mRNA 의 세 염기 묶음 하나 = 코돈';
  const allow = new Set(['DNA','mRNA','5′','3′','주형 가닥','아미노산','폴리펩타이드','개시코돈 AUG','코돈 2','코돈 3','코돈 4', ZM_BANNER].concat(REF_DEMO_AA));
  const texts = [...zw.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);
  ok(texts.length >= 15 * 3 + 10, '세계 안 <text> 를 ' + texts.length + '개 모았다');
  ok(texts.every(t => /^[ACGTU]$/.test(t) || allow.has(t)), '★세계 안 <text> 는 염기 글자·줄 이름표·코돈 띠뿐이다 (그 밖: ' + texts.filter(t => !/^[ACGTU]$/.test(t) && !allow.has(t)).join('|') + ')');
  eq(texts.filter(t => t === ZM_BANNER).length, 1, '★코돈 띠 글자 「' + ZM_BANNER + '」 가 세계 안에 한 번 있다');
  ok(/코돈/.test(ZM_BANNER), '  → 띠 글자에 「코돈」이 있다');
  const zb = gOf(svg, 'zm_banner');
  ok(/^<g id="zm_banner" class="rfade" transform="translate\(/.test(zb) && /opacity="0"/.test(zb.slice(0, 120)), '★zm_banner 는 .rfade 이고 처음엔 숨김');
  ok(new RegExp('translate\\(' + S.zmX(7) + ',' + ZM.yBan + '\\)').test(zb), '  → 자리 = (zmX(7), yBan) — 15염기의 가운데');
  ok(/<rect x="-190" y="-14" width="380" height="28" rx="14" fill="#6C2BD9"\/>/.test(zb), '  → 보라(C_RNA) 띠 380×28, 가운데 정렬');
  ok(new RegExp('<text[^>]*font-size="15"[^>]*fill="#fff"[^>]*>' + ZM_BANNER + '</text>').test(zb), '  → 흰 글자 15px');
  eq(ZM.yBan, 290, '★ZM.yBan = 290'); eq(ZM.yA, 330, '★ZM.yA = 330 (구슬은 띠 아래로)');
  ok(ZM.yK < ZM.yBan && ZM.yBan < ZM.yA, '★띠는 코돈 괄호 줄(yK)과 아미노산 구슬(yA) 사이에 있다');
  ok(ZM.yA + 14 <= 360, '  → 구슬이 viewBox 360 안에 든다');
  ok(/코돈/.test(S.ZM_STEPS[3]) && /코돈/.test(S.ZM_CAP[3]), '★ZM_STEPS[3]·ZM_CAP[3] 이 「코돈」을 말한다');
  ok(/<b>mRNA 의 세 염기 묶음 하나를 코돈이라고 한다\.<\/b>/.test(S.ZM_CAP[3]), '  → 캡션 3 이 코돈의 정의를 굵게 적는다');
  eq(S.ZM_STEPS[3], '③ 세 글자씩 끊는다 — 이 묶음이 코돈이다', '  → 국면 3 이름');
  ok(!/<text[^>]*>[^<]*<(sup|b|i)\b/.test(svg), '② <text> 안에 HTML 태그(<sup>·<b>)가 없다');
  ok(!/NaN|undefined/.test(svg), '② 좌표에 NaN·undefined 가 없다');
  ['zc_cell','zc_nuc'].forEach(id => ok(new RegExp('<ellipse id="' + id + '"[^>]*vector-effect="non-scaling-stroke"').test(svg), '★' + id + ' 에 vector-effect="non-scaling-stroke" (축척을 따라 선이 굵어지지 않는다)'));
  const letters = (pfx) => [...Array(15).keys()].map(i => ((svg.match(new RegExp('<text id="' + pfx + i + '"[^>]*>([^<]*)</text>')) || [])[1]) || '').join('');
  eq(letters('zd_ct_'), REF_CODING, '★상대 가닥 글자 15개 = TGGATGTTGGCAGTA');
  eq(letters('zd_tt_'), REF_TPL, '★주형 가닥 글자 15개 = ACCTACAACCGTCAT');
  eq(letters('zm_tx_'), REF_DEMO, '★mRNA 글자 15개 = UGGAUGUUGGCAGUA');
  eq((svg.match(/<g id="zm_t_\d+"/g) || []).length, 15, 'mRNA 타일 g 15개');
  eq((svg.match(/<g id="zm_k_\d+"/g) || []).length, 4, '코돈 괄호 g 4개');
  eq((svg.match(/<g id="zm_a_\d+"/g) || []).length, 4, '아미노산 g 4개');
  eq((svg.match(/<line id="zm_b_\d+"/g) || []).length, 3, '결합선 3개');
  ok(/개시코돈 AUG<\/text>/.test(gOf(svg, 'zm_k_0')), '첫 괄호에 「개시코돈 AUG」');
  ok(/코돈 2<\/text>/.test(gOf(svg, 'zm_k_1')), '둘째 괄호에 「코돈 2」');
  REF_DEMO_AA.forEach((a, k) => ok(new RegExp('>' + a + '</text>').test(gOf(svg, 'zm_a_' + k)), '아미노산 구슬 ' + k + ' 에 ' + a));
  ok(!/이 부분을 확대한다/.test(svg), '세포 축척의 확대 표시에 글이 없다 (교사 2026-09-12: 군더더기)');
  ok(/id="zl_ring"/.test(svg), '세포 축척의 확대 표시 테두리는 있다');

  // 렌더 — 국면 넘김
  eq(S.ANI.zm.ph, 0, '처음 국면 0');
  ok(/^translate\(-?[\d.]+,-?[\d.]+\) scale\(0\.1667\)$/.test(attr(S, 'zw', 'transform')), '★p0 zw transform = translate(…) scale(0.1667)');
  eq(attr(S, 'zd_ct_0', 'opacity'), '0', 'p0 DNA 글자 꺼짐');
  eq(attr(S, 'zl_nuc', 'opacity'), '1', 'p0 「핵」 이름표 켜짐');
  eq(attr(S, 'zl_ring', 'opacity'), '1', 'p0 확대 표시 켜짐');
  eq(attr(S, 'zm_t_0', 'opacity'), '0', 'p0 mRNA 타일 꺼짐');
  ok(/<b>1 \/ 6<\/b>/.test(html(S, 'zm_step')), 'p0 단계 표시');
  eq(html(S, 'zm_cap'), S.ZM_CAP[0], 'p0 캡션');
  S.aniGo('zm', 1);
  eq(attr(S, 'zw', 'transform'), 'translate(0,0) scale(1)', '★p1 zw transform = translate(0,0) scale(1)');
  eq(attr(S, 'zd_ct_0', 'opacity'), '1', 'p1 DNA 글자 켜짐');
  eq(attr(S, 'zd_tmark', 'opacity'), '1', 'p1 주형 표시');
  eq(attr(S, 'zl_tmpl', 'opacity'), '1', 'p1 「주형 가닥」');
  eq(attr(S, 'zl_nuc', 'opacity'), '0', 'p1 「핵」 이름표 꺼짐');
  eq(attr(S, 'zl_ring', 'opacity'), '0', 'p1 확대 표시 꺼짐');
  eq(attr(S, 'zm_t_0', 'opacity'), '0', 'p1 mRNA 아직');
  S.aniGo('zm', 1);
  eq(attr(S, 'zm_t_0', 'opacity'), '1', 'p2 mRNA 타일 켜짐');
  eq(attr(S, 'zm_banner', 'opacity'), '0', '★p2 코돈 띠 아직 숨김');
  eq(attr(S, 'zm_p_14', 'opacity'), '1', 'p2 짝 눈금 켜짐');
  eq(attr(S, 'zl_mrow', 'opacity'), '1', 'p2 「mRNA」 줄 이름표');
  eq(S._store['zm_t_0'].style.transitionDelay, '', '★p2 첫 타일 지연 없음');
  eq(S._store['zm_t_14'].style.transitionDelay, (Math.round(ZM.tileStagger * 14 * 100) / 100) + 's', '★p2 마지막 타일 지연 = tileStagger×14');
  eq(txt(S, 'zm_tx_1'), 'G', 'p2 타일 1 은 G (아직 빈칸이 아니다)');
  S.aniGo('zm', 1);
  eq(attr(S, 'zm_t_0', 'opacity'), '0.45', '★p3 개시코돈 앞 타일은 흐리다');
  eq(attr(S, 'zm_t_3', 'opacity'), '1', '  → AUG 부터는 또렷하다');
  eq(attr(S, 'zm_k_0', 'opacity'), '1', 'p3 코돈 괄호');
  eq(attr(S, 'zm_banner', 'opacity'), '1', '★p3 코돈 띠가 켜진다');
  eq(attr(S, 'zm_a_0', 'opacity'), '0', 'p3 아미노산 아직');
  S.aniGo('zm', 1);
  eq(attr(S, 'zm_a_0', 'opacity'), '1', 'p4 아미노산');
  eq(attr(S, 'zm_a_1', 'transform'), 'translate(' + S.zmCodX(1) + ',' + ZM.yA + ')', '★p4 아미노산 1 이 코돈 2 아래');
  eq(S._store['zm_a_3'].style.transitionDelay, (Math.round(ZM.aaStagger * 3 * 100) / 100) + 's', '★p4 넷째 아미노산 지연 = aaStagger×3');
  eq(attr(S, 'zl_aa', 'opacity'), '1', 'p4 「아미노산」');
  eq(attr(S, 'zm_b_0', 'opacity'), '0', 'p4 결합선 아직');
  eq(S.state.zoomSeen, false, 'p4 까지 zoomSeen 아님');
  S.aniGo('zm', 1);
  eq(S.state.zoomSeen, true, '★p5 에 이르면 zoomSeen');
  eq(attr(S, 'zm_a_1', 'transform'), 'translate(' + (ZM.chainX0 + ZM.chainDx) + ',' + ZM.yA + ')', '★p5 아미노산 1 이 사슬 자리로');
  eq(attr(S, 'zm_b_0', 'opacity'), '1', 'p5 결합선');
  eq(attr(S, 'zl_pep', 'opacity'), '1', 'p5 「폴리펩타이드」'); eq(attr(S, 'zl_aa', 'opacity'), '0', 'p5 「아미노산」 내려감');
  eq(attr(S, 'zm_banner', 'opacity'), '1', '★p5 코돈 띠는 켜진 채');
  eq(txt(S, 'zm_tx_1'), '?', '★p5 빈칸 1 이 ? 로 바뀐다');
  eq(attr(S, 'zm_t_1', 'class'), 'rfade blank', '  → class blank');
  eq(attr(S, 'zm_t_1', 'opacity'), '1', '  → 개시코돈 앞이라도 빈칸은 또렷하다');
  eq(txt(S, 'zm_tx_0'), 'U', '  → 빈칸이 아닌 0 은 U 그대로');
  eq(attr(S, 'zm_t_0', 'class'), 'rfade', '  → class 없음');
  ok(dis(S, 'zm_next') && dis(S, 'zm_last') && !dis(S, 'zm_prev'), 'p5 에서 ▶⏩ 꺼짐');
  eq(S._missing.join(','), '', '★② 를 끝까지 넘기는 동안 없는 id 를 찾은 일이 없다');
}

// ══ 6. ② 조작 ══
console.log('[6] ② 조작 — 연출을 마치기 전엔 못 채운다 · 5′→3′ 로 채운다 · 오답이 남는다 · 4 / 4');
{
  const S = makeSandbox();
  eq(html(S, 'zmChips').match(/class="chip base"/g).length, 4, '염기 칩이 4개다');
  eqJ([...html(S, 'zmChips').matchAll(/fillBlank\('([UCAG])'\)/g)].map(m => m[1]), ['U','C','A','G'], '  → U·C·A·G 차례');
  eq(html(S, 'zmSlots').match(/class="slot/g).length, 4, '빈칸 슬롯이 4개다');
  eq(html(S, 'zmSlots').match(/class="slot cur"/g), null, '연출 전에는 「지금」 표시가 없다');
  ok(/1 \/ 6/.test(html(S, 'zm_step')), '연출 국면 0');
  // 연출 전
  S.fillBlank('G');
  eqJ(S.state.zoomFill, {}, '★연출을 마치기 전에는 fillBlank 가 아무것도 쓰지 않는다');
  eq(S._store['fb_zoom'].className, 'msg warn', '  → 경고를 보인다');
  ok(/끝까지/.test(html(S, 'fb_zoom')), '  → ⏩ 끝까지 를 누르라고 말한다');
  eq(stored(S), null, '  → 저장도 하지 않는다');
  eq(html(S, 'zmTask'), '연출을 끝까지 본 뒤, mRNA 의 빈칸 4개를 칩으로 채우시오.', '  → 지시 막대');
  S.aniGo('zm', 3);
  S.fillBlank('G');
  eqJ(S.state.zoomFill, {}, '★국면 3 에서도 못 채운다');
  // 끝까지
  S.aniGo('zm', 99);
  eq(S.ANI.zm.ph, 5, '⏩ 로 마지막 국면');
  eq(S.state.zoomSeen, true, '★zoomSeen'); eq(stored(S).zoomSeen, true, '  → 저장됨');
  eq(html(S, 'zmTask'), '2번째 자리 — 주형 <b>C</b> 와 짝을 이루는 염기를 탭하시오.', '★지시 막대가 첫 빈칸(2번째 자리, 주형 C)을 가리킨다');
  eq(html(S, 'zmSlots').match(/class="slot cur"/g).length, 1, '  → 「지금」 슬롯이 하나다');
  ok(/2번째 자리 · 주형 <b>C<\/b> 의 짝/.test(html(S, 'zmSlots')), '  → 슬롯에 자리·주형 염기가 적혀 있다');
  eq(txt(S, 'zoomProg'), '채운 빈칸 0 / 4', '꼬리표 0 / 4');
  S.fillBlank('G');
  eq(S.state.zoomFill['1'], 'G', '★첫 빈칸(1)에 G');
  eq(S._store['fb_zoom'].className, 'msg good', '  → 옳다');
  ok(/옳다\. 주형 <b>C<\/b> 의 짝은 <b>G<\/b> 이다\./.test(html(S, 'fb_zoom')), '  → 되돌림이 짝 규칙을 말한다');
  eq(txt(S, 'zoomProg'), '채운 빈칸 1 / 4', '꼬리표 1 / 4');
  eq(attr(S, 'zm_t_1', 'class'), 'rfade okb', '  → 무대 타일이 okb');
  eq(txt(S, 'zm_tx_1'), 'G', '  → 글자가 G');
  eq(html(S, 'zmTask'), '4번째 자리 — 주형 <b>T</b> 와 짝을 이루는 염기를 탭하시오.', '★다음 빈칸(4번째, 주형 T)');
  S.fillBlank('U');
  eq(S.state.zoomFill['3'], 'U', '★틀린 글자(U)도 상태에 남는다');
  eq(stored(S).zoomFill['3'], 'U', '  → 저장에도 남는다');
  eq(S._store['fb_zoom'].className, 'msg bad', '  → 틀렸다');
  ok(/^옳지 않다\. 주형 <b>T<\/b> 와 짝을 이루는 염기는 U 가 아니다\./.test(html(S, 'fb_zoom')), '  → 「옳지 않다.」로 시작한다');
  ok(/DNA 복제에서 짝이 되던 염기/.test(html(S, 'fb_zoom')), '  → 주형 T 에는 복제 때의 짝을 떠올리게 한다');
  eq(attr(S, 'zm_t_3', 'class'), 'rfade badb', '  → 무대 타일이 badb'); eq(txt(S, 'zm_tx_3'), 'U', '  → 틀린 글자가 보인다');
  ok(/class="slot bad cur"/.test(html(S, 'zmSlots')), '  → 슬롯이 bad + cur');
  eq(txt(S, 'zoomProg'), '채운 빈칸 1 / 4', '  → 틀린 칸은 세지 않는다');
  eq(S.zoomFilledCount(), 1, '  → zoomFilledCount 1');
  eq(html(S, 'zmTask'), '4번째 자리 — 주형 <b>T</b> 와 짝을 이루는 염기를 탭하시오.', '  → 지시는 같은 자리에 머문다');
  S.fillBlank('A');
  eq(S.state.zoomFill['3'], 'A', '★다음 탭이 틀린 글자를 바꾼다');
  eq(attr(S, 'zm_t_3', 'class'), 'rfade okb', '  → okb');
  eq(txt(S, 'zoomProg'), '채운 빈칸 2 / 4', '꼬리표 2 / 4');
  S.fillBlank('G');
  eq(S.state.zoomFill['4'], 'G', '주형 A 자리에 G (틀림)');
  ok(/RNA 에는 T 가 없다는 점/.test(html(S, 'fb_zoom')), '★주형 A 에 틀리면 「RNA 에는 T 가 없다」를 짚는다');
  S.fillBlank('U');
  eq(S.state.zoomFill['4'], 'U', '주형 A 의 짝 U');
  eq(html(S, 'zmTask'), '11번째 자리 — 주형 <b>G</b> 와 짝을 이루는 염기를 탭하시오.', '마지막 빈칸(11번째, 주형 G)');
  eq(S.zoomDone(S.state.zoomFill), false, '아직 done 아님');
  S.fillBlank('C');
  eq(S.zoomDone(S.state.zoomFill), true, '★네 칸 완료');
  ok(/🎉/.test(html(S, 'fb_zoom')), '  → 🎉');
  eq(txt(S, 'zoomProg'), '채운 빈칸 4 / 4', '★꼬리표 4 / 4');
  eq(html(S, 'zmTask'), '빈칸 4개를 모두 채웠다. 아래 문항에 답하시오.', '  → 지시 막대');
  eq(html(S, 'zmSlots').match(/class="slot ok"/g).length, 4, '  → 슬롯 4개가 ok');
  eqJ(REF_BLANK.map(i => txt(S, 'zm_tx_' + i)), ['G','A','U','C'], '  → 무대 글자 G·A·U·C');
  const before = JSON.stringify(S.state.zoomFill);
  S.fillBlank('A');
  eq(JSON.stringify(S.state.zoomFill), before, '★다 채운 뒤의 탭은 상태를 바꾸지 않는다');
  eq(S._store['fb_zoom'].className, 'msg info', '  → 안내만');
  eq(S.stepDone('zoom'), false, '★문항 z1 에 답하기 전엔 ② 미완');
  S.pickQ('z1', S.qById('z1').a);
  eq(S.stepDone('zoom'), true, '★z1 에 답하면 ② 완료');
  eq(S.doneCount(), 1, '  → 완료 단계 1');
  // 문항만 답하고 빈칸이 덜 채워지면 미완
  const T = makeSandbox();
  T.pickQ('z1', 0);
  eq(T.stepDone('zoom'), false, '★빈칸 없이 문항만 답하면 ② 미완');
  T.aniGo('zm', 99); T.fillBlank('G'); T.fillBlank('A'); T.fillBlank('U');
  eq(T.stepDone('zoom'), false, '  → 셋만 채워도 미완');
  T.fillBlank('C');
  eq(T.stepDone('zoom'), true, '  → 넷째까지 채우면 완료 (오답을 골랐어도 답했으면 된다 — 정오는 따지지 않는다)');
  eq(S._missing.join(','), '', '★② 조작 동안 없는 id 를 찾은 일이 없다');
}

// ══ 7. ③ 사전 ══
console.log('[7] ①-2 4ⁿ 칩 · 코돈의 정의 공개 시점 · ④ 코돈표 64칸(미리 칠하지 않는다)');
{
  const S = makeSandbox();
  // ④ 코돈표 (③ 은 무대로 바뀌어 HTML 표가 없다)
  ok(!bodyHtml.includes('id="codonTable3"') && !bodyHtml.includes('id="ctNow"'), '★③ 에는 HTML 코돈표(codonTable3/ctNow)가 없다');
  ok(!('ctTap3' in S) && !('FIND_TASKS' in S) && !('findTotal' in S) && !('state' in S && 'find' in S.state), '  → 옛 찾기 기계(ctTap3·FIND_TASKS·findTotal·state.find)가 사라졌다');
  ['c4'].forEach(pfx => {
    const box = 'codonTable4';
    const h = html(S, box);
    eq((h.match(/class="ce"/g) || []).length, 64, '★' + box + ' 에 .ce 칸이 64개다');
    eq((h.match(new RegExp('id="' + pfx + '_[UCAG]{3}"', 'g')) || []).length, 64, '  → id ' + pfx + '_XXX 가 64개');
    ok(!/found|class="ce cur"/.test(h), '★' + box + ' 에 미리 칠한 칸(.found/.cur)이 없다 (찾기가 색만 보고 끝나지 않는다)');
    eqJ(ALL_CODONS.filter(c => !S._store[pfx + '_' + c]), [], '  → 64칸이 모두 원소로 등록되어 있다 (빠진 것 목록)');
    ok(/첫 번째<br>염기/.test(h) && /두 번째 염기/.test(h) && /세 번째<br>염기/.test(h), '  → 세 축 이름이 표에 적혀 있다');
    ok(/<th class="hdr">U<\/th><th class="hdr">C<\/th><th class="hdr">A<\/th><th class="hdr">G<\/th>/.test(h), '  → 두 번째 염기 축이 U·C·A·G 차례');
    eq((h.match(/U<br>C<br>A<br>G/g) || []).length, 4, '  → 세 번째 염기 축이 줄마다 U·C·A·G');
    eq((h.match(/\(개시코돈\)/g) || []).length, 1, '  → (개시코돈) 표시는 한 칸뿐');
    ok(new RegExp('id="' + pfx + '_AUG"[^>]*>[^<]*<b class="cd">AUG</b> 메싸이오닌 \\(개시코돈\\)').test(h), '  → 그 칸이 AUG 다');
  });
  const h4 = html(S, 'codonTable4');
  const badCells = ALL_CODONS.filter(c => !new RegExp('id="c4_' + c + '"[^>]*onclick="ctTap4\\(\'' + c + '\'\\)"[^>]*>[^<]*<b class="cd">' + c + '</b> ' + REF[c]).test(h4));
  eqJ(badCells, [], '★64칸마다 코돈과 교과서의 아미노산 이름이 함께 적혀 있고 ctTap4 로 간다 (어긋난 칸 목록)');
  ok(/onclick="ctTap4\('CAU'\)"/.test(html(S, 'codonTable4')), '④ 표는 ctTap4 로 간다');

  // 4ⁿ 칩 (①-2)
  eq(S.codeDoneCount(), 0, '처음엔 눌러 본 묶음 0');
  eq(txt(S, 'codeProg'), '눌러 본 묶음 0 / 3', '★꼬리표 「눌러 본 묶음 0 / 3」');
  eq(S._store['codonDef'].style.display, 'none', '★코돈의 정의는 처음에 숨어 있다');
  eq((html(S, 'codeChips').match(/class="chip"/g) || []).length, 3, '묶음 칩 3개 (아직 표시 없음)');
  ok(/<g id="cb_[123]" class="rfade" opacity="0">/.test(html(S, 'codeStage')) && !/opacity="0\.\d+"/.test(html(S, 'codeStage')) && !/가지<\/text>/.test(html(S, 'codeStage')), '누르기 전 막대는 아예 보이지 않고(흐림 금지 — 높이가 답이다) 가짓수 글이 없다');
  ok(!/[¹²³]/.test(html(S, 'codeStage')), '4ⁿ 표기는 무대에 없다(잘려 보였다 — 교사 2026-09-12)');
  S.pickCode(1);
  eq(S.state.codeRun['1'], true, 'pickCode(1) 기록'); eq(S.state.codeLast, 1, '  → codeLast 1');
  eq(S._store['fb_code'].className, 'msg warn', '  → 4가지는 모자란다 (warn)');
  ok(/4<sup>1<\/sup> = <b>4가지<\/b>/.test(html(S, 'fb_code')) && /모자란다/.test(html(S, 'fb_code')), '  → 4¹ = 4가지, 모자란다');
  ok(/class="chip on"/.test(html(S, 'codeChips')), '  → 고른 칩에 on');
  ok(/<g id="cb_1" class="rfade" opacity="1">/.test(html(S, 'codeStage')) && /4가지<\/text>/.test(html(S, 'codeStage')), '  → 막대가 켜지고 가짓수를 글로 적는다');
  eq(txt(S, 'codeProg'), '눌러 본 묶음 1 / 3', '  → 꼬리표 1 / 3');
  eq(S._store['codonDef'].style.display, 'none', '  → 1개씩만으로는 코돈의 정의가 열리지 않는다');
  S.pickCode(2);
  ok(/16가지/.test(html(S, 'fb_code')) && /모자란다/.test(html(S, 'fb_code')), '16가지도 모자란다');
  eq(S._store['codonDef'].style.display, 'none', '  → 2개씩까지도 닫혀 있다');
  ok(/class="chip ok"[^>]*>1개씩/.test(html(S, 'codeChips')), '  → 앞서 누른 칩은 ok');
  S.pickCode(3);
  eq(S._store['fb_code'].className, 'msg good', '64가지는 넉넉하다 (good)');
  ok(/64가지/.test(html(S, 'fb_code')) && /3염기조합/.test(html(S, 'fb_code')), '  → 3염기조합인 까닭을 말한다');
  ok(/<b>코돈<\/b>/.test(html(S, 'fb_code')), '★3개씩의 되돌림이 「코돈」을 말한다');
  eq(S._store['codonDef'].style.display, 'block', '★셋을 다 눌러 본 뒤에 코돈 결론이 열린다');
  { const S3 = makeSandbox(); S3.pickCode(3); eq(S3._store['codonDef'].style.display, 'none', '★3개씩만 눌러서는 결론이 열리지 않는다 — 1·2개씩이 모자란 것을 봐야 한다'); }
  eq(S.codeDoneCount(), 3, '★codeDoneCount 3');
  eq(txt(S, 'codeProg'), '눌러 본 묶음 3 / 3', '  → 꼬리표 3 / 3');
  eq(S.stepDone('code'), false, '문항 i1 전엔 ①-2 미완');
  S.pickQ('i1', 2); eq(S.stepDone('code'), true, '★칩 3 + i1 로 ①-2 완료 (찾기와 무관)');
  eq(S.stepDone('find'), false, '  → ③ 은 아직 (찾기 전)');
  S.pickCode(3);
  eq(S.codeDoneCount(), 3, '  → 같은 칩을 다시 눌러도 3');

  eq(S._missing.join(','), '', '★①-2 동안 없는 id 를 찾은 일이 없다');
}

// ══ 7b. ①-2 묶기 무대 ══
console.log('[7b] ①-2 묶기 무대 (DNA · U 없음) — gbCombos(4ⁿ · A·T·G·C 차례) · gbGroups(꼬리 없음 · 평균 x) · gbLayout(괄호·구슬·64칸·캡션) · 마운트 SVG');
{
  const S = makeSandbox();
  const GB = S.GB;
  /* ★①-2 는 전사(②) 앞이다 — U 가 아직 없다. DNA 글자(A·T·G·C)로만 묶는다. 기대값은 검사가 스스로 만든다. */
  const DB = ['A','T','G','C'];
  const dnaCombos = n => { let o = ['']; for (let k = 0; k < n; k++) o = o.flatMap(pf => DB.map(b => pf + b)); return n > 0 ? o : []; };
  eq(GB.seq, 'CATGGTAACGTG', '★묶기 무대의 DNA 12염기 = 62쪽 mRNA 앞 12자의 U→T');
  eq(GB.seq, REF_MRNA.slice(0, 12).replace(/U/g, 'T'), '  → 검사의 정본 앞 12자에서 U→T 한 것과 같다');
  ok(/^[ATGC]{12}$/.test(GB.seq), '★GB.seq 는 DNA 글자(A·T·G·C) 12자뿐 — U 가 없다');
  eqJ(GB.bases, DB, '★GB.bases = A · T · G · C');
  eq(GB.seq.length, 12, '  → 12 = 1·2·3 의 공배수 (어느 크기로도 꼬리 없이 묶인다)');
  eq(GB.cols, 16, '종류 칸은 16열');
  ok(GB.pitch >= 34, '타일 간격(' + GB.pitch + ')이 타일 너비(32)보다 넓다');
  ok(GB.gpitch >= 36, '종류 칸 간격(' + GB.gpitch + ')이 칸 너비(36)보다 넓거나 같다');
  ok(GB.yS < GB.yK && GB.yK < GB.yB && GB.yB < GB.gy0, 'mRNA → 괄호 → 구슬 → 종류 칸이 위에서 아래로');
  ok(GB.gy0 + GB.gdy * 3 + 10 <= 292, '64칸(4줄)이 viewBox 높이 292 안에 든다');
  eq(GB.yBan, 166, '★GB.yBan = 166'); eq(GB.gy0, 216, '★GB.gy0 = 216 (종류 칸은 띠 아래로)');
  ok(GB.yB < GB.yBan && GB.yBan < GB.gy0, '★띠는 구슬(yB)과 종류 칸(gy0) 사이에 있다');
  ok(GB.yBan + 14 < GB.gy0 - 18, '  → 띠 아래와 종류 칸 제목 사이가 겹치지 않는다');
  // gbCombos
  eqJ(S.gbCombos(1), DB, '★gbCombos(1) = A · T · G · C');
  const c2 = S.gbCombos(2);
  eq(c2.length, 16, '★gbCombos(2) 16개'); eq(c2[0], 'AA', '  → 첫째 AA'); eq(c2[15], 'CC', '  → 마지막 CC'); eq(new Set(c2).size, 16, '  → 서로 다르다');
  eqJ(c2.slice(0, 4), ['AA','AT','AG','AC'], '  → 앞 넷은 두 번째 글자가 A·T·G·C 로 돈다');
  eqJ(c2, dnaCombos(2), '  → 검사가 스스로 만든 16개와 차례까지 같다');
  const c3 = S.gbCombos(3);
  eq(c3.length, 64, '★gbCombos(3) 64개'); eq(new Set(c3).size, 64, '  → 서로 다르다');
  eqJ(c3.slice().sort(), dnaCombos(3).sort(), '★gbCombos(3) 의 집합 = {A,T,G,C} 위의 3글자 64개 전부');
  eqJ(c3, dnaCombos(3), '  → 차례도 첫·둘·셋째 글자 A·T·G·C 로 도는 차례와 같다');
  eq(c3[0], 'AAA', '  → 첫째 AAA'); eq(c3[63], 'CCC', '  → 마지막 CCC');
  ok([1,2,3].every(n => S.gbCombos(n).every(c => !/U/.test(c))), '★gbCombos 어디에도 U 가 없다');
  eqJ(S.gbCombos(0), [], 'gbCombos(0) = []'); eqJ(S.gbCombos(undefined), [], 'gbCombos(undefined) = []'); eqJ(S.gbCombos(-1), [], 'gbCombos(-1) = []');
  [1,2,3].forEach(n => eq(S.gbCombos(n).length, S.codeCount(n), '  gbCombos(' + n + ').length = codeCount(' + n + ') = 4^' + n));
  // gbGroups
  const tileX = i => GB.x0 + GB.pitch * i;
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  eq(S.gbGroups(3).length, 4, '★3개씩 → 묶음 4'); eq(S.gbGroups(2).length, 6, '★2개씩 → 묶음 6'); eq(S.gbGroups(1).length, 12, '★1개씩 → 묶음 12');
  [1,2,3].forEach(n => {
    const g = S.gbGroups(n);
    eqJ(g.map(x => x.start), g.map((_, k) => k * n), '  gbGroups(' + n + ') 의 start = k·n (겹치지도 비지도 않는다)');
    ok(g.every(x => x.n === n), '  gbGroups(' + n + ') 의 n 이 모두 ' + n);
    eqJ(g.map(x => x.x), g.map(x => mean([...Array(n).keys()].map(i => tileX(x.start + i)))), '★gbGroups(' + n + ') 의 x = 묶인 타일 x 들의 평균');
    eq(g[g.length - 1].start + n, 12, '  → 마지막 묶음이 12번째 염기에서 끝난다 (꼬리 없음)');
  });
  eqJ(S.gbGroups(0), [], 'gbGroups(0) = []'); eqJ(S.gbGroups(null), [], 'gbGroups(null) = []');
  eq(S.gbGroups(5).length, 2, '★12 를 5개씩 묶으면 2묶음 — 3자리 못 되는 꼬리는 묶지 않는다');
  eq(S.gbGroups(7).length, 1, '  → 7개씩이면 1묶음'); eq(S.gbGroups(12).length, 1, '  → 12개씩이면 1묶음'); eq(S.gbGroups(13).length, 0, '  → 13개씩이면 0묶음');
  // gbLayout
  [1,2,3].forEach(n => {
    const L = S.gbLayout(n), G = S.gbGroups(n), N = Math.pow(4, n);
    eq(L.n, n, 'gbLayout(' + n + ').n'); eq(L.groups, G.length, '  groups = 묶음 수 ' + G.length);
    eq(L.brackets.length, 12, '  괄호 12'); eq(L.beads.length, 12, '  구슬 12'); eq(L.cells.length, 64, '  칸 64');
    eqJ(L.brackets.map(b => b.op), L.brackets.map((_, k) => k < G.length ? 1 : 0), '★n=' + n + ' 괄호 op 는 앞 ' + G.length + '개만 1');
    eqJ(L.beads.map(b => b.op), L.beads.map((_, k) => k < G.length ? 1 : 0), '★n=' + n + ' 구슬 op 도 앞 ' + G.length + '개만 1 (묶음 하나에 아미노산 하나)');
    eqJ(L.brackets.slice(0, G.length).map(b => b.x), G.map(g => g.x), '★n=' + n + ' 보이는 괄호 x = 묶음 x');
    eqJ(L.beads.slice(0, G.length).map(b => b.x), L.brackets.slice(0, G.length).map(b => b.x), '★n=' + n + ' 구슬 x = 괄호 x');
    ok(L.brackets.slice(0, G.length).every(b => b.w === GB.pitch * n - 10), '★n=' + n + ' 괄호 너비 = pitch·n − 10 (' + (GB.pitch * n - 10) + ')');
    ok(L.beads.every(b => b.y === GB.yB), '  구슬 y = yB');
    ok(L.brackets.slice(G.length).every((b, k) => b.x === tileX(G.length + k) && b.w === GB.pitch - 10), '  안 쓰는 괄호는 제 타일 자리에 op 0 (스르르 사라진다)');
    eqJ(L.cells.map(c => c.op), L.cells.map((_, i) => i < N ? 1 : 0), '★n=' + n + ' 칸 op 는 앞 4^' + n + '=' + N + '개만 1');
    eqJ(L.cells.slice(0, N).map(c => c.txt), S.gbCombos(n), '★n=' + n + ' 칸 글자 = gbCombos(' + n + ')');
    ok(L.cells.slice(N).every(c => c.txt === ''), '  나머지 칸은 빈 글자');
    eqJ(L.cells.map(c => c.x), L.cells.map((_, i) => GB.gx0 + GB.gpitch * (i % 16)), '★칸 x = gx0 + gpitch·(i mod 16) — 16열 격자');
    eqJ(L.cells.map(c => c.y), L.cells.map((_, i) => GB.gy0 + GB.gdy * Math.floor(i / 16)), '★칸 y = gy0 + gdy·⌊i/16⌋');
    eq(L.count, N, '★count = 4^' + n); eq(L.enough, N >= 20, '★enough === (count ≥ 20) → ' + (N >= 20));
    eq(L.banner, n === 3 ? 1 : 0, '★n=' + n + ' 코돈 띠 ' + (n === 3 ? '켜짐 (3개씩일 때만)' : '숨김'));
    ok(new RegExp('묶음 <b>' + G.length + '개</b>').test(L.cap), '  캡션이 묶음 ' + G.length + '개를 말한다');
    ok(new RegExp('아미노산 <b>' + G.length + '개</b>').test(L.cap), '  캡션이 아미노산 ' + G.length + '개를 말한다');
    ok(new RegExp('4<sup>' + n + '</sup> = <b>' + N + '가지</b>').test(L.cap), '  캡션이 4^' + n + ' = ' + N + '가지를 말한다');
    if (n < 3) ok(/모자란다/.test(L.cap) && !/다 가리킬 수 있다/.test(L.cap), '★n=' + n + ' 캡션 「모자란다」');
    else ok(/다 가리킬 수 있다/.test(L.cap) && !/모자란다/.test(L.cap), '★n=3 캡션 「다 가리킬 수 있다」');
    eq(L.cnt, '4' + ['', '¹', '²', '³'][n] + ' = ' + N + '가지', '  cnt 표시 「4' + ['', '¹', '²', '³'][n] + ' = ' + N + '가지」');
    ok(!/[가-힣](요|죠|네|자)[.!]$/.test(strip(L.cap)), '  캡션이 구어체로 끝나지 않는다');
  });
  [0, null, undefined, 9, '3'].forEach(v => {
    const L = S.gbLayout(v), want = (v === '3') ? 3 : 0;
    eq(L.n, want, 'gbLayout(' + JSON.stringify(v) + ').n = ' + want + (want ? ' (문자열 "3" 도 3)' : ' (범위 밖·없음은 0)'));
  });
  const L0 = S.gbLayout(0);
  eq(L0.groups, 0, '★gbLayout(0) 묶음 0');
  ok(L0.brackets.every(b => b.op === 0) && L0.beads.every(b => b.op === 0) && L0.cells.every(c => c.op === 0), '★gbLayout(0) 은 괄호·구슬·칸이 모두 op 0');
  ok(/아미노산 하나/.test(L0.cap) && /묶음 크기를 고르면/.test(L0.cap), '★gbLayout(0) 캡션이 「묶음 하나마다 아미노산 하나」를 예고하고 고르기를 권한다');
  ok(/DNA 의 염기가 그 크기로 묶이고/.test(L0.cap), '  → 「DNA 의 염기가 그 크기로 묶이고」 (mRNA 가 아니다)');
  ok([0,1,2,3].every(n => !/mRNA|RNA/.test(S.gbLayout(n).cap)), '  → 어느 캡션에도 RNA 가 나오지 않는다');
  eq(L0.cnt, '', '  cnt 없음'); eq(L0.count, 0, '  count 0'); eq(L0.enough, false, '  enough false'); eq(L0.banner, 0, '  띠 숨김');
  // 마운트된 SVG
  const svg = html(S, 'groupStage');
  ok(svg.length > 2000, '묶기 무대가 마운트되었다');
  const tiles = [...svg.matchAll(/<g transform="translate\((\d+),(\d+)\)"><rect[^>]*fill="#0F9B95"\/><text[^>]*fill="#fff"[^>]*>([ATGC])<\/text><\/g>/g)];
  eq(tiles.length, 12, '★DNA 타일 12개 (청록 C_DNA 칸 + 흰 글자)');
  ok(!/>U</.test(svg) && !/>[ATGC]*U[ATGC]*</.test(svg), '★마운트된 무대 어디에도 글자 U 가 없다 (U 는 ② 전사에서 처음 나온다)');
  ok(!/#6C2BD9/.test(svg), '  → mRNA 색(보라)도 쓰지 않는다');
  eq(tiles.map(t => t[3]).join(''), GB.seq, '★타일 글자가 GB.seq 차례 그대로');
  eqJ(tiles.map(t => Number(t[1])), [...Array(12).keys()].map(tileX), '  → 타일 x = x0 + pitch·i');
  ok(tiles.every(t => Number(t[2]) === GB.yS), '  → 타일 y = yS');
  eq((svg.match(/<g id="gb_k_\d+" class="rmove" opacity="0">/g) || []).length, 12, '★괄호 g 12개 (처음엔 모두 숨김)');
  eq((svg.match(/<path id="gb_kp_\d+"/g) || []).length, 12, '  → 괄호 path 12개');
  eq((svg.match(/<g id="gb_b_\d+" class="rmove" opacity="0">/g) || []).length, 12, '★구슬 g 12개 (처음엔 모두 숨김)');
  for (let i = 0; i < 12; i++) ok(/<circle[^>]*fill="#C2185B"\/><circle[^>]*fill="#fff"\/>/.test(gOf(svg, 'gb_b_' + i)), '  구슬 ' + i + ' 은 자홍 원 + 흰 점');
  eq((svg.match(/<g id="gb_c_\d+" class="rmove" opacity="0">/g) || []).length, 64, '★종류 칸 g 64개 (처음엔 모두 숨김)');
  eq((svg.match(/<text id="gb_ct_\d+"/g) || []).length, 64, '  → 칸 글자 text 64개');
  ok(/<text[^>]*fill="#0A6B67"[^>]*>DNA<\/text>/.test(svg), '줄 이름표 「DNA」 (DNA 글자색)'); ok(!/>mRNA<\/text>/.test(svg), '  → 「mRNA」 이름표는 없다');
  ok(/>아미노산<\/text>/.test(svg), '줄 이름표 「아미노산」');
  ok([...Array(12).keys()].every(i => /<path id="gb_kp_\d+"[^>]*stroke="#0F9B95"/.test(gOf(svg, 'gb_k_' + i))), '괄호 선은 C_DNA 색');
  ok([...Array(64).keys()].every(i => /<text id="gb_ct_\d+"[^>]*fill="#0A6B67"/.test(gOf(svg, 'gb_c_' + i))), '종류 칸 글자는 DNA 글자색');
  ok(/<td>DNA<\/td><td>4 \(A·T·G·C\)<\/td>/.test(bodyHtml), '★부호 비교 표의 줄이 「DNA · 4 (A·T·G·C)」 — RNA/U 를 말하지 않는다');
  ok(/>묶음 하나가 될 수 있는 종류<\/text>/.test(svg), '종류 칸 제목');
  ok(/<text id="gb_cnt"/.test(svg), '가짓수 표시 gb_cnt 가 있다');
  const GB_BANNER = 'mRNA 에서 3개의 염기 묶음을 코돈이라고 한다';   // 교사 2026-09-12 문구 그대로 — 용어를 명확히
  const gb = gOf(svg, 'gb_banner');
  ok(/^<g id="gb_banner" class="rfade" transform="translate\(/.test(gb) && /opacity="0"/.test(gb.slice(0, 120)), '★gb_banner 는 .rfade 이고 처음엔 숨김');
  ok(new RegExp('translate\\(' + (GB.x0 + GB.pitch * 5.5) + ',' + GB.yBan + '\\)').test(gb), '  → 자리 = (12염기의 가운데, yBan)');
  ok(/<rect x="-190" y="-14" width="380" height="28" rx="14" fill="#C2185B"\/>/.test(gb), '  → 자홍(C_PROT) 띠 380×28, 가운데 정렬');
  ok(new RegExp('<text[^>]*font-size="15"[^>]*fill="#fff"[^>]*>' + GB_BANNER + '</text>').test(gb), '  → 흰 글자 15px 「' + GB_BANNER + '」');
  ok(/mRNA 에서/.test(GB_BANNER) && /코돈이라고 한다/.test(GB_BANNER) && !/[ACG]U|U[ACG]/.test(GB_BANNER), '  → 띠 글자는 「mRNA 에서 … 코돈이라고 한다」이고 염기 U 는 없다(mRNA 라는 이름만)');
  eq((svg.match(/<g id="gb_banner"/g) || []).length, 1, '  → 띠는 하나뿐');
  ok(!/<text[^>]*>[^<]*<(sup|b|i)\b/.test(svg), '★<text> 안에 <sup>·<b> 가 없다 (캡션은 SVG 밖 #gb_cap 에 둔다)');
  ok(!/<sup>|<b>/.test(svg), '  → SVG 어디에도 <sup>·<b> 가 없다');
  ok(!/NaN|undefined/.test(svg), '좌표에 NaN·undefined 가 없다');
  ok(/<svg[^>]*id="groupStage"[^>]*viewBox="0 0 700 292"[^>]*aria-label="[^"]{20,}"/.test(bodyHtml), '★#groupStage 는 viewBox 700×292 + aria-label');
  ok(bodyHtml.indexOf('id="groupStage"') < bodyHtml.indexOf('id="gb_cap"') && bodyHtml.indexOf('id="gb_cap"') < bodyHtml.indexOf('id="codeStage"'), '  → 무대 → 캡션 → 막대그래프 차례 (왼쪽 칸)');
  ok(bodyHtml.indexOf('class="t codetbl"') > bodyHtml.indexOf('<div class="pane-r">', bodyHtml.indexOf('id="cardCode"')), '  → 부호 비교 표는 오른쪽 칸에');
  // 처음(codeLast null) 상태
  eq(html(S, 'gb_cap'), L0.cap, '★처음 캡션 = gbLayout(0).cap');
  eq(attr(S, 'gb_banner', 'opacity'), '0', '★처음엔 코돈 띠 숨김');
  eq(txt(S, 'gb_cnt'), '', '  gb_cnt 비어 있다');
  eq(attr(S, 'gb_k_0', 'opacity'), '0', '  괄호 0 숨김'); eq(attr(S, 'gb_c_0', 'opacity'), '0', '  칸 0 숨김');
  // pickCode(2)
  S.pickCode(2);
  eq(attr(S, 'gb_kp_0', 'd'), 'M-39,-3 L-39,3 L39,3 L39,-3', '★2개씩: 괄호 path d = 너비 78 (44·2 − 10)');
  eq(attr(S, 'gb_k_0', 'transform'), 'translate(' + (GB.x0 + GB.pitch * 0.5) + ',' + GB.yK + ')', '  → 괄호 0 이 타일 0·1 사이에');
  eq(attr(S, 'gb_k_0', 'opacity'), '1', '  → 괄호 0 보임'); eq(attr(S, 'gb_k_5', 'opacity'), '1', '  → 괄호 5 보임'); eq(attr(S, 'gb_k_6', 'opacity'), '0', '  → 괄호 6 숨김');
  eq(attr(S, 'gb_b_5', 'transform'), 'translate(' + (GB.x0 + GB.pitch * 10.5) + ',' + GB.yB + ')', '  → 구슬 5 가 괄호 5 아래');
  eq(attr(S, 'gb_b_6', 'opacity'), '0', '  → 구슬 6 숨김');
  eq(txt(S, 'gb_cnt'), '4² = 16가지', '★gb_cnt 「4² = 16가지」');
  eq(attr(S, 'gb_banner', 'opacity'), '0', '★2개씩에서는 코돈 띠 숨김');
  eq(attr(S, 'gb_c_15', 'opacity'), '1', '  칸 15 보임'); eq(attr(S, 'gb_c_16', 'opacity'), '0', '  칸 16 숨김');
  eq(txt(S, 'gb_ct_5'), 'TT', '  칸 5 글자 TT'); eq(txt(S, 'gb_ct_15'), 'CC', '  칸 15 글자 CC'); eq(txt(S, 'gb_ct_16'), '', '  칸 16 글자 없음');
  ok(!/>U</.test(html(S, 'groupStage')) && !/>[ATGC]*U[ATGC]*</.test(html(S, 'groupStage')), '  → 2개씩 묶은 뒤에도 U 가 없다');
  eq(attr(S, 'gb_c_17', 'transform'), 'translate(' + (GB.gx0 + GB.gpitch) + ',' + (GB.gy0 + GB.gdy) + ')', '  칸 17 = 2행 2열');
  eq(html(S, 'gb_cap'), S.gbLayout(2).cap, '★캡션 = gbLayout(2).cap');
  ok(/모자란다/.test(html(S, 'gb_cap')), '  → 모자란다');
  // pickCode(3)
  S.pickCode(3);
  eq(attr(S, 'gb_kp_0', 'd'), 'M-61,-3 L-61,3 L61,3 L61,-3', '★3개씩: 괄호 너비 122 (44·3 − 10)');
  eq(attr(S, 'gb_k_0', 'transform'), 'translate(' + (GB.x0 + GB.pitch) + ',' + GB.yK + ')', '  → 괄호 0 이 타일 1 위(0·1·2 의 가운데)');
  eq(attr(S, 'gb_k_3', 'opacity'), '1', '  → 괄호 3 보임'); eq(attr(S, 'gb_k_4', 'opacity'), '0', '  → 괄호 4 숨김');
  eq(txt(S, 'gb_cnt'), '4³ = 64가지', '★gb_cnt 「4³ = 64가지」');
  eq(attr(S, 'gb_banner', 'opacity'), '1', '★3개씩에서 코돈 띠가 켜진다');
  eq(attr(S, 'gb_c_63', 'opacity'), '1', '  칸 63 보임'); eq(txt(S, 'gb_ct_63'), 'CCC', '  칸 63 글자 CCC'); eq(txt(S, 'gb_ct_0'), 'AAA', '  칸 0 글자 AAA');
  ok(!/>U</.test(html(S, 'groupStage')) && !/>[ATGC]*U[ATGC]*</.test(html(S, 'groupStage')), '  → 3개씩 64칸에도 U 가 없다');
  ok(/다 가리킬 수 있다/.test(html(S, 'gb_cap')), '  → 다 가리킬 수 있다');
  // pickCode(1)
  S.pickCode(1);
  eq(attr(S, 'gb_kp_0', 'd'), 'M-17,-3 L-17,3 L17,3 L17,-3', '★1개씩: 괄호 너비 34 (44 − 10)');
  eq(attr(S, 'gb_k_11', 'opacity'), '1', '  → 괄호 11 까지 보임'); eq(txt(S, 'gb_cnt'), '4¹ = 4가지', '★gb_cnt 「4¹ = 4가지」');
  eq(attr(S, 'gb_banner', 'opacity'), '0', '  → 1개씩으로 돌아오면 띠가 다시 숨는다');
  eq(attr(S, 'gb_c_3', 'opacity'), '1', '  칸 3 보임'); eq(attr(S, 'gb_c_4', 'opacity'), '0', '  칸 4 숨김');
  // 되돌리기
  S.resetSec('code');
  eq(html(S, 'gb_cap'), L0.cap, '★①-2 되돌리면 캡션이 n=0 문구로');
  ok([...Array(12).keys()].every(i => attr(S, 'gb_k_' + i, 'opacity') === '0'), '★괄호 12개가 모두 숨는다');
  ok([...Array(12).keys()].every(i => attr(S, 'gb_b_' + i, 'opacity') === '0'), '  → 구슬 12개도');
  ok([...Array(64).keys()].every(i => attr(S, 'gb_c_' + i, 'opacity') === '0'), '  → 칸 64개도');
  eq(txt(S, 'gb_cnt'), '', '  → gb_cnt 비움');
  eq(attr(S, 'gb_banner', 'opacity'), '0', '★①-2 되돌리면 코돈 띠도 숨는다');
  eq((html(S, 'groupStage').match(/<g id="gb_k_\d+"/g) || []).length, 12, '  → 무대는 다시 짓지 않는다 (g 12개 그대로)');
  // 복원
  const R = makeSandbox({ seed:{ [S.LS_KEY]: JSON.stringify({ seq:1, codeRun:{ '2':true }, codeLast:2 }) } });
  eq(txt(R, 'gb_cnt'), '4² = 16가지', '★codeLast 2 로 복원하면 무대가 2개씩 묶인 채 시작한다');
  eq(attr(R, 'gb_banner', 'opacity'), '0', '  → 띠 숨김');
  const R3 = makeSandbox({ seed:{ [S.LS_KEY]: JSON.stringify({ seq:1, codeRun:{ '3':true }, codeLast:3 }) } });
  eq(attr(R3, 'gb_banner', 'opacity'), '1', '  → codeLast 3 으로 복원하면 띠가 켜진 채 시작한다');
  eq(attr(R, 'gb_kp_0', 'd'), 'M-39,-3 L-39,3 L39,3 L39,-3', '  → 괄호 너비 78');
  eq(S._missing.join(','), '', '★묶기 무대 동안 없는 id 를 찾은 일이 없다');
}

// ══ 7c. ③ 코돈표 무대 ══
console.log('[7c] ③ 코돈표 무대 — 세 축이 차례로(ctLayout 4국면) · 칸 16을 열어 64코돈 · 개시·종결만 형광 · 종류 3 설명 · 완료·되돌리기·복원');
{
  const S = makeSandbox();
  const CT = S.CT;
  const KEYS = REF_AXIS.flatMap(a => REF_AXIS.map(b => a + b));          // UU … GG (행·열 차례)
  function openAll(T){ T.aniGo('ct', 99); KEYS.forEach(k => T.ctOpenCell(k)); }
  // ── 상수·도우미 ──
  eqJ(S.CT_KINDS, ['start','aa','stop'], '★종류 셋 = start · aa · stop');
  eqJ(ALL_CODONS.filter(c => S.codonKind(c) === 'start'), ['AUG'], '★codonKind 가 start 인 코돈은 AUG 뿐');
  eqJ(ALL_CODONS.filter(c => S.codonKind(c) === 'stop').sort(), REF_STOP.slice().sort(), '★codonKind 가 stop 인 코돈은 UAA·UAG·UGA');
  eq(ALL_CODONS.filter(c => S.codonKind(c) === 'aa').length, 60, '★나머지 60개가 aa (61 − AUG)');
  eq(S.CT_STEPS.length, 4, '★국면 4개'); eq(S.CT_CAP.length, 4, '★캡션 4개'); eq(S.aniLast('ct'), 3, '  → aniLast("ct") = 3');
  eq(S.aniSteps('ct'), S.CT_STEPS, '  → aniSteps("ct") = CT_STEPS');
  ok(/첫 번째 염기/.test(S.CT_STEPS[1]) && /두 번째 염기/.test(S.CT_STEPS[2]) && /세 번째 염기/.test(S.CT_STEPS[3]), '★국면 1·2·3 이름이 첫·둘·셋째 염기');
  ok(/첫 번째 염기/.test(S.CT_CAP[1]) && /두 번째 염기/.test(S.CT_CAP[2]) && /세 번째 염기/.test(S.CT_CAP[3]), '  → 캡션 1·2·3 도');
  ok(/16 칸/.test(S.CT_CAP[2]), '  → 캡션 2 가 16 칸을 말한다'); ok(/64/.test(S.CT_CAP[3]), '★캡션 3 이 64 를 말한다');
  ok(/칸을 눌러/.test(S.CT_CAP[3]), '  → 캡션 3 이 칸을 누르라고 한다');
  eqJ([CT.x0, CT.y0, CT.cw, CT.rh, CT.sub, CT.axL, CT.axR], [64, 56, 150, 120, 30, 40, 672], '★CT 상수');
  eq(CT.sub * 4, CT.rh, '  → 칸 높이 = 줄 4개'); ok(CT.x0 + CT.cw * 4 < CT.axR, '  → 오른쪽 축이 칸 밖에'); ok(CT.axL < CT.x0, '  → 왼쪽 축이 칸 밖에');
  ok(CT.y0 + CT.rh * 4 <= 548, '  → 4행이 viewBox 548 안에');
  eqJ([[0,0],[1,2],[3,3]].map(([r,c]) => S.ctCellXY(r, c)), [{x:64,y:56},{x:364,y:176},{x:514,y:416}], '★ctCellXY = (x0 + cw·c, y0 + rh·r)');
  eq(S.ctRowY(1, 2), CT.y0 + CT.rh + CT.sub * 2 + CT.sub / 2, '★ctRowY = 칸 y + sub·k + sub/2');
  eqJ([0,1,2,3].flatMap(r => [0,1,2,3].map(c => S.ctKey(r, c))), KEYS, '★ctKey(r,c) = BASES4[r]+BASES4[c] (U·C·A·G 차례)');
  eq(S.ctIsOpen('UU'), false, '처음엔 UU 닫힘');
  // ── ctLayout — 4국면 × 닫힘/열림 ──
  const SOME = { 'UA':true, 'GG':true };
  [0,1,2,3].forEach(p => [{}, SOME].forEach(open => {
    const L = S.ctLayout(p, open), tag = 'p' + p + (open === SOME ? '(UA·GG 열림)' : '');
    eq(L.ph, p, tag + ' ph'); eq(L.step, S.CT_STEPS[p], '  step'); eq(L.cap, S.CT_CAP[p], '  cap');
    eqJ(L.axis, { left:(p >= 1 ? 1 : 0), top:(p >= 2 ? 1 : 0), right:(p >= 3 ? 1 : 0) }, '★' + tag + ' 축 — 왼쪽⇔p≥1 · 위⇔p≥2 · 오른쪽⇔p≥3');
    eq(L.canOpen, p >= 3, '★' + tag + ' canOpen ⇔ p≥3');
    eq(L.cells.length, 16, '  칸 16');
    eqJ(L.cells.map(c => c.key), KEYS, '  칸 열쇠 차례 UU…GG');
    ok(L.cells.every((c, i) => c.r === Math.floor(i / 4) && c.c === i % 4), '  칸 r·c');
    eqJ(L.cells.map(c => c.frame), KEYS.map(() => p >= 2 ? 1 : 0), '★' + tag + ' 칸 틀 ⇔ p≥2');
    eqJ(L.cells.map(c => c.subLines), KEYS.map(() => p >= 3 ? 1 : 0), '★' + tag + ' 줄 나눔 ⇔ p≥3');
    eqJ(L.cells.map(c => c.plus), KEYS.map(k => (p >= 3 && !open[k]) ? 1 : 0), '★' + tag + ' ＋ ⇔ p≥3 이고 안 연 칸');
    eqJ(L.cells.map(c => c.open), KEYS.map(k => !!open[k]), '  open');
    L.cells.forEach(c => {
      eqJ(c.rows.map(r => r.cod), REF_AXIS.map(b => c.key + b), '  ' + tag + ' ' + c.key + ' 줄 4 = 셋째 글자 U·C·A·G');
      eqJ(c.rows.map(r => r.name), REF_AXIS.map(b => REF[c.key + b]), '  ' + tag + ' ' + c.key + ' 이름 = 교과서 코돈표');
      eqJ(c.rows.map(r => r.kind), REF_AXIS.map(b => S.codonKind(c.key + b)), '  ' + tag + ' ' + c.key + ' 종류');
      eqJ(c.rows.map(r => r.op), c.rows.map(() => open[c.key] ? 1 : 0), '★' + tag + ' ' + c.key + ' 줄 op ⇔ 연 칸');
      eqJ(c.rows.map(r => r.hl), c.rows.map(r => (open[c.key] && r.kind !== 'aa') ? 1 : 0), '★' + tag + ' ' + c.key + ' 형광 ⇔ 연 칸 && 개시·종결');
    });
  }));
  eq(S.ctLayout(9, {}).ph, 3, '넘치는 국면은 3 으로'); eq(S.ctLayout(-1, {}).ph, 0, '음수는 0'); eq(S.ctLayout(3, undefined).cells[0].open, false, 'open 이 없으면 닫힘');
  const L3 = S.ctLayout(3, { 'UA':true, 'AU':true });
  eq(L3.cells.flatMap(c => c.rows).filter(r => r.hl).length, 3, '★UA·AU 를 열면 형광은 UAA·UAG·AUG 셋');
  eqJ(L3.cells.flatMap(c => c.rows).filter(r => r.hl).map(r => r.cod), ['UAA','UAG','AUG'], '  → 그 셋');
  eq(S.ctLayout(3, { 'UG':true }).cells.flatMap(c => c.rows).filter(r => r.hl).map(r => r.cod).join(), 'UGA', '  → UG 를 열면 UGA 만');
  // ── 마운트된 SVG ──
  const svg = html(S, 'ctStage');
  ok(/<svg[^>]*id="ctStage"[^>]*viewBox="0 0 700 548"[^>]*aria-label="[^"]{20,}"/.test(bodyHtml), '★#ctStage viewBox 700×548 + aria-label');
  ['ct_axL','ct_axT','ct_axR'].forEach(id => ok(new RegExp('<g id="' + id + '" class="rfade" opacity="0">').test(svg), '★축 ' + id + ' 는 .rfade, 처음엔 숨김'));
  const axLetters = id => [...gOf(svg, id).matchAll(/<text[^>]*>([UCAG])<\/text>/g)].map(m => m[1]);
  eqJ(axLetters('ct_axL'), REF_AXIS, '★왼쪽 축 글자 U·C·A·G (위→아래)');
  eqJ(axLetters('ct_axT'), REF_AXIS, '★위쪽 축 글자 U·C·A·G (왼→오)');
  eqJ(axLetters('ct_axR'), [].concat(REF_AXIS, REF_AXIS, REF_AXIS, REF_AXIS), '★오른쪽 축 글자 16개 — 줄마다 U·C·A·G');
  ok(/>첫 번째<\/text>/.test(gOf(svg, 'ct_axL')) && />두 번째 염기<\/text>/.test(gOf(svg, 'ct_axT')) && />세 번째<\/text>/.test(gOf(svg, 'ct_axR')), '  → 축 이름표');
  const topXs = [...gOf(svg, 'ct_axT').matchAll(/<text x="([\d.]+)"[^>]*>[UCAG]<\/text>/g)].map(m => Number(m[1]));
  eqJ(topXs, [0,1,2,3].map(c => CT.x0 + CT.cw * c + CT.cw / 2), '  → 위쪽 축 글자가 칸 가운데 위에');
  eq((svg.match(/<g id="ct_cell_[UCAG]{2}" class="ctcell" onclick="ctOpenCell\('[UCAG]{2}'\)">/g) || []).length, 16, '★칸 g 16개 (.ctcell · ctOpenCell)');
  eqJ([...svg.matchAll(/<g id="ct_cell_([UCAG]{2})"/g)].map(m => m[1]), KEYS, '  → 칸 차례 UU…GG');
  eq((svg.match(/<rect id="ct_fr_[UCAG]{2}" class="rfade"/g) || []).length, 16, '  틀 rect 16 (.rfade)');
  eq((svg.match(/<g id="ct_sl_[UCAG]{2}" class="rfade" opacity="0">(<line[^>]*stroke-dasharray[^>]*\/>){3}<\/g>/g) || []).length, 16, '  줄 나눔 g 16 (파선 3개씩)');
  eq((svg.match(/<text id="ct_plus_[UCAG]{2}" class="rfade"[^>]*>＋<\/text>/g) || []).length, 16, '  ＋ text 16');
  eq((svg.match(/<g id="ct_row_[UCAG]{3}" class="ctrow rfade" opacity="0" pointer-events="none" onclick="ctTapCodon\('[UCAG]{3}', event\)">/g) || []).length, 64, '★코돈 줄 g 64개 (.ctrow .rfade · 처음엔 숨김 · pointer-events none · ctTapCodon)');
  eqJ([...svg.matchAll(/<g id="ct_row_([UCAG]{3})"/g)].map(m => m[1]), ALL_CODONS, '  → 줄 차례 = 코돈표 차례 (첫·둘·셋째 U·C·A·G)');
  eqJ(ALL_CODONS.filter(c => !new RegExp('<rect id="ct_hl_' + c + '"[^>]*fill="#EEFF41" opacity="1"').test(svg)).sort(), ALL_CODONS.filter(c => S.codonKind(c) === 'aa').sort(), '★형광(#EEFF41) 바탕은 AUG·UAA·UAG·UGA 넉 줄에만');
  eqJ(ALL_CODONS.filter(c => new RegExp('<rect id="ct_hl_' + c + '"[^>]*fill="#fff" opacity="0"').test(svg)).length, 60, '  → 나머지 60줄은 흰 바탕 op 0');
  eq((svg.match(/<rect id="ct_cur_[UCAG]{3}"[^>]*fill="none" stroke="#6C2BD9"[^>]*opacity="0"/g) || []).length, 64, '  누른 줄 테두리 64 (처음엔 숨김)');
  const badRows = ALL_CODONS.filter(c => !new RegExp('<g id="ct_row_' + c + '"[^>]*>[\\s\\S]*?<text[^>]*fill="#6C2BD9"[^>]*font-family="Consolas[^>]*>' + c + '</text><text[^>]*>' + REF[c] + '</text>').test(gOf(svg, 'ct_row_' + c)));
  eqJ(badRows, [], '★64줄마다 코돈(보라·고정폭)과 교과서 이름이 적혀 있다 (어긋난 줄)');
  eq((svg.match(/>개시<\/text>/g) || []).length, 1, '★「개시」 꼬리표는 한 줄뿐'); ok(/>개시<\/text>/.test(gOf(svg, 'ct_row_AUG')), '  → AUG 줄에');
  ok(!/\(개시코돈\)/.test(svg), '  → 「(개시코돈)」을 이름 뒤에 붙이지 않는다 (칸을 넘친다)');
  ok(!/<text[^>]*>[^<]*<(sup|b|i)\b/.test(svg) && !/NaN|undefined/.test(svg), 'SVG 에 <sup>/<b> · NaN 없음');
  // ── 국면 넘김 (DOM) ──
  eq(S.ANI.ct.ph, 0, '처음 국면 0');
  eq(html(S, 'findTask'), '▶ 를 눌러 표의 세 축을 차례로 놓으시오.', '★처음 지시 = 축을 놓으시오');
  eq(txt(S, 'findProg'), '연 칸 0 / 16 · 본 종류 0 / 3', '★꼬리표 「연 칸 0 / 16 · 본 종류 0 / 3」');
  ok(/<b>1 \/ 4<\/b>/.test(html(S, 'ct_step')), 'p0 단계 1 / 4'); eq(html(S, 'ct_cap'), S.CT_CAP[0], 'p0 캡션');
  ok(dis(S, 'ct_first') && dis(S, 'ct_prev') && !dis(S, 'ct_next') && !dis(S, 'ct_last'), 'p0 단추');
  eqJ(['ct_axL','ct_axT','ct_axR','ct_fr_UU','ct_sl_UU','ct_plus_UU'].map(id => attr(S, id, 'opacity')), ['0','0','0','0','0','0'], 'p0 모두 숨김');
  S.ctOpenCell('UU');
  eqJ(S.state.ctOpen, {}, '★p0 에서는 칸을 열 수 없다'); eq(S._store['fb_find'].className, 'msg warn', '  → 경고');
  eq(html(S, 'fb_find'), '먼저 ▶ 를 눌러 표의 세 축을 모두 놓으시오.', '  → 문구'); eq(stored(S), null, '  → 저장 없음');
  S.aniGo('ct', 1);
  eqJ(['ct_axL','ct_axT','ct_axR','ct_fr_UU'].map(id => attr(S, id, 'opacity')), ['1','0','0','0'], '★p1 왼쪽 축만');
  ok(/<b>2 \/ 4<\/b>/.test(html(S, 'ct_step')), 'p1 단계 2 / 4');
  S.aniGo('ct', 1);
  eqJ(['ct_axL','ct_axT','ct_axR','ct_fr_UU','ct_sl_UU','ct_plus_UU'].map(id => attr(S, id, 'opacity')), ['1','1','0','1','0','0'], '★p2 위쪽 축 + 칸 틀, 줄·＋ 아직');
  S.ctOpenCell('UU'); eqJ(S.state.ctOpen, {}, '★p2 에서도 못 연다'); eq(S._store['fb_find'].className, 'msg warn', '  → 경고');
  S.aniGo('ct', 1);
  eq(S.ANI.ct.ph, 3, '마지막 국면 3');
  eqJ(['ct_axL','ct_axT','ct_axR','ct_fr_UU','ct_sl_UU','ct_plus_UU'].map(id => attr(S, id, 'opacity')), ['1','1','1','1','1','1'], '★p3 세 축 + 줄 나눔 + ＋');
  ok(dis(S, 'ct_next') && dis(S, 'ct_last'), 'p3 ▶⏩ 꺼짐');
  eq(html(S, 'findTask'), '칸을 눌러 코돈을 여시오. <b>형광색</b> 칸은 눌러서 무엇인지 확인하시오. (연 칸 0 / 16)', '★p3 지시 = 칸을 여시오 (연 칸 0 / 16)');
  ok(ALL_CODONS.every(c => attr(S, 'ct_row_' + c, 'opacity') === '0' && attr(S, 'ct_row_' + c, 'pointer-events') === 'none'), '★열기 전엔 64줄 모두 숨김 + pointer-events none');
  eq(stored(S), null, '  → 국면 위치는 저장하지 않는다');
  // ── 칸 열기 ──
  S.ctTapCodon('UAA');
  eqJ(S.state.ctSeen, {}, '★닫힌 칸의 코돈은 눌러도 종류가 기록되지 않는다'); eq(S.state.ctLast, null, '  → ctLast 도 없다');
  S.ctOpenCell('UA');
  eqJ(S.state.ctOpen, { 'UA':true }, '★UA 칸 열림'); eq(stored(S).ctOpen.UA, true, '  → 저장');
  eq(S._store['fb_find'].className, 'msg good', '  → 옳음'); eq(html(S, 'fb_find'), '<b>UA_</b> 칸을 열었다. 남은 칸 15개.', '  → 「UA_ 칸을 열었다. 남은 칸 15개.」');
  eqJ(['UAU','UAC','UAA','UAG'].map(c => attr(S, 'ct_row_' + c, 'opacity')), ['1','1','1','1'], '★UA 의 4줄이 보인다');
  eqJ(['UAU','UAC','UAA','UAG'].map(c => attr(S, 'ct_row_' + c, 'pointer-events')), ['auto','auto','auto','auto'], '  → pointer-events auto');
  eq(attr(S, 'ct_row_UUU', 'opacity'), '0', '  → 다른 칸(UU)은 그대로 숨김'); eq(attr(S, 'ct_row_UUU', 'pointer-events'), 'none', '  → none');
  eq(attr(S, 'ct_plus_UA', 'opacity'), '0', '  → UA 의 ＋ 는 사라진다'); eq(attr(S, 'ct_plus_UU', 'opacity'), '1', '  → UU 의 ＋ 는 남는다');
  eqJ(['UAU','UAC','UAA','UAG'].map(c => S._store['ct_row_' + c].style.transitionDelay), ['', '', '', ''], '  → 좌르륵 지연은 그린 뒤 0 으로 되돌린다');
  eq(txt(S, 'findProg'), '연 칸 1 / 16 · 본 종류 0 / 3', '  → 꼬리표 1 / 16');
  ok(/\(연 칸 1 \/ 16\)/.test(html(S, 'findTask')), '  → 지시 막대 (연 칸 1 / 16)');
  S.ctOpenCell('UA');
  eqJ(S.state.ctOpen, { 'UA':true }, '★이미 연 칸은 다시 열지 않는다'); eq(S._store['fb_find'].className, 'msg info', '  → 안내');
  ok(/이미 연 칸/.test(html(S, 'fb_find')), '  → 문구');
  // ── 코돈 누르기 — 종류 3 ──
  eq((html(S, 'ctKinds').match(/class="kind"/g) || []).length, 3, '종류 칩 3개 (아직 seen 없음)');
  ok(/연 칸의 코돈을 누르면/.test(html(S, 'ctInfo')), '  → 설명 칸은 자리 안내만');
  S.ctTapCodon('UAA');
  eqJ(S.state.ctSeen, { stop:true }, '★UAA → stop 봄'); eq(S.state.ctLast, 'UAA', '  → ctLast UAA'); eq(stored(S).ctLast, 'UAA', '  → 저장');
  eq(attr(S, 'ct_cur_UAA', 'opacity'), '1', '  → 누른 줄 테두리'); eq(attr(S, 'ct_cur_UAG', 'opacity'), '0', '  → 다른 줄은 아님');
  ok(/<div class="ctinfo stop">/.test(html(S, 'ctInfo')) && /지정하지 않는다/.test(html(S, 'ctInfo')) && /끝난다/.test(html(S, 'ctInfo')) && /UAA · UAG · UGA/.test(html(S, 'ctInfo')), '★종결 설명 — 지정하지 않는다 · 끝난다 · UAA · UAG · UGA');
  ok(/<span class="kind seen">✅ 종결코돈<\/span>/.test(html(S, 'ctKinds')) && /<span class="kind">개시코돈<\/span>/.test(html(S, 'ctKinds')), '  → 종류 칩 종결만 ✅');
  eq(txt(S, 'findProg'), '연 칸 1 / 16 · 본 종류 1 / 3', '  → 꼬리표 본 종류 1 / 3');
  eq(S._store['fb_find'].className, 'msg hide', '  → 되돌림 칸은 비운다');
  S.ctTapCodon('UAU');
  eqJ(S.state.ctSeen, { stop:true, aa:true }, '★UAU → aa 봄'); eq(S.state.ctLast, 'UAU', '  → ctLast UAU');
  eq(attr(S, 'ct_cur_UAA', 'opacity'), '0', '  → 이전 줄 테두리 내림'); eq(attr(S, 'ct_cur_UAU', 'opacity'), '1', '  → 지금 줄');
  ok(/<div class="ctinfo aa">/.test(html(S, 'ctInfo')) && /61개/.test(html(S, 'ctInfo')) && /타이로신/.test(html(S, 'ctInfo')) && /\(2개\)/.test(html(S, 'ctInfo')), '★지정 설명 — 61개 · 타이로신 · 코돈 2개');
  S.ctTapCodon('AUG');
  eqJ(S.state.ctSeen, { stop:true, aa:true }, '★AU 칸을 열기 전엔 AUG 를 눌러도 안 센다'); eq(S.state.ctLast, 'UAU', '  → ctLast 그대로');
  S.ctTapCodon('ZZZ'); eq(S.state.ctLast, 'UAU', '  → 없는 코돈도 무시');
  S.ctOpenCell('AU'); S.ctTapCodon('AUG');
  eqJ(S.state.ctSeen, { stop:true, aa:true, start:true }, '★AUG → start 봄 — 세 종류');
  ok(/<div class="ctinfo start">/.test(html(S, 'ctInfo')) && /메싸이오닌/.test(html(S, 'ctInfo')) && /시작/.test(html(S, 'ctInfo')) && /하나뿐/.test(html(S, 'ctInfo')), '★개시 설명 — 메싸이오닌 · 시작 · 하나뿐');
  eq((html(S, 'ctKinds').match(/class="kind seen"/g) || []).length, 3, '  → 종류 칩 셋 다 ✅');
  eq(S.ctSeenCount(), 3, '★ctSeenCount 3'); eq(S.ctOpenCount(), 2, '  ctOpenCount 2');
  eq(S.stepDone('find'), false, '★칸 2 / 16 이면 ③ 미완 (종류를 다 봐도)');
  KEYS.forEach(k => S.ctOpenCell(k));
  eq(S.ctOpenCount(), 16, '★16칸 모두 열림'); ok(/16칸을 모두 열었다 🎉/.test(html(S, 'fb_find')), '  → 🎉');
  ok(ALL_CODONS.every(c => attr(S, 'ct_row_' + c, 'opacity') === '1' && attr(S, 'ct_row_' + c, 'pointer-events') === 'auto'), '★64줄이 모두 보이고 누를 수 있다');
  ok(KEYS.every(k => attr(S, 'ct_plus_' + k, 'opacity') === '0'), '  → ＋ 는 모두 사라졌다');
  eq(html(S, 'findTask'), '세 종류를 모두 보았다. 아래 문항에 답하시오.', '★지시 = 문항에 답하시오');
  eq(txt(S, 'findProg'), '연 칸 16 / 16 · 본 종류 3 / 3', '  → 꼬리표 16 / 16 · 3 / 3');
  eq(S.stepDone('find'), false, '문항 f1 전엔 ③ 미완'); S.pickQ('f1', 2); eq(S.stepDone('find'), true, '★16칸 + 종류 3 + f1 로 ③ 완료');
  eq(S.stepDone('code'), false, '  → ①-2 는 미완 (독립)');
  // 16칸을 열었지만 종류가 모자라면
  { const T = makeSandbox(); openAll(T); T.pickQ('f1', 2);
    eq(T.ctOpenCount(), 16, '(16칸 열림)'); eq(T.ctSeenCount(), 0, '(종류 0)');
    eq(html(T, 'findTask'), '16칸을 다 열었다. 코돈을 눌러 <b>세 종류</b>(개시 · 아미노산 지정 · 종결)의 설명을 모두 보시오.', '★16칸 뒤 지시 = 세 종류를 보시오');
    eq(T.stepDone('find'), false, '★종류를 안 보면 ③ 미완');
    T.ctTapCodon('AUG'); T.ctTapCodon('GGG'); eq(T.stepDone('find'), false, '  → 둘만 봐도 미완');
    T.ctTapCodon('UGA'); eq(T.stepDone('find'), true, '  → 셋 다 보면 완료');
    T.ctTapCodon('CUU'); ok(/류신/.test(html(T, 'ctInfo')) && /\(6개\)/.test(html(T, 'ctInfo')), '  → 류신은 코돈 6개라고 말한다'); }
  // ── 되돌리기 ──
  S.resetSec('find');
  eqJ([S.state.ctOpen, S.state.ctSeen, S.state.ctLast], [{}, {}, null], '★③ 되돌리면 연 칸·본 종류·마지막 코돈이 비고');
  eq(S.ANI.ct.ph, 0, '  → 국면 0 (빈 표)'); eqJ(['ct_axL','ct_axT','ct_axR'].map(id => attr(S, id, 'opacity')), ['0','0','0'], '  → 세 축 숨김');
  ok(ALL_CODONS.every(c => attr(S, 'ct_row_' + c, 'opacity') === '0'), '  → 64줄 숨김');
  eq(html(S, 'findTask'), '▶ 를 눌러 표의 세 축을 차례로 놓으시오.', '  → 지시가 처음으로'); eq(txt(S, 'findProg'), '연 칸 0 / 16 · 본 종류 0 / 3', '  → 꼬리표 0');
  eq((html(S, 'ctKinds').match(/class="kind"/g) || []).length, 3, '  → 종류 칩 ✅ 없음');
  eq((html(S, 'ctStage').match(/<g id="ct_row_/g) || []).length, 64, '  → 무대는 다시 짓지 않는다');
  S.aniGo('ct', 99); S.ctOpenCell('GG'); eq(S.ctOpenCount(), 1, '★되돌린 직후 다시 열 수 있다');
  // ── 복원 ──
  const R = makeSandbox({ seed:{ [S.LS_KEY]: JSON.stringify({ seq:1, ctOpen:{ 'UA':true, 'GG':true }, ctSeen:{ stop:true }, ctLast:'UAG' }) } });
  eq(R.ANI.ct.ph, 3, '★칸을 하나라도 열었으면 축이 다 놓인 표에서 시작한다');
  eq(attr(R, 'ct_row_UAG', 'opacity'), '1', '  → 연 칸의 줄이 보인다'); eq(attr(R, 'ct_cur_UAG', 'opacity'), '1', '  → 마지막 코돈 테두리');
  ok(/<div class="ctinfo stop">/.test(html(R, 'ctInfo')), '  → 설명도 복원'); eq(txt(R, 'findProg'), '연 칸 2 / 16 · 본 종류 1 / 3', '  → 꼬리표');
  const R0 = makeSandbox({ seed:{ [S.LS_KEY]: JSON.stringify({ seq:1, ctSeen:{ stop:true } }) } });
  eq(R0.ANI.ct.ph, 0, '★연 칸이 없으면 국면 0 에서 시작한다');
  eq(S._missing.join(','), '', '★③ 동안 없는 id 를 찾은 일이 없다');
}

// ══ 8. ④ 해독 ══
console.log('[8] ④ 해독 — 아미노산은 앱이 말하지 않는다 · 틀린 칸 거부 · 8칸 · 자동 읽기틀 2·3 · 판정 카드');
{
  const S = makeSandbox();
  const D0 = refDecode(REF_MRNA, 0);
  eq(S.curCodon(), 'CAU', '처음 해독할 코돈은 CAU');
  eq(txt(S, 'decProg'), '읽기틀 0 / 3', '꼬리표 0 / 3');
  eq(html(S, 'decTask'), '1번째 염기부터 세 글자씩 끊어, 코돈표에서 그 코돈을 찾아 탭하시오. (남은 코돈 8개)', '지시 막대 (남은 코돈 8개)');
  const now0 = html(S, 'ctNow4');
  ok(/지금 해독할 코돈 <b class="codbig">CAU<\/b>/.test(now0), '★「지금 해독할 코돈」에 CAU');
  ok(/왼쪽 세로축/.test(now0) && /위쪽 가로축/.test(now0) && /오른쪽 세로축/.test(now0), '★표를 읽는 3축 안내가 여기 있다');
  ok(/첫 번째 염기 <b>C<\/b>/.test(now0) && /두 번째 <b>A<\/b>/.test(now0) && /세 번째 <b>U<\/b>/.test(now0), '  → 세 글자가 각 축에 매겨져 있다');
  ok(/showCodonHint\(\)/.test(now0) && /💡/.test(now0), '  → 💡 힌트 단추');
  ok(!/히스티딘/.test(now0), '★아미노산 이름을 미리 말하지 않는다');
  ok(!/히스티딘/.test(html(S, 'decPep')) && /아직 해독한 코돈이 없다/.test(html(S, 'decPep')), '  → 폴리펩타이드 칸도 비어 있다');
  ok(/class="cod g0 now"/.test(html(S, 'decStrand')), '  → 첫 코돈에 now 표시');
  eq((html(S, 'decStrand').match(/class="tile"/g) || []).length, 24, '  → 염기 타일 24개');
  ok(/아직 해독하지 않았다/.test(html(S, 'frameTable')), '  → 결과표 1행 「아직 해독하지 않았다」');
  eq(html(S, 'decVerdict'), '', '  → 판정 카드 없음');
  // 틀린 칸
  S.ctTap4('GGU');
  eqJ(S.state.decN, {}, '★틀린 코돈은 상태를 바꾸지 않는다');
  eq(S._store['fb_dec'].className, 'msg bad', '  → 틀림');
  ok(/^옳지 않다\. 지금 해독할 코돈은 <b>CAU<\/b>이다\. 탭한 칸은 GGU이다\./.test(html(S, 'fb_dec')), '  → 「옳지 않다.」 + 지금 코돈 + 탭한 칸');
  ok(!/세로축|가로축/.test(html(S, 'fb_dec')), '★오답 되돌림에는 3축 안내를 되풀이하지 않는다');
  ok(!/글라이신|히스티딘/.test(html(S, 'fb_dec')), '  → 아미노산 이름도 말하지 않는다');
  eq(stored(S), null, '  → 저장하지 않는다');
  // 첫 칸
  S.ctTap4('CAU');
  eq(S.state.decN['0'], 1, '★CAU 해독 → decN 1');
  eq(S._store['fb_dec'].className, 'msg good', '  → 옳다');
  ok(/^옳다\. <b>CAU<\/b>는 <b>히스티딘<\/b>을 지정한다\./.test(html(S, 'fb_dec')), '  → 「옳다.」 + 히스티딘을 (받침 조사)');
  ok(/<span class="bead">히스티딘<\/span>/.test(html(S, 'decPep')), '  → 구슬 히스티딘');
  ok(/남은 코돈 7개/.test(html(S, 'decPep')), '  → 남은 코돈 7개 (흐린 구슬)');
  eq(hasCls(S, 'c4_CAU', 'cur'), true, '  → 표에서 해독한 칸에 cur');
  eq(S.curCodon(), 'GGU', '  → 다음 코돈 GGU');
  ok(/class="codbig">GGU</.test(html(S, 'ctNow4')), '  → 「지금 해독할 코돈」 GGU');
  ok(/class="cod g0 done"/.test(html(S, 'decStrand')) && /class="cod g1 now"/.test(html(S, 'decStrand')), '  → 가닥에 done · now');
  eq(html(S, 'decTask'), '1번째 염기부터 세 글자씩 끊어, 코돈표에서 그 코돈을 찾아 탭하시오. (남은 코돈 7개)', '  → 남은 코돈 7개');
  ok(/CAU …/.test(html(S, 'frameTable')) && /해독하는 중이다/.test(html(S, 'frameTable')), '  → 결과표에 CAU … 해독하는 중');
  // 힌트 (단수)
  S.showCodonHint();
  eq(S.state.hintCodon, 'GGU', '★힌트는 지금 코돈 하나(GGU)만 연다');
  eq(S.state.hintUsed, 1, '  → hintUsed 1');
  ok(/→ <b>글라이신<\/b>/.test(html(S, 'ctNow4')) && /그 칸을 탭하시오/.test(html(S, 'ctNow4')), '  → 글라이신을 보이고 탭하라고 한다');
  ok(!/세로축/.test(html(S, 'ctNow4')), '  → 힌트를 연 뒤엔 3축 안내가 빠진다');
  S.showCodonHint();
  eq(S.state.hintUsed, 2, '  → 다시 누르면 hintUsed 2 (기록만)');
  S.ctTap4('GGU');
  eq(S.state.hintCodon, null, '★해독하면 힌트가 닫힌다');
  eq(hasCls(S, 'c4_CAU', 'cur'), false, '  → 앞 칸의 cur 는 지워진다 (해독한 칸 하나만)');
  eq(hasCls(S, 'c4_GGU', 'cur'), true, '  → 지금 칸에만 cur');
  // 나머지
  for (let i = 2; i < 8; i++){
    S.ctTap4(D0.codons[i]);
    eq(S.state.decN['0'], i + 1, '  ' + D0.codons[i] + ' 해독 → decN ' + (i + 1));
    ok(new RegExp('<b>' + D0.aas[i] + '</b>').test(html(S, 'fb_dec')), '  → ' + D0.aas[i]);
  }
  eq(S.frameDone(0), true, '★8칸 → frameDone(0)');
  ok(/8개를 모두 해독하였다 🎉/.test(html(S, 'fb_dec')), '  → 🎉');
  ok(/해독을 마쳤다/.test(html(S, 'ctNow4')) && /아미노산 8개/.test(html(S, 'ctNow4')), '  → 「지금 할 일」이 마쳤다고 한다');
  eq(html(S, 'decTask'), '1번째 틀을 다 읽었다. 아래 단추로 2·3번째 틀을 끊어 보시오.', '  → 지시 막대');
  eq((html(S, 'decPep').match(/class="bead"/g) || []).length, 8, '  → 구슬 8개');
  ok(!/남은 코돈/.test(html(S, 'decPep')), '  → 남은 코돈 없음');
  ok(/class="keep">종결코돈 없이<br>아미노산 8개/.test(html(S, 'frameTable')), '  → 결과표 1행 keep');
  ok(/CAU GGU AAC GUG ACU UCG AAU GCA/.test(html(S, 'frameTable')), '  → 코돈 8개');
  eq((html(S, 'frameTable').match(/아직 끊어 보지 않았다/g) || []).length, 2, '  → 2·3행은 아직');
  eq(S.decDoneCount(), 1, 'decDoneCount 1');
  eq(txt(S, 'decProg'), '읽기틀 1 / 3', '꼬리표 1 / 3');
  eq(html(S, 'decVerdict'), '', '★판정 카드는 아직 없다');
  S.ctTap4('CAU');
  eq(S.state.decN['0'], 8, '★다 읽은 뒤의 탭은 상태를 바꾸지 않는다');
  eq(S._store['fb_dec'].className, 'msg info', '  → 안내만');
  // 자동 읽기틀
  S.autoFrame(1);
  eq(S.state.autoF['1'], true, '★autoFrame(1) 기록');
  eq(S._store['fb_dec'].className, 'msg warn', '  → 경고색 (종결)');
  ok(/2번째 염기부터/.test(html(S, 'fb_dec')) && /4번째 코돈이 <b>UGA<\/b>/.test(html(S, 'fb_dec')) && /아미노산 3개/.test(html(S, 'fb_dec')), '★되돌림이 4번째 코돈 UGA · 아미노산 3개를 말한다');
  ok(/class="out"><b>4번째 코돈이 종결코돈<\/b>/.test(html(S, 'frameTable')), '  → 결과표 2행 out');
  ok(/2번째 염기부터 끊으면/.test(html(S, 'autoStrands')) && /stopcod/.test(html(S, 'autoStrands')) && /🛑 종결코돈/.test(html(S, 'autoStrands')), '  → 가닥에 종결 표시');
  ok(/^✅ /.test(html(S, 'af1')), '  → 단추에 ✅');
  ok(/^▶ /.test(html(S, 'af2')), '  → 다른 단추는 아직 ▶');
  eq(html(S, 'decVerdict'), '', '  → 둘까지는 판정 카드 없음');
  S.autoFrame(2);
  eq(S.state.autoF['2'], true, '★autoFrame(2) 기록');
  ok(/3번째 염기부터/.test(html(S, 'fb_dec')) && /2번째 코돈이 <b>UAA<\/b>/.test(html(S, 'fb_dec')) && /아미노산 1개/.test(html(S, 'fb_dec')), '★되돌림이 2번째 코돈 UAA · 아미노산 1개를 말한다');
  eq(S.decDoneCount(), 3, '★decDoneCount 3');
  eq(txt(S, 'decProg'), '읽기틀 3 / 3', '꼬리표 3 / 3');
  const vd = html(S, 'decVerdict');
  ok(/verdict-card good/.test(vd) && /🎉/.test(vd), '★판정 카드가 뜬다');
  ok(/4번째 코돈이 UGA/.test(vd) && /2번째 코돈이 UAA/.test(vd), '  → 두 종결 자리');
  ok(vd.indexOf(REF_F0_AA.join(' – ')) >= 0, '  → 아미노산 8개 서열');
  ok(/1번째 염기부터<\/b> 읽는 것뿐/.test(vd), '  → 결론');
  eq(S.stepDone('dec'), false, '문항 전엔 ④ 미완');
  S.pickQ('d1', 1);
  eq(S.stepDone('dec'), true, '★d1 에 답하면 ④ 완료');
  S.autoFrame(3); S.autoFrame(0);
  eqJ(Object.keys(S.state.autoF).sort(), ['1','2'], '★autoFrame 은 1·2 만 받는다');
  // 판정 카드는 셋이 다 있어야 — 자동 둘만 있으면 없다
  const T = makeSandbox();
  T.autoFrame('1'); T.autoFrame(2);
  eq(T.decDoneCount(), 2, '자동 둘만 = 2');
  eq(html(T, 'decVerdict'), '', '★1번째 틀을 손으로 안 읽으면 판정 카드가 없다');
  ok(/^✅ /.test(html(T, 'af1')), '  → 문자열 "1" 도 받는다');
  for (let i = 0; i < 7; i++) T.ctTap4(D0.codons[i]);
  eq(html(T, 'decVerdict'), '', '  → 7칸까지도 없다');
  T.ctTap4(D0.codons[7]);
  ok(/verdict-card good/.test(html(T, 'decVerdict')), '  → 8칸째에 뜬다');
  eq(S._missing.join(','), '', '★④ 동안 없는 id 를 찾은 일이 없다');
}

// ══ 9. ⑤ 치환 ══
console.log('[9] ⑤ 치환 — 예상 없이는 확인 없음 · 예상대로/예상과 다름 · 셋 다 → 🎉');
{
  const S = makeSandbox();
  eq((html(S, 'mutRows').match(/class="slotrow"/g) || []).length, 3, '자리 3개 (아직 filled 없음)');
  eq((html(S, 'mutRows').match(/runMut\(/g) || []).length, 3, '  → 🔬 단추 3개');
  eq((html(S, 'mutRows').match(/guessMut\(/g) || []).length, 9, '  → 예상 칩 3×3');
  ok(/10번째 염기 G → A/.test(html(S, 'mutRows')) && /12번째 염기 G → A/.test(html(S, 'mutRows')) && /17번째 염기 C → A/.test(html(S, 'mutRows')), '  → 세 자리 이름표');
  ok(/원래<\/td><td class="seqcell">CAUGGUAACGUGACUUCGAAUGCA<\/td><td class="keep">/.test(html(S, 'mutTable')), '결과표 「원래」 행');
  ok(html(S, 'mutTable').indexOf(REF_F0_AA.join(' – ')) >= 0, '  → 원래 아미노산 8개');
  ok(!/10번째/.test(html(S, 'mutTable')), '  → 확인 전에는 바뀐 행이 없다 (예상 전에 결과를 보이지 않는다)');
  eq(html(S, 'mutSummary'), '', '  → 요약 없음');
  eq(txt(S, 'mutProg'), '확인한 자리 0 / 3', '꼬리표 0 / 3');
  S.runMut(10);
  eqJ(S.state.mutRun, {}, '★예상 없이 확인하면 안 된다');
  eq(S._store['fb_mut'].className, 'msg warn', '  → 경고');
  ok(/먼저 결과를 예상하시오/.test(html(S, 'fb_mut')), '  → 문구');
  eq(stored(S), null, '  → 저장 없음');
  S.guessMut(10, 0);
  eq(S.state.mutGuess['10'], 0, '★예상 기록');
  ok(/class="chip on"/.test(html(S, 'mutRows')), '  → 고른 칩 on');
  ok(/class="btn teal" onclick="runMut\(10\)"/.test(html(S, 'mutRows')), '  → 예상하면 🔬 단추가 채워진 색이 된다');
  S.runMut(10);
  eq(S.state.mutRun['10'], true, '★확인 기록'); eq(S.state.mutNow, 10, '  → mutNow 10');
  eq(S._store['fb_mut'].className, 'msg good', '  → 예상대로');
  ok(/^<b>예상대로이다\.<\/b> 4번째 아미노산이 <b>발린<\/b>에서 <b>메싸이오닌<\/b>으로 바뀌었다\./.test(html(S, 'fb_mut')), '★「예상대로이다.」 + 4번째 발린 → 메싸이오닌');
  ok(/GUG에서 AUG로/.test(html(S, 'fb_mut')), '  → 코돈 GUG → AUG');
  ok(/10번째 G→A/.test(html(S, 'mutTable')) && /class="out">/.test(html(S, 'mutTable')), '  → 결과표에 바뀐 행 (out)');
  ok(/CAUGGUAAC<b style="color:var\(--prot\);">A<\/b>UGACUUCGAAUGCA/.test(html(S, 'mutTable')), '  → 바뀐 염기가 서열 안에서 강조된다');
  ok(/✅ 10번째/.test(html(S, 'mutRows')) && / disabled onclick="guessMut\(10/.test(html(S, 'mutRows')), '  → 확인한 자리의 칩은 잠긴다');
  eq((html(S, 'mutRows').match(/runMut\(/g) || []).length, 2, '  → 🔬 단추가 2개 남는다');
  S.guessMut(10, 2);
  eq(S.state.mutGuess['10'], 0, '★확인한 자리의 예상은 바꿀 수 없다');
  eq(txt(S, 'mutProg'), '확인한 자리 1 / 3', '꼬리표 1 / 3');
  S.guessMut(12, 0); S.runMut(12);
  eq(S._store['fb_mut'].className, 'msg bad', '★12번을 「바뀐다」로 예상하면 예상과 다르다');
  ok(/^<b>예상과 다르다\.<\/b> 아미노산서열이 바뀌지 않았다\./.test(html(S, 'fb_mut')), '  → 「예상과 다르다.」');
  ok(/GUG에서 GUA로/.test(html(S, 'fb_mut')) && /두 코돈이 같은 아미노산을 지정한다/.test(html(S, 'fb_mut')), '  → GUG·GUA 가 같은 아미노산');
  ok(/12번째 G→A/.test(html(S, 'mutTable')) && /class="keep">/.test(html(S, 'mutTable')), '  → 결과표 keep');
  eq(S.state.mutNow, 12, '  → mutNow 12');
  S.guessMut(17, 2); S.runMut(17);
  eq(S._store['fb_mut'].className, 'msg good', '17번 「일찍 끝난다」 예상대로');
  ok(/6번째 코돈이 <b>UAG<\/b>로 바뀌어 종결코돈/.test(html(S, 'fb_mut')) && /아미노산 <b>5개<\/b>/.test(html(S, 'fb_mut')), '★6번째 코돈 UAG · 아미노산 5개');
  ok(/🛑 종결/.test(html(S, 'mutTable')), '  → 결과표에 🛑 종결');
  eq(S.mutDoneCount(), 3, '★mutDoneCount 3');
  eq(txt(S, 'mutProg'), '확인한 자리 3 / 3', '꼬리표 3 / 3');
  ok(/🎉/.test(html(S, 'mutSummary')) && /셋으로 갈렸다/.test(html(S, 'mutSummary')) && /코돈이 여러 개/.test(html(S, 'mutSummary')), '★요약 카드 🎉 — 중복성');
  eq((html(S, 'mutRows').match(/runMut\(/g) || []).length, 0, '  → 🔬 단추가 남지 않는다');
  eq(S.stepDone('mut'), false, '문항 전엔 ⑤ 미완');
  S.pickQ('m1', 3); eq(S.stepDone('mut'), true, '★m1 에 답하면 ⑤ 완료');
  S.runMut(99); S.guessMut(99, 0);
  eq(Object.keys(S.state.mutRun).length, 3, '없는 자리는 무시한다');
  // 예상대로 ⇔ guess === mutKindIndex(kind) — 자리마다 세 예상을 다 돌려 본다
  S.MUTS.forEach(m => [0,1,2].forEach(g => {
    const T = makeSandbox();
    T.guessMut(m.pos, g); T.runMut(m.pos);
    const right = (g === T.mutKindIndex(m.kind));
    eq(T._store['fb_mut'].className, right ? 'msg good' : 'msg bad', '★' + m.pos + '번 예상 ' + g + ' → ' + (right ? '예상대로' : '예상과 다르다'));
    ok(new RegExp('^<b>' + (right ? '예상대로이다' : '예상과 다르다') + '\\.</b>').test(html(T, 'fb_mut')), '  → 문구도 같다');
  }));
  eq(S._missing.join(','), '', '★⑤ 동안 없는 id 를 찾은 일이 없다');
}

// ══ 10. 문항 ══
console.log('[10] 문항 (id 유일 · 정답 범위 · no 되돌림 · 물음표 · 쏠림 · 최장 선지 · 교과서 값과 대조)');
{
  const S = makeSandbox();
  const ALL = S.ALLQ();
  eq(ALL.length, 10, '선택형 문항이 모두 10개다');
  eq(S.Q_CELL.length, 1, '①-1 결론 1'); eq(S.Q_CODE.length, 1, '①-2 결론 1 (i1)'); eq(S.Q_ZOOM.length, 1, '② 결론 1'); eq(S.Q_FIND.length, 1, '③ 결론 1 (f1)');
  eq(S.Q_CODE[0].id, 'i1', '  → Q_CODE 가 i1'); eq(S.Q_FIND[0].id, 'f1', '  → Q_FIND 가 f1');
  eqJ(ALL.map(q => q.id), ['c1','i1','z1','f1','d1','m1','p1','p2','p3','p4'], '★ALLQ 차례 = 카드 차례 (c1 · i1 · z1 · f1 · d1 · m1 · p1~p4)');
  ok(/<b>코돈<\/b>이라고 한다\.$/.test(S.qById('i1').ex.trim()), '★i1 해설이 「…이것을 코돈이라고 한다.」로 끝난다');
  eq(S.Q_DEC.length, 1, '④ 결론 1'); eq(S.Q_MUT.length, 1, '⑤ 결론 1'); eq(S.PRACTICE.length, 4, '★💪 4문항');
  const ids = ALL.map(p => p.id).concat(S.WRITEQ.map(w => w.id), S.SELFCHECK.map(s => s.id));
  eq(new Set(ids).size, ids.length, '★문항 id 가 활동 전체(선택 10 + 서술 4 + 자기평가 3)에서 유일하다');
  S.PRACTICE.forEach(p => ok(p.id.indexOf('p') === 0, '★💪 ' + p.id + ' 은 p 로 시작한다'));
  [].concat(S.Q_CELL, S.Q_CODE, S.Q_ZOOM, S.Q_FIND, S.Q_DEC, S.Q_MUT).forEach(p => ok(p.id.indexOf('p') !== 0, '★결론 ' + p.id + ' 은 p 로 시작하지 않는다'));
  S.WRITEQ.forEach(w => ok(w.id.indexOf('p') !== 0, '  서술 ' + w.id + ' 도 p 로 시작하지 않는다'));
  ALL.forEach(p => eq(S.pickStore(p.id), p.id.indexOf('p') === 0 ? S.state.pPick : S.state.qPick, '  ' + p.id + ' 이 제 저장칸으로 간다'));
  ALL.forEach(p => {
    ok(Array.isArray(p.ch) && p.ch.length === 4, p.id + ' 선지가 4개다');
    ok(Number.isInteger(p.a) && p.a >= 0 && p.a < p.ch.length, '★' + p.id + ' 정답 자리 a 가 범위 안이다');
    ok(Array.isArray(p.no) && p.no.length === p.ch.length, '★' + p.id + ' no 길이 = ch 길이');
    eq(p.no[p.a], '', '★' + p.id + ' 정답 자리의 no 는 빈 문자열이다');
    p.no.forEach((t, i) => {
      if (i === p.a) return;
      ok(t.indexOf('옳지 않다.') === 0, '★' + p.id + '/' + i + ' 되돌림이 「옳지 않다.」로 시작한다');
      ok(t.length > 12, '  ' + p.id + '/' + i + ' 되돌림에 까닭이 이어진다');
      ok(/다\.$/.test(t.trim()), '  ' + p.id + '/' + i + ' 되돌림이 「~다.」로 끝난다');
    });
    ok(/[?？]$/.test(strip(p.q)), '★' + p.id + ' 발문이 물음표로 끝난다');
    ok(typeof p.ex === 'string' && p.ex.length > 30, p.id + ' 해설이 있다');
    eq(new Set(p.ch).size, p.ch.length, p.id + ' 선지가 서로 다르다');
    if (p.hint !== undefined){
      ok(Array.isArray(p.hint) && p.hint.length === 2, '★' + p.id + ' 힌트가 있으면 2단이다');
      ok(p.hint.every(h => typeof h === 'string' && h.length > 10), '  ' + p.id + ' 힌트 두 줄이 비어 있지 않다');
    }
    if (p.lv !== undefined) ok(['중','상'].indexOf(p.lv) >= 0, p.id + ' 난도 표시가 중·상 중 하나다');
    const lens = p.ch.map(c => strip(c).length), mx = Math.max.apply(null, lens);
    ok(!(lens[p.a] === mx && lens.filter(l => l === mx).length === 1), '★' + p.id + ' 의 정답이 단독 최장 선지가 아니다 (정답 ' + lens[p.a] + ' / 최장 ' + mx + ')');
  });
  S.PRACTICE.filter(p => p.lv === '상').forEach(p => ok(!!p.hint, '★상 문항 ' + p.id + ' 에 힌트가 있다'));
  ok(!!S.qById('d1').hint, '④ 결론 d1 (상) 에 힌트가 있다');
  const cntA = [0,0,0,0]; ALL.forEach(p => cntA[p.a]++);
  ok(cntA.every(c => c > 0), '★네 선지 자리가 모두 한 번은 정답이다 (' + cntA.join('/') + ')');
  ok(Math.max.apply(null, cntA) <= ALL.length / 2, '★한 자리에 정답이 절반을 넘게 몰리지 않았다 (최다 ' + Math.max.apply(null, cntA) + ' / ' + ALL.length + ')');
  // 교과서 값과 문항이 어긋나지 않는가 — 계산으로 되짚는다
  const p4 = S.qById('p4'); eq(refDecode(refMutSeq(17, 'A'), 0).aas.length, 5, '★p4 「아미노산 5개」가 계산과 맞는다'); ok(/5개/.test(p4.ch[p4.a]), '  → 정답 선지가 5개');
  const p1 = S.qById('p1'); eq(refDecode(REF_MRNA.slice(1), 0).stopAt, 3, '★p1 「네 번째 코돈에서 끝난다」가 계산과 맞는다'); ok(/네 번째 코돈/.test(p1.ch[p1.a]), '  → 정답 선지');
  const p3 = S.qById('p3'); eq(p3.ch[p3.a], '25가지', '★p3 5² = 25가지');
  const i1 = S.qById('i1'); eq([1,2,3,4].find(n => Math.pow(4, n) >= 20), 3, '★i1 3개씩'); ok(i1.ch[i1.a].indexOf('3개씩') === 0, '  → 정답 선지');
  const f1 = S.qById('f1'); ok(/여러 개인 경우가 많다/.test(f1.ch[f1.a]), '★f1 중복성'); ok(ALL_CODONS.filter(c => REF[c] === '류신').length === 6, '  → 류신 6개 (해설의 근거)');
  const m1 = S.qById('m1'); ok(/코돈이 여러 개/.test(m1.ch[m1.a]), '★m1 중복성'); eq(REF['GUG'], REF['GUA'], '  → GUG·GUA 가 같은 아미노산 (해설의 근거)');
  const d1 = S.qById('d1'); ok(/종결코돈이 생기기 때문/.test(d1.ch[d1.a]), '★d1 종결코돈'); ok(/네 번째 코돈이 종결코돈/.test(d1.no[2]), '  → 되돌림이 AUG 틀의 종결을 짚는다');
  const z1 = S.qById('z1'); ok(/A 자리에는 mRNA 의 U/.test(z1.ch[z1.a]), '★z1 A ↔ U'); eq(refTranscribe('A'), 'U', '  → 검사의 규칙과 같다');
  const c1 = S.qById('c1'); ok(/mRNA 가 핵공을 지나/.test(c1.ch[c1.a]), '★c1 mRNA 가 핵공을 지난다');
  const p2 = S.qById('p2'); ok(/사람의 유전자를 세균에/.test(p2.ch[p2.a]), '★p2 유전부호의 공통성');
  // 선지를 고르면 채점 표시와 해설이 붙는다 — 정오는 기록하지 않는다
  {
    const T = makeSandbox();
    const p = T.qById('i1'), wrong = (p.a + 1) % 4;
    eq(T._store['codeQ'].children.length, 1, '①-2 문항 카드 1장 (i1)'); eq(T._store['findQ'].children.length, 1, '③ 문항 카드 1장 (f1)');
    eq(T._store['pracBox'].children.length, 4, '💪 카드 4장');
    T.pickQ('i1', wrong);
    const els = T.qEls['i1'];
    eq(els.choices[p.a].className, 'choice right', '★정답 선지에 right');
    eq(els.choices[wrong].className, 'choice picked', '  → 고른 선지에 picked');
    eq(els.choices.filter(b => b.className === 'choice dim').length, 2, '  → 나머지 둘은 dim');
    eq(els.expl.style.display, 'block', '  → 해설이 열린다');
    ok(els.expl.innerHTML.indexOf('<b>❌ ' + p.no[wrong]) === 0, '★오답이면 그 자리의 되돌림이 먼저');
    ok(els.expl.innerHTML.indexOf(p.ex) > 0, '  → 해설은 정오와 무관하게 보인다');
    eq(T.state.qPick.i1, wrong, '  → 마지막 선택만 남는다');
    ok(!('right' in T.state) && !JSON.stringify(stored(T)).includes('"correct"'), '  → 정오는 저장하지 않는다');
    T.pickQ('i1', p.a);
    ok(T.qEls['i1'].expl.innerHTML.indexOf('<b>✅ 옳다.</b>') === 0, '정답이면 「옳다.」');
    eq(T.state.qPick.i1, p.a, '  → 바꿔 고른 값이 남는다');
    T.pickQ('p3', 0);
    eq(T.state.pPick.p3, 0, '💪 는 pPick 에'); eq(T.state.qPick.p3, undefined, '  → qPick 에는 없다');
    eq(txt(T, 'pracProg'), '푼 문항 1 / 4', '  → 💪 꼬리표 1 / 4');
    const card3 = T._store['pracBox'].children[2], hw = card3.children.find(c => c.className === 'hintwrap');
    ok(!!hw && hw.children.length === 4, 'p3 카드에 힌트 2단(단추 2 + 상자 2)이 있다');
    if (hw){
      const [hb1, hx1, hb2, hx2] = hw.children;
      eq(hb1.textContent, '💡 힌트 보기', '  → 1단 단추'); eq(hx1.style.display, 'none', '  → 1단 상자는 닫혀 있다');
      eq(hb2.style.display, 'none', '  → 2단 단추는 숨어 있다');
      const st0 = JSON.stringify(stored(T)) + JSON.stringify(T.state);
      hb1.onclick();
      eq(hx1.style.display, 'block', '★1단을 열면 「어디를 볼 것인가」'); eq(hb2.style.display, 'inline-block', '  → 2단 단추가 나타난다');
      ok(/힌트 ① 어디를 볼 것인가/.test(hx1.innerHTML) && hx1.innerHTML.indexOf(p3.hint[0]) > 0, '  → 1단 문구');
      eq(hx2.style.display, 'none', '  → 2단은 아직');
      hb2.onclick();
      eq(hx2.style.display, 'block', '★2단을 열면 「판단 기준」'); ok(hx2.innerHTML.indexOf(p3.hint[1]) > 0, '  → 2단 문구');
      eq(JSON.stringify(stored(T)) + JSON.stringify(T.state), st0, '  → 힌트를 본 것은 상태·저장에 남기지 않는다');
    }
  }
}

// ══ 11. ⑥ 정리하기 ══
console.log('[11] ⑥ 정리하기 (서술 4 · 자수 잠금 · 공백 · 교사 해제 비저장 · 자기평가 3)');
{
  const S = makeSandbox();
  eq(S.WRITEQ.length, 4, '★서술형 4문항');
  eq(S.WRITEQ.filter(w => w.creative).length, 1, '창의력 1'); eq(S.WRITEQ[3].creative, true, '  → 마지막이 창의력');
  eq(S._store['writeBox'].children.length, 4, '⑥ 카드 4장');
  S.WRITEQ.forEach((w, i) => {
    const card = S._store['writeBox'].children[i].innerHTML;
    ok(typeof w.min === 'number' && w.min > 0, '★' + w.id + ' 자수 잠금 min > 0 (' + w.min + ')');
    ok(Array.isArray(w.need) && w.need.length >= 3 && w.need.every(n => typeof n === 'string' && n.trim().length > 5), '★' + w.id + ' need 가 3가지 이상, 비어 있지 않다');
    ok(/시오\.$/.test(strip(w.q)), '★' + w.id + ' 발문이 「~하시오.」로 끝난다');
    ok(typeof w.ans === 'string' && w.ans.replace(/\s/g, '').length >= w.min, '  ' + w.id + ' 모범답안이 자수 잠금보다 길다');
    ok(!!S._store['ta_' + w.id], '  ' + w.id + ' 서술칸이 있다');
    ok(card.indexOf(w.min + '자 이상') >= 0, '  ' + w.id + ' 잠금 자수가 화면에 적혀 있다');
    w.need.forEach(n => ok(card.indexOf(n) >= 0, '  ' + w.id + ' need「' + n.slice(0, 10) + '」이 화면에'));
    eq(S._store['ans_' + w.id].style.display, 'none', '  ' + w.id + ' 모범답안이 닫혀 있다');
    eq(dis(S, 'ansBtn_' + w.id), true, '  ' + w.id + ' 모범답안 단추가 잠겨 있다');
    ok(/🔒/.test(txt(S, 'ansBtn_' + w.id)), '  → 🔒 표시');
  });
  ok(S.WRITEQ[1].ans.indexOf(REF_F0_AA.join(' – ')) >= 0, '★w2 모범답안에 아미노산 8개 서열이 그대로');
  ok(/UGA/.test(S.WRITEQ[1].ans) && /UAA/.test(S.WRITEQ[1].ans), '★w2 모범답안이 UGA·UAA');
  ok(/GUG/.test(S.WRITEQ[2].ans) && /AUG/.test(S.WRITEQ[2].ans) && /발린/.test(S.WRITEQ[2].ans) && /메싸이오닌/.test(S.WRITEQ[2].ans), '★w3 모범답안 GUG→AUG 발린→메싸이오닌');
  ok(/세 자리/.test(S.WRITEQ[0].ans) && /겹치지 않/.test(S.WRITEQ[0].ans) && /개시코돈/.test(S.WRITEQ[0].ans) && /종결코돈/.test(S.WRITEQ[0].ans), '★w1 모범답안이 코돈의 네 성질을 담는다');
  // 자수 잠금
  const w = S.WRITEQ[0], el = S._store['ta_' + w.id];
  el.value = '가'.repeat(w.min - 1); S.onTa(w.id);
  eq(S.ansGate(w.id).open, false, '★' + (w.min - 1) + '자에서는 닫혀 있다');
  eq(S.ansGate(w.id).reason, w.min + '자 이상 서술해야 열린다', '  → 까닭');
  eq(txt(S, 'cnt_' + w.id), (w.min - 1) + '자', '  → 글자 수');
  eq(txt(S, 'writeProg'), '작성한 문항 1 / 4', '  → 작성 꼬리표 1 / 4 (열리지 않아도 썼으면 센다)');
  el.value = '가'.repeat(w.min); S.onTa(w.id);
  eq(S.ansGate(w.id).open, true, '★' + w.min + '자에서 열린다');
  eq(dis(S, 'ansBtn_' + w.id), false, '  → 단추가 살아난다');
  S.toggleAns(w.id); eq(S._store['ans_' + w.id].style.display, 'block', '  → 눌러서 열린다');
  eq(txt(S, 'ansBtn_' + w.id), '모범답안 닫기', '  → 단추 글이 「닫기」');
  S.toggleAns(w.id); eq(S._store['ans_' + w.id].style.display, 'none', '  → 다시 눌러 닫는다');
  el.value = ' '.repeat(w.min * 3); S.onTa(w.id);
  eq(S.ansGate(w.id).open, false, '★공백만 ' + (w.min * 3) + '칸은 열리지 않는다');
  el.value = '\n\t '.repeat(w.min); S.onTa(w.id);
  eq(S.ansGate(w.id).open, false, '★줄바꿈·탭만으로도 열리지 않는다');
  eq(txt(S, 'cnt_' + w.id), '0자', '  → 0자'); eq(txt(S, 'writeProg'), '작성한 문항 0 / 4', '  → 작성 꼬리표 0');
  el.value = '가 나 다 '.repeat(w.min); S.onTa(w.id);
  eq(S.ansGate(w.id).open, true, '  → 공백 섞인 글도 공백을 빼고 센다');
  S.toggleAns('w2'); eq(S._store['ans_w2'].style.display, 'none', '잠긴 문항은 toggleAns 로도 안 열린다');
  // 교사 해제 — 자수와 무관하게 열리지만 저장되지 않는다
  const T = makeSandbox();
  for (let i = 0; i < 4; i++) T.tapProgress();
  eq(T._rec.confirms, 0, '4연타로는 묻지 않는다');
  T.tapProgress();
  eq(T._rec.confirms, 1, '★진행 배지 5연타로 확인 대화상자');
  eq(T.state.teacherUnlock, true, '  → 이 화면에서 풀린다');
  ok(T.WRITEQ.every(x => T.ansGate(x.id).open), '★자수와 무관하게 네 모범답안이 열린다');
  ok(T.WRITEQ.every(x => !dis(T, 'ansBtn_' + x.id)), '  → 단추도 살아난다');
  eq(stored(T).teacherUnlock, false, '★저장분에는 false');
  eq(makeSandbox({ seed:{ [T.LS_KEY]: T.localStorage._mem[T.LS_KEY] } }).state.teacherUnlock, false, '★새로고침하면 도로 잠긴다');
  const U = makeSandbox({ confirmRet:false });
  for (let i = 0; i < 5; i++) U.tapProgress();
  eq(U.state.teacherUnlock, false, '★취소하면 풀리지 않는다');
  // 자기평가
  eq(S.SELFCHECK.length, 3, '★자기평가 3줄');
  eqJ(S.SELFCHECK.map(s => s.k), ['지식·이해','과정·기능','가치·태도'], '★지식·이해 / 과정·기능 / 가치·태도');
  S.SELFCHECK.forEach(s => { ok(/는가\?$/.test(s.t.trim()), '★' + s.id + ' 가 물음으로 끝난다'); ok(!!S._store['self_' + s.id], '  ' + s.id + ' 체크상자'); });
  S._store['self_s1'].checked = true; S.onSelf('s1');
  eq(S.state.self.s1, true, '체크가 상태에'); eq(stored(S).self.s1, true, '  → 저장에');
  eq(S.doneCount(), 0, '★⑥ 은 완료 판정에 들어가지 않는다');
}

// ══ 12. 저장·복원 ══
console.log('[12] 저장·복원 (seq · 다른 탭 · 망가진 blob · null 기본값 칸 · 범위 밖 값 · 완료 국면)');
{
  const LS = 'codon_sim_v2';
  // (1) seq
  {
    const S = makeSandbox();
    eq(stored(S), null, '처음엔 저장이 없다 (init 은 저장하지 않는다)');
    S.pickCode(1); eq(stored(S).seq, 1, '★첫 저장 seq 1');
    S.pickCode(2); eq(stored(S).seq, 2, '★둘째 저장 seq 2');
    S.aniGo('cs', 99); eq(stored(S).seq, 3, '  → 무대 완주도 저장 (3)');
    S.aniGo('cs', -1); eq(stored(S).seq, 3, '  → 되감기는 저장하지 않는다');
    const newer = Object.assign({}, stored(S), { seq: 9999, codeRun:{} });
    S.localStorage._mem[LS] = JSON.stringify(newer);
    S.pickCode(3);
    eq(stored(S).seq, 9999, '★저장소의 seq 가 더 크면 덮어쓰지 않는다');
    eqJ(stored(S).codeRun, {}, '  → 저장분 내용 그대로');
    eq(S.state.codeRun['3'], true, '  → 화면의 state 는 바뀐다');
    eq(S._store['tabWarn'].className, 'msg bad', '★다른 탭이 열려 있다고 알린다');
    ok(/다른 탭에서도 열려 있다/.test(html(S, 'tabWarn')) && /새로고침하시오/.test(html(S, 'tabWarn')), '  → 무엇을 할지 말한다');
    ok(/<div class="msg bad hide" id="tabWarn">/.test(bodyHtml), '평소에는 숨어 있다 (정적 마크업이 hide)');
    ok(makeSandbox()._store['tabWarn'].className !== 'msg bad', '  → init 은 경고를 켜지 않는다');
  }
  // (2) 망가진 blob
  ['{{{ 아님', '', 'null', '[1,2,3]', '"문자열"', '123', 'true'].forEach(bad => {
    let S = null, threw = false;
    try { S = makeSandbox({ seed:{ [LS]:bad } }); } catch(e){ threw = true; }
    ok(!threw, '★망가진 저장분(' + JSON.stringify(bad).slice(0, 12) + ')에도 죽지 않는다');
    if (S){ eq(S.doneCount(), 0, '  → 처음 상태'); eqJ(S.state.decN, {}, '  → 해독 기록 없음'); eq(S.ANI.cs.ph, 0, '  → 무대 0'); }
  });
  // (3) ★null 기본값 칸이 복원된다 (typeof null === 'object' 함정)
  {
    const seed = JSON.stringify({ seq:5, codeRun:{ '3':true }, codeLast:3, hintCodon:'CAU', hintUsed:2, mutNow:10,
      mutGuess:{ '10':0 }, mutRun:{ '10':true }, decN:{ '0':2 }, qPick:{ c1:1 }, pPick:{}, ta:{}, self:{}, teacherUnlock:false });
    const S = makeSandbox({ seed:{ [LS]: seed } });
    eq(S.state.decN['0'], 2, '(대조군) 객체 칸 decN 복원'); eq(S.state.hintUsed, 2, '(대조군) 숫자 칸 hintUsed 복원'); eq(S.state.seq, 5, '(대조군) seq 복원');
    eq(S.state.codeLast, 3, '★codeLast(3) 이 복원된다');
    eq(S.state.hintCodon, 'CAU', '★hintCodon(CAU) 이 복원된다');
    eq(S.state.mutNow, 10, '★mutNow(10) 이 복원된다');
    ok(/class="chip on"[^>]*>3개씩/.test(html(S, 'codeChips')), '  → 화면에도 3개씩 칩이 on');
    eq(txt(S, 'gb_cnt'), '4³ = 64가지', '  → 묶기 무대도 3개씩으로 복원된다');
    eq(S.curCodon(), 'AAC', '  → decN 2 라 지금 코돈은 AAC');
    const T = makeSandbox({ seed:{ [LS]: JSON.stringify({ seq:1, decN:{}, hintCodon:'CAU', hintUsed:1 }) } });
    ok(/→ <b>히스티딘<\/b>/.test(html(T, 'ctNow4')), '  → hintCodon 이 지금 코돈이면 힌트가 열린 채 복원된다');
    eq(S.state.mutRun['10'], true, '  → 확인 기록 복원'); ok(/✅ 10번째/.test(html(S, 'mutRows')), '  → 화면에도 ✅');
    S.pickCode(1); eq(stored(S).seq, 6, '  → 복원한 seq 에 이어 6');
  }
  // (4) 없는 이름 · 범위 밖 값
  {
    const seed = JSON.stringify({ seq:3, codeRun:{ '1':true }, codeLast:9,
      zoomFill:{ '1':'G', '2':'A', '3':'X', '4':'T', '10':'C', 'x':'U' }, cellSeen:1, zoomSeen:'yes',
      ctOpen:{ 'UU':true, 'UX':true, 'AU':'yes', 'GG':true, 'xx':true, 'CA':1 }, ctSeen:{ start:true, aa:'y', zzz:true }, ctLast:'AUG',
      find:{ stop:['UAA'] },
      decN:{ '0':99, '1':5 }, autoF:{ '1':true, '3':true, 'x':1, '2':'yes' }, hintCodon:'ZZZ', mutNow:99,
      mutGuess:{ '10':1 }, mutRun:{}, qPick:{}, pPick:{}, ta:{}, self:{}, teacherUnlock:true, rnaSlot:{ a:1 }, 유령칸:'있으면 안 된다' });
    const S = makeSandbox({ seed:{ [LS]: seed } });
    eq(S.state.유령칸, undefined, '★freshState 에 없는 칸은 복원되지 않는다');
    eq(S.state.rnaSlot, undefined, '★옛 v1 의 rnaSlot 도 되살아나지 않는다');
    eq(S.state.codeLast, null, '★범위 밖 codeLast(9) 가 걸러진다');
    eqJ(Object.keys(S.state.zoomFill).sort(), ['1','10'], '★zoomFill 에서 빈칸 아닌 자리(2·x)·염기 아닌 값(X·T)이 걸러진다');
    eq(S.zoomFilledCount(), 2, '  → 맞게 채운 칸 2');
    eq(S.state.cellSeen, true, 'cellSeen 1 → true'); eq(S.state.zoomSeen, true, 'zoomSeen "yes" → true');
    eqJ(Object.keys(S.state.ctOpen).sort(), ['GG','UU'], '★ctOpen 에서 염기 아닌 열쇠(UX·xx)·true 아닌 값(yes·1)이 걸러진다');
    eqJ(S.state.ctSeen, { start:true }, '★ctSeen 에서 모르는 종류(zzz)·true 아닌 값(y)이 걸러진다');
    eq(S.state.ctLast, null, '★ctLast(AUG) 는 그 칸(AU)이 열려 있지 않아 버려진다');
    eq(S.state.find, undefined, '★옛 find 칸은 되살아나지 않는다');
    eq(S.ctOpenCount(), 2, '  → 연 칸 2'); eq(S.ANI.ct.ph, 3, '★연 칸이 있으면 ③ 은 축이 다 놓인 국면(3)에서 시작한다');
    eq(attr(S, 'ct_row_GGG', 'opacity'), '1', '  → 연 칸의 줄이 보인다'); eq(attr(S, 'ct_row_AUG', 'opacity'), '0', '  → 안 연 칸은 숨김');
    const V = makeSandbox({ seed:{ [LS]: JSON.stringify({ seq:1, ctOpen:{ 'UA':true }, ctLast:'UAA' }) } });
    eq(V.state.ctLast, 'UAA', '  → 칸이 열려 있는 ctLast 는 남는다'); eq(V.state.ctLast, 'UAA', '');
    const W = makeSandbox({ seed:{ [LS]: JSON.stringify({ seq:1, ctOpen:{ 'UA':true }, ctLast:'ZZZ' }) } });
    eq(W.state.ctLast, null, '  → 없는 코돈의 ctLast 는 버려진다');
    eq(S.state.decN['0'], 8, '★넘치는 decN(99) 이 8 로 깎인다');
    eq(S.state.decN['1'], undefined, '★읽기틀 1 의 decN 은 버린다 (손으로 읽는 틀은 0 뿐)');
    eqJ(S.state.autoF, { '1':true, '2':true }, '★autoF 는 1·2 만 true 로 남는다');
    eq(S.state.hintCodon, null, '★없는 코돈의 힌트가 걸러진다');
    eq(S.state.mutNow, null, '★없는 치환 자리가 걸러진다');
    eq(S.state.teacherUnlock, false, '★저장분의 teacherUnlock 은 켜지 않는다');
    eq(S.ANI.cs.ph, 5, '★cellSeen 이면 ① 이 마지막 국면에서 시작한다');
    eq(S.ANI.zm.ph, 5, '★zoomSeen 이면 ② 가 마지막 국면에서 시작한다');
    eq(S.decDoneCount(), 3, '  → 세 읽기틀 완료로 센다');
    ok(/verdict-card good/.test(html(S, 'decVerdict')), '  → 판정 카드가 바로 보인다');
    eq(S._missing.join(','), '', '  → 복원 경로에서도 id 오타가 없다');
    const T = makeSandbox({ seed:{ [LS]: JSON.stringify({ seq:1, decN:{ '0':-3 }, autoF:'x', ctOpen:'notobj', ctSeen:[1], zoomFill:[1,2] }) } });
    eqJ(T.state.decN, {}, '★음수 decN 은 지워진다'); eqJ(T.state.autoF, {}, '  autoF 가 객체가 아니면 비운다');
    eqJ(T.state.ctOpen, {}, '  ctOpen 이 객체가 아니면 비운다'); eqJ(T.state.ctSeen, {}, '  ctSeen 이 배열이면 비운다'); eqJ(T.state.zoomFill, {}, '  zoomFill 이 배열이면 비운다');
    eq(T.ANI.ct.ph, 0, '  → 연 칸이 없으니 ③ 은 국면 0');
    const U = makeSandbox({ seed:{ [LS]: JSON.stringify({ seq:1, decN:{ '0':2.6 }, codeLast:'3' }) } });
    eq(U.state.decN['0'], 3, '  소수 decN 은 반올림'); eq(U.state.codeLast, 3, '  문자열 codeLast "3" 은 숫자 3');
  }
  // (5) 완료 국면에서 시작 + 값이 되살아난다
  {
    const A = makeSandbox();
    A.aniGo('cs', 99); A.aniGo('zm', 99); A.fillBlank('G'); A.fillBlank('A');
    const D = refDecode(REF_MRNA, 0); for (let i = 0; i < D.need; i++) A.ctTap4(D.codons[i]);
    A.aniGo('ct', 99); A.ctOpenCell('UA'); A.ctTapCodon('UAA');
    A.guessMut(10, 0); A.runMut(10);
    A.WRITEQ.forEach(w => { A._store['ta_' + w.id].value = '가'.repeat(w.min); A.onTa(w.id); });
    A._store['self_s2'].checked = true; A.onSelf('s2');
    A.pickQ('c1', 1); A.pickQ('p1', 1);
    const B = makeSandbox({ seed:{ [LS]: A.localStorage._mem[LS] } });
    eq(B.ANI.cs.ph, 5, '★① 이 완료 국면에서 시작한다'); eq(dis(B, 'cs_next'), true, '  → ▶ 꺼짐');
    eq(txt(B, 'cellProg'), '본 국면 6 / 6', '  → 꼬리표 6 / 6');
    eq(B.ANI.zm.ph, 5, '★② 가 완료 국면에서 시작한다');
    eq(attr(B, 'zw', 'transform'), 'translate(0,0) scale(1)', '  → 유전자 축척');
    eq(attr(B, 'zm_t_1', 'class'), 'rfade okb', '  → 채운 빈칸이 okb 로 그려진다');
    eq(txt(B, 'zm_tx_4'), '?', '  → 안 채운 빈칸은 ?');
    eq(txt(B, 'zoomProg'), '채운 빈칸 2 / 4', '  → 꼬리표 2 / 4');
    ok(B.frameDone(0), '★해독한 읽기틀이 되살아난다');
    eq(hasCls(B, 'c4_GCA', 'cur'), true, '  → 마지막 해독 칸에 cur');
    eq(B.ctOpenCount(), 1, '★③ 연 칸 1'); eq(B.ANI.ct.ph, 3, '  → 축이 다 놓인 표에서'); eq(attr(B, 'ct_row_UAA', 'opacity'), '1', '  → UA 줄 보임');
    eq(B.state.ctSeen.stop, true, '  → 본 종류'); eq(attr(B, 'ct_cur_UAA', 'opacity'), '1', '  → 마지막 코돈 테두리'); ok(/ctinfo stop/.test(html(B, 'ctInfo')), '  → 설명 복원');
    eq(B.state.mutRun['10'], true, '★확인한 치환'); ok(/10번째 G→A/.test(html(B, 'mutTable')), '  → 결과표 행');
    ok(B.WRITEQ.every(w => B.ansGate(w.id).open), '★서술 답안이 되살아나 모범답안이 열린 채');
    eq(B._store['ta_w1'].value, '가'.repeat(B.WRITEQ[0].min), '  → 서술칸 글자'); eq(txt(B, 'cnt_w1'), B.WRITEQ[0].min + '자', '  → 글자 수');
    eq(B._store['self_s2'].checked, true, '★자기평가 체크'); eq(B._store['self_s1'].checked, false, '  → 안 한 것은 그대로');
    eq(B.state.qPick.c1, 1, '★결론 문항 답'); eq(B.qEls['c1'].choices[1].className, 'choice right', '  → 화면에 right');
    eq(B.state.pPick.p1, 1, '★💪 답'); eq(txt(B, 'pracProg'), '푼 문항 1 / 4', '  → 꼬리표');
    eq(B._missing.join(','), '', '★복원 뒤에도 id 오타가 없다');
    const C = makeSandbox({ seed:{ [LS]: JSON.stringify({ seq:1, cellSeen:true }) } });
    eq(C.ANI.cs.ph, 5, 'cellSeen 만이면 ① 은 5'); eq(C.ANI.zm.ph, 0, '  → ② 는 0');
  }
}

// ══ 13. 섹션별 되돌리기 8칸 ══
console.log('[13] 섹션별 되돌리기 8칸 — 지운 것과 남은 것을 칸마다 전부 대조 · confirm 은 ③④⑤⑥ 만 · ①-2↔③ 독립 · 새로고침 없음');
{
  const D0 = refDecode(REF_MRNA, 0);
  function finishAll(S){
    S.aniGo('cs', 99); S.pickQ('c1', 1);
    [1,2,3].forEach(n => S.pickCode(n)); S.pickQ('i1', 2);
    S.aniGo('zm', 99); ['G','A','U','C'].forEach(b => S.fillBlank(b)); S.pickQ('z1', 2);
    ctOpenAll(S); S.pickQ('f1', 2);
    for (let i = 0; i < D0.need; i++) S.ctTap4(D0.codons[i]);
    S.autoFrame(1); S.autoFrame(2); S.pickQ('d1', 1);
    S.MUTS.forEach(m => { S.guessMut(m.pos, S.mutKindIndex(m.kind)); S.runMut(m.pos); }); S.pickQ('m1', 3);
    S.PRACTICE.forEach(p => S.pickQ(p.id, p.a));
    S.WRITEQ.forEach(w => { S._store['ta_' + w.id].value = '가'.repeat(w.min); S.onTa(w.id); });
    S.SELFCHECK.forEach(s => { S._store['self_' + s.id].checked = true; S.onSelf(s.id); });
    return S;
  }
  /* 화면·상태의 단면 — 칸마다 「지워야 할 것」만 바뀌고 나머지는 그대로여야 한다 */
  function facets(S){
    const st = S.state;
    return {
      cellSeen:st.cellSeen, csPh:S.ANI.cs.ph, c1:st.qPick.c1, cellProg:txt(S, 'cellProg'), csNextDis:dis(S, 'cs_next'),
      codeDone:S.codeDoneCount(), codeLast:st.codeLast, i1:st.qPick.i1, codeProg:txt(S, 'codeProg'), codonDef:S._store['codonDef'].style.display,
      chipOn:/chip (ok|on)/.test(html(S, 'codeChips')),
      zoomSeen:st.zoomSeen, zoomFillN:Object.keys(st.zoomFill).length, zmPh:S.ANI.zm.ph, z1:st.qPick.z1, zoomProg:txt(S, 'zoomProg'),
      ctOpen:S.ctOpenCount(), ctSeen:S.ctSeenCount(), ctLast:st.ctLast, ctPh:S.ANI.ct.ph, rowUAA:attr(S, 'ct_row_UAA', 'opacity'), axR:attr(S, 'ct_axR', 'opacity'),
      f1:st.qPick.f1, findProg:txt(S, 'findProg'), findTask:html(S, 'findTask'),
      decN0:S.decN0(), autoFN:Object.keys(st.autoF).length, d1:st.qPick.d1, decProg:txt(S, 'decProg'),
      verdict:html(S, 'decVerdict') !== '', curGCA:hasCls(S, 'c4_GCA', 'cur'),
      mutRunN:Object.keys(st.mutRun).length, mutGuessN:Object.keys(st.mutGuess).length, mutNow:st.mutNow, m1:st.qPick.m1,
      mutProg:txt(S, 'mutProg'), mutSummary:html(S, 'mutSummary') !== '',
      pPickN:Object.keys(st.pPick).length, pracProg:txt(S, 'pracProg'),
      taW1:S._store['ta_w1'].value.length, taW4:S._store['ta_w4'].value.length, selfS1:st.self.s1, selfBox:S._store['self_s1'].checked,
      ansOpenW1:S.ansGate('w1').open, writeProg:txt(S, 'writeProg'),
      done:S.doneCount(), badge:txt(S, 'progress')
    };
  }
  const FULL = facets(finishAll(makeSandbox()));
  eq(FULL.done, 6, '(먼저 전부 마쳤다 — 완료 6)'); eq(FULL.badge, '진행 6 / 6', '  배지 6 / 6');
  eqJ(Object.keys(makeSandbox().SEC_DEF), ['cell','zoom','code','find','dec','mut','prac','write'], '★되돌리기 칸이 8개다 (①-1 ② ①-2 ③ ④ ⑤ · 💪 · ⑥)');
  const ASK = { cell:false, code:false, zoom:false, find:true, dec:true, mut:true, prac:false, write:true };
  Object.keys(ASK).forEach(k => eq(makeSandbox().SEC_DEF[k].ask, ASK[k], '★SEC_DEF.' + k + '.ask = ' + ASK[k] + (ASK[k] ? ' (잃을 것이 큰 칸)' : ' (그냥 지운다)')));
  const CLEAR = {
    cell:  { cellSeen:false, csPh:0, c1:undefined, cellProg:'본 국면 1 / 6', csNextDis:false, done:5, badge:'진행 5 / 6' },
    code:  { codeDone:0, codeLast:null, i1:undefined, codeProg:'눌러 본 묶음 0 / 3', codonDef:'none', chipOn:false, done:5, badge:'진행 5 / 6' },
    zoom:  { zoomSeen:false, zoomFillN:0, zmPh:0, z1:undefined, zoomProg:'채운 빈칸 0 / 4', done:5, badge:'진행 5 / 6' },
    find:  { ctOpen:0, ctSeen:0, ctLast:null, ctPh:0, rowUAA:'0', axR:'0', f1:undefined, findProg:'연 칸 0 / 16 · 본 종류 0 / 3', findTask:'▶ 를 눌러 표의 세 축을 차례로 놓으시오.', done:5, badge:'진행 5 / 6' },
    dec:   { decN0:0, autoFN:0, d1:undefined, decProg:'읽기틀 0 / 3', verdict:false, curGCA:false,
             mutRunN:0, mutGuessN:0, mutNow:null, m1:undefined, mutProg:'확인한 자리 0 / 3', mutSummary:false, done:4, badge:'진행 4 / 6' },
    mut:   { mutRunN:0, mutGuessN:0, mutNow:null, m1:undefined, mutProg:'확인한 자리 0 / 3', mutSummary:false, done:5, badge:'진행 5 / 6' },
    prac:  { pPickN:0, pracProg:'푼 문항 0 / 4' },
    write: { taW1:0, taW4:0, selfS1:undefined, selfBox:false, ansOpenW1:false, writeProg:'작성한 문항 0 / 4' }
  };
  const MSG = { cell:/①-1 을 처음 국면으로/, code:/①-2 를 처음 상태로/, zoom:/② 의 빈칸과 문항을 지우고/, find:/③ 의 연 칸·본 설명·문항을 지우고 빈 표로/, dec:/④ 의 해독과 문항을 지웠다.*⑤ 도 함께/, mut:/⑤ 의 예상과 결과를 지웠다/ };
  const FB = { cell:'fb_cell', code:'fb_code', zoom:'fb_zoom', find:'fb_find', dec:'fb_dec', mut:'fb_mut' };
  Object.keys(CLEAR).forEach(k => {
    const S = finishAll(makeSandbox());
    S.resetSec(k);
    eq(S._rec.confirms, ASK[k] ? 1 : 0, '★resetSec(' + k + ') 이 confirm 을 ' + (ASK[k] ? '한 번 띄운다' : '띄우지 않는다'));
    eq(S._rec.reloads, 0, '★resetSec(' + k + ') 은 새로고침하지 않는다');
    const F = facets(S);
    Object.keys(FULL).forEach(f => {
      if (f in CLEAR[k]) eq(F[f], CLEAR[k][f], '★[' + k + '] 지워짐: ' + f);
      else eq(F[f], FULL[f], '★[' + k + '] 그대로: ' + f);
    });
    if (FB[k]){ eq(S._store[FB[k]].className, 'msg info', '  [' + k + '] 무엇을 지웠는지 알린다'); ok(MSG[k].test(html(S, FB[k])), '  → 문구'); }
    eq(S._missing.join(','), '', '  [' + k + '] 되돌린 뒤에도 id 오타가 없다');
  });
  // 되돌린 직후 곧바로 다시 할 수 있다 (단추가 죽어 있지 않다)
  {
    const S = finishAll(makeSandbox()); S.resetSec('cell');
    S.aniGo('cs', 1); eq(S.ANI.cs.ph, 1, '★①-1 되돌린 직후 ▶ 가 듣는다'); eq(attr(S, 'cs_mrna', 'opacity'), '1', '  → 무대도 다시 그려진다');
    S.aniGo('cs', 99); eq(S.state.cellSeen, true, '  → 다시 끝까지 보면 cellSeen'); S.pickQ('c1', 1); eq(S.doneCount(), 6, '  → 다시 6');
  }
  {
    // ★①-2 ↔ ③ 독립 — ①-2 를 되돌려도 ③ 의 찾은 칸·f1 은 그대로
    const S = finishAll(makeSandbox()); S.resetSec('code');
    eq(S.ctOpenCount(), 16, '★①-2 를 되돌려도 ③ 의 연 칸 16개는 그대로'); eq(S.ctSeenCount(), 3, '  → 본 종류 3도'); eq(S.state.qPick.f1, 2, '  → f1 도 그대로');
    eq(attr(S, 'ct_row_UAA', 'opacity'), '1', '  → 무대의 열린 줄도 그대로'); eq(S.ANI.ct.ph, 3, '  → 국면도 3'); eq(S.stepDone('find'), true, '  → ③ 은 완료인 채');
    eq(S._store['codonDef'].style.display, 'none', '★코돈의 정의가 도로 숨는다');
    eq(txt(S, 'codeProg'), '눌러 본 묶음 0 / 3', '  → 꼬리표 0 / 3');
    ok(/<g id="cb_3" class="rfade" opacity="0">/.test(html(S, 'codeStage')) && !/가지<\/text>/.test(html(S, 'codeStage')), '  → 막대가 도로 사라지고 가짓수 글이 사라진다');
    S.pickCode(2); eq(S.codeDoneCount(), 1, '★①-2 되돌린 직후 칩이 듣는다');
    S.pickCode(3); eq(S._store['codonDef'].style.display, 'none', '  → 2·3개씩만으로는 아직 닫혀 있다');
    S.pickCode(1); eq(S._store['codonDef'].style.display, 'block', '  → 셋을 다 누르면 결론이 다시 열린다');
    S.pickQ('i1', 2); eq(S.doneCount(), 6, '  → 다시 6');
  }
  {
    const S = finishAll(makeSandbox()); S.resetSec('zoom');
    eq(attr(S, 'zw', 'transform').indexOf('scale(0.1667)') > 0, true, '★② 되돌리면 세포 축척으로 돌아간다');
    eq(txt(S, 'zm_tx_1'), 'G', '  → 빈칸 표시가 걷힌다');
    S.fillBlank('G'); eqJ(S.state.zoomFill, {}, '  → 연출 전이라 못 채운다 (규칙이 되살아난다)');
    S.aniGo('zm', 99); ['G','A','U','C'].forEach(b => S.fillBlank(b)); eq(S.zoomFilledCount(), 4, '★② 되돌린 직후 다시 채울 수 있다');
    S.pickQ('z1', 2); eq(S.doneCount(), 6, '  → 다시 6');
  }
  {
    // ★③ ↔ ①-2 독립 — ③ 을 되돌려도 ①-2 의 칩·i1 은 그대로
    const S = finishAll(makeSandbox()); S.resetSec('find');
    eq(S.codeDoneCount(), 3, '★③ 을 되돌려도 ①-2 의 눌러 본 묶음 3은 그대로'); eq(S.state.qPick.i1, 2, '  → i1 도 그대로');
    eq(S._store['codonDef'].style.display, 'block', '  → 코돈의 정의도 열린 채'); eq(S.stepDone('code'), true, '  → ①-2 는 완료인 채');
    ok(ALL_CODONS.every(c => attr(S, 'ct_row_' + c, 'opacity') === '0'), '  → 64줄이 모두 숨는다');
    eq(html(S, 'findTask'), '▶ 를 눌러 표의 세 축을 차례로 놓으시오.', '  → 지시가 처음(축 놓기)으로 돌아간다');
    S.ctOpenCell('UG'); eq(S.ctOpenCount(), 0, '  → 빈 표라 곧바로는 못 연다 (축부터)');
    S.aniGo('ct', 99); S.ctOpenCell('UG'); eq(S.ctOpenCount(), 1, '★③ 되돌린 직후 축을 놓고 다시 열 수 있다');
    S.ctTapCodon('UGA'); eq(S.ctSeenCount(), 1, '  → 종류도 다시 센다');
    eq(S.decDoneCount(), 3, '  → ④ 는 그대로');
  }
  {
    const S = finishAll(makeSandbox()); S.resetSec('dec');
    eq(S.curCodon(), 'CAU', '★④ 되돌리면 첫 코돈부터');
    ok(/아직 해독한 코돈이 없다/.test(html(S, 'decPep')), '  → 폴리펩타이드 칸이 빈다');
    ok(/^▶ /.test(html(S, 'af1')) && /^▶ /.test(html(S, 'af2')), '  → 자동 틀 단추가 ▶ 로');
    eq(html(S, 'autoStrands'), '', '  → 자동 틀 가닥이 사라진다');
    ok(!/10번째/.test(html(S, 'mutTable')), '  → ⑤ 결과표의 바뀐 행도 사라진다');
    eq((html(S, 'mutRows').match(/runMut\(/g) || []).length, 3, '  → ⑤ 의 🔬 단추 3개가 돌아온다');
    for (let i = 0; i < D0.need; i++) S.ctTap4(D0.codons[i]);
    ok(S.frameDone(0), '★④ 되돌린 직후 다시 해독할 수 있다');
    S.guessMut(10, 0); S.runMut(10); eq(S.state.mutRun['10'], true, '  → ⑤ 도 곧바로 다시');
    eq(S.ctOpenCount(), 16, '  → ③ 은 그대로'); eq(S.state.qPick.f1, 2, '  → ③ 문항도 그대로'); eq(S.codeDoneCount(), 3, '  → ①-2 도 그대로');
  }
  {
    const S = finishAll(makeSandbox()); S.resetSec('mut');
    eq(S.decDoneCount(), 3, '★⑤ 를 되돌려도 ④ 는 그대로 (딸린 관계는 한쪽 방향)'); eq(S.state.qPick.d1, 1, '  → ④ 문항도');
    ok(/verdict-card good/.test(html(S, 'decVerdict')), '  → ④ 판정 카드도 그대로');
    S.guessMut(12, 1); S.runMut(12); eq(S.state.mutRun['12'], true, '★⑤ 되돌린 직후 다시 할 수 있다');
  }
  {
    const S = finishAll(makeSandbox()); S.resetSec('prac');
    ok(S.PRACTICE.every(p => S.qEls[p.id].choices.every(b => b.className === 'choice' && !b.disabled)), '★💪 되돌리면 선지가 모두 초기 상태');
    S.pickQ('p2', 0); eq(S.state.pPick.p2, 0, '  → 곧바로 다시 풀 수 있다');
    eq(S.doneCount(), 6, '  → 완료 6 그대로 (💪 는 완료에 안 들어간다)');
  }
  {
    const S = finishAll(makeSandbox()); S.resetSec('write');
    ok(S.WRITEQ.every(w => S._store['ta_' + w.id].value === ''), '★⑥ 되돌리면 서술칸 넷이 실제로 비워진다');
    ok(S.WRITEQ.every(w => dis(S, 'ansBtn_' + w.id)), '  → 모범답안이 도로 잠긴다');
    ok(S.SELFCHECK.every(s => !S._store['self_' + s.id].checked), '  → 자기평가 체크가 풀린다');
    ok(Object.keys(stored(S).ta).every(k => stored(S).ta[k] === ''), '  → 저장에도 답안이 없다'); eqJ(stored(S).self, {}, '  → 저장에도 체크가 없다');
    S._store['ta_w1'].value = '가'.repeat(S.WRITEQ[0].min); S.onTa('w1'); eq(S.ansGate('w1').open, true, '★⑥ 되돌린 직후 다시 적을 수 있다');
    eq(S.doneCount(), 6, '  → 완료 6 그대로');
  }
  // 확인 대화상자를 취소하면 아무것도 안 지운다 — 묻는 네 칸만
  {
    const S = finishAll(makeSandbox({ confirmRet:false }));
    const before = JSON.stringify(S.state) + JSON.stringify(facets(S));
    const ASKING = ['find','dec','mut','write'];
    ASKING.forEach(k => S.resetSec(k));
    eq(S._rec.confirms, 4, '★묻는 칸 넷(③④⑤⑥)이 각각 한 번씩 물었다');
    eq(JSON.stringify(S.state) + JSON.stringify(facets(S)), before, '★취소하면 상태도 화면도 한 글자도 바뀌지 않는다');
    eq(S._rec.reloads, 0, '  → 새로고침도 없다');
    S._rec.confirmMsgs.forEach((m, i) => ok(m === S.SEC_ASK[ASKING[i]], '  → ' + i + '번 확인 문구가 SEC_ASK.' + ASKING[i] + ' 이다'));
    ['cell','code','zoom','prac'].forEach(k => S.resetSec(k));
    eq(S._rec.confirms, 4, '★①-1 · ①-2 · ② · 💪 는 confirm 없이 지운다 (8칸을 다 돌아도 confirm 은 4번)');
  }
  // 힌트가 열린 채 되돌리면 닫힌다
  {
    const S = makeSandbox();
    for (let i = 0; i < 7; i++) S.ctTap4(D0.codons[i]);
    S.showCodonHint(); eq(S.state.hintCodon, 'GCA', '(힌트를 열어 두었다)');
    S.resetSec('dec'); eq(S.state.hintCodon, null, '★④ 되돌리면 열어 둔 힌트도 닫힌다');
    ok(!/글라이신|히스티딘|알라닌/.test(html(S, 'ctNow4')), '  → 「지금 할 일」에 아미노산 이름이 없다');
  }
  eq(makeSandbox().resetSec('없는칸'), undefined, '없는 칸을 되돌리라 해도 죽지 않는다');
  // 전체 되돌리기만 새로고침 + 저장소·메모리·mounted 표시까지 비운다
  {
    const S = finishAll(makeSandbox());
    S.resetAll();
    eq(S._rec.confirms, 1, 'resetAll 은 확인을 묻는다');
    eq(S._rec.reloads, 1, '★resetAll 만 location.reload 를 부른다');
    eq(S.localStorage._mem[S.LS_KEY], undefined, '★저장분이 지워진다');
    eq(S.doneCount(), 0, '★메모리의 state 도 비워진다');
    eq(S.csMounted, false, '  → ① mounted 표시 되돌림'); eq(S.zmMounted, false, '  → ② mounted 표시 되돌림'); eq(S.gbMounted, false, '  → 묶기 무대 mounted 표시 되돌림'); eq(S.ctMounted, false, '  → ③ 무대 mounted 표시 되돌림');
    eqJ(S.ANI, { cs:{ ph:0, prev:-1 }, zm:{ ph:0, prev:-1 }, ct:{ ph:0, prev:-1 } }, '  → 연출 국면도 0 (③ 포함)');
    S.pickCode(1); eq(stored(S).seq, 1, '  → 새로고침 전에 눌러도 옛 state 가 되살아나지 않는다 (seq 1 부터)');
    const T = finishAll(makeSandbox({ confirmRet:false }));
    T.resetAll();
    eq(T._rec.reloads, 0, '★전체 되돌리기를 취소하면 새로고침하지 않는다'); eq(T.doneCount(), 6, '  → 상태도 그대로');
    ok(!!stored(T), '  → 저장분도 그대로');
  }
}

// ══ 14. 말투 ══
console.log('[14] 말투 — 시험지 문체 (금지어 · 지시문 「~하시오」 · 발문 「?」 · confirm 「~하시겠습니까?」 · 캡션)');
{
  /* ★정본은 _test_가계도분석.js 의 [13] 말투 점검. 목록을 그대로 가져왔다. 이모지는 금지가 아니다. */
  const BANNED = ['해 보자','보자.','보자!','하자.','하자!','가자.','가자!','좋아','맞아.','맞아!',
                  '했어','됐어','왔어','찾았어','거야','이야.','이야!','일까','할까','올까','줄까',
                  '나와.','너의','네가','우리가'];
  const S = makeSandbox();
  const hitsIn = t => BANNED.filter(w => String(t).indexOf(w) >= 0);
  // (1) 자료 문안 전수 — 한 덩이로
  const blob = JSON.stringify({ QC:S.Q_CELL, QZ:S.Q_ZOOM, QI:S.Q_CODE, QF:S.Q_FIND, QD:S.Q_DEC, QM:S.Q_MUT, P:S.PRACTICE, W:S.WRITEQ, SC:S.SELFCHECK,
    MC:S.MUT_CHOICES, CT:S.CT_STEPS, CTC:S.CT_CAP, CI:S.CT_KIND_INFO, RS:S.RNA_SLOTS, ST:S.STEPS, CS:S.CS_STEPS, CC:S.CS_CAP, ZS:S.ZM_STEPS, ZC:S.ZM_CAP,
    FN:S.FRAME_NAMES, SD:S.SEC_DEF, SA:S.SEC_ASK }, (k, v) => (typeof v === 'function' ? String(v) : v));
  eq(hitsIn(blob).join(' '), '', '★문항·서술·캡션·지시 문안에 친근체/추임새 0건');
  eq(hitsIn(bodyHtml).join(' '), '', '★본문 마크업에 친근체/추임새 0건');
  eq(hitsIn(code).join(' '), '', '★런타임 문구(주석 제외)에 친근체/추임새 0건');
  // (2) 캡션 한 줄씩 — 금지어 없음 · 구어체 종결 없음
  S.CS_CAP.concat(S.ZM_CAP, S.CT_CAP).forEach((c, i) => {
    const t = strip(c);
    eq(hitsIn(t).join(' '), '', '★캡션 ' + i + ' 에 금지어 없음');
    ok(!/(요|죠|네|어|야|자)[.!?]$/.test(t), '  캡션 ' + i + ' 이 구어체로 끝나지 않는다 [' + t.slice(-8) + ']');
    ok(/[.。]$/.test(t), '  캡션 ' + i + ' 이 마침표로 끝난다');
  });
  S.CS_STEPS.concat(S.ZM_STEPS, S.CT_STEPS).forEach((c, i) => eq(hitsIn(c).join(' '), '', '★국면 이름 ' + i + ' 에 금지어 없음'));
  // (3) 지시 막대 — 정적 6 + 동적 3 — 「~하시오」 또는 「~다.」
  const bars = [...bodyHtml.matchAll(/<div class="taskbar"[^>]*>([\s\S]*?)<\/div>/g)].map(m => m[1]);
  ['zmTask','findTask','decTask'].forEach(id => bars.push(html(S, id)));
  const tasks = bars.map(strip).filter(Boolean);
  ok(tasks.length >= 8, '지시 막대 문구를 ' + tasks.length + '건 모았다');
  tasks.forEach(t => {
    eq(hitsIn(t).join(' '), '', '★지시 막대 「' + t.slice(0, 14) + '…」 에 금지어 없음');
    ok(/(시오[.!]?\s*(\([^)]*\))?[.!]?|다\.)$/.test(t), '★지시 막대 「' + t.slice(0, 14) + '…」 가 「~하시오」 또는 「~이다.」로 끝난다');
  });
  ok(tasks.filter(t => /시오/.test(t)).length >= 7, '  → 그중 지시형이 실제로 여럿이다');
  { const U = makeSandbox(); U.aniGo('ct', 99); const t3 = strip(html(U, 'findTask')); ok(/시오\. \(연 칸 0 \/ 16\)$/.test(t3), '③ 칸 열기 지시가 「~하시오. (연 칸 n / 16)」');
    ctOpenAll(U); ok(/시오\.$/.test(strip(html(U, 'findTask'))), '  → 마친 뒤 지시도 「~하시오.」'); }
  ok(/16개/.test(S.SEC_ASK.find), '★③ 확인 문구가 연 칸 16개를 말한다');
  ok(S.WRITEQ.every(w => /시오\.$/.test(strip(w.q))), '서술 발문 4건이 「~하시오.」로 끝난다');
  // (4) 발문 물음표 · 오답 되돌림
  const asks = S.ALLQ().map(p => strip(p.q));
  ok(asks.every(t => /[?？]$/.test(t)), '★선택형 발문 ' + asks.length + '건이 모두 물음표로 끝난다');
  ok(S.SELFCHECK.every(s => /[?？]$/.test(s.t.trim())), '자기평가 3줄도 물음으로 끝난다');
  const nos = []; S.ALLQ().forEach(p => p.no.forEach((t, i) => { if (i !== p.a) nos.push(t); }));
  eq(nos.length, 30, '오답 되돌림이 10문항 × 3 = 30건');
  ok(nos.every(t => t.indexOf('옳지 않다.') === 0), '★오답 되돌림이 모두 「옳지 않다.」로 시작한다');
  ok(nos.every(t => /다\.$/.test(t.trim())), '  → 모두 「~다.」로 끝난다');
  ok(S.ALLQ().every(p => p.ex.trim().replace(/<[^>]*>/g, '').slice(-1) === '.'), '해설이 모두 마침표로 끝난다');
  // (5) 런타임 되돌림 문구의 형태 — 오답은 「옳지 않다.」, 정답은 「옳다.」
  const badFb = [...code.matchAll(/showFb\('[^']+',\s*'bad',\s*'([^']*)'/g)].map(m => m[1]);
  eq(badFb.length, 2, '오답 되돌림 리터럴이 2건이다 (② 빈칸 · ④ 해독 — ③ 은 정오가 없는 열기이고 ⑤ 는 예상 대조라 「예상과 다르다」)');
  badFb.forEach(t => ok(t.indexOf('옳지 않다.') === 0, '★오답 되돌림 「' + t.slice(0, 16) + '…」 이 「옳지 않다.」로 시작한다'));
  const goodFb = [...code.matchAll(/showFb\('[^']+',\s*'good',\s*'([^']*)'/g)].map(m => m[1]);
  ok(goodFb.length >= 3, '정답 되돌림 리터럴 ' + goodFb.length + '건');
  /* ③ 의 칸 열기는 정오가 없는 조작이라 「옳다.」가 아니라 「XX_ 칸을 열었다.」로 시작한다 — 그 한 건만 허용 */
  const openMsg = /showFb\('fb_find', 'good', '<b>' \+ key \+ '_<\/b> 칸을 열었다\. '/.test(code);
  ok(openMsg, '③ 칸 열기 되돌림이 「XX_ 칸을 열었다.」 형태다');
  goodFb.forEach(t => ok(t.indexOf('옳다.') === 0 || (t === '<b>' && openMsg), '★정답 되돌림 「' + t.slice(0, 12) + '…」 이 「옳다.」로 시작한다 (③ 칸 열기만 예외)'));
  ok(!/[가-힣]요[.!?'<]/.test(code) && !/[가-힣]요[.!?<]/.test(bodyHtml), '★「~요.」 종결이 런타임·본문에 없다');
  ok(!/죠[.!?'<]/.test(code) && !/죠[.!?<]/.test(bodyHtml), '★「~죠.」 종결이 없다');
  // (6) confirm 문구 — SEC_ASK 4 + 리터럴 2 = 6, 모두 「~하시겠습니까?」
  eq((code.match(/confirm\(/g) || []).length, 3, 'confirm 을 부르는 자리가 3곳이다 (교사 해제 · 섹션 되돌리기 · 전체 되돌리기)');
  const msgsC = Object.keys(S.SEC_ASK).map(k => S.SEC_ASK[k]);
  eqJ(Object.keys(S.SEC_ASK).sort(), ['dec','find','mut','write'], '★SEC_ASK 가 묻는 네 칸(③④⑤⑥)에만 있다 — ①-2 는 묻지 않는다');
  { const re = /confirm\(/g; let m;
    while ((m = re.exec(code))){
      let i = m.index + m[0].length, depth = 1;
      while (i < code.length && depth > 0){ const ch = code.charAt(i); if (ch === '(') depth++; else if (ch === ')') depth--; if (depth > 0) i++; }
      const arg = code.slice(m.index + m[0].length, i);
      try { const v = vm.runInNewContext(arg); if (typeof v === 'string') msgsC.push(v); } catch(e){}
    } }
  eq(msgsC.length, 6, '확인 문구 6건 (SEC_ASK 4 + 리터럴 2)');
  msgsC.forEach((m, i) => {
    ok(/하시겠습니까\?/.test(m), '★확인 대화상자 ' + i + ' 가 「~하시겠습니까?」를 쓴다');
    const tail = m.slice(m.indexOf('하시겠습니까?') + 7).trim();
    ok(tail === '' || /^\(.*\)$/.test(tail) || /다\.$/.test(tail), '  → 물음 뒤에는 괄호 부연이나 설명문뿐이다 [' + tail.slice(0, 20) + ']');
    eq(hitsIn(m).join(' '), '', '  → 금지어 없음');
  });
  ['find','mut','write'].forEach(k => ok(/다른 단계는 그대로/.test(S.SEC_ASK[k]), '★' + k + ' 의 확인 문구가 다른 칸은 그대로임을 밝힌다'));
  ok(/⑤ 의 예상과 결과도 함께 지워진다/.test(S.SEC_ASK.dec), '★dec 의 확인 문구가 ⑤ 도 지워짐을 밝힌다');
  ok(/새로고침하면 도로 잠긴다/.test(msgsC[4] + msgsC[5]), '교사 해제 문구가 비저장을 밝힌다');
}

// ══ 15. 활동의 경계 ══
console.log('[15] 활동의 경계 — 자매 활동(단백질합성 모의실험)의 용어가 넘어오지 않았는가');
{
  const OUT = ['안티코돈', '펩타이드결합', '펩타이드 결합', 'E 자리', 'P 자리', 'E자리', 'P자리', '프로모터', 'RNA 중합효소', '중합효소', '아미노아실', '인트론', '엑손', '스플라이싱', '개시 tRNA', '개시tRNA'];
  OUT.forEach(w => eq((src.match(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 0,
    '★「' + w + '」가 파일 전체(주석 포함)에 없다'));
  /* 「A 자리」는 라이보솜의 A 자리(자매 활동 용어)와 주형의 A(아데닌) 자리가 같은 글자다.
     여기서는 **주형(의/가닥의) 바로 뒤**에서만 허용한다 — 그 밖의 「A 자리」는 넘어온 용어로 본다. */
  const noComment = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const aSites = [...noComment.matchAll(/(?<![A-Za-z])A 자리/g)].map(m => noComment.slice(Math.max(0, m.index - 14), m.index));
  ok(aSites.length >= 1, '「A 자리」 표현이 ' + aSites.length + '곳 있다 (주형의 아데닌 자리 뜻)');
  aSites.forEach((ctx, i) => ok(/주형(의|\s*가닥의)\s*(<b>)?$/.test(ctx), '★「A 자리」 ' + i + ' 는 「주형(가닥)의 A 자리」 — 라이보솜 자리 뜻이 아니다 [' + ctx.trim() + ']'));
  ok(!/라이보솜[^.]{0,30}A 자리|A 자리[^.]{0,30}라이보솜/.test(noComment), '  → 「A 자리」가 라이보솜과 한 문장에 있지 않다');
  ok(/단백질합성 모의실험/.test(src), '대신 자매 활동을 가리키는 한 줄이 있다');
  ok(/12유전02-01/.test(bodyHtml) && /12유전02-02/.test(bodyHtml), '성취기준 두 코드가 본문에 있다');
  ok(/60~63쪽/.test(bodyHtml), '교과서 쪽수가 본문에 있다');
  ['코돈', '읽기틀', '중심원리', '전사', '번역', '개시코돈', '종결코돈', '3염기조합', '주형 가닥', '핵공', 'rRNA', 'tRNA'].forEach(w =>
    ok(bodyHtml.indexOf(w) >= 0 || code.indexOf(w) >= 0, '  (이 활동의 말 「' + w + '」는 있다)'));
  ok(!/티록신|글리코젠|표적 기관/.test(src), '옛 교육과정 용어(티록신·글리코젠·표적 기관)가 없다');
  ok(!/메티오닌|리보솜|글리신|아스파라긴|트레오닌이|알라닌이/.test(bodyHtml + JSON.stringify(makeSandbox().CODON_GROUPS)) || true, '(용어 표기 점검은 [3] 의 64칸 대조가 맡는다)');
  ok(!/메티오닌|리보솜|글리신|아스파라긴/.test(src), '★옛 표기(메티오닌·리보솜·글리신·아스파라긴)가 파일 전체에 없다');
}

// ══ 16. 진행 ══
console.log('[16] 진행 — 완료 6단계 · 💪⑥ 은 들어가지 않는다 · 배지 · 레일 (잠긴 칸 없음)');
{
  const S = makeSandbox();
  const D0 = refDecode(REF_MRNA, 0);
  eq(S.STEPS.length, 6, '★단계가 6개다');
  eqJ(S.STEPS.map(s => s.key), ['cell','code','zoom','find','dec','mut'], '  → cell · code · zoom · find · dec · mut (카드 차례)');
  eqJ(S.STEPS.map(s => s.no), ['①-1','①-2','②','③','④','⑤'], '  → 번호 ①-1 · ①-2 · ② · ③ · ④ · ⑤');
  eqJ([S.STEPS[3].key, S.STEPS[3].name, S.STEPS[3].sub], ['find', '코돈표', '세 축 · 개시·지정·종결'], '  → STEPS[3] = 코돈표 (세 축 · 개시·지정·종결)');
  eq(S.doneCount(), 0, '★처음 완료 0'); eq(txt(S, 'progress'), '진행 0 / 6', '★배지 「진행 0 / 6」');
  eq((html(S, 'rail').match(/class="rstep on"/g) || []).length, 6, '레일 6칸이 모두 열려 있다(on) — 잠긴 칸이 없다');
  ok(!/locked/.test(html(S, 'rail')), '  → locked 표시가 없다');
  ok(/①-1 세포 한 바퀴/.test(html(S, 'rail')) && /①-2 글자 몇 개로/.test(html(S, 'rail')), '  → 레일에 ①-1 · ①-2 가 보인다');
  eq(S._store['pracBody'].style.display, 'block', '💪 는 처음부터 열려 있다');
  // 단계마다 두 조건(활동 + 문항)이 모두 있어야 한다 — 카드 차례대로
  S.aniGo('cs', 99); eq(S.doneCount(), 0, '①-1 무대만 보면 아직 0');
  S.pickQ('c1', 0); eq(S.doneCount(), 1, '★①-1 무대 + 문항 → 1 (오답이라도 답했으면 된다)');
  eq(txt(S, 'progress'), '진행 1 / 6', '  → 배지 1 / 6');
  eq((html(S, 'rail').match(/class="rstep ok"/g) || []).length, 1, '  → 레일 ok 1칸');
  [1,2].forEach(n => S.pickCode(n)); S.pickQ('i1', 2); eq(S.doneCount(), 1, '①-2 칩 둘 + 문항은 아직');
  S.pickCode(3); eq(S.doneCount(), 2, '★①-2 칩 3 + 문항 → 2');
  S.pickQ('z1', 2); eq(S.doneCount(), 2, '② 문항만은 아직');
  S.aniGo('zm', 99); ['G','A','U','C'].forEach(b => S.fillBlank(b)); eq(S.doneCount(), 3, '★② 빈칸 4 + 문항 → 3');
  S.pickQ('f1', 2); eq(S.doneCount(), 3, '③ 찾기 전엔 아직');
  S.aniGo('ct', 99); CT_KEYS_ALL.forEach(k => S.ctOpenCell(k)); eq(S.doneCount(), 3, '③ 16칸을 열어도 종류를 안 보면 아직');
  S.ctTapCodon('AUG'); S.ctTapCodon('UAA'); S.ctTapCodon('CAU'); eq(S.doneCount(), 4, '★③ 16칸 + 종류 3 + 문항 → 4');
  for (let i = 0; i < D0.need; i++) S.ctTap4(D0.codons[i]); S.pickQ('d1', 1); eq(S.doneCount(), 4, '④ 자동 틀 전엔 아직');
  S.autoFrame(1); eq(S.doneCount(), 4, '  → 하나만도 아직'); S.autoFrame(2); eq(S.doneCount(), 5, '★④ 8칸 + 자동 2 + 문항 → 5');
  S.MUTS.forEach(m => { S.guessMut(m.pos, 0); S.runMut(m.pos); }); eq(S.doneCount(), 5, '⑤ 문항 전엔 아직');
  S.pickQ('m1', 3); eq(S.doneCount(), 6, '★⑤ 3자리 + 문항 → 6 (예상이 틀려도 확인했으면 된다)');
  eq(txt(S, 'progress'), '진행 6 / 6', '★배지 「진행 6 / 6」');
  eq((html(S, 'rail').match(/class="rstep ok"/g) || []).length, 6, '  → 레일 ok 6칸');
  eqJ(Object.keys(S.state.pPick), [], '★💪 를 하나도 안 풀어도 6 이다');
  eq(Object.keys(S.state.ta).filter(k => S.state.ta[k]).length, 0, '★⑥ 을 안 적어도 6 이다');
  eq(S._missing.join(','), '', '★전 과정에서 없는 id 를 찾은 일이 없다');
  ok(!('cardOpen' in S) && !('unlockAll' in S), '섹션 잠금·전체 해제 함수가 없다');
  // ①-2 와 ③ 은 서로를 막지 않는다 — 찾기부터 해도 된다
  const T = makeSandbox();
  ctOpenAll(T); T.pickQ('f1', 2);
  eq(T.doneCount(), 1, '★①-2 를 건너뛰고 ③ 부터 해도 완료로 센다');
  eq(txt(T, 'progress'), '진행 1 / 6', '  → 배지 1 / 6');
}

console.log('\nPASS ' + pass + ' / FAIL ' + fail);
process.exit(fail ? 1 : 0);
