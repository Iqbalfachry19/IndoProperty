# IndoProperty

> **Real World Asset (RWA) Tokenization Platform for Indonesian Real Estate** built on the ERC-3643 security token standard.

IndoProperty is a proof-of-concept platform demonstrating how Indonesian real estate assets can be tokenized using compliant security tokens. The project combines identity verification, compliance enforcement, and property-specific SPV (Special Purpose Vehicle) tokenization into a modular architecture suitable for regulated digital securities.

---

# Features

* ERC-3643 compliant security token
* Identity Registry with KYC verification
* Compliance module with transfer restrictions
* SPV-based property tokenization
* Fractional ownership model
* Modular smart contract architecture
* Property metadata stored on-chain
* Transfer restrictions based on investor verification

---

# Smart Contracts

### IndoPropertySPVToken

ERC-3643 security token representing fractional ownership of a single property.

Features:

* KYC-protected transfers
* Mint & burn by authorized agents
* Forced transfer (regulatory recovery)
* Account freezing
* Token freezing
* Pause / unpause
* Property metadata
* ERC-3643 compliance hooks

---

### IdentityRegistry

Responsible for investor identity management.

Features:

* Investor registration
* On-chain identity mapping
* Country code management
* Verification status
* Authorized KYC agents

---

### IndoPropertyCompliance

Compliance engine implementing regulatory rules.

Current rules include:

* Verified investor requirement
* Restricted country filtering
* Maximum holder limit
* Minimum investment requirement
* Lock-up period
* Whitelisted addresses
* Compliance hooks for mint, burn, and transfer

---

### SPVRegistry

Factory contract used to deploy new property SPVs.

Features:

* Deploy new SPV token
* Deploy compliance module
* Deploy identity registry (optional)
* Track deployed SPVs
* Shared or dedicated identity registry support

---

# Repository Structure

```text
contracts/
├── token/
│   └── ERC3643Token.sol
├── spv/
│   └── IndoPropertySPVToken.sol
├── identity/
│   └── IdentityRegistry.sol
├── compliance/
│   └── IndoPropertyCompliance.sol
├── registry/
│   └── SPVRegistry.sol
└── interfaces/
```

---

# Development

Install dependencies

```bash
npm install
forge install
```

Compile contracts

```bash
forge build
```

Run tests

```bash
forge test -vvvv
```

Run frontend

```bash
npm run dev
```

---

# Architecture

```
Investor
    │
    ▼
Identity Registry
    │
    ▼
Compliance Module
    │
    ▼
ERC-3643 SPV Token
    │
    ▼
Real Estate SPV
```

---

# Regulatory Disclaimer

This project is provided solely for research, educational, and demonstration purposes.

It is **not** an offer to sell securities, investment products, or financial services.

Any production deployment involving tokenized real-world assets would require compliance with applicable laws and regulations, including approval from the relevant regulatory authorities.

---


# Testnet Deployment

## IndoProperty SPV Token

```
0xFC4f507AD62D7E103Ed43da4A0F5B8F671623c28
```

## Identity Registry

```
0x9a59B64C556F18F85F86ADa0172c0F44b72Fe488
```

> These contracts are deployed exclusively for demonstrations and testing. They should not be used in production environments.

---

# License

MIT License
