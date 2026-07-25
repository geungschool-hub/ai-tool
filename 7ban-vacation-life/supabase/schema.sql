-- ============================================================
-- 7반의 방학 라이프 — Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여넣고 Run 하세요.
-- 방학 기간: 2026-07-22 ~ 2026-08-10 / 셋로그 슬롯: 07시~23시 정각
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- 테이블
-- ------------------------------------------------------------

create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  student_no    text not null unique,
  name          text not null,
  pin_hash      text not null,
  session_token uuid,
  is_teacher    boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.books (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students(id) on delete cascade,
  title          text not null,
  author         text,
  review         text,
  finished_on    date,
  is_report_pick boolean not null default false,
  created_at     timestamptz not null default now()
);

create table if not exists public.setlog_days (
  day        date primary key,
  student_id uuid not null references public.students(id) on delete cascade
);

create table if not exists public.setlog_videos (
  id           uuid primary key default gen_random_uuid(),
  day          date not null,
  hour         int  not null check (hour between 0 and 23),
  student_id   uuid not null references public.students(id) on delete cascade,
  storage_path text not null,
  caption      text,
  created_at   timestamptz not null default now(),
  unique (day, hour)
);

create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('book', 'video')),
  target_id   uuid not null,
  student_id  uuid not null references public.students(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (target_type, target_id, student_id)
);

-- 직접 접근은 전부 차단하고(RLS), 읽기는 뷰 / 쓰기는 RPC 함수로만 허용
alter table public.students      enable row level security;
alter table public.books         enable row level security;
alter table public.setlog_days   enable row level security;
alter table public.setlog_videos enable row level security;
alter table public.reactions     enable row level security;

-- ------------------------------------------------------------
-- 공개 읽기용 뷰 (PIN/세션토큰은 절대 노출되지 않음)
-- ------------------------------------------------------------

create or replace view public.v_students as
  select id, student_no, name, is_teacher
  from public.students
  order by student_no;

create or replace view public.v_books as
  select b.id, b.student_id, s.student_no, s.name, b.title, b.author,
         b.review, b.finished_on, b.is_report_pick, b.created_at
  from public.books b
  join public.students s on s.id = b.student_id
  order by b.created_at desc;

create or replace view public.v_setlog_days as
  select d.day, d.student_id, s.student_no, s.name
  from public.setlog_days d
  join public.students s on s.id = d.student_id
  order by d.day;

create or replace view public.v_setlog_videos as
  select v.id, v.day, v.hour, v.student_id, s.name, v.storage_path,
         v.caption, v.created_at
  from public.setlog_videos v
  join public.students s on s.id = v.student_id
  order by v.day, v.hour;

create or replace view public.v_reactions as
  select r.target_type, r.target_id, r.student_id, s.name
  from public.reactions r
  join public.students s on s.id = r.student_id;

grant select on public.v_students, public.v_books, public.v_setlog_days,
                public.v_setlog_videos, public.v_reactions
  to anon, authenticated;

-- ------------------------------------------------------------
-- 내부 헬퍼
-- ------------------------------------------------------------

create or replace function public._auth(p_token uuid)
returns public.students
language plpgsql security definer set search_path = public, extensions
as $$
declare s public.students;
begin
  if p_token is null then
    raise exception '로그인이 필요해요.';
  end if;
  select * into s from students where session_token = p_token;
  if s.id is null then
    raise exception '세션이 만료됐어요. 다시 로그인해 주세요.';
  end if;
  return s;
end $$;

revoke execute on function public._auth(uuid) from public, anon, authenticated;

create or replace function public._profile(s public.students)
returns json
language sql immutable
as $$
  select json_build_object(
    'token', s.session_token, 'id', s.id, 'student_no', s.student_no,
    'name', s.name, 'is_teacher', s.is_teacher);
$$;

revoke execute on function public._profile(public.students) from public, anon, authenticated;

-- ------------------------------------------------------------
-- 가입 / 로그인
-- ------------------------------------------------------------

create or replace function public.register_student(p_student_no text, p_name text, p_pin text)
returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare s public.students;
begin
  if p_student_no is null or btrim(p_student_no) = '' then
    raise exception '학번을 입력해 주세요.';
  end if;
  if p_name is null or length(btrim(p_name)) < 2 then
    raise exception '이름을 정확히 입력해 주세요.';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN은 숫자 4~6자리로 정해 주세요.';
  end if;
  if exists (select 1 from students where student_no = btrim(p_student_no)) then
    raise exception '이미 가입된 학번이에요. 로그인해 주세요.';
  end if;

  insert into students (student_no, name, pin_hash, session_token)
  values (btrim(p_student_no), btrim(p_name), crypt(p_pin, gen_salt('bf')), gen_random_uuid())
  returning * into s;

  return _profile(s);
end $$;

create or replace function public.login(p_student_no text, p_pin text)
returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare s public.students;
begin
  select * into s from students where student_no = btrim(p_student_no);
  if s.id is null or p_pin is null
     or s.pin_hash is distinct from crypt(p_pin, s.pin_hash) then
    raise exception '학번 또는 PIN이 맞지 않아요.';
  end if;

  update students set session_token = gen_random_uuid()
  where id = s.id
  returning * into s;

  return _profile(s);
end $$;

create or replace function public.get_me(p_token uuid)
returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare s public.students;
begin
  select * into s from students where session_token = p_token;
  if s.id is null then return null; end if;
  return _profile(s);
end $$;

-- ------------------------------------------------------------
-- 여름 독서
-- ------------------------------------------------------------

create or replace function public.add_book(
  p_token uuid, p_title text, p_author text, p_review text, p_finished_on date)
returns uuid
language plpgsql security definer set search_path = public, extensions
as $$
declare me public.students; new_id uuid;
begin
  me := _auth(p_token);
  if p_title is null or btrim(p_title) = '' then
    raise exception '책 제목을 입력해 주세요.';
  end if;
  insert into books (student_id, title, author, review, finished_on)
  values (me.id, btrim(p_title), nullif(btrim(coalesce(p_author,'')), ''),
          nullif(btrim(coalesce(p_review,'')), ''), p_finished_on)
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.update_book(
  p_token uuid, p_book_id uuid, p_title text, p_author text, p_review text, p_finished_on date)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare me public.students;
begin
  me := _auth(p_token);
  if p_title is null or btrim(p_title) = '' then
    raise exception '책 제목을 입력해 주세요.';
  end if;
  update books
  set title = btrim(p_title),
      author = nullif(btrim(coalesce(p_author,'')), ''),
      review = nullif(btrim(coalesce(p_review,'')), ''),
      finished_on = p_finished_on
  where id = p_book_id and student_id = me.id;
  if not found then
    raise exception '내 기록만 수정할 수 있어요.';
  end if;
end $$;

create or replace function public.delete_book(p_token uuid, p_book_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare me public.students;
begin
  me := _auth(p_token);
  delete from books
  where id = p_book_id and (student_id = me.id or me.is_teacher);
  if not found then
    raise exception '내 기록만 삭제할 수 있어요.';
  end if;
  delete from reactions where target_type = 'book' and target_id = p_book_id;
end $$;

-- 개학 때 독후감으로 제출할 책 고르기 (1인 1권, 다시 누르면 해제)
create or replace function public.set_report_pick(p_token uuid, p_book_id uuid)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
declare me public.students; cur boolean;
begin
  me := _auth(p_token);
  select is_report_pick into cur from books where id = p_book_id and student_id = me.id;
  if cur is null then
    raise exception '내가 기록한 책만 고를 수 있어요.';
  end if;
  if cur then
    update books set is_report_pick = false where id = p_book_id;
    return false;
  else
    update books set is_report_pick = false where student_id = me.id;
    update books set is_report_pick = true  where id = p_book_id;
    return true;
  end if;
end $$;

-- ------------------------------------------------------------
-- 7반 셋로그
-- ------------------------------------------------------------

-- 날짜/시간은 서버(한국 시간) 기준으로 계산 — 기기 시간을 바꿔도 소용없음
create or replace function public.add_video(p_token uuid, p_storage_path text, p_caption text)
returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare
  me       public.students;
  d        date := (now() at time zone 'Asia/Seoul')::date;
  h        int  := extract(hour from (now() at time zone 'Asia/Seoul'))::int;
  owner_id uuid;
  v        public.setlog_videos;
begin
  me := _auth(p_token);

  if d < date '2026-07-22' or d > date '2026-08-10' then
    raise exception '셋로그는 방학 기간(7/22~8/10)에만 올릴 수 있어요.';
  end if;
  if h < 7 or h > 23 then
    raise exception '셋로그 슬롯은 07시부터 23시까지예요.';
  end if;

  select student_id into owner_id from setlog_days where day = d;
  if not me.is_teacher then
    if owner_id is null then
      raise exception '오늘은 아직 주인공이 정해지지 않았어요.';
    end if;
    if owner_id <> me.id then
      raise exception '오늘의 주인공만 영상을 올릴 수 있어요.';
    end if;
  end if;

  begin
    insert into setlog_videos (day, hour, student_id, storage_path, caption)
    values (d, h, me.id, p_storage_path, nullif(btrim(coalesce(p_caption,'')), ''))
    returning * into v;
  exception when unique_violation then
    raise exception '% 시 슬롯에는 이미 영상이 있어요. 다음 정각에 다시 올려 주세요.', h;
  end;

  return json_build_object('id', v.id, 'day', v.day, 'hour', v.hour);
end $$;

create or replace function public.delete_video(p_token uuid, p_video_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare me public.students;
begin
  me := _auth(p_token);
  delete from setlog_videos
  where id = p_video_id and (student_id = me.id or me.is_teacher);
  if not found then
    raise exception '내 영상만 삭제할 수 있어요.';
  end if;
  delete from reactions where target_type = 'video' and target_id = p_video_id;
end $$;

-- ------------------------------------------------------------
-- 반응 (하트)
-- ------------------------------------------------------------

create or replace function public.toggle_reaction(p_token uuid, p_type text, p_id uuid)
returns int
language plpgsql security definer set search_path = public, extensions
as $$
declare me public.students; cnt int;
begin
  me := _auth(p_token);
  if p_type not in ('book', 'video') then
    raise exception '잘못된 요청이에요.';
  end if;
  delete from reactions
  where target_type = p_type and target_id = p_id and student_id = me.id;
  if not found then
    insert into reactions (target_type, target_id, student_id)
    values (p_type, p_id, me.id);
  end if;
  select count(*) into cnt from reactions where target_type = p_type and target_id = p_id;
  return cnt;
end $$;

-- ------------------------------------------------------------
-- 선생님(관리) 기능
-- ------------------------------------------------------------

create or replace function public.assign_setlog_day(p_token uuid, p_day date, p_student_no text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare me public.students; sid uuid;
begin
  me := _auth(p_token);
  if not me.is_teacher then
    raise exception '선생님만 배정할 수 있어요.';
  end if;

  if p_student_no is null or btrim(p_student_no) = '' then
    delete from setlog_days where day = p_day;
    return;
  end if;

  select id into sid from students where student_no = btrim(p_student_no);
  if sid is null then
    raise exception '아직 가입하지 않은 학번이에요: %', p_student_no;
  end if;

  insert into setlog_days (day, student_id) values (p_day, sid)
  on conflict (day) do update set student_id = excluded.student_id;
end $$;

-- PIN을 잊은 학생용: 임시 PIN을 만들어 돌려줌
create or replace function public.teacher_reset_pin(p_token uuid, p_student_no text)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare me public.students; temp_pin text;
begin
  me := _auth(p_token);
  if not me.is_teacher then
    raise exception '선생님만 초기화할 수 있어요.';
  end if;
  temp_pin := lpad(floor(random() * 10000)::int::text, 4, '0');
  update students
  set pin_hash = crypt(temp_pin, gen_salt('bf')), session_token = null
  where student_no = btrim(p_student_no);
  if not found then
    raise exception '없는 학번이에요: %', p_student_no;
  end if;
  return temp_pin;
end $$;

-- ------------------------------------------------------------
-- 영상 저장소 (Storage)
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800,
        array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

drop policy if exists "videos_public_read" on storage.objects;
create policy "videos_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'videos');

drop policy if exists "videos_anon_upload" on storage.objects;
create policy "videos_anon_upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'videos');

-- ============================================================
-- 끝! 이제 앱에서 선생님 계정으로 가입한 뒤, 아래 한 줄을 실행해
-- 선생님 권한을 켜세요 (학번 자리에 가입할 때 쓴 학번 입력):
--
--   update public.students set is_teacher = true where student_no = '선생님학번';
-- ============================================================
