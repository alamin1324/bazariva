import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order, Vendor } from '../lib/types';
import { useApp } from '../context/AppContext';
import { formatBDT } from '../lib/format';
import { Alert, Badge, Card, Spinner, Stat, Button } from '../components/ui';

export default function AdminDashboard() {
  const { t, profile, locale } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: os, error: e1 }, { data: vs, error: e2 }] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('vendors').select('*').order('created_at', { ascending: false }),
      ]);
      if (e1 || e2) setErr((e1 ?? e2)?.message ?? '');
      setOrders((os as Order[]) ?? []);
      setVendors((vs as Vendor[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (profile?.role !== 'admin') return <div className="mx-auto max-w-md px-4 py-10"><Alert tone="error">Admin access only. See docs/SUPERADMIN.md.</Alert></div>;
  if (loading) return <Spinner label={t.loading} />;

  const revenue = orders.reduce((s, o) => s + Number(o.total), 0);

  const setVendorStatus = async (id: string, status: Vendor['status']) => {
    const { data } = await supabase.from('vendors').update({ status }).eq('id', id).select();
    if (data) setVendors((prev) => prev.map((v) => (v.id === id ? (data[0] as Vendor) : v)));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold text-navy">{t.adminDashboard}</h1>
      {err && <Alert tone="error">{err}</Alert>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t.orders} value={orders.length} />
        <Stat label={t.revenue} value={formatBDT(revenue, locale)} />
        <Stat label={t.vendors} value={vendors.length} />
      </div>

      <h2 className="mt-8 mb-3 font-bold text-navy">{t.vendors}</h2>
      <div className="space-y-2">
        {vendors.map((v) => (
          <Card key={v.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-semibold text-navy">{v.shop_name}</p>
              <p className="text-xs text-slate-500">{v.shop_slug}</p>
            </div>
            <Badge color={v.status === 'approved' ? 'green' : v.status === 'pending' ? 'orange' : 'red'}>{v.status}</Badge>
            <div className="flex gap-2">
              {v.status !== 'approved' && <Button onClick={() => setVendorStatus(v.id, 'approved')} className="!px-3 !py-1 text-xs">Approve</Button>}
              {v.status === 'approved' && <Button variant="outline" onClick={() => setVendorStatus(v.id, 'suspended')} className="!px-3 !py-1 text-xs">Suspend</Button>}
            </div>
          </Card>
        ))}
        {vendors.length === 0 && <Alert>{t.vendors}: 0</Alert>}
      </div>

      <h2 className="mt-8 mb-3 font-bold text-navy">{t.orders}</h2>
      <div className="space-y-2">
        {orders.map((o) => (
          <Card key={o.id} className="flex items-center justify-between p-3 text-sm">
            <span className="font-semibold text-navy">#{o.id.slice(0, 8).toUpperCase()}</span>
            <Badge>{o.status}</Badge>
            <span>COD · {o.payment_status}</span>
            <span className="font-bold text-royal">{formatBDT(o.total, locale)}</span>
          </Card>
        ))}
        {orders.length === 0 && <Alert>{t.orders}: 0</Alert>}
      </div>
    </div>
  );
}
