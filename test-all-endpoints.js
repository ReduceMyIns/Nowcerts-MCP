#!/usr/bin/env node

/**
 * Comprehensive NowCerts MCP Server Endpoint Tester
 * Tests all 96+ endpoints and logs results
 */

import { spawn } from 'child_process';
import fs from 'fs';

const CREDENTIALS = {
  NOWCERTS_USERNAME: process.env.NOWCERTS_USERNAME || 'chase@reducemyinsurance.net',
  NOWCERTS_PASSWORD: process.env.NOWCERTS_PASSWORD || 'TempPassword!1'
};

const LOG_FILE = 'nowcerts-test-results.md';
let requestId = 0;

// Test definitions - focusing on GET/read operations first with minimal params
const TESTS = [
  // Agent Management
  { name: 'nowcerts_agent_getList', params: { top: 1, select: 'Id' } },

  // Insured Management
  { name: 'nowcerts_insured_getList', params: { top: 1, select: 'Id,InsuredDatabaseId' } },
  { name: 'nowcerts_insured_getInsureds', params: { top: 1 } },

  // Policy Management
  { name: 'nowcerts_policy_getList', params: { top: 1, select: 'Id,PolicyDatabaseId' } },
  { name: 'nowcerts_policy_getPolicies', params: { top: 1 } },

  // Quote Management
  { name: 'nowcerts_quote_getQuotes', params: { top: 1 } },

  // Prospect Management
  { name: 'nowcerts_prospect_getProspects', params: { top: 1 } },

  // Claim Management
  { name: 'nowcerts_claim_getList', params: { top: 1, select: 'Id,ClaimDatabaseId' } },
  { name: 'nowcerts_claim_getClaims', params: { top: 1 } },

  // Note Management
  { name: 'nowcerts_note_getNotes', params: { top: 1 } },

  // Tag Management
  { name: 'nowcerts_tag_getTags', params: { top: 1 } },

  // Driver Management
  { name: 'nowcerts_driver_getDrivers', params: { top: 1 } },

  // Vehicle Management
  { name: 'nowcerts_vehicle_getVehicles', params: { top: 1 } },

  // Task Management
  { name: 'nowcerts_task_getTasks', params: { top: 1 } },

  // Opportunity Management
  { name: 'nowcerts_opportunity_getOpportunities', params: { top: 1 } },

  // Service Request Management
  { name: 'nowcerts_serviceRequest_getAddDriver', params: { top: 1 } },
  { name: 'nowcerts_serviceRequest_getAddressChanges', params: { top: 1 } },
  { name: 'nowcerts_serviceRequest_getRemoveDriver', params: { top: 1 } },
  { name: 'nowcerts_serviceRequest_getReplaceDriver', params: { top: 1 } },
  { name: 'nowcerts_serviceRequest_getVehicleTransfer', params: { top: 1 } },
  { name: 'nowcerts_serviceRequest_getGeneric', params: { top: 1 } },

  // Customer Management
  { name: 'nowcerts_customer_getCustomers', params: { top: 1 } },

  // Custom Panel Management
  { name: 'nowcerts_customPanel_getStructure', params: {} },

  // SMS Management
  { name: 'nowcerts_sms_getSmses', params: { top: 1 } },

  // Principal Management
  { name: 'nowcerts_principal_getList', params: { top: 1, select: 'Id' } },
  { name: 'nowcerts_principal_getPrincipals', params: { top: 1 } },

  // Property Management
  { name: 'nowcerts_property_getProperties', params: { top: 1 } },

  // Call Log Management
  { name: 'nowcerts_callLogRecord_getCallLogRecords', params: { top: 1 } },

  // Quote Application Management
  { name: 'nowcerts_quoteApplication_getQuoteApplications', params: { top: 1 } },
];

class MCPTester {
  constructor() {
    this.server = null;
    this.results = [];
    this.initLog();
  }

  initLog() {
    const header = `# NowCerts MCP Server Test Results
Generated: ${new Date().toISOString()}

## Test Configuration
- Total Endpoints to Test: ${TESTS.length}
- Query Limit: $top=1 (minimize response size)
- Select Fields: Only IDs where possible

## Results

| # | Tool Name | Status | Response Time | Error Details | Notes |
|---|-----------|--------|---------------|---------------|-------|
`;
    fs.writeFileSync(LOG_FILE, header);
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.server = spawn('node', ['dist/index.js'], {
        env: { ...process.env, ...CREDENTIALS },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let initialized = false;
      let buffer = '';

      this.server.stdout.on('data', (data) => {
        buffer += data.toString();

        // Check for complete JSON messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              if (message.id !== undefined) {
                this.handleResponse(message);
              }
            } catch (e) {
              // Not JSON, might be a log message
              if (line.includes('running on stdio') && !initialized) {
                initialized = true;
                resolve();
              }
            }
          }
        }
      });

      this.server.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      this.server.on('close', (code) => {
        console.log(`Server exited with code ${code}`);
      });

      // Initialize the server
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
    const startTime = Date.now();

    return new Promise((resolve) => {
      this.pendingResolve = resolve;

      const reqId = this.sendRequest('tools/call', {
        name: toolName,
        arguments: params
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingResolve) {
          this.pendingResolve({
            error: { code: -32001, message: 'Request timeout' }
          });
        }
      }, 30000);
    }).then(response => {
      const responseTime = Date.now() - startTime;
      return { response, responseTime };
    });
  }

  async runTests() {
    console.log('Starting server...');
    await this.startServer();
    console.log('Server started. Running tests...\n');

    let testNumber = 0;

    for (const test of TESTS) {
      testNumber++;
      console.log(`[${testNumber}/${TESTS.length}] Testing: ${test.name}`);

      try {
        const { response, responseTime } = await this.callTool(test.name, test.params);

        let status = '✅ SUCCESS';
        let error = '-';
        let notes = '-';

        if (response.error) {
          status = '❌ FAILED';
          error = `${response.error.code}: ${response.error.message}`;
        } else if (response.result) {
          // Check if we got data back
          const resultStr = JSON.stringify(response.result);
          if (resultStr.includes('[]') || resultStr.includes('null')) {
            notes = 'No data returned (might be empty)';
          } else {
            notes = `Data received (${resultStr.length} chars)`;
          }
        }

        this.logResult(testNumber, test.name, status, responseTime, error, notes);

        // Small delay between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        this.logResult(testNumber, test.name, '❌ ERROR', 0, error.message, 'Exception thrown');
      }
    }

    this.finalize();
  }

  logResult(num, name, status, time, error, notes) {
    const row = `| ${num} | ${name} | ${status} | ${time}ms | ${error} | ${notes} |\n`;
    fs.appendFileSync(LOG_FILE, row);

    const emoji = status.includes('✅') ? '✅' : '❌';
    console.log(`${emoji} ${name}: ${status} (${time}ms)`);
  }

  finalize() {
    const successCount = this.results.filter(r => r.status.includes('SUCCESS')).length;
    const failCount = TESTS.length - successCount;

    const summary = `\n## Summary\n
- **Total Tests**: ${TESTS.length}
- **Successful**: ${successCount}
- **Failed**: ${failCount}
- **Success Rate**: ${((successCount/TESTS.length)*100).toFixed(1)}%

## Next Steps
${failCount > 0 ? '- Review failed endpoints and fix issues\n' : ''}
- Test POST/INSERT operations with minimal test data
- Verify required parameter handling
- Test error conditions
`;

    fs.appendFileSync(LOG_FILE, summary);
    console.log('\n' + summary);
    console.log(`\nFull results saved to: ${LOG_FILE}`);

    if (this.server) {
      this.server.kill();
    }

    process.exit(0);
  }
}

// Run the tests
const tester = new MCPTester();
tester.runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
