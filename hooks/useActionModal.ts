import { useState } from 'react';

interface ActionModalResult<T, A> {
  open: boolean;
  item: T | null;
  actionType: A | null;
  busy: boolean;
  err: string | null;

  openModal: (item: T, actionType?: A) => void;
  closeModal: () => void;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setErr: React.Dispatch<React.SetStateAction<string | null>>;
  reset: () => void;
}

export function useActionModal<T = any, A = string>(): ActionModalResult<T, A> {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<T | null>(null);
  const [actionType, setActionType] = useState<A | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openModal = (newItem: T, type?: A) => {
    setItem(newItem);
    if (type !== undefined) setActionType(type);
    setOpen(true);
    setErr(null);
  };

  const closeModal = () => {
    if (busy) return;
    setOpen(false);
    setItem(null);
    setActionType(null);
    setErr(null);
  };

  const reset = () => {
    setOpen(false);
    setItem(null);
    setActionType(null);
    setErr(null);
    setBusy(false);
  };

  return {
    open,
    item,
    actionType,
    busy,
    err,
    openModal,
    closeModal,
    setBusy,
    setErr,
    reset,
  };
}
