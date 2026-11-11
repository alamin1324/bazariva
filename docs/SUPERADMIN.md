# BAZARIVA — Super Admin Provisioning

There is intentionally **no public admin registration page** and no hardcoded admin credentials. The owner promotes their own account through the database, once.

## Procedure
1. Register a normal customer account on the BAZARIVA website with the email you want to own the platform.
2. Supabase Dashboard → **SQL Editor** → run:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'your-email@example.com');
```
3. Log out of the site and log back in. The **Admin** link appears in the header and `/admin` becomes accessible.

## Why this is secure
- Row Level Security checks `profiles.role = 'admin'` server-side (`is_admin()`), never a frontend flag.
- The profiles self-update policy pins `role` to its existing value, so a customer cannot promote themselves through the app.
- Only someone with direct Supabase dashboard access (the owner) can run the promotion SQL.

## Verify
```sql
select email, role from public.profiles p join auth.users u on u.id = p.id where role = 'admin';
```

## Changing admin later
Run the same update for the new email. To revoke:
```sql
update public.profiles set role = 'customer' where id = (select id from auth.users where email = 'old@example.com');
```

## Vendor approvals
Vendor applications arrive with status `pending`. Approve/suspend from Admin → Vendors, or directly:
```sql
update public.vendors set status = 'approved' where shop_slug = 'their-shop-slug';
```
Only `approved` vendors can publish products (enforced by the `my_vendor_id()` RLS helper and the products insert policy).
