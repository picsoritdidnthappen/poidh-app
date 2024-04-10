import Link from 'next/link';

const Footer = () => {
  return (
    <div className='flex flex-col lg:flex-row container mx-auto lg:px-0 px-5 w-full justify-between items-center pb-5 '>
      <div>Socials</div>
      <div className='flex flex-row gap-2 text-[10px] lg:text-md'>
        <Link href="/">terms</Link>
        <span>|</span>
        <Link href="/" >security</Link>
        <span>|</span>
        <Link href="/" >github</Link>
        <span>|</span>
        <Link href="/" >dune analytics</Link>
      </div>
    </div>
  );
};

export default Footer;