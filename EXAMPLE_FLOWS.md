# ZK-Access Example Flows

This document provides detailed CLI-style examples for all major operations in ZK-Access.

## Prerequisites

```bash
# Install snarkOS CLI
cargo install snarkos

# Set your private key (example - use your actual key)
export PRIVATE_KEY=APrivateKey1zkp...

# Set the network endpoint
export ENDPOINT="https://api.explorer.aleo.org/v1"
export BROADCAST="${ENDPOINT}/testnet3/transaction/broadcast"
```

---

##  Identity Operations

### Flow 1.1: Create New Identity

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Prepare identity data OFF-CHAIN
# ═══════════════════════════════════════════════════════════════════════════════
#
# In your client application, compute:
#
# unique_id_hash = BHP256::hash_to_field("passport:ABC123456")
#   → Example: 1234567890123456789012345678901234567890123456789012345678901234field
#
# attributes_hash = BHP256::hash_to_field({
#   "full_name": "Alice Smith",
#   "date_of_birth": "1990-05-15",
#   "nationality": "US"
# })
#   → Example: 9876543210987654321098765432109876543210987654321098765432109876field
#
# salt = ChaCha20::random_field()
#   → Example: 4242424242424242424242424242424242424242424242424242424242424242field
#
# data_hash = BHP256::hash_to_field("ipfs://QmYwAPJzv5CZsnA...")
#   → Example: 1111222233334444555566667777888899990000111122223333444455556666field

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Create identity on-chain
# ═══════════════════════════════════════════════════════════════════════════════

snarkos developer execute identity.aleo create_identity \
    "1234567890123456789012345678901234567890123456789012345678901234field" \
    "9876543210987654321098765432109876543210987654321098765432109876field" \
    "1706400000u64" \
    "4242424242424242424242424242424242424242424242424242424242424242field" \
    "1111222233334444555566667777888899990000111122223333444455556666field" \
    --private-key $PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# ═══════════════════════════════════════════════════════════════════════════════
# RESULT
# ═══════════════════════════════════════════════════════════════════════════════
#
# Transaction ID: at1abc123...
#
# The user receives an encrypted Identity record:
# {
#   owner: aleo1user...,                    (encrypted)
#   identity_commitment: 5555666677778888..., (encrypted)
#   data_hash: 1111222233334444...,          (encrypted)
#   version: 1u32,                           (encrypted)
#   salt: 4242424242...                      (encrypted)
# }
#
# Only the user with the matching viewing key can decrypt this record.
# On-chain, observers see only encrypted ciphertext.
```

### Flow 1.2: Update Identity

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# User wants to update their identity (e.g., changed name or attributes)
# ═══════════════════════════════════════════════════════════════════════════════

# First, retrieve your existing identity record from your wallet
# The record is encrypted - only you can see its contents

EXISTING_RECORD='{
  owner: aleo1user...,
  identity_commitment: 5555666677778888field,
  data_hash: 1111222233334444field,
  version: 1u32,
  salt: 4242424242424242424242424242424242424242424242424242424242424242field
}'

snarkos developer execute identity.aleo update_identity \
    "$EXISTING_RECORD" \
    "1234567890123456789012345678901234567890123456789012345678901234field" \
    "1111111111111111111111111111111111111111111111111111111111111111field" \
    "1706400000u64" \
    "9999999999999999999999999999999999999999999999999999999999999999field" \
    "2222333344445555666677778888999900001111222233334444555566667777field" \
    --private-key $PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Result: Old record consumed, new record created with version: 2u32
```

### Flow 1.3: Create Identity Binding for Credential Issuance

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# User needs to create a binding token to give to a credential issuer
# This proves identity ownership without revealing identity data
# ═══════════════════════════════════════════════════════════════════════════════

# The binding_context is a hash of the purpose, e.g.:
# binding_context = BHP256::hash_to_field("kyc_credential_binding")

snarkos developer execute identity.aleo create_binding \
    "$EXISTING_RECORD" \
    "8888777766665555444433332222111100009999888877776666555544443333field" \
    "1234567890field" \
    --private-key $PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Result: User receives (Identity, IdentityBinding) tuple
# The IdentityBinding contains:
# - identity_commitment: Links to the user's identity
# - binding_context: Proves this binding is for a specific purpose
# - nonce: Prevents replay attacks
```

---

##  Credential Operations

### Flow 2.1: Initialize Admin and Authorize Issuer

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Program deployer initializes admin
# ═══════════════════════════════════════════════════════════════════════════════

# Only needs to be done once after program deployment
snarkos developer execute credential.aleo initialize_admin \
    "aleo1admin_address_here..." \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Admin authorizes a KYC provider as an issuer
# ═══════════════════════════════════════════════════════════════════════════════

# metadata_hash = BHP256::hash_to_field({
#   "name": "TrustVerify KYC Inc.",
#   "certification": "ISO 27001",
#   "website": "https://trustverify.example.com"
# })

snarkos developer execute credential.aleo authorize_issuer \
    "aleo1kyc_provider_address..." \
    "7777666655554444333322221111000099998888777766665555444433332222field" \
    --private-key $ADMIN_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Result: authorized_issuers[aleo1kyc_provider...] = true
# The issuer can now issue credentials
```

### Flow 2.2: Issue KYC Credential

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# KYC provider issues a credential to a user who passed verification
# ═══════════════════════════════════════════════════════════════════════════════

# Issuer has received the user's identity_commitment via binding token
# Issuer generates:
#   - salt: random field for credential hash
#   - revocation_secret: random field (MUST be stored securely by issuer)

snarkos developer execute credential.aleo issue_credential \
    "aleo1user_address..." \
    "5555666677778888999900001111222233334444555566667777888899990000field" \
    "1u8" \
    "true" \
    "true" \
    "840u16" \
    "true" \
    "false" \
    "25u8" \
    "1706400000u64" \
    "1738000000u64" \
    "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefield" \
    "secret_revocation_key_stored_by_issuerfield" \
    --private-key $ISSUER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Parameter breakdown:
# - recipient: aleo1user_address...
# - subject_commitment: User's identity commitment (from binding)
# - credential_type: 1u8 (TYPE_KYC)
# - over_18: true
# - over_21: true
# - country_code: 840u16 (USA - ISO 3166-1 numeric)
# - kyc_passed: true
# - accredited_investor: false
# - risk_score: 25u8 (low risk)
# - issued_at: 1706400000u64 (block height or timestamp)
# - expires_at: 1738000000u64 (1 year later)
# - salt: random
# - revocation_secret: issuer's secret for revocation

# ═══════════════════════════════════════════════════════════════════════════════
# RESULT
# ═══════════════════════════════════════════════════════════════════════════════
#
# User receives encrypted Credential record:
# {
#   owner: aleo1user...,
#   issuer: aleo1kyc_provider...,
#   subject_commitment: 5555666677778888...,
#   credential_type: 1u8,
#   over_18: true,
#   over_21: true,
#   country_code: 840u16,
#   kyc_passed: true,
#   accredited_investor: false,
#   risk_score: 25u8,
#   issued_at: 1706400000u64,
#   expires_at: 1738000000u64,
#   credential_hash: <computed>,
#   revocation_nullifier: <computed>
# }
#
# All data is encrypted - only the user can see the contents
```

### Flow 2.3: User Proves KYC Status to DeFi Protocol

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# User wants to access a DeFi protocol that requires KYC verification
# They prove KYC status WITHOUT revealing other credential data
# ═══════════════════════════════════════════════════════════════════════════════

CREDENTIAL_RECORD='{
  owner: aleo1user...,
  issuer: aleo1kyc_provider...,
  subject_commitment: 5555666677778888field,
  credential_type: 1u8,
  over_18: true,
  over_21: true,
  country_code: 840u16,
  kyc_passed: true,
  accredited_investor: false,
  risk_score: 25u8,
  issued_at: 1706400000u64,
  expires_at: 1738000000u64,
  credential_hash: abcd1234field,
  revocation_nullifier: efgh5678field
}'

snarkos developer execute credential.aleo prove_kyc_passed \
    "$CREDENTIAL_RECORD" \
    "1710000000u64" \
    "random_nonce_seedfield" \
    --private-key $USER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# ═══════════════════════════════════════════════════════════════════════════════
# RESULT
# ═══════════════════════════════════════════════════════════════════════════════
#
# User receives:
# 1. Preserved Credential (same data, can use again)
# 2. CredentialProof token:
#    {
#      owner: aleo1user...,
#      credential_hash: abcd1234field,
#      claim_type: 1u8 (TYPE_KYC),
#      claim_value: 1field (true),
#      proven_at: 1710000000u64,
#      nonce: <unique>
#    }
#
# The proof token only reveals:
# - That the user has a KYC credential
# - That the credential is not revoked (checked in finalize)
# - The proof timestamp
#
# It does NOT reveal:
# - User's identity
# - Country code
# - Age
# - Risk score
# - Issuer details
```

### Flow 2.4: Prove Age Without Revealing Other Data

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# User proves they are over 18 to access age-restricted content
# ═══════════════════════════════════════════════════════════════════════════════

snarkos developer execute credential.aleo prove_over_18 \
    "$CREDENTIAL_RECORD" \
    "1710000000u64" \
    "age_proof_nonceabcdef123field" \
    --private-key $USER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Result: CredentialProof with claim_type: 2u8 (TYPE_AGE), claim_value: 1field
# Verifier can confirm user is over 18 without learning:
# - Exact age
# - Country
# - KYC status
# - Identity
```

### Flow 2.5: Issuer Revokes a Credential

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# KYC provider discovers fraudulent user and revokes their credential
# ═══════════════════════════════════════════════════════════════════════════════

# Issuer retrieves from their secure database:
# - credential_hash for the user
# - revocation_secret they stored during issuance

snarkos developer execute credential.aleo revoke_credential \
    "abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef9012field" \
    "secret_revocation_key_stored_by_issuerfield" \
    --private-key $ISSUER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# ═══════════════════════════════════════════════════════════════════════════════
# WHAT OBSERVERS SEE
# ═══════════════════════════════════════════════════════════════════════════════
#
# On-chain, the revoked_nullifiers mapping now contains:
#   H(credential_hash + revocation_secret) => true
#
# Observers can see:
# - A nullifier was added to the revocation list
# - An authorized issuer performed the revocation
#
# Observers CANNOT see:
# - Which user's credential was revoked
# - What type of credential it was
# - Any credential data
#
# Only the issuer (who knows credential_hash + revocation_secret) can
# compute the nullifier. The user will discover revocation when they
# try to use the credential.
```

### Flow 2.6: User Checks if Credential is Revoked

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# User checks if their credential is still valid before using it
# ═══════════════════════════════════════════════════════════════════════════════

snarkos developer execute credential.aleo check_revocation_status \
    "$CREDENTIAL_RECORD" \
    --private-key $USER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# If credential is valid:
#   - Transaction succeeds
#   - User receives preserved credential and true
#
# If credential is revoked:
#   - Finalize fails (assert(!is_revoked) fails)
#   - Transaction is rejected
#   - User knows their credential is revoked
```

### Flow 2.7: Batch Revocation (Mass Revocation Event)

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# Issuer needs to revoke multiple credentials at once
# (e.g., discovered a batch of fraudulent applications)
# ═══════════════════════════════════════════════════════════════════════════════

snarkos developer execute credential.aleo batch_revoke \
    "hash1field" "secret1field" \
    "hash2field" "secret2field" \
    "hash3field" "secret3field" \
    "hash4field" "secret4field" \
    "4u8" \
    --private-key $ISSUER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Revokes up to 4 credentials in a single transaction
# The count parameter (4u8) specifies how many to actually revoke
```

---

## Integration Patterns

### Pattern A: DeFi Protocol KYC Gate

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DeFi Protocol Integration                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User calls prove_kyc_passed() to get CredentialProof            │
│                                                                      │
│  2. User submits CredentialProof to DeFi protocol's gated function  │
│                                                                      │
│  3. DeFi protocol verifies:                                         │
│     - Proof is owned by caller                                      │
│     - Proof timestamp is recent                                     │
│     - Nonce hasn't been used before (replay protection)             │
│                                                                      │
│  4. If valid, user can access protocol features                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Pattern B: DAO Membership Verification

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DAO Membership Gate                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. DAO issues membership credentials via issue_credential()        │
│     - credential_type: custom DAO type                              │
│     - accredited_investor: true (for investment DAOs)               │
│     - country_code: verified jurisdiction                           │
│                                                                      │
│  2. Member proves eligibility for specific votes:                   │
│     - prove_country() for jurisdiction-restricted votes             │
│     - prove_over_18() for age-gated proposals                       │
│                                                                      │
│  3. DAO governance contract verifies proofs on-chain                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

```bash
# Identity Program Tests
[ ] Create identity with valid data
[ ] Update identity preserves created_at
[ ] Update identity increments version
[ ] Create binding produces valid commitment
[ ] Verify commitment returns true for matching data
[ ] Verify commitment returns false for mismatched data
[ ] Transfer identity changes owner
[ ] Destroy identity consumes record

# Credential Program Tests
[ ] Initialize admin works only once
[ ] Only admin can authorize issuers
[ ] Only authorized issuers can issue credentials
[ ] Credential contains correct data
[ ] prove_over_18 works for valid credential
[ ] prove_over_18 fails for revoked credential
[ ] prove_kyc_passed works for valid credential
[ ] prove_country returns correct match status
[ ] Revocation adds nullifier to mapping
[ ] Revoked credential proofs fail
[ ] Batch revocation works correctly
[ ] Expired credentials fail proof generation
```
