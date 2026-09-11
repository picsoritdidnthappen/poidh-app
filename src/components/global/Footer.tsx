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

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className =
    'hover:text-white transition-colors whitespace-nowrap';

  if (link.external) {
    return (
      <a
        href={link.href}
        target='_blank'
        rel='noopener noreferrer'
        className={className}
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export default function Footer() {
  return (
    <>
      {/* Mobile footer */}
      <footer className='lg:hidden border-t border-white/10 mt-16'>
        <div className='px-5 py-10'>
          <div className='grid grid-cols-2 gap-x-8 gap-y-8'>
            {footerSections.map((section) => (
              <div key={section.title}>
                <div className='text-sm font-semibold mb-3'>
                  {section.title}
                </div>

                <div className='flex flex-col gap-2.5 text-sm text-white/60'>
                  {section.links.map((link) => (
                    <FooterLinkItem key={link.label} link={link} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className='mt-10 pt-5 border-t border-white/10 text-xs text-white/40'>
            poidh, inc. · pics or it didn&apos;t happen
          </div>
        </div>
      </footer>

      {/* Desktop footer */}
      <footer className='hidden lg:flex fixed bottom-0 left-0 right-0 z-40 h-14 items-center border-t border-white/10 bg-blue-300 px-8'>
        <div className='flex w-full items-center justify-between gap-8'>
          <div className='flex items-center gap-7 text-xs text-white/60'>
            {footerSections.flatMap((section) =>
              section.links.map((link) => (
                <FooterLinkItem
                  key={`${section.title}-${link.label}`}
                  link={link}
                />
              ))
            )}
          </div>

          <div className='shrink-0 text-xs text-white/40'>
            poidh, inc. · pics or it didn&apos;t happen
          </div>
        </div>
      </footer>
    </>
  );
}
