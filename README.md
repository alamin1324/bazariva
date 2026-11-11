# BAZARIVA

**Everything You Need, One Place.**

Enterprise-grade multi-vendor e-commerce marketplace for Bangladesh, built with React + TypeScript + Vite + Tailwind CSS on Supabase (PostgreSQL, Auth, Storage, Edge Functions).

## Stack
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, React Router
- Backend: Supabase (PostgreSQL + RLS, Auth, Storage, Edge Functions)
- Languages: English + বাংলা (in-app switcher)
- Brand: Royal Blue `#0755C9`, Deep Navy `#062B75`, Orange `#FF6A00`, Light `#F5F8FF`

## Structure
```
src/            React app (components, pages, context, i18n, lib)
supabase/
  migrations/   0001_core_schema.sql — tables, RLS, commission engine, RPCs
docs/           SETUP.md (mobile-friendly), SUPERADMIN.md (admin provisioning)
```

## Key features implemented (Phase 1)
- Storefront: home, products, product details, search, cart, checkout, order confirmation, wishlist, auth, customer account, vendor registration/dashboard, admin dashboard
- Multi-vendor checkout: one master order + per-vendor sub-orders, server-side pricing/stock via `create_order` RPC (client prices never trusted), idempotency key prevents duplicate orders
- Commission engine: `commission_rules` (global/vendor/category/brand/product, % or fixed, scheduled) resolved server-side per item via `resolve_commission`; vendor-level override supported
- Verified-purchase reviews via `submit_review` RPC
- Row Level Security on every table; admin role only via SQL provisioning (no public admin signup)
- Payments: Cash on Delivery active; bKash/Nagad/Rocket/SSLCommerz integration-ready but disabled until merchant credentials exist (see docs/SETUP.md)

## Quick start
See **docs/SETUP.md** (mobile-friendly, step by step) and **docs/SUPERADMIN.md**.

```bash
cp .env.example .env   # add your Supabase URL + anon key
npm install
npm run dev
```

## Status
Phase 1 (foundation + core marketplace) is implemented. Not yet done: image uploads to Storage, product variants UI, banner management UI, CSV reports, district-wise shipping rates UI, and payment gateway activation (awaiting credentials).
