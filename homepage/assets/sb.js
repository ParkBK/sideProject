/* Supabase 연결 공통 모듈: 홈페이지(index.html)와 업무공간(workspace.html)이 함께 사용 */
(function () {
  const cfg = window.SB_CONFIG || {};
  const configured = !!(cfg.url && cfg.anonKey);
  let clientPromise = null;

  function client() {
    if (!configured) return Promise.resolve(null);
    if (clientPromise) return clientPromise;
    clientPromise = new Promise(resolve => {
      if (window.supabase) return resolve();
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    }).then(() => window.supabase ? window.supabase.createClient(cfg.url, cfg.anonKey) : null);
    return clientPromise;
  }

  /* 현재 로그인한 사람의 계정과 프로필. 로그인 안 했으면 null */
  async function me() {
    const c = await client();
    if (!c) return null;
    const { data: { session } } = await c.auth.getSession();
    if (!session) return null;
    const { data: profile } = await c.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    return { user: session.user, profile: profile || null };
  }

  const ROLE_LABEL = { user: "가입 회원", member: "정회원", officer: "임원", admin: "관리자" };
  const isOfficer = p => !!p && (p.role === "officer" || p.role === "admin");
  const isAccountant = p => !!p && (p.role === "admin" || (p.can_accounting && (p.role === "officer" || p.role === "member")));

  /* 오류 메시지를 한국어로 */
  function errText(e) {
    const m = (e && (e.message || e.error_description || String(e))) || "알 수 없는 오류";
    if (/Invalid login credentials/i.test(m)) return "이메일 또는 비밀번호가 맞지 않습니다.";
    if (/Email not confirmed/i.test(m)) return "이메일 인증을 먼저 완료해 주세요. 받은편지함을 확인하세요.";
    if (/already registered|already been registered/i.test(m)) return "이미 가입된 이메일입니다.";
    if (/Password should be/i.test(m)) return "비밀번호는 8자 이상으로 입력해 주세요.";
    if (/row-level security|permission denied/i.test(m)) return "권한이 없습니다.";
    if (/rate limit/i.test(m)) return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    return m;
  }

  window.SB = { configured, client, me, ROLE_LABEL, isOfficer, isAccountant, errText };
})();
