#!/usr/bin/env node
/* 규칙 두드리기 — task_management/_rules_probe.js
 *
 *   node _rules_probe.js            (읽기·거부만 · 라이브를 안 건드린다)
 *   node _rules_probe.js --write    (봇이 허락받은 쓰기까지 해 보고 되돌린다)
 *
 * ★검사(_test_*.js)가 통과해도 규칙은 라이브를 두드려 봐야 안다 — M2-f 에서 실제로 당했다
 *   (`log` 가 덧붙이기 전용이라 되돌리기·삭제가 통째로 반려되고 있었는데 아무도 몰랐다).
 * 봇 자격은 `%USERPROFILE%\.config\taskboard\bot.json` 에서 읽는다. 이 파일에 비밀은 없다.
 */
'use strict';
const path = require('path');
const C = require('./_cli.js');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');

const WRITE = process.argv.includes('--write');
const ROOT = 'tm';
let pass = 0, fail = 0;

function mark(okd, name, detail) {
  if (okd) { pass++; console.log('  OK   ' + name); }
  else { fail++; console.log('  ★    ' + name + (detail ? '  — ' + detail : '')); }
}

/* 봇 토큰 — _cli.js 와 같은 길 */
async function token() {
  const creds = JSON.parse(fs.readFileSync(C.BOT_FILE, 'utf8'));
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + C.cfg().apiKey,
    { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.password, returnSecureToken: true }) });
  const j = await r.json();
  if (!r.ok) throw new Error('봇 로그인 실패 — ' + ((j.error && j.error.message) || r.status));
  return j.idToken;
}

let TOK = null;
async function req(method, sub, body) {                 // ★URL 은 절대 찍지 않는다(?auth= 가 붙는다)
  const url = C.cfg().databaseURL + '/' + ROOT + (sub ? '/' + sub : '') + '.json?auth=' + encodeURIComponent(TOK);
  const r = await fetch(url, { method, headers: body === undefined ? undefined : { 'content-type': 'application/json' },
                               body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  return { status: r.status, ok: r.ok, body: text };
}

/* 되돌리기·치우기는 소유자 CLI 로 — 봇은 지울 권한이 없다(그게 규칙이다) */
function ownerDelete(sub) {
  const FB = path.join(process.env.APPDATA, 'npm', 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
  const tmp = path.join(os.tmpdir(), 'probe-clean.json');
  fs.writeFileSync(tmp, JSON.stringify({ [sub]: null }));
  execFileSync(process.execPath, [FB, 'database:update', '/' + ROOT, tmp, '-f',
    '--project', 'geung-taskboard', '--instance', 'geung-taskboard-default-rtdb'],
    { encoding: 'utf8', env: Object.assign({}, process.env, { NODE_NO_WARNINGS: '1' }), stdio: 'pipe' });
  fs.unlinkSync(tmp);
}

(async () => {
  TOK = await token();

  console.log('\n[1] 봇이 할 수 있어야 하는 것');
  const all = await req('GET', '');
  mark(all.ok, '판 전체 읽기');
  const d = all.ok ? JSON.parse(all.body) : { tasks: {} };
  const tasks = d.tasks || {};
  const anyId = Object.keys(tasks)[0];
  const ckId = Object.keys(tasks).find(k => tasks[k].checks && Object.keys(tasks[k].checks).length);

  console.log('\n[2] 규칙이 막아야 하는 것 — 막히면 OK');
  const denied = r => r.status === 401 || r.status === 403;

  let r;
  r = await req('PATCH', 'tasks/' + anyId, { title: '봇이 제목을 바꿔 본다' });
  mark(denied(r), '봇은 제목을 못 바꾼다', 'status ' + r.status);

  r = await req('PATCH', 'tasks/' + anyId, { status: 'doing' });
  mark(denied(r), '봇의 status 쓰기는 done 값에만 열린다(doing 은 막힌다)', 'status ' + r.status);

  r = await req('PATCH', 'meta', { reviewReq: true });
  mark(denied(r), '봇은 검토 요청을 켜지 못한다(끄기만)', 'status ' + r.status);

  if (ckId) {
    const cid = Object.keys(tasks[ckId].checks)[0];
    r = await req('PUT', 'tasks/' + ckId + '/checks/' + cid,
      { text: '봇이 바꾼 체크 이름', done: true, by: 'claude', ts: Date.now(), order: 1 });
    mark(denied(r), '봇은 교사가 적은 체크의 글자를 못 바꾼다', 'status ' + r.status);
  } else {
    console.log('  --   체크가 있는 항목이 없어 건너뜀');
  }

  const badTs = Date.now();
  r = await req('PATCH', '', { ['log/probe' + badTs]: { task: anyId, field: 'x', from: null, to: null, by: 'me', via: 'app', ts: badTs } });
  mark(denied(r), "봇은 by:'me' 로 기록을 못 남긴다", 'status ' + r.status);

  const logKey = Object.keys(d.log || {})[0];
  if (logKey) {
    r = await req('PATCH', '', { ['log/' + logKey]: null });
    mark(denied(r), '봇은 남의 기록을 못 지운다(덧붙이기 전용)', 'status ' + r.status);
  }

  r = await req('PATCH', '', { ['tasks/probe' + badTs]: { title: '봇이 몰래 만든 항목', status: 'todo', area: 'admin', priority: 2, createdBy: 'me', createdAt: badTs, ok: true } });
  mark(denied(r), "봇은 createdBy:'me' · ok:true 로 항목을 못 만든다", 'status ' + r.status);

  r = await req('PATCH', '', { ['tasks/probe' + badTs]: { title: '봇이 진행으로 만든 항목', status: 'doing', area: 'admin', priority: 2, createdBy: 'claude', createdAt: badTs, ok: false } });
  mark(denied(r), '봇이 만드는 항목은 대기로만 태어난다', 'status ' + r.status);

  r = await req('DELETE', 'tasks/' + anyId);
  mark(denied(r), '봇은 항목을 못 지운다', 'status ' + r.status);

  if (!WRITE) {
    console.log('\n(읽기·거부만 봤다. 허락된 쓰기까지 보려면 --write)');
  } else {
    console.log('\n[3] 봇이 할 수 있어야 하는 쓰기 — 되고 나서 치운다');
    const id = 'probe' + Date.now().toString(36);
    r = await req('PATCH', '', { ['tasks/' + id]: { title: '규칙 두드리기 임시 항목', status: 'todo', area: 'admin', priority: 2, createdBy: 'claude', createdAt: Date.now(), updatedAt: Date.now(), ok: false } });
    mark(r.ok, "봇은 createdBy:'claude' · ok:false · status:todo 로는 만들 수 있다", 'status ' + r.status);

    if (r.ok) {
      const t2 = await req('PATCH', 'tasks/' + id + '/claude', { text: '한마디', ts: Date.now() });
      mark(t2.ok, '봇은 claude 칸에 한마디를 남길 수 있다', 'status ' + t2.status);
      const t3 = await req('PATCH', 'tasks/' + id, { status: 'done', doneAt: Date.now(), updatedAt: Date.now() });
      mark(t3.ok, '봇은 done 으로는 바꿀 수 있다', 'status ' + t3.status);
      const ts = Date.now();
      const t4 = await req('PATCH', '', { ['log/probe' + ts]: { task: id, field: 'status', from: 'todo', to: 'done', by: 'claude', via: 'bot', ts } });
      mark(t4.ok, "봇은 by:'claude' · via:'bot' 로는 기록을 남길 수 있다", 'status ' + t4.status);
      ownerDelete('tasks/' + id);
      ownerDelete('log/probe' + ts);
      console.log('  --   임시 항목·기록을 소유자 권한으로 치웠다');
    }
  }

  console.log('\n결과: ' + pass + ' 통과, ' + fail + ' 어긋남');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('멈췄다 — ' + (e.message || e)); process.exit(1); });
