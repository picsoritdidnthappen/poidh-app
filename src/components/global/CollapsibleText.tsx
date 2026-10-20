'use client';

import { useState } from 'react';
import TextWithLinks from '@/components/global/TextWithLinks';

export default function CollapsibleText({
  text,
  maxLength = 700,
  maxHeight = 240,
  className = '',
}: {
  text: string;
  maxLength?: number;
  maxHeight?: number;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isLong = text.length > maxLength || text.split('\n').length > 12;

  return (
    <div className={className}>
      <div
        className={`whitespace-pre-wrap break-words ${
          isLong && !isExpanded ? 'overflow-hidden' : ''
        }`}
        style={isLong && !isExpanded ? { maxHeight } : undefined}
      >
        <TextWithLinks>{text}</TextWithLinks>
      </div>

      {isLong && (
        <button
          type='button'
          onClick={() => setIsExpanded((current) => !current)}
          className='mt-2 text-xs sm:text-sm font-semibold text-white/60 hover:text-white underline underline-offset-2 transition'
        >
          {isExpanded ? 'show less' : 'view more'}
        </button>
      )}
    </div>
  );
}
