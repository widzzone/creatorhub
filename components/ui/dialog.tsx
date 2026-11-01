'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from './primitives';
import { X } from './icons';

/**
 * Accessible modal built on the native <dialog> element (focus trap, Esc to close).
 * variant="sheet" renders a right-side panel for detail views.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'modal',
  width = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'modal' | 'sheet';
  width?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        'bg-surface p-0 text-ink',
        variant === 'modal' && cx('m-auto w-[calc(100%-2rem)] rounded-panel border border-line', widths[width]),
        variant === 'sheet' && cx('sheet my-0 mr-0 ml-auto h-dvh max-h-dvh w-full border-l border-line', widths[width === 'md' ? 'lg' : width]),
      )}
    >
      {open && (
        <div className={cx('flex flex-col', variant === 'sheet' ? 'h-full' : 'max-h-[min(88dvh,860px)]')}>
          <div className="flex items-start justify-between gap-4 border-b border-line-2 px-6 pt-5 pb-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-[-0.01em]">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="-mr-2 rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Tutup">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line-2 bg-paper/60 px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
