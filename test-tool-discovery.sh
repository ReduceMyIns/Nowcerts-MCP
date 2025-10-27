#!/bin/bash
# Test MCP server tool discovery

echo "=== Testing MCP Server Tool Discovery ==="
echo ""
echo "Server: https://mcp.srv992249.hstgr.cloud/sse"
echo ""

# First, initialize a session
echo "1. Initializing MCP session..."
INIT_RESPONSE=$(curl -s -X POST https://mcp.srv992249.hstgr.cloud/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }')

echo "$INIT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INIT_RESPONSE"

# Extract session ID if present
SESSION_ID=$(echo "$INIT_RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "Session ID: $SESSION_ID"
echo ""

# Now list tools
echo "2. Listing all available tools..."
if [ -n "$SESSION_ID" ]; then
  curl -s -X POST https://mcp.srv992249.hstgr.cloud/sse \
    -H "Content-Type: application/json" \
    -H "mcp-session-id: $SESSION_ID" \
    -d '{
      "jsonrpc": "2.0",
      "id": 2,
      "method": "tools/list",
      "params": {}
    }' | python3 -m json.tool | head -100
else
  # Try without session ID
  curl -s -X POST https://mcp.srv992249.hstgr.cloud/sse \
    -H "Content-Type: application/json" \
    -d '{
      "jsonrpc": "2.0",
      "id": 2,
      "method": "tools/list",
      "params": {}
    }' | python3 -m json.tool | head -100
fi

echo ""
echo ""
echo "=== Tool Count ==="
curl -s -X POST https://mcp.srv992249.hstgr.cloud/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/list",
    "params": {}
  }' | grep -o '"name"' | wc -l

echo ""
echo "=== Sample Tool Categories ==="
curl -s -X POST https://mcp.srv992249.hstgr.cloud/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/list",
    "params": {}
  }' | grep -o '"name":"[^"]*"' | head -20
