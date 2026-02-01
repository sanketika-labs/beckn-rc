#!/bin/bash

KEYCLOAK_URL=${1:-"http://localhost:8080/auth"}
TARGET_REALM=${2:-"sunbird-rc"}
TARGET_USER=${3:-"demo-user"}
ROLE_NAME=${4:-"admin"}
ADMIN_USER=${5:-"admin"}
ADMIN_PASS=${6:-"admin"}

echo "Usage: ./assign_role.sh [URL] [REALM] [USER] [ROLE] [ADMIN_USER] [ADMIN_PASS]"
echo "Using: URL=$KEYCLOAK_URL, Realm=$TARGET_REALM, User=$TARGET_USER, Role=$ROLE_NAME"

echo "1. Getting Master Token..."
MASTER_TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -d "client_id=admin-cli" \
    -d "username=$ADMIN_USER" \
    -d "password=$ADMIN_PASS" \
    -d "grant_type=password" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

if [ -z "$MASTER_TOKEN" ]; then echo "Failed to get Master Token"; exit 1; fi

echo "2. Getting User ID for $TARGET_USER..."
USER_ID=$(curl -s -H "Authorization: Bearer $MASTER_TOKEN" \
    "$KEYCLOAK_URL/admin/realms/$TARGET_REALM/users?username=$TARGET_USER" | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['id'])")

if [ -z "$USER_ID" ]; then echo "User not found"; exit 1; fi
echo "User ID: $USER_ID"

echo "3. Getting Role info for '$ROLE_NAME'..."
# We need the full role object to assign it
ROLE_JSON=$(curl -s -H "Authorization: Bearer $MASTER_TOKEN" \
    "$KEYCLOAK_URL/admin/realms/$TARGET_REALM/roles/$ROLE_NAME")

if [[ $ROLE_JSON == *"error"* ]]; then echo "Role not found"; exit 1; fi

echo "4. Assigning Role to User..."
# The API expects an array of role objects
curl -s -X POST -H "Authorization: Bearer $MASTER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "[$ROLE_JSON]" \
    "$KEYCLOAK_URL/admin/realms/$TARGET_REALM/users/$USER_ID/role-mappings/realm"

echo -e "\n\nSuccess! Role '$ROLE_NAME' assigned to '$TARGET_USER'."
