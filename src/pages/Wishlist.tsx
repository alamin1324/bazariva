import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types';
import { useApp } from '../context/AppContext';
import ProductGrid from '../components/ProductGrid';
import { Alert, Spinner } from '../components/ui';

export default function Wishlist() {
  const { t, wishlist } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wishlist.length === 0) { setLoading(false); return; }
    supabase.from('products').select('*').in('id', wishlist).eq('status', 'active')
      .then(({ data }) => { setProducts((data as Product[]) ?? []); setLoading(false); });
  }, [wishlist]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold text-navy">{t.wishlist}</h1>
      {loading ? <Spinner label={t.loading} /> : products.length === 0 ? <Alert>{t.emptyWishlist}</Alert> : <ProductGrid products={products} />}
    </div>
  );
}
