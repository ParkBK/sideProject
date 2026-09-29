/* ─────────────────────────────────────────────────────────────
   회원 · 게시판 · 마이페이지 (index.html 에서 사용)
   데이터 보호는 데이터베이스의 RLS 정책이 담당합니다 (supabase/schema.sql).
   ───────────────────────────────────────────────────────────── */
(function () {
  const BOARDS = {
    notice:    { label: "공지사항",   desc: "공동체의 공지입니다.", officerOnly: true },
    free:      { label: "자유게시판", desc: "회원과 시민 누구나 자유롭게 이야기합니다." },
    collab:    { label: "협업 제안",  desc: "함께 만들고 싶은 프로젝트를 제안하고 함께할 사람을 찾습니다." },
    volunteer: { label: "자원봉사",   desc: "행사 스태프·자원봉사 모집과 참여 신청을 나눕니다." },
    qna:       { label: "묻고 답하기", desc: "궁금한 점을 묻고 답합니다." },
    inquiry:   { label: "협력 문의",  desc: "작성자와 운영진만 볼 수 있는 비공개 문의입니다.", private: true },
  };
  const BOARD_HOME = { notice: "#/news/notice", inquiry: "#/join/partner" };
  const listHref = b => BOARD_HOME[b] || `#/community/${b}`;
  const PER_PAGE = 10;
  const DONG_NAMES = typeof DONG_ORDER !== "undefined" ? DONG_ORDER : [];
  const redirectBase = () => location.origin + location.pathname;

  const h = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = iso => { if (!iso) return ""; const d = new Date(iso); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; };
  const q = sel => document.querySelector(sel);
  const msg = (el, text, ok) => { el.innerHTML = text ? `<p class="form-msg ${ok ? "ok" : "err"}">${h(text)}</p>` : ""; };
  let ME = null;
  const KAKAO = !!(window.SB_CONFIG && window.SB_CONFIG.kakao);
  /* 카카오 디자인 가이드: 노란 바탕(#FEE500), 검정 85% 글자, 말풍선 기호 */
  const kakaoBtn = `<button type="button" class="btn" data-kakao style="background:#FEE500;color:rgba(0,0,0,.85);width:100%">
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#000" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/></svg>
    카카오로 시작하기</button>`;
  async function kakaoLogin(errEl) {
    const c = await SB.client();
    const { error } = await c.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: redirectBase() } });
    if (error) msg(errEl, SB.errText(error));
  }
  /* 소셜 로그인으로 들어온 사람은 가입 화면의 동의를 거치지 않았으므로 여기서 받음 */
  const needsConsent = () => ME && ME.profile && !ME.profile.privacy_agreed_at;
  const consentGate = () => `<div class="notice-box"><b>개인정보 수집·이용 동의가 필요합니다.</b><br>글쓰기·가입 신청 전에 한 번만 동의해 주세요.
    <div style="margin-top:14px"><a class="btn btn-brand" href="#/my/profile">동의하러 가기</a></div></div>`;

  const notReady = `<div class="notice-box"><b>회원 기능은 준비 중입니다.</b><br>로그인·게시판은 데이터베이스 연결 후 열립니다.<br><span style="font-size:13px">(관리자: homepage/SETUP.md 참고)</span></div>`;
  const needLogin = next => `<div class="notice-box"><b>로그인이 필요합니다.</b><br>회원가입은 1분이면 끝납니다.
    <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
      <a class="btn btn-brand" href="#/auth/login?next=${encodeURIComponent(next)}">로그인</a>
      <a class="btn btn-white" href="#/auth/signup">회원가입</a></div></div>`;

  async function names(c, ids) {
    const uniq = [...new Set(ids.filter(Boolean))];
    if (!uniq.length) return {};
    const { data } = await c.from("profile_names").select("id,display_name,org_name").in("id", uniq);
    return Object.fromEntries((data || []).map(r => [r.id, r.org_name ? `${r.display_name} (${r.org_name})` : r.display_name]));
  }

  /* ── 로그인 상태 표시 ─────────────────────────── */
  function paintAuth() {
    const inn = !!ME, off = inn && SB.isOfficer(ME.profile);
    document.querySelectorAll('[data-auth="in"]').forEach(e => e.hidden = !inn);
    document.querySelectorAll('[data-auth="out"]').forEach(e => e.hidden = inn);
    document.querySelectorAll("[data-officer]").forEach(e => e.hidden = !off);
    const nm = ME?.profile?.display_name;
    document.querySelectorAll("[data-me-name]").forEach(e => e.textContent = nm ? `${nm}님` : "마이페이지");
    document.querySelectorAll("[data-am-greet]").forEach(e => e.textContent = nm ? `${nm}님, 반갑습니다.` : "시흥 청년들과 함께하세요.");
  }
  async function refreshMe() { ME = await SB.me(); paintAuth(); }
  async function logout() {
    const c = await SB.client(); if (c) await c.auth.signOut();
    ME = null; paintAuth(); location.hash = "#/";
  }
  document.addEventListener("click", e => { if (e.target.closest("[data-logout]")) { e.preventDefault(); logout(); } });

  /* ── 게시판 목록 ───────────────────────────────── */
  async function boardList(host, board, params) {
    const B = BOARDS[board];
    const page = Math.max(1, parseInt(params.get("p"), 10) || 1);
    const head = `<div class="bd-head"><div><h3 class="s-title" style="margin:0;border:0;padding:0">${B.label}</h3><p>${B.desc}</p></div></div>`;
    if (!SB.configured) { host.innerHTML = head + notReady; return; }
    host.innerHTML = head + `<p class="notice-box">불러오는 중…</p>`;
    const c = await SB.client();
    const from = (page - 1) * PER_PAGE;
    const { data, count, error } = await c.from("posts")
      .select("id,title,created_at,author_id,is_hidden,comments(count)", { count: "exact" })
      .eq("board", board).order("created_at", { ascending: false }).range(from, from + PER_PAGE - 1);
    if (error) { host.innerHTML = head + `<p class="form-msg err">${h(SB.errText(error))}</p>`; return; }
    const nm = await names(c, data.map(r => r.author_id));
    const canWrite = ME && (!B.officerOnly || SB.isOfficer(ME.profile));
    const pages = Math.max(1, Math.ceil((count || 0) / PER_PAGE));
    const base = location.hash.split("?")[0];
    host.innerHTML = head + `
      <ul class="bd-list">${data.length ? data.map((r, i) => `
        <li><a href="#/board/view?id=${r.id}">
          <span class="no">${(count || 0) - from - i}</span>
          <span class="tt">${r.is_hidden ? "[숨김] " : ""}${h(r.title)}${r.comments?.[0]?.count ? `<em>[${r.comments[0].count}]</em>` : ""}</span>
          <span class="au">${h(nm[r.author_id] || "회원")}</span>
          <span class="dt">${fmt(r.created_at)}</span></a></li>`).join("")
        : `<li class="empty">${B.private ? "작성한 문의가 없습니다." : "첫 글을 남겨 주세요."}</li>`}</ul>
      <div class="bd-tools">
        <div class="vm-pager" style="margin:0">${Array.from({ length: pages }, (_, i) =>
          `<a class="btn-s" style="${i + 1 === page ? "background:var(--ink);color:#fff" : ""}" href="${base}?p=${i + 1}">${i + 1}</a>`).join("")}</div>
        ${canWrite ? `<a class="btn btn-brand" style="height:44px" href="#/board/write?b=${board}">글쓰기</a>`
          : !ME ? `<a class="btn-s" href="#/auth/login?next=${encodeURIComponent(location.hash)}">로그인 후 글쓰기</a>` : ""}
      </div>`;
  }

  /* ── 게시글 보기 + 댓글 ───────────────────────── */
  async function postView(host, id) {
    if (!SB.configured) { host.innerHTML = notReady; return; }
    const c = await SB.client();
    const { data: p } = await c.from("posts").select("*").eq("id", id).maybeSingle();
    if (!p) { host.innerHTML = `<div class="notice-box">글을 찾을 수 없거나 볼 권한이 없습니다.<br><a class="btn-s" style="margin-top:12px" href="#/community/free">게시판으로</a></div>`; return; }
    const B = BOARDS[p.board];
    const shell = document.querySelector("#subShell .subvisual h2"); if (shell) shell.textContent = B.label;
    const { data: cm } = await c.from("comments").select("*").eq("post_id", id).order("created_at");
    const nm = await names(c, [p.author_id, ...(cm || []).map(x => x.author_id)]);
    const mine = ME && ME.user.id === p.author_id, off = ME && SB.isOfficer(ME.profile);
    host.innerHTML = `
      <article class="post">
        <div class="post-h"><p style="margin:0 0 6px"><span class="chip">${B.label}</span>${p.is_hidden ? ' <span class="chip wip">숨김 처리됨</span>' : ""}</p>
          <h3>${h(p.title)}</h3>
          <p><span>${h(nm[p.author_id] || "회원")}</span><span>${fmt(p.created_at)}</span>${p.updated_at && p.updated_at !== p.created_at && fmt(p.updated_at) !== fmt(p.created_at) ? `<span>수정 ${fmt(p.updated_at)}</span>` : ""}</p></div>
        <div class="post-b">${h(p.body)}</div>
      </article>
      <div class="post-act">
        <a class="btn-s" href="${listHref(p.board)}">목록</a>
        ${mine ? `<a class="btn-s" href="#/board/write?b=${p.board}&id=${p.id}">수정</a><button class="btn-s danger" data-act="del-post">삭제</button>` : ""}
        ${off && !mine ? `<button class="btn-s danger" data-act="del-post">삭제</button>` : ""}
        ${off ? `<button class="btn-s" data-act="hide-post">${p.is_hidden ? "숨김 해제" : "숨김"}</button>` : ""}
        ${ME && !mine ? `<button class="btn-s" data-act="report" data-type="post" data-id="${p.id}">신고</button>` : ""}
      </div>
      <section class="cmts"><h4>댓글 <em>${(cm || []).length}</em></h4>
        ${(cm || []).map(x => `<div class="cmt"><p class="who">${h(nm[x.author_id] || "회원")}<span>${fmt(x.created_at)}</span>${x.is_hidden ? ' <span class="chip wip">숨김</span>' : ""}</p>
          <p class="tx">${h(x.body)}</p>
          <p class="ops">${ME && (ME.user.id === x.author_id || off) ? `<button data-act="del-cmt" data-id="${x.id}">삭제</button>` : ""}
            ${off ? `<button data-act="hide-cmt" data-id="${x.id}" data-h="${x.is_hidden}">${x.is_hidden ? "숨김 해제" : "숨김"}</button>` : ""}
            ${ME && ME.user.id !== x.author_id ? `<button data-act="report" data-type="comment" data-id="${x.id}">신고</button>` : ""}</p></div>`).join("")}
        ${ME && needsConsent() ? consentGate() : ME ? `<form class="cmt-form" data-cmt><textarea name="body" maxlength="2000" required placeholder="댓글을 남겨 주세요. 서로 존중하는 말로 이야기해요."></textarea>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span data-cmsg></span><button class="btn btn-dark" style="height:44px">댓글 등록</button></div></form>`
          : `<p class="notice-box" style="margin-top:16px">댓글은 <a href="#/auth/login?next=${encodeURIComponent(location.hash)}" style="color:var(--brand);font-weight:700">로그인</a> 후 남길 수 있습니다.</p>`}
      </section>`;
    host.onclick = async e => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const a = b.dataset.act;
      if (a === "del-post" && confirm("이 글을 삭제할까요?")) { const { error } = await c.from("posts").delete().eq("id", p.id); if (error) return alert(SB.errText(error)); location.hash = listHref(p.board); }
      if (a === "hide-post") { const { error } = await c.from("posts").update({ is_hidden: !p.is_hidden }).eq("id", p.id); if (error) return alert(SB.errText(error)); postView(host, id); }
      if (a === "del-cmt" && confirm("댓글을 삭제할까요?")) { const { error } = await c.from("comments").delete().eq("id", b.dataset.id); if (error) return alert(SB.errText(error)); postView(host, id); }
      if (a === "hide-cmt") { const { error } = await c.from("comments").update({ is_hidden: b.dataset.h !== "true" }).eq("id", b.dataset.id); if (error) return alert(SB.errText(error)); postView(host, id); }
      if (a === "report") {
        const reason = prompt("신고 사유를 적어 주세요. (예: 광고, 욕설, 개인정보 노출)"); if (!reason) return;
        const { error } = await c.from("reports").insert({ target_type: b.dataset.type, target_id: +b.dataset.id, reason: reason.slice(0, 500) });
        alert(error ? SB.errText(error) : "신고가 접수되었습니다. 운영진이 확인하겠습니다.");
      }
    };
    const f = host.querySelector("[data-cmt]");
    if (f) f.onsubmit = async e => {
      e.preventDefault();
      const body = f.body.value.trim(); if (!body) return;
      f.querySelector("button").disabled = true;
      const { error } = await c.from("comments").insert({ post_id: p.id, body });
      if (error) { f.querySelector("button").disabled = false; return msg(f.querySelector("[data-cmsg]"), SB.errText(error)); }
      postView(host, id);
    };
  }

  /* ── 글쓰기·수정 ──────────────────────────────── */
  async function postWrite(host, board, id) {
    if (!SB.configured) { host.innerHTML = notReady; return; }
    if (!ME) { host.innerHTML = needLogin(location.hash); return; }
    if (needsConsent()) { host.innerHTML = consentGate(); return; }
    if (!BOARDS[board]) board = "free";
    const B = BOARDS[board];
    if (B.officerOnly && !SB.isOfficer(ME.profile)) { host.innerHTML = `<div class="notice-box">${B.label}는 임원만 작성할 수 있습니다.</div>`; return; }
    const c = await SB.client();
    let post = null;
    if (id) { const { data } = await c.from("posts").select("*").eq("id", id).maybeSingle(); post = data; }
    const shell = document.querySelector("#subShell .subvisual h2"); if (shell) shell.textContent = `${B.label} ${post ? "수정" : "글쓰기"}`;
    const tpl = board === "inquiry" ? "기관·단체명:\n담당자 연락처:\n행사명·목적:\n일정:\n장소:\n대상·예상 인원:\n원하는 협력 형태: (공연, 전시, 교육, 축제 운영, 영상, 디자인 등)\n예산 범위:\n그 밖에 전할 말:" : "";
    host.innerHTML = `<form class="form" data-write style="max-width:820px;margin:0 auto">
      ${B.private ? `<p class="consent">이 문의는 <b>작성자와 운영진만</b> 볼 수 있습니다. 연락처는 회신 목적으로만 사용합니다.</p>` : ""}
      <div class="row"><label for="wTitle">제목<em>*</em></label><input type="text" id="wTitle" name="title" maxlength="120" required value="${h(post?.title || "")}"></div>
      <div class="row"><label for="wBody">내용<em>*</em></label><textarea id="wBody" name="body" maxlength="10000" required style="min-height:320px">${h(post?.body || tpl)}</textarea>
        <p class="hint">다른 사람의 연락처·주소 등 개인정보를 올리지 마세요. 광고·비방 글은 숨김 처리될 수 있습니다.</p></div>
      <div data-wmsg></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><a class="btn btn-white" href="${post ? `#/board/view?id=${post.id}` : listHref(board)}">취소</a><button class="btn btn-brand">${post ? "수정" : "등록"}</button></div>
    </form>`;
    const f = host.querySelector("[data-write]");
    f.onsubmit = async e => {
      e.preventDefault();
      const row = { title: f.title.value.trim(), body: f.body.value.trim() };
      if (!row.title || !row.body) return;
      f.querySelector("button.btn-brand").disabled = true;
      const res = post ? await c.from("posts").update(row).eq("id", post.id).select("id").single()
                       : await c.from("posts").insert({ ...row, board }).select("id").single();
      if (res.error) { f.querySelector("button.btn-brand").disabled = false; return msg(f.querySelector("[data-wmsg]"), SB.errText(res.error)); }
      location.hash = `#/board/view?id=${res.data.id}`;
    };
  }

  /* ── 로그인 · 회원가입 · 비밀번호 ────────────── */
  function loginView(host, params) {
    if (!SB.configured) { host.innerHTML = notReady; return; }
    if (ME) { host.innerHTML = `<div class="notice-box">이미 로그인했습니다.<br><a class="btn btn-brand" style="margin-top:14px" href="#/my/profile">마이페이지</a></div>`; return; }
    host.innerHTML = `<form class="form" data-login>
      <div class="row"><label for="lEmail">이메일</label><input type="email" id="lEmail" name="email" autocomplete="email" required></div>
      <div class="row"><label for="lPw">비밀번호</label><input type="password" id="lPw" name="pw" autocomplete="current-password" required></div>
      <div data-lmsg></div>
      <button class="btn btn-brand">로그인</button>
      ${KAKAO ? `<p class="hint" style="text-align:center">또는</p>${kakaoBtn}` : ""}
      <p class="auth-links"><a href="#/auth/signup">회원가입</a><a href="#/auth/reset">비밀번호 찾기</a></p></form>`;
    const f = host.querySelector("[data-login]");
    host.querySelector("[data-kakao]")?.addEventListener("click", () => kakaoLogin(f.querySelector("[data-lmsg]")));
    f.onsubmit = async e => {
      e.preventDefault();
      const c = await SB.client();
      f.querySelector("button").disabled = true;
      const { error } = await c.auth.signInWithPassword({ email: f.email.value.trim(), password: f.pw.value });
      f.querySelector("button").disabled = false;
      if (error) return msg(f.querySelector("[data-lmsg]"), SB.errText(error));
      await refreshMe();
      location.hash = params.get("next") || "#/my/profile";
    };
  }

  function signupView(host) {
    if (!SB.configured) { host.innerHTML = notReady; return; }
    if (ME) { location.hash = "#/my/profile"; return; }
    host.innerHTML = `<form class="form" data-signup>
      ${KAKAO ? `${kakaoBtn}<p class="hint" style="text-align:center">카카오로 시작하면 첫 로그인 뒤에 동의 절차를 거칩니다. 또는 이메일로 가입:</p>` : ""}
      <p class="consent">홈페이지 회원은 게시판·자원봉사·협력 문의에 참여할 수 있습니다. <b>정회원</b>은 가입 후 마이페이지에서 가입신청서를 내고, 운영진 승인을 받으면 됩니다.</p>
      <div class="row"><label for="sEmail">이메일<em>*</em></label><input type="email" id="sEmail" name="email" autocomplete="email" required></div>
      <div class="grid2">
        <div class="row"><label for="sPw">비밀번호<em>*</em></label><input type="password" id="sPw" name="pw" minlength="8" autocomplete="new-password" required><p class="hint">8자 이상</p></div>
        <div class="row"><label for="sPw2">비밀번호 확인<em>*</em></label><input type="password" id="sPw2" name="pw2" minlength="8" autocomplete="new-password" required></div>
      </div>
      <div class="grid2">
        <div class="row"><label for="sName">이름 또는 활동명<em>*</em></label><input type="text" id="sName" name="name" maxlength="40" required></div>
        <div class="row"><label for="sType">회원 유형<em>*</em></label><select id="sType" name="type">
          <option>개인</option><option>팀·단체</option><option>자원봉사</option><option>기관</option></select></div>
      </div>
      <div class="row" data-org hidden><label for="sOrg">소속 팀·단체·기관명</label><input type="text" id="sOrg" name="org" maxlength="60"></div>
      <div class="row"><label for="sDong">활동하거나 사는 동 (선택)</label><select id="sDong" name="dong"><option value="">선택 안 함</option>
        ${DONG_NAMES.map(d => `<option>${d}</option>`).join("")}<option value="">시흥 외 지역</option></select>
        <p class="hint">마을 지도에 <b>동별 회원 수</b>로만 표시됩니다. 누가 어디 사는지는 공개되지 않습니다.</p></div>
      <div class="consent">
        <b>개인정보 수집·이용 동의 (필수)</b>
        <table><tr><th>항목</th><th>목적</th><th>보유 기간</th></tr>
          <tr><td>이메일, 비밀번호(암호화), 이름·활동명, 회원 유형</td><td>로그인, 본인 확인, 게시판 이용</td><td>탈퇴 시까지</td></tr>
          <tr><td>소속, 동 (선택 입력)</td><td>네트워크 안내, 동별 회원 수 집계</td><td>탈퇴 시까지</td></tr></table>
        동의를 거부할 수 있으나, 거부하면 회원가입을 할 수 없습니다. 자세한 내용은 <a href="#/disclosure/privacy" style="text-decoration:underline">개인정보처리방침</a>을 확인하세요.
        <label><input type="checkbox" name="agree" required> 개인정보 수집·이용에 동의합니다.</label>
        <label><input type="checkbox" name="age14" required> 만 14세 이상입니다.</label>
        <label><input type="checkbox" name="rules" required> 게시판 운영 원칙(광고·비방·개인정보 노출 금지)을 지키겠습니다.</label>
      </div>
      <div data-smsg></div>
      <button class="btn btn-brand">가입하기</button>
      <p class="auth-links"><a href="#/auth/login">이미 회원이신가요? 로그인</a></p></form>`;
    const f = host.querySelector("[data-signup]");
    host.querySelector("[data-kakao]")?.addEventListener("click", () => kakaoLogin(f.querySelector("[data-smsg]")));
    f.type.onchange = () => { host.querySelector("[data-org]").hidden = !["팀·단체", "기관"].includes(f.type.value); };
    f.onsubmit = async e => {
      e.preventDefault();
      const m = f.querySelector("[data-smsg]");
      if (f.pw.value !== f.pw2.value) return msg(m, "비밀번호가 서로 다릅니다.");
      const c = await SB.client();
      f.querySelector("button").disabled = true;
      const { data, error } = await c.auth.signUp({
        email: f.email.value.trim(), password: f.pw.value,
        options: { emailRedirectTo: redirectBase(), data: {
          display_name: f.name.value.trim(), member_type: f.type.value,
          org_name: f.org.value.trim(), dong: f.dong.value, privacy_agreed: "true" } },
      });
      f.querySelector("button").disabled = false;
      if (error) return msg(m, SB.errText(error));
      if (data.session) { await refreshMe(); location.hash = "#/my/profile"; return; }
      host.innerHTML = `<div class="notice-box"><b>인증 메일을 보냈습니다.</b><br>${h(f.email.value)} 받은편지함에서 링크를 누르면 가입이 완료됩니다.<br><span style="font-size:13px">메일이 안 보이면 스팸함을 확인해 주세요.</span></div>`;
    };
  }

  function resetView(host, params) {
    if (!SB.configured) { host.innerHTML = notReady; return; }
    const update = params.get("mode") === "update";
    host.innerHTML = update ? `<form class="form" data-reset>
        <p class="consent">새 비밀번호를 입력하세요.</p>
        <div class="row"><label for="rPw">새 비밀번호</label><input type="password" id="rPw" name="pw" minlength="8" autocomplete="new-password" required></div>
        <div data-rmsg></div><button class="btn btn-brand">비밀번호 변경</button></form>`
      : `<form class="form" data-reset>
        <p class="consent">가입한 이메일로 비밀번호를 다시 정하는 링크를 보내 드립니다.</p>
        <div class="row"><label for="rEmail">이메일</label><input type="email" id="rEmail" name="email" required></div>
        <div data-rmsg></div><button class="btn btn-brand">재설정 메일 받기</button>
        <p class="auth-links"><a href="#/auth/login">로그인으로</a></p></form>`;
    const f = host.querySelector("[data-reset]");
    f.onsubmit = async e => {
      e.preventDefault();
      const c = await SB.client(), m = f.querySelector("[data-rmsg]");
      f.querySelector("button").disabled = true;
      const { error } = update ? await c.auth.updateUser({ password: f.pw.value })
                               : await c.auth.resetPasswordForEmail(f.email.value.trim(), { redirectTo: redirectBase() });
      f.querySelector("button").disabled = false;
      if (error) return msg(m, SB.errText(error));
      msg(m, update ? "비밀번호를 바꿨습니다." : "메일을 보냈습니다. 받은편지함을 확인하세요.", true);
    };
  }

  /* ── 마이페이지 ───────────────────────────────── */
  function myCard() {
    const p = ME.profile || {};
    return `<div class="my-card"><span class="av">${h((p.display_name || "?").slice(0, 1))}</span>
      <div><h4>${h(p.display_name || "")}</h4><p>${h(ME.user.email || "카카오 계정")} · ${SB.ROLE_LABEL[p.role] || "가입 회원"}${p.org_name ? ` · ${h(p.org_name)}` : ""}</p></div>
      <div class="acts">${SB.isOfficer(p) ? `<a class="btn-s" href="workspace.html">업무공간</a>` : ""}<button class="btn-s" data-logout>로그아웃</button></div></div>`;
  }
  async function myProfile(host) {
    if (!SB.configured) { host.innerHTML = notReady; return; }
    if (!ME) { host.innerHTML = needLogin("#/my/profile"); return; }
    if (needsConsent()) {
      host.innerHTML = myCard() + `<form class="form" data-agree style="max-width:620px">
        <p class="consent">카카오 등 외부 계정으로 가입하셨습니다. 홈페이지를 이용하려면 아래에 동의해 주세요.</p>
        <div class="row"><label for="gName">이름 또는 활동명<em>*</em></label><input type="text" id="gName" name="name" maxlength="40" required value="${h(ME.profile.display_name || "")}"></div>
        <div class="consent">
          <table><tr><th>항목</th><th>목적</th><th>보유 기간</th></tr>
            <tr><td>외부 계정 식별자, 이메일(제공 시), 이름·활동명</td><td>로그인, 본인 확인, 게시판 이용</td><td>탈퇴 시까지</td></tr></table>
          동의를 거부할 수 있으나, 거부하면 홈페이지 회원 기능을 이용할 수 없습니다. <a href="#/disclosure/privacy" style="text-decoration:underline">개인정보처리방침</a>
          <label><input type="checkbox" name="agree" required> 개인정보 수집·이용에 동의합니다.</label>
          <label><input type="checkbox" name="age14" required> 만 14세 이상입니다.</label>
          <label><input type="checkbox" name="rules" required> 게시판 운영 원칙(광고·비방·개인정보 노출 금지)을 지키겠습니다.</label>
        </div>
        <div data-gmsg></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-brand">동의하고 시작하기</button><button type="button" class="btn btn-white" data-logout>동의하지 않고 로그아웃</button></div>
      </form>`;
      const g = host.querySelector("[data-agree]");
      g.onsubmit = async e => {
        e.preventDefault();
        const c = await SB.client();
        const { error } = await c.from("profiles").update({ display_name: g.name.value.trim(), privacy_agreed_at: new Date().toISOString() }).eq("id", ME.user.id);
        if (error) return msg(g.querySelector("[data-gmsg]"), SB.errText(error));
        await refreshMe(); myProfile(host);
      };
      return;
    }
    const p = ME.profile || {};
    host.innerHTML = myCard() + `
      ${p.role === "user" ? `<p class="consent" style="margin-bottom:24px">지금은 <b>가입 회원</b>입니다. 정회원이 되면 공동체 프로젝트와 총회에 참여할 수 있습니다. <a href="#/my/apply" style="color:var(--brand);font-weight:700">정회원 가입 신청 ›</a></p>` : ""}
      <form class="form" data-prof style="max-width:620px">
        <div class="grid2">
          <div class="row"><label for="pName">이름 또는 활동명</label><input type="text" id="pName" name="name" maxlength="40" required value="${h(p.display_name)}"></div>
          <div class="row"><label for="pType">회원 유형</label><select id="pType" name="type">${["개인", "팀·단체", "자원봉사", "기관"].map(t => `<option ${t === p.member_type ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        </div>
        <div class="row"><label for="pOrg">소속 팀·단체·기관명</label><input type="text" id="pOrg" name="org" maxlength="60" value="${h(p.org_name || "")}"></div>
        <div class="row"><label for="pDong">활동하거나 사는 동</label><select id="pDong" name="dong"><option value="">선택 안 함</option>${DONG_NAMES.map(d => `<option ${d === p.dong ? "selected" : ""}>${d}</option>`).join("")}</select></div>
        <div data-pmsg></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn btn-brand">저장</button>
          <a class="btn btn-white" href="#/auth/reset?mode=update">비밀번호 변경</a>
          <button type="button" class="btn btn-white" data-leave>탈퇴 요청</button></div>
      </form>`;
    const f = host.querySelector("[data-prof]");
    f.onsubmit = async e => {
      e.preventDefault();
      const c = await SB.client();
      const { error } = await c.from("profiles").update({ display_name: f.name.value.trim(), member_type: f.type.value, org_name: f.org.value.trim() || null, dong: f.dong.value || null }).eq("id", ME.user.id);
      if (error) return msg(f.querySelector("[data-pmsg]"), SB.errText(error));
      await refreshMe(); msg(f.querySelector("[data-pmsg]"), "저장했습니다.", true);
    };
    host.querySelector("[data-leave]").onclick = async () => {
      if (!confirm("탈퇴를 요청할까요? 운영진이 확인한 뒤 계정과 개인정보를 삭제합니다.")) return;
      const c = await SB.client();
      const { error } = await c.from("posts").insert({ board: "inquiry", title: "[탈퇴 요청]", body: `${ME.user.email} 계정의 탈퇴와 개인정보 삭제를 요청합니다.` });
      alert(error ? SB.errText(error) : "탈퇴 요청을 접수했습니다. 처리되면 이메일로 알려 드립니다.");
    };
  }

  const CHECKS = (name, items, sel = []) => `<div class="checks">${items.map(v => `<label><input type="checkbox" name="${name}" value="${h(v)}" ${sel.includes(v) ? "checked" : ""}>${h(v)}</label>`).join("")}</div>`;
  const RADIOS = (name, items, req) => `<div class="checks">${items.map(v => `<label><input type="radio" name="${name}" value="${h(v)}" ${req ? "required" : ""}>${h(v)}</label>`).join("")}</div>`;
  const vals = (f, name) => [...f.querySelectorAll(`[name="${name}"]:checked`)].map(i => i.value);
  const val1 = (f, name) => f.querySelector(`[name="${name}"]:checked`)?.value || null;

  async function myApply(host) {
    if (!SB.configured) { host.innerHTML = notReady; return; }
    if (!ME) { host.innerHTML = needLogin("#/my/apply"); return; }
    if (needsConsent()) { host.innerHTML = consentGate(); return; }
    const c = await SB.client();
    const { data: apps } = await c.from("applications").select("id,status,created_at,review_note").eq("user_id", ME.user.id).order("created_at", { ascending: false });
    const last = apps?.[0];
    const role = ME.profile?.role;
    if (role && role !== "user") { host.innerHTML = myCard() + `<div class="notice-box">이미 <b>${SB.ROLE_LABEL[role]}</b>입니다. 함께해 주셔서 고맙습니다.</div>`; return; }
    if (last && last.status === "pending") {
      host.innerHTML = myCard() + `<div class="notice-box"><b>가입신청서를 검토하고 있습니다.</b><br>${fmt(last.created_at)} 접수 · 운영진이 확인한 뒤 결과를 알려 드립니다.
        <div style="margin-top:14px"><button class="btn-s danger" data-cancel>신청 취소</button></div></div>`;
      host.querySelector("[data-cancel]").onclick = async () => { if (!confirm("신청을 취소할까요?")) return; await c.from("applications").delete().eq("id", last.id); myApply(host); };
      return;
    }
    const FIELD_NAMES = (typeof FIELDS !== "undefined" ? FIELDS : []).map(f => f[0]);
    host.innerHTML = myCard() + `
      ${last && last.status === "rejected" ? `<p class="form-msg err" style="margin-bottom:20px">이전 신청이 반려되었습니다.${last.review_note ? ` (${h(last.review_note)})` : ""} 내용을 보완해 다시 신청할 수 있습니다.</p>` : ""}
      <form class="form" data-apply style="max-width:820px">
        <p class="consent">가입신청서(별지 제2호 서식)를 온라인으로 작성합니다. <b>*</b> 표시만 필수이고 나머지는 선택입니다. 주민등록번호와 범죄경력 조회 정보는 여기서 받지 않습니다.</p>
        <fieldset><legend>1. 인적사항</legend>
          <div class="row"><span class="lb">신청 구분<em>*</em></span>${RADIOS("atype", ["개인", "팀·단체"], true)}
            <p class="hint">팀·단체는 대표자 본인 정보만 적습니다. 구성원 개인정보는 본인 동의를 받아 따로 제출합니다.</p></div>
          <div class="grid2">
            <div class="row"><label for="aName">성명<em>*</em></label><input type="text" id="aName" name="real_name" maxlength="40" required></div>
            <div class="row"><label for="aStage">예명·활동명 (팀은 팀명)</label><input type="text" id="aStage" name="stage_name" maxlength="60"></div>
            <div class="row"><label for="aBirth">생년월일<em>*</em></label><input type="date" id="aBirth" name="birth_date" required></div>
            <div class="row"><label for="aPhone">연락처<em>*</em></label><input type="tel" id="aPhone" name="phone" maxlength="20" required placeholder="010-0000-0000"></div>
          </div>
          <div class="row"><label for="aPf">포트폴리오·SNS</label><input type="url" id="aPf" name="portfolio_url" placeholder="https://"></div>
        </fieldset>
        <fieldset><legend>2. 가입자격 확인</legend>
          <div class="row"><span class="lb">지역 요건<em>*</em></span>${RADIOS("region", ["시흥시 거주", "시흥시에서 활동 중", "시흥시 활동 희망"], true)}</div>
          <p class="hint" data-agehint>연령 요건(만 19~39세)은 생년월일로 자동 확인합니다. 해당하지 않아도 가입할 수 있으나 청년 대상 지원사업 참여는 제한될 수 있습니다.</p>
        </fieldset>
        <fieldset><legend>3. 활동 분야</legend>
          <div class="row"><label for="aMain">주로 활동하는 분야</label><select id="aMain" name="main_field"><option value="">선택</option>${FIELD_NAMES.map(f => `<option>${f}</option>`).join("")}<option>기타</option></select></div>
          <div class="row"><span class="lb">그 밖에 활동하는 분야</span>${CHECKS("sub_fields", FIELD_NAMES)}</div>
          <div class="row"><span class="lb">주로 맡는 활동 (복수 선택)</span>${CHECKS("role_codes", typeof ROLE_CODES !== "undefined" ? ROLE_CODES : [])}</div>
        </fieldset>
        <fieldset><legend>4. 활동 경력 및 자격</legend>
          <div class="row"><label for="aCareer">소속·주요 활동 경력</label><textarea id="aCareer" name="career" maxlength="3000"></textarea></div>
          <div class="row"><span class="lb">보유 자격증</span>${CHECKS("certificates", ["문화예술교육사", "평생교육사", "보육·유아교육 관련", "사회복지사", "무대예술전문인", "기타"])}</div>
          <div class="row"><span class="lb">예술활동증명 (한국예술인복지재단)</span>${RADIOS("artist_cert", ["보유", "미보유", "신청 예정"])}</div>
        </fieldset>
        <fieldset><legend>5. 활동 여건</legend>
          <div class="row"><span class="lb">보유 장비</span>${CHECKS("equipment", ["촬영장비", "음향장비", "조명장비", "악기", "미술·공예 도구", "제작·공구", "없음"])}</div>
          <div class="row"><span class="lb">활동 가능 시간</span>${CHECKS("available_times", ["평일 주간", "평일 야간", "주말", "협의 가능"])}</div>
          <div class="row"><span class="lb">이동 수단</span>${RADIOS("vehicle", ["차량 보유(장비 운반 가능)", "차량 미보유"])}</div>
          <p class="hint">활동 여건은 팀 구성과 찾아가는 사업 배정에만 참고하며, 가입 여부에 영향을 주지 않습니다.</p>
        </fieldset>
        <fieldset><legend>6. 사례비 지급 관련</legend>
          <div class="row"><span class="lb">소득 구분</span>${RADIOS("income_type", ["사업자등록 보유", "프리랜서(사업소득)", "해당 없음"])}
            <p class="hint">실제 사례비 지급이 생길 때만 원천징수에 필요한 서류를 따로 요청합니다.</p></div>
        </fieldset>
        <fieldset><legend>7. 참여 희망 프로젝트</legend>
          <div class="row"><textarea name="wish_project" maxlength="3000" placeholder="시흥에서 함께 해 보고 싶은 문화예술 활동이 있다면 적어 주세요."></textarea></div>
        </fieldset>
        <fieldset><legend>8. 개인정보 동의</legend>
          <div class="consent">
            <table><tr><th>구분</th><th>항목</th><th>목적</th><th>보유 기간</th></tr>
              <tr><td>필수</td><td>성명, 생년월일, 연락처, 이메일</td><td>회원 관리, 활동 안내, 프로젝트 참여 연락</td><td>탈퇴 또는 목적 달성 시까지</td></tr>
              <tr><td>선택</td><td>활동 분야·경력·자격·여건·소득 구분</td><td>프로젝트 매칭, 강사 배정</td><td>탈퇴 시까지</td></tr></table>
            <label><input type="checkbox" name="consent_required" required> [필수] 개인정보 수집·이용에 동의합니다.</label>
            <label><input type="checkbox" name="consent_photo"> [선택] 활동 사진·영상을 단체 홍보(홈페이지, SNS)에 활용하는 것에 동의합니다.</label>
            <label><input type="checkbox" name="consent_provide"> [선택] 지원사업 신청 시 주관기관(지자체·문화재단 등)에 성명·생년월일·연락처·경력·자격을 제공하는 것에 동의합니다. (사업 정산 완료 시까지)</label>
            <p class="hint" style="margin-top:8px">선택 항목에 동의하지 않아도 가입할 수 있습니다. 아동·청소년 대상 프로그램에 참여하게 되면 관련 법령에 따른 범죄경력 조회 동의를 그때 따로 받습니다.</p>
          </div>
        </fieldset>
        <div data-amsg></div>
        <button class="btn btn-brand">가입신청서 제출</button>
      </form>`;
    const f = host.querySelector("[data-apply]");
    f.birth_date.onchange = () => {
      const b = new Date(f.birth_date.value); if (isNaN(b)) return;
      const t = new Date(); let age = t.getFullYear() - b.getFullYear();
      if (t < new Date(t.getFullYear(), b.getMonth(), b.getDate())) age--;
      host.querySelector("[data-agehint]").innerHTML = `만 <b>${age}</b>세 · 연령 요건 ${age >= 19 && age <= 39 ? "<b style='color:var(--brand)'>해당</b>" : "<b>해당하지 않음</b> (가입은 가능하며, 청년 대상 지원사업 참여는 제한될 수 있습니다)"}`;
      f.dataset.ageval = age;
    };
    f.onsubmit = async e => {
      e.preventDefault();
      const age = f.dataset.ageval === undefined ? NaN : +f.dataset.ageval;
      const row = {
        applicant_type: val1(f, "atype") || "개인", real_name: f.real_name.value.trim(), stage_name: f.stage_name.value.trim() || null,
        birth_date: f.birth_date.value || null, phone: f.phone.value.trim(), age_ok: isNaN(age) ? null : age >= 19 && age <= 39,
        region_status: val1(f, "region"), main_field: f.main_field.value || null, sub_fields: vals(f, "sub_fields"), role_codes: vals(f, "role_codes"),
        career: f.career.value.trim() || null, certificates: vals(f, "certificates"), artist_cert: val1(f, "artist_cert"),
        equipment: vals(f, "equipment"), available_times: vals(f, "available_times"),
        has_vehicle: val1(f, "vehicle") ? val1(f, "vehicle").startsWith("차량 보유") : null, income_type: val1(f, "income_type"),
        wish_project: f.wish_project.value.trim() || null, portfolio_url: f.portfolio_url.value.trim() || null,
        consent_required: f.consent_required.checked, consent_photo: f.consent_photo.checked, consent_provide: f.consent_provide.checked,
      };
      f.querySelector("button.btn-brand").disabled = true;
      const { error } = await c.from("applications").insert(row);
      f.querySelector("button.btn-brand").disabled = false;
      if (error) return msg(f.querySelector("[data-amsg]"), SB.errText(error));
      myApply(host);
      scrollTo(0, 0);
    };
  }

  async function myPosts(host) {
    if (!SB.configured) { host.innerHTML = notReady; return; }
    if (!ME) { host.innerHTML = needLogin("#/my/posts"); return; }
    const c = await SB.client();
    const { data } = await c.from("posts").select("id,board,title,created_at,is_hidden").eq("author_id", ME.user.id).order("created_at", { ascending: false }).limit(100);
    host.innerHTML = myCard() + `<ul class="bd-list">${(data || []).length ? data.map(r => `
      <li><a href="#/board/view?id=${r.id}"><span class="no">${h(BOARDS[r.board]?.label || "")}</span><span class="tt">${r.is_hidden ? "[숨김] " : ""}${h(r.title)}</span><span class="au"></span><span class="dt">${fmt(r.created_at)}</span></a></li>`).join("")
      : `<li class="empty">아직 쓴 글이 없습니다.</li>`}</ul>`;
  }

  /* ── 라우팅 연결 ──────────────────────────────── */
  function onRoute(page, sub, params) {
    if (page === "community") return boardList(q(`[data-board="${sub}"]`), sub, params);
    if (page === "news" && sub === "notice") {
      q("[data-static-notice]").hidden = SB.configured;
      if (SB.configured) boardList(q('[data-board="notice"]'), "notice", params);
      return;
    }
    if (page === "board" && sub === "view") return postView(q("#postView"), +params.get("id"));
    if (page === "board" && sub === "write") return postWrite(q("#postWrite"), params.get("b"), params.get("id") ? +params.get("id") : null);
    if (page === "auth" && sub === "login") return loginView(q("#authLogin"), params);
    if (page === "auth" && sub === "signup") return signupView(q("#authSignup"));
    if (page === "auth" && sub === "reset") return resetView(q("#authReset"), params);
    if (page === "my" && sub === "profile") return myProfile(q("#myProfile"));
    if (page === "my" && sub === "apply") return myApply(q("#myApply"));
    if (page === "my" && sub === "posts") return myPosts(q("#myPosts"));
  }

  const NEEDS_CM = /^#\/(auth|my|board|community|news\/notice)/;
  async function init() {
    paintAuth();
    if (NEEDS_CM.test(location.hash) && window.route) window.route();
    if (!SB.configured) return;
    const c = await SB.client();
    if (!c) return;
    c.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { location.hash = "#/auth/reset?mode=update"; }
      setTimeout(async () => {
        const was = !!ME;
        await refreshMe();
        if (was !== !!ME && NEEDS_CM.test(location.hash)) window.route && window.route();
        if (event === "SIGNED_IN" && !location.hash.startsWith("#/")) location.hash = "#/my/profile";
      }, 0);
    });
    await refreshMe();
    if (NEEDS_CM.test(location.hash) && window.route) window.route();
  }

  window.CM = { onRoute, BOARDS };
  init();
})();
