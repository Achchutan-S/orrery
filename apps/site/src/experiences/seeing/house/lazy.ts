// Shared by the chapters with a scene: start expensive visuals only when they are on screen and
// motion is allowed. Every scene's first paint is its static composition; this only adds to it.
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function whenVisible(el: Element, start: () => void, margin = '200px') {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
  }, { rootMargin: margin });
  io.observe(el);
}

/** Runs the callback with visibility changes, so a scene can pause when scrolled away. */
export function onVisibility(el: Element, change: (visible: boolean) => void) {
  const io = new IntersectionObserver((entries) => change(entries.some((e) => e.isIntersecting)));
  io.observe(el);
  return () => io.disconnect();
}
