import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { LookupIcon, FarcasterIcon } from '@/components/global/Icons';
import { ChainId } from '@/utils/types';
import TextWithLinks from '@/components/global/TextWithLinks';
import { trpc } from '@/trpc/client';
import { Comments as CommentType } from '@prisma/client';

type CommentsSectionProps = {
  chainId: ChainId;
  bountyId: number;
};

export default function CommentsSection(props: CommentsSectionProps) {
  const commentsQuery = trpc.comments.fetch.useQuery({ ...props });

  const commentsByParent = (commentsQuery.data ?? []).reduce(
    (acc: { [key: string]: CommentType[] }, comment) => {
      const parrentId = comment.parent_id || 'root';
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

    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  }

  const topLevelComments = (commentsByParent['root'] || []).sort(sorting);

  return (
    <div id='comments-section' className='w-full pt-8'>
      <span className='text-xl font-bold text-left my-2 sm:my-4 lowercase'>
        Comments
      </span>
      <div className='border-t border-dashed border-white space-y-4 sm:space-y-6 pt-3 sm:pt-5'>
        {topLevelComments.length > 0 ? (
          topLevelComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={(commentsByParent[comment.id] || []).sort(sorting)}
              commentsByParent={commentsByParent}
            />
          ))
        ) : (
          <div className='py-4 text-white/60 text-sm text-center mt-12'>
            Comments will appear here
          </div>
        )}
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  replies,
  commentsByParent,
  level = 0,
}: {
  comment: CommentType;
  replies: CommentType[];
  commentsByParent: { [key: string]: CommentType[] };
  level?: number;
}) {
  return (
    <div
      className={`${
        level > 0 ? 'ml-2 sm:ml-8 border-l border-white/20 pl-2 sm:pl-4' : ''
      }`}
    >
      <Comment comment={comment} />
      {replies.map((reply) => (
        <CommentThread
          key={reply.id}
          comment={reply}
          replies={commentsByParent[reply.id] || []}
          commentsByParent={commentsByParent}
          level={level + 1}
        />
      ))}
    </div>
  );
}

function Comment({ comment }: { comment: CommentType }) {
  const timestamp = comment.created_at ? new Date(comment.created_at) : null;
  const isValidDate = timestamp && !isNaN(timestamp.getTime());

  const upvotes = comment.upvotes ?? 0;
  const downvotes = comment.downvotes ?? 0;
  const score = upvotes - downvotes;

  return (
    <div className='flex space-x-2 sm:space-x-3 p-2 sm:p-4 rounded-lg text-[#fff]'>
      <div className='flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 relative'>
        <div className='w-full h-full overflow-hidden rounded-full'>
          <Image
            src={'/images/avatar.png'}
            alt={comment.user_address}
            width={40}
            height={40}
            unoptimized
            className='w-full h-full object-cover'
          />
        </div>
        <div className='absolute bottom-0 right-0 bg-[#9064d4] rounded-md p-[0.8px]'>
          <FarcasterIcon size={12} />
        </div>
      </div>

      <div className='flex-1 min-w-0'>
        <div className='flex items-center space-x-2 flex-wrap'>
          <span className='font-bold text-sm sm:text-base'>
            {comment.user_address}
          </span>
          <span className='text-xs sm:text-sm text-white/60'>
            {isValidDate
              ? formatDistanceToNow(timestamp, { addSuffix: true })
              : 'Invalid date'}
          </span>
        </div>

        <p className='mt-1 sm:mt-2 whitespace-pre-line text-sm sm:text-base break-words'>
          <TextWithLinks>{comment.body}</TextWithLinks>
        </p>

        {/* Reddit-style vote row */}
        <div className='mt-1 sm:mt-2 flex items-center space-x-4'>
          {/* Upvotes */}
          <div className='flex items-center space-x-1'>
            <span className='text-green-400 text-xs sm:text-sm font-semibold'>
              ↑ {upvotes}
            </span>
          </div>

          {/* Downvotes */}
          <div className='flex items-center space-x-1'>
            <span className='text-red-400 text-xs sm:text-sm font-semibold'>
              ↓ {downvotes}
            </span>
          </div>

          {/* Score (optional, can hide if you want) */}
          <div className='flex items-center space-x-1'>
            <span className='text-xs sm:text-sm text-white/60'>
              score: {score}
            </span>
          </div>

          <a
            href={`https://warpcast.com`}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center space-x-1 hover:text-gray-400 cursor-pointer ml-4'
          >
            <LookupIcon />
          </a>
        </div>
      </div>
    </div>
  );
}
