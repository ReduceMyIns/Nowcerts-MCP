# NowCerts MCP Server

A comprehensive Model Context Protocol (MCP) server that provides AI assistants with access to all NowCerts API endpoints, plus integration templates for VAPI voice AI and N8N automation.

## Overview

This MCP server exposes 100+ NowCerts API endpoints plus external insurance data APIs as tools that can be used by AI assistants like Claude, VAPI voice agents, and N8N workflows. It handles OAuth 2.0 authentication automatically and provides a seamless interface to the NowCerts insurance management platform, along with integrations for Fenris household data, Smarty address validation, NHTSA vehicle information, and AskKodiak commercial insurance classification.

## Repository Structure

```
Nowcerts-MCP/
├── src/                    # MCP Server source code
│   └── index.ts           # Main server implementation
├── prompts/               # System prompts for AI assistants
│   ├── VAPI_SYSTEM_PROMPT.md         # Voice AI conversation guidelines
│   ├── VAPI_AGENCY_CONTEXT.md        # Agency-specific configuration
│   ├── N8N_SYSTEM_PROMPT.md          # Chat/SMS/Email AI guidelines
│   └── N8N_QUICK_REFERENCE.md        # Quick reference for workflows
├── examples/              # Example conversations and call flows
│   ├── VAPI_EXAMPLE_CALLS.md         # Voice call examples
│   └── N8N_EXAMPLE_CONVERSATION.md   # Chat conversation examples
├── scripts/               # Helper scripts and utilities
│   ├── create-vapi-assistant.js      # Create VAPI voice assistants
│   └── list-vapi-assistants.js       # List existing assistants
├── docs/                  # Documentation
│   ├── VAPI_INTEGRATION.md           # VAPI voice AI setup guide
│   ├── DEPLOYMENT_GUIDE.md           # Production deployment
│   ├── TOOL_DESCRIPTION.md           # MCP tool descriptions
│   └── VAPI_TOOL_DESCRIPTION.md      # VAPI-specific descriptions
├── dist/                  # Compiled JavaScript (generated)
└── README.md             # This file
```

## Features

### MCP Server
- **Complete API Coverage**: All 100+ NowCerts endpoints exposed as MCP tools
- **Automatic Authentication**: OAuth 2.0 password grant flow with automatic token refresh
- **129+ Lines of Business**: Dynamic discovery of all insurance products
- **80+ Insurance Carriers**: Dynamic carrier discovery and management
- **25+ Entity Types**: Agents, Insureds, Policies, Claims, Prospects, Drivers, Vehicles, and more
- **External API Integrations**: Fenris household data, Smarty address validation, NHTSA vehicle data, AskKodiak commercial classification
- **Smart Token Caching**: Fenris OAuth tokens cached and auto-renewed (70% faster)
- **Type-Safe**: Built with TypeScript for reliability
- **Multiple Transports**: Stdio (local), SSE (remote), HTTP (remote)

### AI Assistant Integrations
- **VAPI Voice AI**: Pre-built prompts and scripts for insurance quote phone calls
- **N8N Automation**: System prompts for chat, SMS, and email workflows
- **Conversational Design**: Natural language processing optimized for insurance workflows
- **Multi-Channel Support**: Phone, chat, SMS, and email using the same MCP tools

## Installation

### Prerequisites

- Node.js 20 or higher
- NowCerts API credentials (username and password)
- **Optional**: Fenris API credentials for household data prefill
- **Optional**: Smarty credentials for address validation
- **Optional**: NHTSA tools work without credentials (public API)

### Setup

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

## Configuration

### Environment Variables

#### Required for Basic Functionality

```bash
export NOWCERTS_USERNAME="your-username"
export NOWCERTS_PASSWORD="your-password"
```

#### Required for External API Integrations

For Fenris household data prefill functionality:
```bash
export FENRIS_CLIENT_ID="your-fenris-client-id"
export FENRIS_CLIENT_SECRET="your-fenris-client-secret"
```

For Smarty address verification:
```bash
export SMARTY_AUTH_ID="your-smarty-auth-id"
export SMARTY_AUTH_TOKEN="your-smarty-auth-token"
```

**Note**: External API credentials are optional. The server will work without them, but tools like `fenris_prefillHousehold` and `smarty_verifyAddress` will return errors if credentials are not provided.

### Claude Desktop Configuration

The server supports two modes of operation:

#### Option 1: Local Mode (Default - Stdio Transport)

Add the server to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "nowcerts": {
      "command": "node",
      "args": ["/absolute/path/to/Nowcerts-MCP/dist/index.js"],
      "env": {
        "NOWCERTS_USERNAME": "your-username",
        "NOWCERTS_PASSWORD": "your-password",
        "FENRIS_CLIENT_ID": "your-fenris-client-id",
        "FENRIS_CLIENT_SECRET": "your-fenris-client-secret",
        "SMARTY_AUTH_ID": "your-smarty-auth-id",
        "SMARTY_AUTH_TOKEN": "your-smarty-auth-token"
      }
    }
  }
}
```

#### Option 2: Remote Mode (SSE/HTTP Transport)

For remote access or when running the server on a different machine:

1. **Start the server in SSE mode:**

```bash
# Using the startup script (recommended)
./start-server.sh

# Or manually
USE_SSE=true PORT=3000 \
  NOWCERTS_USERNAME="your-username" \
  NOWCERTS_PASSWORD="your-password" \
  node dist/index.js
```

2. **Connect from Claude Desktop using Custom Connector:**

In Claude Desktop, use the "Custom Connector" feature with the SSE endpoint URL:
- Local: `http://localhost:3000/sse`
- Remote: `https://your-domain.com/sse`

3. **Docker deployment (recommended for production):**

For running alongside existing Docker services with automatic SSL:

```bash
# Quick deployment
./deploy.sh

# Or manual deployment
cp .env.example .env  # Edit and add your credentials
docker-compose up -d --build
```

See [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) for:
- Integration with existing reverse proxies (Traefik, nginx-proxy)
- Standalone deployment with systemd
- SSL/HTTPS configuration
- Multiple deployment options

4. **For production deployments without Docker:**

See [SSE_SERVER_SETUP.md](./SSE_SERVER_SETUP.md) for detailed instructions on:
- Reverse proxy configuration (nginx/caddy)
- SSL certificate setup
- Process management (PM2, systemd)
- Firewall and security considerations

5. **Test server (no credentials required):**

For testing the SSE connection without NowCerts credentials:

```bash
node test-sse.js
```

Then connect to `http://localhost:3000/sse` from Claude Desktop.

## Available Tools

The server provides 96+ tools organized by category:

### Agent Management (1 tool)
- `nowcerts_agent_getList` - Retrieve agents with search and pagination

### Insured Management (6 tools)
- `nowcerts_insured_getList` - Get paginated insureds list
- `nowcerts_insured_getInsureds` - Get insureds via Zapier endpoint
- `nowcerts_insured_insert` - Insert new insured
- `nowcerts_insured_insertNoOverride` - Insert without overriding
- `nowcerts_insured_insuredAndPoliciesInsert` - Insert insured with policies
- `nowcerts_insured_insertWithCustomFields` - Insert with custom fields

### Policy Management (4 tools)
- `nowcerts_policy_getList` - Get paginated policies list
- `nowcerts_policy_getPolicies` - Find policies with filters
- `nowcerts_policy_get` - Get specific policy
- `nowcerts_policy_insert` - Insert new policy

### Quote Management (2 tools)
- `nowcerts_quote_getQuotes` - Retrieve quotes
- `nowcerts_quote_insert` - Insert new quote

### Prospect Management (6 tools)
- `nowcerts_prospect_getProspects` - Get prospects
- `nowcerts_prospect_insert` - Insert new prospect
- `nowcerts_prospect_insertWithCustomFields` - Insert with custom fields
- `nowcerts_prospect_xmlPush` - Push prospects via XML
- `nowcerts_prospect_quoteRequestExternalImportWithProspect` - Import quote request with prospect
- `nowcerts_prospect_quoteRequestExternalImport` - Import external quote request

### Claim Management (3 tools)
- `nowcerts_claim_getList` - Get paginated claims
- `nowcerts_claim_getClaims` - Get claims via Zapier
- `nowcerts_claim_insert` - Insert new claim

### Note Management (2 tools)
- `nowcerts_note_getNotes` - Retrieve notes
- `nowcerts_note_insert` - Insert new note

### Tag Management (2 tools)
- `nowcerts_tag_getTags` - Get tags
- `nowcerts_tag_insert` - Apply/insert tag

### Driver Management (3 tools)
- `nowcerts_driver_getDrivers` - Get drivers
- `nowcerts_driver_insert` - Insert new driver
- `nowcerts_driver_bulkInsert` - Bulk insert drivers

### Vehicle Management (3 tools)
- `nowcerts_vehicle_getVehicles` - Get vehicles
- `nowcerts_vehicle_insert` - Insert new vehicle
- `nowcerts_vehicle_bulkInsert` - Bulk insert vehicles

### Task Management (2 tools)
- `nowcerts_task_getTasks` - Get tasks
- `nowcerts_task_insert` - Insert new task

### Opportunity Management (2 tools)
- `nowcerts_opportunity_getOpportunities` - Get opportunities
- `nowcerts_opportunity_insert` - Insert new opportunity

### Service Request Management (12 tools)
- `nowcerts_serviceRequest_getAddDriver` - Get add driver requests
- `nowcerts_serviceRequest_getAddressChanges` - Get address change requests
- `nowcerts_serviceRequest_getRemoveDriver` - Get remove driver requests
- `nowcerts_serviceRequest_getReplaceDriver` - Get replace driver requests
- `nowcerts_serviceRequest_getVehicleTransfer` - Get vehicle transfer requests
- `nowcerts_serviceRequest_getGeneric` - Get generic service requests
- `nowcerts_serviceRequest_insertAddDriver` - Insert add driver request
- `nowcerts_serviceRequest_insertAddressChanges` - Insert address change request
- `nowcerts_serviceRequest_insertRemoveDriver` - Insert remove driver request
- `nowcerts_serviceRequest_insertReplaceDriver` - Insert replace driver request
- `nowcerts_serviceRequest_insertVehicleTransfer` - Insert vehicle transfer request
- `nowcerts_serviceRequest_insertGeneric` - Insert generic service request

### Customer Management (1 tool)
- `nowcerts_customer_getCustomers` - Get customers with search

### Custom Panel Management (2 tools)
- `nowcerts_customPanel_getStructure` - Get custom panel structure
- `nowcerts_customPanel_insert` - Insert custom panel data

### SMS Management (3 tools)
- `nowcerts_sms_getSmses` - Get SMS messages
- `nowcerts_sms_insert` - Insert/send SMS
- `nowcerts_sms_twilio` - Send SMS via Twilio

### Principal Management (3 tools)
- `nowcerts_principal_getList` - Get paginated principals
- `nowcerts_principal_getPrincipals` - Get principals via Zapier
- `nowcerts_principal_insert` - Insert new principal

### Property Management (3 tools)
- `nowcerts_property_getProperties` - Get properties
- `nowcerts_property_insert` - Insert new property
- `nowcerts_property_insertOrUpdate` - Insert or update property

### Call Log Management (2 tools)
- `nowcerts_callLogRecord_getCallLogRecords` - Get call log records
- `nowcerts_callLogRecord_insert` - Insert call log record

### Workers Compensation (1 tool)
- `nowcerts_workersCompensation_insert` - Insert workers comp data

### Quote Application Management (3 tools)
- `nowcerts_quoteApplication_getQuoteApplications` - Get quote applications
- `nowcerts_quoteApplication_push` - Push quote applications
- `nowcerts_quoteApplication_quoteRushPush` - Push via QuoteRush

### Zapier Integration (2 tools)
- `nowcerts_zapier_subscribe` - Subscribe to webhook
- `nowcerts_zapier_unsubscribe` - Unsubscribe from webhook

### Third-Party Integrations (4 tools)
- `nowcerts_cognito_webHook` - Cognito webhook integration
- `nowcerts_cloudIt_processData` - CloudIt data processing
- `nowcerts_nationwide_callbackUrl` - Nationwide callback
- `nowcerts_agencyRevolution_activities` - Agency Revolution activities

### External API Integrations (11 tools)

#### Fenris Household Data (1 tool)
Prefill household and vehicle data from Fenris database. **Requires FENRIS_CLIENT_ID and FENRIS_CLIENT_SECRET**.

- `fenris_prefillHousehold` - Get household data including vehicles, drivers, and insurance info

**Features**:
- OAuth 2.0 authentication with automatic token caching (70% faster after first call)
- Complete household data: name, address, drivers, vehicles, current insurance
- Token automatically renews before expiration

#### Smarty Address Validation (1 tool)
Validate and standardize US addresses. **Requires SMARTY_AUTH_ID and SMARTY_AUTH_TOKEN**.

- `smarty_verifyAddress` - Validate address and get standardized components

**Features**:
- USPS-validated addresses
- Delivery point validation
- ZIP+4 code lookup
- Address standardization

#### NHTSA Vehicle Data (2 tools)
Query NHTSA database for vehicle specifications and recalls. **No credentials required** (public API).

- `nhtsa_decodeVin` - Decode VIN to get vehicle specifications
- `nhtsa_checkRecalls` - Get safety recalls for specific VIN

**Features**:
- Complete vehicle specifications from VIN
- Safety recall information
- Make, model, and year details
- No authentication required

#### AskKodiak Commercial Insurance (6 tools)
Commercial insurance risk classification and carrier eligibility. **Requires ASKKODIAK_GROUP_ID and ASKKODIAK_API_KEY**.

- `askkodiak_classifyBusiness` - Search for NAICS codes by business description or decode specific NAICS code
- `askkodiak_getEligibleCarriers` - Find insurance carriers/products for a business type (NAICS code)
- `askkodiak_getCarriers` - Get list of all available insurance carriers/companies
- `askkodiak_getCarrierProducts` - Get all products offered by a specific carrier
- `askkodiak_getApplicationQuestions` - Get application questions for a specific insurance product
- `askkodiak_getUnderwritingRules` - Get underwriting rules and guidelines for a product

**Features**:
- NAICS code classification for commercial risks
- Carrier appetite and eligibility determination
- Dynamic quote application questions (replaces static ACORD forms)
- Underwriting rules and guidelines
- Automated carrier selection based on business type
- Supports General Liability, BOP, Workers Comp, and all commercial lines

**Typical Workflow**:
1. Use `askkodiak_classifyBusiness` to get NAICS code from business description (e.g., "bakery" → NAICS 311811)
2. Use `askkodiak_getEligibleCarriers` to find which carriers write that business class
3. Use `askkodiak_getApplicationQuestions` to get product-specific application questions
4. Use `askkodiak_getUnderwritingRules` to pre-screen the risk before submission
5. Collect answers from customer and submit to carrier

**Benefits**:
- Replaces manual carrier appetite guides with real-time eligibility data
- Ensures correct business classification for accurate quoting
- Reduces application errors with structured, dynamic questionnaires
- Improves quote hit ratio by pre-screening risks against underwriting rules

## Usage Examples

Once configured in Claude Desktop, you can use natural language to interact with NowCerts:

### Example 1: Get Insureds
```
"Can you fetch all insureds created in the last 30 days?"
```

Claude will use the `nowcerts_insured_getList` tool with appropriate filters.

### Example 2: Create a New Prospect
```
"Create a new prospect with name 'John Doe', email 'john@example.com', and phone '555-1234'"
```

Claude will use the `nowcerts_prospect_insert` tool with the provided data.

### Example 3: Search Policies
```
"Find all auto policies that expire in the next 60 days"
```

Claude will use the `nowcerts_policy_getList` tool with date filters.

## AI Assistant Integrations

### VAPI Voice AI (Phone Calls)

Create voice AI assistants that can handle insurance quotes over the phone:

```bash
# Set your VAPI API key
export VAPI_API_KEY="your-vapi-private-key"

# Create a voice assistant
npm run create-vapi-assistant

# List existing assistants
npm run list-vapi-assistants
```

The voice assistant will:
- Answer inbound calls with natural conversation
- Gather customer information one question at a time
- Use Fenris to auto-discover vehicles at the address
- Provide multi-carrier insurance quotes
- Handle call transfers and appointment booking

**Full Documentation**: [docs/VAPI_INTEGRATION.md](./docs/VAPI_INTEGRATION.md)

**System Prompts**:
- [prompts/VAPI_SYSTEM_PROMPT.md](./prompts/VAPI_SYSTEM_PROMPT.md) - Voice conversation guidelines
- [prompts/VAPI_AGENCY_CONTEXT.md](./prompts/VAPI_AGENCY_CONTEXT.md) - Agency-specific configuration

**Examples**: [examples/VAPI_EXAMPLE_CALLS.md](./examples/VAPI_EXAMPLE_CALLS.md)

### N8N Automation (Chat/SMS/Email)

Use the system prompts in your N8N workflows for text-based conversations:

**System Prompts**:
- [prompts/N8N_SYSTEM_PROMPT.md](./prompts/N8N_SYSTEM_PROMPT.md) - Chat/SMS/Email guidelines
- [prompts/N8N_QUICK_REFERENCE.md](./prompts/N8N_QUICK_REFERENCE.md) - Quick reference

**Examples**: [examples/N8N_EXAMPLE_CONVERSATION.md](./examples/N8N_EXAMPLE_CONVERSATION.md)

Key differences from voice:
- Can show lists and formatting
- Users can scroll back through conversation
- Links and images are supported
- Responses can be longer

### Connecting to the MCP Server

All AI assistants (VAPI, N8N, Claude Desktop) connect to the same MCP server:

**Production URL**: `https://mcp.srv992249.hstgr.cloud/sse`

**For VAPI assistants**:
```json
{
  "tools": [
    {
      "type": "mcp",
      "server": {
        "url": "https://mcp.srv992249.hstgr.cloud/sse",
        "transport": "sse"
      }
    }
  ]
}
```

**For N8N workflows**: Use the MCP connector node (or custom HTTP requests to the MCP server)

**For Claude Desktop**: Add to `claude_desktop_config.json` (see Configuration section above)

## Development

### Build
```bash
npm run build
```

### Watch Mode (for development)
```bash
npm run watch
```

### Run Directly
```bash
npm run dev
```

## Architecture

The MCP server is built with:

- **@modelcontextprotocol/sdk**: Core MCP protocol implementation
- **axios**: HTTP client for API requests
- **TypeScript**: Type-safe implementation

### Key Components

1. **NowCertsClient**: Handles OAuth authentication and API requests
2. **Tool Definitions**: 96+ tool schemas defining inputs and outputs
3. **Endpoint Mapping**: Maps tool names to API endpoints
4. **Server Handler**: Processes tool requests and returns results

## Authentication Flow

1. Server reads credentials from environment variables
2. On first request, authenticates using OAuth password grant
3. Stores access token and refresh token
4. Automatically refreshes token when expired
5. Retries failed requests after token refresh

## Error Handling

The server provides detailed error messages including:
- Authentication failures
- API errors with response data
- Network issues
- Invalid tool parameters

## API Coverage

This server provides complete coverage of the NowCerts API plus external integrations:

- **100+ NowCerts endpoints**: Full coverage of insurance management platform
- **6 External API tools**: Fenris household data, Smarty validation, NHTSA vehicle data
- **25+ entity types**: Agents, Insureds, Policies, Claims, Prospects, Drivers, Vehicles, etc.
- **Full CRUD operations**: Create, Read, Update, Delete across all entity types
- **Advanced features**: Search, filtering, pagination, custom fields
- **Third-party integrations**: Cognito, CloudIt, Nationwide, Agency Revolution
- **Smart caching**: OAuth token caching for 70% faster external API calls

## License

MIT

## Support

For issues related to:
- **MCP Server**: Open an issue in this repository
- **NowCerts API**: Contact NowCerts support
- **Claude Desktop**: Visit Anthropic's documentation

## Related

- [NowCerts PHP SDK](../) - The underlying PHP SDK
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [Claude Desktop](https://claude.ai/download) - AI assistant with MCP support
