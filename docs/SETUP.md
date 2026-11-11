# BAZARIVA — Setup Guide (mobile-friendly)

Do these steps in order from your Android phone. Nothing needs a computer.

## 1. Create the Supabase project
1. Open https://supabase.com and sign in (GitHub login works).
2. Tap **New project**. Name it `bazariva`, region Singapore, set a strong database password (save it).
3. Wait ~2 minutes for it to be ready.

## 2. Run the database migration
1. Supabase → **SQL Editor** → **New query**.
2. Open this repo's `supabase/migrations/0001_core_schema.sql`, tap Raw, select all and copy.
3. Paste into SQL Editor and tap **Run**.
4. "Success. No rows returned" = done. This creates all tables, RLS security policies, the commission engine and the order/review functions.

## 3. Make yourself the Super Admin
1. Register a normal customer account on the website with the email you want as admin.
2. Supabase **SQL Editor**, run (replace the email):
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```
3. Log out and back in — the Admin Dashboard link appears. Details: docs/SUPERADMIN.md. There is no public admin signup page by design.

## 4. Get your API keys
1. Supabase → **Project Settings** → **API**.
2. Copy the **Project URL** and **anon public** key (never the service_role key).
3. If deploying on Vercel/Netlify, add these as environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in their dashboard. Locally, copy `.env.example` to `.env` and fill them in.

## 5. Deploy (easiest from a phone)
1. Open https://vercel.com → sign in with GitHub → **Add New Project** → import `alamin1324/bazariva`.
2. Add the two environment variables above → **Deploy**.
3. You get a live HTTPS URL. Every push to `main` redeploys automatically.

## 6. Storage buckets for images
Supabase → **Storage** → create public buckets `product-images` and `vendor-assets`. The upload UI arrives in the next phase; buckets must exist first.

## 7. Payment gateways (awaiting credentials)
Cash on Delivery works today with zero setup. bKash/Nagad/Rocket/SSLCommerz need approved merchant accounts from each provider. Once you have credentials, they go into **Supabase Edge Function secrets** (never in the frontend), and the gateway rows in `payment_gateways` get flipped to enabled. Until then checkout shows COD only — no fake payment success screens.

## 8. Checklist
- [ ] Supabase project created
- [ ] Migration run in SQL Editor
- [ ] Admin account promoted (step 3)
- [ ] Env variables added, site deployed on Vercel
- [ ] Storage buckets created
- [ ] Payment merchant accounts applied for (when ready)
