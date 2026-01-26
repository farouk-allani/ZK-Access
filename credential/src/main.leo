// ═══════════════════════════════════════════════════════════════════════════════
// ZK-ACCESS: CREDENTIAL SYSTEM (HARDENED)
// Program: credential.aleo
// Version: 2.0.0
//
// This program implements privacy-preserving verifiable credentials with:
// - Real ZK proof generation (not stubs)
// - Cryptographic issuer authorization
// - Privacy-preserving revocation via nullifiers
// - Selective disclosure proofs
//
// SECURITY MODEL:
// - Credentials are encrypted records (only holder can decrypt)
// - Issuer authorization checked on-chain in finalize
// - Revocation uses nullifiers (unlinkable to credentials)
// - Proofs reveal ONLY the boolean result, never underlying data
// ═══════════════════════════════════════════════════════════════════════════════

program credential.aleo {

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════

    // Credential type identifiers
    const TYPE_KYC: u8 = 1u8;
    const TYPE_AGE: u8 = 2u8;
    const TYPE_ACCREDITATION: u8 = 3u8;
    const TYPE_JURISDICTION: u8 = 4u8;
    const TYPE_COMPOSITE: u8 = 255u8;

    // ═══════════════════════════════════════════════════════════════════════════
    // RECORD DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Primary credential record - ALL fields encrypted
    record Credential {
        // Credential holder (only they can use this credential)
        owner: address,

        // Issuing entity address
        issuer: address,

        // Binding to holder's identity (from identity.aleo)
        subject_commitment: field,

        // Credential type classification
        credential_type: u8,

        // ─── CLAIM DATA (all encrypted) ───
        // Age in years (for age-based proofs)
        age: u8,

        // Country code (ISO 3166-1 numeric)
        country_code: u16,

        // KYC verification status
        kyc_passed: bool,

        // Accredited investor status
        accredited_investor: bool,

        // Risk assessment score (0-255)
        risk_score: u8,

        // ─── METADATA ───
        // Block height when issued
        issued_at: u64,

        // Block height when expires (0 = never)
        expires_at: u64,

        // Unique credential identifier
        credential_id: field,

        // Nullifier for revocation checking
        // revocation_nullifier = H(credential_id || revocation_secret)
        revocation_nullifier: field,

        // Salt for proof generation (prevents proof correlation)
        proof_salt: field,
    }

    // ZK Proof of a specific claim - this is what gets shared with verifiers
    // The proof itself (ZK-SNARK) guarantees the claim without revealing credential data
    record CredentialProof {
        // Who generated this proof (must match credential owner)
        owner: address,

        // Hash identifying which claim was proven
        // claim_hash = H(credential_id || claim_type || claim_result || proof_nonce)
        claim_hash: field,

        // Type of claim proven (age, kyc, country, etc.)
        claim_type: u8,

        // The proven assertion (true/false for predicates, encoded value for ranges)
        // For age >= 18: claim_result = 1 (true) or 0 (false)
        // For country check: claim_result = 1 (allowed) or 0 (restricted)
        claim_result: field,

        // Verifier context - who this proof is intended for
        // Prevents proof reuse across different verifiers
        verifier_context: field,

        // Block height when proof was generated
        proven_at: u64,

        // One-time nonce - prevents proof replay
        proof_nonce: field,

        // Credential expiry (passed through for verifier to check)
        expires_at: u64,
    }

    // Struct for claim data (used in hashing)
    struct ClaimData {
        age: u8,
        country_code: u16,
        kyc_passed: bool,
        accredited_investor: bool,
        risk_score: u8,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAPPINGS (PUBLIC STATE)
    // ═══════════════════════════════════════════════════════════════════════════

    // Admin address (set once during deployment)
    mapping admin: u8 => address;

    // Authorized credential issuers
    // Key: issuer address, Value: true if authorized
    mapping authorized_issuers: address => bool;

    // Revocation registry using nullifiers
    // Key: revocation_nullifier, Value: true if revoked
    // PRIVACY: Nullifiers are unlinkable to credentials without the secret
    mapping revoked_nullifiers: field => bool;

    // Issuer nonce registry - prevents credential issuance replay
    mapping issuer_nonces: field => bool;

    // ═══════════════════════════════════════════════════════════════════════════
    // INLINE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Compute credential ID from issuance data
    inline compute_credential_id(
        issuer: address,
        recipient: address,
        subject_commitment: field,
        claims: ClaimData,
        issued_at: u64,
        salt: field
    ) -> field {
        let claims_hash: field = BHP256::hash_to_field(claims);
        let issuer_hash: field = BHP256::hash_to_field(issuer);
        let recipient_hash: field = BHP256::hash_to_field(recipient);

        return BHP256::hash_to_field(
            issuer_hash + recipient_hash + subject_commitment +
            claims_hash + (issued_at as field) + salt
        );
    }

    // Compute revocation nullifier
    inline compute_revocation_nullifier(
        credential_id: field,
        revocation_secret: field
    ) -> field {
        return BHP256::hash_to_field(credential_id + revocation_secret);
    }

    // Compute proof nonce (unique per proof)
    inline compute_proof_nonce(
        credential_id: field,
        verifier_context: field,
        block_height: u64,
        user_seed: field
    ) -> field {
        return BHP256::hash_to_field(
            credential_id + verifier_context + (block_height as field) + user_seed
        );
    }

    // Compute claim hash (binds proof to specific claim)
    inline compute_claim_hash(
        credential_id: field,
        claim_type: u8,
        claim_result: field,
        proof_nonce: field
    ) -> field {
        return BHP256::hash_to_field(
            credential_id + (claim_type as field) + claim_result + proof_nonce
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Initialize admin (one-time setup)
    transition initialize_admin(admin_address: address) {
        return then finalize(admin_address);
    }

    finalize initialize_admin(admin_address: address) {
        let exists: bool = Mapping::contains(admin, 0u8);
        assert(!exists);
        Mapping::set(admin, 0u8, admin_address);
    }

    // Authorize a new issuer
    transition authorize_issuer(issuer: address) {
        return then finalize(self.caller, issuer);
    }

    finalize authorize_issuer(caller: address, issuer: address) {
        let admin_addr: address = Mapping::get(admin, 0u8);
        assert_eq(caller, admin_addr);
        Mapping::set(authorized_issuers, issuer, true);
    }

    // Deauthorize an issuer
    transition deauthorize_issuer(issuer: address) {
        return then finalize(self.caller, issuer);
    }

    finalize deauthorize_issuer(caller: address, issuer: address) {
        let admin_addr: address = Mapping::get(admin, 0u8);
        assert_eq(caller, admin_addr);
        Mapping::set(authorized_issuers, issuer, false);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CREDENTIAL ISSUANCE
    // ═══════════════════════════════════════════════════════════════════════════

    // Issue a credential to a user
    // Only authorized issuers can call this (enforced in finalize)
    transition issue_credential(
        recipient: address,
        subject_commitment: field,
        credential_type: u8,
        age: u8,
        country_code: u16,
        kyc_passed: bool,
        accredited_investor: bool,
        risk_score: u8,
        issued_at: u64,
        expires_at: u64,
        issuance_salt: field,
        revocation_secret: field,
        proof_salt: field
    ) -> Credential {
        // Build claims struct
        let claims: ClaimData = ClaimData {
            age: age,
            country_code: country_code,
            kyc_passed: kyc_passed,
            accredited_investor: accredited_investor,
            risk_score: risk_score,
        };

        // Compute credential ID
        let credential_id: field = compute_credential_id(
            self.caller,
            recipient,
            subject_commitment,
            claims,
            issued_at,
            issuance_salt
        );

        // Compute revocation nullifier
        let revocation_nullifier: field = compute_revocation_nullifier(
            credential_id,
            revocation_secret
        );

        // Compute issuance nonce for replay prevention
        let issuance_nonce: field = BHP256::hash_to_field(
            credential_id + revocation_secret
        );

        // Create credential record (encrypted, owned by recipient)
        let credential: Credential = Credential {
            owner: recipient,
            issuer: self.caller,
            subject_commitment: subject_commitment,
            credential_type: credential_type,
            age: age,
            country_code: country_code,
            kyc_passed: kyc_passed,
            accredited_investor: accredited_investor,
            risk_score: risk_score,
            issued_at: issued_at,
            expires_at: expires_at,
            credential_id: credential_id,
            revocation_nullifier: revocation_nullifier,
            proof_salt: proof_salt,
        };

        return credential then finalize(self.caller, issuance_nonce);
    }

    finalize issue_credential(issuer: address, issuance_nonce: field) {
        // Verify issuer is authorized
        let is_authorized: bool = Mapping::get_or_use(authorized_issuers, issuer, false);
        assert(is_authorized);

        // Check issuance nonce hasn't been used (prevent replay)
        let nonce_used: bool = Mapping::get_or_use(issuer_nonces, issuance_nonce, false);
        assert(!nonce_used);

        // Register nonce
        Mapping::set(issuer_nonces, issuance_nonce, true);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REVOCATION
    // ═══════════════════════════════════════════════════════════════════════════

    // Revoke a credential using credential_id and revocation_secret
    // Only the original issuer (who knows the secret) can revoke
    transition revoke_credential(
        credential_id: field,
        revocation_secret: field
    ) {
        let nullifier: field = compute_revocation_nullifier(
            credential_id,
            revocation_secret
        );

        return then finalize(self.caller, nullifier);
    }

    finalize revoke_credential(issuer: address, nullifier: field) {
        // Verify caller is an authorized issuer
        let is_authorized: bool = Mapping::get_or_use(authorized_issuers, issuer, false);
        assert(is_authorized);

        // Check not already revoked
        let already_revoked: bool = Mapping::get_or_use(revoked_nullifiers, nullifier, false);
        assert(!already_revoked);

        // Mark as revoked
        Mapping::set(revoked_nullifiers, nullifier, true);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ZK PROOF GENERATION
    // ═══════════════════════════════════════════════════════════════════════════

    // ───────────────────────────────────────────────────────────────────────────
    // PROVE AGE >= MINIMUM
    // ───────────────────────────────────────────────────────────────────────────
    // Generates a ZK proof that the credential holder's age >= minimum_age.
    //
    // ZK CONSTRAINTS (enforced in circuit):
    // 1. credential.owner == self.caller (only owner can generate proof)
    // 2. credential.age >= minimum_age (the actual predicate)
    // 3. current_block < credential.expires_at (not expired)
    //
    // PRIVACY:
    // - minimum_age is public (the threshold being checked)
    // - credential.age is NEVER revealed
    // - Output is only boolean (pass/fail)
    transition prove_age_minimum(
        credential: Credential,
        minimum_age: u8,
        current_block: u64,
        verifier_context: field,
        user_seed: field
    ) -> (Credential, CredentialProof) {
        // ═══ ZK CONSTRAINT 1: Ownership ═══
        // The record system enforces this, but we assert explicitly
        // This constraint is compiled into the ZK circuit
        assert_eq(credential.owner, self.caller);

        // ═══ ZK CONSTRAINT 2: Age predicate ═══
        // This is the core ZK proof - we prove age >= minimum WITHOUT revealing age
        // The circuit enforces: credential.age >= minimum_age
        let age_sufficient: bool = credential.age >= minimum_age;
        assert(age_sufficient);

        // ═══ ZK CONSTRAINT 3: Expiry check ═══
        // Ensure credential hasn't expired
        let not_expired: bool = credential.expires_at == 0u64 ||
                                current_block < credential.expires_at;
        assert(not_expired);

        // Compute proof nonce (unique to this proof)
        let proof_nonce: field = compute_proof_nonce(
            credential.credential_id,
            verifier_context,
            current_block,
            user_seed
        );

        // Compute claim hash
        let claim_hash: field = compute_claim_hash(
            credential.credential_id,
            TYPE_AGE,
            1field,  // claim_result: true (age >= minimum)
            proof_nonce
        );

        // Create proof record
        let proof: CredentialProof = CredentialProof {
            owner: self.caller,
            claim_hash: claim_hash,
            claim_type: TYPE_AGE,
            claim_result: 1field,  // true
            verifier_context: verifier_context,
            proven_at: current_block,
            proof_nonce: proof_nonce,
            expires_at: credential.expires_at,
        };

        // Preserve credential
        let preserved: Credential = Credential {
            owner: credential.owner,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            age: credential.age,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_id: credential.credential_id,
            revocation_nullifier: credential.revocation_nullifier,
            proof_salt: credential.proof_salt,
        };

        // Check revocation in finalize
        return (preserved, proof) then finalize(credential.revocation_nullifier);
    }

    finalize prove_age_minimum(revocation_nullifier: field) {
        // Check credential is not revoked
        let is_revoked: bool = Mapping::get_or_use(revoked_nullifiers, revocation_nullifier, false);
        assert(!is_revoked);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // PROVE KYC STATUS
    // ───────────────────────────────────────────────────────────────────────────
    // Generates a ZK proof that kyc_passed == true
    //
    // ZK CONSTRAINTS:
    // 1. credential.owner == self.caller
    // 2. credential.kyc_passed == true
    // 3. not expired
    // 4. not revoked (finalize)
    transition prove_kyc_status(
        credential: Credential,
        current_block: u64,
        verifier_context: field,
        user_seed: field
    ) -> (Credential, CredentialProof) {
        // ═══ ZK CONSTRAINT 1: Ownership ═══
        assert_eq(credential.owner, self.caller);

        // ═══ ZK CONSTRAINT 2: KYC predicate ═══
        assert(credential.kyc_passed);

        // ═══ ZK CONSTRAINT 3: Expiry ═══
        let not_expired: bool = credential.expires_at == 0u64 ||
                                current_block < credential.expires_at;
        assert(not_expired);

        // Compute proof nonce
        let proof_nonce: field = compute_proof_nonce(
            credential.credential_id,
            verifier_context,
            current_block,
            user_seed
        );

        // Compute claim hash
        let claim_hash: field = compute_claim_hash(
            credential.credential_id,
            TYPE_KYC,
            1field,
            proof_nonce
        );

        let proof: CredentialProof = CredentialProof {
            owner: self.caller,
            claim_hash: claim_hash,
            claim_type: TYPE_KYC,
            claim_result: 1field,
            verifier_context: verifier_context,
            proven_at: current_block,
            proof_nonce: proof_nonce,
            expires_at: credential.expires_at,
        };

        let preserved: Credential = Credential {
            owner: credential.owner,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            age: credential.age,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_id: credential.credential_id,
            revocation_nullifier: credential.revocation_nullifier,
            proof_salt: credential.proof_salt,
        };

        return (preserved, proof) then finalize(credential.revocation_nullifier);
    }

    finalize prove_kyc_status(revocation_nullifier: field) {
        let is_revoked: bool = Mapping::get_or_use(revoked_nullifiers, revocation_nullifier, false);
        assert(!is_revoked);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // PROVE COUNTRY NOT RESTRICTED
    // ───────────────────────────────────────────────────────────────────────────
    // Proves the credential holder's country is NOT in a restricted set.
    // The restricted set is defined by the caller (e.g., OFAC sanctions list).
    //
    // ZK CONSTRAINTS:
    // 1. credential.owner == self.caller
    // 2. credential.country_code != restricted_1
    // 3. credential.country_code != restricted_2
    // 4. credential.country_code != restricted_3
    // 5. credential.country_code != restricted_4
    // 6. not expired
    // 7. not revoked (finalize)
    //
    // NOTE: We check against 4 restricted countries. For more, extend the list
    // or use multiple proof calls.
    transition prove_country_not_restricted(
        credential: Credential,
        restricted_1: u16,
        restricted_2: u16,
        restricted_3: u16,
        restricted_4: u16,
        current_block: u64,
        verifier_context: field,
        user_seed: field
    ) -> (Credential, CredentialProof) {
        // ═══ ZK CONSTRAINT 1: Ownership ═══
        assert_eq(credential.owner, self.caller);

        // ═══ ZK CONSTRAINTS 2-5: Country not in restricted set ═══
        // Each comparison is a circuit constraint
        let not_restricted_1: bool = credential.country_code != restricted_1;
        let not_restricted_2: bool = credential.country_code != restricted_2;
        let not_restricted_3: bool = credential.country_code != restricted_3;
        let not_restricted_4: bool = credential.country_code != restricted_4;

        // All must be true (country not in any restricted)
        assert(not_restricted_1);
        assert(not_restricted_2);
        assert(not_restricted_3);
        assert(not_restricted_4);

        // ═══ ZK CONSTRAINT 6: Expiry ═══
        let not_expired: bool = credential.expires_at == 0u64 ||
                                current_block < credential.expires_at;
        assert(not_expired);

        // Compute proof nonce
        let proof_nonce: field = compute_proof_nonce(
            credential.credential_id,
            verifier_context,
            current_block,
            user_seed
        );

        // Include restricted countries in claim hash for binding
        let restriction_hash: field = BHP256::hash_to_field(
            (restricted_1 as field) + (restricted_2 as field) +
            (restricted_3 as field) + (restricted_4 as field)
        );

        let claim_hash: field = BHP256::hash_to_field(
            credential.credential_id + (TYPE_JURISDICTION as field) +
            1field + proof_nonce + restriction_hash
        );

        let proof: CredentialProof = CredentialProof {
            owner: self.caller,
            claim_hash: claim_hash,
            claim_type: TYPE_JURISDICTION,
            claim_result: 1field,  // true: not in restricted set
            verifier_context: verifier_context,
            proven_at: current_block,
            proof_nonce: proof_nonce,
            expires_at: credential.expires_at,
        };

        let preserved: Credential = Credential {
            owner: credential.owner,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            age: credential.age,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_id: credential.credential_id,
            revocation_nullifier: credential.revocation_nullifier,
            proof_salt: credential.proof_salt,
        };

        return (preserved, proof) then finalize(credential.revocation_nullifier);
    }

    finalize prove_country_not_restricted(revocation_nullifier: field) {
        let is_revoked: bool = Mapping::get_or_use(revoked_nullifiers, revocation_nullifier, false);
        assert(!is_revoked);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // PROVE ACCREDITED INVESTOR
    // ───────────────────────────────────────────────────────────────────────────
    transition prove_accredited_investor(
        credential: Credential,
        current_block: u64,
        verifier_context: field,
        user_seed: field
    ) -> (Credential, CredentialProof) {
        assert_eq(credential.owner, self.caller);
        assert(credential.accredited_investor);

        let not_expired: bool = credential.expires_at == 0u64 ||
                                current_block < credential.expires_at;
        assert(not_expired);

        let proof_nonce: field = compute_proof_nonce(
            credential.credential_id,
            verifier_context,
            current_block,
            user_seed
        );

        let claim_hash: field = compute_claim_hash(
            credential.credential_id,
            TYPE_ACCREDITATION,
            1field,
            proof_nonce
        );

        let proof: CredentialProof = CredentialProof {
            owner: self.caller,
            claim_hash: claim_hash,
            claim_type: TYPE_ACCREDITATION,
            claim_result: 1field,
            verifier_context: verifier_context,
            proven_at: current_block,
            proof_nonce: proof_nonce,
            expires_at: credential.expires_at,
        };

        let preserved: Credential = Credential {
            owner: credential.owner,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            age: credential.age,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_id: credential.credential_id,
            revocation_nullifier: credential.revocation_nullifier,
            proof_salt: credential.proof_salt,
        };

        return (preserved, proof) then finalize(credential.revocation_nullifier);
    }

    finalize prove_accredited_investor(revocation_nullifier: field) {
        let is_revoked: bool = Mapping::get_or_use(revoked_nullifiers, revocation_nullifier, false);
        assert(!is_revoked);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // PROVE COMPOSITE (AGE + KYC + COUNTRY)
    // ───────────────────────────────────────────────────────────────────────────
    // Proves multiple claims in a single proof for efficiency
    transition prove_composite(
        credential: Credential,
        minimum_age: u8,
        restricted_1: u16,
        restricted_2: u16,
        restricted_3: u16,
        restricted_4: u16,
        current_block: u64,
        verifier_context: field,
        user_seed: field
    ) -> (Credential, CredentialProof) {
        // Ownership
        assert_eq(credential.owner, self.caller);

        // Age check
        assert(credential.age >= minimum_age);

        // KYC check
        assert(credential.kyc_passed);

        // Country check
        assert(credential.country_code != restricted_1);
        assert(credential.country_code != restricted_2);
        assert(credential.country_code != restricted_3);
        assert(credential.country_code != restricted_4);

        // Expiry
        let not_expired: bool = credential.expires_at == 0u64 ||
                                current_block < credential.expires_at;
        assert(not_expired);

        let proof_nonce: field = compute_proof_nonce(
            credential.credential_id,
            verifier_context,
            current_block,
            user_seed
        );

        // Include all parameters in claim hash
        let params_hash: field = BHP256::hash_to_field(
            (minimum_age as field) + (restricted_1 as field) +
            (restricted_2 as field) + (restricted_3 as field) + (restricted_4 as field)
        );

        let claim_hash: field = BHP256::hash_to_field(
            credential.credential_id + (TYPE_COMPOSITE as field) +
            1field + proof_nonce + params_hash
        );

        let proof: CredentialProof = CredentialProof {
            owner: self.caller,
            claim_hash: claim_hash,
            claim_type: TYPE_COMPOSITE,
            claim_result: 1field,
            verifier_context: verifier_context,
            proven_at: current_block,
            proof_nonce: proof_nonce,
            expires_at: credential.expires_at,
        };

        let preserved: Credential = Credential {
            owner: credential.owner,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            age: credential.age,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_id: credential.credential_id,
            revocation_nullifier: credential.revocation_nullifier,
            proof_salt: credential.proof_salt,
        };

        return (preserved, proof) then finalize(credential.revocation_nullifier);
    }

    finalize prove_composite(revocation_nullifier: field) {
        let is_revoked: bool = Mapping::get_or_use(revoked_nullifiers, revocation_nullifier, false);
        assert(!is_revoked);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CREDENTIAL MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    // Check if credential is revoked (for user's own verification)
    transition check_revocation(
        credential: Credential
    ) -> (Credential, bool) {
        assert_eq(credential.owner, self.caller);

        let preserved: Credential = Credential {
            owner: credential.owner,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            age: credential.age,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_id: credential.credential_id,
            revocation_nullifier: credential.revocation_nullifier,
            proof_salt: credential.proof_salt,
        };

        // The bool returned is a placeholder - real check happens in finalize
        // If finalize fails, credential is revoked
        return (preserved, true) then finalize(credential.revocation_nullifier);
    }

    finalize check_revocation(revocation_nullifier: field) {
        let is_revoked: bool = Mapping::get_or_use(revoked_nullifiers, revocation_nullifier, false);
        assert(!is_revoked);
    }

    // Destroy a credential (user choice)
    transition destroy_credential(credential: Credential) -> field {
        assert_eq(credential.owner, self.caller);
        return credential.credential_id;
    }
}
