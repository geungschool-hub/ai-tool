/* _cli.js 회귀 검사 — CSV 읽기 · 날짜 해석 · 노션 행 → 항목 변환.
 * node _test_cli.js
 * 라이브에 붙지 않는다(순수 함수만). 라이브 왕복은 손으로 한 번 했다(2026-09-04, PRD §10).
 */
'use strict';
const C = require('./_cli.js');

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  X FAIL: ' + m); } }
function eq(g, w, m) {
  const a = JSON.stringify(g), b = JSON.stringify(w);
  if (a === b && typeof g === typeof w) pass++;
  else { fail++; console.log('  X FAIL: ' + m + '  (got ' + a + ', want ' + b + ')'); }
}
function sec(t) { console.log(t); }

/* ────────────────────────────────────────────────────────────────────── */
sec('[1] CSV 읽기');
{
  const P = C.parseCsv;
  eq(P('a,b\n1,2\n'), [{ a: '1', b: '2' }], '기본');
  eq(P('﻿a,b\n1,2\n'), [{ a: '1', b: '2' }], '★노션이 붙이는 BOM 을 벗긴다');
  eq(P('a,b\r\n1,2\r\n'), [{ a: '1', b: '2' }], 'CRLF');
  eq(P('a,b\n"쉼표, 있음",2\n'), [{ a: '쉼표, 있음', b: '2' }], '★따옴표 안의 쉼표는 나누지 않는다');
  eq(P('a\n"따옴표 ""안"" 것"\n'), [{ a: '따옴표 "안" 것' }], '★두 겹 따옴표는 한 겹으로');
  eq(P('a,b\n"여러\n줄",2\n'), [{ a: '여러\n줄', b: '2' }], '★따옴표 안의 줄바꿈은 한 칸');
  eq(P('a,b\n1\n'), [{ a: '1', b: '' }], '모자란 칸은 빈 값');
  eq(P('a,b\n\n1,2\n'), [{ a: '1', b: '2' }], '빈 줄은 버린다');
  eq(P(''), [], '빈 CSV');
  eq(P('a,b\n'), [], '머리만 있는 CSV');
  eq(P(' a , b \n1,2\n'), [{ a: '1', b: '2' }], '머리의 앞뒤 공백은 턴다');
  eq(P('a,b\n 1 ,2\n'), [{ a: '1', b: '2' }], '값의 앞뒤 공백도 턴다');
  eq(P('a,b\n1,2'), [{ a: '1', b: '2' }], '끝줄 개행이 없어도');
  // 열 찾기
  eq(C.col({ '최종 편집 일시': 'x' }, ['최종편집일시']), 'x', '★열 이름의 공백은 무시하고 찾는다');
  eq(C.col({ 'Name': 'x' }, ['업무', 'Name']), 'x', '영문 열 이름도 찾는다');
  eq(C.col({ 'zzz': 'x' }, ['업무']), '', '없으면 빈 값');
}

sec('[2] 날짜 해석 — 못 읽은 것과 빈 것을 구분한다');
{
  const D = C.toDate;
  eq(D('2026-09-12'), '2026-09-12', 'ISO');
  eq(D('2026/09/12'), '2026-09-12', '슬래시');
  eq(D('2026.9.2'), '2026-09-02', '점 · 한 자리');
  eq(D('2026년 9월 12일'), '2026-09-12', '★노션 한국어 꼴 — 실제 내보내기가 이렇게 나온다');
  eq(D('2026년 12월 3일'), '2026-12-03', '두 자리 달 · 한 자리 날');
  eq(D('2026년9월12일'), '2026-09-12', '공백이 없어도');
  eq(D('2026년 9월 12일 오후 3:00'), '2026-09-12', '뒤에 시각이 붙어도');
  eq(D('September 12, 2026'), '2026-09-12', '★노션 영문 긴 꼴');
  eq(D('september 12,2026'), '2026-09-12', '소문자 · 쉼표 뒤 공백 없음');
  eq(D('August 1, 2026'), '2026-08-01', '한 자리 날');
  eq(D('9/12/2026'), '2026-09-12', '미국식 M/D/YYYY');
  eq(D('September 12, 2026 3:00 PM'), '2026-09-12', '뒤에 시각이 붙어도 날짜만');
  eq(D(''), null, '★빈 값은 null (마감 없음)');
  eq(D(null), null, 'null 도 null');
  eq(D('   '), null, '공백만도 null');
  eq(D('언젠가'), undefined, '★못 읽은 것은 undefined — null 과 다르다');
  eq(D('Septembre 12, 2026'), undefined, '모르는 달 이름은 못 읽음');
  ok(D('') !== D('언젠가'), '★「비었다」와 「못 읽었다」가 같은 값이면 경고가 죽는다');
  // toMs 는 KST 정오 기준
  const ms = C.toMs('2026-09-12');
  eq(new Date(ms).toISOString().slice(0, 10), '2026-09-12', 'toMs 가 날짜를 안 밀어낸다(KST 정오)');
  eq(C.toMs('언젠가'), null, '못 읽은 날짜의 toMs 는 null');
}

sec('[3] 노션 행 → 항목');
{
  const NOW = 1788000000000;
  const R = (o) => C.rowsToTasks([Object.assign({
    '업무': '○○ 회의 자료', '상태': '대기', '마감일': '', '영역': '행정',
    '업무유형': '', '중요도': '', '체크포인트': '', '관련 기록': '', '최종 편집 일시': 'September 1, 2026',
  }, o)], NOW);
  const one = (o) => Object.values(R(o).tasks)[0];

  eq(one({}).title, '○○ 회의 자료', '제목');
  eq(one({}).createdBy, 'notion', '★createdBy 는 notion — 나중에 어디서 왔는지 안다');
  eq(one({}).ok, true, 'ok true');
  eq(one({}).status, 'todo', '대기 → todo');
  eq(one({ '상태': '진행' }).status, 'doing', '진행 → doing');
  eq(one({ '상태': '완료' }).status, 'done', '완료 → done');
  ok(one({ '상태': '완료' }).doneAt > 0, '★완료면 doneAt 이 최종 편집 시각으로 찍힌다');
  ok(!('doneAt' in one({})), '완료가 아니면 doneAt 없음');
  eq(one({ '영역': '행사' }).area, 'event', '행사 → event');
  eq(one({ '영역': '교과' }).area, 'class', '교과 → class');
  eq(one({ '영역': '기타' }).area, 'admin', '모르는 영역은 행정');
  eq(one({ '중요도': '높음' }).priority, 1, '높음 → 1');
  eq(one({ '중요도': '낮음' }).priority, 3, '낮음 → 3');
  eq(one({}).priority, 2, '비면 보통 2');
  ok(!('due' in one({})), '★마감 없으면 키 자체가 없다 (null 을 넣지 않는다)');
  eq(one({ '마감일': 'September 4, 2026' }).due, '2026-09-04', '마감 들어감');
  ok(!('due' in one({ '마감일': '언젠가' })), '못 읽은 마감은 넣지 않는다');

  // 체크포인트
  const ck = one({ '체크포인트': 'NEIS 추출, 표 만들기 ,결재' }).checks;
  eq(Object.keys(ck).length, 3, '체크 3개로 쪼갬');
  eq(ck.c1.text, 'NEIS 추출', '체크 문구');
  eq(ck.c3.text, '결재', '앞뒤 공백 턴 문구');
  eq(ck.c2.order, 2, 'order 는 1부터');
  eq(ck.c1.done, false, '대기면 체크는 안 찍힘');
  eq(ck.c1.by, null, 'by null');
  const ckd = one({ '상태': '완료', '체크포인트': 'a,b' }).checks;
  eq(ckd.c1.done, true, '★완료 항목의 체크는 다 찍힌 것으로');
  eq(ckd.c1.by, 'me', '찍은 이는 교사');
  ok(!('checks' in one({})), '체크포인트가 비면 checks 자체가 없다');
  eq(Object.keys(one({ '체크포인트': ' , , ' }).checks || {}).length, 0, '쉼표뿐이면 체크 없음');

  // 경고
  const warnOf = (o) => R(o).warn.join(' | ');
  ok(/못 읽었다/.test(warnOf({ '마감일': '언젠가' })), '못 읽은 마감을 경고한다');
  ok(/모른다/.test(warnOf({ '영역': '기타' })), '모르는 영역을 경고한다');
  ok(/모른다/.test(warnOf({ '상태': '???' })), '모르는 상태를 경고한다');
  ok(/비어 있다/.test(warnOf({ '영역': '' })), '빈 영역을 경고한다');
  const empty = C.rowsToTasks([{ '업무': '', '상태': '대기' }], NOW);
  eq(Object.keys(empty.tasks).length, 0, '★제목 없는 행은 넣지 않는다');
  ok(/제목이 비어 있다/.test(empty.warn.join(' ')), '제목 없는 행을 경고한다');

  // 같은 제목
  const dup = C.rowsToTasks([{ '업무': '같은 것', '최종 편집 일시': 'September 1, 2026' },
                             { '업무': '같은 것', '최종 편집 일시': 'September 1, 2026' }], NOW);
  eq(Object.keys(dup.tasks).length, 2, '★제목이 같아도 둘 다 넣는다(id 가 겹치면 안 된다)');
  ok(/제목이 같다/.test(dup.warn.join(' ')), '같은 제목을 경고한다');

  // id
  const ids = Object.keys(C.rowsToTasks(
    Array.from({ length: 40 }, (_, i) => ({ '업무': 't' + i, '최종 편집 일시': 'September 1, 2026' })), NOW).tasks);
  eq(ids.length, 40, '40행이면 40개');
  eq(new Set(ids).size, 40, '★id 가 겹치지 않는다');
  eq(new Set(ids.map(x => x.slice(-3))).size, 40, '★뒤 3자(화면·>id 에 쓰는 것)도 겹치지 않는다');
  ok(ids.every(x => /^\d{6}[0-9a-z]{3}$/.test(x)), 'id 는 yymmdd + 3자');
  ok(ids.every(x => x.slice(0, 6) === '260901'), 'id 앞부분은 최종 편집일');

  // 두 번 돌려도 같은 결과 — 다시 넣을 때 겹치는지 알 수 있어야 한다
  const rows = [{ '업무': 'a', '최종 편집 일시': 'September 1, 2026' }, { '업무': 'b', '최종 편집 일시': 'September 2, 2026' }];
  eq(Object.keys(C.rowsToTasks(rows, NOW).tasks).sort(), Object.keys(C.rowsToTasks(rows, 99).tasks).sort(),
     '★같은 CSV 는 늘 같은 id 를 낸다(now 가 달라도)');
}

sec('[4] 표 자체가 어긋나지 않았는가');
{
  eq(C.AREA, { 행정: 'admin', 행사: 'event', 교과: 'class' }, '영역 표 3칸');
  eq(Object.values(C.STATUS).filter((v, i, a) => a.indexOf(v) === i).sort(), ['doing', 'done', 'dropped', 'todo'], '상태는 네 값뿐');
  eq(C.PRIO, { 높음: 1, 보통: 2, 낮음: 3 }, '중요도 표');
}

console.log('결과: ' + pass + ' 통과, ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
