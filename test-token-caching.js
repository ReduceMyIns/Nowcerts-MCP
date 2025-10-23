#!/usr/bin/env node

/**
 * Test Fenris token caching by making multiple calls
 * First call should get a new token (~30ms OAuth + API time)
 * Subsequent calls should use cached token (only API time, much faster)
 */

import { spawn } from 'child_process';

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

class TokenCacheTester {
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

      this.server.stderr.on('data', () => {});

      setTimeout(() => {
        if (!initialized) {
          this.sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'cache-tester', version: '1.0.0' }
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

  async callFenris() {
    const startTime = Date.now();
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.sendRequest('tools/call', {
        name: 'fenris_prefillHousehold',
        arguments: {
          firstName: 'Kyle',
          lastName: 'Murdock',
          dateOfBirth: '05/20/1970',
          address: '18595 Old Aldrin Highway',
          city: 'HIGHLANDS RANCH',
          state: 'CO',
          zip: '80126'
        }
      });
      setTimeout(() => {
        if (this.pendingResolve) {
          this.pendingResolve({ error: { message: 'Timeout' }});
        }
      }, 30000);
    }).then(response => {
      const responseTime = Date.now() - startTime;
      return { response, responseTime };
    });
  }

  async runTest() {
    console.log('='.repeat(60));
    console.log('FENRIS TOKEN CACHING TEST');
    console.log('='.repeat(60));
    console.log();

    console.log('Starting server...\n');
    await this.startServer();

    console.log('Making 3 Fenris API calls to test token caching:\n');

    // Call 1: Should get new token (slower)
    console.log('[Call 1] Getting household data (expects: NEW token)');
    const { response: r1, responseTime: t1 } = await this.callFenris();
    const status1 = r1.error ? '❌ FAILED' : '✅ SUCCESS';
    console.log(`  Result: ${status1} in ${t1}ms`);
    console.log(`  Expected: ~25-35ms (OAuth + API call)\n`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Call 2: Should use cached token (faster)
    console.log('[Call 2] Getting household data (expects: CACHED token)');
    const { response: r2, responseTime: t2 } = await this.callFenris();
    const status2 = r2.error ? '❌ FAILED' : '✅ SUCCESS';
    console.log(`  Result: ${status2} in ${t2}ms`);
    console.log(`  Expected: ~5-15ms (API call only, no OAuth)\n`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Call 3: Should still use cached token
    console.log('[Call 3] Getting household data (expects: CACHED token)');
    const { response: r3, responseTime: t3 } = await this.callFenris();
    const status3 = r3.error ? '❌ FAILED' : '✅ SUCCESS';
    console.log(`  Result: ${status3} in ${t3}ms`);
    console.log(`  Expected: ~5-15ms (API call only, no OAuth)\n`);

    // Analysis
    console.log('='.repeat(60));
    console.log('ANALYSIS');
    console.log('='.repeat(60));
    console.log();

    const allSuccess = !r1.error && !r2.error && !r3.error;

    if (allSuccess) {
      console.log(`Call 1 time: ${t1}ms (first call, gets new token)`);
      console.log(`Call 2 time: ${t2}ms (should be faster - uses cache)`);
      console.log(`Call 3 time: ${t3}ms (should be faster - uses cache)`);
      console.log();

      const avgCachedTime = (t2 + t3) / 2;
      const speedup = ((t1 - avgCachedTime) / t1 * 100).toFixed(1);

      if (t2 < t1 && t3 < t1) {
        console.log(`✅ TOKEN CACHING IS WORKING!`);
        console.log(`   Average speedup: ${speedup}% faster with cached token`);
        console.log(`   Time saved: ~${(t1 - avgCachedTime).toFixed(0)}ms per cached call`);
      } else {
        console.log(`⚠️  Caching may not be working as expected.`);
        console.log(`   Calls 2 & 3 should be significantly faster than call 1.`);
      }
    } else {
      console.log(`❌ Some calls failed. Check errors above.`);
    }

    console.log();
    console.log('='.repeat(60));

    if (this.server) {
      this.server.kill();
    }

    process.exit(0);
  }
}

const tester = new TokenCacheTester();
tester.runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
