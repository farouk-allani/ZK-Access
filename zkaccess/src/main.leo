// ZK-Access: Privacy-Preserving Credentials on Aleo
// One credential, unlimited proofs, complete privacy.

program zkaccess_v2.aleo {

    // Constructor — prevents upgrades after deployment.
    @noupgrade async constructor() {}

    // A private credential record — all fields encrypted, only the owner can read them.
    record Credential {
        owner: address,
        issuer: address,
        age: u8,
        country_code: u16,
        kyc_passed: bool,
        accredited_investor: bool,
    }

    // Proof result — confirms a specific claim was verified.
    record ProofResult {
        owner: address,
        claim_type: u8,  // 1=age, 2=kyc, 3=country, 4=accredited
        passed: bool,
    }

    // Issue a credential to a user.
    // The caller is the issuer, the recipient owns the credential.
    transition issue_credential(
        recipient: address,
        age: u8,
        country_code: u16,
        kyc_passed: bool,
        accredited_investor: bool,
    ) -> Credential {
        return Credential {
            owner: recipient,
            issuer: self.caller,
            age: age,
            country_code: country_code,
            kyc_passed: kyc_passed,
            accredited_investor: accredited_investor,
        };
    }

    // Prove age >= min_age.
    // Consumes the credential and returns it back along with a proof.
    transition prove_age(credential: Credential, min_age: u8) -> (Credential, ProofResult) {
        assert(credential.age >= min_age);

        return (
            Credential {
                owner: credential.owner,
                issuer: credential.issuer,
                age: credential.age,
                country_code: credential.country_code,
                kyc_passed: credential.kyc_passed,
                accredited_investor: credential.accredited_investor,
            },
            ProofResult {
                owner: credential.owner,
                claim_type: 1u8,
                passed: true,
            },
        );
    }

    // Prove KYC has been passed.
    transition prove_kyc(credential: Credential) -> (Credential, ProofResult) {
        assert(credential.kyc_passed);

        return (
            Credential {
                owner: credential.owner,
                issuer: credential.issuer,
                age: credential.age,
                country_code: credential.country_code,
                kyc_passed: credential.kyc_passed,
                accredited_investor: credential.accredited_investor,
            },
            ProofResult {
                owner: credential.owner,
                claim_type: 2u8,
                passed: true,
            },
        );
    }

    // Prove country is not in the restricted set (North Korea, Iran, Syria, Cuba).
    transition prove_country(credential: Credential) -> (Credential, ProofResult) {
        assert(credential.country_code != 408u16);
        assert(credential.country_code != 364u16);
        assert(credential.country_code != 760u16);
        assert(credential.country_code != 192u16);

        return (
            Credential {
                owner: credential.owner,
                issuer: credential.issuer,
                age: credential.age,
                country_code: credential.country_code,
                kyc_passed: credential.kyc_passed,
                accredited_investor: credential.accredited_investor,
            },
            ProofResult {
                owner: credential.owner,
                claim_type: 3u8,
                passed: true,
            },
        );
    }

    // Prove accredited investor status.
    transition prove_accredited(credential: Credential) -> (Credential, ProofResult) {
        assert(credential.accredited_investor);

        return (
            Credential {
                owner: credential.owner,
                issuer: credential.issuer,
                age: credential.age,
                country_code: credential.country_code,
                kyc_passed: credential.kyc_passed,
                accredited_investor: credential.accredited_investor,
            },
            ProofResult {
                owner: credential.owner,
                claim_type: 4u8,
                passed: true,
            },
        );
    }
}
