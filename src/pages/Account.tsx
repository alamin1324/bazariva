import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../lib/types';
import { useApp } from '../context/AppContext';
import { formatBDT, formatDate } from '../lib/format';
import { Button, Card, Input, Alert, Badge, Spinner } from '../components/ui';

export default function Account() {
  const { t, user, profile, locale, refreshProfile } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setOrders((data as Order[]) ?? []); setLoading(false); });
  }, [user]);

  if (!user) return <div className="mx-auto max-w-md px-4 py-10"><Alert>Please login.</Alert></div>;

  const save = async () => {
    await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
    await refreshProfile();
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-xl font-bold text-navy">{t.account}</h1>
      <Card className="mb-6 space-y-3 p-4">
        <Input placeholder={t.fullName} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input placeholder={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        <Button onClick={save}>{t.save}</Button>
        {saved && <Alert tone="success">✓</Alert>}
      </Card>
      <h2 className="mb-3 text-lg font-bold text-navy">{t.orders}</h2>
      {loading ? <Spinner label={t.loading} /> : orders.length === 0 ? <Alert>{t.emptyCart}</Alert> : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-semibold text-navy">#{o.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-slate-500">{formatDate(o.created_at, locale)}</p>
              </div>
              <Badge>{o.status}</Badge>
              <span className="font-bold text-royal">{formatBDT(o.total, locale)}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
