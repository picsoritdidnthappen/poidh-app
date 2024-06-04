import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

interface NetworkSelectorProps {
  setShowSections: (value: boolean) => void;
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  setShowSections,
}) => {
  const [activeButton, setActiveButton] = useState('');

  const [showButton, setShowButton] = useState(true);
  const router = useRouter();

  const handleClickChain = (chain: string) => {
    setActiveButton(chain);
    setShowButton(false);
    setShowSections(true);
    router.push(`/${chain}`);
  };

  return (
    <>
      <div
        className={` ${
          !showButton ? 'hidden' : ''
        }   px-5  lg:px-20 flex flex-col min-h-[75vh] justify-center items-center`}
      >
        <p>select network</p>

        <div className='flex    mt-5 flex-row gap-2'>
          <button
            className={` border-[#D1ECFF]  arbitrum border rounded-full backdrop-blur-sm  hover:bg-white/50 bg-white/30 w-[100px] h-[100px] p-5  `}
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
            className={`border-[#D1ECFF]  base border rounded-full backdrop-blur-sm  hover:bg-white/50 bg-white/30 w-[100px] h-[100px] p-5  `}
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
            className={`border-[#D1ECFF]  degen border rounded-full backdrop-blur-sm hover:bg-white/50 bg-white/30 w-[100px] h-[100px] p-5  `}
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
                fill-rule='evenodd'
                clip-rule='evenodd'
                d='M115.185 411.477L118.367 469.444C118.575 473.392 120.055 477.107 122.552 480.15C140.007 501.282 218.264 575.014 394.616 575.014C570.968 575.014 648.278 502.234 666.38 480.544C669.108 477.27 670.68 473.206 670.934 468.933L674.089 411.517C695.084 399.997 716.758 386.98 716.758 386.98C750.835 368.518 788.866 395.038 788.935 433.936C789.051 496.87 739.877 561.545 673.548 602.301C598.758 648.258 487.117 667.324 394.664 667.324C302.211 667.324 190.57 648.258 115.78 602.301C49.4513 561.545 0.277187 496.893 0.392781 433.936C0.462138 395.038 38.4929 368.518 72.5702 386.98C72.5702 386.98 94.207 399.965 115.185 411.477Z'
                fill='#A36EFD'
              />
              <path
                fill-rule='evenodd'
                clip-rule='evenodd'
                d='M394.641 0.113525C538.834 0.113525 577.929 3.48079 636.558 10.2154H636.535C663.561 13.3272 685.224 33.438 683.212 60.6782L661.616 354.872C654.858 356.83 647.488 359.303 639.223 362.077C595.905 376.615 527.997 399.404 394.64 399.404C261.283 399.404 193.376 376.615 150.057 362.077C141.784 359.3 134.407 356.825 127.643 354.866L106.047 60.6782C104.059 33.438 125.652 12.8395 152.724 10.2154C210.637 4.59548 270.932 0.113525 394.641 0.113525ZM137.991 495.835L138.067 496.869L139.557 497.212C139.024 496.748 138.502 496.289 137.991 495.835ZM649.85 497.178L651.193 496.869L651.262 495.928C650.8 496.341 650.329 496.757 649.85 497.178Z'
                fill='#A36EFD'
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default NetworkSelector;
