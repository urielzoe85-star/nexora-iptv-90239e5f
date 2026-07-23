create table if not exists public.ai_chat_threads (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  scope text not null default 'ncc',
  title text not null default 'Nouvelle conversation',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_chat_threads_owner_idx on public.ai_chat_threads(owner_user_id, updated_at desc);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_chat_threads(id) on delete cascade,
  role text not null,
  content text,
  parts jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_chat_messages_thread_idx on public.ai_chat_messages(thread_id, created_at asc);

create table if not exists public.ai_action_requests (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.ai_chat_threads(id) on delete set null,
  scope text not null default 'client',
  requested_by_user_id uuid references auth.users(id) on delete set null,
  requested_by_email text,
  requested_by_label text,
  tool text not null,
  args jsonb not null default '{}'::jsonb,
  summary text not null,
  status text not null default 'pending',
  decided_by_user_id uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  result jsonb,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists ai_action_requests_status_idx on public.ai_action_requests(status, created_at desc);

grant select, insert, update, delete on public.ai_chat_threads to authenticated;
grant all on public.ai_chat_threads to service_role;
grant select, insert, update, delete on public.ai_chat_messages to authenticated;
grant all on public.ai_chat_messages to service_role;
grant select, insert, update, delete on public.ai_action_requests to authenticated;
grant all on public.ai_action_requests to service_role;

alter table public.ai_chat_threads enable row level security;
alter table public.ai_chat_messages enable row level security;
alter table public.ai_action_requests enable row level security;

create policy "admins manage all ai threads" on public.ai_chat_threads
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "admins manage all ai messages" on public.ai_chat_messages
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "admins manage all ai action requests" on public.ai_action_requests
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));