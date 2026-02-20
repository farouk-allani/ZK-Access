# ZK-Access

Privacy-preserving identity verification on Aleo. Issue credentials, generate zero-knowledge proofs, and verify claims — without exposing personal data.

**Live Demo:** [zk-access-liard.vercel.app](https://zk-access-liard.vercel.app)
**Program:** [`zkaccess_v2.aleo`](https://testnet.aleoscan.io/program?id=zkaccess_v2.aleo)
**Deployment TX:** [`at1ugt2...st0wfu`](https://testnet.aleoscan.io/transaction?id=at1ugt2fd9rqvcgk05846tt4f5yyju9vw9zckykc69kqgfezrndcczsst0wfu)

---

## What It Does

ZK-Access lets users prove things about themselves (age, KYC status, country, accredited investor) without revealing the underlying data.

1. **Issue a Credential** — An issuer creates an encrypted credential record in the user's wallet
2. **Generate a Proof** — The user proves a claim like "I am 18+" without revealing their actual age
3. **Verify On-Chain** — The proof is a real Aleo transaction, verifiable on [AleoScan](https://testnet.aleoscan.io)

Only a boolean result (pass/fail) is ever revealed. The credential data stays fully private.

### Why Privacy Matters Here

Traditional identity verification requires sharing sensitive personal data (passport, ID, date of birth) with every service that needs it. Each verification creates a new point of data exposure. ZK-Access flips this: the user holds their credential privately and reveals only what's needed (a yes/no answer) to any verifier. No data leaves the wallet.

---

## Demo Walkthrough

> Requires [Shield Wallet](https://shield.app) or [Leo Wallet](https://www.leo.app/) browser extension on Aleo Testnet.

1. Install Shield Wallet (or Leo Wallet) and switch to **Testnet**
2. Visit the [live demo](https://zk-access-liard.vercel.app) and connect your wallet
3. Go to **Issue Credential** — fill in the form and submit (your wallet will prompt approval)
4. Wait ~30-60s for confirmation, then check **My Credentials** to see your credential record
5. Go to **Generate Proof** — select your credential, pick a proof type (e.g., Age Minimum), and submit
6. Check **Activity** to see all your transactions with AleoScan links

Every action is a real Aleo transaction. No mocks, no simulations.

---

## Architecture

<img width="600"  alt="zk-access schema" src="https://github.com/user-attachments/assets/2c36e7db-9072-4e63-a54d-0625c1274b45" />


---

## Program

**One Leo program** — [`zkaccess_v2.aleo`](https://testnet.aleoscan.io/program?id=zkaccess_v2.aleo) (~130 lines)

| Transition | What It Does |
|---|---|
| `issue_credential` | Creates an encrypted credential record for a user |
| `prove_age` | Proves age ≥ minimum without revealing actual age |
| `prove_kyc` | Proves KYC verification status |
| `prove_country` | Proves not in a restricted country (North Korea, Iran, Syria, Cuba) |
| `prove_accredited` | Proves accredited investor status |

**Records:**
- `Credential` — encrypted, owned by the recipient. Contains age, country_code, kyc_passed, accredited_investor. Only the owner can decrypt.
- `ProofResult` — owned by the prover. Contains claim_type and a boolean `passed`.

Every `prove_*` transition consumes the credential and returns it alongside a proof, so the credential can be reused unlimited times.

---

## Privacy Model

| What | Private? | How |
|---|---|---|
| Credential data (age, country, KYC, etc.) | **Always private** | Stored as encrypted Aleo records — only the owner's key can decrypt |
| Proof result | **Boolean only** | `prove_age` reveals only "age ≥ 18: true/false", not the actual age |
| Who issued to whom | **Private** | The issuer-recipient relationship is inside the encrypted record |
| Transaction existence | Public | The transaction hash is visible on-chain (this is how Aleo works) |
| Execution | **Local** | Proof generation happens entirely in the user's wallet/browser |

**Key property:** The credential record is consumed as a private input. Aleo's execution model guarantees that private inputs are never revealed — only the program's assertions (pass/fail) are reflected in the proof.

---

## Tech Stack

- **Leo** — Aleo's ZK programming language
- **Aleo Testnet** — privacy-preserving L1
- **Leo Wallet** — via `@provablehq/aleo-wallet-adaptor-core/react/react-ui` (official Provable SDK)
- **React 18 + Vite + Tailwind 4** — frontend
- **TypeScript** — full type safety

---

## Project Structure

```
aleo-zk/
├── zkaccess/
│   ├── src/main.leo        # Leo program (single file, ~130 lines)
│   └── program.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx        # AleoWalletProvider + WalletModalProvider
│   │   ├── context/        # Wallet integration (executeTransaction, requestRecords)
│   │   ├── pages/          # Home, Issue, Credentials, Prove, Verify
│   │   ├── components/     # Navbar, Layout, ToastContainer
│   │   └── types/          # TypeScript types
│   └── package.json
└── README.md
```

---

## Run Locally

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

The frontend connects to the already-deployed `zkaccess_v2.aleo` on Aleo Testnet. No local node needed.

### Deploy the program yourself (optional)

```bash
cd zkaccess
leo build
leo deploy --private-key YOUR_KEY --network testnet \
  --endpoint "https://api.explorer.provable.com/v1" \
  --broadcast --priority-fees 5000000 --yes
```

---

## Wave 2 Progress Changelog

### What changed since Wave 1

- **Collapsed 3 overengineered programs (~1,700 lines) into 1 clean program (~130 lines)**
  - Removed identity.aleo, credential.aleo, verifier.aleo
  - Single `zkaccess_v2.aleo` with 5 transitions, no mappings, no admin roles, no nullifiers
- **Replaced fake wallet mock with real Shield Wallet / Leo Wallet integration**
  - Migrated to `@provablehq/aleo-wallet-adaptor-react` (official Provable SDK)
  - Every action (issue, prove) is a real on-chain Aleo transaction
  - Records are fetched from the wallet, not localStorage
- **Complete frontend rewrite for real on-chain interactions**
  - Issue page calls `executeTransaction` with real Leo-formatted inputs
  - Credentials page fetches and parses real encrypted records from the wallet
  - Prove page passes real credential records as transaction inputs
  - Activity page shows transaction history with AleoScan verification links
- **Deployed `zkaccess_v2.aleo` to Aleo Testnet** — [view on AleoScan](https://testnet.aleoscan.io/program?id=zkaccess_v2.aleo)
- **Removed unnecessary documentation** (threat model, privacy model docs, CLI examples)
- **Cleaned up project structure** — deleted old programs, tests directory

### Feedback incorporated
- "Too many programs" → Simplified to 1 program
- "Frontend is a mockup" → Now real wallet integration with on-chain transactions
- "Mentions SNARK verification unnecessarily" → Removed all academic language

### Next wave goals
- Add on-chain issuer authorization (mapping-based)
- Support credential expiration
- Mainnet deployment
- More proof types (income range, age range)

---

## License

MIT

---

Built for [Aleo](https://aleo.org) | [Shield Wallet](https://shield.app) | [AleoScan](https://testnet.aleoscan.io/program?id=zkaccess_v2.aleo)
