# ZK-Access v3

**Privacy-Preserving DeFi Compliance Protocol on Aleo — Real KYC, Encrypted Credentials, Zero-Knowledge Access Control.**

Real identity verification through Sumsub, encrypted credentials on Aleo, and zero-knowledge proofs for DeFi protocol compliance — without ever exposing personal data.

**Live Demo:** [zk-access-liard.vercel.app](https://zk-access-liard.vercel.app)
**Program:** [`zkaccess_v3.aleo`](https://testnet.aleoscan.io/program?id=zkaccess_v3.aleo)
**KYC Provider:** [Sumsub](https://sumsub.com) (embedded WebSDK, sandbox mode)
**Wallet Support:** [Shield Wallet](https://shield.app) & [Leo Wallet](https://www.leo.app/)

---

## The Problem

DeFi protocols face an impossible choice:

1. **No compliance** — risk regulatory shutdown, sanctions violations, and liability
2. **Traditional KYC** — users hand over passport scans, income proof, and SSNs to every protocol. Each creates a data exposure point. Hacks leak millions of identities.

There is no way to prove "I'm 18+, KYC'd, and not sanctioned" without revealing your passport, age, country, and identity to every protocol that asks.

## The Solution: ZK-Access

ZK-Access bridges real-world identity verification with on-chain zero-knowledge proofs:

```
Real KYC (Sumsub) → Encrypted Credential (Aleo) → ZK-Gated Access (Zero Knowledge)
```

1. **Verify once** with Sumsub — real government ID scan, liveness check, sanctions screening
2. **Receive an encrypted credential** on Aleo — only you can decrypt it
3. **Pass DeFi compliance gates** with ZK proofs — protocols learn only "approved" or "denied"
4. **Your data never leaves your wallet** — not to the protocol, not to the blockchain, not to anyone

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              USER                                       │
│    ┌─────────────┐    ┌──────────────────────────────────────────────┐  │
│    │ Shield/Leo   │    │  Frontend (React)                           │  │
│    │ Wallet       │◄──►│  ┌──────────────────────────────────────┐   │  │
│    │ (keys+creds) │    │  │  Sumsub WebSDK (embedded widget)     │   │  │
│    └──────┬───────┘    │  │  - ID Document Scan                  │   │  │
│           │            │  │  - Liveness Check (selfie match)     │   │  │
│           │            │  │  - Sanctions & PEP Screening         │   │  │
│           │            │  └──────────────────────────────────────┘   │  │
│           │            └──────────────────┬──────────────────────────┘  │
└───────────┼───────────────────────────────┼─────────────────────────────┘
            │                               │
            │                        ┌──────▼───────┐
            │                        │  KYC Bridge  │
            │                        │  Backend     │
            │                        │  (Express)   │
            │                        │  - Token gen │
            │                        │  - Webhook   │
            │                        │  - Status    │
            │                        └──────┬───────┘
            │                               │
            │        ┌──────────────────────┘
            │        │  Webhook: applicantReviewed
            │        │  → extract age, country, KYC
            │        │  → auto-issue credential
            │        │
    ┌───────▼────────▼──────────────────────────────┐
    │              zkaccess_v3.aleo                  │
    │                                                │
    │  ┌──────────────────────────────────────────┐  │
    │  │         PRIVATE TRANSITIONS              │  │
    │  │  issue_credential  (encrypted record)    │  │
    │  │  pass_gate         (ZK proof)            │  │
    │  │  prove_single      (single claim proof)  │  │
    │  └──────────────────┬───────────────────────┘  │
    │                     │                          │
    │  ┌──────────────────▼───────────────────────┐  │
    │  │         ASYNC FINALIZE                   │  │
    │  │  On-chain validation:                    │  │
    │  │  - Issuer authorization check            │  │
    │  │  - Credential revocation check           │  │
    │  │  - Credential expiration check           │  │
    │  │  - Gate config validation                │  │
    │  │  - Proof registry recording              │  │
    │  │                                          │  │
    │  │  8 Mappings | 12 Transitions | 2 Records │  │
    │  └──────────────────────────────────────────┘  │
    └────────────────────────────────────────────────┘
```

### The Pipeline — Step by Step

| Step | What Happens | Where | Data Exposed |
|------|-------------|-------|-------------|
| 1. KYC | User scans government ID, completes liveness check | Sumsub WebSDK (in-app) | Full ID to Sumsub only |
| 2. Extract | Backend webhook extracts boolean facts: age, country, KYC pass | KYC Bridge | Structured data (not stored) |
| 3. Issue | Encrypted credential created on-chain with verified data | Aleo (on-chain) | **Nothing** — record encrypted |
| 4. Gate | DeFi protocol defines compliance requirements | Aleo (on-chain) | Gate config is public |
| 5. Prove | User generates ZK proof that credential meets gate | User's wallet (local) | **Nothing** — ZK proof |
| 6. Verify | Protocol checks proof_registry on-chain | Aleo (on-chain) | **Boolean only** — pass/fail |

---

## Real KYC Integration: Sumsub

ZK-Access integrates with [Sumsub](https://sumsub.com), a production KYC/AML provider used by Binance, MoonPay, Bybit, and 2,000+ companies worldwide.

### Why Sumsub

- **Production-grade KYC**: Government ID scanning, liveness detection, sanctions/PEP screening (SOC2 & ISO 27001)
- **Embedded WebSDK**: Verification widget runs directly in our app — user never leaves the page
- **Used by Binance, MoonPay, OKX, Bybit**: Judges recognize the provider, real industry credibility
- **Free sandbox**: Self-serve signup at [sumsub.com](https://sumsub.com), test verifications with auto-approval
- **Webhook callbacks**: Real-time verification result delivery to our backend
- **6,500+ document types**: 220+ countries and territories supported

### Integration Flow

```
User clicks "Start Identity Verification"
    │
    ▼
Backend generates Sumsub WebSDK access token (POST /api/kyc/token)
    │
    ▼
Sumsub WebSDK widget launches INSIDE our app:
  - User uploads government ID document
  - Completes liveness check (selfie match with document)
  - Sanctions & PEP screening runs automatically
    │
    ▼
Sumsub sends webhook to backend (POST /api/webhook/sumsub)
    │
    ▼
Backend extracts: age (from DOB), country (from ID), KYC status
    │
    ▼
Auto-issues encrypted credential on Aleo (or manual issuance via wallet)
    │
    ▼
User can now pass DeFi compliance gates with ZK proofs
```

### Backend API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Backend status, provider info |
| `/api/kyc/token` | POST | Generate Sumsub WebSDK access token |
| `/api/kyc/status?wallet=<address>` | GET | Check verification status |
| `/api/kyc/check` | POST | Poll applicant verification status |
| `/api/kyc/issue` | POST | Get verified data for manual credential issuance |
| `/api/webhook/sumsub` | POST | Sumsub webhook — verification result callbacks |
| `/api/kyc/pending` | GET | List pending verified users (issuer dashboard) |

---

## Smart Contract: `zkaccess_v3.aleo`

**12 transitions, 8 mappings, 2 records, 1 struct** — all using async transitions with on-chain finalization.

### Records (Private)

| Record | Fields | Purpose |
|--------|--------|---------|
| `Credential` | owner, issuer, credential_id, age, country_code, kyc_passed, accredited_investor, issued_at, expires_at | Encrypted credential — only owner can decrypt |
| `AccessToken` | owner, gate_id, claim_type, passed, proof_height | Proof that a user passed a gate or claim check |

### Mappings (Public On-Chain State)

| Mapping | Type | Purpose |
|---------|------|---------|
| `admin` | u8 => address | Admin address |
| `authorized_issuers` | address => bool | Issuer whitelist |
| `revoked_credentials` | field => bool | Revoked credential IDs |
| `gates` | field => GateConfig | Gate requirement configs |
| `gate_index` | u64 => field | Deterministic gate discovery |
| `gate_owners` | field => address | Gate creator addresses |
| `gate_counter` | u8 => u64 | Auto-increment gate IDs |
| `proof_registry` | field => u32 | Proof existence registry |

### Transitions

| Transition | Purpose |
|-----------|---------|
| `initialize_admin()` | Set deployer as admin (once) |
| `register_issuer(issuer)` | Admin adds authorized issuer |
| `revoke_issuer(issuer)` | Admin removes issuer |
| `issue_credential(recipient, age, country, kyc, accredited, validity, height)` | Issue credential (checks issuer auth) |
| `revoke_credential(credential_id)` | Revoke a credential |
| `renew_credential(credential, new_validity, height)` | Extend credential expiration |
| `create_gate(min_age, require_kyc, require_country, require_accredited)` | Create DeFi compliance gate |
| `deactivate_gate(gate_id)` | Gate owner disables gate |
| `pass_gate(credential, gate_id, min_age, kyc, country, accredited)` | **Core:** ZK proof that credential meets all gate requirements |
| `prove_single(credential, claim_type, min_age)` | Single-claim proof (age, KYC, country, accredited) |
| `verify_proof(subject)` | Third-party proof verification |

### Key Design: `pass_gate`

The `pass_gate` transition is the core innovation:

- **Private transition:** checks credential fields against gate requirements inside the ZK proof. Age, country, KYC, and investor status are verified privately — never revealed on-chain.
- **Async finalize:** validates gate exists and is active, credential is not revoked, not expired, and public inputs match gate config — preventing forgery.
- **Result:** only a boolean access token + proof_registry entry. Zero personal data on-chain.

---

## DeFi Compliance Gate Templates

ZK-Access ships with pre-built gate templates for real DeFi regulatory scenarios:

| Template | Requirements | Use Case |
|----------|-------------|----------|
| **OFAC-Compliant DEX** | 18+, KYC, non-restricted country | Standard DeFi compliance for decentralized exchanges |
| **SEC Accredited Pool** | 18+, KYC, non-restricted, accredited investor | Investment DAOs, lending pools, securities offerings |
| **Age-Gated DeFi** | 21+, KYC | Financial products requiring higher age verification |
| **Global KYC Gate** | KYC only | Basic identity verification, open to all countries |

Protocols can also create custom gates with any combination of requirements.

---

## Privacy Model

| What | Private? | How |
|------|----------|-----|
| Credential data (age, country, KYC) | **Always private** | Encrypted Aleo records — only owner's key can decrypt |
| Proof result | **Boolean only** | `pass_gate` reveals only "passed/failed" |
| Who issued to whom | **Private** | Issuer-recipient relationship inside encrypted record |
| Gate requirements | **Public** | Stored in mappings — verifiers see what gates require |
| Proof existence | **Public** | Recorded in `proof_registry` for verification |
| KYC documents | **Never on-chain** | Processed by Sumsub only, boolean facts extracted |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contract** | Leo (Aleo's ZK language) — async transitions + finalize |
| **Blockchain** | Aleo Testnet — privacy-preserving L1 |
| **KYC Provider** | Sumsub — production KYC used by Binance, MoonPay, Bybit |
| **KYC Bridge** | Node.js + Express — WebSDK token gen, webhook processing |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind 4 |
| **KYC Widget** | Sumsub WebSDK — embedded in-app verification |
| **Wallets** | Shield Wallet + Leo Wallet via @provablehq/aleo-wallet-adaptor |
| **Design** | Neo-brutalism design system |

---

## Pages

| Page | Purpose |
|------|---------|
| **Home** | Landing page — DeFi compliance narrative, pipeline visualization, use cases |
| **KYC** | Real identity verification through embedded Sumsub WebSDK — 3-step flow |
| **Issue** | Issue credentials with verified KYC data (issuer auth check) |
| **Credentials** | View encrypted credential records — expiration, revocation status |
| **Prove** | Generate ZK proofs — single claims or full gate access |
| **Gates** | Create/browse DeFi compliance gates with pre-built templates |
| **Verify** | Third-party proof verification + transaction activity |
| **Admin** | Issuer management, credential revocation (admin only) |

---

## Demo Walkthrough

> Requires [Shield Wallet](https://shield.app) or [Leo Wallet](https://www.leo.app/) on Aleo Testnet.

### Full Pipeline Demo (Real KYC to ZK Proof)

1. **Connect Wallet** — Install Shield Wallet, switch to Testnet, visit the live demo
2. **Admin Setup** — Go to Admin, Initialize Admin, Register your address as issuer
3. **Verify Identity** — Go to KYC, click "Start Identity Verification", complete Sumsub verification in the embedded widget (sandbox auto-approves)
4. **Receive Credential** — After KYC approval, issue your encrypted credential with verified data
5. **Create DeFi Gate** — Go to Gates, use "OFAC-Compliant DEX" template, create gate on-chain
6. **Pass Gate Privately** — Go to Prove, select credential, enter gate ID, generate ZK proof
7. **Verify On-Chain** — Go to Verify, enter your address, confirm proof exists in registry

Every action is a real Aleo transaction with async finalization. **No mocks. Real KYC. Real ZK proofs.**

### Judge Quick Test (5-7 Minutes)

1. Connect wallet on testnet — Home page preflight card shows status
2. Admin, Initialize Admin (skip if done)
3. Admin, Register Issuer with connected wallet address
4. Home, Refresh Checks, confirm "Authorized issuer"
5. **KYC** — click "Start Identity Verification" — Sumsub widget opens in-page
6. Complete verification in sandbox (auto-approved with test documents)
7. After verification, issue credential with KYC-verified data
8. Gates, use "OFAC-Compliant DEX" template, create gate
9. Prove, select credential, pass gate with ZK proof
10. Verify, enter your address, confirm proof exists

**Expected:** Sumsub verification (in-app widget) -> encrypted credential -> ZK gate pass -> on-chain proof. Full privacy pipeline.

---

## Run Locally

### Frontend

```bash
cd frontend
cp .env.example .env
npm install --legacy-peer-deps
npm run dev
```

### KYC Bridge Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Sumsub credentials (https://sumsub.com → Dashboard → Developers)
npm install
npm run dev
```

The backend requires:
- **Sumsub account** — sign up free at [sumsub.com](https://sumsub.com), get App Token + Secret Key from Dashboard > Developers
- **Aleo issuer key** (optional) — for auto-credential issuance; omit for manual mode

### Deploy Contract

```bash
cd zkaccess
leo build
export ALEO_PRIVATE_KEY="YOUR_PRIVATE_KEY"
./deploy_testnet.sh
```

After deployment:
1. Call `initialize_admin` to set yourself as admin
2. Call `register_issuer` with your address to authorize yourself as issuer
3. Create demo gates using the DeFi compliance templates

---

## Project Structure

```
aleo-zk/
├── zkaccess/
│   ├── src/main.leo              # Leo program (12 transitions, 8 mappings)
│   ├── build/main.aleo           # Compiled AVM bytecode
│   ├── deploy_testnet.sh         # Testnet deployment script
│   └── program.json
├── backend/                      # KYC Bridge (Sumsub integration)
│   ├── src/
│   │   ├── index.ts              # Express server — token gen, webhooks, status API
│   │   ├── config.ts             # Environment config (Sumsub + Aleo)
│   │   ├── store.ts              # Verification state store
│   │   └── services/
│   │       ├── fractal.ts        # Sumsub API — HMAC auth, applicant data, webhooks
│   │       └── aleo.ts           # Aleo credential issuance service
│   ├── .env.example
│   └── package.json
├── frontend/                     # React 18 + TypeScript + Tailwind 4
│   ├── src/
│   │   ├── pages/                # Home, KYC, Issue, Credentials, Prove, Gates, Verify, Admin
│   │   ├── context/              # WalletContext (transactions, mappings, admin)
│   │   ├── components/           # Navbar, Layout, ToastContainer
│   │   └── types/                # TypeScript interfaces
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## Wave 4 Changelog

### What's New Since Wave 3

**Real KYC Integration (Sumsub):**
- **Backend KYC bridge service** — Express server with Sumsub HMAC-authenticated API, webhook processing, credential issuance
- **Embedded Sumsub WebSDK** — real government ID scanning, liveness detection, sanctions screening directly in the app (user never leaves)
- **Auto-credential issuance** — backend webhook extracts verified KYC data and issues on-chain credentials automatically
- **New KYC page** — 3-step verification flow with embedded widget, live status polling, pipeline visualization

**DeFi Compliance Focus:**
- **Pre-built gate templates** — OFAC-Compliant DEX, SEC Accredited Pool, Age-Gated DeFi, Global KYC
- **Updated use cases** — SEC accredited access, OFAC-compliant DeFi, age-gated finance
- **Home page redesign** — DeFi compliance narrative with real KYC integration pipeline

**Architecture:**
- **3-tier architecture** — Frontend (with embedded KYC widget) + KYC Bridge Backend + Aleo smart contract
- **Dual issuance modes** — automated (backend with SDK) or manual (wallet-based with verified data)
- **Webhook support** — real-time verification result callbacks from Sumsub

### Previous feedback addressed
- "Deploy the latest v3 contract" → v3 deployed on testnet
- "Consider integration with actual KYC providers" → Sumsub (production KYC provider — Binance, MoonPay, Bybit)
- "Gate system for DeFi protocol compliance is promising" → Pre-built DeFi compliance templates, real regulatory scenarios

---

## License

MIT

---

Built for [Aleo](https://aleo.org) | KYC by [Sumsub](https://sumsub.com) | [Shield Wallet](https://shield.app) | [AleoScan](https://testnet.aleoscan.io/program?id=zkaccess_v3.aleo)
