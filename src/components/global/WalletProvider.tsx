'use client';

import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { useTheme } from '@/context/ThemeContext';
import { config } from '@/wagmiConfig';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </WagmiProvider>
  );
}
