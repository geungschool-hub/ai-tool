#!/usr/bin/env node
/* 업무판 CLI — task_management/_cli.js
 *
 * M2 판. 지금 있는 명령은 소유자(firebase CLI OAuth) 경로만 쓴다.
 *   node _cli.js backup                  — 라이브를 두 곳에 받아 둔다
 *   node _cli.js import <csv> [--write]  — 노션 CSV 이사. --write 없으면 미리보기만
 *   node _cli.js restore <file> [--yes]  — 스냅샷으로 되돌린다. diff 먼저
 *
 * 봇(B) 경로 명령(pull·add·note·check·review-*·apply·done)은 M3 에서 붙는다.
 * 함정 넷 — 다 실제로 밟았다.
 *   ① database:set/update 는 -f 가 없으면 확인 프롬프트에서 죽는다.
 *   ② 리전이 us-central1 이 아니라 --instance 가 필요하다.
 *   ③ ★윈도의 firebase CLI 는 STDIN 을 안 받는다("STDIN input is not available on Windows").
 *      → 보낼 JSON 은 임시 파일에 써서 infile 로 넘긴다.
 *   ④ ★node 24 는 윈도에서 .cmd 실행을 막는다(EINVAL) → firebase.js 를 node 로 직접 부른다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const PROJECT = 'geung-taskboard';
const INSTANCE = 'geung-taskboard-default-rtdb';
const ROOT = 'tm';
const HERE = __dirname;
const BACKUP_DIR = path.join(HERE, '_backup');
const HOME_BACKUP = path.join(process.env.USERPROFILE || process.env.HOME || HERE, 'taskboard-backup');
const KEEP = 30;

const AREA = { 행정: 'admin', 행사: 'event', 교과: 'class' };
const STATUS = { 대기: 'todo', 진행: 'doing', 완료: 'done', 보류: 'todo', 취소: 'dropped' };
const PRIO = { 높음: 1, 보통: 2, 낮음: 3 };
const MONTH = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
                august: 8, september: 9, october: 10, november: 11, december: 12 };

/* ── firebase CLI ─────────────────────────────────────────────────────── */
// ★node 24 는 윈도에서 .cmd 직접 실행을 막는다(EINVAL). firebase 의 js 진입점을 node 로 직접 부른다.
let FB_JS = null;
function firebaseJs() {
  if (FB_JS) return FB_JS;
  const cands = [];
  if (process.env.APPDATA) cands.push(path.join(process.env.APPDATA, 'npm', 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js'));
  if (process.env.HOME) cands.push(path.join(process.env.HOME, '.npm-global', 'lib', 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js'));
  cands.push('/usr/local/lib/node_modules/firebase-tools/lib/bin/firebase.js');
  for (const c of cands) if (fs.existsSync(c)) return (FB_JS = c);
  throw new Error('firebase-tools 를 못 찾았다 — npm i -g firebase-tools 뒤 다시');
}
function fb(args) {
  // stdio 를 다 받는다 — 안 그러면 firebase 의 TLS·DeprecationWarning 이 그대로 새어 나온다.
  const opts = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
                 env: Object.assign({}, process.env, { NODE_TLS_REJECT_UNAUTHORIZED: '0', NODE_NO_WARNINGS: '1' }) };
  const full = [firebaseJs()].concat(args, ['--project', PROJECT, '--instance', INSTANCE]);
  try {
    return execFileSync(process.execPath, full, opts);
  } catch (e) {
    const why = String(e.stderr || '').split('\n')
      .filter(l => l.trim() && !/^\s+at |Warning:|DeprecationWarning|node:internal/.test(l))
      .map(l => l.replace(/\x1b\[[0-9;]*m/g, '').trim())[0] || ('exit ' + e.status);
    throw new Error('firebase ' + args[0] + ' — ' + why);
  }
}
// 윈도 CLI 는 STDIN 을 안 받는다 → 임시 파일로 넘기고 지운다
function withTmpJson(obj, fn) {
  const f = path.join(os.tmpdir(), 'tm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.json');
  fs.writeFileSync(f, JSON.stringify(obj), 'utf8');
  try { return fn(f); } finally { try { fs.unlinkSync(f); } catch (e) {} }
}
function dbGet(p) {
  const out = fb(['database:get', '/' + p]);
  try { return JSON.parse(out); } catch (e) { return null; }
}
function dbUpdate(p, obj) {                    // -f 없으면 확인 프롬프트에서 죽는다
  withTmpJson(obj, f => fb(['database:update', '/' + p, f, '-f']));
}
function dbSet(p, obj) {
  withTmpJson(obj, f => fb(['database:set', '/' + p, f, '-f']));
}

/* ── CSV ──────────────────────────────────────────────────────────────── */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);        // 노션은 BOM 을 붙인다(겹 방어 — 아래 trim() 도 U+FEFF 를 턴다)
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r') { /* 넘긴다 */ }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const head = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.some(v => v.trim())).map(r => {
    const o = {};
    head.forEach((h, i) => { o[h] = (r[i] === undefined ? '' : r[i]).trim(); });
    return o;
  });
}
function col(row, names) {                     // 열 이름이 조금 달라도 찾는다
  for (const n of names) {
    for (const k of Object.keys(row)) if (k.replace(/\s/g, '') === n.replace(/\s/g, '')) return row[k];
  }
  return '';
}

/* ── 날짜 ─────────────────────────────────────────────────────────────── */
function toDate(s) {   // '2026년 9월 12일' · 'September 12, 2026' · '2026/09/12' · '2026-09-12'
  s = (s || '').trim();
  if (!s) return null;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${('0' + m[2]).slice(-2)}-${('0' + m[3]).slice(-2)}`;
  m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(s);
  if (m && MONTH[m[1].toLowerCase()]) return `${m[3]}-${('0' + MONTH[m[1].toLowerCase()]).slice(-2)}-${('0' + m[2]).slice(-2)}`;
  m = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/.exec(s);   // ★노션 한국어 꺼내기
  if (m) return `${m[1]}-${('0' + m[2]).slice(-2)}-${('0' + m[3]).slice(-2)}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);                    // 미국식 M/D/YYYY
  if (m) return `${m[3]}-${('0' + m[1]).slice(-2)}-${('0' + m[2]).slice(-2)}`;
  return undefined;                            // 못 읽음 — null(마감 없음)과 구분한다
}
function toMs(s) {
  const d = toDate(s);
  if (!d) return null;
  const t = Date.parse(d + 'T12:00:00+09:00');
  return isNaN(t) ? null : t;
}
function stamp(ms) {
  const d = new Date(ms), p = n => ('0' + n).slice(-2);
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/* ── backup ───────────────────────────────────────────────────────────── */
function backup(quiet) {
  const data = dbGet(ROOT) || {};
  const name = 'tm-' + stamp(Date.now()) + '.json';
  const body = JSON.stringify(data, null, 1);
  const wrote = [];
  for (const dir of [BACKUP_DIR, HOME_BACKUP]) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, name), body, 'utf8');
      wrote.push(path.join(dir, name));
      const olds = fs.readdirSync(dir).filter(f => /^tm-\d{8}-\d{6}\.json$/.test(f)).sort();
      olds.slice(0, Math.max(0, olds.length - KEEP)).forEach(f => { try { fs.unlinkSync(path.join(dir, f)); } catch (e) {} });
    } catch (e) { console.error('  백업 못 씀: ' + dir + ' — ' + e.message); }
  }
  if (!quiet) {
    const n = Object.keys(data.tasks || {}).length;
    console.log(`백업 ${name} · 항목 ${n}개`);
    wrote.forEach(w => console.log('  ' + w));
  }
  if (!wrote.length) throw new Error('백업을 한 곳도 못 썼다 — 쓰기를 멈춘다');
  return wrote[0];
}

/* ── import ───────────────────────────────────────────────────────────── */
// 행 → 항목. 순수 함수(now 를 받는다) — 검사가 여기를 문다.
function rowsToTasks(rows, now) {
  const tasks = {}, warn = [];
  const seen = {};
  rows.forEach((r, i) => {
    const title = col(r, ['업무', '이름', 'Name', '제목']);
    if (!title) { warn.push(`${i + 2}행: 제목이 비어 있다 — 건너뜀`); return; }

    const rawDue = col(r, ['마감일', 'Due', '날짜']);
    const due = toDate(rawDue);
    if (due === undefined) warn.push(`${i + 2}행 「${title}」: 마감일 「${rawDue}」를 못 읽었다 — 마감 없음으로 둔다`);

    const rawStatus = col(r, ['상태', 'Status']);
    const status = STATUS[rawStatus] || 'todo';
    if (rawStatus && !STATUS[rawStatus]) warn.push(`${i + 2}행 「${title}」: 상태 「${rawStatus}」를 모른다 — 대기로 둔다`);

    const rawArea = col(r, ['영역', 'Area']);
    const area = AREA[rawArea] || 'admin';
    if (!rawArea) warn.push(`${i + 2}행 「${title}」: 영역이 비어 있다 — 행정으로 둔다`);
    else if (!AREA[rawArea]) warn.push(`${i + 2}행 「${title}」: 영역 「${rawArea}」를 모른다 — 행정으로 둔다`);

    const priority = PRIO[col(r, ['중요도', 'Priority'])] || 2;
    const edited = toMs(col(r, ['최종 편집 일시', 'Last edited time', '최종 편집 시간', 'Last edited'])) || now;

    const t = { title: title, status: status, area: area, priority: priority,
                createdBy: 'notion', ok: true, createdAt: edited, updatedAt: edited };
    if (due) t.due = due;
    if (status === 'done') t.doneAt = edited;

    const memo = col(r, ['메모', 'Notes', '본문']);
    if (memo) t.memo = memo;

    const cks = col(r, ['체크포인트', 'Checkpoints']).split(',').map(s => s.trim()).filter(Boolean);
    if (cks.length) {
      t.checks = {};
      cks.forEach((text, k) => {
        t.checks['c' + (k + 1)] = { text: text, done: status === 'done', by: status === 'done' ? 'me' : null,
                                    ts: status === 'done' ? edited : null, order: k + 1 };
      });
    }

    // id = 편집일 기준 yymmdd + 순번(base36). 같은 CSV 를 두 번 넣어도 같은 id 가 나온다.
    const d = new Date(edited), p = n => ('0' + n).slice(-2);
    const day = String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate());
    let n = 0, id;
    do { id = day + (i * 13 + n).toString(36).padStart(3, '0').slice(-3); n++; } while (tasks[id]);
    tasks[id] = t;

    const key = title.replace(/\s/g, '');
    if (seen[key]) warn.push(`${i + 2}행 「${title}」: ${seen[key]}행과 제목이 같다 — 둘 다 넣는다`);
    else seen[key] = i + 2;
  });

  return { tasks, warn };
}

function importCsv(file, write) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  if (!rows.length) { console.log('CSV 가 비어 있다'); return; }
  console.log(`CSV ${rows.length}행 · 열: ${Object.keys(rows[0]).join(' · ')}\n`);

  const { tasks, warn } = rowsToTasks(rows, Date.now());

  const by = k => Object.values(tasks).reduce((m, t) => (m[t[k]] = (m[t[k]] || 0) + 1, m), {});
  console.log('상태 ', JSON.stringify(by('status')));
  console.log('영역 ', JSON.stringify(by('area')));
  console.log('중요도', JSON.stringify(by('priority')));
  console.log('마감 있음', Object.values(tasks).filter(t => t.due).length, '· 체크 있음', Object.values(tasks).filter(t => t.checks).length);
  console.log('');
  Object.keys(tasks).sort().forEach(id => {
    const t = tasks[id];
    console.log(`  ${id.slice(-3)}  ${t.status.padEnd(7)} ${(t.due || '—').padEnd(11)} ${({ admin: '행정', event: '행사', class: '교과' })[t.area]} ${'!·~'[t.priority - 1]} ` +
                `${t.checks ? '☑' + Object.keys(t.checks).length + ' ' : '   '}${t.title}`);
  });
  if (warn.length) { console.log('\n⚠ 살펴볼 것 ' + warn.length + '건'); warn.forEach(w => console.log('  ' + w)); }

  if (!write) {
    console.log(`\n미리보기다. 넣으려면 --write 를 붙인다.`);
    return;
  }
  console.log('\n백업 먼저…');
  backup(true);
  const live = dbGet(ROOT) || {};
  const already = Object.values(live.tasks || {}).filter(t => t && t.createdBy === 'notion').length;
  if (already) { console.log(`이미 노션에서 온 항목이 ${already}개 있다. 겹칠 수 있으니 멈춘다 — 지우고 다시 하거나 restore 로 되돌린 뒤에.`); process.exit(1); }
  dbUpdate(ROOT + '/tasks', tasks);
  dbUpdate(ROOT + '/meta', { cutoverAt: Date.now() });
  console.log(`넣었다 — ${Object.keys(tasks).length}개.`);
}

/* ── restore ──────────────────────────────────────────────────────────── */
function restore(file, yes) {
  const snap = JSON.parse(fs.readFileSync(file, 'utf8'));
  const live = dbGet(ROOT) || {};
  const a = Object.keys(live.tasks || {}), b = Object.keys(snap.tasks || {});
  const add = b.filter(k => !a.includes(k)), del = a.filter(k => !b.includes(k));
  const chg = b.filter(k => a.includes(k) && JSON.stringify(live.tasks[k]) !== JSON.stringify(snap.tasks[k]));
  console.log(`라이브 ${a.length}개 → 스냅샷 ${b.length}개`);
  console.log(`  되살아남 ${add.length} · 사라짐 ${del.length} · 달라짐 ${chg.length}`);
  del.forEach(k => console.log(`  − ${k.slice(-3)} ${live.tasks[k].title}`));
  add.forEach(k => console.log(`  + ${k.slice(-3)} ${snap.tasks[k].title}`));
  chg.forEach(k => console.log(`  ~ ${k.slice(-3)} ${snap.tasks[k].title}`));
  if (!yes) { console.log('\n미리보기다. 되돌리려면 --yes 를 붙인다.'); return; }
  backup(true);
  dbSet(ROOT, snap);
  console.log('되돌렸다.');
}

/* ── 검사용 내보내기 — require 하면 main 을 돌리지 않는다 ─────────────── */
module.exports = { parseCsv, col, toDate, toMs, rowsToTasks, AREA, STATUS, PRIO };

/* ── main ─────────────────────────────────────────────────────────────── */
if (require.main === module) main();

function main() {
const [cmd, ...rest] = process.argv.slice(2);
const flags = rest.filter(a => a.startsWith('--'));
const args = rest.filter(a => !a.startsWith('--'));
try {
  if (cmd === 'backup') backup(false);
  else if (cmd === 'import') {
    if (!args[0]) throw new Error('CSV 경로가 필요하다');
    importCsv(path.resolve(args[0]), flags.includes('--write'));
  } else if (cmd === 'restore') {
    if (!args[0]) throw new Error('스냅샷 경로가 필요하다');
    restore(path.resolve(args[0]), flags.includes('--yes'));
  } else {
    console.log(`업무판 CLI — 지금 있는 명령

  node _cli.js backup                  라이브를 _backup/ 과 홈 폴더에 받아 둔다
  node _cli.js import <csv> [--write]  노션 CSV 이사 (없으면 미리보기)
  node _cli.js restore <file> [--yes]  스냅샷으로 되돌린다 (없으면 diff 만)

pull·add·note·check·review·apply·done 은 M3 에서 붙는다.`);
  }
} catch (e) {
  console.error('멈췄다 — ' + (e.message || e));
  if (e.stderr) console.error(String(e.stderr).split('\n').filter(l => l && !/Warning|^\s+at /.test(l)).slice(0, 6).join('\n'));
  process.exit(1);
}
}
