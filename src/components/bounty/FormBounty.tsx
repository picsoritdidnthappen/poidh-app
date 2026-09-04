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
import { ETH_MIN_AMOUNT } from '@/utils/constants';
import MarkdownContent from '@/components/global/MarkdownContent';

const BOUNTY_GUIDE_TEMPLATE = `## Why

Explain why you're creating this bounty and what outcome you're looking for.

## Requirements

- Requirement 1
- Requirement 2
- Requirement 3

## Proof

Explain what evidence a claimant must submit.

## Selecting a winner

poidh is designed so one winner takes the bounty prize.

Explain how the winner will be selected. For example:

- First legitimate claim
- Best submission based on specific criteria
- Random winner among valid submissions
- Highest score, fastest time, most votes, etc.

## Deadline

Submissions close on [date/time].

## Additional notes

Add anything else claimants should know.`;

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
  const [descriptionPreview, setDescriptionPreview] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [descriptionHeight, setDescriptionHeight] = useState<number | null>(
    null
  );
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const chain = useChainInfo();
  const [currentChain, setCurrentChain] = useState<Chain>(
    chain.slug === 'degen' ? chains.base : chain
  );
  const price =
    trpc.web3.fetchPrice.useQuery({ currency: currentChain.currency }).data ??
    0;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const usdRef = useRef<HTMLSpanElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resizeStartRef = useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);
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
        setLoading({
          isLoading: true,
          status: `Indexing ${i}s...`,
        });

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

      onClose();
      setUsdPerToken(null);
      setName('');
      setDescription('');
      setDescriptionHeight(null);
      setAmount('');
      setAlbum(prefilledAlbum);

      setLoading({
        isLoading: true,
        status: 'Redirecting...',
      });

      router.push(
        `/${currentChain.slug}/bounty/${bountyId}?indexing=true&showSuccessCreationModal=true`
      );

      toast.success('Bounty created successfully');
    },

    onError: (error) => {
      toast.error('Failed to create bounty: ' + error.message);
    },

    onSettled: () => {
      setLoading({
        isLoading: false,
        status: '',
      });
    },
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleUseGuide = () => {
    if (description.trim()) {
      setDescription(`${description.trim()}\n\n${BOUNTY_GUIDE_TEMPLATE}`);
    } else {
      setDescription(BOUNTY_GUIDE_TEMPLATE);
    }

    setDescriptionPreview(false);
    setGuideOpen(false);
  };

  const handleDescriptionResizeStart = (
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!isMobile) return;

    const textarea = textareaRef.current;

    if (!textarea) return;

    e.preventDefault();

    e.currentTarget.setPointerCapture(e.pointerId);

    resizeStartRef.current = {
      startY: e.clientY,
      startHeight: textarea.getBoundingClientRect().height,
    };
  };

  const handleDescriptionResizeMove = (
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!resizeStartRef.current) return;

    const nextHeight = Math.max(
      150,
      resizeStartRef.current.startHeight +
        e.clientY -
        resizeStartRef.current.startY
    );

    setDescriptionHeight(nextHeight);
  };

  const handleDescriptionResizeEnd = (
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    resizeStartRef.current = null;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={() => {
          onClose();
        }}
        maxWidth={false}
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          className: 'bg-poidhBlue/90 dark:!bg-[#132b47]',
          sx: {
            borderRadius: isMobile ? '0px' : '30px',
            color: 'white',
            border: isMobile ? 'none' : '1px solid #D1ECFF',

            ...(isMobile
              ? {
                  m: 0,
                  height: '100vh',
                  maxHeight: '100vh',

                  '@supports (height: 100dvh)': {
                    height: '100dvh',
                    maxHeight: '100dvh',
                  },
                }
              : {
                  width: '92vw',
                  maxWidth: '1400px',
                  height: '90vh',
                  maxHeight: '900px',
                  m: 2,
                }),
          },
        }}
        sx={
          isMobile
            ? {
                '& .MuiDialog-paper': {
                  transform: open ? 'translateY(0)' : 'translateY(100%)',
                  transition:
                    'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                },
              }
            : {}
        }
      >
        <DialogContent
          sx={{
            position: 'relative',
            p: isMobile ? 2 : 3,
            height: '100%',
            maxHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflowY: isMobile ? 'auto' : 'hidden',
          }}
        >
          {isMobile ? (
            <div className='flex items-center justify-between w-full sticky shrink-0'>
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
            <>
              <div className='mb-5 pr-8'>
                <h2 className='font-mono text-2xl'>create bounty</h2>

                <p className='text-sm text-white/60 mt-1'>
                  define your outcome
                </p>
              </div>

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
                  zIndex: 10,
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
            </>
          )}

          <Box
            width='100%'
            sx={{
              flex: isMobile ? '0 0 auto' : 1,
              minHeight: isMobile ? 'auto' : 0,
              display: isMobile ? 'flex' : 'grid',
              flexDirection: isMobile ? 'column' : undefined,
              gridTemplateColumns: isMobile
                ? undefined
                : 'minmax(0, 7fr) minmax(300px, 3fr)',
              gap: isMobile ? 0 : 4,
            }}
          >
            <div
              className={
                isMobile ? 'flex flex-col shrink-0' : 'flex flex-col min-h-0'
              }
            >
              <span className={isMobile ? 'mb-2 text-base' : ''}>title</span>

              <input
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='name your bounty'
                className={`border py-2 px-2 rounded-md bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse placeholder:text-slate-400 ${
                  isMobile ? 'text-base py-3 mb-5' : 'py-3 mb-4'
                }`}
              />

              <div className='flex items-center justify-between gap-2 mb-1'>
                <span className={isMobile ? 'text-base' : ''}>
                  description
                </span>

                <div className='flex items-center gap-2 shrink-0'>
                  <button
                    type='button'
                    onClick={() => setGuideOpen(true)}
                    className='px-3 py-1 text-xs border border-[#D1ECFF] rounded-md transition-colors hover:bg-[#D1ECFF]/10'
                  >
                    guide me
                  </button>

                  <div className='flex text-xs border border-[#D1ECFF] rounded-md overflow-hidden'>
                    <button
                      type='button'
                      onClick={() => setDescriptionPreview(false)}
                      className={`px-3 py-1 transition-colors ${
                        !descriptionPreview
                          ? 'bg-[#D1ECFF]/20'
                          : 'hover:bg-[#D1ECFF]/10'
                      }`}
                    >
                      write
                    </button>

                    <button
                      type='button'
                      onClick={() => setDescriptionPreview(true)}
                      className={`px-3 py-1 border-l border-[#D1ECFF] transition-colors ${
                        descriptionPreview
                          ? 'bg-[#D1ECFF]/20'
                          : 'hover:bg-[#D1ECFF]/10'
                      }`}
                    >
                      preview
                    </button>
                  </div>
                </div>
              </div>

              {descriptionPreview ? (
                <div
                  className={`border rounded-md px-3 py-3 border-[#D1ECFF] overflow-y-auto ${
                    isMobile ? 'mb-5' : 'mb-4'
                  } ${
                    isMobile
                      ? 'min-h-[150px]'
                      : 'flex-1 min-h-[300px]'
                  }`}
                  style={{
                    height:
                      isMobile && descriptionHeight
                        ? `${descriptionHeight}px`
                        : undefined,
                  }}
                >
                  {description ? (
                    <MarkdownContent>{description}</MarkdownContent>
                  ) : (
                    <span className='text-slate-400 text-sm'>
                      nothing to preview
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className={
                    isMobile ? 'relative mb-5' : 'relative mb-4'
                  }
                >
                  <textarea
                    ref={textareaRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`border py-3 px-3 rounded-md bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse placeholder:text-slate-400 touch-manipulation w-full ${
                      isMobile
                        ? 'min-h-[150px] text-base pr-9 pb-8'
                        : 'flex-1 min-h-[300px] resize-y'
                    } overflow-y-auto`}
                    placeholder='pro tip: be detailed and add a deadline — markdown supported'
                    style={{
                      resize: isMobile ? 'none' : 'vertical',
                      height:
                        isMobile && descriptionHeight
                          ? `${descriptionHeight}px`
                          : undefined,
                    }}
                  ></textarea>

                  {isMobile && (
                    <div
                      role='separator'
                      aria-label='resize description box'
                      onPointerDown={handleDescriptionResizeStart}
                      onPointerMove={handleDescriptionResizeMove}
                      onPointerUp={handleDescriptionResizeEnd}
                      onPointerCancel={handleDescriptionResizeEnd}
                      className='absolute bottom-[10px] right-1 w-8 h-8 cursor-ns-resize touch-none z-10 select-none flex items-end justify-end'
                    >
                      <svg
                        width='18'
                        height='18'
                        viewBox='0 0 18 18'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                        className='text-[#D1ECFF]/70 pointer-events-none'
                      >
                        <path
                          d='M16 6L6 16'
                          stroke='currentColor'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                        />
                        <path
                          d='M16 10L10 16'
                          stroke='currentColor'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                        />
                        <path
                          d='M16 14L14 16'
                          stroke='currentColor'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                        />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className={
                isMobile
                  ? 'flex flex-col shrink-0'
                  : 'flex flex-col min-h-0 h-full border-l border-white/15 pl-8'
              }
            >
              {!isMobile && (
                <div className='mb-5'>
                  <div className='font-semibold text-sm'>bounty settings</div>

                  <div className='text-xs text-white/50 mt-1'>
                    choose the reward, chain, and bounty type
                  </div>
                </div>
              )}

              <div>
                <span
                  className={isMobile ? 'text-base mb-2' : 'font-semibold'}
                >
                  reward
                </span>

                <div className='relative w-full mt-2'>
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
                        setUsdPerToken(
                          parseFloat((value * price).toFixed(2))
                        );
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

                    <span className='ml-1 text-white'>
                      <ExpandMoreIcon size={12} />
                    </span>
                  </Button>

                  <Menu
                    id='basic-menu'
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={handleClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
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
                    {Object.entries(chains)
                      .filter(([netname]) => netname !== 'degen')
                      .map(([netname, ch]) => (
                        <MenuItem
                          key={netname}
                          className={cn('mx-1')}
                          onClick={() => {
                            setCurrentChain(ch);
                            handleClose();
                          }}
                        >
                          <div className='flex items-center justify-center w-5 h-5'>
                            <DynamicChainIcon
                              chain={netname as Netname}
                              size={netname === 'base' ? 14 : 18}
                            />
                          </div>

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
                      {Number(
                        parseFloat(formatEther(balance.value)).toFixed(
                          currentChain.slug === 'degen' ? 0 : 4
                        )
                      )}{' '}
                      {balance.symbol.toLowerCase()}
                    </p>
                  )}
                </div>

                <div
                  className={`flex text-balance gap-2 text-xs mt-2 items-center ${
                    isMobile ? 'mb-5' : 'mb-6'
                  }`}
                >
                  <InfoIcon size={18} /> a 2.5% fee is deducted from completed
                  bounties
                </div>
              </div>

              <div>
                <span
                  className={isMobile ? 'text-base mb-2' : 'font-semibold'}
                >
                  album
                </span>

                <div
                  className={`relative mt-2 ${
                    isMobile ? 'mb-5' : 'mb-6'
                  }`}
                >
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

                  {showAlbumDropdown &&
                    album &&
                    albums &&
                    albums.length > 0 && (
                      <ul className='absolute left-0 top-full mt-1 w-full z-20 bg-poidhBlue/95 dark:bg-[#132b47] border border-[#D1ECFF] rounded-md max-h-20 overflow-y-auto'>
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
                            {c.album.length > 20
                              ? `${c.album.slice(0, 20)}…`
                              : c.album}{' '}
                            ({c.count.album})
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              </div>

              {isMobile ? (
                <>
                  <div className='flex items-center justify-start gap-2'>
                    <span>{isOpenBounty ? 'Open Bounty' : 'Solo Bounty'}</span>

                    <Switch
                      checked={isOpenBounty}
                      onClick={() => setIsOpenBounty(!isOpenBounty)}
                      inputProps={{
                        'aria-label': 'controlled',
                      }}
                      sx={{
                        '& .MuiSwitch-thumb': {
                          color: isOpenBounty ? '#F15E5F' : 'default',
                        },

                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                          {
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
                </>
              ) : (
                <>
                  <div className='border border-white/15 rounded-lg p-4'>
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <div className='font-semibold text-sm'>
                          {isOpenBounty ? 'open bounty' : 'solo bounty'}
                        </div>

                        <div className='text-xs text-white/60 mt-1'>
                          {isOpenBounty
                            ? 'anyone can contribute funds to your bounty'
                            : 'you are the sole bounty contributor'}
                        </div>
                      </div>

                      <Switch
                        checked={isOpenBounty}
                        onClick={() => setIsOpenBounty(!isOpenBounty)}
                        inputProps={{
                          'aria-label': 'controlled',
                        }}
                        sx={{
                          '& .MuiSwitch-thumb': {
                            color: isOpenBounty ? '#F15E5F' : 'default',
                          },

                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                            {
                              backgroundColor: '#fff',
                            },
                        }}
                      />
                    </div>
                  </div>

                  <p className='text-xs text-white/50 mt-3'>
                    questions?{' '}
                    <a
                      href='https://docs.poidh.xyz/using-poidh/creating-a-bounty.html'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='underline hover:text-white'
                    >
                      check out our bounty creation docs
                    </a>
                  </p>
                </>
              )}

              <div
                className={
                  isMobile
                    ? 'mt-6 flex flex-col items-center w-full shrink-0'
                    : 'mt-auto mb-4 flex flex-col items-center w-full'
                }
              >
                <button
                  className={cn(
                    'flex flex-row items-center justify-center',
                    account.isDisconnected && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => {
                    if (name && description && amount) {
                      const minValue = ETH_MIN_AMOUNT;

                      if (Number(amount) < minValue) {
                        toast.error(
                          `Minimum amount is ${minValue} ${currentChain.currency.toUpperCase()}`
                        );

                        return;
                      }

                      if (balance && parseEther(amount) > balance.value) {
                        toast.error(
                          'You do not have enough funds for this bounty'
                        );

                        return;
                      }

                      const formData = {
                        name,
                        description,
                        amount,
                        album,
                      };

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
            </div>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        maxWidth='sm'
        fullWidth
        PaperProps={{
          className: 'bg-poidhBlue/95 dark:!bg-[#132b47]',
          sx: {
            borderRadius: isMobile ? '16px' : '20px',
            color: 'white',
            border: '1px solid #D1ECFF',
            m: 2,
            maxHeight: isMobile ? 'calc(100dvh - 32px)' : undefined,
          },
        }}
      >
        <DialogContent
          sx={{
            position: 'relative',
            p: isMobile ? 2.5 : 3,
          }}
        >
          <button
            onClick={() => setGuideOpen(false)}
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
            }}
          >
            <CloseIcon size={12} />
          </button>

          <h2 className='font-semibold text-lg pr-8'>bounty guide</h2>

          <p className='text-sm text-white/60 mt-1 mb-5'>
            a strong bounty usually includes:
          </p>

          <div className='space-y-5 text-sm'>
            <div>
              <div className='font-semibold'>title</div>

              <p className='text-white/60 mt-1'>
                A clear statement of the outcome you want someone to achieve.
              </p>
            </div>

            <div>
              <div className='font-semibold'>why</div>

              <p className='text-white/60 mt-1'>
                Briefly explain why you are creating the bounty and what you
                hope it accomplishes.
              </p>
            </div>

            <div>
              <div className='font-semibold'>requirements</div>

              <p className='text-white/60 mt-1'>
                Spell out the conditions a valid claim must meet. Bullet points
                or numbered lists are usually easiest to follow.
              </p>
            </div>

            <div>
              <div className='font-semibold'>proof</div>

              <p className='text-white/60 mt-1'>
                Explain exactly what evidence claimants need to submit to prove
                they completed the bounty.
              </p>
            </div>

            <div>
              <div className='font-semibold'>selecting a winner</div>

              <p className='text-white/60 mt-1'>
                poidh is designed so one winner takes the bounty prize. Make it
                clear how that winner will be chosen.
              </p>

              <ul className='list-disc pl-5 mt-2 space-y-1 text-white/60'>
                <li>first legitimate claim</li>
                <li>best submission based on specific criteria</li>
                <li>random winner among valid submissions</li>
                <li>highest score, fastest time, most votes, etc.</li>
              </ul>
            </div>

            <div>
              <div className='font-semibold'>deadline</div>

              <p className='text-white/60 mt-1'>
                Say when submissions close, especially if you are comparing
                multiple entries before selecting a winner.
              </p>
            </div>

            <div>
              <div className='font-semibold'>anything else</div>

              <p className='text-white/60 mt-1'>
                Add any extra context, restrictions, links, judging details, or
                other information claimants should know.
              </p>
            </div>
          </div>

          <div className='mt-6 flex justify-end'>
            <button
              type='button'
              onClick={handleUseGuide}
              className='border border-[#D1ECFF] rounded-md px-4 py-2 text-sm hover:bg-[#D1ECFF]/10 transition-colors'
            >
              {description.trim() ? 'append structure' : 'use this structure'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
