-- ═══════════════════════════════════════════════════════════════
-- 시흥 청년문화예술공동체 홈페이지 데이터베이스 (Supabase / PostgreSQL)
--
-- 사용법: Supabase 대시보드 → SQL Editor에 이 파일 전체를 붙여넣고 Run
-- 다시 실행해도 안전하도록 작성했습니다 (if not exists / or replace).
--
-- 권한 체계 (profiles.role)
--   user     가입만 한 사람 (자원봉사자·단체장·일반 시민 포함)
--   member   정회원 (운영진이 가입 신청을 승인한 사람)
--   officer  임원 (업무공간 접근: 달력·할 일·활동 기록·회원 승인)
--   admin    관리자 (권한 부여, 회계 담당 지정, 전체 관리)
--   + can_accounting = true 인 사람만 회계 장부·영수증 접근
--
-- 중요: 화면에서 메뉴를 숨기는 것은 보안이 아닙니다.
-- 실제 차단은 아래 RLS(Row Level Security) 정책이 데이터베이스에서 합니다.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. 회원 프로필 ─────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null check (char_length(display_name) between 1 and 40),
  member_type    text not null default '개인'
                 check (member_type in ('개인','팀·단체','자원봉사','기관')),
  org_name       text check (char_length(org_name) <= 60),
  dong           text,                        -- 활동·거주 동 (선택, 동 단위까지만)
  role           text not null default 'user'
                 check (role in ('user','member','officer','admin')),
  can_accounting boolean not null default false,
  privacy_agreed_at timestamptz,
  created_at     timestamptz not null default now()
);

-- 권한 확인 함수 (RLS 안에서 재귀를 피하려고 security definer 사용)
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon')
$$;
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() in ('member','officer','admin')
$$;
create or replace function public.is_officer() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() in ('officer','admin')
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'admin'
$$;
create or replace function public.is_accountant() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and (role = 'admin' or (can_accounting and role in ('officer','member'))))
$$;

-- 회원가입 시 프로필 자동 생성 (가입 화면에서 보낸 이름·유형을 사용)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, member_type, org_name, dong, privacy_agreed_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)),
    coalesce(nullif(new.raw_user_meta_data->>'member_type',''), '개인'),
    nullif(new.raw_user_meta_data->>'org_name',''),
    nullif(new.raw_user_meta_data->>'dong',''),
    case when new.raw_user_meta_data->>'privacy_agreed' = 'true' then now() end
  );
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 본인이 자기 권한(role, can_accounting)을 올리지 못하게 막음
create or replace function public.guard_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.can_accounting is distinct from old.can_accounting)
     and not public.is_admin()
     and not (current_setting('app.bypass_guard', true) = 'on') then
    raise exception '권한 변경은 관리자만 할 수 있습니다';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile_privileges on public.profiles;
create trigger guard_profile_privileges before update on public.profiles
  for each row execute function public.guard_profile_privileges();

alter table public.profiles enable row level security;
drop policy if exists "profiles: 본인 조회" on public.profiles;
create policy "profiles: 본인 조회" on public.profiles for select using (id = auth.uid() or public.is_officer());
drop policy if exists "profiles: 본인 수정" on public.profiles;
create policy "profiles: 본인 수정" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles: 관리자 수정" on public.profiles;
create policy "profiles: 관리자 수정" on public.profiles for update using (public.is_admin());

-- 게시판에 표시할 이름만 공개 (역할·연락처 등은 노출하지 않음)
create or replace view public.profile_names as
  select id, display_name, member_type, org_name from public.profiles;
grant select on public.profile_names to anon, authenticated;

-- ── 2. 정회원 가입 신청서 (가입신청서 서식을 온라인으로) ─────────
-- 주민등록번호·범죄경력 조회 정보는 여기서 받지 않습니다.
-- (아동·청소년 사업 배정 시에만 별도 서면으로, 조회 후 즉시 파기)
create table if not exists public.applications (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  applicant_type  text not null default '개인' check (applicant_type in ('개인','팀·단체')),
  real_name       text not null check (char_length(real_name) between 1 and 40),
  stage_name      text,
  birth_date      date,
  phone           text,
  age_ok          boolean,                       -- 만 19~39세 해당 여부
  region_status   text check (region_status in ('시흥시 거주','시흥시에서 활동 중','시흥시 활동 희망')),
  main_field      text,
  sub_fields      text[] not null default '{}',
  role_codes      text[] not null default '{}',
  career          text,
  certificates    text[] not null default '{}',
  artist_cert     text check (artist_cert in ('보유','미보유','신청 예정')),
  equipment       text[] not null default '{}',
  available_times text[] not null default '{}',
  has_vehicle     boolean,
  income_type     text check (income_type in ('사업자등록 보유','프리랜서(사업소득)','해당 없음')),
  wish_project    text,
  portfolio_url   text,
  consent_required boolean not null check (consent_required),  -- 필수 동의 없이는 저장 불가
  consent_photo    boolean not null default false,              -- 선택
  consent_provide  boolean not null default false,              -- 선택 (지원사업 주관기관 제공)
  review_note     text,
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create unique index if not exists applications_one_pending
  on public.applications(user_id) where status = 'pending';

alter table public.applications enable row level security;
drop policy if exists "applications: 본인 조회" on public.applications;
create policy "applications: 본인 조회" on public.applications for select using (user_id = auth.uid() or public.is_officer());
drop policy if exists "applications: 본인 신청" on public.applications;
create policy "applications: 본인 신청" on public.applications for insert
  with check (user_id = auth.uid() and status = 'pending' and reviewed_by is null);
drop policy if exists "applications: 본인 취소" on public.applications;
create policy "applications: 본인 취소" on public.applications for delete using (user_id = auth.uid() and status = 'pending');
drop policy if exists "applications: 임원 심사" on public.applications;
create policy "applications: 임원 심사" on public.applications for update using (public.is_officer());

-- 승인되면 자동으로 정회원(member)이 됨
create or replace function public.on_application_reviewed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform set_config('app.bypass_guard', 'on', true);
    update public.profiles set role = 'member' where id = new.user_id and role = 'user';
    perform set_config('app.bypass_guard', 'off', true);
  end if;
  if new.status <> old.status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end $$;
drop trigger if exists on_application_reviewed on public.applications;
create trigger on_application_reviewed before update on public.applications
  for each row execute function public.on_application_reviewed();

-- ── 3. 게시판 · 댓글 · 신고 ────────────────────────────────────
-- board: free(자유) collab(협업 제안) volunteer(자원봉사) qna(묻고 답하기)
--        notice(공지, 임원만 작성) inquiry(협력 문의, 작성자와 임원만 열람)
create table if not exists public.posts (
  id         bigint generated always as identity primary key,
  board      text not null check (board in ('free','collab','volunteer','qna','notice','inquiry')),
  title      text not null check (char_length(title) between 1 and 120),
  body       text not null check (char_length(body) between 1 and 10000),
  author_id  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_board_created on public.posts(board, created_at desc);

create table if not exists public.comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.posts(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  author_id  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  is_hidden  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_post on public.comments(post_id, created_at);

create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  target_type text not null check (target_type in ('post','comment')),
  target_id   bigint not null,
  reason      text not null check (char_length(reason) between 1 and 500),
  reporter    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 작성자가 is_hidden(숨김)을 스스로 풀지 못하게 막음
create or replace function public.guard_hidden() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_hidden is distinct from old.is_hidden and not public.is_officer() then
    raise exception '숨김 처리는 임원만 할 수 있습니다';
  end if;
  if tg_table_name = 'posts' then new.updated_at := now(); end if;
  return new;
end $$;
drop trigger if exists guard_hidden on public.posts;
create trigger guard_hidden before update on public.posts for each row execute function public.guard_hidden();
drop trigger if exists guard_hidden on public.comments;
create trigger guard_hidden before update on public.comments for each row execute function public.guard_hidden();

alter table public.posts enable row level security;
drop policy if exists "posts: 읽기" on public.posts;
create policy "posts: 읽기" on public.posts for select using (
  public.is_officer()
  or author_id = auth.uid()
  or (board <> 'inquiry' and not is_hidden)
);
drop policy if exists "posts: 쓰기" on public.posts;
create policy "posts: 쓰기" on public.posts for insert with check (
  auth.uid() is not null and author_id = auth.uid() and not is_hidden
  and (board <> 'notice' or public.is_officer())
);
drop policy if exists "posts: 수정" on public.posts;
create policy "posts: 수정" on public.posts for update using (author_id = auth.uid() or public.is_officer())
  with check ((author_id = auth.uid() or public.is_officer()) and (board <> 'notice' or public.is_officer()));
drop policy if exists "posts: 삭제" on public.posts;
create policy "posts: 삭제" on public.posts for delete using (author_id = auth.uid() or public.is_officer());

alter table public.comments enable row level security;
drop policy if exists "comments: 읽기" on public.comments;
create policy "comments: 읽기" on public.comments for select using (
  exists (select 1 from public.posts p where p.id = post_id)   -- 글을 볼 수 있는 사람만 (posts RLS 적용)
  and (not is_hidden or author_id = auth.uid() or public.is_officer())
);
drop policy if exists "comments: 쓰기" on public.comments;
create policy "comments: 쓰기" on public.comments for insert with check (
  auth.uid() is not null and author_id = auth.uid() and not is_hidden
  and exists (select 1 from public.posts p where p.id = post_id and not p.is_hidden)
);
drop policy if exists "comments: 수정" on public.comments;
create policy "comments: 수정" on public.comments for update using (author_id = auth.uid() or public.is_officer());
drop policy if exists "comments: 삭제" on public.comments;
create policy "comments: 삭제" on public.comments for delete using (author_id = auth.uid() or public.is_officer());

alter table public.reports enable row level security;
drop policy if exists "reports: 신고" on public.reports;
create policy "reports: 신고" on public.reports for insert with check (auth.uid() is not null and reporter = auth.uid() and not resolved);
drop policy if exists "reports: 임원 조회" on public.reports;
create policy "reports: 임원 조회" on public.reports for select using (public.is_officer() or reporter = auth.uid());
drop policy if exists "reports: 임원 처리" on public.reports;
create policy "reports: 임원 처리" on public.reports for update using (public.is_officer());

-- ── 4. 활동 기록 (홈페이지 활동 소식 · 마을 지도 · 숫자 집계의 원천) ──
create table if not exists public.activities (
  id              bigint generated always as identity primary key,
  activity_date   date,
  date_label      text,
  title           text not null check (char_length(title) between 1 and 120),
  activity_type   text check (activity_type in ('공연','전시','공공미술','교육','축제·행사','콘텐츠','생활문화','봉사','기타')),
  dong            text,
  place           text,
  host_org        text,
  description     text,
  image_url       text,
  beneficiaries   integer check (beneficiaries >= 0),
  members_joined  integer check (members_joined >= 0),
  paid            boolean,
  portrait_consent boolean not null default false,
  has_minor        boolean not null default false,
  guardian_consent boolean not null default false,
  is_public       boolean not null default false,
  created_by      uuid references auth.users(id) default auth.uid(),
  created_at      timestamptz not null default now(),
  -- 사진이 있으면 초상권 동의, 미성년자가 있으면 법정대리인 동의가 있어야 공개 가능
  constraint activities_publish_consent check (
    not is_public
    or ((image_url is null or image_url = '' or portrait_consent)
        and (not has_minor or guardian_consent))
  )
);
alter table public.activities enable row level security;
drop policy if exists "activities: 임원 관리" on public.activities;
create policy "activities: 임원 관리" on public.activities for all using (public.is_officer()) with check (public.is_officer());

-- 외부에 공개하는 필드만 담은 뷰 (유상 여부·동의 여부·작성자는 노출하지 않음)
create or replace view public.public_activities as
  select id, activity_date, date_label, title, activity_type, dong, description, image_url, beneficiaries
  from public.activities where is_public;
grant select on public.public_activities to anon, authenticated;

-- 마을 지도: 동별 회원 수 (개인 식별 없이 숫자만)
create or replace function public.dong_member_counts()
returns table(dong text, members bigint)
language sql stable security definer set search_path = public as $$
  select dong, count(*) from public.profiles
  where dong is not null and role in ('member','officer','admin')
  group by dong
$$;
grant execute on function public.dong_member_counts() to anon, authenticated;

-- ── 5. 임원 업무공간: 일정 · 할 일 ──────────────────────────────
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  title       text not null,
  start_date  date not null,
  end_date    date,
  category    text default '일정',
  memo        text,
  created_by  uuid references auth.users(id) default auth.uid(),
  created_at  timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create table if not exists public.tasks (
  id          bigint generated always as identity primary key,
  title       text not null,
  category    text default '할 일',
  due_date    date,
  assignee    uuid references auth.users(id),
  done        boolean not null default false,
  done_at     timestamptz,
  memo        text,
  created_by  uuid references auth.users(id) default auth.uid(),
  created_at  timestamptz not null default now()
);
alter table public.events enable row level security;
alter table public.tasks enable row level security;
drop policy if exists "events: 임원" on public.events;
create policy "events: 임원" on public.events for all using (public.is_officer()) with check (public.is_officer());
drop policy if exists "tasks: 임원" on public.tasks;
create policy "tasks: 임원" on public.tasks for all using (public.is_officer()) with check (public.is_officer());

-- ── 6. 회계 장부 · 영수증 (관리자가 지정한 회계 담당자만) ─────────
create table if not exists public.ledger (
  id             bigint generated always as identity primary key,
  tx_date        date not null,
  kind           text not null check (kind in ('수입','지출')),
  amount         bigint not null check (amount > 0),        -- 원 단위
  category       text not null,
  project        text,                                       -- 자체 사업 / 공모사업명
  counterparty   text,
  method         text check (method in ('계좌이체','카드','현금','기타')),
  withholding    bigint not null default 0 check (withholding >= 0),  -- 원천징수액
  related_party  boolean not null default false,             -- 임원·특수관계인 거래
  approval_note  text,                                       -- 특수관계 거래 시 의결 회의록 정보
  memo           text,
  receipt_path   text,                                       -- storage: receipts 버킷 경로
  created_by     uuid references auth.users(id) default auth.uid(),
  created_at     timestamptz not null default now(),
  constraint ledger_related_party_needs_approval
    check (not related_party or coalesce(char_length(approval_note),0) > 0)
);
alter table public.ledger enable row level security;
drop policy if exists "ledger: 회계 담당" on public.ledger;
create policy "ledger: 회계 담당" on public.ledger for all using (public.is_accountant()) with check (public.is_accountant());

-- 영수증 파일: 비공개 버킷, 회계 담당만 읽기·쓰기
insert into storage.buckets (id, name, public) values ('receipts','receipts', false)
  on conflict (id) do update set public = false;
drop policy if exists "receipts: 회계 담당" on storage.objects;
create policy "receipts: 회계 담당" on storage.objects for all
  using (bucket_id = 'receipts' and public.is_accountant())
  with check (bucket_id = 'receipts' and public.is_accountant());

-- ── 7. 권한 부여 ───────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select on public.posts, public.comments to anon;
grant select, insert, update, delete on
  public.profiles, public.applications, public.posts, public.comments, public.reports,
  public.activities, public.events, public.tasks, public.ledger to authenticated;
revoke insert, delete on public.profiles from authenticated;  -- 프로필은 가입 트리거로만 생성
