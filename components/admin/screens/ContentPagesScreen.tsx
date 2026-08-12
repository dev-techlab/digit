'use client';

import { useEffect, useState } from 'react';
import { useAdminPanel } from '@/components/admin/AdminShell';
import { api, Card, Btn } from '@/components/agent/ui';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

type ContentPage = { slug: string; title: string; body: string };

export function ContentPagesScreen() {
  const { me } = useAdminPanel();
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [bodyDraft, setBodyDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<ContentPage[]>('/api/admin/content-pages')
      .then((data) => {
        setPages(data);
        if (data.length > 0) {
          setSelectedSlug(data[0].slug);
          setBodyDraft(data[0].body);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedPage = pages.find((p) => p.slug === selectedSlug);

  const handleSelect = (slug: string) => {
    const page = pages.find((p) => p.slug === slug);
    if (!page) return;
    setSelectedSlug(slug);
    setBodyDraft(page.body);
  };

  const handleSave = async () => {
    if (!selectedSlug) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api<ContentPage>('/api/admin/content-pages', {
        method: 'PUT',
        body: JSON.stringify({ slug: selectedSlug, body: bodyDraft }),
      });
      setPages((prev) => prev.map((p) => (p.slug === updated.slug ? updated : p)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading pages...</div>;
  }

  if (error && !pages.length) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <Card className="flex-shrink-0 lg:w-64">
        <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wider text-slate-400">
          Pages
        </h2>
        <div className="flex flex-col gap-1">
          {pages.map((p) => (
            <button
              key={p.slug}
              onClick={() => handleSelect(p.slug)}
              className={`rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                selectedSlug === p.slug
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex-1 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {selectedPage ? (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-800">{selectedPage.title}</h1>
              {(me.isSuperAdmin || me.permissions.includes('content_pages.write')) && (
                <Btn disabled={saving} onClick={handleSave}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Btn>
              )}
            </div>

            <div className="text-sm text-slate-500">
              Editing: <span className="font-mono text-slate-400">{selectedPage.slug}</span>
            </div>

            <RichTextEditor
              value={bodyDraft}
              onChange={setBodyDraft}
              placeholder="Enter page content..."
            />
          </>
        ) : (
          <div className="p-8 text-center text-slate-500">No page selected.</div>
        )}
      </Card>
    </div>
  );
}
