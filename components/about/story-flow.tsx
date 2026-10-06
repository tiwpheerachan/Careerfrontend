'use client';

import { useRef, useState, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { FlipImage, type FlipSource } from './flip-image';

type StepId = '01' | '02' | '03';
export type FlowStep = { id: string; title: string; meta: string; tag: string; body: string };
type FlowHeader = { kicker: string; titleLine1: string; titleLine2: string; subtitle: string };

function StepPill({ n, active, onClick }: { n: StepId; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'h-7 w-10 border text-[12px] font-black tracking-wide transition',
        active
          ? 'border-pink-200 bg-pink-100 text-slate-950'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      )}
      aria-pressed={active}
    >
      {n}
    </button>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center border border-pink-200 bg-pink-100 px-2.5 py-1 text-[12px] font-black text-slate-950">
      {children}
    </span>
  );
}

function StepHead({ no, step }: { no: StepId; step: FlowStep }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-7 w-7 items-center justify-center border border-pink-200 bg-pink-100 text-[12px] font-black text-slate-950">
        {no}
      </span>
      <div className="min-w-0">
        <div className="text-[16px] font-black text-slate-950 sm:text-[18px]">{step.title}</div>
        <div className="mt-0.5 text-[12px] font-semibold text-slate-500">{step.meta}</div>
      </div>
      <div className="ml-auto">
        <Tag>{step.tag}</Tag>
      </div>
    </div>
  );
}

const flipBox = 'relative overflow-hidden border border-slate-200 bg-white';

/** The "SHD story flow" card: 01/02/03 pills and the three steps with crossfading images. */
export function StoryFlow({
  header,
  steps,
  images,
}: {
  header: FlowHeader;
  steps: FlowStep[];
  images: { step1: [FlipSource, FlipSource]; step2: [FlipSource, FlipSource]; wide: [FlipSource, FlipSource] };
}) {
  const [active, setActive] = useState<StepId>('01');
  const flowRef = useRef<HTMLDivElement>(null);

  const onPickStep = (id: StepId) => {
    setActive(id);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      window.setTimeout(() => flowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  const [f0, f1, f2] = steps;

  return (
    <div ref={flowRef} className="scroll-mt-24 lg:col-span-7">
      <div className="border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-black text-slate-700">
              <span className="h-2 w-2 bg-slate-900" />
              {header.kicker}
            </div>

            <div className="mt-3 text-[22px] leading-[1.12] font-black tracking-tight text-slate-950 sm:text-[28px]">
              {header.titleLine1}
              <br className="hidden sm:block" />
              {header.titleLine2}
            </div>

            <div className="mt-2 text-[12px] font-semibold text-slate-500">{header.subtitle}</div>
          </div>

          <div className="flex items-center gap-2">
            <StepPill n="01" active={active === '01'} onClick={() => onPickStep('01')} />
            <div className="h-px w-6 bg-slate-200" />
            <StepPill n="02" active={active === '02'} onClick={() => onPickStep('02')} />
            <div className="h-px w-6 bg-slate-200" />
            <StepPill n="03" active={active === '03'} onClick={() => onPickStep('03')} />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {f0 ? (
            <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <StepHead no="01" step={f0} />
                <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{f0.body}</p>
              </div>

              <div className="lg:col-span-5">
                <FlipImage
                  a={images.step1[0]}
                  b={images.step1[1]}
                  intervalMs={4200}
                  sizes="(min-width: 1024px) 260px, 100vw"
                  className={cx(flipBox, 'h-[200px] sm:h-[220px] lg:h-[190px]')}
                >
                  <div className="relative h-full w-full" />
                </FlipImage>
              </div>
            </div>
          ) : null}

          {f1 ? (
            <div className="mt-6 grid gap-4 sm:gap-5 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <FlipImage
                  a={images.step2[0]}
                  b={images.step2[1]}
                  intervalMs={4500}
                  sizes="(min-width: 1024px) 210px, 100vw"
                  className={cx(flipBox, 'h-[200px] sm:h-[240px] lg:h-[210px]')}
                >
                  <div className="relative h-full w-full" />
                </FlipImage>
              </div>

              <div className="lg:col-span-8">
                <StepHead no="02" step={f1} />
                <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{f1.body}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <FlipImage
              a={images.wide[0]}
              b={images.wide[1]}
              intervalMs={4800}
              sizes="(min-width: 1180px) 600px, (min-width: 1024px) 55vw, 100vw"
              className={cx(flipBox, 'h-[140px] sm:h-[160px]')}
            >
              <div className="relative h-full w-full" />
            </FlipImage>
          </div>

          {f2 ? (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <StepHead no="03" step={f2} />
              <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{f2.body}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
