// 단백질합성 모의실험 — Node 헤드리스 검사 (1-2·1-5 테스트와 동일한 vm+DOM 스텁)
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const HTML = path.join(__dirname, '2-1_단백질합성_모의실험.html');  // ★USB 드라이브 문자는 PC마다 다르다 — 경로를 박지 말 것
let src = fs.readFileSync(HTML, 'utf8');
const m = src.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!m) { console.error('FAIL: script 블록 없음'); process.exit(1); }
let js = m[1].replace(/^\s*'use strict';/, '');   // use strict 벗기기(작업노트 함정)

let pass = 0, fail = 0;
function ok(c, n){ if (c) pass++; else { fail++; console.error('  X FAIL: ' + n); } }

function makeSandbox(seed){
  const store = {};
  function makeEl(id){
    const classes = new Set();
    const el = {
      className:'', innerHTML:'', textContent:'', value:'', style:{}, children:[], attrs:{},
      onclick:null, offsetWidth:0, disabled:false, checked:false,
      classList:{ add:c=>classes.add(c), remove:c=>classes.delete(c),
        toggle:(c,f)=>{ if(f===undefined){classes.has(c)?classes.delete(c):classes.add(c);} else if(f)classes.add(c); else classes.delete(c); return classes.has(c); },
        contains:c=>classes.has(c) },
      _classes:classes,
      setAttribute:(k,v)=>{ el.attrs[k]=v; },
      appendChild:c=>{ el.children.push(c); return c; },
      querySelector:()=>makeEl(), addEventListener:()=>{}
    };
    Object.defineProperty(el,'id',{ get(){return el._id;}, set(v){ el._id=v; store[v]=el; } });
    if (id !== undefined) el.id = id;
    return el;
  }
  const mem = Object.assign({}, seed||{});
  const sb = {
    console, Math, JSON, Object, Array, String, Number, isNaN,
    document:{ getElementById:id=>store[id]||(store[id]=makeEl(id)), createElement:()=>makeEl(),
      createElementNS:()=>makeEl(), addEventListener:()=>{} },
    localStorage:{ getItem:k=>(k in mem?mem[k]:null), setItem:(k,v)=>{mem[k]=String(v);},
      removeItem:k=>{delete mem[k];}, _mem:mem },
    confirm:()=>true, location:{ reloaded:0, reload(){ this.reloaded++; } }
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(js, sb);
  sb._store = store;
  return sb;
}

/* ══════════ 독립 재유도용 표준 유전 부호 (앱의 CODON_GROUPS를 보지 않고 따로 구성) ══════════
   교과서 순서(첫 염기 U·C·A·G × 둘째 U·C·A·G × 셋째 U·C·A·G)로 64칸을 직접 나열한다. */
const AA_KO = { Phe:'페닐알라닌', Leu:'류신', Ile:'아이소류신', Met:'메싸이오닌', Val:'발린',
  Ser:'세린', Pro:'프롤린', Thr:'트레오닌', Ala:'알라닌', Tyr:'타이로신', Stop:'종결코돈',
  His:'히스티딘', Gln:'글루타민', Asn:'아스파라진', Lys:'라이신', Asp:'아스파트산',
  Glu:'글루탐산', Cys:'시스테인', Trp:'트립토판', Arg:'아르지닌', Gly:'글라이신' };
const STD = [
  'Phe','Phe','Leu','Leu',  'Ser','Ser','Ser','Ser',  'Tyr','Tyr','Stop','Stop', 'Cys','Cys','Stop','Trp',
  'Leu','Leu','Leu','Leu',  'Pro','Pro','Pro','Pro',  'His','His','Gln','Gln',   'Arg','Arg','Arg','Arg',
  'Ile','Ile','Ile','Met',  'Thr','Thr','Thr','Thr',  'Asn','Asn','Lys','Lys',   'Ser','Ser','Arg','Arg',
  'Val','Val','Val','Val',  'Ala','Ala','Ala','Ala',  'Asp','Asp','Glu','Glu',   'Gly','Gly','Gly','Gly'
];
const B4 = ['U','C','A','G'];
const MY_CODE = {};
(function(){
  let k = 0;
  for (const b1 of B4) for (const b2 of B4) for (const b3 of B4) MY_CODE[b1+b2+b3] = AA_KO[STD[k++]];
})();
const MY_DNA2RNA = { T:'A', A:'U', G:'C', C:'G' };
function myTranscribe(t){ let o=''; for (const ch of t) o += MY_DNA2RNA[ch]; return o; }
function myCodons(s){ const o=[]; for (let i=0;i+3<=s.length;i+=3) o.push(s.substr(i,3)); return o; }
function myTranslate(s){
  const cs = myCodons(s), pep = [];
  let terminated = false;
  for (const c of cs){
    const aa = MY_CODE[c];
    if (!aa) break;
    if (aa === '종결코돈'){ terminated = true; break; }
    pep.push(aa);
  }
  return { codons:cs, peptide:pep, terminated, startOk:(cs.length>0 && cs[0]==='AUG') };
}
function myComp(c){ const p={A:'U',U:'A',G:'C',C:'G'}; let o=''; for (const ch of c) o += p[ch]; return o; }
const EXP_MRNA = 'AUGGUAUACCAUAGUACGGAGGGCUGGUAG';
const EXP_PEP = ['메싸이오닌','발린','타이로신','히스티딘','세린','트레오닌','글루탐산','글라이신','트립토판'];

const S = makeSandbox();

/* ══════════════════ 1. 데이터 무결성 ══════════════════ */
console.log('[1] 코돈표·서열 데이터 무결성 (독립 재유도 대조)');
{
  ok(Object.keys(S.CODON_TABLE).length === 64, '코돈표 64개 (실제 ' + Object.keys(S.CODON_TABLE).length + ')');
  let same = 0, diff = [];
  for (const cod of Object.keys(MY_CODE)){
    if (S.CODON_TABLE[cod] === MY_CODE[cod]) same++; else diff.push(cod + ':' + S.CODON_TABLE[cod] + '≠' + MY_CODE[cod]);
  }
  ok(same === 64, '64개 코돈 모두 표준 유전 부호와 일치 (불일치: ' + diff.join(' ') + ')');
  const flat = [];
  S.CODON_GROUPS.forEach(g => g[1].forEach(c => flat.push(c)));
  ok(flat.length === 64 && new Set(flat).size === 64, 'CODON_GROUPS 코돈 중복 없음');
  const names = S.CODON_GROUPS.map(g => g[0]);
  ok(new Set(names).size === names.length, '아미노산 이름 중복 없음 (' + names.length + '종)');
  ok(S.CODON_GROUPS.filter(g => g[0] === '종결코돈')[0][1].join() === 'UAA,UAG,UGA', '종결코돈 3개 = UAA·UAG·UGA');

  ok(S.TEMPLATE_DNA.length === 30, '주형 DNA 30 뉴클레오타이드');
  ok(/^[ATGC]+$/.test(S.TEMPLATE_DNA), '주형 DNA는 A·T·G·C만');
  ok(myTranscribe(S.TEMPLATE_DNA) === EXP_MRNA, '주형 → mRNA 독립 재계산 = ' + EXP_MRNA);
  ok(S.MRNA_KEY === EXP_MRNA, 'MRNA_KEY가 독립 재계산과 일치 (실제 ' + S.MRNA_KEY + ')');
  ok(S.MRNA_KEY.indexOf('T') < 0 && S.MRNA_KEY.indexOf('?') < 0, 'mRNA에 T·미해결 염기 없음');
  ok(S.CODONS_KEY.length === 10 && S.CODONS_KEY.join('') === S.MRNA_KEY, '코돈 10개, 이어 붙이면 mRNA 원본');
  ok(JSON.stringify(S.CODONS_KEY) === JSON.stringify(myCodons(EXP_MRNA)), '코돈 분해 독립 대조');
  ok(S.CODONS_KEY[0] === 'AUG', '첫 코돈 = 개시코돈 AUG');
  ok(S.isStopCodon(S.CODONS_KEY[9]), '마지막 코돈 = 종결코돈 (' + S.CODONS_KEY[9] + ')');
  const inner = S.CODONS_KEY.slice(1, 9).filter(c => S.isStopCodon(c));
  ok(inner.length === 0, '중간에 종결코돈 없음 (실제 ' + inner.join() + ')');
  ok(JSON.stringify(S.PEPTIDE_KEY) === JSON.stringify(EXP_PEP), '폴리펩타이드 독립 재유도 대조 (실제 ' + S.PEPTIDE_KEY.join('-') + ')');
  ok(S.PEPTIDE_KEY.length === 9, '아미노산 9개');
  ok(JSON.stringify(myTranslate(EXP_MRNA).peptide) === JSON.stringify(S.PEPTIDE_KEY), '내 번역기와 앱 번역기 결과 동일');
}

console.log('[2] tRNA 카드 9장 무결성 (코돈표에서 안티코돈 독립 재유도)');
{
  const cards = S.TRNA_CARDS;
  ok(cards.length === 9, 'tRNA 카드 9장');
  ok(new Set(cards.map(c=>c.id)).size === 9, '카드 id 중복 없음');
  ok(new Set(cards.map(c=>c.aa)).size === 9, '카드 아미노산 중복 없음(자리 추적 키로 쓰임)');
  ok(new Set(cards.map(c=>c.anti)).size === 9, '안티코돈 중복 없음');
  const need = S.CODONS_KEY.slice(0,9);               // 종결코돈 제외 9개
  const needAnti = need.map(myComp);
  ok(JSON.stringify(cards.map(c=>c.anti).slice().sort()) === JSON.stringify(needAnti.slice().sort()),
     '카드 안티코돈 집합 = 코돈 9개의 상보 서열 집합');
  let allOk = true;
  cards.forEach(c => {
    const cod = myComp(c.anti);
    if (MY_CODE[cod] !== c.aa) { allOk = false; console.error('    (' + c.id + ' anti ' + c.anti + ' → ' + cod + ' = ' + MY_CODE[cod] + ' ≠ ' + c.aa + ')'); }
  });
  ok(allOk, '카드마다 안티코돈↔코돈↔아미노산이 표준 유전 부호와 맞음');
  ok(cards.every(c => !S.isStopCodon(myComp(c.anti))), '종결코돈에 붙는 카드는 없음');
  need.forEach((cod, i) => {
    const c = S.cardForCodon(cod);
    ok(c && c.aa === MY_CODE[cod], (i+1) + '번째 코돈 ' + cod + ' → 카드 ' + (c ? c.aa : 'null'));
  });
  ok(S.cardForCodon('UAG') === null && S.cardForCodon('UAA') === null && S.cardForCodon('UGA') === null, '종결코돈 3종 모두 카드 없음');
  ok(S.cardForCodon('AAA') === null, '이 모형에 없는 코돈(AAA)은 카드 없음');
  ok(JSON.stringify(need.map(c => S.cardForCodon(c).aa)) === JSON.stringify(S.PEPTIDE_KEY), '카드로 이어 붙인 아미노산서열 = 정답 폴리펩타이드');
}

console.log('[3] 정리하기·돌연변이 정답 데이터');
{
  ok(Object.keys(S.STAGE_KEY).length === 8, '탐구 과정 8개 분류 정답');
  ok(S.STAGE_KEY[1] === 'N', '①(모형 오려 내기) = 해당 없음');
  ok(S.STAGE_KEY[2] === 'T', '② = 전사');
  let x = true; for (let n=3;n<=8;n++) if (S.STAGE_KEY[n] !== 'X') x = false;
  ok(x, '③~⑧ = 번역');
  for (let n=1;n<=8;n++) ok(typeof S.STEP_TEXT[n] === 'string' && S.STEP_TEXT[n].length > 5, '탐구 과정 ' + n + ' 설명문 존재');
  ok(S.MUT_TYPES.length === 5, '돌연변이 유형 5종');
  ok(new Set(S.MUT_TYPES.map(t=>t.key)).size === 5, '유형 key 중복 없음');
  const hdr = src.match(/🏅\s*([^<]+)</);
  ok(hdr && /다섯/.test(hdr[1]), '배지 안내 문구가 유형 수(5종)와 일치 (실제 「' + (hdr ? hdr[1].trim() : '없음') + '」)');
  ok(S.BASES4.join('') === 'UCAG', 'RNA 염기 단추 4종(U·C·A·G)');
  ok(Object.keys(S.BASE_NAME).length === 5 && S.BASE_NAME.U === '유라실' && S.BASE_NAME.T === '타이민', '염기 한글 이름표');
  const hues = S.PEPTIDE_KEY.map(a => S.aaClass(a));
  ok(hues.every(h => /^a[0-8]$/.test(h)), 'aaClass는 a0~a8 (CSS에 정의된 범위)');
  ok(S.aaClass('없는아미노산') === 'a8', '모르는 이름은 기본 색으로 fallback');
}

/* ══════════════════ 4. 순수 로직 함수 ══════════════════ */
console.log('[4] 순수 로직 함수 (정상·경계·오답)');
{
  ok(S.complementBase('T') === 'A' && S.complementBase('A') === 'U' &&
     S.complementBase('G') === 'C' && S.complementBase('C') === 'G', 'complementBase 4종 (A→U!)');
  ok(S.complementBase('U') === null && S.complementBase('X') === null && S.complementBase('') === null, 'complementBase 잘못된 염기 → null');
  ok(S.isValidTranscript('A','U') === true, 'A의 짝은 U');
  ok(S.isValidTranscript('A','T') === false, 'A의 짝은 T가 아니다(핵심 오개념)');
  ok(S.isValidTranscript('T','A') && S.isValidTranscript('G','C') && S.isValidTranscript('C','G'), '나머지 짝');
  ok(!S.isValidTranscript('A','A') && !S.isValidTranscript('G','U'), '틀린 짝 거부');
  ok(S.transcribe('TAC') === 'AUG' && S.transcribe('') === '', 'transcribe 짧은 입력');
  ok(S.transcribe('TAZ') === 'AU?', 'transcribe 이상한 염기 → ?');
  ok(S.splitCodons(EXP_MRNA).length === 10, 'splitCodons 30 → 10');
  ok(S.splitCodons(EXP_MRNA + 'AU').length === 10, 'splitCodons 남는 2염기는 버림');
  ok(S.splitCodons('AU').length === 0 && S.splitCodons('').length === 0, 'splitCodons 3염기 미만 → 0개');
  ok(S.codonToAA('AUG') === '메싸이오닌' && S.codonToAA('UAA') === '종결코돈', 'codonToAA');
  ok(S.codonToAA('XXX') === null && S.codonToAA('AU') === null, 'codonToAA 없는 코돈 → null');
  ok(S.isStopCodon('UAA') && S.isStopCodon('UAG') && S.isStopCodon('UGA'), '종결코돈 3종');
  ok(!S.isStopCodon('UGG') && !S.isStopCodon('AUG') && !S.isStopCodon('XXX'), '종결코돈 아닌 것');
  ok(S.isStartCodon('AUG') && !S.isStartCodon('GUG'), 'isStartCodon');
  ok(S.codonToAnticodon('AUG') === 'UAC' && S.codonToAnticodon('GUA') === 'CAU', 'codonToAnticodon');
  let rt = true;
  for (const cod of Object.keys(MY_CODE)) if (S.codonToAnticodon(S.codonToAnticodon(cod)) !== cod) rt = false;
  ok(rt, '안티코돈을 두 번 취하면 원래 코돈 (64개 전부)');
  ok(S.anticodonPairs('AUG','UAC') === true && S.anticodonPairs('AUG','UAG') === false, 'anticodonPairs');
  ok(S.anticodonPairs(null,'UAC') === false && S.anticodonPairs('AUG','') === false, 'anticodonPairs 빈 입력 방어');
  ok(S.cardById('met').aa === '메싸이오닌' && S.cardById('없음') === null, 'cardById');
  const tr = S.translate(EXP_MRNA);
  ok(tr.peptide.length === 9 && tr.stopIndex === 9 && tr.terminated && tr.startOk, 'translate 정답 서열');
  const t2 = S.translate('AUGUAG');
  ok(t2.peptide.length === 1 && t2.stopIndex === 1 && t2.terminated, 'translate 개시 직후 종결');
  const t3 = S.translate('');
  ok(t3.peptide.length === 0 && !t3.startOk && !t3.terminated, 'translate 빈 서열');
  const t4 = S.translate('GUGAUGUAG');
  ok(!t4.startOk && t4.terminated, 'translate 첫 코돈이 AUG가 아니면 startOk=false');
  const t5 = S.translate('AUGXXXAAA');
  ok(t5.peptide.length === 1 && !t5.terminated, 'translate 해독 불가 코돈에서 중단');
  ok(S.mutate('AUGUAG', 0, 'G') === 'GUGUAG', 'mutate');
  ok(S.mutate('AUGUAG', -1, 'G') === 'AUGUAG' && S.mutate('AUGUAG', 6, 'G') === 'AUGUAG', 'mutate 범위 밖 → 원본 그대로');
  ok(S.mutate(EXP_MRNA, 29, 'A').length === 30, 'mutate 길이 보존');
  ok(S.nextEmpty(['A','','C'], 0) === 1, 'nextEmpty 앞에서부터');
  ok(S.nextEmpty(['','B','C'], 1) === 0, 'nextEmpty 끝까지 가면 앞으로 되돌아옴');
  ok(S.nextEmpty(['A','B'], 0) === 2, 'nextEmpty 다 찼으면 길이');
  ok(S.filledCount(['A','','C']) === 2 && S.filledCount([]) === 0, 'filledCount');
  ok(S.codonAt(0) === 'AUG' && S.codonAt(9) === 'UAG', 'codonAt');
  ok(S.codonAt(-1) === null && S.codonAt(10) === null, 'codonAt 범위 밖 → null');
  const full = {1:'N',2:'T',3:'X',4:'X',5:'X',6:'X',7:'X',8:'X'};
  let g = S.gradeStageAssign(full);
  ok(g.ok && g.correct.length === 8, 'gradeStageAssign 전부 정답');
  g = S.gradeStageAssign(Object.assign({}, full, {1:'T'}));
  ok(!g.ok && g.wrong.join() === '1', '①을 전사로 두면 오답 검출');
  g = S.gradeStageAssign(Object.assign({}, full, {5:''}));
  ok(!g.ok && g.missing.join() === '5', '미분류 검출');
  ok(S.gradeStageAssign({}).missing.length === 8, '빈 답 → 8개 미분류');
}

/* ══════════════════ 5. 돌연변이 판정 90종 전수 ══════════════════ */
console.log('[5] 돌연변이 90종(30자리 × 3염기) 판정 독립 대조');
{
  const counts = {};
  let mismatch = [], idxBad = [];
  for (let pos=0; pos<EXP_MRNA.length; pos++){
    for (const b of ['U','C','A','G']){
      if (b === EXP_MRNA.charAt(pos)) continue;
      const mut = S.mutate(EXP_MRNA, pos, b);
      const a = myTranslate(EXP_MRNA), c = myTranslate(mut);
      let want;
      if (!c.startOk) want = 'startlost';
      else if (!c.terminated) want = 'nostop';
      else if (c.peptide.length < a.peptide.length) want = 'nonsense';
      else if (c.peptide.join('|') === a.peptide.join('|')) want = 'silent';
      else want = 'missense';
      const eff = S.mutationEffect(EXP_MRNA, mut);
      if (eff.type !== want) mismatch.push((pos+1) + '→' + b + ' 앱:' + eff.type + ' 기대:' + want);
      if (eff.codonIndex !== Math.floor(pos/3)) idxBad.push((pos+1) + '→' + b);
      counts[want] = (counts[want]||0) + 1;
    }
  }
  ok(mismatch.length === 0, '90종 판정 전부 일치 (불일치: ' + mismatch.slice(0,5).join(' / ') + ')');
  ok(idxBad.length === 0, '바뀐 코돈 위치 계산 정확 (틀린 곳: ' + idxBad.slice(0,5).join() + ')');
  S.MUT_TYPES.forEach(t => ok((counts[t.key]||0) > 0, '유형 「' + t.label + '」 도달 가능 (' + (counts[t.key]||0) + '가지)'));
  console.log('    (유형 분포: ' + JSON.stringify(counts) + ')');
  // 대표 사례 개별 확인
  const e1 = S.mutationEffect(EXP_MRNA, S.mutate(EXP_MRNA, 5, 'U'));   // GUA → GUU (발린 그대로)
  ok(e1.type === 'silent' && !e1.stillStop && e1.mutPeptide.length === 9, '6번째 U: 코돈 중복성 → 침묵');
  const e2 = S.mutationEffect(EXP_MRNA, S.mutate(EXP_MRNA, 9, 'A'));   // CAU → AAU
  ok(e2.type === 'missense' && e2.origCodon === 'CAU' && e2.mutCodon === 'AAU' && e2.codonIndex === 3, '10번째 A: 아미노산 치환');
  const e3 = S.mutationEffect(EXP_MRNA, S.mutate(EXP_MRNA, 8, 'A'));   // UAC → UAA
  ok(e3.type === 'nonsense' && e3.mutPeptide.length === 2, '9번째 A: 조기 종결(아미노산 2개)');
  const e4 = S.mutationEffect(EXP_MRNA, S.mutate(EXP_MRNA, 0, 'G'));   // AUG → GUG
  ok(e4.type === 'startlost', '1번째 G: 개시코돈 파괴');
  ok(e4.mutPeptide.length === 0, '★개시코돈 파괴 → 폴리펩타이드가 아예 만들어지지 않는다(0개)');
  const e5 = S.mutationEffect(EXP_MRNA, S.mutate(EXP_MRNA, 28, 'G'));  // UAG → UGG
  ok(e5.type === 'nostop' && e5.mutPeptide.length === 10, '29번째 G: 종결코돈 소실(사슬 길어짐)');
  const e6 = S.mutationEffect(EXP_MRNA, S.mutate(EXP_MRNA, 29, 'A'));  // UAG → UAA
  ok(e6.type === 'silent' && e6.stillStop, '30번째 A: 종결코돈 → 다른 종결코돈 (stillStop)');
  ok(S.mutationEffect(EXP_MRNA, EXP_MRNA).type === 'none', '바뀐 염기가 없으면 none');
  ok(S.mutationEffect(EXP_MRNA, EXP_MRNA).codonIndex === -1, 'none일 때 코돈 위치 -1');
}

/* ══════════════════ 6. HTML 배선 ══════════════════ */
console.log('[6] HTML 배선 (id·핸들러 존재)');
{
  const ids = new Set();
  let r;
  const re1 = /getElementById\('([A-Za-z0-9_]+)'\)/g;
  while ((r = re1.exec(js))) ids.add(r[1]);
  const re2 = /(?:setShow|showFb|hideFb)\('([A-Za-z0-9_]+)'/g;   // flashShake는 동적 id('tile'+i)만 씀
  while ((r = re2.exec(js))) ids.add(r[1]);
  const markup = src.slice(0, src.indexOf('<script>'));
  const declared = new Set();
  const re3 = /id="([^"]+)"/g;
  while ((r = re3.exec(markup))) declared.add(r[1]);
  const missing = [...ids].filter(i => !declared.has(i));
  ok(missing.length === 0, '스크립트가 찾는 고정 id가 모두 HTML에 있음 (없는 것: ' + missing.join() + ')');
  const handlers = new Set();
  const re4 = /on(?:click|input|change)="([A-Za-z_$][\w$]*)\(/g;
  while ((r = re4.exec(src))) handlers.add(r[1]);
  const nofn = [...handlers].filter(h => typeof S[h] !== 'function');
  ok(handlers.size >= 10, '핸들러 ' + handlers.size + '종 배선 확인');
  ok(nofn.length === 0, '모든 on* 핸들러가 실제 함수 (없는 것: ' + nofn.join() + ')');
  ok(/id="progress"/.test(markup) && /id="mutBadges"/.test(markup), '진행 배지·발견 배지 자리 존재');
  ok(!/<script[^>]+src=/.test(src) && !/<link[^>]+href=/.test(src), '외부 스크립트·스타일 없음(단일 HTML)');
  ok(!/setTimeout|setInterval|querySelectorAll/.test(js), '타이머·querySelectorAll 미사용');
}

/* ══════════════════ 7. ② 전사 흐름 ══════════════════ */
console.log('[7] ② 전사 — 정답·오답·T단추·자동 전사');
const A = makeSandbox();
{
  A.init();
  ok(A.state !== null && A.stepDone() === 0, '초기 진행 0');
  ok(A._store['progress'].textContent === '진행 0 / 4', '배지 0/4');
  ok(A._store['xlatLock'].style.display === 'block' && A._store['xlatBody'].style.display === 'none', '번역 잠김');
  ok(A._store['mutLock'].style.display === 'block' && A._store['mutBody'].style.display === 'none', '돌연변이 잠김');
  ok(A._store['autoT'].disabled === true, '자동 전사 잠김(0칸)');
  ok(A._store['codonTable'].innerHTML.indexOf('id="ct_AUG"') > 0, '코돈표 64칸 렌더 (AUG 칸)');
  let allCells = true;
  for (const cod of Object.keys(MY_CODE)) if (A._store['codonTable'].innerHTML.indexOf('id="ct_' + cod + '"') < 0) allCells = false;
  ok(allCells, '코돈표에 64개 칸 모두 존재');
  ok((A._store['codonTable'].innerHTML.match(/<td>/g) || []).length === 16, '4×4 격자 = td 16칸');
  // ★교과서 62쪽 표 구조 — 칸마다 코돈 문자열이 있어야 '유전 부호 표로 해독'이 가능하다(12유전02-02)
  const CT_HTML = A._store['codonTable'].innerHTML;
  ok(/<b class="cd">UUU<\/b> 페닐알라닌/.test(CT_HTML), '칸에 코돈 병기(UUU 페닐알라닌)');
  ok(/<b class="cd">AUG<\/b> 메싸이오닌 \(개시\)/.test(CT_HTML), '개시코돈 칸도 코돈 병기');
  let allCod = true;
  for (const cod of Object.keys(MY_CODE)) if (CT_HTML.indexOf('<b class="cd">' + cod + '</b>') < 0) allCod = false;
  ok(allCod, '64개 코돈 문자열이 모두 표 안에 있음');
  ok(/두 번째 염기/.test(CT_HTML) && /첫 번째<br>염기/.test(CT_HTML) && /세 번째<br>염기/.test(CT_HTML),
     '세 축 이름(첫 번째·두 번째·세 번째 염기) 모두 표기');

  // 순서 위반: 전사 전에 번역 조작
  A.tapCard('met');
  ok(!A.state.initDone && A.state.chain.length === 0, '전사 전에는 tRNA 카드가 먹히지 않음');
  A.autoTranslate();
  ok(!A.state.initDone, '전사 전 자동 번역 무효');

  // T 단추 (핵심 오개념)
  ok(A.state.pos === 0, '첫 칸 선택 상태');
  A.pickBase('T');
  ok(A.state.tTried === 1 && A.state.mrna[0] === '', 'T는 절대 채워지지 않고 시도만 기록');
  ok(/warn/.test(A._store['fb_trans'].className) && /타이민/.test(A._store['fb_trans'].innerHTML), 'T 오개념 교정 안내');
  A.setPos(1);              // 주형 1번 인덱스 = A → 짝은 U
  A.pickBase('T');
  ok(A.state.tTried === 2 && A.state.mrna[1] === '', 'A 자리에서도 T는 거부(유라실 안내)');
  ok(/유라실/.test(A._store['fb_trans'].innerHTML), 'A 자리 안내에 유라실 등장');

  // 오답
  A.setPos(0);
  A.pickBase('G');
  ok(A.state.mrna[0] === '', '틀린 염기는 채워지지 않음');
  ok(/warn/.test(A._store['fb_trans'].className), '오답 → 경고 피드백');
  ok(/상보적/.test(A._store['fb_trans'].innerHTML) && /A↔U/.test(A._store['fb_trans'].innerHTML), '오답 피드백에 「A↔U, G↔C」 근거');
  ok(A._store['tile0']._classes.has('shake'), '오답 칸 흔들림');
  // 정답 6칸
  for (let i=0;i<6;i++){
    A.setPos(i);
    A.pickBase(MY_DNA2RNA[A.TEMPLATE_DNA.charAt(i)]);
  }
  ok(A.filledCount(A.state.mrna) === 6, '직접 6칸 채움');
  ok(A._store['transCount'].textContent === 6, '채운 칸 표시 6');
  ok(A._store['autoT'].disabled === false, '6칸 → 자동 전사 해금');
  ok(A.state.mrna.slice(0,6).join('') === EXP_MRNA.slice(0,6), '채운 6칸이 정답 서열과 같음');
  ok(A.state.pos === 6, '자동으로 다음 빈 칸으로 이동');
  ok(!A.state.transDone, '아직 전사 미완성');
  ok(A.stepDone() === 0, '진행 여전히 0');
}
// 6칸 미만에서 자동 전사 거부
const A2 = makeSandbox();
{
  A2.init();
  for (let i=0;i<3;i++){ A2.setPos(i); A2.pickBase(MY_DNA2RNA[A2.TEMPLATE_DNA.charAt(i)]); }
  A2.autoTranscribe();
  ok(!A2.state.transDone && A2.filledCount(A2.state.mrna) === 3, '6칸 미만 → 자동 전사 거부');
  ok(/warn/.test(A2._store['fb_trans'].className), '자동 전사 거부 안내');
}
// 30칸 전부 직접 채우기 = 자동 전사 결과와 같은가
const A3 = makeSandbox();
{
  A3.init();
  for (let i=0;i<30;i++){ A3.setPos(i); A3.pickBase(MY_DNA2RNA[A3.TEMPLATE_DNA.charAt(i)]); }
  ok(A3.state.transDone, '30칸 직접 → 자동으로 전사 완료 처리');
  ok(A3.state.mrna.join('') === EXP_MRNA, '직접 채운 결과 = 정답 mRNA');
  ok(A3.stepDone() === 1, '진행 1/4');
}
{
  A.autoTranscribe();
  ok(A.state.transDone && A.state.mrna.join('') === EXP_MRNA, '자동 전사 결과 = 직접 채운 결과와 동일');
  ok(A.state.mrna.join('') === A3.state.mrna.join(''), '자동/직접 두 경로 결과 일치');
  ok(A.stepDone() === 1 && A._store['progress'].textContent === '진행 1 / 4', '전사 완료 → 진행 1');
  ok(A._store['transDone'].className === 'donebox show', '전사 완료 상자 공개');
  ok(/5′/.test(A._store['mrnaSeq'].innerHTML), 'mRNA 5′→3′ 방향 표시');
  ok((A._store['codonChips'].innerHTML.match(/codonchip/g) || []).length === 10, '코돈 칩 10개');
  ok(/codonchip start/.test(A._store['codonChips'].innerHTML), '개시코돈 칩 강조');
  ok(/codonchip stop/.test(A._store['codonChips'].innerHTML), '종결코돈 칩 강조');
  ok(A._store['xlatLock'].style.display === 'none' && A._store['xlatBody'].style.display === 'block', '전사 완료 → 번역 해금');
  ok(A._store['autoT'].disabled === true, '완료 후 자동 전사 단추 비활성');
  // 완료 후 조작 차단
  const before = A.state.mrna.join('');
  A.setPos(3); A.pickBase('A');
  ok(A.state.mrna.join('') === before, '전사 완료 뒤에는 염기 단추가 서열을 바꾸지 않음');
  ok(/info/.test(A._store['fb_trans'].className), '완료 후 안내 피드백');
  // 전사 다시 하기
  const A4 = makeSandbox();
  A4.init();
  for (let i=0;i<30;i++){ A4.setPos(i); A4.pickBase(MY_DNA2RNA[A4.TEMPLATE_DNA.charAt(i)]); }
  A4.clearTranscription();
  ok(!A4.state.transDone && A4.filledCount(A4.state.mrna) === 0 && A4.state.pos === 0, '전사 다시 하기 → 부분 초기화');
  ok(A4.stepDone() === 0 && A4._store['xlatBody'].style.display === 'none', '전사 초기화 → 번역 다시 잠김');
}

/* ══════════════════ 8. ③ 번역 흐름 ══════════════════ */
console.log('[8] ③ 번역 — 개시·오답 카드·펩타이드결합·자동·종결');
{
  ok(A.state.pSite === 0 && A.aSiteCodon() === 'GUA', '개시 상태: P=1번째 코돈, A=2번째');
  ok(A.pSiteCodon() === 'AUG', 'P자리에 개시코돈');
  ok(/개시코돈/.test(A._store['xlatPrompt'].innerHTML), '개시 안내문');
  ok(A._store['btnAutoX'].style.display === 'none', '개시 전에는 자동 번역 단추 숨김');
  ok(A._store['btnBond'].style.display === 'none' && A._store['btnTerm'].style.display === 'none', '결합·종결 단추 숨김');
  ok(!(A._store['ct_AUG'] && A._store['ct_AUG']._classes.has('cur')), '★해독 전에는 코돈표 칸을 강조하지 않는다(정답 노출 방지)');
  ok(/AUG/.test(A._store['ctNow'].innerHTML) && !/메싸이오닌/.test(A._store['ctNow'].innerHTML),
     '★#ctNow는 코돈만 알려 주고 아미노산은 감춘다');
  ok(/showCodonHint\('AUG'\)/.test(A._store['ctNow'].innerHTML), '스스로 못 찾을 때의 [아미노산 확인하기] 단추 제공');

  // 오답 카드 (개시 자리에 발린)
  A.tapCard('val');
  ok(!A.state.initDone && A.state.chain.length === 0, '개시 자리에 틀린 카드 → 거부');
  ok(/warn/.test(A._store['fb_xlat'].className) && /UAC/.test(A._store['fb_xlat'].innerHTML), '필요한 안티코돈(UAC) 근거 제시');
  ok(A._store['card_val']._classes.has('shake'), '오답 카드 흔들림');
  // 순서 위반
  A.advanceRibosome();
  ok(A.state.chain.length === 0, 'tRNA 없이 펩타이드결합 불가');
  A.terminate();
  ok(!A.state.termDone, '종결코돈이 아닌데 종결 불가');
  A.autoTranslate();
  ok(!A.state.initDone, '개시 전 자동 번역 불가');

  // 개시
  A.tapCard('met');
  ok(A.state.initDone && A.state.pCard === '메싸이오닌', 'P자리 개시 tRNA 도킹');
  ok(A.state.chain.length === 1 && A.state.chain[0] === '메싸이오닌', '사슬 첫 아미노산');
  ok(A.state.manualSteps === 0, '개시는 신장 횟수에 포함되지 않음');
  ok(A.stepDone() === 2 && A._store['progress'].textContent === '진행 2 / 4', '개시 복합체 → 진행 2');
  ok(A._store['chainCount'].textContent === 1, '사슬 개수 표시');
  ok(/A자리 코돈은/.test(A._store['xlatPrompt'].innerHTML) && /GUA/.test(A._store['xlatPrompt'].innerHTML), '다음 안내: A자리 코돈 GUA');
  ok(!/CAU/.test(A._store['xlatPrompt'].innerHTML), '★안티코돈 문자열을 미리 주지 않는다(카드 글자만 대조하면 코돈표를 안 본다)');
  ok(!(A._store['ct_GUA'] && A._store['ct_GUA']._classes.has('cur')) &&
     !(A._store['ct_AUG'] && A._store['ct_AUG']._classes.has('cur')),
     '★도킹 전에는 A자리 코돈도 표에서 강조하지 않음');
  ok(A._store['btnAutoX'].disabled === true && /직접 0\/3/.test(A._store['btnAutoX'].textContent), '자동 번역 잠김 + 라벨에 진행 표시');
  A.tapCard('met');
  ok(A.state.chain.length === 1, '이미 쓴 카드는 다시 놓을 수 없음');

  // 신장 1회
  A.tapCard('tyr');
  ok(!A.state.aCard, 'A자리에 틀린 카드(타이로신) → 거부');
  A.tapCard('val');
  ok(A.state.aCard === '발린' && A.state.manualSteps === 1, 'A자리 도킹');
  ok(A._store['ct_GUA']._classes.has('cur') && /발린/.test(A._store['ctNow'].innerHTML),
     '★도킹에 성공한 뒤에야 코돈표 칸 강조·아미노산 공개');
  ok(A._store['btnBond'].style.display === 'inline-block', '펩타이드결합 단추 등장');
  A.tapCard('tyr');
  ok(A.state.aCard === '발린' && /warn/.test(A._store['fb_xlat'].className), 'A자리가 차 있으면 다른 카드 거부');
  A.advanceRibosome();
  ok(A.state.chain.length === 2 && A.state.chain[1] === '발린', '펩타이드결합으로 사슬 신장');
  ok(A.state.pCard === '발린' && A.state.aCard === null, 'A자리 tRNA가 P자리로');
  ok(A.state.eCard === '메싸이오닌' && A.state.gone.join() === '메싸이오닌', 'P자리 tRNA는 E자리를 거쳐 이탈');
  ok(A.state.pSite === 1 && A.aSiteCodon() === 'UAC', '라이보솜이 3′ 방향으로 한 코돈 이동');
  ok(A._store['btnBond'].style.display === 'none', '결합 후 단추 숨김');

  // 신장 2·3회 → 자동 해금
  A.tapCard('tyr'); A.advanceRibosome();
  A.tapCard('his'); A.advanceRibosome();
  ok(A.state.manualSteps === 3 && A.state.chain.length === 4, '직접 3회 신장 → 아미노산 4개');
  ok(A.state.chain.join('|') === EXP_PEP.slice(0,4).join('|'), '직접 만든 사슬이 정답 서열과 일치');
  ok(A._store['btnAutoX'].disabled === false && A._store['btnAutoX'].textContent === '⚡ 나머지 자동 번역', '3회 후 자동 번역 해금 + 라벨 갱신');
  // 자동 번역 (종결 직전까지)
  A.autoTranslate();
  ok(A.state.chain.length === 9, '자동 번역 → 아미노산 9개');
  ok(A.state.chain.join('|') === EXP_PEP.join('|'), '자동 번역 결과 = 정답 폴리펩타이드');
  ok(A.state.pSite === 8 && A.aSiteCodon() === 'UAG', '종결코돈 직전에서 멈춤');
  ok(!A.state.termDone, '종결은 자동으로 하지 않음(학생이 직접)');
  ok(A._store['btnTerm'].style.display === 'inline-block' && A._store['btnAutoX'].style.display === 'none', '종결 단추만 남음');
  ok(/종결코돈/.test(A._store['xlatPrompt'].innerHTML), 'A자리 종결코돈 안내');
  ok(A._store['ct_UAG']._classes.has('cur'), '코돈표에서 UAG 강조');
  // 이 모형은 카드 9장이 코돈 9개와 정확히 대응하므로, 종결코돈이 A자리에 올 때 손패는 비어 있다
  ok(A.TRNA_CARDS.every(c => A.cardZone(c.aa) !== 'hand'), '종결 직전 손패는 비어 있음(카드 9장 = 코돈 9개)');
  // 종결코돈 앞 카드 탭 = 교육적 거부 (카드가 손에 남아 있는 경우의 분기)
  A.state.gone.splice(A.state.gone.indexOf('타이로신'), 1);
  ok(A.cardZone('타이로신') === 'hand', '검사용으로 타이로신 카드를 손패로 되돌림');
  A.tapCard('tyr');
  ok(/bad/.test(A._store['fb_xlat'].className) && /안티코돈을 가진 tRNA는 없다/.test(A._store['fb_xlat'].innerHTML), '종결코돈에 카드 놓으려 하면 교육적 거부');
  ok(A.state.chain.length === 9 && !A.state.aCard, '거부 후 사슬·A자리 변화 없음');
  A.state.gone.push('타이로신');
  // 종결
  A.terminate();
  ok(A.state.termDone && A.state.pCard === null && A.state.aCard === null && A.state.eCard === null, '종결 → 라이보솜 자리 비움');
  ok(A.state.gone.length === 9, 'tRNA 9개 모두 분리');
  ok(A.state.chain.length === 9, '완성된 폴리펩타이드 9개 유지');
  ok(A.stepDone() === 3 && A._store['progress'].textContent === '진행 3 / 4', '번역 종결 → 진행 3');
  ok(A._store['sepPanel'].className === 'sep-panel show', '분리 연출 패널 공개');
  ok(A._store['sepPep'].textContent === '아미노산 9개 완성' && A._store['sepTrna'].textContent === '9개 모두 분리', '분리 패널 내용');
  ok(A._store['mutLock'].style.display === 'none' && A._store['mutBody'].style.display === 'block', '번역 완료 → 돌연변이 해금');
  ok(/남은 카드 <b>0<\/b>/.test(A._store['handLeft'].innerHTML), '손패 0장');
  ok(/번역이 끝났다/.test(A._store['xlatPrompt'].innerHTML), '완료 안내문');
  A.tapCard('met');
  ok(A.state.chain.length === 9, '종결 후 카드 조작 무효');
}
// 전 과정을 직접(자동 없이) 진행한 결과와 비교
const M = makeSandbox();
{
  M.init();
  for (let i=0;i<30;i++){ M.setPos(i); M.pickBase(MY_DNA2RNA[M.TEMPLATE_DNA.charAt(i)]); }
  M.tapCard('met');
  let guard = 0;
  while (!M.state.termDone && guard++ < 30){
    const cod = M.aSiteCodon();
    if (M.isStopCodon(cod)) { M.terminate(); break; }
    const card = M.cardForCodon(cod);
    M.tapCard(card.id);
    M.advanceRibosome();
  }
  ok(M.state.termDone, '전부 직접 조작으로도 종결 도달');
  ok(M.state.manualSteps === 8, '직접 신장 8회');
  ok(M.state.chain.join('|') === A.state.chain.join('|'), '직접 경로 사슬 = 자동 경로 사슬');
  ok(M.state.gone.length === 9 && M.stepDone() === 3, '직접 경로 진행 3');
}

/* ══════════════════ 9. ④ 정리하기 ══════════════════ */
console.log('[9] ④ 정리하기 — 3분류 채점·모범답안·내 결과');
{
  ok(/분류하기/.test(A._store['assignBody'].innerHTML), '분류 표 렌더');
  A.cycleAssign(1);
  ok(A.state.assign[1] === 'T', 'cycle 1회 → 전사');
  A.cycleAssign(1);
  ok(A.state.assign[1] === 'X', 'cycle 2회 → 번역');
  A.cycleAssign(1);
  ok(A.state.assign[1] === 'N', 'cycle 3회 → 해당 없음');
  A.cycleAssign(1);
  ok(A.state.assign[1] === '', 'cycle 4회 → 비움(순환)');
  // 미분류 채점
  A.gradeAssign();
  ok(!A.state.q1graded && !A.state.q1ok && /warn/.test(A._store['fb_assign'].className), '미분류가 있으면 채점 보류');
  ok(A.stepDone() === 3, '미분류 상태에서 진행 그대로');
  // 오답 채점 (①을 전사로)
  A.state.assign = {1:'T',2:'T',3:'X',4:'X',5:'X',6:'X',7:'X',8:'X'};
  A.gradeAssign();
  ok(A.state.q1graded && !A.state.q1ok, '①을 전사로 두면 오답');
  ok(/①/.test(A._store['fb_assign'].innerHTML) && /준비/.test(A._store['fb_assign'].innerHTML), '①은 준비 과정이라는 근거 피드백');
  ok(A.stepDone() === 3, '오답이면 진행 그대로');
  // 정답
  A.cycleAssign(1); A.cycleAssign(1);   // T → X → N
  ok(A.state.assign[1] === 'N', '①을 해당 없음으로 수정');
  A.gradeAssign();
  ok(A.state.q1ok && /good/.test(A._store['fb_assign'].className), '전부 정답');
  ok(A.stepDone() === 4 && A._store['progress'].textContent === '진행 4 / 4', '정리하기 1 정답 → 진행 4/4');
  ok(/ok/.test(A._store['assignBody'].innerHTML), '정답 표시 마크');
  // 정답 후 답을 고치면 채점 결과가 무효가 되어야 한다
  A.cycleAssign(2);
  ok(!A.state.q1graded, '답을 고치면 채점 표시 해제');
  ok(!A.state.q1ok && A.stepDone() === 3, '답을 고치면 진행 배지도 내려감');
  ok(A._store['progress'].textContent === '진행 3 / 4', '배지 즉시 갱신');
  A.cycleAssign(2); A.cycleAssign(2); A.cycleAssign(2);   // X → N → '' → T
  ok(A.state.assign[2] === 'T', '②를 전사로 되돌림');
  A.gradeAssign();
  ok(A.state.q1ok && A.stepDone() === 4, '다시 정답 → 진행 4/4');

  // 모범답안 토글
  A.toggleAns('ans2','btnAns2');
  ok(A._store['ans2'].style.display === 'block' && A._store['btnAns2'].textContent === '모범답안 닫기', '모범답안 열기');
  A.toggleAns('ans2','btnAns2');
  ok(A._store['ans2'].style.display === 'none' && A._store['btnAns2'].textContent === '모범답안 보기', '모범답안 닫기');
  A.toggleAns('ans4','btnAns4');
  ok(A._store['ans4'].style.display === 'block', '4번 모범답안도 동작');
  // 내가 만든 것 채워 보기
  A.fillMyResult();
  ok(A._store['myResult'].style.display === 'block', '내 결과 영역 공개');
  ok(A._store['myResult'].innerHTML.indexOf(EXP_MRNA) > 0, '내가 전사한 mRNA 표시');
  ok(A._store['myResult'].innerHTML.indexOf(EXP_PEP.join(' – ')) > 0, '정답 폴리펩타이드 대조표');
  ok(A._store['myResult'].innerHTML.indexOf(A.state.chain.join(' – ')) > 0, '내가 번역한 아미노산 표시');
  ok(/ctab-outer/.test(A._store['myResult'].innerHTML), '대조표가 가로 스크롤 컨테이너 안에 있다(좁은 화면 보호)');
  const A5 = makeSandbox();
  A5.init(); A5.fillMyResult();
  ok(/warn/.test(A5._store['myResult'].innerHTML) && A5._store['myResult'].innerHTML.indexOf(EXP_PEP.join(' – ')) < 0,
     '전사·번역 전에는 정답을 보여 주지 않음');
  // ★전사만 끝낸 중간 구간에서도 번역 정답이 새면 안 된다(자동 전사 30초 → 번역 통째 우회)
  const A6 = makeSandbox();
  A6.init();
  for (let i=0;i<30;i++){ A6.setPos(i); A6.pickBase(MY_DNA2RNA[A6.TEMPLATE_DNA.charAt(i)]); }
  ok(A6.state.transDone && !A6.state.termDone, '전사만 완료된 상태 만들기');
  A6.fillMyResult();
  ok(/warn/.test(A6._store['myResult'].innerHTML) && A6._store['myResult'].innerHTML.indexOf(EXP_PEP.join(' – ')) < 0,
     '★전사만 끝내면 정리하기 3의 정답이 열리지 않는다');
  // 스스로 평가하기
  A._store['chk0'].checked = true;
  A.toggleChk(0);
  ok(A.state.selfChk[0] === true && A.state.selfChk[1] === false, '체크박스 상태 저장');
  // 코돈표 접기
  A.toggleCodonTable();
  ok(A.state.ctOpen === false && A._store['codonWrap'].style.display === 'none' && A._store['btnCT'].textContent === '코돈표 펼치기', '코돈표 접기');
  A.toggleCodonTable();
  ok(A.state.ctOpen === true && A._store['codonWrap'].style.display === 'block', '코돈표 펼치기');
  // 코돈표 강조 전환 — 강조·아미노산 공개는 reveal(해독한 뒤) 또는 힌트를 누른 코돈에만
  A.highlightCodon('AUG', true);
  ok(A._store['ct_AUG']._classes.has('cur') && /메싸이오닌/.test(A._store['ctNow'].innerHTML), '해독 후 강조 + 아미노산 공개');
  A.highlightCodon('GGC', true);
  ok(!A._store['ct_AUG']._classes.has('cur') && A._store['ct_GGC']._classes.has('cur'), '이전 강조 해제');
  A.highlightCodon('GGC', false);
  ok(!A._store['ct_GGC']._classes.has('cur') && !/글라이신/.test(A._store['ctNow'].innerHTML),
     '★reveal=false면 강조도 아미노산도 감춘다');
  A.showCodonHint('GGC');
  ok(A.state.hintCodon === 'GGC' && A.state.hintUsed === 1, '[아미노산 확인하기] → 그 코돈만 공개 상태');
  A.highlightCodon('GGC', false);
  ok(A._store['ct_GGC']._classes.has('cur') && /글라이신/.test(A._store['ctNow'].innerHTML), '힌트를 누른 코돈은 reveal 없이도 공개');
  A.highlightCodon('CCG', false);
  ok(!(A._store['ct_CCG'] && A._store['ct_CCG']._classes.has('cur')), '힌트는 누른 코돈에만 적용된다');
  A.state.hintCodon = null;
  A.highlightCodon('XXX');
  ok(!A._store['ct_GGC']._classes.has('cur') && /코돈표/.test(A._store['ctNow'].innerHTML), '없는 코돈 → 강조 해제');
  A.highlightCodon(null);
  ok(/코돈표/.test(A._store['ctNow'].innerHTML), 'null → 기본 안내');
}

/* ══════════════════ 10. 💡 돌연변이 UI ══════════════════ */
console.log('[10] 💡 돌연변이 — 시트·판정·배지·되돌리기');
{
  ok((A._store['mutStrip'].innerHTML.match(/mut-tile/g) || []).length === 30, '돌연변이 띠 30칸');
  ok(/아직 바꾼 염기가 없다/.test(A._store['mutOut'].innerHTML), '초기 안내');
  ok((A._store['mutBadges'].innerHTML.match(/badge/g) || []).length === 5, '발견 배지 5개');
  A.openBaseSheet(9);
  ok(A._store['sheet'].style.display === 'block' && A._store['sheetBack'].style.display === 'block', '염기 선택 시트 열림');
  ok(/10번째/.test(A._store['sheetWho'].innerHTML) && /사이토신/.test(A._store['sheetWho'].innerHTML), '지금 염기 안내(10번째 C)');
  ok(/4번째 코돈/.test(A._store['sheetHint'].textContent), '몇 번째 코돈인지 안내');
  ok((A._store['sheetOpts'].innerHTML.match(/bbtn/g) || []).length === 4, '염기 단추 4개');
  ok(/\(지금\)/.test(A._store['sheetOpts'].innerHTML), '지금 염기 표시');
  ok(!/\(원래\)/.test(A._store['sheetOpts'].innerHTML), '아직 안 바꾼 칸에는 「원래」 표시가 없다');
  A.chooseMutBase('A');
  ok(A._store['sheet'].style.display === 'none' && A._store['sheetBack'].style.display === 'none', '선택 후 시트 닫힘');
  ok(A.state.mut && A.state.mut.pos === 9 && A.state.mut.base === 'A', '돌연변이 적용');
  ok(A.state.mutFound.missense === true, '「아미노산이 바뀜」 배지 획득');
  ok(/아미노산이 바뀜/.test(A._store['mutOut'].innerHTML), '판정 문구');
  ok(/verdict missense/.test(A._store['mutOut'].innerHTML), '판정 색 클래스');
  ok(/mut-tile changed/.test(A._store['mutStrip'].innerHTML), '바뀐 염기 강조');
  ok(/cmp-row/.test(A._store['mutOut'].innerHTML) && (A._store['mutOut'].innerHTML.match(/bead/g)||[]).length >= 18, '원래·바뀐 뒤 구슬 비교');
  ok(/diff/.test(A._store['mutOut'].innerHTML), '달라진 구슬 강조');
  // ★이미 바꾼 칸을 다시 탭하면 '지금'은 화면에 보이는 염기(A)여야 한다
  A.openBaseSheet(9);
  ok(/지금 <b class="bA">A<\/b>/.test(A._store['sheetWho'].innerHTML), '★바뀐 칸: 지금 = 화면에 보이는 염기(A)');
  ok(/원래는/.test(A._store['sheetWho'].innerHTML) && /<b class="bC">C<\/b>/.test(A._store['sheetWho'].innerHTML), '원래 염기(C)도 함께 표시');
  ok(/\(지금\)/.test(A._store['sheetOpts'].innerHTML) && /\(원래\)/.test(A._store['sheetOpts'].innerHTML), '옵션에 지금·원래 구분');
  A.closeSheet();
  // 같은 염기 선택(=되돌리기)
  A.applyMutation(9, 'C');
  ok(A.state.mut === null && /info/.test(A._store['fb_mut'].className), '원래 염기와 같으면 변화 없음 안내');
  ok(/되돌렸다/.test(A._store['fb_mut'].innerHTML), '★되돌리는 조작에는 「되돌렸다」로 안내(화면과 일치)');
  // 5종 모으기
  A.applyMutation(5, 'U');   // silent
  ok(A.state.mutFound.silent === true, '침묵 배지');
  A.applyMutation(8, 'A');   // nonsense
  ok(A.state.mutFound.nonsense === true, '조기 종결 배지');
  ok(/verdict nonsense/.test(A._store['mutOut'].innerHTML) && /짧아/.test(A._store['mutOut'].innerHTML), '조기 종결 설명');
  A.applyMutation(0, 'G');   // startlost
  ok(A.state.mutFound.startlost === true, '개시코돈 파괴 배지');
  A.applyMutation(9, 'A');   // missense 재확인
  A.applyMutation(28, 'G');  // nostop
  ok(A.state.mutFound.nostop === true, '종결코돈 소실 배지');
  ok(/길어진다/.test(A._store['mutOut'].innerHTML), '사슬이 길어진다는 설명');
  ok((A._store['mutBadges'].innerHTML.match(/✔/g) || []).length === 5, '배지 5개 모두 획득 표시');
  ok(/good/.test(A._store['fb_mut'].className) && /다섯 가지/.test(A._store['fb_mut'].innerHTML), '5종 완주 칭찬');
  // 무작위 · 되돌리기
  A.randomMutation();
  ok(A.state.mut !== null && A.state.mut.base !== EXP_MRNA.charAt(A.state.mut.pos), '무작위는 반드시 다른 염기');
  A.resetMutation();
  ok(A.state.mut === null && /아직 바꾼 염기가 없다/.test(A._store['mutOut'].innerHTML), '원래대로 되돌리기');
  ok(A.mutSeq() === EXP_MRNA, '되돌린 서열 = 원래 mRNA');
  A.applyMutation(29, 'A');
  ok(A.mutSeq() === EXP_MRNA.slice(0,29) + 'A', 'mutSeq가 바뀐 서열 반영');
  ok(/여전히 종결코돈/.test(A._store['mutOut'].innerHTML), '종결 → 다른 종결 설명(stillStop)');
  A.closeSheet();
  ok(A._store['sheet'].style.display === 'none', '시트 닫기');
}

/* ══════════════════ 11. 저장 → 복원 ══════════════════ */
console.log('[11] localStorage 저장 → 새 컨텍스트 복원');
{
  A._store['ta2'].value = '펩타이드결합';
  A._store['ta3m'].value = EXP_MRNA;
  A.saveState();
  const raw = A.localStorage._mem['protein_sim_v1'];
  ok(!!raw, 'protein_sim_v1 저장됨');
  const saved = JSON.parse(raw);
  ok(saved.transDone && saved.initDone && saved.termDone && saved.q1ok, '핵심 진행 플래그 저장');
  ok(saved.chain.length === 9 && saved.gone.length === 9, '사슬·이탈 tRNA 저장');
  ok(saved.ta.ta2 === '펩타이드결합' && saved.ta.ta3m === EXP_MRNA, 'textarea 저장');
  ok(saved.tTried === 2, 'T 시도 횟수 저장');

  const R = makeSandbox({ 'protein_sim_v1': raw });
  R.init();
  ok(R.state.transDone && R.state.initDone && R.state.termDone, '복원: 전사·개시·종결 상태');
  ok(R.stepDone() === 4 && R._store['progress'].textContent === '진행 4 / 4', '복원: 진행 4/4');
  ok(R.state.mrna.join('') === EXP_MRNA, '복원: 전사한 서열');
  ok(R.state.chain.join('|') === EXP_PEP.join('|'), '복원: 폴리펩타이드 9개');
  ok(R.state.pSite === 8 && R.aSiteCodon() === 'UAG', '복원: 라이보솜 위치');
  ok(R._store['xlatBody'].style.display === 'block' && R._store['mutBody'].style.display === 'block', '복원: 번역·돌연변이 영역 공개');
  ok(R._store['sepPanel'].className === 'sep-panel show', '복원: 분리 패널');
  ok(R.state.q1ok && /ok/.test(R._store['assignBody'].innerHTML), '복원: 정리하기 채점 결과');
  ok(R._store['ta2'].value === '펩타이드결합' && R._store['ta3m'].value === EXP_MRNA, '복원: textarea 값');
  ok(R._store['chk0'].checked === true && R._store['chk1'].checked === false, '복원: 체크박스');
  ok(Object.keys(R.state.mutFound).length === 5 && (R._store['mutBadges'].innerHTML.match(/✔/g)||[]).length === 5, '복원: 발견 배지 5종');
  ok(R.state.mut && R.state.mut.pos === 29 && R.state.mut.base === 'A', '복원: 적용 중인 돌연변이');
  ok(/verdict/.test(R._store['mutOut'].innerHTML), '복원: 돌연변이 판정 재계산');
  ok(R._store['ct_UAG']._classes.has('cur'), '복원: 코돈표 강조 위치');
  ok((R._store['codonChips'].innerHTML.match(/codonchip/g)||[]).length === 10, '복원: 코돈 칩');
}

/* ══════════════════ 12. 손상된 저장값 · 리셋 ══════════════════ */
console.log('[12] 손상된 저장값 방어 · 리셋');
{
  const bad = { mrna:[1,2], pos:999, pSite:999, transDone:true, initDone:true, chain:'xxx',
                gone:'zz', assign:null, selfChk:[true], ta:null, mut:{pos:99,base:'Z'}, mutFound:null };
  let threw = null;
  const D = makeSandbox({ 'protein_sim_v1': JSON.stringify(bad) });
  try { D.init(); } catch(e){ threw = e; }
  ok(threw === null, '손상된 저장값으로도 init()이 죽지 않음' + (threw ? ' (' + threw.message + ')' : ''));
  if (!threw){
    ok(D.state.mrna.length === 30 && D.filledCount(D.state.mrna) === 0, '길이 안 맞는 mrna → 빈 칸으로 복구');
    ok(D.state.pSite >= 0 && D.state.pSite <= D.CODONS_KEY.length - 2, 'pSite가 mRNA 안으로 보정 (실제 ' + D.state.pSite + ')');
    ok(D.aSiteCodon() !== null, 'A자리 코돈이 항상 존재');
    ok(Array.isArray(D.state.chain) && Array.isArray(D.state.gone), 'chain·gone 배열 복구');
    ok(D.state.mut === null, '범위 밖 돌연변이 → 무효화');
    ok(D.state.selfChk.length === 3 && typeof D.state.ta === 'object' && D.state.ta !== null, 'selfChk·ta 복구');
    ok(typeof D.state.assign === 'object' && D.state.assign !== null, 'assign 복구');
    let threw2 = null;
    try { D.renderAll(); D.tapCard('met'); D.randomMutation(); } catch(e){ threw2 = e; }
    ok(threw2 === null, '복구된 상태에서 조작해도 예외 없음' + (threw2 ? ' (' + threw2.message + ')' : ''));
  } else { fail += 7; }
  const D2 = makeSandbox({ 'protein_sim_v1': '{{망가진 JSON' });
  D2.init();
  ok(D2.stepDone() === 0 && D2.filledCount(D2.state.mrna) === 0, 'JSON 파싱 실패 → 새 상태');
  const D3 = makeSandbox({ 'protein_sim_v1': 'null' });
  D3.init();
  ok(D3.state !== null && D3.stepDone() === 0, 'null 저장값 → 새 상태');
  // 리셋
  ok(!!A.localStorage._mem['protein_sim_v1'], '리셋 전 저장값 존재');
  A.resetAll();
  ok(A.localStorage._mem['protein_sim_v1'] === undefined, '리셋 → 저장값 삭제');
  ok(A.location.reloaded === 1, '리셋 → 새로 고침');
  const Z = makeSandbox(A.localStorage._mem);
  Z.init();
  ok(Z.stepDone() === 0 && !Z.state.transDone && Z.state.chain.length === 0 && Z.state.mut === null, '리셋 후 새로 열면 완전 초기화');
  ok(Z._store['xlatBody'].style.display === 'none' && Z._store['mutBody'].style.display === 'none', '리셋 후 잠금 복구');
}

console.log('');
console.log('결과: ' + pass + ' 통과, ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
