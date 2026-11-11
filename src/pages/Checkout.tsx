import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types';
import { useApp } from '../context/AppContext';
import { formatBDT } from '../lib/format';
import { Button, Card, Input, Alert } from '../components/ui';

export default function Checkout() {
  const { t, cart, user, clearCart } = useApp();
  const nav = useNavigate();
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: 'Dhaka' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (cart.length === 0) return;
    supabase.from('products').select('*').in('id', cart.map((l) => l.productId))
      .then(({ data }) => {
        const map: Record<string, Product> = {};
        ((data as Product[]) ?? []).forEach((p) => (map[p.id] = p));
        setProducts(map);
      });
  }, [cart]);

  const lines = cart.map((l) => ({ qty: l.qty, p: products[l.productId] })).filter((x) => x.p);
  const subtotal = lines.reduce((s, x) => s + x.p.price * x.qty, 0);
  const shippingFee = subtotal > 0 ? 80 : 0;
  const total = subtotal + shippingFee;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const placeOrder = async () => {
    setErr('');
    if (!user) { nav('/auth?next=/checkout'); return; }
    if (!form.name || !form.phone || !form.address) { setErr(t.required); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc('create_order', {
      p_items: cart.map((l) => ({ product_id: l.productId, quantity: l.qty })),
      p_shipping_name: form.name,
      p_shipping_phone: form.phone,
      p_shipping_address: form.address,
      p_shipping_city: form.city,
      p_payment_method: 'cod',
      p_idempotency_key: crypto.randomUUID(),
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    const orderId = typeof data === 'string' ? data : (data as any)?.order_id ?? (data as any)?.id;
    clearCart();
    nav(`/order-confirmation/${orderId}`);
  };

  if (!user) return <div className="mx-auto max-w-md px-4 py-10"><Alert>Please <Link className="font-bold text-royal" to="/auth?next=/checkout">{t.login}</Link> to checkout.</Alert></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold text-navy">{t.checkout}</h1>
      <Alert>{t.codOnly}</Alert>
      <Card className="mt-4 space-y-3 p-4">
        <Input placeholder={t.fullName} value={form.name} onChange={set('name')} />
        <Input placeholder={t.phone} value={form.phone} onChange={set('phone')} inputMode="tel" />
        <Input placeholder={t.address} value={form.address} onChange={set('address')} />
        <Input placeholder={t.city} value={form.city} onChange={set('city')} />
      </Card>
      <Card className="mt-4 p-4 text-sm">
        <div className="flex justify-between"><span>{t.subtotal}</span><span>{formatBDT(subtotal, 'en')}</span></div>
        <div className="flex justify-between"><span>{t.shipping}</span><span>{formatBDT(shippingFee, 'en')}</span></div>
        <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold text-navy"><span>{t.total}</span><span>{formatBDT(total, 'en')}</span></div>
        <Button variant="orange" className="mt-4 w-full" disabled={busy || lines.length === 0} onClick={placeOrder}>
          {busy ? t.loading : t.placeOrder}
        </Button>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </Card>
    </div>
  );
}
