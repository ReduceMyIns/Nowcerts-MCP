# Production Deployment Checklist

## Step 1: Update Hostinger Server

SSH into your Hostinger VPS and run:

```bash
cd /opt/nowcerts-mcp

# Download the cleanup script
curl -O https://raw.githubusercontent.com/ReduceMyIns/Nowcerts-MCP/claude/debug-mcp-inspector-connection-011CUQKL79kYSQydNe83xi9G/cleanup-server.sh

# Make it executable
chmod +x cleanup-server.sh

# Run the cleanup (it will ask for confirmation)
./cleanup-server.sh
```

The cleanup script will:
1. ✅ Stop the current service
2. ✅ Backup your .env file
3. ✅ Remove old wrapper versions
4. ✅ Install the production wrapper
5. ✅ Optionally clean up node_modules
6. ✅ Restart the service
7. ✅ Test that everything works

---

## Step 2: Optional - Enable API Key Authentication

For production security, add API key:

```bash
cd /opt/nowcerts-mcp
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

---

## Step 3: Test the Deployment

```bash
# Test health endpoint (no auth required)
curl https://mcp.srv992249.hstgr.cloud/health

# Test tools list (requires auth if you enabled it)
curl https://mcp.srv992249.hstgr.cloud/tools \
  -H "Authorization: Bearer YOUR_API_KEY"

# Test SSE connection
curl -N https://mcp.srv992249.hstgr.cloud/sse \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Step 4: Configure VAPI

In VAPI dashboard:
1. Create or edit your assistant
2. Add **Server Tool** or **MCP Tool**
3. Configure:
   - **Type:** MCP Server / SSE
   - **SSE URL:** `https://mcp.srv992249.hstgr.cloud/sse`
   - **Message URL:** `https://mcp.srv992249.hstgr.cloud/message`
   - **Auth:** Bearer Token (if you enabled API key)
4. Save - VAPI will auto-discover all 76 tools

---

## Step 5: Configure Claude Desktop

**Option A: Via Settings UI**
1. Go to Settings → Developer → Add Custom Connector
2. Configure:
   - Name: NowCerts MCP
   - Transport: SSE
   - URL: `https://mcp.srv992249.hstgr.cloud/sse`
   - Message Endpoint: `https://mcp.srv992249.hstgr.cloud/message`
   - Auth: Bearer (if enabled)

**Option B: Via Config File**

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

## Step 6: Configure n8n (if using MCP nodes)

In n8n workflow:
1. Add MCP Tool node
2. Configure:
   - Connection Type: SSE
   - SSE URL: `https://mcp.srv992249.hstgr.cloud/sse`
   - Message URL: `https://mcp.srv992249.hstgr.cloud/message`
   - Headers: `{"Authorization": "Bearer YOUR_API_KEY"}`

---

## Verification

After deployment, verify:

✅ Server is running:
```bash
docker ps | grep nowcerts
```

✅ Logs look good:
```bash
docker logs nowcerts-mcp-http -f
```

You should see:
```
🚀 NowCerts MCP Server - Production v3.1
🔐 Security: ✅ ENABLED (if you set API key)
📡 PRIMARY INTERFACE (MCP SSE - Universal)
   SSE Endpoint: https://mcp.srv992249.hstgr.cloud/sse
```

✅ Health check passes:
```bash
curl https://mcp.srv992249.hstgr.cloud/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-10-24T...",
  "sseClients": 0,
  "authEnabled": true
}
```

---

## What Changed from Previous Version

**Removed:**
- ❌ 3 old wrapper files (with-sse, complete, vapi)
- ❌ 3 outdated documentation files
- ❌ Duplicate/conflicting endpoints

**Consolidated to:**
- ✅ Single production wrapper: `http-wrapper.cjs`
- ✅ Single comprehensive guide: `PRODUCTION-SETUP.md`
- ✅ Server cleanup script: `cleanup-server.sh`

**Architecture:**
- ✅ SSE as PRIMARY interface (VAPI, Claude, n8n)
- ✅ REST API as FALLBACK (OpenAI, webhooks)
- ✅ Optional API key authentication
- ✅ Graceful shutdown handling
- ✅ Better error logging

---

## Storage Savings

**On Hostinger server:**
- Before: ~11KB × 4 wrappers = 44KB
- After: ~11KB × 1 wrapper = 11KB
- Saved: ~33KB (plus node_modules cleanup if you chose it)

**On GitHub:**
- Before: 3 wrapper files + 3 docs = ~80KB
- After: 1 wrapper + 1 doc = ~30KB
- Saved: ~50KB

---

## Rollback (if needed)

If something goes wrong:

```bash
cd /opt/nowcerts-mcp
docker compose down

# Restore backup
cp http-wrapper.cjs.old http-wrapper.cjs

# Restart
docker compose up -d
```

---

## Need Help?

See **[PRODUCTION-SETUP.md](./PRODUCTION-SETUP.md)** for:
- Detailed troubleshooting
- Security best practices
- Integration examples
- Architecture diagrams

---

## Summary

✅ **GitHub:** Cleaned up and production-ready
✅ **Hostinger:** Run cleanup script to update
✅ **VAPI:** Use SSE endpoint with built-in MCP tool
✅ **Claude:** Use SSE custom connector
✅ **n8n:** Use MCP nodes (SSE) or REST fallback

**One server. One wrapper. Universal compatibility.**
