'use client';

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import Link from 'next/link';
import { useMemo } from 'react';
import { toast } from 'react-toastify';
import { useAccount, useSendTransaction, useSwitchChain } from 'wagmi';
import {
  ActionDeps,
  ActionName,
  ActionRequest,
  BountyRecord,
  ClaimRecord,
  isSafeProofUri,
  parseActionParams,
  prepareAction,
} from '@/mcp/actions';
import {
  createdBountyOnChainId,
  getSenderKind,
  simulate,
} from '@/mcp/transactions';
import { setLoadingAtom } from '@/store/loading';
import { trpcClient } from '@/trpc/client';
import { chains } from '@/utils/config';
import { getErrorMessage, toastError } from '@/utils/errors';

const TITLES: Record<ActionName, string> = {
  create_bounty: 'create bounty',
  join_bounty: 'add funds',
  submit_claim: 'submit claim',
  accept_claim: 'accept claim',
  vote: 'vote',
  resolve_vote: 'resolve vote',
  withdraw: 'withdraw winnings',
};

const cardClass =
  'rounded-2xl bg-white/20 border border-white/80 backdrop-blur-sm p-6 lg:p-8';
const buttonClass =
  'flex items-center justify-center whitespace-nowrap gap-x-2 rounded-2xl px-5 py-3 text-sm font-semibold bg-gradient-to-r from-poidhRed/35 to-[#158ad6]/50 text-white border border-white/20 hover:from-poidhRed/45 hover:to-[#158ad6]/60 transition-all duration-200 w-full sm:w-fit disabled:opacity-50 disabled:cursor-not-allowed';

/** Reads bounty data for the shared action checks through the tRPC client. */
const clientDeps: ActionDeps = {
  loadBounty: async (chain, id) => {
    try {
      return (await trpcClient.bounties.fetch.query({
        id,
        chainId: chains[chain].id,
      })) as BountyRecord;
    } catch {
      throw new Error(
        `couldn't load bounty ${id} on ${chain}. check the link, or try again.`
      );
    }
  },
  loadClaim: (chain, claimId) =>
    trpcClient.claims.fetch
      .query({ claimId, chainId: chains[chain].id })
      .catch(() => null),
  loadVotingClaim: (chain, id) =>
    trpcClient.claims.fetchVotingClaimByBountyId.query({
      bountyId: id,
      chainId: chains[chain].id,
    }),
  mustUseVoteFlow: (chain, id) =>
    trpcClient.bounties.mustUseVoteFlow.query({
      id,
      chainId: chains[chain].id,
    }),
};

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-col gap-1 sm:flex-row sm:gap-4 py-3 border-t border-white/30 first:border-t-0'>
      <dt className='text-sm opacity-70 sm:w-32 shrink-0'>{label}</dt>
      <dd className='normal-case break-words min-w-0 whitespace-pre-wrap'>
        {children}
      </dd>
    </div>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className='px-5 lg:px-20 pt-10 pb-24'>
      <div className='max-w-2xl mx-auto'>
        <h1 className='text-3xl lg:text-4xl font-bold mb-6'>{title}</h1>
        {children}
      </div>
    </main>
  );
}

/** Proof links are only clickable for schemes poidh can display. */
function ProofLink({ uri }: { uri: string }) {
  if (!isSafeProofUri(uri)) return <span>{uri}</span>;
  return (
    <a
      className='underline'
      href={uri}
      target='_blank'
      rel='noopener noreferrer'
    >
      {uri}
    </a>
  );
}

function RequestDetails({
  request,
  bounty,
  claim,
}: {
  request: ActionRequest;
  bounty?: BountyRecord;
  claim?: ClaimRecord;
}) {
  return (
    <>
      {bounty && (
        <Detail label='bounty'>
          <Link
            className='underline'
            href={`/${request.chain}/bounty/${bounty.id}`}
            target='_blank'
          >
            {bounty.title}
          </Link>
        </Detail>
      )}
      {request.action === 'create_bounty' && (
        <>
          <Detail label='title'>{request.title}</Detail>
          <Detail label='description'>
            <div className='max-h-60 overflow-y-auto'>
              {request.description}
            </div>
          </Detail>
          <Detail label='type'>
            {request.type === 'open'
              ? 'open: anyone can add funds, contributors vote'
              : 'solo: you pick the winner'}
          </Detail>
        </>
      )}
      {request.action === 'submit_claim' && (
        <>
          <Detail label='claim title'>{request.title}</Detail>
          <Detail label='description'>
            <div className='max-h-60 overflow-y-auto'>
              {request.description}
            </div>
          </Detail>
          <Detail label='proof'>
            <ProofLink uri={request.proofUri} />
          </Detail>
        </>
      )}
      {claim && (
        <>
          <Detail
            label={
              request.action === 'accept_claim' ? 'claim' : 'claim under vote'
            }
          >
            {claim.title}
          </Detail>
          <Detail label='claimant'>
            <Link
              className='underline font-mono'
              href={`/account/${claim.issuer}`}
              target='_blank'
            >
              {claim.issuer}
            </Link>
          </Detail>
          <Detail label='proof'>
            <ProofLink uri={claim.url} />
          </Detail>
        </>
      )}
      {request.action === 'vote' && (
        <Detail label='your vote'>{request.approve ? 'yes' : 'no'}</Detail>
      )}
    </>
  );
}

export default function TxApproval({ query }: { query: string }) {
  const parsed = useMemo(
    () => parseActionParams(new URLSearchParams(query)),
    [query]
  );
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const setLoading = useSetAtom(setLoadingAtom);

  const request = parsed.ok ? parsed.request : null;

  // Re-run when the wallet changes: issuer checks depend on the signer.
  const prepared = useQuery({
    queryKey: ['agent-action', query, account.address],
    queryFn: () =>
      prepareAction(request as ActionRequest, clientDeps, account.address),
    enabled: !!request,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Only regular wallets can create bounties (PoidhV3 msg.sender == tx.origin).
  const isZeroDev = account.connector?.id === 'zerodev-wallet';
  const senderKind = useQuery({
    queryKey: ['sender-kind', request?.chain, account.address],
    queryFn: () =>
      getSenderKind(request?.chain ?? 'base', account.address as `0x${string}`),
    enabled: request?.action === 'create_bounty' && !!account.address,
  });
  const smartWalletBlocked =
    request?.action === 'create_bounty' &&
    (isZeroDev || senderKind.data === 'contract');

  // Dry-run from the connected wallet to catch reverts such as voting
  // without a stake or twice. RPC failures (null) never block approval.
  const preflight = useQuery({
    queryKey: ['agent-preflight', query, account.address],
    queryFn: () =>
      simulate(
        (request as ActionRequest).chain,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        prepared.data!.tx,
        account.address as `0x${string}`
      ),
    enabled: !!prepared.data && !!account.address && !smartWalletBlocked,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const preflightFailed = preflight.data?.ok === false ? preflight.data : null;

  const send = useMutation({
    mutationFn: async () => {
      const tx = prepared.data?.tx;
      if (!tx || !request) throw new Error('nothing to approve');
      const chain = chains[request.chain];
      try {
        if (account.chainId !== tx.chainId) {
          setLoading({ isLoading: true, status: 'Switching network' });
          await switchChainAsync({ chainId: tx.chainId });
        }
        setLoading({ isLoading: true, status: 'Waiting for approval' });
        const hash = await sendTransactionAsync({
          to: tx.to,
          data: tx.data,
          value: BigInt(tx.valueWei),
          chainId: tx.chainId,
        });
        setLoading({ isLoading: true, status: 'Waiting for confirmation' });
        const receipt = await chain.provider.waitForTransactionReceipt({
          hash,
        });
        if (receipt.status !== 'success') {
          throw new Error('the transaction reverted onchain');
        }
        return {
          hash,
          explorer: `${chain.explorer}${hash}`,
          createdOnChainId:
            request.action === 'create_bounty'
              ? createdBountyOnChainId(receipt.logs, tx.to)
              : null,
        };
      } finally {
        setLoading({ isLoading: false });
      }
    },
    onSuccess: () => toast.success('transaction confirmed'),
    onError: (error) => toastError('transaction failed', error),
  });

  // A new bounty's page id comes from the indexer, which can lag the
  // receipt; poll for up to a minute, the same window FormBounty allows.
  const createdOnChainId = send.data?.createdOnChainId ?? null;
  const created = useQuery({
    queryKey: ['created-bounty', request?.chain, createdOnChainId?.toString()],
    queryFn: () =>
      trpcClient.bounties.isNewlyCreated.query({
        id: Number(createdOnChainId),
        chainId: chains[(request as ActionRequest).chain].id,
      }),
    enabled: createdOnChainId !== null && !!request,
    refetchInterval: (query) =>
      query.state.data || query.state.dataUpdateCount >= 30 ? false : 2_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const viewUrl = created.data
    ? `/${request?.chain}/bounty/${created.data.id}`
    : prepared.data?.url;

  if (!request) {
    return (
      <Shell title='invalid link'>
        <div className={cardClass}>
          <p className='mb-2'>
            this approval link is missing something or was changed.
          </p>
          <p className='text-sm opacity-70 mb-6'>
            {parsed.ok ? '' : parsed.error}
          </p>
          <Link className='underline' href='/'>
            back to poidh
          </Link>
        </div>
      </Shell>
    );
  }

  const title = TITLES[request.action];

  if (send.data) {
    return (
      <Shell title='done'>
        <div className={cardClass}>
          <p className='mb-6'>{prepared.data?.summary}</p>
          <div className='flex flex-col sm:flex-row gap-3'>
            {viewUrl && (
              <Link className={buttonClass} href={viewUrl}>
                {created.data ? 'view your bounty' : 'view on poidh'}
              </Link>
            )}
            <a
              className='underline text-sm self-center'
              href={send.data.explorer}
              target='_blank'
              rel='noopener noreferrer'
            >
              view transaction
            </a>
          </div>
          {!created.data && (
            <p className='text-sm opacity-70 mt-4'>
              it can take a minute to show up on poidh.
            </p>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={title}>
      <p className='mb-6 opacity-90'>
        this link asks you to approve the action below. anyone can create links
        like this, so check every detail before you approve in your wallet.
        nothing happens until you do.
      </p>

      <div className={cardClass}>
        {prepared.isLoading && <p>checking the bounty…</p>}

        {prepared.isError && (
          <p role='alert'>{getErrorMessage(prepared.error)}</p>
        )}

        {prepared.data && (
          <>
            <p className='font-semibold mb-4 normal-case'>
              {prepared.data.summary}
            </p>
            <dl>
              <Detail label='network'>{chains[request.chain].name}</Detail>
              {prepared.data.tx.valueWei !== '0' && (
                <Detail label='amount'>{prepared.data.tx.valueEth} eth</Detail>
              )}
              <RequestDetails
                request={request}
                bounty={prepared.data.bounty}
                claim={prepared.data.claim}
              />
            </dl>

            <details className='mt-4 text-sm'>
              <summary className='cursor-pointer opacity-70'>
                transaction details
              </summary>
              <div className='mt-2 font-mono text-xs break-all space-y-1 opacity-80'>
                <div>contract: {prepared.data.tx.to}</div>
                <div>function: {prepared.data.tx.functionName}</div>
                <div>data: {prepared.data.tx.data}</div>
              </div>
            </details>
          </>
        )}
      </div>

      {prepared.data && (
        <div className='mt-6 flex flex-col gap-3'>
          {smartWalletBlocked && (
            <p
              role='alert'
              className='rounded-2xl border border-poidhRed/60 bg-poidhRed/20 p-4 text-sm'
            >
              {isZeroDev
                ? 'your poidh wallet is a smart wallet, and only regular wallets can create bounties.'
                : 'this wallet is a smart contract wallet, and only regular wallets can create bounties.'}{' '}
              connect a regular wallet (like metamask, rainbow or coinbase
              wallet) to post this bounty.
            </p>
          )}
          {preflightFailed && (
            <p
              role='alert'
              className='rounded-2xl border border-poidhRed/60 bg-poidhRed/20 p-4 text-sm'
            >
              this would fail onchain from your wallet:{' '}
              {preflightFailed.hint ?? preflightFailed.error}
            </p>
          )}
          {account.isConnected ? (
            <button
              type='button'
              className={buttonClass}
              disabled={
                send.isPending || smartWalletBlocked || !!preflightFailed
              }
              onClick={() => send.mutate()}
            >
              approve in wallet
            </button>
          ) : (
            <button
              type='button'
              className={buttonClass}
              onClick={() => openConnectModal?.()}
            >
              connect wallet to approve
            </button>
          )}
        </div>
      )}
    </Shell>
  );
}
