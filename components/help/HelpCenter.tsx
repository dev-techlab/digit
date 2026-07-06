'use client';

import { useState } from 'react';
import { PlayCircle, HelpCircle, ImageIcon, ChevronRight, type LucideIcon } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { HelpItemIconBadge } from './HelpItemIconBadge';
import { StepGuideModal } from './StepGuideModal';
import { HelpInfoModal } from './HelpInfoModal';
import {
  HELP_CONTENT,
  type HelpTab,
  type HelpItem,
  type HelpSectionIcon,
} from '@/lib/help-content';

const SECTION_ICON: Record<HelpSectionIcon, LucideIcon> = {
  video: PlayCircle,
  faq: HelpCircle,
  guide: ImageIcon,
};

export function HelpCenter({ initialTab = 'general' }: { initialTab?: HelpTab }) {
  const [tab, setTab] = useState<HelpTab>(initialTab);
  const [active, setActive] = useState<HelpItem | null>(null);

  const sections = HELP_CONTENT[tab];

  return (
    <div className="mx-auto max-w-3xl">
      <Tabs
        className="mx-auto max-w-md"
        value={tab}
        onChange={(v) => setTab(v as HelpTab)}
        options={[
          { value: 'general', label: 'General' },
          { value: 'deposit', label: 'Deposit' },
          { value: 'withdraw', label: 'Withdraw' },
        ]}
      />

      <div className="mt-6 space-y-7">
        {sections.map((section) => {
          const SectionIcon = SECTION_ICON[section.icon];
          return (
            <section key={section.key}>
              <div className="mb-3 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                <SectionIcon size={15} />
                <span>{section.label}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActive(item)}
                    className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.06]"
                  >
                    <HelpItemIconBadge icon={item.icon} />
                    <span className="min-w-0 flex-1 text-sm font-medium leading-snug">
                      {item.title}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-[var(--text-secondary)]" />
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <StepGuideModal
        item={active?.kind === 'guide' ? active : null}
        onClose={() => setActive(null)}
      />
      <HelpInfoModal
        item={active && active.kind !== 'guide' ? active : null}
        onClose={() => setActive(null)}
      />
    </div>
  );
}
