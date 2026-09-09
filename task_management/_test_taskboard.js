// 업무 관리 도구 — 파서·묶음·스토어·앱 회귀 검사 (Node 헤드리스)
// 실행:  node _test_taskboard.js            (옆의 web/index.html)
//        node _test_taskboard.js <다른 HTML>  (변이 검사용)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'web', 'index.html');
const src = fs.readFileSync(HTML, 'utf8');

let pass = 0, fail = 0;
function ok(cond, name){ if (cond) pass++; else { fail++; console.error('  X FAIL: ' + name); } }
function eq(a, b, name){ ok(typeof a === typeof b && JSON.stringify(a) === JSON.stringify(b), name + '  (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }
function sec(t){ console.log(t); }

function between(a, b){
  const i = src.indexOf(a), j = src.indexOf(b);
  return (i >= 0 && j > i) ? src.slice(i + a.length, j) : null;
}
const PARSE = between('/*PARSE-START*/', '/*PARSE-END*/');
const GROUP = between('/*GROUP-START*/', '/*GROUP-END*/');
const CONFIG = between('/*CONFIG-START*/', '/*CONFIG-END*/');
const STORE = between('/*STORE-START*/', '/*STORE-END*/');
const CSS = (src.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
const SCRIPT = (src.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/) || [])[1] || '';
const APP = src.slice(src.indexOf('/*STORE-END*/'));
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');

// 고정 시계 — 순수 계층이 인자 today 대신 실제 시계를 쓰면 여기서 드러난다(실행일과 무관)
function frozenDate(ref){
  return class FDate extends Date {
    constructor(...a){ super(...(a.length ? a : [ref.now])); }
    static now(){ return ref.now; }
  };
}

// ══ [1] 마커 존재·순수성 ══
sec('[1] 마커 존재·순수성');
ok(PARSE !== null, 'PARSE 마커');
ok(GROUP !== null, 'GROUP 마커');
ok(CONFIG !== null, 'CONFIG 마커');
ok(STORE !== null, 'STORE 마커');
ok(SCRIPT.length > 0, 'script 블록');
ok(/firebaseConfig\s*=/.test(CONFIG || ''), 'CONFIG 에 firebaseConfig');
ok(/T_UID\s*=/.test(CONFIG || ''), 'CONFIG 에 T_UID');
{
  const pureP = stripComments(PARSE || ''), pureG = stripComments(GROUP || '');
  for (const bad of ['document', 'window', 'localStorage', 'navigator', 'setTimeout', 'globalThis', 'self', 'location', 'fetch', 'alert', 'Date.now', 'Math.random']) {
    ok(!pureP.includes(bad), 'PARSE 블록에 ' + bad + ' 없음');
    ok(!pureG.includes(bad), 'GROUP 블록에 ' + bad + ' 없음');
  }
  ok(!/new Date\(\s*\)/.test(pureP), 'PARSE 에 인자 없는 new Date() 없음');
  ok(!/new Date\(\s*\)/.test(pureG), 'GROUP 에 인자 없는 new Date() 없음');
}
// localStorage 는 STORE 블록 안에서만
const outsideStore = stripComments(src.replace(STORE || '', ''));
ok(!/localStorage/.test(outsideStore), 'localStorage 는 STORE 블록 밖에 없음');
// 외부에서 끌어오는 것은 판을 못박은 firebase compat SDK 셋뿐이다.
{
  const SDK = /^https:\/\/www\.gstatic\.com\/firebasejs\/\d+\.\d+\.\d+\/firebase-(app|auth|database)-compat\.js$/;
  const srcs = [...src.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
  eq(srcs.filter(u => !SDK.test(u)), [], '외부 스크립트는 판 고정 firebase compat SDK 뿐');
  ok(!/<link[^>]+href=/.test(src), '외부 스타일 없음');
  const OKU = /^https:\/\/(www\.w3\.org|www\.gstatic\.com\/firebasejs\/|[a-z0-9.-]+\.firebaseapp\.com|[a-z0-9.-]+\.firebasedatabase\.app|[a-z0-9.-]+\.firebasestorage\.app)/;
  const urls = [...src.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map(m => m[0]).filter(u => !OKU.test(u));
  eq(urls, [], '그 밖의 외부 URL 없음');
}
ok(/<meta name="viewport"/.test(src), 'viewport');
ok(/var BUILD = 'v\d{4}-\d{2}-\d{2}[a-z]';/.test(src), '빌드 스탬프 형식 vYYYY-MM-DDx');
ok(/class="stamp">' \+ esc\(BUILD\)/.test(src), '설정 화면에 BUILD 표시');
if (PARSE === null || GROUP === null) { console.log('결과: ' + pass + ' 통과, ' + fail + ' 실패'); process.exit(1); }

const CLOCK = { now: Date.UTC(2031, 5, 15, 3, 0, 0) };   // 2031-06-15 — 검사 기준일과 멀리
const S = { Math, JSON, Object, Array, String, Number, Date: frozenDate(CLOCK), RegExp, console };
vm.createContext(S);
let loadErr = null;
try { vm.runInContext(PARSE + '\n' + GROUP, S); } catch (e) { loadErr = e; }
ok(!loadErr, '마커 코드가 독립 실행됨' + (loadErr ? ' — ' + loadErr.message : ''));
ok(typeof S.parse === 'function', 'parse 함수');
ok(typeof S.resolveDate === 'function', 'resolveDate 함수');
ok(typeof S.sortAll === 'function', 'sortAll 함수');
if (loadErr) { console.log('결과: ' + pass + ' 통과, ' + fail + ' 실패'); process.exit(1); }

const T = '2026-09-03';    // 목요일
const T2 = '2026-12-17';   // 목요일 — 두 번째 기준일(today 인자가 실제로 쓰이는지)
// 저장 모양 그대로: 키가 id, 값에 id 없음
const TASKS = {
  '260903k3x': { title: '감독 배정표 회신', status: 'todo', area: 'admin', priority: 2, due: '2026-09-05', updatedAt: 10, createdAt: 10 },
  '260901m2p': { title: '중간고사 문항', status: 'doing', area: 'class', priority: 1, due: '2026-09-25', updatedAt: 20, createdAt: 5 },
  '260830q8a': { title: '1-3 심화 세트', status: 'done', area: 'class', priority: 2, updatedAt: 30, createdAt: 1 }
};
const P = (line, area, today, tasks) => S.parse(line, area || 'admin', today || T, tasks === undefined ? TASKS : tasks);

// ══ [2] PRD §4.2 예시 4줄 ══
sec('[2] PRD §4.2 예시 4줄');
{
  let r = P('학력평가 결과 보고 @9/12 ! +NEIS 추출 +표 +결재', 'event');
  eq(r.title, '학력평가 결과 보고', '예1 제목');
  eq(r.due, '2026-09-12', '예1 마감');
  eq(r.priority, 1, '예1 높음');
  eq(r.area, 'event', '예1 현재 탭 영역');
  eq(r.checks, ['NEIS 추출', '표', '결재'], '예1 체크 3');
  eq(r.editId, null, '예1 새 항목');
  eq(r.memo, undefined, '예1 메모 없음');
  eq(r.fallback, false, '예1 정상 줄');

  r = P('위탁 교육생 면담 @내일 // 5교시 후');
  eq(r.title, '위탁 교육생 면담', '예2 제목');
  eq(r.due, '2026-09-04', '예2 내일');
  eq(r.memo, '5교시 후', '예2 메모');
  eq(r.priority, 2, '예2 보통');
  eq(r.checks, [], '예2 체크 0');

  r = P('1-3 심화 세트 #교');
  eq(r.title, '1-3 심화 세트', '예3 제목');
  eq(r.area, 'class', '예3 교과');
  eq(r.checks, ['제작', '검사', '배포', '허브 카드'], '예3 체크 4틀');
  eq(r.due, undefined, '예3 마감 없음');

  r = P('>k3x @담주월');
  eq(r.editId, '260903k3x', '예4 수정 대상');
  eq(r.patch, { due: '2026-09-07' }, '예4 patch 마감만');
  eq(r.title, '', '예4 제목 비어 있음');
  // 두 번째 기준일
  eq(P('위탁 교육생 면담 @내일', 'admin', T2).due, '2026-12-18', '예2 를 12월 기준으로');
  eq(P('>k3x @담주월', 'admin', T2).patch, { due: '2026-12-21' }, '예4 를 12월 기준으로');
}

// ══ [3] 날짜 토큰 ══
sec('[3] 날짜 토큰 (오늘 = 2026-09-03 목)');
{
  const R = (tok, today) => S.resolveDate(tok, today || T);
  eq(R('오늘'), '2026-09-03', '@오늘');
  eq(R('내일'), '2026-09-04', '@내일');
  eq(R('모레'), '2026-09-05', '@모레');
  eq(R('목'), '2026-09-03', '@목 = 오늘');
  eq(R('금'), '2026-09-04', '@금');
  eq(R('토'), '2026-09-05', '@토');
  eq(R('일'), '2026-09-06', '@일');
  eq(R('월'), '2026-09-07', '@월 (지남 → 다음 주)');
  eq(R('화'), '2026-09-08', '@화');
  eq(R('수'), '2026-09-09', '@수 (지남 → 다음 주)');
  eq(R('담주월'), '2026-09-07', '@담주월');
  eq(R('담주화'), '2026-09-08', '@담주화');
  eq(R('담주수'), '2026-09-09', '@담주수');
  eq(R('담주목'), '2026-09-10', '@담주목 (오늘 요일이라도 다음 주)');
  eq(R('담주금'), '2026-09-11', '@담주금');
  eq(R('담주토'), '2026-09-12', '@담주토');
  eq(R('담주일'), '2026-09-13', '@담주일');
  eq(R('이번주'), '2026-09-04', '@이번주 = 이번 주 금');
  eq(R('다음주'), '2026-09-07', '@다음주 = 다음 주 월');
  eq(R('9/25'), '2026-09-25', '@9/25');
  eq(R('0925'), '2026-09-25', '@0925');
  eq(R('9-25'), '2026-09-25', '@9-25');
  eq(R('9.25'), '2026-09-25', '@9.25');
  eq(R('12/1'), '2026-12-01', '@12/1');
  eq(R('2026-10-01'), '2026-10-01', '@YYYY-MM-DD');
  eq(R('2026-06-01'), '2026-06-01', '연도 있는 지난 날짜는 그대로(내년으로 안 밀림)');
  eq(R('2025-06-01'), '2025-06-01', '연도 있는 작년 날짜 그대로');
  eq(R('2027-06-01'), '2027-06-01', '연도 있는 내년 날짜 그대로');
  eq(R('2026-13-01'), null, '연도 있어도 틀린 달은 아님');
  eq(R('+3'), '2026-09-06', '@+3');
  eq(R('+0'), '2026-09-03', '@+0');
  eq(R('+30'), '2026-10-03', '@+30 (달 넘김)');
  eq(R('없음'), 'none', '@없음');
  eq(R('9/3'), '2026-09-03', '@9/3 = 오늘');
  eq(R('8/20'), '2026-08-20', '@8/20 (2주 지남 → 올해 그대로)');
  eq(R('1/10'), '2027-01-10', '@1/10 (한 달 넘게 지남 → 내년)');
  eq(R('1/10', '2026-12-20'), '2027-01-10', '12월에 @1/10 → 내년');
  eq(R('12/1', '2026-12-20'), '2026-12-01', '12월에 @12/1 → 올해');
  eq(R('13/1'), null, '@13/1 은 날짜 아님');
  eq(R('2/30'), null, '@2/30 은 날짜 아님');
  eq(R('0231'), null, '@0231 은 날짜 아님');
  eq(R('abc'), null, '@abc 는 날짜 아님');
  eq(R(''), null, '빈 토큰');
  eq(R('담주'), null, '@담주 만은 아님');
  eq(R('담주요'), null, '@담주요 아님');
  // 요일 경계 — 이번주·다음주 (주 시작 = 월요일)
  eq(R('이번주', '2026-09-04'), '2026-09-04', '금요일의 @이번주 = 오늘');
  eq(R('이번주', '2026-09-05'), '2026-09-11', '토요일의 @이번주 = 다음 주 금');
  eq(R('이번주', '2026-09-06'), '2026-09-11', '일요일의 @이번주 = 다음 주 금');
  eq(R('이번주', '2026-09-07'), '2026-09-11', '월요일의 @이번주 = 이번 주 금');
  eq(R('다음주', '2026-09-07'), '2026-09-14', '월요일의 @다음주 = 다음 주 월');
  eq(R('다음주', '2026-09-06'), '2026-09-07', '일요일의 @다음주 = 내일');
  eq(R('담주월', '2026-09-07'), '2026-09-14', '월요일의 @담주월');
  eq(R('담주일', '2026-09-06'), '2026-09-13', '일요일의 @담주일');
  eq(R('월', '2026-09-07'), '2026-09-07', '월요일의 @월 = 오늘');
  eq(R('일', '2026-09-06'), '2026-09-06', '일요일의 @일 = 오늘');
  eq(R('내일', '2026-12-31'), '2027-01-01', '연말 @내일');
  eq(R('+3', '2026-02-27'), '2026-03-02', '2월 말 @+3');
  // 두 번째 기준일(12-17 목) — parse 경유
  eq(P('a @오늘', 'admin', T2).due, '2026-12-17', 'T2 @오늘');
  eq(P('a @모레', 'admin', T2).due, '2026-12-19', 'T2 @모레');
  eq(P('a @수', 'admin', T2).due, '2026-12-23', 'T2 @수 → 다음 주');
  eq(P('a @담주화', 'admin', T2).due, '2026-12-22', 'T2 @담주화');
  eq(P('a @이번주', 'admin', T2).due, '2026-12-18', 'T2 @이번주');
  eq(P('a @다음주', 'admin', T2).due, '2026-12-21', 'T2 @다음주');
  eq(P('a @+3', 'admin', T2).due, '2026-12-20', 'T2 @+3');
  eq(P('a @1/10', 'admin', T2).due, '2027-01-10', 'T2 @1/10 → 내년');
  eq(P('a @0925', 'admin', T2).due, '2027-09-25', 'T2 @0925 → 내년');
  // parse 를 거친 due
  eq(P('a @모레').due, '2026-09-05', 'parse @모레');
  eq(P('a @없음').due, undefined, 'parse @없음 → due 없음');
  eq(P('a @9/25 @없음').due, undefined, '@없음 이 뒤에 오면 없음');
  eq(P('a @없음 @9/25').due, '2026-09-25', '뒤 토큰이 이김');
  eq(P('a @9/25 @내일').due, '2026-09-04', '마지막 @ 가 이김');
  eq(P('a @2026-06-01').due, '2026-06-01', 'parse 연도 있는 토큰 그대로(📅 경로)');
  eq(P('a @abc').title, 'a @abc', '안 걸리는 @ 는 제목');
  eq(P('a @').title, 'a @', '@ 홀로는 제목');
  eq(P('a @13/1').title, 'a @13/1', '틀린 날짜는 제목');
}

// ══ [4] 공백 규칙 ══
sec('[4] 공백 규칙');
{
  let r = P('a@b.com 회신');
  eq(r.title, 'a@b.com 회신', '붙은 @ 는 제목'); eq(r.due, undefined, '붙은 @ 마감 없음');
  r = P('회신@내일');
  eq(r.title, '회신@내일', '붙은 @내일 도 제목'); eq(r.due, undefined, '붙은 @내일 마감 없음');
  r = P('회신 @내일');
  eq(r.title, '회신', '띄운 @내일 은 토큰'); eq(r.due, '2026-09-04', '띄운 @내일 마감');
  r = P('x#교 정리');
  eq(r.title, 'x#교 정리', '붙은 # 는 제목'); eq(r.area, 'admin', '붙은 # 영역 안 바뀜'); eq(r.checks, [], '붙은 # 체크 없음');
  r = P('C#교재 !');
  eq(r.title, 'C#교재', '붙은 #교재'); eq(r.priority, 1, '띄운 ! 는 높음');
  r = P('급함! 회신');
  eq(r.title, '급함! 회신', '붙은 ! 는 제목'); eq(r.priority, 2, '붙은 ! 중요도 그대로');
  r = P('!급함');
  eq(r.title, '!급함', '! 뒤에 글자 있으면 제목'); eq(r.priority, 2, '!급함 중요도 그대로');
  r = P('a ~');
  eq(r.priority, 3, '~ 는 낮음'); eq(r.title, 'a', '~ 제목 제외');
  r = P('a~b');
  eq(r.title, 'a~b', '붙은 ~ 는 제목'); eq(r.priority, 2, '붙은 ~ 중요도');
  r = P('보고 // 5교시 후 @내일 +x');
  eq(r.memo, '5교시 후 @내일 +x', '// 뒤는 끝까지 메모'); eq(r.due, undefined, '메모 안 @ 는 마감 아님'); eq(r.checks, [], '메모 안 + 는 체크 아님'); eq(r.title, '보고', '메모 앞이 제목');
  r = P('//메모만');
  eq(r.memo, '메모만', '줄 머리 // 도 메모'); ok(r.title.length > 0, '전부 토큰이면 제목은 원문(실패 없음)'); eq(r.fallback, true, '전부 토큰이면 fallback true');
  eq(P('a').fallback, false, '보통 줄은 fallback false');
  eq(P('@내일 !').fallback, true, '토큰만 있으면 fallback'); eq(P('@내일 !').title, '@내일 !', '토큰만 있으면 원문이 제목');
  eq(P('>k3x 완료').fallback, false, '수정은 fallback 아님');
  r = P('https://x.y/z 확인');
  eq(r.title, 'https://x.y/z 확인', 'URL 의 // 는 메모 아님'); eq(r.memo, undefined, 'URL 메모 없음');
  r = P('a // b // c');
  eq(r.memo, 'b // c', '첫 // 부터 끝까지');
  r = P('a //');
  eq(r.memo, undefined, '빈 메모는 없음'); eq(r.title, 'a', '빈 메모 제목');
  r = P('a +x +y +z');
  eq(r.checks, ['x', 'y', 'z'], '+ 여러 개');
  r = P('a +NEIS 추출 +표 정리 @금');
  eq(r.checks, ['NEIS 추출', '표 정리'], '체크 텍스트는 다음 토큰까지'); eq(r.due, '2026-09-04', '체크 뒤 @ 토큰'); eq(r.title, 'a', '체크 뒤 제목 안 섞임');
  r = P('a +x b');
  eq(r.checks, ['x b'], '체크 뒤 낱말은 체크에 붙음');
  r = P('a @금 b');
  eq(r.title, 'a b', '@ 뒤 낱말은 제목으로');
  r = P('a +');
  eq(r.title, 'a +', '+ 홀로는 제목'); eq(r.checks, [], '+ 홀로 체크 없음');
  r = P('1+1 계산');
  eq(r.title, '1+1 계산', '붙은 + 는 제목'); eq(r.checks, [], '붙은 + 체크 없음');
  r = P('   앞 공백   @내일   ');
  eq(r.title, '앞 공백', '여러 공백'); eq(r.due, '2026-09-04', '여러 공백 뒤 토큰');
  r = P('a\t@내일');
  eq(r.due, '2026-09-04', '탭도 공백');
  r = P('@내일 회의');
  eq(r.due, '2026-09-04', '줄 머리 토큰'); eq(r.title, '회의', '줄 머리 토큰 뒤 제목');
  r = P('#사 체육대회');
  eq(r.area, 'event', '줄 머리 #사'); eq(r.title, '체육대회', '줄 머리 # 뒤 제목');
  r = P('a ! b ~');
  eq(r.priority, 3, '! 뒤 ~ 는 마지막이 이김'); eq(r.title, 'a b', '! ~ 제목 제외');
  r = P('a #행 #사');
  eq(r.area, 'event', '# 는 마지막이 이김');
  r = P('a #행정'); eq(r.area, 'admin', '#행정');
  r = P('a #행사'); eq(r.area, 'event', '#행사');
  r = P('a #교과'); eq(r.area, 'class', '#교과');
  r = P('a #x'); eq(r.title, 'a #x', '모르는 # 는 제목'); eq(r.area, 'admin', '모르는 # 영역 그대로');
  r = P('a #'); eq(r.title, 'a #', '# 홀로는 제목');
  r = P('a >'); eq(r.title, 'a >', '> 홀로는 제목');
  r = P(''); eq(r.title, '', '빈 줄'); eq(r.editId, null, '빈 줄 수정 아님');
  r = P(null); eq(typeof r.title, 'string', 'null 도 문자열');
  r = P(undefined); eq(typeof r.title, 'string', 'undefined 도 문자열');
}

// ══ [5] #교 4틀 ══
sec('[5] #교 4틀 — 토큰을 직접 쳤을 때만 / + 있으면 그것만');
{
  eq(P('a #교').checks, ['제작', '검사', '배포', '허브 카드'], '#교 → 4틀 순서대로');
  eq(P('a #교').checks.length, 4, '#교 정확히 4');
  eq(P('a #교과').checks, ['제작', '검사', '배포', '허브 카드'], '#교과 도 4틀');
  eq(P('a #교 +초안').checks, ['초안'], '#교 + 체크 있으면 그것만');
  eq(P('a +초안 +검토 #교').checks, ['초안', '검토'], '+ 가 앞에 있어도 그것만');
  eq(P('a #행').checks, [], '#행 은 체크 없음');
  eq(P('a #사').checks, [], '#사 는 체크 없음');
  eq(P('a').checks, [], '영역 기본(행정)은 체크 없음');
  eq(P('a', 'class').checks, [], '기본 영역이 교과여도 토큰 없이는 4틀 안 붙음');
  eq(P('a', 'class').area, 'class', '기본 영역 교과는 영역만');
  eq(P('a #교', 'class').checks, ['제작', '검사', '배포', '허브 카드'], '교과 영역에서 #교 를 치면 4틀');
  eq(P('a #행', 'class').checks, [], '교과 탭에서 #행 이면 없음');
  eq(P('a #교 #행').checks, [], '#교 뒤 #행 이면 없음(마지막 영역 기준)');
  eq(P('a #교 // 메모').checks, ['제작', '검사', '배포', '허브 카드'], '메모 있어도 4틀');
  eq(P('a #교 // 메모').memo, '메모', '#교 + 메모');
  eq(P('a #교 +x // +y').checks, ['x'], '메모 안 + 는 체크 아님');
  eq(P('>k3x #교').patch, { area: 'class' }, '수정에서 #교 는 영역만(4틀 안 붙임)');
  eq(P('>k3x #교').checks, [], '수정 반환 checks 도 비어 있음');
}

// ══ [6] >id 수정 ══
sec('[6] >id 수정');
{
  let r = P('>k3x @9/19'); eq(r.editId, '260903k3x', '>id 찾음'); eq(r.patch, { due: '2026-09-19' }, '마감 변경');
  r = P('>k3x 완료'); eq(r.patch, { status: 'done' }, '완료');
  r = P('>k3x 진행'); eq(r.patch, { status: 'doing' }, '진행');
  r = P('>k3x 대기'); eq(r.patch, { status: 'todo' }, '대기');
  r = P('>k3x 버림'); eq(r.patch, { status: 'dropped' }, '버림');
  r = P('>k3x +결재'); eq(r.patch, { 'checks+': ['결재'] }, '+체크 추가');
  r = P('>k3x +결재 +발송'); eq(r.patch['checks+'], ['결재', '발송'], '+체크 여러 개');
  r = P('>k3x 새 제목'); eq(r.patch, { title: '새 제목' }, '새 제목'); eq(r.title, '새 제목', '반환 title 도 새 제목');
  r = P('>k3x 완료 보고서'); eq(r.patch, { title: '완료 보고서' }, '상태어가 포함된 긴 제목은 제목');
  r = P('>k3x @없음'); eq(r.patch, { due: null }, '@없음 → due null');
  r = P('>k3x !'); eq(r.patch, { priority: 1 }, '높음');
  r = P('>k3x ~'); eq(r.patch, { priority: 3 }, '낮음');
  r = P('>k3x #사'); eq(r.patch, { area: 'event' }, '영역');
  r = P('>k3x // 5교시 후'); eq(r.patch, { memo: '5교시 후' }, '메모');
  r = P('>k3x @담주월 ! +결재 // m'); eq(r.patch, { due: '2026-09-07', priority: 1, 'checks+': ['결재'], memo: 'm' }, '여러 필드 한꺼번에');
  r = P('>k3x'); eq(r.editId, '260903k3x', '>id 만'); eq(r.patch, {}, '>id 만이면 patch 빈 객체');
  r = P('>260903k3x 완료'); eq(r.editId, '260903k3x', '전체 id 도 됨'); eq(r.patch, { status: 'done' }, '전체 id 완료');
  r = P('>K3X 완료'); eq(r.editId, '260903k3x', '대문자 id');
  r = P('>m2p 완료'); eq(r.editId, '260901m2p', '다른 id');
  r = P('>zzz 뭐'); eq(r.editId, null, '없는 id 는 수정 아님'); eq(r.title, '>zzz 뭐', '없는 id 는 제목 취급'); eq(r.patch, null, '새 항목 patch null');
  r = P('>k3 뭐'); eq(r.editId, null, '2자 id 는 아님'); eq(r.title, '>k3 뭐', '2자 id 제목');
  r = P('>k3xy 뭐'); eq(r.editId, null, '4자 id 는 아님');
  r = P('제목 >k3x @금'); eq(r.editId, '260903k3x', '> 가 뒤에 와도 됨'); eq(r.patch, { due: '2026-09-04', title: '제목' }, '뒤 > 제목+마감');
  r = P('a>k3x'); eq(r.editId, null, '붙은 > 는 제목'); eq(r.title, 'a>k3x', '붙은 > 제목');
  r = P('>k3x >m2p'); eq(r.editId, '260903k3x', '두 번째 > 는 무시'); eq(r.patch, { title: '>m2p' }, '두 번째 > 는 제목');
  r = P('>k3x @9/19', 'admin', T, null); eq(r.editId, null, 'tasks 없으면 수정 아님');
  r = P('>k3x @9/19', 'admin', T, {}); eq(r.editId, null, 'tasks 비면 수정 아님'); eq(r.title, '>k3x', '그때 제목');
  r = P('>k3x 완료', 'admin', T, Object.keys(TASKS).map(k => Object.assign({ id: k }, TASKS[k]))); eq(r.editId, '260903k3x', '배열 tasks 도 됨');
  eq(P('>k3x 완료').due, undefined, '수정 반환의 due 는 undefined');
  eq(P('>k3x 완료').checks, [], '수정 반환의 checks');
  // 접미 충돌 — 아직 교사가 ✓ 안 한 봇 제안 말고 살아 있는 쪽
  const dup = { '260801k3x': { title: 'old', status: 'todo', ok: false }, '260903k3x': TASKS['260903k3x'] };
  eq(P('>k3x 완료', 'admin', T, dup).editId, '260903k3x', '같은 접미면 목록에 있는 쪽');
  // 키 ≠ 값의 id — 키가 이긴다
  const odd = { '260903k3x': Object.assign({ id: 'other' }, TASKS['260903k3x']) };
  eq(P('>k3x 완료', 'admin', T, odd).editId, '260903k3x', '값에 id 가 있어도 키가 id');
}

// ══ [7] 실패 없음 ══
sec('[7] 실패 없음 (무작위 30줄)');
{
  let seed = 20260903;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pool = ['@', '#', '!', '~', '+', '>', '/', '//', ' ', ' ', ' ', '가', '나', '다', 'k3x', '9/25', '0925', '내일', '담주화', '교', '행', '완료', '없음', '\t', '@@', '#교', '+', '13/1', '2/30', 'a@b'];
  let thrown = 0, strings = 0, nonEmpty = 0, validPri = 0, validArea = 0, arrChecks = 0;
  for (let i = 0; i < 30; i++) {
    const n = 1 + Math.floor(rnd() * 12);
    let line = '';
    for (let j = 0; j < n; j++) line += pool[Math.floor(rnd() * pool.length)];
    let r;
    try { r = P(line); } catch (e) { thrown++; console.error('    throw: ' + JSON.stringify(line) + ' — ' + e.message); continue; }
    if (typeof r.title === 'string') strings++;
    if (r.editId || !line.trim() || r.title.length > 0) nonEmpty++;
    if ([1, 2, 3].includes(r.priority)) validPri++;
    if (['admin', 'event', 'class'].includes(r.area)) validArea++;
    if (Array.isArray(r.checks)) arrChecks++;
  }
  eq(thrown, 0, '예외 0');
  eq(strings, 30, 'title 은 항상 문자열');
  eq(nonEmpty, 30, '비지 않은 줄은 title 을 낸다');
  eq(validPri, 30, 'priority 는 1|2|3');
  eq(validArea, 30, 'area 는 셋 중 하나');
  eq(arrChecks, 30, 'checks 는 배열');
}

// ══ [9] sortAll ══
sec('[9] sortAll');
{
  const mk = (id, o) => Object.assign({ id, status: 'todo', priority: 2, updatedAt: 1 }, o);
  const arr = [mk('a'), mk('b', { priority: 1 }), mk('c', { due: '2026-09-01' }), mk('d', { due: '2026-08-01' }), mk('e', { priority: 3, due: '2026-01-01' }), mk('f', { updatedAt: 9 }), mk('g', { priority: 1, due: '2026-12-01' })];
  eq(S.sortAll(arr).map(t => t.id), ['g', 'b', 'd', 'c', 'f', 'a', 'e'], 'priority → due(없음 뒤) → updatedAt 최근 먼저');
  eq(S.sortAll(arr).length, 7, '개수 보존');
  eq(S.sortAll([]).length, 0, '빈 배열');
  const obj = {}; arr.forEach(t => { obj[t.id] = Object.assign({}, t); delete obj[t.id].id; });
  eq(S.sortAll(obj).map(t => t.id), ['g', 'b', 'd', 'c', 'f', 'a', 'e'], '객체 입력도 같다');
  eq(S.sortAll({ k1: mk('zzz') }).map(t => t.id), ['k1'], '키 ≠ 값 id 면 키');
  ok(S.sortAll(arr) !== arr, '원본 배열을 돌려주지 않음');
  eq(arr.map(t => t.id), ['a', 'b', 'c', 'd', 'e', 'f', 'g'], '원본 순서 보존');
  eq(S.sortAll([mk('x', { priority: undefined })]).length, 1, 'priority 없으면 보통 취급');
  eq(S.sortAll([mk('x', { priority: undefined }), mk('y', { priority: 3 })]).map(t => t.id), ['x', 'y'], 'priority 없음 = 2');
}

// ══ [10] 필드 경로 규약 ══
sec('[10] 필드 경로 규약 (store.update 인자)');
{
  const app = stripComments(APP);
  let calls = 0, good = 0;
  const re = /store\.update\(/g; let m;
  while ((m = re.exec(app))) {
    let i = m.index + m[0].length, depth = 1, j = i;
    while (j < app.length && depth) { const ch = app[j]; if (ch === '(' || ch === '{' || ch === '[') depth++; else if (ch === ')' || ch === '}' || ch === ']') depth--; j++; }
    const arg = app.slice(i, j - 1).trim();
    calls++;
    let fine = false;
    if (/^(map|inv|u\.inv)$/.test(arg)) fine = true;                        // 경로 map 변수는 map / inv / 되돌릴 u.inv 만
    else if (arg.startsWith('{')) {
      const keys = [...arg.matchAll(/(?:^|[{,])\s*(?:'([^']+)'|"([^"]+)"|\[([^\]]+)\])\s*:/g)];
      fine = keys.length > 0 && keys.every(k => {
        const lit = k[1] || k[2];
        if (lit) return /^(tasks|meta|log)\//.test(lit);
        return /tp\(|'tasks\/'|'meta\/'|'log\/'/.test(k[3]);
      });
    }
    if (fine) good++; else console.error('    경로 규약 위반: store.update(' + arg.slice(0, 60) + ')');
  }
  ok(calls >= 2, 'store.update 호출 ' + calls + '개 발견');
  eq(good, calls, '모든 store.update 인자가 필드 경로 map');
  // map / inv 는 경로 키로만 채워진다
  const fills = [...app.matchAll(/\b(map|inv)\[([^\]]+)\]\s*=(?![=>])/g)].map(x => x[2]);
  ok(fills.length >= 8, 'map[…] = 채우기 ' + fills.length + '곳');
  eq(fills.filter(k => !/^(tp\(|'(tasks|meta|log)\/|p\b)/.test(k)), [], 'map 키는 tasks/·meta/·log/ 경로');
  ok(/function tp\(id, f\)\{ return 'tasks\/' \+ id \+ '\/' \+ f; \}/.test(app), 'tp() 가 tasks/<id>/<field>');
  ok(/'log\/' \+ pushKey\(/.test(app), 'log 는 log/<push> 경로');
  ok(/map\['tasks\/' \+ id\] = t/.test(app), '새 항목은 tasks/<id> 통째로');
  const others = [...app.matchAll(/\bstore\.(\w+)/g)].map(x => x[1]).filter(x => !['load', 'update', 'subscribe'].includes(x));
  eq(others, [], 'store 의 다른 함수는 쓰지 않음');
  ok(/'meta\/lastArea'/.test(app), '새 항목마다 meta/lastArea');
  ok(/'meta\/reviewReq'/.test(app), '검토 요청은 meta/reviewReq');
}

// ══ [11] 앱 규칙 (정규식) ══
sec('[11] 앱 규칙 (정규식)');
{
  const app = stripComments(APP);
  ok(/via: 'app'/.test(app), 'log via app');
  ok(/by: 'me'/.test(app), 'log by me');
  ok(/field: field, from:/.test(app), 'log 에 field/from/to');
  ok(/createdBy: 'me'/.test(app) && /ok: true/.test(app), '새 항목 createdBy me · ok true');
  ok(/todayStr\(\)\.replace\(\/-\/g, ''\)\.slice\(2\)/.test(app), 'id = yymmdd + …');
  ok(/toString\(36\)\.slice\(2, 5\)/.test(app), 'id 뒤 base36 3자');
  // ★삭제는 삭제다 — 휴지통을 두지 않는다(교사 지시 2026-09-04). 되돌릴 길은 5초 토스트와 restore.
  ok(!/deletedAt/.test(app), '앱에 deletedAt 이 남아 있지 않음');
  ok(/map\['tasks\/' \+ id\] = null/.test(app), '삭제는 항목을 null 로');
  ok(/if \(d\.log\[k\]\.task === id\) map\['log\/' \+ k\] = null/.test(app), '그 항목의 기록도 함께 지운다');
  ok(/todo: 'doing', doing: 'done', done: 'todo'/.test(app), '상태점 순환 todo→doing→done→todo');
  ok(/14 \* DAY/.test(app), '14일 무변경 흐림');
  ok(!/되돌리기<\/button>/.test(app), '토스트에는 되돌리기 단추가 없다');
  ok(/id="undo-btn"/.test(src) && /aria-label="되돌리기"/.test(src), '되돌리기는 설정 왼쪽 붙박이 단추');
  ok(/MS = 3600000/.test(STORE), '되돌릴 수 있는 동안은 한 시간(STORE 블록 안 tmUndo)');
  ok(/'meta\/reviewReq': !d\.meta\.reviewReq/.test(app), '검토 요청 토글');
  ok(/if \(pr\.editId\) \{[^}]*applyPatch\(pr\.editId, pr\.patch\)/.test(app) && /else createTask\(pr\)/.test(app), 'submit: editId 면 applyPatch, 아니면 createTask');
  ok(/isComposing/.test(app), '한글 조합 중 Enter 무시');
  ok(/\.filter\(function\(t\)\{ return t\.ok !== false/.test(app), '전체 탭도 ok:false 제외');
  ok(/isPC\(\)\) \$\('in'\)\.focus\(\)/.test(app), '탭 전환 포커스는 PC 만');
  ok(/sh-\(title\|memo\|ref\)/.test(app), '시트 적는 중엔 다시 안 그림');
  ok(/scrollTop = st/.test(app), '시트 스크롤 복원');
  ok(/data-act="cycle"/.test(app), '상태점은 눌러서 돈다');
  ok(/data-act="del"/.test(app) && !/data-act="trash"/.test(app) && !/data-act="restore"/.test(app), '시트에는 삭제 하나뿐');
}

// ══ [12] 44px·16px·행 48px ══
// @media (min-width:768px){ … } 블록만 모은다. 조건을 바꾼 변이가 바로 드러나게.
function pcBlocks(css){
  const NEEDLE = '@media (min-width:768px){';
  let out = [], i = 0;
  for (;;) {
    const at = css.indexOf(NEEDLE, i); if (at < 0) break;
    let d = 0, j = at + NEEDLE.length - 1;
    for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}') { d--; if (!d) break; } }
    out.push(css.slice(at, j + 1)); i = j + 1;
  }
  return out;
}
sec('[12] 폰은 44px·16px / PC 는 노션 밀도');
{
  // 폰(기본)과 PC 분기를 갈라 잰다 — 노션 표는 14px 행·12px 열 머리라 PC 에서만 촘촘하다.
  const PCARR = pcBlocks(CSS), CSSPC = PCARR.join('');
  ok(CSSPC.length > 400, '★PC 분기(@media min-width:768px)가 살아 있다');
  let CSSBASE = CSS; PCARR.forEach(function(b){ CSSBASE = CSSBASE.replace(b, ''); });
  ok(/button,\.tap\{[^}]*min-height:44px[^}]*min-width:44px/.test(CSS), 'button 44×44');
  ok(/\.row\{[^}]*min-height:48px/.test(CSS), '행 48px');
  ok(/html\{font-size:16px/.test(CSS), 'html 16px');
  ok(/input,textarea,select\{[^}]*font-size:16px/.test(CSS), '입력창 16px (iOS 확대 방지)');
  let srcBase = src; PCARR.forEach(function(b){ srcBase = srcBase.replace(b, ''); });
  const sizes = [...srcBase.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(x => +x[1]);
  ok(sizes.length >= 8, '폰 font-size 선언 ' + sizes.length + '개');
  eq(sizes.filter(s => s < 16), [], '★폰에는 16px 미만 글자 없음');
  const pcSizes = [...CSSPC.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(x => +x[1]);
  ok(pcSizes.length >= 4, 'PC 분기가 글자 크기를 다시 잡는다 ' + pcSizes.length + '곳');
  eq(pcSizes.filter(s => s < 12), [], 'PC 라도 12px 미만은 없다');
  const shorthand = [...srcBase.matchAll(/font:\s*[^;'"}]*?(\d+(?:\.\d+)?)px/g)].map(x => +x[1]);
  eq(shorthand.filter(s => s < 16), [], 'font: 축약에도 16px 미만 없음');
  eq([...src.matchAll(/font-size:\s*(\d*\.?\d+)(em|rem|pt)/g)].map(x => x[0]), [], 'em/rem/pt 글자 크기 없음');
  ok(/\.chip\{min-width:44px/.test(CSS), '영역 칩 44px');
  const rules = [...CSSBASE.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(r => !/::(after|before)/.test(r[1]));
  const small = rules.filter(r => /button|\.chip|\.dot|\.tap|nav/.test(r[1]) && /min-height:\s*(\d+)px/.test(r[2]) && +r[2].match(/min-height:\s*(\d+)px/)[1] < 44).map(r => r[1].trim());
  eq(small, [], '탭 가능한 규칙에 44 미만 min-height 없음');
  const smallH = rules.filter(r => /button|\.dot|nav/.test(r[1]) && !/\si$/.test(r[1].trim()) && /(?:^|;)height:\s*(\d+)px/.test(r[2]) && +r[2].match(/(?:^|;)height:\s*(\d+)px/)[1] < 44).map(r => r[1].trim());
  eq(smallH, [], '단추 height 44 미만 없음');
  const smallW = rules.filter(r => /\.chip/.test(r[1]) && !/sep/.test(r[1]) && /min-width:\s*(\d+)px/.test(r[2]) && +r[2].match(/min-width:\s*(\d+)px/)[1] < 44).map(r => r[1].trim());
  eq(smallW, [], '칩 min-width 44 미만 없음');
  ok(/nav button\{[^}]*height:var\(--nav-h\)/.test(CSS) && /--nav-h:56px/.test(CSS), '하단 탭 56px');
  ok(/@media \(min-width:768px\)/.test(CSS), 'PC 분기 768px');
  ok(/#inbar\{order:1/.test(CSSPC) && /#scroll\{order:2/.test(CSSPC), 'PC 는 입력창이 맨 위');
  // ★폰도 입력창이 맨 위다 — 아래에 두니 「영 이상하다」(교사 지시 2026-09-09). 아래에 남는 것은 탭뿐이다
  ok(/#inbar\{order:1/.test(CSSBASE) && /#scroll\{order:2/.test(CSSBASE) && /(^|[^-\w])nav\{order:3/.test(CSSBASE), '폰도 입력창이 맨 위 · 탭만 아래');
  ok(/#inbar\{[^}]*border-bottom:1px/.test(CSSBASE) && !/#inbar\{[^}]*border-top:1px/.test(CSSBASE), '폰 입력창 경계선은 아래쪽(위에 있으므로)');
  // ★폰 행은 「.main 두 줄」이 전부다 — PC 표의 5칸을 폰에서도 그리면 제목이 0px 로 짓눌리고
  //   마감일이 한 글자씩 세로로 쪼개진다. 라이브 실측으로 잡았다(2026-09-09, 노션 30건이 들어온 직후).
  // ★폰 .main 은 두 줄 grid 다 — inline 이면 점·이모지·제목·메타가 통째로 세로로 쌓여 행이 108px 가 된다
  ok(/\.row \.main\{[^}]*display:grid/.test(CSSBASE) && /\.row \.main\{[^}]*grid-template-areas:"dot emo ttl" "dot emo meta"/.test(CSSBASE), '폰 행은 [점][이모지][제목]/[메타] 두 줄 grid');
  ok(/\.row \.main\{[^}]*display:flex/.test(CSSPC), 'PC 는 .main 이 다시 한 줄 flex');
  ['c-stat', 'c-due', 'c-area', 'c-pri', 'c-ck'].forEach(function (c) {
    ok(new RegExp('\\.' + c + '[^{}]*\\{[^}]*display:none').test(CSSBASE), '폰은 ' + c + ' 칸을 그리지 않는다');
    ok(new RegExp('\\.' + c + '[^{}]*\\{[^}]*display:flex').test(CSSPC), 'PC 에서는 ' + c + ' 칸이 되살아난다');
  });
  // ★제목은 같이 굴러가고 보기 탭만 붙어 있어야 한다 — 화면을 크게 차지하지 않게(교사 지시 2026-09-04)
  ok(/#scroll\{[^}]*overflow:auto/.test(CSSBASE), '스크롤은 #scroll 이 맡는다');
  ok(!/(^|[^-\w])main\{[^}]*overflow:auto/.test(CSS), 'main 은 스크롤하지 않는다(제목이 안 굴러가게 되므로)');
  ok(/\.views\{[^}]*position:sticky[^}]*top:0/.test(CSSBASE), '보기 탭은 위에 붙는다');
  ok(/\.gh\{[^}]*position:sticky/.test(CSSBASE), '그룹 머리도 붙는다');
  ok(/(^|[^-\w])nav\{display:none/.test(CSSPC), 'PC 에서는 아래 탭을 감춘다(보기 탭이 위에 있다)');
  ok(/overflow-x:hidden/.test(CSS), '가로 스크롤 막음');
  ok(/env\(safe-area-inset-bottom\)/.test(CSS), 'iOS 안전 영역');
  ok(/100dvh/.test(CSS), 'dvh 높이');
}

// ══ [13] CSS 클래스 존재 · 군더더기 ══
sec('[13] CSS 클래스 존재 · 군더더기');
{
  ok(/--admin:#/.test(CSS) && /--event:#/.test(CSS) && /--class:#/.test(CSS), '영역 3색 변수');
  ok(/--todo:#/.test(CSS) && /--doing:#/.test(CSS) && /--done:#/.test(CSS), '상태색 변수');
  ok(/\.row\.a-admin\{border-left-color:var\(--admin\)\}/.test(CSS), '폰 행의 영역 띠');
  // 노션 태그 팔레트 — 배경·글자가 짝으로 있어야 대비가 산다
  for (const c of ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red']) {
    ok(new RegExp('--t-' + c + '-b:#').test(CSS) && new RegExp('--t-' + c + '-f:#').test(CSS), '태그색 ' + c + ' 짝');
    ok(new RegExp('\\.tg\\.' + c + '\\{').test(CSS), '.tg.' + c);
  }
  ok(/--ink:#37352F/i.test(CSS), '★글자는 순검정이 아니라 노션의 먹빛 #37352F');
  ok(!/color:\s*#000\b/i.test(CSS) && !/color:\s*black\b/i.test(CSS), '순검정 글자 없음');
  ok(/\.row\.stale/.test(CSS), '방치 흐림 클래스');
  for (const c of ['a-admin', 'a-event', 'a-class', 's-todo', 's-doing', 's-done', 's-dropped', 'stale', 'gh', 'fold', 'closed', 'row', 'dot', 'off', 'main', 'meta', 'dn', 'over', 'now', 'id', 'chip', 'on', 'menu', 'cell-in', 'sheet-bg', 'sheet-body', 'sh-top', 'seg', 'lbl', 'duerow', 'ck', 'done', 'tg', 'rm', 'ckadd', 'ref', 'log', 'danger', 'modal-body', 'stack', 'wide', 'stamp', 'empty', 'stat', 'ttl', 'emo', 'thead', 'cnt', 'add', 'views', 'grow', 'gear', 'pageicon', 'sub', 'board', 'bcol', 'bhead', 'card', 'emogrid', 'acct', 'msg']) {
    ok(new RegExp('\\.' + c.replace(/-/g, '\\-') + '(?![\\w-])').test(CSS), 'CSS 에 .' + c);
  }
  ok(!/※/.test(src), '※ 안내문 없음');
  // 안내문 대신 두 낱말짜리 이름표만 — 설명하는 placeholder 는 군더더기다
  const phs = [...src.matchAll(/placeholder="([^"]*)"/g)].map(x => x[1]);
  eq(phs.filter(v => v.length > 6), [], '설명하는 placeholder 없음 (' + phs.join(' · ') + ')');
  ok(!/<p[ >]/.test(src.replace(/<script>[\s\S]*<\/script>/, '')), '본문에 설명 문단 없음');
}

// ══ [14] STORE 실행 — load / update / subscribe 계약 ══
sec('[14] STORE 실행 (localStorage 스텁 · window 없음)');
try {
  const mkStore = (seed) => {
    const mem = Object.assign({}, seed || {});
    const C = { Math, JSON, Object, Array, String, Number, Date, console,
      localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } } };
    vm.createContext(C);
    vm.runInContext(STORE, C);
    return { C, mem };
  };
  let err = null, st;
  try { st = mkStore(); } catch (e) { err = e; }
  ok(!err, 'STORE 가 window 없이 실행됨' + (err ? ' — ' + err.message : ''));
  if (!err) {
    const { C, mem } = st, store = C.store;
    eq(Object.keys(store).sort(), ['load', 'subscribe', 'update'], 'store 는 load/update/subscribe 셋뿐');
    const d = store.load();
    eq(Object.keys(d).sort(), ['log', 'meta', 'tasks'], '빈 저장소 모양 {meta, tasks, log}');
    eq(Object.keys(d.meta).sort(), ['cutoverAt', 'lastArea', 'lastReview', 'reviewReq', 'schema'], 'meta 칸');
    eq(d.meta.schema, 1, 'schema 1'); eq(d.meta.reviewReq, false, 'reviewReq false'); eq(d.meta.lastArea, 'admin', 'lastArea admin');
    ok(store.load() === d, 'load 는 같은 객체');
    let calls = 0, got = null; store.subscribe(x => { calls++; got = x; });
    const obj = { title: 'a', status: 'todo', checks: { c1: { text: 'x', done: false } } };
    store.update({ 'tasks/id1': obj, 'meta/lastArea': 'class' });
    eq(calls, 1, 'update 마다 구독 알림 1회'); ok(got === d, '알림 인자는 데이터');
    eq(d.tasks.id1.title, 'a', '통째 쓰기'); eq(d.meta.lastArea, 'class', 'meta 경로');
    obj.title = 'changed'; obj.checks.c1.done = true;
    eq(d.tasks.id1.title, 'a', '깊은 복사 — 원본을 바꿔도 저장은 그대로'); eq(d.tasks.id1.checks.c1.done, false, '깊은 복사(중첩)');
    store.update({ 'tasks/id1/checks/c2/text': 'y' });
    eq(d.tasks.id1.checks.c2, { text: 'y' }, '중간 경로 자동 생성');
    store.update({ 'tasks/id1/due': '2026-01-01' }); eq(d.tasks.id1.due, '2026-01-01', '필드 추가');
    store.update({ 'tasks/id1/due': null }); ok(!('due' in d.tasks.id1), 'null 은 키 삭제(저장소에 null 이 남지 않음)');
    store.update({ 'tasks/id1/memo': undefined }); ok(!('memo' in d.tasks.id1), 'undefined 도 삭제');
    store.update({ 'tasks/id1/checks/c1': null }); ok(!('c1' in d.tasks.id1.checks), '중첩 삭제');
    store.update({ 'tasks/id1': null }); ok(!('id1' in d.tasks), '항목 삭제');
    store.update({ 'tasks/id2/title': 't2', 'tasks/id2/priority': 0, 'tasks/id2/ok': false });
    eq(d.tasks.id2, { title: 't2', priority: 0, ok: false }, '0·false 는 삭제가 아니라 값');
    eq(calls, 8, '알림 횟수 = update 횟수');
    const saved = JSON.parse(mem.tm);
    eq(saved.tasks.id2.title, 't2', 'localStorage 에 씀'); eq(saved, d, '저장본 = 메모리');
    // 다시 읽기
    const st2 = mkStore(mem); const d2 = st2.C.store.load();
    eq(d2.tasks.id2, { title: 't2', priority: 0, ok: false }, '새 컨텍스트가 같은 저장소를 읽음');
    eq(d2.meta.lastArea, 'class', 'meta 도 유지');
    // 망가진 저장소
    const st3 = mkStore({ tm: '{oops' }); eq(Object.keys(st3.C.store.load()).sort(), ['log', 'meta', 'tasks'], '깨진 JSON 은 빈 저장소');
    const st4 = mkStore({ tm: '{"tasks":{"a":{"title":"x"}}}' }); const d4 = st4.C.store.load();
    eq(d4.meta.schema, 1, '빠진 meta 는 채워짐'); eq(d4.tasks.a.title, 'x', '있는 tasks 는 유지'); eq(d4.log, {}, '빠진 log 는 빈 객체');
    const st5 = mkStore({ tm: '"str"' }); eq(Object.keys(st5.C.store.load()).sort(), ['log', 'meta', 'tasks'], '객체 아닌 JSON 은 빈 저장소');
  }
} catch (e) { fail++; console.log('  X FAIL: [14] STORE 실행이 예외로 멈췄다 — ' + (e && e.message)); }

// ══ [15] 앱 실행 — DOM 스텁 위에서 submit / 시트 / 삭제 / 되돌리기 ══
  function makeApp(seed, clock){
    const mem = Object.assign({}, seed || {});
    const els = {};
    const doc = { activeElement: null };
    function makeEl(id){
      const classes = new Set();
      const el = { id, value: '', innerHTML: '', textContent: '', hidden: false, style: {}, dataset: {}, listeners: {}, scrollTop: 0, offsetHeight: 0, offsetWidth: 0,
        getBoundingClientRect(){ return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; },
        classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c),
          toggle: (c, f) => { if (f === undefined) f = !classes.has(c); if (f) classes.add(c); else classes.delete(c); return f; } },
        _classes: classes,
        addEventListener(t, f){ (el.listeners[t] = el.listeners[t] || []).push(f); },
        fire(t, ev){ (el.listeners[t] || []).forEach(f => f.call(el, ev || {})); },
        last(t){ const l = el.listeners[t] || []; return l[l.length - 1]; },
        focus(){ doc.activeElement = el; }, blur(){ doc.activeElement = null; }, select(){}, click(){},
        contains(){ return false; }, closest(){ return null; },
        querySelector(){ return makeEl(); }, querySelectorAll(){ return []; },
        _attr: {}, setAttribute(k, v){ this._attr[k] = v; }, removeAttribute(k){ delete this._attr[k]; },
        getAttribute(k){ return k in this._attr ? this._attr[k] : null; },
        appendChild(){}, removeChild(){} };
      return el;
    }
    doc.getElementById = id => els[id] || (els[id] = makeEl(id));
    doc.querySelector = sel => els['sel:' + sel] || (els['sel:' + sel] = makeEl(sel));
    doc.querySelectorAll = () => [];
    doc.addEventListener = (t, f) => { (doc._dl = doc._dl || {})[t] = f; };
    doc.createElement = () => makeEl();
    doc.execCommand = () => true;
    doc.documentElement = Object.assign(makeEl('html'), {
      _attr: {},
      setAttribute(k, v){ this._attr[k] = v; }, removeAttribute(k){ delete this._attr[k]; },
      getAttribute(k){ return k in this._attr ? this._attr[k] : null; },
    });
    doc.body = makeEl('body');
    const timers = [];
    const C = { Math, JSON, Object, Array, String, Number, RegExp, console, Date: frozenDate(clock),
      document: doc, navigator: {}, innerWidth: 1024, innerHeight: 768,
      localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
      setTimeout: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimeout: () => {} };
    C.window = C; C.addEventListener = (t, f) => { (C._wl = C._wl || {})[t] = f; };
    vm.createContext(C);
    vm.runInContext(SCRIPT, C);
    C._mem = mem; C._els = els; C._timers = timers; C._doc = doc;
    return C;
  }
sec('[15] 앱 실행 (DOM 스텁 · 생성 → >id 수정 → 상태 순환 → 삭제 → 되돌리기)');
// 앞 절이 깨뜨린 스토어 때문에 여기서 던지면 결과 줄이 안 나온다 — 던짐도 실패로 센다.
try {
  const clock = { now: Date.UTC(2031, 5, 15, 3, 0, 0) };
  let A = null, err = null;
  try { A = makeApp(null, clock); } catch (e) { err = e; }
  ok(!err, '앱 전체가 DOM 스텁 위에서 뜬다' + (err ? ' — ' + err.stack.split('\n').slice(0, 2).join(' ') : ''));
  if (A) {
    const $ = id => A._els[id] || A._doc.getElementById(id);
    const data = () => A.store.load();
    let lastId = null;
    const type = (line) => { const was = Object.keys(data().tasks); $('in').value = line; A.submit(); const now = Object.keys(data().tasks).filter(k => !was.includes(k)); if (now.length) lastId = now[0]; return now[0] || null; };
    const only = () => lastId;
    const logsOf = (id) => Object.keys(data().log).map(k => data().log[k]).filter(l => l.task === id);
    ok(A._doc.activeElement === $('in'), '열면 입력창 포커스');
    eq(A.ui.view, 'all', '처음 보기는 전체');

    // 생성
    type('감독 배정표 회신 @오늘 ! +NEIS 추출');
    eq(Object.keys(data().tasks).length, 1, '한 줄 → 항목 1');
    const id1 = only(), t1 = data().tasks[id1];
    ok(/^\d{6}[0-9a-z]{3}$/.test(id1), 'id = 6자리 날짜 + base36 3자 (' + id1 + ')');
    eq(id1.slice(0, 6), A.todayStr().replace(/-/g, '').slice(2), 'id 앞 6자 = 오늘');
    const ALLOWED = ['title', 'status', 'area', 'priority', 'due', 'checks', 'memo', 'ref', 'createdBy', 'ok', 'createdAt', 'updatedAt', 'doneAt', 'claude'];
    eq(Object.keys(t1).filter(k => !ALLOWED.includes(k)), [], '새 항목에 PRD §3 밖의 필드 없음');
    eq(['title', 'status', 'area', 'priority', 'createdBy', 'ok', 'createdAt', 'updatedAt', 'due', 'checks'].filter(k => !(k in t1)), [], '필수 필드 전부 있음');
    ok(!('id' in t1), '저장 값엔 id 없음(키가 id)');
    eq(t1.title, '감독 배정표 회신', '제목'); eq(t1.status, 'todo', 'todo 로 태어남'); eq(t1.area, 'admin', '첫 항목 = 행정');
    eq(t1.priority, 1, '높음'); eq(t1.due, A.todayStr(), '@오늘 = 앱의 오늘');
    eq(t1.createdBy, 'me', 'createdBy me'); eq(t1.ok, true, 'ok true');
    eq(t1.createdAt, clock.now, 'createdAt = 지금'); eq(t1.updatedAt, clock.now, 'updatedAt = 지금'); ok(t1.doneAt == null, 'doneAt 없음'); ok(!('deletedAt' in t1), '휴지통 필드 자체가 없음');
    const cks = Object.keys(t1.checks);
    eq(cks.length, 1, '체크 1'); ok(/^c/.test(cks[0]), '체크 키는 c<push>');
    eq(t1.checks[cks[0]], { text: 'NEIS 추출', done: false, by: null, ts: null, order: 1 }, '체크 모양 {text,done,by,ts,order}');
    eq(data().meta.lastArea, 'admin', 'meta.lastArea 갱신');
    const l1 = logsOf(id1);
    eq(l1.length, 1, '생성 log 1');
    eq(Object.keys(l1[0]).sort(), ['by', 'field', 'from', 'task', 'to', 'ts', 'via'], 'log 모양 {task,field,from,to,by,via,ts}');
    eq(l1[0], { task: id1, field: 'create', from: null, to: '감독 배정표 회신', by: 'me', via: 'app', ts: clock.now }, '생성 log 내용');
    eq($('in').value, '', '저장 후 입력창 비움'); ok(A._doc.activeElement === $('in'), '저장 후 포커스 유지');
    ok(JSON.parse(A._mem.tm).tasks[id1].title === '감독 배정표 회신', 'localStorage 에 저장됨');
    ok(!$('toast').hidden && /추가됨/.test($('toast').innerHTML), '추가 토스트');
    ok(!/되돌리기<\/button>/.test($('toast').innerHTML), '토스트에는 되돌리기가 없다');
    ok($('undo-btn').hidden === false, '되돌리기 단추가 살아난다');
    ok(new RegExp('data-id="' + id1 + '"').test($('main').innerHTML), '목록에 새 항목');
    ok(/D-day/.test($('main').innerHTML), 'D-day 표시'); ok(/☑0\/1/.test($('main').innerHTML), '☑0/1');

    // >id 수정 — 앱 계층이 editId 분기를 실제로 타는가
    const s1 = id1.slice(-3);
    clock.now += 60000;
    type('>' + s1 + ' 완료');
    eq(Object.keys(data().tasks).length, 1, '>id 완료 는 새 항목을 만들지 않는다');
    eq(data().tasks[id1].status, 'done', '>id 완료 → done'); eq(data().tasks[id1].doneAt, clock.now, 'done → doneAt');
    eq(data().tasks[id1].updatedAt, clock.now, 'updatedAt 갱신');
    eq(logsOf(id1).filter(l => l.field === 'status').map(l => [l.from, l.to]), [['todo', 'done']], 'status log todo→done');
    type('>' + s1 + ' 대기');
    eq(data().tasks[id1].status, 'todo', '>id 대기 → todo'); ok(data().tasks[id1].doneAt == null, '완료 해제 → doneAt 비움');
    type('>' + s1 + ' 진행'); eq(data().tasks[id1].status, 'doing', '>id 진행');
    type('>' + s1 + ' 새 이름'); eq(data().tasks[id1].title, '새 이름', '>id 새 제목');
    type('>' + s1 + ' @9/25'); ok(/-09-25$/.test(data().tasks[id1].due), '>id @9/25');
    type('>' + s1 + ' ~'); eq(data().tasks[id1].priority, 3, '>id ~');
    type('>' + s1 + ' #사'); eq(data().tasks[id1].area, 'event', '>id #사'); eq(Object.keys(data().tasks[id1].checks).length, 1, '>id #사 로 체크 안 늘어남');
    type('>' + s1 + ' #교'); eq(Object.keys(data().tasks[id1].checks).length, 1, '>id #교 도 4틀 안 붙음');
    type('>' + s1 + ' // 5교시 후'); eq(data().tasks[id1].memo, '5교시 후', '>id 메모');
    eq(Object.keys(data().tasks).length, 1, '수정 8꼴 뒤에도 항목 1');

    // >id +체크 @없음 — commit 한 번 · 되돌리기 한 번에
    clock.now += 60000;
    const nLogBefore = Object.keys(data().log).length;
    type('>' + s1 + ' +결재 +발송 @없음');
    ok(!('due' in data().tasks[id1]), '@없음 → due 키 자체가 없어짐');
    eq(Object.keys(data().tasks[id1].checks).length, 3, '체크 +2');
    eq(A.ckList(data().tasks[id1]).map(c => [c.text, c.order]), [['NEIS 추출', 1], ['결재', 2], ['발송', 3]], '체크 order 이어짐');
    const tsSet = new Set(Object.keys(data().log).slice(nLogBefore).map(k => data().log[k].ts));
    eq(tsSet.size, 1, '한 줄의 변경은 한 ts(커밋 한 번)');
    ok(/수정됨/.test($('toast').innerHTML), '수정 토스트');
    A.undoLast();
    eq(Object.keys(data().tasks[id1].checks).length, 1, '되돌리기 → 체크 원복'); ok(/-09-25$/.test(data().tasks[id1].due), '되돌리기 → 마감 원복');
    eq(Object.keys(data().log).length, nLogBefore, '되돌리기 → log 도 원복');

    // 없는 id 는 제목
    type('>zzz 뭐'); eq(Object.keys(data().tasks).length, 2, '없는 id 는 새 항목'); eq(data().tasks[only()].title, '>zzz 뭐', '그때 제목은 원문');
    // 되돌리기로 방금 항목 삭제
    $('undo-btn').fire('click'); eq(Object.keys(data().tasks).length, 1, '★단추를 눌러 되돌린다(배선 확인)');

    // 상태점 순환
    clock.now += 60000;
    A.cycleStatus(id1); eq(data().tasks[id1].status, 'done', 'doing → done'); eq(data().tasks[id1].doneAt, clock.now, 'doneAt');
    A.cycleStatus(id1); eq(data().tasks[id1].status, 'todo', 'done → todo'); ok(data().tasks[id1].doneAt == null, 'doneAt 해제');
    A.cycleStatus(id1); eq(data().tasks[id1].status, 'doing', 'todo → doing');
    A.cycleStatus(id1); eq(data().tasks[id1].status, 'done', 'doing → done (2)');
    eq(logsOf(id1).filter(l => l.field === 'status').length, 7, '상태 변경마다 log');

    // #교 4틀 — 토큰일 때만
    type('1-3 심화 세트 #교');
    const idC = only(), tC = data().tasks[idC];
    eq(tC.area, 'class', '#교 → 교과');
    eq(A.ckList(tC).map(c => c.text), ['제작', '검사', '배포', '허브 카드'], '#교 → 4틀');
    eq(A.ckList(tC).map(c => c.order), [1, 2, 3, 4], '4틀 order');
    eq(data().meta.lastArea, 'class', 'lastArea = class');
    A.ui.view = 'all'; A.ui.areaFilter = null; A.render();
    const idA = type('전체 탭 항목');
    eq(data().tasks[idA].area, 'class', '전체 탭·칩 없음 → 마지막 영역(class)');
    ok(!data().tasks[idA].checks, '영역만 교과일 땐 4틀 안 붙음');
    A.ui.areaFilter = 'event'; A.render();
    const idE = type('전체 탭 행사 칩');
    eq(data().tasks[idE].area, 'event', '전체 탭·행사 칩 → 행사');
    eq(data().meta.lastArea, 'event', 'lastArea = event');
    A.ui.areaFilter = null; A.ui.view = 'board'; A.render();
    const idM = type('교육과정위원회 회의 @9/7');
    eq(data().tasks[idM].area, 'admin', '보드 탭은 lastArea(event) 를 안 따르고 행정');
    ok(!data().tasks[idM].checks, '체크 없음(4틀 오염 없음)');
    eq(data().meta.lastArea, 'admin', '보드 탭 생성도 lastArea 를 갱신');

    // 전체 탭 그리기 · ok:false 제외
    A.store.update({ 'tasks/300101bot': { title: '봇 제안', status: 'todo', area: 'admin', priority: 1, createdBy: 'claude', ok: false, createdAt: 1, updatedAt: 1 } });
    A.render(); ok(!/300101bot/.test($('main').innerHTML), '보드 탭에 ok:false 없음');
    A.ui.view = 'all'; A.render(); ok(!/300101bot/.test($('main').innerHTML), '전체 탭에 ok:false 없음');
    ok(/대기<b>/.test($('main').innerHTML) && /완료<b>/.test($('main').innerHTML), '전체 탭 상태 그룹');
    ok(!new RegExp('data-id="' + id1 + '"').test($('main').innerHTML), '완료 그룹은 접혀 있음');
    A.ui.fold.done = false; A.render(); ok(new RegExp('data-id="' + id1 + '"').test($('main').innerHTML), '완료 펼침');
    A.ui.areaFilter = 'event'; A.render(); ok(new RegExp('data-id="' + idE + '"').test($('main').innerHTML), '영역 칩 필터: 행사 보임');
    ok(!new RegExp('data-id="' + idC + '"').test($('main').innerHTML) && !new RegExp('data-id="' + id1 + '"').test($('main').innerHTML), '영역 칩 필터: 교과 항목 안 보임');
    A.ui.areaFilter = null; A.store.update({ 'tasks/300101bot': null });
    A.ui.view = 'all'; A.render();

    // 타이핑 중 필터 — 전체 탭에서 제목으로 걸러 본다
    type('먼 마감 회의 @+40');
    const idFar = only();
    $('in').value = '먼 마감'; A.render();
    ok(new RegExp('data-id="' + idFar + '"').test($('main').innerHTML), '걸러 보면 그 항목이 보인다');
    ok(!new RegExp('data-id="' + idM + '"').test($('main').innerHTML), '안 맞는 항목은 안 보임');
    $('in').value = ''; A.render();
    ok(new RegExp('data-id="' + idM + '"').test($('main').innerHTML), '필터를 지우면 다시 보인다');

    // 표 칸에서 바로 고치기 (교사 지시 2026-09-09)
    const fakeInput = () => { const L = {}; const o = { value: '', addEventListener(t, f){ (L[t] = L[t] || []).push(f); },
      fire(t, ev){ (L[t] || []).forEach(f => f.call(o, ev || {})); }, focus(){} }; return o; };
    const fakeCell = (tid) => { const inp = fakeInput();
      return { innerHTML: '', firstChild: inp, _inp: inp,
               getBoundingClientRect(){ return { top: 0, bottom: 0, left: 0, right: 0 }; },
               closest(){ return { dataset: { id: tid } }; } }; };
    const pickIn = (v) => $('menu').fire('click', { target: { closest(){ return { dataset: { v: String(v) } }; } } });

    A.openMenu(fakeCell(idM), idM, 'status');
    ok(!$('menu').hidden, '상태 칸을 누르면 고르는 판이 열린다');
    ok(/data-v="doing"/.test($('menu').innerHTML) && /data-v="done"/.test($('menu').innerHTML), '판에 상태 4가지');
    pickIn('doing');
    eq(data().tasks[idM].status, 'doing', '판에서 고르면 상태가 바뀐다');
    ok($('menu').hidden, '고르면 판이 닫힌다');

    A.openMenu(fakeCell(idM), idM, 'area'); pickIn('class');
    eq(data().tasks[idM].area, 'class', '영역도 칸에서 바꾼다');
    A.openMenu(fakeCell(idM), idM, 'priority'); pickIn(1);
    eq(data().tasks[idM].priority, 1, '중요도는 숫자로 저장된다');

    const dc = fakeCell(idM); A.editDue(dc, idM);
    ok(/type="date"/.test(dc.innerHTML), '마감 칸은 날짜 입력칸이 된다');
    dc._inp.value = '2031-06-30'; dc._inp.fire('change');
    eq(data().tasks[idM].due, '2031-06-30', '마감 칸에서 고른 날짜가 저장된다');

    const cc = fakeCell(idM); A.editChecks(cc, idM);
    cc._inp.value = '결재'; cc._inp.fire('keydown', { key: 'Enter' });
    ok(A.ckList(data().tasks[idM]).some(c => c.text === '결재'), '체크 칸에서 엔터로 바로 추가');
    cc._inp.value = ''; cc._inp.fire('keydown', { key: 'Enter' });   // 빈 값
    eq(A.ckList(data().tasks[idM]).length, 1, '빈 값은 아무것도 안 만든다');

    // 시트
    A.ui.open = idC; A.renderSheet();
    const sh = $('sheet');
    ok(!sh.hidden, '시트 열림');
    ok(new RegExp('<span class="id">' + idC.slice(-3) + '</span>').test(sh.innerHTML), '시트에 id 뒤 3자');
    ok(/value="1-3 심화 세트"/.test(sh.innerHTML), '시트 제목');
    ok(/data-set="area" data-v="class" class="a-class on"/.test(sh.innerHTML), '영역 교과 켜짐');
    ok(/허브 카드/.test(sh.innerHTML), '체크 목록');
    ok(!/data-set="due"/.test(sh.innerHTML) && !/class="push"/.test(sh.innerHTML), '미루기 4단추는 폐지됐다(교사 지시 2026-09-09)');
    ok(typeof A.pushDates !== 'function', 'pushDates 함수도 남지 않았다');

    // 체크 토글 — log 는 done 한 줄
    const cid = A.ckList(data().tasks[idC])[0].id;
    const nLog = Object.keys(data().log).length;
    clock.now += 1000;
    sh.fire('click', { target: { closest: () => ({ dataset: { ck: cid } }) } });
    eq(data().tasks[idC].checks[cid].done, true, '체크 토글'); eq(data().tasks[idC].checks[cid].by, 'me', '체크 by me'); eq(data().tasks[idC].checks[cid].ts, clock.now, '체크 ts');
    eq(Object.keys(data().log).length - nLog, 1, '체크 토글 log 는 1건');
    eq(logsOf(idC).slice(-1)[0].field, 'checks/' + cid + '/done', '그 1건은 done');
    A.renderSheet();
    ok(/☑ 제작 ✓/.test(sh.innerHTML), '기록에 「☑ 제작 ✓」'); ok(!/checks\//.test(sh.innerHTML), '기록에 필드 경로 노출 없음');
    ok(/<details open>/.test(sh.innerHTML) || /<details>/.test(sh.innerHTML), '기록 details');
    sh.fire('click', { target: { closest: () => ({ dataset: { ck: cid } }) } });
    eq(data().tasks[idC].checks[cid].done, false, '체크 되돌림'); ok(data().tasks[idC].checks[cid].by == null, 'by 해제'); ok(data().tasks[idC].checks[cid].ts == null, 'ts 해제');
    // 체크 추가·삭제
    sh.fire('keydown', { key: 'Enter', target: { id: 'sh-ck', value: '동교과 검토' }, preventDefault(){} });
    eq(A.ckList(data().tasks[idC]).map(c => c.text).slice(-1), ['동교과 검토'], '시트에서 체크 추가'); eq(A.ckList(data().tasks[idC]).slice(-1)[0].order, 5, 'order = max+1');
    const cidLast = A.ckList(data().tasks[idC]).slice(-1)[0].id;
    sh.fire('click', { target: { closest: () => ({ dataset: { ckrm: cidLast } }) } });
    ok(!(cidLast in data().tasks[idC].checks), '체크 삭제');
    sh.fire('keydown', { key: 'Enter', target: { id: 'sh-ck', value: '다시' }, preventDefault(){} });
    eq(A.ckList(data().tasks[idC]).slice(-1)[0].order, 5, '삭제 뒤 추가해도 order 는 max+1(겹침 없음)');
    // 상태·마감 단추 · change
    sh.fire('click', { target: { closest: () => ({ dataset: { set: 'priority', v: '1' } }) } }); eq(data().tasks[idC].priority, 1, '중요도 단추');
    sh.fire('click', { target: { closest: () => ({ dataset: { set: 'due', v: '2031-07-01' } }) } }); eq(data().tasks[idC].due, '2031-07-01', '미루기 단추');
    sh.fire('click', { target: { closest: () => ({ dataset: { set: 'due', v: '' } }) } }); ok(!('due' in data().tasks[idC]), '없음 단추 → due 삭제');
    sh.fire('change', { target: { id: 'sh-title', value: '  1-3 심화 세트 v2 ' } }); eq(data().tasks[idC].title, '1-3 심화 세트 v2', '제목 인라인 편집');
    sh.fire('change', { target: { id: 'sh-title', value: '   ' } }); eq(data().tasks[idC].title, '1-3 심화 세트 v2', '빈 제목은 무시');
    sh.fire('change', { target: { id: 'sh-memo', value: '메모 본문' } }); eq(data().tasks[idC].memo, '메모 본문', '메모 저장');
    sh.fire('change', { target: { id: 'sh-memo', value: '' } }); ok(!('memo' in data().tasks[idC]), '빈 메모는 키 삭제');
    sh.fire('change', { target: { id: 'sh-ref', value: '작업노트/_재개지점.md#3' } }); eq(data().tasks[idC].ref, '작업노트/_재개지점.md#3', 'ref 저장');
    // 적는 중엔 다시 안 그림
    $('sh-memo').focus(); sh.contains = () => true; const before = sh.innerHTML; sh.innerHTML = 'DRAFT';
    A.renderSheet(); eq(sh.innerHTML, 'DRAFT', '메모 적는 중 알림이 와도 시트를 다시 그리지 않음');
    $('sh-memo').blur(); sh.contains = () => false; A.renderSheet(); ok(sh.innerHTML !== 'DRAFT' && sh.innerHTML.length > before.length / 2, '포커스 빠지면 다시 그림');
    // 버리기 → dropped
    sh.fire('click', { target: { closest: () => ({ dataset: { set: 'status', v: 'dropped' } }) } }); eq(data().tasks[idC].status, 'dropped', '버리기');
    A.render(); ok(!new RegExp('data-id="' + idC + '"').test($('main').innerHTML), '버린 항목은 오늘 화면에 없음');
    // 삭제 — 휴지통 없이 바로 지운다. 되돌리기 5초.
    clock.now += 1000;
    const nLogAll = Object.keys(data().log).length, nLogC = logsOf(idC).length;
    ok(/삭제</.test(sh.innerHTML) && !/휴지통/.test(sh.innerHTML) && !/되살리기/.test(sh.innerHTML), '시트 아래는 삭제 하나뿐');
    sh.fire('click', { target: { closest: () => ({ dataset: { act: 'del' } }) } });
    ok(!(idC in data().tasks), '★삭제하면 항목이 사라진다');
    eq(logsOf(idC).length, 0, '★그 항목의 기록도 함께 사라진다');
    eq(Object.keys(data().log).length, nLogAll - nLogC, '남의 기록은 안 건드린다');
    ok(sh.hidden, '삭제 뒤 시트 닫힘'); eq(A.ui.open, null, 'open 해제');
    ok(!/지움/.test($('toast').hidden ? '' : $('toast').innerHTML) === false, '지움 토스트');
    ok(!$('undo-btn').hidden, '되돌리기 단추가 켜져 있다');
    A.undoLast();
    ok(idC in data().tasks, '★되돌리면 항목이 돌아온다');
    eq(logsOf(idC).length, nLogC, '기록도 함께 돌아온다');
    eq(data().tasks[idC].title, '1-3 심화 세트 v2', '내용 그대로');
    A.ui.open = idC; A.renderSheet();
    sh.fire('click', { target: { closest: () => ({ dataset: { act: 'del' } }) } });
    ok(!(idC in data().tasks), '다시 삭제');
    A.ui.open = null; sh.hidden = true; A.ui.view = 'all';
    // 검토 요청 토글
    $('reqbtn').fire('click'); eq(data().meta.reviewReq, true, '검토 요청 켬');
    $('reqbtn').fire('click'); eq(data().meta.reviewReq, false, '검토 요청 끔');
    A.openSettings(); ok(/v\d{4}-\d{2}-\d{2}[a-z]/.test($('settings').innerHTML), '설정에 빌드 스탬프');
    ok(!/시험 기간/.test($('settings').innerHTML), '시험 기간 칸은 폐지됐다(쓰는 데가 없어졌다)');
    // MD
    const md = A.toMarkdown(data());
    ok(/## 열린 항목 \(\d+\)/.test(md) && /## 완료 항목 \(\d+\)/.test(md), 'MD 두 표');
    ok(/\| 감독 배정표 회신 \|/.test(md) === false && /새 이름/.test(md), 'MD 에 제목');
    ok(!/300101bot/.test(md), 'MD 에 ok:false 없음');
    // 14일 무변경 흐림
    const idS = type('방치 확인 @+1');
    A.render(); ok(new RegExp('data-id="' + idS + '"').test($('main').innerHTML), '새 항목이 목록에 있다'); ok(!/ stale/.test($('main').innerHTML), '지금은 흐림 없음');
    clock.now += 15 * 86400000; A.render(); ok(/ stale/.test($('main').innerHTML), '15일 뒤엔 흐림');
    clock.now -= 15 * 86400000;
    // 새 id 접미 3자 충돌 회피
    const idsNow = Object.keys(data().tasks);
    for (let i = 0; i < 25; i++) type('항목 ' + i + ' @+' + (i + 1));
    const ids2 = Object.keys(data().tasks);
    eq(ids2.length, idsNow.length + 25, '25개 추가');
    const sufs = ids2.map(k => k.slice(-3));
    eq(new Set(sufs).size, sufs.length, '살아 있는 항목의 뒤 3자가 전부 다름');
    // 다른 탭의 storage 이벤트
    const memNow = JSON.parse(A._mem.tm); memNow.tasks[id1].title = '다른 탭에서 바꿈'; A._mem.tm = JSON.stringify(memNow);
    let rendered = false; A.store.subscribe(() => { rendered = true; });
    A._wl.storage({ key: 'tm' }); eq(data().tasks[id1].title, '다른 탭에서 바꿈', 'storage 이벤트로 다시 읽음'); ok(rendered, '구독 알림');
    A._wl.storage({ key: 'other' }); eq(data().tasks[id1].title, '다른 탭에서 바꿈', '다른 키는 무시');

    // 새로고침(새 컨텍스트) 뒤 유지 — M1 완료 조건
    const B = makeApp(A._mem, clock);
    eq(Object.keys(B.store.load().tasks).length, ids2.length, '새로고침 뒤 항목 수 유지');
    eq(B.store.load().tasks[id1].title, '다른 탭에서 바꿈', '새로고침 뒤 내용 유지');
    eq(B.store.load().meta.lastArea, A.store.load().meta.lastArea, '새로고침 뒤 meta 유지');
    ok(Object.keys(B.store.load().log).length > 20, 'log 유지');
    ok(B._els.main.innerHTML.length > 0 && new RegExp('data-id="' + idS + '"').test(B._els.main.innerHTML), '새 컨텍스트가 같은 목록을 그린다');

    // 완료한 것 — 디데이 대신 완료한 날, 최근 완료가 위 (교사 지시 2026-09-09)
    A.ui.view = 'all'; A.ui.fold.done = false; A.ui.areaFilter = null; $('in').value = '';
    const dA = type('먼저 끝낸 일 @+3 !');     // 높음·가까운 마감 → cmpTask 로는 위
    A.editTask(dA, { status: 'done' }, false);
    clock.now += 60000;
    const dB = type('나중에 끝낸 일 @+9');      // 보통·먼 마감 → cmpTask 로는 아래
    A.editTask(dB, { status: 'done' }, false);
    A.render();
    const mh = $('main').innerHTML;
    ok(mh.indexOf('data-id="' + dB + '"') < mh.indexOf('data-id="' + dA + '"'), '가장 최근에 완료한 것이 위에 온다');
    const tB = data().tasks[dB], td = A.todayStr();
    ok(tB.doneAt > 0, '완료하면 doneAt 이 찍힌다');
    ok(/완료 /.test(A.metaDue(tB, td)) && !/D[+-]/.test(A.metaDue(tB, td)), '완료 항목엔 디데이가 없다');
    ok(/완료 /.test(A.dueCell(tB, td)) && /월/.test(A.dueCell(tB, td)), '마감일 칸 옆에 완료한 날');
    A.editTask(dB, { status: 'todo' }, false);
    ok(!data().tasks[dB].doneAt, '완료를 풀면 doneAt 이 사라진다(null 은 삭제다)');
    ok(/D[+-]|D-day/.test(A.metaDue(data().tasks[dB], td)), '되돌아오면 디데이가 다시 보인다');
  }
} catch (e) { fail++; console.log('  X FAIL: [15] 앱 실행이 예외로 멈췄다 — ' + (e && e.message)); }

sec('[16] 원격 모드 (tmSync 가 붙었을 때 — 스냅샷 캐시 · 로그아웃)');
try {
  const mkSync = (seed) => {
    const mem = Object.assign({}, seed || {});
    const C = { Math, JSON, Object, Array, String, Number, Date, console,
      localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } } };
    vm.createContext(C);
    vm.runInContext(STORE, C);
    const sent = [];
    C.tmSync = { write: m => sent.push(m) };     // 원격이 붙은 척
    return { C, mem, sent, store: C.store, hooks: C.tmHooks };
  };
  const S = mkSync();
  ok(S.hooks && typeof S.hooks.fromRemote === 'function' && typeof S.hooks.clearCache === 'function',
     'tmHooks 는 fromRemote·clearCache 를 준다');
  S.store.update({ 'tasks/a': { title: 't', memo: '5교시 후', status: 'todo' } });
  eq(S.sent.length, 1, 'update 가 원격에도 보낸다');
  eq(S.sent[0], { 'tasks/a': { title: 't', memo: '5교시 후', status: 'todo' } }, '보내는 것은 같은 필드 경로 map');
  eq(S.store.load().tasks.a.memo, '5교시 후', '메모리에는 memo 가 있다');
  ok(!('tm' in S.mem), '원격 모드에서는 옛 tm 키를 쓰지 않는다');
  const snap = JSON.parse(S.mem['tm.snap']);
  ok(typeof snap.ts === 'number' && snap.ts > 0, '스냅샷에 저장 시각이 있다');
  ok(!('memo' in snap.data.tasks.a), '★스냅샷에는 memo 를 넣지 않는다 (폰을 잃어버려도 내용은 안 남는다)');
  eq(snap.data.tasks.a.title, 't', '스냅샷에 나머지 필드는 있다');

  // 부팅 — 싱싱한 스냅샷은 읽고, 24시간 지난 것은 버린다
  const fresh = mkSync({ 'tm.snap': JSON.stringify({ ts: Date.now() - 3600 * 1000, data: { tasks: { z: { title: 'z' } } } }) });
  eq(fresh.store.load().tasks.z.title, 'z', '1시간 전 스냅샷은 읽는다');
  const stale = mkSync({ 'tm.snap': JSON.stringify({ ts: Date.now() - 25 * 3600 * 1000, data: { tasks: { z: { title: 'z' } } } }) });
  eq(stale.store.load().tasks, {}, '★24시간 지난 스냅샷은 안 읽는다');
  ok(!('tm.snap' in stale.mem), '지난 스냅샷은 지운다');
  const noTs = mkSync({ 'tm.snap': JSON.stringify({ data: { tasks: { z: {} } } }) });
  eq(noTs.store.load().tasks, {}, '시각 없는 스냅샷은 안 읽는다');

  // 원격 스냅샷 적용
  const R = mkSync();
  let calls = 0; R.store.subscribe(() => calls++);
  R.hooks.fromRemote({ tasks: { q: { title: 'q' } }, meta: { schema: 1, lastArea: 'event' } });
  eq(R.store.load().tasks.q.title, 'q', 'fromRemote 가 데이터를 갈아 끼운다');
  eq(R.store.load().meta.reviewReq, false, '빠진 meta 칸은 채워진다');
  eq(calls, 1, 'fromRemote 도 구독에 알린다');
  eq(R.sent.length, 0, 'fromRemote 는 원격으로 되쏘지 않는다');
  R.mem.tm = '{"tasks":{}}';   // M1 때 쓰던 키가 남아 있는 기기
  R.hooks.clearCache();
  ok(!('tm.snap' in R.mem), 'clearCache 가 스냅샷을 지운다');
  ok(!('tm' in R.mem), '★clearCache 는 M1 때의 tm 키까지 지운다 (로그아웃 뒤 남으면 안 된다)');

  // tmSync 가 없으면(M1·검사) 예전 그대로
  const L = mkSync(); L.C.tmSync = null;
  L.store.update({ 'tasks/b': { title: 'b', memo: 'm' } });
  ok('tm' in L.mem, 'tmSync 없으면 tm 키에 쓴다');
  eq(JSON.parse(L.mem.tm).tasks.b.memo, 'm', 'tmSync 없으면 memo 도 그대로 남는다');

  // SYNC 블록 규약 — firebase 없이 실행할 수 없으니 코드로 묻는다
  const SY = (src.match(/\/\*SYNC-START\*\/([\s\S]*?)\/\*SYNC-END\*\//) || [])[1] || '';
  ok(SY.length > 200, 'SYNC 블록이 있다');
  ok(/function signOut\(\)[^}]*tmHooks\.clearCache\(\)/.test(SY), '★로그아웃은 캐시를 지우고 나간다');
  ok(/setPersistence\([^)]*Persistence\.LOCAL/.test(SY), '로그인은 기기에 유지된다');
  ok(/\.info\/connected/.test(SY), '연결 상태를 본다');
  ok(/tmHooks\.fromRemote\(/.test(SY), '원격 값을 STORE 로 넘긴다');
  ok(!/signInWithPopup|createUserWithEmailAndPassword/.test(SY), '가입·팝업 로그인은 쓰지 않는다');
  ok(/T_UID/.test(src), 'T_UID 자리가 있다');
} catch (e) { fail++; console.log('  X FAIL: [16] 원격 모드가 예외로 멈췄다 — ' + (e && e.message)); }

sec('[17] 노션 화면 (표 머리 · 아이콘 · 태그 · 보드 · 캘린더)');
try {
  // PC 분기가 실제로 표를 만드는가 — 분기 조건만 바꿔도 걸리게
  const PC = pcBlocks(CSS).join('');
  ok(/\.thead,\.row\{display:grid/.test(PC), '★PC 분기가 표(grid)를 만든다');
  ok(/grid-template-columns:minmax\(/.test(PC), '표 열 너비가 정해져 있다');
  ok(/\.thead\{display:grid[^}]*position:sticky/.test(PC), '열 머리가 붙어 있다');
  ok(/nav\{display:none/.test(PC), 'PC 에서는 아래 탭을 감춘다');

  const clock2 = { now: Date.UTC(2031, 5, 15, 3, 0, 0) };
  const A2 = makeApp(null, clock2);
  const el = id => A2._els[id] || A2._doc.getElementById(id);
  const html = () => el('main').innerHTML;

  el('in').value = '감독 배정표 회신 @오늘 ! +NEIS 추출'; A2.submit();
  el('in').value = '위탁 설명회 @내일 #사'; A2.submit();
  el('in').value = '1-3 심화 세트 #교 ~ @모레'; A2.submit();   // 마감이 있어야 오늘 화면의 「이번 주」에 뜬다
  const ids = Object.keys(A2.store.load().tasks);
  eq(ids.length, 3, '세 항목');

  // 표 머리 여섯 칸
  ok(/class="thead"/.test(html()), '★표 머리를 그린다');
  ['업무', '상태', '마감일', '영역', '중요도', '체크포인트'].forEach(function(c){
    ok(new RegExp('<span>[^<]*' + c + '</span>').test(html()), '열 「' + c + '」');
  });

  // 상태·영역·중요도가 태그로
  ok(/class="stat s-todo"/.test(html()), '★상태를 태그로 그린다');
  ok(/class="tg orange">행정</.test(html()), '영역 행정 = 주황 태그');
  ok(/class="tg red">행사</.test(html()), '영역 행사 = 빨강 태그');
  ok(/class="tg blue">교과</.test(html()), '영역 교과 = 파랑 태그');
  ok(/class="tg red">높음</.test(html()), '중요도 높음 = 빨강 태그');
  ok(/class="tg gray">낮음</.test(html()), '중요도 낮음 = 회색 태그');
  ok(!/>보통</.test(html()), '보통은 태그를 안 붙인다(기본값이라 군더더기)');
  ok(/class="tg green[^"]*">NEIS 추출</.test(html()), '체크포인트도 태그로');

  // 아이콘
  const id1 = ids[0];
  A2.editTask(id1, { icon: '😤' }, false); A2.render();
  ok(/😤/.test(html()), '★아이콘을 그린다');
  ok(/class="emo">😤</.test(html()), '아이콘 자리는 .emo');
  A2.editTask(id1, { icon: null }, false); A2.render();
  ok(!/😤/.test(html()), '지우면 사라진다');

  // 보드
  A2.ui.view = 'board'; A2.render();
  ok(/class="board"/.test(html()) && /class="bcol"/.test(html()), '★보드는 칸으로');
  eq((html().match(/class="bcol"/g) || []).length, 4, '보드 칸 넷(대기·진행·완료·버림)');
  ok(/class="card/.test(html()), '보드는 카드로');
  ok(new RegExp('data-id="' + id1 + '"').test(html()), '보드에도 항목이 있다');

  // 검토는 붙박이 요소 — 본문 안에 있으면 눌러도 안 닿는다
  A2.ui.view = 'review'; A2.render();
  ok(el('review').hidden === false && el('main').hidden === true, '검토 보기는 붙박이 요소');
  ok(el('inbar').hidden === true, '검토 보기에선 입력창을 내린다');
  A2.ui.view = 'all'; A2.render();
  ok(el('review').hidden === true && el('main').hidden === false, '돌아오면 본문');
} catch (e) { fail++; console.log('  X FAIL: [17] 노션 화면이 예외로 멈췄다 — ' + (e && e.message)); }

sec('[18] 다크모드');
try {
  const dm = (CSS.match(/@media \(prefers-color-scheme:dark\)\{[\s\S]*?\n\} \}/) || [''])[0];
  const attr = (CSS.match(/:root\[data-theme="dark"\]\{[\s\S]*?\n\}/) || [''])[0];
  ok(dm.length > 300, '★시스템이 어두우면 따라간다');
  ok(attr.length > 300, '★설정으로 고른 어둡게가 시스템을 이긴다');
  ok(/:root:not\(\[data-theme="light"\]\)/.test(dm), '밝게를 고르면 시스템이 어두워도 밝게 남는다');
  // 밝을 때 정의한 토큰은 어두울 때도 전부 다시 잡아야 한다 — 하나라도 빠지면 그 색만 흰 바탕에 남는다
  const root = (CSS.match(/:root\{[\s\S]*?\n\}/) || [''])[0];
  const names = [...root.matchAll(/(--[a-z0-9-]+):/g)].map(m => m[1]).filter(n => !/^--(nav-h|row-h)$/.test(n));
  ok(names.length >= 25, '밝을 때 토큰 ' + names.length + '개');
  ['dm', 'attr'].forEach(function(which, i){
    const blk = i ? attr : dm;
    const miss = names.filter(n => !new RegExp(n.replace(/-/g, '\\-') + ':').test(blk));
    eq(miss, [], '★어두울 때 안 잡힌 토큰 없음 (' + (i ? '[data-theme]' : 'prefers-color-scheme') + ')');
  });
  for (const c of ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red']) {
    ok(new RegExp('--t-' + c + '-b:#').test(dm), '어두울 때 태그색 ' + c);
  }
  // 색을 토큰 밖에서 박아 쓰면 어두울 때 그 자리만 하얗게 남는다
  const outside = CSS.replace(root, '').replace(dm, '').replace(attr, '');
  eq([...outside.matchAll(/background:\s*(#fff\b|#ffffff\b|white\b)/gi)].map(m => m[0]), [], '★토큰 밖에서 흰 배경을 박아 쓰지 않는다');
  ok(/meta name="theme-color"/.test(src), '브라우저 위 띠 색도 바꾼다');

  // 저장 · 적용
  const A3 = makeApp(null, { now: Date.UTC(2031, 5, 15, 3, 0, 0) });
  const html3 = A3._doc.documentElement;
  eq(A3.tmTheme.get(), 'system', '처음은 시스템 따라가기');
  eq(html3.getAttribute('data-theme'), null, '시스템이면 표시를 안 붙인다');
  A3.tmTheme.set('dark'); A3.applyTheme('dark');
  eq(html3.getAttribute('data-theme'), 'dark', '어둡게를 고르면 표시가 붙는다');
  eq(A3.tmTheme.get(), 'dark', '기기에 남는다');
  A3.tmHooks.clearCache();
  eq(A3.tmTheme.get(), 'dark', '★로그아웃해도 테마는 남는다(자료가 아니라 기기 취향이다)');
  A3.tmTheme.set('system'); A3.applyTheme('system');
  eq(html3.getAttribute('data-theme'), null, '시스템으로 돌리면 표시를 뗀다');
  ok(!('tm.theme' in A3._mem), '시스템일 때는 저장하지 않는다');
  A3.openSettings();
  ok(/data-theme="dark"/.test(A3._els.settings.innerHTML), '설정에 어둡게 단추');
  ok(/data-theme="light"/.test(A3._els.settings.innerHTML) && /data-theme="system"/.test(A3._els.settings.innerHTML), '밝게·시스템 단추도');

  // 토큰만 치면 항목이 안 생긴다
  const A4 = makeApp(null, { now: Date.UTC(2031, 5, 15, 3, 0, 0) });
  A4._els.in.value = '#교 !'; A4.submit();
  eq(Object.keys(A4.store.load().tasks).length, 0, '★토큰만 치면 항목이 안 생긴다');
  ok(/제목/.test(A4._els.toast.innerHTML), '왜 안 생겼는지 알려 준다');
  A4._els.in.value = '@오늘'; A4.submit();
  eq(Object.keys(A4.store.load().tasks).length, 0, '날짜만 쳐도 마찬가지');
  A4._els.in.value = '회의 자료 @오늘'; A4.submit();
  eq(Object.keys(A4.store.load().tasks).length, 1, '제목이 있으면 만든다');
} catch (e) { fail++; console.log('  X FAIL: [18] 다크모드가 예외로 멈췄다 — ' + (e && e.message)); }

// ══ [19] 화면 정리 · 표에서 바로 고치기 (2026-09-09 교사 지시) ══
sec('[19] 화면 정리 · 표에서 바로 고치기');
{
  ok(!/data-view="today"/.test(src) && !/data-view="cal"/.test(src), '오늘·캘린더 보기는 없다');
  eq((src.match(/data-view="/g) || []).length, 6, '보기 단추 3종 × 2곳(위 탭 · 폰 아래 탭)');
  ok(/data-view="all" class="on"/.test(src), '첫 화면은 전체');
  ok(!/id="tokchips"/.test(src) && !/data-tok=/.test(src), '입력창 아래 토큰 칩 줄 없음');
  ok(!/id="pick"/.test(src), '숨은 날짜 고르개도 없음');
  for (const f of ['viewToday', 'viewCal', 'groupToday', 'pushDates', 'chipFade', 'insertToken'])
    ok(!new RegExp('function ' + f + '\\b').test(src), '죽은 함수 ' + f + ' 없음');
  for (const f of ['status', 'due', 'area', 'priority', 'checks'])
    ok(new RegExp('data-edit="' + f + '"').test(APP), '표 칸 data-edit=' + f);
  ok(/id="menu"/.test(src), '고르는 판 자리');
  ok(/\.menu\{[^}]*position:fixed/.test(CSS), '고르는 판은 화면에 고정');
  ok(/\.sheet-body,\.modal-body\{[^}]*max-width:760px/.test(CSS), '시트 폭 760px');
  ok(/\.modal-body\{max-width:560px\}/.test(CSS), '설정 창은 560px 그대로');
  ok(!/\.push\{/.test(CSS), '미루기 CSS 없음');
  for (const [sel, v] of [['s-doing', 't-blue'], ['s-done', 't-green'], ['a-admin', 't-orange'],
                          ['a-event', 't-red'], ['a-class', 't-blue'], ['p-1', 't-red'], ['p-2', 't-yellow']])
    ok(new RegExp('\\.seg button\\.on\\.' + sel + '\\{background:var\\(--' + v + '-b\\)').test(CSS), '시트에서 고른 ' + sel + ' 은 태그 색');
  ok(!/\.seg button\.on\{background:var\(--ink\)/.test(CSS), '고른 것이 회색 먹빛으로 덮이지 않는다');
  // ★목록에서 id 를 감춘다 — 「정체불명의 숫자와 영문자」(교사 지시 2026-09-09). 시트에는 남긴다(>id 수정에 쓴다)
  ok(!/'<span class="id">' \+ short\(t\.id\)/.test(APP), '목록 행에 id 를 그리지 않는다');
  ok(/short\(ui\.open\)/.test(APP), '시트에는 id 가 남는다');
  // 완료한 것
  ok(/function sortDone/.test(APP) && (APP.match(/if \(g\[0\] === 'done'\) sortDone\(items\);/g) || []).length === 2,
     '전체·보드 두 곳 모두 완료는 완료일 내림차순');
  ok(/function doneKo/.test(APP) && /완료 ' \+ dueKo\(ymdOf\(t\.doneAt\)\)/.test(APP), '완료한 날을 M월 D일로');
  // 폰 meta 줄의 네 칸도 각각 누르는 자리여야 한다 (PC 칸이 있다고 통과하면 안 된다)
  for (const c of ['m-area', 'm-pri', 'm-due', 'm-ck'])
    ok(new RegExp('class="' + c + '[^"]*" data-edit=').test(APP), '폰 meta 의 ' + c + ' 도 눌러 고친다');
  // PC 는 이것들을 감춘다 — 앵커에 .meta 가 빠지면 특정도가 낮아 안 지워진다(실측으로 잡았다)
  for (const c of ['m-area', 'm-pri', 'ph'])
    ok(new RegExp('\.row \.meta \.' + c + '(?![\w-])').test(CSS), 'PC 숨김은 .row .meta .' + c + ' 앵커로');

  // ★설정 ✕ 가 안 먹던 버그 — <html data-theme="dark"> 때문에 앵커 없는 closest 가 그쪽으로 샜다
  ok(/closest\('button\[data-theme\]'\)/.test(APP), '테마 단추는 button[data-theme] 로 찾는다');
  ok(!/closest\('\[data-theme\]'\)/.test(APP), '앵커 없는 [data-theme] 는 <html> 까지 올라가므로 쓰지 않는다');
}

console.log('결과: ' + pass + ' 통과, ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
