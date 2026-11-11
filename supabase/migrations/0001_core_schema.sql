-- ============================================================
-- BAZARIVA — Core schema, RLS, commission engine, order RPCs
-- Multi-vendor marketplace for Bangladesh (BDT, COD first)
-- Run once in Supabase SQL Editor.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------- Enums ----------
create type public.user_role as enum ('customer', 'vendor', 'admin');
create type public.vendor_status as enum ('pending', 'approved', 'suspended', 'rejected');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');
create type public.payment_method as enum ('cod');  -- bkash/nagad/rocket/sslcommerz added when credentials exist
create type public.commission_scope as enum ('global', 'vendor', 'category', 'brand', 'product');
create type public.commission_type as enum ('percentage', 'fixed');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.payout_status as enum ('pending', 'processing', 'paid');

-- ---------- Helpers ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_vendor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.vendors where owner_id = auth.uid() limit 1;
$$;

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.user_role not null default 'customer',
  locale text not null default 'en',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_self_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid() and role = 'customer');
-- Self-update may change profile data but NEVER the role:
create policy "profiles_update_self_keep_role" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'customer' and role = (select p.role from public.profiles p where p.id = auth.uid()));
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Vendors ----------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  shop_name text not null,
  shop_slug text not null unique,
  description text,
  phone text,
  logo_url text,
  status public.vendor_status not null default 'pending',
  commission_override numeric(5,2),  -- nullable % override, resolved by commission engine
  created_at timestamptz not null default now()
);
alter table public.vendors enable row level security;

create policy "vendors_public_read" on public.vendors
  for select using (true);
create policy "vendors_insert_own" on public.vendors
  for insert with check (owner_id = auth.uid());
create policy "vendors_update_own" on public.vendors
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and status = (select v.status from public.vendors v where v.id = id) and commission_override is not distinct from (select v.commission_override from public.vendors v where v.id = id));
create policy "vendors_admin_all" on public.vendors
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Taxonomy ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_bn text,
  slug text not null unique,
  parent_id uuid references public.categories(id),
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
alter table public.brands enable row level security;
create policy "taxonomy_public_read" on public.categories for select using (true);
create policy "taxonomy_public_read_b" on public.brands for select using (true);
create policy "taxonomy_admin_write" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "taxonomy_admin_write_b" on public.brands for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Products ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  category_id uuid references public.categories(id),
  brand_id uuid references public.brands(id),
  title_en text not null,
  title_bn text,
  description_en text,
  description_bn text,
  slug text not null unique,
  price numeric(12,2) not null check (price >= 0),
  compare_price numeric(12,2) check (compare_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  sku text,
  images jsonb not null default '[]'::jsonb,
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create index products_status_idx on public.products (status);
create index products_vendor_idx on public.products (vendor_id);
create index products_title_trgm on public.products using gin (title_en gin_trgm_ops);

create policy "products_public_read_active" on public.products
  for select using (
    status = 'active'
    or vendor_id = public.my_vendor_id()
    or public.is_admin()
  );
create policy "products_vendor_insert" on public.products
  for insert with check (
    vendor_id = public.my_vendor_id()
    and (select status from public.vendors where id = vendor_id) = 'approved'
  );
create policy "products_vendor_update" on public.products
  for update using (vendor_id = public.my_vendor_id()) with check (vendor_id = public.my_vendor_id());
create policy "products_admin_all" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Reviews ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  is_verified_purchase boolean not null default false,
  status public.review_status not null default 'approved',
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
alter table public.reviews enable row level security;
create policy "reviews_public_read" on public.reviews
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "reviews_insert_own" on public.reviews
  for insert with check (user_id = auth.uid());
create policy "reviews_admin_all" on public.reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Addresses ----------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.addresses enable row level security;
create policy "addresses_own_all" on public.addresses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Wishlist ----------
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.wishlist_items enable row level security;
create policy "wishlist_own_all" on public.wishlist_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Commission engine ----------
create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  scope public.commission_scope not null,
  scope_id uuid,  -- null for global
  commission_type public.commission_type not null,
  value numeric(12,2) not null check (value >= 0),
  valid_from date not null default current_date,
  valid_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.commission_rules enable row level security;
create policy "commission_rules_admin_all" on public.commission_rules
  for all using (public.is_admin()) with check (public.is_admin());
create policy "commission_rules_public_read" on public.commission_rules
  for select using (true);

-- Resolve the applicable commission for a product line.
-- Specificity: product > brand > category > vendor > global; latest created wins within a tier.
create or replace function public.resolve_commission(
  p_product_id uuid,
  p_vendor_id uuid,
  p_order_date date default current_date
) returns numeric(12,2)
language plpgsql stable security definer set search_path = public as $$
declare
  v_brand_id uuid;
  v_category_id uuid;
  v_rule commission_rules;
  v_vendor_override numeric(5,2);
  v_amount numeric(12,2);
begin
  select brand_id, category_id into v_brand_id, v_category_id from products where id = p_product_id;
  select commission_override into v_vendor_override from vendors where id = p_vendor_id;

  select * into v_rule from commission_rules
  where is_active and p_order_date >= valid_from and (valid_to is null or p_order_date <= valid_to)
    and ((scope = 'product' and scope_id = p_product_id)
      or (scope = 'brand' and scope_id = v_brand_id)
      or (scope = 'category' and scope_id = v_category_id)
      or (scope = 'vendor' and scope_id = p_vendor_id)
      or scope = 'global')
  order by case scope
      when 'product' then 1 when 'brand' then 2 when 'category' then 3
      when 'vendor' then 4 when 'global' then 5 end,
    created_at desc
  limit 1;

  if v_rule is not null then
    if v_rule.commission_type = 'fixed' then
      v_amount := v_rule.value;
    else
      v_amount := v_rule.value / 100.0;
    end if;
    return least(v_amount, 100);
  end if;

  -- Fallback: vendor override (treated as %), else 0
  return coalesce(least(v_vendor_override, 100), 0);
end $$;

-- ---------- Orders (multi-vendor) ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null default 'cod',
  payment_status public.payment_status not null default 'unpaid',
  subtotal numeric(12,2) not null default 0,
  shipping_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  shipping_name text not null,
  shipping_phone text not null,
  shipping_address text not null,
  shipping_city text not null,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create index orders_user_idx on public.orders (user_id);

create policy "orders_select_own" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());
-- Insert happens only through create_order RPC (security definer).

create table public.suborders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id),
  status public.order_status not null default 'pending',
  subtotal numeric(12,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  vendor_earning numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.suborders enable row level security;
create index suborders_vendor_idx on public.suborders (vendor_id);

create policy "suborders_customer_read" on public.suborders
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or vendor_id = public.my_vendor_id()
    or public.is_admin()
  );
create policy "suborders_vendor_update" on public.suborders
  for update using (vendor_id = public.my_vendor_id()) with check (vendor_id = public.my_vendor_id());
create policy "suborders_admin_update" on public.suborders
  for update using (public.is_admin()) with check (public.is_admin());

create table public.suborder_items (
  id uuid primary key default gen_random_uuid(),
  suborder_id uuid not null references public.suborders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  title text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);
alter table public.suborder_items enable row level security;
create policy "suborder_items_read" on public.suborder_items
  for select using (
    exists (select 1 from public.suborders s join public.orders o on o.id = s.order_id
            where s.id = suborder_id and (o.user_id = auth.uid() or public.is_admin()))
    or exists (select 1 from public.suborders s where s.id = suborder_id and s.vendor_id = public.my_vendor_id())
  );

-- The single entry point for placing an order.
-- Server-side pricing, stock locking, multi-vendor split, commission, idempotency.
create or replace function public.create_order(
  p_items jsonb,               -- [{ "product_id": uuid, "quantity": int }]
  p_shipping_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_payment_method public.payment_method default 'cod',
  p_idempotency_key text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_existing uuid;
  v_item jsonb;
  v_prod products;
  v_vendor_id uuid;
  v_qty integer;
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_shipping numeric(12,2) := 80;
  v_comm_rate numeric(12,2);
  v_comm numeric(12,2);
  v_sub_id uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_payment_method <> 'cod' then raise exception 'Payment method % is not enabled', p_payment_method; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Empty cart'; end if;
  if coalesce(length(trim(p_shipping_name)),0) = 0 or coalesce(length(trim(p_shipping_phone)),0) = 0
     or coalesce(length(trim(p_shipping_address)),0) = 0 then
    raise exception 'Shipping details required';
  end if;

  -- Idempotency
  if p_idempotency_key is not null then
    select id into v_existing from orders where idempotency_key = p_idempotency_key;
    if v_existing is not null then return v_existing; end if;
  end if;

  insert into orders (user_id, shipping_name, shipping_phone, shipping_address, shipping_city,
                      payment_method, idempotency_key)
  values (v_user, p_shipping_name, p_shipping_phone, p_shipping_address, p_shipping_city,
          p_payment_method, p_idempotency_key)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty <= 0 then raise exception 'Invalid quantity'; end if;

    select * into v_prod from products
    where id = (v_item->>'product_id')::uuid
    for update;
    if v_prod is null then raise exception 'Product not found'; end if;
    if v_prod.status <> 'active' then raise exception 'Product % is unavailable', v_prod.title_en; end if;
    if v_prod.stock < v_qty then raise exception 'Insufficient stock for %', v_prod.title_en; end if;

    select id into v_vendor_id from vendors where id = v_prod.vendor_id and status = 'approved';
    if v_vendor_id is null then raise exception 'Vendor for % is not active', v_prod.title_en; end if;

    -- Server-side price: client price is never trusted
    v_line_total := v_prod.price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    update products set stock = stock - v_qty, updated_at = now() where id = v_prod.id;

    -- One suborder per vendor
    if not exists (select 1 from suborders where order_id = v_order_id and vendor_id = v_vendor_id) then
      insert into suborders (order_id, vendor_id) values (v_order_id, v_vendor_id);
    end if;
    select id into v_sub_id from suborders where order_id = v_order_id and vendor_id = v_vendor_id;

    insert into suborder_items (suborder_id, product_id, title, unit_price, quantity, line_total)
    values (v_sub_id, v_prod.id, v_prod.title_en, v_prod.price, v_qty, v_line_total);
  end loop;

  -- Commission per suborder
  for v_sub_id in select id from suborders where order_id = v_order_id loop
    select coalesce(sum(line_total), 0) into v_line_total from suborder_items where suborder_id = v_sub_id;
    select vendor_id into v_vendor_id from suborders where id = v_sub_id;
    -- weighted commission: resolve per item, sum
    v_comm := 0;
    for v_item in select * from jsonb_array_elements(p_items) loop
      select id into v_prod from products where id = (v_item->>'product_id')::uuid;
      if exists (select 1 from suborder_items si where si.suborder_id = v_sub_id and si.product_id = v_prod.id) then
        v_comm_rate := public.resolve_commission(v_prod.id, v_vendor_id);
        v_comm := v_comm + round((v_item->>'quantity')::integer * v_prod.price * v_comm_rate / 100.0, 2);
      end if;
    end loop;
    update suborders
      set subtotal = v_line_total,
          commission_amount = v_comm,
          vendor_earning = v_line_total - v_comm
      where id = v_sub_id;
  end loop;

  update orders set subtotal = v_subtotal, shipping_fee = v_shipping,
                    total = v_subtotal + v_shipping
    where id = v_order_id;

  return v_order_id;
end $$;

-- ---------- Reviews RPC (verified purchase check) ----------
create or replace function public.submit_review(
  p_product_id uuid,
  p_rating integer,
  p_comment text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_verified boolean;
  v_review_id uuid;
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if p_rating not between 1 and 5 then raise exception 'Rating must be 1-5'; end if;

  select exists (
    select 1 from suborder_items si
    join suborders s on s.id = si.suborder_id
    join orders o on o.id = s.order_id
    where si.product_id = p_product_id and o.user_id = v_user
      and o.status in ('delivered', 'shipped')
  ) into v_verified;

  insert into reviews (product_id, user_id, rating, comment, is_verified_purchase)
  values (p_product_id, v_user, p_rating, p_comment, v_verified)
  on conflict (product_id, user_id)
  do update set rating = excluded.rating, comment = excluded.comment,
                is_verified_purchase = excluded.is_verified_purchase, created_at = now()
  returning id into v_review_id;

  return v_review_id;
end $$;

-- ---------- Payouts ----------
create table public.vendor_payouts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  status public.payout_status not null default 'pending',
  period_start date,
  period_end date,
  note text,
  created_at timestamptz not null default now()
);
alter table public.vendor_payouts enable row level security;
create policy "payouts_vendor_read" on public.vendor_payouts
  for select using (vendor_id = public.my_vendor_id() or public.is_admin());
create policy "payouts_admin_all" on public.vendor_payouts
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Coupons ----------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type public.commission_type not null,
  value numeric(12,2) not null check (value >= 0),
  min_order numeric(12,2) not null default 0,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  usage_limit integer,
  used_count integer not null default 0,
  is_active boolean not null default true
);
alter table public.coupons enable row level security;
create policy "coupons_public_read" on public.coupons for select using (is_active);
create policy "coupons_admin_all" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Settings / Banners / Audit ----------
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
create policy "settings_public_read" on public.settings for select using (true);
create policy "settings_admin_all" on public.settings for all using (public.is_admin()) with check (public.is_admin());

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_bn text,
  image_url text,
  link_url text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.banners enable row level security;
create policy "banners_public_read" on public.banners for select using (is_active);
create policy "banners_admin_all" on public.banners for all using (public.is_admin()) with check (public.is_admin());

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity text,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy "audit_admin_read" on public.audit_logs for select using (public.is_admin());

-- ---------- Notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications_own_all" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Stock movements ----------
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.stock_movements enable row level security;
create policy "stock_movements_read" on public.stock_movements
  for select using (public.is_admin() or exists (
    select 1 from public.products p where p.id = product_id and p.vendor_id = public.my_vendor_id()));

-- ---------- Shipping zones ----------
create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  districts text[] not null default '{}',
  fee numeric(12,2) not null default 80,
  is_active boolean not null default true
);
alter table public.shipping_zones enable row level security;
create policy "shipping_zones_public_read" on public.shipping_zones for select using (is_active);
create policy "shipping_zones_admin_all" on public.shipping_zones for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Payment gateway configs (disabled until credentials exist) ----------
create table public.payment_gateways (
  code text primary key,
  name text not null,
  is_enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb  -- secrets live in Edge Function env, never here in plaintext
);
alter table public.payment_gateways enable row level security;
create policy "gateways_public_read" on public.payment_gateways for select using (true);
create policy "gateways_admin_all" on public.payment_gateways for all using (public.is_admin()) with check (public.is_admin());

insert into public.payment_gateways (code, name, is_enabled) values
  ('cod', 'Cash on Delivery', true),
  ('bkash', 'bKash', false),
  ('nagad', 'Nagad', false),
  ('rocket', 'Rocket', false),
  ('sslcommerz', 'SSLCommerz', false)
on conflict (code) do nothing;

insert into public.settings (key, value) values
  ('platform', '{"name": "BAZARIVA", "default_locale": "en", "currency": "BDT"}'),
  ('shipping', '{"flat_fee": 80, "free_above": null}')
on conflict (key) do nothing;

-- ---------- Updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
