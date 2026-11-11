import { useCallback, useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react';

export const BANNER_INTERVAL_MS = 7000;

export function useBannerCarousel(count: number, onIndexChange?: (index: number) => void) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [inView, setInView] = useState(true);
  const [cycle, setCycle] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const onIndexChangeRef = useRef(onIndexChange);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const playing = count > 1 && !paused && !hovered && !focused && !editing && pageVisible && inView && !reducedMotion;

  useEffect(() => { onIndexChangeRef.current = onIndexChange; }, [onIndexChange]);

  const goTo = useCallback((next: number, notify = true) => {
    const size = Math.max(count, 1);
    const nextIndex = ((next % size) + size) % size;
    setIndex(nextIndex);
    setCycle(current => current + 1);
    if (notify) onIndexChangeRef.current?.(nextIndex);
  }, [count]);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden);
    const updateEditing = () => setEditing(document.activeElement instanceof HTMLElement && document.activeElement.matches('input, select, textarea, [contenteditable="true"]'));
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(motionPreference.matches);
    document.addEventListener('visibilitychange', updateVisibility);
    document.addEventListener('focusin', updateEditing);
    document.addEventListener('focusout', updateEditing);
    motionPreference.addEventListener('change', updateMotionPreference);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
      document.removeEventListener('focusin', updateEditing);
      document.removeEventListener('focusout', updateEditing);
      motionPreference.removeEventListener('change', updateMotionPreference);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => goTo(index + 1), BANNER_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [playing, index, cycle, goTo]);

  return {
    index, paused, playing, reducedMotion, rootRef, cycle,
    goTo, previous: () => goTo(index - 1), next: () => goTo(index + 1),
    togglePaused: () => {
      setPaused(current => !current);
      setFocused(false);
      setHovered(false);
    },
    onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest('button, a')) return;
      if (event.pointerType === 'touch') pointerStart.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (!pointerStart.current) return;
      const dx = event.clientX - pointerStart.current.x;
      const dy = event.clientY - pointerStart.current.y;
      pointerStart.current = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(index + (dx < 0 ? 1 : -1));
    },
    onPointerCancel: () => { pointerStart.current = null; },
  };
}
