import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types';
import { useApp } from '../context/AppContext';
import { formatBDT } from '../lib/format';
import { Button, Card, Spinner, Alert } from '../components/ui';

export default function Cart() {
  const { t, locale, cart, updateCartQty, removeFromCart } = useApp();
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cart.length === 0) { setLoading(false); return; }
    supabase.from('products').select('*').in('id', cart.map((l) => l.productId))
      .then(({ data }) => {
        const map: Record<string, Product> = {};
        ((data as Product[]) ?? []).forEach((p) => (map[p.id] = p));
        setProducts(map);
        setLoading(false);
      });
  }, [cart]);

  if (loading) return <Spinner label={t.loading} />;
  const lines = cart.map((l) => ({ line: l, product: products[l.productId] })).filter((x) => x.product);
  const subtotal = lines.reduce((s, x) => s + x.product.price * x.line.qty, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold text-navy">{t.cart}</h1>
      {lines.length === 0 ? (
        <Alert>{t.emptyCart} <Link className="font-semibold text-royal" to="/products">{t.products}</Link></Alert>
      ) : (
        <>
          <div className="space-y-3">
            {lines.map(({ line, product }) => (
              <Card key={line.productId} className="flex items-center gap-3 p-3">
                <div className="h-16 w-16 overflow-hidden rounded-lg bg-lightbg">
                  {product.images?.[0] && <img src={product.images[0]} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy">{locale === 'bn' ? product.title_bn || product.title_en : product.title_en}</p>
                  <p className="text-sm text-royal">{formatBDT(product.price, locale)}</p>
                </div>
                <input type="number" min={1} max={product.stock} value={line.qty}
                  onChange={(e) => updateCartQty(line.productId, Number(e.target.value))}
                  className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <button onClick={() => removeFromCart(line.productId)} className="px-2 text-red-500">✕</button>
              </Card>
            ))}
          </div>
          <Card className="mt-4 p-4">
            <div className="flex justify-between text-sm"><span>{t.subtotal}</span><span className="font-bold text-navy">{formatBDT(subtotal, locale)}</span></div>
            <Link to="/checkout"><Button className="mt-4 w-full">{t.checkout}</Button></Link>
          </Card>
        </>
      )}
    </div>
  );
}
