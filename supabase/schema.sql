-- 生图记录表
create table generation_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  model varchar not null,
  prompt text not null,
  negative_prompt text,
  parameters jsonb default '{}',
  status varchar not null default 'pending', -- pending | success | failed
  image_url text,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- 开启 RLS
alter table generation_records enable row level security;

-- 用户只能查看和操作自己的记录
create policy "用户查看自己的记录"
  on generation_records for select
  using (auth.uid() = user_id);

create policy "用户创建自己的记录"
  on generation_records for insert
  with check (auth.uid() = user_id);

create policy "用户更新自己的记录"
  on generation_records for update
  using (auth.uid() = user_id);

-- Storage bucket（在 Supabase Dashboard 手动创建名为 generated-images 的 public bucket）
-- 或执行以下 SQL：
insert into storage.buckets (id, name, public)
values ('generated-images', 'generated-images', true)
on conflict do nothing;

create policy "用户上传自己的图片"
  on storage.objects for insert
  with check (bucket_id = 'generated-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "公开读取图片"
  on storage.objects for select
  using (bucket_id = 'generated-images');
