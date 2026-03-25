program zkaccess_v3.aleo;

record Credential:
    owner as address.private;
    issuer as address.private;
    credential_id as field.private;
    age as u8.private;
    country_code as u16.private;
    kyc_passed as boolean.private;
    accredited_investor as boolean.private;
    issued_at as u32.private;
    expires_at as u32.private;

record AccessToken:
    owner as address.private;
    gate_id as field.private;
    claim_type as u8.private;
    passed as boolean.private;
    proof_height as u32.private;

struct GateConfig:
    min_age as u8;
    require_kyc as boolean;
    require_not_restricted as boolean;
    require_accredited as boolean;
    active as boolean;

mapping admin:
    key as u8.public;
    value as address.public;

mapping authorized_issuers:
    key as address.public;
    value as boolean.public;

mapping revoked_credentials:
    key as field.public;
    value as boolean.public;

mapping gates:
    key as field.public;
    value as GateConfig.public;

mapping gate_index:
    key as u64.public;
    value as field.public;

mapping gate_owners:
    key as field.public;
    value as address.public;

mapping gate_counter:
    key as u8.public;
    value as u64.public;

mapping proof_registry:
    key as field.public;
    value as u32.public;

function initialize_admin:
    async initialize_admin self.caller into r0;
    output r0 as zkaccess_v3.aleo/initialize_admin.future;

finalize initialize_admin:
    input r0 as address.public;
    contains admin[0u8] into r1;
    not r1 into r2;
    assert.eq r2 true;
    set r0 into admin[0u8];

function register_issuer:
    input r0 as address.private;
    async register_issuer self.caller r0 into r1;
    output r1 as zkaccess_v3.aleo/register_issuer.future;

finalize register_issuer:
    input r0 as address.public;
    input r1 as address.public;
    get admin[0u8] into r2;
    assert.eq r0 r2;
    set true into authorized_issuers[r1];

function revoke_issuer:
    input r0 as address.private;
    async revoke_issuer self.caller r0 into r1;
    output r1 as zkaccess_v3.aleo/revoke_issuer.future;

finalize revoke_issuer:
    input r0 as address.public;
    input r1 as address.public;
    get admin[0u8] into r2;
    assert.eq r0 r2;
    set false into authorized_issuers[r1];

function issue_credential:
    input r0 as address.private;
    input r1 as u8.private;
    input r2 as u16.private;
    input r3 as boolean.private;
    input r4 as boolean.private;
    input r5 as u32.private;
    input r6 as u32.private;
    hash.bhp256 r0 into r7 as field;
    add r6 r5 into r8;
    cast r0 self.caller r7 r1 r2 r3 r4 r6 r8 into r9 as Credential.record;
    async issue_credential self.caller into r10;
    output r9 as Credential.record;
    output r10 as zkaccess_v3.aleo/issue_credential.future;

finalize issue_credential:
    input r0 as address.public;
    get.or_use authorized_issuers[r0] false into r1;
    assert.eq r1 true;

function revoke_credential:
    input r0 as field.private;
    async revoke_credential self.caller r0 into r1;
    output r1 as zkaccess_v3.aleo/revoke_credential.future;

finalize revoke_credential:
    input r0 as address.public;
    input r1 as field.public;
    get admin[0u8] into r2;
    is.eq r0 r2 into r3;
    get.or_use authorized_issuers[r0] false into r4;
    or r3 r4 into r5;
    assert.eq r5 true;
    set true into revoked_credentials[r1];

function renew_credential:
    input r0 as Credential.record;
    input r1 as u32.private;
    input r2 as u32.private;
    add r2 r1 into r3;
    cast r0.owner r0.issuer r0.credential_id r0.age r0.country_code r0.kyc_passed r0.accredited_investor r2 r3 into r4 as Credential.record;
    async renew_credential self.caller into r5;
    output r4 as Credential.record;
    output r5 as zkaccess_v3.aleo/renew_credential.future;

finalize renew_credential:
    input r0 as address.public;
    get.or_use authorized_issuers[r0] false into r1;
    assert.eq r1 true;

function create_gate:
    input r0 as u8.private;
    input r1 as boolean.private;
    input r2 as boolean.private;
    input r3 as boolean.private;
    async create_gate self.caller r0 r1 r2 r3 into r4;
    output r4 as zkaccess_v3.aleo/create_gate.future;

finalize create_gate:
    input r0 as address.public;
    input r1 as u8.public;
    input r2 as boolean.public;
    input r3 as boolean.public;
    input r4 as boolean.public;
    get.or_use gate_counter[0u8] 0u64 into r5;
    hash.bhp256 r5 into r6 as field;
    cast r1 r2 r3 r4 true into r7 as GateConfig;
    set r7 into gates[r6];
    set r6 into gate_index[r5];
    set r0 into gate_owners[r6];
    add r5 1u64 into r8;
    set r8 into gate_counter[0u8];

function deactivate_gate:
    input r0 as field.private;
    async deactivate_gate self.caller r0 into r1;
    output r1 as zkaccess_v3.aleo/deactivate_gate.future;

finalize deactivate_gate:
    input r0 as address.public;
    input r1 as field.public;
    get gate_owners[r1] into r2;
    assert.eq r0 r2;
    get gates[r1] into r3;
    cast r3.min_age r3.require_kyc r3.require_not_restricted r3.require_accredited false into r4 as GateConfig;
    set r4 into gates[r1];

function pass_gate:
    input r0 as Credential.record;
    input r1 as field.private;
    input r2 as u8.private;
    input r3 as boolean.private;
    input r4 as boolean.private;
    input r5 as boolean.private;
    is.eq r2 0u8 into r6;
    gte r0.age r2 into r7;
    or r6 r7 into r8;
    assert.eq r8 true;
    not r3 into r9;
    or r9 r0.kyc_passed into r10;
    assert.eq r10 true;
    not r4 into r11;
    is.neq r0.country_code 408u16 into r12;
    or r11 r12 into r13;
    assert.eq r13 true;
    is.neq r0.country_code 364u16 into r14;
    or r11 r14 into r15;
    assert.eq r15 true;
    is.neq r0.country_code 760u16 into r16;
    or r11 r16 into r17;
    assert.eq r17 true;
    is.neq r0.country_code 192u16 into r18;
    or r11 r18 into r19;
    assert.eq r19 true;
    not r5 into r20;
    or r20 r0.accredited_investor into r21;
    assert.eq r21 true;
    cast r0.owner r1 0u8 true 0u32 into r22 as AccessToken.record;
    cast r0.owner r0.issuer r0.credential_id r0.age r0.country_code r0.kyc_passed r0.accredited_investor r0.issued_at r0.expires_at into r23 as Credential.record;
    hash.bhp256 r0.owner into r24 as field;
    async pass_gate r0.credential_id r0.expires_at r24 r1 r2 r3 r4 r5 into r25;
    output r23 as Credential.record;
    output r22 as AccessToken.record;
    output r25 as zkaccess_v3.aleo/pass_gate.future;

finalize pass_gate:
    input r0 as field.public;
    input r1 as u32.public;
    input r2 as field.public;
    input r3 as field.public;
    input r4 as u8.public;
    input r5 as boolean.public;
    input r6 as boolean.public;
    input r7 as boolean.public;
    get.or_use revoked_credentials[r0] false into r8;
    not r8 into r9;
    assert.eq r9 true;
    lte block.height r1 into r10;
    assert.eq r10 true;
    get gates[r3] into r11;
    assert.eq r11.active true;
    assert.eq r11.min_age r4;
    assert.eq r11.require_kyc r5;
    assert.eq r11.require_not_restricted r6;
    assert.eq r11.require_accredited r7;
    set block.height into proof_registry[r2];

function prove_single:
    input r0 as Credential.record;
    input r1 as u8.private;
    input r2 as u8.private;
    is.neq r1 1u8 into r3;
    gte r0.age r2 into r4;
    or r3 r4 into r5;
    assert.eq r5 true;
    is.neq r1 2u8 into r6;
    or r6 r0.kyc_passed into r7;
    assert.eq r7 true;
    is.neq r1 3u8 into r8;
    is.neq r0.country_code 408u16 into r9;
    or r8 r9 into r10;
    assert.eq r10 true;
    is.neq r0.country_code 364u16 into r11;
    or r8 r11 into r12;
    assert.eq r12 true;
    is.neq r0.country_code 760u16 into r13;
    or r8 r13 into r14;
    assert.eq r14 true;
    is.neq r0.country_code 192u16 into r15;
    or r8 r15 into r16;
    assert.eq r16 true;
    is.neq r1 4u8 into r17;
    or r17 r0.accredited_investor into r18;
    assert.eq r18 true;
    cast r0.owner 0field r1 true 0u32 into r19 as AccessToken.record;
    cast r0.owner r0.issuer r0.credential_id r0.age r0.country_code r0.kyc_passed r0.accredited_investor r0.issued_at r0.expires_at into r20 as Credential.record;
    hash.bhp256 r0.owner into r21 as field;
    async prove_single r0.credential_id r0.expires_at r21 into r22;
    output r20 as Credential.record;
    output r19 as AccessToken.record;
    output r22 as zkaccess_v3.aleo/prove_single.future;

finalize prove_single:
    input r0 as field.public;
    input r1 as u32.public;
    input r2 as field.public;
    get.or_use revoked_credentials[r0] false into r3;
    not r3 into r4;
    assert.eq r4 true;
    lte block.height r1 into r5;
    assert.eq r5 true;
    set block.height into proof_registry[r2];

function verify_proof:
    input r0 as address.private;
    hash.bhp256 r0 into r1 as field;
    async verify_proof r1 into r2;
    output r2 as zkaccess_v3.aleo/verify_proof.future;

finalize verify_proof:
    input r0 as field.public;
    get proof_registry[r0] into r1;

constructor:
    assert.eq edition 0u16;
