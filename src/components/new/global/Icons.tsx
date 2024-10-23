export function InfoIcon({
  width = 24,
  height = 24,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      width={width}
      height={height}
      viewBox='0 0 24 24'
      strokeWidth={1.5}
      stroke='currentColor'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z'
      />
    </svg>
  );
}

export function UsersRoundIcon({
  width = 24,
  height = 24,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={width}
      height={height}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='lucide lucide-users-round'
    >
      <path d='M18 21a8 8 0 0 0-16 0' />
      <circle cx='10' cy='8' r='5' />
      <path d='M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3' />
    </svg>
  );
}

export function ExpandMoreIcon({
  width = 24,
  height = 24,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      width={width}
      height={height}
      viewBox='0 0 24 24'
      strokeWidth={1.5}
      stroke='currentColor'
      className='size-6'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='m19.5 8.25-7.5 7.5-7.5-7.5'
      />
    </svg>
  );
}

export function CopyIcon({
  width = 24,
  height = 24,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      viewBox='0 0 24 24'
      width={width}
      height={height}
      strokeWidth={1.5}
      stroke='currentColor'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75'
      />
    </svg>
  );
}

export function ArbitrumIcon({
  width = 24,
  height = 24,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <>
      <style type='text/css'>
        {`
          .st0 { fill: none; }
          .st1 { fill: #213147; }
          .st2 { fill: #12AAFF; }
          .st3 { fill: #9DCCED; }
          .st4 { fill: #FFFFFF; }
      `}
      </style>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        version='1.1'
        id='Layer_1'
        x='0px'
        y='0px'
        width={width}
        height={height}
        viewBox='0 0 2500 2500'
        xmlSpace='preserve'
      >
        <g id='Layer_x0020_1'>
          <g id='_2405588477232'>
            <rect className='st0' width='20px' height='20px'></rect>
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
    </>
  );
}

export function DegenIcon({ width = 24, height = 24 }) {
  return (
    <svg
      width={width}
      height={height}
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
  );
}

export function BaseIcon({ width = 24, height = 24 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 111 111'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H3.9565e-07C2.35281 87.8625 26.0432 110.034 54.921 110.034Z'
        fill='#0052FF'
      />
    </svg>
  );
}
