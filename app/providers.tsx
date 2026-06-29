"use client";

import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "viem";

// ─── Mantle Sepolia chain definition ────────────────────────────────────────

export const mantleSepolia: AppKitNetwork = {
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.sepolia.mantle.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Mantle Sepolia Explorer",
      url: "https://explorer.sepolia.mantle.xyz",
    },
  },
  testnet: true,
};

// ─── Reown AppKit setup ──────────────────────────────────────────────────────

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mantleSepolia];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "IndoProperty SPV",
    description: "Indonesian Real Estate Security Token Platform",
    url: "https://indoproperty.vercel.app",
    icons: ["https://indoproperty.vercel.app/favicon.ico"],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  themeMode: "light",
});

// ─── QueryClient singleton ───────────────────────────────────────────────────

const queryClient = new QueryClient();

// ─── Provider wrapper ────────────────────────────────────────────────────────

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}