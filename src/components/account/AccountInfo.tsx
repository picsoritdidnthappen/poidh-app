"use client"
import { useEffect, useState } from 'react';
import {  ethers } from "ethers";
import {
  useDynamicContext,
} from '@dynamic-labs/sdk-react-core'
import { getSigner, getContract, getBountiesByUser, getProvider, getClaimsByUser, getNftsOfOwner , getClaimById, getURI} from '@/app/context/web3';
import Button from '@/components/ui/Button';
import BountyList from '@/components/ui/BountyList';
import { BountiesData, ClaimsData } from '@/types/web3';
import FilterButton from '@/components/ui/FilterButton';
import ProofList from '@/components/bounty/ProofList';
import ProofListAccount from '@/components/bounty/ProofListAccount';





const AccountInfo = () => {
  const {isAuthenticated, primaryWallet } = useDynamicContext();
  const [userAddress, setUserAddress] = useState("0x...111")
  const [bountiesData, setBountiesData] = useState<BountiesData[]>([]);
  const [claimsData, setClaimsData] = useState<ClaimsData[]>([]);

  const [completedBounties, setCompletedBounties] = useState<BountiesData[]>([]);
  const [inProgressBounties, setInProgressBounties] = useState("");
  const [ETHinContract, setETHinContract] = useState("");
  const [completedClaims, setCompletedClaims] = useState("");
  const [submitedClaims, setSubmitedClaims] = useState<ClaimsData[]>([]);
  const [currentSection, setCurrentSection] = useState<string>('a');
  const [totalETHPaid, setTotalETHPaid] = useState<number>(0);
  const [totalETHEarn, setTotalETHEarn] = useState<number>(0);



  






// user info
  useEffect(() => {
    const userInformation = async () => {
      const signer = await getSigner(primaryWallet);
      const provider = await getProvider()
      const contract = await getContract(signer)
      
      const address = signer.address;
      const formattedAddress = `${address.slice(0, 5)}...${address.slice(-6)}`;
      setUserAddress(formattedAddress);

      const contractBalance = await provider.getBalance(contract.getAddress())
      const balanceETH = ethers.formatEther(contractBalance)
      setETHinContract(balanceETH)
      

      // console.log("getting nft...")

      // const getNfts = await getNftsOfOwner()

      // console.log(getNfts)

      // const balance = await getNfts.balanceOf(primaryWallet?.address);


      // const tid = await getNfts.tokenOfOwnerByIndex(primaryWallet?.address, 0)

      // console.log(tid)

      // console.log("got nft...")


      getBountiesByUser(address, 0, [])
     .then((data: any) => {
      setBountiesData(data)
      const completedBounties = data.filter((bounty:any) => bounty.claimer !== '0x0000000000000000000000000000000000000000' && bounty.claimer.toLowerCase() !== address.toLowerCase());
      const inProgressBounties = data.filter((bounty:any) => bounty.claimer === '0x0000000000000000000000000000000000000000');
      setInProgressBounties(inProgressBounties);
      setCompletedBounties(completedBounties);


    })





    getClaimsByUser(address)
    .then((data: any) => {
      setClaimsData(data);
      const completedClaims = data.filter((claim: any) => claim.accepted === true);
      const submitedClaims = data;

      setCompletedClaims(completedClaims);
      setSubmitedClaims(submitedClaims);
      console.log(completedClaims)
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
          amount: amount
        };
      });
      const claimInformation = await Promise.all(claimInformationPromises);
      console.log("Claim Information:", claimInformation);
    };
  
    fetchClaimInformation();
  }, [completedBounties]);


  
useEffect(() => {
  let totalAmount: bigint = BigInt(0);
  completedBounties.forEach(bounty => {
    totalAmount += BigInt(bounty.amount);
  });
  const totalAmountETH = ethers.formatEther(totalAmount);
  setTotalETHPaid(Number(totalAmountETH));
}, [completedBounties]);


useEffect(() => {
  let totalAmountEarn: bigint = BigInt(0);
  completedBounties.forEach(bounty => {
    totalAmountEarn += BigInt(bounty.amount);
  });
  const totalAmountEarnETH = ethers.formatEther(totalAmountEarn);
  setTotalETHEarn(Number(totalAmountEarnETH));
}, [completedBounties]);


  
  
  const handleFilterButtonClick = (section: string) => {
    setCurrentSection(section);
  };
  

  

  return (
    <div>
  { isAuthenticated ? (
    <div>
        <div className='flex flex-col lg:flex-row lg:justify-between lg:items-start'>
        <div>
            <div className='flex flex-col border-b border-dashed'>
            <span>user</span>
            <span className='text-4xl'>{userAddress}</span>
          </div>

        <div className='flex flex-col'>
      <div>completed bounties: <span className='font-bold' >{completedBounties.length}</span></div>
      <div>total eth paid: <span className='font-bold' >{totalETHPaid}</span>  </div>
      <div>in progress bounties: <span className='font-bold' >{inProgressBounties.length}</span> </div>
      <div>total eth in contract: <span className='font-bold' >{ETHinContract}</span>  </div>
      <div>completed claims: <span className='font-bold' >{completedClaims.length}</span></div>
      <div>total eth earned: <span className='font-bold' >0.0109</span>  </div>

     

        </div>
      
        </div>
    <div className='flex flex-col '>
    <span>poidh score:</span>
    <span className='text-4xl text-[#F15E5F] border-y border-dashed'>123456</span>
   </div>
  </div>

  
          <div className='flex flex-row overflow-x-scroll items-center py-12 border-b border-white lg:justify-center gap-x-5 '>
            <FilterButton onClick={() => handleFilterButtonClick('a')} show={currentSection !== 'a'} >nft's ({completedBounties.length})</FilterButton>
            <FilterButton onClick={() => handleFilterButtonClick('b')} show={currentSection !== 'b'}>your bounties ({inProgressBounties.length})</FilterButton>
            <FilterButton onClick={() => handleFilterButtonClick('c')} show={currentSection !== 'c'}>submitted claims ({submitedClaims.length})</FilterButton>
            <FilterButton onClick={() => handleFilterButtonClick('c')} show={currentSection !== 'd'}  >collab bounties (0)</FilterButton>
          </div>
    
          <div>
            {currentSection === 'a' && (
              <div>
                <BountyList  bountiesData={completedBounties} />
              </div>
            )}
            {currentSection === 'b' && (
              <div>
                <BountyList  bountiesData={bountiesData} />
              </div>
            )}
            {currentSection === 'c' && (
              <div>
                <ProofListAccount youOwner={true}  data={submitedClaims} /> 
              </div>
            )}
          </div>


   </div>
      ) : (
        <div className='h-screen w-full flex items-center justify-center flex-col' >
          <h2 className='my-5'>start poidh journey!</h2>
          <Button>connect wallet</Button>
        </div>
      )
    }
  </div>
  );
};

export default AccountInfo;