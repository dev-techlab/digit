'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { api, Btn, Card } from '../ui';
import { RichTextEditor } from '../RichTextEditor';
import { cn } from '@/lib/cn';

export function TermsScreen() {
  const [terms, setTerms] = useState<{ en: string | null; es: string | null } | null>(null);
  const [locale, setLocale] = useState<'en' | 'es'>('en');
  const [content, setContent] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [view, setView] = useState<'edit' | 'preview'>('edit');

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
      <div className="mt-5 flex items-center justify-between gap-5 border-b border-slate-100">
        <div className="flex gap-5 text-sm font-semibold">
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
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
          {(['edit', 'preview'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'rounded-md px-3 py-1 capitalize',
                view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {view === 'edit' ? (
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Enter terms content…"
        />
      ) : (
        <div className="mt-4 min-h-[22rem] rounded-lg border border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-700">
          {content ? (
            <div
              className="[&_a]:text-blue-500 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-slate-300">Nothing to preview yet.</p>
          )}
        </div>
      )}
      <div className="mt-4 flex gap-3">
        <Btn onClick={save}>Save</Btn>
        <Btn variant="ghost" onClick={inherit}>
          Use inherited version
        </Btn>
      </div>
    </Card>
  );
}
