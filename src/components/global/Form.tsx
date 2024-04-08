import { useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { createSoloBounty,  createOpenBounty } from '@/app/context/web3';
import ButtonCTA from '@/components/ui/ButtonCTA';
import { Switch } from '@mui/material';


const Form = () => {
  const { primaryWallet } = useDynamicContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSoloBounty, setIsSoloBounty] = useState(true); 


 
 
  //  const handleCreateBounty = async () => {
  //   if (!name || !description || !amount || !primaryWallet) {
  //     alert("Please fill in all fields and check wallet connection.");
  //     return;
  //   }

  //   try {
  //     await createSoloBounty(primaryWallet, name, description, amount);
  //     alert("Bounty created successfully!");
  //     setName('');
  //     setDescription('');
  //     setAmount('');
  //   } catch (error) {
  //     console.error('Error creating bounty:', error);
  //     alert("Failed to create bounty.");
  //   }
  // };


  // const handleCreateOpenBounty = async () => {
  //   if (!name || !description || !amount || !primaryWallet) {
  //     alert("Please fill in all fields and check wallet connection.");
  //     return;
  //   }

  //   try {
  //     await createOpenBounty(primaryWallet, name, description, amount);
  //     alert("Bounty created successfully!");
  //     setName('');
  //     setDescription('');
  //     setAmount('');
  //   } catch (error) {
  //     console.error('Error creating bounty:', error);
  //     alert("Failed to create bounty.");
  //   }
  // };


  const handleCreateBounty = async () => {
    if (!name || !description || !amount || !primaryWallet) {
      alert("Please fill in all fields and check wallet connection.");
      return;
    }

    try {
      if (isSoloBounty) { 
        await createSoloBounty(primaryWallet, name, description, amount);
      } else { 
        await createOpenBounty(primaryWallet, name, description, amount);
      }
      alert("Bounty created successfully!");
      setName('');
      setDescription('');
      setAmount('');
    } catch (error) {
      console.error('Error creating bounty:', error);
      alert("Failed to create bounty.");
    }
  };

  

  return (
    <div className=' mt-10 flex text-left flex-col  text-white rounded-[30px] border border-[#D1ECFF]  p-5 flex w-full lg:min-w-[400px]  justify-center backdrop-blur-sm bg-white/30'>
      <span>title</span>
      <input
        type="text"
        placeholder=""
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4"
      />
      <span>description</span>
      <textarea
        rows = {3}
        placeholder=""
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4"
      ></textarea>

      <span>reward</span>
      <input
        type="number"
        placeholder=""
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4"
      />

<div className="flex items-center justify-start gap-2">
  <span>{isSoloBounty ? "Solo Bounty" : "Open Bounty"}</span>
  <Switch
    checked={isSoloBounty}
    onChange={() => setIsSoloBounty(!isSoloBounty)}
    inputProps={{ 'aria-label': 'controlled' }}
  />
</div>


    <button className='flex flex-row items-center justify-center ' onClick={handleCreateBounty}>  
    <svg width="157" height="157" viewBox="0 0 157 157" fill="none" xmlns="http://www.w3.org/2000/svg">
<g filter="url(#filter0_dd_615_3757)">
<rect x="16.5" y="17" width="125" height="125" rx="62.5" fill="#E2EFFB" fillOpacity="0.5"/>
<rect x="16.9687" y="17.4687" width="124.062" height="124.062" rx="62.0312" stroke="#D1ECFF" strokeWidth="0.9375"/>
<g filter="url(#filter1_iii_615_3757)">
<circle cx="79" cy="79.5" r="54.5" fill="url(#paint0_linear_615_3757)"/>
</g>
<circle cx="79" cy="79.5" r="54.6576" stroke="url(#paint1_linear_615_3757)" strokeOpacity="0.6" strokeWidth="0.315131"/>
<g filter="url(#filter2_ddii_615_3757)">
<circle cx="79.0002" cy="79.5003" r="46.0808" fill="url(#paint2_linear_615_3757)"/>
</g>
<g filter="url(#filter3_i_615_3757)">
<ellipse cx="78.9997" cy="79.5" rx="39.0515" ry="39.0515" fill="url(#paint3_linear_615_3757)"/>
</g>
</g>
<defs>
<filter id="filter0_dd_615_3757" x="0.25" y="0.75" width="156.25" height="156.25" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="6.25" dy="6.25"/>
<feGaussianBlur stdDeviation="4.375"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.362061 0 0 0 0 0.598517 0 0 0 0 0.825879 0 0 0 0.5 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_615_3757"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="-6.25" dy="-6.25"/>
<feGaussianBlur stdDeviation="5"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.818424 0 0 0 0 0.9251 0 0 0 0 1 0 0 0 0.5 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_615_3757" result="effect2_dropShadow_615_3757"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_615_3757" result="shape"/>
</filter>
<filter id="filter1_iii_615_3757" x="24.1851" y="24.6848" width="109.63" height="110.261" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="0.315131" operator="erode" in="SourceAlpha" result="effect1_innerShadow_615_3757"/>
<feOffset dy="0.630263"/>
<feGaussianBlur stdDeviation="0.315131"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.608057 0 0 0 0 0.154864 0 0 0 0 0.157715 0 0 0 1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_615_3757"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="0.630263"/>
<feGaussianBlur stdDeviation="0.157566"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.972549 0 0 0 0 0.592157 0 0 0 0 0.596078 0 0 0 1 0"/>
<feBlend mode="normal" in2="effect1_innerShadow_615_3757" result="effect2_innerShadow_615_3757"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="0.315131" operator="erode" in="SourceAlpha" result="effect3_innerShadow_615_3757"/>
<feOffset dy="0.315131"/>
<feGaussianBlur stdDeviation="0.315131"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.847059 0 0 0 0 0.223529 0 0 0 0 0.227451 0 0 0 1 0"/>
<feBlend mode="normal" in2="effect2_innerShadow_615_3757" result="effect3_innerShadow_615_3757"/>
</filter>
<filter id="filter2_ddii_615_3757" x="12.751" y="22.0748" width="132.498" height="132.498" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="8.82368"/>
<feGaussianBlur stdDeviation="10.0842"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_615_3757"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="1.26053"/>
<feGaussianBlur stdDeviation="0.630263"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_615_3757" result="effect2_dropShadow_615_3757"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_615_3757" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="0.630263"/>
<feGaussianBlur stdDeviation="0.157566"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.929167 0 0 0 0 0.937667 0 0 0 0 1 0 0 0 0.37 0"/>
<feBlend mode="normal" in2="shape" result="effect3_innerShadow_615_3757"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-0.315131"/>
<feGaussianBlur stdDeviation="0.315131"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0"/>
<feBlend mode="normal" in2="effect3_innerShadow_615_3757" result="effect4_innerShadow_615_3757"/>
</filter>
<filter id="filter3_i_615_3757" x="39.9482" y="40.1334" width="78.103" height="78.4182" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
<feFlood floodOpacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-0.315131"/>
<feGaussianBlur stdDeviation="0.157566"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.929167 0 0 0 0 0.937667 0 0 0 0 1 0 0 0 0.17 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_615_3757"/>
</filter>
<linearGradient id="paint0_linear_615_3757" x1="79" y1="25" x2="79" y2="134" gradientUnits="userSpaceOnUse">
<stop stopColor="#F15E5F"/>
<stop offset="1" stopColor="#D8393A"/>
</linearGradient>
<linearGradient id="paint1_linear_615_3757" x1="79" y1="25" x2="79" y2="134" gradientUnits="userSpaceOnUse">
<stop stopColor="white"/>
<stop offset="1" stopColor="#F15E5F"/>
</linearGradient>
<linearGradient id="paint2_linear_615_3757" x1="79.0002" y1="33.4196" x2="79.0002" y2="125.581" gradientUnits="userSpaceOnUse">
<stop stopColor="#F15E5F"/>
<stop offset="1" stopColor="#D8393A"/>
</linearGradient>
<linearGradient id="paint3_linear_615_3757" x1="78.9997" y1="40.4485" x2="78.9997" y2="118.551" gradientUnits="userSpaceOnUse">
<stop stopColor="#D8393A"/>
<stop offset="0.226722" stopColor="#F15E5F"/>
<stop offset="1" stopColor="#F89798"/>
</linearGradient>
</defs>
    </svg>  
    <ButtonCTA > create bounty </ButtonCTA>
    </button>

    {/* <button className='hidden' onClick={handleCreateOpenBounty}>Create Open Bounty</button> */}




    </div>
  );
};

export default Form;
