import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types';
import ProductGrid from '../components/ProductGrid';
import { Spinner, Alert } from '../components/ui';
import { useApp } from '../context/AppContext';

export default function Home() {
  const { t } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase
      .from('products')
      .select('*, vendors!inner(shop_name, status)')
      .eq('status', 'active')
      .eq('vendors.status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        setProducts((data as unknown as Product[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-r from-navy to-royal px-4 py-14 text-center text-white">
        <h1 className="text-3xl font-extrabold sm:text-4xl">BAZARIVA</h1>
        <p className="mt-2 text-lg opacity-90">{t.brandTagline}</p>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-4 text-xl font-bold text-navy">{t.products}</h2>
        {loading ? <Spinner label={t.loading} /> : err ? <Alert tone="error">{err}</Alert>
          : products.length === 0 ? <Alert>{t.noProducts}</Alert> : <ProductGrid products={products} />}
      </section>
    </div>
  );
}
