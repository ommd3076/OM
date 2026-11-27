import { useEffect, useState } from 'react';

function readReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const attrReduce =
    document.documentElement.getAttribute('data-motion') === 'reduce';
  return mediaReduce || attrReduce;
}

/**
 * Tracks both OS `prefers-reduced-motion: reduce` and the app-level
 * `<html data-motion="reduce">` override managed by `Layout`.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(readReducedMotion);

  useEffect(() => {
    const update = () => setReduced(readReducedMotion());
    update();

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', update);

    const attrObserver = new MutationObserver(update);
    attrObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });

    return () => {
      mediaQuery.removeEventListener('change', update);
      attrObserver.disconnect();
    };
  }, []);

  return reduced;
}
