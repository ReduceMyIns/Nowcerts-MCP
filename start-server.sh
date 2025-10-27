#!/bin/bash

# NowCerts MCP SSE Server Startup Script
# This script starts the NowCerts MCP server in SSE mode

set -e

echo "========================================================"
echo "NowCerts MCP SSE Server"
echo "========================================================"

# Check if .env file exists
if [ -f .env ]; then
    echo "✓ Found .env file, loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠ No .env file found. Make sure environment variables are set."
fi

# Check for required variables
if [ -z "$NOWCERTS_USERNAME" ] || [ -z "$NOWCERTS_PASSWORD" ]; then
    echo "❌ ERROR: NOWCERTS_USERNAME and NOWCERTS_PASSWORD must be set"
    echo ""
    echo "Please either:"
    echo "  1. Create a .env file (copy from .env.example)"
    echo "  2. Export environment variables:"
    echo "     export NOWCERTS_USERNAME='your-username'"
    echo "     export NOWCERTS_PASSWORD='your-password'"
    echo ""
    exit 1
fi

# Set server configuration
export USE_SSE=true
export PORT=${PORT:-3000}

echo "✓ Configuration loaded"
echo "  - Mode: SSE/HTTP"
echo "  - Port: $PORT"
echo "  - NowCerts User: $NOWCERTS_USERNAME"
echo ""

# Check if dist/index.js exists
if [ ! -f dist/index.js ]; then
    echo "⚠ dist/index.js not found. Building..."
    npm run build
    echo "✓ Build complete"
    echo ""
fi

echo "Starting server..."
echo "========================================================"
echo ""

# Start the server
exec node dist/index.js
