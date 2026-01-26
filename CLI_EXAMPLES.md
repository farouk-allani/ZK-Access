# ZK-Access CLI Examples (Production)

This document provides complete, testable CLI examples for all major operations.

---

## Environment Setup

```bash
# Required environment variables
export ADMIN_PRIVATE_KEY="APrivateKey1zkp..."
export ISSUER_PRIVATE_KEY="APrivateKey1zkp..."
export USER_PRIVATE_KEY="APrivateKey1zkp..."
export VERIFIER_PRIVATE_KEY="APrivateKey1zkp..."

export ADMIN_ADDRESS="aleo1admin..."
export ISSUER_ADDRESS="aleo1issuer..."
export USER_ADDRESS="aleo1user..."
export VERIFIER_ADDRESS="aleo1verifier..."

export ENDPOINT="https://api.explorer.aleo.org/v1"
export BROADCAST="${ENDPOINT}/testnet/transaction/broadcast"

# Current block height (fetch dynamically in production)
export CURRENT_BLOCK=1000000
```

---

## 1. IDENTITY OPERATIONS

### 1.1 Create Identity

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# USER: Create a new identity vault
# ═══════════════════════════════════════════════════════════════════════════════

# Off-chain: Compute identity data hashes
# unique_id_hash = BHP256::hash_to_field("passport:US123456789")
# attributes_hash = BHP256::hash_to_field('{"name":"Alice","dob":"1990-01-15"}')
# Generate random: salt, nullifier_secret

snarkos developer execute identity.aleo create_identity \
    "1234567890123456789012345678901234567890123456789012345678901234field" \
    "9876543210987654321098765432109876543210987654321098765432109876field" \
    "${CURRENT_BLOCK}u64" \
    "5555555555555555555555555555555555555555555555555555555555555555field" \
    "7777777777777777777777777777777777777777777777777777777777777777field" \
    "1111111111111111111111111111111111111111111111111111111111111111field" \
    --private-key $USER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST \
    --fee 1000000

# Expected output:
# - Transaction ID: at1xyz...
# - User receives encrypted Identity record
# - Nullifier registered on-chain (cannot be linked to user)
```

### 1.2 Create Identity Binding (for Credential Issuance)

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# USER: Create binding token to share with KYC provider
# ═══════════════════════════════════════════════════════════════════════════════

# binding_context = BHP256::hash_to_field("kyc_credential_request")
# Binding expires in 1000 blocks

IDENTITY_RECORD='{
  owner: aleo1user...,
  identity_commitment: 1234567890abcdef...field,
  data_hash: 1111111111111111...field,
  version: 1u32,
  salt: 5555555555555555...field,
  nullifier_secret: 7777777777777777...field
}'

snarkos developer execute identity.aleo create_binding \
    "$IDENTITY_RECORD" \
    "8888888888888888888888888888888888888888888888888888888888888888field" \
    "3333333333333333333333333333333333333333333333333333333333333333field" \
    "$((CURRENT_BLOCK + 1000))u64" \
    --private-key $USER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Expected output:
# - Preserved Identity record
# - IdentityBinding record (share with issuer)
# - Nonce registered on-chain
```

---

## 2. CREDENTIAL ISSUANCE

### 2.1 Initialize Admin

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# DEPLOYER: Initialize admin (one-time setup)
# ═══════════════════════════════════════════════════════════════════════════════

snarkos developer execute credential.aleo initialize_admin \
    "$ADMIN_ADDRESS" \
    --private-key $ADMIN_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Expected: admin mapping set (irreversible)
```

### 2.2 Authorize Issuer

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN: Authorize a KYC provider as credential issuer
# ═══════════════════════════════════════════════════════════════════════════════

snarkos developer execute credential.aleo authorize_issuer \
    "$ISSUER_ADDRESS" \
    --private-key $ADMIN_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Expected: authorized_issuers[ISSUER_ADDRESS] = true
```

### 2.3 Issue Credential

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# ISSUER: Issue KYC credential to user
# ═══════════════════════════════════════════════════════════════════════════════

# Parameters:
# - recipient: User's address
# - subject_commitment: From user's IdentityBinding
# - credential_type: 1u8 (KYC)
# - age: 34u8
# - country_code: 840u16 (USA)
# - kyc_passed: true
# - accredited_investor: false
# - risk_score: 15u8 (low)
# - expires_at: current + 31536000 blocks (~1 year)
# - issuance_salt: random
# - revocation_secret: random (STORE SECURELY)
# - proof_salt: random

snarkos developer execute credential.aleo issue_credential \
    "$USER_ADDRESS" \
    "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefield" \
    "1u8" \
    "34u8" \
    "840u16" \
    "true" \
    "false" \
    "15u8" \
    "${CURRENT_BLOCK}u64" \
    "$((CURRENT_BLOCK + 31536000))u64" \
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaafield" \
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbfield" \
    "ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccfield" \
    --private-key $ISSUER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Expected output:
# - User receives encrypted Credential record
# - Issuer authorization verified in finalize
# - Issuance nonce registered (prevents replay)
#
# CRITICAL: Issuer must store credential_id + revocation_secret mapping
```

---

## 3. ZK PROOF GENERATION

### 3.1 Prove Age >= 18

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# USER: Generate ZK proof of age >= 18
# ═══════════════════════════════════════════════════════════════════════════════

CREDENTIAL_RECORD='{
  owner: aleo1user...,
  issuer: aleo1issuer...,
  subject_commitment: 1234567890abcdef...field,
  credential_type: 1u8,
  age: 34u8,
  country_code: 840u16,
  kyc_passed: true,
  accredited_investor: false,
  risk_score: 15u8,
  issued_at: 1000000u64,
  expires_at: 32536000u64,
  credential_id: dddddddddddddddd...field,
  revocation_nullifier: eeeeeeeeeeeeeeee...field,
  proof_salt: cccccccccccccccc...field
}'

# verifier_context = BHP256::hash_to_field("defi_protocol_xyz")

snarkos developer execute credential.aleo prove_age_minimum \
    "$CREDENTIAL_RECORD" \
    "18u8" \
    "${CURRENT_BLOCK}u64" \
    "1111111111111111111111111111111111111111111111111111111111111111field" \
    "2222222222222222222222222222222222222222222222222222222222222222field" \
    --private-key $USER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Expected output:
# - Preserved Credential record
# - CredentialProof record with:
#   - claim_type: 2u8 (TYPE_AGE)
#   - claim_result: 1field (true)
#   - verifier_context: bound to specific verifier
# - Revocation check passes in finalize
#
# WHAT THE CIRCUIT PROVES (ZK):
# - User owns a valid credential
# - credential.age >= 18 (WITHOUT revealing actual age)
# - Credential is not expired
# - Credential is not revoked
```

### 3.2 Prove KYC Status

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# USER: Generate ZK proof of KYC passed
# ═══════════════════════════════════════════════════════════════════════════════

snarkos developer execute credential.aleo prove_kyc_status \
    "$CREDENTIAL_RECORD" \
    "${CURRENT_BLOCK}u64" \
    "3333333333333333333333333333333333333333333333333333333333333333field" \
    "4444444444444444444444444444444444444444444444444444444444444444field" \
    --private-key $USER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Expected: CredentialProof with claim_type: 1u8 (TYPE_KYC)
```

### 3.3 Prove Country NOT Restricted

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# USER: Prove country is NOT in OFAC sanctions list
# ═══════════════════════════════════════════════════════════════════════════════

# Restricted countries (ISO 3166-1 numeric):
# - 408: North Korea
# - 364: Iran
# - 760: Syria
# - 192: Cuba

snarkos developer execute credential.aleo prove_country_not_restricted \
    "$CREDENTIAL_RECORD" \
    "408u16" \
    "364u16" \
    "760u16" \
    "192u16" \
    "${CURRENT_BLOCK}u64" \
    "5555555555555555555555555555555555555555555555555555555555555555field" \
    "6666666666666666666666666666666666666666666666666666666666666666field" \
    --private-key $USER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Expected: Proof succeeds (user is from USA, code 840)
# The circuit proves: country_code NOT IN {408, 364, 760, 192}
# Without revealing the actual country code
```

### 3.4 Prove Composite (Age + KYC + Country)

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# USER: Single proof for multiple claims (efficient)
# ═══════════════════════════════════════════════════════════════════════════════

snarkos developer execute credential.aleo prove_composite \
    "$CREDENTIAL_RECORD" \
    "21u8" \
    "408u16" "364u16" "760u16" "192u16" \
    "${CURRENT_BLOCK}u64" \
    "7777777777777777777777777777777777777777777777777777777777777777field" \
    "8888888888888888888888888888888888888888888888888888888888888888field" \
    --private-key $USER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Expected: Single proof proving:
# - age >= 21
# - kyc_passed == true
# - country NOT IN restricted set
```

---

## 4. PROOF VERIFICATION

### 4.1 Initialize Verifier Admin

```bash
snarkos developer execute verifier.aleo initialize_admin \
    "$ADMIN_ADDRESS" \
    --private-key $ADMIN_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST
```

### 4.2 Verify Proof

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# USER/PROTOCOL: Verify a CredentialProof
# ═══════════════════════════════════════════════════════════════════════════════

PROOF_RECORD='{
  owner: aleo1user...,
  claim_hash: aaaaaaaaaaaaaaaa...field,
  claim_type: 2u8,
  claim_result: 1field,
  verifier_context: 1111111111111111...field,
  proven_at: 1000000u64,
  proof_nonce: bbbbbbbbbbbbbbbb...field,
  expires_at: 32536000u64
}'

snarkos developer execute verifier.aleo verify_proof \
    "$PROOF_RECORD" \
    "1111111111111111111111111111111111111111111111111111111111111111field" \
    "${CURRENT_BLOCK}u64" \
    --private-key $USER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Expected:
# - VerificationResult record created
# - Proof nonce marked as consumed (cannot be reused)
```

### 4.3 Consume Verification (Protocol Integration)

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# PROTOCOL: Consume verification result to grant access
# ═══════════════════════════════════════════════════════════════════════════════

VERIFICATION_RECORD='{
  owner: aleo1user...,
  verified_claim_type: 2u8,
  result: 1u8,
  verifier_context: 1111111111111111...field,
  verified_at: 1000000u64,
  verification_id: cccccccccccccccc...field,
  credential_expires_at: 32536000u64
}'

snarkos developer execute verifier.aleo consume_verification \
    "$VERIFICATION_RECORD" \
    "2u8" \
    "1111111111111111111111111111111111111111111111111111111111111111field" \
    "${CURRENT_BLOCK}u64" \
    --private-key $USER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Expected:
# - Returns true
# - Verification marked as consumed (cannot be reused)
```

---

## 5. REVOCATION

### 5.1 Revoke Credential

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# ISSUER: Revoke a credential (e.g., fraud detected)
# ═══════════════════════════════════════════════════════════════════════════════

# Issuer looks up from their database:
# - credential_id for the user
# - revocation_secret used during issuance

snarkos developer execute credential.aleo revoke_credential \
    "ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddfield" \
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbfield" \
    --private-key $ISSUER_PRIVATE_KEY \
    --query $ENDPOINT \
    --broadcast $BROADCAST

# Expected:
# - revoked_nullifiers[H(credential_id + revocation_secret)] = true
# - Future proof attempts for this credential will fail
```

---

## 6. FAILURE CASES

### 6.1 Age Proof Fails (Under Minimum)

```bash
# User has age: 17u8, tries to prove age >= 18

snarkos developer execute credential.aleo prove_age_minimum \
    "$CREDENTIAL_WITH_AGE_17" \
    "18u8" \
    "${CURRENT_BLOCK}u64" \
    "verifier_context_field" \
    "user_seed_field" \
    --private-key $USER_PRIVATE_KEY

# Expected: TRANSACTION FAILS
# Error: Assertion failed at prove_age_minimum:386
# The ZK circuit cannot be satisfied because 17 < 18
```

### 6.2 Proof Fails (Revoked Credential)

```bash
# User tries to prove with revoked credential

snarkos developer execute credential.aleo prove_kyc_status \
    "$REVOKED_CREDENTIAL" \
    "${CURRENT_BLOCK}u64" \
    "verifier_context_field" \
    "user_seed_field" \
    --private-key $USER_PRIVATE_KEY

# Expected: TRANSACTION FAILS in finalize
# Error: Finalize failed - credential revoked
```

### 6.3 Proof Fails (Expired Credential)

```bash
# User tries to prove with expired credential (current_block > expires_at)

snarkos developer execute credential.aleo prove_age_minimum \
    "$EXPIRED_CREDENTIAL" \
    "18u8" \
    "99999999u64" \
    "verifier_context_field" \
    "user_seed_field" \
    --private-key $USER_PRIVATE_KEY

# Expected: TRANSACTION FAILS
# Error: Assertion failed - credential expired
```

### 6.4 Proof Replay Fails

```bash
# Verifier tries to verify same proof twice

snarkos developer execute verifier.aleo verify_proof \
    "$ALREADY_VERIFIED_PROOF" \
    "verifier_context_field" \
    "${CURRENT_BLOCK}u64" \
    --private-key $USER_PRIVATE_KEY

# Expected: TRANSACTION FAILS in finalize
# Error: Proof nonce already consumed
```

### 6.5 Country Check Fails

```bash
# User from restricted country tries to prove not restricted

# Credential has country_code: 408u16 (North Korea)

snarkos developer execute credential.aleo prove_country_not_restricted \
    "$CREDENTIAL_FROM_NK" \
    "408u16" "364u16" "760u16" "192u16" \
    "${CURRENT_BLOCK}u64" \
    "verifier_context_field" \
    "user_seed_field" \
    --private-key $USER_PRIVATE_KEY

# Expected: TRANSACTION FAILS
# Error: Assertion failed - country_code == restricted_1
```

### 6.6 Non-Owner Tries to Prove

```bash
# Attacker tries to use someone else's credential

snarkos developer execute credential.aleo prove_kyc_status \
    "$SOMEONE_ELSES_CREDENTIAL" \
    "${CURRENT_BLOCK}u64" \
    "verifier_context_field" \
    "user_seed_field" \
    --private-key $ATTACKER_PRIVATE_KEY

# Expected: TRANSACTION FAILS
# Two levels of protection:
# 1. Aleo record system rejects - caller doesn't own record
# 2. assert_eq(credential.owner, self.caller) fails
```

### 6.7 Unauthorized Issuer

```bash
# Non-authorized address tries to issue credential

snarkos developer execute credential.aleo issue_credential \
    "$USER_ADDRESS" \
    "subject_commitment_field" \
    "1u8" "34u8" "840u16" "true" "false" "15u8" \
    "${CURRENT_BLOCK}u64" "$((CURRENT_BLOCK + 31536000))u64" \
    "salt_field" "revocation_secret_field" "proof_salt_field" \
    --private-key $UNAUTHORIZED_PRIVATE_KEY

# Expected: TRANSACTION FAILS in finalize
# Error: Issuer not authorized
```
