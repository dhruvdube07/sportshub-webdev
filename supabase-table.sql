-- Run this in the Supabase SQL editor to create the survey table used by the app.

create table if not exists surveys (
  id bigserial primary key,
  name text not null,
  email text not null,
  survey_title text not null,
  feedback text,
  rating integer not null default 5,
  is_finalized boolean not null default false,
  pending_expires_at timestamptz,
  created_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now()
);

-- Allow public clients to insert/update/delete if you want quick testing.
-- In production, use row-level security and authenticated users.

-- Example policy for public access (ONLY for prototyping):
-- alter table surveys enable row level security;
-- create policy "public insert" on surveys for insert using (true);
-- create policy "public update" on surveys for update using (true);
-- create policy "public delete" on surveys for delete using (true);
-- create policy "public select" on surveys for select using (true);

create table if not exists chat_users (
  id bigint generated always as identity primary key,
  name text not null unique,
  pin text not null,
  created_at timestamptz not null default now()
);

create table if not exists chat_rooms (
  id bigint generated always as identity primary key,
  name text not null,
  passkey text not null,
  creator_id bigint references chat_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  room_id bigint references chat_rooms(id) on delete cascade,
  user_id bigint references chat_users(id) on delete set null,
  user_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

-- Example policy for public access on chat tables (ONLY for prototyping):
-- alter table chat_users enable row level security;
-- create policy "public insert" on chat_users for insert using (true);
-- create policy "public select" on chat_users for select using (true);
-- alter table chat_rooms enable row level security;
-- create policy "public insert" on chat_rooms for insert using (true);
-- create policy "public select" on chat_rooms for select using (true);
-- alter table chat_messages enable row level security;
-- create policy "public insert" on chat_messages for insert using (true);
-- create policy "public select" on chat_messages for select using (true);
