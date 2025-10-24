# Update MCP Server with SSE Support for Claude Desktop

## What Changed

The updated `http-wrapper.cjs` now includes **MCP SSE (Server-Sent Events) transport**, which enables Claude Desktop/web/mobile to connect via the "Add Custom Connector" feature.

**New endpoints:**
- `GET /sse` - MCP Server-Sent Events endpoint (for Claude Desktop)
- `POST /message` - Receive messages from Claude client

**Existing REST API endpoints (for VAPI) unchanged:**
- `GET /health` - Health check
- `GET /tools` - List all tools
- `POST /call-tool` - Call a specific tool
- `GET /info` - Server info

## Deployment Steps

SSH into your Hostinger server and run these commands:

```bash
# 1. Navigate to the MCP directory
cd /opt/nowcerts-mcp

# 2. Stop the running container
docker compose down

# 3. Backup the current wrapper
cp http-wrapper.cjs http-wrapper.cjs.backup

# 4. Download the updated wrapper
# (You'll need to paste the new content - see below)
nano http-wrapper.cjs
```

When nano opens, **select all** (Ctrl+A), **delete** the old content, then **paste** the complete new code from `http-wrapper-with-sse.cjs` (I'll provide it below).

```bash
# 5. Save and exit nano
# Press: Ctrl+O (write), Enter (confirm), Ctrl+X (exit)

# 6. Restart the container
docker compose up -d

# 7. Verify it's running
docker ps | grep nowcerts

# 8. Test the SSE endpoint
curl https://mcp.srv992249.hstgr.cloud/health
```

## Claude Desktop Configuration

### For "Add Custom Connector" in Claude Desktop/Web/Mobile

When adding a custom connector in Claude settings, use:

**Server URL:**
```
https://mcp.srv992249.hstgr.cloud/sse
```

**Server Type:** SSE (Server-Sent Events) or HTTP

**Configuration format** (if it asks for JSON):
```json
{
  "url": "https://mcp.srv992249.hstgr.cloud/sse",
  "messageEndpoint": "https://mcp.srv992249.hstgr.cloud/message"
}
```

### Alternative: claude_desktop_config.json (if using local config file)

If you're configuring via the `claude_desktop_config.json` file instead:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Add this to your config:**
```json
{
  "mcpServers": {
    "nowcerts": {
      "transport": "sse",
      "url": "https://mcp.srv992249.hstgr.cloud/sse"
    }
  }
}
```

## Testing

### Test REST API (for VAPI):
```bash
# List tools
curl https://mcp.srv992249.hstgr.cloud/tools

# Call a tool
curl -X POST https://mcp.srv992249.hstgr.cloud/call-tool \
  -H "Content-Type: application/json" \
  -d '{"name":"askkodiak_getCarriers"}'
```

### Test SSE endpoint (for Claude Desktop):
```bash
# Connect to SSE stream (will keep connection open)
curl -N https://mcp.srv992249.hstgr.cloud/sse
```

You should see `: connected` followed by a stream of events.

## Rollback (if needed)

If something goes wrong:

```bash
cd /opt/nowcerts-mcp
docker compose down
cp http-wrapper.cjs.backup http-wrapper.cjs
docker compose up -d
```

## Support

Both transport methods work simultaneously:
- **SSE transport** (Claude Desktop) via `/sse` endpoint
- **REST API** (VAPI, n8n, etc.) via `/tools` and `/call-tool` endpoints

The server maintains separate MCP processes for each connection type.
