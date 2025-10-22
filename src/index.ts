#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";

// NowCerts API Configuration
const API_BASE_URL = "https://api.nowcerts.com/api";
const CLIENT_ID = "ngAuthApp";

interface OAuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

class NowCertsClient {
  private axiosInstance: AxiosInstance;
  private token: OAuthToken | null = null;
  private username: string;
  private password: string;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async authenticate(): Promise<void> {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', this.username);
      params.append('password', this.password);
      params.append('client_id', CLIENT_ID);

      const response = await this.axiosInstance.post("/token", params.toString(), {
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      this.token = response.data;
      this.axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${this.token!.access_token}`;
    } catch (error: any) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async refreshToken(): Promise<void> {
    if (!this.token?.refresh_token) {
      await this.authenticate();
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', this.token.refresh_token);
      params.append('client_id', CLIENT_ID);

      const response = await this.axiosInstance.post("/token", params.toString(), {
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      this.token = response.data;
      this.axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${this.token!.access_token}`;
    } catch (error) {
      await this.authenticate();
    }
  }

  async request(method: string, endpoint: string, data?: any): Promise<any> {
    if (!this.token) {
      await this.authenticate();
    }

    try {
      // For GET requests, use query params; for POST/PUT/DELETE, use body
      const config: any = {
        method,
        url: endpoint,
      };

      if (method.toUpperCase() === 'GET' && data) {
        config.params = data;  // Query parameters for GET
      } else if (data) {
        config.data = data;    // Body data for POST/PUT/DELETE
      }

      const response = await this.axiosInstance.request(config);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.refreshToken();

        const config: any = {
          method,
          url: endpoint,
        };

        if (method.toUpperCase() === 'GET' && data) {
          config.params = data;
        } else if (data) {
          config.data = data;
        }

        const response = await this.axiosInstance.request(config);
        return response.data;
      }
      throw error;
    }
  }
}

// Tool definitions for all NowCerts endpoints
const tools: Tool[] = [
  // ========== SCHEMA & METADATA ENDPOINTS ==========
  {
    name: "nowcerts_schema_getMetadata",
    description: `Get the OData schema metadata for NowCerts API. This returns the complete schema including field types, relationships, and entity definitions.

Use this to:
- Understand available fields for each entity
- Check field data types and requirements
- View entity relationships
- See which fields are required vs optional

Endpoints:
- General metadata: /api/$metadata
- Specific entity: /api/$metadata#EntityName (e.g., #PolicyDetailList, #InsuredList, #AgentList)

NOTE: Many fields require specific enumeration values. Use nowcerts_schema_getLookupTables to see valid values for enum fields.`,
    inputSchema: {
      type: "object",
      properties: {
        entity: {
          type: "string",
          description: "Optional: Specific entity name (e.g., 'PolicyDetailList', 'InsuredList'). Leave empty for full metadata.",
        },
      },
    },
  },
  {
    name: "nowcerts_schema_getLookupTables",
    description: `Get documentation for NowCerts lookup tables (enumeration values).

Many fields require specific enumeration values. This tool provides the complete reference for:
- GenderCode (M=Male, F=Female)
- MaritalStatusCode (S=Single, M=Married, etc.)
- PolicyBusinessType (New_Business, Renewal, Rewrite)
- PolicyStatus (Active, Expired, Cancelled, etc.)
- VehicleType (Truck, Car, SUV, etc.)
- ContactType (Owner, Spouse, Child, etc.)
- ClaimStatus (Open, Closed, Pending_Submission, etc.)
- And 50+ other enumeration tables

IMPORTANT FIELDS REQUIRING ENUM VALUES:
- Policy: businessType, businessSubType, billingType, status
- Vehicle: vehicleType, vehicleTypeOfUse, bodyTypeCode, garageCode
- Driver: genderCode, maritalStatusCode, licenseClassCode, licenseStatusCode
- Contact: contactType, prefix, suffix, education
- Claim: claimStatus
- Insured: insuredType, preferredLanguage
- Address: addressType

Full documentation: https://docs.google.com/document/d/11Xk7TviRujq806pLK8pQTcdzDF2ClmPvkfnVmdh1bGc/edit?tab=t.0`,
    inputSchema: {
      type: "object",
      properties: {
        table_name: {
          type: "string",
          description: "Optional: Specific lookup table name (e.g., 'PolicyStatus', 'VehicleType'). Leave empty to get reference info for all tables.",
        },
      },
    },
  },

  // ========== AGENT ENDPOINTS ==========
  {
    name: "nowcerts_agent_getList",
    description: `Retrieve agents from NowCerts using OData query parameters.

IMPORTANT: By default, results are ordered by 'changeDate desc' (most recently changed first). The 'changeDate' field exists on all entities.

Common $filter examples:
- Active agents only: "active eq true"
- Search by first name: "contains(firstName, 'John')"
- Search by last name: "contains(lastName, 'Smith')"
- Search by email: "contains(email, 'agent@example.com')"
- Multiple conditions: "active eq true and contains(lastName, 'Smith')"

Pagination examples:
- First 100 active agents: $filter=active eq true&$top=100&$skip=0&$orderby=firstName asc
- Next 100: $filter=active eq true&$top=100&$skip=100&$orderby=firstName asc

Available fields: id, firstName, lastName, email, phone, cellPhone, fax, active, primaryRole, npnNumber, isDefaultAgent, userId, userDisplayName, changeDate, etc.`,
    inputSchema: {
      type: "object",
      properties: {
        $filter: {
          type: "string",
          description: "OData filter expression (optional). Example: 'active eq true'",
        },
        $top: {
          type: "number",
          description: "Number of records to return (limit). Example: 100",
        },
        $skip: {
          type: "number",
          description: "Number of records to skip (offset). Example: 0 for first page, 100 for second page",
        },
        $orderby: {
          type: "string",
          description: "Field to order by. Default: 'changeDate desc'. Examples: 'firstName asc', 'lastName desc', 'changeDate desc'",
        },
        $select: {
          type: "string",
          description: "Comma-separated list of columns to return (optional). Example: 'id,firstName,lastName,email,active'",
        },
        $count: {
          type: "boolean",
          description: "Include total count in response. Set to true to get @odata.count field.",
        },
      },
    },
  },

  // ========== INSURED ENDPOINTS ==========
  {
    name: "nowcerts_insured_getList",
    description: `Retrieve insureds from NowCerts using OData query parameters.

IMPORTANT: By default, results are ordered by 'changeDate desc' (most recently changed first).

ID FIELD NAMING:
- On Insured object itself: Use "ID" (the primary UUID)
- On related objects (policies, etc.): Use "insuredDatabaseId" to link to insureds
- In Zapier endpoints: Use "insured_database_id"
This UUID is the primary key to link policies, claims, and other objects back to the insured/prospect.

Common $filter examples:
- Search by ID: "ID eq 'ed37f103-ca80-e6da-fa7a-abdfc4b8a7b3'"
- Search by name: "contains(InsuredFirstName, 'John') or contains(InsuredLastName, 'Smith')"
- Search by email: "contains(InsuredEmail, 'test@example.com')"
- Search by phone (format as ###-###-####): "contains(InsuredPhoneNumber, '555-123-4567')"
- Search by city/state: "InsuredCity eq 'Nashville' and InsuredState eq 'TN'"
- Commercial insureds: "InsuredType eq 'Commercial'"

Pagination examples:
- First 100 with filter: $filter=InsuredType eq 'Personal'&$top=100&$skip=0&$orderby=InsuredLastName asc
- Combine all params: $filter=contains(InsuredEmail, 'gmail')&$top=50&$skip=0&$orderby=changeDate desc&$count=true

PHONE FORMAT: Always use ###-###-#### format (e.g., '555-123-4567', NOT '5551234567')

Available fields: ID, InsuredFirstName, InsuredLastName, InsuredEmail, InsuredPhoneNumber, InsuredCellPhone, InsuredCity, InsuredState, InsuredZipCode, InsuredType, changeDate, etc.`,
    inputSchema: {
      type: "object",
      properties: {
        $filter: {
          type: "string",
          description: "OData filter expression (optional). Can be combined with other parameters.",
        },
        $top: {
          type: "number",
          description: "Number of records to return (limit). Example: 100",
        },
        $skip: {
          type: "number",
          description: "Number of records to skip (offset). Example: 0",
        },
        $orderby: {
          type: "string",
          description: "Field to order by. Default: 'changeDate desc'. Example: 'InsuredLastName asc'",
        },
        $select: {
          type: "string",
          description: "Comma-separated list of columns to return (optional)",
        },
        $count: {
          type: "boolean",
          description: "Include total count in response. Set to true to get @odata.count field.",
        },
      },
    },
  },
  {
    name: "nowcerts_insured_getInsureds",
    description: "Get insureds via Zapier endpoint (/Zapier/GetInsureds)",
    inputSchema: {
      type: "object",
      properties: {
        filters: {
          type: "object",
          description: "Filter criteria",
        },
      },
    },
  },
  {
    name: "nowcerts_insured_insert",
    description: "Insert a new insured record",
    inputSchema: {
      type: "object",
      properties: {
        insured: {
          type: "object",
          description: "Insured data to insert",
          required: true,
        },
      },
      required: ["insured"],
    },
  },
  {
    name: "nowcerts_insured_insertNoOverride",
    description: "Insert insured without overriding existing data",
    inputSchema: {
      type: "object",
      properties: {
        insured: {
          type: "object",
          description: "Insured data",
          required: true,
        },
      },
      required: ["insured"],
    },
  },
  {
    name: "nowcerts_insured_insuredAndPoliciesInsert",
    description: "Insert insured along with their policies",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          description: "Insured and policies data",
          required: true,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "nowcerts_insured_insertWithCustomFields",
    description: "Insert insured with custom fields via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        insured: {
          type: "object",
          description: "Insured data with custom fields",
          required: true,
        },
      },
      required: ["insured"],
    },
  },

  // ========== POLICY ENDPOINTS ==========
  {
    name: "nowcerts_policy_getList",
    description: `Get policies from NowCerts using OData query parameters.

IMPORTANT: By default, results are ordered by 'changeDate desc' (most recently changed first).

ID FIELD NAMING:
- Policy's own ID: "databaseId" (the policy's UUID)
- Link to insured: "insuredDatabaseId" (UUID linking to the insured/prospect)
- When linking other objects (vehicles, drivers) to this policy: Use "policyDatabaseId"
These UUIDs are used to relate policies to insureds and to link related objects like vehicles, drivers, etc.

Common $filter examples:
- Search by policy ID: "databaseId eq '1a847475-baf3-4ff6-b0ee-f26c3fa88720'"
- Search by insured ID: "insuredDatabaseId eq 'ed37f103-ca80-e6da-fa7a-abdfc4b8a7b3'"
- Search by insured phone (format as ###-###-####): "(contains(insuredPhoneNumber, '555-123-4567') or contains(insuredCellPhone, '555-123-4567') or contains(insuredSMSPhone, '555-123-4567'))"
- Search by insured email: "contains(insuredEmail, 'test@example.com')"
- Search by policy number: "contains(number, 'POL123456')"
- Active policies only: "active eq true"
- Policies by status: "status eq 'Active'" or "status eq 'Expired'" or "status eq 'Renewed'"
- Quotes only: "isQuote eq true"
- By carrier: "contains(carrierName, 'PROGRESSIVE')"
- By date range: "effectiveDate ge 2024-01-01T00:00:00Z and effectiveDate le 2024-12-31T00:00:00Z"
- Expiring soon: "expirationDate le 2025-12-31T00:00:00Z and active eq true"
- By insured type: "insuredType eq 'Personal'" or "insuredType eq 'Commercial'"
- Complex search: "(contains(insuredPhoneNumber, '555-123-4567') or contains(insuredEmail, 'test@example.com')) and active eq true"

PHONE FORMAT: Always use ###-###-#### format (e.g., '555-123-4567', NOT '5551234567')

Pagination examples:
- Active policies only: $filter=active eq true&$top=100&$skip=0&$orderby=effectiveDate desc
- Combine filter + pagination: $filter=status eq 'Active'&$top=50&$skip=0&$orderby=changeDate desc&$count=true

Available fields: databaseId, insuredDatabaseId, number, isQuote, effectiveDate, expirationDate, businessType, insuredEmail, insuredFirstName, insuredLastName, insuredPhoneNumber, carrierName, totalPremium, active, status, insuredType, changeDate, etc.`,
    inputSchema: {
      type: "object",
      properties: {
        $filter: {
          type: "string",
          description: "OData filter expression (optional). Can be combined with other parameters.",
        },
        $top: {
          type: "number",
          description: "Number of records to return (limit). Example: 100",
        },
        $skip: {
          type: "number",
          description: "Number of records to skip (offset). Example: 0",
        },
        $orderby: {
          type: "string",
          description: "Field to order by. Default: 'changeDate desc'. Examples: 'effectiveDate desc', 'expirationDate asc'",
        },
        $select: {
          type: "string",
          description: "Comma-separated list of columns to return (optional)",
        },
        $count: {
          type: "boolean",
          description: "Include total count in response. Set to true to get @odata.count field.",
        },
      },
    },
  },
  {
    name: "nowcerts_policy_getPolicies",
    description: "Find policies using /Policy/FindPolicies",
    inputSchema: {
      type: "object",
      properties: {
        filters: {
          type: "object",
          description: "Filter criteria for policies",
        },
      },
    },
  },
  {
    name: "nowcerts_policy_get",
    description: "Get a specific policy or policies using /PolicyList",
    inputSchema: {
      type: "object",
      properties: {
        policy_id: {
          type: "string",
          description: "Policy ID to retrieve",
        },
      },
    },
  },
  {
    name: "nowcerts_policy_insert",
    description: "Insert a new policy",
    inputSchema: {
      type: "object",
      properties: {
        policy: {
          type: "object",
          description: "Policy data to insert",
          required: true,
        },
      },
      required: ["policy"],
    },
  },

  // ========== QUOTE ENDPOINTS ==========
  {
    name: "nowcerts_quote_getQuotes",
    description: "Get quotes via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        filters: {
          type: "object",
          description: "Filter criteria",
        },
      },
    },
  },
  {
    name: "nowcerts_quote_insert",
    description: "Insert a new quote",
    inputSchema: {
      type: "object",
      properties: {
        quote: {
          type: "object",
          description: "Quote data",
          required: true,
        },
      },
      required: ["quote"],
    },
  },

  // ========== PROSPECT ENDPOINTS ==========
  {
    name: "nowcerts_prospect_getProspects",
    description: "Get prospects via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        filters: {
          type: "object",
          description: "Filter criteria",
        },
      },
    },
  },
  {
    name: "nowcerts_prospect_insert",
    description: "Insert a new prospect",
    inputSchema: {
      type: "object",
      properties: {
        prospect: {
          type: "object",
          description: "Prospect data",
          required: true,
        },
      },
      required: ["prospect"],
    },
  },
  {
    name: "nowcerts_prospect_insertWithCustomFields",
    description: "Insert prospect with custom fields",
    inputSchema: {
      type: "object",
      properties: {
        prospect: {
          type: "object",
          description: "Prospect data with custom fields",
          required: true,
        },
      },
      required: ["prospect"],
    },
  },
  {
    name: "nowcerts_prospect_xmlPush",
    description: "Push prospects via XML",
    inputSchema: {
      type: "object",
      properties: {
        xml_data: {
          type: "string",
          description: "XML data to push",
          required: true,
        },
      },
      required: ["xml_data"],
    },
  },
  {
    name: "nowcerts_prospect_quoteRequestExternalImportWithProspect",
    description: "Import quote request with prospect",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          description: "Quote request and prospect data",
          required: true,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "nowcerts_prospect_quoteRequestExternalImport",
    description: "Import external quote request",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          description: "Quote request data",
          required: true,
        },
      },
      required: ["data"],
    },
  },

  // ========== CLAIM ENDPOINTS ==========
  {
    name: "nowcerts_claim_getList",
    description: `Get claims from NowCerts using OData query parameters.

IMPORTANT: By default, results are ordered by 'changeDate desc' (most recently changed first).

Common $filter examples:
- Search by claim number: "contains(ClaimNumber, '12345')"
- Search by policy number: "contains(PolicyNumber, 'MT949221291')"
- By status: "ClaimStatus eq 'Open'" or "ClaimStatus eq 'Closed'"
- By date range: "ClaimDate ge 2024-01-01T00:00:00Z and ClaimDate le 2024-12-31T00:00:00Z"
- By insured name: "contains(InsuredName, 'Henderson')"
- Recent claims: "ClaimDate ge 2024-01-01T00:00:00Z"
- Open claims only: "ClaimStatus eq 'Open'"

Pagination examples:
- Open claims: $filter=ClaimStatus eq 'Open'&$top=100&$skip=0&$orderby=ClaimDate desc
- Combine params: $filter=ClaimStatus eq 'Open'&$top=50&$skip=0&$orderby=changeDate desc&$count=true

Available fields: ClaimId, ClaimNumber, PolicyNumber, ClaimDate, ClaimStatus, InsuredName, ClaimAmount, changeDate, etc.`,
    inputSchema: {
      type: "object",
      properties: {
        $filter: {
          type: "string",
          description: "OData filter expression (optional). Can be combined with other parameters.",
        },
        $top: {
          type: "number",
          description: "Number of records to return (limit). Example: 100",
        },
        $skip: {
          type: "number",
          description: "Number of records to skip (offset). Example: 0",
        },
        $orderby: {
          type: "string",
          description: "Field to order by. Default: 'changeDate desc'. Example: 'ClaimDate desc'",
        },
        $select: {
          type: "string",
          description: "Comma-separated list of columns to return (optional)",
        },
        $count: {
          type: "boolean",
          description: "Include total count in response. Set to true to get @odata.count field.",
        },
      },
    },
  },
  {
    name: "nowcerts_claim_getClaims",
    description: "Get claims via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_claim_insert",
    description: "Insert a new claim",
    inputSchema: {
      type: "object",
      properties: {
        claim: {
          type: "object",
          description: "Claim data",
          required: true,
        },
      },
      required: ["claim"],
    },
  },

  // ========== NOTE ENDPOINTS ==========
  {
    name: "nowcerts_note_getNotes",
    description: "Get notes via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_note_insert",
    description: "Insert a new note",
    inputSchema: {
      type: "object",
      properties: {
        note: {
          type: "object",
          description: "Note data",
          required: true,
        },
      },
      required: ["note"],
    },
  },

  // ========== TAG ENDPOINTS ==========
  {
    name: "nowcerts_tag_getTags",
    description: "Get tags via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_tag_insert",
    description: "Apply/insert a tag",
    inputSchema: {
      type: "object",
      properties: {
        tag: {
          type: "object",
          description: "Tag data",
          required: true,
        },
      },
      required: ["tag"],
    },
  },

  // ========== DRIVER ENDPOINTS ==========
  {
    name: "nowcerts_driver_getDrivers",
    description: `Get drivers via Zapier endpoint. Drivers are linked to policies.

ID FIELD NAMING:
- Driver's own ID: "databaseId" (UUID)
- Link to policy: "policyDatabaseId" (UUID of the policy this driver belongs to)
- In Zapier endpoints: Use "database_id" and "policy_database_id"`,
    inputSchema: {
      type: "object",
      properties: {
        filters: {
          type: "object",
          description: "Filter by policyDatabaseId, databaseId, or other driver fields"
        },
      },
    },
  },
  {
    name: "nowcerts_driver_insert",
    description: `Insert a new driver. Must include policyDatabaseId to link to a policy.

ID FIELD NAMING:
- Link to policy: "policyDatabaseId" (required - UUID of the policy)
- Driver's ID will be auto-generated as "databaseId"`,
    inputSchema: {
      type: "object",
      properties: {
        driver: {
          type: "object",
          description: "Driver data including policyDatabaseId (required)",
          required: true,
        },
      },
      required: ["driver"],
    },
  },
  {
    name: "nowcerts_driver_bulkInsert",
    description: `Bulk insert multiple drivers. Each must include policyDatabaseId.

ID FIELD NAMING:
- Link to policy: "policyDatabaseId" (required for each driver)
- Driver IDs will be auto-generated as "databaseId"`,
    inputSchema: {
      type: "object",
      properties: {
        drivers: {
          type: "array",
          items: { type: "object" },
          description: "Array of driver data, each with policyDatabaseId",
          required: true,
        },
      },
      required: ["drivers"],
    },
  },

  // ========== VEHICLE ENDPOINTS ==========
  {
    name: "nowcerts_vehicle_getVehicles",
    description: `Get vehicles via Zapier endpoint. Vehicles are linked to policies.

ID FIELD NAMING:
- Vehicle's own ID: "databaseId" (UUID)
- Link to policy: "policyDatabaseId" (UUID of the policy this vehicle belongs to)
- In Zapier endpoints: Use "database_id" and "policy_database_id"`,
    inputSchema: {
      type: "object",
      properties: {
        filters: {
          type: "object",
          description: "Filter by policyDatabaseId, databaseId, VIN, or other vehicle fields"
        },
      },
    },
  },
  {
    name: "nowcerts_vehicle_insert",
    description: `Insert a new vehicle. Must include policyDatabaseId to link to a policy.

ID FIELD NAMING:
- Link to policy: "policyDatabaseId" (required - UUID of the policy)
- Vehicle's ID will be auto-generated as "databaseId"`,
    inputSchema: {
      type: "object",
      properties: {
        vehicle: {
          type: "object",
          description: "Vehicle data including policyDatabaseId (required)",
          required: true,
        },
      },
      required: ["vehicle"],
    },
  },
  {
    name: "nowcerts_vehicle_bulkInsert",
    description: `Bulk insert multiple vehicles. Each must include policyDatabaseId.

ID FIELD NAMING:
- Link to policy: "policyDatabaseId" (required for each vehicle)
- Vehicle IDs will be auto-generated as "databaseId"`,
    inputSchema: {
      type: "object",
      properties: {
        vehicles: {
          type: "array",
          items: { type: "object" },
          description: "Array of vehicle data, each with policyDatabaseId",
          required: true,
        },
      },
      required: ["vehicles"],
    },
  },

  // ========== TASK ENDPOINTS ==========
  {
    name: "nowcerts_task_getTasks",
    description: "Get tasks via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_task_insert",
    description: "Insert a new task",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "object",
          description: "Task data",
          required: true,
        },
      },
      required: ["task"],
    },
  },

  // ========== OPPORTUNITY ENDPOINTS ==========
  {
    name: "nowcerts_opportunity_getOpportunities",
    description: "Get opportunities via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_opportunity_insert",
    description: "Insert a new opportunity",
    inputSchema: {
      type: "object",
      properties: {
        opportunity: {
          type: "object",
          description: "Opportunity data",
          required: true,
        },
      },
      required: ["opportunity"],
    },
  },

  // ========== SERVICE REQUEST ENDPOINTS ==========
  {
    name: "nowcerts_serviceRequest_getAddDriver",
    description: "Get add driver service requests",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_serviceRequest_getAddressChanges",
    description: "Get address change service requests",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_serviceRequest_getRemoveDriver",
    description: "Get remove driver service requests",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_serviceRequest_getReplaceDriver",
    description: "Get replace driver service requests",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_serviceRequest_getVehicleTransfer",
    description: "Get vehicle transfer service requests",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_serviceRequest_getGeneric",
    description: "Get generic service requests",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_serviceRequest_insertAddDriver",
    description: "Insert add driver service request",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          description: "Service request data",
          required: true,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "nowcerts_serviceRequest_insertAddressChanges",
    description: "Insert address change service request",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "nowcerts_serviceRequest_insertRemoveDriver",
    description: "Insert remove driver service request",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "nowcerts_serviceRequest_insertReplaceDriver",
    description: "Insert replace driver service request",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "nowcerts_serviceRequest_insertVehicleTransfer",
    description: "Insert vehicle transfer service request",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "nowcerts_serviceRequest_insertGeneric",
    description: "Insert generic service request",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },

  // ========== CUSTOMER ENDPOINTS ==========
  {
    name: "nowcerts_customer_getCustomers",
    description: "Get customers list with search and pagination",
    inputSchema: {
      type: "object",
      properties: {
        search_criteria: {
          type: "object",
          description: "Search by Name, Address, Email, Phone, InsuredId, CustomerId",
        },
        page: { type: "number" },
        per_page: { type: "number" },
      },
    },
  },

  // ========== CUSTOM PANEL ENDPOINTS ==========
  {
    name: "nowcerts_customPanel_getStructure",
    description: "Get custom panel structure",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_customPanel_insert",
    description: "Insert custom panel data",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },

  // ========== SMS ENDPOINTS ==========
  {
    name: "nowcerts_sms_getSmses",
    description: "Get SMS messages",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_sms_insert",
    description: "Insert/send SMS message",
    inputSchema: {
      type: "object",
      properties: {
        sms: {
          type: "object",
          required: true,
        },
      },
      required: ["sms"],
    },
  },
  {
    name: "nowcerts_sms_twilio",
    description: "Send SMS via Twilio integration",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },

  // ========== PRINCIPAL ENDPOINTS ==========
  {
    name: "nowcerts_principal_getList",
    description: `Get principals (additional insureds/interested parties) from NowCerts using OData query parameters.

IMPORTANT: By default, results are ordered by 'changeDate desc' (most recently changed first).

Common $filter examples:
- Search by name: "contains(PrincipalName, 'Smith')"
- Search by email: "contains(Email, 'principal@example.com')"
- By type: "PrincipalType eq 'Additional Insured'" or "PrincipalType eq 'Loss Payee'"
- Active principals: "Active eq true"
- By policy: "PolicyId eq 'guid-here'"

Pagination examples:
- Active principals: $filter=Active eq true&$top=100&$skip=0&$orderby=PrincipalName asc
- Combine params: $filter=Active eq true&$top=50&$skip=0&$orderby=changeDate desc&$count=true

Available fields: PrincipalId, PrincipalName, Email, Phone, PrincipalType, PolicyId, Active, changeDate, etc.`,
    inputSchema: {
      type: "object",
      properties: {
        $filter: {
          type: "string",
          description: "OData filter expression (optional). Can be combined with other parameters.",
        },
        $top: {
          type: "number",
          description: "Number of records to return (limit). Example: 100",
        },
        $skip: {
          type: "number",
          description: "Number of records to skip (offset). Example: 0",
        },
        $orderby: {
          type: "string",
          description: "Field to order by. Default: 'changeDate desc'. Example: 'PrincipalName asc'",
        },
        $select: {
          type: "string",
          description: "Comma-separated list of columns to return (optional)",
        },
        $count: {
          type: "boolean",
          description: "Include total count in response. Set to true to get @odata.count field.",
        },
      },
    },
  },
  {
    name: "nowcerts_principal_getPrincipals",
    description: "Get principals via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_principal_insert",
    description: "Insert a new principal",
    inputSchema: {
      type: "object",
      properties: {
        principal: {
          type: "object",
          required: true,
        },
      },
      required: ["principal"],
    },
  },

  // ========== PROPERTY ENDPOINTS ==========
  {
    name: "nowcerts_property_getProperties",
    description: "Get properties via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_property_insert",
    description: "Insert a new property",
    inputSchema: {
      type: "object",
      properties: {
        property: {
          type: "object",
          required: true,
        },
      },
      required: ["property"],
    },
  },
  {
    name: "nowcerts_property_insertOrUpdate",
    description: "Insert or update a property",
    inputSchema: {
      type: "object",
      properties: {
        property: {
          type: "object",
          required: true,
        },
      },
      required: ["property"],
    },
  },

  // ========== CALL LOG RECORD ENDPOINTS ==========
  {
    name: "nowcerts_callLogRecord_getCallLogRecords",
    description: "Get call log records",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_callLogRecord_insert",
    description: "Insert a call log record",
    inputSchema: {
      type: "object",
      properties: {
        record: {
          type: "object",
          required: true,
        },
      },
      required: ["record"],
    },
  },

  // ========== WORKERS COMPENSATION ENDPOINTS ==========
  {
    name: "nowcerts_workersCompensation_insert",
    description: "Insert workers compensation data",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },

  // ========== QUOTE APPLICATION ENDPOINTS ==========
  {
    name: "nowcerts_quoteApplication_getQuoteApplications",
    description: "Get quote applications",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_quoteApplication_push",
    description: "Push quote applications",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "nowcerts_quoteApplication_quoteRushPush",
    description: "Push quote applications via QuoteRush",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },

  // ========== ZAPIER ENDPOINTS ==========
  {
    name: "nowcerts_zapier_subscribe",
    description: "Subscribe to Zapier webhook",
    inputSchema: {
      type: "object",
      properties: {
        target_url: {
          type: "string",
          description: "Webhook URL",
          required: true,
        },
        event: {
          type: "string",
          description: "Event type to subscribe to",
          required: true,
        },
      },
      required: ["target_url", "event"],
    },
  },
  {
    name: "nowcerts_zapier_unsubscribe",
    description: "Unsubscribe from Zapier webhook",
    inputSchema: {
      type: "object",
      properties: {
        target_url: {
          type: "string",
          required: true,
        },
        event: {
          type: "string",
          required: true,
        },
      },
      required: ["target_url", "event"],
    },
  },

  // ========== INTEGRATION ENDPOINTS ==========
  {
    name: "nowcerts_cognito_webHook",
    description: "Cognito webhook integration",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "nowcerts_cloudIt_processData",
    description: "CloudIt data processing",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "nowcerts_nationwide_callbackUrl",
    description: "Nationwide callback URL",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },
  {
    name: "nowcerts_agencyRevolution_activities",
    description: "Agency Revolution activities integration",
    inputSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          required: true,
        },
      },
      required: ["data"],
    },
  },
];

// Endpoint mapping for tool execution
const endpointMap: Record<string, { method: string; path: string }> = {
  // Schema & Metadata
  nowcerts_schema_getMetadata: { method: "GET", path: "/$metadata" },
  nowcerts_schema_getLookupTables: { method: "GET", path: "/$metadata" }, // Will be handled specially

  // Agent
  nowcerts_agent_getList: { method: "GET", path: "/AgentList" },

  // Insured
  nowcerts_insured_getList: { method: "GET", path: "/InsuredList" },
  nowcerts_insured_getInsureds: { method: "GET", path: "/Zapier/GetInsureds" },
  nowcerts_insured_insert: { method: "POST", path: "/Insured/Insert" },
  nowcerts_insured_insertNoOverride: {
    method: "POST",
    path: "/Insured/InsertNoOverride",
  },
  nowcerts_insured_insuredAndPoliciesInsert: {
    method: "POST",
    path: "/InsuredAndPolicies/Insert",
  },
  nowcerts_insured_insertWithCustomFields: {
    method: "POST",
    path: "/Zapier/InsertInsuredWithCustomFields",
  },

  // Policy
  nowcerts_policy_getList: { method: "GET", path: "/PolicyList" },
  nowcerts_policy_getPolicies: { method: "GET", path: "/Policy/FindPolicies" },
  nowcerts_policy_get: { method: "GET", path: "/PolicyList" },
  nowcerts_policy_insert: { method: "POST", path: "/Policy/Insert" },

  // Quote
  nowcerts_quote_getQuotes: { method: "GET", path: "/Zapier/GetQuotes" },
  nowcerts_quote_insert: { method: "POST", path: "/Zapier/InsertQuote" },

  // Prospect
  nowcerts_prospect_getProspects: {
    method: "GET",
    path: "/Zapier/GetProspects",
  },
  nowcerts_prospect_insert: { method: "POST", path: "/Zapier/InsertProspect" },
  nowcerts_prospect_insertWithCustomFields: {
    method: "POST",
    path: "/Zapier/InsertProspectWithCustomFields",
  },
  nowcerts_prospect_xmlPush: { method: "POST", path: "/Xml/PushProspects" },
  nowcerts_prospect_quoteRequestExternalImportWithProspect: {
    method: "POST",
    path: "/QuoteRequestExternalImportWithProspect",
  },
  nowcerts_prospect_quoteRequestExternalImport: {
    method: "POST",
    path: "/QuoteRequestExternalImport",
  },

  // Claim
  nowcerts_claim_getList: { method: "GET", path: "/ClaimList" },
  nowcerts_claim_getClaims: { method: "GET", path: "/Zapier/GetClaims" },
  nowcerts_claim_insert: { method: "POST", path: "/Zapier/InsertClaim" },

  // Note
  nowcerts_note_getNotes: { method: "GET", path: "/Zapier/GetNotes" },
  nowcerts_note_insert: { method: "POST", path: "/Zapier/InsertNote" },

  // Tag
  nowcerts_tag_getTags: { method: "GET", path: "/Zapier/GetTags" },
  nowcerts_tag_insert: { method: "POST", path: "/Zapier/InsertTagApply" },

  // Driver
  nowcerts_driver_getDrivers: { method: "GET", path: "/Zapier/GetDrivers" },
  nowcerts_driver_insert: { method: "POST", path: "/Zapier/InsertDriver" },
  nowcerts_driver_bulkInsert: {
    method: "POST",
    path: "/Driver/BulkInsertDriver",
  },

  // Vehicle
  nowcerts_vehicle_getVehicles: { method: "GET", path: "/Zapier/GetVehicles" },
  nowcerts_vehicle_insert: { method: "POST", path: "/Zapier/InsertVehicle" },
  nowcerts_vehicle_bulkInsert: {
    method: "POST",
    path: "/Vehicle/BulkInsertVehicle",
  },

  // Task
  nowcerts_task_getTasks: { method: "GET", path: "/Zapier/GetTasks" },
  nowcerts_task_insert: { method: "POST", path: "/Zapier/InsertTask" },

  // Opportunity
  nowcerts_opportunity_getOpportunities: {
    method: "GET",
    path: "/Zapier/GetOpportunities",
  },
  nowcerts_opportunity_insert: {
    method: "POST",
    path: "/Zapier/InsertOpportunity",
  },

  // Service Request
  nowcerts_serviceRequest_getAddDriver: {
    method: "GET",
    path: "/Zapier/GetServiceRequestsAddDriver",
  },
  nowcerts_serviceRequest_getAddressChanges: {
    method: "GET",
    path: "/Zapier/GetServiceRequestsAddressChanges",
  },
  nowcerts_serviceRequest_getRemoveDriver: {
    method: "GET",
    path: "/Zapier/GetServiceRequestsRemoveDriver",
  },
  nowcerts_serviceRequest_getReplaceDriver: {
    method: "GET",
    path: "/Zapier/GetServiceRequestsReplaceDriver",
  },
  nowcerts_serviceRequest_getVehicleTransfer: {
    method: "GET",
    path: "/Zapier/GetServiceRequestsVehicleTransfer",
  },
  nowcerts_serviceRequest_getGeneric: {
    method: "GET",
    path: "/Zapier/GetServiceRequestsGeneric",
  },
  nowcerts_serviceRequest_insertAddDriver: {
    method: "POST",
    path: "/Zapier/InsertServiceRequestsAddDriver",
  },
  nowcerts_serviceRequest_insertAddressChanges: {
    method: "POST",
    path: "/Zapier/InsertServiceRequestsAddressChanges",
  },
  nowcerts_serviceRequest_insertRemoveDriver: {
    method: "POST",
    path: "/Zapier/InsertServiceRequestsRemoveDriver",
  },
  nowcerts_serviceRequest_insertReplaceDriver: {
    method: "POST",
    path: "/Zapier/InsertServiceRequestsReplaceDriver",
  },
  nowcerts_serviceRequest_insertVehicleTransfer: {
    method: "POST",
    path: "/Zapier/InsertServiceRequestsVehicleTransfer",
  },
  nowcerts_serviceRequest_insertGeneric: {
    method: "POST",
    path: "/Zapier/InsertServiceRequestsGeneric",
  },

  // Customer
  nowcerts_customer_getCustomers: {
    method: "GET",
    path: "/Customers/GetCustomersList",
  },

  // Custom Panel
  nowcerts_customPanel_getStructure: {
    method: "GET",
    path: "/CustomPanel/GetStructure",
  },
  nowcerts_customPanel_insert: { method: "POST", path: "/CustomPanel/Insert" },

  // SMS
  nowcerts_sms_getSmses: { method: "GET", path: "/Zapier/GetSMSes" },
  nowcerts_sms_insert: { method: "POST", path: "/Zapier/InsertSMSes" },
  nowcerts_sms_twilio: { method: "POST", path: "/Twilio/Sms" },

  // Principal
  nowcerts_principal_getList: { method: "GET", path: "/PrincipalList" },
  nowcerts_principal_getPrincipals: {
    method: "GET",
    path: "/Zapier/GetPrincipals",
  },
  nowcerts_principal_insert: {
    method: "POST",
    path: "/Zapier/InsertPrincipal",
  },

  // Property
  nowcerts_property_getProperties: {
    method: "GET",
    path: "/Zapier/GetProperties",
  },
  nowcerts_property_insert: { method: "POST", path: "/Zapier/InsertProperty" },
  nowcerts_property_insertOrUpdate: {
    method: "POST",
    path: "/Property/InsertOrUpdate",
  },

  // Call Log Record
  nowcerts_callLogRecord_getCallLogRecords: {
    method: "GET",
    path: "/Zapier/GetCallLogRecords",
  },
  nowcerts_callLogRecord_insert: {
    method: "POST",
    path: "/Zapier/InsertCallLogRecord",
  },

  // Workers Compensation
  nowcerts_workersCompensation_insert: {
    method: "POST",
    path: "/WorkersCompensation/Insert",
  },

  // Quote Application
  nowcerts_quoteApplication_getQuoteApplications: {
    method: "GET",
    path: "/Zapier/GetQuoteApplications",
  },
  nowcerts_quoteApplication_push: {
    method: "POST",
    path: "/PushQuoteApplications",
  },
  nowcerts_quoteApplication_quoteRushPush: {
    method: "POST",
    path: "/QuoteRush/PushQuoteApplications",
  },

  // Zapier
  nowcerts_zapier_subscribe: { method: "POST", path: "/Zapier/Subscribe" },
  nowcerts_zapier_unsubscribe: { method: "POST", path: "/Zapier/Unsubscribe" },

  // Integrations
  nowcerts_cognito_webHook: { method: "POST", path: "/CognitoWebHook" },
  nowcerts_cloudIt_processData: { method: "POST", path: "/CloudItProcessData" },
  nowcerts_nationwide_callbackUrl: {
    method: "POST",
    path: "/Nationwide/CallbackURL",
  },
  nowcerts_agencyRevolution_activities: {
    method: "POST",
    path: "/AgencyRevolution/Activities",
  },
};

// Main server implementation
const server = new Server(
  {
    name: "nowcerts-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Get credentials from environment
const username = process.env.NOWCERTS_USERNAME;
const password = process.env.NOWCERTS_PASSWORD;

if (!username || !password) {
  console.error(
    "Error: NOWCERTS_USERNAME and NOWCERTS_PASSWORD environment variables must be set"
  );
  process.exit(1);
}

const client = new NowCertsClient(username, password);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments || {};

  // Special handler for lookup tables documentation
  if (toolName === "nowcerts_schema_getLookupTables") {
    const lookupTablesDoc = `# NowCerts API Lookup Tables (Enumeration Values)

Many fields in the NowCerts API require specific enumeration values from lookup tables. Below is a reference guide for the most commonly used lookup tables.

## Common Lookup Tables

### GenderCode
- M = Male
- F = Female

### MaritalStatusCode
- S = Single
- M = Married
- D = Divorced
- W = Widowed
- P = Separated

### PolicyBusinessType
- New_Business
- Renewal
- Rewrite
- Reinstatement

### PolicyBusinessSubType
- New
- Renewal
- Rewrite
- Transfer

### PolicyStatus
- Active
- Expired
- Cancelled
- Renewed
- Pending
- Quote

### PolicyBillingType
- Direct
- Agency
- Mortgagee

### VehicleType
- Truck
- Car
- SUV
- Van
- Motorcycle
- RV
- Trailer
- Other

### VehicleTypeOfUse
- Business
- Pleasure
- Commute
- Farm

### VehicleBodyTypeCode
- Sedan
- Coupe
- Convertible
- SUV
- Truck
- Van
- Wagon

### VehicleGarageCode
- G = Garaged
- P = Parked on Street
- O = Other

### DriverLicenseClassCode
- A = Motorcycle
- B = Non-commercial vehicle
- C = Commercial vehicle

### DriverLicenseStatusCode
- V = Valid
- S = Suspended
- R = Revoked
- E = Expired

### ContactType
- Owner
- Spouse
- Child
- Parent
- Sibling
- Business_Contact
- Emergency_Contact
- Other

### ContactPrefix
- Mr
- Mrs
- Ms
- Miss
- Dr

### ContactSuffix
- Jr
- Sr
- II
- III
- IV

### ContactEducation
- High_School
- Some_College
- Associates
- Bachelors
- Masters
- Doctorate

### ClaimStatus
- Open
- Closed
- Pending_Submission
- Under_Review
- Paid
- Denied

### InsuredType
- Personal
- Commercial

### AddressType
- Home
- Business
- Mailing
- Billing
- Other

### PhoneType
- Home
- Work
- Mobile
- Fax
- Other

### EmailType
- Personal
- Work
- Other

### PropertyType
- Single_Family
- Multi_Family
- Condo
- Mobile_Home
- Commercial

### PropertyOccupancy
- Owner_Occupied
- Tenant_Occupied
- Vacant
- Seasonal

### PropertyConstructionType
- Frame
- Masonry
- Superior
- Fire_Resistive

### TaskPriority
- Low
- Normal
- High
- Urgent

### TaskStatus
- Not_Started
- In_Progress
- Completed
- Cancelled
- On_Hold

### OpportunityStage
- Lead
- Prospect
- Quote
- Proposal
- Negotiation
- Closed_Won
- Closed_Lost

### ServiceRequestStatus
- Pending
- In_Progress
- Completed
- Cancelled

### CoverageCode
Various coverage codes depending on policy type (Auto, Home, Commercial, etc.)

### LineOfBusiness
- Personal_Auto
- Commercial_Auto
- Homeowners
- Commercial_Property
- Workers_Compensation
- General_Liability
- Professional_Liability
- Life
- Health
- Other

### AgentRole
- Primary
- Secondary
- CSR
- Producer

### PaymentMethod
- Check
- Credit_Card
- ACH
- Cash
- Money_Order

### PaymentFrequency
- Annual
- Semi_Annual
- Quarterly
- Monthly
- Weekly

### ReferralSource
- Client
- Agent
- Website
- Social_Media
- Advertisement
- Other

### PreferredLanguage
- English
- Spanish
- French
- Other

## Important Notes

1. **Case Sensitivity**: Enumeration values are typically case-sensitive. Use the exact casing shown above.

2. **Underscore vs Spaces**: Most enum values use underscores instead of spaces (e.g., "New_Business" not "New Business").

3. **Validation**: The API will return an error if you use an invalid enumeration value. Always check the spelling and casing.

4. **Entity-Specific Fields**:
   - Policy fields: businessType, businessSubType, billingType, status, lineOfBusiness
   - Vehicle fields: vehicleType, vehicleTypeOfUse, bodyTypeCode, garageCode
   - Driver fields: genderCode, maritalStatusCode, licenseClassCode, licenseStatusCode
   - Contact fields: contactType, prefix, suffix, education
   - Claim fields: claimStatus
   - Address fields: addressType
   - Task fields: priority, status
   - Opportunity fields: stage

5. **Getting Current Values**: Use the $metadata endpoint to see the current schema and available enum values for your NowCerts instance.

## Full Documentation

For the complete and most up-to-date list of lookup tables and enumeration values, refer to:
https://docs.google.com/document/d/11Xk7TviRujq806pLK8pQTcdzDF2ClmPvkfnVmdh1bGc/edit?tab=t.0

Additional API documentation:
- https://api.nowcerts.com/
- https://api.nowcerts.com/Help
`;

    const tableName = args.table_name;
    if (tableName) {
      // Filter to show only the requested table
      const lines = lookupTablesDoc.split('\n');
      const tableIndex = lines.findIndex(line => line.includes(`### ${tableName}`));
      if (tableIndex !== -1) {
        // Find the next ### or ## to know where this section ends
        let endIndex = lines.findIndex((line, idx) =>
          idx > tableIndex && (line.startsWith('### ') || line.startsWith('## '))
        );
        if (endIndex === -1) endIndex = lines.length;

        const tableSection = lines.slice(tableIndex, endIndex).join('\n');
        return {
          content: [
            {
              type: "text",
              text: `# ${tableName} Lookup Table\n\n${tableSection}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Table "${tableName}" not found in documentation. Use the tool without table_name parameter to see all available lookup tables.`,
            },
          ],
        };
      }
    }

    return {
      content: [
        {
          type: "text",
          text: lookupTablesDoc,
        },
      ],
    };
  }

  // Special handler for metadata with entity parameter
  if (toolName === "nowcerts_schema_getMetadata") {
    const entity = args.entity;
    let metadataPath = "/$metadata";

    if (entity) {
      // Append entity name with # (e.g., /$metadata#PolicyDetailList)
      metadataPath = `/$metadata#${entity}`;
    }

    try {
      const result = await client.request("GET", metadataPath, {});
      return {
        content: [
          {
            type: "text",
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}\n${error.response?.data ? JSON.stringify(error.response.data, null, 2) : ""}`,
          },
        ],
        isError: true,
      };
    }
  }

  const endpoint = endpointMap[toolName];
  if (!endpoint) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  // Add default $orderby=changeDate desc for List endpoints if not specified
  const isListEndpoint = endpoint.path.includes('List') && endpoint.method === 'GET';
  if (isListEndpoint && !args.$orderby) {
    args.$orderby = 'changeDate desc';
  }

  try {
    const result = await client.request(endpoint.method, endpoint.path, args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}\n${error.response?.data ? JSON.stringify(error.response.data, null, 2) : ""}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NowCerts MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
