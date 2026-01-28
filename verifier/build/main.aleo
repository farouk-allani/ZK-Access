program zkaccess_verif_v1.aleo;

record CredentialProof:
    owner as address.private;
    claim_hash as field.private;
    claim_type as u8.private;
    claim_result as field.private;
    verifier_context as field.private;
    proven_at as u64.private;
    proof_nonce as field.private;
    expires_at as u64.private;

record VerificationResult:
    owner as address.private;
    verified_claim_type as u8.private;
    result as u8.private;
    verifier_context as field.private;
    verified_at as u64.private;
    verification_id as field.private;
    credential_expires_at as u64.private;

mapping consumed_nonces:
    key as field.public;
    value as boolean.public;

mapping consumed_verifications:
    key as field.public;
    value as boolean.public;

mapping registered_verifiers:
    key as address.public;
    value as boolean.public;

mapping verifier_stats:
    key as address.public;
    value as u64.public;

mapping admin:
    key as u8.public;
    value as address.public;

function initialize_admin:
    input r0 as address.private;
    async initialize_admin r0 into r1;
    output r1 as zkaccess_verif_v1.aleo/initialize_admin.future;

finalize initialize_admin:
    input r0 as address.public;
    contains admin[0u8] into r1;
    not r1 into r2;
    assert.eq r2 true;
    set r0 into admin[0u8];

function register_verifier:
    input r0 as address.private;
    async register_verifier self.caller r0 into r1;
    output r1 as zkaccess_verif_v1.aleo/register_verifier.future;

finalize register_verifier:
    input r0 as address.public;
    input r1 as address.public;
    get admin[0u8] into r2;
    assert.eq r0 r2;
    set true into registered_verifiers[r1];
    set 0u64 into verifier_stats[r1];

function verify_proof:
    input r0 as CredentialProof.record;
    input r1 as field.private;
    input r2 as u64.private;
    assert.eq r0.owner self.caller;
    assert.eq r0.verifier_context r1;
    is.eq r0.expires_at 0u64 into r3;
    lt r2 r0.expires_at into r4;
    or r3 r4 into r5;
    assert.eq r5 true;
    sub r2 r0.proven_at into r6;
    lte r6 3600u64 into r7;
    assert.eq r7 true;
    assert.eq r0.claim_result 1field;
    hash.bhp256 self.caller into r8 as field;
    add r0.proof_nonce r8 into r9;
    cast r2 into r10 as field;
    add r9 r10 into r11;
    hash.bhp256 r11 into r12 as field;
    cast self.caller r0.claim_type 1u8 r1 r2 r12 r0.expires_at into r13 as VerificationResult.record;
    async verify_proof r0.proof_nonce self.caller into r14;
    output r13 as VerificationResult.record;
    output r14 as zkaccess_verif_v1.aleo/verify_proof.future;

finalize verify_proof:
    input r0 as field.public;
    input r1 as address.public;
    get.or_use consumed_nonces[r0] false into r2;
    not r2 into r3;
    assert.eq r3 true;
    set true into consumed_nonces[r0];
    get.or_use registered_verifiers[r1] false into r4;
    branch.eq r4 false to end_then_0_0;
    get.or_use verifier_stats[r1] 0u64 into r5;
    add r5 1u64 into r6;
    set r6 into verifier_stats[r1];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;

function verify_age_proof:
    input r0 as CredentialProof.record;
    input r1 as field.private;
    input r2 as u64.private;
    assert.eq r0.owner self.caller;
    assert.eq r0.claim_type 2u8;
    assert.eq r0.verifier_context r1;
    is.eq r0.expires_at 0u64 into r3;
    lt r2 r0.expires_at into r4;
    or r3 r4 into r5;
    assert.eq r5 true;
    sub r2 r0.proven_at into r6;
    lte r6 3600u64 into r7;
    assert.eq r7 true;
    assert.eq r0.claim_result 1field;
    hash.bhp256 self.caller into r8 as field;
    add r0.proof_nonce r8 into r9;
    cast r2 into r10 as field;
    add r9 r10 into r11;
    hash.bhp256 r11 into r12 as field;
    cast self.caller 2u8 1u8 r1 r2 r12 r0.expires_at into r13 as VerificationResult.record;
    async verify_age_proof r0.proof_nonce self.caller into r14;
    output r13 as VerificationResult.record;
    output r14 as zkaccess_verif_v1.aleo/verify_age_proof.future;

finalize verify_age_proof:
    input r0 as field.public;
    input r1 as address.public;
    get.or_use consumed_nonces[r0] false into r2;
    not r2 into r3;
    assert.eq r3 true;
    set true into consumed_nonces[r0];
    get.or_use registered_verifiers[r1] false into r4;
    branch.eq r4 false to end_then_0_2;
    get.or_use verifier_stats[r1] 0u64 into r5;
    add r5 1u64 into r6;
    set r6 into verifier_stats[r1];
    branch.eq true true to end_otherwise_0_3;
    position end_then_0_2;
    position end_otherwise_0_3;

function verify_kyc_proof:
    input r0 as CredentialProof.record;
    input r1 as field.private;
    input r2 as u64.private;
    assert.eq r0.owner self.caller;
    assert.eq r0.claim_type 1u8;
    assert.eq r0.verifier_context r1;
    is.eq r0.expires_at 0u64 into r3;
    lt r2 r0.expires_at into r4;
    or r3 r4 into r5;
    assert.eq r5 true;
    sub r2 r0.proven_at into r6;
    lte r6 3600u64 into r7;
    assert.eq r7 true;
    assert.eq r0.claim_result 1field;
    hash.bhp256 self.caller into r8 as field;
    add r0.proof_nonce r8 into r9;
    cast r2 into r10 as field;
    add r9 r10 into r11;
    hash.bhp256 r11 into r12 as field;
    cast self.caller 1u8 1u8 r1 r2 r12 r0.expires_at into r13 as VerificationResult.record;
    async verify_kyc_proof r0.proof_nonce self.caller into r14;
    output r13 as VerificationResult.record;
    output r14 as zkaccess_verif_v1.aleo/verify_kyc_proof.future;

finalize verify_kyc_proof:
    input r0 as field.public;
    input r1 as address.public;
    get.or_use consumed_nonces[r0] false into r2;
    not r2 into r3;
    assert.eq r3 true;
    set true into consumed_nonces[r0];
    get.or_use registered_verifiers[r1] false into r4;
    branch.eq r4 false to end_then_0_4;
    get.or_use verifier_stats[r1] 0u64 into r5;
    add r5 1u64 into r6;
    set r6 into verifier_stats[r1];
    branch.eq true true to end_otherwise_0_5;
    position end_then_0_4;
    position end_otherwise_0_5;

function verify_composite_proof:
    input r0 as CredentialProof.record;
    input r1 as field.private;
    input r2 as u64.private;
    assert.eq r0.owner self.caller;
    assert.eq r0.claim_type 255u8;
    assert.eq r0.verifier_context r1;
    is.eq r0.expires_at 0u64 into r3;
    lt r2 r0.expires_at into r4;
    or r3 r4 into r5;
    assert.eq r5 true;
    sub r2 r0.proven_at into r6;
    lte r6 3600u64 into r7;
    assert.eq r7 true;
    assert.eq r0.claim_result 1field;
    hash.bhp256 self.caller into r8 as field;
    add r0.proof_nonce r8 into r9;
    cast r2 into r10 as field;
    add r9 r10 into r11;
    hash.bhp256 r11 into r12 as field;
    cast self.caller 255u8 1u8 r1 r2 r12 r0.expires_at into r13 as VerificationResult.record;
    async verify_composite_proof r0.proof_nonce self.caller into r14;
    output r13 as VerificationResult.record;
    output r14 as zkaccess_verif_v1.aleo/verify_composite_proof.future;

finalize verify_composite_proof:
    input r0 as field.public;
    input r1 as address.public;
    get.or_use consumed_nonces[r0] false into r2;
    not r2 into r3;
    assert.eq r3 true;
    set true into consumed_nonces[r0];
    get.or_use registered_verifiers[r1] false into r4;
    branch.eq r4 false to end_then_0_6;
    get.or_use verifier_stats[r1] 0u64 into r5;
    add r5 1u64 into r6;
    set r6 into verifier_stats[r1];
    branch.eq true true to end_otherwise_0_7;
    position end_then_0_6;
    position end_otherwise_0_7;

function consume_verification:
    input r0 as VerificationResult.record;
    input r1 as u8.private;
    input r2 as field.private;
    input r3 as u64.private;
    assert.eq r0.owner self.caller;
    assert.eq r0.verified_claim_type r1;
    assert.eq r0.verifier_context r2;
    assert.eq r0.result 1u8;
    is.eq r0.credential_expires_at 0u64 into r4;
    lt r3 r0.credential_expires_at into r5;
    or r4 r5 into r6;
    assert.eq r6 true;
    async consume_verification r0.verification_id into r7;
    output true as boolean.private;
    output r7 as zkaccess_verif_v1.aleo/consume_verification.future;

finalize consume_verification:
    input r0 as field.public;
    get.or_use consumed_verifications[r0] false into r1;
    not r1 into r2;
    assert.eq r2 true;
    set true into consumed_verifications[r0];

function check_verification:
    input r0 as VerificationResult.record;
    input r1 as u8.private;
    input r2 as u64.private;
    assert.eq r0.owner self.caller;
    is.eq r0.verified_claim_type r1 into r3;
    is.eq r0.result 1u8 into r4;
    is.eq r0.credential_expires_at 0u64 into r5;
    lt r2 r0.credential_expires_at into r6;
    or r5 r6 into r7;
    and r3 r4 into r8;
    and r8 r7 into r9;
    cast r0.owner r0.verified_claim_type r0.result r0.verifier_context r0.verified_at r0.verification_id r0.credential_expires_at into r10 as VerificationResult.record;
    output r10 as VerificationResult.record;
    output r9 as boolean.private;

constructor:
    assert.eq edition 0u16;
