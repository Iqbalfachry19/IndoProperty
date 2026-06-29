# IndoProperty

> **Real World Asset (RWA) Tokenization Platform for Indonesian Real Estate**
> Built on the ERC-3643 security token standard, deployed on Mantle Sepolia.

IndoProperty is a proof-of-concept platform demonstrating how Indonesian real estate assets can be tokenized as compliant security tokens. The project combines on-chain identity verification, compliance enforcement, and property-specific SPV tokenization into a modular architecture suitable for regulated digital securities.

---

## Features

- ERC-3643 compliant security token (T-REX standard)
- Identity Registry with KYC/AML verification
- Compliance module with configurable transfer restrictions
- SPV-based property tokenization
- Fractional ownership with on-chain property metadata
- Rent distribution and yield claiming
- Forced transfer for regulatory recovery
- Account and token-level freezing
- Pause / unpause by authorized agents
- Modular architecture — shared or dedicated identity registry per SPV

---

## Smart Contracts

### `IndoPropertySPVToken`

ERC-3643 security token representing fractional ownership of a single real estate property.

| Feature | Description |
|---|---|
| KYC-protected transfers | Only verified investors can send/receive |
| Mint & burn | By authorized agents only |
| Forced transfer | Regulatory recovery of tokens |
| Account freezing | Block an address from all activity |
| Token freezing | Freeze a partial amount of an investor's tokens |
| Pause / unpause | Emergency stop for the entire token |
| Property metadata | Name, address, certificate no., appraised value, yield bps, area |
| Rent distribution | `depositRent` / `claimRent` with per-token accumulator |
| ERC-3643 hooks | `compliance.canTransfer` checked on every transfer |

---

### `IdentityRegistry`

Manages investor identity on-chain.

- Investor registration with on-chain identity address mapping
- Country code (ISO 3166 numeric) per investor
- Verification status checks
- Batch registration support
- Authorized KYC agent management

---

### `IndoPropertyCompliance`

Pluggable compliance engine enforcing regulatory rules per transfer.

| Rule | Details |
|---|---|
| Verified investor | Sender and receiver must be registered and verified |
| Restricted countries | Block transfers to/from specific country codes |
| Maximum holders | Cap total unique token holders |
| Minimum investment | Enforce minimum token value in IDR |
| Lock-up period | Block transfers within N seconds of first acquisition |
| Whitelist | Bypass standard rules for whitelisted addresses |

Hooks: `created`, `destroyed`, `transferred` — called by the token on mint, burn, and transfer.

---

### `SPVRegistry`

Factory contract for deploying new property SPVs.

- Deploy `IndoPropertySPVToken` + `IndoPropertyCompliance` as a pair
- Optional: reuse shared `IdentityRegistry` or deploy a dedicated one per SPV
- Track all deployed SPVs on-chain
- Deactivate SPVs

> **Note:** `SPVRegistry` is temporarily excluded from the deployment script due to EVM contract size limits (EIP-170). Optimization settings: `optimizer_runs = 1`, `via_ir = true`. Individual contracts are deployed directly.

---

## Architecture

```
Investor Wallet
      │
      ▼
IdentityRegistry  ◄──── KYC Agent (off-chain verification)
      │
      ▼
IndoPropertyCompliance
      │  canTransfer()
      ▼
IndoPropertySPVToken  (ERC-3643)
      │
      ▼
Real Estate SPV
```

---

## Repository Structure

```
.
├── contracts/
│   ├── token/
│   │   └── ERC3643Token.sol
│   ├── spv/
│   │   └── IndoPropertySPVToken.sol
│   ├── identity/
│   │   └── IdentityRegistry.sol
│   ├── compliance/
│   │   └── IndoPropertyCompliance.sol
│   ├── registry/
│   │   └── SPVRegistry.sol
│   └── interfaces/
├── test/
│   └── IndoPropertySPV.t.sol
├── script/
│   └── Deploy.s.sol
└── app/                        # Next.js 15 frontend
    ├── dashboard/
    │   └── page.tsx
    ├── components/
    │   └── ConnectWallet.tsx
    ├── lib/
    │   └── web3/
    │       └── abi.ts
    └── providers.tsx
```

---

## Testnet Deployment

Network: **Mantle Sepolia** (Chain ID: `5003`)

| Contract | Address |
|---|---|
| SPVToken (PROP) | `0x7a1F4db6309E6EEBb5430a6946F2ac1704eCc0aa` |
| IdentityRegistry | `0xfBF5f0c0792dfdF1AAA9854A255628aB99b7405C` |
| Compliance | `0xfB3569b74B1b9f921BD130e0229Ea973691aEaA0` |

Deployer / SPV Manager / KYC Agent: `0x9eF393A3645eb22Fac5F9550fF017a21f87985D7`

> These contracts are deployed for demonstration and testing only. Do not use in production.

Explorer: [explorer.sepolia.mantle.xyz](https://explorer.sepolia.mantle.xyz)

---

## Frontend Stack

- **Next.js 15** (App Router)
- **wagmi v2** + **viem v2**
- **Reown AppKit** (formerly Web3Modal) for wallet connection
- **@tanstack/react-query v5**
- Mantle Sepolia configured as the sole supported network

### Environment Variables

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

Get a project ID at [cloud.reown.com](https://cloud.reown.com).

---

## Development

```bash
# Install all dependencies
npm install
forge install

# Compile contracts
forge build

# Run tests
forge test -vvvv

# Deploy to Mantle Sepolia
forge script script/Deploy.s.sol --rpc-url https://rpc.sepolia.mantle.xyz --broadcast

# Run frontend
npm run dev
```

---

## Testing Notes

- `MIN_INVESTMENT` must be satisfied when minting tokens in tests
- Lock-up constraints bypassed in tests using `vm.warp()`
- Test framework: Foundry (`forge-std`, `anchor-bankrun` pattern not applicable — pure Solidity tests)

---

## Regulatory Disclaimer

This project is provided solely for **research, educational, and demonstration purposes**.

It is **not** an offer to sell securities, investment products, or financial services. Any production deployment involving tokenized real-world assets would require full compliance with applicable Indonesian regulations (POJK, FATF recommendations) and approval from relevant authorities (OJK, BI).

---

## License

MIT