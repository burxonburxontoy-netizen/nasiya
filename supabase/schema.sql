-- =====================================================================
--  NASIYA — Supabase sxemasi
--  Supabase Dashboard → SQL Editor → New query → shu faylni to'liq
--  joylashtiring → RUN. Bir marta ishga tushirish kifoya.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- JADVALLAR ----------
create table if not exists public.shops (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null default 'Mening do''konim',
  owner_name  text,
  phone       text,
  address     text,
  plan        text not null default 'free' check (plan in ('free','pro','business')),
  is_active   boolean not null default true,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null default auth.uid() references public.shops on delete cascade,
  name          text not null,
  phone         text,
  note          text,
  credit_limit  numeric not null default 0,
  public_token  text not null unique default encode(gen_random_bytes(9), 'hex'),
  created_at    timestamptz not null default now()
);

create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null default auth.uid() references public.shops on delete cascade,
  customer_id  uuid not null references public.customers on delete cascade,
  type         text not null check (type in ('debt','payment')),
  amount       numeric not null check (amount > 0),
  note         text,
  due_date     date,
  created_at   timestamptz not null default now()
);

create index if not exists customers_shop_idx    on public.customers(shop_id);
create index if not exists tx_shop_idx           on public.transactions(shop_id);
create index if not exists tx_customer_idx       on public.transactions(customer_id);

-- ---------- YORDAMCHI FUNKSIYALAR ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.shops where id = auth.uid()), false);
$$;

-- Ro'yxatdan o'tganda avtomatik do'kon yaratish
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.shops (id, name, owner_name, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'shop_name',''), 'Mening do''konim'),
    new.raw_user_meta_data->>'owner_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Oddiy foydalanuvchi o'ziga admin/tarif bera olmasligi uchun himoya
create or replace function public.protect_shop_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin  := old.is_admin;
    new.plan      := old.plan;
    new.is_active := old.is_active;
  end if;
  return new;
end $$;

drop trigger if exists shops_protect on public.shops;
create trigger shops_protect
  before update on public.shops
  for each row execute function public.protect_shop_fields();

-- ---------- RLS (xavfsizlik) ----------
alter table public.shops        enable row level security;
alter table public.customers    enable row level security;
alter table public.transactions enable row level security;

drop policy if exists shops_select on public.shops;
drop policy if exists shops_update on public.shops;
create policy shops_select on public.shops for select using (id = auth.uid() or public.is_admin());
create policy shops_update on public.shops for update using (id = auth.uid() or public.is_admin());

drop policy if exists customers_owner on public.customers;
drop policy if exists customers_admin on public.customers;
create policy customers_owner on public.customers for all
  using (shop_id = auth.uid()) with check (shop_id = auth.uid());
create policy customers_admin on public.customers for select using (public.is_admin());

drop policy if exists tx_owner on public.transactions;
drop policy if exists tx_admin on public.transactions;
create policy tx_owner on public.transactions for all
  using (shop_id = auth.uid())
  with check (shop_id = auth.uid() and exists (
    select 1 from public.customers c where c.id = customer_id and c.shop_id = auth.uid()));
create policy tx_admin on public.transactions for select using (public.is_admin());

-- ---------- MIJOZ UCHUN OCHIQ SAHIFA (link orqali) ----------
create or replace function public.get_public_customer(p_token text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'name',       c.name,
    'shop_name',  s.name,
    'shop_phone', s.phone,
    'shop_address', s.address,
    'balance',    coalesce((select sum(case when t.type='debt' then t.amount else -t.amount end)
                            from public.transactions t where t.customer_id = c.id), 0),
    'transactions', coalesce((select json_agg(json_build_object(
                        'type', t.type, 'amount', t.amount, 'note', t.note,
                        'due_date', t.due_date, 'created_at', t.created_at)
                        order by t.created_at desc)
                      from public.transactions t where t.customer_id = c.id), '[]'::json)
  )
  from public.customers c join public.shops s on s.id = c.shop_id
  where c.public_token = p_token;
$$;

grant execute on function public.get_public_customer(text) to anon, authenticated;

-- =====================================================================
--  O'ZINGIZNI ADMIN QILISH (ro'yxatdan o'tgandan keyin, emailni almashtiring):
--
--  update public.shops set is_admin = true
--  where id = (select id from auth.users where email = 'sizning@email.com');
-- =====================================================================
