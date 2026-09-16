/* 출결 앱 — 라이브본 ↔ 승격본 대조 검사
 *
 *   node "교사업무/attendance-test/_test_라이브대조.js"
 *
 * 묻는 것: 「연강을 쓰지 않는 한, 새 빌드는 라이브와 한 글자도 다르게 굴지 않는가」
 *
 * 라이브본(attendance-checklist_mobile/index.html)과
 * 승격본(이 폴더의 index.html 에서 TEST_BUILD=false 로 끈 것)을 각각 띄우고,
 * **똑같은 조작**을 똑같은 순서로 먹인 뒤 매 걸음마다
 *   · localStorage 전체 (= 저장되는 데이터)
 *   · 화면에 그려진 HTML/문구
 * 가 서로 같은지 견준다. 담임 출결과 교과 출결을 다 훑는다.
 *
 * ★연강을 켜는 조작은 여기 없다 — 그건 라이브에 없는 기능이라 다를 수밖에 없고,
 *   그 쪽은 _test_연강.js 가 맡는다.
 */
'use strict';
const path = require('path');
const { loadApp, serialize } = require('./_하네스.js');

const LIVE = path.join(__dirname, '..', '..', 'attendance-checklist_mobile', 'index.html');
const NEXT = path.join(__dirname, 'index.html');
const NOW  = new Date(2026, 8, 16, 9, 30).getTime();   // 2026-09-16 09:30 고정

let pass = 0, fail = 0;
const fails = [];
function same(label, a, b) {
  const sa = typeof a === 'string' ? a : JSON.stringify(a);
  const sb = typeof b === 'string' ? b : JSON.stringify(b);
  if (sa === sb) { pass++; return; }
  fail++;
  // 어디서 갈리는지 앞뒤 60자만
  let i = 0; while (i < sa.length && sa[i] === sb[i]) i++;
  fails.push(`${label}\n       라이브: …${sa.slice(Math.max(0, i - 40), i + 60)}…\n       승격본: …${sb.slice(Math.max(0, i - 40), i + 60)}…`);
}

/* ── 두 빌드 적재 ──────────────────────────────────────────────── */
const A = loadApp(LIVE, { fixedNow: NOW });                      // 라이브
const B = loadApp(NEXT, { fixedNow: NOW, testBuild: false });    // 승격본 (스위치 끈 것)

if (B.T.TEST_BUILD !== false) { console.error('승격본 스위치가 안 꺼졌다'); process.exit(1); }
same('저장소 키 — 담임', A.T.STORAGE_KEY, B.T.STORAGE_KEY);
same('저장소 키 — 교과', A.T.SUBJ_KEY,    B.T.SUBJ_KEY);

// 두 빌드 다 확인창은 자동 승인, 토스트·클립보드는 가로챈다
for (const app of [A, B]) {
  app.ctx._showSubjConfirm = (msg, cb) => { app.lastConfirm = msg; cb && cb(); };
  app.ctx.showToast = msg => { app.lastToast = msg; };
  app.ctx.navigator.clipboard = { writeText: t => { app.copied = t; return Promise.resolve(); } };
  app.ctx.showWarningModal = (t, b) => { app.lastWarn = t + '|' + b; };
}

/* ── 걸음마다 찍는 사진 ────────────────────────────────────────── */
const WATCH = [
  // 담임
  'student-list', 'sum-absent', 'sum-late', 'sum-early', 'sum-class', 'date-main', 'date-sub',
  'stats-list', 'stats-note', 'dl-list', 'dl-badge', 'rec-week-content', 'rec-week-label',
  'rec-month-content', 'month-label',
  // 교과
  'subj-class-list', 'subj-cls-count', 'subj-student-grid', 'subj-cls-absent-summary',
  'subj-cls-title', 'subj-summary-content', 'subj-hd-date', 'subj-date-main', 'subj-cls-date-main',
];
function snap(app) {
  const s = {};
  for (const id of WATCH) {
    const el = app.ctx._els.get(id);
    if (el) s[id] = serialize(el);
  }
  const store = {};
  for (const [k, v] of app.ctx._store) store[k] = v;
  return { store, s, toast: app.lastToast || '', copied: app.copied || '', confirm: app.lastConfirm || '', warn: app.lastWarn || '' };
}
let lastSnap = null;
function step(label, fn) {
  fn(A); fn(B);
  const a = snap(A), b = snap(B);
  same(`[${label}] 저장소`, a.store, b.store);
  same(`[${label}] 화면`,   a.s,     b.s);
  same(`[${label}] 알림`,   [a.toast, a.copied, a.confirm, a.warn], [b.toast, b.copied, b.confirm, b.warn]);
  lastSnap = a;
}
// 빈 것끼리 같다고 통과하는 걸 막는다 — 사진에 실제 내용이 담겨야 한다
function nonEmpty(label, id, needle) {
  const el = lastSnap && lastSnap.s[id];
  const txt = el ? JSON.stringify(el) : '';            // 자식까지 통째로 (textContent 에 숫자를 넣는 곳도 있다)
  if (txt && (!needle || txt.includes(needle))) { pass++; return; }
  fail++; fails.push(`[실질] ${label} — #${id} 가 비었거나 「${needle}」이 없다: ${txt.slice(0, 80)}`);
}

/* ── 고정 명단 (가명) ─────────────────────────────────────────── */
const SEED_SUBJ = {
  classes: [
    { id: 'cls_a', name: '과학사 3학년 3-과학사B', students: {
      '3-1-3': '가나다', '3-1-4': '라마바', '3-1-7': '사아자', '3-2-1': '차카타', '3-2-5': '파하가' } },
    { id: 'cls_b', name: '생명과학 2학년 2-생명C', students: {
      '2-3-2': '나다라', '2-3-9': '마바사', '2-5-1': '아자차' } },
  ],
  records: {
    cls_a: { '2026-09-02': ['3-1-4'], '2026-09-09': ['3-1-4', '3-2-1'] },
    cls_b: { '2026-09-10': ['2-3-9'] },
  },
};
const SEED_HOME = {
  dailyRecords: {
    '2026-09-07': { attendance: { 3: { absent: 'disease' }, 11: { late: 'unapproved' } } },
    '2026-09-08': { attendance: { 3: { absent: 'disease', approvedType: '' } } },
  },
  deadlines: [], initialStats: {}, initialStatsPeriod: '',
  studentCount: 24,
  studentNames: { 3: '가나다', 11: '라마바', 17: '사아자' },
};

console.log('출결 앱 — 라이브본 ↔ 승격본 대조');
console.log('라이브:', LIVE);
console.log('승격본:', NEXT, '(TEST_BUILD=false)');

/* ══ 1. 담임 출결 ══════════════════════════════════════════════ */
console.log('\n[1] 담임 출결');
step('담임 적재', app => {
  app.ctx.localStorage.setItem(app.T.STORAGE_KEY, JSON.stringify(SEED_HOME));
  app.ctx.loadData();
  app.T.currentDate = '2026-09-16';
  app.ctx.renderDailyTab();
});
step('결석 찍기',          app => { app.ctx.setAtt(5, 'absent', 'disease', true); app.ctx.renderDailyTab(); });
nonEmpty('학생 목록이 그려졌다', 'student-list', 's-row has-att');
nonEmpty('결석 집계', 'sum-absent', '1');
step('지각 찍기',          app => { app.ctx.setAtt(8, 'late', 'unapproved', true); app.ctx.renderDailyTab(); });
step('결과(교과) 찍기',    app => { app.ctx.setAtt(8, 'classMiss', 'other', true); app.ctx.renderDailyTab(); });
step('인정결석 + 체험학습', app => {
  app.ctx.setAtt(12, 'absent', 'approved', true);
  app.ctx.setAtt(12, 'approvedType', 'fieldtrip', true);
  app.ctx.renderDailyTab(); app.ctx.renderDeadlinesTab();
});
step('생리통 인정결석',    app => {
  app.ctx.setAtt(17, 'absent', 'approved', true);
  app.ctx.setAtt(17, 'approvedType', 'menstrual', true);
  app.ctx.renderDailyTab(); app.ctx.renderDeadlinesTab();
});
nonEmpty('증빙서류 목록에 결석신고서가 생겼다', 'dl-list', '결석신고서');
step('결석 취소',          app => { app.ctx.setAtt(5, 'absent', '', true); app.ctx.renderDailyTab(); app.ctx.renderDeadlinesTab(); });
step('날짜 이동',          app => { app.ctx.changeDate(-1); app.ctx.changeDate(1); app.ctx.changeDate(-3); });
step('통계 탭',            app => { app.ctx.renderStatsTab(); });
nonEmpty('통계가 그려졌다', 'stats-list');
step('주간 기록',          app => { app.T.currentRecWeekStart = app.ctx.getMonday('2026-09-16'); app.ctx.renderWeeklyView(); });
nonEmpty('주간 기록이 그려졌다', 'rec-week-content');
step('월간 기록',          app => { app.T.currentMonth = '2026-09'; app.ctx.renderMonthlyView(); });
nonEmpty('월간 기록이 그려졌다', 'rec-month-content');
step('저장',               app => { app.ctx.saveData(); });

/* ══ 2. 교과 출결 (연강 안 씀) ═════════════════════════════════ */
console.log('[2] 교과 출결 — 연강을 쓰지 않는 기존 사용법');
step('교과 적재', app => {
  app.ctx.localStorage.setItem(app.T.SUBJ_KEY, JSON.stringify(SEED_SUBJ));
  app.ctx.loadSubjData();
  app.T.subjDate = '2026-09-16';
  app.ctx.renderSubjClassList();
});
step('반 열기',            app => { app.ctx.openSubjClass('cls_a'); });
step('결과 찍기 ×2',       app => { app.ctx.toggleSubjAbsent('3-1-3'); app.ctx.toggleSubjAbsent('3-2-5'); });
nonEmpty('학생 그리드', 'subj-student-grid', 'absent');
nonEmpty('요약 문구', 'subj-cls-absent-summary', '결과 2명');
step('결과 하나 풀기',     app => { app.ctx.toggleSubjAbsent('3-1-3'); });
step('반 목록으로',        app => { app.ctx.subjClassBack(); });
nonEmpty('반 카드 배지', 'subj-class-list', '결과 1명');
step('날짜 앞뒤',          app => { app.ctx.subjChangeDate(-1); app.ctx.subjChangeDate(1); app.ctx.subjChangeDate(-7); });
step('옛 기록 날 열기',    app => { app.ctx.openSubjClass('cls_a'); });         // 09-09: 2명
step('옛 기록에 추가',     app => { app.ctx.toggleSubjAbsent('3-1-7'); });
step('다 풀어서 날짜 삭제', app => { app.ctx.toggleSubjAbsent('3-1-4'); app.ctx.toggleSubjAbsent('3-2-1'); app.ctx.toggleSubjAbsent('3-1-7'); });
step('현황 탭',            app => { app.ctx.subjClassBack(); app.ctx.switchSubjTab('summary'); });
nonEmpty('현황 내용', 'subj-summary-content', '누적 결과');
step('현황 → 복사',        app => { app.ctx.copySummaryDate('cls_a', '2026-09-16'); });
if (lastSnap.copied.includes('결과 — 2반 5번 파하가')) pass++; else { fail++; fails.push('[실질] 복사 텍스트: ' + lastSnap.copied); }
step('현황 → 이동',        app => { app.ctx.goToDailyCheck('cls_b', '2026-09-10'); });
step('학생 삭제',          app => { app.ctx.deleteSubjStudent('2-3-9'); });    // 확인창 자동 승인
step('편집 모드 토글',     app => { app.ctx.toggleSubjEditMode(); app.ctx.toggleSubjEditMode(); });
step('반 순서 변경',       app => { app.ctx.subjClassBack(); app.ctx.moveSubjClass('cls_b', -1); });
step('반 직접 추가',       app => {
  app.ctx.document.getElementById('add-cls-name-input').value     = '방과후 생명과학반';
  app.ctx.document.getElementById('add-cls-students-input').value = '1 하나\n2 두울\n세엣';
  app.ctx.saveAddClsModal();
});
step('반 이름 바꾸기',     app => {
  const cls = app.T.subjData.classes.find(c => c.name === '방과후 생명과학반');
  app.ctx.openClassModal(cls.id);
  app.ctx.document.getElementById('subj-cls-name-input').value = '방과후 생명과학 A';
  app.ctx.saveClassModal();
});
step('반 삭제',            app => {
  const cls = app.T.subjData.classes.find(c => c.name === '방과후 생명과학 A');
  app.ctx.openClassModal(cls.id);
  app.ctx.deleteSubjClass();
});
step('현황 다시',          app => { app.ctx.switchSubjTab('summary'); });

/* ══ 3. 백업 — 유일하게 다르기로 한 곳 ═══════════════════════ */
console.log('[3] 백업 JSON');
function grabBackup(app) {
  let payload = null;
  app.ctx.Blob = function Blob(parts) { payload = parts[0]; };
  app.ctx.exportSubjBackup();
  return JSON.parse(payload);
}
const bkA = grabBackup(A), bkB = grabBackup(B);
same('백업 — classes', bkA.classes, bkB.classes);
same('백업 — records', bkA.records, bkB.records);
// 라이브가 아직 v 를 안 찍는 옛 빌드면 승격본만 v:2, 라이브도 새 빌드면 둘이 같아야 한다
if (bkB.v === 2 && (bkA.v === undefined || bkA.v === 2)) pass++;
else { fail++; fails.push(`백업 v 표시 — 라이브 ${bkA.v} / 승격본 ${bkB.v}`); }

// 승격본 백업을 라이브가 읽을 수 있는가 (연강을 안 썼으니 읽혀야 한다)
step('승격본 백업을 라이브에 넣기', app => {
  app.T.subjData.classes = bkB.classes; app.T.subjData.records = bkB.records;
  app.ctx.saveSubjData(); app.ctx.renderSubjClassList();
});

/* ── 결과 ──────────────────────────────────────────────────────── */
console.log('\n' + '─'.repeat(52));
if (fail) {
  console.log(`✗ ${fail}건 어긋남 / ${pass + fail}비교`);
  fails.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
}
console.log(`✓ ${pass}비교 모두 일치 — 연강을 쓰지 않는 한 라이브와 같이 군다`);
