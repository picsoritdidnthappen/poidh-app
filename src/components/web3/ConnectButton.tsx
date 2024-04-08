import React from 'react';
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";



const ConnectButton = () => {
  const { setShowAuthFlow } = useDynamicContext();
  return (
    <button
      onClick={() => setShowAuthFlow(true)}
    >
      Connect your wallet
    </button>
  );
};

export default ConnectButton;


