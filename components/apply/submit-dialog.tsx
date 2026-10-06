'use client';

import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { cx } from '@/lib/cx';

export type Phase = 'idle' | 'validating' | 'uploading' | 'sending' | 'done';

function StepPill({ active, done, label }: { active?: boolean; done?: boolean; label: string }) {
  return (
    <div
      aria-current={active ? 'step' : undefined}
      className={cx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
        done
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : active
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-600',
      )}
    >
      <span className={cx('h-2 w-2 rounded-full', done ? 'bg-emerald-500' : active ? 'bg-blue-500' : 'bg-slate-300')} />
      {label}
    </div>
  );
}

/**
 * The progress popup: Validate → Upload → Send, then the outcome. It cannot
 * be closed (Esc, overlay, button) until the submission has finished.
 */
export function SubmitDialog({
  open,
  phase,
  ok,
  hint,
  errorMessage,
  stoppedAt,
  container,
  onClose,
  onClosed,
}: {
  open: boolean;
  phase: Phase;
  ok: boolean;
  hint: string;
  errorMessage?: string;
  /** On failure: the step that failed (it and the later ones are not marked done). */
  stoppedAt?: Exclude<Phase, 'idle' | 'done'>;
  /**
   * Where to mount it. The old popup lived inside the page's <main> (an
   * isolated stacking context), so the navbar stayed above its backdrop.
   */
  container?: HTMLElement | null;
  onClose: () => void;
  /** After it has closed (focus goes back to the form). */
  onClosed: () => void;
}) {
  const t = useTranslations('apply.modal');
  const finished = phase === 'done';
  const order = ['validating', 'uploading', 'sending'] as const;
  /** A step is done once a later one is running, or when all finished well; a failed step and those after it are not. */
  const isDone = (step: (typeof order)[number]) => {
    if (finished) return ok || (stoppedAt !== undefined && order.indexOf(step) < order.indexOf(stoppedAt));
    return phase !== 'idle' && order.indexOf(step) < order.indexOf(phase);
  };

  const title = finished ? (ok ? t('titleDone') : t('titleError')) : t('titleSubmitting');

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finished && onClose()}>
      <DialogPortal container={container ?? undefined}>
        <DialogOverlay className="z-200 bg-slate-900/40 backdrop-blur-xs" />
        <DialogPrimitive.Content
          aria-busy={!finished}
          onEscapeKeyDown={(e) => !finished && e.preventDefault()}
          onPointerDownOutside={(e) => !finished && e.preventDefault()}
          onInteractOutside={(e) => !finished && e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            onClosed();
          }}
          className="fixed top-1/2 left-1/2 z-200 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/30 bg-white/85 shadow-2xl backdrop-blur-xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none"
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-base leading-6 font-black text-slate-900">{title}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-600" aria-live="polite">
                  {hint}
                </DialogDescription>
              </div>
            </div>

            <div className="mt-4">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StepPill label={t('stepValidate')} done={isDone('validating')} active={phase === 'validating'} />
                  <StepPill label={t('stepUpload')} done={isDone('uploading')} active={phase === 'uploading'} />
                  <StepPill label={t('stepSend')} done={isDone('sending')} active={phase === 'sending'} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    {finished ? (
                      ok ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" aria-hidden="true" />
                      )
                    ) : (
                      <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-slate-600" aria-hidden="true" />
                    )}

                    <div className="min-w-0" role={finished ? 'status' : undefined}>
                      <div className="text-sm font-semibold text-slate-900">
                        {finished ? (ok ? t('okTitle') : t('failTitle')) : t('wait')}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {finished ? (ok ? t('okBody') : errorMessage) : t('waitBody')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-ghost" onClick={onClose} disabled={!finished}>
                    {t('close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
