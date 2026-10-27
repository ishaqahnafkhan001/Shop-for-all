"use client";

import { useEffect, useRef } from 'react';

// Only an opted-in Atelier dialog uses this presentation-level focus boundary.
// It owns no authentication, OTP, upload or request state.
export function useAtelierDialog({
  enabled,
  open,
  onClose,
  busy = false
}) {
  const dialogRef = useRef(null);
  const actions = useRef({
    onClose,
    busy
  });
  useEffect(() => {
    actions.current = {
      onClose,
      busy
    };
  }, [onClose, busy]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!enabled || !open || !dialog) return undefined;
    const doc = dialog.ownerDocument;
    const previous = doc.activeElement;
    const previousOverflow = doc.body.style.overflow;
    const focusable = () => Array.from(dialog.querySelectorAll('a[href],button,input,textarea,select,[tabindex]')).filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length > 0);
    doc.body.style.overflow = 'hidden';
    const firstInput = dialog.querySelector('input:not([disabled]):not([type="checkbox"]):not([type="file"]),textarea:not([disabled])');
    (firstInput || focusable()[0])?.focus();
    const keydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!actions.current.busy) actions.current.onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0],
        last = items[items.length - 1];
      if (!dialog.contains(doc.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    doc.addEventListener('keydown', keydown, true);
    return () => {
      doc.removeEventListener('keydown', keydown, true);
      doc.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [enabled, open]);
  return dialogRef;
}
