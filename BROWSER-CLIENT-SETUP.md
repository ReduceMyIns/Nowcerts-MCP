# Browser-Based MCP Client Setup

## Using MCP SuperAssistant (Chrome Extension)

Your MCP server now supports browser-based clients like MCP SuperAssistant Chrome extension.

### Setup Steps

1. **Install MCP SuperAssistant**
   - Install the Chrome extension from Chrome Web Store
   - Or install from: https://github.com/wong2/mcp-superassistant

2. **Add Your MCP Server**
   - Click the MCP SuperAssistant extension icon
   - Click "Add Server" or similar option
   - Enter your server details:
     - **Name:** NowCerts MCP
     - **SSE URL:** `https://mcp.srv992249.hstgr.cloud/sse`
     - **Message URL:** `https://mcp.srv992249.hstgr.cloud/message`
     - **Auth:** (if you enabled MCP_API_KEY)
       - Type: Bearer Token
       - Token: Your API key from .env

3. **Test Connection**
   - The extension should connect and discover all 84 tools
   - You should see tools like:
     - `nowcerts_searchPolicies`
     - `askkodiak_getCarriers`
     - And 82 more tools

### CORS Configuration

The server is configured with full CORS support for browser clients:

✅ **Allowed Origins:** All (`*`)
✅ **Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS, PATCH
✅ **Credentials:** Enabled
✅ **Preflight Caching:** 24 hours

**Headers Allowed:**
- Content-Type
- Authorization
- X-Requested-With
- Accept
- Origin
- Cache-Control
- X-MCP-Session-Id

**Headers Exposed:**
- Content-Type
- Cache-Control
- X-MCP-Session-Id

### Security Note

The current CORS configuration allows **all origins** (`origin: '*'`). This is fine for development and public APIs.

**For production with restricted access:**

1. Edit `/opt/nowcerts-mcp/http-wrapper.cjs`
2. Change the CORS origin to specific domains:

```javascript
const corsOptions = {
  origin: [
    'chrome-extension://YOUR_EXTENSION_ID',
    'https://your-app-domain.com'
  ],
  // ... rest of config
};
```

3. Restart: `docker compose restart`

### Testing

Test the CORS headers:

```bash
# Test preflight request
curl -X OPTIONS https://mcp.srv992249.hstgr.cloud/sse \
  -H "Origin: chrome-extension://test" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Should see:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
# Access-Control-Allow-Credentials: true
```

### Troubleshooting

**Issue: Extension can't connect**

Check CORS headers:
```bash
curl -I https://mcp.srv992249.hstgr.cloud/sse
```

Should include:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Credentials: true`

**Issue: Authentication fails**

If you enabled `MCP_API_KEY`:
1. Check the extension includes the Bearer token
2. Verify token matches your .env file:
   ```bash
   cat /opt/nowcerts-mcp/.env | grep MCP_API_KEY
   ```

**Issue: Tools not discovered**

1. Test SSE endpoint directly:
   ```bash
   curl -N https://mcp.srv992249.hstgr.cloud/sse
   ```

2. Should see `: connected`

3. Test message endpoint:
   ```bash
   curl -X POST https://mcp.srv992249.hstgr.cloud/message \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
   ```

### Browser Console Debugging

Open Chrome DevTools (F12) while using the extension:

1. Go to **Console** tab
2. Look for CORS errors (will mention "Access-Control-Allow-Origin")
3. Check **Network** tab to see SSE connection status
4. Look for `/sse` request - should show "pending" while connected

### Other Browser-Based MCP Clients

This CORS configuration works with any browser-based MCP client:

- **MCP Inspector** (web-based debugging tool)
- **Custom web apps** using MCP SDK
- **Electron apps** with web views
- **Browser extensions** for other browsers

**Connection details for any browser client:**
- SSE Endpoint: `https://mcp.srv992249.hstgr.cloud/sse`
- Message Endpoint: `https://mcp.srv992249.hstgr.cloud/message`
- Protocol: MCP over SSE
- All 84 tools auto-discovered

---

## Summary

✅ **CORS enabled** for all browser clients
✅ **SSE endpoint** accessible from browser extensions
✅ **84 tools** available (NowCerts + AskKodiak + integrations)
✅ **Optional authentication** via Bearer token
✅ **Works with** MCP SuperAssistant, MCP Inspector, custom web apps

Your MCP server is now fully compatible with browser-based MCP clients!
