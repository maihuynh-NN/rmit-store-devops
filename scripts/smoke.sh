#!/usr/bin/env bash
# Smoke test: is the deployed API alive, ready, and the expected version?
# Usage: scripts/smoke.sh [BASE_URL] [EXPECTED_COMMIT]
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"
EXPECTED_COMMIT="${2:-}"
failures=0

check_status() {
  local path="$1"
  local expected="$2"
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE_URL}${path}" || true)
  if [ "$actual" = "$expected" ]; then
    echo "PASS  ${path} -> ${actual}"
  else
    echo "FAIL  ${path} -> ${actual} (expected ${expected})"
    failures=$((failures + 1))
  fi
}

check_status "/healthz/" 200
check_status "/readyz/" 200
check_status "/api/version/" 200

if [ -n "$EXPECTED_COMMIT" ]; then
  body=$(curl -s --max-time 5 "${BASE_URL}/api/version/" || true)
  if echo "$body" | grep -q "\"commit\":\"${EXPECTED_COMMIT}\""; then
    echo "PASS  /api/version/ reports commit ${EXPECTED_COMMIT}"
  else
    echo "FAIL  /api/version/ body ${body} does not report commit ${EXPECTED_COMMIT}"
    failures=$((failures + 1))
  fi
fi

if [ "$failures" -gt 0 ]; then
  echo "Smoke test FAILED: ${failures} check(s)"
  exit 1
fi
echo "Smoke test passed"