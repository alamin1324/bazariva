import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product, Review } from '../lib/types';
import { useApp } from '../context/AppContext';
import { formatBDT, formatDate } from '../lib/format';
import { Button, Card, Spinner, Alert, Badge } from '../components/ui';

export default function ProductDetails() {
  const { slug } = useParams();
  const { t, locale, addToCart, user } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    supabase
      .from('products')
      .select('*, vendors(shop_name, shop_slug), categories(name_en, name_bn), brands(name)')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        setProduct((data as unknown as Product) ?? null);
        setLoading(false);
      });
    if (slug) {
      supabase
        .from('reviews')
        .select('*, profiles(full_name)')
        .eq('product_id', (slug as string))
        .eq('status', 'approved')
        .then(({ data }) => setReviews((data as unknown as Review[]) ?? []));
    }
  }, [slug]);

  if (loading) return <Spinner label={t.loading} />;
  if (err || !product) return <div className="mx-auto max-w-3xl px-4 py-10"><Alert tone="error">{err || t.notFound}</Alert></div>;

  const title = locale === 'bn' ? product.title_bn || product.title_en : product.title_en;
  const desc = locale === 'bn' ? product.description_bn || product.description_en : product.description_en;
  const vendorName = (product as any).vendors?.shop_name;

  const submitReview = async () => {
    setReviewMsg('');
    const { error } = await supabase.rpc('submit_review', {
      p_product_id: product.id, p_rating: rating, p_comment: comment || null,
    });
    setReviewMsg(error ? error.message : '✓ Review submitted');
    if (!error) { setComment(''); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl bg-lightbg">
          {product.images?.[0]
            ? <img src={product.images[0]} alt={title} className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-7xl text-royal/30">🛍️</div>}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-navy">{title}</h1>
          {vendorName && <p className="mt-1 text-sm text-slate-500">🏪 {vendorName}</p>}
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-royal">{formatBDT(product.price, locale)}</span>
            {product.compare_price != null && product.compare_price > product.price && (
              <span className="text-lg text-slate-400 line-through">{formatBDT(product.compare_price, locale)}</span>
            )}
          </div>
          <div className="mt-2">{product.stock > 0 ? <Badge color="green">{t.inStock} ({product.stock})</Badge> : <Badge color="gray">{t.outOfStock}</Badge>}</div>
          {desc && <p className="mt-4 whitespace-pre-line text-sm text-slate-600">{desc}</p>}
          <div className="mt-6 flex items-center gap-3">
            <input type="number" min={1} max={Math.max(product.stock, 1)} value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <Button disabled={product.stock <= 0} onClick={() => addToCart(product.id, qty)}>{t.addToCart}</Button>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-bold text-navy">{t.reviews}</h2>
        {reviews.length === 0 && <Alert>{t.writeReview}</Alert>}
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-navy">{r.profiles?.full_name ?? 'Customer'}</span>
                <span className="text-brandorange">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                {r.is_verified_purchase && <Badge color="green">{t.verifiedPurchase}</Badge>}
                <span className="ml-auto text-xs text-slate-400">{formatDate(r.created_at, locale)}</span>
              </div>
              {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
            </Card>
          ))}
        </div>
        {user && (
          <Card className="mt-4 p-4">
            <div className="flex items-center gap-2">
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
              </select>
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.writeReview}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <Button onClick={submitReview}>{t.save}</Button>
            </div>
            {reviewMsg && <p className="mt-2 text-xs text-slate-500">{reviewMsg}</p>}
          </Card>
        )}
      </section>
    </div>
  );
}
