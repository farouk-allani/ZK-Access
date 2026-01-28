# ZK-Access Test Suite

This directory contains automated tests for the ZK-Access system.

## Prerequisites

1. **Leo CLI** (v2.0.0+): https://github.com/AleoHQ/leo
2. **snarkOS** (optional, for network tests): https://github.com/AleoHQ/snarkOS
3. **Bash** (Unix) or **Git Bash** (Windows)

## Quick Start

```bash
# Run all tests
./tests/run_all_tests.sh

# Run specific test suite
./tests/test_identity.sh
./tests/test_credential.sh
./tests/test_verifier.sh
./tests/test_integration.sh
```

## Test Structure

```
tests/
├── README.md                 # This file
├── run_all_tests.sh          # Master test runner
├── test_identity.sh          # Identity program tests
├── test_credential.sh        # Credential program tests
├── test_verifier.sh          # Verifier program tests
├── test_integration.sh       # End-to-end integration tests
├── test_negative.sh          # Negative/failure path tests
└── test_data/
    └── sample_inputs.json    # Sample test inputs
```

## Test Categories

### 1. Identity Tests (`test_identity.sh`)
- Create identity (should succeed)
- Update identity (should succeed, owner only)
- Create binding (should succeed)
- Verify commitment (should succeed)
- Destroy identity (should succeed)

### 2. Credential Tests (`test_credential.sh`)
- Initialize admin (should succeed once)
- Authorize issuer (should succeed, admin only)
- Issue credential (should succeed, authorized issuer)
- Revoke credential (should succeed)

### 3. Proof Tests (`test_credential.sh`)
- prove_age_minimum (age >= 18)
- prove_kyc_status (KYC passed)
- prove_country_not_restricted (not in OFAC list)
- prove_accredited_investor
- prove_composite (all three)

### 4. Verifier Tests (`test_verifier.sh`)
- verify_proof (general)
- verify_age_proof (type-specific)
- verify_kyc_proof (type-specific)
- consume_verification

### 5. Negative Tests (`test_negative.sh`)
- Wrong owner tries to prove (MUST FAIL)
- Revoked credential proof (MUST FAIL)
- Proof replay (MUST FAIL)
- Unauthorized issuer (MUST FAIL)

## Running Tests

### Using Leo CLI (Local)

```bash
# Build all programs first
cd identity && leo build && cd ..
cd credential && leo build && cd ..
cd verifier && leo build && cd ..

# Run tests
./tests/run_all_tests.sh
```

### Using snarkOS (Network)

```bash
# Start local devnet
snarkos start --dev 0

# Run network tests (in another terminal)
NETWORK=true ./tests/run_all_tests.sh
```

## Test Output

Successful tests show:
```
[PASS] test_create_identity
[PASS] test_issue_credential
[PASS] test_prove_age_minimum
...
Tests passed: 15/15
```

Failed tests show:
```
[FAIL] test_wrong_owner_proof
  Expected: Error
  Got: Success
```

## Sample Test Inputs

See `test_data/sample_inputs.json` for example values:

```json
{
  "identity": {
    "unique_id_hash": "1234field",
    "attributes_hash": "5678field",
    "salt": "9999field"
  },
  "credential": {
    "age": 25,
    "country_code": 840,
    "kyc_passed": true
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NETWORK` | false | Use snarkOS network instead of local |
| `VERBOSE` | false | Show detailed output |
| `PRIVATE_KEY` | (generated) | Test account private key |

## Troubleshooting

### "Leo not found"
Install Leo: `curl -sSf https://install.leo-lang.org | sh`

### "Program not built"
Run `leo build` in each program directory first.

### "Assertion failed"
Check the specific assertion in the error message and compare with expected values.

## Writing New Tests

1. Add test function to appropriate `.sh` file
2. Use `assert_success` for positive tests
3. Use `assert_failure` for negative tests
4. Add to `run_all_tests.sh` runner
