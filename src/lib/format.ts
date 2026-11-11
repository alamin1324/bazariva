export function formatBDT(amount: number, locale: 'en' | 'bn' = 'en'): string {
  const n = new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', {
    style: 'currency', currency: 'BDT', maximumFractionDigits: 0,
  }).format(amount);
  return n;
}

export function formatDate(iso: string, locale: 'en' | 'bn' = 'en'): string {
  return new Date(iso).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}
