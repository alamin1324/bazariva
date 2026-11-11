import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Order } from '../lib/types';
import { useApp } from '../context/AppContext';
import { formatBDT } from '../lib/format';
import { Card, Alert, Spinner, Badge } from '../components/ui';

export default function OrderConfirmation() {
  const { id } = useParams();
  const { t } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('orders').select('*, suborders(*, vendors(shop_name), items(*))')
      .eq('id', id).single()
      .then(({ data }) => { setOrder((data as unknown as Order) ?? null); setLoading(false); });
  }, [id]);

  if (loading) return <Spinner label={t.loading} />;
  if (!order) return <div className="mx-auto max-w-2xl px-4 py-10"><Alert tone="error">{t.notFound}</Alert></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-xl bg-green-50 p-6 text-center">
        <p className="text-4xl">✅</p>
        <h1 className="mt-2 text-xl font-bold text-green-700">{t.orderPlaced}</h1>
        <p className="mt-1 text-sm text-slate-600">#{order.id.slice(0, 8).toUpperCase()} · {t.status}: <Badge>{order.status}</Badge> · COD</p>
      </div>
      <Card className="mt-4 p-4 text-sm">
        {order.suborders?.map((s) => (
          <div key={s.id} className="border-b py-3 last:border-0">
            <p className="font-semibold text-navy">🏪 {s.vendors?.shop_name ?? 'Vendor'}</p>
            {s.items?.map((it) => (
              <div key={it.id} className="mt-1 flex justify-between text-slate-600">
                <span>{it.title} × {it.quantity}</span><span>{formatBDT(it.line_total, 'en')}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="mt-2 flex justify-between font-bold text-navy"><span>{t.total}</span><span>{formatBDT(order.total, 'en')}</span></div>
      </Card>
      <Link to="/products" className="mt-6 block text-center font-semibold text-royal">{t.products} →</Link>
    </div>
  );
}
