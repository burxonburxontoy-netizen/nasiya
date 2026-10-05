-- =====================================================================
--  NASIYA — Telegram bot uchun qo'shimcha (schema.sql dan KEYIN ishga tushiring)
-- =====================================================================

alter table public.customers    add column if not exists telegram_chat_id bigint;
alter table public.transactions add column if not exists confirmed_at timestamptz;
create index if not exists customers_tg_idx on public.customers(telegram_chat_id);

-- Mijoz sahifasi: tasdiqlash va Telegram holati ham qaytadi
create or replace function public.get_public_customer(p_token text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'name',         c.name,
    'shop_name',    s.name,
    'shop_phone',   s.phone,
    'shop_address', s.address,
    'telegram',     c.telegram_chat_id is not null,
    'balance',      coalesce((select sum(case when t.type='debt' then t.amount else -t.amount end)
                              from public.transactions t where t.customer_id = c.id), 0),
    'transactions', coalesce((select json_agg(json_build_object(
                        'type', t.type, 'amount', t.amount, 'note', t.note,
                        'due_date', t.due_date, 'created_at', t.created_at,
                        'confirmed_at', t.confirmed_at)
                        order by t.created_at desc)
                      from public.transactions t where t.customer_id = c.id), '[]'::json)
  )
  from public.customers c join public.shops s on s.id = c.shop_id
  where c.public_token = p_token;
$$;
grant execute on function public.get_public_customer(text) to anon, authenticated;

-- Mijoz o'z nasiyalarini tasdiqlaydi (link = kalit)
create or replace function public.confirm_customer_tx(p_token text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.transactions t set confirmed_at = now()
  from public.customers c
  where c.public_token = p_token and t.customer_id = c.id and t.confirmed_at is null;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.confirm_customer_tx(text) to anon, authenticated;

-- ---------- Faqat server (bot) chaqira oladigan funksiyalar ----------
create or replace function public.tg_link(p_token text, p_chat_id bigint)
returns json language plpgsql security definer set search_path = public as $$
begin
  update public.customers set telegram_chat_id = p_chat_id where public_token = p_token;
  if not found then return null; end if;
  return public.get_public_customer(p_token);
end $$;

create or replace function public.tg_my_debts(p_chat_id bigint)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
    'token', c.public_token, 'name', c.name, 'shop_name', s.name,
    'balance', coalesce((select sum(case when t.type='debt' then t.amount else -t.amount end)
                         from public.transactions t where t.customer_id = c.id), 0)
  )), '[]'::json)
  from public.customers c join public.shops s on s.id = c.shop_id
  where c.telegram_chat_id = p_chat_id;
$$;

revoke execute on function public.tg_link(text, bigint)   from public, anon, authenticated;
revoke execute on function public.tg_my_debts(bigint)     from public, anon, authenticated;
grant  execute on function public.tg_link(text, bigint)   to service_role;
grant  execute on function public.tg_my_debts(bigint)     to service_role;
