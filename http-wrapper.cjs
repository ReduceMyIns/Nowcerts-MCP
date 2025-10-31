const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

// ============================================================================
// Configuration & Environment
// ============================================================================

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
  console.log('✅ Environment loaded successfully');
} else {
  console.error('❌ .env file not found at:', envPath);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Optional API key for security (set MCP_API_KEY in .env to enable)
const API_KEY = process.env.MCP_API_KEY;
const REQUIRE_AUTH = !!API_KEY;

// ============================================================================
// CORS Configuration for Browser Clients
// ============================================================================
// Enhanced CORS for MCP SuperAssistant and other browser-based MCP clients

const corsOptions = {
  origin: '*', // Allow all origins (can be restricted to specific domains)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-MCP-Session-Id'
  ],
  exposedHeaders: [
    'Content-Type',
    'Cache-Control',
    'X-MCP-Session-Id'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json());

// ============================================================================
// Authentication Middleware (Optional)
// ============================================================================

function authMiddleware(req, res, next) {
  if (!REQUIRE_AUTH) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const apiKey = authHeader?.replace('Bearer ', '');

  if (apiKey !== API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
  }

  next();
}

// ============================================================================
// MCP SSE Transport - PRIMARY INTERFACE (Universal Standard)
// ============================================================================
// This is used by:
// - VAPI (built-in MCP server tool)
// - Claude Desktop (custom connector)
// - n8n (MCP nodes)
// - Any MCP-compatible client
// ============================================================================

const sseClients = new Map();
let clientIdCounter = 0;

app.get('/sse', authMiddleware, (req, res) => {
  const clientId = ++clientIdCounter;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Additional CORS headers for browser clients (belt and suspenders)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Cache-Control');

  console.log(`[SSE:${clientId}] Client connected`);

  // Spawn MCP server process
  const mcpPath = path.join(__dirname, 'dist', 'index.js');
  const mcp = spawn('node', [mcpPath], {
    env: process.env,
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let messageBuffer = '';
  let isConnected = true;

  // Handle MCP stdout -> Send to SSE client
  mcp.stdout.on('data', (data) => {
    if (!isConnected) return;

    messageBuffer += data.toString();
    const lines = messageBuffer.split('\n');

    // Process complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          // Validate JSON-RPC
          JSON.parse(line);
          // Send as SSE event
          res.write(`data: ${line}\n\n`);
        } catch (e) {
          console.error(`[SSE:${clientId}] Invalid JSON:`, line.substring(0, 100));
        }
      }
    }

    // Keep incomplete line in buffer
    messageBuffer = lines[lines.length - 1];
  });

  mcp.stderr.on('data', (data) => {
    console.error(`[SSE:${clientId}] MCP stderr:`, data.toString().trim());
  });

  mcp.on('close', (code) => {
    console.log(`[SSE:${clientId}] MCP process exited with code ${code}`);
    if (isConnected) {
      res.end();
    }
    sseClients.delete(clientId);
  });

  mcp.on('error', (err) => {
    console.error(`[SSE:${clientId}] MCP error:`, err.message);
    if (isConnected) {
      res.end();
    }
    sseClients.delete(clientId);
  });

  // Store client
  sseClients.set(clientId, { res, mcp, isConnected: true });

  // Handle client disconnect
  req.on('close', () => {
    console.log(`[SSE:${clientId}] Client disconnected`);
    isConnected = false;
    const client = sseClients.get(clientId);
    if (client) {
      client.isConnected = false;
      client.mcp.kill();
    }
    sseClients.delete(clientId);
  });

  // Send connection confirmation
  res.write(': connected\n\n');
});

// POST endpoint for SSE clients to send messages
app.post('/message', authMiddleware, express.json(), (req, res) => {
  const message = req.body;

  // Find active SSE session
  // In production, you'd use session tokens to match client to MCP process
  // For now, we'll use the first available (single-user deployment)
  const clients = Array.from(sseClients.values()).filter(c => c.isConnected);

  if (clients.length === 0) {
    return res.status(503).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'No active MCP session. Connect to /sse first.'
      },
      id: message.id
    });
  }

  const { mcp } = clients[0];

  try {
    // Send JSON-RPC message to MCP process
    mcp.stdin.write(JSON.stringify(message) + '\n');
    // Response comes via SSE stream, not this endpoint
    res.status(202).json({ accepted: true });
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Failed to send message to MCP process'
      },
      id: message.id
    });
  }
});

// ============================================================================
// REST API Fallback - For non-MCP clients (OpenAI, simple webhooks, etc.)
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
          } catch (e) {
            // Continue accumulating
          }
        }
      }
    });

    mcp.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    mcp.on('close', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`MCP exited with code ${code}: ${stderr}`));
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
        reject(new Error('Request timeout (30s)'));
      }
    }, 30000);
  });
}

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sseClients: sseClients.size,
    authEnabled: REQUIRE_AUTH
  });
});

// List tools (with auth)
app.get('/tools', authMiddleware, async (req, res) => {
  try {
    const result = await callMCP('tools/list');
    res.json({
      success: true,
      tools: result.tools || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Call tool (with auth)
app.post('/call-tool', authMiddleware, async (req, res) => {
  try {
    const { name, arguments: args = {} } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Tool name is required'
      });
    }

    console.log(`[REST] Calling tool: ${name}`);

    const result = await callMCP('tools/call', { name, arguments: args });
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error(`[REST] Error calling ${req.body.name}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Server info
app.get('/info', authMiddleware, async (req, res) => {
  try {
    const result = await callMCP('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'mcp-http-wrapper',
        version: '3.1.0'
      }
    });
    res.json({
      success: true,
      serverInfo: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

function shutdown() {
  console.log('\n🛑 Shutting down gracefully...');

  // Close all SSE connections
  sseClients.forEach((client, id) => {
    console.log(`  Closing SSE client ${id}`);
    client.mcp.kill();
    if (client.isConnected) {
      client.res.end();
    }
  });

  sseClients.clear();

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 NowCerts MCP Server - Production v3.1');
  console.log('='.repeat(60) + '\n');

  console.log('🔐 Security:');
  console.log(`   Authentication: ${REQUIRE_AUTH ? '✅ ENABLED (API key required)' : '⚠️  DISABLED (set MCP_API_KEY in .env)'}\n`);

  console.log('📡 PRIMARY INTERFACE (MCP SSE - Universal):');
  console.log('   SSE Endpoint:     https://mcp.srv992249.hstgr.cloud/sse');
  console.log('   Message Endpoint: POST https://mcp.srv992249.hstgr.cloud/message');
  console.log('   Used by: VAPI, Claude Desktop, n8n MCP nodes, all MCP clients\n');

  console.log('🔧 FALLBACK REST API (Non-MCP clients):');
  console.log('   Health:    GET  https://mcp.srv992249.hstgr.cloud/health');
  console.log('   Tools:     GET  https://mcp.srv992249.hstgr.cloud/tools');
  console.log('   Call Tool: POST https://mcp.srv992249.hstgr.cloud/call-tool');
  console.log('   Info:      GET  https://mcp.srv992249.hstgr.cloud/info');
  console.log('   Used by: OpenAI, simple webhooks, custom integrations\n');

  console.log('💡 Quick Test:');
  console.log(`   curl https://mcp.srv992249.hstgr.cloud/health\n`);

  console.log('='.repeat(60) + '\n');
});
