// 복습 퀴즈를 라이브에 올리는 **하나뿐인 도구**. 앞으로 퀴즈를 늘릴 때는 이것만 쓴다.
//
//   node _퀴즈올리기.js                                  → 지금 라이브 상태만 본다 (아무것도 안 쓴다)
//   node _퀴즈올리기.js --new <모듈>                      → 새 퀴즈 한 장 올리기 (확인만)
//   node _퀴즈올리기.js --new <모듈> --write              → 실제로 올린다
//   node _퀴즈올리기.js --append <퀴즈id> <모듈>           → 그 퀴즈 **뒤에** 문항 이어 붙이기 (확인만)
//   node _퀴즈올리기.js --append <퀴즈id> <모듈> --write   → 실제로 붙인다
//
// 모듈 규약 (조립기 파일이 내보내면 된다)
//   새 퀴즈  : module.exports = { quiz }        또는 { quizzes: [q1, q2] }
//   이어붙이기: module.exports = { questions }    또는 { add }
//
// ★왜 「뒤에만」 붙이는가 — 학생 진도가 `progress/{uid}/{quizId} = {seen:{문항번호:true}}` 로
//   **문항 번호**에 매여 있다. 앞에 끼워 넣거나 순서를 바꾸면 이미 푼 학생의 진도가 통째로 어긋난다.
//   그래서 이 도구는 앞부분이 라이브와 한 글자라도 다르면 **쓰기 전에 멈춘다.**
//
// ★알아 둘 DB 규칙 (2026-09-09에 데임)
//   · quizzes/ · quizMeta/ 는 자유롭게 쓰고 지울 수 있다
//   · results/{quizId}/{key} 는 **새 키 쓰기·노드 삭제는 되지만, 이미 있는 기록 수정(PATCH)은 401**이다
//   · 그래서 이 도구는 results 를 건드리지 않는다. 퀴즈 id 를 바꾸는 일(=기록 이사)은
//     `_migrate_퀴즈_단원통합.js` 처럼 따로 만들어 쓸 것. **id 는 되도록 바꾸지 않는 게 답이다.**
//
// ★학교망은 TLS 검사 프록시다. 실패하면 앞에 NODE_TLS_REJECT_UNAUTHORIZED=0 을 붙일 것.

'use strict';
const path = require('path');
const { checkQuiz, checkAppend } = require('./_퀴즈검사.js');

const KEY = 'AIzaSyA1yobw0EreDxuIVRr_eaI2XN7BZRtZ9w4';   // index.html firebaseConfig
const DB  = 'https://lifescience-quiz-default-rtdb.asia-southeast1.firebasedatabase.app';

const argv = process.argv.slice(2);
const WRITE = argv.indexOf('--write') >= 0;
const iNew = argv.indexOf('--new');
const iApp = argv.indexOf('--append');

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

const load = rel => require(path.resolve(process.cwd(), rel));

function showList(quizzes) {
  const gen = Object.entries(quizzes).filter(([, q]) => q.subject === 'gen')
    .sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
  console.log('\n■ 라이브 — 생물의 유전 (' + gen.length + '장)');
  gen.forEach(([id, q]) => console.log('  ' + String(q.order).padStart(3) + '  ' + id.padEnd(30) +
    String(q.questions.length).padStart(2) + '문항  ' + q.title));
  const other = Object.entries(quizzes).filter(([, q]) => q.subject !== 'gen').length;
  console.log('  (생명과학 ' + other + '장은 이 도구가 건드리지 않는다)');
}

(async () => {
  const auth = await j(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }) });
  if (!auth.idToken) throw new Error('익명 인증 실패');
  const A = `auth=${auth.idToken}`;

  const quizzes  = await j(`${DB}/quizzes.json?${A}`);
  const quizMeta = await j(`${DB}/quizMeta.json?${A}`);

  if (iNew < 0 && iApp < 0) { showList(quizzes); console.log('\n※ 쓰기는 --new / --append 를 줄 것.'); return; }
  showList(quizzes);

  const state = { pass: 0, fail: 0 };
  const plan = [];   // { quiz, what }

  /* ── 새 퀴즈 ─────────────────────────────────────────────── */
  if (iNew >= 0) {
    const mod = load(argv[iNew + 1]);
    const list = mod.quizzes || (mod.quiz ? [mod.quiz] : [mod.quiz14, mod.quiz15].filter(Boolean));
    if (!list.length) throw new Error('모듈이 quiz / quizzes 를 내보내지 않는다: ' + argv[iNew + 1]);
    list.forEach(q => {
      checkQuiz(q, q.id, state);
      const dup = !!quizzes[q.id];
      if (dup) { state.fail++; console.log('  X FAIL: ★같은 id 가 이미 라이브에 있다 — 덮어쓰지 않는다: ' + q.id); }
      const clash = Object.entries(quizzes).find(([k, v]) => v.subject === 'gen' && v.order === q.order && k !== q.id);
      if (clash) { state.fail++; console.log('  X FAIL: ★차례(order ' + q.order + ')가 ' + clash[0] + ' 와 겹친다'); }
      if (!dup && !clash) plan.push({ quiz: q, what: '새로 올림 (' + q.questions.length + '문항 · order ' + q.order + ')' });
    });
  }

  /* ── 이어 붙이기 ─────────────────────────────────────────── */
  if (iApp >= 0) {
    const id = argv[iApp + 1], mod = load(argv[iApp + 2]);
    const add = mod.questions || mod.add;
    if (!quizzes[id]) throw new Error('라이브에 그런 퀴즈가 없다: ' + id);
    if (!Array.isArray(add)) throw new Error('모듈이 questions / add 배열을 내보내지 않는다: ' + argv[iApp + 2]);
    const live = quizzes[id];
    const { merged } = checkAppend(live.questions, add, state);
    const next = Object.assign({}, live, { id: id, questions: merged });
    delete next.updatedAt;
    checkQuiz(next, id, state);
    plan.push({ quiz: next, what: '뒤에 ' + add.length + '문항 이어 붙임 (' + live.questions.length +
                                  ' → ' + merged.length + '문항)' });
  }

  console.log('\n■ 계획');
  plan.forEach(p => console.log('  ' + p.quiz.id + ' — ' + p.what));
  console.log('\n검사: ' + state.pass + ' 통과, ' + state.fail + ' 실패');
  if (state.fail) { console.log('★실패가 있어 중단한다. 아무것도 쓰지 않았다.'); process.exit(1); }
  if (!plan.length) { console.log('할 일이 없다.'); return; }
  if (!WRITE) { console.log('\n※ 확인만 했다. 실제로 올리려면 --write 를 붙일 것.'); return; }

  /* ── 백업 → 쓰기 → 재검증 ───────────────────────────────── */
  const bk = await j(`${DB}/quizBackups.json?${A}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ at: new Date().toISOString(),
        why: plan.map(p => p.quiz.id + ' ' + p.what).join(' / '), quizzes, quizMeta }) });
  console.log('\n백업 완료: quizBackups/' + bk.name + ' (quizzes · quizMeta)');

  for (const p of plan) {
    await j(`${DB}/quizzes/${encodeURIComponent(p.quiz.id)}.json?${A}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p.quiz) });
    await j(`${DB}/quizMeta/${encodeURIComponent(p.quiz.id)}.json?${A}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metaOf(p.quiz)) });
    console.log('올림: ' + p.quiz.id);
  }

  let bad = 0;
  const after = await j(`${DB}/quizzes.json?${A}`);
  for (const p of plan) if (!same(after[p.quiz.id], p.quiz)) { bad++; console.log('  X 올린 내용과 다르다: ' + p.quiz.id); }
  for (const [k, v] of Object.entries(quizzes)) {
    if (plan.some(p => p.quiz.id === k)) continue;
    if (!same(after[k], v)) { bad++; console.log('  X 손대지 않은 퀴즈가 바뀌었다: ' + k); }
  }
  showList(after);
  console.log('\n불일치 ' + bad + '건 — ' + (bad ? '★확인 필요 (백업 quizBackups/' + bk.name + ')' :
    '완료. https://lifescience-quiz.web.app/gen 에서 새로고침하면 보인다'));
  if (bad) process.exit(1);
})().catch(e => { console.error('실패: ' + e.message); process.exit(1); });
