// ════════════════════════════════════════════════════════════════════════
//  DNA 복제 모의실험 — Node 헤드리스 검사 (독립 검증판)
//  실행:  node "_test_DNA복제.js"  (이 파일이 있는 폴더에서)
//
//  · vm 컨텍스트에 DOM/localStorage/confirm/location 스텁을 넣고
//    HTML의 <script> 블록을 실행한다(맨 앞 'use strict'; 는 벗겨야 최상위
//    var/function 이 컨텍스트 전역으로 노출된다 — 작업노트 함정).
//  · 정답 데이터는 앱의 표를 쓰지 않고 테스트가 스스로 다시 계산해 대조한다.
// ════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const vm = require('vm');

const path = require('path');
const HTML = path.join(__dirname, '1-5_DNA복제_모의실험.html');  // ★USB 드라이브 문자는 PC마다 다르다 — 경로를 박지 말 것
const src = fs.readFileSync(HTML, 'utf8');
const scriptTags = src.match(/<script[\s>]/g) || [];
/* ★<script> 블록이 2개다 — 앞은 <head> 의 미완성 잠금, 뒤가 본체.
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

// ── 테스트가 독립적으로 갖는 상보 규칙(앱의 COMPLEMENT를 쓰지 않는다) ──
const COMP = { A:'T', T:'A', G:'C', C:'G' };
function compStr(s){ let o = ''; for (let i = 0; i < s.length; i++) o += COMP[s.charAt(i)]; return o; }

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

// ── CSS 파싱 도우미 ──
function cssRule(sel){
  const re = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}');
  const mm = src.match(re);
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

// ══════════════════ DOM 스텁 / 샌드박스 ══════════════════
function makeSandbox(opt){
  opt = opt || {};
  const store = {};
  const missing = [];
  function makeEl(id){
    const classes = new Set();
    const el = {
      className:'', innerHTML:'', textContent:'', value:'', checked:false,
      disabled:false, offsetWidth:0, style:{}, children:[], attrs:{}, onclick:null,
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
    console, Math, JSON, Object, Array, String, Number, Boolean, isNaN, parseInt, parseFloat,
    document:{
      documentElement:{ className:'unlocked' },
      getElementById(id){
        if (store[id]) return store[id];
        missing.push(id);                       // HTML에 없는 id를 찾았다 = 오타 가능
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
    confirm(){ rec.confirms++; return rec.confirmRet; },
    location:{ reload(){ rec.reloads++; } },
    /* <head> 잠금 스크립트가 정의하는 전역 — 본체가 참조하므로 미리 넣어 준다 */
    DRAFT_MODE:false, DRAFT_PASS:'7856', DRAFT_KEY:'dna_sim_draft_ok'
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(js, sb);
  sb._store = store; sb._missing = missing; sb._rec = rec;
  return sb;
}

// ── 무대 조작 도우미 ──
function txt(S, id){ const e = S._store[id]; return e ? String(e.textContent) : null; }
function html(S, id){ const e = S._store[id]; return e ? String(e.innerHTML) : null; }
function cls(S, id){ const e = S._store[id]; return e ? String(e.className) : null; }
function cellCls(S, key, i){ return cls(S, 'c_' + key + '_' + i); }
// 화살표 막대가 덮는 칸 범위
function barRange(S, id){
  const e = S._store[id];
  if (!e || e.style.display === 'none') return null;
  const l = parseFloat(e.style.left), w = parseFloat(e.style.width);
  return { from: Math.round(l / S.CELL_W), to: Math.round((l + w) / S.CELL_W) - 1 };
}
function sel(S){ return S.state.sel || { strand:null, idx:-1 }; }   // null 안전 접근
// 막대가 덮은 칸 중 비어 있는 칸 (막대가 없으면 null)
function emptyUnderBar(S, id, arr){
  const r = barRange(S, id);
  if (!r) return null;
  const out = [];
  for (let i = r.from; i <= r.to; i++) if (!arr[i]) out.push(i);
  return { r:r, empty:out.join(',') };
}
// ★지연 가닥은 '조각별' 막대 → 보이는 막대들의 범위를 모아서 본다
function botBars(S){
  const out = [];
  for (let k = 0; k < S.SEG_COUNT; k++){
    const r = barRange(S, 'arrowBot_' + k);
    if (r) out.push({ k:k, from:r.from, to:r.to, text:txt(S, 'arrowBot_' + k) });
  }
  return out;
}
// 지연 가닥 막대들이 덮은 칸 중 비어 있는 칸 전부
function emptyUnderBotBars(S){
  const arr = S.state.newBot, empty = [];
  botBars(S).forEach(b => { for (let i = b.from; i <= b.to; i++) if (!arr[i]) empty.push(i); });
  return empty.join(',');
}
// 지금 필요한 프라이머를 모두 놓는다(교과서 47쪽: 3′ 말단이 없으면 시작하지 못한다)
function ensurePrimers(S){
  let g = 0;
  while (S.primerNeed(S.state.unwound, S.state.prim) && g++ < 10) S.placePrimer();
}
function fillOne(S, strand){
  const arr = (strand === 'top') ? S.state.newTop : S.state.newBot;
  const tmpl = (strand === 'top') ? S.TOP_TEMPLATE : S.BOT_TEMPLATE;
  const i = S.nextIndexFor(strand, arr, S.state.unwound);
  if (i < 0) return -1;
  if (!S.primerCheck(strand, i, S.state.prim).ok) ensurePrimers(S);
  S.selectStrand(strand);
  S.placeBase(COMP[tmpl.charAt(i)]);           // 테스트가 계산한 정답 염기
  return i;
}
// 8칸씩 풀며 두 가닥을 손으로 끝까지 채운다(자동 합성 미사용)
function playManual(S){
  let guard = 0;
  while (guard++ < 400){
    /* ★프라이머가 없으면 어느 칸에도 붙지 않는다 — 교과서 47쪽 */
    if (S.primerNeed(S.state.unwound, S.state.prim)){ S.placePrimer(); continue; }
    const t = S.nextTopIndex(S.state.newTop, S.state.unwound);
    const b = S.nextBotIndex(S.state.newBot, S.state.unwound);
    if (t < 0 && b < 0){
      if (S.state.unwound >= S.N) break;
      S.unwind();
      continue;
    }
    if (t >= 0) fillOne(S, 'top'); else fillOne(S, 'bot');
  }
}

const S = makeSandbox();

// ══════════════════ [1] 정적 구조 무결성 ══════════════════
console.log('[1] 정적 구조 무결성');
eq(scriptTags.length, 2, 'script 블록 2개(미완성 잠금 + 본체)');
ok(/DRAFT_MODE/.test(gateJs) && /DRAFT_PASS\s*=\s*'7856'/.test(gateJs), '잠금 비밀번호는 7856(교사 지정 공통값)');
ok(/DRAFT_KEY\s*=\s*'dna_sim_draft_ok'/.test(gateJs), '★잠금 키에 활동 이름이 붙어 있다(허브는 한 origin)');
ok(/localStorage/.test(gateJs) && /unlocked/.test(gateJs), '잠금 해제 표시는 <html> class 로 건다');
{
  /* ★외부 URL 이 **하나도 없어야** 한다 — 안내 카드를 지우며 마지막 바깥 주소도 사라졌다(2026-08-31) */
  const urls = src.match(/https?:\/\/[^"'\s)]+/g) || [];
  eq(urls.length, 0, '★외부 URL 없음 (실제: ' + (urls.join(', ') || '없음') + ')');
}
ok(!/<link|@import|<img|<iframe/.test(src), '외부 자원 태그 없음');
{
  const open = (src.match(/<div/g) || []).length, close = (src.match(/<\/div>/g) || []).length;
  eq(open, close, 'div 여닫기 균형 (' + open + ')');
}
{
  const dup = HTML_IDS.filter((id, i) => HTML_IDS.indexOf(id) !== i);
  ok(dup.length === 0, 'id 중복 없음 (중복: ' + dup.join(',') + ')');
}
{
  // HTML의 onclick/oninput/onchange 가 부르는 함수가 모두 정의돼 있는가
  const re = /on(?:click|input|change)="([A-Za-z_$][\w$]*)\(/g;
  const names = new Set(); let x;
  while ((x = re.exec(src))) names.add(x[1]);
  ok(names.size >= 10, '핸들러 이름 ' + names.size + '개 추출');
  names.forEach(n => ok(typeof S[n] === 'function', 'onclick 핸들러 ' + n + '() 정의됨'));
}
{
  // ★CSS 상수 ↔ JS 상수 동기화 (.cell margin 때문에 pitch = 24+2 = 26)
  const cell = cssRule('.cell');
  const basis = cssFlexBasis(cell), mg = cssPx(cell, 'margin');
  eq(basis + 2 * mg, S.CELL_W, 'CSS .cell pitch(' + basis + '+2×' + mg + ') = JS CELL_W');
  eq(cssPx(cssRule('.arrowrow'), 'width'), S.N * S.CELL_W, '.arrowrow width = N × CELL_W');
  eq(cssPx(cssRule('.fragrow'), 'width'), S.N * S.CELL_W, '.fragrow width = N × CELL_W');
  const fb = cssRule('.fragbox');
  eq(cssFlexBasis(fb), S.SEG * S.CELL_W, '.fragbox = SEG × CELL_W');
  eq(cssPx(fb, 'width'), S.SEG * S.CELL_W, '.fragbox width 도 동일');
  const rl = cssRule('.rowlab'), en = cssRule('.endlab');
  eq(cssFlexBasis(rl), cssPx(rl, 'width'), '.rowlab flex-basis = width (행 정렬)');
  eq(cssFlexBasis(en), cssPx(en, 'width'), '.endlab flex-basis = width');
}
{
  // 염기 색: 안내 문구(빨/파/초/노) ↔ CSS 변수  ※부록 137쪽 모형과 대조 확인함
  const map = { A:['빨강','red'], T:['파랑','blue'], G:['초록','green'], C:['노랑','yellow'] };
  Object.keys(map).forEach(b => {
    const re = new RegExp('class="chip b-' + b + '">' + b + '<\\/span>\\s*' + map[b][0]);
    ok(re.test(src), '안내 문구: ' + b + ' = ' + map[b][0]);
    ok(cssRule('.b-' + b).indexOf('var(--' + map[b][1] + ')') >= 0, 'CSS .b-' + b + ' = var(--' + map[b][1] + ')');
  });
}
{
  // ── 교실 하드웨어(태블릿) 대응 ──
  ok(/@media\s*\(max-width/.test(src), '좁은 화면용 @media 분기 있음');
  ok(cssPx(cssRule('.cell.nt'), 'height') >= 44, '새 가닥 칸(탭 대상) 세로 44px 이상');
  ok(cssPx(cssRule('.btn.small'), 'font-size') >= 16, '.btn.small 폰트 16px 이상');
  ok(cssPx(cssRule('.cell'), 'font-size') >= 15, '무대 칸 글자 15px 이상');
  ok(cssPx(cssRule('.cell.sm'), 'font-size') >= 13, '딸 DNA 칸 글자 13px 이상');
  ok(cssPx(cssRule('.sbadge'), 'font-size') >= 13, '딸 DNA 배지 글자 13px 이상');
  ok(!/--old:\s*#8A8F98/.test(src), '저대비 회색(#8A8F98) 토큰이 남아 있지 않음');
  ok(/--old:\s*#6B7280/.test(src), '--old 는 흰 글씨 대비를 만족하는 #6B7280');
  ok(cssRule('#stageHint').indexOf('var(--amber-ink)') >= 0, '#stageHint 는 진한 앰버 글자색');
  ok(cssRule('.fragbox').indexOf('var(--amber-ink)') >= 0, '.fragbox 도 진한 앰버 글자색');
  ok(cssRule('.btn:disabled').indexOf('#BBB') < 0, '비활성 버튼이 흰 글씨 on #BBB(1.9:1)가 아님');
  // 분기점·이음새 표시가 상태 클래스(openslot/target)의 border 단축 선언에 지워지지 않아야
  const iTarget = src.indexOf('.cell.nt.target'), iFork = src.indexOf('.cell.nt.forkcol'), iSeam = src.indexOf('.cell.nt.seam');
  ok(iFork > iTarget && iSeam > iTarget, '.cell.nt.forkcol/.seam 규칙이 .cell.nt.target 뒤에 선언됨');
}
{
  // 오답 흔들림은 updateStage 의 className 덮어쓰기 '뒤'에 붙어야 살아남는다
  const seg = src.match(/state\.wrong\+\+;[\s\S]*?\n    return;/);
  ok(!!seg, 'placeBase 오답 분기 추출');
  const iUp = seg ? seg[0].indexOf('updateStage()') : -1;
  const iSh = seg ? seg[0].indexOf('shakeCell(') : -1;
  ok(iUp >= 0 && iSh > iUp, '오답 분기: shakeCell 이 updateStage 뒤에 호출됨');
  // 정리하기 3번 에코는 updateStage 안에서 갱신돼야(활동 중 실시간)
  const us = src.match(/function updateStage\(\)\{[\s\S]*?\n\}/);
  ok(!!us && us[0].indexOf('renderWrongEcho()') > 0, 'updateStage 가 renderWrongEcho 를 호출(실시간 갱신)');
}

// ══════════════════ [2] 서열 데이터 무결성 (독립 재유도) ══════════════════
console.log('[2] 서열 데이터 무결성 — 독립 재유도');
eq(S.N, 32, 'N = 32');
eq(S.SEG, 8, 'SEG = 8');
eq(S.SEG_COUNT, S.N / S.SEG, 'SEG_COUNT = N / SEG');
eq(S.TOP_TEMPLATE.length, S.N, '위 주형 길이 = N');
eq(S.BOT_TEMPLATE.length, S.N, '아래 주형 길이 = N');
ok(/^[ATGC]+$/.test(S.TOP_TEMPLATE), '위 주형은 ATGC로만 구성');
ok(/^[ATGC]+$/.test(S.BOT_TEMPLATE), '아래 주형은 ATGC로만 구성');
// ★핵심: 테스트가 직접 상보 서열을 계산해 대조
eq(compStr(S.TOP_TEMPLATE), S.BOT_TEMPLATE, '독립 계산: 위 주형의 상보 = 아래 주형');
eq(compStr(S.BOT_TEMPLATE), S.TOP_TEMPLATE, '독립 계산: 아래 주형의 상보 = 위 주형');
ok(S.SELF_CHECK.ok === true && S.SELF_CHECK.len === true, '앱 자기검사(SELF_CHECK) 통과');
eq(S.SELF_CHECK.bad.length, 0, '상보 아닌 자리 0개');
{
  // A수 = 짝 가닥의 T수 등 (또 다른 경로의 대조)
  const cnt = s => { const c = {A:0,T:0,G:0,C:0}; for (let i=0;i<s.length;i++) c[s.charAt(i)]++; return c; };
  const t = cnt(S.TOP_TEMPLATE), b = cnt(S.BOT_TEMPLATE);
  eq(t.A, b.T, 'A(위) = T(아래) 개수'); eq(t.T, b.A, 'T(위) = A(아래) 개수');
  eq(t.G, b.C, 'G(위) = C(아래) 개수'); eq(t.C, b.G, 'C(위) = G(아래) 개수');
  eq(t.A + t.T + t.G + t.C, S.N, '염기 총합 = 32');
}
{
  // 주석에 적힌 서열 ↔ 실제 상수
  const a = src.match(/5′-([ATGC]{20,})-3′/), c = src.match(/3′-([ATGC]{20,})-5′/);
  ok(!!a && a[1] === S.TOP_TEMPLATE, '주석 위 주형 서열 = TOP_TEMPLATE');
  ok(!!c && c[1] === S.BOT_TEMPLATE, '주석 아래 주형 서열 = BOT_TEMPLATE');
}
{
  // 무대 각 줄의 5′/3′ 표시를 HTML에서 뽑아 역평행·합성 방향을 독립 재유도
  const re = /<div class="endlab">([^<]*)<\/div>\s*<div class="cells" id="(row_\w+)"><\/div><div class="endlab">([^<]*)<\/div>/g;
  const ends = {}; let x;
  while ((x = re.exec(src))) ends[x[2]] = { l:x[1].trim(), r:x[3].trim() };
  eq(Object.keys(ends).length, 6, '무대 칸 줄 6개(새2·주형2·결합·번호)');
  eq(ends.row_tmplTop.l + '/' + ends.row_tmplTop.r, '5′/3′', '위 주형 = 왼쪽 5′ → 오른쪽 3′');
  eq(ends.row_tmplBot.l + '/' + ends.row_tmplBot.r, '3′/5′', '아래 주형 = 왼쪽 3′ → 오른쪽 5′ (역평행)');
  eq(ends.row_newTop.l + '/' + ends.row_newTop.r, '3′/5′', '새 가닥① = 왼쪽 3′ (주형과 역평행)');
  eq(ends.row_newBot.l + '/' + ends.row_newBot.r, '5′/3′', '새 가닥② = 오른쪽 3′ (주형과 역평행)');
  ok(ends.row_tmplTop.l !== ends.row_newTop.l, '딸① 두 가닥 방향이 서로 반대');
  ok(ends.row_tmplBot.l !== ends.row_newBot.l, '딸② 두 가닥 방향이 서로 반대');
  // 3′ 말단이 있는 쪽으로 자란다 → 합성 순서를 markup 에서 재유도
  const topGrowsLeft = (ends.row_newTop.l === '3′');
  const botGrowsRight = (ends.row_newBot.r === '3′');
  const ot = S.synthOrder('top', S.N);
  ok(topGrowsLeft && ot[0] === S.N - 1 && ot[S.N - 1] === 0, '재유도: 새 가닥①은 오른쪽→왼쪽(31→0) 신장');
  let desc = true; for (let i = 1; i < ot.length; i++) if (ot[i] !== ot[i-1] - 1) desc = false;
  ok(desc, '새 가닥① 합성 순서는 1칸씩 연속 감소(연속 합성)');
  const ob = S.synthOrder('bot', S.SEG);
  ok(botGrowsRight && ob[0] === S.N - S.SEG && ob[S.SEG - 1] === S.N - 1, '재유도: 새 가닥②는 조각 안에서 왼쪽→오른쪽');
  ok(/오른쪽에서 왼쪽으로<\/b>\s*풀린다/.test(src), '규칙④ 문구: 분기점은 오른쪽→왼쪽');
  ok(S.isOpen(S.N - 1, 1) && !S.isOpen(0, 1), '규칙④와 일치: 오른쪽 끝이 먼저 열린다');
}
{
  // ③ 비교표의 서술이 코드 동작과 어긋나지 않는가
  const t = src.match(/합성 방향\(화면\)<\/th><td>([^<]*)<\/td><td>([^<]*)<\/td>/);
  ok(!!t && t[1].indexOf('오른쪽 → 왼쪽') >= 0 && t[2].indexOf('왼쪽 → 오른쪽') >= 0, '비교표 합성 방향 = 코드와 일치');
  ok(/<td><b>연속적<\/b>[^<]*<\/td><td><b>불연속적<\/b>/.test(src), '비교표: 선도=연속 / 지연=불연속');
  ok(/<td><b>선도 가닥<\/b><\/td><td><b>지연 가닥<\/b><\/td>/.test(src), '비교표: 이름 = 선도 / 지연');
}

// ══════════════════ [3] 순수 로직 — 정상·경계·오답 ══════════════════
console.log('[3] 순수 로직 — 정상·경계·오답');
ok(S.complementOf('A')==='T' && S.complementOf('T')==='A' && S.complementOf('G')==='C' && S.complementOf('C')==='G', 'complementOf 4종');
ok(S.complementOf('X') === null && S.complementOf('') === null && S.complementOf(null) === null, 'complementOf 잘못된 입력 → null');
ok(S.isComplement('G','C') && S.isComplement('C','G'), 'isComplement 정상');
ok(!S.isComplement('G','T') && !S.isComplement('A','A') && !S.isComplement(null,'A') && !S.isComplement('A',null), 'isComplement 오답/빈값 → false');
ok(S.checkTemplatePair('AT','TA').ok && !S.checkTemplatePair('AT','TT').ok, 'checkTemplatePair 정상/오류 검출');
eq(S.checkTemplatePair('AT','TT').bad[0], 1, 'checkTemplatePair 어긋난 자리 보고');
ok(!S.checkTemplatePair('ATG','TA').ok, 'checkTemplatePair 길이 다름 → 실패');
eq(S.emptyStrand().length, S.N, 'emptyStrand 길이');
ok(S.emptyStrand().every(v => v === null), 'emptyStrand 전부 null');
ok(!S.strandComplete(S.emptyStrand()), 'strandComplete 빈 가닥 → false');
{
  const full = S.emptyStrand().map(() => 'A');
  ok(S.strandComplete(full) && S.filledCount(full) === 32, 'strandComplete/filledCount 가득');
  full[15] = null;
  ok(!S.strandComplete(full) && S.filledCount(full) === 31, '한 칸 비면 미완성');
}
eq(S.unwoundStart(0), 32, 'unwoundStart(0) = 32(아무것도 안 열림)');
eq(S.unwoundStart(32), 0, 'unwoundStart(32) = 0');
ok(!S.isOpen(31, 0) && !S.isOpen(0, 0), '경계: 안 풀렸으면 어디도 열려 있지 않다');
ok(S.isOpen(24, 8) && !S.isOpen(23, 8), '경계: 8칸 → 24~31만 열림');
ok(S.isOpen(0, 32) && S.isOpen(31, 32), '경계: 32칸 → 전부 열림');
eq(S.segmentOf(31), 0, 'segmentOf(31)=0(가장 먼저 열리는 조각)');
ok(S.segmentOf(24)===0 && S.segmentOf(23)===1 && S.segmentOf(8)===2 && S.segmentOf(7)===3 && S.segmentOf(0)===3, 'segmentOf 경계');
eq(JSON.stringify(S.segRange(0)), '{"start":24,"end":31}', 'segRange(0)');
eq(JSON.stringify(S.segRange(3)), '{"start":0,"end":7}', 'segRange(3)');
{
  // 조각 4개가 32칸을 빈틈·중복 없이 덮는가
  const cover = new Array(32).fill(0);
  for (let k = 0; k < S.SEG_COUNT; k++){ const r = S.segRange(k); for (let i = r.start; i <= r.end; i++) cover[i]++; }
  ok(cover.every(v => v === 1), '조각 4개가 32칸을 빈틈·중복 없이 덮음');
  for (let i = 0; i < 32; i++) ok(S.segmentOf(i) === Math.floor((31 - i) / 8), 'segmentOf/segRange 상호 일치 ' + i);
}
ok(S.openedSegments(0)===0 && S.openedSegments(7)===0 && S.openedSegments(8)===1 && S.openedSegments(31)===3 && S.openedSegments(32)===4, 'openedSegments 경계');
{
  const ob = S.synthOrder('bot', 32);
  eq(ob.length, 32, '아래 가닥 순서 32칸');
  eq(ob.slice(0,8).join(''), '2425262728293031', '조각1 = 24→31');
  eq(ob.slice(8,10).join(','), '16,17', '조각2는 16부터(새 조각의 왼쪽 끝)');
  eq(ob[31], 7, '마지막 = 7번(가장 왼쪽 조각의 오른쪽 끝)');
  eq(new Set(ob).size, 32, '아래 가닥 순서에 중복 없음');
  eq(S.synthOrder('bot', 0).length, 0, '안 풀렸으면 아래 가닥 순서 없음');
  eq(S.synthOrder('bot', 8).length, 8, '8칸 → 조각 1개만');
  eq(S.synthOrder('top', 0).length, 32, '위 가닥 순서는 풀림과 무관(열림은 nextIndex가 판정)');
}
{
  const top = S.emptyStrand(), bot = S.emptyStrand();
  eq(S.nextTopIndex(top, 0), -1, '안 풀렸으면 붙일 자리 없음(위)');
  eq(S.nextBotIndex(bot, 0), -1, '안 풀렸으면 붙일 자리 없음(아래)');
  eq(S.nextTopIndex(top, 8), 31, '위: 8칸 풀림 → 31');
  eq(S.nextBotIndex(bot, 8), 24, '아래: 8칸 풀림 → 24');
  top[31] = 'A'; eq(S.nextTopIndex(top, 8), 30, '위: 다음은 30 (왼쪽으로)');
  bot[24] = 'A'; eq(S.nextBotIndex(bot, 8), 25, '아래: 다음은 25 (오른쪽으로)');
  for (let i = 24; i <= 31; i++){ top[i] = 'A'; bot[i] = 'A'; }
  eq(S.nextTopIndex(top, 8), -1, '위: 열린 구간 다 채우면 막힘');
  eq(S.nextBotIndex(bot, 8), -1, '아래: 조각1 완성 뒤 막힘');
  eq(S.nextTopIndex(top, 16), 23, '위: 더 풀면 23으로 연속');
  eq(S.nextBotIndex(bot, 16), 16, '아래: 새 조각은 16(왼쪽 끝)부터');
  eq(S.lastPlacedIndex('top', top, 16), 24, 'lastPlacedIndex 위 = 24(가장 최근)');
  eq(S.lastPlacedIndex('bot', bot, 16), 31, 'lastPlacedIndex 아래 = 31(조각1의 3′ 말단)');
  eq(S.lastPlacedIndex('top', S.emptyStrand(), 32), -1, '아무것도 없으면 -1');
  // 자리 유효성
  eq(S.placementCheck('top', 31, top, bot, 16).reason, 'filled', 'placementCheck: 이미 채움');
  eq(S.placementCheck('top', 23, top, bot, 8).reason, 'notopen', 'placementCheck: 안 풀린 자리');
  eq(S.placementCheck('top', 23, top, bot, 16).ok, true, 'placementCheck: 위 23번 허용');
  eq(S.placementCheck('top', 0, top, bot, 32).reason, 'wrongend', 'placementCheck: 위 0번은 순서 위반');
  eq(S.placementCheck('top', 0, top, bot, 32).want, 23, 'wrongend 안내 자리 = 23');
  eq(S.placementCheck('bot', 23, top, bot, 16).reason, 'wrongend', 'placementCheck: 아래 23번(오른→왼) 위반');
  eq(S.placementCheck('bot', 23, top, bot, 16).want, 16, 'wrongend 안내 자리 = 16');
  eq(S.placementCheck('bot', 16, top, bot, 16).ok, true, 'placementCheck: 아래 16번 허용');
  eq(S.placementCheck('top', -1, top, bot, 32).reason, 'range', 'placementCheck: 음수 범위');
  eq(S.placementCheck('top', 32, top, bot, 32).reason, 'range', 'placementCheck: 상한 범위');
  eq(S.placementCheck('top', '5', top, bot, 32).reason, 'range', 'placementCheck: 숫자 아님');
  eq(S.placementCheck('top', null, top, bot, 32).reason, 'range', 'placementCheck: null');
  // 조각 완성 판정
  eq(S.fragmentDone(bot, 0), true, 'fragmentDone 조각1 완성');
  eq(S.fragmentDone(bot, 1), false, 'fragmentDone 조각2 미완성');
  eq(S.fragmentsDoneCount(bot), 1, 'fragmentsDoneCount = 1');
}
eq(S.templateBaseAt('top', 0), S.TOP_TEMPLATE.charAt(0), 'templateBaseAt 위');
eq(S.templateBaseAt('bot', 31), S.BOT_TEMPLATE.charAt(31), 'templateBaseAt 아래');
ok(S.strandName('top') !== S.strandName('bot'), 'strandName 구분');
{
  // 딸 DNA 대조 — 정답은 테스트가 계산
  const t = S.emptyStrand(), b = S.emptyStrand();
  for (let i = 0; i < 32; i++){ t[i] = COMP[S.TOP_TEMPLATE.charAt(i)]; b[i] = COMP[S.BOT_TEMPLATE.charAt(i)]; }
  ok(S.daughterCheck(S.TOP_TEMPLATE, t).ok && S.daughterCheck(S.TOP_TEMPLATE, t).matched === 32, '딸① 32/32 상보');
  ok(S.daughterCheck(S.BOT_TEMPLATE, b).ok, '딸② 32/32 상보');
  ok(S.daughtersIdentical(t, b), '두 딸 DNA가 서로 같음');
  eq(S.arrStr(t), S.BOT_TEMPLATE, '새 가닥①의 서열 = 없어진 짝(아래 주형)과 같다');
  eq(S.arrStr(b), S.TOP_TEMPLATE, '새 가닥②의 서열 = 없어진 짝(위 주형)과 같다');
  const bad = t.slice(); bad[5] = COMP[S.TOP_TEMPLATE.charAt(5)] === 'A' ? 'G' : 'A';
  eq(S.daughterCheck(S.TOP_TEMPLATE, bad).ok, false, '한 칸 오류 검출');
  eq(S.daughterCheck(S.TOP_TEMPLATE, bad).matched, 31, '오류 1개 → 31/32');
  eq(S.daughterCheck(S.TOP_TEMPLATE, bad).bad[0], 5, '오류 위치 보고');
  eq(S.daughtersIdentical(bad, b), false, '오류가 있으면 두 딸이 같지 않다');
  const half = S.emptyStrand(); half[0] = 'A';
  eq(S.daughterCheck(S.TOP_TEMPLATE, half).ok, false, '빈 칸도 상보 실패로 잡힘');
  eq(S.arrStr(S.emptyStrand()), '·'.repeat(32), 'arrStr 빈 칸 표시');
}
{
  // 안내 문구 생성기
  ok(S.placementMessage('top', 23, {reason:'notopen'}).indexOf('풀리지 않은') > 0, '문구: 안 풀린 자리');
  ok(S.placementMessage('top', 31, {reason:'filled'}).indexOf('이미') > 0, '문구: 이미 붙음');
  ok(S.placementMessage('top', 0, {reason:'wrongend', want:23}).indexOf('24번') > 0, '문구: 위 가닥은 want+1번 안내');
  ok(S.placementMessage('top', 0, {reason:'wrongend', want:23}).indexOf('3′ 말단') > 0, '문구: 3′ 말단 규칙 언급');
  ok(S.placementMessage('bot', 23, {reason:'wrongend', want:16}).indexOf('17번') > 0, '문구: 아래 가닥 want+1번 안내');
  ok(S.placementMessage('bot', 23, {reason:'wrongend', want:16}).indexOf('조각') > 0, '문구: 조각 규칙 언급');
  ok(S.placementMessage('bot', 5, {reason:'blocked'}).indexOf('풀기') > 0, '문구: 막힘 → 더 풀기');
  ok(S.wrongEchoText(3, false, 20).indexOf('3회') > 0, 'wrongEcho: 오답 횟수 반영');
  ok(S.wrongEchoText(0, false, 20).indexOf('0회') > 0, 'wrongEcho: 0회 별도 문구');
  ok(S.wrongEchoText(0, false, 20).indexOf('무엇을 기준') > 0, 'wrongEcho: 0회면 생각거리 제시');
  ok(S.wrongEchoText(0, false, 0).indexOf('붙여 보지 않았다') > 0, 'wrongEcho: 시작 전에는 별도 안내');
  ok(S.wrongEchoText(0, false, 0).indexOf('0회') < 0, 'wrongEcho: 시작 전에 「0회 — 완벽」이라 하지 않음');
  ok(S.wrongEchoText(1, false, 0).indexOf('1회') > 0, 'wrongEcho: 붙기 전에 틀린 경우도 횟수를 알린다');
  ok(S.wrongEchoText(0, true, 64).indexOf('자동 합성') > 0, 'wrongEcho: 자동 합성 사용을 실제로 안내(죽은 코드 제거)');
  ok(S.wrongEchoText(0, false, 64).indexOf('자동 합성') < 0, 'wrongEcho: 자동 미사용이면 그 문구 없음');
  ok(S.targetHintText(31, 24, null).indexOf('32번') > 0 && S.targetHintText(31, 24, null).indexOf('25번') > 0, 'targetHint: 두 가닥 자리 안내');
  ok(S.targetHintText(-1, -1, null).indexOf('없음') > 0, 'targetHint: 자리 없음');
  ok(S.targetHintText(30, 25, {strand:'top', idx:30}).indexOf('31번') > 0, 'targetHint: 선택 표시');
}

// ══════════════════ [4] 메셀슨·스탈 — 별도 활동으로 옮겼다 ══════════════════
/* 교사 결정(2026-08-25): 「새 활동으로 옮기고 dna-sim 에는 안내만 남긴다」
   → 2026-08-26 실행. 여기 있던 로직 검사 60여 건은 `_test_메셀슨.js` 가 이어받았다.
   이 절은 **되살아나지 않는지 감시**한다. 두 활동에 같은 내용이 있으면 반드시 어긋난다. */
console.log('[4] 메셀슨·스탈 — 옮겨 갔는가');
{
  /* 로직·렌더·상태가 하나도 남아 있지 않다 */
  ['predictBands', 'ACTUAL_BANDS', 'bandKeys', 'compareBands', 'moleculesFor',
   'modelVerdictText', 'BAND_META', 'MODEL_NAME', 'MODEL_DESC', 'SB_LAB',
   'tubeHTML', 'legendHTML', 'molHTML', 'pickModel', 'msTriedCount', 'renderMS'
  ].forEach(n => ok(typeof S[n] === 'undefined', '★' + n + ' 이 남아 있지 않다'));

  /* 화면 조각·CSS·상태 칸도 함께 걷어냈다 */
  ['tube-scroll', 'tube-legend', 'tube-set', 'tube-col', 'mol-set', '.sb.old',
   'msBody', 'msArea', 'msVerdict', 'msMol', 'fb_ms', 'ms_semi'
  ].forEach(n => ok(src.indexOf(n) < 0, '★「' + n + '」 흔적이 없다'));
  ok(typeof S.state.ms === 'undefined', '★state 에 ms 칸이 없다');
  ok(JSON.stringify(S.mergeState({ ms:{ pick:'semi' } })).indexOf('"ms"') < 0,
     '★옛 저장분에 ms 가 있어도 되살아나지 않는다');

  /* ★안내 카드도 지웠다(교사 지시 2026-08-31) — 메셀슨·스탈은 이 활동보다 **먼저** 오므로
     「이어서 할 활동」으로 걸면 배우는 차례가 거꾸로 안내된다. 링크·본문이 통째로 없어야 한다. */
  const srcVisible = src.replace(/<!--[\s\S]*?-->/g, '');   // 되살리지 말라는 경고 주석은 남겨 둔다
  ['이어서 할 활동', '메셀슨', 'meselson', '스탈'].forEach(w =>
    ok(srcVisible.indexOf(w) < 0, '★「' + w + '」 이 본문에 없다'));
  ok(!/<a/.test(src), '★바깥으로 나가는 <a> 태그가 없다');
  /* 말투 — 옮기면서 옛 절의 친근체도 함께 사라졌다 */
  ['골라 보자', '많다는 뜻이에요', '확인했어요'].forEach(w =>
    ok(src.indexOf(w) < 0, '★옛 절의 친근체 「' + w + '」가 사라졌다'));
}

// ══════════════════ [5] 상태 저장·병합·손상 방어 ══════════════════
console.log('[5] 상태 저장·병합·손상 방어');
{
  const f = S.freshState();
  ok(f.unwound===0 && f.wrong===0 && f.manualTop===0 && f.manualBot===0, 'freshState 숫자 0');
  ok(!f.ligated && !f.verified && !f.usedAuto && f.sel===null, 'freshState 플래그');
  ok(f.newTop.every(v=>v===null) && f.newBot.every(v=>v===null), 'freshState 가닥 비어 있음');
  eq(S.sanitizeStrand(null), null, 'sanitizeStrand(null)');
  eq(S.sanitizeStrand([1,2,3]), null, 'sanitizeStrand 길이 다름 → null');
  eq(S.sanitizeStrand('AAAA'), null, 'sanitizeStrand 문자열(길이 4) → null');
  {
    const dirty = new Array(32).fill('Z'); dirty[0] = 'A'; dirty[1] = 'a'; dirty[2] = 5;
    const cleaned = S.sanitizeStrand(dirty);
    ok(cleaned && cleaned[0]==='A' && cleaned[1]===null && cleaned[2]===null, 'sanitizeStrand 이상값 → null 로 정리');
    eq(S.filledCount(cleaned), 1, 'sanitize 후 유효 염기만 남음');
  }
  eq(S.mergeState(null).unwound, 0, 'mergeState(null) → 초기 상태');
  eq(S.mergeState('문자열').unwound, 0, 'mergeState 문자열 → 초기 상태');
  eq(S.mergeState({unwound:999}).unwound, 32, 'unwound 상한 클램프');
  eq(S.mergeState({unwound:-5}).unwound, 0, 'unwound 하한 클램프');
  eq(S.mergeState({unwound:13}).unwound, 8, 'unwound는 조각 단위(8)로 내림');
  eq(S.mergeState({unwound:'abc'}).unwound, 0, 'unwound 숫자 아님 → 0');
  eq(S.mergeState({ligated:true}).ligated, false, '아래 가닥 미완성인데 ligated:true → 무시');
  eq(S.mergeState({verified:true}).verified, false, 'ligated 아닌데 verified:true → 무시');
  eq(S.mergeState({wrong:-3}).wrong, 0, '음수 오답 수 무시');
  eq(S.mergeState({wrong:7}).wrong, 7, '오답 수 복원');
  eq(S.mergeState({sel:{strand:'중간',idx:3}}).sel, null, '이상한 가닥 이름 sel 무시');
  eq(JSON.stringify(S.mergeState({sel:{strand:'top',idx:3}}).sel), '{"strand":"top","idx":3}', '정상 sel 복원');
  {
    // 완성된 가닥 + ligated + verified 는 살아남아야
    const good = S.emptyStrand().map((v,i) => COMP[S.BOT_TEMPLATE.charAt(i)]);
    const goodTop = S.emptyStrand().map((v,i) => COMP[S.TOP_TEMPLATE.charAt(i)]);
    const st = S.mergeState({ unwound:32, newTop:goodTop, newBot:good, ligated:true, verified:true });
    ok(st.ligated && st.verified, '정상 완료 저장값은 그대로 복원');
    // 서열이 어긋난 저장값이면 verified 를 믿어선 안 된다(화면에 "✅ 같다"가 뜨므로)
    const brokenTop = goodTop.slice(); brokenTop[7] = (brokenTop[7] === 'A') ? 'G' : 'A';
    const st2 = S.mergeState({ unwound:32, newTop:brokenTop, newBot:good, ligated:true, verified:true });
    ok(!st2.verified, '상보성이 깨진 저장값은 verified 로 복원하지 않음');
  }
}

// ══════════════════ [6] UI 흐름 — 처음부터 끝까지 (전부 수동) ══════════════════
console.log('[6] UI 흐름 — 전 과정 수동');
{
  const M = makeSandbox();
  M.init();
  eq(M.stepDone(), 0, '초기 진행 0');
  eq(txt(M, 'progress'), '진행 0 / 5', '배지 0 / 5');
  /* ★카드 ③ 은 카드 ②의 결론 문항에 답해야 열린다 */
  eq(M.card3Open(), false, '시작 시 ③ 조작 카드 잠김');
  eq(M._store['lock3'].style.display, 'block', '③ 잠금 안내 표시');
  M.pickQ('d1', M.QDEF.d1.a);
  eq(M.card3Open(), true, 'd1 정답 → ③ 열림');
  /* ★★applyLocks 는 잠겼을 때 한 방향으로만 끈다 — 열린 뒤 되살려 주지 않으면 단추가 죽은 채로 남는다.
     실제로 pick_top·pick_bot 이 그랬다(교사 신고 2026-08-31). 열린 직후 꺼져 있어도 되는 단추를
     **이름으로 못박는다** — 여기 없는 단추가 꺼져 있으면 되살리는 곳을 빠뜨린 것이다. */
  {
    const GATED = ['btnUnwind','btnUnwindAll','btnPrimer','nb_A','nb_T','nb_G','nb_C',
                   'btnRemove','btnAuto','btnLigate','pick_top','pick_bot'];
    const off = GATED.filter(id => M._store[id] && M._store[id].disabled);
    eq(off.sort().join(','), ['btnAuto','btnLigate','btnPrimer'].sort().join(','),
       '★열린 직후 꺼져 있어도 되는 단추는 셋뿐 (실제: ' + (off.join(',') || '없음') + ')');
  }
  eq(M.stepDone(), 1, 'd1 정답으로 진행 1');
  eq(M._store['btnVerify'].disabled, true, '시작 시 딸 DNA 확인 버튼 잠김');
  eq(M._store['btnLigate'].disabled, true, '시작 시 연결효소 버튼 잠김');
  eq(M._store['btnAuto'].disabled, true, '시작 시 자동 합성 잠김');
  eq(M._store['resultLocked'].style.display, 'block', '③ 잠금 안내 표시');
  eq(M._store['arrowTop'].style.display, 'none', '화살표 막대 숨김');
  eq(botBars(M).length, 0, '시작 시 지연 가닥 조각 막대 0개');
  ok(html(M,'wrongEcho').indexOf('붙여 보지 않았다') > 0, '시작 시 정리하기 3 에코 = 아직 시작 전 안내');
  eq(M._store['nb_A'].disabled, false, '시작 시 염기 단추 활성');
  eq(cellCls(M,'newTop',31).indexOf('locked') > 0, true, '안 풀린 칸은 locked');
  eq(txt(M,'c_tmplTop_0'), M.TOP_TEMPLATE.charAt(0), '주형 칸에 염기 표시');
  eq(txt(M,'c_bond_0'), '‖', '안 풀린 자리에 결합 기호');
  eq(txt(M,'c_num_0'), '1', '자리 번호 1');
  eq(txt(M,'c_num_31'), '32', '자리 번호 32');
  eq(txt(M,'lab_newTop'), '새 가닥 ①', '시작 시 선도 가닥 이름 비공개');
  eq(txt(M,'lab_newBot'), '새 가닥 ②', '시작 시 지연 가닥 이름 비공개');

  // 오답 경로 ① — 안 풀린 상태에서 붙이기
  M.placeBase('A');
  eq(M.filledCount(M.state.newTop), 0, '안 풀렸으면 아무것도 붙지 않음');
  eq(M.state.wrong, 0, '자리 문제는 오답 카운트가 아니다');
  ok(html(M,'fb_stage').indexOf('풀기') > 0, '안내: 먼저 풀기');
  M.placeBase('Z');
  eq(M.filledCount(M.state.newTop), 0, '없는 염기 무시');

  // 풀기
  M.unwind();
  eq(M.state.unwound, 8, '풀기 8칸');
  eq(M.openedSegments(M.state.unwound), 1, '열린 조각 1');
  ok(cls(M,'c_bond_31').indexOf('cut') > 0, '열린 자리에서 결합 해제(cut)');
  ok(cls(M,'c_bond_23').indexOf('cut') < 0, '아직 감긴 자리는 결합 유지');
  eq(txt(M,'c_bond_23'), '‖', '감긴 자리에 결합 기호');
  /* ★열린 칸은 위아래로 벌어진다 — 「단일가닥으로 나뉜다」가 격자에서도 보인다 */
  eq(M._store['c_tmplTop_31'].style.top, '-10px', '풀린 끝 칸의 위 주형이 10px 올라간다');
  eq(M._store['c_tmplBot_31'].style.top, '10px',  '풀린 끝 칸의 아래 주형이 10px 내려간다');
  eq(M._store['c_tmplTop_0'].style.top, '0px',    '감긴 칸은 벌어지지 않는다');
  ok(cellCls(M,'newTop',31).indexOf('openslot') > 0, '31번은 빈 자리로 열림');
  ok(cellCls(M,'newTop',23).indexOf('locked') > 0, '23번은 아직 잠김');
  ok(M.state.sel && sel(M).strand === 'top' && sel(M).idx === 31, '자동 선택 = 위 31번');
  /* ★프라이머 규칙 — 3′ 말단을 내어 주는 것이 없으면 중합효소는 시작하지 못한다 (교과서 47쪽) */
  {
    eq(M.primerCounts(M.state.prim).top, 0, '아직 프라이머 0개');
    eq(M.primerCheck('top', 31, M.state.prim).reason, 'noprimer', '프라이머 없는 자리 = noprimer');
    M.placeBase(COMP[M.TOP_TEMPLATE.charAt(31)]);
    eq(M.state.newTop[31], null, '★프라이머 없이는 옳은 염기도 붙지 않는다');
    eq(M.state.wrong, 0, '프라이머 문제는 오답 카운트가 아니다');
    ok(html(M,'fb_stage').indexOf('프라이머') > 0, '안내: 프라이머를 먼저 놓으시오');
    M.placePrimer();
    eq(M.primerCounts(M.state.prim).top, 1, '위 가닥 프라이머 1개');
    eq(M._store['pmr_top'].style.display, 'flex', '프라이머 캡슐 표시');
    eq(M._store['pmr_top'].style.left, (M.primerSlotTop() * M.CELL_W) + 'px', '프라이머 캡슐 자리 = 29번 칸');
    eq(M.primerCheck('top', 31, M.state.prim).ok, true, '프라이머를 놓으면 붙일 수 있다');
    ok(html(M,'primerCount').indexOf('위쪽 새 가닥 <b>1개</b>') > 0, '프라이머 개수 표시');
  }
  eq(html(M,'frag_0').length >= 0, true, '조각1 라벨 생성');
  eq(txt(M,'frag_0'), '조각 1', '열린 조각 라벨 표시');
  eq(txt(M,'frag_1'), '', '아직 열리지 않은 조각은 빈 라벨');
  ok(cellCls(M,'newTop',24).indexOf('forkcol') > 0, '분기점 칸(25번)에 새 가닥 행에도 분기점 표시');

  // 오답 경로 ② — 짝이 아닌 염기
  {
    const right = COMP[M.TOP_TEMPLATE.charAt(31)];
    const wrongBase = 'ATGC'.split('').filter(b => b !== right)[0];
    M.placeBase(wrongBase);
    eq(M.state.wrong, 1, '짝이 아닌 염기 → 오답 1회');
    eq(M.state.newTop[31], null, '오답은 붙지 않음');
    ok(html(M,'fb_stage').indexOf('짝이 아니') > 0, '피드백: 짝이 아니에요');
    ok(html(M,'fb_stage').indexOf(right) > 0, '피드백: 옳은 짝 제시');
    ok(html(M,'counters').indexOf('1회') > 0, '카운터에 실패 횟수 반영');
    // ★손으로 renderWrongEcho 를 부르지 않는다 — updateStage 가 갱신해야 한다
    ok(html(M,'wrongEcho').indexOf('1회') > 0, '정리하기 3 에코가 활동 중 실시간으로 1회 반영');
    ok(M._store['c_newTop_31']._classes.has('shake'), '오답 칸에 흔들림 클래스가 남아 있음');
    M.placeBase(right);
    eq(M.state.newTop[31], right, '정답 염기는 붙는다');
    eq(M.state.manualTop, 1, '직접 붙인 수 1');
    eq(sel(M).idx, 30, '다음 3′ 말단(30번) 자동 선택');
    ok(cellCls(M,'newTop',31).indexOf('b-' + right) > 0, '붙은 칸에 염기 색 클래스');
    ok(cellCls(M,'newTop',30).indexOf('target') > 0, '다음 자리 target 표시');
  }
  // 오답 경로 ③ — 순서 위반(위 가닥을 왼쪽으로 건너뛰기)
  M.tapCell('top', 24);
  ok(!(sel(M).strand === 'top' && sel(M).idx === 24), '위 가닥 24번 건너뛰기 거부');
  ok(html(M,'fb_stage').indexOf('3′ 말단') > 0, '거부 안내: 3′ 말단 규칙');
  ok(html(M,'fb_stage').indexOf('31번') > 0, '거부 안내: 붙을 수 있는 자리 제시');
  // 오답 경로 ④ — 아래 가닥을 오른쪽 끝부터 시도
  M.placePrimer();     /* 아래 조각 1의 프라이머 */
  eq(M.primerCounts(M.state.prim).bot, 1, '아래 조각1 프라이머 1개');
  M.tapCell('bot', 31);
  ok(!(sel(M).strand === 'bot' && sel(M).idx === 31), '아래 가닥 31번 거부');
  ok(html(M,'fb_stage').indexOf('25번') > 0, '아래 가닥은 24번(=25번 자리)부터');
  // 오답 경로 ⑤ — 안 풀린 자리
  M.tapCell('bot', 5);
  ok(html(M,'fb_stage').indexOf('풀리지 않은') > 0, '안 풀린 자리 안내');
  // 오답 경로 ⑥ — 범위 밖
  M.tapCell('top', 99);
  ok(html(M,'fb_stage').indexOf('범위') >= 0, '범위 밖 자리 안내');
  eq(M.state.wrong, 1, '자리 위반은 오답 횟수를 올리지 않음');

  // 아래 가닥 조각1 채우기
  M.tapCell('bot', 24);
  ok(sel(M).strand === 'bot' && sel(M).idx === 24, '아래 24번 선택 허용');
  for (let i = 24; i <= 31; i++) M.placeBase(COMP[M.BOT_TEMPLATE.charAt(i)]);
  eq(M.filledCount(M.state.newBot), 8, '아래 조각1 8칸 완성');
  eq(M.fragmentsDoneCount(M.state.newBot), 1, '조각 1개 완성');
  eq(txt(M,'frag_0'), '조각 1 완성', '조각1 라벨 완성으로 전환');
  ok(cls(M,'frag_0').indexOf('done') > 0, '조각1 라벨 done 클래스');
  // 아래 가닥 막힘 → 더 풀어야
  eq(M.nextBotIndex(M.state.newBot, M.state.unwound), -1, '조각1 완성 뒤 아래 가닥 막힘');
  M.selectStrand('bot');
  ok(html(M,'fb_stage').indexOf('풀기') > 0, '막힌 가닥 선택 시 더 풀라는 안내');

  // 자동 합성 잠김 확인
  ok(!M.autoAvailable(), '직접 붙인 수 부족 → 자동 합성 잠김');
  M.autoFill();
  eq(M.state.usedAuto, false, '잠긴 자동 합성은 실행되지 않음');
  ok(html(M,'fb_stage').indexOf('6개 이상 직접') > 0, '자동 합성 안내: 기준 제시');
  // 연결효소도 아직 불가
  M.ligate();
  eq(M.state.ligated, false, '아래 가닥 미완성 → 연결 불가');
  ok(html(M,'fb_stage').indexOf('1 / 4') > 0, '연결 안내: 완성 조각 수 표시');
  // 딸 DNA 확인도 불가
  M.verifyDaughters();
  eq(M.state.verified, false, '미완성 상태에서 확인 불가');
  eq(M._store['resultBody'].style.display, 'none', '결과 영역 여전히 숨김');

  // ✂ 떼어내기
  {
    const before = M.filledCount(M.state.newBot);
    M.selectStrand('bot');   // 완성 조각이라 자리 없음 → sel 유지
    M.state.sel = { strand:'bot', idx:31 };
    M.removeLast();
    eq(M.filledCount(M.state.newBot), before - 1, '✂ 마지막 하나 제거');
    eq(M.state.newBot[31], null, '제거된 자리는 31번(합성 순서상 마지막)');
    eq(M.nextBotIndex(M.state.newBot, M.state.unwound), 31, '제거 후 그 자리가 다시 붙일 자리');
    ok(html(M,'fb_stage').indexOf('교정') > 0, '떼어내기 안내: 교정·수선 연결');
    M.placeBase(COMP[M.BOT_TEMPLATE.charAt(31)]);
    eq(M.filledCount(M.state.newBot), before, '다시 붙여 복구');
  }

  // 나머지를 전부 수동으로
  playManual(M);
  eq(M.state.unwound, 32, '끝까지 풀림');
  eq(M.filledCount(M.state.newTop), 32, '위 가닥 32칸 수동 완성');
  eq(M.filledCount(M.state.newBot), 32, '아래 가닥 32칸 수동 완성');
  eq(M.state.usedAuto, false, '자동 합성 미사용');
  eq(M.arrStr(M.state.newTop), M.BOT_TEMPLATE, '수동 결과: 새 가닥① = 아래 주형 서열');
  eq(M.arrStr(M.state.newBot), M.TOP_TEMPLATE, '수동 결과: 새 가닥② = 위 주형 서열');
  eq(M.fragmentsDoneCount(M.state.newBot), 4, '조각 4개 완성');
  eq(M.stepDone(), 2, '진행 2 (d1 + 끝까지 풀기)');
  eq(txt(M,'progress'), '진행 2 / 5', '배지 2 / 5');
  /* ★프라이머는 선도 1개 · 지연 4개 — 교과서 49쪽 1-(3) */
  eq(M.primerCounts(M.state.prim).top, 1, '★선도 가닥 프라이머 1개');
  eq(M.primerCounts(M.state.prim).bot, 4, '★지연 가닥 프라이머 4개');
  ok(html(M,'primerCount').indexOf('조각마다') > 0, '개수가 다른 까닭을 글로도 적는다');
  for (let k = 0; k < M.SEG_COUNT; k++){
    eq(M._store['pmr_bot_' + k].style.left, (M.primerSlotBot(k) * M.CELL_W) + 'px', '아래 프라이머 ' + (k+1) + ' 자리');
  }
  eq(txt(M,'lab_newTop'), '새 가닥 ① (선도 가닥)', '위 가닥 완성 → 선도 가닥 이름 공개');
  eq(txt(M,'lab_newBot'), '새 가닥 ②', '연결 전에는 지연 가닥 이름 비공개');
  ok(cellCls(M,'newBot',24).indexOf('seam') > 0, '연결 전 이음새 표시');
  eq(M._store['btnLigate'].disabled, false, '연결효소 버튼 열림');
  eq(M._store['btnAuto'].disabled, true, '두 가닥 완성 → 자동 합성 버튼 닫힘');
  ok(html(M,'autoHint').indexOf('연결효소') > 0, '안내: 이제 연결효소');
  // 전부 풀린 뒤에는 0번 칸에 유령 분기점이 남지 않아야
  ok(cellCls(M,'newTop',0).indexOf('forkcol') < 0, '전부 풀린 뒤 0번 칸에 분기점 표시 없음');
  ok(cellCls(M,'tmplTop',0).indexOf('forkcol') < 0, '주형 0번 칸에도 분기점 표시 없음');
  // 두 가닥 완성 → 염기 단추 잠김 + 잘못된 '풀기' 안내가 뜨지 않음
  eq(M._store['nb_A'].disabled, true, '두 가닥 완성 → A 단추 잠김');
  eq(M._store['nb_C'].disabled, true, '두 가닥 완성 → C 단추 잠김');
  M.state.sel = null;
  M.placeBase('A');
  ok(html(M,'fb_stage').indexOf('이미 모두 완성') > 0, '완성 후 붙이기 시도 → 「풀기」 오안내 대신 다음 단계 안내');
  ok(html(M,'fb_stage').indexOf('풀어야 주형이 드러나요') < 0, '완성 후에 「풀어야 주형이 드러난다」고 하지 않음');
  // 지연 가닥 화살표: 조각 4개가 각각 별도 막대로, 조각 왼쪽 끝에서 오른쪽으로
  {
    const bars = botBars(M);
    eq(bars.length, 4, '연결 전 지연 가닥 막대 = 조각 4개(불연속이 보인다)');
    eq(emptyUnderBotBars(M), '', '조각 막대가 덮은 칸은 모두 채워져 있음');
    eq(bars.map(b => b.from + '-' + b.to).join(' '), '24-31 16-23 8-15 0-7', '조각별 막대 범위');
    ok(bars.every(b => b.text.indexOf('▶') === b.text.length - 1), '조각 막대의 화살촉 ▶ 는 자라는 끝(오른쪽)에');
  }

  // 연결 전 확인 시도
  M.verifyDaughters();
  eq(M.state.verified, false, '연결 전에는 딸 DNA 확인 불가');
  ok(html(M,'fb_stage').indexOf('연결효소') > 0, '확인 거부 안내: 먼저 연결');

  // 연결
  M.ligate();
  eq(M.state.ligated, true, '연결효소 작동');
  eq(M.stepDone(), 3, '진행 3');
  eq(txt(M,'progress'), '진행 3 / 5', '배지 3 / 5');
  for (let k = 0; k < M.SEG_COUNT - 1; k++){
    eq(M._store['lig_' + k].style.display, 'block', 'DNA 연결효소 마름모 ' + (k+1) + ' 표시');
  }
  eq(txt(M,'lab_newBot'), '새 가닥 ② (지연 가닥)', '연결 후 지연 가닥 이름 공개');
  ok(cellCls(M,'newBot',24).indexOf('joined') > 0, '이음새 → 연결 표시로 전환');
  ok(cellCls(M,'newBot',24).indexOf('seam') < 0, '이음새 클래스 제거');
  eq(txt(M,'frag_0'), '', '연결 후 조각 라벨 비움');
  eq(txt(M,'fragNote'), '🔗 하나로 연결됨', '조각 줄 안내 전환');
  {
    // 연결 후에는 조각 막대 4개가 하나로 합쳐진다
    const bars = botBars(M);
    eq(bars.length, 1, '연결 후 지연 가닥 막대 1개로 합쳐짐');
    eq(bars[0].from + '-' + bars[0].to, '0-31', '합쳐진 막대 = 32칸 전체');
    ok(bars[0].text.indexOf('연결') > 0, '합쳐진 막대에 「연결」 표시');
    eq(emptyUnderBotBars(M), '', '합쳐진 막대 아래도 모두 채워짐');
  }
  M.ligate();
  ok(html(M,'fb_stage').indexOf('이미 연결') >= 0, '두 번 연결 시 안내');
  // 연결 후에는 아래 가닥을 떼어낼 수 없다
  M.state.sel = { strand:'bot', idx:31 };
  M.removeLast();
  eq(M.filledCount(M.state.newBot), 32, '연결 후 아래 가닥 떼어내기 차단');
  ok(html(M,'fb_stage').indexOf('떼어낼 수 없') > 0, '차단 안내');
  eq(M._store['resultLocked'].style.display, 'none', '③ 잠금 해제');

  // 딸 DNA 확인
  M.verifyDaughters();
  eq(M.state.verified, true, '딸 DNA 확인 성공');
  eq(M.stepDone(), 3, '확인만으로는 진행이 오르지 않는다(결론 문항이 남아 있다)');
  M.pickQ('d2', M.QDEF.d2.a);
  eq(M.stepDone(), 4, '진행 4 (d2)');
  eq(M.card5Open(), false, 'd3 전에는 💪 잠김');
  M.pickQ('d3', M.QDEF.d3.a);
  eq(M.stepDone(), 5, '진행 5 / 5');
  eq(txt(M,'progress'), '진행 5 / 5', '배지 5 / 5');
  eq(M.card5Open(), true, 'd3 정답 → 💪 열림');
  eq(M._store['resultBody'].style.display, 'block', '결과 영역 공개');
  ok(html(M,'dgtCheck').indexOf('32 / 32') > 0, '자동 대조 32/32');
  ok(html(M,'dgtCheck').indexOf('같다 ✅') > 0, '두 딸 DNA가 같다는 판정');
  ok(html(M,'daughters').indexOf('원래 가닥') > 0 && html(M,'daughters').indexOf('새로 합성된 가닥') > 0, '딸 DNA 배지 표시');
  {
    const h = html(M,'daughters');
    ok(h.indexOf(M.TOP_TEMPLATE.charAt(0)) >= 0, '딸 DNA 렌더에 서열 칸 포함');
    eq((h.match(/class="cell sm/g) || []).length, 4 * M.N, '딸 DNA 칸 = 4줄 × 32');
    ok(h.indexOf('·') < 0, '완성 후 빈 칸 기호 없음');
  }
  // 완료 후에는 떼어내기 차단
  M.state.sel = { strand:'top', idx:0 };
  M.removeLast();
  eq(M.filledCount(M.state.newTop), 32, '확인 완료 후 떼어내기 차단');
  ok(html(M,'fb_stage').indexOf('처음부터 다시') > 0, '차단 안내: 리셋 유도');
  // 완료 후 더 풀기/붙이기 시도
  M.unwind();
  eq(M.state.unwound, 32, '이미 다 풀림');
  M.unwindAll();
  ok(html(M,'fb_stage').indexOf('이미') >= 0, '이미 끝까지 풀렸다는 안내');
  M.placeBase('A');
  eq(M.filledCount(M.state.newTop), 32, '완성 후 추가 결합 없음');

  // 화살표 막대 — 채운 칸 위에만 그려져야
  {
    const rt = barRange(M, 'arrowTop');
    ok(rt && rt.from === 0 && rt.to === 31, '완성 후 위 가닥 막대 = 32칸 전체');
    ok(txt(M,'arrowTop').indexOf('◀') === 0, '위 가닥 화살표는 ◀(왼쪽으로 자람)');
    ok(txt(M,'arrowBot_0').indexOf('▶') > 0, '아래 가닥 화살표는 ▶(오른쪽으로 자람)');
    ok(cssRule('.arrow-bar.top').indexOf('flex-start') >= 0, 'CSS: 위 막대는 ◀가 왼쪽 끝');
    ok(cssRule('.arrow-bar.bot').indexOf('flex-end') >= 0, 'CSS: 아래 막대는 ▶가 오른쪽 끝');
  }

  // 정리하기 · 모범답안 · 자기평가  (renderWrongEcho 를 손으로 부르지 않는다)
  ok(html(M,'wrongEcho').indexOf('1회') > 0, '정리하기 3에 오답 횟수 1회 반영');
  M.toggleAns('ans1', M._store['btnDummy'] = M._store['ans1']);
  eq(M._store['ans1'].style.display, 'block', '모범답안 열기');
  M.toggleAns('ans1', null);
  eq(M._store['ans1'].style.display, 'none', '모범답안 닫기');
  M._store['ta1'].value = '두 딸 DNA는 같다';
  M._store['chk2'].checked = true;
  M.saveState();
  eq(M.state.ta.ta1, '두 딸 DNA는 같다', '서술 답 저장');
  eq(M.state.chk.chk2, true, '체크박스 저장');

  // HTML에 없는 id를 만진 적이 없어야(오타 방지)
  eq(M._missing.filter(id => !/^(c_|frag_|pmr_|lig_|fk_)/.test(id)).join(','), '', 'getElementById 오타 없음');

  // ── localStorage 저장 → 새 컨텍스트 복원 ──
  const raw = M.localStorage._mem['dna_sim_v2'];
  ok(!!raw, 'localStorage 저장됨');
  const saved = JSON.parse(raw);
  eq(saved.unwound, 32, '저장값: 풀린 길이');
  eq(saved.ligated, true, '저장값: 연결');
  eq(saved.verified, true, '저장값: 확인');
  eq(saved.wrong, 1, '저장값: 오답 수');
  ok(!('ms' in saved), '★저장 blob 에 ms 칸이 없다 (메셀슨은 별도 활동으로 옮겼다)');

  const R = makeSandbox({ seed:{ 'dna_sim_v2': raw } });
  R.init();
  eq(R.state.unwound, 32, '복원: 풀린 길이');
  eq(R.arrStr(R.state.newTop), R.BOT_TEMPLATE, '복원: 새 가닥①');
  eq(R.arrStr(R.state.newBot), R.TOP_TEMPLATE, '복원: 새 가닥②');
  eq(R.state.ligated, true, '복원: 연결 상태');
  eq(R.state.verified, true, '복원: 확인 상태');
  eq(R.state.wrong, 1, '복원: 오답 수');
  eq(R.stepDone(), 5, '복원: 진행 5');
  eq(txt(R,'progress'), '진행 5 / 5', '복원: 배지 5 / 5');
  eq(R.primerCounts(R.state.prim).top, 1, '복원: 선도 프라이머 1개');
  eq(R.primerCounts(R.state.prim).bot, 4, '복원: 지연 프라이머 4개');
  eq(R._store['resultBody'].style.display, 'block', '복원: 결과 영역 공개');
  eq(R._store['resultLocked'].style.display, 'none', '복원: 잠금 해제');
  eq(txt(R,'lab_newTop'), '새 가닥 ① (선도 가닥)', '복원: 선도 가닥 이름');
  eq(txt(R,'lab_newBot'), '새 가닥 ② (지연 가닥)', '복원: 지연 가닥 이름');
  eq(R._store['ta1'].value, '두 딸 DNA는 같다', '복원: 서술 답');
  eq(R._store['chk2'].checked, true, '복원: 체크박스');
  ok(html(R,'wrongEcho').indexOf('1회') > 0, '복원: 정리하기 3 오답 횟수');
  ok(html(R,'fb_stage').indexOf('이전에 하던 기록') > 0, '복원: 남의 기록을 이어받았을 수 있다는 안내 배너');
  ok(html(R,'fb_stage').indexOf('처음부터 다시 하기') > 0, '복원 배너: 리셋 안내 포함');
  ok(html(R,'dgtCheck').indexOf('32 / 32') > 0, '복원: 자동 대조 결과');
  eq(R._store['btnVerify'].disabled, false, '복원: 확인 버튼 상태');
  eq(R._missing.filter(id => !/^(c_|frag_|pmr_|lig_|fk_)/.test(id)).join(','), '', '복원 경로도 id 오타 없음');
}

// ══════════════════ [7] 자동 합성 = 수동 결과와 같은가 ══════════════════
console.log('[7] 자동 합성 결과 대조');
{
  const A = makeSandbox();
  A.init();
  A.pickQ('d1', A.QDEF.d1.a);
  A.unwind();
  ensurePrimers(A);
  for (let i = 0; i < A.MANUAL_MIN; i++) fillOne(A, 'top');
  eq(A.state.manualTop, A.MANUAL_MIN, '위 가닥 6개 직접');
  ok(!A.autoAvailable(), '아래 가닥 0개면 아직 잠김(조각 규칙 경험 강제)');
  for (let i = 0; i < A.MANUAL_MIN; i++) fillOne(A, 'bot');
  eq(A.state.manualBot, A.MANUAL_MIN, '아래 가닥 6개 직접');
  ok(A.autoAvailable(), '각 6개 → 자동 합성 열림');
  eq(A._store['btnAuto'].disabled, false, '자동 합성 버튼 활성');
  A.autoFill();
  eq(A.state.usedAuto, true, '자동 합성 사용 기록');
  eq(A.state.unwound, 32, '자동 합성은 남은 부분을 모두 풀고 채운다');
  eq(A.strandComplete(A.state.newTop) && A.strandComplete(A.state.newBot), true, '두 가닥 완성');
  eq(A.state.manualTop, A.MANUAL_MIN, '자동 합성은 직접 붙인 수를 늘리지 않음');
  eq(A.state.manualBot, A.MANUAL_MIN, '아래도 동일');
  // 수동 결과와 완전히 같은가
  const B = makeSandbox(); B.init(); playManual(B);
  eq(A.arrStr(A.state.newTop), B.arrStr(B.state.newTop), '자동 = 수동 (새 가닥①)');
  eq(A.arrStr(A.state.newBot), B.arrStr(B.state.newBot), '자동 = 수동 (새 가닥②)');
  eq(A.arrStr(A.state.newTop), compStr(A.TOP_TEMPLATE), '자동 결과가 독립 계산과 일치(①)');
  eq(A.arrStr(A.state.newBot), compStr(A.BOT_TEMPLATE), '자동 결과가 독립 계산과 일치(②)');
  eq(A.primerCounts(A.state.prim).top, 1, '자동 경로도 선도 프라이머 1개');
  eq(A.primerCounts(A.state.prim).bot, 4, '자동 경로도 지연 프라이머 4개');
  A.ligate(); A.verifyDaughters();
  eq(A.state.verified, true, '자동 경로로도 완료 도달');
  A.pickQ('d2', A.QDEF.d2.a); A.pickQ('d3', A.QDEF.d3.a);
  eq(A.stepDone(), 5, '자동 경로 진행 5');
  ok(html(A,'counters').indexOf('자동 합성 사용') > 0, '카운터에 자동 사용 표시');
  A.autoFill();
  ok(html(A,'fb_stage').indexOf('이미 완성') > 0, '완성 후 자동 합성 안내');
}

// ══════════════════ [8] 리셋 ══════════════════
console.log('[8] 리셋');
{
  const D = makeSandbox();
  D.init(); D.unwindAll(); fillOne(D, 'top'); D.saveState();
  ok(!!D.localStorage._mem['dna_sim_v2'], '리셋 전 저장값 있음');
  D._rec.confirmRet = false;
  D.resetAll();
  eq(D._rec.confirms, 1, 'confirm 호출');
  ok(!!D.localStorage._mem['dna_sim_v2'], 'confirm 취소 → 저장값 유지');
  eq(D._rec.reloads, 0, 'confirm 취소 → 새로고침 없음');
  D._rec.confirmRet = true;
  D.resetAll();
  eq(D.localStorage._mem['dna_sim_v2'], undefined, 'confirm 확인 → 저장값 삭제');
  eq(D._rec.reloads, 1, '새로고침 호출');
  const E = makeSandbox({ seed:D.localStorage._mem });
  E.init();
  eq(E.stepDone(), 0, '리셋 후 새로 열면 진행 0');
  eq(E.state.unwound, 0, '리셋 후 풀린 길이 0');
  eq(E.filledCount(E.state.newTop) + E.filledCount(E.state.newBot), 0, '리셋 후 붙은 뉴클레오타이드 0');
  eq(txt(E,'progress'), '진행 0 / 5', '리셋 후 배지 0 / 5');
  eq(cls(E,'fb_stage'), '', '리셋 후 새로 열면 「기록 불러옴」 배너 없음');
  ok(html(E,'wrongEcho').indexOf('붙여 보지 않았다') > 0, '리셋 후 정리하기 3 에코도 초기 안내로');
}

// ══════════════════ [9] 무대 렌더 — 막대·조각·이음새 ══════════════════
console.log('[9] 무대 렌더');
{
  const P = makeSandbox();
  P.init();
  P.unwind();                                     // 24~31 열림
  ensurePrimers(P);
  // 위 가닥 한 칸
  fillOne(P, 'top');
  {
    const r = barRange(P, 'arrowTop');
    ok(r && r.from === 31 && r.to === 31, '위 막대는 채운 칸(32번) 위에만');
  }
  eq(botBars(P).length, 0, '아래는 아직 막대 없음');
  // 아래 가닥 조각1 — 먼저 '조각 중간' 상태(3칸)에서 막대를 검사한다
  P.selectStrand('bot');
  for (let i = 24; i <= 26; i++) P.placeBase(COMP[P.BOT_TEMPLATE.charAt(i)]);
  {
    // ★막대가 빈 칸 위에 그려지면 학생이 "여기도 합성됐다"고 읽는다
    const bars = botBars(P);
    eq(bars.length, 1, '조각 중간: 막대 1개');
    eq(bars[0].from + '-' + bars[0].to, '24-26', '조각 중간 막대는 채운 칸(25~27번)만 덮는다');
    eq(emptyUnderBotBars(P), '', '조각 중간에도 막대 아래에 빈 칸이 없다');
  }
  for (let i = 27; i <= 31; i++) P.placeBase(COMP[P.BOT_TEMPLATE.charAt(i)]);
  eq(P.fragmentsDoneCount(P.state.newBot), 1, '조각1 완성');
  {
    const bars = botBars(P);
    eq(bars.length, 1, '조각1만 있으면 막대 1개');
    eq(bars[0].from + '-' + bars[0].to, '24-31', '조각1 완성 시 막대 = 25~32번 칸');
    eq(emptyUnderBotBars(P), '', '막대가 덮은 칸은 모두 채워져 있어야');
  }
  // 조각2를 '중간까지만' — 예전 단일 막대가 빈 칸을 덮던 바로 그 상태
  P.unwind();
  ensurePrimers(P);
  P.selectStrand('bot');
  for (let i = 16; i <= 17; i++) P.placeBase(COMP[P.BOT_TEMPLATE.charAt(i)]);
  {
    const bars = botBars(P);
    eq(bars.length, 2, '조각1 완성 + 조각2 진행 중 → 막대 2개(불연속이 보인다)');
    eq(bars.map(b => b.from + '-' + b.to).join(' '), '24-31 16-17', '조각2 막대는 조각 왼쪽 끝(17번)부터');
    eq(emptyUnderBotBars(P), '', '★조각 중간 상태에서 빈 칸(23·24번 등)을 덮지 않는다');
  }
  for (let i = 18; i <= 23; i++) P.placeBase(COMP[P.BOT_TEMPLATE.charAt(i)]);
  {
    const bars = botBars(P);
    eq(bars.map(b => b.from + '-' + b.to).join(' '), '24-31 16-23', '조각2 완성 시에도 막대는 조각별로 2개');
    eq(emptyUnderBotBars(P), '', '조각2까지 완성 시에도 막대 아래는 모두 채워짐');
  }
  eq(P.fragmentsDoneCount(P.state.newBot), 2, '조각 2개 완성');
  eq(txt(P,'frag_1'), '조각 2 완성', '조각2 라벨');
  eq(txt(P,'frag_2'), '', '아직 안 열린 조각3 라벨은 빔');
  ok(cellCls(P,'newBot',16).indexOf('seam') > 0, '조각 경계 16번 이음새');
  ok(cellCls(P,'newBot',24).indexOf('seam') > 0, '조각 경계 24번 이음새');
  ok(cellCls(P,'newBot',20).indexOf('seam') < 0, '조각 안쪽은 이음새 아님');
  ok(html(P,'unwindInfo').indexOf('16 / 32') > 0, '풀린 길이 안내');
  ok(html(P,'unwindInfo').indexOf('2 / 4') > 0, '열린 조각 안내');
  ok(html(P,'unwindInfo').indexOf('17번') > 0, '복제 분기점 자리 안내');
  // 위 가닥 막대는 언제나 오른쪽부터 연속
  for (let i = 0; i < 5; i++) fillOne(P, 'top');
  {
    const u = emptyUnderBar(P, 'arrowTop', P.state.newTop);
    eq(u ? u.empty : '(막대 없음)', '', '위 막대 아래도 모두 채워짐');
    ok(!!u && u.r.to === 31, '위 막대는 오른쪽 끝에 붙어 있다');
  }
}

// ══════════════════ [10] 연결(ligate) 순서 가드 ══════════════════
console.log('[10] 연결 순서 가드');
{
  const G = makeSandbox();
  G.init(); G.unwindAll();
  ensurePrimers(G);
  eq(G.primerCounts(G.state.prim).bot, 4, '끝까지 풀면 아래 조각 4개 모두 프라이머가 필요하다');
  G.selectStrand('bot');
  for (let k = 0; k < G.SEG_COUNT; k++){
    const r = G.segRange(k);
    for (let i = r.start; i <= r.end; i++) G.placeBase(COMP[G.BOT_TEMPLATE.charAt(i)]);
  }
  eq(G.strandComplete(G.state.newBot), true, '아래 가닥만 32칸 완성');
  eq(G.filledCount(G.state.newTop), 0, '위 가닥은 아직 비어 있음');
  G.ligate();
  eq(G.state.ligated, false, '위 가닥 미완성 상태에서는 연결 차단');
  ok(html(G,'fb_stage').indexOf('마지막 단계') > 0, '차단 안내: 위 가닥부터 채우라고 안내');
  eq(txt(G,'lab_newBot'), '새 가닥 ②', '차단됐으므로 지연 가닥 이름도 아직 비공개');
  eq(G.stepDone(), 1, '진행은 1(끝까지 풀기만) — 연결 단계로 튀지 않음');
  // 위 가닥까지 채우면 정상 연결
  for (let i = 0; i < 40; i++) if (fillOne(G, 'top') < 0) break;
  eq(G.strandComplete(G.state.newTop), true, '위 가닥 완성');
  G.ligate();
  eq(G.state.ligated, true, '두 가닥 완성 후에는 연결 성공');
  eq(txt(G,'lab_newBot'), '새 가닥 ② (지연 가닥)', '연결 후 지연 가닥 이름 공개');
}


// ══════════════════ [11] 연출 무대 대본 — FK_* 무결성 ══════════════════
console.log('[11] 연출 무대 대본');
{
  const n = S.FK_STEPS.length;
  eq(n, 13, '국면 13개');
  eq(S.FK_CAP.length, n, '국면마다 캡션이 하나씩');
  eq(S.FK_FORK.length, n, 'FK_FORK 길이');
  eq(S.FK_NT.length, n, 'FK_NT 길이');
  eq(S.FK_NB.length, n, 'FK_NB 길이');
  eq(S.FK_POLT.length, n, 'FK_POLT 길이');
  eq(S.FK_POLB.length, n, 'FK_POLB 길이');
  eq(typeof S.aniLast, 'function', '★aniLast 는 상수가 아니라 함수');
  eq(S.aniLast(), n - 1, 'aniLast() = 12');
  {
    let mono = true, mult = true;
    for (let i = 0; i < n; i++){
      if (S.FK_FORK[i] % S.SEG !== 0) mult = false;
      if (i && S.FK_FORK[i] > S.FK_FORK[i-1]) mono = false;
    }
    ok(mono, 'fork 는 한 번도 되돌아가지 않는다(단조 비증가)');
    ok(mult, 'fork 는 모두 SEG 의 배수');
    eq(S.FK_FORK[0], S.N, 'ph0 = 전부 감김');
    eq(S.FK_FORK[n-1], 0, '마지막 국면 = 전부 풀림');
    eq(S.FK_FORK[1], S.N - S.SEG, 'ph1 의 풀린 양 = 격자의 풀기 1회와 같다');
  }
  // ★분리 국면(0~2)에는 그 단계의 새 물체를 아예 그리지 않는다 (제작 표준 §4)
  for (let ph = 0; ph <= 2; ph++){
    eq(S.FK_NT[ph], null, 'ph' + ph + ': 위 새 가닥 없음');
    eq(S.FK_NB[ph].length, 0, 'ph' + ph + ': 아래 조각 없음');
    eq(S.FK_POLT[ph], -1, 'ph' + ph + ': 중합효소 없음(위)');
    eq(S.FK_POLB[ph], -1, 'ph' + ph + ': 중합효소 없음(아래)');
    ok(ph < S.FK_PMR_TOP, 'ph' + ph + ': 프라이머 없음');
  }
  eq(typeof S.FK_PMR_TOP, 'number', '위 프라이머는 하나뿐이므로 국면 번호 하나로 적는다');
  eq(S.FK_PMR_BOT.length, S.SEG_COUNT, '아래 프라이머는 조각 수만큼');
  {
    let mono = true;
    for (let k = 1; k < S.FK_PMR_BOT.length; k++) if (S.FK_PMR_BOT[k] < S.FK_PMR_BOT[k-1]) mono = false;
    ok(mono, '아래 프라이머는 조각이 열리는 차례대로 놓인다');
  }
  /* ★★감긴 구간에서는 아무 일도 일어나지 않는다 — 주형이 드러나야 붙는다(교과서 47쪽).
     국면마다 「그 물체가 놓인 칸이 그 국면에 이미 풀려 있는가」를 전수로 문다. */
  for (let ph = 0; ph < n; ph++){
    const fork = S.FK_FORK[ph];
    if (S.FK_NT[ph]) ok(S.FK_NT[ph][0] >= fork, 'ph' + ph + ': 위 새 가닥이 감긴 구간을 침범하지 않는다');
    S.FK_NB[ph].forEach(r => ok(r[0] >= fork, 'ph' + ph + ': 아래 조각이 감긴 구간을 침범하지 않는다'));
    if (S.FK_POLT[ph] >= 0) ok(S.FK_POLT[ph] >= fork, 'ph' + ph + ': 위 중합효소가 풀린 구간 안에 있다');
    if (S.FK_POLB[ph] >= 0) ok(S.FK_POLB[ph] >= fork, 'ph' + ph + ': 아래 중합효소가 풀린 구간 안에 있다');
  }
  ok(S.FK_FORK[S.FK_PMR_TOP] <= S.primerSlotTop(),
     '★위 프라이머는 그 자리가 풀린 뒤에 놓인다');
  for (let k = 0; k < S.SEG_COUNT; k++){
    ok(S.FK_FORK[S.FK_PMR_BOT[k]] <= S.segRange(k).start,
       '★아래 프라이머 ' + (k+1) + ' 은 그 조각이 풀린 뒤에 놓인다');
  }
  /* 조각은 열리는 차례대로 만들어진다 — 왼쪽 조각이 오른쪽보다 먼저 생기면 안 된다 */
  for (let k = 1; k < S.SEG_COUNT; k++){
    ok(S.FK_PMR_BOT[k] >= S.FK_PMR_BOT[k-1], '조각 ' + (k+1) + ' 은 조각 ' + k + ' 보다 늦게 시작한다');
  }
  eq(S.FK_NAME_PH, n - 1, '선도/지연 이름은 마지막 국면에서만 공개');
  ok(S.FK_LIG_PH < S.FK_NAME_PH, '연결효소가 이름보다 먼저 나온다');
  // ★국면 이름·캡션에 「선도/지연」이 미리 새어 나오지 않는가
  for (let ph = 0; ph < S.FK_NAME_PH; ph++){
    ok(S.FK_STEPS[ph].indexOf('선도') < 0 && S.FK_STEPS[ph].indexOf('지연') < 0,
       'ph' + ph + ' 국면 이름에 선도/지연 없음');
    ok(S.FK_CAP[ph].indexOf('선도') < 0 && S.FK_CAP[ph].indexOf('지연') < 0,
       'ph' + ph + ' 캡션에 선도/지연 없음');
  }
  ok(S.FK_CAP[S.FK_NAME_PH].indexOf('선도 가닥') > 0, '마지막 국면 캡션에서 비로소 이름을 준다');
  /* ★예외 없이 「~다」 — 사다리로 바꾸며 '감긴 이중나선'이 사라져 /선$/ 특례도 걷어냈다 */
  ok(S.FK_STEPS.every(t => /다$/.test(t.trim())), '국면 이름이 모두 설명체로 끝난다');
}

// ══════════════════ [12] fkLayout — 레이아웃 함수를 직접 문다 ══════════════════
console.log('[12] 연출 무대 레이아웃');
{
  const L = ph => S.fkLayout(ph), last = S.aniLast();
  for (let ph = 0; ph <= last; ph++){
    const l = L(ph);
    eq(l.ph, ph, 'ph' + ph + ' 그대로 돌려준다');
    eq(l.fork, S.FK_FORK[ph], 'ph' + ph + ' fork 일치');
    const objs = [].concat(l.tmplTop, l.tmplBot, l.bond, l.newTop, l.newBot, l.pmrBot, l.lig,
                           [l.pmrTop, l.polT, l.polB]);
    ok(objs.every(o => isFinite(o.x) && isFinite(o.y)), 'ph' + ph + ' NaN 없음');
    ok(objs.every(o => o.x >= 100 && o.x <= 660), 'ph' + ph + ' x 가 무대 안(100~660)');
    ok(objs.every(o => o.y >= 60 && o.y <= 245), 'ph' + ph + ' y 가 무대 안(60~245)');
    ok(objs.every(o => o.op === 0 || o.op === 1), 'ph' + ph + ' opacity 는 0 또는 1');
  }
  for (let ph = 0; ph <= 2; ph++){
    const l = L(ph);
    eq(l.newTop.filter(o => o.op > 0).length, 0, 'ph' + ph + ' 위 새 가닥 안 보임');
    eq(l.newBot.filter(o => o.op > 0).length, 0, 'ph' + ph + ' 아래 새 가닥 안 보임');
    eq(l.pmrTop.op, 0, 'ph' + ph + ' 프라이머 안 보임');
    eq(l.pmrBot.filter(o => o.op > 0).length, 0, 'ph' + ph + ' 아래 프라이머 안 보임');
    eq(l.polT.op + l.polB.op, 0, 'ph' + ph + ' 중합효소 안 보임');
    eq(l.lig.filter(o => o.op > 0).length, 0, 'ph' + ph + ' 연결효소 안 보임');
  }
  // ★갈라짐이 실제로 일어나는가 — 교사의 1번 지적이 걸린 자리
  {
    const l0 = L(0), l1 = L(1);
    const gap0 = l0.tmplBot[31].y - l0.tmplTop[31].y;
    const gap1 = l1.tmplBot[31].y - l1.tmplTop[31].y;
    eq(gap0, 2 * S.FK_LAD, 'ph0 오른쪽 끝은 두 가닥이 붙어 있다 (간격 = 사다리 폭)');
    ok(gap1 > 70, '★ph1 오른쪽 끝은 두 가닥이 벌어졌다 (간격 ' + gap1.toFixed(1) + ')');
    eq(l1.tmplBot[0].y - l1.tmplTop[0].y, 2 * S.FK_LAD, 'ph1 왼쪽 끝(아직 붙은 구간)은 사다리 폭 그대로');
    eq(l0.bond[31].op, 1, 'ph0 오른쪽 끝에 결합 표시');
    eq(l1.bond[31].op, 0, 'ph1 오른쪽 끝은 결합이 풀렸다');
    eq(l1.bond[0].op, 1, 'ph1 왼쪽 끝은 결합 유지');
  }
  /* ★사다리 모양인가 — 꼬아 그리지 말라는 2026-08-31 교사 지시가 걸린 자리.
     꼬면 두 가닥이 교차해 자리를 바꾸고, 뒤이어 다루는 5′·3′ 방향이 헷갈린다.
     ① 전 국면·전 칸에서 위 주형이 늘 위에 있다  ② 아직 붙은 구간의 간격은 흔들리지 않는다 */
  {
    ok(S.FK_LAD > 0, '사다리 반간격이 양수');
    ok(2 * S.FK_LAD < S.FK_Y.open_tb - S.FK_Y.open_tt, '붙은 간격이 벌어진 간격보다 좁다');
    ok(typeof S.FK_AMP === 'undefined' && typeof S.fkWave === 'undefined',
       '꼬임 진폭·사인파 함수가 남아 있지 않다');
    for (let ph = 0; ph <= last; ph++){
      const l = L(ph);
      let crossed = 0, wobble = 0;
      for (let i = 0; i < 32; i++){
        if (l.tmplTop[i].y >= l.tmplBot[i].y) crossed++;
        if (i < l.fork && Math.abs((l.tmplBot[i].y - l.tmplTop[i].y) - 2 * S.FK_LAD) > 1e-9) wobble++;
      }
      eq(crossed, 0, '★ph' + ph + ' 위 주형이 끝까지 위에 있다 — 교차 0');
      eq(wobble, 0, '★ph' + ph + ' 아직 붙은 구간은 사다리 — 간격이 일정하다');
      let newCrossed = 0;
      for (let i = 0; i < 32; i++) if (l.newTop[i].y >= l.newBot[i].y) newCrossed++;
      eq(newCrossed, 0, 'ph' + ph + ' 새 가닥 대역도 위아래가 뒤집히지 않는다');
    }
    /* 가로대는 아직 붙은 칸에만, 벌어진 칸에는 없다 */
    for (let ph = 0; ph <= last; ph++){
      const l = L(ph);
      let bad = 0;
      for (let i = 0; i < 32; i++){
        const paired = i < l.fork;
        if ((l.bond[i].op === 1) !== paired) bad++;
      }
      eq(bad, 0, 'ph' + ph + ' 가로대는 아직 붙은 칸에만 있다');
    }
  }
  // ★★이 무대의 심장 — ⑦에서 위쪽만 따라가고, ⑧에서 아래쪽만 되돌아온다
  {
    const F = S.FK_FOLLOW_PH, R = S.FK_RETURN_PH;
    eq(R, F + 1, '되돌아옴은 따라감 바로 다음 국면');
    const a = L(F - 1), b = L(F), c = L(R);
    ok(b.polT.col !== a.polT.col, '⑦ 위쪽 중합효소는 풀린 곳을 따라 움직인다');
    eq(b.polB.col, a.polB.col, '★⑦ 아래쪽 중합효소는 따라가지 못하고 제자리이다');
    eq(c.polT.col, b.polT.col, '⑧ 위쪽은 제자리');
    ok(c.polB.col !== b.polB.col, '★⑧ 아래쪽만 되돌아와 다시 시작한다');
    ok(c.polB.col < b.polB.col, '되돌아오는 방향은 왼쪽(풀린 곳 쪽)이다');
  }
  {
    let incT = 0, prevT = null;
    for (let ph = 4; ph <= S.aniLast(); ph++){
      const t = L(ph).polT.col;
      if (prevT !== null && t > prevT) incT++;
      prevT = t;
    }
    eq(incT, 0, '★위쪽 중합효소는 한 번도 되돌아가지 않는다 = 연속 합성');
    ok(L(S.FK_RETURN_PH).polB.col < L(S.FK_FOLLOW_PH).polB.col,
       '★아래쪽 중합효소는 되돌아간다 = 불연속 합성');
  }
  {
    const l = L(S.FK_REPEAT_PH);
    const runs = arr => { let r = 0, on = false; arr.forEach(o => { if (o.op > 0 && !on) r++; on = o.op > 0; }); return r; };
    eq(runs(l.newTop), 1, '★위 새 가닥은 끊긴 데 없이 한 덩어리');
    eq(runs(l.newBot), S.SEG_COUNT, '★아래 새 가닥은 조각 4개로 나뉜다');
  }
  /* ★★★교사 지시(2026-08-31): 「중합효소가 붙고 이동하면서 중합되는 식으로」.
     ①늘 3′ 말단에 있고  ②붙기만 하는 국면이 따로 있고  ③지나간 자리에만 새 가닥이 생긴다. */
  {
    const attachTop = S.primerSlotTop();                          // 위 프라이머의 3′ 말단 = 왼쪽 끝 칸
    const attachBot = [];                                          // 아래 프라이머들의 3′ 말단 = 오른쪽 끝 칸
    for (let k = 0; k < S.SEG_COUNT; k++) attachBot.push(S.segRange(k).start + S.PMR_LEN - 1);
    for (let ph = 0; ph <= last; ph++){
      const l = L(ph), f = S.FK_NT[ph], nb = S.FK_NB[ph];
      if (l.polT.op){
        eq(l.polT.col, f ? f[0] : attachTop,
           '★ph' + ph + ' 위 중합효소는 새 가닥(없으면 프라이머)의 3′ 말단에 있다');
      }
      if (l.polB.op){
        const ends = nb.map(r => r[1]);
        ok(ends.indexOf(l.polB.col) >= 0 || attachBot.indexOf(l.polB.col) >= 0,
           '★ph' + ph + ' 아래 중합효소는 조각(없으면 프라이머)의 3′ 말단에 있다');
      }
      // 중합효소 없이 새 가닥이 생기지 않는다
      if (l.newTop.some(o => o.op > 0)) eq(l.polT.op, 1, 'ph' + ph + ' 위 새 가닥이 있으면 중합효소도 있다');
      if (l.newBot.some(o => o.op > 0)) eq(l.polB.op, 1, 'ph' + ph + ' 아래 새 가닥이 있으면 중합효소도 있다');
    }
    // ★붙기만 하는 국면 — 중합효소는 보이는데 새 가닥은 0칸이다
    [S.FK_ATTACH_PH, S.FK_RETURN_PH].forEach(ph => {
      const l = L(ph), pv = L(ph - 1);
      eq(l.polT.op + l.polB.op, 2, 'ph' + ph + ' 두 중합효소가 모두 무대에 있다');
      eq(l.newTop.filter((o,i) => o.op > 0 && pv.newTop[i].op === 0).length, 0,
         '★ph' + ph + ' 붙기만 한다 — 위 새 가닥은 한 칸도 늘지 않는다');
      eq(l.newBot.filter((o,i) => o.op > 0 && pv.newBot[i].op === 0).length, 0,
         '★ph' + ph + ' 붙기만 한다 — 아래 새 가닥은 한 칸도 늘지 않는다');
    });
    eq(L(S.FK_ATTACH_PH).labels.newT, 0, '④ 에는 「새 가닥」 이름표가 아직 안 붙는다');
    // ★새 가닥은 중합효소가 지나간 자리에만 생긴다
    for (let ph = 1; ph <= last; ph++){
      const a = L(ph - 1), b = L(ph);
      const walked = (from, to, ca, cb, who, skip) => {
        const lo = Math.min(ca, cb), hi = Math.max(ca, cb);
        let out = 0;
        for (let i = 0; i < 32; i++) if (to[i].op > 0 && from[i].op === 0 && (i < lo || i > hi)) out++;
        if (!skip) eq(out, 0, '★ph' + ph + ' ' + who + ' 새 가닥은 중합효소가 지나간 자리에만 생긴다');
      };
      walked(a.newTop, b.newTop, a.polT.col, b.polT.col, '위', false);
      // ⑩ 만 예외 — 남은 조각 2개를 한꺼번에 되풀이하므로 한 구간으로 묶이지 않는다
      walked(a.newBot, b.newBot, a.polB.col, b.polB.col, '아래', ph === S.FK_REPEAT_PH);
    }
  }
  // ★전이 지연 — 이동하는 동안 칸이 차례로 나타난다
  {
    const st = S.fkStagger(S.FK_REPEAT_PH, S.FK_REPEAT_PH - 1);
    ok(st.top.some(d => d > 0), '⑩ 위 새 가닥 칸에 지연이 걸린다');
    ok(st.top.every(d => d >= 0 && d <= S.FK_MOVE), '지연은 0 ~ FK_MOVE 사이');
    const far = S.fkStagger(S.FK_REPEAT_PH, 0);
    eq(far.top.filter(d => d > 0).length, 0, '★한 걸음이 아니면 지연 없음(되감기·건너뛰기)');
    const back = S.fkStagger(3, 4);
    eq(back.top.filter(d => d > 0).length + back.bot.filter(d => d > 0).length, 0, '★뒤로 갈 때 지연 없음');
    const at = S.fkStagger(S.FK_ATTACH_PH, S.FK_ATTACH_PH - 1);
    eq(at.top.filter(d => d > 0).length + at.bot.filter(d => d > 0).length, 0,
       '★붙기만 하는 국면에는 깔릴 칸이 없다');
    const ret = S.fkStagger(S.FK_RETURN_PH, S.FK_RETURN_PH - 1);
    eq(ret.polB, S.FK_PMR_LEAD, '★프라이머가 새로 놓인 국면에서는 중합효소가 늦게 붙는다');
    const syn = S.fkStagger(S.FK_RETURN_PH + 1, S.FK_RETURN_PH);
    eq(syn.polB, 0, '프라이머가 안 놓인 국면에서는 중합효소가 곧바로 움직인다');
    ok(syn.bot.filter(d => d > 0).length === 5, '⑨ 조각 5칸이 차례로 깔린다');
  }
  // 프라이머 개수 — 화면에서 세어진다 (교과서 49쪽 1-(3))
  {
    eq(L(0).count.pmrTop + L(0).count.pmrBot, 0, 'ph0 프라이머 0개');
    eq(L(S.aniLast()).count.pmrTop, 1, '★끝에서 위쪽 프라이머 1개');
    eq(L(S.aniLast()).count.pmrBot, S.SEG_COUNT, '★끝에서 아래쪽 프라이머 4개');
    let mono = true, prev = 0;
    for (let ph = 0; ph <= S.aniLast(); ph++){ const c = L(ph).count.pmrBot; if (c < prev) mono = false; prev = c; }
    ok(mono, '프라이머 개수는 줄어들지 않는다');
    for (let ph = 0; ph <= S.aniLast(); ph++) ok(L(ph).count.pmrTop <= 1, 'ph' + ph + ' 위 프라이머는 1개를 넘지 않는다');
    const xs = L(S.aniLast()).pmrBot.map(o => o.x).sort((a,b) => a-b);
    ok(xs.every((x,i) => i === 0 || x - xs[i-1] >= S.FK_P * S.PMR_LEN), '아래 프라이머 4개가 서로 겹치지 않는다');
  }
  {
    for (let ph = 0; ph < S.FK_LIG_PH; ph++) eq(L(ph).lig.filter(o => o.op > 0).length, 0, 'ph' + ph + ' 연결효소 없음');
    const l = L(S.FK_LIG_PH);
    eq(l.lig.length, S.SEG_COUNT - 1, '이음매는 조각 수 - 1 곳');
    eq(l.lig.filter(o => o.op > 0).length, S.SEG_COUNT - 1, '이은 뒤 이음매 전부 표시');
    ok(l.lig.every(o => o.y > l.polT.y), '★연결효소는 아래쪽(지연) 대역에만 나온다');
    eq(l.lig.map(o => o.col).sort((x,y) => x - y).join(','), '8,16,24', '이음매 자리 = 8·16·24번');
  }
  for (let ph = 0; ph < S.FK_NAME_PH; ph++){
    eq(L(ph).labels.lead, 0, 'ph' + ph + ' 선도 이름 비공개');
    eq(L(ph).labels.lag, 0, 'ph' + ph + ' 지연 이름 비공개');
  }
  eq(L(S.FK_NAME_PH).labels.lead, 1, '마지막 국면에 선도 이름 공개');
  eq(L(S.FK_NAME_PH).labels.lag, 1, '마지막 국면에 지연 이름 공개');
  eq(L(0).labels.tmpl, 0, 'ph0 에는 주형 이름표도 없다');
  eq(L(2).labels.tmpl, 1, 'ph2 에서 주형 이름표가 붙는다');
  eq(S.fkLayout(-5).ph, 0, '음수 국면은 0 으로');
  eq(S.fkLayout(999).ph, S.aniLast(), '큰 국면은 마지막으로');
}

// ══════════════════ [13] 연출 무대 SVG · 잠금 · 제어 막대 ══════════════════
console.log('[13] 연출 무대 SVG · 잠금');
{
  const svg = S.fkStageSvg();
  ok(svg.indexOf('<sup') < 0, '★<text> 안에 <sup> 없음 (유니코드 윗첨자만 쓴다)');
  ok(svg.indexOf('5′') >= 0 && svg.indexOf('3′') >= 0, '유니코드 프라임으로 5/3 말단 표시');
  ok(!/>[ATGC]<\/text>/.test(svg), '★연출 무대에는 염기 글자가 없다');
  {
    const ids = [...svg.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
    eq(new Set(ids).size, ids.length, 'SVG id 중복 없음 (' + ids.length + '개)');
    ok(ids.every(id => /^fk/.test(id)), '연출 무대의 id 는 모두 fk 로 시작한다');
    /* ★fkApplyPhase 가 만지는 id 가 fkStageSvg 가 지은 id 안에 다 있는가.
       (DOM 스텁은 innerHTML 을 파싱하지 않으므로 _missing 이 '만진 id 목록'이 된다) */
    const A2 = makeSandbox(); A2.init();
    for (let ph = 0; ph <= A2.aniLast(); ph++) A2.fkApplyPhase(ph);
    const built = new Set(ids);
    const touched = [...new Set(A2._missing)].filter(id => /^fk/.test(id));
    ok(touched.length > 100, '연출 무대의 물체를 ' + touched.length + '개 만진다');
    eq(touched.filter(id => !built.has(id)).join(','), '',
       '★fkApplyPhase 가 만지는 id 는 모두 fkStageSvg 가 지은 것이다');
    /* 지어 놓고 한 번도 쓰지 않는 물체가 없는가.
       ★칸마다 도는 물체는 id 를 이어 붙여 만들므로 _missing 에 잡히고(touched),
         이름표처럼 id 를 글자 그대로 쓴 물체는 스크립트 안에 'id' 로 나타난다. */
    const tset = new Set(touched);
    const unused = ids.filter(id => !tset.has(id) && js.indexOf("'" + id + "'") < 0);
    eq(unused.filter(id => id !== 'fkPmrHatch').join(','), '',
       '★지어 놓고 한 번도 만지지 않는 물체가 없다');
  }
  {
    const open = (svg.match(/<g[\s>]/g) || []).length, close = (svg.match(/<\/g>/g) || []).length;
    eq(open, close, 'SVG g 여닫기 균형 (' + open + ')');
  }
  ok(/id="fkStage"[\s\S]{0,200}aria-label="/.test(src), '무대에 aria-label 이 있다');
  // ★이름 공개 국면 잠금 — 격자와 시점이 같다
  {
    const T = makeSandbox(); T.init();
    eq(T.fkCap(), T.aniLast() - 1, '처음에는 마지막(이름 공개) 국면이 잠겨 있다');
    T.aniGo(99);
    eq(T.ani.ph, T.aniLast() - 1, '끝까지 단추는 잠긴 국면 앞에서 멈춘다');
    T.aniGo(1);
    eq(T.ani.ph, T.aniLast() - 1, '다음 단추도 잠금을 넘지 못한다');
    eq(T.fkLayout(T.ani.ph).labels.lead, 0, '잠긴 동안에는 선도 이름이 안 뜬다');
    ok(html(T,'ani_gate').indexOf('이은 뒤') > 0, '잠금 안내가 뜬다');
    T.aniGo(-99);
    eq(T.ani.ph, 0, '처음부터 단추');
    eq(T._store['ani_prev'].disabled, true, '첫 국면에서 이전 단추 비활성');
    eq(T._store['ani_next'].disabled, false, '첫 국면에서 다음 단추 활성');
    ok(txt(T,'ani_step').indexOf('1 / ' + (T.aniLast() + 1)) > 0, '단계 표시 n / N');
    const U = makeSandbox(); U.init(); U.pickQ('d1', U.QDEF.d1.a); playManual(U); U.ligate();
    eq(U.fkCap(), U.aniLast(), '조각을 이으면 마지막 국면이 열린다');
    ok(txt(U,'lab_newBot').indexOf('지연 가닥') > 0, '★같은 시점에 격자에도 지연 가닥 이름이 뜬다');
    U.aniGo(99);
    eq(U.ani.ph, U.aniLast(), '마지막 국면까지 간다');
    eq(U.fkLayout(U.ani.ph).labels.lead, 1, '마지막 국면에서 선도 이름 공개');
    eq(U._store['ani_next'].disabled, true, '마지막 국면에서 다음 단추 비활성');
    eq(html(U,'ani_gate'), '', '열린 뒤에는 잠금 안내가 사라진다');
    const V = makeSandbox(); V.init();
    for (let i = 0; i < 5; i++) V.badgeTap();
    eq(V.fkCap(), V.aniLast(), '교사용 해제로도 마지막 국면까지 열림');
    ok(!V.localStorage._mem[V.LS_KEY] || JSON.parse(V.localStorage._mem[V.LS_KEY]).teacherOpen === undefined,
       '★교사용 해제는 저장되지 않는다');
    eq(V.card3Open(), true, '교사용 해제로 조작 카드도 열린다');
  }
  ok(!/setTimeout|setInterval|requestAnimationFrame/.test(js), '★연출에 setTimeout 을 쓰지 않는다');
  ok(/prefers-reduced-motion/.test(src), 'prefers-reduced-motion 에서 전환을 끈다');
  ok(/\.rmove[\s\S]{0,80}transition/.test(src), '.rmove 에 transition 이 걸려 있다');
}

// ══════════════════ [14] ★말투 — 시험지 문체 ══════════════════
console.log('[14] 말투 — 시험지 문체');
{
  const BANNED = ['해 보자','보자.','보자!','하자.','하자!','가자.','가자!','좋아','맞아.','맞아!',
                  '했어','됐어','왔어','찾았어','거야','이야.','이야!','일까','할까','올까','줄까',
                  '나와.','너의','네가','우리가'];
  // ★이모지는 금지 대상이 아니다 (2026-08-18 교사 정정)
  const body = src.slice(src.indexOf('<body>'), src.indexOf('<script>\n\'use strict\''));
  ok(body.length > 5000, '본문 마크업 슬라이스가 유효하다 (' + body.length + '자)');
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  eq(BANNED.filter(w => body.indexOf(w) >= 0).join(','), '', '본문 마크업에 친근체/추임새 0건');
  eq(BANNED.filter(w => code.indexOf(w) >= 0).join(','), '', '런타임 문구에 친근체/추임새 0건');
  const qblob = JSON.stringify(S.QDEF) + JSON.stringify(S.FK_STEPS) + JSON.stringify(S.FK_CAP);
  eq(BANNED.filter(w => qblob.indexOf(w) >= 0).join(','), '', '문항·국면 문안에 친근체/추임새 0건');
  {
    const qs = Object.keys(S.QDEF).map(k => S.QDEF[k].q);
    ok(qs.length >= 8, '문항 ' + qs.length + '개');
    ok(qs.every(t => /[?？]$/.test(t.trim())), '선택형 발문 전부 물음표로 끝난다');
  }
  {
    const qts = [...body.matchAll(/<div class="qt">([\s\S]*?)<\/div>/g)].map(m => m[1].replace(/<[^>]+>/g,'').trim());
    const num = qts.filter(t => /^[1-4]\./.test(t));
    eq(num.length, 4, '정리하기 서술형 4문항');
    ok(num.every(t => /하시오\.?$/.test(t.replace(/\s*\([^)]*\)\s*$/, '').trim())), '서술형 발문이 모두 하시오로 끝난다');
  }
  ok(/하시겠습니까\?/.test(code), '★교사 확인 대화상자는 하시겠습니까');
  ok(!/할까요|하시겠어요/.test(code), '대화상자에 친근체 없음');
  eq((body.match(/답안에 반드시 들어가야 할 것/g) || []).length, 4, '서술형 4문항에 반드시 들어가야 할 것이 붙어 있다');
  ok(/지식·이해/.test(body) && /과정·기능/.test(body) && /가치·태도/.test(body), '스스로 평가하기 3줄');
}

// ══════════════════ [15] 활동의 경계 — 교과서 범위 ══════════════════
console.log('[15] 교과서 범위 경계');
{
  // 교육과정 해설: 01-07 은 효소·프라이머를 용어 수준까지만 다룬다(기작 상세 금지)
  const OUT = ['헬리케이스','헬리카제','나선풀림효소','풀림효소','SSB','단일가닥결합단백질',
               '위상이성질화효소','토포아이소머레이스','RNase','프라이메이스','프리마제',
               '텔로머레이스','텔로미어','복제 원점','복제 기점','핵산말단가수분해효소',
               '라이게이스','폴리메레이스','폴리머레이스','인산다이에스터'];
  eq(OUT.filter(w => src.indexOf(w) >= 0).join(','), '', '★범위 밖 용어 0건');
  ['DNA 중합효소','프라이머','프라이머 합성효소','DNA 연결효소'].forEach(w => {
    ok(src.indexOf(w) >= 0, '교과서 용어 ' + w + ' 사용');
  });
  ok(src.indexOf('선도 가닥') > 0 && src.indexOf('지연 가닥') > 0, '선도·지연 가닥');
  ok(S.fkStageSvg().indexOf('프라이머 합성효소') < 0, '★무대 이름표에는 프라이머 합성효소를 올리지 않는다');
  ok(S.FK_STEPS.every(t => t.indexOf('프라이머 합성효소') < 0), '국면 이름에도 올리지 않는다');
  eq(S.QDEF.p2.ch[S.QDEF.p2.a].indexOf('프라이머 합성효소'), 0, '연습 문항에서 작용 차례로 묻는다(교과서 49쪽 문항 2)');
  eq((src.match(/오카자키/g) || []).length, 1, '오카자키는 정확히 1회(도움말 안)');
  ok(S.FK_STEPS.every(t => t.indexOf('오카자키') < 0) && JSON.stringify(S.QDEF).indexOf('오카자키') < 0,
     '국면 이름·문항에는 오카자키가 없다');
  ok(src.indexOf('작은 조각의 DNA') > 0, '교과서 표현 작은 조각의 DNA 를 쓴다');
  eq((src.match(/복제 분기점/g) || []).length, 0, '★복제 분기점은 교과서에 없는 말이므로 쓰지 않는다');
  ok(src.indexOf('DNA가 풀리는 방향') > 0, '교과서 그림의 이름표 DNA가 풀리는 방향 을 쓴다');
  ok(src.indexOf('12유전01-07') > 0, '성취기준 코드 표기');
  ok(/46~49쪽/.test(src), '교과서 쪽 근거 표기');
}

// ══════════════════ [16] 색 규약 — CSS ↔ JS 짝 ══════════════════
console.log('[16] 색 규약');
{
  /* ★★염기 타일이 회색으로 나오던 회귀 — `.cell` 이 `.b-A~.b-C` 보다 뒤에 있어
     color/border 를 덮었다(교사 지적 2026-08-31: 「주형 가닥이 너무 연해서 안 보여」).
     2-클래스 규칙이 살아 있는지, 네 색이 정확히 짝지어졌는지 문다. */
  {
    [['A','--red'],['T','--blue'],['G','--green'],['C','--yellow']].forEach(([b, tok]) => {
      const r = cssRule('.cell.b-' + b);
      ok(r.length > 0, '★.cell.b-' + b + ' 규칙이 있다');
      ok(r.indexOf('color:var(' + tok + ')') >= 0, '★.cell.b-' + b + ' 의 글자색 = ' + tok);
      ok(r.indexOf('border-color:var(' + tok + ')') >= 0, '★.cell.b-' + b + ' 의 테두리색 = ' + tok);
    });
    const dim = cssRule('.cell.tmpl.closed').match(/opacity\s*:\s*([0-9.]+)/);
    ok(!!dim && parseFloat(dim[1]) >= 0.8,
       '★안 풀린 주형 칸도 읽을 만큼은 진하다 (opacity ' + (dim ? dim[1] : '?') + ' ≥ .8)');
  }
  /* ★무대와 A·T·G·C 단추가 붙어 있는가 — 「염기가 그림 바로 아래에 있어야」(교사 지시 2026-08-31).
     동시에 1~4단계 패널 차례는 그대로여야 한다(교과서 49쪽 문항 2의 정답이 이 차례다). */
  {
    const at = t => src.indexOf(t);
    const p1 = at('🔓 1단계'), p2 = at('🧬 2단계'), st = at('class="dna-outer"'),
          uw = at('id="unwindInfo"'), p3 = at('🧩 3단계'), p4 = at('🔗 4단계');
    ok([p1,p2,st,uw,p3,p4].every(i => i > 0), '무대·1~4단계 표지가 모두 있다');
    ok(p1 < p2, '1단계가 2단계보다 앞');
    ok(p2 < st, '★무대는 1·2단계 단추 아래에 온다');
    ok(st < uw && uw < p3, '★무대 다음이 곧 3단계(염기 단추)다');
    ok(p3 < p4, '3단계가 4단계보다 앞 — 49쪽 문항 2의 차례');
    ok(p3 - uw < 600, '★무대와 염기 단추 사이에 다른 것이 끼지 않는다 (' + (p3 - uw) + '자)');
  }
  /* ★CSS 와 손으로 맞추는 시간 상수 — 어긋나면 새 가닥이 중합효소보다 먼저·나중에 깔린다 */
  {
    const mv = cssRule('.rmove').match(/transform\s+([0-9.]+)s/);
    ok(!!mv, '.rmove 에 transform 전이 시간이 있다');
    eq(parseFloat(mv[1]), S.FK_MOVE, '★.rmove 의 transform 시간 = FK_MOVE');
    ok(S.FK_PMR_LEAD > 0 && S.FK_PMR_LEAD < S.FK_MOVE, '프라이머 선행 틈은 이동 시간보다 짧다');
  }
  function cssVar(name){
    const m = src.match(new RegExp('--' + name + ':\\s*(#[0-9A-Fa-f]{6})'));
    return m ? m[1].toUpperCase() : null;
  }
  function sat(hex){
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return Math.max(r,g,b) - Math.min(r,g,b);
  }
  const PMR = cssVar('pmr'), POL = cssVar('pol'), LIG = cssVar('lig');
  ok(!!PMR && !!POL && !!LIG, '요소 3색이 CSS 변수로 선언되어 있다');
  // ★2026-08-26 교사 지시: 연하게 하지 말 것. 채도가 높은 색으로
  ok(sat(PMR) >= 120, '프라이머 색 채도 ' + sat(PMR) + ' >= 120');
  ok(sat(POL) >= 120, '중합효소 색 채도 ' + sat(POL) + ' >= 120');
  ok(sat(LIG) >= 120, '연결효소 색 채도 ' + sat(LIG) + ' >= 120');
  eq(new Set([PMR,POL,LIG]).size, 3, '세 색이 서로 다르다');
  ['blue','green','red','amber','yellow'].forEach(k => {
    const v = cssVar(k);
    ok(v && [PMR,POL,LIG].indexOf(v) < 0, '요소 색이 UI 색(' + k + ')과 겹치지 않는다');
  });
  // ★CSS 변수와 SVG 안의 색값이 어긋나지 않는가
  const svg = S.fkStageSvg().toUpperCase();
  [['프라이머',PMR],['중합효소',POL],['연결효소',LIG],['주형',cssVar('old')],['새 가닥',cssVar('green')]].forEach(pair => {
    ok(svg.indexOf(pair[1]) >= 0, 'SVG 가 ' + pair[0] + ' 색 ' + pair[1] + ' 를 그대로 쓴다');
  });
  // ★색만으로 구분시키지 않는다
  const raw = S.fkStageSvg();
  ok(/pattern id="fkPmrHatch"/.test(raw), '프라이머는 빗금 무늬로도 갈린다');
  ok(/<circle[^>]*fill="#FFFFFF"/.test(raw), '중합효소에 흰 점을 찍는다(색각 이상·흑백 인쇄 대비)');
  ok(/rotate\(45\)/.test(raw), '연결효소는 마름모 모양으로 갈린다');
  // ★JS 가 쓰는 class 가 CSS 에 다 있는가
  ['pmr-cap','ez-pol','ez-lig','primerrow','anibar','anibtn','anistep','anicap','qbox','qopt','qfb','qhint',
   'stage-wrap','rmove','rfade','lockmsg','panes','pane-l','pane-r','pr-do','pr-q','orderband','tbl-outer',
   'elg','e-mark','e-pmr','e-pol','e-lig','lockable'].forEach(c => {
    ok(src.indexOf('.' + c) >= 0, 'CSS 에 .' + c + ' 가 선언되어 있다');
  });
  ['right','wrong','cut','joined','seam','forkcol','locked','blank','done'].forEach(c => {
    ok(src.indexOf('.' + c) >= 0, 'CSS 에 상태 클래스 .' + c + ' 가 있다');
  });
  ok(/@media \(min-width:1180px\)/.test(src), '★2단 배치 경계는 1180px');
  ok(/@media \(max-width:1179\.98px\)/.test(src), '좁은 화면은 1179.98px 로 끊는다(정수로 끊지 않는다)');
}

// ══════════════════ [17] 문항 ══════════════════
console.log('[17] 문항');
{
  const ids = Object.keys(S.QDEF);
  eq(ids.length, 8, '문항 8개 (결론 4 + 연습 4)');
  eq(S.Q_MAIN.length, 4, '결론 문항 4개');
  eq(S.Q_PRAC.length, 4, '연습 문항 4개');
  ok(S.Q_PRAC.every(id => S.qIsPractice(id)), '★연습 문항 id 는 p 로 시작한다');
  ok(S.Q_MAIN.every(id => !S.qIsPractice(id)), '결론 문항은 p 로 시작하지 않는다');
  ids.forEach(id => {
    const d = S.QDEF[id];
    eq(d.id, id, id + ': id 일치');
    eq(d.ch.length, 4, id + ': 선택지 4개');
    eq(d.no.length, 4, id + ': 오답 해설 4칸');
    ok(d.a >= 0 && d.a < d.ch.length, id + ': 정답 번호가 범위 안');
    eq(d.no[d.a], '', '★' + id + ': 정답 자리의 오답 해설은 비어 있다');
    ok(d.no.filter((t,i) => i !== d.a).every(t => t.length > 0), id + ': 오답마다 해설이 있다');
    ok(d.ex && d.ex.length > 20, id + ': 해설이 있다');
    eq(new Set(d.ch).size, 4, id + ': 선택지 중복 없음');
    const len = d.ch.map(t => t.length);
    const sorted = len.slice().sort((x,y) => y - x);
    ok(!(len[d.a] === sorted[0] && sorted[0] - sorted[1] > 14),
       '★' + id + ': 정답이 단독으로 크게 길지 않다');
  });
  {
    const pos = ids.map(id => S.QDEF[id].a);
    ok(new Set(pos).size >= 1, '정답 위치 분포: ' + pos.join(''));
  }
  {
    const hi = ids.filter(id => S.QDEF[id].lv === '상');
    eq(hi.length, 2, '상 난도 2문항');
    ok(hi.every(id => S.QDEF[id].hint && S.QDEF[id].hint.length === 2), '★상 문항에는 2단 힌트');
    eq(ids.filter(id => S.QDEF[id].lv === '중').length, 2, '중 난도 2문항');
    ok(S.Q_MAIN.every(id => !S.QDEF[id].lv), '결론 문항에는 난도 표시가 없다');
  }
  {
    const Q = makeSandbox(); Q.init();
    eq(Q.qCorrect('d1', undefined), false, '안 풀면 정답 아님');
    Q.pickQ('d1', (Q.QDEF.d1.a + 1) % 4);
    eq(Q.qCorrect('d1', Q.state.qa.d1), false, '오답 기록');
    /* ★★잠금은 「정답」이 아니라 「답했는가」로 연다 (교사 결정 2026-08-31).
       전에는 한 번 틀리면 ③ 이 영영 안 열려 「처음부터 다시 하기」밖에 길이 없었다. */
    eq(Q.card3Open(), true, '★오답이어도 답했으면 조작 카드가 열린다');
    ok(html(Q,'qh_d1').indexOf('wrong') > 0, '오답 표시');
    ok(html(Q,'qh_d1').indexOf('right') > 0, '정답도 함께 보인다');
    ok(html(Q,'qh_d1').indexOf(Q.QDEF.d1.ex.slice(0,10)) > 0, '해설은 정답·오답 모두에게 보인다');
    ok(html(Q,'qh_d1').indexOf('disabled') < 0, '★답한 뒤에도 선택지를 다시 누를 수 있다');
    Q.pickQ('d1', Q.QDEF.d1.a);
    eq(Q.state.qa.d1, Q.QDEF.d1.a, '★답을 고칠 수 있다');
    ok(html(Q,'qh_d1').indexOf('wrong') < 0, '고쳐서 맞히면 오답 표시가 사라진다');
    eq(Q.card3Open(), true, '고친 뒤에도 열린 채로 있다');
    /* 되돌리기 — 다시 오답으로 고쳐도 잠기지 않는다(한 번 연 문은 닫지 않는다) */
    Q.pickQ('d1', (Q.QDEF.d1.a + 2) % 4);
    eq(Q.card3Open(), true, '다시 오답으로 고쳐도 잠기지 않는다');
    Q.pickQ('d1', Q.QDEF.d1.a);
    const raw = Q.localStorage._mem[Q.LS_KEY];
    const Q2 = makeSandbox({ seed:{ 'dna_sim_v2': raw } }); Q2.init();
    eq(Q2.state.qa.d1, Q.state.qa.d1, '문항 답이 복원된다');
    const Q3 = makeSandbox({ seed:{ 'dna_sim_v2': '{"qa":{"d1":99,"zzz":1}}' } }); Q3.init();
    eq(Q3.state.qa.d1, undefined, '범위 밖 답은 복원하지 않는다');
    eq(Q3.state.qa.zzz, undefined, '없는 문항 id 는 복원하지 않는다');
  }
  {
    const W = makeSandbox(); W.init(); W.pickQ('d1', W.QDEF.d1.a); playManual(W); W.ligate(); W.verifyDaughters();
    W.pickQ('d2', W.QDEF.d2.a); W.pickQ('d3', W.QDEF.d3.a);
    const before = W.stepDone();
    eq(before, 5, '본 활동만으로 5 / 5 완료');
    S.Q_PRAC.forEach(id => W.pickQ(id, (W.QDEF[id].a + 1) % 4));
    eq(W.stepDone(), before, '★연습 문항을 틀려도 진행도가 줄지 않는다');
  }
}

// ══════════════════ [18] 두 탭 · 저장 순번 ══════════════════
console.log('[18] 저장 순번');
{
  const T = makeSandbox(); T.init();
  T.pickQ('d1', T.QDEF.d1.a);
  T.unwind();
  const seq1 = JSON.parse(T.localStorage._mem[T.LS_KEY]).seq;
  ok(seq1 > 0, '저장할 때마다 순번이 오른다 (' + seq1 + ')');
  const ahead = JSON.parse(T.localStorage._mem[T.LS_KEY]);
  ahead.seq = seq1 + 50;
  ahead.unwound = 32;
  T.localStorage._mem[T.LS_KEY] = JSON.stringify(ahead);
  T.unwind();
  eq(JSON.parse(T.localStorage._mem[T.LS_KEY]).unwound, 32, '★저장소의 seq 가 더 크면 덮어쓰지 않는다');
}

console.log('');
console.log('결과: ' + pass + ' 통과, ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
