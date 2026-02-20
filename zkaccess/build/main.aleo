program zkaccess_v2.aleo;

record Credential:
    owner as address.private;
    issuer as address.private;
    age as u8.private;
    country_code as u16.private;
    kyc_passed as boolean.private;
    accredited_investor as boolean.private;

record ProofResult:
    owner as address.private;
    claim_type as u8.private;
    passed as boolean.private;

function issue_credential:
    input r0 as address.private;
    input r1 as u8.private;
    input r2 as u16.private;
    input r3 as boolean.private;
    input r4 as boolean.private;
    cast r0 self.caller r1 r2 r3 r4 into r5 as Credential.record;
    output r5 as Credential.record;

function prove_age:
    input r0 as Credential.record;
    input r1 as u8.private;
    gte r0.age r1 into r2;
    assert.eq r2 true;
    cast r0.owner r0.issuer r0.age r0.country_code r0.kyc_passed r0.accredited_investor into r3 as Credential.record;
    cast r0.owner 1u8 true into r4 as ProofResult.record;
    output r3 as Credential.record;
    output r4 as ProofResult.record;

function prove_kyc:
    input r0 as Credential.record;
    assert.eq r0.kyc_passed true;
    cast r0.owner r0.issuer r0.age r0.country_code r0.kyc_passed r0.accredited_investor into r1 as Credential.record;
    cast r0.owner 2u8 true into r2 as ProofResult.record;
    output r1 as Credential.record;
    output r2 as ProofResult.record;

function prove_country:
    input r0 as Credential.record;
    is.neq r0.country_code 408u16 into r1;
    assert.eq r1 true;
    is.neq r0.country_code 364u16 into r2;
    assert.eq r2 true;
    is.neq r0.country_code 760u16 into r3;
    assert.eq r3 true;
    is.neq r0.country_code 192u16 into r4;
    assert.eq r4 true;
    cast r0.owner r0.issuer r0.age r0.country_code r0.kyc_passed r0.accredited_investor into r5 as Credential.record;
    cast r0.owner 3u8 true into r6 as ProofResult.record;
    output r5 as Credential.record;
    output r6 as ProofResult.record;

function prove_accredited:
    input r0 as Credential.record;
    assert.eq r0.accredited_investor true;
    cast r0.owner r0.issuer r0.age r0.country_code r0.kyc_passed r0.accredited_investor into r1 as Credential.record;
    cast r0.owner 4u8 true into r2 as ProofResult.record;
    output r1 as Credential.record;
    output r2 as ProofResult.record;

constructor:
    assert.eq edition 0u16;
