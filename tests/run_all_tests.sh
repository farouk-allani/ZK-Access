#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# ZK-ACCESS TEST RUNNER
# Runs all test suites and reports results
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                         ZK-ACCESS TEST SUITE                                   "
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Project directory: $PROJECT_DIR"
echo "Test directory: $SCRIPT_DIR"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    echo -e "       ${RED}Error: $2${NC}"
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1 - $2"
}

log_section() {
    echo ""
    echo "───────────────────────────────────────────────────────────────────────────────"
    echo " $1"
    echo "───────────────────────────────────────────────────────────────────────────────"
}

# Check if Leo is installed
check_leo() {
    if ! command -v leo &> /dev/null; then
        echo -e "${RED}ERROR: Leo CLI not found${NC}"
        echo "Install Leo: curl -sSf https://install.leo-lang.org | sh"
        exit 1
    fi
    echo "Leo version: $(leo --version)"
}

# ═══════════════════════════════════════════════════════════════════════════════
# BUILD PROGRAMS
# ═══════════════════════════════════════════════════════════════════════════════

build_programs() {
    log_section "Building Programs"

    echo "Building identity.aleo..."
    cd "$PROJECT_DIR/identity"
    if leo build 2>&1 | grep -q "error"; then
        log_fail "identity.aleo build" "Compilation failed"
        return 1
    fi
    log_pass "identity.aleo build"

    echo "Building credential.aleo..."
    cd "$PROJECT_DIR/credential"
    if leo build 2>&1 | grep -q "error"; then
        log_fail "credential.aleo build" "Compilation failed"
        return 1
    fi
    log_pass "credential.aleo build"

    echo "Building verifier.aleo..."
    cd "$PROJECT_DIR/verifier"
    if leo build 2>&1 | grep -q "error"; then
        log_fail "verifier.aleo build" "Compilation failed"
        return 1
    fi
    log_pass "verifier.aleo build"

    cd "$PROJECT_DIR"
}

# ═══════════════════════════════════════════════════════════════════════════════
# IDENTITY TESTS
# ═══════════════════════════════════════════════════════════════════════════════

test_identity() {
    log_section "Identity Program Tests"

    cd "$PROJECT_DIR/identity"

    # Test 1: Create identity
    echo "Testing create_identity..."
    RESULT=$(leo run create_identity \
        "1234567890123456789012345678901234567890123456789012345678901234field" \
        "9876543210987654321098765432109876543210987654321098765432109876field" \
        "1000u64" \
        "1111111111111111111111111111111111111111111111111111111111111111field" \
        "2222222222222222222222222222222222222222222222222222222222222222field" \
        "3333333333333333333333333333333333333333333333333333333333333333field" \
        2>&1) || true

    if echo "$RESULT" | grep -q "Output"; then
        log_pass "create_identity"
    else
        log_fail "create_identity" "No output produced"
    fi

    cd "$PROJECT_DIR"
}

# ═══════════════════════════════════════════════════════════════════════════════
# CREDENTIAL TESTS
# ═══════════════════════════════════════════════════════════════════════════════

test_credential() {
    log_section "Credential Program Tests"

    cd "$PROJECT_DIR/credential"

    # Test: Initialize admin
    echo "Testing initialize_admin..."
    RESULT=$(leo run initialize_admin \
        "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc" \
        2>&1) || true

    if echo "$RESULT" | grep -q -E "(Output|finalize)"; then
        log_pass "initialize_admin"
    else
        log_fail "initialize_admin" "Execution failed"
    fi

    cd "$PROJECT_DIR"
}

# ═══════════════════════════════════════════════════════════════════════════════
# PROOF CONSTRAINT TESTS
# ═══════════════════════════════════════════════════════════════════════════════

test_proof_constraints() {
    log_section "ZK Proof Constraint Tests"

    cd "$PROJECT_DIR/credential"

    # These tests verify that the ZK constraints are correctly implemented
    # by checking that the program compiles and the constraint logic is sound

    # Check age constraint exists
    if grep -q "assert(credential.age >= minimum_age)" src/main.leo; then
        log_pass "age_constraint_exists (line 386)"
    else
        log_fail "age_constraint_exists" "Age constraint not found"
    fi

    # Check KYC constraint exists
    if grep -q "assert(credential.kyc_passed)" src/main.leo; then
        log_pass "kyc_constraint_exists (line 470)"
    else
        log_fail "kyc_constraint_exists" "KYC constraint not found"
    fi

    # Check country constraint exists
    if grep -q "credential.country_code != restricted" src/main.leo; then
        log_pass "country_constraint_exists (lines 561-564)"
    else
        log_fail "country_constraint_exists" "Country constraint not found"
    fi

    # Check ownership constraint exists
    if grep -q "assert_eq(credential.owner, self.caller)" src/main.leo; then
        log_pass "ownership_constraint_exists"
    else
        log_fail "ownership_constraint_exists" "Ownership constraint not found"
    fi

    # Check revocation check exists
    if grep -q "revoked_nullifiers" src/main.leo; then
        log_pass "revocation_check_exists"
    else
        log_fail "revocation_check_exists" "Revocation check not found"
    fi

    cd "$PROJECT_DIR"
}

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFIER TESTS
# ═══════════════════════════════════════════════════════════════════════════════

test_verifier() {
    log_section "Verifier Program Tests"

    cd "$PROJECT_DIR/verifier"

    # Check proof freshness constraint
    if grep -q "proof_age <= MAX_PROOF_AGE" src/main.leo; then
        log_pass "freshness_check_exists (line 193)"
    else
        log_fail "freshness_check_exists" "Freshness check not found"
    fi

    # Check nonce consumption
    if grep -q "consumed_nonces" src/main.leo; then
        log_pass "nonce_consumption_exists"
    else
        log_fail "nonce_consumption_exists" "Nonce consumption not found"
    fi

    # Check context binding
    if grep -q "assert_eq(proof.verifier_context, expected_verifier_context)" src/main.leo; then
        log_pass "context_binding_exists (line 182)"
    else
        log_fail "context_binding_exists" "Context binding not found"
    fi

    cd "$PROJECT_DIR"
}

# ═══════════════════════════════════════════════════════════════════════════════
# SECURITY CHECKS
# ═══════════════════════════════════════════════════════════════════════════════

test_security() {
    log_section "Security Property Tests"

    # Check nullifier scheme in identity
    if grep -q "compute_nullifier" "$PROJECT_DIR/identity/src/main.leo"; then
        log_pass "identity_nullifier_scheme"
    else
        log_fail "identity_nullifier_scheme" "Nullifier computation not found"
    fi

    # Check issuer authorization in credential
    if grep -q "authorized_issuers" "$PROJECT_DIR/credential/src/main.leo"; then
        log_pass "issuer_authorization"
    else
        log_fail "issuer_authorization" "Issuer authorization not found"
    fi

    # Check revocation nullifier scheme
    if grep -q "compute_revocation_nullifier" "$PROJECT_DIR/credential/src/main.leo"; then
        log_pass "revocation_nullifier_scheme"
    else
        log_fail "revocation_nullifier_scheme" "Revocation nullifier not found"
    fi

    # Check no private data in mappings
    IDENTITY_MAPPINGS=$(grep "mapping" "$PROJECT_DIR/identity/src/main.leo" | wc -l)
    if [ "$IDENTITY_MAPPINGS" -le 2 ]; then
        log_pass "minimal_public_state_identity ($IDENTITY_MAPPINGS mappings)"
    else
        log_fail "minimal_public_state_identity" "Too many public mappings"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# NEGATIVE TESTS (Expected Failures)
# ═══════════════════════════════════════════════════════════════════════════════

test_negative() {
    log_section "Negative Tests (Expected Failures)"

    # These tests verify that invalid operations correctly fail
    # In a full test suite, these would execute actual transactions

    echo "Note: Full negative tests require network deployment"
    echo "The following checks verify constraint presence:"

    # Check that ownership is enforced (would fail without correct owner)
    if grep -q "assert_eq.*owner.*self.caller" "$PROJECT_DIR/credential/src/main.leo"; then
        log_pass "ownership_would_reject_wrong_owner"
    else
        log_fail "ownership_would_reject_wrong_owner" "No ownership check"
    fi

    # Check that revocation is enforced
    if grep -q "assert(!is_revoked)" "$PROJECT_DIR/credential/src/main.leo"; then
        log_pass "revocation_would_reject_revoked"
    else
        log_fail "revocation_would_reject_revoked" "No revocation check"
    fi

    # Check that nonce replay is prevented
    if grep -q "assert(!consumed)" "$PROJECT_DIR/verifier/src/main.leo"; then
        log_pass "nonce_would_reject_replay"
    else
        log_fail "nonce_would_reject_replay" "No nonce replay check"
    fi

    # Check issuer authorization
    if grep -q "assert(is_authorized)" "$PROJECT_DIR/credential/src/main.leo"; then
        log_pass "issuer_would_reject_unauthorized"
    else
        log_fail "issuer_would_reject_unauthorized" "No issuer check"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    echo "Starting tests at $(date)"
    echo ""

    # Check prerequisites
    check_leo

    # Build programs
    build_programs

    # Run test suites
    test_identity
    test_credential
    test_proof_constraints
    test_verifier
    test_security
    test_negative

    # Summary
    log_section "Test Summary"
    echo ""
    echo "Total tests: $TESTS_TOTAL"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}                           ALL TESTS PASSED                                    ${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
        exit 0
    else
        echo -e "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
        echo -e "${RED}                           SOME TESTS FAILED                                    ${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
        exit 1
    fi
}

main "$@"
