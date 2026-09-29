/* ─────────────────────────────────────────────────────────────
   홈페이지 기본 내용 (index.html 과 업무공간 workspace.html 이 함께 사용)

   데이터베이스를 연결했다면: 업무공간 → "홈페이지 관리"에서 고치세요.
     저장한 값이 아래 기본값보다 우선합니다.
   연결 전이거나 화면에 없는 항목(설립일, 사업 설명 등)은 이 파일에서 고칩니다.
   ───────────────────────────────────────────────────────────── */
const SITE = {
  name: "시흥 청년문화예술공동체",
  mission: "분야를 넘나드는 청년들의 협업으로, 지역의 문제를 문화로 풀어냅니다.",
  vision: "시흥의 청년 창작자가 지역의 문화를 함께 만들어가는 도시",
  founded: "2026년 7월 2일",
  foundedDate: "2026-07-02",
  rep: "박병근",
  address: "경기도 시흥시 서촌상가 2길 25-1, 405호",
  regNo: "",          // 고유번호 예: "000-00-00000"
  email: "",          // 입력하면 문의 버튼이 생깁니다
  instagramUrl: "",   // 예: "https://instagram.com/계정"

  /* 대표 인사말 — 비어 있으면 '인사말' 메뉴가 숨겨집니다. 줄바꿈은 \n */
  greeting: "",

  /* 조직 — 이름이 하나라도 있으면 '조직' 메뉴가 나타납니다. photo 예: "images/member-rep.jpg" */
  team: [
    { role: "대표",   name: "", bio: "", photo: "" },
    { role: "부대표", name: "", bio: "", photo: "" },
    { role: "회계",   name: "", bio: "", photo: "" },
  ],
  /* 로그인·게시판·활동 DB 연결 설정은 assets/config.js 에 있습니다 */
};

/* 연혁 (단체의 주요 이정표) */
const HISTORY = [
  { date: "2026.07.02", text: "시흥 청년문화예술공동체 창립총회 및 설립" },
];

/* 공지사항 — 비어 있으면 '공지사항' 메뉴와 탭이 숨겨집니다. 새 글은 맨 위에 */
const NOTICES = [
  // { date: "2026.10.01", title: "홈페이지를 개설했습니다", url: "" },
];

/* 참여 모집 — deadline(YYYY-MM-DD)이 있으면 D-day, 없으면 '상시 모집'
   capacity(정원)와 applied(신청 인원)를 숫자로 넣으면 진행 막대가 표시됩니다 */
const RECRUITS = [
  { org: "회원 모집", title: "함께 활동할 시흥 청년 회원 모집", place: "시흥시 일대", time: "프로젝트별 상이", period: "상시", deadline: "", capacity: "", applied: "", link: "#/join/member" },
];

/* 활동 소식 (DB 연결 전 기본값)
   type: 공연 / 공공미술 / 교육 / 기타,  beneficiaries: 수혜 인원(숫자, 모르면 비워 둠)
   dong: 활동한 행정동 이름(예: "장곡동"). 넣으면 마을 지도에 표시됩니다. 모르면 비워 둠 */
const ACTIVITIES = [
  { activity_date: "2026-07-02", date_label: "2026.07.02", activity_type: "기타", title: "단체 설립 (창립총회)", description: "", image_url: "", beneficiaries: "", dong: "" },
  { activity_date: "2026-07-01", date_label: "2026.07~", activity_type: "공연", title: "지역 행사 청년 문화예술인 공연 참여 운영", description: "", image_url: "", beneficiaries: "", dong: "" },
  { activity_date: "2026-09-01", date_label: "2026.09", activity_type: "공공미술", title: "시흥갯골축제 벽화 봉사", description: "", image_url: "", beneficiaries: "", dong: "장곡동" /* 갯골생태공원: 장곡동 */ },
  { activity_date: "", date_label: "", activity_type: "교육", title: "청소년 진로체험 부스 운영", description: "", image_url: "", beneficiaries: "", dong: "" },
];

/* 마을 거점 — 사무소, 협력 공간 등. dong을 넣으면 지도에 핀이 찍힙니다
   사무소(서촌상가2길)는 법정동 정왕동입니다. 정왕본동·정왕1~4동·거북섬동 중 어느 행정동인지 확인해 넣으세요 */
const PLACES = [
  { name: "단체 사무소", type: "거점", dong: "", address: "경기도 시흥시 서촌상가 2길 25-1, 405호" },
];
/* ═══════════════════════════════════════ */

/* 주요 활동 (가입안내 2. 주요 활동 기준)
   status: "수행 중" 또는 "추진 예정" — 실제 진행 상황에 맞게 바꿔 주세요 */
const PROGRAMS = [
  { key: "performance", status: "수행 중", icon: "music", title: "공연·전시·상영",
    short: "장르를 가리지 않는 공연·전시·상영 등 문화예술 활동을 만듭니다.",
    target: "축제·행사 주최 측, 기관, 시민", how: "축제 공연 기획·섭외, 거리공연, 전시, 상영회" },
  { key: "content", status: "추진 예정", icon: "film", title: "지역문화 콘텐츠 기획·제작",
    short: "시흥의 이야기와 장소를 영상·출판·디자인 콘텐츠로 기록하고 만듭니다.",
    target: "지역 기관, 시민", how: "지역 기록 영상, 출판물, 디자인 콘텐츠" },
  { key: "collab", status: "추진 예정", icon: "people", title: "분야를 넘는 협업 프로젝트",
    short: "서로 다른 분야의 창작자가 만나 하나의 작품과 프로젝트를 만듭니다.",
    target: "청년 창작자", how: "음악×영상, 미술×공간, 공연×기술 등 공동 창작" },
  { key: "education", status: "수행 중", icon: "book", title: "문화예술 교육·시민 체험",
    short: "청소년과 시민이 직접 해 보는 문화예술 교육과 체험 프로그램을 운영합니다.",
    target: "청소년, 학교, 시민", how: "청소년 진로체험 부스, 찾아가는 체험, 원데이 클래스" },
  { key: "tech", status: "추진 예정", icon: "code", title: "문화예술 × 기술 융합",
    short: "AI·XR·게임 등 기술과 예술을 결합한 새로운 콘텐츠를 개발합니다.",
    target: "청년, 청소년, 기관", how: "AI 창작, 미디어아트, 게임·인터랙티브, Unity 교육" },
  { key: "local", status: "수행 중", icon: "pin", title: "지역 공간·상권·주민 연계",
    short: "지역의 공간과 상권, 주민과 함께하는 문화활동을 만듭니다.",
    target: "마을, 상권, 지역 축제", how: "공공미술·벽화, 상권 연계 행사, 마을 축제 참여" },
  { key: "life", status: "추진 예정", icon: "leaf", title: "생활문화·여가 프로그램",
    short: "일상 속에서 누구나 즐길 수 있는 생활문화 프로그램을 운영합니다.",
    target: "시민, 동아리", how: "생활예술, 동아리, 움직임·여가 활동" },
  { key: "network", status: "추진 예정", icon: "chat", title: "청년 창작자 네트워킹",
    short: "시흥의 청년 창작자가 만나고, 서로의 기술로 공동 프로젝트를 꾸립니다.",
    target: "청년 창작자", how: "창작자 교류회, 프로젝트 매칭" },
];

/* 함께하는 분야 (가입신청서 3. 활동 분야) */
const FIELDS = [
  ["음악","밴드·대중음악, 클래식, 연주, 보컬, 작·편곡"],["국악","국악 연주, 판소리, 사물놀이, 전통연희"],
  ["무용","한국무용, 현대무용, 발레, 스트리트댄스"],["연극","배우, 연출, 극작, 무대"],["뮤지컬","뮤지컬 실연·제작"],
  ["연예","공연 진행, 사회(MC), 대중 퍼포먼스"],["미술","회화, 조각, 설치, 공예"],["응용미술","그래픽·공간·무대 디자인, 일러스트"],
  ["사진","사진 창작, 기록촬영"],["만화·애니","만화, 웹툰, 애니메이션"],["영화·영상","연출·촬영·편집, 방송·1인 미디어"],
  ["문학·출판","시, 소설, 에세이, 극본, 편집·출판"],["건축·공간","건축, 공간 기획·연출, 인테리어"],["게임","게임, 인터랙티브 콘텐츠"],
  ["융합예술","미디어아트, 기술결합 창작, AI·XR"],["생활문화","생활체육·움직임, 동아리, 여가 문화활동"],
];
/* 참여하는 방식 (가입신청서 활동 코드) */
const ROLE_CODES = ["A. 공연·연주·상연","B. 전시·작품 발표","C. 영상·기록 제작","D. 문화예술 교육","E. 지역문화 콘텐츠 제작","F. 행사 기획·운영","G. 기술융합 프로젝트","H. 아동·청소년 대상 교육","I. 생활문화·시민 참여형","J. 홍보·디자인 지원","K. 회원 간 협업","L. 기타"];

/* ── 업무공간에서 고칠 수 있는 항목 ── */
const SITE_FIELDS = {
  site: ["mission", "vision", "rep", "address", "regNo", "email", "instagramUrl", "greeting"],
  team: ["role", "name", "bio", "photo"],
  history: ["date", "text"],
  recruits: ["org", "title", "place", "time", "period", "deadline", "capacity", "applied", "link"],
  places: ["name", "type", "dong", "address"],
};
const PROGRAM_STATUS = ["수행 중", "추진 예정"];
/* 링크·사진 주소는 사이트 안 주소와 http(s)만 허용 (javascript: 같은 주소 차단) */
function safeUrl(u) {
  u = String(u ?? "").trim();
  return /^(https?:\/\/|#\/|mailto:|images\/|docs\/)/i.test(u) ? u : "";
}
function cleanItem(kind, x) {
  const o = {};
  SITE_FIELDS[kind].forEach(k => { o[k] = String(x && x[k] != null ? x[k] : "").slice(0, 2000); });
  if ("link" in o) o.link = safeUrl(o.link);
  if ("photo" in o) o.photo = safeUrl(o.photo);
  return o;
}
/* 기본값 사본: 업무공간의 "기본값으로 되돌리기"와 비교용 */
const SITE_DEFAULTS = JSON.parse(JSON.stringify({
  site: Object.fromEntries(SITE_FIELDS.site.map(k => [k, SITE[k]])), team: SITE.team, history: HISTORY,
  recruits: RECRUITS, places: PLACES, programs: Object.fromEntries(PROGRAMS.map(p => [p.key, p.status])),
}));
/* 데이터베이스(site_settings) 값을 기본값 위에 덮어씀 */
function applySiteSettings(rows) {
  /* 먼저 기본값으로 되돌린 뒤 덮어씀 (업무공간에서 "기본값으로 되돌리기" 한 항목 반영) */
  const D = JSON.parse(JSON.stringify(SITE_DEFAULTS));
  Object.assign(SITE, D.site); SITE.team = D.team;
  HISTORY.splice(0, HISTORY.length, ...D.history); RECRUITS.splice(0, RECRUITS.length, ...D.recruits); PLACES.splice(0, PLACES.length, ...D.places);
  PROGRAMS.forEach(x => { x.status = D.programs[x.key]; });
  const get = k => (rows || []).find(r => r.key === k)?.value;
  const put = (arr, kind) => { const v = get(kind); if (Array.isArray(v)) arr.splice(0, arr.length, ...v.map(x => cleanItem(kind, x))); };
  const s = get("site");
  if (s && typeof s === "object") SITE_FIELDS.site.forEach(k => { if (typeof s[k] === "string") SITE[k] = s[k]; });
  SITE.instagramUrl = safeUrl(SITE.instagramUrl);
  const t = get("team"); if (Array.isArray(t)) SITE.team = t.map(x => cleanItem("team", x));
  put(HISTORY, "history"); put(RECRUITS, "recruits"); put(PLACES, "places");
  const p = get("programs");
  if (p && typeof p === "object") PROGRAMS.forEach(x => { if (PROGRAM_STATUS.includes(p[x.key])) x.status = p[x.key]; });
}
