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
// MCP SSE Transport for Claude Desktop Integration
// ============================================================================

// Store active SSE sessions
const sseClients = new Map();
let clientIdCounter = 0;

// SSE endpoint for MCP protocol
app.get('/sse', (req, res) => {
  const clientId = ++clientIdCounter;

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  console.log(`SSE client ${clientId} connected`);

  // Spawn persistent MCP server for this session
  const mcpPath = path.join(__dirname, 'dist', 'index.js');
  const mcp = spawn('node', [mcpPath], {
    env: process.env,
    cwd: __dirname
  });

  let messageBuffer = '';

  // Handle stdout from MCP server - send to SSE client
  mcp.stdout.on('data', (data) => {
    messageBuffer += data.toString();
    const lines = messageBuffer.split('\n');

    // Process all complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          // Validate it's valid JSON-RPC
          const message = JSON.parse(line);
          // Send as SSE event
          res.write(`data: ${line}\n\n`);
          console.log(`SSE ${clientId} -> Client:`, line.substring(0, 100));
        } catch (e) {
          console.error(`SSE ${clientId} invalid JSON:`, line.substring(0, 100));
        }
      }
    }

    // Keep the last incomplete line in buffer
    messageBuffer = lines[lines.length - 1];
  });

  mcp.stderr.on('data', (data) => {
    console.error(`SSE ${clientId} MCP stderr:`, data.toString());
  });

  mcp.on('close', (code) => {
    console.log(`SSE ${clientId} MCP process exited with code ${code}`);
    res.end();
    sseClients.delete(clientId);
  });

  mcp.on('error', (err) => {
    console.error(`SSE ${clientId} MCP error:`, err);
    res.end();
    sseClients.delete(clientId);
  });

  // Store client info
  sseClients.set(clientId, { res, mcp });

  // Handle client disconnect
  req.on('close', () => {
    console.log(`SSE client ${clientId} disconnected`);
    mcp.kill();
    sseClients.delete(clientId);
  });

  // Send initial connection confirmation
  res.write(': connected\n\n');
});

// POST endpoint to receive messages from SSE client
app.post('/message', (req, res) => {
  const message = req.body;

  console.log('Received message from client:', JSON.stringify(message).substring(0, 100));

  // For SSE, we need to route to the correct client's MCP process
  // In practice, with SSE each client maintains its own session
  // We'll use the first available client for simplicity
  // In production, you'd want session management via tokens/cookies

  const clients = Array.from(sseClients.values());
  if (clients.length === 0) {
    return res.status(503).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'No active MCP session' },
      id: message.id
    });
  }

  // Send to the MCP process
  const { mcp } = clients[0]; // Use first client for now
  mcp.stdin.write(JSON.stringify(message) + '\n');

  // For SSE, response comes via the SSE stream, not this response
  res.status(202).json({ accepted: true });
});

// ============================================================================
// REST API Endpoints (for VAPI and other integrations)
// ============================================================================

// Helper function to call MCP server (for REST API)
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

      // Try to parse each line as JSON-RPC response
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
          } catch (e) {
            // Not valid JSON yet, continue accumulating
          }
        }
      }
    });

    mcp.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    mcp.on('close', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`MCP process exited with code ${code}: ${stderr}`));
      }
    });

    mcp.on('error', (err) => {
      reject(new Error(`Failed to start MCP: ${err.message}`));
    });

    // Send JSON-RPC request after a short delay
    setTimeout(() => {
      if (!requestSent) {
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: params
        };
        mcp.stdin.write(JSON.stringify(request) + '\n');
        requestSent = true;
      }
    }, 100);

    // Timeout after 30 seconds
    setTimeout(() => {
      if (mcp.exitCode === null) {
        mcp.kill();
        reject(new Error('MCP request timeout'));
      }
    }, 30000);
  });
}

// List all available tools
app.get('/tools', async (req, res) => {
  try {
    const result = await callMCP('tools/list');
    res.json({ success: true, tools: result.tools || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Call a specific tool
app.post('/call-tool', async (req, res) => {
  try {
    const { name, arguments: args = {} } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Tool name is required' });
    }

    const result = await callMCP('tools/call', { name, arguments: args });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get server info
app.get('/info', async (req, res) => {
  try {
    const result = await callMCP('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'http-wrapper',
        version: '1.0.0'
      }
    });
    res.json({ success: true, info: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MCP HTTP Wrapper listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`MCP SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`MCP Message endpoint: POST http://localhost:${PORT}/message`);
  console.log(`REST API - List tools: http://localhost:${PORT}/tools`);
  console.log(`REST API - Call tool: POST http://localhost:${PORT}/call-tool`);
});
