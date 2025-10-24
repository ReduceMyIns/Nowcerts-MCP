# Quick Reference - Your Universal MCP URL

## 🎯 THE URL TO USE EVERYWHERE

```
https://mcp.srv992249.hstgr.cloud/sse
```

**This ONE URL gives you access to all 76 NowCerts tools + integrations.**

---

## How to Use It

### VAPI (Voice AI)
1. Add **MCP Server Tool**
2. SSE URL: `https://mcp.srv992249.hstgr.cloud/sse`
3. Message URL: `https://mcp.srv992249.hstgr.cloud/message`
4. Done! All 76 tools auto-discovered.

### Claude Desktop
1. Settings → Add Custom Connector
2. Transport: SSE
3. URL: `https://mcp.srv992249.hstgr.cloud/sse`
4. Message Endpoint: `https://mcp.srv992249.hstgr.cloud/message`
5. Done! All tools available.

### n8n (if MCP nodes available)
1. Add MCP Tool node
2. Connection Type: SSE
3. SSE URL: `https://mcp.srv992249.hstgr.cloud/sse`
4. Message URL: `https://mcp.srv992249.hstgr.cloud/message`

### Any MCP-Compatible Tool
Just use: `https://mcp.srv992249.hstgr.cloud/sse`

The tool will automatically:
- Connect via SSE
- Discover all 76 tools
- Read all documentation from each tool's schema
- Make them available to the AI

---

## Fallback URL (for non-MCP tools)

**If the tool doesn't support MCP/SSE**, use REST API:

```
POST https://mcp.srv992249.hstgr.cloud/call-tool
```

Body:
```json
{
  "name": "tool_name",
  "arguments": {...}
}
```

List available tools:
```
GET https://mcp.srv992249.hstgr.cloud/tools
```

---

## What You Get

All 76 tools across:
- ✅ NowCerts API (50+ insurance management tools)
- ✅ AskKodiak API (6 commercial risk classification tools)
- ✅ SmartyStreets (address validation)
- ✅ Fenris (additional integrations)

Each tool includes:
- ✅ Full documentation
- ✅ Parameter schemas
- ✅ Return type definitions
- ✅ Usage examples

---

## Authentication (if enabled)

If you set `MCP_API_KEY` in .env:

**Header:**
```
Authorization: Bearer YOUR_API_KEY
```

Add this to your tool configuration.

---

## Quick Test

```bash
# Health check (no auth)
curl https://mcp.srv992249.hstgr.cloud/health

# List all tools
curl https://mcp.srv992249.hstgr.cloud/tools

# Call a tool
curl -X POST https://mcp.srv992249.hstgr.cloud/call-tool \
  -H "Content-Type: application/json" \
  -d '{"name":"askkodiak_getCarriers","arguments":{}}'
```

---

## Copy-Paste Config

### Claude Desktop (claude_desktop_config.json)

```json
{
  "mcpServers": {
    "nowcerts": {
      "transport": "sse",
      "url": "https://mcp.srv992249.hstgr.cloud/sse",
      "messageEndpoint": "https://mcp.srv992249.hstgr.cloud/message"
    }
  }
}
```

### VAPI (in UI)

```
Server Type: MCP Server
SSE URL: https://mcp.srv992249.hstgr.cloud/sse
Message URL: https://mcp.srv992249.hstgr.cloud/message
```

### n8n HTTP Node (if no MCP support)

```
URL: https://mcp.srv992249.hstgr.cloud/call-tool
Method: POST
Headers:
  Content-Type: application/json
Body:
{
  "name": "{{ $json.toolName }}",
  "arguments": {{ $json.args }}
}
```

---

## Tool Categories Reference

### NowCerts - Policy Management
- `nowcerts_searchPolicies` - Search for policies
- `nowcerts_getPolicy` - Get policy details
- `nowcerts_createPolicy` - Create new policy
- `nowcerts_updatePolicy` - Update existing policy
- ... 46+ more policy tools

### NowCerts - Contact Management
- `nowcerts_searchContacts` - Search contacts
- `nowcerts_getContact` - Get contact details
- `nowcerts_createContact` - Create new contact
- ... 10+ more contact tools

### AskKodiak - Risk Classification
- `askkodiak_getCarriers` - List all insurance carriers (66 carriers)
- `askkodiak_classifyBusiness` - Classify business risk
- `askkodiak_searchProducts` - Search insurance products
- `askkodiak_getProduct` - Get product details
- `askkodiak_getReferrals` - Get referral information
- `askkodiak_getAppetite` - Get carrier appetite

### SmartyStreets - Address Validation
- `smarty_validateAddress` - Validate US address
- `smarty_autocomplete` - Address autocomplete

---

## Support

**Documentation:** See [PRODUCTION-SETUP.md](./PRODUCTION-SETUP.md)

**Test Server:**
```bash
curl https://mcp.srv992249.hstgr.cloud/health
```

**View Logs:**
```bash
docker logs nowcerts-mcp-http -f
```

---

## TL;DR

**One URL for everything:**
```
https://mcp.srv992249.hstgr.cloud/sse
```

Use it in VAPI, Claude Desktop, n8n, or any MCP-compatible tool.
All 76 tools + full documentation are auto-discovered.

**That's it!**
