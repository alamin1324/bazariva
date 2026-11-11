import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { Button, Card, Input, Alert } from '../components/ui';

export default function Auth() {
  const { t, refreshProfile } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (error) { setErr(error.message); setBusy(false); return; }
      await refreshProfile();
      nav(next);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setErr(error.message); setBusy(false); return; }
      await refreshProfile();
      nav(next);
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card className="p-6">
        <div className="mb-4 flex gap-2">
          <button onClick={() => setMode('login')} className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === 'login' ? 'bg-royal text-white' : 'bg-lightbg text-navy'}`}>{t.login}</button>
          <button onClick={() => setMode('register')} className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === 'register' ? 'bg-royal text-white' : 'bg-lightbg text-navy'}`}>{t.register}</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && <Input placeholder={t.fullName} value={fullName} onChange={(e) => setFullName(e.target.value)} />}
          <Input type="email" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder={t.password} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? t.loading : mode === 'login' ? t.login : t.register}</Button>
          {err && <Alert tone="error">{err}</Alert>}
        </form>
      </Card>
    </div>
  );
}
