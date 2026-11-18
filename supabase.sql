-- Chạy trong Supabase > SQL Editor (một lần). Mỗi người chỉ thấy và sửa danh thiếp của chính mình.
create table if not exists public.cards (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.cards enable row level security;

create policy "cards_select_own" on public.cards for select using (user_id = auth.uid());
create policy "cards_insert_own" on public.cards for insert with check (user_id = auth.uid());
create policy "cards_update_own" on public.cards for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cards_delete_own" on public.cards for delete using (user_id = auth.uid());
