'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Animates its width when the content changes, so the parent doesn't jump.
// The content stays on one line.
export default function SmoothWidth({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const contentRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      setWidth(Math.ceil(content.getBoundingClientRect().width));
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      className={`overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none ${className}`}
      style={{ width }}
    >
      <span ref={contentRef} className='inline-block whitespace-nowrap'>
        {children}
      </span>
    </span>
  );
}
