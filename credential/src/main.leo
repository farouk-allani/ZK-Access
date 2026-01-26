// ZK-Access: Credential Issuance & Management Program
// Program: credential.aleo
// Version: 1.0.0
//
// This program implements privacy-preserving verifiable credentials on Aleo.
// Credentials are encrypted records bound to a user's identity commitment.
// Issuers can issue and revoke credentials without revealing credential contents.

program credential.aleo {

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS - Credential Type Identifiers
    // ═══════════════════════════════════════════════════════════════════════════

    // Standard credential types for interoperability
    const TYPE_KYC: u8 = 1u8;              // Know Your Customer verification
    const TYPE_AGE: u8 = 2u8;              // Age verification
    const TYPE_ACCREDITATION: u8 = 3u8;   // Accredited investor status
    const TYPE_JURISDICTION: u8 = 4u8;    // Jurisdiction/country verification
    const TYPE_COMPOSITE: u8 = 255u8;     // Multi-claim credential

    // Credential status flags
    const STATUS_ACTIVE: u8 = 1u8;
    const STATUS_SUSPENDED: u8 = 2u8;
    const STATUS_EXPIRED: u8 = 3u8;

    // ═══════════════════════════════════════════════════════════════════════════
    // RECORD DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Primary credential record - encrypted and owned by the credential subject
    record Credential {
        // The user who holds this credential
        owner: address,

        // Address of the issuing entity (e.g., KYC provider, DAO)
        issuer: address,

        // Commitment binding this credential to the subject's identity
        // Must match the identity_commitment from identity.aleo
        subject_commitment: field,

        // Type of credential (see constants above)
        credential_type: u8,

        // ─────────────────────────────────────────────────────────────────────
        // CLAIM DATA - The actual credential assertions
        // ─────────────────────────────────────────────────────────────────────

        // Age verification: subject is over 18 years old
        over_18: bool,

        // Age verification: subject is over 21 years old
        over_21: bool,

        // Country code (ISO 3166-1 numeric)
        // Examples: 840 = USA, 826 = UK, 276 = Germany, 392 = Japan
        country_code: u16,

        // KYC verification passed
        kyc_passed: bool,

        // Accredited investor status (SEC Rule 501 or equivalent)
        accredited_investor: bool,

        // Risk score (0-255, lower is better)
        risk_score: u8,

        // ─────────────────────────────────────────────────────────────────────
        // METADATA
        // ─────────────────────────────────────────────────────────────────────

        // Block height when credential was issued
        issued_at: u64,

        // Block height when credential expires (0 = never)
        expires_at: u64,

        // Unique credential identifier hash
        credential_hash: field,

        // Nullifier for revocation checking
        // This is derived: H(credential_hash || revocation_secret)
        revocation_nullifier: field,
    }

    // Lightweight credential proof token for selective disclosure
    // Used to prove specific claims without revealing full credential
    record CredentialProof {
        owner: address,
        // Which credential this proof is derived from
        credential_hash: field,
        // The specific claim being proven
        claim_type: u8,
        // The claim value (encoded as field)
        claim_value: field,
        // Proof timestamp
        proven_at: u64,
        // Binding to prevent replay
        nonce: field,
    }

    // Issuer authorization token - held by authorized issuers
    record IssuerToken {
        owner: address,
        // Hash of issuer's credentials/certification
        issuer_id: field,
        // What types of credentials this issuer can issue
        authorized_types: u32,  // Bitfield of credential types
        // When this authorization was granted
        authorized_at: u64,
        // Authorization expiry
        expires_at: u64,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCT DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Credential claim data for computing hashes
    struct ClaimData {
        over_18: bool,
        over_21: bool,
        country_code: u16,
        kyc_passed: bool,
        accredited_investor: bool,
        risk_score: u8,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAPPINGS (PUBLIC ON-CHAIN STATE)
    // ═══════════════════════════════════════════════════════════════════════════

    // Authorized issuers registry
    // Key: issuer address
    // Value: boolean (true = authorized, false/missing = not authorized)
    mapping authorized_issuers: address => bool;

    // Issuer metadata (optional, for transparency)
    // Key: issuer address
    // Value: metadata hash (points to off-chain issuer details)
    mapping issuer_metadata: address => field;

    // Revocation registry using nullifiers
    // Key: revocation_nullifier
    // Value: boolean (true = revoked)
    // PRIVACY: Nullifiers cannot be linked to credentials without the secret
    mapping revoked_nullifiers: field => bool;

    // Credential count per issuer (for analytics, optional)
    mapping issuer_credential_count: address => u64;

    // Global admin for issuer management
    // In production, this would be a multisig or DAO
    mapping admin: u8 => address;

    // ═══════════════════════════════════════════════════════════════════════════
    // INLINE HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Compute credential hash from all credential data
    inline compute_credential_hash(
        issuer: address,
        subject_commitment: field,
        claims: ClaimData,
        issued_at: u64,
        salt: field
    ) -> field {
        let claims_hash: field = BHP256::hash_to_field(claims);
        let issuer_hash: field = BHP256::hash_to_field(issuer);

        return BHP256::hash_to_field(
            issuer_hash + subject_commitment + claims_hash +
            (issued_at as field) + salt
        );
    }

    // Compute revocation nullifier from credential hash and secret
    inline compute_revocation_nullifier(
        credential_hash: field,
        revocation_secret: field
    ) -> field {
        return BHP256::hash_to_field(credential_hash + revocation_secret);
    }

    // Encode a boolean claim as a field
    inline bool_to_field(value: bool) -> field {
        return value ? 1field : 0field;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // INITIALIZE ADMIN
    // ─────────────────────────────────────────────────────────────────────────
    // Sets the initial admin address. Can only be called once.
    // In production, this would be called during program deployment.
    transition initialize_admin(admin_address: address) {
        return then finalize(admin_address);
    }

    finalize initialize_admin(admin_address: address) {
        // Check that admin hasn't been set yet
        let existing: bool = Mapping::contains(admin, 0u8);
        assert(!existing);

        // Set the admin
        Mapping::set(admin, 0u8, admin_address);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHORIZE ISSUER
    // ─────────────────────────────────────────────────────────────────────────
    // Adds an address to the authorized issuers registry.
    // Only admin can call this.
    //
    // Parameters:
    //   - issuer: Address to authorize
    //   - metadata_hash: Hash of issuer metadata (name, certification, etc.)
    transition authorize_issuer(
        issuer: address,
        metadata_hash: field
    ) {
        return then finalize(self.caller, issuer, metadata_hash);
    }

    finalize authorize_issuer(
        caller: address,
        issuer: address,
        metadata_hash: field
    ) {
        // Verify caller is admin
        let admin_address: address = Mapping::get(admin, 0u8);
        assert_eq(caller, admin_address);

        // Authorize the issuer
        Mapping::set(authorized_issuers, issuer, true);
        Mapping::set(issuer_metadata, issuer, metadata_hash);
        Mapping::set(issuer_credential_count, issuer, 0u64);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEAUTHORIZE ISSUER
    // ─────────────────────────────────────────────────────────────────────────
    // Removes an address from the authorized issuers registry.
    // Only admin can call this.
    // Note: This does NOT automatically revoke issued credentials.
    transition deauthorize_issuer(issuer: address) {
        return then finalize(self.caller, issuer);
    }

    finalize deauthorize_issuer(caller: address, issuer: address) {
        // Verify caller is admin
        let admin_address: address = Mapping::get(admin, 0u8);
        assert_eq(caller, admin_address);

        // Remove authorization
        Mapping::set(authorized_issuers, issuer, false);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CREDENTIAL ISSUANCE TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // ISSUE CREDENTIAL
    // ─────────────────────────────────────────────────────────────────────────
    // Issues a new credential to a user.
    // Only authorized issuers can call this.
    //
    // Parameters:
    //   - recipient: Address that will own the credential
    //   - subject_commitment: Identity commitment from identity.aleo
    //   - credential_type: Type of credential being issued
    //   - over_18: Age claim (>=18)
    //   - over_21: Age claim (>=21)
    //   - country_code: ISO 3166-1 numeric country code
    //   - kyc_passed: KYC verification status
    //   - accredited_investor: Accredited investor status
    //   - risk_score: Risk assessment score
    //   - issued_at: Block height of issuance
    //   - expires_at: Expiration block height (0 = never)
    //   - salt: Random salt for credential hash
    //   - revocation_secret: Secret for generating revocation nullifier
    //
    // Returns:
    //   - Credential record owned by recipient
    //
    // Security:
    //   - Issuer authorization checked in finalize
    //   - revocation_secret should be stored securely by issuer
    transition issue_credential(
        recipient: address,
        subject_commitment: field,
        credential_type: u8,
        over_18: bool,
        over_21: bool,
        country_code: u16,
        kyc_passed: bool,
        accredited_investor: bool,
        risk_score: u8,
        issued_at: u64,
        expires_at: u64,
        salt: field,
        revocation_secret: field
    ) -> Credential {
        // Construct claim data for hashing
        let claims: ClaimData = ClaimData {
            over_18: over_18,
            over_21: over_21,
            country_code: country_code,
            kyc_passed: kyc_passed,
            accredited_investor: accredited_investor,
            risk_score: risk_score,
        };

        // Compute credential hash
        let credential_hash: field = compute_credential_hash(
            self.caller,
            subject_commitment,
            claims,
            issued_at,
            salt
        );

        // Compute revocation nullifier
        let revocation_nullifier: field = compute_revocation_nullifier(
            credential_hash,
            revocation_secret
        );

        // Create the credential record
        let credential: Credential = Credential {
            owner: recipient,
            issuer: self.caller,
            subject_commitment: subject_commitment,
            credential_type: credential_type,
            over_18: over_18,
            over_21: over_21,
            country_code: country_code,
            kyc_passed: kyc_passed,
            accredited_investor: accredited_investor,
            risk_score: risk_score,
            issued_at: issued_at,
            expires_at: expires_at,
            credential_hash: credential_hash,
            revocation_nullifier: revocation_nullifier,
        };

        return credential then finalize(self.caller);
    }

    finalize issue_credential(issuer: address) {
        // Verify issuer is authorized
        let is_authorized: bool = Mapping::get_or_use(authorized_issuers, issuer, false);
        assert(is_authorized);

        // Increment credential count
        let current_count: u64 = Mapping::get_or_use(issuer_credential_count, issuer, 0u64);
        Mapping::set(issuer_credential_count, issuer, current_count + 1u64);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ISSUE KYC CREDENTIAL (Convenience Function)
    // ─────────────────────────────────────────────────────────────────────────
    // Simplified credential issuance for KYC-only credentials.
    transition issue_kyc_credential(
        recipient: address,
        subject_commitment: field,
        kyc_passed: bool,
        country_code: u16,
        issued_at: u64,
        expires_at: u64,
        salt: field,
        revocation_secret: field
    ) -> Credential {
        let claims: ClaimData = ClaimData {
            over_18: false,
            over_21: false,
            country_code: country_code,
            kyc_passed: kyc_passed,
            accredited_investor: false,
            risk_score: 0u8,
        };

        let credential_hash: field = compute_credential_hash(
            self.caller,
            subject_commitment,
            claims,
            issued_at,
            salt
        );

        let revocation_nullifier: field = compute_revocation_nullifier(
            credential_hash,
            revocation_secret
        );

        return Credential {
            owner: recipient,
            issuer: self.caller,
            subject_commitment: subject_commitment,
            credential_type: TYPE_KYC,
            over_18: false,
            over_21: false,
            country_code: country_code,
            kyc_passed: kyc_passed,
            accredited_investor: false,
            risk_score: 0u8,
            issued_at: issued_at,
            expires_at: expires_at,
            credential_hash: credential_hash,
            revocation_nullifier: revocation_nullifier,
        } then finalize(self.caller);
    }

    finalize issue_kyc_credential(issuer: address) {
        let is_authorized: bool = Mapping::get_or_use(authorized_issuers, issuer, false);
        assert(is_authorized);

        let current_count: u64 = Mapping::get_or_use(issuer_credential_count, issuer, 0u64);
        Mapping::set(issuer_credential_count, issuer, current_count + 1u64);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ISSUE AGE CREDENTIAL (Convenience Function)
    // ─────────────────────────────────────────────────────────────────────────
    transition issue_age_credential(
        recipient: address,
        subject_commitment: field,
        over_18: bool,
        over_21: bool,
        issued_at: u64,
        expires_at: u64,
        salt: field,
        revocation_secret: field
    ) -> Credential {
        let claims: ClaimData = ClaimData {
            over_18: over_18,
            over_21: over_21,
            country_code: 0u16,
            kyc_passed: false,
            accredited_investor: false,
            risk_score: 0u8,
        };

        let credential_hash: field = compute_credential_hash(
            self.caller,
            subject_commitment,
            claims,
            issued_at,
            salt
        );

        let revocation_nullifier: field = compute_revocation_nullifier(
            credential_hash,
            revocation_secret
        );

        return Credential {
            owner: recipient,
            issuer: self.caller,
            subject_commitment: subject_commitment,
            credential_type: TYPE_AGE,
            over_18: over_18,
            over_21: over_21,
            country_code: 0u16,
            kyc_passed: false,
            accredited_investor: false,
            risk_score: 0u8,
            issued_at: issued_at,
            expires_at: expires_at,
            credential_hash: credential_hash,
            revocation_nullifier: revocation_nullifier,
        } then finalize(self.caller);
    }

    finalize issue_age_credential(issuer: address) {
        let is_authorized: bool = Mapping::get_or_use(authorized_issuers, issuer, false);
        assert(is_authorized);

        let current_count: u64 = Mapping::get_or_use(issuer_credential_count, issuer, 0u64);
        Mapping::set(issuer_credential_count, issuer, current_count + 1u64);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REVOCATION TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // REVOKE CREDENTIAL
    // ─────────────────────────────────────────────────────────────────────────
    // Revokes a credential using the revocation nullifier.
    // Only the original issuer can revoke (must know the revocation_secret).
    //
    // Parameters:
    //   - credential_hash: Hash of the credential to revoke
    //   - revocation_secret: Secret used during issuance
    //
    // Privacy:
    //   - The revocation nullifier is public, but cannot be linked to the
    //     credential without knowing both credential_hash and revocation_secret
    //   - Observers see only that "some credential" was revoked
    transition revoke_credential(
        credential_hash: field,
        revocation_secret: field
    ) {
        // Compute the nullifier
        let nullifier: field = compute_revocation_nullifier(
            credential_hash,
            revocation_secret
        );

        return then finalize(self.caller, nullifier);
    }

    finalize revoke_credential(issuer: address, nullifier: field) {
        // Verify issuer is authorized (only authorized issuers can revoke)
        let is_authorized: bool = Mapping::get_or_use(authorized_issuers, issuer, false);
        assert(is_authorized);

        // Check not already revoked
        let already_revoked: bool = Mapping::get_or_use(revoked_nullifiers, nullifier, false);
        assert(!already_revoked);

        // Mark as revoked
        Mapping::set(revoked_nullifiers, nullifier, true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BATCH REVOKE CREDENTIALS
    // ─────────────────────────────────────────────────────────────────────────
    // Revokes multiple credentials at once (up to 4).
    // Useful for mass revocation events.
    transition batch_revoke(
        hash_1: field, secret_1: field,
        hash_2: field, secret_2: field,
        hash_3: field, secret_3: field,
        hash_4: field, secret_4: field,
        count: u8  // How many to actually revoke (1-4)
    ) {
        let nullifier_1: field = compute_revocation_nullifier(hash_1, secret_1);
        let nullifier_2: field = compute_revocation_nullifier(hash_2, secret_2);
        let nullifier_3: field = compute_revocation_nullifier(hash_3, secret_3);
        let nullifier_4: field = compute_revocation_nullifier(hash_4, secret_4);

        return then finalize(
            self.caller,
            nullifier_1, nullifier_2, nullifier_3, nullifier_4,
            count
        );
    }

    finalize batch_revoke(
        issuer: address,
        nullifier_1: field, nullifier_2: field,
        nullifier_3: field, nullifier_4: field,
        count: u8
    ) {
        // Verify issuer
        let is_authorized: bool = Mapping::get_or_use(authorized_issuers, issuer, false);
        assert(is_authorized);

        // Revoke based on count
        if count >= 1u8 {
            Mapping::set(revoked_nullifiers, nullifier_1, true);
        }
        if count >= 2u8 {
            Mapping::set(revoked_nullifiers, nullifier_2, true);
        }
        if count >= 3u8 {
            Mapping::set(revoked_nullifiers, nullifier_3, true);
        }
        if count >= 4u8 {
            Mapping::set(revoked_nullifiers, nullifier_4, true);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CREDENTIAL VERIFICATION TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // CHECK REVOCATION STATUS
    // ─────────────────────────────────────────────────────────────────────────
    // Allows a user to check if their credential has been revoked.
    // The credential is preserved (consumed and re-created).
    //
    // Returns:
    //   - Preserved credential
    //   - Boolean (true if credential is still valid, false if revoked)
    transition check_revocation_status(
        credential: Credential
    ) -> (Credential, bool) {
        // Preserve the credential
        let preserved: Credential = Credential {
            owner: self.caller,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            over_18: credential.over_18,
            over_21: credential.over_21,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_hash: credential.credential_hash,
            revocation_nullifier: credential.revocation_nullifier,
        };

        // Return credential and a placeholder - actual check happens in finalize
        // Note: In production, you'd want an async pattern here
        return (preserved, true) then finalize(credential.revocation_nullifier);
    }

    finalize check_revocation_status(nullifier: field) {
        // Check revocation status
        let is_revoked: bool = Mapping::get_or_use(revoked_nullifiers, nullifier, false);
        // If revoked, the finalize will fail
        assert(!is_revoked);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VERIFY CREDENTIAL BINDING
    // ─────────────────────────────────────────────────────────────────────────
    // Verifies that a credential is bound to a specific identity commitment.
    // Used by relying parties to verify credential-identity linkage.
    transition verify_credential_binding(
        credential: Credential,
        expected_commitment: field
    ) -> (Credential, bool) {
        let is_bound: bool = credential.subject_commitment == expected_commitment;

        let preserved: Credential = Credential {
            owner: self.caller,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            over_18: credential.over_18,
            over_21: credential.over_21,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_hash: credential.credential_hash,
            revocation_nullifier: credential.revocation_nullifier,
        };

        return (preserved, is_bound);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SELECTIVE DISCLOSURE / PROOF GENERATION
    // ═══════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // PROVE OVER 18
    // ─────────────────────────────────────────────────────────────────────────
    // Creates a proof that the credential holder is over 18.
    // The proof reveals only this specific claim, not other credential data.
    transition prove_over_18(
        credential: Credential,
        current_block: u64,
        nonce_seed: field
    ) -> (Credential, CredentialProof) {
        // Verify the claim exists
        assert(credential.over_18);

        // Check expiration (if set)
        let is_valid_expiry: bool = credential.expires_at == 0u64 ||
                                    credential.expires_at > current_block;
        assert(is_valid_expiry);

        // Compute unique nonce
        let nonce: field = BHP256::hash_to_field(
            credential.credential_hash + nonce_seed + (current_block as field)
        );

        // Create proof token
        let proof: CredentialProof = CredentialProof {
            owner: self.caller,
            credential_hash: credential.credential_hash,
            claim_type: TYPE_AGE,
            claim_value: 1field,  // true = over 18
            proven_at: current_block,
            nonce: nonce,
        };

        // Preserve credential
        let preserved: Credential = Credential {
            owner: self.caller,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            over_18: credential.over_18,
            over_21: credential.over_21,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_hash: credential.credential_hash,
            revocation_nullifier: credential.revocation_nullifier,
        };

        return (preserved, proof) then finalize(credential.revocation_nullifier);
    }

    finalize prove_over_18(nullifier: field) {
        // Ensure credential is not revoked
        let is_revoked: bool = Mapping::get_or_use(revoked_nullifiers, nullifier, false);
        assert(!is_revoked);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROVE KYC PASSED
    // ─────────────────────────────────────────────────────────────────────────
    // Creates a proof that the credential holder has passed KYC.
    transition prove_kyc_passed(
        credential: Credential,
        current_block: u64,
        nonce_seed: field
    ) -> (Credential, CredentialProof) {
        // Verify the claim exists
        assert(credential.kyc_passed);

        // Check expiration
        let is_valid_expiry: bool = credential.expires_at == 0u64 ||
                                    credential.expires_at > current_block;
        assert(is_valid_expiry);

        let nonce: field = BHP256::hash_to_field(
            credential.credential_hash + nonce_seed + (current_block as field)
        );

        let proof: CredentialProof = CredentialProof {
            owner: self.caller,
            credential_hash: credential.credential_hash,
            claim_type: TYPE_KYC,
            claim_value: 1field,
            proven_at: current_block,
            nonce: nonce,
        };

        let preserved: Credential = Credential {
            owner: self.caller,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            over_18: credential.over_18,
            over_21: credential.over_21,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_hash: credential.credential_hash,
            revocation_nullifier: credential.revocation_nullifier,
        };

        return (preserved, proof) then finalize(credential.revocation_nullifier);
    }

    finalize prove_kyc_passed(nullifier: field) {
        let is_revoked: bool = Mapping::get_or_use(revoked_nullifiers, nullifier, false);
        assert(!is_revoked);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROVE COUNTRY
    // ─────────────────────────────────────────────────────────────────────────
    // Proves residence in a specific country or NOT in a blocked country list.
    transition prove_country(
        credential: Credential,
        expected_country: u16,
        current_block: u64,
        nonce_seed: field
    ) -> (Credential, CredentialProof, bool) {
        // Check if country matches
        let country_matches: bool = credential.country_code == expected_country;

        // Check expiration
        let is_valid_expiry: bool = credential.expires_at == 0u64 ||
                                    credential.expires_at > current_block;
        assert(is_valid_expiry);

        let nonce: field = BHP256::hash_to_field(
            credential.credential_hash + nonce_seed + (current_block as field)
        );

        let proof: CredentialProof = CredentialProof {
            owner: self.caller,
            credential_hash: credential.credential_hash,
            claim_type: TYPE_JURISDICTION,
            claim_value: credential.country_code as field,
            proven_at: current_block,
            nonce: nonce,
        };

        let preserved: Credential = Credential {
            owner: self.caller,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            over_18: credential.over_18,
            over_21: credential.over_21,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_hash: credential.credential_hash,
            revocation_nullifier: credential.revocation_nullifier,
        };

        return (preserved, proof, country_matches) then finalize(credential.revocation_nullifier);
    }

    finalize prove_country(nullifier: field) {
        let is_revoked: bool = Mapping::get_or_use(revoked_nullifiers, nullifier, false);
        assert(!is_revoked);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CREDENTIAL MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // TRANSFER CREDENTIAL
    // ─────────────────────────────────────────────────────────────────────────
    // Transfers credential to another address.
    // WARNING: This breaks the identity binding! Use with extreme caution.
    // In most cases, credentials should NOT be transferable.
    transition transfer_credential(
        credential: Credential,
        new_owner: address
    ) -> Credential {
        return Credential {
            owner: new_owner,
            issuer: credential.issuer,
            subject_commitment: credential.subject_commitment,
            credential_type: credential.credential_type,
            over_18: credential.over_18,
            over_21: credential.over_21,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            risk_score: credential.risk_score,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
            credential_hash: credential.credential_hash,
            revocation_nullifier: credential.revocation_nullifier,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DESTROY CREDENTIAL
    // ─────────────────────────────────────────────────────────────────────────
    // Permanently destroys a credential.
    // User may want to do this if the credential is compromised or no longer needed.
    transition destroy_credential(credential: Credential) -> field {
        // Record is consumed but not re-created
        return credential.credential_hash;
    }
}
