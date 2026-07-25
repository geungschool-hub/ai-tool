// ============================================================
// Supabase 통신 계층 — 화면 코드는 여기 함수들만 호출한다.
// 쓰기는 전부 RPC(서버 검증), 읽기는 공개 뷰를 사용한다.
// ============================================================
"use strict";

const sb = window.supabase.createClient(
  window.APP_CONFIG.SUPABASE_URL,
  window.APP_CONFIG.SUPABASE_ANON_KEY
);

const PROFILE_KEY = "v7_profile";

const Api = {
  profile: null,

  loadProfile() {
    try {
      this.profile = JSON.parse(localStorage.getItem(PROFILE_KEY));
    } catch (_) {
      this.profile = null;
    }
    return this.profile;
  },

  saveProfile(p) {
    this.profile = p;
    if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_KEY);
  },

  get token() {
    return this.profile ? this.profile.token : null;
  },

  async rpc(fn, args) {
    const { data, error } = await sb.rpc(fn, args);
    if (error) {
      // Supabase는 raise exception 메시지를 error.message로 전달한다
      throw new Error(this.cleanError(error.message));
    }
    return data;
  },

  cleanError(msg) {
    if (!msg) return "알 수 없는 오류가 발생했어요.";
    if (/세션이 만료/.test(msg)) {
      this.saveProfile(null);
      setTimeout(() => { location.hash = "#/login"; location.reload(); }, 800);
    }
    if (/Failed to fetch|NetworkError|network/i.test(msg)) {
      return "인터넷 연결을 확인해 주세요.";
    }
    return msg;
  },

  // ---------- 계정 ----------
  async register(studentNo, name, pin) {
    const p = await this.rpc("register_student", {
      p_student_no: studentNo, p_name: name, p_pin: pin,
    });
    this.saveProfile(p);
    return p;
  },

  async login(studentNo, pin) {
    const p = await this.rpc("login", { p_student_no: studentNo, p_pin: pin });
    this.saveProfile(p);
    return p;
  },

  async checkSession() {
    if (!this.token) return null;
    const p = await this.rpc("get_me", { p_token: this.token });
    if (!p) this.saveProfile(null);
    else this.saveProfile(p);
    return p;
  },

  logout() {
    this.saveProfile(null);
  },

  // ---------- 읽기 (공개 뷰) ----------
  async select(view, modify) {
    let q = sb.from(view).select("*");
    if (modify) q = modify(q);
    const { data, error } = await q;
    if (error) throw new Error(this.cleanError(error.message));
    return data || [];
  },

  getStudents() {
    return this.select("v_students", (q) => q.order("student_no"));
  },
  getBooks() {
    return this.select("v_books", (q) => q.order("created_at", { ascending: false }));
  },
  getSetlogDays() {
    return this.select("v_setlog_days", (q) => q.order("day"));
  },
  getVideos(day) {
    return this.select("v_setlog_videos", (q) => {
      q = q.order("day").order("hour");
      return day ? q.eq("day", day) : q;
    });
  },
  getReactions() { return this.select("v_reactions"); },

  // ---------- 여름 독서 ----------
  addBook(title, author, review, finishedOn) {
    return this.rpc("add_book", {
      p_token: this.token, p_title: title, p_author: author,
      p_review: review, p_finished_on: finishedOn || null,
    });
  },

  updateBook(bookId, title, author, review, finishedOn) {
    return this.rpc("update_book", {
      p_token: this.token, p_book_id: bookId, p_title: title,
      p_author: author, p_review: review, p_finished_on: finishedOn || null,
    });
  },

  deleteBook(bookId) {
    return this.rpc("delete_book", { p_token: this.token, p_book_id: bookId });
  },

  setReportPick(bookId) {
    return this.rpc("set_report_pick", { p_token: this.token, p_book_id: bookId });
  },

  // ---------- 셋로그 ----------
  async uploadVideo(blob, ext, contentType, caption) {
    const now = new Date();
    const day = fmtDate(now);
    const stamp = now.getTime();
    const who = (this.profile.student_no || "x").replace(/[^0-9a-zA-Z]/g, "");
    const path = `${day}/${String(now.getHours()).padStart(2, "0")}_${who}_${stamp}.${ext}`;

    const { error: upErr } = await sb.storage.from("videos")
      .upload(path, blob, { contentType, upsert: false });
    if (upErr) throw new Error("영상 업로드에 실패했어요: " + upErr.message);

    try {
      return await this.rpc("add_video", {
        p_token: this.token, p_storage_path: path, p_caption: caption,
      });
    } catch (e) {
      // 규칙 위반으로 등록이 거부되면 올린 파일은 지워 둔다
      sb.storage.from("videos").remove([path]).catch(() => {});
      throw e;
    }
  },

  deleteVideo(videoId) {
    return this.rpc("delete_video", { p_token: this.token, p_video_id: videoId });
  },

  videoUrl(storagePath) {
    return sb.storage.from("videos").getPublicUrl(storagePath).data.publicUrl;
  },

  // ---------- 반응 ----------
  toggleReaction(type, id) {
    return this.rpc("toggle_reaction", { p_token: this.token, p_type: type, p_id: id });
  },

  // ---------- 선생님 ----------
  assignDay(day, studentNo) {
    return this.rpc("assign_setlog_day", {
      p_token: this.token, p_day: day, p_student_no: studentNo || null,
    });
  },

  resetPin(studentNo) {
    return this.rpc("teacher_reset_pin", { p_token: this.token, p_student_no: studentNo });
  },
};

// 로컬(한국) 기준 YYYY-MM-DD
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
