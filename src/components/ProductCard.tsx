import { Link } from 'react-router-dom';
import type { Product } from '../lib/types';
import { useApp } from '../context/AppContext';
import { formatBDT } from '../lib/format';
import { Badge } from './ui';

export default function ProductCard({ product }: { product: Product }) {
  const { locale, t, addToCart, wishlist, toggleWishlist } = useApp();
  const title = (locale === 'bn' ? product.title_bn || product.title_en : product.title_en);
  const img = product.images?.[0];
  const wished = wishlist.includes(product.id);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <button
        onClick={() => toggleWishlist(product.id)}
        aria-label="wishlist"
        className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full text-lg ${wished ? 'bg-brandorange text-white' : 'bg-white/90 text-slate-400'}`}
      >
        ♥
      </button>
      <Link to={`/product/${product.slug}`} className="block aspect-square overflow-hidden bg-lightbg">
        {img ? (
          <img src={img} alt={title} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-royal/30">🛍️</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link to={`/product/${product.slug}`} className="line-clamp-2 text-sm font-semibold text-navy">{title}</Link>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-base font-bold text-royal">{formatBDT(product.price, locale)}</span>
          {product.compare_price != null && product.compare_price > product.price && (
            <span className="text-xs text-slate-400 line-through">{formatBDT(product.compare_price, locale)}</span>
          )}
        </div>
        {product.stock > 0 ? (
          <Badge color="green">{t.inStock}</Badge>
        ) : (
          <Badge color="gray">{t.outOfStock}</Badge>
        )}
        <button
          disabled={product.stock <= 0}
          onClick={() => addToCart(product.id)}
          className="mt-1 w-full rounded-lg bg-royal py-1.5 text-xs font-bold text-white hover:bg-navy disabled:opacity-40"
        >
          {t.addToCart}
        </button>
      </div>
    </div>
  );
}
