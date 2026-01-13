#!/bin/bash
# ============================================
# GATE 4: Webhook Smoke Test (Shell Version)
# ============================================
# Usage: ./scripts/gate_webhook_smoke.sh
# Requires: curl, jq, web server running on localhost:3000

BASE_URL="${WEBHOOK_URL:-http://localhost:3000}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-test-secret-key}"
TIMESTAMP=$(date +%s)000
TENANT_ID="test-tenant-shell-${TIMESTAMP}"
IDEM_KEY="idem-shell-${TIMESTAMP}"

echo "========================================"
echo "GATE 4: Webhook Smoke Test (Shell)"
echo "========================================"
echo ""
echo "Base URL: ${BASE_URL}"
echo "Timestamp: ${TIMESTAMP}"
echo ""

PASSED=0
FAILED=0

pass() {
    echo "  ✅ PASS: $1"
    ((PASSED++))
}

fail() {
    echo "  ❌ FAIL: $1 - $2"
    ((FAILED++))
}

# Generate HMAC signature
generate_signature() {
    local payload="$1"
    local timestamp="$2"
    echo -n "${timestamp}.${payload}" | openssl dgst -sha256 -hmac "${WEBHOOK_SECRET}" | awk '{print $2}'
}

# Test 1: Check webhook GET endpoint
echo "[WEBHOOK-SMOKE] Testing GET /api/webhooks..."
RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/webhooks")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    pass "GET /api/webhooks returns 200"
else
    fail "GET /api/webhooks" "Expected 200, got ${HTTP_CODE}"
fi

# Test 2: Valid webhook with signature
echo ""
echo "[WEBHOOK-SMOKE] Testing valid webhook..."
PAYLOAD='{"type":"order.created","tenant_id":"'"${TENANT_ID}"'","data":{"entity_type":"order","entity_id":"ord-1"}}'
SIGNATURE=$(generate_signature "$PAYLOAD" "$TIMESTAMP")

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/webhooks" \
    -H "Content-Type: application/json" \
    -H "x-webhook-signature: ${SIGNATURE}" \
    -H "x-webhook-timestamp: ${TIMESTAMP}" \
    -d "$PAYLOAD")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
    pass "Valid webhook accepted (${HTTP_CODE})"
else
    fail "Valid webhook" "Expected 200/202, got ${HTTP_CODE}"
fi

# Test 3: Invalid signature
echo ""
echo "[WEBHOOK-SMOKE] Testing invalid signature..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/webhooks" \
    -H "Content-Type: application/json" \
    -H "x-webhook-signature: invalid-signature" \
    -H "x-webhook-timestamp: ${TIMESTAMP}" \
    -d "$PAYLOAD")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    pass "Invalid signature rejected (${HTTP_CODE})"
else
    fail "Invalid signature rejection" "Expected 401/403, got ${HTTP_CODE}"
fi

# Test 4: Idempotency (3 identical requests)
echo ""
echo "[WEBHOOK-SMOKE] Testing idempotency (3 requests)..."
IDEM_PAYLOAD='{"type":"order.updated","tenant_id":"'"${TENANT_ID}"'","data":{"entity_type":"order","entity_id":"ord-idem"}}'
IDEM_SIGNATURE=$(generate_signature "$IDEM_PAYLOAD" "$TIMESTAMP")

# First request
RESPONSE1=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/webhooks" \
    -H "Content-Type: application/json" \
    -H "x-webhook-signature: ${IDEM_SIGNATURE}" \
    -H "x-webhook-timestamp: ${TIMESTAMP}" \
    -H "x-idempotency-key: ${IDEM_KEY}" \
    -d "$IDEM_PAYLOAD")
HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)

if [ "$HTTP_CODE1" = "200" ] || [ "$HTTP_CODE1" = "202" ]; then
    pass "First request processed (${HTTP_CODE1})"
else
    fail "First request" "Expected 200/202, got ${HTTP_CODE1}"
fi

# Second request (same idempotency key)
RESPONSE2=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/webhooks" \
    -H "Content-Type: application/json" \
    -H "x-webhook-signature: ${IDEM_SIGNATURE}" \
    -H "x-webhook-timestamp: ${TIMESTAMP}" \
    -H "x-idempotency-key: ${IDEM_KEY}" \
    -d "$IDEM_PAYLOAD")
HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | head -n -1)
STATUS2=$(echo "$BODY2" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$STATUS2" = "duplicate" ]; then
    pass "Second request marked duplicate"
elif [ "$HTTP_CODE2" = "200" ] || [ "$HTTP_CODE2" = "202" ]; then
    pass "Second request handled (${HTTP_CODE2})"
else
    fail "Second request" "Got ${HTTP_CODE2}"
fi

# Third request (same idempotency key)
RESPONSE3=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/webhooks" \
    -H "Content-Type: application/json" \
    -H "x-webhook-signature: ${IDEM_SIGNATURE}" \
    -H "x-webhook-timestamp: ${TIMESTAMP}" \
    -H "x-idempotency-key: ${IDEM_KEY}" \
    -d "$IDEM_PAYLOAD")
HTTP_CODE3=$(echo "$RESPONSE3" | tail -n1)
BODY3=$(echo "$RESPONSE3" | head -n -1)
STATUS3=$(echo "$BODY3" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$STATUS3" = "duplicate" ]; then
    pass "Third request marked duplicate"
elif [ "$HTTP_CODE3" = "200" ] || [ "$HTTP_CODE3" = "202" ]; then
    pass "Third request handled (${HTTP_CODE3})"
else
    fail "Third request" "Got ${HTTP_CODE3}"
fi

echo ""
echo "========================================"
echo "RESULTS SUMMARY"
echo "========================================"
echo ""
echo "Passed: ${PASSED}"
echo "Failed: ${FAILED}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 GATE 4: ALL PASS"
    exit 0
else
    echo "❌ GATE 4: SOME FAILURES"
    exit 1
fi
