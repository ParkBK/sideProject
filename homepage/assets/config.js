/* ─────────────────────────────────────────────────────────────
   Supabase 연결 설정 (홈페이지와 업무공간이 함께 씁니다)

   Supabase 대시보드 → Project Settings → API 에서 복사해 넣으세요.
   - url      : Project URL
   - anonKey  : anon public 키 (공개돼도 되는 키. RLS가 데이터를 지킵니다)

   ※ service_role 키는 절대 여기에 넣지 마세요. 모든 보안을 우회합니다.
   ※ 비워 두면 로그인·게시판·업무공간은 "준비 중"으로 표시되고,
     나머지 홈페이지는 그대로 동작합니다.
   ───────────────────────────────────────────────────────────── */
window.SB_CONFIG = {
  url: "https://zjwfnpdahycavsiaebth.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpqd2ZucGRhaHljYXZzaWFlYnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NjQ5MjEsImV4cCI6MjEwNjI0MDkyMX0.kRQZl3p2EZxKDslMjCZInvkqw_UCeWF69xfxOqwgth8",
  kakao: true,   // 카카오 로그인 설정(SETUP.md 10번)을 마친 뒤 true로 바꾸세요
};
