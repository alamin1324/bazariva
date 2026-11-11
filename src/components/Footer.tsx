import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Footer() {
  const { t } = useApp();
  return (
    <footer className="mt-16 bg-navy text-slate-200">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold text-white">BAZARIVA</p>
          <p className="mt-2 text-sm">{t.brandTagline}</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-bold text-white">{t.products}</p>
          <Link className="block py-1 hover:text-white" to="/products">{t.products}</Link>
          <Link className="block py-1 hover:text-white" to="/wishlist">{t.wishlist}</Link>
          <Link className="block py-1 hover:text-white" to="/vendor/register">{t.becomeVendor}</Link>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-bold text-white">{t.checkout}</p>
          <p className="py-1">Cash on Delivery</p>
          <p className="py-1 opacity-70">bKash · Nagad · Rocket · SSLCommerz (coming soon)</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} BAZARIVA. All rights reserved.</div>
    </footer>
  );
}
