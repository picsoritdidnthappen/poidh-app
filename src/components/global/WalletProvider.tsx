'use client';

import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { useTheme } from '@/context/ThemeContext';
import { config } from '@/wagmiConfig';
import { WagmiProvider } from 'wagmi';

// wagmi reads the QueryClient from TRPCProvider above, so the app has one cache
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <WagmiProvider config={config}>
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
