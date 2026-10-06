// Native <dialog> as a modal: opens on mount, locks page scroll, focuses the close link and traps Tab.
'use client';

import {useEffect, useRef, type KeyboardEvent} from 'react';

export function useModalDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const element = dialogRef.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Re-open as a modal (it renders with `open` for no-JS visitors).
    element.close();
    element.showModal();
    closeRef.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return {dialogRef, closeRef, trapFocus};
}
