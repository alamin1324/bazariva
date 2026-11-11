import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, Suborder, Vendor } from '../lib/types';
import { useApp } from '../context/AppContext';
import { formatBDT } from '../lib/format';
import { Button, Card, Input, Alert, Badge, Spinner, Stat } from '../components/ui';

export default function VendorDashboard() {
  const { t, user, locale } = useApp();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suborders, setSuborders] = useState<Suborder[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title_en: '', price: '', stock: '' });
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: v } = await supabase.from('vendors').select('*').eq('owner_id', user.id).maybeSingle();
      setVendor((v as Vendor) ?? null);
      if (v) {
        const [{ data: ps }, { data: so }] = await Promise.all([
          supabase.from('products').select('*').eq('vendor_id', (v as Vendor).id).order('created_at', { ascending: false }),
          supabase.from('suborders').select('*').eq('vendor_id', (v as Vendor).id).order('created_at', { ascending: false }).limit(50),
        ]);
        setProducts((ps as Product[]) ?? []);
        setSuborders((so as Suborder[]) ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  if (!user) return <div className="mx-auto max-w-md px-4 py-10"><Alert>Please login.</Alert></div>;
  if (loading) return <Spinner label={t.loading} />;
  if (!vendor) return <div className="mx-auto max-w-md px-4 py-10"><Alert>{t.vendorPending} <a className="font-bold text-royal" href="/vendor/register">{t.becomeVendor}</a></Alert></div>;

  const earnings = suborders.reduce((s, x) => s + Number(x.vendor_earning), 0);

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const { error } = await supabase.from('products').insert({
      vendor_id: vendor.id,
      title_en: form.title_en,
      slug: form.title_en.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36),
      price: Number(form.price),
      stock: Number(form.stock),
      status: vendor.status === 'approved' ? 'active' : 'draft',
    });
    if (error) { setErr(error.message); return; }
    setForm({ title_en: '', price: '', stock: '' });
    const { data: ps } = await supabase.from('products').select('*').eq('vendor_id', vendor.id).order('created_at', { ascending: false });
    setProducts((ps as Product[]) ?? []);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold text-navy">{t.vendorDashboard} · {vendor.shop_name}</h1>
      <div className="mb-2"><Badge color={vendor.status === 'approved' ? 'green' : vendor.status === 'pending' ? 'orange' : 'red'}>{vendor.status}</Badge></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t.products} value={products.length} />
        <Stat label={t.orders} value={suborders.length} />
        <Stat label={t.revenue} value={formatBDT(earnings, locale)} />
      </div>

      {vendor.status === 'approved' && (
        <Card className="mt-6 p-4">
          <h2 className="mb-3 font-bold text-navy">+ {t.products}</h2>
          <form onSubmit={addProduct} className="flex flex-wrap gap-2">
            <Input placeholder="Title (English)" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} required className="min-w-[180px] flex-1" />
            <Input placeholder={t.price} type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="w-28" />
            <Input placeholder={t.stock} type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required className="w-24" />
            <Button type="submit">{t.save}</Button>
          </form>
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        </Card>
      )}

      <h2 className="mt-6 mb-3 font-bold text-navy">{t.products}</h2>
      <div className="space-y-2">
        {products.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-3 text-sm">
            <span className="font-semibold text-navy">{p.title_en}</span>
            <span>{formatBDT(p.price, locale)}</span>
            <Badge color={p.status === 'active' ? 'green' : 'gray'}>{p.status}</Badge>
            <span className="text-slate-500">{t.stock}: {p.stock}</span>
          </Card>
        ))}
        {products.length === 0 && <Alert>{t.noProducts}</Alert>}
      </div>
    </div>
  );
}
