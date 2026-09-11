// ════════════════════════════════════════════════════════════════════════
//  2-1 중심원리와 유전부호 해독 — Node 헤드리스 회귀 검사 (독립 검증판)
//  실행:  node "_test_유전부호해독.js"
//
//  ★규율 (작업노트/방법_웹활동_제작표준.md §8)
//   · 본체를 쓴 사람의 근거를 믿지 않는다. 근거는 **교과서 값**과 **HTML 자체**에서만 온다.
//     → 코돈표 64칸·해독 결과·돌연변이 결과를 이 파일이 **스스로 다시 계산**해 대조한다.
//   · 「대략」이 아니라 규칙 자체를 문다(막대 높이는 「가짓수에 정비례」를 등식으로).
//   · setTimeout·Date 를 샌드박스에 **일부러 넣지 않는다** — 연출 없이도 결과가 나는지 여기서 갈린다.
// ════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const HTML = path.join(__dirname, '2-1_중심원리와유전부호해독_활동.html');  // ★USB 드라이브 문자는 PC마다 다르다 — 박지 말 것
const src = fs.readFileSync(HTML, 'utf8');

/* ★<script> 블록은 2개다 — 앞은 <head> 의 미완성 잠금, 뒤가 본체.
   본체만 vm 에 올린다(맨 앞 'use strict'; 를 벗겨야 최상위 var/function 이 전역으로 노출된다). */
const BLOCKS = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]);
if (BLOCKS.length !== 2) { console.error('FAIL: script 블록이 2개가 아니다 (' + BLOCKS.length + ')'); process.exit(1); }
const gateJs = BLOCKS[0];
const js = BLOCKS[1].replace(/^\s*'use strict';/, '');

let pass = 0, fail = 0;
function ok(cond, name){ if (cond) { pass++; } else { fail++; console.error('  X FAIL: ' + name); } }
function eq(actual, expect, name){
  ok(actual === expect, name + '  [기대 ' + JSON.stringify(expect) + ' / 실제 ' + JSON.stringify(actual) + ']');
}
function eqJ(actual, expect, name){
  eq(JSON.stringify(actual), JSON.stringify(expect), name);
}

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
  const mm = src.match(re);
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
/* ★단독 선택자 규칙만 떼어 온다 — cssRule('body') 은 `html,body{…}` 에 먼저 걸린다.
   앞 글자가 쉼표·낱말이 아닌 자리에서만 잡는다. */
function cssRuleAlone(sel){
  const re = new RegExp('(?:^|[}{;\\n])\\s*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}');
  const mm = src.match(re);
  return mm ? mm[1] : '';
}

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
      addEventListener:()=>{}
    };
    /* ★innerHTML 은 접근자다 — '' 를 넣으면 children 도 비우고,
       마크업이 들어오면 그 안의 id 를 **실제로 등록**한다.
       (그래야 ta_· c3_· c4_ 처럼 렌더로 생기는 id 의 오타가 _missing 에 잡히고,
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
  const rec = { confirmRet: (opt.confirmRet !== false), confirms:0, reloads:0 };
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
    confirm(msg){ rec.confirms++; rec.lastConfirm = msg; return rec.confirmRet; },
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
function stored(S){ try { return JSON.parse(S.localStorage._mem[S.LS_KEY]) || null; } catch(e){ return null; } }

// ════════════════════════════════════════════════════════════════════════
//  ★검사가 스스로 갖는 정본 — 교과서 62쪽 코돈표를 손으로 다시 적었다.
//    축 차례는 U·C·A·G. 세 번째 염기가 U→C→A→G 로 돈다.
//    앱의 CODON_GROUPS 를 쓰지 않는다.
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
const REF_LEU  = ['UUA','UUG','CUU','CUC','CUA','CUG'];

function refSplit(seq, f){ const o = []; for (let i = f; i + 3 <= seq.length; i += 3) o.push(seq.slice(i, i + 3)); return o; }
function refDecode(seq, f){
  const cods = refSplit(seq, f), aas = []; let stopAt = -1;
  for (let i = 0; i < cods.length; i++){
    if (REF[cods[i]] === '종결코돈'){ stopAt = i; break; }
    aas.push(REF[cods[i]]);
  }
  return { codons:cods, aas, stopAt, need:(stopAt >= 0 ? stopAt + 1 : cods.length) };
}
const REF_MRNA = 'CAUGGUAACGUGACUUCGAAUGCA';                     // 교과서 62쪽 해 보기 (24 염기)
const REF_TPL  = 'ACCTACAACCGTCAT';                              // 61쪽 그림 Ⅱ-2 DNA 주형 3′→5′
const REF_DEMO = 'UGGAUGUUGGCAGUA';                              // 61쪽 mRNA 5′→3′
const REF_DEMO_AA = ['메싸이오닌','류신','알라닌','발린'];
const REF_F0_AA = ['히스티딘','글라이신','아스파라진','발린','트레오닌','세린','아스파라진','알라닌'];

// ════════════════════════════════════════════════════════════════════════
console.log('\n═══ 2-1 중심원리와 유전부호 해독 — 회귀 검사 ═══\n');

// ══ 1. 정적 구조 ══
console.log('[1] 정적 구조 (단일 파일 · 44px · 16px · 2단 경계 · 잠금)');
{
  eq(BLOCKS.length, 2, '<script> 블록이 정확히 2개다');
  eq((src.match(/src="/g) || []).length, 0, '외부 script/이미지 참조 0건');
  eq((src.match(/href="/g) || []).length, 0, '외부 스타일시트·링크 0건');
  ok(/<meta name="viewport" content="width=device-width/.test(src), 'viewport meta 가 있다');
  ok(/^\s*<!DOCTYPE html>/i.test(src), 'DOCTYPE 선언');
  ok(/<html lang="ko">/.test(src), 'lang="ko"');

  // ── 미완성 잠금 (<head> 블록에서 직접 읽는다) ──
  const pass7856 = (gateJs.match(/DRAFT_PASS\s*=\s*'([^']*)'/) || [])[1];
  const dkey     = (gateJs.match(/DRAFT_KEY\s*=\s*'([^']*)'/) || [])[1];
  const dmode    = (gateJs.match(/DRAFT_MODE\s*=\s*(true|false)/) || [])[1];
  eq(pass7856, '7856', '★DRAFT_PASS 가 교사 지정 공통값 7856 이다');
  eq(dkey, 'codon_sim_draft_ok', 'DRAFT_KEY 에 활동 이름이 박혀 있다');
  ok(dkey.indexOf('codon_sim') === 0, '  → 한 origin 에서 localStorage 를 공유하므로 접두사가 필요하다');
  ok(dmode === 'true' || dmode === 'false', 'DRAFT_MODE 가 참·거짓 상수다 (지금 ' + dmode + ')');
  ok(/html:not\(\.unlocked\)\s*body\s*>\s*\.wrap\s*\{\s*display:\s*none/.test(src),
     '잠김이 기본이다(fail-closed) — .unlocked 가 없으면 본문이 숨는다');

  // ── 저장 키 ──
  const lsKey = (js.match(/var LS_KEY\s*=\s*'([^']*)'/) || [])[1];
  eq(lsKey, 'codon_sim_v1', 'LS_KEY 에 활동 이름이 박혀 있다');
  ok(lsKey.indexOf('codon_sim') === 0, '  → LS_KEY 도 활동 이름으로 시작한다');
  ok(lsKey !== dkey, 'LS_KEY 와 DRAFT_KEY 가 서로 다른 칸이다');

  // ── 터치 규격 ──
  eq(cssPx(cssRuleAlone('body'), 'font-size'), 16, '본문 글자 16px');
  ok(cssPx(cssRuleAlone('body'), 'line-height') === null, '  (줄간격은 배수로 준다 — px 로 굳히지 않았다)');
  [['.btn','단추'], ['.chip','칩'], ['.choice','선지'], ['.hintbtn','힌트 단추'], ['.secreset button','섹션 되돌리기 단추']]
    .forEach(([sel, name]) => {
      const h = cssPx(cssRule(sel), 'min-height');
      ok(h !== null && h >= 44, name + ' ' + sel + ' min-height ≥ 44px (실제 ' + h + ')');
    });
  ok(cssPx(cssRule('.selfcheck input'), 'width') >= 22, '자기평가 체크상자가 22px 이상이다');

  // ── 연출 접근성 ──
  ok(/@media \(prefers-reduced-motion: reduce\)/.test(src), 'prefers-reduced-motion 규칙이 있다');
  ok(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*transition:\s*none/.test(src),
     '  → 그 안에서 transition 을 끈다');

  // ── 2단 경계 ──
  ok(/@media \(min-width:1180px\)/.test(src), '2단 경계가 1180px 이다');
  ok(/@media \(max-width:1179\.98px\)/.test(src), '좁은 쪽 경계가 1179.98px 이다 (정수로 끊지 않는다)');
  eq((src.match(/max-width:1179px/g) || []).length, 0, '  → 1179px 로 정수로 끊은 자리가 없다');
  ok(/\.pr-do\s*\{\s*order:1/.test(src) && /\.pane-l\s*\{\s*order:2/.test(src) && /\.pr-q\s*\{\s*order:3/.test(src),
     '좁은 화면에서 조작 → 자료 → 문항 으로 되세운다');
  ok(/\.pane-l\s*\{[^}]*position:sticky/.test(src), '.pane-l 이 sticky 다');

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
  ok(ctabMin !== null && ctabMin <= leftMax,
     '★table.ctab 의 min-width(' + ctabMin + 'px) 가 왼쪽 칸(' + leftMax + 'px)을 넘지 않는다');
  ok(ctabMin <= 784, '  → 실측 기준 784px 도 넘지 않는다');
  ok(/\.ctab-outer\s*\{[^}]*overflow-x:auto/.test(src), '.ctab-outer 가 넘치는 몫을 스크롤로 흡수한다');
  ok(/\.pane-l,\.pr-do,\.pr-q\s*\{[^}]*min-width:0[^}]*width:100%/.test(src),
     '좁은 화면에서 칸이 내용 크기 아래로 줄어든다 (min-width:0 + width:100%)');
}

// ══ 2. 코돈표 데이터 무결성 ══
console.log('[2] 코돈표 데이터 무결성 (64칸 · 61+3 · 20종류)');
{
  const S = makeSandbox();
  eqJ(S.BASES4, REF_AXIS, '축 차례가 U·C·A·G 다 (교과서 62쪽)');
  eq(S.CODON_GROUPS.length, 21, 'CODON_GROUPS 가 21줄이다 (아미노산 20 + 종결코돈 1)');

  // (1) 21줄 → 64칸: 중복·누락을 계산으로 확인
  const flat = [];
  S.CODON_GROUPS.forEach(g => g[1].forEach(c => flat.push(c)));
  eq(flat.length, 64, '21줄에 적힌 코돈이 모두 64개다');
  eq(new Set(flat).size, 64, '  → 같은 코돈이 두 줄에 겹쳐 적히지 않았다');
  eq(Object.keys(S.CODON_TABLE).length, 64, 'CODON_TABLE 이 64칸이다');
  const allCod = Object.keys(REF);
  eq(allCod.length, 64, '검사가 스스로 만든 코돈 목록도 64개다');
  eq(allCod.filter(c => !S.CODON_TABLE[c]).join(','), '', '4³=64 가지가 하나도 빠지지 않았다');

  // (2) 64칸 전수 대조 — 검사가 손으로 적은 교과서 표와 맞는가
  let bad = 0;
  allCod.forEach(c => { if (S.CODON_TABLE[c] !== REF[c]) bad++; });
  eq(bad, 0, '★64칸이 교과서 62쪽 코돈표와 모두 일치한다');
  allCod.forEach(c => ok(S.CODON_TABLE[c] === REF[c], '  ' + c + ' = ' + REF[c] + ' (실제 ' + S.CODON_TABLE[c] + ')'));

  // (3) 갈래별 개수
  const stops = allCod.filter(c => S.CODON_TABLE[c] === '종결코돈');
  eq(stops.length, 3, '종결코돈이 3개다');
  eqJ(stops.slice().sort(), REF_STOP.slice().sort(), '  → UAA · UAG · UGA');
  eq(allCod.length - stops.length, 61, '아미노산을 지정하는 코돈이 61개다');
  const kinds = new Set(allCod.map(c => S.CODON_TABLE[c]));
  kinds.delete('종결코돈');
  eq(kinds.size, 20, '아미노산이 20종류다');
  eq(S.CODON_GROUPS.filter(g => g[0] !== '종결코돈').length, 20, '  → CODON_GROUPS 의 아미노산 줄도 20줄이다');

  // (4) 개시코돈 · 중복성
  eq(S.CODON_TABLE['AUG'], '메싸이오닌', 'AUG 는 메싸이오닌을 지정한다');
  ok(S.isStartCodon('AUG'), 'AUG 는 개시코돈이다');
  eq(S.START_CODON, 'AUG', 'START_CODON 이 AUG 다');
  ok(!S.isStartCodon('GUG') && !S.isStartCodon('AUA'), '개시코돈은 AUG 하나뿐이다');
  ok(!S.isStopCodon('AUG') && REF_STOP.every(c => S.isStopCodon(c)), 'isStopCodon 이 세 코돈에만 참이다');
  eqJ(S.STOP_CODONS.slice().sort(), REF_STOP.slice().sort(), 'STOP_CODONS 가 표에서 파생된다');
  eq(S.LEU_CODONS.length, 6, '★류신을 지정하는 코돈이 6개다');
  eqJ(S.LEU_CODONS.slice().sort(), REF_LEU.slice().sort(), '  → UUA·UUG·CUU·CUC·CUA·CUG');
  eq(allCod.filter(c => REF[c] === '류신').length, 6, '  → 검사가 스스로 센 값도 6개다');

  // (5) 코돈 개수가 가장 많은 아미노산은 6개짜리 둘(류신·아르지닌·세린)
  const cnt = {};
  allCod.forEach(c => { if (REF[c] !== '종결코돈') cnt[REF[c]] = (cnt[REF[c]] || 0) + 1; });
  eq(Math.max.apply(null, Object.keys(cnt).map(k => cnt[k])), 6, '한 아미노산에 배정된 코돈은 최대 6개다');
  eq(Object.keys(cnt).filter(k => cnt[k] === 6).sort().join('·'), '류신·세린·아르지닌'.split('·').sort().join('·'),
     '  → 6개짜리는 류신·세린·아르지닌이다');
  eq(Object.keys(cnt).filter(k => cnt[k] === 1).sort().join('·'), '메싸이오닌·트립토판'.split('·').sort().join('·'),
     '  → 코돈이 하나뿐인 아미노산은 메싸이오닌·트립토판이다');
  eq(Object.keys(cnt).reduce((a,k) => a + cnt[k], 0), 61, '  → 아미노산에 배정된 코돈 합이 61이다');

  // (6) codonsOf / findTotal
  eqJ(S.codonsOf('발린').slice().sort(), ['GUU','GUC','GUA','GUG'].sort(), 'codonsOf(발린) 이 4개다');
  eq(S.codonsOf('없는아미노산').length, 0, 'codonsOf 는 없는 이름에 빈 배열을 준다');
  eq(S.codonToAA('ZZZ'), null, 'codonToAA 는 없는 코돈에 null 을 준다');
  eq(S.findTotal(), 10, '③ 찾기 과제의 칸 수 = 3(종결) + 1(개시) + 6(류신) = 10');
}

// ══ 3. 해독 로직 ══
console.log('[3] 해독 로직 — splitCodons · decode 전수 확인');
{
  const S = makeSandbox();
  eq(S.MRNA, REF_MRNA, '★교과서 62쪽 mRNA 서열이 그대로다');
  eq(S.MRNA.length, 24, '  → 24 염기다');
  ok(/^[UCAG]+$/.test(S.MRNA), '  → RNA 염기(U·C·A·G)로만 이루어져 있다 (T 가 없다)');

  // (1) splitCodons — 꼬리는 버린다
  eq(S.splitCodons(REF_MRNA, 0).length, 8, '1번째부터 끊으면 코돈 8개');
  eq(S.splitCodons(REF_MRNA, 1).length, 7, '2번째부터 끊으면 코돈 7개 (남는 2 염기는 버린다)');
  eq(S.splitCodons(REF_MRNA, 2).length, 7, '3번째부터 끊으면 코돈 7개 (남는 1 염기는 버린다)');
  [0,1,2].forEach(f => {
    eqJ(S.splitCodons(REF_MRNA, f), refSplit(REF_MRNA, f), '  splitCodons(frame ' + f + ') 가 검사의 계산과 같다');
    ok(S.splitCodons(REF_MRNA, f).every(c => c.length === 3), '  frame ' + f + ' 의 코돈이 모두 3자리다');
  });

  // (2) 읽기틀 1 — 종결코돈 없이 아미노산 8개
  const D0 = S.decode(REF_MRNA, 0), R0 = refDecode(REF_MRNA, 0);
  eq(D0.codons.join(' '), 'CAU GGU AAC GUG ACU UCG AAU GCA', '★1번째 염기부터: CAU GGU AAC GUG ACU UCG AAU GCA');
  eqJ(D0.aas, REF_F0_AA, '★히스티딘–글라이신–아스파라진–발린–트레오닌–세린–아스파라진–알라닌');
  eq(D0.stopAt, -1, '★1번째 염기부터는 종결코돈이 나오지 않는다');
  eq(D0.aas.length, 8, '  → 아미노산 8개');
  eq(D0.need, 8, '  → 탭해야 하는 칸이 8개');
  eqJ(D0.aas, R0.aas, '  → 검사가 스스로 해독한 결과와 같다');

  // (3) 읽기틀 2 — 4번째 코돈 UGA 에서 끝난다
  const D1 = S.decode(REF_MRNA, 1), R1 = refDecode(REF_MRNA, 1);
  eq(D1.stopAt, 3, '★2번째 염기부터: 4번째 코돈이 종결코돈이다 (0부터 세면 3)');
  eq(D1.codons[D1.stopAt], 'UGA', '★  → 그 코돈은 UGA 다');
  eq(D1.aas.length, 3, '★  → 아미노산 3개에서 끊긴다');
  eqJ(D1.aas, ['메싸이오닌','발린','트레오닌'], '  → AUG·GUA·ACG = 메싸이오닌–발린–트레오닌');
  eq(D1.need, 4, '  → 탭해야 하는 칸은 종결코돈까지 4개');
  eq(D1.stopAt, R1.stopAt, '  → 검사의 계산과 종결 자리가 같다');
  eq(D1.codons[0], 'AUG', '  → 2번째 염기부터 읽으면 첫 코돈이 AUG 다 (개시코돈이 있다고 속기 쉬운 자리)');

  // (4) 읽기틀 3 — 2번째 코돈 UAA 에서 끝난다
  const D2 = S.decode(REF_MRNA, 2), R2 = refDecode(REF_MRNA, 2);
  eq(D2.stopAt, 1, '★3번째 염기부터: 2번째 코돈이 종결코돈이다 (0부터 세면 1)');
  eq(D2.codons[D2.stopAt], 'UAA', '★  → 그 코돈은 UAA 다');
  eq(D2.aas.length, 1, '★  → 아미노산 1개에서 끊긴다');
  eqJ(D2.aas, ['트립토판'], '  → UGG = 트립토판');
  eq(D2.need, 2, '  → 탭해야 하는 칸은 2개');
  eq(D2.stopAt, R2.stopAt, '  → 검사의 계산과 종결 자리가 같다');

  // (5) 세 읽기틀을 견주면 1번째만 살아남는다 — 이것이 62쪽 해 보기 2의 답이다
  eq([0,1,2].filter(f => S.decode(REF_MRNA, f).stopAt < 0).length, 1,
     '★종결코돈 없이 끝까지 가는 읽기틀은 하나뿐이다');
  eq([0,1,2].find(f => S.decode(REF_MRNA, f).stopAt < 0), 0, '  → 그것이 1번째 염기부터 읽는 틀이다');
  ok(D0.aas.length > D1.aas.length && D1.aas.length > D2.aas.length,
     '  → 아미노산 개수가 8 > 3 > 1 로 갈린다');

  // (6) 경계
  eq(S.decode('', 0).codons.length, 0, '빈 서열은 코돈 0개');
  eq(S.decode('AU', 0).need, 0, '3자리가 못 되는 서열은 탭할 칸이 없다');
  eq(S.splitCodons(REF_MRNA, undefined).length, 8, 'frame 이 없으면 0 으로 본다');
}

// ══ 4. 61쪽 보기 무대 ══
console.log('[4] 61쪽 그림 Ⅱ-2 — 전사와 개시코돈');
{
  const S = makeSandbox();
  eq(S.DEMO_TEMPLATE, REF_TPL, 'DNA 주형 가닥 3′→5′ = ACCTACAACCGTCAT');
  ok(/^[ATGC]+$/.test(S.DEMO_TEMPLATE), '  → DNA 염기(A·T·G·C)로만 적혀 있다');
  eq(S.transcribe(REF_TPL), REF_DEMO, '★전사 결과 mRNA = UGGAUGUUGGCAGUA');
  eq(S.DEMO_MRNA, REF_DEMO, '  → 적어 둔 DEMO_MRNA 도 같은 값이다');
  eq(S.DEMO_MRNA.indexOf('T'), -1, '  → mRNA 에 T 가 없다 (A 의 짝은 U 다)');
  eqJ(S.DNA_TO_RNA, { A:'U', T:'A', G:'C', C:'G' }, '주형 DNA → mRNA 대응이 A→U 다 (복제의 A→T 가 아니다)');
  eq(S.transcribe('ACGX'), null, '모르는 염기가 들어오면 null 을 준다');

  eq(S.DEMO_START, 3, '★개시코돈은 4번째 염기부터다 (0부터 세면 3)');
  eq(REF_DEMO.substr(S.DEMO_START, 3), 'AUG', '  → 그 세 염기가 실제로 AUG 다');
  eq(REF_DEMO.indexOf('AUG'), 3, '  → 서열에서 처음 나오는 AUG 자리와 같다');
  eqJ(S.DEMO_AA, REF_DEMO_AA, '★폴리펩타이드 = 메싸이오닌–류신–알라닌–발린');
  const demoDec = S.decode(REF_DEMO, S.DEMO_START);
  eqJ(demoDec.aas, REF_DEMO_AA, '  → 개시코돈부터 해독한 결과와 일치한다');
  eqJ(demoDec.codons, ['AUG','UUG','GCA','GUA'], '  → 코돈은 AUG·UUG·GCA·GUA 다');
  eq(demoDec.stopAt, -1, '  → 보기 조각 안에는 종결코돈이 없다');
  eq(S.DEMO_AA.length, 4, '  → 아미노산 4개');

  // 무대가 실제로 그 값을 그린다
  const stage = html(S, 'demoStage');
  ok(stage.indexOf(REF_TPL.charAt(0)) >= 0 && stage.indexOf('DNA 주형 가닥') >= 0, '무대에 주형 가닥 줄이 있다');
  ok(/개시코돈/.test(html(S, 'demoStage')), '무대가 개시코돈 자리를 글로 알린다');
  ok(html(S, 'demoStage').indexOf('4~6번째 염기 AUG') >= 0, '  → 4~6번째 염기라고 적는다 (DEMO_START 에서 파생)');
  REF_DEMO_AA.forEach((a, i) => ok(!!S._store['d_aa' + i], '아미노산 구슬 d_aa' + i + ' 가 무대에 있다'));
}

// ══ 5. 돌연변이 3자리 ══
console.log('[5] 62쪽 해 보기 3 — 한 염기 치환 3자리');
{
  const S = makeSandbox();
  eq(S.MUTS.length, 3, '치환 자리가 3곳이다');
  eqJ(S.MUTS.map(m => m.pos), [10, 12, 17], '자리는 10번·12번·17번이다');

  // (0) 적어 둔 from 이 실제 서열과 맞는가 — 여기가 틀리면 모든 결과가 거짓이 된다
  S.MUTS.forEach(m => {
    eq(REF_MRNA.charAt(m.pos - 1), m.from,
       '★' + m.pos + '번째 염기가 실제로 ' + m.from + ' 다 (1부터 센 자리)');
    ok(m.from !== m.to, '  ' + m.pos + '번: 바뀐 염기가 원래와 다르다');
    ok('UCAG'.indexOf(m.to) >= 0, '  ' + m.pos + '번: 바뀐 염기가 RNA 염기다');
    const seq = S.mutSeq(m.pos);
    eq(seq.length, REF_MRNA.length, '  ' + m.pos + '번: 길이가 그대로다 (치환이지 삽입·결실이 아니다)');
    eq(seq.charAt(m.pos - 1), m.to, '  ' + m.pos + '번: 그 자리가 ' + m.to + ' 로 바뀌었다');
    let diff = 0;
    for (let i = 0; i < seq.length; i++) if (seq.charAt(i) !== REF_MRNA.charAt(i)) diff++;
    eq(diff, 1, '★  ' + m.pos + '번: 바뀐 자리가 정확히 한 곳이다');
  });
  eq(S.mutSeq(99), REF_MRNA, '없는 자리를 물으면 원래 서열을 준다');
  eq(S.mutById(99), null, 'mutById 는 없는 자리에 null 을 준다');

  // (1) 10번 G→A : GUG → AUG, 4번째 아미노산 발린 → 메싸이오닌
  {
    const base = refDecode(REF_MRNA, 0), now = refDecode(S.mutSeq(10), 0);
    eq(base.codons[3], 'GUG', '★10번은 4번째 코돈 GUG 의 첫 자리다');
    eq(now.codons[3], 'AUG', '★  → GUG 가 AUG 로 바뀐다');
    eq(base.aas[3], '발린', '  → 원래 4번째 아미노산은 발린이다');
    eq(now.aas[3], '메싸이오닌', '★  → 메싸이오닌으로 바뀐다');
    eq(S.mutKindOf(10), 'change', '★mutKindOf(10) = change');
    eq(S.mutChangedIndex(10), 3, '★mutChangedIndex(10) = 3 (4번째 아미노산)');
    eqJ(S.mutResult(10).aas, now.aas, '  → mutResult(10) 이 검사의 계산과 같다');
    eq(S.mutResult(10).aas.length, 8, '  → 아미노산 개수는 8개 그대로다');
    eq(S.mutResult(10).stopAt, -1, '  → 종결코돈은 생기지 않는다');
    eq(S.mutResult(10).aas.filter((a, i) => a !== base.aas[i]).length, 1, '  → 달라진 아미노산은 하나뿐이다');
  }
  // (2) 12번 G→A : GUG → GUA, 아미노산서열 불변
  {
    const base = refDecode(REF_MRNA, 0), now = refDecode(S.mutSeq(12), 0);
    eq(base.codons[3], 'GUG', '★12번도 4번째 코돈 GUG 의 자리다 (세 번째 자리)');
    eq(now.codons[3], 'GUA', '★  → GUG 가 GUA 로 바뀐다');
    eq(REF['GUG'], REF['GUA'], '★  → 두 코돈이 같은 아미노산(발린)을 지정한다');
    eq(S.mutKindOf(12), 'same', '★mutKindOf(12) = same');
    eq(S.mutChangedIndex(12), -1, '★mutChangedIndex(12) = -1 (바뀐 아미노산이 없다)');
    eqJ(S.mutResult(12).aas, REF_F0_AA, '★  → 아미노산서열이 원래와 완전히 같다');
    ok(S.mutSeq(12) !== REF_MRNA, '  → 염기서열 자체는 분명히 달라졌다');
  }
  // (3) 17번 C→A : UCG → UAG, 아미노산 5개에서 끝난다
  {
    const base = refDecode(REF_MRNA, 0), now = refDecode(S.mutSeq(17), 0);
    eq(base.codons[5], 'UCG', '★17번은 6번째 코돈 UCG 의 두 번째 자리다');
    eq(now.codons[5], 'UAG', '★  → UCG 가 UAG 로 바뀐다');
    eq(REF['UAG'], '종결코돈', '★  → UAG 는 종결코돈이다');
    eq(S.mutKindOf(17), 'stop', '★mutKindOf(17) = stop');
    eq(S.mutResult(17).stopAt, 5, '★  → 6번째 코돈에서 끝난다 (0부터 세면 5)');
    eq(S.mutResult(17).aas.length, 5, '★  → 아미노산 5개에서 끝난다');
    eqJ(S.mutResult(17).aas, REF_F0_AA.slice(0, 5), '  → 앞 다섯 아미노산은 그대로다');
    eq(S.mutResult(17).need, 6, '  → 종결코돈까지 6칸을 탭한다');
  }

  // (4) ★손으로 적은 kind 가 계산 결과와 일치하는가
  S.MUTS.forEach(m => {
    eq(m.kind, S.mutKindOf(m.pos), '★MUTS 의 kind("' + m.kind + '")가 ' + m.pos + '번의 계산 결과와 같다');
  });
  eqJ(S.MUTS.map(m => m.kind), ['change','same','stop'], '세 자리의 갈래가 서로 다르다 — 이것이 이 칸의 논점이다');
  eq(new Set(S.MUTS.map(m => S.mutKindOf(m.pos))).size, 3, '  → 세 갈래가 모두 한 번씩 나타난다');

  // (5) 예상 선지와 갈래의 짝
  eq(S.MUT_CHOICES.length, 3, '예상 선지가 3개다');
  eq(S.mutKindIndex('change'), 0, 'change → 0번 선지');
  eq(S.mutKindIndex('same'), 1, 'same → 1번 선지');
  eq(S.mutKindIndex('stop'), 2, 'stop → 2번 선지');
  ok(/바뀐다$/.test(S.MUT_CHOICES[0]), '0번 선지가 「바뀐다」로 끝난다');
  ok(/않는다$/.test(S.MUT_CHOICES[1]), '1번 선지가 「바뀌지 않는다」로 끝난다');
  ok(/끝난다$/.test(S.MUT_CHOICES[2]), '2번 선지가 「일찍 끝난다」로 끝난다');
  eq(new Set(S.MUT_CHOICES).size, 3, '선지 셋이 서로 다르다');
}

// ══ 6. 연출 엔진 ══
console.log('[6] 연출 엔진 (aniLast 는 함수 · 국면 5 · setTimeout 없이도 결과가 난다)');
{
  const S = makeSandbox();
  eq(typeof S.aniLast, 'function', '★aniLast 가 상수가 아니라 함수다');
  eq(S.aniSteps('demo').length, 5, '보기 무대의 국면이 5개다');
  eq(S.aniLast('demo'), 4, '  → 마지막 국면 번호는 4');
  eq(S.aniLast('없는무대'), 0, '없는 무대는 0 을 준다 (죽지 않는다)');
  eq(S.ANI_MS.demo.length, 5, '국면마다 시간이 지정돼 있다');
  ok(S.ANI_MS.demo.every(v => v > 0), '  → 모두 양수다');
  ok(S.ANI_STEPS.demo.every((s, i) => s.indexOf(['①','②','③','④','⑤'][i]) === 0),
     '국면 이름에 ①~⑤ 차례가 박혀 있다');

  // ★setTimeout 이 없는 환경(이 검사)에서도 결과가 확정된다
  eq(S.aniOf('demo'), 4, '★복원 직후 무대가 완료 국면(4)에서 시작한다');
  S.aniReplay('demo');
  eq(S.aniOf('demo'), 4, '★setTimeout 이 없어도 ⏮ 처음부터가 곧바로 완료 국면으로 간다');
  eq(S.ani.auto, false, '  → 자동 재생이 꺼진 채로 멈춘다');

  // demoLayout — 국면마다 무엇이 보이는가
  const EXP = [
    { tpl:1, mrna:0, start:0, dim:1,   aa:[0,0,0,0] },
    { tpl:1, mrna:1, start:0, dim:1,   aa:[0,0,0,0] },
    { tpl:1, mrna:1, start:1, dim:1,   aa:[0,0,0,0] },
    { tpl:1, mrna:1, start:1, dim:0.45,aa:[1,1,0,0] },
    { tpl:1, mrna:1, start:1, dim:0.45,aa:[1,1,1,1] }
  ];
  EXP.forEach((e, ph) => eqJ(S.demoLayout(ph), e, '★demoLayout(' + ph + ') 의 국면 상태'));
  eq(S.demoLayout(0).mrna, 0, '★① 에서는 mRNA 가 아직 없다 (전사 전이다)');
  eq(S.demoLayout(1).start, 0, '★② 에서는 개시코돈 표시가 아직 없다 (전사만 일어났다)');
  eq(S.demoLayout(2).aa[0], 0, '★③ 에서는 아미노산이 아직 하나도 붙지 않았다');
  ok(S.demoLayout(3).dim < S.demoLayout(2).dim, '④ 부터 DNA 주형이 흐려진다 (번역으로 눈이 옮겨간다)');
  for (let ph = 1; ph <= 4; ph++){
    const a = S.demoLayout(ph - 1), b = S.demoLayout(ph);
    ok(b.mrna >= a.mrna && b.start >= a.start, '국면 ' + ph + ' 에서 나타난 것이 도로 사라지지 않는다');
    ok(b.aa.every((v, i) => v >= a.aa[i]), '국면 ' + ph + ' 에서 붙은 아미노산이 떨어지지 않는다');
  }
  eq(S.demoLayout(99).aa.join(''), '1111', '범위를 넘는 국면은 마지막처럼 다룬다');

  // 손으로 넘기기 — 0..last 로 잘린다
  S.aniGo('demo', -99); eq(S.aniOf('demo'), 0, '★aniGo 가 0 아래로 내려가지 않는다');
  S.aniGo('demo', 1);   eq(S.aniOf('demo'), 1, 'aniGo(+1)');
  S.aniGo('demo', 99);  eq(S.aniOf('demo'), 4, '★aniGo 가 마지막 국면을 넘지 않는다');
  S.aniGo('demo', -1);  eq(S.aniOf('demo'), 3, 'aniGo(-1)');
  S.aniSkip('demo');    eq(S.aniOf('demo'), 4, '⏩ 끝까지');

  // 제어 막대
  S.aniGo('demo', -99);
  let bar = html(S, 'demoAni');
  ok(/⏮ 처음부터/.test(bar) && /◀ 이전/.test(bar) && /▶ 다음/.test(bar) && /⏩ 끝까지/.test(bar),
     '연출 제어 막대에 네 단추가 다 있다');
  ok(/<b>1 \/ 5<\/b>/.test(bar), '  → 첫 국면에서 「1 / 5」로 적힌다');
  ok(/◀ 이전"\s*disabled|◀ 이전[^<]*<\/button>/.test(bar), '  → 첫 국면에서 ◀ 이전이 꺼진다');
  ok(bar.indexOf('disabled') >= 0, '  → 꺼진 단추가 실제로 disabled 다');
  S.aniSkip('demo');
  bar = html(S, 'demoAni');
  ok(/<b>5 \/ 5<\/b>/.test(bar), '마지막 국면에서 「5 / 5」로 적힌다');
  ok((bar.match(/disabled/g) || []).length === 2, '  → 마지막에서 ▶ 다음·⏩ 끝까지 둘이 꺼진다');
  ok(/폴리펩타이드가 완성된다/.test(bar), '  → 마지막 국면 이름이 표시된다');
}

// ══ 7. ★답 공개 시점 — 이 활동의 급소 ══
console.log('[7] ★답 공개 시점 (아미노산은 앱이 말하지 않는다)');
{
  const AA_NAMES = Array.from(new Set(Object.keys(REF).map(c => REF[c])))
                        .sort((a, b) => b.length - a.length);   // ★긴 이름부터 — '글라이신' 이 '라이신' 으로 잘못 잡히지 않게
  function aaIn(h){
    let t = String(h); const out = [];
    AA_NAMES.forEach(a => { if (t.indexOf(a) >= 0){ out.push(a); t = t.split(a).join(''); } });
    return out.sort();
  }
  eqJ(aaIn('글라이신'), ['글라이신'], '(아미노산 이름 검출기가 부분 문자열에 속지 않는다)');
  eqJ(aaIn('아무 말도 없다'), [], '(검출기가 헛짚지 않는다)');
  const S = makeSandbox();

  // ⓐ 읽기틀을 고른 직후 — 코돈 글자만 있고 아미노산 이름이 없다
  S.pickFrame(0);
  let now4 = html(S, 'ctNow4');
  ok(now4.indexOf('CAU') >= 0, '★읽기틀을 고르면 지금 해독할 코돈 CAU 가 표시된다');
  eq(aaIn(now4).join(','), '', '★ⓐ 읽기틀을 고른 직후 #ctNow4 에 아미노산 이름이 하나도 없다');
  ok(/코돈표에서 직접 찾아 탭하시오/.test(now4), '  → 대신 「코돈표에서 직접 찾아 탭하시오」라고 이른다');
  ok(/왼쪽 세로축/.test(now4) && /위쪽 가로축/.test(now4) && /오른쪽 세로축/.test(now4),
     '  → 답 대신 표를 읽는 길(세 축)을 일러 준다');

  // ⓑ 해독 전 코돈표에 .cur 강조가 없다
  const curBefore = Object.keys(REF).filter(c => hasCls(S, 'c4_' + c, 'cur'));
  eq(curBefore.join(','), '', '★ⓑ 해독 전에는 코돈표 64칸 어디에도 .cur 강조가 없다');
  const foundBefore = Object.keys(REF).filter(c => hasCls(S, 'c4_' + c, 'found'));
  eq(foundBefore.join(','), '', '  → .found 도 붙어 있지 않다');
  ok(!!S._store['c4_CAU'], '  (코돈표 칸이 실제로 그려져 있다 — 검사가 헛돌지 않는다)');
  eq(Object.keys(REF).filter(c => !!S._store['c4_' + c]).length, 64, '  → ④ 의 코돈표 칸이 64개 다 있다');

  // 한 칸 해독하면 그 칸에만 .cur 가 붙는다
  S.ctTap4('CAU');
  const curAfter = Object.keys(REF).filter(c => hasCls(S, 'c4_' + c, 'cur'));
  eqJ(curAfter, ['CAU'], '★해독한 칸에만 .cur 가 붙는다 (미리 강조하면 그 자체가 정답 공개다)');
  now4 = html(S, 'ctNow4');
  eq(aaIn(now4).join(','), '', '★다음 코돈(GGU)을 알릴 때도 아미노산 이름은 없다');
  ok(now4.indexOf('GGU') >= 0, '  → 다음 코돈 글자만 바뀐다');

  // ⓒ 💡 는 지금 해독할 코돈 하나만 공개한다
  eq(S.state.hintCodon, null, '힌트를 쓰기 전 hintCodon 은 비어 있다');
  S.showCodonHint();
  eq(typeof S.state.hintCodon, 'string', '★ⓒ hintCodon 은 배열이 아니라 **단수**다');
  eq(S.state.hintCodon, 'GGU', '  → 지금 해독할 코돈 하나만 담긴다');
  now4 = html(S, 'ctNow4');
  eqJ(aaIn(now4), ['글라이신'], '★  → 화면에도 그 코돈의 아미노산 하나만 나온다');
  ok(now4.indexOf('히스티딘') < 0 && now4.indexOf('아스파라진') < 0, '  → 앞뒤 코돈의 답은 새지 않는다');
  S.ctTap4('GGU');
  eq(S.state.hintCodon, null, '★탭하고 나면 힌트가 도로 닫힌다 (다음 코돈까지 열려 있지 않다)');
  eq(aaIn(html(S, 'ctNow4')).join(','), '', '  → 다음 코돈은 다시 가려진다');
  eq(S.state.hintUsed, 1, '힌트를 쓴 횟수만 센다');

  // ⓓ ③ 의 코돈표에 종결·개시 칸이 미리 색칠돼 있지 않다
  eq(cssRule('.ce.stop'), '', '★ⓓ .ce.stop CSS 규칙이 아예 없다');
  eq(cssRule('.ce.start'), '', '★ⓓ .ce.start CSS 규칙이 아예 없다');
  const S3 = makeSandbox();
  let painted = [];
  Object.keys(REF).forEach(c => {
    const e = S3._store['c3_' + c];
    if (!e) return;
    Array.from(e._classes).forEach(k => { if (k !== 'ce' && painted.indexOf(k) < 0) painted.push(k); });
  });
  eq(painted.join(','), '', '★ⓓ ③ 의 64칸에 처음부터 붙은 표시가 하나도 없다 (색만 보고 찾기가 끝나지 않는다)');
  REF_STOP.forEach(c => ok(!hasCls(S3, 'c3_' + c, 'found'), '  종결코돈 ' + c + ' 칸이 미리 칠해져 있지 않다'));
  ok(!hasCls(S3, 'c3_AUG', 'found'), '  개시코돈 AUG 칸도 미리 칠해져 있지 않다');
  ok(/\.ce\.found\s*\{/.test(src) && /\.ce\.cur\s*\{/.test(src), '(찾은 칸·해독한 칸의 표시 규칙은 있다)');

  // ⓔ ④ 를 건드리지 않은 상태에서 ⑥ 모범답안이 열리지 않는다
  const S6 = makeSandbox();
  S6.WRITEQ.forEach(w => {
    eq(S6.ansGate(w.id).open, false, '★ⓔ ' + w.id + ' 모범답안이 처음에는 닫혀 있다');
    S6.toggleAns(w.id);
    const box = S6._store['ans_' + w.id];
    ok(!box || box.style.display !== 'block', '  → 눌러도 열리지 않는다');
    const btn = S6._store['ansBtn_' + w.id];
    eq(btn.disabled, true, '  → 단추가 꺼져 있다');
    ok(String(btn.textContent).indexOf('🔒') === 0, '  → 왜 잠겼는지 단추에 적혀 있다');
  });
}

// ══ 8. 조작 흐름 ══
console.log('[8] 조작 흐름 (틀린 칸 · 읽기틀 없이 탭 · 세 읽기틀 완주)');
{
  /* (1) 읽기틀을 고르지 않고 탭하면 아무 일도 없다
     ────────────────────────────────────────────────────────────────
     ★★여기가 지금 물리는 자리다 — 아래 넷은 **본체의 결함**을 드러낸다.
       init() 의 `var f = Number(state.frame)` 에서 Number(null) === 0 이므로
       **처음 들어온 학생에게 이미 「1번째 염기부터」가 골라져 있다.**
       그 틀이 곧 62쪽 해 보기 2의 답이라, 고르는 일 자체가 활동에서 사라진다.
       ctTap4 의 「먼저 읽기틀을 고르시오」 가드와 renderDecNow 의 안내 가지도 함께 죽는다.
       ⚠ 검사는 규칙을 문다 — 본체가 고쳐질 때까지 이 넷은 FAIL 로 남는다. */
  {
    const S = makeSandbox();
    eq(S.state.frame, null, '★처음에는 읽기틀이 골라져 있지 않다');
    ok(/읽기틀을 고르면/.test(html(S, 'ctNow4')), '★고르기 전에는 #ctNow4 가 「읽기틀을 고르면…」 안내다');
    ok(!/chip on/.test(html(S, 'frameChips')), '★고르기 전에는 읽기틀 칩이 하나도 켜져 있지 않다');
    S.ctTap4('CAU');
    eqJ(S.state.decN, {}, '★읽기틀을 고르지 않고 탭하면 해독이 시작되지 않는다');
  }
  // (2) 틀린 칸을 탭하면 해독되지 않는다
  {
    const S = makeSandbox();
    S.pickFrame(0);
    S.ctTap4('GGU');                          // 2번째 코돈 — 지금 차례가 아니다
    eq(S.decN(0), 0, '★차례가 아닌 칸을 탭하면 해독이 늘지 않는다');
    S.ctTap4('AAA');                          // 아예 관계없는 칸
    eq(S.decN(0), 0, '★관계없는 칸도 마찬가지다');
    const fb = html(S, 'fb_dec');
    ok(fb.indexOf('옳지 않다.') === 0 || /^옳지 않다\./.test(fb.replace(/<[^>]*>/g, '')),
       '  → 되돌림이 「옳지 않다.」로 시작한다');
    ok(/지금 해독할 코돈은 <b>CAU<\/b>/.test(fb), '  → 지금 차례의 코돈을 다시 알려 준다');
    eq(S._store['fb_dec'].className, 'msg bad', '  → 오답 표시가 붙는다');
    ok(!hasCls(S, 'c4_GGU', 'cur'), '  → 틀린 칸에 강조가 붙지 않는다');
  }
  // (3) 옳은 칸을 차례로 탭하면 세 읽기틀이 완료된다
  {
    const S = makeSandbox();
    [0,1,2].forEach(f => {
      S.pickFrame(f);
      const D = S.decode(S.MRNA, f);
      for (let i = 0; i < D.need; i++){
        eq(S.curCodon(), D.codons[i], '읽기틀 ' + f + ' 의 ' + (i+1) + '번째 차례는 ' + D.codons[i]);
        S.ctTap4(D.codons[i]);
      }
      ok(S.frameDone(f), '★읽기틀 ' + f + ' 해독 완료');
      eq(S.curCodon(), null, '  → 더 탭할 코돈이 없다');
      eq(S.decN(f), D.need, '  → 탭한 칸 수가 ' + D.need + ' 이다');
    });
    eq(S.decDoneCount(), 3, '★세 읽기틀을 모두 마쳤다');
    eq(txt(S, 'decProg'), '해독을 마친 읽기틀 3 / 3', '진행 꼬리표가 3 / 3 이다');

    // 마친 뒤 더 탭해도 늘지 않는다
    const before = S.decN(2);
    S.ctTap4('UAA');
    eq(S.decN(2), before, '해독을 마친 읽기틀은 더 늘지 않는다');
    ok(/해독을 마쳤다/.test(html(S, 'fb_dec')), '  → 마쳤다고 알린다');

    // 결과표 · 판정
    const ft = html(S, 'frameTable');
    ok(/4번째 코돈이 종결코돈/.test(ft), '★결과표가 2번째 틀의 종결 자리를 4번째 코돈이라 적는다');
    ok(/2번째 코돈이 종결코돈/.test(ft), '★결과표가 3번째 틀의 종결 자리를 2번째 코돈이라 적는다');
    ok(/종결코돈 없이<br>아미노산 8개/.test(ft), '★결과표가 1번째 틀을 「종결코돈 없이 아미노산 8개」로 적는다');
    ok(/아미노산 3개에서 끊긴다/.test(ft) && /아미노산 1개에서 끊긴다/.test(ft), '  → 끊긴 개수 3·1 도 맞다');
    const vd = html(S, 'decVerdict');
    ok(/4번째 코돈이 UGA/.test(vd), '★판정 카드가 UGA 를 지목한다');
    ok(/2번째 코돈이 UAA/.test(vd), '★판정 카드가 UAA 를 지목한다');
    ok(vd.indexOf(REF_F0_AA.join(' – ')) >= 0, '★판정 카드의 아미노산서열이 교과서 값과 같다');
    ok(/1번째 염기부터/.test(vd), '  → 살아남는 읽기틀을 못 박는다');

    // 폴리펩타이드 구슬
    S.pickFrame(0);
    ok(html(S, 'decPep').indexOf('히스티딘') >= 0, '폴리펩타이드 칸에 해독한 아미노산이 붙는다');
    S.pickFrame(2);
    ok(/종결코돈 — 여기서 끝난다/.test(html(S, 'decPep')), '종결코돈에서 끝났음을 폴리펩타이드 칸이 보인다');
  }
  // (4) ③ 찾기 — 아닌 칸은 받지 않고, 같은 칸을 두 번 세지 않는다
  {
    const S = makeSandbox();
    S.ctTap3('CAU');
    eq(S.findDoneCount(), 0, '★종결코돈이 아닌 칸은 받지 않는다');
    ok(/옳지 않다\./.test(html(S, 'fb_find').replace(/<[^>]*>/g, '')), '  → 「옳지 않다.」로 시작한다');
    ok(/히스티딘/.test(html(S, 'fb_find')), '  → 그 칸이 무엇인지는 알려 준다');
    S.ctTap3('UAA'); S.ctTap3('UAA');
    eq(S.findDoneCount(), 1, '★같은 칸을 두 번 탭해도 하나로 센다');
    ok(/이미 찾은 칸이다/.test(html(S, 'fb_find')), '  → 이미 찾았다고 알린다');
    S.ctTap3('UAG'); S.ctTap3('UGA');
    eq(S.findListOf('stop').length, 3, '종결코돈 3개를 다 찾았다');
    S.ctTap3('AUG');
    eq(S.findListOf('start').length, 1, '개시코돈 1개를 찾았다');
    REF_LEU.forEach(c => S.ctTap3(c));
    eq(S.findListOf('leu').length, 6, '류신 코돈 6개를 다 찾았다');
    eq(S.findDoneCount(), 10, '★찾은 칸이 10개다');
    eq(txt(S, 'findProg'), '찾은 칸 10 / 10', '진행 꼬리표가 10 / 10 이다');
    REF_STOP.concat(['AUG']).concat(REF_LEU).forEach(c =>
      ok(hasCls(S, 'c3_' + c, 'found'), '찾은 칸 ' + c + ' 에 표시가 붙었다'));
    eq(Object.keys(REF).filter(c => hasCls(S, 'c3_' + c, 'found')).length, 10, '  → 표시가 붙은 칸도 정확히 10개다');
    S.ctTap3('UUU');
    ok(/모두 마쳤다/.test(html(S, 'fb_find')), '다 찾은 뒤에는 마쳤다고만 알린다');
  }
  // (5) ② RNA 놓기 — 틀린 짝은 들어가지 않는다
  {
    const S = makeSandbox();
    S.placeRna('info', 'tRNA');
    eqJ(S.state.rnaSlot, {}, '★틀린 RNA 는 자리에 놓이지 않는다');
    ok(/옳지 않다\./.test(html(S, 'fb_rna').replace(/<[^>]*>/g, '')), '  → 「옳지 않다.」로 시작한다');
    S.placeRna('info', 'mRNA'); S.placeRna('ribo', 'rRNA'); S.placeRna('carry', 'tRNA');
    eq(S.rnaDoneCount(), 3, '세 자리를 다 채웠다');
    eqJ(S.RNA_SLOTS.map(s => s.id + ':' + s.aa), ['info:mRNA','ribo:rRNA','carry:tRNA'],
        '★mRNA=정보 전달 / rRNA=라이보솜 구성 / tRNA=아미노산 운반');
    ok(/정보를 라이보솜에 전달/.test(S.rnaSlotById('info').label), 'mRNA 자리의 설명이 정보 전달이다');
    ok(/라이보솜을 구성하는 주요 성분으로 단백질합성을 촉진/.test(S.rnaSlotById('ribo').label),
       'rRNA 자리의 설명이 라이보솜 구성·단백질합성 촉진이다');
    ok(/아미노산을 라이보솜으로 운반/.test(S.rnaSlotById('carry').label), 'tRNA 자리의 설명이 아미노산 운반이다');
    eqJ(S.RNA_SLOTS.map(s => s.full), ['전령 RNA','라이보솜 RNA','운반 RNA'], '풀이름 세 가지');
  }
  // (6) ⑤ 예상 없이 확인하면 막는다 / 확인 뒤 예상을 바꾸지 못한다
  {
    const S = makeSandbox();
    S.runMut(10);
    eqJ(S.state.mutRun, {}, '★예상하지 않고 확인하면 바꾸지 않는다');
    ok(/먼저 결과를 예상하시오/.test(html(S, 'fb_mut')), '  → 먼저 예상하라고 이른다');
    S.guessMut(10, 1);        // 일부러 틀린 예상
    S.runMut(10);
    eq(S.state.mutRun['10'], true, '예상한 뒤에는 확인된다');
    ok(/예상과 다르다/.test(html(S, 'fb_mut')), '  → 예상과 다르다고 알린다');
    ok(/메싸이오닌/.test(html(S, 'fb_mut')), '  → 실제 결과(메싸이오닌)를 알려 준다');
    S.guessMut(10, 0);
    eq(S.state.mutGuess['10'], 1, '★확인한 자리의 예상은 나중에 고쳐지지 않는다');
    S.guessMut(12, 1); S.runMut(12);
    ok(/예상대로이다/.test(html(S, 'fb_mut')), '맞게 예상하면 예상대로라고 알린다');
    S.guessMut(17, 2); S.runMut(17);
    eq(S.mutDoneCount(), 3, '세 자리를 다 확인했다');
    ok(/셋으로 갈렸다/.test(html(S, 'mutSummary')), '★세 자리를 다 마치면 결론 카드가 뜬다');
    const mt = html(S, 'mutTable');
    ok(mt.indexOf(REF_F0_AA.join(' – ')) >= 0, '표에 원래 아미노산서열이 있다');
    ok(/🛑 종결/.test(mt), '17번 행에 종결 표시가 있다');
  }
}

// ══ 9. 진행·완료 판정 ══
console.log('[9] 진행·완료 판정 (5단계 · 💪 는 들어가지 않는다)');
{
  const S = makeSandbox();
  eq(S.STEPS.length, 5, '★단계가 5개다');
  eqJ(S.STEPS.map(s => s.key), ['intro','rna','find','dec','mut'], '단계 키 5개');
  eqJ(S.STEPS.map(s => s.no), ['①','②','③','④','⑤'], '단계 번호 ①~⑤');
  eq(S.doneCount(), 0, '처음에는 0 단계');
  eq(txt(S, 'progress'), '진행 0 / 5', '★배지가 「진행 0 / 5」다');
  S.STEPS.forEach(s => eq(S.stepDone(s.key), false, '  ' + s.no + ' 은 아직 미완료'));
  eq(S.stepDone('없는단계'), false, '없는 단계는 false 다');

  // 조작만 하고 결론 문항을 안 풀면 완료가 아니다
  [1,2,3].forEach(n => S.pickCode(n));
  eq(S.codeDoneCount(), 3, '① 묶음 3가지를 다 눌렀다');
  eq(S.stepDone('intro'), false, '★조작만으로는 ① 이 완료되지 않는다 (결론 문항이 남았다)');
  S.pickQ('i1', S.qById('i1').a);
  eq(S.stepDone('intro'), true, '★조작 + 결론 문항이 다 되면 ① 이 완료된다');
  eq(txt(S, 'progress'), '진행 1 / 5', '배지가 1 / 5 로 오른다');

  // 문항만 풀고 조작을 안 해도 완료가 아니다
  S.pickQ('r1', S.qById('r1').a);
  eq(S.stepDone('rna'), false, '★문항만 풀어서는 ② 가 완료되지 않는다');

  // 나머지 다 채우기
  S.RNA_SLOTS.forEach(s => S.placeRna(s.id, s.aa));
  S.FIND_TASKS.forEach(t => t.need.forEach(c => S.ctTap3(c)));
  S.pickQ('f1', S.qById('f1').a);
  [0,1,2].forEach(f => { S.pickFrame(f); const D = S.decode(S.MRNA, f); for (let i = 0; i < D.need; i++) S.ctTap4(D.codons[i]); });
  S.pickQ('d1', S.qById('d1').a);
  S.MUTS.forEach(m => { S.guessMut(m.pos, S.mutKindIndex(m.kind)); S.runMut(m.pos); });
  S.pickQ('m1', S.qById('m1').a);
  eq(S.doneCount(), 5, '★다섯 단계를 모두 마쳤다');
  eq(txt(S, 'progress'), '진행 5 / 5', '★배지가 「진행 5 / 5」다');
  eqJ(S.state.pPick, {}, '★이때 💪 는 한 문항도 풀지 않았다');
  ok(html(S, 'rail').indexOf('rstep ok') >= 0, '진행 레일에 완료 표시가 붙는다');
  eq((html(S, 'rail').match(/rstep ok/g) || []).length, 5, '  → 다섯 칸 모두 완료 표시다');
  eq((html(S, 'rail').match(/rstep on/g) || []).length, 0, '  → 잠긴 칸은 없다 (진행 중 표시만 쓴다)');

  // 💪 를 풀어도 완료 수는 그대로다
  S.PRACTICE.forEach(p => S.pickQ(p.id, p.a));
  eq(S.doneCount(), 5, '★💪 를 풀어도 완료 단계 수는 5 그대로다');
  eq(txt(S, 'pracProg'), '푼 문항 4 / 4', '💪 는 따로 센다');
  eq(Object.keys(S.state.pPick).length, 4, '💪 의 답은 pPick 에만 담긴다');
  eq(Object.keys(S.state.qPick).length, 5, '  → 결론 문항은 qPick 에만 담긴다');
  eq(S._missing.join(','), '', '★getElementById 로 없는 id 를 찾은 일이 없다 (id 오타 없음)');
}

// ══ 10. 문항 ══
console.log('[10] 문항 (정답 범위 · no 길이 · 되돌림 · 쏠림 · 최장 선지)');
{
  const S = makeSandbox();
  const ALL = S.ALLQ();
  eq(ALL.length, 9, '선택형 문항이 모두 9개다');
  eq(S.Q_INTRO.length, 1, '① 결론 1문항');
  eq(S.Q_RNA.length, 1, '② 결론 1문항');
  eq(S.Q_FIND.length, 1, '③ 결론 1문항');
  eq(S.Q_DEC.length, 1, '④ 결론 1문항');
  eq(S.Q_MUT.length, 1, '⑤ 결론 1문항');
  eq(S.PRACTICE.length, 4, '★💪 더 풀어 보기 4문항');

  // id 규칙
  const ids = ALL.map(p => p.id);
  eq(new Set(ids).size, ids.length, '★문항 id 가 활동 전체에서 유일하다');
  S.PRACTICE.forEach(p => ok(p.id.indexOf('p') === 0, '★💪 문항 ' + p.id + ' 은 p 로 시작한다'));
  [].concat(S.Q_INTRO, S.Q_RNA, S.Q_FIND, S.Q_DEC, S.Q_MUT).forEach(p =>
    ok(p.id.indexOf('p') !== 0, '★결론 문항 ' + p.id + ' 은 p 로 시작하지 않는다 (pickStore 가 갈린다)'));
  ALL.forEach(p => eq(S.pickStore(p.id), p.id.indexOf('p') === 0 ? S.state.pPick : S.state.qPick,
    '  ' + p.id + ' 이 제 저장칸으로 간다'));

  // 문항 하나하나
  ALL.forEach(p => {
    ok(Array.isArray(p.ch) && p.ch.length === 4, p.id + ' 선지가 4개다');
    ok(Number.isInteger(p.a) && p.a >= 0 && p.a < p.ch.length, '★' + p.id + ' 정답 자리 a 가 범위 안이다');
    ok(Array.isArray(p.no) && p.no.length === p.ch.length, '★' + p.id + ' no 길이 = ch 길이');
    eq(p.no[p.a], '', '★' + p.id + ' 정답 자리의 no 는 빈 문자열이다');
    p.no.forEach((t, i) => {
      if (i === p.a) return;
      ok(t.indexOf('옳지 않다.') === 0, '★' + p.id + ' 의 ' + i + '번 되돌림이 「옳지 않다.」로 시작한다');
      ok(t.length > 12, '  ' + p.id + '/' + i + ' 되돌림에 까닭이 이어진다');
    });
    ok(/[?？]\s*$/.test(p.q.trim()), '★' + p.id + ' 발문이 물음표로 끝난다');
    ok(typeof p.ex === 'string' && p.ex.length > 30, p.id + ' 해설이 있다');
    eq(new Set(p.ch).size, p.ch.length, p.id + ' 선지가 서로 다르다');
    if (p.hint !== undefined){
      ok(Array.isArray(p.hint) && p.hint.length === 2, '★' + p.id + ' 힌트가 있으면 2단이다');
      ok(p.hint.every(h => typeof h === 'string' && h.length > 10), '  ' + p.id + ' 힌트 두 줄이 비어 있지 않다');
    }
    if (p.lv !== undefined) ok(['중','상'].indexOf(p.lv) >= 0, p.id + ' 난도 표시가 중·상 중 하나다');
    // ★정답이 단독 최장 선지가 아니다
    const lens = p.ch.map(c => c.replace(/<[^>]*>/g, '').length);
    const mx = Math.max.apply(null, lens);
    ok(!(lens[p.a] === mx && lens.filter(l => l === mx).length === 1),
       '★' + p.id + ' 의 정답이 단독 최장 선지가 아니다 (정답 ' + lens[p.a] + ' / 최장 ' + mx + ')');
  });

  // 힌트는 상 문항에만
  eq(S.PRACTICE.filter(p => p.lv === '상').length, 2, '💪 에 상 문항이 2개다');
  eq(S.PRACTICE.filter(p => p.lv === '중').length, 2, '💪 에 중 문항이 2개다');
  S.PRACTICE.filter(p => p.lv === '상').forEach(p => ok(!!p.hint, '★상 문항 ' + p.id + ' 에 힌트가 있다'));

  // 정답 위치 쏠림
  const cntA = [0,0,0,0];
  ALL.forEach(p => cntA[p.a]++);
  ok(cntA.every(c => c > 0), '★네 선지 자리가 모두 한 번은 정답이다 (' + cntA.join('/') + ')');
  ok(Math.max.apply(null, cntA) <= Math.ceil(ALL.length / 2),
     '★한 자리에 정답이 절반을 넘게 몰리지 않았다 (최다 ' + Math.max.apply(null, cntA) + ' / ' + ALL.length + ')');

  // 교과서 값과 문항이 어긋나지 않는가 — 계산으로 되짚는다
  {
    // p4: 17번 C→A 면 아미노산 5개
    const p4 = S.qById('p4');
    eq(refDecode(S.mutSeq(17), 0).aas.length, 5, '★p4 의 답「아미노산 5개」가 계산과 맞는다');
    ok(p4.ch[p4.a].indexOf('5개') >= 0, '  → 정답 선지가 5개를 가리킨다');
    // p1: 첫 염기가 없어지면 4번째 코돈에서 끝난다
    const p1 = S.qById('p1');
    const shifted = refDecode(REF_MRNA.slice(1), 0);
    eq(shifted.stopAt, 3, '★p1 의 답「네 번째 코돈에서 끝난다」가 계산과 맞는다');
    eq(shifted.aas.length, 3, '  → 아미노산 3개가 만들어진다');
    ok(p1.ch[p1.a].indexOf('네 번째 코돈') >= 0, '  → 정답 선지가 네 번째 코돈을 가리킨다');
    // p3: 5종류·2염기조합 = 25가지
    eq(Math.pow(5, 2), 25, '★p3 의 답 25가지');
    const p3 = S.qById('p3');
    eq(p3.ch[p3.a], '25가지', '  → 정답 선지가 25가지다');
    // i1: 3개씩 묶어야 20종류를 넘긴다
    const i1 = S.qById('i1');
    eq([1,2,3,4].find(n => Math.pow(4, n) >= 20), 3, '★i1 의 답「3개씩」이 계산과 맞는다');
    ok(i1.ch[i1.a].indexOf('3개씩') === 0, '  → 정답 선지가 3개씩이다');
    // f1: 61 - 20 의 중복성
    const f1 = S.qById('f1');
    ok(/여러 개인 경우가 많다/.test(f1.ch[f1.a]), '★f1 의 답이 중복성을 가리킨다');
    ok(f1.no[1].indexOf('종결코돈 3개뿐') > 0, '  → 오답 되돌림이 종결코돈 3개를 짚는다');
  }

  // 선지를 고르면 채점 표시와 해설이 붙는다
  {
    const T = makeSandbox();
    const p = T.qById('i1'), wrong = (p.a + 1) % 4;
    T.pickQ('i1', wrong);
    const els = T.qEls['i1'];
    eq(els.choices[p.a].className, 'choice right', '★정답 선지에 right 표시가 붙는다');
    eq(els.choices[wrong].className, 'choice picked', '  → 고른 선지에 picked 표시가 붙는다');
    eq(els.expl.style.display, 'block', '  → 해설이 열린다');
    ok(els.expl.innerHTML.indexOf('<b>❌ ' + p.no[wrong]) === 0, '★오답이면 그 자리의 되돌림이 먼저 나온다');
    ok(els.expl.innerHTML.indexOf(p.ex) > 0, '  → 해설은 정오와 무관하게 함께 보인다');
    T.pickQ('i1', p.a);
    ok(T.qEls['i1'].expl.innerHTML.indexOf('<b>✅ 옳다.</b>') === 0, '정답이면 「옳다.」로 시작한다');
    eq(T.qEls['i1'].choices[p.a].className, 'choice right', '  → 정답 표시는 그대로다');
  }
}

// ══ 11. ⑥ 정리하기 ══
console.log('[11] ⑥ 정리하기 (서술 4 · 자수 잠금 · 자기평가 3줄)');
{
  const S = makeSandbox();
  eq(S.WRITEQ.length, 4, '★서술형이 4문항이다 (서술 3 + 창의력 1)');
  eqJ(S.WRITEQ.map(w => w.min), [60, 80, 60, 100], '자수 잠금 값 60·80·60·100');
  eq(S.WRITEQ.filter(w => w.creative).length, 1, '창의력 문항이 1개다');
  eq(S.WRITEQ[3].creative, true, '  → 마지막 문항이 창의력이다');
  eq(new Set(S.WRITEQ.map(w => w.id)).size, 4, '서술 id 가 유일하다');
  /* ★renderWrite 는 .qwrap 을 appendChild 로 붙인다 — writeBox.innerHTML 이 아니라 자식을 본다 */
  eq(S._store['writeBox'].children.length, 4, '⑥ 에 서술 카드가 4장 그려졌다');
  S.WRITEQ.forEach((w, i) => {
    const card = S._store['writeBox'].children[i].innerHTML;
    ok(typeof w.min === 'number' && w.min >= 60, w.id + ' 의 자수 잠금이 60자 이상이다');
    ok(Array.isArray(w.need) && w.need.length >= 3, '★' + w.id + ' 에 「답안에 반드시 들어가야 할 것」이 3가지 이상 있다');
    ok(w.need.every(n => typeof n === 'string' && n.length > 5), '  ' + w.id + ' need 항목이 비어 있지 않다');
    ok(/시오\.\s*$/.test(w.q.replace(/<[^>]*>/g, '').trim()), '★' + w.id + ' 발문이 「~하시오.」로 끝난다');
    ok(typeof w.ans === 'string' && w.ans.length >= w.min, '  ' + w.id + ' 모범답안이 자수 잠금보다 길다');
    ok(!!S._store['ta_' + w.id], '  ' + w.id + ' 의 서술칸이 화면에 있다');
    ok(card.indexOf(w.min + '자 이상') >= 0, '  ' + w.id + ' 의 잠금 자수가 화면에 적혀 있다');
    ok(card.indexOf('답안에 반드시 들어가야 할 것') >= 0, '  ' + w.id + ' 에 요소 안내가 붙어 있다');
    w.need.forEach(n => ok(card.indexOf(n) >= 0, '  ' + w.id + ' 의 need「' + n.slice(0, 12) + '」이 화면에 나온다'));
    ok(card.indexOf(w.ans) >= 0, '  ' + w.id + ' 의 모범답안이 카드 안에 들어 있다 (열기 전에는 감춰져 있다)');
    eq(S._store['ans_' + w.id].style.display, 'none', '  ' + w.id + ' 의 모범답안 칸이 닫혀 있다');
  });

  // 교과서 값이 모범답안에 그대로 들어 있는가
  ok(S.WRITEQ[1].ans.indexOf('히스티딘') >= 0 && S.WRITEQ[1].ans.indexOf('알라닌') >= 0,
     '★w2 모범답안에 아미노산서열이 있다');
  ok(/UGA/.test(S.WRITEQ[1].ans) && /UAA/.test(S.WRITEQ[1].ans), '★w2 모범답안이 UGA·UAA 를 짚는다');
  ok(/GUG/.test(S.WRITEQ[2].ans) && /AUG/.test(S.WRITEQ[2].ans) && /메싸이오닌/.test(S.WRITEQ[2].ans),
     '★w3 모범답안이 GUG→AUG·메싸이오닌을 짚는다');

  // 자수 잠금
  {
    const w = S.WRITEQ[0], el = S._store['ta_' + w.id];
    el.value = '가'.repeat(w.min - 1); S.onTa(w.id);
    eq(S.ansGate(w.id).open, false, '★' + (w.min - 1) + '자에서는 모범답안이 닫혀 있다');
    ok(/자 이상 서술해야 열린다/.test(S.ansGate(w.id).reason), '  → 왜 닫혔는지 말해 준다');
    el.value = '가'.repeat(w.min); S.onTa(w.id);
    eq(S.ansGate(w.id).open, true, '★' + w.min + '자에서 열린다');
    S.toggleAns(w.id);
    eq(S._store['ans_' + w.id].style.display, 'block', '  → 눌러서 열린다');
    S.toggleAns(w.id);
    eq(S._store['ans_' + w.id].style.display, 'none', '  → 다시 눌러서 닫힌다');
    // ★공백만으로는 열리지 않는다
    el.value = ' '.repeat(w.min * 3); S.onTa(w.id);
    eq(S.ansGate(w.id).open, false, '★공백만 ' + (w.min * 3) + '칸을 넣어도 열리지 않는다');
    el.value = '\n\t '.repeat(w.min); S.onTa(w.id);
    eq(S.ansGate(w.id).open, false, '★줄바꿈·탭만으로도 열리지 않는다');
    eq(txt(S, 'cnt_' + w.id), '0자', '  → 글자 수도 0자로 센다');
    eq(txt(S, 'writeProg'), '작성한 문항 0 / 4', '  → 작성 꼬리표도 0 으로 센다');
  }

  // 자기평가 3줄
  eq(S.SELFCHECK.length, 3, '★자기평가가 3줄이다');
  eqJ(S.SELFCHECK.map(s => s.k), ['지식·이해','과정·기능','가치·태도'],
      '★지식·이해 / 과정·기능 / 가치·태도 3영역이다');
  S.SELFCHECK.forEach(s => {
    ok(/는가\?\s*$/.test(s.t.trim()), '★자기평가 ' + s.id + ' 가 물음으로 끝난다');
    ok(!!S._store['self_' + s.id], '  ' + s.id + ' 체크상자가 화면에 있다');
  });
  S._store['self_s1'].checked = true; S.onSelf('s1');
  eq(S.state.self.s1, true, '자기평가 체크가 상태에 남는다');

  // ⑥ 는 처음부터 열려 있다 — 다른 칸과 무관하다
  {
    const T = makeSandbox();
    const w = T.WRITEQ[2], el = T._store['ta_' + w.id];
    el.value = '가'.repeat(w.min); T.onTa(w.id);
    eq(T.ansGate(w.id).open, true, '★④ 를 하지 않아도 ⑥ 은 자수만 채우면 열린다 (잠금이 없다)');
    eq(T.doneCount(), 0, '  → 그래도 완료 단계 수는 0 이다 (⑥ 은 완료 판정에 들어가지 않는다)');
  }
}

// ══ 12. 저장·복원 ══
console.log('[12] 저장·복원 (seq · 망가진 blob · 범위 밖 값 · 완료 국면)');
{
  const LS = 'codon_sim_v1';

  // (1) seq — 저장소가 더 새로우면 덮지 않는다
  {
    const S = makeSandbox();
    S.pickCode(1);
    const a = stored(S);
    ok(a && typeof a.seq === 'number', '저장분에 seq 가 있다');
    S.pickCode(2);
    ok(stored(S).seq > a.seq, '★저장할 때마다 seq 가 오른다');

    const newer = Object.assign({}, stored(S), { seq: 9999, codeRun:{} });
    S.localStorage._mem[LS] = JSON.stringify(newer);
    S.pickCode(3);
    eq(stored(S).seq, 9999, '★저장소의 seq 가 더 크면 덮어쓰지 않는다 (두 탭이 서로를 지우지 않는다)');
    eqJ(stored(S).codeRun, {}, '  → 저장분의 내용도 그대로다');
    eq(S._store['tabWarn'].className, 'msg bad', '★대신 다른 탭이 열려 있다고 알린다');
    ok(/다른 탭에서도 열려 있다/.test(html(S, 'tabWarn')), '  → 무엇을 해야 하는지 적혀 있다');
  }
  // (2) 망가진 blob
  ['{{{ 아님', '', 'null', '[1,2,3]', '"문자열"'].forEach(bad => {
    let S = null, threw = false;
    try { S = makeSandbox({ seed:{ [LS]:bad } }); } catch(e){ threw = true; }
    ok(!threw, '★망가진 저장분(' + JSON.stringify(bad).slice(0, 12) + ')에도 죽지 않는다');
    if (S){
      eq(S.doneCount(), 0, '  → 처음 상태로 시작한다');
      eqJ(S.state.decN, {}, '  → 해독 기록도 비어 있다');
    }
  });
  /* (2-2) ★★본체의 결함 — 스칼라 칸이 복원되지 않는다.
     freshState() 에서 frame·codeLast·hintCodon·mutNow 가 모두 null 인데
     init() 의 병합이 `typeof state[k] === 'object'` 로 갈린다. **typeof null 은 'object'** 라
     저장된 숫자·문자열이 「객체가 아니다」라는 이유로 버려진다.
     → 새로고침하면 고른 읽기틀·고른 묶음 크기·열어 둔 힌트·적용한 치환 자리가 사라진다. */
  {
    const seed = JSON.stringify({
      seq:1, codeRun:{ '3':true }, codeLast:3, rnaSlot:{}, find:{},
      frame:1, decN:{ '1':2 }, hintCodon:'AUG', hintUsed:1,
      mutGuess:{}, mutRun:{}, mutNow:10, qPick:{}, pPick:{}, ta:{}, self:{}, teacherUnlock:false
    });
    const S = makeSandbox({ seed:{ [LS]: seed } });
    eq(S.state.decN['1'], 2, '(대조군) 객체 칸 decN 은 제대로 복원된다');
    eq(S.state.hintUsed, 1, '(대조군) 숫자 칸 hintUsed 는 제대로 복원된다');
    eq(S.state.frame, 1, '★고른 읽기틀(1)이 복원된다');
    eq(S.state.codeLast, 3, '★마지막으로 고른 묶음 크기(3)가 복원된다');
    eq(S.state.hintCodon, 'AUG', '★열어 둔 힌트 코돈이 복원된다');
    eq(S.state.mutNow, 10, '★적용해 둔 치환 자리가 복원된다');
  }
  // (3) 없는 이름 · 범위 밖 값
  {
    const seed = JSON.stringify({
      seq: 3,
      codeRun:{ '1':true }, codeLast: 9,
      rnaSlot:{ info:'tRNA' },
      find:{ stop:['UAA','UAA','AAA','ZZZ'], start:['CCC'], leu:['UUA'] },
      frame: 7,
      decN:{ '0': 99, '1': -3, '9': 5 },
      hintCodon:'ZZZ',
      mutGuess:{ '10':1 }, mutRun:{}, mutNow: 99,
      qPick:{}, pPick:{}, ta:{}, self:{},
      teacherUnlock: true,
      유령칸:'있으면 안 된다'
    });
    const S = makeSandbox({ seed:{ [LS]: seed } });
    eq(S.state.유령칸, undefined, '★freshState 에 없는 칸은 복원되지 않는다');
    eq(S.state.codeLast, null, '★범위 밖 codeLast(9) 가 걸러진다');
    eq(S.state.frame, null, '★범위 밖 frame(7) 이 걸러진다');
    eqJ(S.state.find.stop, ['UAA'], '★찾은 칸에서 중복·엉뚱한 코돈이 걸러진다');
    eqJ(S.state.find.start, [], '★개시코돈 자리의 엉뚱한 값(CCC)이 걸러진다');
    eqJ(S.state.find.leu, ['UUA'], '옳은 값은 남는다');
    eq(S.findDoneCount(), 2, '  → 찾은 칸 수는 2 로 센다');
    eq(S.state.decN['0'], S.decode(S.MRNA, 0).need, '★넘치는 decN(99) 이 그 읽기틀의 최대값으로 깎인다');
    eq(S.state.decN['1'], undefined, '★음수 decN 은 지워진다');
    eq(S.state.hintCodon, null, '★없는 코돈의 힌트가 걸러진다');
    eq(S.state.mutNow, null, '★없는 돌연변이 자리가 걸러진다');
    eq(S.state.rnaSlot.info, 'tRNA', '(저장분의 rnaSlot 은 그대로 복원된다)');
    eq(S.rnaDoneCount(), 0, '  → 다만 틀린 짝이라 맞은 자리로 세지 않는다');
    eq(S.state.teacherUnlock, false, '★저장분에 teacherUnlock 이 남아 있어도 잠긴 채로 시작한다');
    eq(S._missing.join(','), '', '  → 복원 경로에서도 id 오타가 없다');
  }
  // (4) teacherUnlock 은 저장되지 않는다
  {
    const S = makeSandbox();
    for (let i = 0; i < 5; i++) S.tapProgress();
    eq(S._rec.confirms, 1, '★진행 배지 5연타로 확인 대화상자가 뜬다');
    eq(S.state.teacherUnlock, true, '  → 이 화면에서는 풀린다');
    eq(S.WRITEQ.every(w => S.ansGate(w.id).open), true, '  → 모범답안이 열린다');
    eq(stored(S).teacherUnlock, false, '★그런데 저장분에는 false 로만 남는다');
    const S2 = makeSandbox({ seed:{ [LS]: S.localStorage._mem[LS] } });
    eq(S2.state.teacherUnlock, false, '★새로고침하면 도로 잠긴다');
    // 취소하면 풀리지 않는다
    const S3 = makeSandbox({ confirmRet:false });
    for (let i = 0; i < 5; i++) S3.tapProgress();
    eq(S3.state.teacherUnlock, false, '★확인 대화상자를 취소하면 풀리지 않는다');
  }
  // (5) 복원 뒤 무대가 완료 국면에서 시작한다 + 실제 값이 되살아난다
  {
    const A = makeSandbox();
    A.pickFrame(0);
    const D = A.decode(A.MRNA, 0);
    for (let i = 0; i < D.need; i++) A.ctTap4(D.codons[i]);
    A.FIND_TASKS.forEach(t => t.need.forEach(c => A.ctTap3(c)));
    A.WRITEQ.forEach(w => { A._store['ta_' + w.id].value = '가'.repeat(w.min); A.onTa(w.id); });

    const B = makeSandbox({ seed:{ [LS]: A.localStorage._mem[LS] } });
    ok(B.frameDone(0), '★해독한 읽기틀이 되살아난다');
    eq(B.findDoneCount(), 10, '★찾은 칸 10개가 되살아난다');
    eq(B.WRITEQ.every(w => B.ansGate(w.id).open), true, '★서술 답안이 되살아나 모범답안이 열린 채다');
    eq(B._store['ta_w1'].value, '가'.repeat(B.WRITEQ[0].min), '  → 서술칸에 글자가 다시 채워진다');
    eq(txt(B, 'cnt_w1'), B.WRITEQ[0].min + '자', '  → 글자 수도 다시 센다');
    eq(B.aniOf('demo'), B.aniLast('demo'), '★복원한 무대가 완료 국면에서 시작한다 (결과를 도로 감추지 않는다)');
    eq(B.ani.auto, false, '  → 연출을 처음부터 다시 돌리지 않는다');
    eq(hasCls(B, 'c3_UAA', 'found'), true, '  → 찾은 칸 표시도 그려진다');
  }
}

// ══ 13. 섹션별 되돌리기 ══
console.log('[13] 섹션별 되돌리기 (다른 칸이 살아 있는가)');
{
  function finishAll(S){
    [1,2,3].forEach(n => S.pickCode(n));
    S.RNA_SLOTS.forEach(s => S.placeRna(s.id, s.aa));
    S.FIND_TASKS.forEach(t => t.need.forEach(c => S.ctTap3(c)));
    [0,1,2].forEach(f => { S.pickFrame(f); const D = S.decode(S.MRNA, f); for (let i = 0; i < D.need; i++) S.ctTap4(D.codons[i]); });
    S.MUTS.forEach(m => { S.guessMut(m.pos, S.mutKindIndex(m.kind)); S.runMut(m.pos); });
    ['i1','r1','f1','d1','m1'].forEach(id => S.pickQ(id, S.qById(id).a));
    S.PRACTICE.forEach(p => S.pickQ(p.id, p.a));
    S.WRITEQ.forEach(w => { S._store['ta_' + w.id].value = '가'.repeat(w.min); S.onTa(w.id); });
    S.SELFCHECK.forEach(s => { S._store['self_' + s.id].checked = true; S.onSelf(s.id); });
    return S;
  }
  eqJ(Object.keys(makeSandbox().SEC_DEF), ['intro','rna','find','dec','mut','prac','write'],
      '되돌리기 칸이 7개다 (①②③④⑤ · 💪 · ⑥)');

  // (1) ④ 를 되돌리면 ⑤ 는 함께 지워지고 ①②③⑥ 은 그대로다
  {
    const S = finishAll(makeSandbox());
    eq(S.doneCount(), 5, '(먼저 전부 마쳤다)');
    S.resetSec('dec');
    eq(S._rec.confirms, 1, '★④ 는 확인 대화상자를 먼저 띄운다');
    eq(S.state.frame, null, '★④ 의 읽기틀이 지워졌다');
    eqJ(S.state.decN, {}, '★④ 의 해독이 지워졌다');
    eq(S.state.hintCodon, null, '  → 힌트도 닫혔다');
    eq(S.state.qPick.d1, undefined, '  → ④ 의 결론 문항도 지워졌다');
    eqJ(S.state.mutGuess, {}, '★④ 의 산물인 ⑤ 의 예상도 함께 지워졌다');
    eqJ(S.state.mutRun, {}, '★  → ⑤ 의 확인 결과도 함께 지워졌다');
    eq(S.state.mutNow, null, '  → ⑤ 의 적용 자리도 비었다');
    eq(S.state.qPick.m1, undefined, '  → ⑤ 의 결론 문항도 함께 지워졌다');
    // ★다른 칸은 살아 있다
    eq(S.codeDoneCount(), 3, '★① 의 조작은 그대로다');
    eq(S.state.qPick.i1 !== undefined, true, '★① 의 문항 답도 그대로다');
    eq(S.rnaDoneCount(), 3, '★② 는 그대로다');
    eq(S.state.qPick.r1 !== undefined, true, '★② 의 문항 답도 그대로다');
    eq(S.findDoneCount(), 10, '★③ 에서 찾은 칸은 그대로다');
    eq(S.state.qPick.f1 !== undefined, true, '★③ 의 문항 답도 그대로다');
    eq(Object.keys(S.state.pPick).length, 4, '★💪 의 답도 그대로다');
    eq(S.WRITEQ.every(w => S.ansGate(w.id).open), true, '★⑥ 에 적은 답안도 그대로다');
    eq(S._store['ta_w1'].value.length, S.WRITEQ[0].min, '  → 서술칸의 글자가 지워지지 않았다');
    eq(S.state.self.s1, true, '★자기평가 체크도 그대로다');
    eq(S._rec.reloads, 0, '★resetSec 는 새로고침하지 않는다');
    eq(S.doneCount(), 3, '  → 완료 단계는 ④⑤ 만큼 줄어 3 이 된다');
    ok(/④ 의 해독과 문항을 지웠다/.test(html(S, 'fb_dec')), '  → 무엇을 지웠는지 알린다');
    // ★되돌린 뒤 곧바로 다시 마칠 수 있다
    S.pickFrame(0);
    const D = S.decode(S.MRNA, 0);
    for (let i = 0; i < D.need; i++) S.ctTap4(D.codons[i]);
    ok(S.frameDone(0), '★되돌린 직후 곧바로 다시 해독할 수 있다');
    S.guessMut(10, 0); S.runMut(10);
    eq(S.state.mutRun['10'], true, '★⑤ 도 곧바로 다시 할 수 있다');
  }
  // (2) 확인 대화상자를 취소하면 아무것도 안 지운다
  {
    const S = finishAll(makeSandbox({ confirmRet:false }));
    const before = JSON.stringify(S.state);
    ['find','dec','mut','write'].forEach(k => S.resetSec(k));
    eq(S._rec.confirms, 4, '확인 대화상자가 네 번 떴다');
    eq(JSON.stringify(S.state), before, '★취소하면 상태가 한 글자도 바뀌지 않는다');
    eq(S.doneCount(), 5, '  → 완료 단계도 그대로다');
    eq(S._store['ta_w1'].value.length, S.WRITEQ[0].min, '  → 서술칸도 그대로다');
  }
  // (3) ⑤ 를 되돌려도 ④ 는 살아 있다 (딸린 관계는 한쪽 방향뿐이다)
  {
    const S = finishAll(makeSandbox());
    S.resetSec('mut');
    eqJ(S.state.mutRun, {}, '⑤ 가 지워졌다');
    eq(S.state.qPick.m1, undefined, '  → ⑤ 의 문항도 지워졌다');
    eq(S.decDoneCount(), 3, '★⑤ 를 되돌려도 ④ 의 해독은 그대로다');
    eq(S.state.qPick.d1 !== undefined, true, '★  → ④ 의 문항 답도 그대로다');
    S.guessMut(12, 1); S.runMut(12);
    eq(S.state.mutRun['12'], true, '★되돌린 직후 곧바로 다시 할 수 있다');
  }
  // (4) 나머지 칸도 제 몫만 지운다 · 아무도 새로고침하지 않는다
  {
    Object.keys(makeSandbox().SEC_DEF).forEach(k => {
      const S = finishAll(makeSandbox());
      S.resetSec(k);
      eq(S._rec.reloads, 0, '★resetSec("' + k + '") 이 location.reload 를 부르지 않는다');
    });
    const S = finishAll(makeSandbox());
    S.resetSec('intro');
    eq(S.codeDoneCount(), 0, '① 이 지워졌다');
    eq(S.state.codeLast, null, '  → 마지막으로 고른 묶음도 비었다');
    eq(S.rnaDoneCount(), 3, '★① 을 되돌려도 ② 는 그대로다');
    eq(S.decDoneCount(), 3, '★① 을 되돌려도 ④ 는 그대로다');
    eq(S._rec.confirms, 0, '★① 은 고르기만 한 칸이라 묻지 않고 지운다');

    const T = finishAll(makeSandbox());
    T.resetSec('find');
    eq(T.findDoneCount(), 0, '③ 이 지워졌다');
    eq(Object.keys(REF).filter(c => hasCls(T, 'c3_' + c, 'found')).length, 0, '  → 코돈표의 찾은 표시도 지워졌다');
    eq(T.decDoneCount(), 3, '★③ 을 되돌려도 ④ 는 그대로다');
    T.FIND_TASKS.forEach(t => t.need.forEach(c => T.ctTap3(c)));
    eq(T.findDoneCount(), 10, '★되돌린 직후 곧바로 다시 찾을 수 있다');

    const U = finishAll(makeSandbox());
    U.resetSec('prac');
    eqJ(U.state.pPick, {}, '💪 가 지워졌다');
    eq(U.doneCount(), 5, '★💪 를 되돌려도 완료 단계는 5 그대로다');
    eq(U._rec.confirms, 0, '  → 💪 는 묻지 않고 지운다');

    const V = finishAll(makeSandbox());
    V.resetSec('write');
    ok(Object.keys(V.state.ta).every(k => V.state.ta[k] === ''), '⑥ 의 답안이 지워졌다');
    eqJ(V.state.self, {}, '  → 자기평가도 지워졌다');
    eq(V._store['ta_w1'].value, '', '★서술칸의 글자도 실제로 비워졌다');
    eq(V.WRITEQ.every(w => !V.ansGate(w.id).open), true, '  → 모범답안이 도로 잠겼다');
    eq(V.doneCount(), 5, '★⑥ 을 되돌려도 완료 단계는 5 그대로다');
    V._store['ta_w1'].value = '가'.repeat(V.WRITEQ[0].min); V.onTa('w1');
    eq(V.ansGate('w1').open, true, '★되돌린 직후 곧바로 다시 적을 수 있다');

    eq(makeSandbox().resetSec('없는칸'), undefined, '없는 칸을 되돌리라 해도 죽지 않는다');
  }
  // (5) 전체 되돌리기만 새로고침한다
  {
    const S = finishAll(makeSandbox());
    S.resetAll();
    eq(S._rec.reloads, 1, '★resetAll 만 location.reload 를 부른다');
    eq(S.localStorage._mem['codon_sim_v1'], undefined, '★저장분이 지워진다');
    eq(S.doneCount(), 0, '★메모리의 state 도 함께 비워진다 (지운 것이 되살아나지 않는다)');
    eq(S.demoMounted, false, '  → 무대의 mounted 표시도 되돌린다');
    const T = finishAll(makeSandbox({ confirmRet:false }));
    T.resetAll();
    eq(T._rec.reloads, 0, '★전체 되돌리기를 취소하면 새로고침하지 않는다');
    eq(T.doneCount(), 5, '  → 상태도 그대로다');
  }
}

// ══ 14. 말투 ══
console.log('[14] 말투 점검 (친근체 · 추임새 금지 — 이모지는 금지가 아니다)');
{
  /* ★정본은 _test_가계도분석.js 의 [13] 말투 점검. 목록을 그대로 가져왔다. */
  const BANNED = ['해 보자','보자.','보자!','하자.','하자!','가자.','가자!','좋아','맞아.','맞아!',
                  '했어','됐어','왔어','찾았어','거야','이야.','이야!','일까','할까','올까','줄까',
                  '나와.','너의','네가','우리가'];
  const S = makeSandbox();

  // (1) 문항·서술·자기평가·무대 문안 전수
  const blob = JSON.stringify({
    QI:S.Q_INTRO, QR:S.Q_RNA, QF:S.Q_FIND, QD:S.Q_DEC, QM:S.Q_MUT, P:S.PRACTICE,
    W:S.WRITEQ, SC:S.SELFCHECK, MC:S.MUT_CHOICES, FT:S.FIND_TASKS, RS:S.RNA_SLOTS,
    ST:S.STEPS, AS:S.ANI_STEPS, FN:S.FRAME_NAMES, SD:S.SEC_DEF, SA:S.SEC_ASK
  }, (k, v) => (typeof v === 'function' ? String(v) : v));
  let hits = [];
  BANNED.forEach(w => { if (blob.indexOf(w) >= 0) hits.push(w); });
  ok(hits.length === 0, '★문항·서술·자기평가 문안에 친근체/추임새 0건 (검출: ' + hits.join(' ') + ')');

  // (2) 화면에 그대로 찍히는 정적 마크업
  const bStart = src.indexOf('<body>');
  const body = src.slice(bStart, src.indexOf('<script>', bStart));
  let hits2 = [];
  BANNED.forEach(w => { if (body.indexOf(w) >= 0) hits2.push(w); });
  ok(hits2.length === 0, '★본문 마크업에 친근체/추임새 0건 (검출: ' + hits2.join(' ') + ')');

  // (3) 런타임 문구 — 주석을 걷어낸 스크립트 전체
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '')
                 .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  let hits3 = [];
  BANNED.forEach(w => { if (code.indexOf(w) >= 0) hits3.push(w); });
  ok(hits3.length === 0, '★런타임 문구에 친근체/추임새 0건 (검출: ' + hits3.join(' ') + ')');

  // (4) 지시문 · 발문의 형태
  //     지시 자리는 세 곳이다 — ③ 찾기 과제 · 화면의 .taskbar · ⑥ 서술 발문
  const bars = [];
  { const re = /<div class="taskbar"[^>]*>([\s\S]*?)<\/div>/g; let m;
    while ((m = re.exec(body))) bars.push(m[1]); }
  ['rnaTask','decTask','findTask'].forEach(id => { const v = html(S, id); if (v) bars.push(v); });
  ok(bars.length >= 5, '지시 막대 문구를 ' + bars.length + '건 모았다 (검사가 헛돌지 않는다)');
  const tasks = [].concat(S.FIND_TASKS.map(t => t.text), bars, S.WRITEQ.map(w => w.q))
    .map(t => String(t).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  /* 꼬리에 「. (3개)」 같은 괄호 부연이 붙는 것은 허용한다 — 정본 _test_가계도분석.js 와 같은 규칙 */
  ok(tasks.every(t => /(시오[.!]?\s*(\([^)]*\))?[.!]?|다\.)$/.test(t)),
     '★지시문 ' + tasks.length + '건이 모두 「~하시오」 또는 「~이다.」로 끝난다 (권유형 없음)');
  ok(tasks.filter(t => /시오/.test(t)).length >= 6, '  → 그중 지시형이 실제로 여럿이다');
  const asks = S.ALLQ().map(p => p.q.replace(/<[^>]*>/g, '').trim());
  ok(asks.every(t => /[?？]$/.test(t)), '★선택형 발문 ' + asks.length + '건이 모두 물음표로 끝난다');
  ok(S.SELFCHECK.every(s => /[?？]$/.test(s.t.trim())), '자기평가 3줄도 물음으로 끝난다');
  // 오답 되돌림
  const nos = [];
  S.ALLQ().forEach(p => p.no.forEach((t, i) => { if (i !== p.a) nos.push(t); }));
  ok(nos.length === 27, '오답 되돌림이 9문항 × 3 = 27건이다 (실제 ' + nos.length + ')');
  ok(nos.every(t => t.indexOf('옳지 않다.') === 0), '★오답 되돌림이 모두 「옳지 않다.」로 시작한다');
  ok(nos.every(t => /다\.$/.test(t.trim())), '  → 모두 「~다.」로 끝난다 (설명체)');

  // (5) 화면 안내문의 종결
  const msgs = [].concat(S.MUT_CHOICES, S.FRAME_NAMES, S.FIND_TASKS.map(t => t.done.replace(/<[^>]*>/g, '')));
  ok(msgs.every(t => !/요\.$|죠\.$|네\.$/.test(t.trim())), '화면 문구에 구어체 종결이 없다');

  // (6) ★confirm 문구는 「~하시겠습니까?」
  const confirmCount = (code.match(/confirm\(/g) || []).length;
  eq(confirmCount, 3, 'confirm 을 부르는 자리가 3곳이다 (교사 해제 · 섹션 되돌리기 · 전체 되돌리기)');
  const msgsC = Object.keys(S.SEC_ASK).map(k => S.SEC_ASK[k]);
  eq(msgsC.length, 4, '섹션 되돌리기의 확인 문구가 4개다 (③④⑤⑥)');
  // 리터럴 confirm 두 곳을 소스에서 떼어 온다
  {
    const re = /confirm\(/g; let m;
    while ((m = re.exec(code))){
      let i = m.index + m[0].length, depth = 1;
      while (i < code.length && depth > 0){
        const ch = code.charAt(i);
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (depth > 0) i++;
      }
      const arg = code.slice(m.index + m[0].length, i);
      try { const v = vm.runInNewContext(arg); if (typeof v === 'string') msgsC.push(v); } catch(e){}
    }
  }
  eq(msgsC.length, 6, '검사가 확인 문구 6건을 모았다 (SEC_ASK 4 + 리터럴 2)');
  msgsC.forEach((m, i) => {
    ok(/하시겠습니까\?/.test(m), '★확인 대화상자 ' + i + ' 가 「~하시겠습니까?」를 쓴다');
    const tail = m.slice(m.indexOf('하시겠습니까?') + '하시겠습니까?'.length).trim();
    ok(tail === '' || /^\(.*\)$/.test(tail) || /다\.$/.test(tail),
       '  → 물음 뒤에 붙은 것은 괄호 부연이나 설명문뿐이다 [' + tail.slice(0, 24) + ']');
    ok(!/\?.*\?/.test(m.replace(/하시겠습니까\?/, '')), '  → 물음이 둘로 갈리지 않는다');
  });
  // 되돌리기 안내가 「다른 단계는 그대로 둔다」를 밝히는가
  ['find','mut','write'].forEach(k =>
    ok(/다른 단계는 그대로/.test(S.SEC_ASK[k]), '★' + k + ' 의 확인 문구가 다른 칸은 그대로임을 밝힌다'));
  ok(/⑤ 의 예상과 결과도 함께 지워진다/.test(S.SEC_ASK.dec), '★dec 의 확인 문구가 ⑤ 도 지워짐을 밝힌다');
}

// ══ 15. 활동의 경계 ══
console.log('[15] 활동의 경계 (자매 활동 protein-sim 의 용어가 넘어오지 않았는가)');
{
  const OUT = ['안티코돈', '펩타이드결합', '펩타이드 결합', 'E 자리', 'P 자리', 'A 자리',
               '프로모터', 'RNA 중합효소', '중합효소', '아미노아실'];
  OUT.forEach(w => eq((src.match(new RegExp(w, 'g')) || []).length, 0,
    '★「' + w + '」가 파일 전체에 없다 (전사·번역의 기작은 단백질합성 모의실험의 몫이다)'));
  ok(/단백질합성 모의실험/.test(src), '대신 자매 활동을 가리키는 한 줄이 있다');
  ok(/12유전02-01/.test(src) && /12유전02-02/.test(src), '성취기준 두 코드가 적혀 있다');
  ok(/60~63쪽/.test(src), '교과서 쪽수가 적혀 있다');
  // 이 활동이 다루는 말은 있어야 한다 (경계 검사가 헛돌지 않는지 확인)
  ['코돈', '읽기틀', '중심원리', '전사', '번역', '개시코돈', '종결코돈'].forEach(w =>
    ok(src.indexOf(w) >= 0, '  (이 활동의 말 「' + w + '」는 있다)'));
}

// ══ 16. 색 규약 ══
console.log('[16] 색 규약 (CSS 변수 ↔ JS 상수 · 채도 · 굳은 뜻의 색 피하기)');
{
  const S = makeSandbox();
  const root = cssRule(':root');
  function v(name){ const m = root.match(new RegExp('--' + name + ':\\s*(#[0-9A-Fa-f]{6})')); return m ? m[1] : null; }
  const pairs = [['dna', S.C_DNA], ['rna', S.C_RNA], ['prot', S.C_PROT]];
  pairs.forEach(([n, jsv]) => {
    ok(v(n) !== null, 'CSS 변수 --' + n + ' 이 있다');
    eq(String(jsv).toUpperCase(), String(v(n)).toUpperCase(),
       '★CSS --' + n + ' 과 JS 상수가 같은 값이다 (어긋나면 범례와 그림의 색이 갈린다)');
  });
  function rgb(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
  pairs.forEach(([n, jsv]) => {
    const c = rgb(jsv), sat = Math.max.apply(null, c) - Math.min.apply(null, c);
    ok(sat >= 120, '★--' + n + ' 의 채도가 충분하다 (최대−최소 = ' + sat + ' ≥ 120)');
  });
  // 굳은 뜻의 색과 겹치지 않는다
  const FIXED = ['red','green','blue','amber','yellow','teal','old'];
  FIXED.forEach(f => {
    const fv = v(f);
    if (!fv) return;
    pairs.forEach(([n, jsv]) => ok(String(jsv).toUpperCase() !== fv.toUpperCase(),
      '★자료 색 --' + n + ' 이 굳은 뜻의 색 --' + f + ' 과 같지 않다'));
  });
  // 세 색이 서로 충분히 멀다
  function dist(a, b){ const x = rgb(a), y = rgb(b);
    return Math.round(Math.sqrt((x[0]-y[0])**2 + (x[1]-y[1])**2 + (x[2]-y[2])**2)); }
  [['dna','rna'],['dna','prot'],['rna','prot']].forEach(([a, b]) => {
    const d = dist(v(a), v(b));
    ok(d >= 120, '★--' + a + ' 과 --' + b + ' 의 색거리가 ' + d + ' ≥ 120 이다');
  });
  // 색만으로 구분시키지 않는다 — 이름표가 함께 붙는가
  ok(/>DNA</.test(html(S, 'dogmaStage')) && /RNA</.test(html(S, 'dogmaStage')) && /단백질</.test(html(S, 'dogmaStage')),
     '중심원리 무대의 세 상자에 이름표가 붙어 있다');
  ok(/aria-label=/.test(html(S, 'dogmaStage')), '무대에 aria-label 이 있다');
  ok(/aria-label=/.test(html(S, 'codeStage')), '① 막대그래프에도 aria-label 이 있다');
  // 무대에 <text> 안의 <sup> 함정이 없다 (SVG 가 통째로 닫히는 자리)
  ['dogmaStage','codeStage'].forEach(id =>
    ok(!/<text[^>]*>[^<]*<(sup|b|i)\b/.test(html(S, id)), '무대 ' + id + ' 의 <text> 안에 HTML 태그가 없다'));
  ok(!/NaN/.test(html(S, 'codeStage') + html(S, 'dogmaStage') + html(S, 'demoStage')), '무대 좌표에 NaN 이 없다');

  // ① 막대 높이 — 「가짓수에 정비례」를 등식으로 문다
  eqJ(S.CODE_SIZES, [1,2,3], '묶음 크기 선택지가 1·2·3 이다');
  eq(S.AA_KINDS, 20, '아미노산 20종류가 기준선이다');
  eq(S.codeCount(1), 4, '★4¹ = 4');
  eq(S.codeCount(2), 16, '★4² = 16');
  eq(S.codeCount(3), 64, '★4³ = 64');
  eq(S.codeEnough(1), false, '★4가지로는 20종류에 모자란다');
  eq(S.codeEnough(2), false, '★16가지로도 모자란다');
  eq(S.codeEnough(3), true, '★64가지면 넉넉하다');
  eq(S.CODE_SIZES.filter(n => S.codeEnough(n))[0], 3, '★20종류를 넘기는 최소 묶음은 3 이다');
  const k = S.codeBarH(1) / S.codeCount(1);
  S.CODE_SIZES.forEach(n => ok(Math.abs(S.codeBarH(n) - k * S.codeCount(n)) < 1e-9,
    '★codeBarH(' + n + ') 이 가짓수에 정비례한다 (분율이 아니다)'));
  ok(Math.abs(S.codeBarH(2) - 4 * S.codeBarH(1)) < 1e-9, '★codeBarH(2) = 4 × codeBarH(1) — 16 은 4 의 4배다');
  ok(Math.abs(S.codeBarH(3) - 4 * S.codeBarH(2)) < 1e-9, '★codeBarH(3) = 4 × codeBarH(2) — 64 는 16 의 4배다');
  // 20종류 기준선도 같은 자로 그린다
  const base = 168;
  const y20 = parseFloat((html(S, 'codeStage').match(/stroke-dasharray="6,4"/) ? '1' : '0'));
  ok(y20 === 1, '20종류 기준선이 점선으로 그려져 있다');
  const lineY = base - S.CODE_MAXH * S.AA_KINDS / S.CODE_MAXV;
  ok(html(S, 'codeStage').indexOf('y1="' + lineY + '"') >= 0, '★기준선 높이가 막대와 같은 자로 계산된다');
  ok(base - lineY > S.codeBarH(2) && base - lineY < S.codeBarH(3),
     '★기준선이 16가지 막대보다 높고 64가지 막대보다 낮다 (16 < 20 < 64)');
  ok(html(S, 'codeStage').indexOf('아미노산 20종류') >= 0, '기준선에 이름표가 붙어 있다');
  // 가짓수를 글로도 적는다 (막대만으로는 셀 수 없다)
  const T = makeSandbox();
  T.pickCode(3);
  ok(html(T, 'codeStage').indexOf('64가지') >= 0, '★누른 막대 위에 가짓수를 글로도 적는다');
  ok(/20종류를 모두 지정하고도 남는다/.test(html(T, 'fb_code')), '  → 되돌림도 계산 결과를 말한다');
  T.pickCode(1);
  ok(/모자란다/.test(html(T, 'fb_code')), '모자란 묶음에는 모자란다고 말한다');
}

console.log('\n결과: ' + pass + ' pass / ' + fail + ' fail');

/* ══════════════════════════════════════════════════════════════
   ※ 2026-09-11 — 이 검사가 처음 잡아낸 본체의 결함 2건은 그날 고쳐졌다.
     A. init() 의 `Number(state.frame)` 에서 `Number(null) === 0` 이라
        처음 들어온 학생에게 읽기틀 「1번째 염기부터」가 이미 골라져 있었다.
        그 틀이 곧 62쪽 해 보기 2의 답이라, 고르는 일이 활동에서 사라졌다.
     B. `typeof null === 'object'` 라, 초기값이 null 인 칸(frame·codeLast·hintCodon·mutNow)이
        객체 칸으로 분류돼 저장된 숫자·문자열이 복원되지 않았다.
     ★둘 다 [7]·[8]·[12] 절이 문다. 절을 무르게 고치지 말 것.
   ══════════════════════════════════════════════════════════════ */
process.exit(fail ? 1 : 0);
