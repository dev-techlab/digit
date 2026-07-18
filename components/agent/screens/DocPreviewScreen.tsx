'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronLeft,
  ChevronRight,
  List,
} from 'lucide-react';
import { Btn, Card } from '../ui';
import { cn } from '@/lib/cn';
import { APP_NAME } from '@/lib/constants';
import { MANUAL_PAGES, MANUAL_TITLE, type ManualBlock } from './manual-content';

function Block({ block, onJump }: { block: ManualBlock; onJump?: (page: number) => void }) {
  switch (block.t) {
    case 'h3':
      return <h4 className="mb-2 mt-5 text-[15px] font-bold text-[#006946]">{block.text}</h4>;
    case 'p':
      return <p className="mb-3 text-sm leading-relaxed text-[#202A36]">{block.text}</p>;
    case 'fig':
      return <p className="mb-3 text-xs italic text-slate-400">{block.text}</p>;
    case 'note':
      return (
        <div className="mb-4 rounded-md border border-[#d9e2ec] bg-[#f7faf8] px-4 py-3">
          <p className="text-sm font-bold text-[#00462D]">{block.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#202A36]">{block.text}</p>
        </div>
      );
    case 'ol':
      return (
        <ol className="mb-4 list-decimal space-y-1 pl-6 text-sm leading-relaxed text-[#202A36]">
          {block.items.map((item, i) => (
            <li key={i}>
              {onJump ? (
                <button
                  className="text-left hover:text-[#006946] hover:underline"
                  onClick={() => onJump(i + 2)}
                >
                  {item}
                </button>
              ) : (
                item
              )}
            </li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr>
                {block.headers.map((h) => (
                  <th
                    key={h}
                    className="border border-[#d9e2ec] bg-[#f7faf8] px-3 py-1.5 text-left font-bold text-[#00462D]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={cn(
                        'max-w-md whitespace-normal border border-[#d9e2ec] px-3 py-1.5 align-top text-[#202A36]',
                        j === 0 && 'font-semibold'
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export function DocPreviewScreen() {
  const [page, setPage] = useState(1); // 1-based — the page most in view
  const [zoom, setZoom] = useState(100);
  const [tocOpen, setTocOpen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const total = MANUAL_PAGES.length;

  // Track which stacked page section is under a reference line near the top
  // of the viewer as the user scrolls, so the page indicator / TOC / dots
  // stay in sync without needing the Next/Prev buttons. (Intersection ratio
  // relative to each section's own height doesn't work here — most pages
  // are several times taller than the viewport, so they'd never cross a
  // meaningful visibility threshold.)
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    let raf = 0;
    const recompute = () => {
      raf = 0;
      const refLine = root.getBoundingClientRect().top + 96;
      let bestPage = 1;
      let bestTop = -Infinity;
      for (let n = 1; n <= total; n++) {
        const el = pageRefs.current[n];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= refLine && top > bestTop) {
          bestTop = top;
          bestPage = n;
        }
      }
      setPage(bestPage);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(recompute);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    recompute();
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [total]);

  const goTo = (n: number) => {
    const target = Math.min(total, Math.max(1, n));
    setPage(target);
    setTocOpen(false);
    pageRefs.current[target]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const fullscreen = () => {
    const el = viewerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  };

  return (
    <Card className="p-0" >
      <div ref={viewerRef} className="flex max-h-[calc(100dvh-11rem)] flex-col bg-white [&:fullscreen]:max-h-none">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="w-fit border-b-2 border-blue-500 pb-1 text-base font-semibold text-blue-500">
            {MANUAL_TITLE}
          </h3>
        </div>

        {/* Toolbar */}
        <div className="relative flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-3 py-2 text-sm text-slate-500 sm:gap-2 sm:px-5">
          <span className="whitespace-nowrap">
            {page} / {total}
          </span>
          <span className="hidden h-5 w-px bg-slate-200 sm:block" />
          <Btn variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={() => goTo(1)}>
            <ArrowUp size={13} /> <span className="hidden sm:inline">First Page</span>
          </Btn>
          <Btn
            variant="ghost"
            className="px-2 py-1.5"
            disabled={page <= 1}
            onClick={() => goTo(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </Btn>
          <Btn
            variant="ghost"
            className="px-2 py-1.5"
            disabled={page >= total}
            onClick={() => goTo(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </Btn>
          <Btn
            variant="ghost"
            className="px-2 py-1.5"
            onClick={() => setZoom((z) => Math.max(60, z - 20))}
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </Btn>
          <span className="whitespace-nowrap tabular-nums">{zoom}%</span>
          <Btn
            variant="ghost"
            className="px-2 py-1.5"
            onClick={() => setZoom((z) => Math.min(180, z + 20))}
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </Btn>
          <Btn variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={() => setTocOpen((v) => !v)}>
            <List size={13} /> <span className="hidden sm:inline">Contents</span>
          </Btn>
          <Btn variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={fullscreen}>
            <Maximize size={13} /> <span className="hidden sm:inline">Fullscreen</span>
          </Btn>

          {tocOpen && (
            <div className="absolute left-3 top-full z-40 mt-1 max-h-80 w-80 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-xl border border-slate-100 bg-white py-2 shadow-lg">
              {MANUAL_PAGES.map((pg, i) => (
                <button
                  key={pg.title}
                  onClick={() => goTo(i + 1)}
                  className={cn(
                    'block w-full px-4 py-1.5 text-left text-sm hover:bg-slate-50',
                    page === i + 1 ? 'font-semibold text-[#006946]' : 'text-slate-600'
                  )}
                >
                  {pg.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Page body — every page stacked so scrolling moves through the
            document naturally; the toolbar/TOC/dots stay in sync via the
            IntersectionObserver above rather than needing Next/Prev clicks. */}
        <div ref={bodyRef} className="flex-1 space-y-4 overflow-auto bg-slate-200/70 p-3 sm:space-y-6 sm:p-6">
          {MANUAL_PAGES.map((pg, i) => {
            const n = i + 1;
            return (
              <div
                key={pg.title}
                ref={(el) => {
                  pageRefs.current[n] = el;
                }}
                data-page={n}
                className="mx-auto w-full max-w-3xl origin-top bg-white px-5 py-8 shadow-md sm:px-10 sm:py-12"
                style={{ zoom: zoom / 100 }}
              >
                {n === 1 ? (
                  <div className="flex flex-col items-center gap-6 py-8 text-center">
                    <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-400 to-blue-600 text-5xl font-bold text-white sm:h-28 sm:w-28 sm:text-6xl">
                      {APP_NAME[0]}
                    </span>
                    <div>
                      <p className="font-serif text-3xl font-bold text-[#00462D] sm:text-4xl">
                        DLink <span className="font-mono font-medium">Agents</span>
                      </p>
                      <p className="mt-2 font-serif text-3xl font-bold text-[#00462D] sm:text-4xl">
                        System Manual
                      </p>
                    </div>
                    <div className="w-full max-w-xl text-left">
                      {pg.blocks.map((b, j) => (
                        <Block key={j} block={b} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="mb-4 border-b border-[#d9e2ec] pb-2 text-xl font-bold text-[#005C3E]">
                      {pg.title}
                    </h2>
                    {pg.blocks.map((b, j) => (
                      <Block key={j} block={b} onJump={n === 2 ? goTo : undefined} />
                    ))}
                  </>
                )}
                <p className="mt-10 border-t border-slate-100 pt-3 text-center text-xs text-slate-300">
                  {MANUAL_TITLE} · Page {n} of {total}
                </p>
              </div>
            );
          })}
        </div>

        {/* Page dots */}
        <div className="flex items-center justify-center gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2.5">
          {MANUAL_PAGES.map((pg, i) => (
            <button
              key={pg.title}
              onClick={() => goTo(i + 1)}
              title={pg.title}
              className={cn(
                'h-7 w-7 shrink-0 rounded-md text-xs',
                page === i + 1
                  ? 'bg-blue-500 font-semibold text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
