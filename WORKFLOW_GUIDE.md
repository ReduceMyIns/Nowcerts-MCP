# NowCerts MCP Server - LLM Workflow Guide

This guide provides comprehensive instructions for AI assistants (LLMs) on how to use the NowCerts MCP tools effectively.

---

## Table of Contents

1. [Tool Categories](#tool-categories)
2. [Common Workflows](#common-workflows)
3. [External API Integration](#external-api-integration)
4. [Best Practices](#best-practices)
5. [Error Handling](#error-handling)
6. [Complete Use Case Examples](#complete-use-case-examples)

---

## Tool Categories

The NowCerts MCP Server provides 100+ tools organized into these categories:

### Core NowCerts Operations

#### Read Operations (GET)
- **Agent**: `nowcerts_agent_getList`
- **Insured**: `nowcerts_insured_getList`, `nowcerts_insured_getInsureds`
- **Policy**: `nowcerts_policy_getList`, `nowcerts_policy_getPolicies`, `nowcerts_policy_get`
- **Quote**: `nowcerts_quote_getQuotes`
- **Prospect**: `nowcerts_prospect_getProspects`
- **Claim**: `nowcerts_claim_getList`, `nowcerts_claim_getClaims`
- **Note**: `nowcerts_note_getNotes`
- **Tag**: `nowcerts_tag_getTags`
- **Driver**: `nowcerts_driver_getDrivers`
- **Vehicle**: `nowcerts_vehicle_getVehicles`
- **Task**: `nowcerts_task_getTasks`
- **Opportunity**: `nowcerts_opportunity_getOpportunities`
- **Customer**: `nowcerts_customer_getCustomers`
- **Principal**: `nowcerts_principal_getList`, `nowcerts_principal_getPrincipals`
- **Property**: `nowcerts_property_getProperties`
- **SMS**: `nowcerts_sms_getSmses`
- **Call Log**: `nowcerts_callLogRecord_getCallLogRecords`
- **Quote Applications**: `nowcerts_quoteApplication_getQuoteApplications`
- **Service Requests**: 6 GET tools for various service request types

#### Write Operations (POST/INSERT)
- **Insured**: 4 insert variations
- **Policy**: `nowcerts_policy_insert`
- **Quote**: `nowcerts_quote_insert`
- **Prospect**: 5 insert variations
- **Claim**: `nowcerts_claim_insert`
- **Note**: `nowcerts_note_insert`
- **Tag**: `nowcerts_tag_insert`
- **Driver**: `nowcerts_driver_insert`, `nowcerts_driver_bulkInsert`
- **Vehicle**: `nowcerts_vehicle_insert`, `nowcerts_vehicle_bulkInsert`
- **Task**: `nowcerts_task_insert`
- **Opportunity**: `nowcerts_opportunity_insert`
- **Principal**: `nowcerts_principal_insert`
- **Property**: `nowcerts_property_insert`, `nowcerts_property_insertOrUpdate`
- **SMS**: `nowcerts_sms_insert`, `nowcerts_sms_twilio`
- **Call Log**: `nowcerts_callLogRecord_insert`
- **Workers Comp**: `nowcerts_workersCompensation_insert`
- **Custom Panel**: `nowcerts_customPanel_insert`
- **Quote Applications**: 2 push tools
- **Service Requests**: 6 INSERT tools for various service request types
- **Zapier**: `nowcerts_zapier_subscribe`, `nowcerts_zapier_unsubscribe`

### External API Tools

#### Fenris Auto Insurance Prefill
- **Tool**: `fenris_prefillHousehold`
- **Purpose**: Get comprehensive household data (vehicles, drivers, property)
- **Use**: BEFORE creating prospects/insureds to pre-populate data
- **Returns**: JSON with vehicles[], drivers[], property{}

#### Smarty Address Verification
- **Tool**: `smarty_verifyAddress`
- **Purpose**: Validate and standardize addresses
- **Use**: When creating/updating records with addresses
- **Returns**: Standardized address with USPS validation

#### NHTSA VIN Decoder (Free)
- **Tool**: `nhtsa_decodeVin`
- **Purpose**: Get vehicle details from VIN
- **Use**: When you have a VIN but need make/model/year
- **Returns**: Comprehensive vehicle specifications

#### NHTSA Recalls Check (Free)
- **Tool**: `nhtsa_checkRecalls`
- **Purpose**: Check for safety recalls
- **Use**: Vehicle safety verification
- **Returns**: List of open recalls (if any)

---

## Common Workflows

### Workflow 1: Create New Prospect with Full Details

**Goal**: Create a new prospect with all associated data from external sources

**Steps**:

```markdown
1. Get household data from Fenris
   → Tool: fenris_prefillHousehold
   → Input: firstName, lastName, dateOfBirth, address, city, state, zip
   → Output: vehicles[], drivers[], property{}

2. Verify address with Smarty
   → Tool: smarty_verifyAddress
   → Input: street, city, state, zipCode
   → Output: Standardized address

3. Create prospect in NowCerts
   → Tool: nowcerts_prospect_insert
   → Input: Use data from steps 1-2
   → Output: ProspectId/DatabaseId

4. Add vehicles from Fenris data
   → Tool: nowcerts_vehicle_insert (call for each vehicle)
   → Input: InsuredDatabaseId + vehicle data from step 1
   → Repeat: For each vehicle in Fenris response

5. Add drivers from Fenris data
   → Tool: nowcerts_driver_insert (call for each driver)
   → Input: InsuredDatabaseId + driver data from step 1
   → Repeat: For each driver in Fenris response

6. Add property information
   → Tool: nowcerts_property_insert
   → Input: InsuredDatabaseId + property data from step 1

7. Add tracking note
   → Tool: nowcerts_note_insert
   → Input: InsuredDatabaseId + descriptive note

8. Add tag for organization
   → Tool: nowcerts_tag_insert
   → Input: InsuredDatabaseId + tag name
```

**Example**:
```
User: "Create a new prospect for Kyle Murdock, DOB 05/20/1970, at 18595 Old Aldrin Highway, Highlands Ranch, CO 80126. Get all his household information and add it to NowCerts."

Assistant Response:
1. ✅ Called fenris_prefillHousehold → Got 2 vehicles, 2 drivers, property data
2. ✅ Called smarty_verifyAddress → Validated address
3. ✅ Called nowcerts_prospect_insert → Created prospect (ID: abc123)
4. ✅ Called nowcerts_vehicle_insert (2x) → Added both vehicles
5. ✅ Called nowcerts_driver_insert (2x) → Added both drivers
6. ✅ Called nowcerts_property_insert → Added property
7. ✅ Called nowcerts_note_insert → Added note
8. ✅ Called nowcerts_tag_insert → Tagged as "Fenris-Prefilled"

Result: Complete prospect created with all household data!```

---

### Workflow 2: Quote Renewal with Updated Information

**Goal**: Update existing insured's information for renewal

**Steps**:

1. Search for existing insured
   → Tool: nowcerts_insured_getList or nowcerts_customer_getCustomers
   → Input: Search parameters (name, email, etc.)
   → Output: Insured list with IDs

2. Get current policy details
   → Tool: nowcerts_policy_getList or nowcerts_policy_get
   → Input: InsuredDatabaseId or PolicyId
   → Output: Current policy information

3. Check for household changes via Fenris
   → Tool: fenris_prefillHousehold
   → Input: Insured's current information
   → Output: Updated household data

4. Update vehicles if changed
   → Tool: nowcerts_vehicle_getVehicles (check current)
   → Tool: nowcerts_vehicle_insert (add new vehicles)
   → Compare Fenris data with current data

5. Update drivers if changed
   → Similar process with driver tools

6. Create renewal quote
   → Tool: nowcerts_quote_insert
   → Input: Updated information

7. Add renewal note
   → Tool: nowcerts_note_insert
   → Document changes found

---

### Workflow 3: VIN Lookup and Vehicle Addition

**Goal**: Add a vehicle using just the VIN

**Steps**:

1. Decode VIN
   → Tool: nhtsa_decodeVin
   → Input: 17-character VIN
   → Output: Year, Make, Model, Trim, etc.

2. Check for recalls
   → Tool: nhtsa_checkRecalls
   → Input: VIN (or make/model/year from step 1)
   → Output: Open recalls list

3. Add vehicle to NowCerts
   → Tool: nowcerts_vehicle_insert
   → Input: InsuredDatabaseId + VIN + data from step 1

4. Add note about recalls (if any)
   → Tool: nowcerts_note_insert
   → Document any recalls found

---

### Workflow 4: Bulk Customer Search and Analysis

**Goal**: Find and analyze customers meeting specific criteria

**Steps**:

1. Search customers
   → Tool: nowcerts_customer_getCustomers
   → Input: Search criteria (use $filter for OData queries)
   → Output: Customer list

2. For each customer, get policies
   → Tool: nowcerts_policy_getList
   → Input: InsuredDatabaseId
   → Use $filter parameter: `InsuredDatabaseId eq 'abc123'`

3. Check expiration dates
   → Parse policy data from step 2
   → Identify policies expiring soon

4. Create tasks for follow-up
   → Tool: nowcerts_task_insert
   → For each expiring policy

---

## External API Integration

### Fenris Prefill API

**Authentication**: OAuth 2.0 Client Credentials (Basic Auth)
**Environment Variables Required**:
- `FENRIS_CLIENT_ID`
- `FENRIS_CLIENT_SECRET`

**Input Format**:
```json
{
  "firstName": "Kyle",
  "lastName": "Murdock",
  "dateOfBirth": "05/20/1970",  // MM/DD/YYYY format
  "address": "18595 Old Aldrin Highway",
  "city": "HIGHLANDS RANCH",
  "state": "CO",
  "zip": "80126"
}
```

**Response Structure** (varies, but typically):
```json
{
  "vehicles": [
    {
      "vin": "1HGCM82633A123456",
      "year": 2020,
      "make": "Honda",
      "model": "Accord"
    }
  ],
  "drivers": [
    {
      "firstName": "Kyle",
      "lastName": "Murdock",
      "dateOfBirth": "05/20/1970",
      "licenseNumber": "CO123456"
    }
  ],
  "property": {
    "yearBuilt": 1995,
    "squareFeet": 2400
  }
}
```

**When to Use**:
- Creating new prospects/insureds
- Annual policy reviews
- Quote renewals
- Any time you need complete household data

**Important**: Always use this FIRST before creating new records to minimize data entry.

---

### Smarty Address Verification

**Authentication**: Auth ID + Auth Token
**Environment Variables Required**:
- `SMARTY_AUTH_ID`
- `SMARTY_AUTH_TOKEN`

**Input Format**:
```json
{
  "street": "123 Main Street",
  "city": "Anytown",
  "state": "TN",
  "zipCode": "37000"
}
```

**Response**: Standardized, USPS-validated address

**When to Use**:
- Before creating/updating any record with an address
- When user-provided address needs validation
- To ensure consistent address formatting

---

### NHTSA APIs (Free - No Credentials Needed)

#### VIN Decoder

**Input**: 17-character VIN (optional modelYear)

**Returns**:
- Year, Make, Model, Trim
- Body Style, Engine info
- Plant information
- And 100+ other vehicle specifications

**When to Use**:
- User provides VIN but no other vehicle info
- Need to verify vehicle details
- Auto-populating vehicle information

#### Recalls Check

**Input**: VIN or Make/Model/Year

**Returns**: List of open safety recalls

**When to Use**:
- Adding new vehicles
- Annual reviews
- Customer service inquiries about recalls
- Demonstrating value-add service

---

## Best Practices

### 1. Always Start with Search

Before creating new records, search to avoid duplicates:

```
❌ BAD: Immediately create new prospect
✅ GOOD: Search first with nowcerts_customer_getCustomers
```

### 2. Use Query Parameters Efficiently

All GET tools support OData query parameters:
- `$top=10` - Limit results
- `$skip=20` - Pagination
- `$filter=FirstName eq 'John'` - Filter results
- `$select=Id,FirstName,LastName` - Select specific fields
- `$orderby=CreatedDate desc` - Sort results

**Example**:
```json
{
  "top": 10,
  "filter": "State eq 'CO' and CreatedDate gt 2024-01-01",
  "select": "Id,FirstName,LastName,Email",
  "orderby": "LastName asc"
}
```

### 3. Capture IDs from Responses

Most INSERT operations return an ID. Always capture it for subsequent operations:

```
✅ Response from prospect_insert: {"ProspectId": "abc123"}
→ Use "abc123" as InsuredDatabaseId in subsequent calls
```

**Common ID field names**:
- `Id`
- `DatabaseId`
- `InsuredDatabaseId`
- `ProspectId`
- `PolicyId`

### 4. Add Notes for Audit Trail

Always document actions taken:
```json
{
  "InsuredDatabaseId": "abc123",
  "Note": "Created via MCP API - Data sourced from Fenris prefill. Added 2 vehicles, 2 drivers, property info.",
  "NoteType": "General"
}
```

### 5. Handle Errors Gracefully

If one operation fails, document it and continue:
```
1. ✅ Prospect created
2. ✅ Vehicle 1 added
3. ❌ Vehicle 2 failed (invalid VIN)
4. ✅ Drivers added
5. ✅ Note added documenting Vehicle 2 failure
```

### 6. Use Tags for Organization

Add tags to track source/type:
- `Fenris-Prefilled` - Data from Fenris
- `MCP-Created` - Created via MCP API
- `Needs-Review` - Requires human review
- `Auto-Renewal` - Automated renewal process

### 7. Validate Before Insert

When possible, validate data:
- Address via Smarty BEFORE inserting prospect
- VIN via NHTSA BEFORE inserting vehicle
- Check for duplicates BEFORE creating records

---

## Error Handling

### Common Errors and Solutions

#### 1. "Missing Required Field"
**Cause**: Required parameter not provided
**Solution**: Check tool schema for required fields

#### 2. "Invalid Format"
**Cause**: Data format doesn't match expected (e.g., date format)
**Solution**: Use correct formats:
  - Dates: `MM/DD/YYYY` for Fenris, `YYYY-MM-DD` for NowCerts
  - Phone: `555-1234` or `(555) 123-4567`
  - State: Two-letter code (`CO`, `TN`, etc.)

#### 3. "Record Not Found"
**Cause**: Invalid ID or record doesn't exist
**Solution**: Search first to verify ID exists

#### 4. "Authentication Failed"
**Cause**: Invalid credentials
**Solution**: Verify environment variables are set correctly

#### 5. Fenris "Access denied" (403)
**Cause**: Credentials expired or invalid
**Solution**: User needs to refresh Fenris credentials

---

## Complete Use Case Examples

### Use Case 1: New Customer Onboarding

```
User: "I have a new customer: Sarah Johnson, DOB 03/15/1985,
       123 Main Street, Anytown, TN 37000.
       Get her info and set her up in the system."

Assistant Actions:
1. Call fenris_prefillHousehold
   - firstName: "Sarah"
   - lastName: "Johnson"
   - dateOfBirth: "03/15/1985"
   - address: "123 Main Street"
   - city: "Anytown"
   - state: "TN"
   - zip: "37000"

2. Call smarty_verifyAddress
   - Verify address is correct

3. Call nowcerts_prospect_insert
   - Use validated address + Fenris data
   - Capture ProspectId

4. For each vehicle from Fenris:
   - Call nhtsa_decodeVin (validate VIN)
   - Call nhtsa_checkRecalls (check for recalls)
   - Call nowcerts_vehicle_insert
   - If recalls found, add note

5. For each driver from Fenris:
   - Call nowcerts_driver_insert

6. Call nowcerts_property_insert
   - Use property data from Fenris

7. Call nowcerts_note_insert
   - Document source and completeness

8. Call nowcerts_tag_insert
   - Tag as "New-Customer-2024"

Response to User:
"✅ Created complete profile for Sarah Johnson:
- Added 2 vehicles (2019 Toyota Camry, 2022 Honda CR-V)
- No open recalls found
- Added 2 drivers (Sarah + spouse)
- Added property information (2,400 sq ft home built 2005)
- Prospect ID: xyz789"
```

---

### Use Case 2: Policy Renewal Review

```
User: "Pull up John Smith's policies that expire in the next 60 days and check for any household changes."

Assistant Actions:
1. Call nowcerts_customer_getCustomers
   - filter: "LastName eq 'Smith' and FirstName eq 'John'"

2. Call nowcerts_policy_getList
   - filter: "InsuredDatabaseId eq '{id}' and ExpirationDate gt {today} and ExpirationDate lt {60daysFromNow}"

3. For the customer found:
   - Call fenris_prefillHousehold (check for changes)

4. Compare Fenris data with current data:
   - Call nowcerts_vehicle_getVehicles
   - Call nowcerts_driver_getDrivers
   - Identify differences

5. If changes found:
   - Create new task for agent review
   - Add note documenting changes

6. Call nowcerts_task_insert
   - Assign to appropriate agent
   - Due date: before expiration

Response to User:
"Found 1 policy expiring 02/15/2025 (Auto Policy #12345)
Changes detected:
- New vehicle added to household: 2024 Ford F-150
- Driver's license renewed
✅ Created review task for agent (due 02/10/2025)
✅ Added note documenting changes"
```

---

### Use Case 3: Quick VIN Lookup

```
User: "What vehicle is VIN 1HGCM82633A123456?"

Assistant Actions:
1. Call nhtsa_decodeVin
   - vin: "1HGCM82633A123456"

2. Call nhtsa_checkRecalls
   - vin: "1HGCM82633A123456"

Response to User:
"VIN 1HGCM82633A123456 is a:
- 2003 Honda Accord EX
- 4-door Sedan
- 2.4L 4-cylinder engine
- Manufactured in Marysville, Ohio

✅ No open safety recalls"
```

---

### Use Case 4: Bulk Renewal Reminders

```
User: "Find all customers with policies expiring next month and create follow-up tasks."

Assistant Actions:
1. Call nowcerts_policy_getList
   - filter: "ExpirationDate ge {nextMonth} and ExpirationDate lt {monthAfter}"
   - select: "Id,InsuredDatabaseId,PolicyNumber,ExpirationDate"

2. For each policy found:
   - Call nowcerts_task_insert
   - taskType: "Renewal Follow-up"
   - dueDate: 2 weeks before expiration
   - assignedTo: Policy agent

3. Track results:
   - Count of tasks created
   - List of policy numbers

Response to User:
"✅ Created 47 renewal follow-up tasks for policies expiring in March 2024:
- Auto policies: 32 tasks
- Home policies: 15 tasks
All tasks assigned to respective agents with due dates 2 weeks prior to expiration."
```

---

## Query Parameter Guide

### OData Query Operators

**Comparison Operators**:
- `eq` - Equal to: `State eq 'CO'`
- `ne` - Not equal: `Status ne 'Cancelled'`
- `gt` - Greater than: `Premium gt 1000`
- `ge` - Greater than or equal: `CreatedDate ge 2024-01-01`
- `lt` - Less than: `ExpirationDate lt 2024-12-31`
- `le` - Less than or equal

**Logical Operators**:
- `and` - Both conditions: `State eq 'CO' and City eq 'Denver'`
- `or` - Either condition: `State eq 'CO' or State eq 'TN'`
- `not` - Negation: `not (Status eq 'Cancelled')`

**String Functions**:
- `startswith(field, 'value')` - Starts with
- `endswith(field, 'value')` - Ends with
- `contains(field, 'value')` - Contains

**Example Queries**:
```json
// Find all Prospects in Colorado created this year
{
  "filter": "State eq 'CO' and CreatedDate ge 2024-01-01",
  "orderby": "LastName asc",
  "top": 50
}

// Find policies with premium > $1000 expiring soon
{
  "filter": "Premium gt 1000 and ExpirationDate lt 2024-12-31",
  "select": "PolicyNumber,InsuredDatabaseId,Premium,ExpirationDate",
  "top": 100
}

// Find customers by partial name match
{
  "filter": "contains(LastName, 'Smith')",
  "select": "Id,FirstName,LastName,Email"
}
```

---

## Summary

This guide provides:
- ✅ Complete tool categorization
- ✅ 4 common workflows with step-by-step instructions
- ✅ External API integration details
- ✅ Best practices for efficient tool use
- ✅ Error handling guidance
- ✅ 4 complete real-world use case examples
- ✅ OData query parameter reference

**Key Principles**:
1. Search before creating (avoid duplicates)
2. Use external APIs to minimize data entry
3. Capture IDs for subsequent operations
4. Add notes for audit trails
5. Tag records for organization
6. Handle errors gracefully
7. Use query parameters efficiently

**For More Information**:
- See COMPREHENSIVE_TEST_REPORT.md for detailed testing results
- See README.md for setup instructions
- See NowCerts API documentation for field specifications

---

**Last Updated**: October 23, 2025
**Version**: 1.0.0
**Status**: Production Ready

---

## Token Management and Caching

### Fenris OAuth Token Caching

The MCP server implements **intelligent token caching** for Fenris API to optimize performance:

**How It Works:**
1. **First Call**: Gets fresh OAuth token (28-35ms total)
   - Makes OAuth request to get access_token
   - Caches token with expiration time
   - Makes API call with token

2. **Subsequent Calls**: Uses cached token (8-15ms total)
   - Checks if cached token is still valid
   - Reuses cached token (no OAuth request)
   - Only makes API call

3. **Automatic Renewal**: When token expires
   - Detects token expiration (5-minute buffer)
   - Automatically gets new token
   - Updates cache
   - Seamless to user

**Performance Benefits:**
- ✅ **69.6% faster** on cached calls
- ✅ **~20ms saved** per cached request
- ✅ **Reduces OAuth server load**
- ✅ **Zero user configuration needed**

**Token Lifetime:**
- Fenris tokens valid for **25 hours** (90,000 seconds)
- Cache expires 5 minutes early for safety
- Automatic renewal when needed

**Cache Behavior:**
- Stored in-memory (per server session)
- Cleared on server restart
- Cleared on authentication errors
- No persistent storage needed

### NowCerts OAuth Token Management

NowCertsClient handles its own token caching:
- Automatic authentication on first request
- Token refresh using refresh_token
- Retry logic on authentication failures
- Handles 401 errors with automatic re-auth

**No user action required** - all token management is automatic!

---

