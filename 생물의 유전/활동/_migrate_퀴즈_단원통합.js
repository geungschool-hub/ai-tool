// 생물의 유전 복습 퀴즈 — **한 소단원 = 한 퀴즈**로 라이브를 정리한다. (2026-09-09 교사 지시)
//
//   node _migrate_퀴즈_단원통합.js            → 계획만 찍고 끝낸다 (아무것도 쓰지 않는다)
//   node _migrate_퀴즈_단원통합.js --write    → 백업 후 실제로 옮긴다
//
// 하는 일
//   1. 1-2 두 벌(개념 10 + 그림·자료 10)을 `유전1-2_사람의유전_퀴즈` 한 장(20문항)으로 합친다.
//      ★문항 텍스트는 라이브에서 그대로 가져온다(새로 조립하지 않는다). 앞 10 = 개념, 뒤 10 = 가계도·자료·확률.
//   2. `유전1-3_사람의유전병_기초_퀴즈` → `유전1-3_사람의유전병_퀴즈` 로 id·제목에서 「기초」를 뺀다.
//   3. 1-4 · 1-5 를 새로 올린다(`_build_퀴즈_1-4_1-5.js`).
//   4. 차례를 50 / 60 / 70 / 80 / 90 으로 다시 매긴다.
//   5. **학생 기록을 따라 옮긴다** — 진도(progress)는 문항 번호를 밀어서, 응시 기록(results)은 그대로 복사.
//
// ★중간에 끊겨도 다시 실행하면 남은 단계만 이어서 한다(2026-09-09에 실제로 한 번 끊겼다).
// ★DB 규칙상 **이미 있는 응시 기록은 수정·삭제가 막혀 있다(401).** 그 단계만 건너뛰고 계속한다.
// ★학교망은 TLS 검사 프록시다. 실패하면 앞에 NODE_TLS_REJECT_UNAUTHORIZED=0 을 붙일 것.
// ★database 규칙·hosting 은 건드리지 않는다.

'use strict';
const { quiz14, quiz15 } = require('./_build_퀴즈_1-4_1-5.js');

const KEY = 'AIzaSyA1yobw0EreDxuIVRr_eaI2XN7BZRtZ9w4';   // index.html firebaseConfig
const DB  = 'https://lifescience-quiz-default-rtdb.asia-southeast1.firebasedatabase.app';
const WRITE = process.argv.indexOf('--write') > 0;

const OLD12 = '유전1-2_사람의유전_기초_퀴즈';
const NEW12 = '유전1-2_사람의유전_퀴즈';
const OLD13 = '유전1-3_사람의유전병_기초_퀴즈';
const NEW13 = '유전1-3_사람의유전병_퀴즈';

const SUB12 = '사람 유전의 연구 방법 · 염색체와 유전 양상 · 가계도 분석 · ABO식 혈액형 · 반성유전 · 다유전자유전';

const metaOf = q => ({
  title: q.title, subtitle: q.subtitle, subject: q.subject,
  totalQuestions: q.questions.length,
  questions: q.questions.map(x => ({
    chapter: x.chapter, q: x.q, options: x.options, answer: x.answer, hidden: !!x.hidden
  })),
  updatedAt: { '.sv': 'timestamp' }
});

const sortDeep = v => Array.isArray(v) ? v.map(sortDeep)
  : (v && typeof v === 'object')
    ? Object.keys(v).sort().reduce((o, k) => (o[k] = sortDeep(v[k]), o), {})
    : v;
const same = (a, b) => JSON.stringify(sortDeep(a)) === JSON.stringify(sortDeep(b));

const j = async (url, opt) => {
  const r = await fetch(url, opt);
  const t = await r.text();
  if (!r.ok) throw new Error(r.status + ' ' + url.split('?')[0] + ' :: ' + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
};

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  X FAIL: ' + m); } };

(async () => {
  const auth = await j(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }) });
  if (!auth.idToken) throw new Error('익명 인증 실패');
  const A = `auth=${auth.idToken}`;
  console.log('익명 인증 ok');

  const quizzes  = await j(`${DB}/quizzes.json?${A}`);
  const quizMeta = await j(`${DB}/quizMeta.json?${A}`);
  const progress = await j(`${DB}/progress.json?${A}`) || {};
  const results  = await j(`${DB}/results.json?${A}`) || {};

  if (!quizzes[NEW12]) throw new Error('라이브에 ' + NEW12 + ' 가 없다 — 손으로 확인할 것');

  /* ★한 번 돌다 끊긴 뒤 다시 실행한 경우를 알아본다 */
  const alreadyMerged = quizzes[NEW12].questions.length === 20;
  const done = alreadyMerged && !quizzes[OLD12] && !quizzes[OLD13] &&
               quizzes[NEW13] && quizzes[quiz14.id] && quizzes[quiz15.id];
  if (done) {
    console.log('\n※ 이미 다 끝난 상태다. 아무것도 하지 않는다.');
    Object.entries(quizzes).filter(([, q]) => q.subject === 'gen')
      .sort((a, b) => a[1].order - b[1].order)
      .forEach(([id, q]) => console.log('  ' + String(q.order).padStart(3) + '  ' +
        id.padEnd(30) + q.questions.length + '문항  ' + q.title));
    return;
  }
  if (alreadyMerged) console.log('※ 1-2 는 이미 20문항으로 합쳐져 있다 — 남은 단계만 이어서 한다.');

  /* ── 목표 상태 ─────────────────────────────────────────── */
  const merged12 = Object.assign({}, quizzes[NEW12], {
    id: NEW12, order: 60, title: '1-2 사람의 유전', subtitle: SUB12,
    questions: alreadyMerged ? quizzes[NEW12].questions
                             : quizzes[OLD12].questions.concat(quizzes[NEW12].questions)
  });
  const src13 = quizzes[OLD13] || quizzes[NEW13];
  const renamed13 = Object.assign({}, src13, {
    id: NEW13, order: 70, title: '1-3 사람의 유전병'
  });
  delete merged12.updatedAt; delete renamed13.updatedAt;
  const targets = [merged12, renamed13, quiz14, quiz15];

  /* ── 쓰기 전 검사 ───────────────────────────────────────── */
  ok(merged12.questions.length === 20, '1-2 가 20문항이다');
  if (quizzes[OLD12])
    ok(same(merged12.questions.slice(0, 10), quizzes[OLD12].questions),
       '★1-2 앞 10문항이 라이브의 개념 10문항과 한 글자도 다르지 않다');
  if (!alreadyMerged)
    ok(same(merged12.questions.slice(10), quizzes[NEW12].questions),
       '★1-2 뒤 10문항이 라이브의 가계도·자료 10문항과 한 글자도 다르지 않다');
  ok(merged12.questions.slice(10).length === 10, '1-2 뒤 묶음이 10문항이다');
  ok(same(renamed13.questions, src13.questions), '★1-3 문항이 라이브 그대로다');
  ok(new Set(merged12.questions.map(x => x.q)).size === 20, '1-2 안에 같은 발문이 겹치지 않는다');
  targets.forEach(q => {
    ok(q.subject === 'gen', q.id + ' subject 가 gen 이다');
    ok(!/기초|심화/.test(q.id + q.title + q.subtitle), '★' + q.id + ' 이름에 「기초/심화」가 없다');
    ok(q.unit === 'Ⅰ. 유전자와 유전물질', q.id + ' 단원이 Ⅰ단원이다');
  });
  const finalGen = { '유전1-1_유전의기본원리_퀴즈': 50, [NEW12]: 60, [NEW13]: 70,
                     [quiz14.id]: 80, [quiz15.id]: 90 };
  ok(Object.keys(finalGen).length === 5, '통합 뒤 gen 퀴즈는 5개다 (소단원 하나에 하나)');
  ok(quizzes['유전1-1_유전의기본원리_퀴즈'].order === 50 &&
     !/기초|심화/.test(quizzes['유전1-1_유전의기본원리_퀴즈'].title),
     '1-1 은 손댈 것이 없다 (이미 한 장 · 이름에 기초/심화 없음)');
  targets.forEach(q => ok(finalGen[q.id] === q.order, q.id + ' 차례가 ' + finalGen[q.id] + ' 이다'));

  /* ── 옮길 학생 기록 ─────────────────────────────────────── */
  const shift = o => Object.keys(o || {}).reduce((r, k) => (r[String(Number(k) + 10)] = o[k], r), {});
  const progPlan = [];
  for (const [uid, byQuiz] of Object.entries(progress)) {
    const p12a = byQuiz[OLD12], p12b = byQuiz[NEW12], p13 = byQuiz[OLD13];
    /* ★이미 합쳐진 뒤라면 NEW12 의 진도가 곧 옮겨 둔 결과다 — 다시 밀면 번호가 두 번 밀린다. */
    if (!alreadyMerged && (p12a || p12b)) {
      progPlan.push({ uid, node: NEW12, value: {
        seen:  Object.assign({}, (p12a || {}).seen,  shift((p12b || {}).seen)),
        wrong: Object.assign({}, (p12a || {}).wrong, shift((p12b || {}).wrong)),
        updatedAt: { '.sv': 'timestamp' } } });
    }
    if (p13 && !byQuiz[NEW13]) progPlan.push({ uid, node: NEW13, value: p13 });
  }
  const resPlan = [];
  for (const [oldId, newId] of [[OLD12, NEW12], [OLD13, NEW13]]) {
    for (const [key, rec] of Object.entries(results[oldId] || {})) {
      if ((results[newId] || {})[key]) continue;          // 이미 옮겨져 있다
      resPlan.push({ from: oldId, to: newId, key, rec });
    }
  }

  console.log('\n■ 계획');
  console.log('  1-2  ' + (alreadyMerged ? '(이미 합쳐짐) ' : OLD12 + '(10) + ' + NEW12 + '(10) → ') +
              NEW12 + ' 20문항 · order 60');
  console.log('  1-3  ' + (quizzes[OLD13] ? OLD13 + ' → ' : '(이미 옮겨짐) ') + NEW13 + ' · order 70');
  console.log('  1-4  ' + quiz14.id + ' · order 80');
  console.log('  1-5  ' + quiz15.id + ' · order 90');
  console.log('  진도 옮김 ' + progPlan.length + '건 · 응시 기록 옮김 ' + resPlan.length + '건');
  console.log('  지울 것: ' + [OLD12, OLD13].filter(k => quizzes[k]).join(' · ') + ' (quizzes · quizMeta · progress)');
  console.log('\n검사: ' + pass + ' 통과, ' + fail + ' 실패');
  if (fail) { console.log('★실패가 있어 중단한다.'); process.exit(1); }

  if (!WRITE) { console.log('\n※ 확인만 했다. 실제로 옮기려면 --write 를 붙일 것.'); return; }

  /* ── 백업 ───────────────────────────────────────────────── */
  const bk = await j(`${DB}/quizBackups.json?${A}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ at: new Date().toISOString(),
        why: '단원 통합 (1-2 합치기 · 1-3 개명 · 1-4/1-5 추가)',
        quizzes, quizMeta, progress, results }) });
  console.log('\n백업 완료: quizBackups/' + bk.name + ' (quizzes · quizMeta · progress · results 통째로)');

  /* ── 퀴즈 쓰기 ──────────────────────────────────────────── */
  for (const q of targets) {
    await j(`${DB}/quizzes/${encodeURIComponent(q.id)}.json?${A}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
    await j(`${DB}/quizMeta/${encodeURIComponent(q.id)}.json?${A}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metaOf(q)) });
    console.log('올림: ' + q.id + ' (' + q.questions.length + '문항 · order ' + q.order + ')');
  }

  /* ── 학생 기록 옮기기 ───────────────────────────────────── */
  for (const p of progPlan) {
    await j(`${DB}/progress/${p.uid}/${encodeURIComponent(p.node)}.json?${A}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p.value) });
  }
  let resMoved = 0, resBlocked = 0;
  for (const r of resPlan) {
    try {
      await j(`${DB}/results/${encodeURIComponent(r.to)}/${r.key}.json?${A}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.rec) });
      resMoved++;
    } catch (e) { resBlocked++; }
  }
  console.log('학생 기록: 진도 ' + progPlan.length + '건 · 응시 ' + resMoved + '건 옮김' +
              (resBlocked ? ' (규칙에 막힌 것 ' + resBlocked + '건)' : ''));

  /* ── 옛 노드 지우기 ─────────────────────────────────────── */
  for (const uid of Object.keys(progress)) {
    for (const oldId of [OLD12, OLD13]) {
      if (progress[uid][oldId])
        await j(`${DB}/progress/${uid}/${encodeURIComponent(oldId)}.json?${A}`, { method: 'DELETE' });
    }
  }
  for (const oldId of [OLD12, OLD13]) {
    if (!quizzes[oldId] && !(results[oldId])) continue;
    let resNote = '';
    try {
      if (results[oldId]) { await j(`${DB}/results/${encodeURIComponent(oldId)}.json?${A}`, { method: 'DELETE' }); }
    } catch (e) { resNote = ' — ⚠ 응시 기록은 규칙이 삭제를 막아 옛 id 아래 그대로 남는다(사본은 새 id 에 있다)'; }
    if (quizzes[oldId]) {
      await j(`${DB}/quizzes/${encodeURIComponent(oldId)}.json?${A}`, { method: 'DELETE' });
      await j(`${DB}/quizMeta/${encodeURIComponent(oldId)}.json?${A}`, { method: 'DELETE' });
    }
    console.log('지움: ' + oldId + ' (quizzes · quizMeta · progress)' + resNote);
  }

  /* ── 재검증 ─────────────────────────────────────────────── */
  let bad = 0;
  const after = await j(`${DB}/quizzes.json?${A}`);
  const afterMeta = await j(`${DB}/quizMeta.json?${A}`);
  const afterProg = await j(`${DB}/progress.json?${A}`) || {};
  const afterRes = await j(`${DB}/results.json?${A}`) || {};
  const gen = Object.entries(after).filter(([, q]) => q.subject === 'gen');
  console.log('\n■ 재검증');
  gen.sort((a, b) => a[1].order - b[1].order).forEach(([id, q]) =>
    console.log('  ' + String(q.order).padStart(3) + '  ' + id.padEnd(30) + q.questions.length + '문항  ' + q.title));
  if (gen.length !== 5) { bad++; console.log('  X gen 퀴즈가 5개가 아니다'); }
  for (const q of targets) if (!same(after[q.id], q)) { bad++; console.log('  X 올린 내용과 다르다: ' + q.id); }
  for (const [k, v] of Object.entries(quizzes)) {
    if (v.subject === 'gen') continue;
    if (!same(after[k], v)) { bad++; console.log('  X 생명과학 퀴즈가 바뀌었다: ' + k); }
  }
  if (after[OLD12] || after[OLD13] || afterMeta[OLD12] || afterMeta[OLD13]) {
    bad++; console.log('  X 옛 퀴즈가 남아 있다');
  }
  for (const uid of Object.keys(afterProg))
    for (const oldId of [OLD12, OLD13])
      if (afterProg[uid][oldId]) { bad++; console.log('  X 옛 진도가 남아 있다: ' + uid); }
  for (const p of progPlan) {
    const got = (afterProg[p.uid] || {})[p.node];
    if (!got || !same(got.seen || {}, p.value.seen) || !same(got.wrong || {}, p.value.wrong)) {
      bad++; console.log('  X 진도가 옮겨지지 않았다: ' + p.uid + ' / ' + p.node);
    }
  }
  const rc = id => Object.keys(afterRes[id] || {}).length;
  console.log('  응시 기록: ' + NEW12 + ' ' + rc(NEW12) + '건 · ' + NEW13 + ' ' + rc(NEW13) + '건');
  if (rc(OLD12) + rc(OLD13) > 0)
    console.log('  ⚠ 옛 id 아래 응시 기록 ' + (rc(OLD12) + rc(OLD13)) + '건이 남아 있다 — 규칙이 삭제를 막는다. ' +
                '사본이 새 id 에 있어 교사 화면에는 정상으로 보인다.');

  console.log('\n불일치 ' + bad + '건 — ' + (bad ? '★확인 필요' :
    '완료. https://lifescience-quiz.web.app/gen 에 카드 5장(1-1 24 · 1-2 20 · 1-3 10 · 1-4 10 · 1-5 10)'));
  if (bad) process.exit(1);
})().catch(e => { console.error('실패: ' + e.message); process.exit(1); });
