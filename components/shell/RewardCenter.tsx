'use client';

import { useState } from 'react';
import { RewardClaimBar } from './RewardClaimBar';
import { CompleteProfileModal } from './CompleteProfileModal';

/**
 * Bundles the gold reward bar with the "Complete Your Profile" modal it opens,
 * so the shell only has to mount a single element above the header.
 */
export function RewardCenter() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <RewardClaimBar onOpen={() => setOpen(true)} />
      <CompleteProfileModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
