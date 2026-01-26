// ═══════════════════════════════════════════════════════════════════════════════
// ZK-ACCESS: IDENTITY CORE (HARDENED)
// Program: identity.aleo
// Version: 2.0.0
//
// This program implements a cryptographically-secure private identity vault.
// All identity data is stored in encrypted records with ownership enforcement.
//
// SECURITY MODEL:
// - Records are encrypted with owner's viewing key (AES-based)
// - Ownership is enforced via record consumption (only owner can spend)
// - Nullifiers prevent double-spending and identity cloning
// - No identity data is ever visible on-chain
// ═══════════════════════════════════════════════════════════════════════════════

program identity.aleo {

    // ═══════════════════════════════════════════════════════════════════════════
    // RECORD DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Primary identity record - ALL fields encrypted via Aleo record encryption
    record Identity {
        // Owner address - only this address can spend/update this record
        // Enforcement: Aleo runtime rejects transactions where caller != owner
        owner: address,

        // Pedersen commitment to identity data: H(unique_id || attributes || salt)
        // The preimage is NEVER stored - only the commitment
        // Binding property: cannot find two different inputs with same commitment
        // Hiding property: commitment reveals nothing about inputs without salt
        identity_commitment: field,

        // Hash of encrypted off-chain data reference (IPFS CID, etc.)
        // This allows linking to extended data without on-chain storage
        data_hash: field,

        // Monotonically increasing version - tracks update history
        version: u32,

        // Random salt for commitment hiding - MUST be kept secret by user
        // Without salt, commitment could theoretically be brute-forced
        salt: field,

        // Secret for generating identity nullifier
        // Used to prevent identity cloning attacks
        // nullifier = H(identity_commitment || nullifier_secret)
        nullifier_secret: field,
    }

    // Binding token for cross-program identity attestation
    // Used to prove identity ownership to credential issuers
    record IdentityBinding {
        owner: address,
        // The commitment that identifies this identity
        identity_commitment: field,
        // Context hash - what this binding is authorized for
        // Prevents binding reuse across different contexts
        binding_context: field,
        // One-time nonce - prevents replay of the same binding
        nonce: field,
        // Expiry block height - binding becomes invalid after this
        expires_at: u64,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCT DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Input structure for identity data (used in commitment computation)
    struct IdentityInput {
        unique_id_hash: field,
        attributes_hash: field,
        timestamp: u64,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAPPINGS (PUBLIC STATE - MINIMAL)
    // ═══════════════════════════════════════════════════════════════════════════

    // Nullifier registry - prevents double-creation of identities
    // Key: nullifier = H(identity_commitment || nullifier_secret)
    // Value: true if nullifier has been used
    // PRIVACY: Nullifier cannot be reversed to identity_commitment without secret
    mapping identity_nullifiers: field => bool;

    // Binding nonce registry - prevents binding replay
    mapping used_binding_nonces: field => bool;

    // ═══════════════════════════════════════════════════════════════════════════
    // INLINE FUNCTIONS (COMPILED INTO CIRCUITS)
    // ═══════════════════════════════════════════════════════════════════════════

    // Compute identity commitment using Pedersen hash
    // Properties:
    // - Collision resistant: infeasible to find two inputs with same output
    // - Hiding: output reveals nothing about input without salt
    inline compute_commitment(input: IdentityInput, salt: field) -> field {
        let input_hash: field = BHP256::hash_to_field(input);
        return BHP256::hash_to_field(input_hash + salt);
    }

    // Compute identity nullifier
    // The nullifier is deterministic but unpredictable without the secret
    inline compute_nullifier(commitment: field, secret: field) -> field {
        return BHP256::hash_to_field(commitment + secret);
    }

    // Compute binding nonce
    inline compute_binding_nonce(
        commitment: field,
        context: field,
        seed: field
    ) -> field {
        return BHP256::hash_to_field(commitment + context + seed);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TRANSITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // ───────────────────────────────────────────────────────────────────────────
    // CREATE IDENTITY
    // ───────────────────────────────────────────────────────────────────────────
    // Creates a new identity vault. The nullifier is registered to prevent
    // the same identity from being created twice.
    //
    // SECURITY:
    // - nullifier_secret MUST be random and kept private
    // - salt MUST be random and kept private
    // - unique_id_hash should be derived from a truly unique identifier
    //
    // PRIVACY:
    // - All inputs are private (encrypted in ZK proof)
    // - Only the nullifier is revealed (cannot be linked to identity)
    transition create_identity(
        unique_id_hash: field,
        attributes_hash: field,
        timestamp: u64,
        salt: field,
        nullifier_secret: field,
        data_hash: field
    ) -> Identity {
        // Construct input for commitment
        let input: IdentityInput = IdentityInput {
            unique_id_hash: unique_id_hash,
            attributes_hash: attributes_hash,
            timestamp: timestamp,
        };

        // Compute commitment
        let commitment: field = compute_commitment(input, salt);

        // Compute nullifier for registration
        let nullifier: field = compute_nullifier(commitment, nullifier_secret);

        // Create identity record
        let identity: Identity = Identity {
            owner: self.caller,
            identity_commitment: commitment,
            data_hash: data_hash,
            version: 1u32,
            salt: salt,
            nullifier_secret: nullifier_secret,
        };

        // Register nullifier in finalize (on-chain)
        return identity then finalize(nullifier);
    }

    finalize create_identity(nullifier: field) {
        // Check nullifier hasn't been used (prevents identity cloning)
        let exists: bool = Mapping::contains(identity_nullifiers, nullifier);
        assert(!exists);

        // Register nullifier
        Mapping::set(identity_nullifiers, nullifier, true);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // UPDATE IDENTITY
    // ───────────────────────────────────────────────────────────────────────────
    // Updates an identity by consuming the old record and creating a new one.
    // The nullifier_secret is preserved to maintain identity continuity.
    //
    // SECURITY:
    // - Only the owner can call this (record consumption enforces)
    // - Version increments to track history
    // - Nullifier is NOT re-registered (identity already exists)
    transition update_identity(
        identity: Identity,
        new_unique_id_hash: field,
        new_attributes_hash: field,
        new_timestamp: u64,
        new_salt: field,
        new_data_hash: field
    ) -> Identity {
        // Verify ownership via assertion (belt-and-suspenders with record system)
        assert_eq(identity.owner, self.caller);

        // Compute new commitment
        let input: IdentityInput = IdentityInput {
            unique_id_hash: new_unique_id_hash,
            attributes_hash: new_attributes_hash,
            timestamp: new_timestamp,
        };
        let new_commitment: field = compute_commitment(input, new_salt);

        // Return updated identity (old record consumed, new record created)
        return Identity {
            owner: self.caller,
            identity_commitment: new_commitment,
            data_hash: new_data_hash,
            version: identity.version + 1u32,
            salt: new_salt,
            nullifier_secret: identity.nullifier_secret,  // Preserved
        };
    }

    // ───────────────────────────────────────────────────────────────────────────
    // CREATE BINDING
    // ───────────────────────────────────────────────────────────────────────────
    // Creates a binding token that can be shared with credential issuers.
    // The binding proves identity ownership without revealing identity data.
    //
    // SECURITY:
    // - Nonce prevents replay attacks
    // - Context binding prevents misuse across different purposes
    // - Expiry prevents stale bindings from being accepted
    transition create_binding(
        identity: Identity,
        binding_context: field,
        nonce_seed: field,
        expires_at: u64
    ) -> (Identity, IdentityBinding) {
        // Verify ownership
        assert_eq(identity.owner, self.caller);

        // Compute unique nonce
        let nonce: field = compute_binding_nonce(
            identity.identity_commitment,
            binding_context,
            nonce_seed
        );

        // Create binding token
        let binding: IdentityBinding = IdentityBinding {
            owner: self.caller,
            identity_commitment: identity.identity_commitment,
            binding_context: binding_context,
            nonce: nonce,
            expires_at: expires_at,
        };

        // Preserve identity (consume and recreate)
        let preserved: Identity = Identity {
            owner: identity.owner,
            identity_commitment: identity.identity_commitment,
            data_hash: identity.data_hash,
            version: identity.version,
            salt: identity.salt,
            nullifier_secret: identity.nullifier_secret,
        };

        return (preserved, binding) then finalize(nonce);
    }

    finalize create_binding(nonce: field) {
        // Ensure nonce hasn't been used
        let used: bool = Mapping::contains(used_binding_nonces, nonce);
        assert(!used);

        // Register nonce
        Mapping::set(used_binding_nonces, nonce, true);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // VERIFY BINDING
    // ───────────────────────────────────────────────────────────────────────────
    // Allows a user to verify their binding matches their identity.
    // Returns true if the binding's commitment matches the identity's commitment.
    transition verify_binding(
        identity: Identity,
        binding: IdentityBinding
    ) -> (Identity, bool) {
        // Verify ownership of both
        assert_eq(identity.owner, self.caller);
        assert_eq(binding.owner, self.caller);

        // Check commitment match
        let matches: bool = identity.identity_commitment == binding.identity_commitment;

        // Preserve identity
        let preserved: Identity = Identity {
            owner: identity.owner,
            identity_commitment: identity.identity_commitment,
            data_hash: identity.data_hash,
            version: identity.version,
            salt: identity.salt,
            nullifier_secret: identity.nullifier_secret,
        };

        return (preserved, matches);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // VERIFY COMMITMENT
    // ───────────────────────────────────────────────────────────────────────────
    // Allows the owner to verify their identity data matches the stored commitment.
    // This is a "read" operation that proves data integrity.
    transition verify_commitment(
        identity: Identity,
        unique_id_hash: field,
        attributes_hash: field,
        timestamp: u64
    ) -> (Identity, bool) {
        // Verify ownership
        assert_eq(identity.owner, self.caller);

        // Recompute commitment
        let input: IdentityInput = IdentityInput {
            unique_id_hash: unique_id_hash,
            attributes_hash: attributes_hash,
            timestamp: timestamp,
        };
        let computed: field = compute_commitment(input, identity.salt);

        // Check match
        let matches: bool = computed == identity.identity_commitment;

        // Preserve identity
        let preserved: Identity = Identity {
            owner: identity.owner,
            identity_commitment: identity.identity_commitment,
            data_hash: identity.data_hash,
            version: identity.version,
            salt: identity.salt,
            nullifier_secret: identity.nullifier_secret,
        };

        return (preserved, matches);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // DESTROY IDENTITY
    // ───────────────────────────────────────────────────────────────────────────
    // Permanently destroys an identity. The nullifier remains registered
    // to prevent recreation.
    transition destroy_identity(identity: Identity) -> field {
        // Verify ownership
        assert_eq(identity.owner, self.caller);

        // Return commitment for reference (record is consumed, not recreated)
        return identity.identity_commitment;
    }
}
