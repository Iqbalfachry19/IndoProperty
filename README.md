# IndoProperty
## 🔐 Smart Contracts

### 1️⃣ IndoPropertyIdentityRegistry
Handles:
- Investor identity registration
- Country code (Indonesia = 360)
- Verification status used by ERC-3643 token

### 2️⃣ IndoPropertyToken3643
- ERC-3643 compliant security token
- Blocks transfers unless both sender & receiver are KYC verified
- Represents fractional ownership of a real estate asset

---

## 🚀 Getting Started (Frontend)

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

---

## 🧪 Deploying Contracts (Remix)

1. Open **Remix IDE**
2. Deploy `IndoPropertyIdentityRegistry.sol`
3. Register investor identities
4. Deploy `IndoPropertyToken3643.sol`
5. Use the Identity Registry address in constructor

---

## ⚖️ Compliance Disclaimer

This project is a **technical demonstration only**.
It does **not** constitute an offer of securities or investment advice.
Real-world deployment would require regulatory approval from relevant authorities (e.g., OJK in Indonesia).

---

## 🏆 Hackathon Status

- Stage: Proof of Concept
- Fundraising: Not currently fundraising
- Focus: Technical validation & regulatory-aligned design

---

## Deployed Contracts

- **IndoProperty ERC-3643 Token (Testnet / Hackathon Deployment)**
`0xFC4f507AD62D7E103Ed43da4A0F5B8F671623c28`
- **IndoPropertyIdentityRegistry (Testnet / Hackathon Deployment)**
`0x9a59B64C556F18F85F86ADa0172c0F44b72Fe488`
> ⚠️ This address is for hackathon demonstration purposes only and not intended for production use.

---

## 📜 License

MIT License

---

## 🤝 Contact

Built for Web3 RWA experimentation.
For questions or collaboration, please reach out via the hackathon submission channel.