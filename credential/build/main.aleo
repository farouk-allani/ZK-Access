program zkaccess_cred_v1.aleo;

record Credential:
    owner as address.private;
    issuer as address.private;
    subject_commitment as field.private;
    credential_type as u8.private;
    age as u8.private;
    country_code as u16.private;
    kyc_passed as boolean.private;
    accredited_investor as boolean.private;
    risk_score as u8.private;
    issued_at as u64.private;
    expires_at as u64.private;
    credential_id as field.private;
    revocation_nullifier as field.private;
    proof_salt as field.private;

record CredProof:
    owner as address.private;
    claim_hash as field.private;
    claim_type as u8.private;
    claim_result as field.private;
    verifier_context as field.private;
    proven_at as u64.private;
    proof_nonce as field.private;
    expires_at as u64.private;

struct ClaimData:
    age as u8;
    country_code as u16;
    kyc_passed as boolean;
    accredited_investor as boolean;
    risk_score as u8;

mapping admin:
    key as u8.public;
    value as address.public;

mapping authorized_issuers:
    key as address.public;
    value as boolean.public;

mapping revoked_nullifiers:
    key as field.public;
    value as boolean.public;

mapping issuer_nonces:
    key as field.public;
    value as boolean.public;

function initialize_admin:
    input r0 as address.private;
    async initialize_admin r0 into r1;
    output r1 as zkaccess_cred_v1.aleo/initialize_admin.future;

finalize initialize_admin:
    input r0 as address.public;
    contains admin[0u8] into r1;
    not r1 into r2;
    assert.eq r2 true;
    set r0 into admin[0u8];

function authorize_issuer:
    input r0 as address.private;
    async authorize_issuer self.caller r0 into r1;
    output r1 as zkaccess_cred_v1.aleo/authorize_issuer.future;

finalize authorize_issuer:
    input r0 as address.public;
    input r1 as address.public;
    get admin[0u8] into r2;
    assert.eq r0 r2;
    set true into authorized_issuers[r1];

function deauthorize_issuer:
    input r0 as address.private;
    async deauthorize_issuer self.caller r0 into r1;
    output r1 as zkaccess_cred_v1.aleo/deauthorize_issuer.future;

finalize deauthorize_issuer:
    input r0 as address.public;
    input r1 as address.public;
    get admin[0u8] into r2;
    assert.eq r0 r2;
    set false into authorized_issuers[r1];

function issue_credential:
    input r0 as address.private;
    input r1 as field.private;
    input r2 as u8.private;
    input r3 as u8.private;
    input r4 as u16.private;
    input r5 as boolean.private;
    input r6 as boolean.private;
    input r7 as u8.private;
    input r8 as u64.private;
    input r9 as u64.private;
    input r10 as field.private;
    input r11 as field.private;
    input r12 as field.private;
    cast r3 r4 r5 r6 r7 into r13 as ClaimData;
    hash.bhp256 r13 into r14 as field;
    hash.bhp256 self.caller into r15 as field;
    hash.bhp256 r0 into r16 as field;
    add r15 r16 into r17;
    add r17 r1 into r18;
    add r18 r14 into r19;
    cast r8 into r20 as field;
    add r19 r20 into r21;
    add r21 r10 into r22;
    hash.bhp256 r22 into r23 as field;
    add r23 r11 into r24;
    hash.bhp256 r24 into r25 as field;
    hash.bhp256 r24 into r26 as field;
    cast r0 self.caller r1 r2 r3 r4 r5 r6 r7 r8 r9 r23 r25 r12 into r27 as Credential.record;
    async issue_credential self.caller r26 into r28;
    output r27 as Credential.record;
    output r28 as zkaccess_cred_v1.aleo/issue_credential.future;

finalize issue_credential:
    input r0 as address.public;
    input r1 as field.public;
    get.or_use authorized_issuers[r0] false into r2;
    assert.eq r2 true;
    get.or_use issuer_nonces[r1] false into r3;
    not r3 into r4;
    assert.eq r4 true;
    set true into issuer_nonces[r1];

function revoke_credential:
    input r0 as field.private;
    input r1 as field.private;
    add r0 r1 into r2;
    hash.bhp256 r2 into r3 as field;
    async revoke_credential self.caller r3 into r4;
    output r4 as zkaccess_cred_v1.aleo/revoke_credential.future;

finalize revoke_credential:
    input r0 as address.public;
    input r1 as field.public;
    get.or_use authorized_issuers[r0] false into r2;
    assert.eq r2 true;
    get.or_use revoked_nullifiers[r1] false into r3;
    not r3 into r4;
    assert.eq r4 true;
    set true into revoked_nullifiers[r1];

function prove_age_minimum:
    input r0 as Credential.record;
    input r1 as u8.private;
    input r2 as u64.private;
    input r3 as field.private;
    input r4 as field.private;
    assert.eq r0.owner self.caller;
    gte r0.age r1 into r5;
    assert.eq r5 true;
    is.eq r0.expires_at 0u64 into r6;
    lt r2 r0.expires_at into r7;
    or r6 r7 into r8;
    assert.eq r8 true;
    add r0.credential_id r3 into r9;
    cast r2 into r10 as field;
    add r9 r10 into r11;
    add r11 r4 into r12;
    hash.bhp256 r12 into r13 as field;
    cast 2u8 into r14 as field;
    add r0.credential_id r14 into r15;
    add r15 1field into r16;
    add r16 r13 into r17;
    hash.bhp256 r17 into r18 as field;
    cast self.caller r18 2u8 1field r3 r2 r13 r0.expires_at into r19 as CredProof.record;
    cast r0.owner r0.issuer r0.subject_commitment r0.credential_type r0.age r0.country_code r0.kyc_passed r0.accredited_investor r0.risk_score r0.issued_at r0.expires_at r0.credential_id r0.revocation_nullifier r0.proof_salt into r20 as Credential.record;
    async prove_age_minimum r0.revocation_nullifier into r21;
    output r20 as Credential.record;
    output r19 as CredProof.record;
    output r21 as zkaccess_cred_v1.aleo/prove_age_minimum.future;

finalize prove_age_minimum:
    input r0 as field.public;
    get.or_use revoked_nullifiers[r0] false into r1;
    not r1 into r2;
    assert.eq r2 true;

function prove_kyc_status:
    input r0 as Credential.record;
    input r1 as u64.private;
    input r2 as field.private;
    input r3 as field.private;
    assert.eq r0.owner self.caller;
    assert.eq r0.kyc_passed true;
    is.eq r0.expires_at 0u64 into r4;
    lt r1 r0.expires_at into r5;
    or r4 r5 into r6;
    assert.eq r6 true;
    add r0.credential_id r2 into r7;
    cast r1 into r8 as field;
    add r7 r8 into r9;
    add r9 r3 into r10;
    hash.bhp256 r10 into r11 as field;
    cast 1u8 into r12 as field;
    add r0.credential_id r12 into r13;
    add r13 1field into r14;
    add r14 r11 into r15;
    hash.bhp256 r15 into r16 as field;
    cast self.caller r16 1u8 1field r2 r1 r11 r0.expires_at into r17 as CredProof.record;
    cast r0.owner r0.issuer r0.subject_commitment r0.credential_type r0.age r0.country_code r0.kyc_passed r0.accredited_investor r0.risk_score r0.issued_at r0.expires_at r0.credential_id r0.revocation_nullifier r0.proof_salt into r18 as Credential.record;
    async prove_kyc_status r0.revocation_nullifier into r19;
    output r18 as Credential.record;
    output r17 as CredProof.record;
    output r19 as zkaccess_cred_v1.aleo/prove_kyc_status.future;

finalize prove_kyc_status:
    input r0 as field.public;
    get.or_use revoked_nullifiers[r0] false into r1;
    not r1 into r2;
    assert.eq r2 true;

function prove_country_not_restricted:
    input r0 as Credential.record;
    input r1 as u16.private;
    input r2 as u16.private;
    input r3 as u16.private;
    input r4 as u16.private;
    input r5 as u64.private;
    input r6 as field.private;
    input r7 as field.private;
    assert.eq r0.owner self.caller;
    is.neq r0.country_code r1 into r8;
    is.neq r0.country_code r2 into r9;
    is.neq r0.country_code r3 into r10;
    is.neq r0.country_code r4 into r11;
    assert.eq r8 true;
    assert.eq r9 true;
    assert.eq r10 true;
    assert.eq r11 true;
    is.eq r0.expires_at 0u64 into r12;
    lt r5 r0.expires_at into r13;
    or r12 r13 into r14;
    assert.eq r14 true;
    add r0.credential_id r6 into r15;
    cast r5 into r16 as field;
    add r15 r16 into r17;
    add r17 r7 into r18;
    hash.bhp256 r18 into r19 as field;
    cast r1 into r20 as field;
    cast r2 into r21 as field;
    add r20 r21 into r22;
    cast r3 into r23 as field;
    add r22 r23 into r24;
    cast r4 into r25 as field;
    add r24 r25 into r26;
    hash.bhp256 r26 into r27 as field;
    add r0.credential_id 4field into r28;
    add r28 1field into r29;
    add r29 r19 into r30;
    add r30 r27 into r31;
    hash.bhp256 r31 into r32 as field;
    cast self.caller r32 4u8 1field r6 r5 r19 r0.expires_at into r33 as CredProof.record;
    cast r0.owner r0.issuer r0.subject_commitment r0.credential_type r0.age r0.country_code r0.kyc_passed r0.accredited_investor r0.risk_score r0.issued_at r0.expires_at r0.credential_id r0.revocation_nullifier r0.proof_salt into r34 as Credential.record;
    async prove_country_not_restricted r0.revocation_nullifier into r35;
    output r34 as Credential.record;
    output r33 as CredProof.record;
    output r35 as zkaccess_cred_v1.aleo/prove_country_not_restricted.future;

finalize prove_country_not_restricted:
    input r0 as field.public;
    get.or_use revoked_nullifiers[r0] false into r1;
    not r1 into r2;
    assert.eq r2 true;

function prove_accredited_investor:
    input r0 as Credential.record;
    input r1 as u64.private;
    input r2 as field.private;
    input r3 as field.private;
    assert.eq r0.owner self.caller;
    assert.eq r0.accredited_investor true;
    is.eq r0.expires_at 0u64 into r4;
    lt r1 r0.expires_at into r5;
    or r4 r5 into r6;
    assert.eq r6 true;
    add r0.credential_id r2 into r7;
    cast r1 into r8 as field;
    add r7 r8 into r9;
    add r9 r3 into r10;
    hash.bhp256 r10 into r11 as field;
    cast 3u8 into r12 as field;
    add r0.credential_id r12 into r13;
    add r13 1field into r14;
    add r14 r11 into r15;
    hash.bhp256 r15 into r16 as field;
    cast self.caller r16 3u8 1field r2 r1 r11 r0.expires_at into r17 as CredProof.record;
    cast r0.owner r0.issuer r0.subject_commitment r0.credential_type r0.age r0.country_code r0.kyc_passed r0.accredited_investor r0.risk_score r0.issued_at r0.expires_at r0.credential_id r0.revocation_nullifier r0.proof_salt into r18 as Credential.record;
    async prove_accredited_investor r0.revocation_nullifier into r19;
    output r18 as Credential.record;
    output r17 as CredProof.record;
    output r19 as zkaccess_cred_v1.aleo/prove_accredited_investor.future;

finalize prove_accredited_investor:
    input r0 as field.public;
    get.or_use revoked_nullifiers[r0] false into r1;
    not r1 into r2;
    assert.eq r2 true;

function prove_composite:
    input r0 as Credential.record;
    input r1 as u8.private;
    input r2 as u16.private;
    input r3 as u16.private;
    input r4 as u16.private;
    input r5 as u16.private;
    input r6 as u64.private;
    input r7 as field.private;
    input r8 as field.private;
    assert.eq r0.owner self.caller;
    gte r0.age r1 into r9;
    assert.eq r9 true;
    assert.eq r0.kyc_passed true;
    is.neq r0.country_code r2 into r10;
    assert.eq r10 true;
    is.neq r0.country_code r3 into r11;
    assert.eq r11 true;
    is.neq r0.country_code r4 into r12;
    assert.eq r12 true;
    is.neq r0.country_code r5 into r13;
    assert.eq r13 true;
    is.eq r0.expires_at 0u64 into r14;
    lt r6 r0.expires_at into r15;
    or r14 r15 into r16;
    assert.eq r16 true;
    add r0.credential_id r7 into r17;
    cast r6 into r18 as field;
    add r17 r18 into r19;
    add r19 r8 into r20;
    hash.bhp256 r20 into r21 as field;
    cast r1 into r22 as field;
    cast r2 into r23 as field;
    add r22 r23 into r24;
    cast r3 into r25 as field;
    add r24 r25 into r26;
    cast r4 into r27 as field;
    add r26 r27 into r28;
    cast r5 into r29 as field;
    add r28 r29 into r30;
    hash.bhp256 r30 into r31 as field;
    add r0.credential_id 255field into r32;
    add r32 1field into r33;
    add r33 r21 into r34;
    add r34 r31 into r35;
    hash.bhp256 r35 into r36 as field;
    cast self.caller r36 255u8 1field r7 r6 r21 r0.expires_at into r37 as CredProof.record;
    cast r0.owner r0.issuer r0.subject_commitment r0.credential_type r0.age r0.country_code r0.kyc_passed r0.accredited_investor r0.risk_score r0.issued_at r0.expires_at r0.credential_id r0.revocation_nullifier r0.proof_salt into r38 as Credential.record;
    async prove_composite r0.revocation_nullifier into r39;
    output r38 as Credential.record;
    output r37 as CredProof.record;
    output r39 as zkaccess_cred_v1.aleo/prove_composite.future;

finalize prove_composite:
    input r0 as field.public;
    get.or_use revoked_nullifiers[r0] false into r1;
    not r1 into r2;
    assert.eq r2 true;

function check_revocation:
    input r0 as Credential.record;
    assert.eq r0.owner self.caller;
    cast r0.owner r0.issuer r0.subject_commitment r0.credential_type r0.age r0.country_code r0.kyc_passed r0.accredited_investor r0.risk_score r0.issued_at r0.expires_at r0.credential_id r0.revocation_nullifier r0.proof_salt into r1 as Credential.record;
    async check_revocation r0.revocation_nullifier into r2;
    output r1 as Credential.record;
    output true as boolean.private;
    output r2 as zkaccess_cred_v1.aleo/check_revocation.future;

finalize check_revocation:
    input r0 as field.public;
    get.or_use revoked_nullifiers[r0] false into r1;
    not r1 into r2;
    assert.eq r2 true;

function destroy_credential:
    input r0 as Credential.record;
    assert.eq r0.owner self.caller;
    output r0.credential_id as field.private;

constructor:
    assert.eq edition 0u16;
