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

  /* 사진을 긴 변 max px JPEG로 줄임. 다시 그리면서 위치정보(EXIF)도 빠짐 */
  function shrinkImage(file, max = 1600, quality = .82) {
    return new Promise((ok, no) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.naturalWidth * r); cv.height = Math.round(img.naturalHeight * r);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(b => b ? ok(b) : no(new Error("사진 변환에 실패했습니다.")), "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); no(new Error(`${file.name}: 열 수 없는 사진 형식입니다. JPG나 PNG로 올려 주세요.`)); };
      img.src = url;
    });
  }
  /* 공개 사진 저장소(activity-photos)에 올리고 공개 주소를 돌려줌 */
  async function uploadPhoto(file, folder, max) {
    const c = await client();
    const blob = await shrinkImage(file, max);
    const path = `${folder}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await c.storage.from("activity-photos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (error) throw new Error(errText(error));
    return c.storage.from("activity-photos").getPublicUrl(path).data.publicUrl;
  }

  window.SB = { configured, client, me, ROLE_LABEL, isOfficer, isAccountant, errText, shrinkImage, uploadPhoto };
})();
