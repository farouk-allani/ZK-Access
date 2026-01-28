program zkaccess_id_v1.aleo;

record Identity:
    owner as address.private;
    identity_commitment as field.private;
    data_hash as field.private;
    version as u32.private;
    salt as field.private;
    nullifier_secret as field.private;

record IdBinding:
    owner as address.private;
    identity_commitment as field.private;
    binding_context as field.private;
    nonce as field.private;
    expires_at as u64.private;

struct IdentityInput:
    unique_id_hash as field;
    attributes_hash as field;
    timestamp as u64;

mapping identity_nullifiers:
    key as field.public;
    value as boolean.public;

mapping used_binding_nonces:
    key as field.public;
    value as boolean.public;

function create_identity:
    input r0 as field.private;
    input r1 as field.private;
    input r2 as u64.private;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as field.private;
    cast r0 r1 r2 into r6 as IdentityInput;
    hash.bhp256 r6 into r7 as field;
    add r7 r3 into r8;
    hash.bhp256 r8 into r9 as field;
    add r9 r4 into r10;
    hash.bhp256 r10 into r11 as field;
    cast self.caller r9 r5 1u32 r3 r4 into r12 as Identity.record;
    async create_identity r11 into r13;
    output r12 as Identity.record;
    output r13 as zkaccess_id_v1.aleo/create_identity.future;

finalize create_identity:
    input r0 as field.public;
    contains identity_nullifiers[r0] into r1;
    not r1 into r2;
    assert.eq r2 true;
    set true into identity_nullifiers[r0];

function update_identity:
    input r0 as Identity.record;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as u64.private;
    input r4 as field.private;
    input r5 as field.private;
    assert.eq r0.owner self.caller;
    cast r1 r2 r3 into r6 as IdentityInput;
    hash.bhp256 r6 into r7 as field;
    add r7 r4 into r8;
    hash.bhp256 r8 into r9 as field;
    add r0.version 1u32 into r10;
    cast self.caller r9 r5 r10 r4 r0.nullifier_secret into r11 as Identity.record;
    output r11 as Identity.record;

function create_binding:
    input r0 as Identity.record;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as u64.private;
    assert.eq r0.owner self.caller;
    add r0.identity_commitment r1 into r4;
    add r4 r2 into r5;
    hash.bhp256 r5 into r6 as field;
    cast self.caller r0.identity_commitment r1 r6 r3 into r7 as IdBinding.record;
    cast r0.owner r0.identity_commitment r0.data_hash r0.version r0.salt r0.nullifier_secret into r8 as Identity.record;
    async create_binding r6 into r9;
    output r8 as Identity.record;
    output r7 as IdBinding.record;
    output r9 as zkaccess_id_v1.aleo/create_binding.future;

finalize create_binding:
    input r0 as field.public;
    contains used_binding_nonces[r0] into r1;
    not r1 into r2;
    assert.eq r2 true;
    set true into used_binding_nonces[r0];

function verify_binding:
    input r0 as Identity.record;
    input r1 as IdBinding.record;
    assert.eq r0.owner self.caller;
    assert.eq r1.owner self.caller;
    is.eq r0.identity_commitment r1.identity_commitment into r2;
    cast r0.owner r0.identity_commitment r0.data_hash r0.version r0.salt r0.nullifier_secret into r3 as Identity.record;
    output r3 as Identity.record;
    output r2 as boolean.private;

function verify_commitment:
    input r0 as Identity.record;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as u64.private;
    assert.eq r0.owner self.caller;
    cast r1 r2 r3 into r4 as IdentityInput;
    hash.bhp256 r4 into r5 as field;
    add r5 r0.salt into r6;
    hash.bhp256 r6 into r7 as field;
    is.eq r7 r0.identity_commitment into r8;
    cast r0.owner r0.identity_commitment r0.data_hash r0.version r0.salt r0.nullifier_secret into r9 as Identity.record;
    output r9 as Identity.record;
    output r8 as boolean.private;

function destroy_identity:
    input r0 as Identity.record;
    assert.eq r0.owner self.caller;
    output r0.identity_commitment as field.private;

constructor:
    assert.eq edition 0u16;
