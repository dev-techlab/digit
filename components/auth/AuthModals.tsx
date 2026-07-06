'use client';

import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { TermsAndRulesModal } from './TermsAndRulesModal';

export function AuthModals() {
  return (
    <>
      <LoginModal />
      <RegisterModal />
      <ResetPasswordModal />
      <TermsAndRulesModal />
    </>
  );
}
