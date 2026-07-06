'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth-context';

const AVATARS = ['🎰', '🃏', '🎲', '🦅', '🐉', '💎', '🍀', '🔥'];

export function AvatarEditorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const [nickname, setNickname] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🎰');

  useEffect(() => {
    if (open && user) {
      setNickname(user.nickname);
      setAvatarEmoji(user.avatarEmoji);
    }
  }, [open, user]);

  const save = () => {
    updateProfile({ nickname: nickname.trim() || user?.nickname, avatarEmoji });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile">
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-solid text-4xl">
            {avatarEmoji}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Select Avatar</p>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setAvatarEmoji(emoji)}
                className={cn(
                  'flex h-14 items-center justify-center rounded-md border text-2xl',
                  avatarEmoji === emoji
                    ? 'border-brand bg-brand/10'
                    : 'border-[var(--card-border)] bg-white/5'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Nickname</p>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter nickname"
          />
        </div>
        <Button fullWidth onClick={save}>
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}
