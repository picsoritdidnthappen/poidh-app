
import {
  useDynamicContext,
  DynamicConnectButton,
  useAuthenticateConnectedUser,
  useUserWallets,
  useWalletItemActions,
} from '@dynamic-labs/sdk-react-core'

import ConnectButton from '@/components/web3/ConnectButton';


import Button from '@/components/ui/Button';
import BountyList from '@/components/ui/BountyList';

// const getBalance = async () => {
//   const balance = await primaryWallet.connector.getBalance();
//   return balance;
// };

// const getAddress = () => {
//   const address = primaryWallet.address;
//   return address;
// };

// const getConnectedAccounts = async () => {
//   const connectedAccounts = await walletConnector?.getConnectedAccounts();
//   return connectedAccounts;
// };


// import { useSendBalance } from "@dynamic-labs/sdk-react-core";
// import { ethers } from "ethers";

// const MySendButton = () => {
//   const { open } = useSendBalance();

//   const onCickSend = async () => {
//     try {
//       const tx = await open({
//         recipientAddress: "<address>",
//         value: ethers.utils.parseEther("1"),
//       });
//     } catch (err) {
//       // Handle the promise rejection
//     }
//   };

//   return <button onClick={onCickSend}>Send</button>;
// };


// const getJwt = () => {
//   const jwt = authToken;
//   return jwt;
// };



// import {
//   useWalletConnectorEvent,
//   useUserWallets
// } from '@dynamic-labs/sdk-react-core'

// const App = () => {
//   const wallets = useUserWallets();

//   const walletsConnectors = wallets.map(({ connector }) => connector);

//   useWalletConnectorEvent(
//     walletsConnectors,
//     'disconnect',
//     (connector) => {
//       console.log(`Connector ${connector} disconnected`);
//     }
//   );

//   return null;
// }

const SignWithMetaMaskButton = () => {
  const { openWallet } = useWalletItemActions();



  return (
    <button onClick={() => openWallet('metamask')}>
      Sign with MetaMask
    </button>
  )
}





const AccountInfo = () => {
  const {isAuthenticated } = useDynamicContext();
  const userWallets= useUserWallets()
  // const { primaryWallet } = useDynamicContext();
  // const balance =  useDynamicContext().primaryWallet?.connector.getBalance().then(balance => console.log(balance));
  // console.log(balance)
  // const  getBalance = async (primaryWallet: any) => {
    
  //   const balance = await primaryWallet.connector.getBalance();
  
  //   return balance;
  // };
  

  //getBalance()
  

  //console.log(userWallets)

  //console.log('isAuthenticated: ' + isAuthenticated )

  // const getBalance = async () => {
  //   const balance = await primaryWallet.connector.getBalance();
  //   return balance;
  // };
  

  return (
    <div>
 { isAuthenticated ? (
    <div>
         <div className='flex flex-col lg:flex-row lg:justify-between lg:items-start'>
    <div>
    <div className='flex flex-col border-b border-dashed'>
    <span>user</span>
    <span className='text-4xl'>0xe86a...123</span>
   </div>

    <div className='flex flex-col'>
      <div>completed bounties: <span className='font-bold' >6</span></div>
      <div>total eth paid: <span className='font-bold' >0.0144</span>  </div>
      <div>in progress bounties: <span className='font-bold' >0</span> </div>
      <div>total eth in contracts: <span className='font-bold' >0.0000</span>  </div>
      <div>completed claims: <span className='font-bold' >4</span></div>
      <div>total eth earned: <span className='font-bold' >0.0109</span>  </div>

     

    </div>
      
    </div>
    <div className='flex flex-col '>
    <span>poidh score:</span>
    <span className='text-4xl text-[#F15E5F] border-y border-dashed'>123456</span>
   </div>

    

    </div>
    {userWallets.map((wallet) => (
          <p key={wallet.id}>
            {wallet.address}: {wallet.connected ? 'Connected' : 'Not connected'}
          </p>
        ))}
        
        {/* <ConnectButton/> */}
        <SignWithMetaMaskButton/>

    <div>
      <BountyList/>
    </div>
          
          
         
        
        
         </div>
      ) : (
        <div className='h-screen w-full flex items-center justify-center flex-col' >
          <h2 className='my-5'>Start POIDH journey!</h2>

          <Button>Connect Wallet</Button>

        </div>
      )
    }




    


    </div>
  );
};

export default AccountInfo;