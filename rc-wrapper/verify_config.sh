#!/bin/bash

BASE_URL="http://localhost:3000"
AUTH_TOKEN="my-secret-token"

echo "Testing Authenticated Health Check (Should now be Public via Config)..."
# Expect 200 without token because it's in config.json whitelist
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" | grep 200 && echo "PASS (Public)" || echo "FAIL (Protected?)"

echo "Testing Credential Verify Path (Whitelisted via Config)..."
# Expect 504/404/200 but NOT 401
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/credentials/did:test:123/verify")
if [ "$CODE" != "401" ]; then
    echo "PASS (Got $CODE from upstream/proxy)"
else
    echo "FAIL (Got 401 from proxy)"
fi
