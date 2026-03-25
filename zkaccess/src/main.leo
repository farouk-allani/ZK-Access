// ZK-Access v3: Privacy-Preserving ZK-Gated Access Control Protocol on Aleo
// Issue credentials, create access gates, prove eligibility — reveal nothing.

program zkaccess_v3.aleo {

    // ─── Constructor (required for deployment on current consensus) ────

    @noupgrade
    async constructor() {}

    // ─── Records (Private State) ───────────────────────────────────────

    // Private credential — all fields encrypted, only the owner can decrypt.
    record Credential {
        owner: address,
        issuer: address,
        credential_id: field,
        age: u8,
        country_code: u16,
        kyc_passed: bool,
        accredited_investor: bool,
        issued_at: u32,
        expires_at: u32,
    }

    // Access token — proof that a user passed a gate or single claim check.
    record AccessToken {
        owner: address,
        gate_id: field,
        claim_type: u8,   // 0=gate, 1=age, 2=kyc, 3=country, 4=accredited
        passed: bool,
        proof_height: u32,
    }

    // ─── Struct ────────────────────────────────────────────────────────

    // Gate configuration — defines access requirements.
    struct GateConfig {
        min_age: u8,
        require_kyc: bool,
        require_not_restricted: bool,
        require_accredited: bool,
        active: bool,
    }

    // ─── Mappings (Public On-Chain State) ──────────────────────────────

    // Admin address (key 0u8 => admin address).
    mapping admin: u8 => address;

    // Authorized credential issuers.
    mapping authorized_issuers: address => bool;

    // Revoked credential IDs.
    mapping revoked_credentials: field => bool;

    // Gate definitions by gate_id.
    mapping gates: field => GateConfig;

    // Gate index for deterministic discovery (index => gate_id).
    mapping gate_index: u64 => field;

    // Gate owners by gate_id.
    mapping gate_owners: field => address;

    // Auto-incrementing gate counter (key 0u8 => count).
    mapping gate_counter: u8 => u64;

    // Proof registry: proof_key => block height when proof was recorded.
    mapping proof_registry: field => u32;

    // ─── Admin Transitions ─────────────────────────────────────────────

    // Initialize the admin. Can only be called once (first caller becomes admin).
    async transition initialize_admin() -> Future {
        return finalize_initialize_admin(self.caller);
    }
    async function finalize_initialize_admin(caller: address) {
        let exists: bool = admin.contains(0u8);
        assert(!exists);
        admin.set(0u8, caller);
    }

    // Register an authorized issuer (admin only).
    async transition register_issuer(issuer: address) -> Future {
        return finalize_register_issuer(self.caller, issuer);
    }
    async function finalize_register_issuer(caller: address, issuer: address) {
        let current_admin: address = admin.get(0u8);
        assert_eq(caller, current_admin);
        authorized_issuers.set(issuer, true);
    }

    // Revoke an issuer's authorization (admin only).
    async transition revoke_issuer(issuer: address) -> Future {
        return finalize_revoke_issuer(self.caller, issuer);
    }
    async function finalize_revoke_issuer(caller: address, issuer: address) {
        let current_admin: address = admin.get(0u8);
        assert_eq(caller, current_admin);
        authorized_issuers.set(issuer, false);
    }

    // ─── Credential Transitions ────────────────────────────────────────

    // Issue a credential to a recipient. Caller must be an authorized issuer.
    async transition issue_credential(
        recipient: address,
        age: u8,
        country_code: u16,
        kyc_passed: bool,
        accredited_investor: bool,
        validity_blocks: u32,
        current_height: u32,
    ) -> (Credential, Future) {
        let cred_id: field = BHP256::hash_to_field(recipient);
        let issued: u32 = current_height;
        let expires: u32 = issued + validity_blocks;

        let cred: Credential = Credential {
            owner: recipient,
            issuer: self.caller,
            credential_id: cred_id,
            age: age,
            country_code: country_code,
            kyc_passed: kyc_passed,
            accredited_investor: accredited_investor,
            issued_at: issued,
            expires_at: expires,
        };

        return (cred, finalize_issue_credential(self.caller));
    }
    async function finalize_issue_credential(issuer: address) {
        let is_authorized: bool = authorized_issuers.get_or_use(issuer, false);
        assert(is_authorized);
    }

    // Revoke a credential by its ID. Caller must be admin or authorized issuer.
    async transition revoke_credential(credential_id: field) -> Future {
        return finalize_revoke_credential(self.caller, credential_id);
    }
    async function finalize_revoke_credential(caller: address, credential_id: field) {
        let current_admin: address = admin.get(0u8);
        let is_admin: bool = caller == current_admin;
        let is_issuer: bool = authorized_issuers.get_or_use(caller, false);
        assert(is_admin || is_issuer);
        revoked_credentials.set(credential_id, true);
    }

    // Renew a credential with new expiration. Caller must be an authorized issuer.
    async transition renew_credential(
        credential: Credential,
        new_validity: u32,
        current_height: u32,
    ) -> (Credential, Future) {
        let new_expires: u32 = current_height + new_validity;

        let renewed: Credential = Credential {
            owner: credential.owner,
            issuer: credential.issuer,
            credential_id: credential.credential_id,
            age: credential.age,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            issued_at: current_height,
            expires_at: new_expires,
        };

        return (renewed, finalize_renew_credential(self.caller));
    }
    async function finalize_renew_credential(issuer: address) {
        let is_authorized: bool = authorized_issuers.get_or_use(issuer, false);
        assert(is_authorized);
    }

    // ─── Gate Transitions ──────────────────────────────────────────────

    // Create an access gate with custom requirements. Anyone can create gates.
    async transition create_gate(
        min_age: u8,
        require_kyc: bool,
        require_not_restricted: bool,
        require_accredited: bool,
    ) -> Future {
        return finalize_create_gate(
            self.caller,
            min_age,
            require_kyc,
            require_not_restricted,
            require_accredited,
        );
    }
    async function finalize_create_gate(
        creator: address,
        min_age: u8,
        require_kyc: bool,
        require_not_restricted: bool,
        require_accredited: bool,
    ) {
        let count: u64 = gate_counter.get_or_use(0u8, 0u64);
        let gate_id: field = BHP256::hash_to_field(count);

        let config: GateConfig = GateConfig {
            min_age: min_age,
            require_kyc: require_kyc,
            require_not_restricted: require_not_restricted,
            require_accredited: require_accredited,
            active: true,
        };

        gates.set(gate_id, config);
        gate_index.set(count, gate_id);
        gate_owners.set(gate_id, creator);
        gate_counter.set(0u8, count + 1u64);
    }

    // Deactivate a gate (gate owner only).
    async transition deactivate_gate(gate_id: field) -> Future {
        return finalize_deactivate_gate(self.caller, gate_id);
    }
    async function finalize_deactivate_gate(caller: address, gate_id: field) {
        let owner: address = gate_owners.get(gate_id);
        assert_eq(caller, owner);

        let config: GateConfig = gates.get(gate_id);
        let updated: GateConfig = GateConfig {
            min_age: config.min_age,
            require_kyc: config.require_kyc,
            require_not_restricted: config.require_not_restricted,
            require_accredited: config.require_accredited,
            active: false,
        };
        gates.set(gate_id, updated);
    }

    // ─── Proof / Access Transitions ────────────────────────────────────

    // Pass a gate: privately prove credential meets all gate requirements.
    // The gate requirements are passed as public inputs and validated against
    // the on-chain gate config in the async function — preventing forgery.
    // The credential data NEVER leaves the private transition.
    async transition pass_gate(
        credential: Credential,
        gate_id: field,
        min_age: u8,
        require_kyc: bool,
        require_not_restricted: bool,
        require_accredited: bool,
    ) -> (Credential, AccessToken, Future) {
        // Private assertions — credential data checked in ZK, never revealed.
        assert(min_age == 0u8 || credential.age >= min_age);
        assert(!require_kyc || credential.kyc_passed);
        assert(!require_not_restricted || credential.country_code != 408u16);
        assert(!require_not_restricted || credential.country_code != 364u16);
        assert(!require_not_restricted || credential.country_code != 760u16);
        assert(!require_not_restricted || credential.country_code != 192u16);
        assert(!require_accredited || credential.accredited_investor);

        let token: AccessToken = AccessToken {
            owner: credential.owner,
            gate_id: gate_id,
            claim_type: 0u8,
            passed: true,
            proof_height: 0u32,
        };

        let returned_cred: Credential = Credential {
            owner: credential.owner,
            issuer: credential.issuer,
            credential_id: credential.credential_id,
            age: credential.age,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
        };

        let proof_key: field = BHP256::hash_to_field(credential.owner);

        return (returned_cred, token, finalize_pass_gate(
            credential.credential_id,
            credential.expires_at,
            proof_key,
            gate_id,
            min_age,
            require_kyc,
            require_not_restricted,
            require_accredited,
        ));
    }
    async function finalize_pass_gate(
        credential_id: field,
        expires_at: u32,
        proof_key: field,
        gate_id: field,
        min_age: u8,
        require_kyc: bool,
        require_not_restricted: bool,
        require_accredited: bool,
    ) {
        // Validate credential is not revoked.
        let is_revoked: bool = revoked_credentials.get_or_use(credential_id, false);
        assert(!is_revoked);

        // Validate credential is not expired.
        assert(block.height <= expires_at);

        // Validate the public inputs match the actual gate config (prevents forgery).
        let config: GateConfig = gates.get(gate_id);
        assert(config.active);
        assert_eq(config.min_age, min_age);
        assert_eq(config.require_kyc, require_kyc);
        assert_eq(config.require_not_restricted, require_not_restricted);
        assert_eq(config.require_accredited, require_accredited);

        // Record proof on-chain for third-party verification.
        proof_registry.set(proof_key, block.height);
    }

    // Prove a single claim with revocation and expiration checks.
    // claim_type: 1=age, 2=kyc, 3=country, 4=accredited
    async transition prove_single(
        credential: Credential,
        claim_type: u8,
        min_age: u8,
    ) -> (Credential, AccessToken, Future) {
        // Private assertions based on claim type.
        assert(claim_type != 1u8 || credential.age >= min_age);
        assert(claim_type != 2u8 || credential.kyc_passed);
        assert(claim_type != 3u8 || credential.country_code != 408u16);
        assert(claim_type != 3u8 || credential.country_code != 364u16);
        assert(claim_type != 3u8 || credential.country_code != 760u16);
        assert(claim_type != 3u8 || credential.country_code != 192u16);
        assert(claim_type != 4u8 || credential.accredited_investor);

        let token: AccessToken = AccessToken {
            owner: credential.owner,
            gate_id: 0field,
            claim_type: claim_type,
            passed: true,
            proof_height: 0u32,
        };

        let returned_cred: Credential = Credential {
            owner: credential.owner,
            issuer: credential.issuer,
            credential_id: credential.credential_id,
            age: credential.age,
            country_code: credential.country_code,
            kyc_passed: credential.kyc_passed,
            accredited_investor: credential.accredited_investor,
            issued_at: credential.issued_at,
            expires_at: credential.expires_at,
        };

        let proof_key: field = BHP256::hash_to_field(credential.owner);

        return (returned_cred, token, finalize_prove_single(
            credential.credential_id,
            credential.expires_at,
            proof_key,
        ));
    }
    async function finalize_prove_single(
        credential_id: field,
        expires_at: u32,
        proof_key: field,
    ) {
        let is_revoked: bool = revoked_credentials.get_or_use(credential_id, false);
        assert(!is_revoked);
        assert(block.height <= expires_at);
        proof_registry.set(proof_key, block.height);
    }

    // Verify a proof exists on-chain. Anyone can call this.
    // Transaction succeeds if proof exists, fails if not.
    async transition verify_proof(subject: address) -> Future {
        let proof_key: field = BHP256::hash_to_field(subject);
        return finalize_verify_proof(proof_key);
    }
    async function finalize_verify_proof(proof_key: field) {
        let proof_height: u32 = proof_registry.get(proof_key);
    }
}
