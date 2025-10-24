const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

// Manually load .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
  });
  console.log('Loaded .env file, NOWCERTS_USERNAME:', process.env.NOWCERTS_USERNAME);
} else {
  console.error('.env file not found at:', envPath);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// Helper function to call MCP server
// ============================================================================

async function callMCP(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mcpPath = path.join(__dirname, 'dist', 'index.js');
    const mcp = spawn('node', [mcpPath], {
      env: process.env,
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';
    let requestSent = false;

    mcp.stdout.on('data', (data) => {
      stdout += data.toString();
      const lines = stdout.split('\n');

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            if (response.result !== undefined) {
              mcp.kill();
              resolve(response.result);
              return;
            } else if (response.error) {
              mcp.kill();
              reject(new Error(response.error.message || 'MCP error'));
              return;
            }
          } catch (e) {}
        }
      }
    });

    mcp.stderr.on('data', (data) => { stderr += data.toString(); });

    mcp.on('close', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`MCP exited: ${code} - ${stderr}`));
      }
    });

    mcp.on('error', (err) => {
      reject(new Error(`Failed to start MCP: ${err.message}`));
    });

    setTimeout(() => {
      if (!requestSent) {
        mcp.stdin.write(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: params
        }) + '\n');
        requestSent = true;
      }
    }, 100);

    setTimeout(() => {
      if (mcp.exitCode === null) {
        mcp.kill();
        reject(new Error('Timeout'));
      }
    }, 30000);
  });
}

// ============================================================================
// VAPI DYNAMIC FUNCTION DISCOVERY - The main solution!
// ============================================================================

// Convert MCP tool schema to OpenAI function format
function mcpToolToOpenAIFunction(tool) {
  return {
    name: tool.name,
    description: tool.description || 'No description provided',
    parameters: tool.inputSchema || {
      type: 'object',
      properties: {},
      required: []
    }
  };
}

// GET /vapi/functions - Returns ALL tools in OpenAI function format
// VAPI can call this once to discover all available functions dynamically
app.get('/vapi/functions', async (req, res) => {
  try {
    const result = await callMCP('tools/list');
    const tools = result.tools || [];

    // Convert all MCP tools to OpenAI function format
    const functions = tools.map(mcpToolToOpenAIFunction);

    res.json({
      success: true,
      count: functions.length,
      functions: functions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /vapi/call - Universal endpoint for VAPI to call ANY function
// This is your single endpoint that handles all 76+ tools
app.post('/vapi/call', async (req, res) => {
  try {
    const { name, arguments: args = {} } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Function name is required'
      });
    }

    console.log(`VAPI calling tool: ${name}`);

    const result = await callMCP('tools/call', { name, arguments: args });

    // Return in VAPI-friendly format
    res.json({
      success: true,
      function: name,
      result: result
    });

  } catch (error) {
    console.error(`VAPI call error for ${req.body.name}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// MCP SSE Transport - FOR CLAUDE DESKTOP ONLY
// ============================================================================

const sseClients = new Map();
let clientIdCounter = 0;

app.get('/sse', (req, res) => {
  const clientId = ++clientIdCounter;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  console.log(`SSE client ${clientId} connected`);

  const mcpPath = path.join(__dirname, 'dist', 'index.js');
  const mcp = spawn('node', [mcpPath], {
    env: process.env,
    cwd: __dirname
  });

  let messageBuffer = '';

  mcp.stdout.on('data', (data) => {
    messageBuffer += data.toString();
    const lines = messageBuffer.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          JSON.parse(line); // Validate
          res.write(`data: ${line}\n\n`);
        } catch (e) {
          console.error(`SSE ${clientId} invalid JSON:`, line.substring(0, 100));
        }
      }
    }
    messageBuffer = lines[lines.length - 1];
  });

  mcp.stderr.on('data', (data) => {
    console.error(`SSE ${clientId} stderr:`, data.toString());
  });

  mcp.on('close', (code) => {
    console.log(`SSE ${clientId} MCP exited: ${code}`);
    res.end();
    sseClients.delete(clientId);
  });

  mcp.on('error', (err) => {
    console.error(`SSE ${clientId} error:`, err);
    res.end();
    sseClients.delete(clientId);
  });

  sseClients.set(clientId, { res, mcp });

  req.on('close', () => {
    console.log(`SSE client ${clientId} disconnected`);
    mcp.kill();
    sseClients.delete(clientId);
  });

  res.write(': connected\n\n');
});

app.post('/message', (req, res) => {
  const message = req.body;
  const clients = Array.from(sseClients.values());

  if (clients.length === 0) {
    return res.status(503).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'No active MCP session' },
      id: message.id
    });
  }

  const { mcp } = clients[0];
  mcp.stdin.write(JSON.stringify(message) + '\n');
  res.status(202).json({ accepted: true });
});

// ============================================================================
// Standard REST API - FOR n8n and simple integrations
// ============================================================================

app.get('/tools', async (req, res) => {
  try {
    const result = await callMCP('tools/list');
    res.json({ success: true, tools: result.tools || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/call-tool', async (req, res) => {
  try {
    const { name, arguments: args = {} } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Tool name required' });
    }

    const result = await callMCP('tools/call', { name, arguments: args });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/info', async (req, res) => {
  try {
    const result = await callMCP('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'http-wrapper',
        version: '3.0.0'
      }
    });
    res.json({ success: true, info: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`MCP HTTP Wrapper v3.0 - READY`);
  console.log(`========================================\n`);

  console.log(`🎯 VAPI INTEGRATION (Dynamic Functions):`);
  console.log(`   Discover all functions:`);
  console.log(`   GET https://mcp.srv992249.hstgr.cloud/vapi/functions`);
  console.log(`   `);
  console.log(`   Call any function:`);
  console.log(`   POST https://mcp.srv992249.hstgr.cloud/vapi/call`);
  console.log(`   Body: {"name":"tool_name","arguments":{...}}\n`);

  console.log(`🤖 CLAUDE DESKTOP (Custom Connector):`);
  console.log(`   SSE URL: https://mcp.srv992249.hstgr.cloud/sse\n`);

  console.log(`🔧 STANDARD REST API (n8n, etc):`);
  console.log(`   List tools: GET https://mcp.srv992249.hstgr.cloud/tools`);
  console.log(`   Call tool: POST https://mcp.srv992249.hstgr.cloud/call-tool\n`);

  console.log(`✅ Health: https://mcp.srv992249.hstgr.cloud/health\n`);
  console.log(`========================================\n`);
});
