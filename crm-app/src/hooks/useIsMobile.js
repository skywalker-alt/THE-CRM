import { useState, useEffect } from 'react';

/**
 * useIsMobile
 * Returns true when the window width is below the given breakpoint (default: 768px = Tailwind's "md").
 * Use this to CONDITIONALLY PREVENT heavy desktop-only components from mounting on mobile,
 * not just visually hiding them (which still wastes render budget).
 *
 * Usage:
 *   const isMobile = useIsMobile();
 *   if (isMobile) return null; // or return a simplified mobile fallback
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    // SSR-safe: default to false on the server
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);

    const observer = new ResizeObserver(check);
    observer.observe(document.documentElement);

    return () => observer.disconnect();
  }, [breakpoint]);

  return isMobile;
}
