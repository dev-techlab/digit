'use client';

import { useEffect, useRef } from 'react';

const BANNERS = [
  {
    id: 1,
    image: '/media/banners/banner-1.webp',
    badge: 'Active',
  },
  {
    id: 2,
    image: '/media/banners/banner-2.webp',
    badge: 'Active',
  },
  {
    id: 3,
    image: '/media/banners/banner-3.webp',
    badge: 'Active',
  },
  {
    id: 4,
    image: '/media/banners/banner-4.webp',
    badge: 'Active',
  },
];

export function BannerCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;

      const { scrollLeft, scrollWidth, clientWidth } = el;
      const child = el.firstElementChild as HTMLElement;
      if (!child) return;

      // Calculate scroll step based on item width and gap
      const style = window.getComputedStyle(el);
      const gap = parseInt(style.gap || '12', 10);
      const itemWidth = child.offsetWidth + gap;

      // If we are at the end, scroll back to start, else scroll next
      if (scrollLeft + clientWidth >= scrollWidth - 5) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: itemWidth, behavior: 'smooth' });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={scrollRef}
      className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 pt-4 md:gap-4 md:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {BANNERS.map((b) => (
        <div
          key={b.id}
          className="relative flex aspect-[21/9] w-[90%] shrink-0 snap-center items-end overflow-hidden rounded-xl bg-slate-800 md:w-[calc(50%-8px)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.image} alt="Banner" className="absolute inset-0 h-full w-full object-cover" />
          <span
            className={`absolute right-3 top-3 flex items-center gap-1 rounded-pill px-2.5 py-1 text-[10px] font-bold ${
              b.badge === 'Active'
                ? 'bg-black/60 text-success backdrop-blur-sm'
                : 'bg-black/60 text-[var(--text-secondary)] backdrop-blur-sm'
            }`}
          >
            {b.badge === 'Active' && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
            {b.badge}
          </span>
        </div>
      ))}
    </div>
  );
}
