import { Gamepad2, Gift, Share2, User } from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/game', label: 'Game Center', icon: Gamepad2 },
  { href: '/bonus', label: 'Bonus', icon: Gift },
  { href: '/share-activity', label: 'Share', icon: Share2 },
  { href: '/profile', label: 'Profile', icon: User },
] as const;
