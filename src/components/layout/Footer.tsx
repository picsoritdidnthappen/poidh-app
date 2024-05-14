import Link from 'next/link';

const Footer = () => {
  return (
    <div className='flex flex-col lg:flex-row container mx-auto lg:px-0 px-5 w-full justify-between items-center pb-5 '>
      <div className='flex flex-row gap-5'>
        <Link href='https://warpcast.com/~/channel/poidh'>
          <svg
            width='20'
            height='20'
            viewBox='0 0 20 20'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M16.1372 2.25H5.38133V4.48494H2.32324L2.96461 6.72057H3.50718V15.7644C3.23447 15.7644 3.0136 15.9923 3.0136 16.2727V16.8822H2.91481C2.64209 16.8822 2.42122 17.1101 2.42122 17.3905V18H7.94737V17.3905C7.94737 17.1097 7.7261 16.8822 7.45379 16.8822H7.35499V16.2727C7.35499 16.0267 7.18521 15.8216 6.96006 15.7746V10.7856H6.97557C7.1499 8.79168 8.77761 7.22909 10.7593 7.22909C12.741 7.22909 14.3687 8.79168 14.543 10.7856H14.5585V15.7644H14.4616C14.1889 15.7644 13.968 15.9923 13.968 16.2727V16.8822H13.8692C13.5965 16.8822 13.3756 17.1101 13.3756 17.3905V18H18.9018V17.3905C18.9018 17.1097 18.6805 16.8822 18.4082 16.8822H18.3094V16.2727C18.3094 15.9918 18.0881 15.7644 17.8158 15.7644V6.72057H18.3584L18.9998 4.48494H16.1372V2.25Z'
              fill='white'
            />
          </svg>
        </Link>

        <Link href='https://twitter.com/poidhxyz '>
          <svg
            width='20'
            height='20'
            viewBox='0 0 20 20'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M15.2033 1.875H17.9599L11.9374 8.75833L19.0224 18.125H13.4749L9.12992 12.4442L4.15826 18.125H1.39992L7.84159 10.7625L1.04492 1.875H6.73326L10.6608 7.0675L15.2033 1.875ZM14.2358 16.475H15.7633L5.90326 3.43833H4.26409L14.2358 16.475Z'
              fill='white'
            />
          </svg>
        </Link>
      </div>
      <div className='flex flex-row gap-2 text-[10px] lg:text-md'>
        <Link href='/terms'>terms</Link>
        <span>|</span>
        <Link href='https://github.com/picsoritdidnthappen/poidh-app'>
          github
        </Link>
      </div>
    </div>
  );
};

export default Footer;
