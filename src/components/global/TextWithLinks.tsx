import { getLinkRel } from '@/utils/linkSafety';

export default function TextWithLinks({
  children,
}: {
  children: string;
}) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = children.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(/^https?:\/\//)) {
      return (
        <a
          key={index}
          href={part}
          target='_blank'
          rel={getLinkRel(part, true)}
          data-poidh-ugc-link
          className='underline hover:text-gray-200'
        >
          {part}
        </a>
      );
    }

    return part;
  });
}
