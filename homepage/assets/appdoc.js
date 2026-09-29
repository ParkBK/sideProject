/* ─────────────────────────────────────────────────────────────
   가입신청서 완성본 (온라인으로 작성한 내용을 서식 모양으로 채워 인쇄·PDF 저장)
   홈페이지 마이페이지(신청인 본인)와 업무공간(임원)이 함께 사용
   ───────────────────────────────────────────────────────────── */
(function () {
  const h = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const d8 = iso => { if (!iso) return ""; const d = new Date(iso); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; };
  const dt = iso => { if (!iso) return ""; const d = new Date(iso); const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  const box = on => on ? "☑" : "☐";
  /* 선택지를 모두 보여주고 고른 것에 체크 (종이 서식처럼) */
  const opts = (all, sel) => { sel = [].concat(sel || []); const extra = sel.filter(v => !all.includes(v)); return [...all, ...extra].map(v => `<span class="o">${box(sel.includes(v))} ${h(v)}</span>`).join(""); };
  const STATUS = { pending: "검토 중", approved: "승인", rejected: "반려" };
  const orgName = () => (typeof SITE !== "undefined" && SITE.name) || "시흥 청년문화예술공동체";

  function age(birth, at) {
    if (!birth) return null;
    const b = new Date(birth), t = at ? new Date(at) : new Date();
    let a = t.getFullYear() - b.getFullYear();
    if (t < new Date(t.getFullYear(), b.getMonth(), b.getDate())) a--;
    return a;
  }

  function html(a, meta = {}) {
    const fields = (typeof FIELDS !== "undefined" ? FIELDS : []).map(f => f[0]);
    const roles = typeof ROLE_CODES !== "undefined" ? ROLE_CODES : [];
    const ag = age(a.birth_date, a.created_at);
    const row = (k, v, span) => `<th>${k}</th><td${span ? ` colspan="${span}"` : ""}>${v || '<span class="blank"></span>'}</td>`;
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>가입신청서_${h(a.real_name)}_${(a.created_at || "").slice(0, 10)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
  @page{size:A4;margin:14mm 13mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Pretendard,"Malgun Gothic",sans-serif;color:#111;background:#e9ebee;font-size:12.5px;line-height:1.5;word-break:keep-all}
  .bar{position:sticky;top:0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:12px;background:#1c1c1e}
  .bar button{font:inherit;font-size:14px;font-weight:700;padding:10px 18px;border-radius:8px;border:0;cursor:pointer;background:#1847a4;color:#fff}
  .bar button.w{background:#fff;color:#111}
  .bar p{width:100%;text-align:center;color:#c9ccd1;font-size:12.5px}
  .paper{width:210mm;max-width:100%;min-height:297mm;margin:20px auto;background:#fff;padding:14mm 13mm;box-shadow:0 2px 12px rgba(0,0,0,.12)}
  .top{display:flex;justify-content:space-between;align-items:flex-start;font-size:11px;color:#555}
  h1{margin:10px 0 4px;text-align:center;font-size:24px;letter-spacing:.3em;font-weight:800}
  .sub{text-align:center;font-size:12px;color:#444;margin-bottom:14px}
  .stamp{display:inline-block;border:2px solid #1847a4;color:#1847a4;font-weight:800;padding:2px 10px;border-radius:4px;transform:rotate(-4deg)}
  .stamp.rejected{border-color:#b3261e;color:#b3261e}.stamp.pending{border-color:#8a5a00;color:#8a5a00}
  h2{font-size:13px;font-weight:800;margin:14px 0 4px}
  table{width:100%;border-collapse:collapse;table-layout:fixed}
  th,td{border:1px solid #333;padding:6px 7px;vertical-align:top;text-align:left}
  th{background:#f1f2f4;font-weight:700;width:22%;white-space:nowrap}
  td{white-space:pre-wrap;overflow-wrap:anywhere}
  .o{display:inline-block;margin:0 12px 2px 0;white-space:nowrap}
  .blank{display:inline-block;min-width:60px}
  .decl{margin-top:18px;text-align:center;line-height:2}
  .sign{margin-top:8px;text-align:right;font-size:14px;line-height:2.2}
  .sign b{display:inline-block;min-width:110px;text-align:center;border-bottom:1px solid #111}
  .to{margin-top:16px;text-align:center;font-size:16px;font-weight:800;letter-spacing:.1em}
  .note{margin-top:14px;padding:8px 10px;border:1px dashed #999;font-size:11px;color:#444}
  @media print{body{background:#fff}.bar{display:none}.paper{margin:0;padding:0;box-shadow:none;width:auto;min-height:0}h2,table{break-inside:avoid}}
  @media(max-width:800px){.paper{padding:18px 14px;margin:0}th{width:30%}}
</style></head><body>
<div class="bar"><button onclick="print()">인쇄 · PDF로 저장</button><button class="w" onclick="close()">닫기</button>
  <p>PDF로 저장하려면: 인쇄 창의 '대상(프린터)'에서 <b>PDF로 저장</b>을 고르세요.</p></div>
<div class="paper">
  <div class="top"><span>[별지 제2호 서식]</span><span>접수번호 ${h(a.id)} · <span class="stamp ${a.status}">${STATUS[a.status] || ""}</span></span></div>
  <h1>회원 가입신청서</h1>
  <p class="sub">${h(orgName())}</p>

  <h2>1. 인적사항</h2>
  <table>
    <tr>${row("신청 구분", opts(["개인", "팀·단체"], a.applicant_type), 3)}</tr>
    <tr>${row("성명", h(a.real_name))}${row("예명·활동명<br>(팀은 팀명)", h(a.stage_name))}</tr>
    <tr>${row("생년월일", a.birth_date ? `${h(a.birth_date.replaceAll("-", "."))}${ag != null ? ` (만 ${ag}세)` : ""}` : "")}${row("연락처", h(a.phone))}</tr>
    <tr>${row("이메일", h(meta.email))}${row("포트폴리오·SNS", h(a.portfolio_url))}</tr>
  </table>

  <h2>2. 가입자격 확인</h2>
  <table>
    <tr>${row("지역 요건", opts(["시흥시 거주", "시흥시에서 활동 중", "시흥시 활동 희망"], a.region_status))}</tr>
    <tr>${row("연령 요건<br>(만 19~39세)", a.age_ok == null ? "" : `${box(a.age_ok)} 해당 &nbsp; ${box(!a.age_ok)} 해당하지 않음`)}</tr>
  </table>

  <h2>3. 활동 분야</h2>
  <table>
    <tr>${row("주 활동 분야", h(a.main_field))}</tr>
    <tr>${row("그 밖의 분야", opts(fields, a.sub_fields))}</tr>
    <tr>${row("주로 맡는 활동", opts(roles, a.role_codes))}</tr>
  </table>

  <h2>4. 활동 경력 및 자격</h2>
  <table>
    <tr>${row("소속·주요 경력", h(a.career))}</tr>
    <tr>${row("보유 자격증", opts(["문화예술교육사", "평생교육사", "보육·유아교육 관련", "사회복지사", "무대예술전문인", "기타"], a.certificates))}</tr>
    <tr>${row("예술활동증명", opts(["보유", "미보유", "신청 예정"], a.artist_cert))}</tr>
  </table>

  <h2>5. 활동 여건</h2>
  <table>
    <tr>${row("보유 장비", opts(["촬영장비", "음향장비", "조명장비", "악기", "미술·공예 도구", "제작·공구", "없음"], a.equipment))}</tr>
    <tr>${row("활동 가능 시간", opts(["평일 주간", "평일 야간", "주말", "협의 가능"], a.available_times))}</tr>
    <tr>${row("이동 수단", a.has_vehicle == null ? "" : `${box(a.has_vehicle)} 차량 보유(장비 운반 가능) &nbsp; ${box(!a.has_vehicle)} 차량 미보유`)}</tr>
  </table>

  <h2>6. 사례비 지급 관련</h2>
  <table><tr>${row("소득 구분", opts(["사업자등록 보유", "프리랜서(사업소득)", "해당 없음"], a.income_type))}</tr></table>

  <h2>7. 참여 희망 프로젝트</h2>
  <table><tr><td style="min-height:60px">${h(a.wish_project) || '<span class="blank"></span>'}</td></tr></table>

  <h2>8. 개인정보 수집·이용 동의</h2>
  <table>
    <tr><th>[필수] 수집·이용</th><td>${box(a.consent_required)} 동의 — 성명, 생년월일, 연락처, 이메일 / 회원 관리·활동 안내 / 탈퇴 또는 목적 달성 시까지</td></tr>
    <tr><th>[선택] 사진·영상 활용</th><td>${box(a.consent_photo)} 동의 &nbsp; ${box(!a.consent_photo)} 동의하지 않음</td></tr>
    <tr><th>[선택] 제3자 제공</th><td>${box(a.consent_provide)} 동의 &nbsp; ${box(!a.consent_provide)} 동의하지 않음 — 지원사업 주관기관(지자체·문화재단 등), 사업 정산 완료 시까지</td></tr>
  </table>

  <p class="decl">위 본인은 ${h(orgName())}의 정관과 운영 원칙에 동의하며,<br>위와 같이 회원 가입을 신청합니다.</p>
  <p class="sign">${d8(a.created_at)}<br>신청인 <b>${h(a.real_name)}</b> (전자 제출)</p>
  <p class="to">${h(orgName())} 귀중</p>
  ${a.status !== "pending" ? `<p class="note">처리: ${STATUS[a.status]}${a.reviewed_at ? ` · ${dt(a.reviewed_at)}` : ""}${a.review_note ? ` · ${h(a.review_note)}` : ""}</p>` : ""}
  <p class="note">이 신청서는 홈페이지에서 본인 계정으로 로그인해 온라인으로 제출되었으며(제출 시각 ${dt(a.created_at)}, 접수번호 ${h(a.id)}), 전자 제출 기록이 서명을 대신합니다.
    주민등록번호와 범죄경력 조회 정보는 받지 않았습니다.</p>
</div></body></html>`;
  }

  /* 새 창에 완성본을 띄움. 팝업이 막히면 false */
  function open(app, meta) {
    const w = window.open("", "_blank");
    if (!w) { alert("팝업이 차단되었습니다. 브라우저 주소창 옆의 팝업 허용을 눌러 주세요."); return false; }
    w.document.open(); w.document.write(html(app, meta)); w.document.close();
    return true;
  }

  window.APPDOC = { open, html };
})();
