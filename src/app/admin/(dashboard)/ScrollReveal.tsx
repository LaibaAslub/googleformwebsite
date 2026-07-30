'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SELECTOR = '.card, .tableContainer, .pageHeader, .reveal-on-scroll';

function isInsideOverlay(el: Element) {
  if (el.closest('[data-no-scroll-reveal], [role="dialog"], .notificationDropdown')) {
    return true;
  }

  let node: HTMLElement | null = el as HTMLElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    if (style.position === 'fixed') return true;
    node = node.parentElement;
  }
  return false;
}

function collectTargets(root: ParentNode) {
  return Array.from(root.querySelectorAll(SELECTOR)).filter(
    (el) => !isInsideOverlay(el) && !el.classList.contains('reveal-bound')
  );
}

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.querySelector('.pageContainer');
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add('is-visible');
          observer.unobserve(el);
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.05,
      }
    );

    const bindTargets = () => {
      collectTargets(root).forEach((el, index) => {
        el.classList.add('reveal-bound');
        const delayMs = Math.min(index % 6, 5) * 60;
        el.setAttribute('data-reveal-delay', String(delayMs));
        observer.observe(el);
      });
    };

    let timeoutId: NodeJS.Timeout;
    const scheduleBind = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        requestAnimationFrame(bindTargets);
      }, 150);
    };

    scheduleBind();

    const mutationObserver = new MutationObserver(() => {
      scheduleBind();
    });

    mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      clearTimeout(timeoutId);
      
      // Cleanup DOM modifications to prevent Next.js hydration errors during HMR or navigation
      document.querySelectorAll('.reveal-bound').forEach((el) => {
        el.classList.remove('reveal-bound', 'is-visible');
        el.removeAttribute('data-reveal-delay');
      });
    };
  }, [pathname]);

  return null;
}
