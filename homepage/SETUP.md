# 홈페이지 회원 기능 설정 안내

로그인, 회원가입, 게시판, 업무공간, 회계 장부는 **Supabase**라는 데이터베이스 서비스를 연결해야 동작합니다.
연결하기 전까지 이 기능들은 "준비 중"으로 표시되고, 나머지 홈페이지는 그대로 동작합니다.

소요 시간: 약 30분 · 비용: 무료 플랜으로 시작할 수 있습니다

---

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 단체 이메일로 가입합니다. 개인 계정보다 **단체 공용 계정**을 권합니다. 대표가 바뀌어도 이어서 관리할 수 있기 때문입니다.
2. **New project**를 누릅니다.
   - Name: `siheung-youth-arts`
   - Database Password: 긴 비밀번호를 만들고 **안전한 곳에 따로 보관**합니다.
   - **Region: Northeast Asia (Seoul)** — 반드시 서울을 고르세요. 회원 개인정보가 국외에 저장되면 개인정보처리방침에 국외 이전 내용을 추가해야 합니다.
3. 프로젝트가 만들어질 때까지 1~2분 기다립니다.

## 2. 데이터베이스 설치

1. 왼쪽 메뉴 **SQL Editor** → **New query**를 누릅니다.
2. `homepage/supabase/schema.sql` 파일 내용 전체를 붙여넣고 **Run**을 누릅니다.
3. "Success"가 나오면 끝입니다. 다시 실행해도 안전합니다.

## 3. 로그인 설정

**Authentication → URL Configuration**
- Site URL: 홈페이지 주소 (예: `https://단체계정.github.io/저장소명/`)
- Redirect URLs: 같은 주소를 추가

**Authentication → Providers → Email**
- Enable Email provider: 켜기
- Confirm email: **켜기** (가짜 이메일 가입을 막습니다)
- Minimum password length: 8

**Authentication → Email Templates** (선택)
- 인증 메일 제목과 내용을 한국어로 바꾸면 가입자가 덜 헷갈립니다.

> 무료 플랜은 인증 메일 발송량이 적습니다(시간당 몇 통 수준). 회원이 늘면 **Project Settings → Auth → SMTP**에서 단체 메일 계정을 연결하세요.

## 4. 홈페이지에 연결

1. **Project Settings → API**에서 두 값을 복사합니다.
   - Project URL
   - `anon` `public` 키
2. `homepage/assets/config.js`에 붙여넣습니다.

```js
window.SB_CONFIG = {
  url: "https://xxxxxxxx.supabase.co",
  anonKey: "eyJhbGciOi...",
};
```

> **`service_role` 키는 절대 넣지 마세요.** 이 키는 모든 보안을 우회합니다. `anon` 키는 공개돼도 괜찮습니다. 데이터는 데이터베이스의 권한 규칙(RLS)이 지킵니다.

## 5. 첫 관리자 지정

1. 홈페이지에서 대표 본인 이메일로 **회원가입**을 하고 인증 메일의 링크를 누릅니다.
2. Supabase **SQL Editor**에서 아래를 실행합니다. 이메일은 본인 것으로 바꾸세요.

```sql
select set_config('app.bypass_guard', 'on', false);
update public.profiles set role = 'admin', can_accounting = true
where id = (select id from auth.users where email = '대표이메일@example.com');
select set_config('app.bypass_guard', 'off', false);
```

3. 홈페이지에 다시 로그인하면 상단에 **업무공간** 버튼이 보입니다.
4. 나머지 임원(부대표, 회계)은 가입한 뒤 **업무공간 → 가입 신청·회원**에서 관리자가 권한을 바꿔 줍니다.
   - 부대표: 권한을 "임원"으로
   - 회계: 권한을 "임원"으로 하고 "회계" 칸 체크

## 6. 권한 정리

| 권한 | 할 수 있는 일 |
|---|---|
| 방문자 (로그인 안 함) | 홈페이지 보기, 게시글 읽기 |
| 가입 회원 | 글·댓글 쓰기, 신고, 협력 문의, 정회원 가입 신청 |
| 정회원 | 가입 회원 + 동별 회원 수 집계에 포함 |
| 임원 | 업무공간(대시보드·달력·할 일·활동 기록·가입 승인·신고 처리), 공지 작성, 글 숨김 |
| 회계 담당 (관리자가 지정) | 회계 장부·영수증 |
| 관리자 | 전부 + 권한 부여, 회계 담당 지정 |

**업무공간 주소(workspace.html)를 알아도** 권한이 없으면 데이터가 하나도 보이지 않습니다. 메뉴를 숨긴 것이 아니라 데이터베이스가 직접 막습니다.

## 7. 운영하면서 할 일

| 언제 | 할 일 | 어디서 |
|---|---|---|
| 활동이 끝나면 1주일 안에 | 활동 기록 추가 (동 꼭 입력) → 마을 지도가 채워짐 | 업무공간 → 활동 기록 |
| 가입 신청이 오면 | 검토 후 승인·반려 | 업무공간 → 가입 신청·회원 |
| 신고가 오면 | 확인 후 숨김·처리 완료 | 업무공간 → 신고 처리 |
| 돈이 오가면 바로 | 거래 기록 + 영수증 첨부 | 업무공간 → 회계 장부 |
| 매월 | 장부 마감, CSV 내려받아 보관 | 업무공간 → 회계 장부 |
| 탈퇴 요청이 오면 | Authentication → Users에서 계정 삭제 | Supabase 대시보드 |

## 8. 백업

무료 플랜은 자동 백업 복구 기능이 제한됩니다. **매월 회계 장부 CSV를 내려받아** 단체 드라이브에 보관하세요. 영수증 원본(종이)도 5년간 보관하는 것이 안전합니다.

## 9. 무료 플랜 주의

- 일정 기간(현재 약 1주) 아무도 접속하지 않으면 프로젝트가 **일시 정지**될 수 있습니다. 정지되면 대시보드에서 다시 켜면 됩니다. 운영이 안정되면 유료 플랜을 검토하세요.
- 저장 용량(데이터베이스·파일)에 한도가 있습니다. 영수증은 사진을 너무 크게 찍지 마세요.

> 요금과 한도는 바뀔 수 있으니 https://supabase.com/pricing 에서 확인하세요.
