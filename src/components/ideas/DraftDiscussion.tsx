'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { toast } from 'react-toastify';
import { MessageSquare } from 'lucide-react';
import { trpc } from '@/trpc/client';
import { useSession } from '@/components/auth/SessionProvider';
import { SignInCancelledError } from '@/utils/sessionClient';

export default function DraftDiscussion({ cid }: { cid: string }) {
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const { withSession } = useSession();

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [ratingCommentId, setRatingCommentId] =
    useState<number | null>(null);

  const utils = trpc.useUtils();

  const summaries = trpc.ideas.summaries.useQuery(
    {
      cids: [cid],
      viewer: account.address?.toLowerCase(),
    },
    { staleTime: 15_000 }
  );

  const comments = trpc.ideas.comments.useQuery(
    {
      cid,
      viewer: account.address?.toLowerCase(),
    },
    { staleTime: 15_000 }
  );

  const post = trpc.ideas.comment.useMutation({
    onSuccess: () => {
      setText('');
      setReplyTo(null);
      setReplyText('');
      void utils.ideas.comments.invalidate({ cid });
      void utils.ideas.summaries.invalidate();
    },
  });

  const remove = trpc.ideas.deleteComment.useMutation({
    onSuccess: () => {
      void utils.ideas.comments.invalidate({ cid });
      void utils.ideas.summaries.invalidate();
    },
  });

  const rate = trpc.ideas.rateComment.useMutation();

  async function submit(
    event: FormEvent<HTMLFormElement>,
    parentId?: number
  ) {
    event.preventDefault();

    const body = (parentId ? replyText : text).trim();

    if (!body || post.isPending) return;

    if (!account.address) {
      openConnectModal?.();
      return;
    }

    try {
      await withSession(() =>
        post.mutateAsync({ cid, text: body, parentId })
      );
    } catch (error) {
      if (!(error instanceof SignInCancelledError)) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'could not post comment'
        );
      }
    }
  }

  async function deleteComment(id: number) {
    if (remove.isPending) return;

    try {
      await withSession(() =>
        remove.mutateAsync({ cid, id })
      );
    } catch (error) {
      if (!(error instanceof SignInCancelledError)) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'could not delete comment'
        );
      }
    }
  }

  async function rateComment(
    id: number,
    currentVote: -1 | 0 | 1,
    direction: -1 | 1
  ) {
    if (ratingCommentId !== null) return;

    if (!account.address) {
      openConnectModal?.();
      return;
    }

    const value = currentVote === direction ? 0 : direction;

    setRatingCommentId(id);

    try {
      await withSession(() =>
        rate.mutateAsync({ cid, id, value })
      );

      await utils.ideas.comments.invalidate({ cid });
    } catch (error) {
      if (!(error instanceof SignInCancelledError)) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'could not vote on comment'
        );
      }
    } finally {
      setRatingCommentId(null);
    }
  }

  const all = comments.data ?? [];

  type Comment = (typeof all)[number];

  const byParent = new Map<number | null, Comment[]>();

  for (const item of all) {
    const key = item.parentId ?? null;
    const group = byParent.get(key) ?? [];

    group.push(item);
    byParent.set(key, group);
  }

  function renderComments(
    parentId: number | null,
    depth = 0
  ): ReactNode {
    return (byParent.get(parentId) ?? []).map((comment) => (
      <article
        key={comment.id}
        id={`idea-comment-${comment.id}`}
        className={`${
          depth
            ? 'ml-4 border-l border-white/20 pl-4 sm:ml-8'
            : 'border-b border-white/15 py-4'
        } min-w-0`}
      >
        <div className='flex flex-wrap items-center gap-3 text-xs text-white/60'>
          <span className='font-mono'>
            {comment.userAddress.slice(0, 6)}…
            {comment.userAddress.slice(-4)}
          </span>

          <time
            dateTime={new Date(comment.createdAt).toISOString()}
          >
            {new Date(comment.createdAt).toLocaleString()}
          </time>
        </div>

        <p className='mt-2 whitespace-pre-wrap break-words text-sm'>
          {comment.deletedAt ? '[deleted]' : comment.body}
        </p>

        <div className='mt-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm'>
          {!comment.deletedAt && (
            <>
              <button
                type='button'
                aria-label='upvote comment'
                aria-pressed={comment.myVote === 1}
                disabled={ratingCommentId !== null}
                onClick={() =>
                  void rateComment(
                    comment.id,
                    comment.myVote,
                    1
                  )
                }
                className={`flex items-center gap-1 font-semibold transition hover:opacity-70 disabled:opacity-50 ${
                  comment.myVote === 1
                    ? 'text-green-300'
                    : 'text-white'
                }`}
              >
                <span className='text-green-400'>↑</span>
                <span>{comment.upvotes}</span>
              </button>

              <button
                type='button'
                aria-label='downvote comment'
                aria-pressed={comment.myVote === -1}
                disabled={ratingCommentId !== null}
                onClick={() =>
                  void rateComment(
                    comment.id,
                    comment.myVote,
                    -1
                  )
                }
                className={`flex items-center gap-1 font-semibold transition hover:opacity-70 disabled:opacity-50 ${
                  comment.myVote === -1
                    ? 'text-red-300'
                    : 'text-white'
                }`}
              >
                <span className='text-red-400'>↓</span>
                <span>{comment.downvotes}</span>
              </button>

              <button
                type='button'
                className='text-white/70 hover:text-white'
                onClick={() => {
                  setReplyTo(
                    replyTo === comment.id ? null : comment.id
                  );
                  setReplyText('');
                }}
              >
                {replyTo === comment.id
                  ? 'close reply'
                  : 'reply'}
              </button>
            </>
          )}

          {!comment.deletedAt &&
            account.address?.toLowerCase() ===
              comment.userAddress.toLowerCase() && (
              <button
                type='button'
                disabled={remove.isPending}
                className='text-white/70 hover:text-white disabled:opacity-50'
                onClick={() =>
                  void deleteComment(comment.id)
                }
              >
                delete
              </button>
            )}
        </div>

        {replyTo === comment.id && (
          <form
            className='mt-3 space-y-2'
            onSubmit={(event) =>
              void submit(event, comment.id)
            }
          >
            <textarea
              required
              maxLength={5000}
              value={replyText}
              onChange={(event) =>
                setReplyText(event.target.value)
              }
              className='w-full rounded-lg border border-white/25 bg-black/20 p-3 text-sm text-white placeholder:text-white/50'
              placeholder='write a reply...'
            />

            <button
              type='submit'
              disabled={post.isPending || !replyText.trim()}
              className='rounded-md bg-poidhRed px-4 py-2 text-xs disabled:opacity-50'
            >
              post reply
            </button>
          </form>
        )}

        {renderComments(comment.id, depth + 1)}
      </article>
    ));
  }

  return (
    <section
      id='ideas-comments'
      className='mx-auto mt-8 max-w-5xl rounded-3xl border border-white/25 bg-white/5 p-5 normal-case sm:p-8'
    >
      <div className='border-b border-white/20 pb-5'>
        <h2 className='text-xl font-bold'>discussion</h2>

        <p className='mt-2 inline-flex items-center gap-1 text-xs text-white/65'>
          <MessageSquare size={14} />
          {summaries.data?.[0]?.commentCount ?? 0} comments
        </p>
      </div>

      <form
        className='mt-5 space-y-3'
        onSubmit={(event) => void submit(event)}
      >
        <textarea
          required
          maxLength={5000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className='min-h-[90px] w-full rounded-lg border border-white/25 bg-black/20 p-3 text-sm text-white placeholder:text-white/50'
          placeholder='what do you think of this idea?'
        />

        <button
          type='submit'
          disabled={post.isPending || !text.trim()}
          className='rounded-md bg-poidhRed px-5 py-2 text-sm font-semibold disabled:opacity-50'
        >
          {post.isPending ? 'posting...' : 'post comment'}
        </button>
      </form>

      <div className='mt-6'>
        {comments.isLoading && (
          <p className='text-sm text-white/70'>
            loading comments...
          </p>
        )}

        {comments.isError && (
          <p role='alert' className='text-sm text-white/70'>
            comments temporarily unavailable
          </p>
        )}

        {!comments.isLoading &&
          all.length === 0 && (
            <p className='text-sm text-white/60'>
              no comments yet. start the discussion.
            </p>
          )}

        {renderComments(null)}

        {all.length >= 200 && (
          <p className='mt-4 text-xs text-white/60'>
            showing the first 200 comments
          </p>
        )}
      </div>
    </section>
  );
}
