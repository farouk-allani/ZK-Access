# ZK-Access Privacy Model

This document provides a technical deep-dive into why ZK-Access achieves strong privacy guarantees on Aleo.

---

## 1. Aleo's Privacy Architecture Fundamentals

### 1.1 Records vs. Mappings

Aleo provides two storage primitives with fundamentally different privacy properties:

| Property | Records | Mappings |
|----------|---------|----------|
| **Visibility** | Encrypted (private) | Public (transparent) |
| **Ownership** | Enforced cryptographically | No ownership concept |
| **Storage** | UTXO-style (consumed/created) | Key-value (mutable) |
| **Access** | Only owner can decrypt/spend | Anyone can read |

**ZK-Access Design Choice**: All sensitive data (identity, credentials, claims) is stored in **records**. Mappings are used only for:
- Issuer authorization (intentionally public)
- Revocation nullifiers (unlinkable by design)

### 1.2 Record Encryption

Aleo records are encrypted using a scheme derived from the owner's address:

```
record_ciphertext = Encrypt(
    plaintext: record_data,
    key: DeriveKey(owner_address)
)
```

The encryption key is derived from the owner's viewing key, which is itself derived from their private key:

```
private_key → viewing_key → encryption_key
```

**Consequence**: Only the holder of the private key can:
1. Derive the viewing key
2. Decrypt records they own
3. Spend (consume) records they own

### 1.3 Zero-Knowledge Proofs

Every Aleo transition generates a zero-knowledge proof that:
- Proves the computation was executed correctly
- Proves record ownership (without revealing the owner)
- Proves all constraints were satisfied
- Reveals NOTHING about the actual data

```
Proof = ZK_Prove(
    public_inputs: [transition_id, commitments],
    private_inputs: [record_data, private_key],
    circuit: transition_logic
)
```

---

## 2. Identity Privacy Analysis

### 2.1 What Is Stored

```leo
record Identity {
    owner: address,           // Encrypted
    identity_commitment: field,  // Encrypted
    data_hash: field,         // Encrypted
    version: u32,             // Encrypted
    salt: field,              // Encrypted
}
```

**On-chain visibility**: ZERO. All fields are encrypted within the record ciphertext.

### 2.2 What Observers See

When a user creates an identity:

```
Transaction {
    program_id: "identity.aleo",
    function: "create_identity",
    inputs: [encrypted_inputs],
    outputs: [
        Record {
            ciphertext: "0x7f8a9b2c...",  // Encrypted blob
            commitment: "0x1234abcd..."   // Pedersen commitment
        }
    ],
    proof: ZK_Proof
}
```

An observer sees:
- ✅ That someone executed `create_identity`
- ✅ A ciphertext blob (looks like random bytes)
- ✅ A commitment to the record
- ❌ Who owns the identity
- ❌ What the identity commitment is
- ❌ Any identity data

### 2.3 Identity Commitment Design

The identity commitment is constructed as:

```
identity_commitment = BHP256(
    BHP256(unique_id_hash) ||
    BHP256(attributes_hash) ||
    created_at ||
    salt
)
```

**Properties**:
- **Hiding**: Without knowing `salt`, the commitment reveals nothing about the data
- **Binding**: Different data produces different commitments (collision-resistant)
- **Deterministic**: Same inputs always produce the same commitment

The actual identity data (name, DOB, passport number) **NEVER** appears on-chain. Only the commitment does, and even that is encrypted inside the record.

### 2.4 Update Privacy

When updating identity:

```
old_record (consumed) → [ZK Proof] → new_record (created)
```

The old record's nullifier is published (to prevent double-spending), but:
- The nullifier is derived deterministically but unpredictably
- It cannot be linked to the record without knowing the record data
- Observers cannot tell if two transactions involve the same identity

---

## 3. Credential Privacy Analysis

### 3.1 Credential Record Structure

```leo
record Credential {
    owner: address,                  // Encrypted
    issuer: address,                 // Encrypted
    subject_commitment: field,       // Encrypted
    credential_type: u8,             // Encrypted
    over_18: bool,                   // Encrypted
    over_21: bool,                   // Encrypted
    country_code: u16,               // Encrypted
    kyc_passed: bool,                // Encrypted
    accredited_investor: bool,       // Encrypted
    risk_score: u8,                  // Encrypted
    issued_at: u64,                  // Encrypted
    expires_at: u64,                 // Encrypted
    credential_hash: field,          // Encrypted
    revocation_nullifier: field,     // Encrypted
}
```

**Every single field** is encrypted within the record. An observer sees only ciphertext.

### 3.2 Issuance Privacy

When a credential is issued:

| Participant | What They Know |
|-------------|----------------|
| **Issuer** | Recipient address, credential data, revocation secret |
| **Recipient** | Full credential record (after decryption) |
| **Observers** | That `issue_credential` was called by an authorized issuer |

The issuer-recipient relationship is hidden because:
- The recipient address is a private input
- The output record is encrypted with the recipient's key
- The issuer cannot decrypt the issued record

### 3.3 Selective Disclosure (Proof Generation)

When a user calls `prove_over_18`:

**What the proof reveals**:
- The user has a credential with `over_18 = true`
- The credential is not revoked (finalize check passes)
- The proof was generated at a specific block height

**What the proof does NOT reveal**:
- User's identity or address
- Issuer of the credential
- Country code
- KYC status
- Risk score
- Any other credential fields

**Technical mechanism**:
1. User provides credential record as private input
2. ZK circuit asserts `credential.over_18 == true`
3. ZK circuit asserts revocation check passes
4. Proof is generated proving the assertion WITHOUT revealing the credential

### 3.4 Revocation Privacy

The revocation system uses a **nullifier scheme**:

```
revocation_nullifier = BHP256(credential_hash || revocation_secret)
```

**Privacy properties**:

| Party | Knowledge |
|-------|-----------|
| **Issuer** | credential_hash, revocation_secret → can compute nullifier |
| **User** | Has revocation_nullifier in their record |
| **Observer** | Sees nullifier in mapping, cannot link to credential |

**Why observers cannot link**:
- `revocation_secret` is known only to the issuer
- Without the secret, `credential_hash` cannot be derived from nullifier
- Different credentials have different nullifiers (collision-resistant)

**Revocation flow**:
1. Issuer computes nullifier from stored `credential_hash + revocation_secret`
2. Issuer calls `revoke_credential(credential_hash, revocation_secret)`
3. Finalize adds `nullifier` to `revoked_nullifiers` mapping
4. When user tries to prove, finalize checks `!revoked_nullifiers[nullifier]`
5. If revoked, finalize fails, transaction rejected

---

## 4. Attack Resistance Analysis

### 4.1 Correlation Attacks

**Threat**: Observer tries to link transactions to the same user

**Mitigation**:
- Each transaction uses fresh nullifiers
- Record commitments are randomized (include salt)
- No public user identifiers
- Timing correlation requires off-chain surveillance

### 4.2 Issuer Collusion

**Threat**: Issuer tracks which credentials they issued

**Mitigation**:
- Issuer knows recipient at issuance (unavoidable)
- Issuer cannot see credential usage (proofs don't reveal issuer)
- Multiple issuers can issue to same identity commitment
- User can use different addresses for different credentials

### 4.3 Revocation Timing Attack

**Threat**: Observer correlates revocation time with user activity

**Mitigation**:
- Nullifier cannot be linked to user
- Issuer can batch revocations (up to 4 per tx)
- Revocation doesn't reveal which user/credential
- Defense: periodic dummy revocations (application-level)

### 4.4 Brute Force Commitment

**Threat**: Attacker tries to reverse commitment to find data

**Mitigation**:
- BHP256 is collision-resistant (256-bit security)
- Salt adds 254 bits of entropy
- Identity data space is enormous
- Computational infeasibility: ~2^128 operations minimum

---

## 5. Comparison with Other Systems

### 5.1 vs. Ethereum + zkSNARKs (e.g., Tornado Cash)

| Aspect | Ethereum + zkSNARKs | Aleo (ZK-Access) |
|--------|--------------------|--------------------|
| Privacy model | App-specific | Protocol-level |
| Record ownership | Smart contract enforced | Cryptographically enforced |
| Data visibility | Public by default | Private by default |
| Composability | Requires privacy wrappers | Native private calls |

### 5.2 vs. zk-Rollups (zkSync, StarkNet)

| Aspect | zk-Rollups | Aleo |
|--------|------------|------|
| Privacy | Computation integrity only | Full data privacy |
| State visibility | Public | Private (records) |
| Use case | Scalability | Privacy |

### 5.3 vs. Traditional Verifiable Credentials (W3C VC)

| Aspect | W3C VC | ZK-Access |
|--------|--------|-----------|
| Storage | Off-chain (user wallet) | On-chain (encrypted) |
| Verification | Signature check | ZK proof verification |
| Selective disclosure | Requires ZKP layer | Native |
| Revocation | Requires registry | On-chain nullifiers |

---

## 6. Production Security Considerations

### 6.1 Key Management

**Critical**: Users must securely store their private keys
- Loss of key = loss of identity and credentials
- Consider social recovery mechanisms (future enhancement)

### 6.2 Issuer Secret Storage

**Critical**: Issuers must securely store revocation secrets
- Loss of secret = cannot revoke credential
- Compromise of secret = attacker can compute nullifiers (but cannot link to users)

### 6.3 Metadata Leakage

**Warning**: Transaction metadata can leak information:
- Transaction timing
- Fee amounts
- Network-level IP correlation

**Mitigation**: Use Aleo's private fee mechanism when available; consider privacy-preserving relayers.

### 6.4 Off-Chain Data

**Warning**: `data_hash` may point to off-chain storage
- If off-chain data is not encrypted, privacy is reduced
- Recommendation: Always encrypt off-chain data with user's key

---

## 7. Formal Privacy Guarantees

ZK-Access provides the following formal guarantees:

1. **Record Privacy**: All record contents are IND-CPA secure under Aleo's encryption scheme
2. **Computation Privacy**: Transitions reveal no information beyond what is explicitly made public
3. **Linkability Resistance**: Transactions cannot be linked to the same user without external information
4. **Revocation Privacy**: Revoked credentials cannot be linked to users or credentials
5. **Selective Disclosure**: Proofs reveal only the proven claim, nothing else

These guarantees hold under standard cryptographic assumptions (discrete log hardness, hash collision resistance) and assuming Aleo's zkSNARK system is sound.

---

## 8. Auditor Reference: ZK Circuit Analysis

This section provides formal analysis of each ZK proof for security auditors.

### 8.1 prove_age_minimum Circuit

**File**: `credential/src/main.leo:370-448`

**Existential Statement**:
```
∃ credential such that:
  1. credential.owner == self.caller
  2. credential.age >= minimum_age
  3. credential.expires_at == 0 ∨ current_block < credential.expires_at
  4. revoked_nullifiers[credential.revocation_nullifier] == false
```

**Private Inputs** (witness):
| Input | Type | Source |
|-------|------|--------|
| `credential` | Record | User's encrypted credential |
| All credential fields | Various | Decrypted from record |

**Public Inputs**:
| Input | Type | Source |
|-------|------|--------|
| `minimum_age` | u8 | Caller parameter |
| `current_block` | u64 | Caller parameter |
| `verifier_context` | field | Caller parameter |

**Leakage Surface**:
```
Information revealed: age ∈ [minimum_age, 255]
Information NOT revealed: exact age value
Leakage = 0 bits beyond boolean result
```

**Constraint Locations**:
- Line 380: `assert_eq(credential.owner, self.caller)`
- Line 386: `assert(credential.age >= minimum_age)` ← Core ZK proof
- Line 392: `assert(not_expired)`

### 8.2 prove_kyc_status Circuit

**File**: `credential/src/main.leo:460-527`

**Existential Statement**:
```
∃ credential such that:
  1. credential.owner == self.caller
  2. credential.kyc_passed == true
  3. not expired
  4. not revoked
```

**Leakage Surface**:
```
Information revealed: kyc_passed == true
Information NOT revealed: any other credential field
Leakage = 1 bit (boolean KYC status)
```

**Constraint Location**:
- Line 470: `assert(credential.kyc_passed)` ← Core ZK proof

### 8.3 prove_country_not_restricted Circuit

**File**: `credential/src/main.leo:546-630`

**Existential Statement**:
```
∃ credential such that:
  1. credential.owner == self.caller
  2. credential.country_code ≠ restricted_1
  3. credential.country_code ≠ restricted_2
  4. credential.country_code ≠ restricted_3
  5. credential.country_code ≠ restricted_4
  6. not expired
  7. not revoked
```

**Leakage Surface**:
```
Information revealed: country_code ∈ {0..65535} \ {restricted_1..4}
Information NOT revealed: exact country code
Leakage = log2(65532/65536) ≈ 0 bits (negligible)
```

**Constraint Locations**:
- Lines 567-570: Four `assert(not_restricted_N)` ← Core ZK proofs

### 8.4 Nullifier Security Analysis

**Identity Nullifier**:
```
nullifier = BHP256(identity_commitment + nullifier_secret)
```

**Properties**:
- Preimage resistance: Cannot find (commitment, secret) from nullifier
- Collision resistance: Cannot find two inputs with same nullifier
- Unlinkability: Observer cannot link nullifier to identity

**Revocation Nullifier**:
```
revocation_nullifier = BHP256(credential_id + revocation_secret)
```

**Properties**:
- Only issuer knows `revocation_secret`
- User has `revocation_nullifier` in their credential (encrypted)
- Revocation reveals nullifier, not credential or user

### 8.5 Ownership Enforcement Analysis

**Two-Layer Protection**:

1. **Aleo Runtime Layer** (implicit):
   - Records can only be spent by owner
   - Enforced by private key / viewing key derivation

2. **Circuit Layer** (explicit):
   - `assert_eq(credential.owner, self.caller)`
   - Compiled into ZK circuit as constraint

**Why Both Layers**:
- Runtime: Fundamental UTXO security
- Circuit: Defense-in-depth, catches logic errors

### 8.6 Replay Prevention Analysis

| Vector | Mechanism | Strength |
|--------|-----------|----------|
| Identity cloning | `identity_nullifiers` mapping | One-time registration |
| Binding replay | `used_binding_nonces` mapping | Nonce consumed |
| Credential replay | `issuer_nonces` mapping | Nonce consumed |
| Proof replay | `consumed_nonces` mapping | Nonce consumed per verifier |
| Result replay | `consumed_verifications` mapping | ID consumed |

### 8.7 What Auditors Should Verify

1. **Assert statements in prove_* functions**: Ensure they enforce the claimed predicate
2. **Finalize blocks**: Ensure they check authorization and revocation
3. **Nullifier computation**: Ensure it includes a secret component
4. **Nonce registration**: Ensure all nonces are tracked before use
5. **Record preservation**: Ensure credentials are returned (not consumed permanently)

### 8.8 Code References for Verification

| Security Property | File | Lines | Code Pattern |
|-------------------|------|-------|--------------|
| Age proof | credential.aleo | 386 | `assert(credential.age >= minimum_age)` |
| KYC proof | credential.aleo | 470 | `assert(credential.kyc_passed)` |
| Country proof | credential.aleo | 567-570 | `assert(not_restricted_N)` |
| Ownership | credential.aleo | 380,467,557,641,714 | `assert_eq(credential.owner, self.caller)` |
| Revocation | credential.aleo | 444-448 | `assert(!is_revoked)` |
| Issuer auth | credential.aleo | 309-311 | `assert(is_authorized)` |
| Nonce consumption | verifier.aleo | 223-227 | `Mapping::set(consumed_nonces, ...)` |
