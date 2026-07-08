import { describe, it, expect, beforeAll } from 'vitest';
import { getSettings, getSetting, getSocialLinks } from '@/lib/settings';
import { requireSeed } from './helpers';

beforeAll(requireSeed);

describe('getSettings — typed parsing', () => {
  it('parses values by their declared type', async () => {
    const settings = await getSettings();
    expect(settings['site.name']).toBe('Octan Link'); // string
    expect(settings['support.livechat_enabled']).toBe(true); // boolean
    expect(settings['referral.reward_sc']).toBe(5); // number
    expect(typeof settings['site.logo_url']).toBe('string'); // image → url string
  });

  it('getSetting returns a single parsed value', async () => {
    expect(await getSetting('currency.gc_label')).toBe('Gold Coins');
    expect(await getSetting('does.not.exist')).toBeUndefined();
  });
});

describe('getSocialLinks', () => {
  it('returns active links ordered by sort', async () => {
    const links = await getSocialLinks();
    expect(links.length).toBeGreaterThanOrEqual(8);
    const platforms = links.map((l) => l.platform);
    expect(platforms).toContain('telegram');
    expect(platforms).toContain('email');
    // telegram is seeded at sort 0 → first
    expect(links[0].platform).toBe('telegram');
    expect(links.every((l) => typeof l.url === 'string' && l.url.length > 0)).toBe(true);
  });
});
