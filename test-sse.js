#!/usr/bin/env node

// Simple test server to verify SSE transport works
// This doesn't require NowCerts credentials

import express from 'express';
import { randomUUID } from 'node:crypto';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Create a simple MCP server for testing
const server = new Server(
  {
    name: "test-nowcerts-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Add a simple test tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "test_connection",
      description: "Test the MCP server connection - returns current server time and status",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "echo",
      description: "Echo back a message to test tool execution",
      inputSchema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The message to echo back",
          },
        },
        required: ["message"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name: toolName, arguments: args } = request.params;

  if (toolName === "test_connection") {
    return {
      content: [
        {
          type: "text",
          text: `MCP Server Test Connection Successful!\n\nServer Time: ${new Date().toISOString()}\nServer Version: 1.0.0\nTransport: SSE/HTTP\nStatus: Running\n\nThe NowCerts MCP server is working correctly. You can now configure your API credentials and restart with the full server.`,
        },
      ],
    };
  }

  if (toolName === "echo") {
    const message = args?.message || "No message provided";
    return {
      content: [
        {
          type: "text",
          text: `Echo: ${message}`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${toolName}`);
});

// Create Express app
const app = express();
app.use(express.json());

// Store transports by session ID
const transports = {};

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// SSE endpoint - POST for messages
app.post('/sse', async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /sse - Received request`);
  try {
    const sessionId = req.headers['mcp-session-id'];
    let transport;

    if (sessionId && transports[sessionId]) {
      console.log(`[${new Date().toISOString()}] Using existing session: ${sessionId}`);
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      console.log(`[${new Date().toISOString()}] Creating new session`);
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: sessionId => {
          console.log(`[${new Date().toISOString()}] Session initialized: ${sessionId}`);
          transports[sessionId] = transport;
        }
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      console.log(`[${new Date().toISOString()}] Invalid request - no session ID`);
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided'
        },
        id: null
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error: ' + error.message
        },
        id: null
      });
    }
  }
});

// SSE endpoint - GET for SSE stream
app.get('/sse', async (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /sse - Establishing SSE stream`);
  const sessionId = req.headers['mcp-session-id'];

  if (!sessionId || !transports[sessionId]) {
    console.log(`[${new Date().toISOString()}] Invalid session ID: ${sessionId}`);
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  console.log(`[${new Date().toISOString()}] Establishing SSE stream for session: ${sessionId}`);
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /health`);
  res.json({
    status: 'ok',
    service: 'test-nowcerts-mcp-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sessions: Object.keys(transports).length
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'NowCerts MCP Test Server',
    version: '1.0.0',
    endpoints: {
      sse: '/sse (POST/GET) - MCP SSE endpoint',
      health: '/health (GET) - Health check'
    },
    status: 'running'
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`NowCerts MCP Test Server`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Port: ${PORT}`);
  console.log('='.repeat(60));
  console.log(`SSE endpoint:    http://localhost:${PORT}/sse`);
  console.log(`Health check:    http://localhost:${PORT}/health`);
  console.log(`Root:            http://localhost:${PORT}/`);
  console.log('='.repeat(60));
  console.log('Server is ready to accept connections');
  console.log('Press Ctrl+C to stop');
  console.log('='.repeat(60));
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('\n' + '='.repeat(60));
  console.log('Shutting down server...');
  for (const sessionId in transports) {
    try {
      console.log(`Closing session: ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }
  console.log('Server shutdown complete');
  console.log('='.repeat(60));
  process.exit(0);
});
