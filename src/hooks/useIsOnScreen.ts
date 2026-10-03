import { RefObject, useEffect, useState } from 'react';

// Whether the element is in the viewport and its tab is in the foreground.
export function useIsOnScreen(ref: RefObject<HTMLElement>) {
  const [isInView, setIsInView] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) =>
      setIsInView(entry.isIntersecting)
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const update = () =>
      setIsTabVisible(document.visibilityState === 'visible');

    update();
    document.addEventListener('visibilitychange', update);

    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return isInView && isTabVisible;
}
