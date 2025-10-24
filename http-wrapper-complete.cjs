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
// REST API - FOR VAPI, n8n, OpenAI, and other AI models
// ============================================================================

// Helper function to call MCP server (non-streaming)
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

// List all available tools
app.get('/tools', async (req, res) => {
  try {
    const result = await callMCP('tools/list');
    res.json({ success: true, tools: result.tools || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Call a tool - Standard (non-streaming) response
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

// Call a tool - STREAMING response (for OpenAI, VAPI with streaming support)
app.post('/call-tool-stream', async (req, res) => {
  try {
    const { name, arguments: args = {} } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Tool name required' });
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Accel-Buffering', 'no');

    const mcpPath = path.join(__dirname, 'dist', 'index.js');
    const mcp = spawn('node', [mcpPath], {
      env: process.env,
      cwd: __dirname
    });

    let messageBuffer = '';
    let hasResponse = false;

    mcp.stdout.on('data', (data) => {
      messageBuffer += data.toString();
      const lines = messageBuffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line) {
          try {
            const response = JSON.parse(line);
            if (response.result !== undefined) {
              // Stream the result
              res.write(JSON.stringify({ success: true, result: response.result }));
              hasResponse = true;
              mcp.kill();
              res.end();
              return;
            } else if (response.error) {
              res.write(JSON.stringify({
                success: false,
                error: response.error.message || 'MCP error'
              }));
              hasResponse = true;
              mcp.kill();
              res.end();
              return;
            }
          } catch (e) {}
        }
      }
      messageBuffer = lines[lines.length - 1];
    });

    let stderr = '';
    mcp.stderr.on('data', (data) => { stderr += data.toString(); });

    mcp.on('close', (code) => {
      if (!hasResponse) {
        if (code !== 0) {
          res.write(JSON.stringify({
            success: false,
            error: `MCP exited: ${code} - ${stderr}`
          }));
        }
        res.end();
      }
    });

    mcp.on('error', (err) => {
      if (!hasResponse) {
        res.write(JSON.stringify({
          success: false,
          error: `Failed to start: ${err.message}`
        }));
        res.end();
      }
    });

    // Send the request
    setTimeout(() => {
      mcp.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name, arguments: args }
      }) + '\n');
    }, 100);

    // Timeout
    setTimeout(() => {
      if (mcp.exitCode === null) {
        mcp.kill();
        if (!hasResponse) {
          res.write(JSON.stringify({ success: false, error: 'Timeout' }));
          res.end();
        }
      }
    }, 30000);

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// OpenAI Function Calling Compatible Format
app.post('/openai/call-function', async (req, res) => {
  try {
    const { function_call } = req.body;

    if (!function_call || !function_call.name) {
      return res.status(400).json({
        error: { message: 'function_call.name required' }
      });
    }

    let args = {};
    if (function_call.arguments) {
      try {
        args = typeof function_call.arguments === 'string'
          ? JSON.parse(function_call.arguments)
          : function_call.arguments;
      } catch (e) {
        return res.status(400).json({
          error: { message: 'Invalid function arguments JSON' }
        });
      }
    }

    const result = await callMCP('tools/call', {
      name: function_call.name,
      arguments: args
    });

    // Return in OpenAI function response format
    res.json({
      role: 'function',
      name: function_call.name,
      content: JSON.stringify(result)
    });

  } catch (error) {
    res.status(500).json({
      error: { message: error.message }
    });
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
        version: '2.0.0'
      }
    });
    res.json({ success: true, info: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== MCP HTTP Wrapper v2.0 ===`);
  console.log(`Listening on port ${PORT}\n`);
  console.log(`FOR CLAUDE DESKTOP (SSE):`);
  console.log(`  SSE: https://mcp.srv992249.hstgr.cloud/sse`);
  console.log(`  Message: POST https://mcp.srv992249.hstgr.cloud/message\n`);
  console.log(`FOR VAPI, n8n, OpenAI, etc (REST):`);
  console.log(`  Health: GET https://mcp.srv992249.hstgr.cloud/health`);
  console.log(`  Tools: GET https://mcp.srv992249.hstgr.cloud/tools`);
  console.log(`  Call (standard): POST https://mcp.srv992249.hstgr.cloud/call-tool`);
  console.log(`  Call (streaming): POST https://mcp.srv992249.hstgr.cloud/call-tool-stream`);
  console.log(`  OpenAI format: POST https://mcp.srv992249.hstgr.cloud/openai/call-function\n`);
});
