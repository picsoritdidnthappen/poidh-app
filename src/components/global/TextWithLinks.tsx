import React from 'react';

const urlRegex = /(https?:\/\/[^\s]+)/g;
const tokenRegex = /(https?:\/\/[^\s]+|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g;

function renderInlineMarkdown(text: string, keyPrefix: string) {
  return text.split(tokenRegex).map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.match(urlRegex)) {
      return (
        <a
          key={key}
          href={part}
          target='_blank'
          rel='noopener noreferrer'
          className='underline hover:text-gray-200'
        >
          {part}
        </a>
      );
    }

    if (
      (part.startsWith('**') && part.endsWith('**')) ||
      (part.startsWith('__') && part.endsWith('__'))
    ) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={key} className='rounded bg-white/10 px-1 py-0.5'>
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

export default function TextWithLinks({ children }: { children: string }) {
  return children.split(/\n/).flatMap((line, lineIndex, lines) => {
    const renderedLine: React.ReactNode[] = [];
    const trimmed = line.trimStart();
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const content = isBullet ? trimmed.slice(2) : line;

    if (isBullet) {
      renderedLine.push(
        <React.Fragment key={`bullet-${lineIndex}`}>
          <span aria-hidden='true'>• </span>
          {renderInlineMarkdown(content, `line-${lineIndex}`)}
        </React.Fragment>
      );
    } else {
      renderedLine.push(
        <React.Fragment key={`line-${lineIndex}`}>
          {renderInlineMarkdown(content, `line-${lineIndex}`)}
        </React.Fragment>
      );
    }

    if (lineIndex < lines.length - 1) {
      renderedLine.push(<br key={`br-${lineIndex}`} />);
    }

    return renderedLine;
  });
}
