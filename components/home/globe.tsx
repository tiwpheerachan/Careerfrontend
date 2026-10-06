'use client';

import { Html, OrbitControls, useTexture } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { flagOf } from '@/lib/countries';
import { cx } from '@/lib/cx';
import type { Office } from './offices-data';
import { useReducedMotion } from './use-reduced-motion';

/**
 * The offices globe (React Three Fiber). Loaded only on the client and only on
 * the home page (next/dynamic, ssr: false, from offices.tsx).
 *
 * It renders frames only while it is on screen; with prefers-reduced-motion it
 * neither drifts nor follows the mouse, and renders only until it has turned
 * to the chosen office.
 */

const RADIUS = 0.85;
const EARTH_DAY = '/images/offices/globe/earth_day.jpg';
const EARTH_NIGHT = '/images/offices/globe/earth_night.jpg';

function latLngToVec3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** Keeps a texture / WebGL failure from blanking the page. */
class R3FErrorBoundary extends Component<
  { fallback?: ReactNode; onError?: () => void; children?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    console.error('Globe render error:', err);
    this.props.onError?.();
  }

  render() {
    return this.state.hasError ? (this.props.fallback ?? null) : (this.props.children ?? null);
  }
}

/** Tells the DOM side the textures have loaded (it mounts only once Suspense resolves). */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

/** Pin: stem, glowing head, and a pulse ring on the active one; its flag label is a DOM button. */
function GlobePin({
  office,
  label,
  active,
  reducedMotion,
  onSelect,
}: {
  office: Office;
  label: string;
  active: boolean;
  reducedMotion: boolean;
  onSelect: (code: string) => void;
}) {
  const pos = useMemo(() => latLngToVec3(office.lat, office.lng, RADIUS * 1.02), [office.lat, office.lng]);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const headRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current && ringMatRef.current) {
      if (!active) {
        ringRef.current.scale.setScalar(0.0001);
        ringMatRef.current.opacity = 0;
      } else {
        const p = reducedMotion ? 0.5 : (Math.sin(t * 3.2) + 1) * 0.5;
        ringRef.current.scale.setScalar(1.0 + p * 0.9);
        ringMatRef.current.opacity = 0.26 - p * 0.11;
      }
    }
    if (headRef.current) {
      headRef.current.scale.setScalar(active && !reducedMotion ? 1.0 + Math.sin(t * 6) * 0.01 : 1.0);
    }
  });

  const select = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelect(office.code);
  };
  const color = active ? '#10b981' : '#ffffff';

  return (
    <group position={pos.toArray()}>
      {/* stem */}
      <mesh onClick={select}>
        <cylinderGeometry args={[0.0055, 0.0055, 0.11, 10]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={active ? 0.95 : 0.62}
          emissive={color}
          emissiveIntensity={active ? 0.55 : 0.08}
        />
      </mesh>

      {/* head */}
      <mesh ref={headRef} position={[0, 0.065, 0]} onClick={select}>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.9 : 0.12}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>

      {/* pulse ring (active only) */}
      <mesh ref={ringRef} position={[0, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={999}>
        <ringGeometry args={[0.028, 0.05, 40]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color="#34d399"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* label */}
      <Html distanceFactor={6} position={[0.052, 0.12, 0]}>
        <button
          type="button"
          onClick={() => onSelect(office.code)}
          aria-label={label}
          className={cx(
            'pointer-events-auto select-none',
            'transition active:scale-[0.98]',
            active
              ? cx(
                  'inline-flex items-center gap-1.5 whitespace-nowrap',
                  'rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm md:text-[11px]',
                  'shadow-[0_10px_26px_rgba(0,0,0,0.18)]',
                  'ring-2 ring-emerald-300/55',
                )
              : cx(
                  'hidden items-center justify-center sm:inline-flex',
                  'h-6 w-6 rounded-full text-[11px] text-white/90 backdrop-blur-sm',
                  'shadow-[0_10px_20px_rgba(0,0,0,0.12)]',
                ),
          )}
        >
          <span>{flagOf(office.code)}</span>
          {active ? <span className="max-w-[120px] truncate">{label}</span> : null}
        </button>
      </Html>
    </group>
  );
}

function GlobeScene({
  offices,
  labels,
  activeCode,
  reducedMotion,
  onSelect,
}: {
  offices: Office[];
  labels: Record<string, string>;
  activeCode: string;
  reducedMotion: boolean;
  onSelect: (code: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  const [earthDay, earthNight] = useTexture([EARTH_DAY, EARTH_NIGHT], ([day]) => {
    if (!day) return;
    day.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = 8;
    day.wrapS = THREE.ClampToEdgeWrapping;
    day.wrapT = THREE.ClampToEdgeWrapping;
  });

  // Where the mouse is in the window, -1..1 — tilts the globe a little.
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: MouseEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [reducedMotion]);

  // Turn the active office to the front, slightly tilted.
  const targetQuat = useRef(new THREE.Quaternion());
  useEffect(() => {
    const office = offices.find((o) => o.code === activeCode);
    if (!office) return;
    const pin = latLngToVec3(office.lat, office.lng, 1.0).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(pin, new THREE.Vector3(0, 0, 1));
    q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, 0)));
    targetQuat.current.copy(q);
    invalidate();
  }, [activeCode, offices, invalidate]);

  const scratch = useMemo(
    () => ({
      euler: new THREE.Euler(),
      pointerQ: new THREE.Quaternion(),
      spinQ: new THREE.Quaternion(),
      composed: new THREE.Quaternion(),
      yAxis: new THREE.Vector3(0, 1, 0),
    }),
    [],
  );

  useFrame((_, rawDt) => {
    const g = groupRef.current;
    if (!g) return;
    // A long pause (off screen) must not turn into one big jump.
    const dt = Math.min(rawDt, 0.1);
    const { euler, pointerQ, spinQ, composed, yAxis } = scratch;

    composed.copy(targetQuat.current);
    if (!reducedMotion) {
      const tx = clamp(pointer.current.y * 0.12, -0.12, 0.12);
      const ty = clamp(pointer.current.x * 0.14, -0.14, 0.14);
      pointerQ.setFromEuler(euler.set(tx, ty, 0));
      spinQ.setFromAxisAngle(yAxis, dt * 0.055);
      composed.multiply(pointerQ).multiply(spinQ);
    }

    g.quaternion.slerp(composed, 1 - Math.exp(-dt * 3.8));
    // On demand (reduced motion): keep rendering until the turn has finished.
    if (g.quaternion.angleTo(composed) > 0.0005) invalidate();
  });

  return (
    <>
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#bfe6ff', '#0b1020', 0.65]} />
      <directionalLight position={[3, 2, 2]} intensity={1.25} />
      <directionalLight position={[-3, -1, -2]} intensity={0.45} />
      <directionalLight position={[0.5, 0.2, -4]} intensity={0.75} />

      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[RADIUS, 64, 64]} />
          <meshStandardMaterial
            map={earthDay}
            emissive="#ffffff"
            emissiveMap={earthNight}
            emissiveIntensity={0.9}
            roughness={0.95}
            metalness={0.0}
          />
        </mesh>

        <mesh>
          <sphereGeometry args={[RADIUS * 1.045, 64, 64]} />
          <meshStandardMaterial color="#9ddcff" transparent opacity={0.1} emissive="#7bd3ff" emissiveIntensity={0.24} />
        </mesh>

        {offices.map((o) => (
          <GlobePin
            key={o.code}
            office={o}
            label={labels[o.code] ?? o.code}
            active={o.code === activeCode}
            reducedMotion={reducedMotion}
            onSelect={onSelect}
          />
        ))}
      </group>

      <OrbitControls enablePan={false} enableZoom={false} rotateSpeed={0.6} />
    </>
  );
}

export interface GlobeProps {
  offices: Office[];
  labels: Record<string, string>;
  activeCode: string;
  onSelect: (code: string) => void;
  loadingLabel: string;
  /** Shown instead of the globe when WebGL or the textures fail. */
  errorFallback: ReactNode;
}

export default function Globe({ offices, labels, activeCode, onSelect, loadingLabel, errorFallback }: GlobeProps) {
  const reducedMotion = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const onReady = useCallback(() => setStatus('ready'), []);
  const onError = useCallback(() => setStatus('error'), []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setOnScreen(entries.some((e) => e.isIntersecting)), {
      rootMargin: '100px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The loading pill and the error card are plain DOM over the canvas (an
  // <Html> Suspense fallback inside the canvas unmounts its own React root
  // mid-render, which React warns about).
  return (
    <div ref={boxRef} className="relative h-full w-full">
      <R3FErrorBoundary onError={onError}>
        <Canvas
          camera={{ position: [0, 0, 3.05], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          frameloop={!onScreen ? 'never' : reducedMotion ? 'demand' : 'always'}
        >
          <R3FErrorBoundary onError={onError}>
            <Suspense fallback={null}>
              <GlobeScene
                offices={offices}
                labels={labels}
                activeCode={activeCode}
                reducedMotion={reducedMotion}
                onSelect={onSelect}
              />
              <Ready onReady={onReady} />
            </Suspense>
          </R3FErrorBoundary>
        </Canvas>
      </R3FErrorBoundary>

      {status === 'loading' ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-white/30 bg-black/35 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm">
            {loadingLabel}
          </div>
        </div>
      ) : status === 'error' ? (
        <div className="absolute inset-0">{errorFallback}</div>
      ) : null}
    </div>
  );
}
