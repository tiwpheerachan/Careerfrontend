import { Globe2, HeartHandshake } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './mission-vision.module.css';

/** Custom properties the orbit's CSS reads: angle, radius (in cqw), face spin, radius fallback in px. */
const orbit = (vars: { a: string; r: number; face?: string; rpx: string }) =>
  ({ '--a': vars.a, '--r': vars.r, '--face': vars.face, '--rpx': vars.rpx }) as CSSProperties;

function Node({
  src,
  alt,
  size,
  vars,
}: {
  src: string;
  alt: string;
  size?: 'sm' | 'xs';
  vars: Parameters<typeof orbit>[0];
}) {
  const px = size === 'sm' ? 38 : size === 'xs' ? 34 : 44;
  return (
    <div className={cx(styles.node, size && styles[size])} style={orbit(vars)}>
      <Image src={src} alt={alt} width={px} height={px} />
    </div>
  );
}

function Dot({ vars }: { vars: Parameters<typeof orbit>[0] }) {
  return <div className={styles.dot} style={orbit(vars)} />;
}

function Pillar({ icon, kicker, title, body }: { icon: ReactNode; kicker: string; title: string; body: string }) {
  return (
    <div className="border-t border-slate-900/10 pt-6">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/3">{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold tracking-[0.22em] text-slate-900/70 [&:lang(th)]:tracking-normal">
            {kicker}
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">{title}</div>
          <p className={cx(styles.p, 'mt-2')}>{body}</p>
        </div>
      </div>
    </div>
  );
}

/** Mission and vision beside the CSS orbit of team photos (dashed SVG rings, rotating avatars). */
export function MissionVision() {
  const t = useTranslations('about.missionVision');
  const alt = useTranslations('about.alt');
  const member = alt('teamMember');

  return (
    <section className="bg-white py-14">
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className={styles.kicker}>{t('kicker')}</div>

            <h2 className={cx(styles.h, 'mt-4')}>
              {t('headline.line1')}
              <br className="hidden sm:block" />
              {t('headline.line2')}
            </h2>

            <div className="mt-8 space-y-8">
              <Pillar
                icon={<HeartHandshake className="h-5 w-5 text-slate-900" />}
                kicker={t('mission.kicker')}
                title={t('mission.title')}
                body={t('mission.body')}
              />
              <Pillar
                icon={<Globe2 className="h-5 w-5 text-slate-900" />}
                kicker={t('vision.kicker')}
                title={t('vision.title')}
                body={t('vision.body')}
              />
            </div>
          </div>

          <div className="lg:justify-self-end">
            <div className={styles.orbitWrap}>
              <svg className={styles.orbitSvg} viewBox="0 0 100 100" aria-hidden="true">
                <circle
                  className={cx(styles.ringStroke, styles.ringDash, styles.dashAnim)}
                  cx="50"
                  cy="50"
                  r="44"
                  strokeDashoffset="0"
                />
                <circle className={cx(styles.ringStroke, styles.ringSolid)} cx="50" cy="50" r="38" />
                <circle
                  className={cx(styles.ringStroke, styles.ringDash, styles.dashAnim)}
                  style={{ animationDuration: '112s' }}
                  cx="50"
                  cy="50"
                  r="32"
                  strokeDashoffset="70"
                />
                <circle className={cx(styles.ringStroke, styles.ringSolid)} cx="50" cy="50" r="24" />
                <circle
                  className={cx(styles.ringStroke, styles.ringDash, styles.dashAnim)}
                  style={{ animationDuration: '136s' }}
                  cx="50"
                  cy="50"
                  r="18"
                  strokeDashoffset="120"
                />
              </svg>

              <div className={styles.center}>
                <Image src="/images/about/team/center.jpg" alt={alt('teamCenter')} width={92} height={92} />
              </div>

              <div className={styles.rot} style={{ animationDuration: '173s' }}>
                <Node
                  src="/images/about/team/t1.jpg"
                  alt={member}
                  vars={{ a: '18deg', r: 40, face: '28s', rpx: '230px' }}
                />
                <Node
                  src="/images/about/team/t2.jpg"
                  alt={member}
                  vars={{ a: '142deg', r: 40, face: '30s', rpx: '230px' }}
                />
                <Node
                  src="/images/about/team/t3.jpg"
                  alt={member}
                  vars={{ a: '262deg', r: 40, face: '26s', rpx: '230px' }}
                />
                <Dot vars={{ a: '85deg', r: 40, rpx: '230px' }} />
                <Dot vars={{ a: '310deg', r: 40, rpx: '230px' }} />
              </div>

              <div className={styles.rot} style={{ animationDuration: '213s', animationDirection: 'reverse' }}>
                <Node
                  src="/images/about/team/t4.jpg"
                  alt={member}
                  size="sm"
                  vars={{ a: '40deg', r: 32, face: '34s', rpx: '170px' }}
                />
                <Node
                  src="/images/about/team/t5.jpg"
                  alt={member}
                  size="sm"
                  vars={{ a: '190deg', r: 32, face: '32s', rpx: '170px' }}
                />
                <Dot vars={{ a: '120deg', r: 32, rpx: '170px' }} />
              </div>

              <div className={styles.rot} style={{ animationDuration: '260s' }}>
                <Node
                  src="/images/about/team/t6.jpg"
                  alt={member}
                  size="xs"
                  vars={{ a: '110deg', r: 18, face: '38s', rpx: '120px' }}
                />
                <Node
                  src="/images/about/team/t7.jpg"
                  alt={member}
                  size="xs"
                  vars={{ a: '290deg', r: 18, face: '36s', rpx: '120px' }}
                />
                <Dot vars={{ a: '18deg', r: 18, rpx: '120px' }} />
              </div>

              <div className={styles.orbitCap}>{t('orbitCaption')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
