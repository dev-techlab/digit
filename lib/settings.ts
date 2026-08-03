import 'server-only';
import { db } from '@/lib/db';
import { social_platform } from '../lib/generated/prisma/client';

export type ParsedSettingValue = string | number | boolean | unknown;

/** Public site settings as a parsed key→value map (is_public rows only). */
export async function getSettings(): Promise<Record<string, ParsedSettingValue>> {
  const rows = await db.site_settings.findMany({ where: { is_public: true } });
  const out: Record<string, ParsedSettingValue> = {};
  for (const r of rows) {
    out[r.key] =
      r.type === 'number'
        ? Number(r.value)
        : r.type === 'boolean'
          ? r.value === 'true'
          : r.type === 'json'
            ? safeJson(r.value)
            : r.value;
  }
  return out;
}

/** One setting value, parsed. */
export async function getSetting(key: string): Promise<ParsedSettingValue | undefined> {
  return (await getSettings())[key];
}

function safeJson(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export interface SocialLink {
  platform: social_platform;
  label: string;
  url: string;
  icon: string | null;
}

/** Active social links, ordered — for the footer & Contact Us page. */
export async function getSocialLinks(): Promise<SocialLink[]> {
  const rows = await db.social_links.findMany({
    where: { active: true },
    orderBy: { sort: 'asc' },
  });
  return rows.map((r: any) => ({
    platform: r.platform,
    label: r.label,
    url: r.url,
    icon: r.icon,
  }));
}
