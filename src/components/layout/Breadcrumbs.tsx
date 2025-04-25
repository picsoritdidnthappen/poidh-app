'use client';

import '@/styles/globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Breadcrumbs = () => {
  const pathname = usePathname();

  // Split the pathname into segments and filter out empty strings
  const pathSegments = pathname.split('/').filter((segment) => segment);

  return (
    <nav className="text-sm text-gray-500 mt-2">
      <ul className="flex space-x-2">
        <li>
          <Link href="/" className="hover:underline text-white-500">
            Home
          </Link>
        </li>
        {pathSegments.map((segment, index) => {
          const href = '/' + pathSegments.slice(0, index + 1).join('/');
          const isLast = index === pathSegments.length - 1;

          return (
            <li key={href} className="flex items-center">
              <span className="mx-1">{'>'}</span>
              {isLast ? (
                <span className="text-gray-900">{decodeURIComponent(segment)}</span>
              ) : (
                <Link href={href} className="hover:underline text-white-500">
                  {decodeURIComponent(segment)}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Breadcrumbs;
