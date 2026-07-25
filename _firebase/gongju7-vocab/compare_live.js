/* 로컬 규칙 파일이 라이브(콘솔)와 같은지 대조한다.
 *
 * 왜 필요한가:
 *   규칙을 콘솔에서 직접 고치면 로컬 파일이 뒤처진다. 그 상태로 배포하면
 *   콘솔에서 한 수정이 조용히 되돌아간다. 배포 전 이 대조를 반드시 할 것.
 *
 * 쓰는 법:
 *   1) 콘솔 → Realtime Database → 규칙 탭에서 내용 전체 복사
 *        https://console.firebase.google.com/project/gongju7-vocab/database/gongju7-vocab-default-rtdb/rules
 *   2) 이 폴더에 live.json 으로 붙여넣어 저장
 *   3) node compare_live.js
 *
 * 주석·들여쓰기·키 순서 차이는 무시하고 '규칙의 의미'만 비교한다.
 */
const fs = require('fs');
const path = require('path');

const LOCAL = path.join(__dirname, 'database.rules.json');
const LIVE  = path.join(__dirname, 'live.json');

/* RTDB 규칙은 // 주석을 허용한다 — JSON.parse 전에 걷어낸다(문자열 안의 // 는 보존) */
function readRules(p) {
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/"(?:[^"\\]|\\.)*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
                m => (m[0] === '"' ? m : ''));
  return JSON.parse(s);
}

/* 키 순서를 없애 의미만 남긴다 */
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = canon(v[k]);
    return out;
  }
  return v;
}

/* 두 규칙 트리를 훑어 경로별 차이를 낸다 */
function walk(a, b, at, diffs) {
  const keys = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].sort();
  for (const k of keys) {
    const here = at ? at + '/' + k : k;
    const av = a ? a[k] : undefined;
    const bv = b ? b[k] : undefined;
    const objA = av && typeof av === 'object' && !Array.isArray(av);
    const objB = bv && typeof bv === 'object' && !Array.isArray(bv);
    if (objA && objB) { walk(av, bv, here, diffs); continue; }
    if (JSON.stringify(av) !== JSON.stringify(bv)) {
      diffs.push({ path: here, local: av, live: bv });
    }
  }
}

if (!fs.existsSync(LIVE)) {
  console.log('live.json 이 없습니다.');
  console.log('콘솔 규칙 탭의 내용을 복사해 이 폴더에 live.json 으로 저장한 뒤 다시 실행하세요.');
  console.log('  https://console.firebase.google.com/project/gongju7-vocab/database/gongju7-vocab-default-rtdb/rules');
  process.exit(2);
}

let local, live;
try { local = canon(readRules(LOCAL)); }
catch (e) { console.log('로컬 파일 파싱 실패:', e.message); process.exit(1); }
try { live = canon(readRules(LIVE)); }
catch (e) { console.log('live.json 파싱 실패:', e.message, '\n(규칙 전체를 빠짐없이 붙여넣었는지 확인)'); process.exit(1); }

const diffs = [];
walk(local.rules || local, live.rules || live, '', diffs);

if (diffs.length === 0) {
  console.log('✅ 로컬 == 라이브 — 배포해도 안전합니다.');
  process.exit(0);
}

console.log('★ 차이 ' + diffs.length + '건 — 이대로 배포하면 라이브가 로컬로 덮어써집니다.\n');
for (const d of diffs) {
  console.log('  ' + d.path);
  console.log('    로컬 : ' + JSON.stringify(d.local));
  console.log('    라이브: ' + JSON.stringify(d.live));
}
console.log('\n판단:');
console.log('  · 라이브 쪽이 맞다  → live.json 을 database.rules.json 으로 덮어쓴 뒤 커밋');
console.log('  · 로컬 쪽이 맞다    → 배포:  npx -y firebase-tools deploy --only database');
process.exit(1);
