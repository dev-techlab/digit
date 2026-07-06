import Image from 'next/image';
import Link from 'next/link';
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Send,
  MessageCircle,
  Mail,
  Music2,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { getSettings, getSocialLinks } from '@/lib/settings';

const LINKS = [
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/responsible-gaming', label: 'Responsible Social Gameplay' },
  { href: '/contact-us', label: 'Contact Us' },
  { href: '/anti-fraud', label: 'Anti-Fraud' },
];

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  telegram: Send,
  whatsapp: MessageCircle,
  discord: MessageCircle,
  tiktok: Music2,
  email: Mail,
  livechat: MessageCircle,
};

export async function Footer() {
  const [settings, socials] = await Promise.all([getSettings(), getSocialLinks()]);
  const siteName = (settings['site.name'] as string) ?? 'Digit Link';
  const logoUrl =
    (settings['site.logo_url'] as string) ?? 'https://digitlink.mobi/img/icons/icon-192x192.png';

  return (
    <footer className="mt-8 border-t border-[var(--card-border)] px-6 py-8 text-center">
      <div className="mx-auto mb-3 h-16 w-16">
        <Image src={logoUrl} alt={siteName} width={64} height={64} unoptimized />
      </div>
      <p className="text-base font-bold">{siteName}</p>

      {socials.length > 0 && (
        <nav className="mt-4 flex flex-wrap justify-center gap-3">
          {socials.map((s) => {
            const Icon = SOCIAL_ICONS[s.platform] ?? Globe;
            return (
              <a
                key={s.platform}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--card-border)]/40 text-[var(--text-secondary)] transition hover:bg-brand/15 hover:text-brand"
              >
                <Icon size={18} />
              </a>
            );
          })}
        </nav>
      )}
      <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-[var(--text-secondary)]">
        At Digit Link, we offer free casino-style entertainment to players in the United States
        (exclusions apply). With our sweepstakes model, you have the chance to win free coins that
        can be used across all games in our collection. Test your luck on our exciting video slots
        and card games.
      </p>

      <nav className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-brand hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
          21+
        </span>
        A minimum age requirement is applicable for U.S. residents.
      </div>

      <p className="mx-auto mt-3 max-w-md text-[11px] leading-relaxed text-[var(--text-secondary)]">
        The information you provide will be used solely for the purpose of this promotion.
      </p>
      <p className="mx-auto mt-2 max-w-md text-[11px] leading-relaxed text-[var(--text-secondary)]">
        No purchase is necessary to participate in sweepstakes casino games. Sweepstakes are void
        where prohibited by law. For detailed rules, please refer to{' '}
        <Link href="/sweeps-rules" className="text-brand hover:underline">
          Sweeps Rules
        </Link>
        .
      </p>

      <p className="mt-4 text-[11px] text-[var(--text-secondary)]">
        Copyright © 2026 Digit Link. All rights reserved.
      </p>
    </footer>
  );
}
