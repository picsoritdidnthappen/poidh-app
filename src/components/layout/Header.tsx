'use client';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { getNetworkNameFromPath } from '@/lib';
import { Banner, Menu } from '@/components/global';
import { Footer } from '@/components/layout';
import { Logo } from '@/components/ui';


const ConnectWallet = dynamic(() => import('@/components/web3/ConnectWallet'), {
  ssr: false,
});

const Header = () => {
  const router = useRouter();

  const {
    isAuthenticated,
    primaryWallet,
    network,
    networkConfigurations,
    walletConnector,
  } = useDynamicContext();
  const [currentNetwork, setCurrentNetwork] = useState(network);
  const [currentNetworkName, setCurrentNetworkName] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isShowDynamic, setIsShowDynamic] = useState(true);
  const [isChanged, setIsChanged] = useState(false);
  const [activeButton, setActiveButton] = useState('arbitrum');

  const handleClickChain = (chain: string) => {
    setActiveButton(chain);
    router.push(`/${chain}`);
  };

  const handleOpenMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleOpenDynamic = () => {
    setIsShowDynamic(!isShowDynamic);
  };

  const path = usePathname();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const networkName = getNetworkNameFromPath(path);
    setCurrentNetworkName(networkName);
    setActiveButton(networkName);
    chainStatusStore.setCurrentChainFromNetwork(networkName);
  }, [path]);

  useEffect(() => {
    if (isClient && network && networkConfigurations) {
      const currentUrl = path;
      const urls = currentUrl.split('/').filter((word) => word.length > 0);
      const currentUrlFirst = path.split('/')[1];
      const firstWord = urls.length > 0 ? urls[0] : '';
      const currentUrlNetwork = networkConfigurations['evm']?.find((net) =>
        net.name.toLowerCase().match(currentUrlFirst)
      );

      if (
        currentUrlFirst ===
          currentUrlNetwork?.name.split(' ')[0].toLowerCase() &&
        !isChanged
      ) {
        setIsChanged(true);
        walletConnector?.switchNetwork({
          networkChainId: currentUrlNetwork?.chainId,
        });
      } else if (currentNetwork !== network) {
        setIsChanged(true);

        const networkname = networkConfigurations['evm']?.find(
          (net) => net.chainId === network
        );
        let networkNameToSet = networkname?.name?.toLowerCase();

        if (networkNameToSet === 'degen chain') {
          networkNameToSet = 'degen';
        }

        if (networkNameToSet && firstWord !== networkNameToSet) {
          setCurrentNetwork(network);
          setCurrentNetworkName(networkNameToSet);
          const currentUrl = new URL(window.location.href);
          const pathnameParts = currentUrl.pathname.split('/').filter(Boolean);
          pathnameParts[0] = networkNameToSet;
          const newPathname = `/${pathnameParts.join('/')}`;

          router.push(newPathname);
        }
      }
    }
  }, [
    isClient,
    network,
    networkConfigurations,
    path,
    walletConnector,
    isChanged,
    currentNetwork,
  ]);

  return (
    <>
      <Banner networkName={currentNetworkName} />
      <div className='px-5 lg:px-20 pt-12 pb-2 border-b border-white flex justify-between items-center'>
        <Link href={`/${currentNetworkName}`}>
          <Logo />
        </Link>
        <div className='hidden lg:block'>
          <Menu />
        </div>
        <div className='flex flex-col'>
          <div className='flex flex-row relative items-center gap-x-5'>
            {isClient && isAuthenticated ? (
              <Link
                className='hidden lg:block'
                href={`/${currentNetworkName}/account/${primaryWallet?.address}`}
              >
                my bounties
              </Link>
            ) : null}
            <div className='hidden lg:block'>
              {isClient ? (
                <ConnectWallet
                  isClient={isClient}
                  network={currentNetworkName}
                />
              ) : null}
            </div>
            <div
              onClick={handleOpenDynamic}
              className='p-2 w-[40px] h-[40px] wallet border-[#D1ECFF] border rounded-full backdrop-blur-sm bg-white/30 lg:hidden'
            >
              <svg
                className='w-full'
                viewBox='-0.5 0 25 25'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M18 2.91992V10.9199'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M21.2008 7.71997L18.0008 10.92L14.8008 7.71997'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M10.58 3.96997H6C4.93913 3.96997 3.92178 4.39146 3.17163 5.1416C2.42149 5.89175 2 6.9091 2 7.96997V17.97C2 19.0308 2.42149 20.0482 3.17163 20.7983C3.92178 21.5485 4.93913 21.97 6 21.97H18C19.0609 21.97 20.0783 21.5485 20.8284 20.7983C21.5786 20.0482 22 19.0308 22 17.97V13.8999'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M2 9.96997H5.37006C6.16571 9.96997 6.92872 10.286 7.49133 10.8486C8.05394 11.4112 8.37006 12.1743 8.37006 12.97C8.37006 13.7656 8.05394 14.5287 7.49133 15.0913C6.92872 15.6539 6.16571 15.97 5.37006 15.97H2'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </div>
            <button onClick={handleOpenMenu} className='block lg:hidden'>
              <svg
                width='30'
                height='22'
                viewBox='0 0 30 22'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M0 11C0 10.1716 0.671573 9.5 1.5 9.5H28.5C29.3284 9.5 30 10.1716 30 11C30 11.8284 29.3284 12.5 28.5 12.5H1.5C0.671573 12.5 0 11.8284 0 11Z'
                  fill='white'
                />
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M0 2C0 1.17157 0.671573 0.5 1.5 0.5H28.5C29.3284 0.5 30 1.17157 30 2C30 2.82843 29.3284 3.5 28.5 3.5H1.5C0.671573 3.5 0 2.82843 0 2Z'
                  fill='white'
                />
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M9 20C9 19.1716 9.67157 18.5 10.5 18.5H28.5C29.3284 18.5 30 19.1716 30 20C30 20.8284 29.3284 21.5 28.5 21.5H10.5C9.67157 21.5 9 20.8284 9 20Z'
                  fill='white'
                />
              </svg>
            </button>
            <div
              className={`${
                isOpen ? 'translate-y-[0%]' : 'translate-y-[-100%]'
              } fixed h-screen w-screen bg-[#F15E5F] text-white left-0 top-0 flex flex-col justify-between duration-300 transition-all z-[40]`}
            >
              <button
                onClick={handleOpenMenu}
                className='absolute right-5 top-5'
              >
                close
              </button>
              <div></div>
              <div className='flex flex-col items-center justify-center'>
                <Menu />
                {!isAuthenticated && path !== '/' ? (
                  <div className='px-5  lg:px-20 flex  justify-center'>
                    <div className='flex   top-0 mt-5 flex-row gap-2'>
                      <button
                        className={`${
                          activeButton === 'arbitrum' ? 'active' : ''
                        }  border-[#D1ECFF]  arbitrum border rounded-full backdrop-blur-sm bg-white/30 w-[40px] h-[40px] p-2  `}
                        onClick={() => {
                          handleClickChain('arbitrum');
                          handleOpenMenu();
                        }}
                      >
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          version='1.1'
                          id='Layer_1'
                          x='0px'
                          y='0px'
                          viewBox='0 0 2500 2500'
                          xmlSpace='preserve'
                        >
                          <style type='text/css'>
                            {`
      .st0 { fill: none; }
      .st1 { fill: #213147; }
      .st2 { fill: #12AAFF; }
      .st3 { fill: #9DCCED; }
      .st4 { fill: #FFFFFF; }
    `}
                          </style>
                          <g id='Layer_x0020_1'>
                            <g id='_2405588477232'>
                              <rect
                                className='st0'
                                width='2500'
                                height='2500'
                              ></rect>
                              <g>
                                <g>
                                  <path
                                    className='st1'
                                    d='M226,760v980c0,63,33,120,88,152l849,490c54,31,121,31,175,0l849-490c54-31,88-89,88-152V760 c0-63-33-120-88-152l-849-490c-54-31-121-31-175,0L314,608c-54,31-87,89-87,152H226z'
                                  ></path>
                                  <g>
                                    <g>
                                      <g>
                                        <path
                                          className='st2'
                                          d='M1435,1440l-121,332c-3,9-3,19,0,29l208,571l241-139l-289-793C1467,1422,1442,1422,1435,1440z'
                                        ></path>
                                      </g>
                                      <g>
                                        <path
                                          className='st2'
                                          d='M1678,882c-7-18-32-18-39,0l-121,332c-3,9-3,19,0,29l341,935l241-139L1678,883V882z'
                                        ></path>
                                      </g>
                                    </g>
                                  </g>
                                  <g>
                                    <path
                                      className='st3'
                                      d='M1250,155c6,0,12,2,17,5l918,530c11,6,17,18,17,30v1060c0,12-7,24-17,30l-918,530c-5,3-11,5-17,5 s-12-2-17-5l-918-530c-11-6-17-18-17-30V719c0-12,7-24,17-30l918-530c5-3,11-5,17-5l0,0V155z M1250,0c-33,0-65,8-95,25L237,555 c-59,34-95,96-95,164v1060c0,68,36,130,95,164l918,530c29,17,62,25,95,25s65-8,95-25l918-530c59-34,95-96,95-164V719 c0-68-36-130-95-164L1344,25c-29-17-62-25-95-25l0,0H1250z'
                                    ></path>
                                  </g>
                                  <polygon
                                    className='st1'
                                    points='642,2179 727,1947 897,2088 738,2234'
                                  ></polygon>
                                  <g>
                                    <path
                                      className='st4'
                                      d='M1172,644H939c-17,0-33,11-39,27L401,2039l241,139l550-1507c5-14-5-28-19-28L1172,644z'
                                    ></path>
                                    <path
                                      className='st4'
                                      d='M1580,644h-233c-17,0-33,11-39,27L738,2233l241,139l620-1701c5-14-5-28-19-28V644z'
                                    ></path>
                                  </g>
                                </g>
                              </g>
                            </g>
                          </g>
                        </svg>
                      </button>
                      <button
                        className={`${
                          activeButton === 'base' ? 'active' : ''
                        } border-[#D1ECFF]  base border rounded-full backdrop-blur-sm bg-white/30 w-[40px] h-[40px] p-2  `}
                        onClick={() => {
                          handleClickChain('base');
                          handleOpenMenu();
                        }}
                      >
                        <svg
                          width='100%'
                          height='100%'
                          viewBox='0 0 111 111'
                          fill='none'
                          xmlns='http://www.w3.org/2000/svg'
                        >
                          <path
                            d='M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H3.9565e-07C2.35281 87.8625 26.0432 110.034 54.921 110.034Z'
                            fill='#0052FF'
                          />
                        </svg>
                      </button>
                      <button
                        className={`${
                          activeButton === 'degen' ? 'active' : ''
                        } border-[#D1ECFF]  degen border rounded-full backdrop-blur-sm bg-white/30 w-[40px] h-[40px] p-2  `}
                        onClick={() => {
                          handleClickChain('degen');
                          handleOpenMenu();
                        }}
                      >
                        <svg
                          width='100%'
                          height='100%'
                          viewBox='0 0 789 668'
                          fill='none'
                          xmlns='http://www.w3.org/2000/svg'
                        >
                          <path
                            fillRule='evenodd'
                            clipRule='evenodd'
                            d='M115.185 411.477L118.367 469.444C118.575 473.392 120.055 477.107 122.552 480.15C140.007 501.282 218.264 575.014 394.616 575.014C570.968 575.014 648.278 502.234 666.38 480.544C669.108 477.27 670.68 473.206 670.934 468.933L674.089 411.517C695.084 399.997 716.758 386.98 716.758 386.98C750.835 368.518 788.866 395.038 788.935 433.936C789.051 496.87 739.877 561.545 673.548 602.301C598.758 648.258 487.117 667.324 394.664 667.324C302.211 667.324 190.57 648.258 115.78 602.301C49.4513 561.545 0.277187 496.893 0.392781 433.936C0.462138 395.038 38.4929 368.518 72.5702 386.98C72.5702 386.98 94.207 399.965 115.185 411.477Z'
                            fill='#A36EFD'
                          />
                          <path
                            fillRule='evenodd'
                            clipRule='evenodd'
                            d='M394.641 0.113525C538.834 0.113525 577.929 3.48079 636.558 10.2154H636.535C663.561 13.3272 685.224 33.438 683.212 60.6782L661.616 354.872C654.858 356.83 647.488 359.303 639.223 362.077C595.905 376.615 527.997 399.404 394.64 399.404C261.283 399.404 193.376 376.615 150.057 362.077C141.784 359.3 134.407 356.825 127.643 354.866L106.047 60.6782C104.059 33.438 125.652 12.8395 152.724 10.2154C210.637 4.59548 270.932 0.113525 394.641 0.113525ZM137.991 495.835L138.067 496.869L139.557 497.212C139.024 496.748 138.502 496.289 137.991 495.835ZM649.85 497.178L651.193 496.869L651.262 495.928C650.8 496.341 650.329 496.757 649.85 497.178Z'
                            fill='#A36EFD'
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className=''>
                <Footer />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`${
          !isShowDynamic ? 'hidden' : ''
        } py-2 lg:hidden border-b border-white flex justify-end px-5`}
      >
        <ConnectWallet isClient={isClient} network={currentNetworkName} />
      </div>
      {isClient && isAuthenticated ? (
        <div className='py-2 border-b border-white flex justify-end px-5 lg:hidden'>
          <Link
            href={`/${currentNetworkName}/account/${primaryWallet?.address}`}
          >
            my bounties
          </Link>
        </div>
      ) : null}
      {!isAuthenticated && path !== '/' ? (
        <div className='px-5 relative lg:px-20 flex justify-end'>
          <div className='hidden lg:flex absolute chainButtons top-0 mt-5 flex-row gap-2'>
            <button
              className={`${
                activeButton === 'arbitrum' ? 'active' : ''
              }  border-[#D1ECFF] chainButton arbitrum border rounded-full backdrop-blur-sm bg-white/30 w-[40px] h-[40px] p-2  `}
              onClick={() => handleClickChain('arbitrum')}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                version='1.1'
                id='Layer_1'
                x='0px'
                y='0px'
                viewBox='0 0 2500 2500'
                xmlSpace='preserve'
              >
                <style type='text/css'>
                  {`
        .st0 { fill: none; }
        .st1 { fill: #213147; }
        .st2 { fill: #12AAFF; }
        .st3 { fill: #9DCCED; }
        .st4 { fill: #FFFFFF; }
      `}
                </style>
                <g id='Layer_x0020_1'>
                  <g id='_2405588477232'>
                    <rect className='st0' width='2500' height='2500'></rect>
                    <g>
                      <g>
                        <path
                          className='st1'
                          d='M226,760v980c0,63,33,120,88,152l849,490c54,31,121,31,175,0l849-490c54-31,88-89,88-152V760 c0-63-33-120-88-152l-849-490c-54-31-121-31-175,0L314,608c-54,31-87,89-87,152H226z'
                        ></path>
                        <g>
                          <g>
                            <g>
                              <path
                                className='st2'
                                d='M1435,1440l-121,332c-3,9-3,19,0,29l208,571l241-139l-289-793C1467,1422,1442,1422,1435,1440z'
                              ></path>
                            </g>
                            <g>
                              <path
                                className='st2'
                                d='M1678,882c-7-18-32-18-39,0l-121,332c-3,9-3,19,0,29l341,935l241-139L1678,883V882z'
                              ></path>
                            </g>
                          </g>
                        </g>
                        <g>
                          <path
                            className='st3'
                            d='M1250,155c6,0,12,2,17,5l918,530c11,6,17,18,17,30v1060c0,12-7,24-17,30l-918,530c-5,3-11,5-17,5 s-12-2-17-5l-918-530c-11-6-17-18-17-30V719c0-12,7-24,17-30l918-530c5-3,11-5,17-5l0,0V155z M1250,0c-33,0-65,8-95,25L237,555 c-59,34-95,96-95,164v1060c0,68,36,130,95,164l918,530c29,17,62,25,95,25s65-8,95-25l918-530c59-34,95-96,95-164V719 c0-68-36-130-95-164L1344,25c-29-17-62-25-95-25l0,0H1250z'
                          ></path>
                        </g>
                        <polygon
                          className='st1'
                          points='642,2179 727,1947 897,2088 738,2234'
                        ></polygon>
                        <g>
                          <path
                            className='st4'
                            d='M1172,644H939c-17,0-33,11-39,27L401,2039l241,139l550-1507c5-14-5-28-19-28L1172,644z'
                          ></path>
                          <path
                            className='st4'
                            d='M1580,644h-233c-17,0-33,11-39,27L738,2233l241,139l620-1701c5-14-5-28-19-28V644z'
                          ></path>
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </svg>
            </button>

            <button
              className={`${
                activeButton === 'base' ? 'active' : ''
              } border-[#D1ECFF] chainButton base border rounded-full backdrop-blur-sm bg-white/30 w-[40px] h-[40px] p-2  `}
              onClick={() => handleClickChain('base')}
            >
              <svg
                width='100%'
                height='100%'
                viewBox='0 0 111 111'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H3.9565e-07C2.35281 87.8625 26.0432 110.034 54.921 110.034Z'
                  fill='#0052FF'
                />
              </svg>
            </button>

            <button
              className={`${
                activeButton === 'degen' ? 'active' : ''
              } border-[#D1ECFF] chainButton degen border rounded-full backdrop-blur-sm bg-white/30 w-[40px] h-[40px] p-2  `}
              onClick={() => handleClickChain('degen')}
            >
              <svg
                width='100%'
                height='100%'
                viewBox='0 0 789 668'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M115.185 411.477L118.367 469.444C118.575 473.392 120.055 477.107 122.552 480.15C140.007 501.282 218.264 575.014 394.616 575.014C570.968 575.014 648.278 502.234 666.38 480.544C669.108 477.27 670.68 473.206 670.934 468.933L674.089 411.517C695.084 399.997 716.758 386.98 716.758 386.98C750.835 368.518 788.866 395.038 788.935 433.936C789.051 496.87 739.877 561.545 673.548 602.301C598.758 648.258 487.117 667.324 394.664 667.324C302.211 667.324 190.57 648.258 115.78 602.301C49.4513 561.545 0.277187 496.893 0.392781 433.936C0.462138 395.038 38.4929 368.518 72.5702 386.98C72.5702 386.98 94.207 399.965 115.185 411.477Z'
                  fill='#A36EFD'
                />
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M394.641 0.113525C538.834 0.113525 577.929 3.48079 636.558 10.2154H636.535C663.561 13.3272 685.224 33.438 683.212 60.6782L661.616 354.872C654.858 356.83 647.488 359.303 639.223 362.077C595.905 376.615 527.997 399.404 394.64 399.404C261.283 399.404 193.376 376.615 150.057 362.077C141.784 359.3 134.407 356.825 127.643 354.866L106.047 60.6782C104.059 33.438 125.652 12.8395 152.724 10.2154C210.637 4.59548 270.932 0.113525 394.641 0.113525ZM137.991 495.835L138.067 496.869L139.557 497.212C139.024 496.748 138.502 496.289 137.991 495.835ZM649.85 497.178L651.193 496.869L651.262 495.928C650.8 496.341 650.329 496.757 649.85 497.178Z'
                  fill='#A36EFD'
                />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
