#!/usr/bin/env node

/**
 * Simple test script for the NowCerts MCP Server
 * Tests the server by communicating via stdio
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
const serverPath = join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  env: {
    ...process.env,
    NOWCERTS_USERNAME: process.env.NOWCERTS_USERNAME || 'test-user',
    NOWCERTS_PASSWORD: process.env.NOWCERTS_PASSWORD || 'test-password',
  },
  stdio: ['pipe', 'pipe', 'pipe'],
});

let messageId = 1;

// Helper to send JSON-RPC requests
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: messageId++,
    method,
    params,
  };

  console.log('\n📤 Sending request:', JSON.stringify(request, null, 2));
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Handle server responses
let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer

  lines.forEach((line) => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('\n📥 Received response:', JSON.stringify(response, null, 2));

        // Count tools if this is a tools/list response
        if (response.result?.tools) {
          console.log(`\n✅ Found ${response.result.tools.length} tools!`);
          console.log('\nFirst 10 tools:');
          response.result.tools.slice(0, 10).forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
          });
        }
      } catch (e) {
        console.log('📄 Server output:', line);
      }
    }
  });
});

server.stderr.on('data', (data) => {
  console.log('ℹ️  Server log:', data.toString().trim());
});

server.on('close', (code) => {
  console.log(`\n🛑 Server exited with code ${code}`);
  process.exit(code);
});

// Handle errors
server.on('error', (err) => {
  console.error('❌ Error starting server:', err);
  process.exit(1);
});

// Wait a moment for server to start, then send test requests
setTimeout(() => {
  console.log('\n🧪 Starting tests...\n');

  // Test 1: Initialize
  console.log('Test 1: Initialize connection');
  sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0',
    },
  });

  // Test 2: List tools
  setTimeout(() => {
    console.log('\n\nTest 2: List available tools');
    sendRequest('tools/list');
  }, 1000);

  // Test 3: Try calling a tool (this will fail with test credentials but shows the flow)
  setTimeout(() => {
    console.log('\n\nTest 3: Call a tool (nowcerts_agent_getList)');
    sendRequest('tools/call', {
      name: 'nowcerts_agent_getList',
      arguments: {
        page: 1,
        per_page: 5,
      },
    });
  }, 2000);

  // Close after tests
  setTimeout(() => {
    console.log('\n\n✅ Tests complete! Closing server...');
    server.kill();
  }, 4000);
}, 500);
