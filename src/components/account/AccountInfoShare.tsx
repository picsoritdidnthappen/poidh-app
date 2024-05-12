'use client';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

import ProofListAccount from '@/components/bounty/ProofListAccount';
import BountyList from '@/components/ui/BountyList';
import Button from '@/components/ui/Button';
import FilterButton from '@/components/ui/FilterButton';

import {
  fetchBountyById,
  getBountiesByUser,
  getClaimById,
  getClaimsByUser,
  getContract,
  getDegenOrEnsName,
  getNftsOfOwner,
  getProvider,
  getSigner,
  getURI,
} from '@/app/context/web3';

import NftList from '../bounty/NftList';

import { BountiesData, ClaimsData, NFTDetails } from '@/types/web3';

const AccountInfo = () => {
  const { isAuthenticated, primaryWallet } = useDynamicContext();
  const [userAddress, setUserAddress] = useState('0x111...123456');
  const [bountiesData, setBountiesData] = useState<BountiesData[]>([]);
  const [claimsData, setClaimsData] = useState<ClaimsData[]>([]);

  const [completedBounties, setCompletedBounties] = useState<BountiesData[]>(
    []
  );
  const [inProgressBounties, setInProgressBounties] = useState('');
  const [ETHinContract, setETHinContract] = useState('');
  const [completedClaims, setCompletedClaims] = useState<ClaimsData[]>([]);
  const [submitedClaims, setSubmitedClaims] = useState<ClaimsData[]>([]);
  const [currentSection, setCurrentSection] = useState<string>('a');
  const [totalETHPaid, setTotalETHPaid] = useState<number>(0);
  const [totalETHEarn, setTotalETHEarn] = useState<number>(0);

  const [nftDetails, setNftDetails] = useState<NFTDetails[] | null>([]);

  useEffect(() => {
    const userInformation = async () => {
      const signer = await getSigner(primaryWallet);
      const provider = await getProvider();
      const contract = await getContract(signer);

      const balanceNFT = await getNftsOfOwner(signer);
      const nftDetailsPromises = balanceNFT.map(async (nftId) => {
        const uri = await getURI(nftId);
        const response = await fetch(uri);
        const data = await response.json();
        const claims = await getClaimById(nftId);
        if (claims.length > 0) {
          const { name, description } = claims[0];
          return {
            name: data?.name,
            description: data?.description,
            nftId: claims[0].id,
            uri: data?.image,
          } as NFTDetails;
        }
        return null;
      });

      const completedNFTs = (await Promise.all(nftDetailsPromises)).filter(
        (nft): nft is NFTDetails => nft !== null
      );
      setNftDetails(completedNFTs);

      //VIEM
      // const balance = await publicClient.getBalance({
      //   address: '0x2fe17A509032Ce9F0AEBA6f2c1B8Dd0EaB304aAc',
      // })

      // const balanceAsEther = formatEther(balance)
      // console.log("balance")

      // console.log(balanceAsEther)
      // const success = await walletClient.watchAsset({
      //   type: 'ERC20',
      //   options: {
      //     address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      //     decimals: 18,
      //     symbol: 'WETH',
      //   },
      // })
      // console.log("success")

      // console.log(success)

      const address = signer.address;

      // useEffect(() => {
      //   if (address !== "0x111...123456") {
      //     const newUrl = `http://localhost:3000/account/${address}`;
      //     window.history.pushState({ path: newUrl }, '', newUrl);
      //   }
      // }, [address]); // This effect depends on userAddress and runs whenever it changes

      const formattedAddress = `${address.slice(0, 5)}...${address.slice(-6)}`;
      const degenOrEnsName = await getDegenOrEnsName(address);

      setUserAddress(degenOrEnsName || formattedAddress);

      const contractBalance = await provider.getBalance(contract.getAddress());
      const balanceETH = ethers.formatEther(contractBalance);
      setETHinContract(balanceETH);

      getBountiesByUser(address, 0, []).then((data: any) => {
        setBountiesData(data);
        const completedBounties = data.filter(
          (bounty: any) =>
            bounty.claimer !== '0x0000000000000000000000000000000000000000' &&
            bounty.claimer.toLowerCase() !== address.toLowerCase()
        );
        const inProgressBounties = data.filter(
          (bounty: any) =>
            bounty.claimer === '0x0000000000000000000000000000000000000000'
        );
        setInProgressBounties(inProgressBounties);
        setCompletedBounties(completedBounties);
      });

      getClaimsByUser(address).then((data: any) => {
        setClaimsData(data);
        const completedClaims = data.filter(
          (claim: any) => claim.accepted === true
        );
        const submitedClaims = data;

        setCompletedClaims(completedClaims);
        setSubmitedClaims(submitedClaims);
        console.log(completedClaims);
      });

      return formattedAddress;
    };

    if (primaryWallet) {
      userInformation().catch(console.error);
    }
  }, [primaryWallet]);

  useEffect(() => {
    const fetchClaimInformation = async () => {
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
      console.log('Claim Information:', claimInformation);
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
    console.log('claims:');
    const bountyIds = completedClaims.map((claim) => claim.bountyId);
    let totalAmount = BigInt(0);
    Promise.all(
      bountyIds.map(async (bountyId) => {
        const bountyData = await fetchBountyById(bountyId);
        const amountBigInt = BigInt(bountyData.amount);
        totalAmount += amountBigInt;
        const totalAmountEarnETH = ethers.formatEther(totalAmount);
        setTotalETHEarn(Number(totalAmountEarnETH));
      })
    );
  }, [completedClaims]);

  const handleFilterButtonClick = (section: string) => {
    setCurrentSection(section);
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <div className='flex flex-col lg:flex-row lg:justify-between lg:items-start'>
            <div>
              <div className='flex flex-col border-b border-dashed'>
                <span>user</span>
                <span className='text-4xl'>{userAddress}</span>
              </div>

              <div className='flex flex-col'>
                <div>
                  completed bounties:{' '}
                  <span className='font-bold'>{completedBounties.length}</span>
                </div>
                <div>
                  total degen paid:{' '}
                  <span className='font-bold'>{totalETHPaid}</span>{' '}
                </div>
                <div>
                  in progress bounties:{' '}
                  <span className='font-bold'>{inProgressBounties.length}</span>{' '}
                </div>
                <div>
                  total degen in contract:{' '}
                  <span className='font-bold'>{ETHinContract}</span>{' '}
                </div>
                <div>
                  completed claims:{' '}
                  <span className='font-bold'>{completedClaims.length}</span>
                </div>
                <div>
                  total degen earned:{' '}
                  <span className='font-bold'>{totalETHEarn}</span>{' '}
                </div>
              </div>
            </div>

            <div className='flex flex-col '>
              <span>poidh score:</span>
              <span className='text-4xl text-[#F15E5F] border-y border-dashed'>
                123456
              </span>
            </div>
          </div>

          <div className='flex flex-row overflow-x-scroll items-center py-12 border-b border-white lg:justify-center gap-x-5 '>
            <FilterButton
              onClick={() => handleFilterButtonClick('a')}
              show={currentSection !== 'a'}
            >
              nft's ({completedBounties.length})
            </FilterButton>
            <FilterButton
              onClick={() => handleFilterButtonClick('b')}
              show={currentSection !== 'b'}
            >
              your bounties (
              {inProgressBounties.length + completedBounties.length})
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
                <ProofListAccount youOwner={true} data={submitedClaims} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className='h-screen w-full flex items-center justify-center flex-col'>
          <h2 className='my-5'>start poidh journey!</h2>
          <Button>connect wallet</Button>
        </div>
      )}
    </div>
  );
};

export default AccountInfo;
