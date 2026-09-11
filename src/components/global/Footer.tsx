import Link from 'next/link';

const links = [
  {
    label: 'docs',
    href: 'https://docs.poidh.xyz',
    external: true,
  },
  {
    label: 'github',
    href: 'https://github.com/picsoritdidnthappen/poidh-app',
    external: true,
  },
  {
    label: 'x',
    href: 'https://x.com/poidhxyz',
    external: true,
  },
  {
    label: 'terms',
    href: '/terms',
    external: false,
  },
];

export default function Footer() {
  return (
    <footer className='hidden lg:flex fixed bottom-0 left-0 right-0 z-20 h-10 items-center justify-center border-t border-white/10 bg-poidhBlue dark:bg-[#132b47]'>
      <div className='flex items-center gap-5 text-xs text-white/60'>
        {links.map((link, index) => (
          <div key={link.label} className='flex items-center gap-5'>
            {link.external ? (
              <a
                href={link.href}
                target='_blank'
                rel='noopener noreferrer'
                className='hover:text-white transition-colors'
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className='hover:text-white transition-colors'
              >
                {link.label}
              </Link>
            )}

            {index < links.length - 1 && (
              <span className='text-white/25'>·</span>
            )}
          </div>
        ))}
      </div>
    </footer>
  );
}
