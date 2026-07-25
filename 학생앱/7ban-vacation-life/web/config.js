// ============================================================
// 7반의 방학 라이프 — 설정 파일
// Supabase 대시보드 → Settings → API 에서 두 값을 복사해 넣으세요.
// ============================================================
window.APP_CONFIG = {
  SUPABASE_URL: "https://svqaelxrdzavqbydptnt.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cWFlbHhyZHphdnFieWRwdG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MDU0OTYsImV4cCI6MjEwMDA4MTQ5Nn0.sVwdlH9QtvR7V7iCU3uA74oQFHZ09kSfzJy9dS1phEU",

  CLASS_NAME: "7반",
  VACATION_START: "2026-07-22",
  VACATION_END: "2026-08-10",

  // 셋로그 정각 슬롯 범위 (07시 ~ 23시)
  SLOT_START_HOUR: 7,
  SLOT_END_HOUR: 23,

  // 영상 최대 길이(초) — 카메라 녹화는 10초에서 자동 정지,
  // 앨범 업로드는 이 값 이하만 허용
  MAX_SECONDS: 12,
};
