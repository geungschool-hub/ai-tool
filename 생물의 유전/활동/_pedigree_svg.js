// 복습 퀴즈용 가계도 SVG 생성기
// 가계도를 「데이터」로 적으면 그림을 만들어 준다 — 사람이 SVG를 손으로 쓰지 않게 해
// 「문제가 말하는 가계도」와 「그려진 가계도」가 어긋나는 사고를 원천 차단한다.
//
// 쓰는 곳: 생물의 유전 복습 퀴즈(lifescience-quiz /gen)의 문항 지문.
//   퀴즈 앱은 문항 q 를 escape 없이 innerHTML 로 넣으므로 인라인 SVG 가 그대로 그려진다.
//
// 실행: node _pedigree_svg.js          → 자체 검사 + 예시 출력

'use strict';

/* ── 가계도 데이터 규격 ──────────────────────────────────
   {
     gens: [ [ {id,sex,aff,label?}, ... ], ... ]   // 세대별 사람 목록(왼→오른쪽)
     couples: [ [id, id], ... ]                    // 부부(가로선)
     sibs: [ { p:[id,id], c:[id, ...] }, ... ]     // 부모쌍 → 자녀들
   }
   sex : 'M' 남자(네모) | 'F' 여자(동그라미)
   aff : true 형질 발현(색칠) | false 정상(흰색)
   ───────────────────────────────────────────────────── */

var COL = 74;      // 가로 간격
var ROW = 86;      // 세대 간격
var R = 17;        // 도형 반지름(네모는 한 변의 절반)
var PAD_X = 46;    // ★세대 로마숫자(Ⅰ·Ⅱ) 자리 — 좁게 잡으면 첫 사람과 겹친다(실제로 겹쳤다)
var PAD_Y = 22;

function layout(ped) {
  var pos = {};
  var maxCols = 0;
  ped.gens.forEach(function (row) { maxCols = Math.max(maxCols, row.length); });
  ped.gens.forEach(function (row, gi) {
    var width = (row.length - 1) * COL;
    var x0 = PAD_X + ((maxCols - 1) * COL - width) / 2;
    row.forEach(function (m, i) {
      pos[m.id] = { x: x0 + i * COL, y: PAD_Y + R + gi * ROW, m: m, gen: gi };
    });
  });
  return { pos: pos, w: PAD_X * 2 + (maxCols - 1) * COL, h: PAD_Y * 2 + R * 2 + (ped.gens.length - 1) * ROW };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shape(p, fill, stroke) {
  var x = p.x, y = p.y;
  if (p.m.sex === 'M') {
    return '<rect x="' + (x - R) + '" y="' + (y - R) + '" width="' + (R * 2) + '" height="' + (R * 2) +
           '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>';
  }
  return '<circle cx="' + x + '" cy="' + y + '" r="' + R + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>';
}

/* 가계도 → 인라인 SVG 문자열 */
function pedigreeSVG(ped, opts) {
  opts = opts || {};
  var affFill = opts.affFill || '#5B8FF0';      // 형질 발현 = 파랑 채움
  var line = '#4A5568';
  var L = layout(ped);
  var pos = L.pos;
  var out = [];

  // 부부 가로선
  (ped.couples || []).forEach(function (cp) {
    var a = pos[cp[0]], b = pos[cp[1]];
    if (!a || !b) throw new Error('couple 참조 오류: ' + cp);
    var x1 = Math.min(a.x, b.x) + R, x2 = Math.max(a.x, b.x) - R;
    out.push('<line x1="' + x1 + '" y1="' + a.y + '" x2="' + x2 + '" y2="' + a.y +
             '" stroke="' + line + '" stroke-width="2"/>');
  });

  // 자녀 연결선
  (ped.sibs || []).forEach(function (sb) {
    var pa = pos[sb.p[0]], pb = pos[sb.p[1]];
    if (!pa || !pb) throw new Error('sib 부모 참조 오류: ' + sb.p);
    var mx = (pa.x + pb.x) / 2;
    var midY = pa.y + ROW / 2;
    out.push('<line x1="' + mx + '" y1="' + pa.y + '" x2="' + mx + '" y2="' + midY +
             '" stroke="' + line + '" stroke-width="2"/>');
    var xs = sb.c.map(function (id) {
      if (!pos[id]) throw new Error('sib 자녀 참조 오류: ' + id);
      return pos[id].x;
    });
    out.push('<line x1="' + Math.min.apply(null, xs) + '" y1="' + midY + '" x2="' + Math.max.apply(null, xs) +
             '" y2="' + midY + '" stroke="' + line + '" stroke-width="2"/>');
    xs.forEach(function (x, i) {
      var cy = pos[sb.c[i]].y;
      out.push('<line x1="' + x + '" y1="' + midY + '" x2="' + x + '" y2="' + (cy - R) +
               '" stroke="' + line + '" stroke-width="2"/>');
    });
  });

  // 사람 + 번호
  ped.gens.forEach(function (row) {
    row.forEach(function (m) {
      var p = pos[m.id];
      out.push(shape(p, m.aff ? affFill : '#FFFFFF', line));
      out.push('<text x="' + p.x + '" y="' + (p.y + R + 15) + '" text-anchor="middle" font-size="13" ' +
               'font-weight="700" fill="#2D3748">' + esc(m.label || m.id) + '</text>');
    });
  });

  // 세대 로마숫자
  var ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'];
  ped.gens.forEach(function (row, gi) {
    out.push('<text x="12" y="' + (PAD_Y + R + gi * ROW + 5) + '" font-size="14" font-weight="700" fill="#A0AEC0">' +
             ROMAN[gi] + '</text>');
  });

  var h = L.h + 12;
  return '<svg viewBox="0 0 ' + L.w + ' ' + h + '" style="width:100%;max-width:' +
         (opts.maxWidth || 330) + 'px;height:auto;display:block;margin:10px auto 4px;" ' +
         'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(opts.alt || '가계도') + '">' +
         out.join('') + '</svg>';
}

/* 범례 — 문항마다 붙이면 길어지므로 필요한 문항에만 */
function legendHTML(affName) {
  return '<div style="font-size:13.5px;color:#4A5568;text-align:center;margin-bottom:6px;">' +
         '<span style="display:inline-block;width:13px;height:13px;border:2px solid #4A5568;background:#fff;vertical-align:-2px;"></span> 정상 남자 · ' +
         '<span style="display:inline-block;width:13px;height:13px;border:2px solid #4A5568;border-radius:50%;background:#fff;vertical-align:-2px;"></span> 정상 여자 · ' +
         '<span style="display:inline-block;width:13px;height:13px;border:2px solid #4A5568;background:#5B8FF0;vertical-align:-2px;"></span>' +
         '<span style="display:inline-block;width:13px;height:13px;border:2px solid #4A5568;border-radius:50%;background:#5B8FF0;vertical-align:-2px;"></span> ' +
         esc(affName) + '</div>';
}

/* ── 가계도 구조를 규칙으로 검증(그림과 문제가 어긋나는 것을 막는다) ── */
function checkPedigree(ped) {
  var ids = {};
  ped.gens.forEach(function (row, gi) {
    row.forEach(function (m) {
      /* ★`if (ids[m.id])` 로 쓰면 안 된다 — 0세대의 gi 가 0(falsy)이라 중복이 통과된다(자체 검사가 잡았다) */
      if (m.id in ids) throw new Error('id 중복: ' + m.id);
      if (m.sex !== 'M' && m.sex !== 'F') throw new Error('sex 오류: ' + m.id);
      ids[m.id] = gi;
    });
  });
  (ped.couples || []).forEach(function (cp) {
    if (!(cp[0] in ids) || !(cp[1] in ids)) throw new Error('couple 미존재: ' + cp);
    if (ids[cp[0]] !== ids[cp[1]]) throw new Error('부부가 다른 세대: ' + cp);
    var a = findMember(ped, cp[0]), b = findMember(ped, cp[1]);
    if (a.sex === b.sex) throw new Error('부부 성별이 같다: ' + cp);
  });
  (ped.sibs || []).forEach(function (sb) {
    if (!(sb.p[0] in ids) || !(sb.p[1] in ids)) throw new Error('sib 부모 미존재: ' + sb.p);
    var ok = (ped.couples || []).some(function (cp) {
      return (cp[0] === sb.p[0] && cp[1] === sb.p[1]) || (cp[1] === sb.p[0] && cp[0] === sb.p[1]);
    });
    if (!ok) throw new Error('sib 부모가 couple 에 없다: ' + sb.p);
    sb.c.forEach(function (c) {
      if (!(c in ids)) throw new Error('sib 자녀 미존재: ' + c);
      if (ids[c] !== ids[sb.p[0]] + 1) throw new Error('자녀가 부모 바로 아래 세대가 아니다: ' + c);
    });
  });
  return true;
}

function findMember(ped, id) {
  for (var i = 0; i < ped.gens.length; i++) {
    for (var j = 0; j < ped.gens[i].length; j++) {
      if (ped.gens[i][j].id === id) return ped.gens[i][j];
    }
  }
  return null;
}

/* 부모 찾기 — 정답 검산에 쓴다 */
function parentsOf(ped, id) {
  var found = null;
  (ped.sibs || []).forEach(function (sb) {
    if (sb.c.indexOf(id) >= 0) {
      var a = findMember(ped, sb.p[0]), b = findMember(ped, sb.p[1]);
      found = { father: a.sex === 'M' ? a : b, mother: a.sex === 'F' ? a : b };
    }
  });
  return found;
}

/* ── 「정상 부모 × 정상 부모 → 형질 자녀」가 있으면 그 형질은 열성이다 ── */
function impliesRecessive(ped) {
  var hit = null;
  (ped.sibs || []).forEach(function (sb) {
    var pa = findMember(ped, sb.p[0]), pb = findMember(ped, sb.p[1]);
    if (pa.aff || pb.aff) return;
    sb.c.forEach(function (c) {
      var m = findMember(ped, c);
      if (m.aff) hit = { parents: [pa.id, pb.id], child: c };
    });
  });
  return hit;
}

/* ── 「정상 아버지 × 형질 딸」이 있으면 X염색체 열성이 아니다(= 상염색체) ── */
function excludesXLinkedRecessive(ped) {
  var hit = null;
  (ped.gens || []).forEach(function (row) {
    row.forEach(function (m) {
      if (m.sex !== 'F' || !m.aff) return;
      var par = parentsOf(ped, m.id);
      if (par && !par.father.aff) hit = { daughter: m.id, father: par.father.id };
    });
  });
  return hit;
}

module.exports = {
  pedigreeSVG: pedigreeSVG, legendHTML: legendHTML, checkPedigree: checkPedigree,
  findMember: findMember, parentsOf: parentsOf,
  impliesRecessive: impliesRecessive, excludesXLinkedRecessive: excludesXLinkedRecessive,
  COL: COL, ROW: ROW, R: R
};

/* ── 자체 검사 ── */
if (require.main === module) {
  var pass = 0, fail = 0;
  function ok(c, n) { if (c) pass++; else { fail++; console.error('  X ' + n); } }

  // 정상 × 정상 → 형질 딸  (열성이며, 아버지가 정상인데 딸이 형질이므로 상염색체)
  var P = {
    gens: [
      [{ id: '1', sex: 'M', aff: false }, { id: '2', sex: 'F', aff: false }],
      [{ id: '3', sex: 'M', aff: false }, { id: '4', sex: 'F', aff: true }, { id: '5', sex: 'M', aff: true }]
    ],
    couples: [['1', '2']],
    sibs: [{ p: ['1', '2'], c: ['3', '4', '5'] }]
  };
  ok(checkPedigree(P) === true, '구조 검증 통과');
  var rec = impliesRecessive(P);
  ok(rec && rec.child === '4' || rec.child === '5', '정상×정상→형질 자녀 검출(열성 근거)');
  var xr = excludesXLinkedRecessive(P);
  ok(xr && xr.daughter === '4' && xr.father === '1', '정상 아버지의 형질 딸 검출(X 열성 배제)');

  var svg = pedigreeSVG(P, { alt: '자체 검사용 가계도' });
  ok(/^<svg /.test(svg) && /<\/svg>$/.test(svg), 'SVG 문자열 생성');
  ok((svg.match(/<rect /g) || []).length === 3, '남자 3명이 네모로');
  ok((svg.match(/<circle /g) || []).length === 2, '여자 2명이 원으로');
  ok((svg.match(/fill="#5B8FF0"/g) || []).length === 2, '형질 발현 2명만 색칠');
  ok(svg.indexOf('viewBox') >= 0 && svg.indexOf('max-width') >= 0, '반응형 속성 포함');
  ok(!/script|onload|href/i.test(svg), '스크립트·외부 참조 없음');

  // ★세대 로마숫자가 첫 사람 도형과 겹치지 않는다 (실제로 겹쳐서 고친 자리)
  var firstLeft = PAD_X - R;
  ok(firstLeft >= 26, '세대 표시 자리 확보 (첫 도형 왼쪽 끝 ' + firstLeft + 'px)');

  // 잘못된 데이터는 반드시 막는다
  function throws(fn, name) {
    try { fn(); fail++; console.error('  X ' + name + ' (막지 못했다)'); }
    catch (e) { pass++; }
  }
  throws(function () {
    checkPedigree({ gens: [[{ id: 'a', sex: 'M', aff: false }, { id: 'a', sex: 'F', aff: false }]], couples: [], sibs: [] });
  }, 'id 중복 차단');
  throws(function () {
    checkPedigree({ gens: [[{ id: 'a', sex: 'M', aff: false }, { id: 'b', sex: 'M', aff: false }]], couples: [['a', 'b']], sibs: [] });
  }, '동성 부부 차단');
  throws(function () {
    checkPedigree({
      gens: [[{ id: 'a', sex: 'M', aff: false }, { id: 'b', sex: 'F', aff: false }], [{ id: 'c', sex: 'M', aff: false }]],
      couples: [], sibs: [{ p: ['a', 'b'], c: ['c'] }]
    });
  }, 'couple 없는 부모 차단');

  console.log('');
  console.log('결과: ' + pass + ' 통과, ' + fail + ' 실패');
  if (!fail) {
    console.log('');
    console.log('예시 SVG 길이: ' + svg.length + '자');
  }
  process.exit(fail ? 1 : 0);
}
