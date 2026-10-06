'use client';

import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { useTheme } from '@/context/ThemeContext';
import { walletCookieToInitialState } from '@/utils/walletStorage';
import { config, createWagmiConfig } from '@/wagmiConfig';
import { useState } from 'react';
import { WagmiProvider } from 'wagmi';

// wagmi reads the QueryClient from TRPCProvider above, so the app has one cache
export function WalletProvider({
  children,
  walletCookie,
}: {
  children: React.ReactNode;
  walletCookie?: string;
}) {
  const { theme } = useTheme();

  // The server makes a config for each render, so the wallet state of one
  // request can't show up in the HTML of another. The browser keeps one.
  const [wagmiConfig] = useState(() =>
    typeof window === 'undefined' ? createWagmiConfig() : config
  );
  const [initialState] = useState(() =>
    walletCookieToInitialState(wagmiConfig, walletCookie)
  );

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <RainbowKitProvider
        theme={
          theme === 'cyber'
            ? darkTheme({
                accentColor: '#42d77b',
                accentColorForeground: '#03180f',
              })
            : undefined
        }
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
