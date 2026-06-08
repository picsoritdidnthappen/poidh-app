import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { FormEvent, useState } from 'react';
import { toast } from 'react-toastify';
import { useAccount, useSignMessage, useSwitchChain } from 'wagmi';
import { ChainId } from '@/utils/types';
import TextWithLinks from '@/components/global/TextWithLinks';
import { trpc } from '@/trpc/client';
import {
  getBanSignatureFirstLine,
  getCommentSignatureFirstLine,
  getReactionSignatureMessage,
  tryCatchAsync,
} from '@/utils/utils';
import { inferRouterOutputs } from '@trpc/server';
import { type AppRouter } from '@/trpc/trpc';
import { getChainById } from '@/utils/config';
import { FarcasterIcon, TwitterXIcon } from '@/components/global/Icons';
import { formatWalletAddress } from '@/utils/web3';
import { TWITTER_URL } from '../global/SocialMediaLinks';
import FarcasterProfileLink from '@/components/global/FarcasterProfileLink';
import { useConnectModal } from '@rainbow-me/rainbowkit';

type CommentType = inferRouterOutputs<AppRouter>['comments']['fetch'][number];

type CommentFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  submitLabel: string;
  cancelLabel?: string;
  placeholder: string;
  className?: string;
  actionsClassName?: string;
};

function CommentForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  placeholder,
  className = '',
  actionsClassName = 'flex items-center gap-3 flex-wrap',
}: CommentFormProps) {
  return (
    <form className={className} onSubmit={onSubmit}>
      <div className='flex-1 space-y-3'>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className='w-full min-h-[80px] bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm sm:text-base text-white placeholder:text-white/50 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition'
        />

        <div className={actionsClassName}>
          <button
            type='submit'
            className='bg-[#f15e5f] hover:bg-[#cf5d5d] text-white font-semibold text-sm sm:text-base px-4 py-2 rounded-full transition'
          >
            {submitLabel}
          </button>
          {onCancel && cancelLabel ? (
            <button
              type='button'
              onClick={onCancel}
              className='border border-white/20 text-white/80 hover:text-white hover:border-white/40 text-sm sm:text-base px-4 py-2 rounded-full transition'
            >
              {cancelLabel}
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

type CommentsSectionProps = {
  chainId: ChainId;
  bountyId: number;
};

export default function CommentsSection(props: CommentsSectionProps) {
  const chain = getChainById({ chainId: props.chainId });
  const commentsQuery = trpc.comments.fetch.useQuery({ ...props });
  const [newComment, setNewComment] = useState('');

  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const account = useAccount();
  const { signMessageAsync } = useSignMessage();
  const switchChain = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const isAdmin = trpc.admin.isAdmin.useQuery({ address: account.address });

  const commentMutation = trpc.comments.comment.useMutation({
    onSuccess: () => {
      commentsQuery.refetch();
      setReplyDraft('');
      setActiveReplyId(null);
      setNewComment('');
      toast.success('Comment posted');
    },
    onError: (error) => toast.error(`Failed to post comment: ${error.message}`),
  });

  const rateMutation = trpc.comments.rate.useMutation({
    onSuccess: () => {
      commentsQuery.refetch();
    },
    onError: (error) => toast.error(`Failed to rate comment: ${error.message}`),
  });

  const banCommentMutation = trpc.admin.banComment.useMutation({
    onSuccess: () => {
      commentsQuery.refetch();
      toast.success('Comment banned');
    },
    onError: (error) => toast.error(`Failed to ban comment: ${error.message}`),
  });

  const commentsByParent = (commentsQuery.data ?? []).reduce(
    (acc: { [key: string]: CommentType[] }, comment) => {
      const parrentId = comment.parentId || 'root';
      if (!acc[parrentId]) {
        acc[parrentId] = [];
      }
      acc[parrentId].push(comment);
      return acc;
    },
    {}
  );

  function sorting(a: CommentType, b: CommentType) {
    const aUp = a.upvotes ?? 0;
    const bUp = b.upvotes ?? 0;
    const aDown = a.downvotes ?? 0;
    const bDown = b.downvotes ?? 0;

    const upDiff = bUp - aUp;
    if (upDiff !== 0) return upDiff;

    const downDiff = aDown - bDown;
    if (downDiff !== 0) return downDiff;

    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  }

  const topLevelComments = (commentsByParent['root'] || []).sort(sorting);

  async function ensureWalletOnBase() {
    if (!account.address) {
      openConnectModal?.();
      return;
    }

    const chainId = await account.connector?.getChainId();
    if (chainId !== 8453) {
      if (switchChain?.switchChainAsync) {
        const [_, error] = await tryCatchAsync(
          async () => await switchChain.switchChainAsync({ chainId: 8453 })
        );
        if (error) {
          toast.error(error.message);
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

  async function submitComment(body: string, parentId?: number) {
    if (commentMutation.isPending) {
      return;
    }

    if (!body.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    const address = await ensureWalletOnBase();
    if (!address) {
      return;
    }

    const message = getCommentSignatureFirstLine({ address }) + body;

    const signature = await signMessageAsync({ message }).catch(() => null);

    if (!signature) {
      toast.error('Failed to sign message');
      return;
    }

    await commentMutation.mutateAsync({
      address,
      bountyId: props.bountyId,
      chainId: props.chainId,
      signature,
      signatureText: message,
      text: body,
      parrentId: parentId,
    });
  }

  async function rateComment(commentId: number, type: 'upvote' | 'downvote') {
    if (rateMutation.isPending) {
      return;
    }

    const address = await ensureWalletOnBase();
    if (!address) {
      return;
    }

    const message = getReactionSignatureMessage({
      address,
      commentId,
      type,
    });

    const signature = await signMessageAsync({ message }).catch(() => null);
    if (!signature) {
      toast.error('Failed to sign message');
      return;
    }

    await rateMutation.mutateAsync({
      address,
      chainId: props.chainId,
      commentId,
      signature,
      signatureText: message,
      type,
    });
  }

  async function handleNewCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitComment(newComment);
  }

  async function handleBanComment(comment: CommentType) {
    if (banCommentMutation.isPending) {
      return;
    }

    if (!isAdmin.data) {
      toast.error('Only admins can ban comments');
      return;
    }

    const address = await ensureWalletOnBase();
    if (!address) {
      return;
    }

    const message =
      getBanSignatureFirstLine({
        id: comment.id,
        chainId: props.chainId,
        type: 'comment',
      }) + comment.body;

    const signature = await signMessageAsync({ message }).catch(() => null);
    if (!signature) {
      toast.error('Failed to sign message');
      return;
    }

    await banCommentMutation.mutateAsync({
      id: comment.id,
      chainId: props.chainId,
      address,
      chainName: chain.slug,
      message,
      signature,
    });
  }

  function handleReplyToggle(commentId: number | null) {
    if (commentId === null || commentId === activeReplyId) {
      setActiveReplyId(null);
      setReplyDraft('');
      return;
    }

    setActiveReplyId(commentId);
    setReplyDraft('');
  }

  return (
    <>
      <div className='w-full h-4 border-t border-dashed border-white ' />
      <div id='comments-section' className='xl:w-1/2 w:full pt-8'>
        <span className='text-xl font-bold text-left my-2 sm:my-4 lowercase'>
          Comments
        </span>

        <div className='bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 space-y-3 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]'>
          <div className='text-sm text-[#D1ECFF] font-semibold tracking-wide'>
            Add a comment
          </div>
          <CommentForm
            className='flex items-start space-x-3 sm:space-x-4'
            value={newComment}
            onChange={setNewComment}
            onSubmit={handleNewCommentSubmit}
            onCancel={() => setNewComment('')}
            submitLabel='Post comment'
            cancelLabel='Clear'
            placeholder='what are your thoughts?'
            actionsClassName='flex items-center gap-3 flex-wrap'
          />
        </div>

        <div className='space-y-4 sm:space-y-6 pt-3 sm:pt-5'>
          {topLevelComments.length > 0 ? (
            topLevelComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                replies={(commentsByParent[comment.id] || []).sort(sorting)}
                commentsByParent={commentsByParent}
                activeReplyId={activeReplyId}
                onReply={handleReplyToggle}
                replyString={replyDraft}
                setReply={setReplyDraft}
                onSubmitComment={submitComment}
                onRateComment={rateComment}
                isRating={rateMutation.isPending}
                onBanComment={handleBanComment}
                canBan={!!isAdmin.data}
                isBanning={banCommentMutation.isPending}
              />
            ))
          ) : (
            <div className='py-4 text-white/60 text-sm mt-12 text-center xl:w-[200%]'>
              Comments will appear here
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CommentThread({
  comment,
  replies,
  commentsByParent,
  level = 0,
  activeReplyId,
  onReply,
  replyString,
  setReply,
  onSubmitComment,
  onRateComment,
  isRating,
  onBanComment,
  canBan,
  isBanning,
}: {
  comment: CommentType;
  replies: CommentType[];
  commentsByParent: { [key: string]: CommentType[] };
  level?: number;
  activeReplyId: number | null;
  onReply: (commentId: number | null) => void;
  replyString: string;
  setReply: (value: string) => void;
  onSubmitComment: (body: string, parentId?: number) => Promise<void>;
  onRateComment: (
    commentId: number,
    type: 'upvote' | 'downvote'
  ) => Promise<void>;
  isRating: boolean;
  onBanComment: (comment: CommentType) => Promise<void>;
  canBan: boolean;
  isBanning: boolean;
}) {
  const isReplyingHere = activeReplyId === comment.id;

  return (
    <div
      className={`${
        level > 0 ? 'ml-2 sm:ml-8 border-l border-white/20 pl-2 sm:pl-4' : ''
      }`}
    >
      <Comment
        comment={comment}
        onReplyClick={() => onReply(comment.id)}
        isReplying={isReplyingHere}
        onRate={(type) => onRateComment(comment.id, type)}
        isRateLoading={isRating}
        onBan={() => onBanComment(comment)}
        canBan={canBan}
        isBanLoading={isBanning}
      />

      {isReplyingHere && (
        <CommentForm
          className='p-8'
          value={replyString}
          onChange={setReply}
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmitComment(replyString, comment.id);
          }}
          onCancel={() => {
            onReply(null);
            setReply('');
          }}
          submitLabel='Reply'
          cancelLabel='Cancel'
          placeholder='reply...'
          actionsClassName='flex items-center gap-3 flex-wrap'
        />
      )}

      {replies.map((reply) => (
        <CommentThread
          key={reply.id}
          comment={reply}
          replies={commentsByParent[reply.id] || []}
          commentsByParent={commentsByParent}
          level={level + 1}
          activeReplyId={activeReplyId}
          onReply={onReply}
          replyString={replyString}
          setReply={setReply}
          onSubmitComment={onSubmitComment}
          onRateComment={onRateComment}
          isRating={isRating}
          onBanComment={onBanComment}
          canBan={canBan}
          isBanning={isBanning}
        />
      ))}
    </div>
  );
}

function Comment({
  comment,
  onReplyClick,
  isReplying,
  onRate,
  isRateLoading,
  onBan,
  isBanLoading,
  canBan,
}: {
  comment: CommentType;
  onReplyClick?: () => void;
  isReplying?: boolean;
  onRate?: (type: 'upvote' | 'downvote') => void;
  isRateLoading?: boolean;
  onBan?: () => void;
  isBanLoading?: boolean;
  canBan?: boolean;
}) {
  const timestamp = comment.createdAt ? new Date(comment.createdAt) : null;
  const isValidDate = timestamp && !isNaN(timestamp.getTime());

  const signaturePrefix = getCommentSignatureFirstLine({
    address: comment.userAddress,
  });
  const displayBody = comment.body.startsWith(signaturePrefix)
    ? comment.body.slice(signaturePrefix.length)
    : comment.body;

  return (
    <div className='flex space-x-2 sm:space-x-3 p-2 sm:p-4 rounded-lg text-white'>
      <div className='flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 relative'>
        <div className='w-full h-full overflow-hidden rounded-full'>
          <Image
            src={comment.author?.pfpUrl ?? '/images/avatar.png'}
            alt={comment.userAddress}
            width={40}
            height={40}
            unoptimized
            className='w-full h-full object-cover'
          />
        </div>
      </div>

      <div className='flex-1 min-w-0'>
        <div className='flex items-center space-x-2 flex-wrap'>
          <span className='font-bold text-sm sm:text-base'>
            {comment.author?.farcasterTag ??
              formatWalletAddress(comment.userAddress)}
          </span>
          <div className='flex items-center gap-2'>
            {comment.author?.farcasterTag ? (
              <FarcasterProfileLink
                farcasterTag={comment.author.farcasterTag}
                farcasterFid={comment.author.farcasterFid}
                className='text-white/70 hover:text-white transition'
                aria-label='Farcaster profile'
              >
                <FarcasterIcon size={14} />
              </FarcasterProfileLink>
            ) : null}
            {comment.author?.twitterTag ? (
              <a
                href={`${TWITTER_URL}/${comment.author.twitterTag}`}
                target='_blank'
                rel='noreferrer'
                className='text-white/70 hover:text-white transition'
                aria-label='X profile'
              >
                <TwitterXIcon width={14} height={14} />
              </a>
            ) : null}
          </div>
          <span className='text-xs sm:text-sm text-white/60'>
            {isValidDate
              ? formatDistanceToNow(timestamp, { addSuffix: true })
              : 'Invalid date'}
          </span>
        </div>

        <p className='mt-1 sm:mt-2 whitespace-pre-line text-sm sm:text-base break-words'>
          <TextWithLinks>{displayBody}</TextWithLinks>
        </p>

        <div className='mt-1 sm:mt-2 flex items-center space-x-4'>
          <button
            type='button'
            onClick={() => onRate?.('upvote')}
            disabled={!onRate || isRateLoading}
            className='flex items-center space-x-1 text-xs sm:text-sm font-semibold text-white hover:text-white/70 transition disabled:opacity-60 disabled:cursor-not-allowed'
          >
            <span className='text-green-400'>↑</span>
            <span>{comment.upvotes ?? 0}</span>
          </button>

          <button
            type='button'
            onClick={() => onRate?.('downvote')}
            disabled={!onRate || isRateLoading}
            className='flex items-center space-x-1 text-xs sm:text-sm font-semibold text-white hover:text-white/70 transition disabled:opacity-60 disabled:cursor-not-allowed'
          >
            <span className='text-red-400'>↓</span>
            <span>{comment.downvotes ?? 0}</span>
          </button>

          {canBan ? (
            <button
              type='button'
              onClick={onBan}
              disabled={!onBan || isBanLoading}
              className='text-xs sm:text-sm font-semibold text-red-300 hover:text-red-200 transition disabled:opacity-60 disabled:cursor-not-allowed'
            >
              {isBanLoading ? 'Banning...' : 'Ban'}
            </button>
          ) : null}

          <button
            type='button'
            onClick={onReplyClick}
            className='text-xs sm:text-sm font-semibold text-white hover:text-white/50 transition'
          >
            {isReplying ? 'Close reply' : 'Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}
