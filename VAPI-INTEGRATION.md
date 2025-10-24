# VAPI Integration Guide - Dynamic Function Discovery

## The Problem (Solved!)

❌ **Old way:** Manually create 76+ individual functions in VAPI
✅ **New way:** VAPI dynamically discovers and uses ALL tools with 2 endpoints

---

## How It Works

### Step 1: VAPI Discovers All Available Functions

VAPI calls this endpoint **once** to get all 76+ tools in OpenAI function format:

```bash
GET https://mcp.srv992249.hstgr.cloud/vapi/functions
```

**Response:**
```json
{
  "success": true,
  "count": 76,
  "functions": [
    {
      "name": "nowcerts_searchPolicies",
      "description": "Search for insurance policies in NowCerts",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query"
          }
        },
        "required": ["query"]
      }
    },
    {
      "name": "nowcerts_getPolicy",
      "description": "Get policy details by ID",
      "parameters": {...}
    },
    // ... 74 more tools
  ]
}
```

### Step 2: VAPI Calls Any Function

When the AI wants to use a function, VAPI calls this **single endpoint**:

```bash
POST https://mcp.srv992249.hstgr.cloud/vapi/call
Content-Type: application/json

{
  "name": "nowcerts_searchPolicies",
  "arguments": {
    "query": "John Smith"
  }
}
```

**Response:**
```json
{
  "success": true,
  "function": "nowcerts_searchPolicies",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 3 policies for John Smith..."
      }
    ]
  }
}
```

---

## VAPI Setup Options

### Option A: Custom Function Integration (Recommended)

If VAPI supports custom function endpoints:

1. **Function Discovery URL:**
   ```
   https://mcp.srv992249.hstgr.cloud/vapi/functions
   ```

2. **Function Call URL:**
   ```
   https://mcp.srv992249.hstgr.cloud/vapi/call
   ```

3. **Format:** OpenAI function calling format

This allows VAPI to automatically discover all 76 tools and use them without manual configuration.

---

### Option B: Manual Setup (If VAPI Doesn't Support Dynamic Discovery)

If VAPI requires manual function definitions, you can:

1. **Fetch the function list** (one-time):
   ```bash
   curl https://mcp.srv992249.hstgr.cloud/vapi/functions > functions.json
   ```

2. **Import to VAPI:** Copy the `functions` array into VAPI's function configuration

3. **Configure each function** to call:
   - URL: `https://mcp.srv992249.hstgr.cloud/vapi/call`
   - Method: POST
   - Body template:
     ```json
     {
       "name": "{{function_name}}",
       "arguments": {{function_arguments}}
     }
     ```

This still saves time - you get the OpenAI-formatted schema automatically instead of writing it manually.

---

### Option C: Server Action in VAPI

If VAPI has a "Server Action" or "Custom Action" feature:

1. **Create one Server Action** named "NowCerts MCP"

2. **Configure:**
   - URL: `https://mcp.srv992249.hstgr.cloud/vapi/call`
   - Method: POST
   - Dynamic parameters: `name` (function name), `arguments` (JSON object)

3. **Usage:** The AI can call any MCP tool through this single action

---

## Real Example: Voice Agent Flow

**User:** "What's the status of my policy?"

**VAPI Process:**
1. AI determines it needs to search policies
2. VAPI calls:
   ```json
   POST /vapi/call
   {
     "name": "nowcerts_searchPolicies",
     "arguments": {"query": "user's name from context"}
   }
   ```
3. Gets policy data
4. AI responds: "Your policy #12345 is active with a premium of $150/month"

**User:** "What carriers work with my business type?"

**VAPI Process:**
1. AI determines it needs carrier information
2. VAPI calls:
   ```json
   POST /vapi/call
   {
     "name": "askkodiak_getCarriers",
     "arguments": {}
   }
   ```
3. Gets list of 66 insurance carriers
4. AI responds: "Based on your business type, these carriers are available..."

---

## Testing the Integration

### Test 1: Discover Functions
```bash
curl https://mcp.srv992249.hstgr.cloud/vapi/functions | jq '.count'
# Should return: 76
```

### Test 2: Call a Function
```bash
curl -X POST https://mcp.srv992249.hstgr.cloud/vapi/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "askkodiak_getCarriers",
    "arguments": {}
  }' | jq '.success'
# Should return: true
```

### Test 3: Call with Arguments
```bash
curl -X POST https://mcp.srv992249.hstgr.cloud/vapi/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "nowcerts_searchPolicies",
    "arguments": {"query": "test"}
  }'
```

---

## Available Tool Categories

Your MCP server provides **76 tools** across these categories:

### NowCerts API (50+ tools)
- Policy management (search, get, create, update)
- Contact management
- Claims processing
- Document management
- Agency operations

### AskKodiak API (6 tools)
- `askkodiak_getCarriers` - List all insurance carriers
- `askkodiak_classifyBusiness` - Classify business risk
- `askkodiak_searchProducts` - Search insurance products
- `askkodiak_getProduct` - Get product details
- `askkodiak_getReferrals` - Get referral information
- `askkodiak_getAppetite` - Get carrier appetite

### SmartyStreets (if configured)
- Address validation and autocomplete

### Fenris (if configured)
- Additional integrations

---

## Benefits of This Approach

✅ **Zero manual configuration** - VAPI discovers all tools automatically
✅ **Always up to date** - New tools added to MCP are instantly available
✅ **One endpoint** - `/vapi/call` handles all 76 tools
✅ **OpenAI compatible** - Standard function calling format
✅ **Voice AI optimized** - Fast responses, low latency (same server as n8n)
✅ **Easy testing** - Simple curl commands to verify

---

## Troubleshooting

### "Function not found" error

Check available functions:
```bash
curl https://mcp.srv992249.hstgr.cloud/vapi/functions | jq '.functions[].name'
```

### "Invalid arguments" error

Check the required parameters:
```bash
curl https://mcp.srv992249.hstgr.cloud/vapi/functions | \
  jq '.functions[] | select(.name=="your_function_name") | .parameters'
```

### Timeout errors

The default timeout is 30 seconds. For slower operations, VAPI should handle this gracefully. Check logs:
```bash
# On your server
docker logs nowcerts-mcp-http -f
```

---

## Next Steps

1. **Update your server** with the new http-wrapper-vapi.cjs file
2. **Test the endpoints** using the curl commands above
3. **Configure VAPI** using one of the setup options
4. **Test with voice** - Try asking about policies, carriers, etc.

🎉 **You now have a universal MCP server that VAPI can use for ALL 76 tools without individual configuration!**
