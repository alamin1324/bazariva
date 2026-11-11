import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';
import { en, type Dict } from '../i18n/en';
import { bn } from '../i18n/bn';

export interface CartLine { productId: string; qty: number; }

interface AppState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  locale: 'en' | 'bn';
  t: Dict;
  setLocale: (l: 'en' | 'bn') => void;
  cart: CartLine[];
  addToCart: (productId: string, qty?: number) => void;
  updateCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartCount: number;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);
const readJSON = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locale, setLocaleState] = useState<'en' | 'bn'>(() => readJSON<'en' | 'bn'>('bz_locale', 'en'));
  const [cart, setCart] = useState<CartLine[]>(() => readJSON<CartLine[]>('bz_cart', []));
  const [wishlist, setWishlist] = useState<string[]>(() => readJSON<string[]>('bz_wishlist', []));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile((data as Profile) ?? null);
  };
  useEffect(() => { refreshProfile(); }, [session]);

  useEffect(() => localStorage.setItem('bz_locale', JSON.stringify(locale)), [locale]);
  useEffect(() => localStorage.setItem('bz_cart', JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem('bz_wishlist', JSON.stringify(wishlist)), [wishlist]);

  const addToCart = (productId: string, qty = 1) =>
    setCart((c) => {
      const ex = c.find((l) => l.productId === productId);
      return ex ? c.map((l) => (l.productId === productId ? { ...l, qty: l.qty + qty } : l)) : [...c, { productId, qty }];
    });
  const updateCartQty = (productId: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.productId !== productId) : c.map((l) => (l.productId === productId ? { ...l, qty } : l))));
  const removeFromCart = (productId: string) => setCart((c) => c.filter((l) => l.productId !== productId));
  const clearCart = () => setCart([]);
  const toggleWishlist = (productId: string) =>
    setWishlist((w) => (w.includes(productId) ? w.filter((id) => id !== productId) : [...w, productId]));

  const value = useMemo<AppState>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    locale,
    t: locale === 'bn' ? bn : en,
    setLocale: setLocaleState,
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    cartCount: cart.reduce((s, l) => s + l.qty, 0),
    wishlist,
    toggleWishlist,
    refreshProfile,
  }), [session, profile, locale, cart, wishlist]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
