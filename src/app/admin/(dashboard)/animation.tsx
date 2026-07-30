'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/** True once the closest `.card` / reveal target gets `.is-visible` (first time only). */
export function useRevealVisible<T extends HTMLElement = HTMLElement>(): {
  ref: RefObject<T | null>;
  visible: boolean;
} {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const host =
      node.closest('.card, .tableContainer, .reveal-on-scroll, .reveal-bound') ||
      node;

    if (host.classList.contains('is-visible')) {
      setVisible(true);
      return;
    }

    const mo = new MutationObserver(() => {
      if (host.classList.contains('is-visible')) {
        setVisible(true);
        mo.disconnect();
      }
    });

    mo.observe(host, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  return { ref, visible };
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals,
  duration = 1400,
}: {
  value: number | string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const { ref, visible } = useRevealVisible<HTMLSpanElement>();
  const target = typeof value === 'string' ? parseFloat(value) : value;
  const precision =
    decimals ?? (Number.isInteger(target) ? 0 : 1);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible || !Number.isFinite(target)) return;

    let start: number | null = null;
    let frame = 0;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(target * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setCount(target);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, target, duration]);

  const display =
    precision === 0
      ? Math.round(count).toLocaleString()
      : count.toFixed(precision);

  return (
    <span ref={ref}>
      {prefix}
      {Number.isFinite(target) ? display : value}
      {suffix}
    </span>
  );
}

/** Mounts chart children only after the parent card is revealed (first time). */
export function ChartWhenVisible({
  children,
  height = '100%',
  className,
}: {
  children: (ready: boolean) => ReactNode;
  height?: string | number;
  className?: string;
}) {
  const { ref, visible } = useRevealVisible<HTMLDivElement>();

  return (
    <div ref={ref} className={className} style={{ width: '100%', height }}>
      {children(visible)}
    </div>
  );
}

/** Shared slower chart animation timing for Recharts. */
export const CHART_ANIMATION = {
  duration: 1800,
  begin: 120,
} as const;
