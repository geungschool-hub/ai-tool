// 복습 퀴즈 공통 검사 — 새 문항을 만들 때마다 같은 잣대를 쓴다.
//
//   const { checkQuiz, checkAppend } = require('./_퀴즈검사.js');
//   const r = checkQuiz(quiz, '1-4');        // → { pass, fail }
//   checkAppend(라이브문항, 새문항, r);        // 이어 붙일 때 앞부분이 그대로인지
//
// 여기 모인 규칙은 전부 **실제로 한 번씩 데인 것**이다. 새로 데면 여기에 한 줄 추가할 것.
//   · 「기초/심화」 이름 금지            ← 2026-09-09 단원 통합(한 소단원 = 한 퀴즈)
//   · 위첨자는 문자 대신 <sup> 태그      ← 폰트에 따라 두부가 된다
//   · 꺾쇠 <보기> 금지                  ← innerHTML 이 태그로 먹는다. 【보기】를 쓸 것
//   · 해설이 말하는 정답 번호 대조        ← 선택지 순서를 바꾸고 해설을 안 고치는 실수
//   · subject:'gen' 없으면 생명과학 화면으로 샌다

'use strict';

const TAG_CLASSES = ['', 'green', 'amber', 'purple'];
const plain = h => String(h).replace(/<[^>]*>/g, '');

function makeOk(state) {
  return (cond, msg) => { if (cond) state.pass++; else { state.fail++; console.log('  X FAIL: ' + msg); } };
}

/* 문항 하나 검사 */
function checkQuestion(x, n, ok) {
  ok(Array.isArray(x.options) && x.options.length === 4, n + ' 선택지 4개');
  ok(Number.isInteger(x.answer) && x.answer >= 0 && x.answer < 4, n + ' 정답 번호가 범위 안');
  ok(typeof x.q === 'string' && plain(x.q).trim().length > 10, n + ' 발문이 있다');
  ok(typeof x.explain === 'string' && x.explain.length > 40, n + ' 해설이 있다');
  ok(!!x.chapter, n + ' chapter 가 있다');
  ok(TAG_CLASSES.indexOf(x.tagClass || '') >= 0, n + ' tagClass 가 앱이 아는 값이다');
  ok(!/\{\{|TODO/.test(x.q + x.explain), n + ' 미변환 자리표시가 없다');
  ok(x.q.indexOf('&lt;보기&gt;') < 0 && x.q.indexOf(String.fromCharCode(60) + '보기') < 0,
     n + ' 꺾쇠 보기 표기를 쓰지 않는다 (【보기】를 쓸 것)');
  ok(/니다|니까/.test(x.explain), n + ' 해설이 존댓말이다');
  ok(new Set((x.options || []).map(plain)).size === 4, n + ' 선택지가 서로 다르다');
  ok((x.options || []).every(o => plain(o).trim().length > 0), n + ' 빈 선택지가 없다');
  ok(!/https?:\/\//.test(x.q + x.explain), n + ' 외부에서 받아 오는 자원이 없다');
  ok(!/[¹²³⁴⁵⁶⁷⁸⁹⁰]/.test(x.q + x.explain + (x.options || []).join('')),
     n + ' 위첨자를 문자로 쓰지 않는다 (<sup> 태그를 쓸 것)');
  const claimed = (x.explain.match(/([①②③④])이?가? 정답/) || [])[1];
  if (claimed) ok('①②③④'.indexOf(claimed) === x.answer,
                  n + ' 해설이 말하는 정답 번호와 answer 가 같다 (' + claimed + ')');
}

/* 퀴즈 한 장 검사 */
function checkQuiz(quiz, tag, state) {
  state = state || { pass: 0, fail: 0 };
  const ok = makeOk(state);
  const qs = quiz.questions || [];
  tag = tag || quiz.id;

  ok(!!quiz.id && !!quiz.title && !!quiz.subtitle, tag + ' id·제목·부제가 있다');
  ok(quiz.subject === 'gen', '★' + tag + ' subject 가 gen 이다 (없으면 생명과학 화면으로 샌다)');
  ok(!/기초|심화/.test(quiz.id + quiz.title + quiz.subtitle),
     '★' + tag + ' 이름에 「기초/심화」가 없다 (한 소단원 = 한 퀴즈)');
  ok(quiz.unit === 'Ⅰ. 유전자와 유전물질' || /단원/.test(quiz.unit || ''), tag + ' 단원 이름이 있다');
  ok(Number.isInteger(quiz.order), tag + ' 차례(order)가 정수다');
  ok(qs.length >= 1, tag + ' 문항이 있다');
  qs.forEach((x, i) => checkQuestion(x, tag + ' Q' + (i + 1), ok));
  ok(new Set(qs.map(x => x.q)).size === qs.length, tag + ' 같은 발문이 겹치지 않는다');

  const dist = [0, 0, 0, 0];
  qs.forEach(x => dist[x.answer]++);
  const lo = Math.max(1, Math.floor(qs.length / 4) - 1), hi = Math.ceil(qs.length / 4) + 1;
  ok(dist.every(d => d >= lo && d <= hi),
     tag + ' 정답 번호 분포에 쏠림이 없다 (' + dist.join(' / ') + ' · ' + lo + '~' + hi + ' 이면 정상)');
  return state;
}

/* 이어 붙이기 검사 — ★앞 문항은 한 글자도 바뀌면 안 된다 (학생 진도가 문항 번호로 저장된다) */
function checkAppend(liveQuestions, addQuestions, state) {
  state = state || { pass: 0, fail: 0 };
  const ok = makeOk(state);
  const merged = liveQuestions.concat(addQuestions);
  ok(JSON.stringify(merged.slice(0, liveQuestions.length)) === JSON.stringify(liveQuestions),
     '★이어 붙인 뒤에도 앞 ' + liveQuestions.length + '문항이 라이브와 한 글자도 다르지 않다');
  ok(addQuestions.length >= 1, '이어 붙일 문항이 있다');
  ok(new Set(merged.map(x => x.q)).size === merged.length, '★새 문항이 기존 발문과 겹치지 않는다');
  return { state, merged };
}

module.exports = { checkQuiz, checkAppend, checkQuestion, plain };
