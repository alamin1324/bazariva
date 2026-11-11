import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types';
import ProductGrid from '../components/ProductGrid';
import { Spinner, Alert } from '../components/ui';
import { useApp } from '../context/AppContext';

export default function Products() {
  const { t } = useApp();
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLoading(true);
    let req = supabase
      .from('products')
      .select('*, vendors!inner(shop_name, status)')
      .eq('status', 'active')
      .eq('vendors.status', 'approved')
      .order('created_at', { ascending: false })
      .limit(60);
    if (q) req = req.or(`title_en.ilike.%${q}%,title_bn.ilike.%${q}%`);
    req.then(({ data, error }) => {
      if (error) setErr(error.message);
      setProducts((data as unknown as Product[]) ?? []);
      setLoading(false);
    });
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold text-navy">{q ? `"${q}"` : t.products}</h1>
      {loading ? <Spinner label={t.loading} /> : err ? <Alert tone="error">{err}</Alert>
        : products.length === 0 ? <Alert>{t.noProducts}</Alert> : <ProductGrid products={products} />}
    </div>
  );
}
