/* 교과 출결 — 연강(2교시 연속) 회귀 검사
 *
 *   node "교사업무/attendance-test/_test_연강.js"
 *
 * index.html 의 <script> 블록을 통째로 떼어 내 forgiving DOM 위에서 돌린 뒤,
 * 교과 출결의 기록 모델과 화면 문구를 단언한다.
 *
 * ★이 검사가 지키는 것 — 데이터 꼴을 바꾸는 작업이라 눈 확인만으로는 부족하다.
 *   ① 이미 쌓인 옛 기록(배열꼴)이 그대로 보존되는가
 *   ② 연강인 날만 객체꼴이 되는가
 *   ③ 접근자가 사본을 주는가 (돌려받은 배열을 고쳐도 저장분이 안 상한다)
 *   ④ 두 교시를 가로지르는 작업(학생 삭제·해제·가져오기)이 양쪽을 다 훑는가
 *
 * 변이 확인법은 파일 맨 아래 주석에.
 */
'use strict';
const path = require('path');

const HTML = path.join(__dirname, 'index.html');

/* ── 단언 ──────────────────────────────────────────────────────── */
let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) { pass++; return; }
  fail++; fails.push(msg);
}
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) { pass++; return; }
  fail++; fails.push(`${msg}\n       기대: ${b}\n       실제: ${a}`);
}
function section(t) { console.log('\n' + t); }

const { loadApp } = require('./_하네스.js');

/* ── 앱 적재 ───────────────────────────────────────────────────── */
let ctx, T;
try {
  ({ ctx, T } = loadApp(HTML));
} catch (e) {
  console.error('앱 스크립트 실행 실패:', e.message);
  process.exit(1);
}

const {
  subjDayRec, subjSaveDayRec, subjDayCount, subjDayHas,
  toggleSubjAbsent, toggleSubjDouble, setSubjPeriod, copyP1ToP2,
  deleteSubjStudent, renderSubjStudents, renderSubjClassList,
  renderSubjSummary, copySummaryDate, _showSubjConfirm, _okSubjConfirm,
} = ctx;

/* 확인 대화상자 문구를 가로챈다 */
let lastConfirmMsg = null;
ctx._showSubjConfirm = (msg, cb) => { lastConfirmMsg = msg; ctx.__pendingConfirm = cb; };
const acceptConfirm = () => { const cb = ctx.__pendingConfirm; ctx.__pendingConfirm = null; if (cb) cb(); };
let lastToast = null;
ctx.showToast = msg => { lastToast = msg; };
let copied = null;
ctx.navigator.clipboard = { writeText: t => { copied = t; return Promise.resolve(); } };

/* ── 고정물 ────────────────────────────────────────────────────── */
const CLS = 'cls_test';
const D1  = '2026-09-14';   // 옛 기록 (단일 교시)
const D2  = '2026-09-16';   // 연강을 걸 날
function reset() {
  T.subjData = {
    classes: [{ id: CLS, name: '과학사 3학년 3-과학사B', students: {
      '3-1-3': '가나다', '3-1-4': '라마바', '3-1-7': '사아자', '3-2-1': '차카타', '3-2-5': '파하가',
    }}],
    records: { [CLS]: { [D1]: ['3-1-4', '3-1-7'] } },   // ← 옛 꼴 그대로
  };
  T.subjDate = D2; T.subjClassId = CLS; T.subjPeriod = 1; T.subjEditMode = false;
  lastConfirmMsg = null; lastToast = null; copied = null;
}
const raw = d => T.subjData.records[CLS][d];

console.log('교과 출결 — 연강 회귀 검사');
console.log('대상:', HTML);

/* ═══ [1] 빌드 스위치 ═══════════════════════════════════════════ */
section('[1] 테스트 빌드 스위치 — 라이브 데이터와 갈라져 있는가');
ok(T.TEST_BUILD === true,  '테스트본은 TEST_BUILD 가 true 여야 한다');
eq(T.SUBJ_KEY,    'subject_att_v1_test',   '교과 저장소 키가 라이브와 갈라져야 한다');
eq(T.STORAGE_KEY, 'attendance_app_v1_test', '담임 저장소 키도 갈라져야 한다');

/* ═══ [2] 옛 기록 보존 ══════════════════════════════════════════ */
section('[2] 옛 기록 — 배열꼴은 배열꼴 그대로 남는다');
reset();
eq(subjDayRec(CLS, D1), { dbl: 0, p1: ['3-1-4', '3-1-7'], p2: [] }, '옛 배열꼴을 읽으면 dbl:0 · p1 에 담긴다');
eq(subjDayRec(CLS, '2026-01-01'), { dbl: 0, p1: [], p2: [] }, '기록 없는 날은 빈 것');
ok(Array.isArray(raw(D1)), '읽기만 해서는 저장분 꼴이 안 바뀐다');

// 단일 교시로 다시 저장해도 배열꼴
const d1 = subjDayRec(CLS, D1);
d1.p1.push('3-2-1');
subjSaveDayRec(CLS, D1, d1);
ok(Array.isArray(raw(D1)), '단일 교시 저장은 배열꼴로 남는다 (옛 앱이 읽을 수 있어야 한다)');
eq(raw(D1), ['3-1-4', '3-1-7', '3-2-1'], '단일 교시 저장 내용');

// 접근자는 사본을 준다
const snap = subjDayRec(CLS, D1);
snap.p1.push('침입');
eq(raw(D1), ['3-1-4', '3-1-7', '3-2-1'], '돌려받은 배열을 고쳐도 저장분은 안 상한다');

// 저장할 때도 사본을 떠야 한다 — 넘긴 객체를 뒤에 고쳐도 저장분은 그대로
const handed = { dbl: 1, p1: ['3-1-3'], p2: ['3-2-1'] };
subjSaveDayRec(CLS, D2, handed);
handed.p1.push('침입1'); handed.p2.push('침입2');
eq(raw(D2), { dbl: 1, p1: ['3-1-3'], p2: ['3-2-1'] }, '저장 뒤 넘긴 객체를 고쳐도 저장분은 안 상한다');
delete T.subjData.records[CLS][D2];

// 다 지우면 그 날짜는 사라진다
subjSaveDayRec(CLS, D1, { dbl: 0, p1: [], p2: [] });
ok(!(D1 in T.subjData.records[CLS]), '단일 교시에서 결과가 0이면 날짜를 지운다');

/* ═══ [3] 연강 켜기 ═════════════════════════════════════════════ */
section('[3] 연강 — 켜면 객체꼴, 두 교시가 따로 간다');
reset();
toggleSubjDouble(true);
ok(!Array.isArray(raw(D2)), '연강인 날은 객체꼴이 된다');
eq(raw(D2), { dbl: 1, p1: [], p2: [] }, '두 교시가 다 비어도 연강 표시가 남는다');
ok(subjDayHas(subjDayRec(CLS, D2)) === false, '결과가 없으면 subjDayHas 는 거짓');
eq(T.subjPeriod, 1, '연강을 켜면 앞교시부터 시작한다');

// 앞교시 2명
toggleSubjAbsent('3-1-3');
toggleSubjAbsent('3-1-4');
eq(subjDayRec(CLS, D2).p1, ['3-1-3', '3-1-4'], '앞교시에 2명');
eq(subjDayRec(CLS, D2).p2, [], '뒷교시는 아직 비어 있다');

// 뒷교시 3명 — 앞교시와 겹치지 않는 학생을 섞는다
setSubjPeriod(2);
eq(T.subjPeriod, 2, '뒷교시로 전환된다');
toggleSubjAbsent('3-1-4');   // 앞·뒤 둘 다 빠진 학생
toggleSubjAbsent('3-2-1');   // 뒷교시에만 빠진 학생
toggleSubjAbsent('3-2-5');
eq(subjDayRec(CLS, D2).p1, ['3-1-3', '3-1-4'], '뒷교시를 찍어도 앞교시는 그대로');
eq(subjDayRec(CLS, D2).p2, ['3-1-4', '3-2-1', '3-2-5'], '뒷교시에 3명');
eq(subjDayCount(subjDayRec(CLS, D2)), 5, '연강 건수는 두 교시의 합 (2+3)');
eq(subjDayCount(subjDayRec(CLS, D1)), 2, '단일 교시 건수는 p1 만');

// 앞교시로 돌아가 하나 풀어도 뒷교시 그대로
setSubjPeriod(1);
toggleSubjAbsent('3-1-3');
eq(subjDayRec(CLS, D2).p1, ['3-1-4'], '앞교시에서 풀린다');
eq(subjDayRec(CLS, D2).p2, ['3-1-4', '3-2-1', '3-2-5'], '앞교시를 풀어도 뒷교시는 안 건드린다');

/* ═══ [4] 연강 끄기 ═════════════════════════════════════════════ */
section('[4] 연강 해제 — 뒷교시가 있으면 먼저 묻는다');
reset();
toggleSubjDouble(true);
toggleSubjAbsent('3-1-3');
setSubjPeriod(2); toggleSubjAbsent('3-2-1'); toggleSubjAbsent('3-2-5');

toggleSubjDouble(false);
ok(lastConfirmMsg !== null, '뒷교시에 기록이 있으면 확인을 묻는다');
ok(/뒷교시 결과 2건/.test(lastConfirmMsg || ''), '묻는 말에 지워질 건수가 들어간다');
ok(/하시겠습니까\?$/.test(lastConfirmMsg || ''), '교사 확인 대화상자는 ~하시겠습니까? 로 끝난다');
ok(!Array.isArray(raw(D2)), '아직 확인 전이라 연강이 유지된다');
eq(ctx.document.getElementById('subj-dbl-check').checked, true, '묻는 동안 체크박스는 켜진 채로 둔다');

acceptConfirm();
ok(Array.isArray(raw(D2)), '해제하면 배열꼴로 되돌아간다');
eq(raw(D2), ['3-1-3'], '앞교시는 남고 뒷교시는 지워진다');
eq(T.subjPeriod, 1, '해제 뒤에는 앞교시');

// 뒷교시가 비어 있으면 묻지 않는다
reset();
toggleSubjDouble(true);
toggleSubjAbsent('3-1-3');
lastConfirmMsg = null;
toggleSubjDouble(false);
eq(lastConfirmMsg, null, '뒷교시가 비어 있으면 묻지 않는다');
eq(raw(D2), ['3-1-3'], '바로 단일 교시로 내려온다');

// 두 교시 다 비었는데 해제하면 날짜가 사라진다
reset();
toggleSubjDouble(true);
toggleSubjDouble(false);
ok(!(D2 in T.subjData.records[CLS]), '연강만 켰다 껐으면 기록이 안 남는다');

/* ═══ [5] 앞교시 가져오기 ═══════════════════════════════════════ */
section('[5] 앞교시 그대로 가져오기');
reset();
toggleSubjDouble(true);
toggleSubjAbsent('3-1-3'); toggleSubjAbsent('3-1-4');
setSubjPeriod(2);
copyP1ToP2();
eq(subjDayRec(CLS, D2).p2, ['3-1-3', '3-1-4'], '앞교시가 뒷교시로 복사된다');
ok(/2명/.test(lastToast || ''), '몇 명을 가져왔는지 알린다');

// 복사 뒤 두 교시는 서로 독립이어야 한다 (같은 배열을 공유하면 안 된다)
toggleSubjAbsent('3-1-3');
eq(subjDayRec(CLS, D2).p1, ['3-1-3', '3-1-4'], '뒷교시를 고쳐도 앞교시는 그대로');
eq(subjDayRec(CLS, D2).p2, ['3-1-4'],           '뒷교시만 바뀐다');

// 뒷교시에 이미 있으면 덮어쓸지 묻는다
lastConfirmMsg = null;
copyP1ToP2();
ok(/덮어쓰시겠습니까\?$/.test(lastConfirmMsg || ''), '뒷교시에 기록이 있으면 덮어쓸지 묻는다');
acceptConfirm();
eq(subjDayRec(CLS, D2).p2, ['3-1-3', '3-1-4'], '덮어쓰면 앞교시와 같아진다');

// 앞교시가 비면 아무 일도 없다
reset();
toggleSubjDouble(true);
setSubjPeriod(2);
copyP1ToP2();
eq(subjDayRec(CLS, D2).p2, [], '앞교시가 비면 가져올 것이 없다');

/* ═══ [6] 학생 삭제 ═════════════════════════════════════════════ */
section('[6] 학생 삭제 — 두 교시 모두에서 빠진다');
reset();
toggleSubjDouble(true);
toggleSubjAbsent('3-1-4'); toggleSubjAbsent('3-1-3');
setSubjPeriod(2); toggleSubjAbsent('3-1-4'); toggleSubjAbsent('3-2-1');
// 옛 단일 교시 날짜(D1)에도 3-1-4 가 들어 있다
eq(raw(D1), ['3-1-4', '3-1-7'], '준비 — 옛 날짜에도 그 학생이 있다');

deleteSubjStudent('3-1-4');
acceptConfirm();
ok(!('3-1-4' in T.subjData.classes[0].students), '명단에서 빠진다');
eq(subjDayRec(CLS, D2).p1, ['3-1-3'], '연강 앞교시에서 빠진다');
eq(subjDayRec(CLS, D2).p2, ['3-2-1'], '연강 뒷교시에서도 빠진다');
eq(raw(D1), ['3-1-7'], '옛 단일 교시 날짜에서도 빠진다');
ok(Array.isArray(raw(D1)), '옛 날짜는 배열꼴을 유지한다');

// 연강인 날은 결과가 0이 되어도 연강 표시가 남는다
reset();
toggleSubjDouble(true);
toggleSubjAbsent('3-1-4');
deleteSubjStudent('3-1-4');
acceptConfirm();
eq(raw(D2), { dbl: 1, p1: [], p2: [] }, '연강인 날은 비어도 연강 표시가 남는다');

/* ═══ [7] 화면 문구 ═════════════════════════════════════════════ */
section('[7] 화면 문구 — 요약·배지');
reset();
renderSubjStudents();
const sumEl = ctx.document.getElementById('subj-cls-absent-summary');
ok(/총 5명/.test(sumEl.textContent), '단일 교시 요약에 총원이 나온다');
ok(!/앞교시/.test(sumEl.textContent), '연강이 아니면 교시 이름을 붙이지 않는다');
eq(ctx.document.getElementById('subj-period-seg').style.display, 'none', '연강이 아니면 전환 단추를 숨긴다');

toggleSubjDouble(true);
toggleSubjAbsent('3-1-3'); toggleSubjAbsent('3-1-4');
setSubjPeriod(2); toggleSubjAbsent('3-2-1');
setSubjPeriod(1);
eq(ctx.document.getElementById('subj-period-seg').style.display, 'flex', '연강이면 전환 단추를 보인다');
ok(/앞교시 결과 2명 \/ 총 5명/.test(sumEl.textContent), '앞교시 요약: ' + sumEl.textContent);
eq(ctx.document.getElementById('pbtn-1').textContent, '앞교시 2', '전환 단추에 앞교시 건수가 붙는다');
eq(ctx.document.getElementById('pbtn-2').textContent, '뒷교시 1', '전환 단추에 뒷교시 건수가 붙는다');
eq(ctx.document.getElementById('subj-copy-p1').style.display, 'none', '앞교시일 때는 가져오기 단추를 숨긴다');
setSubjPeriod(2);
eq(ctx.document.getElementById('subj-copy-p1').style.display, 'block', '뒷교시일 때만 가져오기 단추를 보인다');
ok(/뒷교시 결과 1명/.test(sumEl.textContent), '뒷교시 요약: ' + sumEl.textContent);

renderSubjClassList();
const listHtml = ctx.document.getElementById('subj-class-list').innerHTML;
ok(/결과 앞2·뒤1/.test(listHtml), '반 카드 배지가 앞·뒤를 따로 보인다');

/* ═══ [8] 출결 현황 · 복사 ══════════════════════════════════════ */
section('[8] 출결 현황 · 복사 텍스트');
renderSubjSummary();
const sumHtml = ctx.document.getElementById('subj-summary-content').innerHTML;
ok(/결과 앞2·뒤1/.test(sumHtml), '현황 날짜 배지가 앞·뒤를 따로 보인다');
ok(/snc-per/.test(sumHtml), '연강 칩에 교시 표가 붙는다');
ok(/snc-per p2/.test(sumHtml), '뒷교시 칩은 색이 다르다');
ok(/누적 결과 5건/.test(sumHtml), '반 누적은 옛 날짜 2건 + 연강 3건 = 5건: ' + (sumHtml.match(/누적 결과 \d+건/) || [])[0]);
ok(/2일/.test(sumHtml), '기록이 있는 날은 2일');

copySummaryDate(CLS, D2);
ok(/연강/.test(copied || ''), '연강 복사 텍스트에 연강임이 드러난다');
ok(/앞교시 결과 — 1반 3번 가나다, 1반 4번 라마바/.test(copied || ''), '앞교시 줄: ' + copied);
ok(/뒷교시 결과 — 2반 1번 차카타/.test(copied || ''), '뒷교시 줄');

copySummaryDate(CLS, D1);
ok(!/연강/.test(copied || ''), '단일 교시 복사 텍스트는 예전 그대로');
ok(/결과 — 1반 4번 라마바, 1반 7번 사아자/.test(copied || ''), '단일 교시 줄: ' + copied);

// 한쪽 교시만 비었을 때
reset();
toggleSubjDouble(true);
toggleSubjAbsent('3-1-3');
copySummaryDate(CLS, D2);
ok(/뒷교시 결과 — 없음/.test(copied || ''), '빈 교시는 「없음」으로 적는다: ' + copied);

/* ═══ [9] 옛 기록만 있는 반 — 연강을 안 쓰면 아무것도 안 바뀐다 ═ */
section('[9] 연강을 안 쓰는 반은 예전과 한 글자도 다르지 않다');
reset();
const before = JSON.stringify(T.subjData.records);
T.subjDate = D1;
renderSubjStudents(); renderSubjClassList(); renderSubjSummary();
eq(JSON.stringify(T.subjData.records), before, '보기만 해서는 기록이 안 바뀐다');
toggleSubjAbsent('3-1-3');
ok(Array.isArray(raw(D1)), '연강을 안 켜면 계속 배열꼴');
eq(raw(D1), ['3-1-4', '3-1-7', '3-1-3'], '단일 교시 체크는 예전과 같이 동작한다');

/* ── 결과 ──────────────────────────────────────────────────────── */
console.log('\n' + '─'.repeat(52));
if (fail) {
  console.log(`✗ ${fail}건 실패 / ${pass + fail}단언`);
  fails.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
}
console.log(`✓ ${pass}단언 모두 통과`);

/* ── 변이 확인 (검사가 실제로 무는지) ───────────────────────────
 * index.html 을 아래처럼 한 군데씩 일부러 망가뜨리고 이 검사를 다시 돌린다.
 * 하나라도 통과해 버리면 그 자리를 무는 단언이 없다는 뜻이다.
 *
 *  ① subjSaveDayRec 에서  else if (r.p1.length) rec[date] = [...r.p1];
 *       → rec[date] = { dbl:0, p1:[...r.p1], p2:[] };     ⇒ [2] 배열꼴 보존이 깨져야 한다
 *  ② subjDayRec 의 [...v] 를 v 로            (사본 안 주기) ⇒ [2] 저장분 오염이 걸려야 한다
 *  ③ deleteSubjStudent 에서 d.p2 = ... 줄 삭제             ⇒ [6] 뒷교시 삭제가 걸려야 한다
 *  ④ subjSaveDayRec 이 사본을 안 뜬다 (p1:r.p1, p2:r.p2)   ⇒ [2] 저장분 오염이 걸려야 한다
 *  ⑤ 단일 교시로 내려올 때 뒷교시가 섞여 든다
 *       rec[date] = [...r.p1]  →  [...r.p1, ...r.p2]        ⇒ [4] 해제 결과가 걸려야 한다
 *
 * ★ copyP1ToP2 의 [...day.p1] 이나 toggleSubjDouble 쪽을 망가뜨려도 검사는 통과한다 —
 *   구멍이 아니라 subjSaveDayRec 이 한 겹 아래서 이미 막고 있기 때문이다.
 *   꼴을 정하는 곳을 접근자 한 곳으로 모아 둔 결과다.
 *  ⑥ subjDayCount 를 항상 r.p1.length 로                   ⇒ [3]·[8] 누적 건수가 걸려야 한다
 */
