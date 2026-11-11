import { getLinkRel, inspectLink } from '@/utils/linkSafety';

export default function TextWithLinks({
  children,
}: {
  children: string;
}) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = children.split(urlRegex);

  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      const info = inspectLink(part);

      if (!info) {
        return <span key={index}>{part}</span>;
      }

      return (
        <a
          key={index}
          href={info.destination}
          target='_blank'
          rel={getLinkRel(info.destination, true)}
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
