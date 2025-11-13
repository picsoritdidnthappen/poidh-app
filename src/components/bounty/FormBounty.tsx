import {
  Box,
  Dialog,
  DialogContent,
  Switch,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';

import { useGetChain } from '@/hooks/useGetChain';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { decodeEventLog, parseEther } from 'viem';
import abi from '@/constant/abi/abi';
import { cn } from '@/utils';
import GameButton from '@/components/global/GameButton';
import { ExpandMoreIcon, InfoIcon } from '@/components/global/Icons';
import ButtonCTA from '../global/ButtonCTA';
import { useAtomValue, useSetAtom } from 'jotai';
import { pollingChainIdAtom, setLoadingAtom } from '@/store/loading';
import { trpc, trpcClient } from '@/trpc/client';
import { formatAmountShort } from '@/utils/utils';
import { Chain, Netname } from '@/utils/types';
import { chains } from '@/utils/config';
import DynamicChainIcon from '@/components/global/DynamicChainIcon';
import { useScreenSize } from '@/hooks/useScreenSize';

export default function FormBounty({
  open,
  onClose,
  prefilledAlbum,
  showChainSelector = false,
}: {
  open: boolean;
  onClose: () => void;
  prefilledAlbum?: string;
  showChainSelector?: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [album, setAlbum] = useState(prefilledAlbum || '');
  const [usdPerToken, setUsdPerToken] = useState<number | null>(null);
  const [isOpenBounty, setIsOpenBounty] = useState(true);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const chain = useGetChain();
  const [currentChain, setCurrentChain] = useState<Chain>(chain);
  const price =
    trpc.fetchPrice.useQuery({ currency: currentChain.currency }).data ?? 0;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const usdRef = useRef<HTMLSpanElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isMobile = useScreenSize();

  const { data: albums } = trpc.albums.useQuery(
    { contains: album },
    {
      enabled: !!album,
      staleTime: 30_000,
    }
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && isMobile) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 320);
      textarea.style.height = `${newHeight}px`;
    }
  }, [description]);

  useEffect(() => {
    if (amount) {
      const value = Number(amount);
      if (!isNaN(value) && value > 0) {
        setUsdPerToken(parseFloat((value * price).toFixed(2)));
      }
    }
  }, [price, amount]);

  const writeContract = useWriteContract({});
  const account = useAccount();
  const switctChain = useSwitchChain();
  const router = useRouter();
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const pollingChainId = useAtomValue(pollingChainIdAtom);
  const saveBountyAlbum = trpc.saveBountyAlbum.useMutation();

  const createBountyMutations = useMutation({
    mutationFn: async (formData: {
      name: string;
      description: string;
      amount: string;
      album: string;
    }) => {
      const chainId = await account.connector?.getChainId();
      if (currentChain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Switching network' });
        await switctChain.switchChainAsync({ chainId: currentChain.id });
      }

      setLoading({
        isLoading: true,
        status: 'Waiting approval',
      });

      const tx = await writeContract.writeContractAsync({
        abi,
        address: currentChain.contracts.mainContract as `0x${string}`,
        functionName: isOpenBounty ? 'createOpenBounty' : 'createSoloBounty',
        value: BigInt(parseEther(formData.amount)),
        args: [formData.name, formData.description],
        chainId: currentChain.id,
      });
      setPollingChainId(currentChain.id);

      setLoading({
        isLoading: true,
        status: 'Waiting for receipt',
      });
      const receipt = await currentChain.provider.waitForTransactionReceipt({
        hash: tx,
      });

      const log = receipt.logs[0];
      if (!log) {
        throw new Error('No logs found');
      }

      const data = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics,
      });

      if (data.eventName !== 'BountyCreated') {
        throw new Error('Invalid event: ' + data.eventName);
      }

      for (let i = 0; i < 60; i++) {
        setLoading({ isLoading: true, status: `Indexing ${i}s...` });
        const bounty = await trpcClient.isBountyCreated.query({
          id: Number(data.args.id),
          chainId: pollingChainId ?? currentChain.id,
        });

        if (bounty) {
          const usd = Number(formData.amount) * price;
          return {
            bountyId: data.args.id.toString(),
            album: formData.album.trim(),
            bountyTitle: formData.name,
            bountyUsd: usd,
            creatorAddress: account.address ?? '',
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to index bounty');
    },
    onSuccess: async ({ bountyId, album, bountyUsd, bountyTitle }) => {
      saveBountyAlbum.mutate({
        bountyId: Number(bountyId),
        chainId: pollingChainId ?? currentChain.id,
        album,
      });
      setLoading({ isLoading: false, status: '' });
      router.push(
        `/${currentChain.slug}/bounty/${bountyId}?indexing=true&showSuccessCreationModal=true`
      );
      toast.success('Bounty created successfully');

      try {
        if (bountyUsd && bountyUsd >= 100) {
          await trpcClient.notifyFarcasterOfHighBounty.mutate({
            bountyUsd,
            bountyTitle,
            chainSlug: currentChain.slug,
            bountyId,
            creatorAddress: account.address!,
          });
        }
      } catch (e) {
        console.error('failed to send bounty notifications', e);
      }
    },
    onError: (error) => {
      toast.error('Failed to create bounty: ' + error.message);
    },
    onSettled: () => {
      setLoading({ isLoading: false, status: '' });
    },
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const generateBounty = trpc.generateBounty.useMutation({
    onMutate: async () => {
      setName('Generating…');
      setDescription('Generating…');
    },
    onSuccess: (bounty) => {
      setName(bounty.title);
      setDescription(bounty.description);
      toast.success('Bounty generated successfully');
    },
    onError: (error) => {
      setName('');
      setDescription('');
      toast.error('Failed to generate bounty: ' + error.message);
    },
  });

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
      }}
      maxWidth='xs'
      fullWidth
      PaperProps={{
        className: 'bg-poidhBlue/90',
        style: {
          borderRadius: '30px',
          color: 'white',
          border: '1px solid #D1ECFF',
        },
      }}
    >
      <DialogContent>
        <Box display='flex' flexDirection='column' width='100%'>
          <span className={cn(generateBounty.isPending && 'animate-pulse')}>
            title
          </span>
          <input
            disabled={generateBounty.isPending}
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='border py-2 px-2 rounded-md mb-4 bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse'
          />
          <span className={cn(generateBounty.isPending && 'animate-pulse')}>
            description
          </span>
          <textarea
            ref={textareaRef}
            disabled={generateBounty.isPending}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className='border py-2 px-2 rounded-md mb-4 bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse placeholder:text-slate-400 resize-y min-h-[60px] max-h-80 overflow-y-auto touch-manipulation'
            placeholder='pro tip: be detailed and add a deadline'
            style={{
              resize: 'vertical',
            }}
          ></textarea>

          <span>reward</span>
          <div className='relative w-full mb-3'>
            <input
              ref={inputRef}
              type='number'
              step='any'
              placeholder={`amount in ${currentChain.currency}`}
              value={amount}
              maxLength={15}
              onChange={(e) => {
                const raw = e.target.value;
                const integerPart = raw.split(/[.,]/)[0];
                if (integerPart.length > 20) return;

                setAmount(raw);
                const value = Number(raw);
                if (!isNaN(value) && value > 0) {
                  setUsdPerToken(parseFloat((value * price).toFixed(2)));
                } else {
                  setUsdPerToken(null);
                }
              }}
              className={`border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md w-full overflow-hidden whitespace-nowrap text-ellipsis transition-colors duration-150 placeholder:text-slate-400 ${
                amount && showChainSelector ? 'pr-40' : 'pr-28'
              }`}
            />
            {showChainSelector && (
              <>
                <Button
                  id='basic-button'
                  aria-controls={menuOpen ? 'basic-menu' : undefined}
                  aria-haspopup='true'
                  aria-expanded={menuOpen ? 'true' : undefined}
                  onClick={handleClick}
                  className='absolute right-2 top-1/2 -translate-y-1/2 border-[#D1ECFF] border rounded-lg backdrop-blur-sm bg-white/30 p-1 h-9 w-9 flex items-center justify-center hover:bg-white/20'
                >
                  <DynamicChainIcon chain={currentChain.slug} size={20} />
                  <span className='ml-1 color-white'>
                    <ExpandMoreIcon size={12} />
                  </span>
                </Button>
                <Menu
                  id='basic-menu'
                  anchorEl={anchorEl}
                  open={menuOpen}
                  onClose={handleClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  MenuListProps={{
                    'aria-labelledby': 'basic-button',
                  }}
                  sx={{
                    '& .MuiPaper-root': {
                      backdropFilter: 'blur(8px)',
                      background:
                        'linear-gradient(to top, rgba(209, 236, 255, 0.2) 10%, rgba(209, 236, 255, 0.1) 30%, rgba(209, 236, 255, 0.05) 50%)',
                      color: '#FFF',
                      marginTop: '0.25rem',
                      fontFamily: 'GeistMono-Regular',
                      fontSize: '0.875rem',
                      transform: 'translateX(-12px)',
                    },
                    '& .MuiMenuItem-root': {
                      fontFamily: 'GeistMono-Regular',
                      fontSize: '0.875rem',
                    },
                    '& .MuiList-root': {
                      gap: '1.25rem',
                    },
                  }}
                >
                  {Object.entries(chains).map(([netname, ch]) => (
                    <MenuItem
                      key={netname}
                      className={cn('mx-1')}
                      onClick={() => {
                        setCurrentChain(ch);
                        handleClose();
                      }}
                    >
                      <DynamicChainIcon chain={netname as Netname} size={18} />
                      <p className='ml-4'>{netname}</p>
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
            {usdPerToken !== null && (
              <span
                ref={usdRef}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-300 font-semibold pointer-events-none max-w-[120px] truncate text-right px-2 rounded-md ${
                  showChainSelector ? 'right-16' : 'right-4'
                }`}
              >
                (${formatAmountShort(usdPerToken)})
              </span>
            )}
          </div>
          <div className='flex text-balance gap-2 text-xs mb-4 items-center'>
            <InfoIcon size={18} /> a 2.5% fee is deducted from completed
            bounties
          </div>

          <span className={cn(generateBounty.isPending && 'animate-pulse')}>
            album
          </span>
          <div className='relative mb-4'>
            <input
              disabled={generateBounty.isPending}
              type='text'
              value={album}
              onChange={(e) => {
                if (!showAlbumDropdown) {
                  setShowAlbumDropdown(true);
                }
                const next = e.target.value.match(/^[^\s]*/)?.[0] ?? '';
                setAlbum(next.toLowerCase());
              }}
              onFocus={() => setShowAlbumDropdown(true)}
              onBlur={() => setShowAlbumDropdown(false)}
              className='border py-2 px-2 rounded-md bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse placeholder:text-slate-400 w-full'
              placeholder='optional'
              maxLength={30}
              onKeyDown={(e) => {
                if (/\s/.test(e.key)) {
                  e.preventDefault();
                }
              }}
            />
            {showAlbumDropdown && album && albums && albums.length > 0 && (
              <ul className='absolute left-0 top-full mt-1 w-full z-20 bg-poidhBlue/95 border border-[#D1ECFF] rounded-md max-h-20 overflow-y-auto'>
                {albums.map((c) => (
                  <li
                    key={c.album}
                    className='px-3 py-1 hover:bg-[#D1ECFF]/20 cursor-pointer whitespace-nowrap'
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setAlbum(c.album);
                      setShowAlbumDropdown(false);
                    }}
                  >
                    {c.album.length > 20 ? `${c.album.slice(0, 20)}…` : c.album}{' '}
                    ({c._count.album})
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className='flex items-center justify-start gap-2'>
            <span>{isOpenBounty ? 'Open Bounty' : 'Solo Bounty'}</span>
            <Switch
              checked={isOpenBounty}
              onClick={() => setIsOpenBounty(!isOpenBounty)}
              inputProps={{ 'aria-label': 'controlled' }}
              sx={{
                '& .MuiSwitch-thumb': {
                  color: isOpenBounty ? '#F15E5F' : 'default',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#fff',
                },
              }}
            />
          </div>
          <div className=' text-xs'>
            <span className='flex gap-2 items-center max-w-md '>
              <InfoIcon size={18} />
              {isOpenBounty
                ? 'users can add additional funds to your bounty'
                : 'you are the sole bounty contributor'}
            </span>
          </div>
          <div className='mt-6 flex flex-col items-center w-full'>
            <button
              className={cn(
                'flex flex-row items-center justify-center',
                account.isDisconnected && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => {
                if (name && description && amount) {
                  const formData = {
                    name,
                    description,
                    amount,
                    album,
                  };

                  onClose();
                  setUsdPerToken(null);
                  setName('');
                  setDescription('');
                  setAmount('');
                  setAlbum('');
                  createBountyMutations.mutate(formData);
                } else {
                  toast.error(
                    'Please fill in all required fields and check wallet connection.'
                  );
                }
              }}
              disabled={account.isDisconnected}
            >
              <div className='button'>
                <GameButton />
              </div>
              <ButtonCTA>create bounty</ButtonCTA>
            </button>
            <div className='mt-5 w-full flex justify-center items-center flex-row'>
              <span className='mr-2 whitespace-nowrap'>
                need a bounty idea? click the
              </span>
              <button
                className='cursor-pointer items-center text-center disabled:cursor-not-allowed'
                onClick={() => generateBounty.mutate()}
                disabled={generateBounty.isPending}
              >
                🤖
              </button>
            </div>
          </div>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
