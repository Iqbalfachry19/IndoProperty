"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { WagmiProvider } from 'wagmi';
import { mantleSepoliaTestnet } from 'wagmi/chains';
import { ReactNode } from 'react';

const queryClient = new QueryClient();

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '3fcc6bba6f1de962d911bb5b5c3dba68';

const metadata = {
  name: 'IndoProperty',
  description: 'Indonesia Property Tokenization',
  url: 'https://indoproperty.test',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const chains = [mantleSepoliaTestnet] as const;
export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: false, 
  enableOnramp: false 
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
