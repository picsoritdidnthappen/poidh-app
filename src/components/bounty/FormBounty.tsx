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
import { useChainInfo } from '@/hooks/useChainInfo';
import {
  useAccount,
  useBalance,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import { useMutation } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { decodeEventLog, formatEther, parseEther } from 'viem';
import abi from '@/constant/abi/abi';
import { cn } from '@/utils/utils';
import GameButton from '@/components/global/GameButton';
import { ExpandMoreIcon, InfoIcon, CloseIcon } from '@/components/global/Icons';
import { useSetAtom } from 'jotai';
import { pollingChainIdAtom, setLoadingAtom } from '@/store/loading';
import { trpc, trpcClient } from '@/trpc/client';
import { formatAmountShort } from '@/utils/utils';
import { Chain, Netname } from '@/utils/types';
import { chains } from '@/utils/config';
import DynamicChainIcon from '@/components/global/DynamicChainIcon';
import { useScreenSize } from '@/hooks/useScreenSize';
import { ETH_MIN_AMOUNT, DEGEN_MIN_AMOUNT } from '@/utils/constants';

export default function FormBounty({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const prefilledAlbum = pathname?.match(/^\/a\/([^/]+)/)?.[1] ?? '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [album, setAlbum] = useState(prefilledAlbum);
  const [usdPerToken, setUsdPerToken] = useState<number | null>(null);
  const [isOpenBounty, setIsOpenBounty] = useState(true);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const chain = useChainInfo();
  const [currentChain, setCurrentChain] = useState<Chain>(chain);
  const price =
    trpc.web3.fetchPrice.useQuery({ currency: currentChain.currency }).data ??
    0;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const usdRef = useRef<HTMLSpanElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isMobile = useScreenSize();

  const { data: albums } = trpc.albums.fetch.useQuery(
    { contains: album },
    {
      enabled: !!album,
      staleTime: 30_000,
    }
  );

  useEffect(() => {
    if (prefilledAlbum) {
      setAlbum(prefilledAlbum);
    }
  }, [prefilledAlbum]);

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
  const { data: balance } = useBalance({
    address: account.address,
    chainId: currentChain.id,
  });
  const switctChain = useSwitchChain();
  const router = useRouter();
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const saveBountyAlbum = trpc.bounties.addToAlbum.useMutation();

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
        const bounty = await trpcClient.bounties.isNewlyCreated.query({
          id: Number(data.args.id),
          chainId: currentChain.id,
        });

        if (bounty) {
          return {
            bountyId: bounty.id,
            album: formData.album.trim(),
            chainId: bounty.chainId,
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to index bounty');
    },
    onSuccess: async ({ bountyId, album, chainId }) => {
      await saveBountyAlbum.mutateAsync({
        bountyId,
        chainId,
        album,
      });
      setLoading({ isLoading: true, status: 'Redirecting...' });
      router.push(
        `/${currentChain.slug}/bounty/${bountyId}?indexing=true&showSuccessCreationModal=true`
      );
      toast.success('Bounty created successfully');
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

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
      }}
      maxWidth={isMobile ? false : 'xs'}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        className: 'bg-poidhBlue/90',
        sx: {
          borderRadius: isMobile ? '0px' : '30px',
          color: 'white',
          border: isMobile ? 'none' : '1px solid #D1ECFF',
          ...(isMobile && {
            m: 0,
            height: '100vh',
            maxHeight: '100vh',
            '@supports (height: 100dvh)': {
              height: '100dvh',
              maxHeight: '100dvh',
            },
          }),
        },
      }}
      sx={
        isMobile
          ? {
              '& .MuiDialog-paper': {
                transform: open ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
              },
            }
          : {}
      }
    >
      <DialogContent
        sx={{
          position: 'relative',
          p: isMobile ? 2 : 3,
          ...(isMobile && {
            height: '100%',
            maxHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }),
        }}
      >
        {isMobile ? (
          <div className='flex items-center justify-between w-full sticky'>
            <div style={{ width: '40px' }} />{' '}
            <button
              onClick={onClose}
              style={{
                color: 'white',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease',
              }}
            >
              <CloseIcon size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: 10,
              top: 8,
              color: 'white',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'transparent';
            }}
          >
            <CloseIcon size={12} />
          </button>
        )}
        <Box
          display='flex'
          flexDirection='column'
          width='100%'
          sx={{ flex: 1 }}
        >
          <span className={isMobile ? 'mb-2 text-base' : ''}>title</span>
          <input
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`border py-2 px-2 rounded-md mb-4 bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse ${
              isMobile ? 'text-base py-3' : ''
            }`}
          />
          <span className={isMobile ? 'text-base mb-2' : ''}>description</span>
          <textarea
            ref={textareaRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`border py-3 px-3 rounded-md mb-4 bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse placeholder:text-slate-400 resize-y touch-manipulation ${
              isMobile
                ? 'min-h-[150px] max-h-[400px] text-base'
                : 'min-h-[100px] max-h-80'
            } overflow-y-auto`}
            placeholder='pro tip: be detailed and add a deadline'
            style={{
              resize: 'vertical',
            }}
          ></textarea>

          <span className={isMobile ? 'text-base mb-2' : ''}>reward</span>
          <div className='relative w-full'>
            <input
              ref={inputRef}
              type='number'
              step='any'
              placeholder={`amount in ${currentChain.currency}`}
              value={amount}
              maxLength={15}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw.split(/[.,]/)[0].length > 20) return;

                const value = Number(raw);
                setAmount(raw);
                if (!isNaN(value) && value > 0) {
                  setUsdPerToken(parseFloat((value * price).toFixed(2)));
                } else {
                  setUsdPerToken(null);
                }
              }}
              className={`border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md w-full overflow-hidden whitespace-nowrap text-ellipsis transition-colors duration-150 placeholder:text-slate-400 ${
                amount ? 'pr-40' : 'pr-28'
              } ${isMobile ? ' text-base py-3' : ''}`}
            />
            <Button
              id='basic-button'
              aria-controls={menuOpen ? 'basic-menu' : undefined}
              aria-haspopup='true'
              aria-expanded={menuOpen ? 'true' : undefined}
              onClick={handleClick}
              className='absolute right-2 top-1/2 -translate-y-1/2 border-[#D1ECFF] border rounded-lg backdrop-blur-sm bg-white/10 p-1 h-9 w-9 flex items-center justify-center hover:bg-white/20'
            >
              <DynamicChainIcon
                chain={currentChain.slug}
                size={currentChain.slug === 'base' ? 15 : 20}
              />
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
                  <DynamicChainIcon
                    chain={netname as Netname}
                    size={netname === 'base' ? 14 : 18}
                  />
                  <p className='ml-4'>{netname}</p>
                </MenuItem>
              ))}
            </Menu>
            {usdPerToken !== null && (
              <span
                ref={usdRef}
                className='absolute top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none max-w-[120px] truncate text-right px-2 rounded-md right-16'
              >
                (${formatAmountShort({ amount: usdPerToken })})
              </span>
            )}
          </div>
          <div className='min-h-[1px]'>
            {account.address && balance && (
              <p className='text-xs text-white/50 font-mono mb-1 mt-2'>
                balance:{' '}
                {Number(parseFloat(formatEther(balance.value)).toFixed(4))}{' '}
                {balance.symbol.toLowerCase()}
              </p>
            )}
          </div>
          <div className='flex text-balance gap-2 text-xs mb-4 items-center'>
            <InfoIcon size={18} /> a 2.5% fee is deducted from completed
            bounties
          </div>

          <span className={isMobile ? 'text-base mb-2' : ''}>album</span>
          <div className='relative mb-4'>
            <input
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
              className={`border py-2 px-2 rounded-md bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse placeholder:text-slate-400 w-full ${
                isMobile ? 'text-base py-3' : ''
              }`}
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
                    ({c.count.album})
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
          <div className='text-xs'>
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
                  const minValue =
                    currentChain.currency === 'degen'
                      ? DEGEN_MIN_AMOUNT
                      : ETH_MIN_AMOUNT;

                  if (Number(amount) < minValue) {
                    toast.error(
                      `Minimum amount is ${minValue} ${currentChain.currency.toUpperCase()}`
                    );
                    return;
                  }

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
                <p className='text-center mt-1'>create bounty</p>
              </div>
            </button>
          </div>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
