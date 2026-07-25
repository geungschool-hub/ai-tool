// ============================================================
// 7반의 방학 라이프 — 화면 로직 (해시 라우터 SPA)
// ============================================================
"use strict";

const CFG = window.APP_CONFIG;
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

// ---------- 작은 도우미들 ----------

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function toast(msg, isError) {
  const t = document.createElement("div");
  t.className = "toast" + (isError ? " toast-err" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayLabel(s) {
  const d = parseDate(s);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function dayWeek(s) {
  return WEEKDAYS[parseDate(s).getDay()];
}

function vacationDays() {
  const days = [];
  const end = parseDate(CFG.VACATION_END);
  for (let d = parseDate(CFG.VACATION_START); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(fmtDate(d));
  }
  return days;
}

function todayStr() { return fmtDate(new Date()); }

// ---------- 전역 상태 ----------

const state = {
  reactions: new Map(), // "type:id" -> { count, mine }
  bookFilter: "all",
  selectedDay: null,
  editingBookId: null,
};

async function loadReactions() {
  const rows = await Api.getReactions();
  const map = new Map();
  const myId = Api.profile && Api.profile.id;
  for (const r of rows) {
    const key = r.target_type + ":" + r.target_id;
    const cur = map.get(key) || { count: 0, mine: false };
    cur.count++;
    if (r.student_id === myId) cur.mine = true;
    map.set(key, cur);
  }
  state.reactions = map;
}

function heartBtn(type, id) {
  const r = state.reactions.get(type + ":" + id) || { count: 0, mine: false };
  return `<button class="heart ${r.mine ? "on" : ""}" data-heart="${type}:${id}">
    ♥ <span>${r.count}</span></button>`;
}

function bindHearts(root) {
  $$("[data-heart]", root).forEach((btn) => {
    btn.addEventListener("click", async () => {
      const [type, id] = btn.dataset.heart.split(":");
      btn.disabled = true;
      try {
        const count = await Api.toggleReaction(type, id);
        const key = type + ":" + id;
        const cur = state.reactions.get(key) || { count: 0, mine: false };
        cur.mine = !cur.mine;
        cur.count = count;
        state.reactions.set(key, cur);
        btn.classList.toggle("on", cur.mine);
        $("span", btn).textContent = count;
      } catch (e) { toast(e.message, true); }
      btn.disabled = false;
    });
  });
}

// ---------- 라우터 ----------

const routes = {
  "#/login": renderLogin,
  "#/home": renderHome,
  "#/books": renderBooks,
  "#/setlog": renderSetlog,
  "#/admin": renderAdmin,
};

async function navigate() {
  let hash = location.hash || "#/home";
  if (!routes[hash]) hash = "#/home";
  if (!Api.profile && hash !== "#/login") {
    location.hash = "#/login";
    return;
  }
  const app = $("#app");
  app.innerHTML = `<div class="loading">잠시만요…</div>`;
  renderNav(hash);
  try {
    await routes[hash](app);
  } catch (e) {
    app.innerHTML = `<div class="card error-card">
      <strong>불러오지 못했어요</strong><p>${esc(e.message)}</p>
      <button class="btn" onclick="navigate()">다시 시도</button></div>`;
  }
  window.scrollTo(0, 0);
}

function renderNav(hash) {
  const nav = $("#nav");
  if (!Api.profile) { nav.innerHTML = ""; nav.style.display = "none"; return; }
  nav.style.display = "";
  const items = [
    ["#/home", "홈", "☀️"],
    ["#/books", "여름 독서", "📚"],
    ["#/setlog", "셋로그", "🎬"],
  ];
  if (Api.profile.is_teacher) items.push(["#/admin", "관리", "🗓️"]);
  nav.innerHTML = items.map(([h, label, icon]) =>
    `<a href="${h}" class="${h === hash ? "on" : ""}"><span class="nav-ico">${icon}</span>${label}</a>`
  ).join("");
}

// ---------- 로그인 / 가입 ----------

function renderLogin(app) {
  let mode = "login";
  const draw = () => {
    app.innerHTML = `
    <div class="login-wrap">
      <div class="login-hero">
        <div class="logo-sun"></div>
        <h1 class="logo">${esc(CFG.CLASS_NAME)}의<br>방학 라이프</h1>
        <p class="login-sub">7.22 – 8.10 · 여름 독서 × 셋로그</p>
      </div>
      <div class="card login-card">
        <div class="seg">
          <button class="${mode === "login" ? "on" : ""}" data-m="login">로그인</button>
          <button class="${mode === "join" ? "on" : ""}" data-m="join">처음 왔어요</button>
        </div>
        <form id="login-form">
          <label>학번<input name="no" inputmode="numeric" placeholder="예: 10701" required></label>
          ${mode === "join" ? `<label>이름<input name="name" placeholder="이름" required></label>` : ""}
          <label>PIN (숫자 4~6자리)<input name="pin" type="password" inputmode="numeric"
            pattern="[0-9]{4,6}" maxlength="6" placeholder="••••" required></label>
          <button class="btn btn-big" type="submit">
            ${mode === "join" ? "PIN 만들고 시작하기" : "들어가기"}</button>
        </form>
        <p class="hint">${mode === "join"
          ? "PIN은 방학 내내 쓰는 비밀번호예요. 잊어버리면 선생님께 초기화를 요청하세요."
          : "처음이라면 ‘처음 왔어요’에서 PIN을 만들어 주세요."}</p>
      </div>
    </div>`;

    $$(".seg button", app).forEach((b) =>
      b.addEventListener("click", () => { mode = b.dataset.m; draw(); }));

    $("#login-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const f = ev.target;
      const btn = $("button[type=submit]", f);
      btn.disabled = true;
      try {
        if (mode === "join") {
          await Api.register(f.no.value.trim(), f.name.value.trim(), f.pin.value);
          toast(`환영해요, ${Api.profile.name}! 🌊`);
        } else {
          await Api.login(f.no.value.trim(), f.pin.value);
          toast(`어서 와요, ${Api.profile.name}! ☀️`);
        }
        location.hash = "#/home";
      } catch (e) {
        toast(e.message, true);
        btn.disabled = false;
      }
    });
  };
  draw();
}

// ---------- 홈 ----------

async function renderHome(app) {
  const me = Api.profile;
  const today = todayStr();
  const days = vacationDays();

  const [assignRows, books, videosToday] = await Promise.all([
    Api.getSetlogDays(), Api.getBooks(), Api.getVideos(today),
  ]);
  await loadReactions();

  const assign = new Map(assignRows.map((r) => [r.day, r]));
  const todayOwner = assign.get(today);
  const myDay = assignRows.find((r) => r.student_id === me.id);

  const dd = Math.ceil((parseDate(CFG.VACATION_END) - new Date()) / 86400000);
  const inVacation = today >= CFG.VACATION_START && today <= CFG.VACATION_END;
  const before = today < CFG.VACATION_START;

  const recentBooks = books.slice(0, 3);
  const myBookCount = books.filter((b) => b.student_id === me.id).length;

  app.innerHTML = `
    <header class="top">
      <div>
        <p class="eyebrow">${esc(CFG.CLASS_NAME)}의 방학 라이프</p>
        <h2>${esc(me.name)}의 여름 ☀️</h2>
      </div>
      <button class="link" id="logout">로그아웃</button>
    </header>

    <div class="card ticket">
      <div class="ticket-top">
        <span class="chip chip-sun">${before ? `방학 D-${Math.ceil((parseDate(CFG.VACATION_START) - new Date()) / 86400000)}`
          : inVacation ? `개학까지 D-${Math.max(dd, 0)}` : "방학 끝! 수고했어요 🎉"}</span>
        <span class="ticket-dates">7.22 → 8.10</span>
      </div>
      <div class="ticket-main">
        ${todayOwner
          ? `<p class="ticket-label">오늘의 셋로그 주인공</p>
             <p class="ticket-name">🎬 ${esc(todayOwner.name)}</p>
             <p class="ticket-sub">오늘 올라온 영상 ${videosToday.length}개</p>`
          : inVacation
            ? `<p class="ticket-label">오늘의 셋로그 주인공</p>
               <p class="ticket-name">아직 미정</p>`
            : `<p class="ticket-label">셋로그</p>
               <p class="ticket-name">하루에 한 명, 정각마다 10초</p>`}
      </div>
      <a class="btn btn-ghost" href="#/setlog">셋로그 보러 가기</a>
    </div>

    ${myDay ? `<div class="card my-day">
        <span class="chip chip-coral">내 차례</span>
        <p><strong>${dayLabel(myDay.day)} (${dayWeek(myDay.day)})</strong>이 ${esc(me.name)}의 셋로그 날이에요.
        ${myDay.day === today ? " 바로 오늘! 정각마다 10초를 남겨 보세요 🎥" : ""}</p>
      </div>` : ""}

    <section class="section">
      <div class="section-head">
        <h3>📚 여름 독서</h3>
        <a class="link" href="#/books">전체 보기</a>
      </div>
      <p class="section-sub">우리 반이 기록한 책 ${books.length}권 · 내 기록 ${myBookCount}권</p>
      ${recentBooks.length
        ? recentBooks.map(bookCardHtml).join("")
        : `<div class="card empty">아직 아무도 책을 기록하지 않았어요.<br>첫 번째 기록의 주인공이 되어 보세요!</div>`}
      <a class="btn btn-big" href="#/books" style="margin-top:12px">+ 책 기록하기</a>
    </section>`;

  $("#logout").addEventListener("click", () => {
    Api.logout();
    location.hash = "#/login";
  });
  bindHearts(app);
  bindBookActions(app);
}

// ---------- 여름 독서 ----------

function bookCardHtml(b) {
  const mine = Api.profile && b.student_id === Api.profile.id;
  return `
  <article class="card book">
    <div class="book-head">
      <div>
        <h4>${esc(b.title)}</h4>
        ${b.author ? `<p class="book-author">${esc(b.author)}</p>` : ""}
      </div>
      ${b.is_report_pick ? `<span class="chip chip-mint" title="개학 때 독후감으로 제출">독후감 📝</span>` : ""}
    </div>
    ${b.review ? `<p class="book-review">${esc(b.review)}</p>` : ""}
    <div class="book-foot">
      <span class="who">${esc(b.name)}${b.finished_on ? ` · ${dayLabel(b.finished_on)} 완독` : ""}</span>
      <div class="row-actions">
        ${heartBtn("book", b.id)}
        ${mine ? `
          <button class="mini" data-pick="${b.id}">${b.is_report_pick ? "독후감 해제" : "독후감 선택"}</button>
          <button class="mini" data-edit="${b.id}">수정</button>
          <button class="mini mini-danger" data-del-book="${b.id}">삭제</button>` :
          Api.profile && Api.profile.is_teacher
            ? `<button class="mini mini-danger" data-del-book="${b.id}">삭제</button>` : ""}
      </div>
    </div>
  </article>`;
}

function bindBookActions(root) {
  $$("[data-pick]", root).forEach((btn) =>
    btn.addEventListener("click", async () => {
      try {
        const on = await Api.setReportPick(btn.dataset.pick);
        toast(on ? "개학 때 이 책으로 독후감을 제출해요 📝" : "독후감 선택을 해제했어요.");
        navigate();
      } catch (e) { toast(e.message, true); }
    }));

  $$("[data-del-book]", root).forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("이 책 기록을 삭제할까요?")) return;
      try {
        await Api.deleteBook(btn.dataset.delBook);
        toast("삭제했어요.");
        navigate();
      } catch (e) { toast(e.message, true); }
    }));

  $$("[data-edit]", root).forEach((btn) =>
    btn.addEventListener("click", () => {
      state.editingBookId = btn.dataset.edit;
      if (location.hash !== "#/books") location.hash = "#/books";
      else navigate();
    }));
}

async function renderBooks(app) {
  const me = Api.profile;
  const books = await Api.getBooks();
  await loadReactions();

  const editing = state.editingBookId
    ? books.find((b) => b.id === state.editingBookId && b.student_id === me.id)
    : null;

  const shown = state.bookFilter === "mine"
    ? books.filter((b) => b.student_id === me.id)
    : books;

  app.innerHTML = `
    <header class="top">
      <div>
        <p class="eyebrow">여름 독서</p>
        <h2>자유롭게 읽고, 가볍게 남겨요 📚</h2>
      </div>
    </header>
    <p class="section-sub">방학 중 읽은 책 중 한 권을 골라 <strong>독후감 선택</strong>을 눌러 두면,
      개학 때 그 책으로 독후감을 제출해요.</p>

    <div class="card form-card ${editing ? "editing" : ""}">
      <h3>${editing ? `『${esc(editing.title)}』 수정하기` : "+ 책 기록하기"}</h3>
      <form id="book-form">
        <label>책 제목<input name="title" required maxlength="100"
          value="${editing ? esc(editing.title) : ""}" placeholder="예: 어린 왕자"></label>
        <div class="form-row">
          <label>지은이<input name="author" maxlength="50"
            value="${editing ? esc(editing.author || "") : ""}" placeholder="(선택)"></label>
          <label>다 읽은 날<input name="finished" type="date"
            min="${CFG.VACATION_START}"
            value="${editing && editing.finished_on ? editing.finished_on : ""}"></label>
        </div>
        <label>한 줄 소감<textarea name="review" rows="3" maxlength="500"
          placeholder="간단하게, 솔직하게. 한 줄이면 충분해요.">${editing ? esc(editing.review || "") : ""}</textarea></label>
        <div class="form-actions">
          <button class="btn btn-big" type="submit">${editing ? "수정 저장" : "기록 남기기"}</button>
          ${editing ? `<button class="btn btn-ghost" type="button" id="cancel-edit">취소</button>` : ""}
        </div>
      </form>
    </div>

    <div class="seg seg-filter">
      <button class="${state.bookFilter === "all" ? "on" : ""}" data-f="all">우리 반 전체 (${books.length})</button>
      <button class="${state.bookFilter === "mine" ? "on" : ""}" data-f="mine">내 서재 (${books.filter((b) => b.student_id === me.id).length})</button>
    </div>

    <div id="book-list">
      ${shown.length ? shown.map(bookCardHtml).join("")
        : `<div class="card empty">아직 기록이 없어요. 위에서 첫 책을 남겨 보세요!</div>`}
    </div>`;

  $$(".seg-filter button", app).forEach((b) =>
    b.addEventListener("click", () => { state.bookFilter = b.dataset.f; navigate(); }));

  const cancel = $("#cancel-edit");
  if (cancel) cancel.addEventListener("click", () => { state.editingBookId = null; navigate(); });

  $("#book-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const btn = $("button[type=submit]", f);
    btn.disabled = true;
    try {
      if (editing) {
        await Api.updateBook(editing.id, f.title.value, f.author.value, f.review.value, f.finished.value);
        toast("수정했어요 ✏️");
      } else {
        await Api.addBook(f.title.value, f.author.value, f.review.value, f.finished.value);
        toast("기록을 남겼어요! 🌊");
      }
      state.editingBookId = null;
      navigate();
    } catch (e) {
      toast(e.message, true);
      btn.disabled = false;
    }
  });

  bindHearts(app);
  bindBookActions(app);
}

// ---------- 셋로그 ----------

async function renderSetlog(app) {
  const me = Api.profile;
  const today = todayStr();
  const days = vacationDays();
  if (!state.selectedDay) {
    state.selectedDay = (today >= CFG.VACATION_START && today <= CFG.VACATION_END)
      ? today : days[0];
  }
  const sel = state.selectedDay;

  const [assignRows, videos] = await Promise.all([
    Api.getSetlogDays(), Api.getVideos(sel),
  ]);
  await loadReactions();

  const assign = new Map(assignRows.map((r) => [r.day, r]));
  const owner = assign.get(sel);
  const isMyDay = owner && owner.student_id === me.id;
  const isToday = sel === today;
  const nowHour = new Date().getHours();
  const videoByHour = new Map(videos.map((v) => [v.hour, v]));

  const hours = [];
  for (let h = CFG.SLOT_START_HOUR; h <= CFG.SLOT_END_HOUR; h++) hours.push(h);

  app.innerHTML = `
    <header class="top">
      <div>
        <p class="eyebrow">${esc(CFG.CLASS_NAME)} 셋로그</p>
        <h2>정각마다 10초, 나의 하루 🎬</h2>
      </div>
    </header>
    <p class="section-sub">하루에 한 명씩. 매 정각이 되면 그 시간의 일상을 10초 영상으로 남겨요.</p>

    <div class="day-strip" id="day-strip">
      ${days.map((d) => {
        const a = assign.get(d);
        return `<button class="day-chip ${d === sel ? "on" : ""} ${d === today ? "today" : ""}" data-day="${d}">
          <span class="day-num">${dayLabel(d)}</span>
          <span class="day-week">${dayWeek(d)}</span>
          <span class="day-owner">${a ? esc(a.name) : "·"}</span>
        </button>`;
      }).join("")}
    </div>

    <div class="card owner-card">
      ${owner
        ? `<p class="ticket-label">${dayLabel(sel)} (${dayWeek(sel)})의 주인공</p>
           <p class="ticket-name">🎬 ${esc(owner.name)}</p>
           ${isMyDay && isToday ? `<p class="owner-hint">오늘은 내 차례! 정각이 지나기 전에 그 시간을 남겨 보세요.</p>` : ""}`
        : `<p class="ticket-label">${dayLabel(sel)} (${dayWeek(sel)})</p>
           <p class="ticket-name">주인공 미정</p>`}
    </div>

    <div class="timeline">
      ${hours.map((h) => {
        const v = videoByHour.get(h);
        const isNow = isToday && h === nowHour;
        const canUpload = isNow && !v && (isMyDay || me.is_teacher) && sel >= CFG.VACATION_START && sel <= CFG.VACATION_END;
        const isPast = sel < today || (isToday && h < nowHour);
        return `
        <div class="slot ${isNow ? "now" : ""}">
          <div class="slot-time"><span>${String(h).padStart(2, "0")}:00</span></div>
          <div class="slot-body">
            ${v ? videoCardHtml(v) :
              canUpload ? `<button class="btn btn-record" data-record>● ${String(h).padStart(2, "0")}시의 10초 찍기</button>` :
              isNow ? `<div class="slot-empty now-empty">지금 이 시간… 주인공을 기다리는 중 ⏳</div>` :
              isPast ? `<div class="slot-empty">이 시간은 조용히 지나갔어요</div>` :
              `<div class="slot-empty">아직 오지 않은 시간</div>`}
          </div>
        </div>`;
      }).join("")}
    </div>`;

  $$("#day-strip .day-chip", app).forEach((b) =>
    b.addEventListener("click", () => { state.selectedDay = b.dataset.day; navigate(); }));
  const onChip = $("#day-strip .day-chip.on", app);
  if (onChip) onChip.scrollIntoView({ inline: "center", block: "nearest" });

  const recordBtn = $("[data-record]", app);
  if (recordBtn) recordBtn.addEventListener("click", openRecorder);

  $$("[data-del-video]", app).forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("이 영상을 삭제할까요?")) return;
      try {
        await Api.deleteVideo(btn.dataset.delVideo);
        toast("삭제했어요.");
        navigate();
      } catch (e) { toast(e.message, true); }
    }));

  bindHearts(app);
}

function videoCardHtml(v) {
  const mine = Api.profile && (v.student_id === Api.profile.id || Api.profile.is_teacher);
  return `
  <div class="video-card">
    <video src="${esc(Api.videoUrl(v.storage_path))}" controls playsinline preload="metadata"></video>
    <div class="video-foot">
      <div>${v.caption ? `<p class="video-caption">${esc(v.caption)}</p>` : ""}
        <span class="who">${esc(v.name)}</span></div>
      <div class="row-actions">
        ${heartBtn("video", v.id)}
        ${mine ? `<button class="mini mini-danger" data-del-video="${v.id}">삭제</button>` : ""}
      </div>
    </div>
  </div>`;
}

// ---------- 셋로그 녹화/업로드 ----------

function openRecorder() {
  const RECORD_SECONDS = 10;
  const overlay = document.createElement("div");
  overlay.className = "recorder";
  overlay.innerHTML = `
    <div class="recorder-inner">
      <div class="recorder-head">
        <span class="chip chip-coral">● ${String(new Date().getHours()).padStart(2, "0")}시의 10초</span>
        <button class="link" data-close>닫기</button>
      </div>
      <div class="recorder-stage">
        <video id="rec-preview" autoplay muted playsinline></video>
        <div class="rec-progress"><div id="rec-bar"></div></div>
      </div>
      <div class="recorder-controls" id="rec-controls">
        <button class="rec-btn" id="rec-start" title="녹화 시작"></button>
        <label class="btn btn-ghost file-btn">앨범에서 올리기
          <input type="file" id="rec-file" accept="video/*" hidden></label>
      </div>
      <form class="recorder-send" id="rec-send" hidden>
        <input name="caption" maxlength="80" placeholder="이 순간 한 줄 설명 (선택)">
        <div class="form-actions">
          <button class="btn btn-big" type="submit">올리기</button>
          <button class="btn btn-ghost" type="button" id="rec-retry">다시 찍기</button>
        </div>
      </form>
      <p class="hint" id="rec-hint">버튼을 누르면 ${RECORD_SECONDS}초 동안 녹화되고 자동으로 멈춰요.</p>
    </div>`;
  document.body.appendChild(overlay);

  const preview = $("#rec-preview", overlay);
  const bar = $("#rec-bar", overlay);
  let stream = null, recorder = null, chunks = [], resultBlob = null, timer = null;

  const cleanup = () => {
    if (timer) clearInterval(timer);
    if (recorder && recorder.state === "recording") recorder.stop();
    if (stream) stream.getTracks().forEach((t) => t.stop());
    overlay.remove();
  };
  $("[data-close]", overlay).addEventListener("click", cleanup);

  const pickMime = () => {
    const candidates = [
      "video/mp4;codecs=avc1", "video/mp4",
      "video/webm;codecs=vp9", "video/webm",
    ];
    return candidates.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
  };

  async function initCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      preview.srcObject = stream;
    } catch (e) {
      $("#rec-hint", overlay).textContent =
        "카메라를 열 수 없어요. 브라우저 권한을 확인하거나 ‘앨범에서 올리기’를 이용해 주세요.";
      $("#rec-start", overlay).disabled = true;
    }
  }

  function showPreview(blob) {
    resultBlob = blob;
    preview.srcObject = null;
    preview.src = URL.createObjectURL(blob);
    preview.muted = false;
    preview.controls = true;
    preview.loop = true;
    preview.play().catch(() => {});
    $("#rec-controls", overlay).hidden = true;
    $("#rec-send", overlay).hidden = false;
    $("#rec-hint", overlay).textContent = "마음에 들면 올리기! 아니면 다시 찍어요.";
  }

  $("#rec-start", overlay).addEventListener("click", () => {
    if (!stream) return;
    const mime = pickMime();
    if (!window.MediaRecorder || !mime) {
      $("#rec-hint", overlay).textContent =
        "이 브라우저는 녹화를 지원하지 않아요. ‘앨범에서 올리기’를 이용해 주세요.";
      return;
    }
    chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 });
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      showPreview(new Blob(chunks, { type: mime.split(";")[0] }));
    };
    recorder.start();
    $("#rec-start", overlay).classList.add("recording");
    const started = Date.now();
    timer = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / (RECORD_SECONDS * 1000)) * 100);
      bar.style.width = pct + "%";
      if (pct >= 100) {
        clearInterval(timer);
        if (recorder.state === "recording") recorder.stop();
      }
    }, 100);
  });

  $("#rec-file", overlay).addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const dur = await videoDuration(file).catch(() => null);
    if (dur == null) {
      toast("영상을 읽을 수 없어요. 다른 파일로 시도해 주세요.", true);
      return;
    }
    if (dur > CFG.MAX_SECONDS) {
      toast(`셋로그는 ${CFG.MAX_SECONDS}초 이하만! 지금 영상은 약 ${Math.round(dur)}초예요.`, true);
      return;
    }
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    showPreview(file);
  });

  $("#rec-retry", overlay).addEventListener("click", () => {
    resultBlob = null;
    preview.src = "";
    preview.controls = false;
    preview.loop = false;
    preview.muted = true;
    bar.style.width = "0";
    $("#rec-send", overlay).hidden = true;
    $("#rec-controls", overlay).hidden = false;
    $("#rec-start", overlay).classList.remove("recording");
    $("#rec-hint", overlay).textContent = `버튼을 누르면 ${RECORD_SECONDS}초 동안 녹화되고 자동으로 멈춰요.`;
    initCamera();
  });

  $("#rec-send", overlay).addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!resultBlob) return;
    const btn = $("button[type=submit]", ev.target);
    btn.disabled = true;
    btn.textContent = "올리는 중…";
    try {
      const type = resultBlob.type || "video/mp4";
      const ext = type.includes("webm") ? "webm" : type.includes("quicktime") ? "mov" : "mp4";
      await Api.uploadVideo(resultBlob, ext, type, ev.target.caption.value);
      toast("이 시간의 10초를 남겼어요! 🎬");
      cleanup();
      navigate();
    } catch (e) {
      toast(e.message, true);
      btn.disabled = false;
      btn.textContent = "올리기";
    }
  });

  initCamera();
}

function videoDuration(file) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(v.src); reject(new Error("load error")); };
    v.src = URL.createObjectURL(file);
  });
}

// ---------- 관리 (선생님) ----------

async function renderAdmin(app) {
  if (!Api.profile.is_teacher) { location.hash = "#/home"; return; }

  const [students, assignRows] = await Promise.all([
    Api.getStudents(), Api.getSetlogDays(),
  ]);
  const assign = new Map(assignRows.map((r) => [r.day, r]));
  const days = vacationDays();

  const options = (selectedNo) =>
    `<option value="">— 미정 —</option>` +
    students.filter((s) => !s.is_teacher).map((s) =>
      `<option value="${esc(s.student_no)}" ${s.student_no === selectedNo ? "selected" : ""}>
        ${esc(s.student_no)} ${esc(s.name)}</option>`).join("");

  app.innerHTML = `
    <header class="top">
      <div>
        <p class="eyebrow">관리</p>
        <h2>셋로그 배정 🗓️</h2>
      </div>
    </header>
    <p class="section-sub">하루에 한 명씩 배정하세요. 가입한 학생만 목록에 나와요.
      배정은 언제든 바꿀 수 있어요.</p>

    <div class="card">
      ${days.map((d) => {
        const a = assign.get(d);
        return `<div class="assign-row ${d === todayStr() ? "assign-today" : ""}">
          <span class="assign-day">${dayLabel(d)} <em>${dayWeek(d)}</em></span>
          <select data-day="${d}">${options(a ? a.student_no : "")}</select>
        </div>`;
      }).join("")}
    </div>

    <section class="section">
      <div class="section-head"><h3>👥 가입한 학생 (${students.filter((s) => !s.is_teacher).length}명)</h3></div>
      <div class="card">
        ${students.filter((s) => !s.is_teacher).map((s) => `
          <div class="student-row">
            <span>${esc(s.student_no)} · ${esc(s.name)}</span>
            <button class="mini" data-reset="${esc(s.student_no)}">PIN 초기화</button>
          </div>`).join("") || `<p class="empty">아직 가입한 학생이 없어요.</p>`}
      </div>
      <p class="hint">PIN 초기화를 누르면 임시 PIN이 화면에 표시돼요. 학생에게 알려주고,
        로그인 후 계속 쓰거나 다시 초기화를 요청하게 하세요.</p>
    </section>`;

  $$("select[data-day]", app).forEach((sel) =>
    sel.addEventListener("change", async () => {
      try {
        await Api.assignDay(sel.dataset.day, sel.value || null);
        toast(`${dayLabel(sel.dataset.day)} 배정을 저장했어요.`);
      } catch (e) {
        toast(e.message, true);
        navigate();
      }
    }));

  $$("[data-reset]", app).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const no = btn.dataset.reset;
      if (!confirm(`${no} 학생의 PIN을 초기화할까요?`)) return;
      try {
        const pin = await Api.resetPin(no);
        alert(`임시 PIN: ${pin}\n\n학생에게 알려주세요. (이 창을 닫으면 다시 볼 수 없어요)`);
      } catch (e) { toast(e.message, true); }
    }));
}

// ---------- 시작 ----------

async function boot() {
  if (CFG.SUPABASE_URL.includes("YOUR-PROJECT")) {
    $("#app").innerHTML = `<div class="card error-card" style="margin-top:40px">
      <strong>설정이 필요해요</strong>
      <p><code>config.js</code>에 Supabase URL과 anon key를 넣어 주세요.
      자세한 방법은 README.md를 확인하세요.</p></div>`;
    return;
  }
  Api.loadProfile();
  if (Api.profile) {
    // 백그라운드에서 세션 유효성 확인 (만료 시 자동 로그아웃)
    Api.checkSession().then((p) => {
      if (!p) { location.hash = "#/login"; navigate(); }
    }).catch(() => {});
  }
  window.addEventListener("hashchange", navigate);
  navigate();
}

boot();
