import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { Button, Card, Input, Alert } from '../components/ui';
import { slugify } from '../lib/format';

export default function VendorRegister() {
  const { t, user } = useApp();
  const nav = useNavigate();
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!user) { nav('/auth?next=/vendor/register'); return; }
    setBusy(true);
    const { error } = await supabase.from('vendors').insert({
      owner_id: user.id, shop_name: shopName, shop_slug: slugify(shopName),
      phone, description, status: 'pending',
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
  };

  if (done) return <div className="mx-auto max-w-md px-4 py-10"><Alert tone="success">{t.vendorPending}</Alert></div>;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-4 text-xl font-bold text-navy">{t.becomeVendor}</h1>
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder={t.shopName} value={shopName} onChange={(e) => setShopName(e.target.value)} required />
          <Input placeholder={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required />
          <textarea placeholder={t.description} value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} />
          <Button type="submit" variant="orange" className="w-full" disabled={busy}>{busy ? t.loading : t.becomeVendor}</Button>
          {err && <Alert tone="error">{err}</Alert>}
        </form>
      </Card>
    </div>
  );
}
