#!/usr/bin/env node

/**
 * Get detailed Fenris response to use for POST endpoint testing
 */

import { spawn } from 'child_process';
import fs from 'fs';

const CREDENTIALS = {
  NOWCERTS_USERNAME: process.env.NOWCERTS_USERNAME,
  NOWCERTS_PASSWORD: process.env.NOWCERTS_PASSWORD,
  FENRIS_CLIENT_ID: process.env.FENRIS_CLIENT_ID,
  FENRIS_CLIENT_SECRET: process.env.FENRIS_CLIENT_SECRET,
};

// Validate required environment variables
if (!CREDENTIALS.NOWCERTS_USERNAME || !CREDENTIALS.NOWCERTS_PASSWORD) {
  console.error('Error: NOWCERTS_USERNAME and NOWCERTS_PASSWORD environment variables are required');
  process.exit(1);
}
if (!CREDENTIALS.FENRIS_CLIENT_ID || !CREDENTIALS.FENRIS_CLIENT_SECRET) {
  console.error('Error: FENRIS_CLIENT_ID and FENRIS_CLIENT_SECRET environment variables are required');
  process.exit(1);
}

let requestId = 0;

class MCPTester {
  constructor() {
    this.server = null;
  }

  async startServer() {
    return new Promise((resolve) => {
      this.server = spawn('node', ['dist/index.js'], {
        env: { ...process.env, ...CREDENTIALS },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let initialized = false;
      let buffer = '';

      this.server.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              if (message.id !== undefined) {
                this.handleResponse(message);
              }
            } catch (e) {
              if (line.includes('running on stdio') && !initialized) {
                initialized = true;
                resolve();
              }
            }
          }
        }
      });

      setTimeout(() => {
        if (!initialized) {
          this.sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-runner', version: '1.0.0' }
          });
          setTimeout(() => resolve(), 2000);
        }
      }, 1000);
    });
  }

  sendRequest(method, params) {
    const request = {
      jsonrpc: '2.0',
      id: requestId++,
      method,
      params
    };
    this.server.stdin.write(JSON.stringify(request) + '\n');
    return request.id;
  }

  handleResponse(message) {
    if (this.pendingResolve) {
      this.pendingResolve(message);
      this.pendingResolve = null;
    }
  }

  async callTool(toolName, params) {
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.sendRequest('tools/call', {
        name: toolName,
        arguments: params
      });
      setTimeout(() => {
        if (this.pendingResolve) {
          this.pendingResolve({
            error: { code: -32001, message: 'Request timeout' }
          });
        }
      }, 30000);
    });
  }

  async test() {
    console.log('Starting server...');
    await this.startServer();
    console.log('Server started. Calling Fenris API...\n');

    const response = await this.callTool('fenris_prefillHousehold', {
      firstName: 'Alia',
      lastName: 'Gabriel',
      dateOfBirth: '10/19/1996',
      address: '620 Navigation Blvd',
      city: 'NEW CASTLE',
      state: 'DE',
      zip: '19720'
    });

    if (response.error) {
      console.log('ERROR:', response.error.message);
    } else if (response.result) {
      const resultText = response.result.content[0].text;
      console.log('SUCCESS! Fenris returned data:\n');
      console.log(resultText);

      fs.writeFileSync('fenris-response.json', resultText);
      console.log('\nFull response saved to: fenris-response.json');
    }

    if (this.server) {
      this.server.kill();
    }

    process.exit(0);
  }
}

const tester = new MCPTester();
tester.test().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
