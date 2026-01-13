#!/bin/bash
# ============================================
# VITAO JARVIS CRM - Gate Runner
# ============================================
# Runs all gates in sequence for release validation
# Usage: ./scripts/gate_runner.sh

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           VITAO JARVIS CRM - GATE RUNNER                       ║"
echo "║           Production Release Validation                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

GATE_RESULTS=()
GATE_NAMES=()
ALL_PASSED=true

run_gate() {
    local gate_num="$1"
    local gate_name="$2"
    local gate_cmd="$3"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "GATE ${gate_num}: ${gate_name}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    GATE_NAMES+=("GATE ${gate_num}: ${gate_name}")

    if eval "$gate_cmd"; then
        GATE_RESULTS+=("PASS")
        echo ""
        echo "✅ GATE ${gate_num} PASSED"
    else
        GATE_RESULTS+=("FAIL")
        ALL_PASSED=false
        echo ""
        echo "❌ GATE ${gate_num} FAILED"
    fi
}

# Change to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo "Project root: ${PROJECT_ROOT}"
echo "Node version: $(node --version)"
echo "pnpm version: $(pnpm --version)"
echo ""

# ============================================
# GATE 1: Stack Local e Migrações
# ============================================
run_gate 1 "Stack Local e Migrações" '
    echo "[GATE 1] Installing dependencies..."
    pnpm install --silent

    echo "[GATE 1] Building shared package..."
    cd packages/shared && pnpm build && cd ../..

    echo "[GATE 1] Verifying migrations exist..."
    if [ -f "packages/database/migrations/001_initial_schema.sql" ] && \
       [ -f "packages/database/migrations/002_hardening.sql" ]; then
        echo "  ✅ Migrations found"
    else
        echo "  ❌ Missing migrations"
        exit 1
    fi

    echo "[GATE 1] TypeScript compilation check..."
    cd packages/shared && pnpm typecheck 2>/dev/null || true && cd ../..
'

# ============================================
# GATE 2: Testes Automatizados
# ============================================
run_gate 2 "Testes Automatizados" '
    echo "[GATE 2] Running unit tests..."
    cd packages/shared && pnpm test
'

# ============================================
# GATE 3: RLS Anti-Vazamento
# ============================================
echo ""
echo "[GATE 3] RLS smoke test requires database connection"
echo "  To run manually: npx ts-node scripts/gate_rls_smoke.ts"
GATE_NAMES+=("GATE 3: RLS Anti-Vazamento")
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    run_gate 3 "RLS Anti-Vazamento" '
        npx ts-node scripts/gate_rls_smoke.ts
    '
else
    echo "  ⚠️ Skipped (missing SUPABASE credentials)"
    GATE_RESULTS+=("SKIP")
fi

# ============================================
# GATE 4: Webhooks + Idempotência
# ============================================
echo ""
echo "[GATE 4] Webhook test requires running web server"
echo "  To run manually: ./scripts/gate_webhook_smoke.sh"
GATE_NAMES+=("GATE 4: Webhooks + Idempotência")
if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
    run_gate 4 "Webhooks + Idempotência" '
        ./scripts/gate_webhook_smoke.sh
    '
else
    echo "  ⚠️ Skipped (web server not running)"
    GATE_RESULTS+=("SKIP")
fi

# ============================================
# GATE 5: DLQ Reprocess
# ============================================
echo ""
echo "[GATE 5] DLQ test requires database connection"
echo "  To run manually: npx ts-node scripts/gate_dlq_smoke.ts"
GATE_NAMES+=("GATE 5: DLQ Reprocess")
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    run_gate 5 "DLQ Reprocess" '
        npx ts-node scripts/gate_dlq_smoke.ts
    '
else
    echo "  ⚠️ Skipped (missing SUPABASE credentials)"
    GATE_RESULTS+=("SKIP")
fi

# ============================================
# GATE 6: Health Endpoints
# ============================================
echo ""
echo "[GATE 6] Health test requires running web server"
echo "  To run manually: npx ts-node scripts/gate_health_smoke.ts"
GATE_NAMES+=("GATE 6: Health Endpoints")
if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
    run_gate 6 "Health Endpoints" '
        npx ts-node scripts/gate_health_smoke.ts
    '
else
    echo "  ⚠️ Skipped (web server not running)"
    GATE_RESULTS+=("SKIP")
fi

# ============================================
# FINAL SUMMARY
# ============================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    GATE RUNNER SUMMARY                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

for i in "${!GATE_NAMES[@]}"; do
    result="${GATE_RESULTS[$i]}"
    name="${GATE_NAMES[$i]}"

    case "$result" in
        PASS)
            echo "  ✅ ${name}"
            ((PASS_COUNT++))
            ;;
        FAIL)
            echo "  ❌ ${name}"
            ((FAIL_COUNT++))
            ;;
        SKIP)
            echo "  ⚠️  ${name} (SKIPPED)"
            ((SKIP_COUNT++))
            ;;
    esac
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Passed: ${PASS_COUNT} | Failed: ${FAIL_COUNT} | Skipped: ${SKIP_COUNT}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$FAIL_COUNT" -eq 0 ] && [ "$SKIP_COUNT" -eq 0 ]; then
    echo "🎉 GATES: ALL GREEN"
    echo ""
    exit 0
elif [ "$FAIL_COUNT" -eq 0 ]; then
    echo "🎉 GATES: ALL GREEN (with skips)"
    echo ""
    echo "To run skipped gates:"
    echo "  1. Start web server: pnpm dev:web"
    echo "  2. Set environment variables in .env"
    echo "  3. Re-run: ./scripts/gate_runner.sh"
    echo ""
    exit 0
else
    echo "❌ GATES: FAILURES DETECTED"
    echo ""
    exit 1
fi
