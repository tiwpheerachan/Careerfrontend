'use client';

import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Dialog } from '@/components/ui/dialog';
import { Sheet } from '@/components/ui/sheet';

/**
 * The shell of the Why page's two popups: shadcn Dialog on desktop, shadcn
 * Sheet (from the bottom) on phones — focus trap, ESC, scroll lock, a click
 * outside closes, aria-labelledby from the <ModalTitle>.
 *
 * The old popups' look is kept by rendering the overlay and the panel from the
 * same radix primitives the shadcn components wrap: the panel sits INSIDE the
 * overlay (radix's "scrollable overlay" pattern), so the overlay keeps the old
 * flex centering / bottom anchoring, its white blur and its z-index, which
 * shadcn's DialogContent / SheetContent hard-wire differently.
 */
export function ModalShell({
  open,
  onClose,
  sheet,
  overlayClassName,
  className,
  style,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Phone layout: a bottom sheet. */
  sheet: boolean;
  overlayClassName: string;
  className: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const Root = sheet ? Sheet : Dialog;
  return (
    <Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayClassName}>
          <DialogPrimitive.Content
            className={className}
            style={style}
            aria-describedby={undefined}
            data-slot={sheet ? 'sheet-content' : 'dialog-content'}
          >
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </Root>
  );
}

export const ModalTitle = DialogPrimitive.Title;
export const ModalClose = DialogPrimitive.Close;
