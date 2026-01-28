# ZK-Access: Production-Grade Privacy Infrastructure for Aleo

**Cryptographically-sound identity and credential verification with real ZK proofs.**

---

## Overview

ZK-Access is a privacy-preserving identity and credential system built for Aleo mainnet deployment. It implements:

- **Private Identity Vaults** with nullifier-based clone prevention
- **Verifiable Credentials** with real ZK constraint logic
- **Selective Disclosure Proofs** that reveal ONLY boolean results
- **Privacy-Preserving Revocation** via unlinkable nullifiers
- **Composable Verification** for third-party protocol integration

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ZK-ACCESS SYSTEM ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │  identity.aleo   │    │ credential.aleo  │    │  verifier.aleo   │      │
│  ├──────────────────┤    ├──────────────────┤    ├──────────────────┤      │
│  │ • Identity vault │    │ • ZK proof gen   │    │ • Proof verify   │      │
│  │ • Binding tokens │───▶│ • Issuer auth    │───▶│ • Replay prevent │      │
│  │ • Clone prevent  │    │ • Revocation     │    │ • Result compose │      │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘      │
│                                                                              │
│  PRIVATE (Records):     PRIVATE (Records):      PRIVATE (Records):          │
│  - Identity             - Credential            - CredentialProof           │
│  - IdentityBinding      - CredentialProof       - VerificationResult        │
│                                                                              │
│  PUBLIC (Mappings):     PUBLIC (Mappings):      PUBLIC (Mappings):          │
│  - identity_nullifiers  - authorized_issuers   - consumed_nonces            │
│  - used_binding_nonces  - revoked_nullifiers   - consumed_verifications     │
│                         - issuer_nonces                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Programs

### identity.aleo

Private identity management with cryptographic ownership enforcement.

| Transition | Purpose | Security |
|------------|---------|----------|
| `create_identity` | Create identity vault | Nullifier prevents cloning |
| `update_identity` | Update identity data | Ownership via record consumption |
| `create_binding` | Generate binding for issuers | Nonce prevents replay |
| `verify_commitment` | Verify data integrity | Owner-only access |
| `destroy_identity` | Permanently delete | Owner-only, irreversible |

### credential.aleo

Verifiable credentials with real ZK proof generation.

| Transition | Purpose | ZK Constraints |
|------------|---------|----------------|
| `issue_credential` | Issue to user | Issuer authorization in finalize |
| `prove_age_minimum` | Prove age ≥ N | `assert(credential.age >= minimum_age)` |
| `prove_kyc_status` | Prove KYC passed | `assert(credential.kyc_passed)` |
| `prove_country_not_restricted` | Prove not in restricted set | `assert(country ≠ restricted[i])` |
| `prove_accredited_investor` | Prove accreditation | `assert(credential.accredited_investor)` |
| `prove_composite` | Multi-claim proof | Age + KYC + Country in one proof |
| `revoke_credential` | Revoke by issuer | Requires secret, adds nullifier |

### verifier.aleo

Composable proof verification for third-party protocols.

| Transition | Purpose | Security |
|------------|---------|----------|
| `verify_proof` | Verify any proof type | Nonce consumption prevents replay |
| `verify_age_proof` | Verify age proof | Type-specific validation |
| `verify_kyc_proof` | Verify KYC proof | Type-specific validation |
| `consume_verification` | Use result once | Verification ID consumption |

---

## ZK Proof Guarantees

### What the Circuit Proves

For `prove_age_minimum(credential, minimum_age=18)`:

```
∃ credential such that:
  1. credential.owner == self.caller        (ownership)
  2. credential.age >= minimum_age          (predicate)
  3. credential.expires_at > current_block  (validity)
  4. credential not in revoked_nullifiers   (not revoked)
```

### What is NOT Revealed

- User's actual age (only that age ≥ 18)
- User's country (only that country ∉ restricted set)
- User's identity
- Credential contents
- Issuer-user relationship

---

## Project Structure

```
aleo-zk/
├── identity/
│   ├── src/main.leo          # Identity program (356 lines)
│   └── program.json
├── credential/
│   ├── src/main.leo          # Credential program (829 lines)
│   └── program.json
├── verifier/
│   ├── src/main.leo          # Verifier program (340 lines)
│   └── program.json
├── CLI_EXAMPLES.md           # Complete CLI examples
├── THREAT_MODEL.md           # Security analysis
├── PRIVACY_MODEL.md          # Privacy guarantees
└── README.md
```

---

## Testnet Deployment

All programs have been deployed to Aleo Testnet.

| Program | Program ID | Transaction ID |
|---------|------------|----------------|
| **Identity** | `zkaccess_id_v1.aleo` | [`at1upv50wart4lal3sqwf7qyvjwk0lf4l7l40wpjjg2vze0schkx59s9lgj7f`](https://testnet.aleo.info/transaction/at1upv50wart4lal3sqwf7qyvjwk0lf4l7l40wpjjg2vze0schkx59s9lgj7f) |
| **Credential** | `zkaccess_cred_v1.aleo` | [`at1rc0xjgyx7camstj9lglnn9jkgnrxgvye7sljfhreuf5qc0uhsqps85dfrf`](https://testnet.aleo.info/transaction/at1rc0xjgyx7camstj9lglnn9jkgnrxgvye7sljfhreuf5qc0uhsqps85dfrf) |
| **Verifier** | `zkaccess_verif_v1.aleo` | [`at1qkxkadfp3cwkaqmrnzx6y05j8rfk6n6gntkey3202v4x8xphcyxq9h5unn`](https://testnet.aleo.info/transaction/at1qkxkadfp3cwkaqmrnzx6y05j8rfk6n6gntkey3202v4x8xphcyxq9h5unn) |

**Deployment Details:**
- Network: Aleo Testnet
- Consensus Version: 12
- Deployer: `aleo15ac90dsv2cayepmctwtqg0qugag3myahx8nt7tnq9s3kpmu0l5xsdcz3lv`

---

## Security Properties

| Property | Mechanism | Guarantee |
|----------|-----------|-----------|
| **Record Privacy** | AES encryption | Only owner can decrypt |
| **Ownership Enforcement** | Record consumption + assertion | Cryptographic, not just logical |
| **Clone Prevention** | Nullifier registration | Cannot create duplicate identity |
| **Issuer Authorization** | Finalize mapping check | Only authorized can issue |
| **Replay Prevention** | Nonce tracking | Each proof/binding usable once |
| **Revocation Privacy** | Nullifier scheme | Cannot link to credential |

---

## Compliance Summary

### Wave 1: Private Identity Core ✓

| Requirement | Implementation |
|-------------|----------------|
| Leo program `identity.aleo` | ✅ Full implementation with nullifiers |
| Private identity record | ✅ Encrypted record with 6 fields |
| Unique identifier (hashed) | ✅ `identity_commitment` via BHP256 |
| Owner-only updates | ✅ Record consumption + assertion |
| Create/read/update | ✅ All transitions implemented |
| No public identity data | ✅ Only nullifiers in mappings |

### Wave 2: Private Credentials ✓

| Requirement | Implementation |
|-------------|----------------|
| Leo program `credential.aleo` | ✅ Full implementation with ZK proofs |
| Issuer role | ✅ `authorized_issuers` + admin control |
| Encrypted credentials | ✅ 15-field credential record |
| Identity binding | ✅ `subject_commitment` from identity |
| Claims (age, country, kyc) | ✅ All implemented with ZK constraints |
| Real ZK proofs | ✅ Circuit constraints, not stubs |
| Revocation | ✅ Nullifier-based, unlinkable |
| Verifier program | ✅ Composable verification |

---

## Documentation

- **[CLI_EXAMPLES.md](./CLI_EXAMPLES.md)** - Complete command examples with expected outputs
- **[THREAT_MODEL.md](./THREAT_MODEL.md)** - Security analysis and attack resistance
- **[PRIVACY_MODEL.md](./PRIVACY_MODEL.md)** - Privacy guarantees explained

---

## For Auditors

### What to Verify

1. **ZK Constraints**: Check that `assert` statements in `prove_*` transitions correctly implement the claimed predicate
2. **Authorization Logic**: Verify finalize blocks check `authorized_issuers` before state changes
3. **Nullifier Scheme**: Confirm nullifiers are computed correctly and checked in finalize
4. **Replay Prevention**: Verify all nonces are registered and checked before use
5. **Record Ownership**: Confirm `assert_eq(record.owner, self.caller)` in all relevant transitions

### Key Files

- `credential.aleo:370-448` - Age proof ZK constraints
- `credential.aleo:460-527` - KYC proof ZK constraints
- `credential.aleo:546-630` - Country restriction ZK constraints
- `credential.aleo:327-350` - Revocation logic
- `verifier.aleo:97-165` - Proof verification logic

---

## License

MIT

---

**Built for Aleo Mainnet** | Cryptographically Sound | Production Ready
