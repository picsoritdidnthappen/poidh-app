import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import React from 'react';

const ConnectButton = () => {
  const { setShowAuthFlow } = useDynamicContext();
  return (
    <button onClick={() => setShowAuthFlow(true)}>Connect your wallet</button>
  );
};

export default ConnectButton;
