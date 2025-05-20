export default function TextWithLinks({ children }: { children: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = children.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target='_blank'
          rel='noopener noreferrer'
          className='underline hover:text-gray-200'
        >
          {part}
        </a>
      );
    }
    return part;
  });
}
