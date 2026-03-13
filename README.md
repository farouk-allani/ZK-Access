# ZK-Access v3

**Privacy-Preserving ZK-Gated Access Control Protocol on Aleo.**

Issue credentials, create access gates, prove eligibility — without ever exposing personal data.

**Live Demo:** [zk-access-liard.vercel.app](https://zk-access-liard.vercel.app)
**Program:** [`zkaccess_v3.aleo`](https://testnet.aleoscan.io/program?id=zkaccess_v3.aleo)
**Wallet Support:** [Shield Wallet](https://shield.app) & [Leo Wallet](https://www.leo.app/)

---

## What It Does

ZK-Access is a **ZK-Gated Access Control Protocol** — any service or dApp can define access requirements ("gates"), and users privately prove they meet those requirements without revealing personal data.

1. **Authorized Issuers** create encrypted credential records with expiration
2. **Services** create access gates with custom requirements (age, KYC, country, accredited investor)
3. **Users** pass gates by proving their credential meets all requirements — privately
4. **Anyone** can verify a proof exists on-chain — without learning what was proven

### Why Privacy Matters Here

Traditional access control requires sharing sensitive personal data (passport, ID, income proof) with every service. Each verification creates a new data exposure point. ZK-Access inverts this: the user holds their credential privately and proves only the boolean result (pass/fail) to any verifier. No data leaves the wallet.

The **gate system** makes this composable: instead of each service building custom verification, they define a gate and ZK-Access handles the private proving.

---

## Program: `zkaccess_v3.aleo`

**12 transitions, 7 mappings, 2 records, 1 struct** — all using async transitions with on-chain finalization.

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
| `gate_owners` | field => address | Gate creator addresses |
| `gate_counter` | u8 => u64 | Auto-increment gate IDs |
| `proof_registry` | field => u32 | Proof existence registry |

### Transitions

| Transition | Type | Purpose |
|-----------|------|---------|
| `initialize_admin()` | async | Set deployer as admin (once) |
| `register_issuer(issuer)` | async | Admin adds authorized issuer |
| `revoke_issuer(issuer)` | async | Admin removes issuer |
| `issue_credential(recipient, age, country, kyc, accredited, validity)` | async | Issue credential (checks issuer auth) |
| `revoke_credential(credential_id)` | async | Revoke a credential |
| `renew_credential(credential, new_validity)` | async | Reissue expired credential |
| `create_gate(min_age, require_kyc, require_country, require_accredited)` | async | Create access gate |
| `deactivate_gate(gate_id)` | async | Gate owner disables gate |
| `pass_gate(credential, gate_id, min_age, kyc, country, accredited)` | async | **Core:** privately prove credential meets gate |
| `prove_single(credential, claim_type, min_age)` | async | Single-claim proof with checks |
| `verify_proof(subject)` | async | Third-party proof verification |

### Key Design: `pass_gate`

The `pass_gate` transition demonstrates Aleo's privacy model at its best:

- **Private transition:** asserts credential fields against gate requirements in the ZK proof. The user's age, country, KYC status, and investor status are checked privately — never revealed on-chain.
- **Async finalize:** validates the gate is active, credential is not revoked, not expired, and the public inputs match the actual gate config in the mapping — preventing forgery.
- **Result:** only a boolean access token is created. The proof is recorded in the `proof_registry` for third-party verification.

---

## Privacy Model

| What | Private? | How |
|------|----------|-----|
| Credential data (age, country, KYC, etc.) | **Always private** | Encrypted Aleo records — only owner's key can decrypt |
| Proof result | **Boolean only** | `pass_gate` reveals only "passed/failed", not which checks passed |
| Who issued to whom | **Private** | Issuer-recipient relationship inside encrypted record |
| Gate requirements | **Public** | Stored in mappings — verifiers can see what gates require |
| Proof existence | **Public** | Recorded in `proof_registry` — verifiers can confirm a proof exists |
| Credential data in proofs | **Never revealed** | Consumed as private input; Aleo guarantees it stays private |
| Execution | **Local** | Proof generation happens in the user's wallet/browser |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  ┌─────────┬────────┬───────┬───────┬─────┬───────┐ │
│  │  Issue  │ Creds  │ Prove │ Gates │ Verify│Admin │ │
│  └────┬────┴───┬────┴───┬───┴───┬───┴───┬──┴───┬──┘ │
│       │        │        │       │       │      │     │
│       └────────┴────────┴───┬───┴───────┴──────┘     │
│                             │                        │
│              WalletContext + queryMapping             │
│                     │              │                  │
└─────────────────────┼──────────────┼──────────────────┘
                      │              │
              ┌───────▼───────┐ ┌────▼──────────┐
              │ Shield / Leo  │ │ Aleo REST API │
              │    Wallet     │ │  (Mappings)   │
              └───────┬───────┘ └───────────────┘
                      │
              ┌───────▼───────────────────────┐
              │     zkaccess_v3.aleo          │
              │  ┌─────────────────────────┐  │
              │  │  Private Transitions    │  │
              │  │  (ZK proof generation)  │  │
              │  └───────────┬─────────────┘  │
              │              │                │
              │  ┌───────────▼─────────────┐  │
              │  │  Async Finalize         │  │
              │  │  (On-chain validation)  │  │
              │  │  7 Mappings             │  │
              │  └─────────────────────────┘  │
              └───────────────────────────────┘
```

---

## Tech Stack

- **Leo** — Aleo's ZK programming language (async transitions + mappings)
- **Aleo Testnet** — privacy-preserving L1
- **Shield Wallet / Leo Wallet** — via `@provablehq/aleo-wallet-adaptor-react` (official Provable SDK)
- **React 18 + Vite + Tailwind 4** — frontend
- **TypeScript** — full type safety
- **Neo-brutalism** — distinctive design system

---

## Pages

| Page | Purpose |
|------|---------|
| **Home** | Landing page with features, steps, and use cases |
| **Issue** | Issue credentials (with issuer authorization check and validity period) |
| **Credentials** | View credential records with expiration and revocation status |
| **Prove** | Generate single proofs or pass access gates |
| **Gates** | Create and browse ZK access gates |
| **Verify** | Third-party proof verification + transaction activity |
| **Admin** | Issuer management and credential revocation (admin only) |

---

## Demo Walkthrough

> Requires [Shield Wallet](https://shield.app) or [Leo Wallet](https://www.leo.app/) on Aleo Testnet.

1. Install Shield Wallet and switch to **Testnet**
2. Visit the [live demo](https://zk-access-liard.vercel.app) and connect your wallet
3. **Admin Setup** (first time): Go to Admin → Initialize Admin → Register your address as an issuer
4. **Issue**: Go to Issue → Fill in claims → Select validity period → Submit
5. **Create Gate**: Go to Gates → Create → Set requirements (e.g., 18+, KYC) → Submit
6. **Pass Gate**: Go to Prove → Select credential → Choose "ZK-Gate Access" → Enter gate ID → Pass
7. **Verify**: Go to Verify → Enter subject address → Check proof exists on-chain

Every action is a real Aleo transaction with async finalization. No mocks.

---

## Run Locally

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

The frontend connects to the deployed `zkaccess_v3.aleo` on Aleo Testnet.

### Deploy the program yourself

```bash
cd zkaccess
leo build
leo deploy --private-key YOUR_KEY --network testnet \
  --endpoint "https://api.explorer.provable.com/v1" \
  --broadcast --priority-fees 5000000 --yes
```

After deployment:
1. Call `initialize_admin` to set yourself as admin
2. Call `register_issuer` with your address to authorize yourself as an issuer
3. Optionally create a demo gate with `create_gate`

---

## Wave 3 Progress Changelog

### What changed since Wave 2

**Smart Contract (complete rewrite):**
- **Collapsed from 5 simple transitions to 12 async transitions with on-chain finalization**
- Added **7 on-chain mappings** (admin, authorized_issuers, revoked_credentials, gates, gate_owners, gate_counter, proof_registry)
- **Issuer authorization**: only admin-approved issuers can create credentials (fixed the trust model)
- **Credential expiration**: credentials have a validity period based on block height
- **Credential revocation**: admin/issuers can revoke credentials, revoked credentials can't generate proofs
- **ZK-Gates** (new feature): programmable access gates with custom requirements
- **`pass_gate` transition**: privately prove credential meets all gate requirements at once
- **`prove_single` transition**: unified single-claim proof with revocation/expiration checks
- **On-chain proof registry**: proofs recorded in mapping for third-party verification
- **`verify_proof` transition**: anyone can verify a proof exists on-chain
- Every transition uses **async/finalize** pattern — private computation + public validation

**Frontend:**
- **2 new pages**: Gates (create/browse access gates) and Admin (issuer management)
- **Issue page**: added validity period selector, issuer authorization status check
- **Credentials page**: shows expiration status, revocation status, credential IDs
- **Prove page**: added "ZK-Gate Access" proof mode alongside single proofs, gate config lookup
- **Verify page**: complete rewrite — real third-party proof verification via mapping query + activity tab
- **Home page**: updated messaging to "ZK-Gated Access Control Protocol", added use cases section
- **Navbar**: added Gates and Admin (conditional) links
- Frontend queries **on-chain mappings** via Aleo REST API for real-time data

### Feedback incorporated
- "Broken trust model" → Issuer authorization with mapping + admin role
- "No on-chain state" → 7 mappings, every transition uses async/finalize
- "Verify page is just tx history" → Real proof verification + activity tabs
- "Not novel enough" → ZK-Gated Access Control Protocol (programmable gates)
- "No credential expiration" → Block height based expiration + revocation

### Next wave goals
- Mainnet deployment
- Credential delegation (share proofs across wallets)
- Multi-gate composition (pass multiple gates atomically)
- Gate marketplace / directory
- Integration with credits.aleo for gate access fees

---

## Project Structure

```
aleo-zk/
├── zkaccess/
│   ├── src/main.leo          # Leo program (~300 lines, 12 transitions, 7 mappings)
│   └── program.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx          # AleoWalletProvider + WalletModalProvider
│   │   ├── context/          # WalletContext (executeTransaction, queryMapping, isAdmin)
│   │   ├── pages/            # Home, Issue, Credentials, Prove, Gates, Verify, Admin
│   │   ├── components/       # Navbar, Layout, ToastContainer
│   │   └── types/            # TypeScript types (GateConfig, ParsedCredential, etc.)
│   └── package.json
└── README.md
```

---

## License

MIT

---

Built for [Aleo](https://aleo.org) | [Shield Wallet](https://shield.app) | [AleoScan](https://testnet.aleoscan.io/program?id=zkaccess_v3.aleo)
