# N8N AI Agent Integration Guide

## Overview

This MCP server provides 100+ NowCerts API tools that N8N AI agents can discover and use automatically through the Model Context Protocol.

## Connection Details

- **MCP Server URL**: `https://mcp.srv992249.hstgr.cloud/sse`
- **Protocol**: Server-Sent Events (SSE) over HTTPS
- **Authentication**: Handled by the server (NowCerts credentials configured in .env)

## How Tool Discovery Works

The MCP protocol provides automatic tool discovery. When your N8N AI agent connects to the MCP server, it can:

1. **Send `initialize` request** - Establishes a session
2. **Send `tools/list` request** - Gets all available tools with full documentation
3. **Send `tools/call` request** - Executes a specific tool

### MCP Protocol Flow

```
N8N Agent                    MCP Server
    |                             |
    |--- initialize request ----->|
    |<-- session + capabilities --|
    |                             |
    |--- tools/list request ----->|
    |<-- array of 100+ tools -----|
    |                             |
    |--- tools/call request ----->|
    |<-- tool result -------------|
```

## Available Tool Categories

The server provides tools for:

### Core NowCerts Entities (90+ tools)
- **Insureds**: Get, insert, update insured records
- **Policies**: Get, insert policies with coverage details
- **Claims**: Manage insurance claims
- **Prospects**: Handle prospective customers
- **Agents**: Agent management
- **Drivers**: Driver information and management
- **Vehicles**: Vehicle records
- **Tasks**: Task management
- **Notes**: Add notes to entities
- **Tags**: Apply tags for organization
- **Activities**: Track activities
- **Renewals**: Handle policy renewals
- **Quotes**: Quote management
- **Documents**: Document handling
- **Payments**: Payment processing
- **And more...**

### External API Integrations (10+ tools)
- **Fenris**: Household data prefill (property/auto insurance)
- **Smarty**: Address verification and standardization
- **NHTSA**: VIN decoding and vehicle recalls
- **AskKodiak**: Commercial insurance classification

## Tool Documentation Format

Each tool includes:

```json
{
  "name": "nowcerts_insured_getList",
  "description": "Retrieve a paginated list of insureds with search and filtering",
  "inputSchema": {
    "type": "object",
    "properties": {
      "page": {
        "type": "number",
        "description": "Page number (default: 1)"
      },
      "limit": {
        "type": "number",
        "description": "Records per page (default: 100, max: 500)"
      },
      "search": {
        "type": "string",
        "description": "Search term to filter insureds"
      }
    }
  }
}
```

## Testing Tool Discovery

Run this command on the server to see available tools:

```bash
cd ~/Nowcerts-MCP
./test-tool-discovery.sh
```

Or test manually with curl:

```bash
# List all tools
curl -X POST https://mcp.srv992249.hstgr.cloud/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }' | jq
```

## N8N Configuration

### Option 1: Using N8N's MCP Integration (if available)

If N8N has built-in MCP support:

1. Add MCP Server connection
2. Set URL: `https://mcp.srv992249.hstgr.cloud/sse`
3. N8N will automatically discover all tools

### Option 2: Using HTTP Request Node

If N8N doesn't have native MCP support yet, use HTTP Request nodes:

```javascript
// In N8N workflow - HTTP Request node

// 1. Initialize session
POST https://mcp.srv992249.hstgr.cloud/sse
Headers: Content-Type: application/json
Body:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "n8n-workflow",
      "version": "1.0.0"
    }
  }
}

// 2. Call a tool
POST https://mcp.srv992249.hstgr.cloud/sse
Headers:
  Content-Type: application/json
  mcp-session-id: <SESSION_ID_FROM_STEP_1>
Body:
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "nowcerts_insured_getList",
    "arguments": {
      "page": 1,
      "limit": 10
    }
  }
}
```

### Option 3: Using N8N AI Agent Node

If using N8N's AI Agent functionality:

1. Configure AI Agent (OpenAI, Anthropic, etc.)
2. Add "Custom MCP Server" as a tool provider
3. Set endpoint: `https://mcp.srv992249.hstgr.cloud/sse`
4. The AI agent will automatically discover and use tools based on conversation context

## Example Use Cases

### Use Case 1: Customer Lookup
**User Query**: "Find information about John Smith"

**AI Agent Flow**:
1. Discovers `nowcerts_insured_getList` tool
2. Calls tool with `search: "John Smith"`
3. Returns customer information
4. AI formats response naturally

### Use Case 2: Create New Policy
**User Query**: "Create a new auto policy for Jane Doe"

**AI Agent Flow**:
1. Discovers `nowcerts_insured_insert` and `nowcerts_policy_insert`
2. Asks user for required details (if not provided)
3. Calls tools in sequence
4. Returns confirmation

### Use Case 3: VIN Decode and Quote
**User Query**: "Quote auto insurance for VIN 1HGBH41JXMN109186"

**AI Agent Flow**:
1. Discovers `nhtsa_decodeVin` tool
2. Decodes VIN to get vehicle details
3. Uses `nowcerts_quote_insert` with vehicle info
4. Returns quote information

## Tool Naming Convention

All tools follow this pattern:
- `nowcerts_<entity>_<action>` - NowCerts API tools
- `fenris_<action>` - Fenris API tools
- `smarty_<action>` - Smarty API tools
- `nhtsa_<action>` - NHTSA API tools
- `askkodiak_<action>` - AskKodiak API tools

## Common Tool Actions

- `getList` / `get<Entity>` - Retrieve records (paginated)
- `get` - Get single record by ID
- `insert` - Create new record
- `update` - Update existing record
- `delete` - Delete record
- `search` - Search with filters

## Error Handling

The MCP server returns errors in JSON-RPC format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Error description",
    "data": {
      "details": "Additional error information"
    }
  }
}
```

## Rate Limits & Considerations

- **NowCerts API**: No documented rate limits, but use reasonable pagination
- **Fenris API**: OAuth tokens cached for 1 hour for optimal performance
- **Smarty API**: Limited by your Smarty account plan
- **NHTSA API**: Public API, no authentication required

## Authentication

The MCP server handles all authentication automatically:
- NowCerts: OAuth 2.0 password grant with automatic token refresh
- Fenris: OAuth 2.0 client credentials with token caching
- Smarty: API key authentication
- NHTSA: No authentication (public API)
- AskKodiak: API key authentication

Your N8N agent doesn't need to worry about authentication - just call the tools!

## Monitoring & Logs

Check server health and logs:

```bash
# Health check
curl https://mcp.srv992249.hstgr.cloud/health

# View container logs
docker compose logs -f nowcerts-mcp

# Check container status
docker compose ps
```

## Troubleshooting

### Connection Issues
- Verify HTTPS endpoint is accessible: `curl https://mcp.srv992249.hstgr.cloud/health`
- Check container is running: `docker compose ps`
- View logs: `docker compose logs nowcerts-mcp`

### Tool Errors
- Check NowCerts credentials in `.env` file
- Verify external API credentials (Fenris, Smarty, AskKodiak)
- Review logs for specific error messages

### Performance
- Use pagination for large datasets (limit parameter)
- Fenris tokens are cached to minimize OAuth requests
- Server runs on Docker with auto-restart on failure

## Additional Resources

- **MCP Protocol Specification**: https://modelcontextprotocol.io
- **NowCerts API Documentation**: Contact NowCerts support
- **Full Tool List**: Run `./test-tool-discovery.sh`
- **Server Status**: https://mcp.srv992249.hstgr.cloud/health

## Support

For issues with:
- **MCP Server**: Check logs at `docker compose logs nowcerts-mcp`
- **NowCerts API**: Contact NowCerts support
- **External APIs**: Check respective API documentation
- **N8N Integration**: Refer to N8N's MCP documentation

## Security Notes

- Server uses HTTPS with Let's Encrypt SSL certificate
- All credentials stored in `.env` file on server (not exposed)
- API tokens handled server-side
- No credentials passed in tool calls
- Server runs in isolated Docker container
