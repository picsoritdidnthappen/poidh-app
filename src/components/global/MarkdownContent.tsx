'use client';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className='underline hover:text-gray-200'
    >
      {children}
    </a>
  ),
  p: ({ children }) => <p className='mb-3 last:mb-0'>{children}</p>,
  h1: ({ children }) => <h1 className='text-2xl font-bold mb-3'>{children}</h1>,
  h2: ({ children }) => <h2 className='text-xl font-bold mb-2'>{children}</h2>,
  h3: ({ children }) => <h3 className='text-lg font-bold mb-2'>{children}</h3>,
  ul: ({ children }) => (
    <ul className='list-disc pl-5 mb-3 space-y-1'>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className='list-decimal pl-5 mb-3 space-y-1'>{children}</ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className='border-l-4 border-gray-400 pl-4 italic mb-3 opacity-80'>
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <pre className='bg-black/30 rounded-md p-3 mb-3 overflow-x-auto'>
          <code className='text-sm font-mono'>{children}</code>
        </pre>
      );
    }
    return (
      <code className='bg-black/30 rounded px-1 text-sm font-mono'>
        {children}
      </code>
    );
  },
  strong: ({ children }) => <strong className='font-bold'>{children}</strong>,
  em: ({ children }) => <em className='italic'>{children}</em>,
  hr: () => <hr className='border-gray-400 my-4' />,
};

export default function MarkdownContent({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={`normal-case${className ? ` ${className}` : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
