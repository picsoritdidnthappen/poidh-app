import Link from 'next/link';

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

const footerSections: FooterSection[] = [
  {
    title: 'product',
    links: [
      { label: 'bounties', href: '/' },
      { label: 'explore', href: '/explore' },
    ],
  },
  {
    title: 'learn',
    links: [
      {
        label: 'docs',
        href: 'https://docs.poidh.xyz',
        external: true,
      },
      {
        label: 'blog',
        href: 'https://words.poidh.xyz',
        external: true,
      },
    ],
  },
  {
    title: 'developers',
    links: [
      {
        label: 'github',
        href: 'https://github.com/picsoritdidnthappen/poidh-app',
        external: true,
      },
      {
        label: 'contracts',
        href: 'https://github.com/picsoritdidnthappen/poidh-contracts',
        external: true,
      },
    ],
  },
  {
    title: 'community',
    links: [
      {
        label: 'farcaster',
        href: 'https://farcaster.xyz/~/channel/poidh',
        external: true,
      },
      {
        label: 'x',
        href: 'https://x.com/poidhxyz',
        external: true,
      },
      {
        label: 'instagram',
        href: 'https://www.instagram.com/poidhxyz/',
        external: true,
      },
      {
        label: 'tiktok',
        href: 'https://www.tiktok.com/@poidhxyz',
        external: true,
      },
    ],
  },
  {
    title: 'legal',
    links: [
      { label: 'terms', href: '/terms' },
      { label: 'privacy', href: '/privacy' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className='border-t border-white/10 mt-24'>
      <div className='px-5 lg:px-20 py-12 lg:py-16'>
        <div className='grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5'>
          {footerSections.map((section) => (
            <div key={section.title}>
              <div className='text-sm font-semibold mb-4'>
                {section.title}
              </div>

              <div className='flex flex-col gap-3 text-sm text-white/60'>
                {section.links.map((link) =>
                  link.external ? (
                    <a
                      key={link.label}
                      href={link.href}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='w-fit hover:text-white transition-colors'
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      className='w-fit hover:text-white transition-colors'
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        <div className='mt-12 pt-6 border-t border-white/10 text-sm text-white/40'>
          poidh, inc. · pics or it didn&apos;t happen
        </div>
      </div>
    </footer>
  );
}
