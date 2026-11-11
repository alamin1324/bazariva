import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Header() {
  const { t, locale, setLocale, cartCount, user, profile } = useApp();
  const [q, setQ] = useState('');
  const nav = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    nav(`/products?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-royal font-extrabold text-white">B</span>
          <span className="text-lg font-extrabold tracking-tight text-navy">BAZARIVA</span>
        </Link>
        <form onSubmit={submit} className="order-3 w-full flex-1 md:order-2 md:w-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-royal focus:ring-2 focus:ring-royal/20"
          />
        </form>
        <nav className="order-2 ml-auto flex items-center gap-2 text-sm font-semibold md:order-3">
          <button onClick={() => setLocale(locale === 'en' ? 'bn' : 'en')} className="rounded-lg px-2 py-1.5 text-royal hover:bg-lightbg">{t.language}</button>
          <Link to="/wishlist" className="hidden rounded-lg px-2 py-1.5 text-navy hover:bg-lightbg sm:block">{t.wishlist}</Link>
          <Link to="/cart" className="relative rounded-lg px-2 py-1.5 text-navy hover:bg-lightbg">
            {t.cart}
            {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brandorange text-[10px] text-white">{cartCount}</span>}
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              {profile?.role === 'admin' && <Link to="/admin" className="rounded-lg px-2 py-1.5 text-royal hover:bg-lightbg">{t.adminDashboard}</Link>}
              {profile?.role === 'vendor' && <Link to="/vendor" className="rounded-lg px-2 py-1.5 text-royal hover:bg-lightbg">{t.vendorDashboard}</Link>}
              <Link to="/account" className="rounded-lg bg-royal px-3 py-1.5 text-white">{t.account}</Link>
            </div>
          ) : (
            <Link to="/auth" className="rounded-lg bg-royal px-3 py-1.5 text-white">{t.login}</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
