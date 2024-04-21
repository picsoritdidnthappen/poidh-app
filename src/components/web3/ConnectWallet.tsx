import {
  DynamicConnectButton,
  useDynamicContext,
  DynamicWidget,
} from '@dynamic-labs/sdk-react-core'









const ConnectWallet = () => {
  
  const {
     isAuthenticated ,
     handleLogOut,
    } 
  = useDynamicContext();




  return (
    <div className='flex flex-col z-10'>

        <DynamicWidget
        innerButtonComponent={ <div>
connect

        </div>}
       variant='modal' />

   


     
      
    </div>
  );
};

export default ConnectWallet;
