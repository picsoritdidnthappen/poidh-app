import Link from 'next/link';
import {
  FormEvent,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import {
  useAccount,
  useSignMessage,
  useSwitchChain,
} from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import DisplayAddress from '@/components/global/DisplayAddress';
import ClaimImageEmbed from '@/components/feed/ClaimImageEmbed';
import TextWithLinks from '@/components/global/TextWithLinks';
import { getChainById } from '@/utils/config';
import { trpc } from '@/trpc/client';
import {
  formatAmount,
  getCommentSignatureFirstLine,
  tryCatchAsync,
} from '@/utils/utils';
import { formatEther } from 'viem';
import {
  ChainId,
  Claim,
} from '@/utils/types';

type ActivityTx = {
  tx: string;
  index?: number;

  bounty?: {
    id: number;
    chainId: number;
    title: string;
    issuer: string;
    amount: string;
  } | null;

  claim?: Claim | null;

  comment?: {
    id: number;
    body: string;
    parentId: number | null;
    replyToAddress: string | null;

    parent?: {
      id: number;
      body: string;
      address: string;
    } | null;
  } | null;

  bountyId: number;
  claimId?: number | null;
  chainId: ChainId;
  address: string;
  action: string;
  timestamp: number | string;
};

export default function Activity({
  activity,
}: {
  activity: ActivityTx;
}) {
  const [replyOpen, setReplyOpen] =
    useState(false);

  const [replyDraft, setReplyDraft] =
    useState('');

  const account = useAccount();
  const { signMessageAsync } =
    useSignMessage();
  const switchChain =
    useSwitchChain();

  const { openConnectModal } =
    useConnectModal();

  const utils = trpc.useUtils();

  const bountyId =
    activity.bounty?.id ??
    activity.bountyId;

  const chainId =
    activity.bounty?.chainId ??
    activity.chainId;

  const chain = getChainById({
    chainId:
      chainId as ChainId,
  });

  const isCommentActivity =
    activity.action ===
      'comment created' ||
    activity.action ===
      'reply created';

  const isReplyActivity =
    activity.action ===
    'reply created';

  const bountyHref =
    chain &&
    bountyId != null
      ? `/${chain.slug}/bounty/${bountyId}${
          isCommentActivity &&
          activity.comment?.id
            ? `#comment-${activity.comment.id}`
            : ''
        }`
      : '#';

  const commentMutation =
    trpc.comments.comment.useMutation({
      onSuccess: async () => {
        setReplyDraft('');
        setReplyOpen(false);

        toast.success(
          'Reply posted'
        );

        await Promise.all([
          utils.accounts.activities.invalidate(),
          utils.comments.fetch.invalidate(
            {
              bountyId,
              chainId:
                chainId as ChainId,
            }
          ),
        ]);
      },

      onError: (error) => {
        toast.error(
          `Failed to post reply: ${error.message}`
        );
      },
    });

  const priceData =
    trpc.web3.fetchPrice.useQuery(
      {
        currency:
          chain?.currency ??
          'eth',
      },
      {
        enabled: Boolean(
          chain?.currency
        ),
        staleTime: 60_000,
        refetchOnWindowFocus:
          false,
      }
    );

  const bountyPrice =
    activity.bounty?.amount &&
    priceData.data &&
    chain
      ? formatAmount({
          amount: formatEther(
            BigInt(
              activity.bounty
                .amount
            )
          ),
          price:
            priceData.data.toString(),
          currency:
            chain.currency,
          precision: 4,
        })
      : '...';

  const dateTime =
    activity.timestamp
      ? (() => {
          const dateObj =
            new Date(
              Number(
                activity.timestamp
              ) * 1000
            );

          const dateStr =
            dateObj.toLocaleDateString(
              'en-GB',
              {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }
            );

          const timeStr =
            dateObj.toLocaleTimeString(
              'en-US',
              {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }
            );

          return {
            date: dateStr,
            time: timeStr,
          };
        })()
      : {
          date: '',
          time: '',
        };

  async function ensureWalletOnBase() {
    if (!account.address) {
      openConnectModal?.();
      return null;
    }

    const walletChainId =
      await account.connector?.getChainId();

    if (walletChainId !== 8453) {
      if (
        switchChain?.switchChainAsync
      ) {
        const [_, error] =
          await tryCatchAsync(
            async () =>
              await switchChain.switchChainAsync(
                {
                  chainId:
                    8453,
                }
              )
          );

        if (error) {
          toast.error(
            error.message
          );

          return null;
        }
      } else {
        toast.error(
          'Something went wrong! Switch to Base network or connect/reconnect your wallet to continue'
        );

        return null;
      }
    }

    return account.address;
  }

  async function handleReplySubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      commentMutation.isPending ||
      !activity.comment?.id
    ) {
      return;
    }

    const body =
      replyDraft.trim();

    if (!body) {
      toast.error(
        'Reply cannot be empty'
      );

      return;
    }

    const address =
      await ensureWalletOnBase();

    if (!address) {
      return;
    }

    const message =
      getCommentSignatureFirstLine(
        {
          address,
        }
      ) + body;

    const signature =
      await signMessageAsync({
        message,
      }).catch(() => null);

    if (!signature) {
      toast.error(
        'Failed to sign message'
      );

      return;
    }

    await commentMutation.mutateAsync(
      {
        address,
        bountyId,
        chainId:
          chainId as ChainId,
        signature,
        signatureText:
          message,
        text: body,
        parrentId:
          activity.comment.id,
      }
    );
  }

  function renderText() {
    const action =
      activity.action || '';

    /*
     * BOUNTY CREATED
     */
    if (
      action ===
      'bounty created'
    ) {
      return (
        <div>
          a new bounty has been
          created 💰
        </div>
      );
    }

    /*
     * CLAIM CREATED
     */
    if (
      action ===
      'claim created'
    ) {
      return (
        <div>
          new claim on
          {activity.bounty
            ?.title ? (
            <span>
              <strong>
                {` `}
                {
                  activity
                    .bounty
                    .title
                }
                {` `}
              </strong>
              valued at
              {` ${bountyPrice} `}
            </span>
          ) : (
            <span>
              {` `} bounty
            </span>
          )}
          📸
        </div>
      );
    }

    /*
     * CLAIM ACCEPTED
     */
    if (
      action ===
      'claim accepted'
    ) {
      return (
        <div>
          a claim has been
          accepted for{' '}
          {activity.bounty
            ?.title ? (
            <strong>
              {activity.bounty
                .title +
                ' 🏆'}
            </strong>
          ) : (
            'this bounty 🏆'
          )}
        </div>
      );
    }

    /*
     * FUNDS ADDED / REMOVED
     */
    if (
      action.startsWith(
        '+'
      ) ||
      action.startsWith(
        '-'
      )
    ) {
      const isAdd =
        action.startsWith(
          '+'
        );

      const verb =
        isAdd
          ? 'added'
          : 'removed';

      const prep =
        isAdd
          ? 'to'
          : 'from';

      const amountRaw =
        action
          .slice(1)
          .trim();

      const contribution =
        priceData.data &&
        chain
          ? formatAmount({
              amount:
                amountRaw,
              currency:
                chain.currency,
              price:
                String(
                  priceData.data
                ),
            })
          : `${amountRaw} ${
              chain?.currency ??
              ''
            }`;

      return (
        <div>
          {verb}{' '}
          {contribution}{' '}
          {prep}{' '}
          {activity.bounty
            ?.title ? (
            <strong>
              {
                activity
                  .bounty
                  .title
              }
            </strong>
          ) : (
            'this bounty'
          )}
        </div>
      );
    }

    /*
     * SUBMITTED FOR VOTE
     */
    if (
      action.includes(
        'submitted for vote'
      )
    ) {
      return (
        <div>
          a claim has been
          nominated for vote,
          contributors have 48
          hours to confirm
        </div>
      );
    }

    /*
     * VOTED
     */
    if (
      action === 'voted'
    ) {
      return (
        <div>
          <DisplayAddress
            address={
              activity.address ??
              ''
            }
            showPfpIfExists={
              false
            }
            showLoadingSkeleton
          />{' '}
          has voted on a claim
          for{' '}
          {activity.bounty
            ?.title ? (
            <strong>
              {
                activity
                  .bounty
                  .title
              }
            </strong>
          ) : (
            'this bounty'
          )}
        </div>
      );
    }

    return null;
  }

  const text =
    renderText();

  if (
    !text &&
    !isCommentActivity
  ) {
    return null;
  }

  return (
    <div className='w-full max-w-full sm:max-w-3xl bg-white/5 border border-white/8 rounded-lg backdrop-blur-sm mt-4 sm:mt-5 overflow-hidden shadow-sm'>
      {isCommentActivity ? (
        <div className='px-4 py-3 sm:px-6 sm:py-4 bg-[#7fb7ee] dark:bg-[#132b47]'>
          <div className='flex items-start justify-between gap-4'>
            <div className='text-sm sm:text-base text-white/90 font-mono leading-relaxed min-w-0'>
              {isReplyActivity
                ? 'reply on '
                : 'comment on '}

              {activity.bounty
                ?.title ? (
                <strong>
                  {
                    activity
                      .bounty
                      .title
                  }
                </strong>
              ) : (
                <span>
                  a bounty
                </span>
              )}

              {' '}💬
            </div>

            <div className='text-xs sm:text-sm text-white/60 whitespace-nowrap ml-auto text-right'>
              <div>
                {
                  dateTime.date
                }
              </div>

              <div>
                {
                  dateTime.time
                }
              </div>
            </div>
          </div>

          <div className='mt-4'>
            {isReplyActivity &&
              activity.comment
                ?.parent && (
                <div className='relative pb-4'>
                  <div className='absolute left-[17px] top-9 -bottom-4 w-px bg-white/25 pointer-events-none' />

                  <div className='relative z-10'>
                    <DisplayAddress
                      address={
                        activity
                          .comment
                          .parent
                          .address
                      }
                      pfpSize={
                        36
                      }
                      showPfpIfExists
                      showFallbackPfp
                      showLoadingSkeleton
                    />
                  </div>

                  <div className='feed-comment-body ml-12 mt-2 rounded-md border px-3 py-2 text-sm sm:text-base text-white/80 whitespace-pre-wrap break-words'>
                    <TextWithLinks>
                      {
                        activity
                          .comment
                          .parent
                          .body
                      }
                    </TextWithLinks>
                  </div>
                </div>
              )}

            <div
              className={`relative ${
                isReplyActivity &&
                activity.comment
                  ?.parent
                  ? 'mt-4'
                  : ''
              }`}
            >
              {isReplyActivity &&
                activity.comment
                  ?.parent && (
                  <div className='absolute left-[17px] -top-4 h-[34px] w-px bg-white/25 pointer-events-none' />
                )}

              <div className='relative z-10'>
                <DisplayAddress
                  address={
                    activity.address ??
                    ''
                  }
                  pfpSize={36}
                  showPfpIfExists
                  showFallbackPfp
                  showLoadingSkeleton
                />
              </div>

              {activity.comment
                ?.body && (
                <div className='feed-comment-body ml-12 mt-2 rounded-md border px-3 py-2 text-sm sm:text-base text-white/90 whitespace-pre-wrap break-words'>
                  <TextWithLinks>
                    {
                      activity
                        .comment
                        .body
                    }
                  </TextWithLinks>
                </div>
              )}

              <div className='ml-12 mt-2'>
                {!replyOpen ? (
                  <button
                    type='button'
                    onClick={() =>
                      setReplyOpen(
                        true
                      )
                    }
                    className='text-xs sm:text-sm font-mono text-white/60 hover:text-white transition-colors'
                  >
                    reply
                  </button>
                ) : (
                  <form
                    onSubmit={
                      handleReplySubmit
                    }
                    className='space-y-2'
                  >
                    <textarea
                      value={
                        replyDraft
                      }
                      onChange={(
                        event
                      ) =>
                        setReplyDraft(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder='write a reply...'
                      disabled={
                        commentMutation.isPending
                      }
                      autoFocus
                      className='w-full min-h-[80px] resize-y rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 disabled:opacity-60'
                    />

                    <div className='flex items-center gap-3'>
                      <button
                        type='submit'
                        disabled={
                          commentMutation.isPending ||
                          !replyDraft.trim()
                        }
                        className='bg-[#f15e5f] hover:bg-[#cf5d5d] disabled:opacity-60 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-full transition'
                      >
                        {commentMutation.isPending
                          ? 'posting...'
                          : 'reply'}
                      </button>

                      <button
                        type='button'
                        disabled={
                          commentMutation.isPending
                        }
                        onClick={() => {
                          setReplyOpen(
                            false
                          );

                          setReplyDraft(
                            ''
                          );
                        }}
                        className='text-xs sm:text-sm text-white/60 hover:text-white disabled:opacity-60 transition-colors'
                      >
                        cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='px-4 py-3 sm:px-6 sm:py-4 bg-[#7fb7ee] dark:bg-[#132b47]'>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex items-center gap-3 min-w-0'>
              <DisplayAddress
                address={
                  activity.action ===
                  'claim accepted'
                    ? activity
                        .bounty
                        ?.issuer ??
                      ''
                    : activity.address ??
                      ''
                }
                pfpSize={36}
                showPfpIfExists
                showFallbackPfp
                showLoadingSkeleton
              />
            </div>

            <div className='text-xs sm:text-sm text-white/60 whitespace-nowrap ml-auto text-right'>
              <div>
                {
                  dateTime.date
                }
              </div>

              <div>
                {
                  dateTime.time
                }
              </div>
            </div>
          </div>

          <div className='mt-3'>
            <div className='text-sm sm:text-base text-white/90 font-mono leading-relaxed'>
              {text}
            </div>
          </div>
        </div>
      )}

      {activity.claim ? (
        <div className='border-t border-white/6'>
          <ClaimImageEmbed
            claim={
              activity.claim
            }
            bountyId={
              bountyId
            }
            chainId={
              chainId as ChainId
            }
          />
        </div>
      ) : (
        <div className='border-t border-white/6 px-4 pb-4 pt-2'>
          {bountyId != null &&
            chain && (
              <div className='mt-3 p-3 sm:p-4 border border-white/6 rounded-md bg-gradient-to-b from-[#2a81d5] via-[#70aae2] to-[#2a81d5] dark:from-[#0d1b2e] dark:via-[#1a3a5c] dark:to-[#0d1b2e]'>
                <Link
                  href={
                    bountyHref
                  }
                  className='flex items-center justify-between gap-4'
                >
                  <div className='flex flex-col flex-1 min-w-0'>
                    <span className='font-mono text-m mb-3 truncate'>
                      {activity
                        .bounty
                        ?.title ??
                        '???'}
                    </span>

                    {activity
                      .bounty
                      ?.amount &&
                      priceData.data &&
                      chain && (
                        <span className='font-mono text-s text-white/70 mt-1'>
                          {
                            bountyPrice
                          }
                        </span>
                      )}
                  </div>

                  <div className='text-xs text-white/60 hover:text-poidhRed shrink-0'>
                    open
                  </div>
                </Link>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
