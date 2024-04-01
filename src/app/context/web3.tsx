
import { Contract, ethers } from "ethers";
import abi from './abi';
import abiNFT from './abiNFT'


export const getSigner = async (primaryWallet: any) => {
  const signer = await primaryWallet?.connector?.ethers?.getSigner();
  return signer;
};

export const getProvider = async (primaryWallet: any) => {
  const provider = await primaryWallet?.connector?.ethers?.getWeb3Provider();
  return provider;
};


export const getContract = async (signer: any) => {
  const contractAddress = "0xbd1F1A105e8a377d2D6Ae757c3b6b47f9801c21B";
  return new Contract(contractAddress, abi, signer);
};

export const getContractRead = async () => {
  const contractAddress = "0xbd1F1A105e8a377d2D6Ae757c3b6b47f9801c21B";
  const jsonProviderUrl = "https://sepolia.base.org"
  const provider = new ethers.JsonRpcProvider(jsonProviderUrl);
  return new Contract(contractAddress, abi, provider);
};

export const getNFTContractRead = async () => {
  const NFTcontractAddress = "0x8E996487b6aBf861D0D70bFA6A40720cCDb82A3d";
  const jsonProviderUrl = "https://sepolia.base.org"
  const provider = new ethers.JsonRpcProvider(jsonProviderUrl);
  return new Contract(NFTcontractAddress, abiNFT, provider);
};






// WRITE Functions


export const createSoloBounty = async (primaryWallet: any, name: string, description: string, value: string) => {
  try {
    const signer = await getSigner(primaryWallet);
    const contract = await getContract(signer);

    const options = {
      value: ethers.parseEther(value.toString()),
    };

    const transaction = await contract.createSoloBounty(name, description, options);
    await transaction.wait();
  } catch (error) {
    console.error('Error creating bounty:', error);
  }
};

export const createOpenBounty = async (primaryWallet: any, name: string, description: string, value: string) => {
  try {
    const signer = await getSigner(primaryWallet);
    const contract = await getContract(signer);

    const options = {
      value: ethers.parseEther(value.toString()),
    };

    const transaction = await contract.createOpenBounty(name, description, options);
    await transaction.wait();
  } catch (error) {
    console.error('Error creating bounty:', error);
  }
};

export const createClaim = async (primaryWallet: any, name: string, uri:string, description: string, bountyId: string) => {
  try {
    const signer = await getSigner(primaryWallet);
    const contract = await getContract(signer);

    const transaction = await contract.createClaim(bountyId ,name, uri, description );
    await transaction.wait();
  } catch (error) {
    console.error('Error creating bounty:', error);
  }
};

export const acceptClaimSolo = async (primaryWallet: any, bountyId : string, claimId :string) => {
  try {
    const signer = await getSigner(primaryWallet);
    const contract = await getContract(signer);

    const transaction = await contract.acceptClaimSolo(bountyId, claimId);
    await transaction.wait();
  } catch (error) {
    console.error('Error creating bounty:', error);
  }
};

export const cancelOpenBounty = async (primaryWallet: any, id: string) => {
  try {
    const signer = await getSigner(primaryWallet);
    const contract = await getContract(signer);

    const transaction = await contract.cancelOpenBounty(id);
    await transaction.wait();
  } catch (error) {
    console.error('Error creating bounty:', error);
  }
};

export const cancelSoloBounty = async (primaryWallet:any , id: string) => {
  try {
    const signer = await getSigner(primaryWallet);
    const contract = await getContract(signer);

    const transaction = await contract.cancelSoloBounty(id);
    await transaction.wait();
  } catch (error) {
    console.error('Error creating bounty:', error);
  }
};



// READ Functions



export const fetchBounties = async (offset: number) => {
  const contractRead = await getContractRead();
  console.log("Proxy(Contract):", contractRead);

  const rawBounties = await contractRead.getBounties(offset);
  const bounties = rawBounties
    .map((bounty:any) => ({
      id: bounty[0].toString(),
      issuer: bounty[1],
      name: bounty[2],
      description: bounty[3],
      amount: bounty[4].toString(),
      claimer: bounty[5],
      createdAt: bounty[6].toString(),
      claimId: bounty[7].toString()
    }))
    .filter((bounty:any) => bounty.issuer !== "0x0000000000000000000000000000000000000000");

  console.log("Formatted and Filtered Bounties:", bounties);
  return bounties;
};


export const fetchBountyById = async (id: string) => {
  const contractRead = await getContractRead();
  const bountie = await contractRead.bounties(id);

  const formattedBounty = {
    id: bountie[0].toString(),
    issuer: bountie[1],
    name: bountie[2],
    description: bountie[3],
    value: bountie[4].toString(),
    claimer: bountie[5],
    createdAt: bountie[6].toString(),
    claimId: bountie[7].toString(),
  };
  
  return formattedBounty

};


export const getBountiesByUser = async (
  user: string, 
  offset: number = 0, 
  allBounties: Array<{
    id: string;
    issuer: string;
    name: string;
    description: string;
    amount: string;
    claimer: string;
    createdAt: string;
    claimId: string;
  }> = []
): Promise<Array<{
  id: string;
  issuer: string;
  name: string;
  description: string;
  amount: string;
  claimer: string;
  createdAt: string;
  claimId: string;
}>> => {
  const contractRead = await getContractRead();
  const rawBounties = await contractRead.getBountiesByUser(user, offset);

  const filteredBounties = rawBounties.filter((bounty: any) => bounty[1] !== "0x0000000000000000000000000000000000000000")
    .map((bounty: any) => ({
      id: bounty[0].toString(),
      issuer: bounty[1],
      name: bounty[2],
      description: bounty[3],
      amount: bounty[4].toString(),
      claimer: bounty[5],
      createdAt: bounty[6].toString(),
      claimId: bounty[7].toString()
    }));

  allBounties = [...allBounties, ...filteredBounties];

  if (filteredBounties.length === 10) {
    return getBountiesByUser(user, offset + 10, allBounties);
  }

  return allBounties;
};



export const getClaimsByUser = async (user: string) => {
  const contractRead = await getContractRead();
  const claimsRaw = await contractRead.getClaimsByUser(user);
  const formattedClaims = claimsRaw.map((claim:any) => ({
    id: claim[0].toString(),
    issuer: claim[1],
    bountyId: claim[2].toString(),
    bountyIssuer: claim[3],
    name: claim[4],
    description: claim[5],
    createdAt: claim[6].toString(),
    accepted: claim[7]
  }));
  return formattedClaims;
};


export const getClaimsByBountyId = async (id: string) => {
  const contractRead = await getContractRead();

  const claimsByBountyId = await contractRead.getClaimsByBountyId(id);
  const formattedClaims = claimsByBountyId.map((claim: any) => ({
    id: claim[0].toString(),
    issuer: claim[1],
    bountyId: claim[2].toString(),
    bountyIssuer: claim[3],
    name: claim[4],
    description: claim[5],
    createdAt: claim[6],
    accepted: claim[7]
  }));

  return formattedClaims
}


export const getURI = async (claimId:string) => {
  const contractNFT = await getNFTContractRead();
  const uri = await contractNFT.tokenURI(claimId);

  return uri
}
