/* eslint-disable simple-import-sort/imports */
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Box, CircularProgress, Switch } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

import GameButton from '@/components/new/global/GameButton';
import { InfoIcon } from '@/components/new/global/Icons';
import ButtonCTA from '@/components/new/ui/ButtonCTA';
import chainStatusStore from '@/store/new/chainStatus.store';
import { createOpenBounty, createSoloBounty } from '@/app/context';

export default function Form() {
  const { primaryWallet } = useDynamicContext();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSoloBounty, setIsSoloBounty] = useState(true);
  const currentChain = chainStatusStore.currentChain;
  const [inTxn, setInTxn] = useState(false);

  const handleCreateBounty = async () => {
    if (!name || !description || !amount || !primaryWallet) {
      toast.error('Please fill in all fields and check wallet connection.');
      return;
    }
    try {
      let tx;
      setInTxn(true);
      if (isSoloBounty) {
        tx = await createSoloBounty(primaryWallet, name, description, amount);
      } else {
        tx = await createOpenBounty(primaryWallet, name, description, amount);
      }
      toast.success('Bounty created successfully!');
      setInTxn(false);
      setName('');
      setDescription('');
      setAmount('');
      router.push(
        `/${currentChain.chainPathName}/bounty/${tx.logs[0].args[0]}`
      );
    } catch (error: any) {
      setInTxn(false);
      console.error('Error creating bounty:', error);
      const errorCode = error?.info?.error?.code;
      if (errorCode !== 4001) {
        toast.error('Failed to create bounty');
      }
    }
  };

  return (
    <div className='mt-10 flex text-left flex-col text-white rounded-[30px] border border-[#D1ECFF] p-5 w-full lg:min-w-[400px] justify-center backdrop-blur-sm bg-poidhBlue/60'>
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
      <div className='flex text-balance gap-2 text-xs mb-2 items-center'>
        <InfoIcon width={18} height={18} /> a 2.5% fee is deducted from
        completed bounties
      </div>

      <div className='flex items-center justify-start gap-2'>
        <span>{isSoloBounty ? 'Solo Bounty' : 'Open Bounty'}</span>
        <Switch
          checked={isSoloBounty}
          onChange={() => setIsSoloBounty(!isSoloBounty)}
          inputProps={{ 'aria-label': 'controlled' }}
        />
      </div>
      <div className=' text-xs'>
        <span className='flex gap-2 items-center max-w-md '>
          <InfoIcon width={18} height={18} />
          {isSoloBounty
            ? 'you are the sole bounty contributor'
            : 'users can add additional funds to your bounty'}
        </span>
      </div>

      {inTxn ? (
        <Box className='flex justify-center items-center mt-5'>
          <CircularProgress />
        </Box>
      ) : (
        <button
          className={`flex flex-row items-center justify-center ${
            !primaryWallet ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={handleCreateBounty}
          disabled={!primaryWallet}
        >
          {inTxn && (
            <Box sx={{ display: 'flex' }}>
              <CircularProgress />
            </Box>
          )}
          <div className='button'>
            <GameButton />
          </div>
          <ButtonCTA> create bounty </ButtonCTA>
        </button>
      )}
    </div>
  );
}
