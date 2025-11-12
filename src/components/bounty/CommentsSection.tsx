import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import {
  HeartIcon,
  LookupIcon,
  FarcasterIcon,
} from '@/components/global/Icons';
import { WarpcastCast } from '@/utils/types';
import TextWithLinks from '@/components/global/TextWithLinks';
import { trpc } from '@/trpc/client';
import { usePathname } from 'next/navigation';

export default function CommentsSection() {
  const pathname = usePathname();

  const data = trpc.comments.useQuery({ url: `https://poidh.xyz/${pathname}` });

  const validComments =
    data.data?.filter(
      (comment) =>
        comment?.hash &&
        comment?.author?.pfp_url &&
        comment?.author?.display_name &&
        comment?.text &&
        comment?.timestamp
    ) || [];

  const commentsByParent = validComments.reduce(
    (acc: { [key: string]: WarpcastCast[] }, comment) => {
      const parentHash = comment.parent_hash || 'root';
      if (!acc[parentHash]) {
        acc[parentHash] = [];
      }
      acc[parentHash].push(comment);
      return acc;
    },
    {}
  );

  const topLevelComments = commentsByParent['root'] || [];

  return (
    <div id='comments-section' className='w-full pt-8'>
      <span className='text-xl font-bold text-left my-2 sm:my-4 lowercase'>
        Comments
      </span>
      <div className='border-t border-dashed border-white space-y-4 sm:space-y-6 pt-3 sm:pt-5'>
        {topLevelComments.length > 0 ? (
          topLevelComments.map((comment) => (
            <CommentThread
              key={comment.hash}
              comment={comment}
              replies={commentsByParent[comment.hash] || []}
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
  comment: WarpcastCast;
  replies: WarpcastCast[];
  commentsByParent: { [key: string]: WarpcastCast[] };
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
          key={reply.hash}
          comment={reply}
          replies={commentsByParent[reply.hash] || []}
          commentsByParent={commentsByParent}
          level={level + 1}
        />
      ))}
    </div>
  );
}

function Comment({ comment }: { comment: WarpcastCast }) {
  const timestamp = comment.timestamp ? new Date(comment.timestamp) : null;
  const isValidDate = timestamp && !isNaN(timestamp.getTime());

  return (
    <div className='flex space-x-2 sm:space-x-3 p-2 sm:p-4 rounded-lg text-[#fff]'>
      <div className='flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 relative'>
        <div className='w-full h-full overflow-hidden rounded-full'>
          <Image
            src={comment.author?.pfp_url || '/images/avatar.png'}
            alt={comment.author?.display_name}
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
            {comment.author?.display_name}
          </span>
          <span className='text-xs sm:text-sm text-white/60'>
            {isValidDate
              ? formatDistanceToNow(timestamp, { addSuffix: true })
              : 'Invalid date'}
          </span>
        </div>
        <p className='mt-1 sm:mt-2 whitespace-pre-line text-sm sm:text-base break-words'>
          <TextWithLinks>{comment.text}</TextWithLinks>
        </p>
        <div className='mt-1 sm:mt-2 flex items-center space-x-4'>
          <button className='flex items-center space-x-1 cursor-default'>
            <HeartIcon />
            <span className='text-xs sm:text-sm text-white/60'>
              {comment.reactions?.likes_count}
            </span>
          </button>
          <a
            href={`https://warpcast.com/${comment.author?.username}/${comment.hash}`}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center space-x-1 hover:text-gray-400 cursor-pointer'
          >
            <LookupIcon />
          </a>
        </div>
      </div>
    </div>
  );
}
