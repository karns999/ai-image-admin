-- prompt 模板表
create table prompt_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sort_order integer not null default 0,
  title varchar not null,
  prompt text not null,
  created_at timestamptz default now()
);

alter table prompt_templates enable row level security;

create policy "用户查看自己的模板" on prompt_templates for select using (auth.uid() = user_id);
create policy "用户创建自己的模板" on prompt_templates for insert with check (auth.uid() = user_id);
create policy "用户更新自己的模板" on prompt_templates for update using (auth.uid() = user_id);
create policy "用户删除自己的模板" on prompt_templates for delete using (auth.uid() = user_id);

-- 生图任务主表
create table generation_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_title text,
  system_prompt text,
  white_image_url text,
  ref_image_urls jsonb default '[]',
  prompt_items jsonb default '[]',  -- [{ title, prompt }]
  status varchar not null default 'draft', -- draft | suggesting | suggested | generating | done | failed
  current_step integer not null default 0, -- 0:白底图 1:建议&选方案 2:生成 3:确认
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table generation_tasks enable row level security;

create policy "用户查看自己的任务" on generation_tasks for select using (auth.uid() = user_id);
create policy "用户创建自己的任务" on generation_tasks for insert with check (auth.uid() = user_id);
create policy "用户更新自己的任务" on generation_tasks for update using (auth.uid() = user_id);
create policy "用户删除自己的任务" on generation_tasks for delete using (auth.uid() = user_id);

-- 每套 prompt 对应的 AI 建议及生图结果
create table task_suggestions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references generation_tasks(id) on delete cascade not null,
  prompt_index integer not null,
  prompt_title text,
  prompt_content text,
  suggestion text,
  selected boolean default false,
  image_url text,
  image_status varchar default 'pending', -- pending | generating | done | failed
  created_at timestamptz default now()
);

alter table task_suggestions enable row level security;

create policy "用户查看自己的建议" on task_suggestions for select using (
  exists (select 1 from generation_tasks where id = task_id and user_id = auth.uid())
);
create policy "用户创建建议" on task_suggestions for insert with check (
  exists (select 1 from generation_tasks where id = task_id and user_id = auth.uid())
);
create policy "用户更新建议" on task_suggestions for update using (
  exists (select 1 from generation_tasks where id = task_id and user_id = auth.uid())
);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('generated-images', 'generated-images', true)
on conflict do nothing;

create policy "用户上传自己的图片" on storage.objects for insert
  with check (bucket_id = 'generated-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "公开读取图片" on storage.objects for select
  using (bucket_id = 'generated-images');
