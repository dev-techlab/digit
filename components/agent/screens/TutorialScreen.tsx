'use client';

import { PlayCircle } from 'lucide-react';
import { Card } from '../ui';

const VIDEOS = [
  { title: 'Getting started with your store', duration: '4:32' },
  { title: 'Configuring game platform accounts', duration: '6:10' },
  { title: 'Adding members & sale agents', duration: '3:48' },
  { title: 'Deposits, withdrawals & reports', duration: '7:05' },
  { title: 'Setting up promotions', duration: '5:21' },
  { title: 'Redemption audit workflow', duration: '4:02' },
];

export function TutorialScreen() {
  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-600">
        Step-by-step video guides for operating your store. Tap a video to play.
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {VIDEOS.map((v) => (
          <Card
            key={v.title}
            className="cursor-pointer overflow-hidden p-0 transition hover:shadow-md"
          >
            <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white/70 transition-colors hover:text-white">
              <PlayCircle
                size={48}
                strokeWidth={1.2}
                className="transition-transform hover:scale-110"
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <p className="text-sm font-medium text-slate-700">{v.title}</p>
              <span className="shrink-0 text-xs text-slate-400">{v.duration}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
