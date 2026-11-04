import { formatAmount } from '@/utils/utils';
import { formatEther } from 'viem';
import { ChainId } from '@/utils/types';
import { getChainById } from '@/utils/config';
import { resolveHumanReadableNames } from '@/utils/web3';
import DynamicChainIcon from '@/components/global/DynamicChainIcon';
import PatternAvatar from '@/components/global/PatternAvatar';

export type BountyPreviewData = {
  title: string;
  amount: string;
  chainId: ChainId;
  currencyRate: number;
  participants: string[];
};

export type FarcasterUser = {
  username: string;
  pfp_url: string;
};

type PreviewParticipant = {
  address: string;
  label: string;
  pfpUrl?: string;
};

export default async function BountyPreviewCard({
  bountyData,
  farcasterParticipants,
  imageFormat = 'og',
}: {
  bountyData: BountyPreviewData;
  farcasterParticipants: { [address: string]: FarcasterUser[] };
  imageFormat?: 'og' | 'preview';
}) {
  const chain = getChainById({ chainId: bountyData.chainId });

  const addressesWithoutFarcaster = bountyData.participants.filter(
    (p) => !farcasterParticipants[p]?.[0]?.username
  );

  const resolvedNames = await resolveHumanReadableNames(
    addressesWithoutFarcaster
  );

  const displayParticipants: PreviewParticipant[] = bountyData.participants.map(
    (address) => ({
      address,
      pfpUrl: farcasterParticipants[address]?.[0]?.pfp_url,
      label:
        farcasterParticipants[address]?.[0]?.username ??
        resolvedNames[address] ??
        address.slice(0, 6),
    })
  );

  const contributorRowCount = estimateContributorRowCount({
    imageFormat,
    participants: displayParticipants,
  });

  const amountFontSize =
    imageFormat === 'preview'
      ? contributorRowCount <= 2
        ? '38px'
        : contributorRowCount === 3
          ? '34px'
          : '30px'
      : contributorRowCount <= 2
        ? '60px'
        : contributorRowCount === 3
          ? '50px'
          : '44px';

  const contributorFontSize = imageFormat === 'preview' ? '22px' : '36px';
  const contributorRowGap = imageFormat === 'preview' ? '4px' : '8px';
  const contributorColumnGap = imageFormat === 'preview' ? '16px' : '24px';
  const contributorMaxHeight = imageFormat === 'preview' ? '120px' : '204px';
  const participantBottomMargin = imageFormat === 'preview' ? '4px' : '8px';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: imageFormat === 'preview' ? '16px' : '42px',
        paddingBottom: imageFormat === 'preview' ? '12px' : '42px',
        paddingTop: imageFormat === 'preview' ? '36px' : '42px',
        display: 'flex',
        flexDirection: 'column',
        background:
          'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)',
        color: 'white',
        fontFamily: 'Inter',
      }}
    >
      <h3
        style={{
          fontSize: imageFormat === 'preview' ? '34px' : '52px',
          fontWeight: 700,
          margin: 0,
          marginBottom: imageFormat === 'preview' ? '14px' : '24px',
          lineHeight: 1.2,
          wordWrap: 'break-word',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          textOverflow: 'ellipsis',
          minHeight: '76px',
        }}
      >
        {bountyData.title}
      </h3>

      <div
        style={{
          marginTop: imageFormat === 'preview' ? '0px' : '12px',
          display: 'flex',
          flexWrap: 'wrap',
          rowGap: contributorRowGap,
          fontSize: '20px',
          overflow: 'hidden',
        }}
      >
        {displayParticipants.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              rowGap: contributorRowGap,
              fontSize: contributorFontSize,
              maxHeight: contributorMaxHeight,
              columnGap: contributorColumnGap,
              overflow: 'hidden',
            }}
          >
            <span style={{ display: 'flex' }}>contributors:</span>

            {displayParticipants.map((participant) => {
              const size = imageFormat === 'preview' ? 32 : 52;
              const marginRight = imageFormat === 'preview' ? '6px' : '12px';

              return (
                <span
                  key={participant.address}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: participantBottomMargin,
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {participant.pfpUrl ? (
                    <img
                      src={participant.pfpUrl}
                      width={size}
                      height={size}
                      alt='participant avatar'
                      style={{
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0,
                        marginRight,
                      }}
                    />
                  ) : (
                    <PatternAvatar
                      seed={participant.address}
                      size={size}
                      marginRight={marginRight}
                    />
                  )}

                  <span>{participant.label}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: amountFontSize,
          fontWeight: 600,
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '8px',
          lineHeight: 1.1,
        }}
      >
        {formatAmount({
          amount: formatEther(BigInt(bountyData.amount)),
          price: bountyData.currencyRate.toString(),
          currency: chain.currency,
          precision: 4,
        })}
      </div>

      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
        }}
      >
        <div
          style={{
            height: imageFormat === 'preview' ? '42px' : '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <img
            src='https://poidh.xyz/Logo_poidh.svg'
            width={imageFormat === 'preview' ? 84 : 124}
            height={imageFormat === 'preview' ? 42 : 64}
            alt='POIDH Logo'
            style={{
              objectFit: 'contain',
            }}
          />
        </div>

        <DynamicChainIcon
          chain={chain.slug}
          size={imageFormat === 'preview' ? 32 : 48}
        />
      </div>
    </div>
  );
}

function estimateContributorRowCount({
  imageFormat,
  participants,
}: {
  imageFormat: 'og' | 'preview';
  participants: PreviewParticipant[];
}) {
  if (participants.length === 0) {
    return 0;
  }

  const availableWidth = imageFormat === 'preview' ? 568 : 1116;
  const fontSize = imageFormat === 'preview' ? 22 : 36;
  const avatarSize = imageFormat === 'preview' ? 32 : 52;
  const avatarGap = imageFormat === 'preview' ? 6 : 12;
  const itemGap = imageFormat === 'preview' ? 16 : 24;
  const charWidth = fontSize * 0.56;

  const labelWidth = 'contributors:'.length * charWidth;

  let rows = 1;
  let currentRowWidth = labelWidth + itemGap;

  for (const participant of participants) {
    const nameWidth = participant.label.length * charWidth;
    const itemWidth = avatarSize + avatarGap + nameWidth + itemGap;

    if (currentRowWidth + itemWidth > availableWidth) {
      rows += 1;
      currentRowWidth = itemWidth;
    } else {
      currentRowWidth += itemWidth;
    }
  }

  return rows;
}
