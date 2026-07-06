const BANNERS = [
  {
    id: 1,
    title: 'Weekend Reload Bonus',
    badge: 'Active',
    gradient: 'from-slate-600 to-slate-800',
  },
  {
    id: 2,
    title: 'Refer a Friend, Earn SC',
    badge: 'Active',
    gradient: 'from-emerald-700 to-slate-900',
  },
  {
    id: 3,
    title: 'VIP Loyalty Program',
    badge: 'LONG-TERM',
    gradient: 'from-indigo-700 to-slate-900',
  },
];

export function BannerCarousel() {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 pt-4 md:grid md:grid-cols-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
      {BANNERS.map((b) => (
        <div
          key={b.id}
          className={`relative flex h-32 w-[85%] shrink-0 snap-center items-end overflow-hidden rounded-xl bg-gradient-to-br p-4 md:h-40 md:w-auto md:shrink ${b.gradient}`}
        >
          <span
            className={`absolute right-3 top-3 flex items-center gap-1 rounded-pill px-2.5 py-1 text-[10px] font-bold ${
              b.badge === 'Active'
                ? 'bg-black/50 text-success'
                : 'bg-black/50 text-[var(--text-secondary)]'
            }`}
          >
            {b.badge === 'Active' && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
            {b.badge}
          </span>
          <p className="text-sm font-bold text-white drop-shadow">{b.title}</p>
        </div>
      ))}
    </div>
  );
}
