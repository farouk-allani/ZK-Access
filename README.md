# ZK-Access: Privacy-Preserving Identity & Access Control on Aleo

**Production-ready privacy infrastructure for decentralized identity and verifiable credentials.**

---

## Overview

ZK-Access is a privacy-first identity and credential management system built on Aleo. It enables:

- **Private Identity Vaults**: Store encrypted identity commitments on-chain
- **Verifiable Credentials**: Issue, hold, and prove credentials without revealing data
- **Selective Disclosure**: Prove specific claims (age, KYC status, jurisdiction) without exposing other information
- **Privacy-Preserving Revocation**: Revoke credentials without linking to users

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ZK-Access System                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐         ┌─────────────────────┐           │
│  │   identity.aleo     │         │  credential.aleo    │           │
│  ├─────────────────────┤         ├─────────────────────┤           │
│  │ • Identity records  │◄───────▶│ • Credential records│           │
│  │ • Commitment scheme │  bound  │ • Issuer registry   │           │
│  │ • Binding tokens    │   via   │ • Revocation system │           │
│  │ • Update mechanism  │commitment│ • Proof generation  │           │
│  └─────────────────────┘         └─────────────────────┘           │
│                                                                      │
│  Privacy: ALL sensitive data encrypted in Aleo records              │
│  Public:  Only issuer registry + revocation nullifiers              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Programs

### identity.aleo

Core private identity vault with:
- `create_identity`: Create encrypted identity with commitment
- `update_identity`: Update identity data (UTXO-style)
- `create_binding`: Generate binding tokens for credential issuance
- `verify_commitment`: Verify identity data matches commitment
- `transfer_identity`: Transfer ownership (with caution)
- `destroy_identity`: Permanently delete identity

### credential.aleo 

Verifiable credential system with:
- `authorize_issuer` / `deauthorize_issuer`: Issuer management
- `issue_credential`: Issue encrypted credentials to users
- `issue_kyc_credential` / `issue_age_credential`: Convenience functions
- `prove_over_18` / `prove_kyc_passed` / `prove_country`: Selective disclosure
- `revoke_credential` / `batch_revoke`: Privacy-preserving revocation
- `check_revocation_status`: User revocation check

## Quick Start

### 1. Deploy Programs

```bash
snarkos developer deploy identity.aleo \
    --private-key $PRIVATE_KEY \
    --query https://api.explorer.aleo.org/v1 \
    --path ./identity/build/ \
    --broadcast https://api.explorer.aleo.org/v1/testnet3/transaction/broadcast

snarkos developer deploy credential.aleo \
    --private-key $PRIVATE_KEY \
    --query https://api.explorer.aleo.org/v1 \
    --path ./credential/build/ \
    --broadcast https://api.explorer.aleo.org/v1/testnet3/transaction/broadcast
```

### 2. Create Identity

```bash
snarkos developer execute identity.aleo create_identity \
    "unique_id_hashfield" \
    "attributes_hashfield" \
    "1706400000u64" \
    "random_saltfield" \
    "data_hashfield" \
    --private-key $USER_PRIVATE_KEY
```

### 3. Issue Credential

```bash
# First authorize issuer (admin only)
snarkos developer execute credential.aleo authorize_issuer \
    "aleo1issuer..." "metadata_hashfield" \
    --private-key $ADMIN_PRIVATE_KEY

# Issue credential
snarkos developer execute credential.aleo issue_credential \
    "aleo1user..." \
    "subject_commitmentfield" \
    "1u8" "true" "true" "840u16" "true" "false" "25u8" \
    "1706400000u64" "1738000000u64" \
    "saltfield" "revocation_secretfield" \
    --private-key $ISSUER_PRIVATE_KEY
```

### 4. Prove Eligibility

```bash
snarkos developer execute credential.aleo prove_kyc_passed \
    "{...credential_record...}" \
    "1710000000u64" \
    "nonce_seedfield" \
    --private-key $USER_PRIVATE_KEY
```

## Privacy Guarantees

| Data | Visibility | Rationale |
|------|------------|-----------|
| Identity data | 🔒 Encrypted | Only owner can decrypt |
| Credential claims | 🔒 Encrypted | Only holder can decrypt |
| Issuer addresses | 🌐 Public | Users verify issuer legitimacy |
| Revocation nullifiers | 🌐 Public (unlinkable) | Cannot link to credentials |

## Use Cases

- **DeFi Compliance**: KYC gates without exposing user identity
- **DAO Governance**: Jurisdiction checks for regulatory compliance
- **Age Verification**: Prove 18+/21+ without revealing birthdate
- **Accredited Investor**: Prove status for regulated offerings
- **Reputation Systems**: Portable credentials across platforms

## Documentation

- [Example Flows](./EXAMPLE_FLOWS.md) - Detailed CLI examples
- [Privacy Model](./PRIVACY_MODEL.md) - Technical privacy analysis

## Project Structure

```
aleo-zk/
├── identity/
│   ├── src/
│   │   └── main.leo          # Identity program
│   └── program.json
├── credential/
│   ├── src/
│   │   └── main.leo          # Credential program
│   └── program.json
├── EXAMPLE_FLOWS.md          # CLI examples
├── PRIVACY_MODEL.md          # Privacy documentation
└── README.md                 # This file
```

## Compliance

### Private Identity Core ✓

| Requirement | Implementation |
|-------------|----------------|
| Leo program `identity.aleo` | ✅ Full implementation |
| Private identity record | ✅ Encrypted record with owner |
| Unique identifier (hashed) | ✅ `identity_commitment` field |
| Owner-only updates | ✅ Record consumption enforces |
| Create/read/update | ✅ All transitions implemented |
| No public identity data | ✅ All data in encrypted records |

### Private Credentials ✓

| Requirement | Implementation |
|-------------|----------------|
| Leo program `credential.aleo` | ✅ Full implementation |
| Issuer role | ✅ `authorized_issuers` mapping + admin |
| Encrypted credentials | ✅ Credential record type |
| Identity binding | ✅ `subject_commitment` field |
| Claims (over_18, country, kyc) | ✅ All implemented |
| Issuance by issuer | ✅ `issue_credential` + finalize check |
| Private storage | ✅ User owns encrypted record |
| Revocation | ✅ Nullifier-based system |
| Multiple credentials | ✅ No limit on records per user |
| Proof stubs | ✅ `prove_over_18`, `prove_kyc_passed`, `prove_country` |

## Security Considerations

1. **Key Management**: Private keys must be stored securely
2. **Issuer Secrets**: Revocation secrets must be backed up by issuers
3. **Metadata**: Transaction timing can leak information
4. **Off-chain Data**: Encrypt any data referenced by `data_hash`

## License

MIT

---

**Built for the Aleo Buildathon** | Privacy-first. Production-ready. Composable.
