#!/usr/bin/env node
/* 업무판 CLI — task_management/_cli.js
 *
 * M3 판. 두 자격이 있다 — 봇 B(이메일/비번 → idToken → REST)와 소유자(firebase CLI OAuth).
 * ★봇 비밀은 홈 폴더 `%USERPROFILE%\.config\taskboard\bot.json` 한 곳에만 둔다. USB(이 레포)에는 없다.
 * ★출력에 URL·토큰·비밀번호를 절대 싣지 않는다 — RTDB URL 에는 ?auth= 가 붙어 있다.
 *   node _cli.js backup                  — 라이브를 두 곳에 받아 둔다
 *   node _cli.js import <csv> [--write]  — 노션 CSV 이사. --write 없으면 미리보기만
 *   node _cli.js restore <file> [--yes]  — 스냅샷으로 되돌린다. diff 먼저
 *
 * review-*·apply·check-note 는 M4·M5 에서 붙는다.
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
// 「버림」은 2026-09-10 에 폐지했다 — 노션의 「취소」는 갈 곳이 없어 경고를 내고 대기로 들어간다.
const STATUS = { 대기: 'todo', 진행: 'doing', 완료: 'done', 보류: 'todo' };
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

/* ── 봇 B (M3) — 이메일/비번 → idToken(1h) → RTDB REST `?auth=` ─────────
 * ★비밀은 USB(이 레포)에 두지 않는다. 홈 폴더 한 곳뿐이다:
 *     %USERPROFILE%\.config\taskboard\bot.json
 * ★오류에도 URL·토큰·비밀번호를 찍지 않는다(URL 에 ?auth= 가 붙어 있다).
 * 봇이 할 수 있는 일은 서버 규칙이 정한다(database.rules.json · PRD §6) —
 * 제목 고치기·교사 체크의 text 바꾸기·reviewReq 켜기는 규칙이 막는다. */
const BOT_DIR = path.join(process.env.USERPROFILE || process.env.HOME || HERE, '.config', 'taskboard');
const BOT_FILE = path.join(BOT_DIR, 'bot.json');

let CFG = null;
function cfg() {                                  // 공개 전제 값 — web/index.html 의 CONFIG 마커가 정본
  if (CFG) return CFG;
  const src = fs.readFileSync(path.join(HERE, 'web', 'index.html'), 'utf8');
  const i = src.indexOf('/*CONFIG-START*/'), j = src.indexOf('/*CONFIG-END*/');
  if (i < 0 || j < i) throw new Error('web/index.html 에서 CONFIG 마커를 못 찾았다');
  const blk = src.slice(i, j);
  const pick = k => (blk.match(new RegExp(k + ':\\s*"([^"]+)"')) || [])[1];
  const apiKey = pick('apiKey'), databaseURL = pick('databaseURL');
  if (!apiKey || !databaseURL) throw new Error('CONFIG 마커에서 apiKey·databaseURL 을 못 읽었다');
  return (CFG = { apiKey, databaseURL });
}

let PARSER = null;
function parser() {                               // 파서는 한 벌 — 앱의 PARSE·GROUP 마커를 그대로 읽는다
  if (PARSER) return PARSER;
  const vm = require('vm');
  const src = fs.readFileSync(path.join(HERE, 'web', 'index.html'), 'utf8');
  const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b); return (i >= 0 && j > i) ? src.slice(i + a.length, j) : null; };
  const P = cut('/*PARSE-START*/', '/*PARSE-END*/'), G = cut('/*GROUP-START*/', '/*GROUP-END*/');
  if (!P || !G) throw new Error('web/index.html 에서 PARSE·GROUP 마커를 못 찾았다');
  const S = { Math, JSON, Object, Array, String, Number, Date, RegExp, console };
  vm.createContext(S);
  vm.runInContext(P + '\n' + G, S);
  return (PARSER = S);
}

function botCreds() {
  if (!fs.existsSync(BOT_FILE)) throw new Error('봇 자격이 없다 — 먼저 `node _cli.js setup` 을 한 번 돌린다');
  const c = JSON.parse(fs.readFileSync(BOT_FILE, 'utf8'));
  if (!c.email || !c.password) throw new Error('bot.json 이 비어 있다 — `node _cli.js setup` 을 다시');
  return c;
}

function saveCreds(email, password) {
  fs.mkdirSync(BOT_DIR, { recursive: true });
  fs.writeFileSync(BOT_FILE, JSON.stringify({ email, password }, null, 2), { mode: 0o600 });
  try { fs.chmodSync(BOT_FILE, 0o600); } catch (e) {}
  console.log('봇 자격을 저장했다 — ' + BOT_FILE.replace(process.env.USERPROFILE || '', '%USERPROFILE%'));
  console.log('(이 파일은 USB 가 아니라 이 PC 홈 폴더에만 있다. 다른 PC 에서는 setup 을 다시 돌린다.)');
}

// 학교망이 TLS 를 가로채면 인증서 검사가 깨진다. ★그럴 때만 한 번 내리고, 내렸다는 것을 알린다.
const TLS_ERR = /certificate|self[- ]signed|UNABLE_TO_VERIFY|DEPTH_ZERO|altnames/i;
let tlsWarned = false;
async function fetchOnce(url, init) {
  try {
    return await fetch(url, init);
  } catch (e) {
    const why = String((e && e.cause && e.cause.code) || (e && e.message) || '');
    if (!TLS_ERR.test(why) || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw e;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    if (!tlsWarned) { tlsWarned = true; console.error('(학교망이 인증서를 가로챈다 — 이번 실행만 검사를 끈다)'); }
    return await fetch(url, init);
  }
}

let TOKEN = null;
async function botToken() {
  if (TOKEN) return TOKEN;
  const { email, password } = botCreds();
  const r = await fetchOnce('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + cfg().apiKey,
    { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('봇 로그인 실패 — ' + ((j.error && j.error.message) || r.status));
  return (TOKEN = j.idToken);
}

async function rest(method, sub, body) {
  const tok = await botToken();
  const url = cfg().databaseURL + '/' + ROOT + (sub ? '/' + sub : '') + '.json?auth=' + encodeURIComponent(tok);
  const r = await fetchOnce(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  if (!r.ok) {                                          // ★URL 을 그대로 찍으면 토큰이 샌다
    let why = text;
    try { why = JSON.parse(text).error || text; } catch (e) {}
    throw new Error('RTDB ' + method + ' ' + (sub || '/') + ' → ' + r.status + ' ' + String(why).slice(0, 120));
  }
  return text && text !== 'null' ? JSON.parse(text) : null;
}

const botGet = sub => rest('GET', sub);
const botPatch = (sub, obj) => rest('PATCH', sub, obj);   // 다중 경로 update — 원자적이다

function pushKey(ts) { return ts.toString(36) + Math.random().toString(36).slice(2, 6); }
function logRow(map, id, field, from, to, ts) {          // 규칙: 봇은 by:claude · via:bot 로만 쓴다
  map['log/' + pushKey(ts)] = { task: id, field, from: from === undefined ? null : from,
                                to: to === undefined ? null : to, by: 'claude', via: 'bot', ts };
}
function findTask(tasks, key) {
  const ids = Object.keys(tasks || {});
  const hit = ids.filter(id => id === key || id.slice(-3) === key);
  if (!hit.length) throw new Error('그런 id 가 없다 — ' + key);
  if (hit.length > 1) throw new Error('id 뒤 3자가 겹친다(' + hit.join(', ') + ') — 전체 id 로');
  return hit[0];
}
function dday(due, today) {
  if (!due) return '';
  const n = Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
  return n === 0 ? 'D-day' : n > 0 ? 'D-' + n : 'D+' + -n;
}
function ymd(ms) { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function pad(s, n) {                                      // 한글은 두 칸으로 센다
  s = String(s == null ? '' : s);
  let w = 0, out = '';
  for (const ch of s) { const cw = ch.charCodeAt(0) > 0x1100 ? 2 : 1; if (w + cw > n) break; out += ch; w += cw; }
  return out + ' '.repeat(Math.max(0, n - w));
}

const KO_STATUS = { todo: '대기', doing: '진행', done: '완료' };
const KO_AREA = { admin: '행정', event: '행사', class: '교과' };
const KO_PRI = { 1: '높', 2: '  ', 3: '낮' };

async function pull(asJson, fromFile) {
  const d = fromFile ? JSON.parse(fs.readFileSync(fromFile, 'utf8')) : await botGet('');
  const tasks = (d && d.tasks) || {};
  if (asJson) { console.log(JSON.stringify(d, null, 2)); return; }
  const S = parser();
  const today = ymd(Date.now()), now = Date.now();
  const all = S.sortAll(tasks).filter(t => t.ok !== false);
  const hidden = S.taskList(tasks).length - all.length;
  const open = all.filter(t => t.status === 'todo' || t.status === 'doing');
  const shut = all.filter(t => t.status === 'done')
                  .sort((a, b) => (b.doneAt || b.updatedAt || 0) - (a.doneAt || a.updatedAt || 0));
  const rows = open.concat(shut);                       // 열린 것이 위 — 표를 세로로 훑는 순서다
  const late = open.filter(t => t.due && t.due < today);
  console.log('업무판 ' + today + (fromFile ? ' (스냅샷 ' + path.basename(fromFile) + ')' : '') +
              ' · ' + rows.length + '개 · 열림 ' + open.length + ' · 지남 ' + late.length +
              (hidden ? ' · 제안 ' + hidden : ''));
  console.log(' id  상태 중 마감        영역 ☑    묵힘  제목');
  let cut = false;
  for (const t of rows) {
    if (!cut && t.status === 'done') { cut = true; console.log('  ─ 완료 ' + shut.length + ' ─'); }
    const ck = Object.keys(t.checks || {});
    const ckn = ck.length ? ck.filter(k => t.checks[k].done).length + '/' + ck.length : '   ';
    const stale = Math.round((now - (t.updatedAt || now)) / 86400000);
    // 완료한 것에 디데이는 뜻이 없다 — 완료일을, 없으면 마감일만
    const when = t.status === 'done'
      ? (t.doneAt ? '✓' + ymd(t.doneAt).slice(5) : (t.due ? ' ' + t.due.slice(5) : ''))
      : (t.due ? t.due.slice(5) + '(' + dday(t.due, today) + ')' : '');
    console.log(' ' + t.id.slice(-3) + ' ' + KO_STATUS[t.status] + ' ' + KO_PRI[t.priority] + ' ' +
      pad(when, 12) + KO_AREA[t.area] + ' ' + ckn + ' ' +
      String(t.status === 'done' ? '' : stale + '일').padStart(5) + '  ' + t.title);
  }
  if (d && d.meta && d.meta.reviewReq) console.log('\n★폰에서 「검토 요청」이 켜져 있다.');
}

async function addTask(line) {
  if (!line) throw new Error('무엇을 넣을지 적어야 한다 — node _cli.js add "제목 @내일 #행"');
  const S = parser();
  const d = await botGet('');
  const pr = S.parse(line, 'admin', ymd(Date.now()), (d && d.tasks) || {});
  if (pr.fallback) throw new Error('제목이 없다 — 토큰만으로는 만들지 않는다');
  if (pr.editId) throw new Error('`>id 수정` 은 봇 경로에 없다 — 교사가 앱에서 고친다');
  const ts = Date.now();
  const id = ymd(ts).replace(/-/g, '').slice(2) + Math.random().toString(36).slice(2, 5).padEnd(3, '0');
  // 규칙이 정한 대로만 태어난다 — createdBy:claude · ok:false · status:todo
  const t = { title: pr.title, status: 'todo', area: pr.area, priority: pr.priority,
              createdBy: 'claude', ok: false, createdAt: ts, updatedAt: ts, doneAt: null };
  if (pr.due) t.due = pr.due;
  if (pr.memo) t.memo = pr.memo;
  if (pr.checks.length) { t.checks = {}; pr.checks.forEach((text, i) => { t.checks['c' + pushKey(ts + i)] = { text, done: false, by: 'claude', ts: null, order: i + 1 }; }); }
  const map = { ['tasks/' + id]: t };
  logRow(map, id, 'create', null, pr.title, ts);
  await botPatch('', map);
  console.log('제안했다 ' + id.slice(-3) + ' — ' + pr.title + '  (교사가 앱에서 받아들이기 전까지 목록에 안 뜬다)');
}

async function note(key, text) {
  if (!text) throw new Error('한마디를 적어야 한다 — node _cli.js note <id> "…"');
  const tasks = await botGet('tasks');
  const id = findTask(tasks, key);
  await botPatch('tasks/' + id + '/claude', { text, ts: Date.now() });
  console.log('한마디를 남겼다 ' + id.slice(-3));
}

async function check(key, name, undo) {
  if (!name) throw new Error('어느 체크인지 적어야 한다 — node _cli.js check <id> 배포');
  const tasks = await botGet('tasks');
  const id = findTask(tasks, key);
  const cks = (tasks[id] || {}).checks || {};
  const hit = Object.keys(cks).filter(c => cks[c].text === name);
  const loose = hit.length ? hit : Object.keys(cks).filter(c => cks[c].text.indexOf(name) >= 0);
  if (!loose.length) throw new Error('그런 체크가 없다 — ' + name + ' (있는 것: ' + Object.keys(cks).map(c => cks[c].text).join(', ') + ')');
  if (loose.length > 1) throw new Error('체크 이름이 겹친다 — ' + loose.map(c => cks[c].text).join(', '));
  const cid = loose[0], ts = Date.now(), done = !undo;
  // 규칙: 봇은 text 를 못 바꾼다. done·by·ts 만.
  const map = { ['tasks/' + id + '/checks/' + cid]: { text: cks[cid].text, order: cks[cid].order || 1, done, by: 'claude', ts: done ? ts : null },
                ['tasks/' + id + '/updatedAt']: ts };
  logRow(map, id, 'checks/' + cid + '/done', !done, done, ts);
  await botPatch('', map);
  console.log((done ? '체크했다 ' : '체크를 풀었다 ') + id.slice(-3) + ' · ' + cks[cid].text);
}

async function doneTask(key) {
  const tasks = await botGet('tasks');
  const id = findTask(tasks, key);
  const t = tasks[id];
  if (t.status === 'done') { console.log('이미 완료다 ' + id.slice(-3)); return; }
  const ts = Date.now();
  const map = { ['tasks/' + id + '/status']: 'done', ['tasks/' + id + '/doneAt']: ts, ['tasks/' + id + '/updatedAt']: ts };
  logRow(map, id, 'status', t.status, 'done', ts);
  await botPatch('', map);
  console.log('완료로 바꿨다 ' + id.slice(-3) + ' — ' + t.title);
}

function setup() {                                        // 교사가 자기 터미널에서 한 번
  const lines = [];
  process.stdin.setEncoding('utf8');
  return new Promise(resolve => {
    process.stdout.write('봇 계정 이메일: ');
    let buf = '';
    process.stdin.on('data', chunk => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        lines.push(buf.slice(0, i).replace(/\r$/, '').trim());
        buf = buf.slice(i + 1);
        if (lines.length === 1) process.stdout.write('봇 비밀번호: ');
        if (lines.length === 2) { process.stdin.pause(); saveCreds(lines[0], lines[1]); resolve(); return; }
      }
    });
  });
}

/* ── 검사용 내보내기 — require 하면 main 을 돌리지 않는다 ─────────────── */
module.exports = { parseCsv, col, toDate, toMs, rowsToTasks, AREA, STATUS, PRIO,
                   cfg, parser, findTask, dday, pad, BOT_FILE, KO_STATUS, KO_AREA, KO_PRI };

/* ── main ─────────────────────────────────────────────────────────────── */
if (require.main === module) main().catch(e => {
  console.error('멈췄다 — ' + (e.message || e));
  process.exit(1);
});

async function main() {
const [cmd, ...rest] = process.argv.slice(2);
const flags = rest.filter(a => a.startsWith('--'));
const args = rest.filter(a => !a.startsWith('--'));
const flagVal = k => { const f = flags.find(x => x.startsWith(k + '=')); return f ? f.slice(k.length + 1) : null; };
try {
  if (cmd === 'setup') await setup();
  else if (cmd === 'pull') await pull(flags.includes('--json'), flagVal('--from'));
  else if (cmd === 'add') await addTask(args.join(' '));
  else if (cmd === 'note') await note(args[0], args.slice(1).join(' '));
  else if (cmd === 'check') await check(args[0], args.slice(1).join(' '), flags.includes('--undo'));
  else if (cmd === 'done') await doneTask(args[0]);
  else if (cmd === 'backup') backup(false);
  else if (cmd === 'import') {
    if (!args[0]) throw new Error('CSV 경로가 필요하다');
    importCsv(path.resolve(args[0]), flags.includes('--write'));
  } else if (cmd === 'restore') {
    if (!args[0]) throw new Error('스냅샷 경로가 필요하다');
    restore(path.resolve(args[0]), flags.includes('--yes'));
  } else {
    console.log(`업무판 CLI

봇 B (Claude 가 스스로 쓰는 길 · 서버 규칙이 할 수 있는 일을 정한다)
  node _cli.js setup                   봇 이메일·비번을 홈 폴더에 저장한다 (교사가 한 번)
  node _cli.js pull [--json] [--from=<스냅샷>]   판 전체를 표로 본다
  node _cli.js add "제목 @내일 #행 !"  제안으로 넣는다 (ok:false — 교사가 받아들이기 전엔 안 보인다)
  node _cli.js note <id> "한마디"      그 항목에 Claude 한마디
  node _cli.js check <id> <체크이름> [--undo]   체크를 켜고 끈다
  node _cli.js done <id>               ★교사가 「완료」라고 한 뒤에만

소유자 CLI (firebase OAuth · 규칙이 못 막는다 — 교사가 「반영」이라 한 뒤에만)
  node _cli.js backup                  라이브를 _backup/ 과 홈 폴더에 받아 둔다
  node _cli.js import <csv> [--write]  노션 CSV 이사 (없으면 미리보기)
  node _cli.js restore <file> [--yes]  스냅샷으로 되돌린다 (없으면 diff 만)

review-data·review-write·apply·check-note 는 M4·M5 에서 붙는다.`);
  }
} catch (e) {
  console.error('멈췄다 — ' + (e.message || e));
  if (e.stderr) console.error(String(e.stderr).split('\n').filter(l => l && !/Warning|^\s+at /.test(l)).slice(0, 6).join('\n'));
  process.exit(1);
}
}
