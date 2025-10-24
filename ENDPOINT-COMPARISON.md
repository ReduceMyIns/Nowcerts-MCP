# Endpoint Comparison Guide

## Quick Answer: Which Endpoint Should I Use?

| **Client** | **Use This Endpoint** | **Why** |
|------------|----------------------|---------|
| **Claude Desktop/Web/Mobile** | `/sse` | Claude's "Add Custom Connector" requires SSE transport |
| **VAPI (voice AI)** | `/call-tool` | Standard REST API, fast, low latency |
| **n8n workflows** | `/call-tool` | Simple HTTP POST integration |
| **OpenAI GPT with functions** | `/openai/call-function` | Compatible with OpenAI's function calling format |
| **AI models that stream** | `/call-tool-stream` | Returns streaming responses |
| **Any HTTP client** | `/call-tool` | Standard REST API |

---

## The Three Approaches Explained

### 1. SSE (Server-Sent Events) - `/sse` endpoint

**What it is:**
- A persistent connection that stays open
- Server can push messages to client anytime
- Client sends messages via separate `/message` POST endpoint
- This is the **MCP protocol over HTTP**

**Who needs it:**
- **Claude Desktop/Web/Mobile ONLY** (via "Add Custom Connector")

**How it works:**
```javascript
// Client connects to SSE stream
GET https://mcp.srv992249.hstgr.cloud/sse

// Connection stays open, server sends events:
data: {"jsonrpc":"2.0","id":1,"result":{...}}

// Client sends requests to separate endpoint:
POST https://mcp.srv992249.hstgr.cloud/message
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{...}}
```

**Why it exists:**
- Claude Desktop needs bidirectional communication with MCP servers
- SSE + POST endpoint provides this (alternative to WebSocket)

---

### 2. REST API (Standard) - `/call-tool` endpoint

**What it is:**
- Simple HTTP POST request → wait → get complete response
- Connection closes after response
- One request = one response

**Who needs it:**
- **VAPI** (voice AI platform)
- **n8n** (workflow automation)
- **Most AI platforms** that call external APIs
- **Any standard HTTP client**

**How it works:**
```bash
POST https://mcp.srv992249.hstgr.cloud/call-tool
Content-Type: application/json

{
  "name": "nowcerts_searchPolicies",
  "arguments": {
    "query": "John Smith"
  }
}

# Response (after processing completes):
{
  "success": true,
  "result": {
    "content": [{ ... }]
  }
}
```

**Pros:**
- Simple, works everywhere
- Easy to debug with curl
- Low overhead

**Cons:**
- Client waits for entire response
- For long-running tools (>10 seconds), client might timeout

---

### 3. REST API (Streaming) - `/call-tool-stream` endpoint

**What it is:**
- HTTP POST with **chunked transfer encoding**
- Response starts streaming immediately
- Client gets data as soon as it's available
- Connection closes when complete

**Who needs it:**
- **OpenAI** (if you're using streaming function calls)
- **Any AI model** that supports streaming responses
- **Long-running tools** where you want progressive updates

**How it works:**
```bash
POST https://mcp.srv992249.hstgr.cloud/call-tool-stream
Content-Type: application/json

{
  "name": "nowcerts_searchPolicies",
  "arguments": {"query": "John"}
}

# Response streams as data becomes available:
{"success":true,"result":{"content":[{...first chunk...}
{...next chunk...}
{...final chunk...}]}}
```

**Pros:**
- Faster perceived response time
- Works with streaming-capable AI models
- Handles long-running operations better

**Cons:**
- Slightly more complex client code
- Not all HTTP clients support streaming well

---

### 4. OpenAI Format - `/openai/call-function` endpoint

**What it is:**
- REST API that speaks **OpenAI's function calling format**
- Converts between OpenAI format ↔ MCP format
- Returns responses in OpenAI-compatible structure

**Who needs it:**
- **OpenAI GPT models** using function calling
- **Any platform** that uses OpenAI's function calling standard

**How it works:**
```bash
POST https://mcp.srv992249.hstgr.cloud/openai/call-function
Content-Type: application/json

{
  "function_call": {
    "name": "nowcerts_searchPolicies",
    "arguments": "{\"query\":\"John Smith\"}"
  }
}

# Response in OpenAI format:
{
  "role": "function",
  "name": "nowcerts_searchPolicies",
  "content": "{\"content\":[{...}]}"
}
```

**When to use:**
- You're integrating with OpenAI's Assistants API
- Your platform expects OpenAI function calling format
- You want automatic format conversion

---

## Detailed Comparison

### SSE vs REST API

| Feature | SSE (`/sse`) | REST API (`/call-tool`) |
|---------|--------------|-------------------------|
| **Connection** | Persistent (stays open) | One-shot (closes after response) |
| **Protocol** | MCP over HTTP | Simple HTTP POST |
| **Use case** | Claude Desktop integration | VAPI, n8n, general API calls |
| **Bidirectional?** | Yes (via `/message` POST) | No (request → response only) |
| **Overhead** | Higher (persistent connection) | Lower (quick request/response) |
| **Complexity** | More complex | Simple |

### Standard vs Streaming REST API

| Feature | `/call-tool` | `/call-tool-stream` |
|---------|--------------|---------------------|
| **Response delivery** | Wait for complete result | Stream chunks as available |
| **Best for** | Fast tools (<2 seconds) | Slow tools (>5 seconds) |
| **Client complexity** | Simple | Moderate |
| **Timeout handling** | Client might timeout on slow tools | Keeps connection alive |
| **OpenAI/VAPI support** | ✅ Yes (standard) | ⚠️  Depends (check if they support streaming) |

---

## Real-World Examples

### Example 1: VAPI Voice Agent

**Scenario:** Voice caller asks "What's the status of John Smith's policy?"

**Use:** `/call-tool` (standard REST)

**Why:** VAPI needs fast, simple responses. Voice AI can't stream to user anyway.

```bash
POST /call-tool
{
  "name": "nowcerts_searchPolicies",
  "arguments": {"query": "John Smith"}
}
```

---

### Example 2: Claude Desktop User

**Scenario:** User adds your server via "Add Custom Connector" in Claude settings

**Use:** `/sse` endpoint

**Why:** Claude Desktop requires MCP protocol, which uses SSE transport over HTTP

**Configuration:**
```json
{
  "url": "https://mcp.srv992249.hstgr.cloud/sse"
}
```

---

### Example 3: n8n Workflow

**Scenario:** Automated workflow that searches policies daily and emails results

**Use:** `/call-tool` (standard REST)

**Why:** n8n HTTP Request node works great with simple POST endpoints

**n8n HTTP Node Setup:**
- Method: POST
- URL: `https://mcp.srv992249.hstgr.cloud/call-tool`
- Body: `{"name":"nowcerts_searchPolicies","arguments":{"query":""}}`

---

### Example 4: OpenAI Assistant with Function Calling

**Scenario:** GPT-4 assistant that needs to look up NowCerts data

**Use:** `/openai/call-function`

**Why:** Automatic format conversion between OpenAI ↔ MCP

**OpenAI API Call:**
```python
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[...],
    functions=[{
        "name": "nowcerts_searchPolicies",
        "description": "Search for insurance policies",
        "parameters": {...}
    }],
    function_call="auto"
)

# If GPT wants to call function:
function_response = requests.post(
    "https://mcp.srv992249.hstgr.cloud/openai/call-function",
    json={"function_call": response.choices[0].message.function_call}
)
```

---

## Summary

**Most Common Use Cases:**

1. **Claude Desktop** → Use `/sse`
2. **VAPI/n8n/Simple integrations** → Use `/call-tool`
3. **OpenAI function calling** → Use `/openai/call-function`
4. **Slow operations with streaming** → Use `/call-tool-stream`

**The current deployment supports ALL of these simultaneously!** Just use the endpoint that matches your client.
