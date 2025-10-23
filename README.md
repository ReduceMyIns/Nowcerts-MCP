# NowCerts MCP Server

A comprehensive Model Context Protocol (MCP) server that provides AI assistants with access to all NowCerts API endpoints.

## Overview

This MCP server exposes 100+ NowCerts API endpoints plus external insurance data APIs as tools that can be used by AI assistants like Claude. It handles OAuth 2.0 authentication automatically and provides a seamless interface to the NowCerts insurance management platform, along with integrations for Fenris household data, Smarty address validation, and NHTSA vehicle information.

## Features

- **Complete API Coverage**: All 100+ NowCerts endpoints exposed as MCP tools
- **Automatic Authentication**: OAuth 2.0 password grant flow with automatic token refresh
- **25+ Entity Types**: Agents, Insureds, Policies, Claims, Prospects, Drivers, Vehicles, and more
- **External API Integrations**: Fenris household data, Smarty address validation, NHTSA vehicle data
- **Smart Token Caching**: Fenris OAuth tokens cached and auto-renewed (70% faster)
- **Type-Safe**: Built with TypeScript for reliability
- **Easy Integration**: Works with Claude Desktop and other MCP clients

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

### External API Integrations (5 tools)

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

#### NHTSA Vehicle Data (3 tools)
Query NHTSA database for vehicle specifications and recalls. **No credentials required** (public API).

- `nhtsa_decodeVin` - Decode VIN to get vehicle specifications
- `nhtsa_getRecallsByVin` - Get safety recalls for specific VIN
- `nhtsa_getRecallsByMake` - Get recalls by make, model, and year

**Features**:
- Complete vehicle specifications from VIN
- Safety recall information
- Make, model, and year details
- No authentication required

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
