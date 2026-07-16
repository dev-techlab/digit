'use client';

import { type ReactNode, useEffect } from 'react';
import { X, PackageOpen, Search, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

/** JSON fetch that throws the API `error` message on non-2xx. */
export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init?.headers } : init?.headers,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const fmtMoney = (v: unknown) =>
  `$${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDateTime = (v: string | Date | null | undefined) =>
  v
    ? new Date(v).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '-';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-slate-100 bg-white p-5 shadow-sm', className)}>
      {children}
    </div>
  );
}

export function Btn({
  variant = 'primary',
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'success' | 'ghost' | 'danger';
}) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50',
        variant === 'primary' && 'bg-blue-500 text-white hover:bg-blue-600',
        variant === 'success' && 'bg-green-500 text-white hover:bg-green-600',
        variant === 'danger' && 'bg-red-500 text-white hover:bg-red-600',
        variant === 'ghost' &&
          'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function SearchBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Btn {...props}>
      <Search size={15} /> Search
    </Btn>
  );
}
export function ResetBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Btn variant="ghost" {...props}>
      <RotateCcw size={15} /> Reset
    </Btn>
  );
}

export function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-600">
        {required && <span className="mr-0.5 text-red-500">*</span>}
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-400',
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400',
        props.className
      )}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition disabled:opacity-50',
        checked ? 'bg-blue-500' : 'bg-slate-200'
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
          checked ? 'left-[22px]' : 'left-0.5'
        )}
      />
    </button>
  );
}

export function EmptyState({ label = 'No Data' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-slate-300">
      <PackageOpen size={44} strokeWidth={1.2} />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function Table({
  headers,
  children,
  empty,
}: {
  headers: ReactNode[];
  children?: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-slate-500">
            {headers.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-slate-600">
          {empty ? (
            <tr>
              <td colSpan={headers.length}>
                {/* sticky keeps the empty state centered in the visible area even
                    when the table itself is wider than the viewport */}
                <div className="sticky left-0 w-full max-w-[calc(100vw-4rem)]">
                  <EmptyState />
                </div>
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={cn(
          'max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white shadow-xl',
          wide ? 'max-w-4xl' : 'max-w-xl'
        )}
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** Right-side drawer, matches the production add/edit panels. */
export function Drawer({
  title,
  open,
  onClose,
  children,
  footer,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function Pagination({
  total,
  page,
  pageSize,
  onPage,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex items-center justify-end gap-3 text-sm text-slate-500">
      <span>Total {total}</span>
      <span>{pageSize}/page</span>
      <div className="flex items-center gap-1">
        <Btn variant="ghost" className="px-2 py-1" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹
        </Btn>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              'h-8 w-8 rounded-md text-sm',
              p === page ? 'bg-blue-500 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {p}
          </button>
        ))}
        <Btn variant="ghost" className="px-2 py-1" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          ›
        </Btn>
      </div>
    </div>
  );
}
