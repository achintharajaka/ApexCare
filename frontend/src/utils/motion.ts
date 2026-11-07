import gsap from 'gsap';

/**
 * Checks if the user or device prefers reduced motion.
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Staggered entrance animation for dashboard cards, lists, or metrics.
 * Runs only if reduced motion is not enabled.
 */
export const animateStaggerCards = (
  container: HTMLElement | string,
  selector: string,
  stagger: number = 0.06
) => {
  if (prefersReducedMotion()) return null;

  return gsap.fromTo(
    typeof container === 'string' ? `${container} ${selector}` : container.querySelectorAll(selector),
    {
      opacity: 0,
      y: 12,
      scale: 0.99,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.35,
      ease: 'power2.out',
      stagger,
      clearProps: 'all',
    }
  );
};

/**
 * Smooth tween for numeric counters in KPI cards.
 * Animates numbers up from previous or zero with tabular figures.
 */
export const animateCounter = (
  element: HTMLElement | null,
  targetValue: number,
  prefix: string = '',
  suffix: string = '',
  decimals: number = 0,
  duration: number = 0.6
) => {
  if (!element) return null;
  if (prefersReducedMotion()) {
    element.textContent = `${prefix}${targetValue.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
    return null;
  }

  const obj = { val: 0 };
  return gsap.to(obj, {
    val: targetValue,
    duration,
    ease: 'power1.out',
    onUpdate: () => {
      element.textContent = `${prefix}${obj.val.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
    },
  });
};

/**
 * Page entrance animation for newly mounted route or tab view.
 */
export const animatePageEnter = (element: HTMLElement | null) => {
  if (!element || prefersReducedMotion()) return null;

  return gsap.fromTo(
    element,
    {
      opacity: 0,
      y: 8,
    },
    {
      opacity: 1,
      y: 0,
      duration: 0.28,
      ease: 'power2.out',
      clearProps: 'transform,opacity',
    }
  );
};

