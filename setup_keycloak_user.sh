#!/bin/bash

KEYCLOAK_URL=${1:-"http://localhost:8080/auth"}
TARGET_REALM=${2:-"sunbird-rc"}
NEW_USER=${3:-"demo-user"}
NEW_PASS=${4:-"password123"}
ADMIN_USER=${5:-"admin"}
ADMIN_PASS=${6:-"admin"}

echo "Usage: ./setup_keycloak_user.sh [URL] [REALM] [USER] [PASS] [ADMIN_USER] [ADMIN_PASS]"
echo "Using: URL=$KEYCLOAK_URL, Realm=$TARGET_REALM, User=$NEW_USER"

# 1. Get Master Token
echo "Getting Master Token..."
MASTER_TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -d "client_id=admin-cli" \
    -d "username=$ADMIN_USER" \
    -d "password=$ADMIN_PASS" \
    -d "grant_type=password" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")

if [ -z "$MASTER_TOKEN" ]; then
    echo "Failed to get Master Token"
    exit 1
fi

# 2. Check if user exists
echo "Checking if user exists..."
USER_ID=$(curl -s -H "Authorization: Bearer $MASTER_TOKEN" \
    "$KEYCLOAK_URL/admin/realms/$TARGET_REALM/users?username=$NEW_USER" | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if len(users) > 0 else '')")

if [ -z "$USER_ID" ]; then
    echo "Creating user $NEW_USER..."
    curl -s -X POST -H "Authorization: Bearer $MASTER_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$NEW_USER\", \"enabled\": true, \"email\": \"$NEW_USER@example.com\", \"firstName\": \"Test\", \"lastName\": \"User\"}" \
        "$KEYCLOAK_URL/admin/realms/$TARGET_REALM/users"
    
    # Get ID again
    USER_ID=$(curl -s -H "Authorization: Bearer $MASTER_TOKEN" \
        "$KEYCLOAK_URL/admin/realms/$TARGET_REALM/users?username=$NEW_USER" | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if len(users) > 0 else '')")
fi

echo "User ID: $USER_ID"

# 3. Set Password
echo "Setting password..."
curl -s -X PUT -H "Authorization: Bearer $MASTER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\": \"password\", \"value\": \"$NEW_PASS\", \"temporary\": false}" \
    "$KEYCLOAK_URL/admin/realms/$TARGET_REALM/users/$USER_ID/reset-password"

# 4. Get Realm Token
echo "Testing Login for $NEW_USER..."
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/$TARGET_REALM/protocol/openid-connect/token" \
    -d "client_id=registry-frontend" \
    -d "username=$NEW_USER" \
    -d "password=$NEW_PASS" \
    -d "grant_type=password" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")

if [ -n "$TOKEN" ]; then
    echo "SUCCESS! Token acquired."
    echo "$TOKEN" > token.txt
else
    echo "Failed to login as new user."
    exit 1
fi
