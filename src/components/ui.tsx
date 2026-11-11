import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

export function Button({ children, variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'orange' | 'outline' | 'ghost' }) {
  const styles = {
    primary: 'bg-royal text-white hover:bg-navy',
    orange: 'bg-brandorange text-white hover:opacity-90',
    outline: 'border border-royal text-royal hover:bg-lightbg',
    ghost: 'text-navy hover:bg-lightbg',
  }[variant];
  return (
    <button className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 ${className}`} {...rest} />;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function Badge({ children, color = 'blue' }: { children: ReactNode; color?: 'blue' | 'orange' | 'green' | 'red' | 'gray' }) {
  const c = { blue: 'bg-royal/10 text-royal', orange: 'bg-brandorange/10 text-brandorange', green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700', gray: 'bg-slate-100 text-slate-600' }[color];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${c}`}>{children}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-royal border-t-transparent" />
      {label}
    </div>
  );
}

export function Alert({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' }) {
  const c = { info: 'bg-royal/10 text-navy', error: 'bg-red-50 text-red-700', success: 'bg-green-50 text-green-700' }[tone];
  return <div className={`rounded-lg px-4 py-3 text-sm ${c}`}>{children}</div>;
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy">{value}</p>
    </Card>
  );
}
