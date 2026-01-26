// ═══════════════════════════════════════════════════════════════════════════════
// ZK-ACCESS: VERIFIER PROGRAM
// Program: verifier.aleo
// Version: 2.0.0
//
// This program provides composable proof verification for third-party protocols.
// It accepts CredentialProof records and produces VerificationResult records
// that can be used as access gates in other Aleo programs.
//
// KEY FEATURES:
// - Proof replay prevention via nonce tracking
// - Verifier-specific context binding
// - Expiry checking
// - Composable verification results
//
// SECURITY MODEL:
// - Proofs are one-time use (consumed on verification)
// - Verification results are bound to specific verifiers
// - No credential data is ever revealed to verifiers
// ═══════════════════════════════════════════════════════════════════════════════

program verifier.aleo {

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════

    // Verification status codes
    const STATUS_VALID: u8 = 1u8;
    const STATUS_INVALID: u8 = 0u8;

    // Claim type identifiers (must match credential.aleo)
    const TYPE_KYC: u8 = 1u8;
    const TYPE_AGE: u8 = 2u8;
    const TYPE_ACCREDITATION: u8 = 3u8;
    const TYPE_JURISDICTION: u8 = 4u8;
    const TYPE_COMPOSITE: u8 = 255u8;

    // Max proof age in blocks (e.g., ~1 hour at 1 block/sec)
    const MAX_PROOF_AGE: u64 = 3600u64;

    // ═══════════════════════════════════════════════════════════════════════════
    // RECORD DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Input: CredentialProof from credential.aleo (imported via composition)
    // We define a compatible structure here for verification
    record CredentialProof {
        owner: address,
        claim_hash: field,
        claim_type: u8,
        claim_result: field,
        verifier_context: field,
        proven_at: u64,
        proof_nonce: field,
        expires_at: u64,
    }

    // Output: Verification result that can be used by other protocols
    record VerificationResult {
        // The address that presented the proof
        owner: address,

        // The claim type that was verified
        verified_claim_type: u8,

        // The verification result (1 = valid, 0 = invalid)
        result: u8,

        // The verifier context this result is bound to
        verifier_context: field,

        // Block height when verification occurred
        verified_at: u64,

        // Unique verification ID (prevents result replay)
        verification_id: field,

        // Original proof expiry (for downstream checks)
        credential_expires_at: u64,
    }

    // Verifier registration record
    record VerifierToken {
        owner: address,
        verifier_id: field,
        name_hash: field,
        registered_at: u64,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAPPINGS (PUBLIC STATE)
    // ═══════════════════════════════════════════════════════════════════════════

    // Consumed proof nonces - prevents replay
    // Key: proof_nonce, Value: true if consumed
    mapping consumed_nonces: field => bool;

    // Consumed verification IDs - prevents result replay
    mapping consumed_verifications: field => bool;

    // Registered verifiers
    mapping registered_verifiers: address => bool;

    // Verifier stats (optional analytics)
    mapping verifier_stats: address => u64;

    // Admin
    mapping admin: u8 => address;

    // ═══════════════════════════════════════════════════════════════════════════
    // INLINE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Compute verification ID
    inline compute_verification_id(
        proof_nonce: field,
        verifier: address,
        current_block: u64
    ) -> field {
        let verifier_hash: field = BHP256::hash_to_field(verifier);
        return BHP256::hash_to_field(proof_nonce + verifier_hash + (current_block as field));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Initialize admin
    transition initialize_admin(admin_address: address) {
        return then finalize(admin_address);
    }

    finalize initialize_admin(admin_address: address) {
        let exists: bool = Mapping::contains(admin, 0u8);
        assert(!exists);
        Mapping::set(admin, 0u8, admin_address);
    }

    // Register a verifier
    transition register_verifier(verifier: address) {
        return then finalize(self.caller, verifier);
    }

    finalize register_verifier(caller: address, verifier: address) {
        let admin_addr: address = Mapping::get(admin, 0u8);
        assert_eq(caller, admin_addr);
        Mapping::set(registered_verifiers, verifier, true);
        Mapping::set(verifier_stats, verifier, 0u64);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VERIFICATION TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // ───────────────────────────────────────────────────────────────────────────
    // VERIFY PROOF
    // ───────────────────────────────────────────────────────────────────────────
    // Verifies a CredentialProof and produces a VerificationResult.
    //
    // SECURITY CHECKS:
    // 1. Proof owner must be caller (only holder can present their proof)
    // 2. Verifier context must match (proof bound to this verifier)
    // 3. Proof must not be expired
    // 4. Proof must not be too old (MAX_PROOF_AGE)
    // 5. Proof nonce must not be consumed (prevents replay)
    //
    // OUTPUT:
    // - VerificationResult record owned by caller
    // - Can be used as access gate in other protocols
    transition verify_proof(
        proof: CredentialProof,
        expected_verifier_context: field,
        current_block: u64
    ) -> VerificationResult {
        // ═══ CHECK 1: Ownership ═══
        // Only the proof holder can present it
        assert_eq(proof.owner, self.caller);

        // ═══ CHECK 2: Context binding ═══
        // Proof must be for this specific verifier
        assert_eq(proof.verifier_context, expected_verifier_context);

        // ═══ CHECK 3: Credential expiry ═══
        // Check the underlying credential hasn't expired
        let credential_valid: bool = proof.expires_at == 0u64 ||
                                     current_block < proof.expires_at;
        assert(credential_valid);

        // ═══ CHECK 4: Proof freshness ═══
        // Proof must be recent (within MAX_PROOF_AGE blocks)
        let proof_age: u64 = current_block - proof.proven_at;
        assert(proof_age <= MAX_PROOF_AGE);

        // ═══ CHECK 5: Claim result ═══
        // Proof must assert success (claim_result == 1)
        assert_eq(proof.claim_result, 1field);

        // Compute verification ID
        let verification_id: field = compute_verification_id(
            proof.proof_nonce,
            self.caller,
            current_block
        );

        // Create verification result
        let result: VerificationResult = VerificationResult {
            owner: self.caller,
            verified_claim_type: proof.claim_type,
            result: STATUS_VALID,
            verifier_context: expected_verifier_context,
            verified_at: current_block,
            verification_id: verification_id,
            credential_expires_at: proof.expires_at,
        };

        // Mark proof as consumed in finalize
        return result then finalize(proof.proof_nonce, self.caller);
    }

    finalize verify_proof(proof_nonce: field, verifier: address) {
        // Check proof hasn't been consumed
        let consumed: bool = Mapping::get_or_use(consumed_nonces, proof_nonce, false);
        assert(!consumed);

        // Mark as consumed
        Mapping::set(consumed_nonces, proof_nonce, true);

        // Update verifier stats (if registered)
        let is_registered: bool = Mapping::get_or_use(registered_verifiers, verifier, false);
        if is_registered {
            let current_count: u64 = Mapping::get_or_use(verifier_stats, verifier, 0u64);
            Mapping::set(verifier_stats, verifier, current_count + 1u64);
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // VERIFY AGE PROOF (Specialized)
    // ───────────────────────────────────────────────────────────────────────────
    // Verifies specifically an age proof
    transition verify_age_proof(
        proof: CredentialProof,
        expected_verifier_context: field,
        current_block: u64
    ) -> VerificationResult {
        // Ownership
        assert_eq(proof.owner, self.caller);

        // Must be age claim
        assert_eq(proof.claim_type, TYPE_AGE);

        // Context binding
        assert_eq(proof.verifier_context, expected_verifier_context);

        // Expiry
        let credential_valid: bool = proof.expires_at == 0u64 ||
                                     current_block < proof.expires_at;
        assert(credential_valid);

        // Freshness
        let proof_age: u64 = current_block - proof.proven_at;
        assert(proof_age <= MAX_PROOF_AGE);

        // Success
        assert_eq(proof.claim_result, 1field);

        let verification_id: field = compute_verification_id(
            proof.proof_nonce,
            self.caller,
            current_block
        );

        let result: VerificationResult = VerificationResult {
            owner: self.caller,
            verified_claim_type: TYPE_AGE,
            result: STATUS_VALID,
            verifier_context: expected_verifier_context,
            verified_at: current_block,
            verification_id: verification_id,
            credential_expires_at: proof.expires_at,
        };

        return result then finalize(proof.proof_nonce, self.caller);
    }

    finalize verify_age_proof(proof_nonce: field, verifier: address) {
        let consumed: bool = Mapping::get_or_use(consumed_nonces, proof_nonce, false);
        assert(!consumed);
        Mapping::set(consumed_nonces, proof_nonce, true);

        let is_registered: bool = Mapping::get_or_use(registered_verifiers, verifier, false);
        if is_registered {
            let current_count: u64 = Mapping::get_or_use(verifier_stats, verifier, 0u64);
            Mapping::set(verifier_stats, verifier, current_count + 1u64);
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // VERIFY KYC PROOF (Specialized)
    // ───────────────────────────────────────────────────────────────────────────
    transition verify_kyc_proof(
        proof: CredentialProof,
        expected_verifier_context: field,
        current_block: u64
    ) -> VerificationResult {
        assert_eq(proof.owner, self.caller);
        assert_eq(proof.claim_type, TYPE_KYC);
        assert_eq(proof.verifier_context, expected_verifier_context);

        let credential_valid: bool = proof.expires_at == 0u64 ||
                                     current_block < proof.expires_at;
        assert(credential_valid);

        let proof_age: u64 = current_block - proof.proven_at;
        assert(proof_age <= MAX_PROOF_AGE);

        assert_eq(proof.claim_result, 1field);

        let verification_id: field = compute_verification_id(
            proof.proof_nonce,
            self.caller,
            current_block
        );

        let result: VerificationResult = VerificationResult {
            owner: self.caller,
            verified_claim_type: TYPE_KYC,
            result: STATUS_VALID,
            verifier_context: expected_verifier_context,
            verified_at: current_block,
            verification_id: verification_id,
            credential_expires_at: proof.expires_at,
        };

        return result then finalize(proof.proof_nonce, self.caller);
    }

    finalize verify_kyc_proof(proof_nonce: field, verifier: address) {
        let consumed: bool = Mapping::get_or_use(consumed_nonces, proof_nonce, false);
        assert(!consumed);
        Mapping::set(consumed_nonces, proof_nonce, true);

        let is_registered: bool = Mapping::get_or_use(registered_verifiers, verifier, false);
        if is_registered {
            let current_count: u64 = Mapping::get_or_use(verifier_stats, verifier, 0u64);
            Mapping::set(verifier_stats, verifier, current_count + 1u64);
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // VERIFY COMPOSITE PROOF
    // ───────────────────────────────────────────────────────────────────────────
    transition verify_composite_proof(
        proof: CredentialProof,
        expected_verifier_context: field,
        current_block: u64
    ) -> VerificationResult {
        assert_eq(proof.owner, self.caller);
        assert_eq(proof.claim_type, TYPE_COMPOSITE);
        assert_eq(proof.verifier_context, expected_verifier_context);

        let credential_valid: bool = proof.expires_at == 0u64 ||
                                     current_block < proof.expires_at;
        assert(credential_valid);

        let proof_age: u64 = current_block - proof.proven_at;
        assert(proof_age <= MAX_PROOF_AGE);

        assert_eq(proof.claim_result, 1field);

        let verification_id: field = compute_verification_id(
            proof.proof_nonce,
            self.caller,
            current_block
        );

        let result: VerificationResult = VerificationResult {
            owner: self.caller,
            verified_claim_type: TYPE_COMPOSITE,
            result: STATUS_VALID,
            verifier_context: expected_verifier_context,
            verified_at: current_block,
            verification_id: verification_id,
            credential_expires_at: proof.expires_at,
        };

        return result then finalize(proof.proof_nonce, self.caller);
    }

    finalize verify_composite_proof(proof_nonce: field, verifier: address) {
        let consumed: bool = Mapping::get_or_use(consumed_nonces, proof_nonce, false);
        assert(!consumed);
        Mapping::set(consumed_nonces, proof_nonce, true);

        let is_registered: bool = Mapping::get_or_use(registered_verifiers, verifier, false);
        if is_registered {
            let current_count: u64 = Mapping::get_or_use(verifier_stats, verifier, 0u64);
            Mapping::set(verifier_stats, verifier, current_count + 1u64);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VERIFICATION RESULT CONSUMPTION
    // ═══════════════════════════════════════════════════════════════════════════

    // ───────────────────────────────────────────────────────────────────────────
    // CONSUME VERIFICATION
    // ───────────────────────────────────────────────────────────────────────────
    // Used by protocols to consume a verification result.
    // After consumption, the result cannot be reused.
    transition consume_verification(
        result: VerificationResult,
        expected_claim_type: u8,
        expected_verifier_context: field,
        current_block: u64
    ) -> bool {
        // Ownership
        assert_eq(result.owner, self.caller);

        // Claim type match
        assert_eq(result.verified_claim_type, expected_claim_type);

        // Context match
        assert_eq(result.verifier_context, expected_verifier_context);

        // Status must be valid
        assert_eq(result.result, STATUS_VALID);

        // Credential must still be valid
        let still_valid: bool = result.credential_expires_at == 0u64 ||
                                current_block < result.credential_expires_at;
        assert(still_valid);

        // Mark as consumed in finalize
        return true then finalize(result.verification_id);
    }

    finalize consume_verification(verification_id: field) {
        // Check not already consumed
        let consumed: bool = Mapping::get_or_use(consumed_verifications, verification_id, false);
        assert(!consumed);

        // Mark as consumed
        Mapping::set(consumed_verifications, verification_id, true);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // CHECK VERIFICATION (Non-consuming)
    // ───────────────────────────────────────────────────────────────────────────
    // Checks if a verification is valid without consuming it
    transition check_verification(
        result: VerificationResult,
        expected_claim_type: u8,
        current_block: u64
    ) -> (VerificationResult, bool) {
        assert_eq(result.owner, self.caller);

        let type_match: bool = result.verified_claim_type == expected_claim_type;
        let is_valid: bool = result.result == STATUS_VALID;
        let not_expired: bool = result.credential_expires_at == 0u64 ||
                                current_block < result.credential_expires_at;

        let all_valid: bool = type_match && is_valid && not_expired;

        // Preserve result
        let preserved: VerificationResult = VerificationResult {
            owner: result.owner,
            verified_claim_type: result.verified_claim_type,
            result: result.result,
            verifier_context: result.verifier_context,
            verified_at: result.verified_at,
            verification_id: result.verification_id,
            credential_expires_at: result.credential_expires_at,
        };

        return (preserved, all_valid);
    }
}
