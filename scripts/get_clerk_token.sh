#!/bin/bash
# Merkle DAG: get.clerk.token
# Helper script to get Clerk session token for testing

set -e

echo "=== Clerk Token Helper ==="
echo ""
echo "To get a Clerk session token for testing:"
echo ""
echo "Method 1: From Browser DevTools"
echo "  1. Open your app (http://localhost:25250 or http://localhost:25260)"
echo "  2. Sign in with Clerk"
echo "  3. Open DevTools > Application > Cookies"
echo "  4. Find the '__session' cookie"
echo "  5. Copy the cookie value (this is your session token)"
echo ""
echo "Method 2: Using Clerk CLI"
echo "  1. Install Clerk CLI: npm install -g @clerk/clerk-cli"
echo "  2. Login: clerk login"
echo "  3. Create a session: clerk sessions create --user-id <user-id>"
echo "  4. Copy the session token from the output"
echo ""
echo "Method 3: Using Clerk API"
echo "  1. Get your Clerk Secret Key from environment"
echo "  2. Create a session via API:"
echo "     curl -X POST https://api.clerk.com/v1/sessions \\"
echo "       -H 'Authorization: Bearer YOUR_SECRET_KEY' \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"user_id\": \"user_xxx\"}'"
echo ""
echo "Once you have the token, test it with:"
echo "  export CLERK_TOKEN='your_token_here'"
echo "  curl -X POST http://localhost:8081/graphql \\"
echo "    -H 'Authorization: Bearer \$CLERK_TOKEN' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"query\": \"query { participants { id } }\"}'"
echo ""

