/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unused-imports/no-unused-vars */

'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { ethers } from 'ethers';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Address } from 'viem';

import { ClaimsListAccount, NftList } from '@/components/bounty';
import { FilterButton } from '@/components/ui';
import { BountyList } from '@/components/ui';
import {
  fetchBountyById,
  getBountiesByUser,
  getClaimById,
  getClaimsByUser,
  getContract,
  getNftsOfOwner,
  getProvider,
  getSigner,
  getURI,
} from '@/app/context/web3';
import {
  BountiesData,
  Bounty,
  Claim,
  ClaimsData,
  NFTDetails,
} from '@/types/web3';

const AccountInfo = () => {
  const { isAuthenticated, primaryWallet } = useDynamicContext();
  const [userAddress, setUserAddress] = useState('0x111...123456');
  const [bountiesData, setBountiesData] = useState<BountiesData[]>([]);
  const [claimsData, setClaimsData] = useState<ClaimsData[]>([]);

  const [completedBounties, setCompletedBounties] = useState<BountiesData[]>(
    []
  );
  const [inProgressBounties, setInProgressBounties] = useState<BountiesData[]>(
    []
  );
  const [ETHinContract, setETHinContract] = useState<number>(0);
  const [completedClaims, setCompletedClaims] = useState<ClaimsData[]>([]);
  const [submitedClaims, setSubmitedClaims] = useState<ClaimsData[]>([]);
  const [currentSection, setCurrentSection] = useState<string>('a');
  const [totalETHPaid, setTotalETHPaid] = useState<number>(0);
  const [totalETHEarn, setTotalETHEarn] = useState<number>(0);
  const [poidhScore, setPoidhScore] = useState<number>(0);

  const [nftDetails, setNftDetails] = useState<NFTDetails[] | null>([]);

  const pathname = usePathname();
  const currency =
    getNetworkNameFromPath(pathname) === 'degen' ? 'degen' : 'eth';

  const address = (pathname.split('/').pop() || '') === '';

  const userAccount = primaryWallet?.address === pathname.split('/').pop();
  const path = usePathname(); // Duplicate Code?
  //const [currentNetworkName, setCurrentNetworkName] = useState('');

  // useEffect(() => {
  //   const currentUrl = path.split('/')[1];
  //   if (currentUrl === '') {
  //     setCurrentNetworkName('base');
  //   } else {
  //     setCurrentNetworkName(currentUrl);
  //   }
  // }, []);
  // user info
  useEffect(() => {
    if ((pathname.split('/').pop() || '') !== '') {
      const userInformation2 = async () => {
        const address = pathname.split('/').pop() || '';
        // !- Check for breaking change here with type enforcement
        const balanceNFT = await getNftsOfOwner(address);
        const nftDetailsPromises = balanceNFT.map(async (nftId) => {
          const uri = await getURI(nftId);
          const response = await fetch(uri);
          const data = await response.json();
          const claims = await getClaimById(nftId);

          return {
            name: claims.name,
            description: claims.description,
            nftId: claims.id,
            uri: data?.image,
          } as NFTDetails;
        });

        const completedNFTs = (await Promise.all(nftDetailsPromises)).filter(
          (nft): nft is NFTDetails => nft !== null
        );
        setNftDetails(completedNFTs);

        const formattedAddress = `${address.slice(0, 5)}...${address.slice(
          -6
        )}`;

        // const degenOrEnsName = await getDegenOrEnsName(address);
        // console.log('degenOrEnsName', degenOrEnsName);

        setUserAddress(formattedAddress);
        // !- Check for Breaking Changes Here with type enforcement
        getBountiesByUser(address, 0, []).then((data: Bounty[]) => {
          setBountiesData(data);
          const completedBounties = data.filter(
            (bounty: Bounty) =>
              bounty.issuer !== '0x0000000000000000000000000000000000000000' &&
              bounty.issuer.toLowerCase() !== address.toLowerCase()
          );
          const inProgressBounties = data.filter(
            (bounty: Bounty) =>
              bounty.issuer === '0x0000000000000000000000000000000000000000'
          );
          setInProgressBounties(inProgressBounties);

          setCompletedBounties(completedBounties);
        });
        // !- Check for Breaking Changes Here with type enforcement
        getClaimsByUser(address).then((data) => {
          setClaimsData(data);
          const completedClaims = data.filter(
            (claim: Claim) => claim.accepted === true
          );
          const submitedClaims = data;
          setCompletedClaims(completedClaims);
          setSubmitedClaims(submitedClaims);
        });
      };

      userInformation2().catch(console.error);
    }
  }, [primaryWallet, isAuthenticated]);

  useEffect(() => {
    const fetchClaimInformation = async () => {
      const signer = await getSigner(primaryWallet);

      const provider = await getProvider();
      const contract = await getContract(signer);
      const claimInformationPromises = completedBounties.map(async (bounty) => {
        const uri = await getURI(bounty.claimId);
        const amount = bounty.amount;
        return {
          claimId: bounty.claimId,
          claimURI: uri,
          amount: amount,
        };
      });
      const claimInformation = await Promise.all(claimInformationPromises);
    };

    fetchClaimInformation();
  }, [completedBounties]);

  useEffect(() => {
    let totalAmount = BigInt(0);
    completedBounties.forEach((bounty) => {
      totalAmount += BigInt(bounty.amount);
    });
    const totalAmountETH = ethers.formatEther(totalAmount);
    setTotalETHPaid(Number(totalAmountETH));
  }, [completedBounties]);

  useEffect(() => {
    let totalAmount = BigInt(0);
    inProgressBounties.forEach((bounty) => {
      totalAmount += BigInt(bounty.amount);
    });
    const totalAmountETH = ethers.formatEther(totalAmount);
    setETHinContract(Number(totalAmountETH));
  }, [inProgressBounties]);

  useEffect(() => {
    const bountyIds = completedClaims.map((claim) => claim.bountyId);

    let totalAmount = BigInt(0);

    Promise.all(
      bountyIds.map(async (bountyId) => {
        const bountyData = await fetchBountyById(bountyId);
        const amountBigInt = BigInt(bountyData.amount);
        totalAmount += amountBigInt;
        const totalAmountEarnETH = ethers.formatEther(totalAmount);
        setTotalETHEarn(Number(totalAmountEarnETH) * 0.975);
      })
    );
  }, [completedClaims]);

  useEffect(() => {
    const poidhScore =
      totalETHEarn * 1000 +
      totalETHPaid * 1000 +
      (nftDetails?.length ?? 0) * 10;
    setPoidhScore(Number(poidhScore));
  }, [
    completedBounties,
    inProgressBounties,
    nftDetails,
    totalETHEarn,
    totalETHPaid,
    primaryWallet,
  ]);

  const handleFilterButtonClick = (section: string) => {
    setCurrentSection(section);
  };

  return (
    <div>
      {isAuthenticated && address ? (
        <div>
          <div className='flex flex-col lg:flex-row lg:justify-between lg:items-start'>
            <div>
              <div className='flex flex-col border-b border-dashed'>
                <span>user</span>
                <span className='text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl'>
                  {userAddress}
                </span>
              </div>
              <div className='flex flex-col'>
                <div>
                  completed bounties:{' '}
                  <span className='font-bold'> {nftDetails?.length}</span>
                </div>
                <div>
                  total {currency} paid:{' '}
                  <span className='font-bold'>{totalETHPaid}</span>{' '}
                </div>
                <div>
                  in progress bounties:{' '}
                  <span className='font-bold'>{inProgressBounties.length}</span>{' '}
                </div>
                <div>
                  total {currency} in contract:{' '}
                  <span className='font-bold'>{ETHinContract}</span>{' '}
                </div>
                <div>
                  completed claims:{' '}
                  <span className='font-bold'>{completedClaims.length}</span>
                </div>
                <div>
                  total {currency} earned:{' '}
                  <span className='font-bold'>{totalETHEarn}</span>
                </div>
              </div>
            </div>

            <div className='flex flex-col '>
              <span>poidh score:</span>
              <span className='text-4xl text-[#F15E5F] border-y border-dashed'>
                {poidhScore}
              </span>
            </div>
          </div>

          <div className='flex flex-row overflow-x-scroll items-center py-12 border-b border-white lg:justify-center gap-x-5 '>
            <FilterButton
              onClick={() => handleFilterButtonClick('a')}
              show={currentSection !== 'a'}
            >
              nft's ({nftDetails?.length})
            </FilterButton>
            <FilterButton
              onClick={() => handleFilterButtonClick('b')}
              show={currentSection !== 'b'}
            >
              {' '}
              {userAccount ? 'your bounties' : 'user bounties'} bounties (
              {bountiesData.length})
            </FilterButton>
            <FilterButton
              onClick={() => handleFilterButtonClick('c')}
              show={currentSection !== 'c'}
            >
              submitted claims ({submitedClaims.length})
            </FilterButton>
            {/* <FilterButton onClick={() => handleFilterButtonClick('c')} show={currentSection !== 'd'}  >collab bounties (0)</FilterButton> */}
          </div>

          <div>
            {currentSection === 'a' && (
              <div>
                <NftList nftDetails={nftDetails} />
                {/* <BountyList  bountiesData={completedBounties} /> */}
              </div>
            )}
            {currentSection === 'b' && (
              <div>
                <BountyList bountiesData={bountiesData} />
              </div>
            )}
            {currentSection === 'c' && (
              <div>
                <ClaimsListAccount youOwner={true} data={submitedClaims} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className='flex flex-col lg:flex-row lg:justify-between lg:items-start'>
            <div>
              <div className='flex flex-col border-b border-dashed'>
                <span>user</span>
                <span className='text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl'>
                  {userAddress}
                </span>
              </div>

              <div className='flex flex-col'>
                <div>
                  completed bounties:{' '}
                  <span className='font-bold'>{nftDetails?.length}</span>
                </div>
                <div>
                  total {currency} paid:{' '}
                  <span className='font-bold'>{totalETHPaid}</span>{' '}
                </div>
                <div>
                  in progress bounties:{' '}
                  <span className='font-bold'>{inProgressBounties.length}</span>{' '}
                </div>
                <div>
                  total {currency} in contract:{' '}
                  <span className='font-bold'>{ETHinContract}</span>{' '}
                </div>
                <div>
                  completed claims:{' '}
                  <span className='font-bold'>{completedClaims.length}</span>
                </div>
                <div>
                  total {currency} earned:{' '}
                  <span className='font-bold'>{totalETHEarn}</span>{' '}
                </div>
              </div>
            </div>

            <div className='flex flex-col '>
              <span>poidh score:</span>
              <span className='text-4xl text-[#F15E5F] border-y border-dashed'>
                {poidhScore}
              </span>
            </div>
          </div>

          <div className='flex flex-row overflow-x-scroll items-center py-12 border-b border-white lg:justify-center gap-x-5 '>
            <FilterButton
              onClick={() => handleFilterButtonClick('a')}
              show={currentSection !== 'a'}
            >
              nft's ({nftDetails?.length})
            </FilterButton>
            <FilterButton
              onClick={() => handleFilterButtonClick('b')}
              show={currentSection !== 'b'}
            >
              {userAccount ? 'your bounties' : 'user bounties'} (
              {bountiesData.length})
            </FilterButton>
            <FilterButton
              onClick={() => handleFilterButtonClick('c')}
              show={currentSection !== 'c'}
            >
              submitted claims ({submitedClaims.length})
            </FilterButton>
            {/* <FilterButton onClick={() => handleFilterButtonClick('c')} show={currentSection !== 'd'}  >collab bounties (0)</FilterButton> */}
          </div>

          <div>
            {currentSection === 'a' && (
              <div>
                <NftList nftDetails={nftDetails} />
                {/* <BountyList  bountiesData={completedBounties} /> */}
              </div>
            )}
            {currentSection === 'b' && (
              <div>
                <BountyList bountiesData={bountiesData} />
              </div>
            )}
            {currentSection === 'c' && (
              <div>
                <ClaimsListAccount youOwner={true} data={submitedClaims} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountInfo;
