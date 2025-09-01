import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs({
  className = '',
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const filteredSegments = segments.filter((segment, index) => {
    if (index === 1 && segment === 'bounty') {
      return false;
    }
    return true;
  });

  const breadcrumbSegments = filteredSegments.slice(0, -1);

  const breadcrumbs = breadcrumbSegments.map((segment, index) => {
    const href =
      index === 0
        ? `/${segment}`
        : `/${segments.slice(0, index + 1).join('/')}`;
    const isLast = index === breadcrumbSegments.length - 1;

    let label = segment;
    if (index === 0 && segments[1] === 'bounty') {
      label = `${segment} bounties`;
    }

    label = label.charAt(0).toUpperCase() + label.slice(1);

    return {
      href,
      label,
      isLast,
    };
  });

  return (
    <nav
      className={`flex items-center space-x-2 text-sm text-white/80 ${className}`}
    >
      <Link href='/' className='hover:text-white'>
        poidh
      </Link>
      {breadcrumbs.map((crumb) => (
        <div key={crumb.href} className='flex items-center'>
          <ChevronRight className='h-4 w-4 text-white/80' />
          <Link
            href={crumb.href}
            className={`ml-2 hover:text-white ${
              crumb.isLast ? 'text-white' : ''
            }`}
          >
            {crumb.label}
          </Link>
        </div>
      ))}
    </nav>
  );
}
