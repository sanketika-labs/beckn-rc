#!/bin/bash

# Configuration
KEYCLOAK_URL=${1:-"http://localhost:8080/auth"}
REALM=${2:-"sunbird-rc"}
CLIENT_ID=${3:-"registry-frontend"}
USERNAME=${4:-"demo-user"}
PASSWORD=${5:-"password123"}

# Colors
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get the token using Python for robust JSON parsing
TOKEN_JSON=$(curl -s -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=$CLIENT_ID" \
    -d "username=$USERNAME" \
    -d "password=$PASSWORD" \
    -d "grant_type=password")

# Check if curl failed
if [ $? -ne 0 ]; then
    echo "Error: Connection to Keycloak failed."
    exit 1
fi

# Extract token using Python (installed by default on macOS)
TOKEN=$(echo "$TOKEN_JSON" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('access_token', ''))")

if [ -z "$TOKEN" ]; then
    echo "Error: Could not extract token. Keycloak response:"
    echo "$TOKEN_JSON"
    exit 1
fi

echo "Bearer $TOKEN"
