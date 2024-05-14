import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Switch } from '@mui/material';
import { useState } from 'react';
import { toast } from 'react-toastify';

import ButtonCTA from '@/components/ui/ButtonCTA';

import { createOpenBounty, createSoloBounty } from '@/app/context/web3';

const Form = () => {
  const { primaryWallet } = useDynamicContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSoloBounty, setIsSoloBounty] = useState(true);
  const [walletMessage, setWalletMessage] = useState('');

  const handleCreateBounty = async () => {
    if (!name || !description || !amount || !primaryWallet) {
      toast.error('Please fill in all fields and check wallet connection.');
      return;
    }

    try {
      const balance = await primaryWallet.connector.getBalance();
      if (parseFloat(balance as string) < parseFloat(amount)) {
        toast.error('Insufficient funds for this transaction');
        return;
      }

      if (isSoloBounty) {
        await createSoloBounty(primaryWallet, name, description, amount);
      } else {
        await createOpenBounty(primaryWallet, name, description, amount);
      }
      toast.success('Bounty created successfully!');
      setName('');
      setDescription('');
      setAmount('');
    } catch (error: unknown) {
      console.error('Error creating bounty:', error);
      const errorCode = (error as any)?.info?.error?.code;
      if (errorCode === 4001) {
        toast.error('Transaction denied by user');
      } else {
        toast.error('Failed to create bounty');
      }
    }
  };

  return (
    <div className=' mt-10 flex text-left flex-col  text-white rounded-[30px] border border-[#D1ECFF]  p-5 flex w-full lg:min-w-[400px]  justify-center backdrop-blur-sm bg-white/30'>
      <span>title</span>
      <input
        type='text'
        placeholder=''
        value={name}
        onChange={(e) => setName(e.target.value)}
        className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4'
      />
      <span>description</span>
      <textarea
        rows={3}
        placeholder=''
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4'
      ></textarea>

      <span>reward</span>
      <input
        type='number'
        placeholder=''
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4'
      />

      <div className='flex items-center justify-start gap-2'>
        <span>{isSoloBounty ? 'Solo Bounty' : 'Open Bounty'}</span>
        <Switch
          checked={isSoloBounty}
          onChange={() => setIsSoloBounty(!isSoloBounty)}
          inputProps={{ 'aria-label': 'controlled' }}
        />
      </div>

      <button
        className={`flex flex-row items-center justify-center ${
          !primaryWallet ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => {
          if (!primaryWallet) {
            setWalletMessage('Please connect wallet to continue');
          } else {
            handleCreateBounty();
          }
        }}
        onMouseEnter={() => {
          if (!primaryWallet) {
            setWalletMessage('Please connect wallet to continue');
          }
        }}
        onMouseLeave={() => {
          setWalletMessage('');
        }}
      >
        <div className='button'>
          <svg
            className='normal'
            width='157'
            height='157'
            viewBox='0 0 157 157'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <g filter='url(#filter0_dd_615_3757)'>
              <rect
                x='16.5'
                y='17'
                width='125'
                height='125'
                rx='62.5'
                fill='#E2EFFB'
                fillOpacity='0.5'
              />
              <rect
                x='16.9687'
                y='17.4687'
                width='124.062'
                height='124.062'
                rx='62.0312'
                stroke='#D1ECFF'
                strokeWidth='0.9375'
              />
              <g filter='url(#filter1_iii_615_3757)'>
                <circle
                  cx='79'
                  cy='79.5'
                  r='54.5'
                  fill='url(#paint0_linear_615_3757)'
                />
              </g>
              <circle
                cx='79'
                cy='79.5'
                r='54.6576'
                stroke='url(#paint1_linear_615_3757)'
                strokeOpacity='0.6'
                strokeWidth='0.315131'
              />
              <g filter='url(#filter2_ddii_615_3757)'>
                <circle
                  cx='79.0002'
                  cy='79.5003'
                  r='46.0808'
                  fill='url(#paint2_linear_615_3757)'
                />
              </g>
              <g filter='url(#filter3_i_615_3757)'>
                <ellipse
                  cx='78.9997'
                  cy='79.5'
                  rx='39.0515'
                  ry='39.0515'
                  fill='url(#paint3_linear_615_3757)'
                />
              </g>
            </g>
            <defs>
              <filter
                id='filter0_dd_615_3757'
                x='0.25'
                y='0.75'
                width='156.25'
                height='156.25'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dx='6.25' dy='6.25' />
                <feGaussianBlur stdDeviation='4.375' />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.362061 0 0 0 0 0.598517 0 0 0 0 0.825879 0 0 0 0.5 0'
                />
                <feBlend
                  mode='normal'
                  in2='BackgroundImageFix'
                  result='effect1_dropShadow_615_3757'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dx='-6.25' dy='-6.25' />
                <feGaussianBlur stdDeviation='5' />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.818424 0 0 0 0 0.9251 0 0 0 0 1 0 0 0 0.5 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect1_dropShadow_615_3757'
                  result='effect2_dropShadow_615_3757'
                />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='effect2_dropShadow_615_3757'
                  result='shape'
                />
              </filter>
              <filter
                id='filter1_iii_615_3757'
                x='24.1851'
                y='24.6848'
                width='109.63'
                height='110.261'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='BackgroundImageFix'
                  result='shape'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feMorphology
                  radius='0.315131'
                  operator='erode'
                  in='SourceAlpha'
                  result='effect1_innerShadow_615_3757'
                />
                <feOffset dy='0.630263' />
                <feGaussianBlur stdDeviation='0.315131' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.608057 0 0 0 0 0.154864 0 0 0 0 0.157715 0 0 0 1 0'
                />
                <feBlend
                  mode='normal'
                  in2='shape'
                  result='effect1_innerShadow_615_3757'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='0.630263' />
                <feGaussianBlur stdDeviation='0.157566' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.972549 0 0 0 0 0.592157 0 0 0 0 0.596078 0 0 0 1 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect1_innerShadow_615_3757'
                  result='effect2_innerShadow_615_3757'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feMorphology
                  radius='0.315131'
                  operator='erode'
                  in='SourceAlpha'
                  result='effect3_innerShadow_615_3757'
                />
                <feOffset dy='0.315131' />
                <feGaussianBlur stdDeviation='0.315131' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.847059 0 0 0 0 0.223529 0 0 0 0 0.227451 0 0 0 1 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect2_innerShadow_615_3757'
                  result='effect3_innerShadow_615_3757'
                />
              </filter>
              <filter
                id='filter2_ddii_615_3757'
                x='12.751'
                y='22.0748'
                width='132.498'
                height='132.498'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='8.82368' />
                <feGaussianBlur stdDeviation='10.0842' />
                <feComposite in2='hardAlpha' operator='out' />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0'
                />
                <feBlend
                  mode='normal'
                  in2='BackgroundImageFix'
                  result='effect1_dropShadow_615_3757'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='1.26053' />
                <feGaussianBlur stdDeviation='0.630263' />
                <feComposite in2='hardAlpha' operator='out' />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect1_dropShadow_615_3757'
                  result='effect2_dropShadow_615_3757'
                />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='effect2_dropShadow_615_3757'
                  result='shape'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='0.630263' />
                <feGaussianBlur stdDeviation='0.157566' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.929167 0 0 0 0 0.937667 0 0 0 0 1 0 0 0 0.37 0'
                />
                <feBlend
                  mode='normal'
                  in2='shape'
                  result='effect3_innerShadow_615_3757'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='-0.315131' />
                <feGaussianBlur stdDeviation='0.315131' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect3_innerShadow_615_3757'
                  result='effect4_innerShadow_615_3757'
                />
              </filter>
              <filter
                id='filter3_i_615_3757'
                x='39.9482'
                y='40.1334'
                width='78.103'
                height='78.4182'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='BackgroundImageFix'
                  result='shape'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='-0.315131' />
                <feGaussianBlur stdDeviation='0.157566' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.929167 0 0 0 0 0.937667 0 0 0 0 1 0 0 0 0.17 0'
                />
                <feBlend
                  mode='normal'
                  in2='shape'
                  result='effect1_innerShadow_615_3757'
                />
              </filter>
              <linearGradient
                id='paint0_linear_615_3757'
                x1='79'
                y1='25'
                x2='79'
                y2='134'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='#F15E5F' />
                <stop offset='1' stopColor='#D8393A' />
              </linearGradient>
              <linearGradient
                id='paint1_linear_615_3757'
                x1='79'
                y1='25'
                x2='79'
                y2='134'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='white' />
                <stop offset='1' stopColor='#F15E5F' />
              </linearGradient>
              <linearGradient
                id='paint2_linear_615_3757'
                x1='79.0002'
                y1='33.4196'
                x2='79.0002'
                y2='125.581'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='#F15E5F' />
                <stop offset='1' stopColor='#D8393A' />
              </linearGradient>
              <linearGradient
                id='paint3_linear_615_3757'
                x1='78.9997'
                y1='40.4485'
                x2='78.9997'
                y2='118.551'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='#D8393A' />
                <stop offset='0.226722' stopColor='#F15E5F' />
                <stop offset='1' stopColor='#F89798' />
              </linearGradient>
            </defs>
          </svg>

          <svg
            className='press'
            width='157'
            height='157'
            viewBox='0 0 157 157'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <g filter='url(#filter0_dd_513_1935)'>
              <rect
                x='16.5'
                y='17'
                width='125'
                height='125'
                rx='62.5'
                fill='#E2EFFB'
                fillOpacity='0.5'
              />
              <rect
                x='16.9687'
                y='17.4687'
                width='124.062'
                height='124.062'
                rx='62.0312'
                stroke='#D1ECFF'
                strokeWidth='0.9375'
              />
              <g filter='url(#filter1_iii_513_1935)'>
                <circle
                  cx='79'
                  cy='79.5'
                  r='54.5'
                  fill='url(#paint0_linear_513_1935)'
                />
              </g>
              <circle
                cx='79'
                cy='79.5'
                r='54.6576'
                stroke='url(#paint1_linear_513_1935)'
                strokeOpacity='0.6'
                strokeWidth='0.315131'
              />
              <g filter='url(#filter2_ddii_513_1935)'>
                <circle
                  cx='79'
                  cy='79.5003'
                  r='46.0808'
                  fill='url(#paint2_linear_513_1935)'
                />
              </g>
              <g filter='url(#filter3_i_513_1935)'>
                <circle
                  cx='79'
                  cy='79.5'
                  r='39.0515'
                  fill='url(#paint3_linear_513_1935)'
                />
              </g>
              <g filter='url(#filter4_i_513_1935)'>
                <path
                  d='M53.4777 70.3474C55.1511 70.3474 56.2288 71.2644 56.2288 72.6731C56.2288 74.0722 55.1511 74.9798 53.4777 74.9798H52.5229V77.0597H50.5564V70.3474H53.4777ZM52.5229 73.4199H53.3264C53.8559 73.4199 54.2246 73.1647 54.2246 72.6731C54.2246 72.172 53.8653 71.9073 53.3264 71.9073H52.5229V73.4199ZM60.2508 77.211C58.1615 77.211 56.8474 75.859 56.8474 73.713C56.8474 71.548 58.1615 70.1961 60.2508 70.1961C62.3401 70.1961 63.6542 71.548 63.6542 73.713C63.6542 75.859 62.3401 77.211 60.2508 77.211ZM58.8516 73.713C58.8516 74.9515 59.3527 75.6511 60.2508 75.6511C61.1489 75.6511 61.65 74.9515 61.65 73.713C61.65 72.4651 61.1489 71.756 60.2508 71.756C59.3527 71.756 58.8516 72.4651 58.8516 73.713ZM64.3773 70.3474H66.3437V77.0597H64.3773V70.3474ZM69.9756 70.3474C72.2351 70.3474 73.502 71.5575 73.502 73.713C73.502 75.859 72.254 77.0597 70.0324 77.0597H67.4609V70.3474H69.9756ZM69.4273 75.4998H69.9756C71.0439 75.4998 71.5261 74.942 71.5261 73.7035C71.5261 72.4651 71.0439 71.9073 69.9756 71.9073H69.4273V75.4998ZM74.2282 77.0597V70.3474H76.1946V72.9094H78.0382V70.3474H80.0046V77.0597H78.0382V74.4599H76.1946V77.0597H74.2282Z'
                  fill='url(#paint4_linear_513_1935)'
                />
              </g>
              <g filter='url(#filter5_iii_513_1935)'>
                <circle
                  cx='79'
                  cy='79.5'
                  r='54.5'
                  fill='url(#paint5_linear_513_1935)'
                />
              </g>
              <circle
                cx='79'
                cy='79.5'
                r='54.6576'
                stroke='url(#paint6_linear_513_1935)'
                strokeOpacity='0.6'
                strokeWidth='0.315131'
              />
              <g filter='url(#filter6_i_513_1935)'>
                <circle
                  cx='79'
                  cy='79.5'
                  r='39.0515'
                  fill='url(#paint7_linear_513_1935)'
                />
              </g>
              <circle
                cx='79'
                cy='79.5001'
                r='46.0808'
                fill='url(#paint8_linear_513_1935)'
              />
              <g filter='url(#filter7_i_513_1935)'>
                <ellipse
                  cx='79.0001'
                  cy='79.4999'
                  rx='46.0808'
                  ry='46.0808'
                  transform='rotate(-180 79.0001 79.4999)'
                  fill='url(#paint9_linear_513_1935)'
                />
              </g>
              <g filter='url(#filter8_i_513_1935)'>
                <circle
                  cx='79'
                  cy='79.5001'
                  r='39.0515'
                  fill='url(#paint10_linear_513_1935)'
                />
              </g>
            </g>
            <defs>
              <filter
                id='filter0_dd_513_1935'
                x='0.25'
                y='0.75'
                width='156.25'
                height='156.25'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dx='6.25' dy='6.25' />
                <feGaussianBlur stdDeviation='4.375' />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.362061 0 0 0 0 0.598517 0 0 0 0 0.825879 0 0 0 0.5 0'
                />
                <feBlend
                  mode='normal'
                  in2='BackgroundImageFix'
                  result='effect1_dropShadow_513_1935'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dx='-6.25' dy='-6.25' />
                <feGaussianBlur stdDeviation='5' />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.818424 0 0 0 0 0.9251 0 0 0 0 1 0 0 0 0.5 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect1_dropShadow_513_1935'
                  result='effect2_dropShadow_513_1935'
                />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='effect2_dropShadow_513_1935'
                  result='shape'
                />
              </filter>
              <filter
                id='filter1_iii_513_1935'
                x='24.1848'
                y='24.6848'
                width='109.63'
                height='110.261'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='BackgroundImageFix'
                  result='shape'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feMorphology
                  radius='0.315131'
                  operator='erode'
                  in='SourceAlpha'
                  result='effect1_innerShadow_513_1935'
                />
                <feOffset dy='0.630263' />
                <feGaussianBlur stdDeviation='0.315131' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.608057 0 0 0 0 0.154864 0 0 0 0 0.157715 0 0 0 1 0'
                />
                <feBlend
                  mode='normal'
                  in2='shape'
                  result='effect1_innerShadow_513_1935'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='0.630263' />
                <feGaussianBlur stdDeviation='0.157566' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.972549 0 0 0 0 0.592157 0 0 0 0 0.596078 0 0 0 1 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect1_innerShadow_513_1935'
                  result='effect2_innerShadow_513_1935'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feMorphology
                  radius='0.315131'
                  operator='erode'
                  in='SourceAlpha'
                  result='effect3_innerShadow_513_1935'
                />
                <feOffset dy='0.315131' />
                <feGaussianBlur stdDeviation='0.315131' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.847059 0 0 0 0 0.223529 0 0 0 0 0.227451 0 0 0 1 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect2_innerShadow_513_1935'
                  result='effect3_innerShadow_513_1935'
                />
              </filter>
              <filter
                id='filter2_ddii_513_1935'
                x='12.7508'
                y='22.0748'
                width='132.498'
                height='132.498'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='8.82368' />
                <feGaussianBlur stdDeviation='10.0842' />
                <feComposite in2='hardAlpha' operator='out' />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0'
                />
                <feBlend
                  mode='normal'
                  in2='BackgroundImageFix'
                  result='effect1_dropShadow_513_1935'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='1.26053' />
                <feGaussianBlur stdDeviation='0.630263' />
                <feComposite in2='hardAlpha' operator='out' />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect1_dropShadow_513_1935'
                  result='effect2_dropShadow_513_1935'
                />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='effect2_dropShadow_513_1935'
                  result='shape'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='0.630263' />
                <feGaussianBlur stdDeviation='0.157566' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.929167 0 0 0 0 0.937667 0 0 0 0 1 0 0 0 0.37 0'
                />
                <feBlend
                  mode='normal'
                  in2='shape'
                  result='effect3_innerShadow_513_1935'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='-0.315131' />
                <feGaussianBlur stdDeviation='0.315131' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect3_innerShadow_513_1935'
                  result='effect4_innerShadow_513_1935'
                />
              </filter>
              <filter
                id='filter3_i_513_1935'
                x='39.9485'
                y='40.1334'
                width='78.103'
                height='78.4182'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='BackgroundImageFix'
                  result='shape'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='-0.315131' />
                <feGaussianBlur stdDeviation='0.157566' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.929167 0 0 0 0 0.937667 0 0 0 0 1 0 0 0 0.17 0'
                />
                <feBlend
                  mode='normal'
                  in2='shape'
                  result='effect1_innerShadow_513_1935'
                />
              </filter>
              <filter
                id='filter4_i_513_1935'
                x='50.5564'
                y='69.881'
                width='29.4482'
                height='7.3299'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='BackgroundImageFix'
                  result='shape'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='-0.315131' />
                <feGaussianBlur stdDeviation='0.315131' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0'
                />
                <feBlend
                  mode='normal'
                  in2='shape'
                  result='effect1_innerShadow_513_1935'
                />
              </filter>
              <filter
                id='filter5_iii_513_1935'
                x='24.1848'
                y='24.6848'
                width='109.63'
                height='110.261'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='BackgroundImageFix'
                  result='shape'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feMorphology
                  radius='0.315131'
                  operator='erode'
                  in='SourceAlpha'
                  result='effect1_innerShadow_513_1935'
                />
                <feOffset dy='0.630263' />
                <feGaussianBlur stdDeviation='0.315131' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.608057 0 0 0 0 0.154864 0 0 0 0 0.157715 0 0 0 1 0'
                />
                <feBlend
                  mode='normal'
                  in2='shape'
                  result='effect1_innerShadow_513_1935'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='0.630263' />
                <feGaussianBlur stdDeviation='0.157566' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.972549 0 0 0 0 0.592157 0 0 0 0 0.596078 0 0 0 1 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect1_innerShadow_513_1935'
                  result='effect2_innerShadow_513_1935'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feMorphology
                  radius='0.315131'
                  operator='erode'
                  in='SourceAlpha'
                  result='effect3_innerShadow_513_1935'
                />
                <feOffset dy='0.315131' />
                <feGaussianBlur stdDeviation='0.315131' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.847059 0 0 0 0 0.223529 0 0 0 0 0.227451 0 0 0 1 0'
                />
                <feBlend
                  mode='normal'
                  in2='effect2_innerShadow_513_1935'
                  result='effect3_innerShadow_513_1935'
                />
              </filter>
              <filter
                id='filter6_i_513_1935'
                x='39.9485'
                y='40.1334'
                width='78.103'
                height='78.4182'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='BackgroundImageFix'
                  result='shape'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='-0.315131' />
                <feGaussianBlur stdDeviation='0.157566' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.929167 0 0 0 0 0.937667 0 0 0 0 1 0 0 0 0.17 0'
                />
                <feBlend
                  mode='normal'
                  in2='shape'
                  result='effect1_innerShadow_513_1935'
                />
              </filter>
              <filter
                id='filter7_i_513_1935'
                x='32.9192'
                y='33.4192'
                width='92.1616'
                height='92.1615'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='BackgroundImageFix'
                  result='shape'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feMorphology
                  radius='0.994286'
                  operator='erode'
                  in='SourceAlpha'
                  result='effect1_innerShadow_513_1935'
                />
                <feOffset />
                <feGaussianBlur stdDeviation='0.315131' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'
                />
                <feBlend
                  mode='normal'
                  in2='shape'
                  result='effect1_innerShadow_513_1935'
                />
              </filter>
              <filter
                id='filter8_i_513_1935'
                x='39.9485'
                y='40.1335'
                width='78.103'
                height='78.4182'
                filterUnits='userSpaceOnUse'
                colorInterpolationFilters='sRGB'
              >
                <feFlood floodOpacity='0' result='BackgroundImageFix' />
                <feBlend
                  mode='normal'
                  in='SourceGraphic'
                  in2='BackgroundImageFix'
                  result='shape'
                />
                <feColorMatrix
                  in='SourceAlpha'
                  type='matrix'
                  values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
                  result='hardAlpha'
                />
                <feOffset dy='-0.315131' />
                <feGaussianBlur stdDeviation='0.157566' />
                <feComposite
                  in2='hardAlpha'
                  operator='arithmetic'
                  k2='-1'
                  k3='1'
                />
                <feColorMatrix
                  type='matrix'
                  values='0 0 0 0 0.929167 0 0 0 0 0.937667 0 0 0 0 1 0 0 0 0.17 0'
                />
                <feBlend
                  mode='normal'
                  in2='shape'
                  result='effect1_innerShadow_513_1935'
                />
              </filter>
              <linearGradient
                id='paint0_linear_513_1935'
                x1='79'
                y1='25'
                x2='79'
                y2='134'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='#F15E5F' />
                <stop offset='1' stopColor='#D8393A' />
              </linearGradient>
              <linearGradient
                id='paint1_linear_513_1935'
                x1='79'
                y1='25'
                x2='79'
                y2='134'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='white' />
                <stop offset='1' stopColor='#F15E5F' />
              </linearGradient>
              <linearGradient
                id='paint2_linear_513_1935'
                x1='79'
                y1='33.4196'
                x2='79'
                y2='125.581'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='#F15E5F' />
                <stop offset='1' stopColor='#D8393A' />
              </linearGradient>
              <linearGradient
                id='paint3_linear_513_1935'
                x1='79'
                y1='40.4485'
                x2='79'
                y2='118.551'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='#D8393A' />
                <stop offset='0.226722' stopColor='#F15E5F' />
                <stop offset='1' stopColor='#F89798' />
              </linearGradient>
              <linearGradient
                id='paint4_linear_513_1935'
                x1='78.2318'
                y1='67.0597'
                x2='78.2318'
                y2='91.9808'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='white' />
                <stop offset='1' stopColor='#FF9495' />
              </linearGradient>
              <linearGradient
                id='paint5_linear_513_1935'
                x1='79'
                y1='25'
                x2='79'
                y2='134'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='#F15E5F' />
                <stop offset='1' stopColor='#D8393A' />
              </linearGradient>
              <linearGradient
                id='paint6_linear_513_1935'
                x1='79'
                y1='25'
                x2='79'
                y2='134'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='white' />
                <stop offset='1' stopColor='#F15E5F' />
              </linearGradient>
              <linearGradient
                id='paint7_linear_513_1935'
                x1='79'
                y1='40.4485'
                x2='79'
                y2='118.551'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='#D8393A' />
                <stop offset='0.226722' stopColor='#F15E5F' />
                <stop offset='1' stopColor='#F89798' />
              </linearGradient>
              <linearGradient
                id='paint8_linear_513_1935'
                x1='79'
                y1='33.4193'
                x2='79'
                y2='125.581'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='#F15E5F' />
                <stop offset='1' stopColor='#D8393A' />
              </linearGradient>
              <linearGradient
                id='paint9_linear_513_1935'
                x1='79.0001'
                y1='33.4191'
                x2='79.0001'
                y2='125.581'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='#D8393A' />
                <stop offset='0.9999' stopColor='#F15E5F' />
                <stop offset='1' stopColor='#F89798' />
              </linearGradient>
              <linearGradient
                id='paint10_linear_513_1935'
                x1='79'
                y1='40.4486'
                x2='79'
                y2='118.552'
                gradientUnits='userSpaceOnUse'
              >
                <stop stopColor='#CC2E2F' />
                <stop offset='0.9999' stopColor='#F15E5F' />
                <stop offset='1' stopColor='#F89798' />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <ButtonCTA> create bounty </ButtonCTA>
      </button>
      <span id='walletMessage'>{walletMessage}</span>

      {/* <button className='hidden' onClick={handleCreateOpenBounty}>Create Open Bounty</button> */}
    </div>
  );
};

export default Form;
