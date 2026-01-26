// ZK-Access: Identity Core Program
// Program: identity.aleo
// Version: 1.0.0
//
// This program implements a privacy-preserving identity vault on Aleo.
// All identity data is stored in encrypted records that only the owner can access.
// No personal information is ever visible on-chain.

program identity.aleo {

    // ═══════════════════════════════════════════════════════════════════════════
    // RECORD DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Primary identity record - encrypted by Aleo's record encryption
    // This record represents a user's identity vault
    record Identity {
        // The address that owns this identity - only this address can spend/update
        owner: address,

        // Cryptographic commitment to identity data: H(identity_data || salt)
        // The preimage is NEVER stored on-chain
        identity_commitment: field,

        // Hash of optional encrypted off-chain data reference (IPFS CID, Arweave TX, etc.)
        // Allows linking to extended identity data without on-chain storage
        data_hash: field,

        // Monotonically increasing version number for tracking updates
        version: u32,

        // Random salt used in commitment - ensures uniqueness and prevents grinding
        salt: field,
    }

    // Identity binding token - used to prove identity ownership to other programs
    // This is a lightweight record for cross-program composition
    record IdentityBinding {
        owner: address,
        // The commitment that uniquely identifies this identity
        identity_commitment: field,
        // Binding context - what this binding is for (hashed purpose string)
        binding_context: field,
        // One-time use nonce to prevent replay
        nonce: field,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCT DEFINITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Identity data structure for computing commitments
    // This is used off-chain; the struct itself is never stored
    struct IdentityData {
        // Unique identifier hash (e.g., hash of SSN, passport number, etc.)
        unique_id_hash: field,
        // Additional identity attributes hash
        attributes_hash: field,
        // Timestamp of identity creation (block height or unix timestamp)
        created_at: u64,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INLINE HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // Compute identity commitment from identity data and salt
    // Uses Pedersen hash for hiding commitment: H(data || salt)
    inline compute_commitment(
        unique_id_hash: field,
        attributes_hash: field,
        created_at: u64,
        salt: field
    ) -> field {
        // Combine all identity data into a single field for hashing
        let data_combined: field = BHP256::hash_to_field(
            IdentityData {
                unique_id_hash: unique_id_hash,
                attributes_hash: attributes_hash,
                created_at: created_at,
            }
        );

        // Create hiding commitment by hashing data with salt
        return BHP256::hash_to_field(data_combined + salt);
    }

    // Compute a deterministic but unpredictable nonce
    inline compute_nonce(
        owner: address,
        commitment: field,
        context: field
    ) -> field {
        return BHP256::hash_to_field(
            BHP256::hash_to_field(owner) + commitment + context
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TRANSITIONS (STATE-CHANGING FUNCTIONS)
    // ═══════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE IDENTITY
    // ─────────────────────────────────────────────────────────────────────────
    // Creates a new identity vault for the caller.
    //
    // Parameters:
    //   - unique_id_hash: Hash of user's unique identifier (computed off-chain)
    //   - attributes_hash: Hash of additional identity attributes
    //   - created_at: Timestamp/block height of creation
    //   - salt: Random field element for commitment hiding
    //   - data_hash: Hash of optional off-chain data reference
    //
    // Returns:
    //   - Identity record owned by caller
    //
    // Privacy: All inputs are private. Only the encrypted record is visible on-chain.
    transition create_identity(
        unique_id_hash: field,
        attributes_hash: field,
        created_at: u64,
        salt: field,
        data_hash: field
    ) -> Identity {
        // Compute the identity commitment
        let identity_commitment: field = compute_commitment(
            unique_id_hash,
            attributes_hash,
            created_at,
            salt
        );

        // Create and return the identity record
        // The record is automatically encrypted with the owner's viewing key
        return Identity {
            owner: self.caller,
            identity_commitment: identity_commitment,
            data_hash: data_hash,
            version: 1u32,
            salt: salt,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE IDENTITY
    // ─────────────────────────────────────────────────────────────────────────
    // Updates an existing identity with new data.
    // The old record is consumed and a new record is created.
    //
    // Parameters:
    //   - identity: The existing identity record to update (proves ownership)
    //   - new_unique_id_hash: New unique identifier hash
    //   - new_attributes_hash: New attributes hash
    //   - new_created_at: Original creation timestamp (preserved)
    //   - new_salt: New random salt for the updated commitment
    //   - new_data_hash: New off-chain data reference hash
    //
    // Returns:
    //   - New Identity record with incremented version
    //
    // Security: Only the owner can call this (record consumption enforces ownership)
    transition update_identity(
        identity: Identity,
        new_unique_id_hash: field,
        new_attributes_hash: field,
        new_created_at: u64,
        new_salt: field,
        new_data_hash: field
    ) -> Identity {
        // Compute new commitment with updated data
        let new_commitment: field = compute_commitment(
            new_unique_id_hash,
            new_attributes_hash,
            new_created_at,
            new_salt
        );

        // Return new identity record with incremented version
        // Old record is implicitly consumed (spent)
        return Identity {
            owner: self.caller,
            identity_commitment: new_commitment,
            data_hash: new_data_hash,
            version: identity.version + 1u32,
            salt: new_salt,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE DATA HASH ONLY
    // ─────────────────────────────────────────────────────────────────────────
    // Updates only the off-chain data reference without changing the identity commitment.
    // Useful for updating extended attributes while preserving identity binding.
    //
    // Parameters:
    //   - identity: Existing identity record
    //   - new_data_hash: New off-chain data reference hash
    //
    // Returns:
    //   - Updated Identity record (commitment unchanged)
    transition update_data_hash(
        identity: Identity,
        new_data_hash: field
    ) -> Identity {
        return Identity {
            owner: self.caller,
            identity_commitment: identity.identity_commitment,
            data_hash: new_data_hash,
            version: identity.version + 1u32,
            salt: identity.salt,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE IDENTITY BINDING
    // ─────────────────────────────────────────────────────────────────────────
    // Creates a binding token that can be used to prove identity ownership
    // to other programs (e.g., credential.aleo).
    //
    // Parameters:
    //   - identity: The identity record to create binding from
    //   - binding_context: Hash of the binding purpose (e.g., "credential_issuance")
    //   - nonce_seed: Seed for generating the one-time nonce
    //
    // Returns:
    //   - Original identity (preserved)
    //   - IdentityBinding token for cross-program use
    //
    // Note: The identity is returned unchanged (re-created with same values)
    transition create_binding(
        identity: Identity,
        binding_context: field,
        nonce_seed: field
    ) -> (Identity, IdentityBinding) {
        // Compute a unique nonce for this binding
        let binding_nonce: field = compute_nonce(
            self.caller,
            identity.identity_commitment,
            binding_context + nonce_seed
        );

        // Preserve the original identity (consume and re-create)
        let preserved_identity: Identity = Identity {
            owner: self.caller,
            identity_commitment: identity.identity_commitment,
            data_hash: identity.data_hash,
            version: identity.version,
            salt: identity.salt,
        };

        // Create the binding token
        let binding: IdentityBinding = IdentityBinding {
            owner: self.caller,
            identity_commitment: identity.identity_commitment,
            binding_context: binding_context,
            nonce: binding_nonce,
        };

        return (preserved_identity, binding);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VERIFY COMMITMENT (VIEW FUNCTION)
    // ─────────────────────────────────────────────────────────────────────────
    // Allows the owner to verify their identity commitment matches expected data.
    // This is a "read" operation that doesn't change state.
    //
    // Parameters:
    //   - identity: The identity record to verify
    //   - unique_id_hash: Expected unique ID hash
    //   - attributes_hash: Expected attributes hash
    //   - created_at: Expected creation timestamp
    //
    // Returns:
    //   - Original identity (preserved)
    //   - Boolean indicating if commitment matches
    transition verify_commitment(
        identity: Identity,
        unique_id_hash: field,
        attributes_hash: field,
        created_at: u64
    ) -> (Identity, bool) {
        // Recompute commitment with provided data and stored salt
        let expected_commitment: field = compute_commitment(
            unique_id_hash,
            attributes_hash,
            created_at,
            identity.salt
        );

        // Check if it matches the stored commitment
        let is_valid: bool = expected_commitment == identity.identity_commitment;

        // Preserve identity
        let preserved_identity: Identity = Identity {
            owner: self.caller,
            identity_commitment: identity.identity_commitment,
            data_hash: identity.data_hash,
            version: identity.version,
            salt: identity.salt,
        };

        return (preserved_identity, is_valid);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TRANSFER IDENTITY
    // ─────────────────────────────────────────────────────────────────────────
    // Transfers identity ownership to a new address.
    // Use with extreme caution - this is a one-way operation.
    //
    // Parameters:
    //   - identity: The identity to transfer
    //   - new_owner: Address of the new owner
    //
    // Returns:
    //   - Identity record owned by new_owner
    //
    // Security: Only current owner can transfer (record consumption)
    transition transfer_identity(
        identity: Identity,
        new_owner: address
    ) -> Identity {
        // Create new identity with same data but different owner
        return Identity {
            owner: new_owner,
            identity_commitment: identity.identity_commitment,
            data_hash: identity.data_hash,
            version: identity.version + 1u32,
            salt: identity.salt,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DESTROY IDENTITY
    // ─────────────────────────────────────────────────────────────────────────
    // Permanently destroys an identity by consuming the record without creating a new one.
    // This is irreversible - the identity commitment will no longer be usable.
    //
    // Parameters:
    //   - identity: The identity to destroy
    //
    // Returns:
    //   - The commitment that was destroyed (for reference/logging)
    transition destroy_identity(
        identity: Identity
    ) -> field {
        // Record is consumed but no new identity is created
        // Return the commitment for reference
        return identity.identity_commitment;
    }
}
