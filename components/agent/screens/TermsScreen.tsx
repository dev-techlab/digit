'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { api, Btn, Card } from '../ui';

export function TermsScreen() {
  const [terms, setTerms] = useState<{ en: string | null; es: string | null } | null>(null);
  const [locale, setLocale] = useState<'en' | 'es'>('en');
  const [content, setContent] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ terms: { en: string | null; es: string | null } }>('/api/agent/terms').then((d) => {
      setTerms(d.terms);
      setContent(d.terms.en ?? '');
    });
  }, []);

  if (!terms) return <p className="p-6 text-sm text-slate-400">Loading…</p>;

  const switchLocale = (l: 'en' | 'es') => {
    setTerms({ ...terms, [locale]: content });
    setLocale(l);
    setContent(terms[l] ?? '');
  };

  const save = async () => {
    await api('/api/agent/terms', {
      method: 'PUT',
      body: JSON.stringify({ locale, content: content || null }),
    });
    setTerms({ ...terms, [locale]: content });
    setMsg('Terms saved');
    setTimeout(() => setMsg(null), 2500);
  };

  const inherit = async () => {
    setContent('');
    await api('/api/agent/terms', { method: 'PUT', body: JSON.stringify({ locale, content: null }) });
    setMsg('Using inherited version');
    setTimeout(() => setMsg(null), 2500);
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-800">Terms Editor</h3>
      {msg && (
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-600">
          {msg}
        </p>
      )}
      <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-500">
        <Info size={16} className="mt-0.5 shrink-0" />
        Editing terms for your store. Players in your store see this (or fall back to upstream /
        global if you leave it empty).
      </p>
      <div className="mt-5 flex gap-5 border-b border-slate-100 text-sm font-semibold">
        {(['en', 'es'] as const).map((l) => (
          <button
            key={l}
            onClick={() => switchLocale(l)}
            className={
              locale === l ? 'border-b-2 border-blue-500 pb-2 text-blue-500' : 'pb-2 text-slate-600'
            }
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={16}
        placeholder="Enter terms content (HTML supported)…"
        className="mt-4 w-full rounded-lg border border-slate-200 p-4 font-mono text-sm text-slate-700 outline-none focus:border-blue-400"
      />
      <div className="mt-4 flex gap-3">
        <Btn onClick={save}>Save</Btn>
        <Btn variant="ghost" onClick={inherit}>
          Use inherited version
        </Btn>
      </div>
    </Card>
  );
}
