-- PostgreSQL 用 初期スキーマ
-- タスク本体
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null check (status in ('Not Started','In Progress','Completed')),
  priority text not null check (priority in ('High','Medium','Low')),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_dates on tasks (start_date, end_date);

-- 依存関係(自己参照の多対多)
create table if not exists task_dependencies (
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_id uuid not null references tasks(id) on delete cascade,
  primary key (task_id, depends_on_id),
  check (task_id <> depends_on_id)
);

-- 更新トリガで updated_at を自動更新
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'tasks_set_updated_at'
  ) then
    create trigger tasks_set_updated_at
    before update on tasks
    for each row execute function set_updated_at();
  end if;
end $$;

-- SQLite 用の参考(ローカル開発)
-- enum相当はCHECK制約で代替
