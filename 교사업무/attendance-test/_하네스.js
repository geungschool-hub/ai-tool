/* 출결 앱 검사 공용 하네스
 *
 * index.html 의 <script> 블록을 통째로 떼어 내 forgiving DOM 위에서 돌린다.
 * 최상위 let/const 는 vm 컨텍스트의 속성이 되지 않으므로,
 * 같은 스코프에서 손잡이(globalThis.__T)를 내보내 집는다.
 *
 * 쓰는 곳: _test_연강.js · _test_라이브대조.js
 */
'use strict';
const fs = require('fs');
const vm = require('vm');

/* ── forgiving DOM ─────────────────────────────────────────────── */
function makeEl(id, tag) {
  const el = {
    id, tag: tag || '', textContent: '', value: '', checked: false, disabled: false,
    className: '', files: [], _cls: new Set(), _html: '',
    children: [], childNodes: [], parentNode: null, dataset: {},
    scrollTop: 0, scrollHeight: 0, offsetHeight: 0, offsetWidth: 0,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
    scrollIntoView() {}, click() {}, focus() {}, select() {},
    querySelector: () => makeEl('?'), querySelectorAll: () => [],
    addEventListener() {}, setAttribute(k, v) { el.dataset['@' + k] = v; }, getAttribute: () => null, closest: () => null,
    get firstChild() { return el.children[0] || null; },
    get lastChild()  { return el.children[el.children.length - 1] || null; },
    // innerHTML 을 세팅하면 자식이 사라진다 (브라우저와 같게)
    get innerHTML()  { return el._html; },
    set innerHTML(v) { el._html = v; el.children.length = 0; },
    appendChild(c)   { el.children.push(c); c.parentNode = el; return c; },
    insertBefore(c, ref) { const i = ref ? el.children.indexOf(ref) : -1; i < 0 ? el.children.push(c) : el.children.splice(i, 0, c); c.parentNode = el; return c; },
    removeChild(c)   { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    remove()         { if (el.parentNode) el.parentNode.removeChild(el); },
  };
  el.classList = {
    add: c => el._cls.add(c),
    remove: c => el._cls.delete(c),
    contains: c => el._cls.has(c),
    toggle: (c, on) => { const v = on === undefined ? !el._cls.has(c) : !!on; v ? el._cls.add(c) : el._cls.delete(c); return v; },
  };
  el.style = { display: '', setProperty() {}, removeProperty() {} };
  return el;
}

/* 엘리먼트를 견줄 수 있는 평문으로 — 자식까지 재귀 */
function serialize(el) {
  if (!el) return null;
  return {
    tag: el.tag, cls: el.className, on: [...el._cls].sort(), disp: el.style.display,
    h: el._html, t: String(el.textContent), v: String(el.value), chk: el.checked, dis: el.disabled,
    ds: el.dataset, kids: el.children.map(serialize),
  };
}

/* ── vm 컨텍스트 ───────────────────────────────────────────────── */
// fixedNow: 두 빌드를 견줄 때 Date.now() 가 어긋나면 안 된다 (마감 id 가 Date.now 다)
function buildCtx(fixedNow) {
  const els = new Map();
  const byId = id => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); };
  const store = new Map();
  const document = {
    getElementById: byId,
    querySelector: sel => byId('sel:' + sel),
    querySelectorAll: () => [],
    createElement: tag => makeEl('', tag),
    addEventListener() {}, execCommand() {},
    get body() { return byId('body'); },
    get documentElement() { return byId('html'); },
  };

  let FrozenDate = Date;
  if (fixedNow !== undefined) {
    FrozenDate = class extends Date {
      constructor(...a) { super(...(a.length ? a : [fixedNow])); }
      static now() { return fixedNow; }
    };
  }

  const ctx = {
    document,
    window: { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) },
    navigator: {},                       // serviceWorker 없음 → 등록 건너뜀
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
      clear: () => store.clear(),
      get _store() { return store; },
    },
    location: { origin: 'https://test', pathname: '/', href: '' },
    fetch: () => Promise.reject(new Error('no network')),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    alert() {}, confirm: () => true, prompt: () => null,
    URL: { createObjectURL: () => 'blob:', revokeObjectURL() {} },
    Blob: function Blob(parts) { this.parts = parts; },
    FileReader: function FileReader() {},
    Date: FrozenDate,
    console,
  };
  ctx.globalThis = ctx;
  ctx.self = ctx;
  ctx._els = els;
  ctx._store = store;
  return ctx;
}

const EXPORT = `
;globalThis.__T = {
  get appData()    { return appData; },    set appData(v)    { appData = v; },
  get currentDate(){ return currentDate; },set currentDate(v){ currentDate = v; },
  get subjData()   { return subjData; },   set subjData(v)   { subjData = v; },
  get subjDate()   { return subjDate; },   set subjDate(v)   { subjDate = v; },
  get subjClassId(){ return subjClassId; },set subjClassId(v){ subjClassId = v; },
  get subjPeriod() { return typeof subjPeriod === 'undefined' ? null : subjPeriod; },
  set subjPeriod(v){ if (typeof subjPeriod !== 'undefined') subjPeriod = v; },
  get subjEditMode(){ return subjEditMode; }, set subjEditMode(v){ subjEditMode = v; },
  get currentRecWeekStart(){ return currentRecWeekStart; }, set currentRecWeekStart(v){ currentRecWeekStart = v; },
  get currentMonth(){ return currentMonth; }, set currentMonth(v){ currentMonth = v; },
  TEST_BUILD: (typeof TEST_BUILD === 'undefined' ? null : TEST_BUILD),
  SUBJ_KEY, STORAGE_KEY,
};`;

/**
 * @param {string} htmlPath  index.html 경로
 * @param {object} opts      { testBuild:false → TEST_BUILD 를 끈 채로 (= 라이브 승격본), fixedNow }
 */
function loadApp(htmlPath, opts = {}) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script>\n([\s\S]*)\n<\/script>/);
  if (!m) throw new Error(htmlPath + ' 에서 <script> 블록을 찾지 못했습니다.');

  let js = m[1];
  if (opts.testBuild === false) js = js.replace('const TEST_BUILD = true;', 'const TEST_BUILD = false;');
  if (opts.testBuild === true)  js = js.replace('const TEST_BUILD = false;', 'const TEST_BUILD = true;');

  const ctx = buildCtx(opts.fixedNow);
  vm.createContext(ctx);
  vm.runInContext(js + EXPORT, ctx, { filename: htmlPath });
  return { ctx, T: ctx.__T };
}

module.exports = { makeEl, buildCtx, loadApp, serialize };
