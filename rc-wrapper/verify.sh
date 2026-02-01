#!/bin/bash

BASE_URL="http://localhost:3000"
AUTH_TOKEN="my-secret-token"

echo "Testing Health Check (Auth Required)..."
# Expect 401 without token
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" | grep 401 && echo "PASS (Protected)" || echo "FAIL (Public?)"

echo "Testing Health Check (With Token)..."
# Expect 200 with token
curl -s -H "Authorization: $AUTH_TOKEN" -o /dev/null -w "%{http_code}" "$BASE_URL/health" | grep 200 && echo "PASS" || echo "FAIL"

# Identity Service
echo "Testing Identity Path /did/generate (No Token)..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/did/generate" | grep 401 && echo "PASS" || echo "FAIL"

echo "Testing Identity Path (With Token)..."
# We expect the proxy to try to forward. Since the target IPs in .env are internal/private IPs (192.168.0.36),
# they might not be reachable from this environment. We should check if we get a Gateway Timeout (504) or similar,
# NOT 401. A 401 would mean OUR proxy rejected it. Any other code means it passed our auth.
CODE=$(curl -s -H "Authorization: $AUTH_TOKEN" -o /dev/null -w "%{http_code}" "$BASE_URL/did/generate")
if [ "$CODE" != "401" ]; then
    echo "PASS (Got $CODE from upstream/proxy)"
else
    echo "FAIL (Got 401 from proxy)"
fi

# Credential Service
echo "Testing Credential Path /credentials/issue (No Token)..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/credentials/issue" | grep 401 && echo "PASS" || echo "FAIL"

echo "Testing Credential Verify Path (No Token - Default Secure)..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/credentials/did:test:123/verify" | grep 401 && echo "PASS" || echo "FAIL"
