// 생물의 유전 — 1-2기초 · 1-3기초 복습 퀴즈를 라이브 RTDB에 올린다.
//
//   node _seed_퀴즈기초.js            → 라이브 상태만 확인하고 끝낸다 (아무것도 쓰지 않는다)
//   node _seed_퀴즈기초.js --write    → 백업 후 실제로 올린다
//
// 절차는 작업노트/생물의유전_복습퀴즈.md 의 「★RTDB 반영 절차」 그대로다:
//   익명 인증 → GET quizzes → quizBackups/ 에 통째로 백업 POST
//   → quizzes/<id> PUT → quizMeta/<id> PUT → GET 재검증(키 정렬 후 깊은 비교)
//
// ★학교망은 TLS 검사 프록시다. 실패하면 앞에 NODE_TLS_REJECT_UNAUTHORIZED=0 을 붙여 실행할 것.
// ★database 규칙은 이 스크립트가 건드리지 않는다. hosting 배포도 필요 없다(문항은 DB에 있다).

'use strict';
const { quiz12, quiz13 } = require('./_build_퀴즈기초_1-2_1-3.js');

const KEY = 'AIzaSyA1yobw0EreDxuIVRr_eaI2XN7BZRtZ9w4';   // index.html firebaseConfig
const DB  = 'https://lifescience-quiz-default-rtdb.asia-southeast1.firebasedatabase.app';
const WRITE = process.argv.indexOf('--write') > 0;

/* quizMeta 모양은 앱이 쓰는 것과 같게 만든다 (index.html 698행 · admin metaFromObj).
   학생이 접속하면 앱이 어차피 다시 써 주지만, 올린 직후 목록이 바로 맞게 보이도록 함께 쓴다. */
const metaOf = q => ({
  title: q.title,
  subtitle: q.subtitle,
  subject: q.subject,
  totalQuestions: q.questions.length,
  questions: q.questions.map(x => ({
    chapter: x.chapter, q: x.q, options: x.options, answer: x.answer, hidden: false
  })),
  updatedAt: { '.sv': 'timestamp' }
});

/* ★RTDB 는 키를 알파벳 순으로 돌려준다 → 문자열 비교하면 다르게 보인다. 정렬 후 깊은 비교할 것. */
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

(async () => {
  const auth = await j(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }) });
  if (!auth.idToken) throw new Error('익명 인증 실패');
  const A = `auth=${auth.idToken}`;
  console.log('익명 인증 ok');

  const before = await j(`${DB}/quizzes.json?${A}`);
  console.log('\n현재 라이브 퀴즈 ' + Object.keys(before).length + '개:');
  for (const [k, v] of Object.entries(before)) {
    console.log('  ' + k.padEnd(30) + ' subject=' + (v.subject || '(none)') +
                ' order=' + v.order + ' ' + (v.questions || []).length + '문항');
  }

  for (const q of [quiz12, quiz13]) {
    if (before[q.id]) throw new Error('★이미 같은 id 가 라이브에 있다: ' + q.id + ' — 덮어쓰지 않는다');
  }
  console.log('\n올릴 것: ' + quiz12.id + ' (order 55) · ' + quiz13.id + ' (order 70) — id 충돌 없음');

  if (!WRITE) { console.log('\n※ 확인만 했다. 실제로 올리려면 --write 를 붙일 것.'); return; }

  const meta = await j(`${DB}/quizMeta.json?${A}`);
  const bk = await j(`${DB}/quizBackups.json?${A}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ at: new Date().toISOString(), why: '1-2기초·1-3기초 추가 전',
                             quizzes: before, quizMeta: meta }) });
  console.log('\n백업 완료: quizBackups/' + bk.name);

  for (const q of [quiz12, quiz13]) {
    await j(`${DB}/quizzes/${encodeURIComponent(q.id)}.json?${A}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
    await j(`${DB}/quizMeta/${encodeURIComponent(q.id)}.json?${A}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metaOf(q)) });
    console.log('올림: ' + q.id);
  }

  const after = await j(`${DB}/quizzes.json?${A}`);
  let bad = 0;
  for (const q of [quiz12, quiz13]) {
    if (!same(after[q.id], q)) { bad++; console.log('  X 재검증 불일치: ' + q.id); }
  }
  for (const k of Object.keys(before)) {
    if (!same(after[k], before[k])) { bad++; console.log('  X 기존 퀴즈가 바뀌었다: ' + k); }
  }
  console.log('\n재검증: 라이브 ' + Object.keys(after).length + '개 · 불일치 ' + bad + '건');
  console.log(bad ? '★확인 필요' : '완료 — https://lifescience-quiz.web.app/gen 에서 카드 4장이 보이면 된다');
  console.log('★올린 뒤 할 일: 위첨자(Iᴬ Iᴮ Xᴿ Xʳ)가 화면에서 깨지지 않는지 눈으로 확인');
})().catch(e => { console.error('실패: ' + e.message); process.exit(1); });
