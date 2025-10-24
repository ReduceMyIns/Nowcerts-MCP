# Production MCP Server Setup - SSE Universal Standard

## Why SSE (Server-Sent Events)?

**SSE is the universal MCP transport** that works with:
- ✅ **VAPI** (built-in MCP server tool)
- ✅ **Claude Desktop** (custom connector)
- ✅ **n8n** (MCP nodes)
- ✅ **Most LLMs** (except OpenAI)
- ✅ **Any MCP-compatible client**

**REST API is fallback only** for:
- ⚠️ OpenAI (doesn't support SSE)
- ⚠️ Simple webhooks
- ⚠️ Custom integrations

---

## Quick Start

### 1. Update Your Server

SSH into your Hostinger VPS:

```bash
cd /opt/nowcerts-mcp
docker compose down

# Backup current version
cp http-wrapper.cjs http-wrapper.cjs.v2

# Edit the wrapper
nano http-wrapper.cjs
```

**In nano:**
1. Select all: `Ctrl+A`
2. Delete: `Backspace`
3. Paste the complete content from `http-wrapper-production.cjs`
4. Save: `Ctrl+O`, `Enter`
5. Exit: `Ctrl+X`

```bash
# Restart
docker compose up -d

# Verify
curl https://mcp.srv992249.hstgr.cloud/health
```

### 2. Optional: Enable API Key Authentication

For production security, add to your `.env` file:

```bash
nano .env
```

Add this line:
```bash
MCP_API_KEY=your-secure-random-key-here
```

Generate a secure key:
```bash
openssl rand -base64 32
```

Then restart:
```bash
docker compose restart
```

Now all endpoints require `Authorization: Bearer YOUR_API_KEY` header.

---

## Integration Guides

### VAPI Integration (MCP Built-in Tool)

VAPI has a native MCP server tool. Here's how to use it:

**In VAPI:**
1. Create or edit your assistant
2. Add a **Server Tool** or **MCP Tool**
3. Configure:
   - **Type:** MCP Server / SSE
   - **SSE URL:** `https://mcp.srv992249.hstgr.cloud/sse`
   - **Message URL:** `https://mcp.srv992249.hstgr.cloud/message`
   - **Auth:** (if you set MCP_API_KEY)
     - Type: Bearer Token
     - Token: Your API key from .env

4. **Save** - VAPI will automatically:
   - Connect to SSE endpoint
   - Discover all 76 tools
   - Make them available to the AI

**That's it!** VAPI now has access to all your NowCerts tools, AskKodiak tools, etc.

**Example conversation:**
- User: "Search for John Smith's policy"
- VAPI AI: *uses `nowcerts_searchPolicies` tool automatically*
- User: "What carriers are available?"
- VAPI AI: *uses `askkodiak_getCarriers` tool automatically*

---

### Claude Desktop Integration

**In Claude Desktop/Web/Mobile:**
1. Go to **Settings** → **Developer** → **Add Custom Connector**
2. Configure:
   - **Name:** NowCerts MCP
   - **Transport:** SSE
   - **URL:** `https://mcp.srv992249.hstgr.cloud/sse`
   - **Message Endpoint:** `https://mcp.srv992249.hstgr.cloud/message`
   - **Auth:** (if enabled)
     - Type: Bearer
     - Token: Your API key

3. **Save and Enable**

**Alternative: Local config file**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "nowcerts": {
      "transport": "sse",
      "url": "https://mcp.srv992249.hstgr.cloud/sse",
      "messageEndpoint": "https://mcp.srv992249.hstgr.cloud/message",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

---

### n8n Integration (MCP Nodes)

If n8n has MCP node support:

**In n8n workflow:**
1. Add **MCP Tool** node
2. Configure:
   - **Connection Type:** SSE
   - **SSE URL:** `https://mcp.srv992249.hstgr.cloud/sse`
   - **Message URL:** `https://mcp.srv992249.hstgr.cloud/message`
   - **Headers:** (if auth enabled)
     ```json
     {
       "Authorization": "Bearer YOUR_API_KEY"
     }
     ```

3. The node will auto-discover all tools

**If n8n doesn't have MCP nodes yet**, use HTTP Request node with REST API:

```
URL: https://mcp.srv992249.hstgr.cloud/call-tool
Method: POST
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_API_KEY
Body:
{
  "name": "{{ $json.toolName }}",
  "arguments": {{ $json.args }}
}
```

---

### OpenAI Integration (REST Fallback)

Since OpenAI doesn't support SSE, use REST API:

```python
import requests

# List available tools
response = requests.get(
    'https://mcp.srv992249.hstgr.cloud/tools',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)
tools = response.json()['tools']

# Call a tool
response = requests.post(
    'https://mcp.srv992249.hstgr.cloud/call-tool',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'name': 'nowcerts_searchPolicies',
        'arguments': {'query': 'John Smith'}
    }
)
result = response.json()
```

---

## Security Best Practices

### 1. Enable API Key Authentication

```bash
# In .env file
MCP_API_KEY=your-secure-key-here
```

### 2. Use HTTPS Only

Already configured via Traefik with Let's Encrypt SSL.

### 3. Monitor Active Connections

```bash
curl https://mcp.srv992249.hstgr.cloud/health
```

Shows number of active SSE clients.

### 4. Check Logs Regularly

```bash
docker logs nowcerts-mcp-http -f
```

Look for:
- Failed auth attempts
- Unusual tool calls
- Connection errors

### 5. Rate Limiting (Optional)

Add to http-wrapper.cjs if needed:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

Then run `npm install express-rate-limit` in container.

---

## Troubleshooting

### "No active MCP session" error

**Problem:** Client sent POST to `/message` without SSE connection

**Solution:** Connect to `/sse` first, then send messages to `/message`

### "Unauthorized" error

**Problem:** API key required but not provided or incorrect

**Solution:**
1. Check if `MCP_API_KEY` is set in .env
2. Include `Authorization: Bearer YOUR_KEY` header
3. Verify key matches exactly (no extra spaces)

### SSE connection drops

**Problem:** Network timeout or server restart

**Solution:**
- MCP clients should auto-reconnect
- Check Traefik timeout settings
- Monitor with `docker logs nowcerts-mcp-http -f`

### Tools not appearing in VAPI/Claude

**Problem:** MCP server not responding to `tools/list` request

**Solution:**
```bash
# Test manually
curl https://mcp.srv992249.hstgr.cloud/tools \
  -H "Authorization: Bearer YOUR_KEY"
```

Should return list of 76 tools. If not, check:
- Container is running: `docker ps | grep nowcerts`
- Environment vars loaded: `docker logs nowcerts-mcp-http | grep "Environment loaded"`
- NowCerts credentials: Check .env file

---

## Testing

### Test SSE Connection

```bash
# Connect to SSE stream (keeps connection open)
curl -N https://mcp.srv992249.hstgr.cloud/sse \
  -H "Authorization: Bearer YOUR_KEY"
```

Should see `: connected` and keep connection open.

### Test Message Sending

```bash
# In another terminal (while SSE connection is open)
curl -X POST https://mcp.srv992249.hstgr.cloud/message \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

Should see response in SSE stream.

### Test REST API (Fallback)

```bash
# List tools
curl https://mcp.srv992249.hstgr.cloud/tools \
  -H "Authorization: Bearer YOUR_KEY"

# Call a tool
curl -X POST https://mcp.srv992249.hstgr.cloud/call-tool \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "askkodiak_getCarriers",
    "arguments": {}
  }'
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                  External Clients                            │
├─────────────────┬───────────────┬───────────────┬───────────┤
│  VAPI (SSE)     │ Claude (SSE)  │ n8n (SSE)     │ OpenAI    │
│                 │               │               │ (REST)    │
└────────┬────────┴───────┬───────┴───────┬───────┴─────┬─────┘
         │                │               │             │
         ▼                ▼               ▼             ▼
    ┌────────────────────────────────────────────────────────┐
    │           Traefik (SSL/TLS termination)                │
    │      mcp.srv992249.hstgr.cloud (HTTPS)                │
    └────────────────────┬───────────────────────────────────┘
                         │
                         ▼
    ┌────────────────────────────────────────────────────────┐
    │         MCP HTTP Wrapper (Node.js/Express)             │
    │  ┌──────────────────────────────────────────────────┐  │
    │  │  /sse (SSE endpoint) - Primary Interface         │  │
    │  │  /message (POST) - For SSE clients               │  │
    │  │  /tools, /call-tool (REST) - Fallback            │  │
    │  └──────────────────────────────────────────────────┘  │
    └────────────────────┬───────────────────────────────────┘
                         │
                         ▼
    ┌────────────────────────────────────────────────────────┐
    │       MCP Server Process (dist/index.js)               │
    │  ┌──────────────────────────────────────────────────┐  │
    │  │  • NowCerts API (50+ tools)                      │  │
    │  │  • AskKodiak API (6 tools)                       │  │
    │  │  • Other integrations (20+ tools)                │  │
    │  └──────────────────────────────────────────────────┘  │
    └────────────────────────────────────────────────────────┘
```

**Key Points:**
- **SSE is the primary interface** - Used by VAPI, Claude, n8n
- **REST is fallback** - Used by OpenAI and simple webhooks
- **Same server, different protocols** - Both work simultaneously
- **Traefik handles SSL** - Automatic Let's Encrypt certificates
- **Docker isolation** - Completely separate from n8n instance

---

## Summary

**For VAPI:** Use the built-in MCP tool pointing to the SSE endpoint
**For Claude:** Add custom connector with SSE transport
**For n8n:** Use MCP nodes (if available) or REST API fallback
**For OpenAI:** Use REST API endpoints

**One server. Multiple protocols. Universal compatibility.**
