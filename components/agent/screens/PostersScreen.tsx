'use client';

import { useEffect, useState } from 'react';
import { Download, ImageIcon } from 'lucide-react';
import { usePanel } from '../AgentPanel';
import { api, Btn, Card } from '../ui';

interface Poster {
  id: string;
  category: 'portrait' | 'card';
  title: string | null;
  imageUrl: string;
}

/** Render a printable placeholder poster (brand + title + invite QR box) to a PNG. */
function downloadPoster(p: Poster, inviteLink: string) {
  const portrait = p.category === 'portrait';
  const w = portrait ? 1080 : 1280;
  const h = portrait ? 1920 : 800;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(1, '#052e16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#4ade80';
  ctx.font = `bold ${portrait ? 96 : 84}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('DigitLink', w / 2, portrait ? 220 : 160);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${portrait ? 52 : 46}px sans-serif`;
  ctx.fillText(p.title ?? 'Your Ultimate Gaming Solution', w / 2, portrait ? 320 : 250);

  // QR placeholder block + invite link
  const qr = portrait ? 420 : 300;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(w / 2 - qr / 2, h / 2 - qr / 2, qr, qr);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('SCAN TO JOIN', w / 2, h / 2 + qr / 2 + 70);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '28px sans-serif';
  ctx.fillText(inviteLink, w / 2, h - 80);

  const a = document.createElement('a');
  a.download = `digitlink-${p.category}-${(p.title ?? 'poster').toLowerCase().replace(/\s+/g, '-')}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

export function PostersScreen() {
  const { me } = usePanel();
  const [posters, setPosters] = useState<Poster[]>([]);
  const inviteLink = `https://digitlink.mobi?inviteCode=${me.store?.inviteCode ?? ''}`;

  useEffect(() => {
    api<{ posters: Poster[] }>('/api/agent/posters').then((d) => setPosters(d.posters));
  }, []);

  const section = (category: 'portrait' | 'card', label: string) => {
    const items = posters.filter((p) => p.category === category);
    return (
      <div>
        <h3 className="mb-3 border-b border-slate-100 pb-2 text-lg font-semibold text-slate-800">
          {label}
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <Card key={p.id} className="flex flex-col items-center gap-3">
              <div
                className={`flex w-full items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500 ${
                  category === 'portrait' ? 'aspect-[9/16]' : 'aspect-[16/10]'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon size={32} />
                  <span className="px-3 text-center text-xs text-slate-400">{p.title}</span>
                </div>
              </div>
              <Btn
                className="w-full justify-center py-1.5 text-xs"
                onClick={() => downloadPoster(p, inviteLink)}
              >
                <Download size={13} /> Download
              </Btn>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-purple-50 px-4 py-3 text-sm text-rose-600">
        You can print the poster and display it in your store. Customers can scan the QR code to
        register their own membership accounts, allowing them to make deposits online anytime,
        anywhere, and enjoy the games you offer at any time.
      </p>
      {section('portrait', 'Portrait')}
      {section('card', 'Card')}
    </div>
  );
}
