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

// Fenris Token Cache Interface
interface FenrisTokenCache {
  access_token: string;
  expires_at: number; // Unix timestamp (ms)
}

// Global Fenris token cache
let fenrisTokenCache: FenrisTokenCache | null = null;

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

// Fenris Token Management Helper
async function getFenrisAccessToken(clientId: string, clientSecret: string): Promise<string> {
  // Check if we have a cached token that's still valid
  const now = Date.now();

  if (fenrisTokenCache && fenrisTokenCache.expires_at > now) {
    // Token is still valid, return cached token
    return fenrisTokenCache.access_token;
  }

  // Token expired or doesn't exist, get a new one
  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await axios.post(
      "https://auth.fenrisd.com/realms/fenris/protocol/openid-connect/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${basicAuth}`,
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in || 86400; // Default 24 hours

    // Cache the token with 5-minute buffer before expiration
    fenrisTokenCache = {
      access_token: accessToken,
      expires_at: now + (expiresIn - 300) * 1000, // Subtract 5 minutes
    };

    return accessToken;
  } catch (error: any) {
    // Clear cache on error
    fenrisTokenCache = null;
    throw new Error(`Failed to get Fenris access token: ${error.message}`);
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
- By role: "primaryRole eq 'Agent/Producer'" or "primaryRole eq 'CSR'"
- Default agent: "isDefaultAgent eq true"
- Has user account: "userId ne null"
- Multiple conditions: "active eq true and contains(lastName, 'Smith')"

Pagination examples:
- First 100 active agents: $filter=active eq true&$top=100&$skip=0&$orderby=firstName asc&$count=true
- Next 100: $filter=active eq true&$top=100&$skip=100&$orderby=firstName asc&$count=true

Available fields: id (primary key), firstName, lastName, email, phone, cellPhone, fax, npnNumber, primaryRole, assignCommissionIfCSR, isDefaultAgent, useAgentIfNotDefault, primaryOfficeName, active, changeDate, userId, userDisplayName, addressLine1, addressLine2, city, state, county, zipCode, isSuperVisior, agentIs, workGroups (list)`,
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "OData filter expression (optional). Example: 'active eq true'",
        },
        top: {
          type: "number",
          description: "Number of records to return (limit). Example: 100",
        },
        skip: {
          type: "number",
          description: "Number of records to skip (offset). Example: 0 for first page, 100 for second page",
        },
        orderby: {
          type: "string",
          description: "Field to order by. Default: 'changeDate desc'. Examples: 'firstName asc', 'lastName desc', 'changeDate desc'",
        },
        select: {
          type: "string",
          description: "Comma-separated list of columns to return (optional). Example: 'id,firstName,lastName,email,active'",
        },
        count: {
          type: "boolean",
          description: "Include total count in response. Set to true to get @odata.count field.",
        },
      },
    },
  },

  // ========== INSURED ENDPOINTS ==========
  {
    name: "nowcerts_insured_getList",
    description: `Retrieve insureds/prospects from NowCerts using OData query parameters.

IMPORTANT: By default, results are ordered by 'changeDate desc' (most recently changed first).

ID FIELD NAMING:
- On Insured object itself: Use "id" (the primary UUID)
- On related objects (policies, etc.): Use "insuredDatabaseId" to link to insureds
- In Zapier endpoints: Use "insured_database_id"

Common $filter examples:
- Search by ID: "id eq 'ed37f103-ca80-e6da-fa7a-abdfc4b8a7b3'"
- Search by name: "contains(firstName, 'John') or contains(lastName, 'Smith')"
- Search by commercial name: "contains(commercialName, 'ACME')"
- Search by email: "contains(eMail, 'test@example.com')"
- Search by phone (format ###-###-####): "contains(phone, '555-123-4567') or contains(cellPhone, '555-123-4567')"
- Search by city/state: "city eq 'Nashville' and state eq 'TN'"
- Active insureds: "active eq true"
- By type: "type eq 'Insured'" or "type eq 'Prospect'"
- Personal/Commercial: "insuredType eq 'Personal'" or "insuredType eq 'Commercial'"
- Date range: "changeDate ge 2024-01-01T00:00:00Z and changeDate le 2024-12-31T00:00:00Z"

Pagination examples:
- First 100 personal: $filter=insuredType eq 'Personal'&$top=100&$skip=0&$orderby=lastName asc&$count=true
- Combine params: $filter=contains(eMail, 'gmail') and active eq true&$top=50&$skip=0&$orderby=changeDate desc&$count=true

PHONE FORMAT: Always use ###-###-#### format (e.g., '555-123-4567', NOT '5551234567')

Available fields: id (primary key), commercialName, firstName, middleName, lastName, dateOfBirth, type, dba, addressLine1, addressLine2, state, city, zipCode, eMail, eMail2, eMail3, fax, phone, cellPhone, smsPhone, description, active, website, fein, customerId, insuredId, referralSourceCompanyName, changeDate, createDate, coInsured_FirstName, coInsured_MiddleName, coInsured_LastName, coInsured_DateOfBirth, insuredType, prospectType, acquisitionDate`,
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "OData filter expression (optional). Can be combined with other parameters.",
        },
        top: {
          type: "number",
          description: "Number of records to return (limit). Example: 100",
        },
        skip: {
          type: "number",
          description: "Number of records to skip (offset). Example: 0",
        },
        orderby: {
          type: "string",
          description: "Field to order by. Default: 'changeDate desc'. Example: 'InsuredLastName asc'",
        },
        select: {
          type: "string",
          description: "Comma-separated list of columns to return (optional)",
        },
        count: {
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
    description: `Insert a new insured/prospect record. This endpoint saves insured or prospect records.

IMPORTANT Field Requirements:
- At least ONE of these must be provided to identify the record:
  * databaseId (to update existing record)
  * commercialName (for businesses)
  * firstName AND lastName (for individuals)

- Type (REQUIRED integer): Determines contact type
  * 0 = Insured
  * 1 = Prospect
  * 2 = Underwriter (MGA)
  * 3 = NAIC (Carrier)
  * 4 = Finance_Company
  * 5 = Referral_Source
  * 6 = Other

- InsuredType (REQUIRED integer): Business classification
  * 0 = Commercial
  * 1 = Personal
  * 2 = LifeHealth_Group
  * 3 = LifeHealth_Individual
  * 4 = Medicare

- Active (REQUIRED boolean): true or false

Example for individual insured:
{
  "FirstName": "John",
  "LastName": "Doe",
  "Type": 0,
  "InsuredType": 1,
  "Active": true,
  "Email": "john@example.com",
  "Phone": "555-1234"
}`,
    inputSchema: {
      type: "object",
      properties: {
        insured: {
          type: "object",
          description: "Insured data to insert. Fields will be passed directly to the API.",
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
- Policy's own ID: "id" (the policy's primary UUID key)
- Link to insured: "insuredDatabaseId" (UUID linking to the insured/prospect)
- When linking other objects (vehicles, drivers) to this policy: Use "policyDatabaseId"

Common $filter examples:
- Search by policy ID: "id eq '1a847475-baf3-4ff6-b0ee-f26c3fa88720'"
- Search by insured ID: "insuredDatabaseId eq 'ed37f103-ca80-e6da-fa7a-abdfc4b8a7b3'"
- Search by policy number: "contains(number, 'POL123456')" or "number eq 'ABC-123-456'"
- Search by insured name: "contains(insuredFirstName, 'John') or contains(insuredLastName, 'Smith')"
- Search by insured email: "contains(insuredEmail, 'test@example.com')"
- Search by commercial name: "contains(insuredCommercialName, 'ACME')"
- Active policies only: "active eq true"
- By status: "status eq 'Active'" or "status eq 'Expired'" or "status eq 'Cancelled'"
- Quotes only: "isQuote eq true"
- Policies only (not quotes): "isQuote eq false"
- By carrier: "contains(carrierName, 'PROGRESSIVE')"
- By business type: "businessType eq 'Renewal'" or "businessType eq 'New_Business'"
- By billing type: "billingType eq 'Direct_Bill_100'"
- By date range: "effectiveDate ge 2024-01-01T00:00:00Z and effectiveDate le 2024-12-31T00:00:00Z"
- Expiring soon: "expirationDate le 2025-12-31T00:00:00Z and active eq true"
- Premium range: "totalPremium ge 1000 and totalPremium le 5000"

Pagination examples:
- Active policies: $filter=active eq true&$top=100&$skip=0&$orderby=effectiveDate desc&$count=true
- Expiring this year: $filter=expirationDate ge 2025-01-01T00:00:00Z and expirationDate le 2025-12-31T00:00:00Z&$top=50&$skip=0&$orderby=expirationDate asc&$count=true

Available fields: id (primary key), number, isQuote, effectiveDate, expirationDate, bindDate, businessType, businessSubType, description, billingType, insuredDatabaseId, insuredEmail, insuredFirstName, insuredLastName, insuredCommercialName, carrierName, carrierNAIC, mgaName, totalPremium, totalNonPremium, totalAgencyCommission, changeDate, cancellationDate, reinstatementDate, active, status, inceptionDate, createDate, policyTerm`,
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "OData filter expression (optional). Can be combined with other parameters.",
        },
        top: {
          type: "number",
          description: "Number of records to return (limit). Example: 100",
        },
        skip: {
          type: "number",
          description: "Number of records to skip (offset). Example: 0",
        },
        orderby: {
          type: "string",
          description: "Field to order by. Default: 'changeDate desc'. Examples: 'effectiveDate desc', 'expirationDate asc'",
        },
        select: {
          type: "string",
          description: "Comma-separated list of columns to return (optional)",
        },
        count: {
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

ID FIELD NAMING:
- Claim's own ID: "databaseId" (the claim's primary UUID)
- Link to insured: "insuredDatabaseId" (UUID of the insured/prospect)

Common $filter examples:
- Search by claim ID: "databaseId eq '7c8b37f8-e4d0-42f9-a7d0-ffefd163f657'"
- Search by claim number: "contains(claimNumber, '12345')" or "claimNumber eq '789456'"
- Search by policy number: "contains(policyNumber, 'POL123')"
- By status: "status eq 'Open'" or "status eq 'Closed'" or "status eq 'Submitted_To_Carrier'"
- Search by insured ID: "insuredDatabaseId eq 'ed37f103-ca80-e6da-fa7a-abdfc4b8a7b3'"
- Search by insured name: "contains(insuredFirstName, 'John') or contains(insuredLastName, 'Smith')"
- Search by insured email: "contains(insuredEmail, 'test@example.com')"
- Search by commercial name: "contains(insuredCommercialName, 'ACME')"
- By loss date range: "dateOfLossAndTime ge 2024-01-01T00:00:00Z and dateOfLossAndTime le 2024-12-31T00:00:00Z"
- By city/state: "city eq 'Nashville' and state eq 'TN'"
- Open claims: "status eq 'Open'"
- Recent claims: "changeDate ge 2024-01-01T00:00:00Z"

Pagination examples:
- Open claims: $filter=status eq 'Open'&$top=100&$skip=0&$orderby=dateOfLossAndTime desc&$count=true
- By insured: $filter=insuredDatabaseId eq 'guid-here'&$top=50&$skip=0&$orderby=changeDate desc&$count=true

Available fields: databaseId (primary key), claimNumber, status, street, city, state, zipCode, county, dateOfLossAndTime, describeLocation, policeOrFireDepartment, reportNumber, additionalComments, descriptionOfLossAndDamage, insuredDatabaseId, insuredEmail, insuredFirstName, insuredLastName, insuredCommercialName, policyNumber, changeDate, createDate, dateAndAmount (list)`,
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "OData filter expression (optional). Can be combined with other parameters.",
        },
        top: {
          type: "number",
          description: "Number of records to return (limit). Example: 100",
        },
        skip: {
          type: "number",
          description: "Number of records to skip (offset). Example: 0",
        },
        orderby: {
          type: "string",
          description: "Field to order by. Default: 'changeDate desc'. Example: 'ClaimDate desc'",
        },
        select: {
          type: "string",
          description: "Comma-separated list of columns to return (optional)",
        },
        count: {
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
    description: `Get drivers via Zapier endpoint. Drivers are linked to policies and insureds.

ID FIELD NAMING:
- Driver's own ID: "id" (primary UUID key)
- Link to policy: "policyIds" (list of policy UUIDs)
- Link to insured: "insuredDatabaseId" (insured's UUID)
- In Zapier endpoints: Use "database_id" and "policy_database_id"

Filter examples:
- By policy: Filter by policyIds containing specific policy UUID
- By insured: Filter by insuredDatabaseId
- Active drivers: Filter by active eq true
- Excluded drivers: Filter by excluded eq true
- By license state: Filter by licenseState

Available fields: id (primary key), firstName, middleName, lastName, dateOfBirth, ssn, excluded, licenseNumber, licenseState, licenseYear, hireDate, terminationDate, policyNumbers (list), insuredDatabaseId, insuredEmail, insuredFirstName, insuredLastName, insuredCommercialName, policyIds (list), active, maritalStatus, gender`,
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
    description: `Get vehicles via Zapier endpoint. Vehicles are linked to policies and insureds.

ID FIELD NAMING:
- Vehicle's own ID: "id" (primary UUID key)
- Link to policy: "policyIds" (list of policy UUIDs)
- Link to insured: "insuredDatabaseId" (insured's UUID)
- In Zapier endpoints: Use "database_id" and "policy_database_id"

Filter examples:
- By VIN: Filter by vin field
- By policy: Filter by policyIds containing specific policy UUID
- By insured: Filter by insuredDatabaseId
- By type: Filter by type (e.g., 'Truck', 'Car', 'SUV')
- By year: Filter by year
- Active vehicles: Filter by active eq true
- By make/model: Filter by make or model fields

Available fields: id (primary key), type, year, make, model, vin, description, typeOfUse, typeOfUseAsFlag, value, deductibleComprehensive, deductibleCollision, visible, policyNumbers (list), insuredDatabaseId, insuredEmail, insuredFirstName, insuredLastName, insuredCommercialName, policyIds (list), active, policyLevelCoverages (list), lienHolders (list)`,
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
    description: `Get principals/contacts (additional insureds/interested parties) from NowCerts using OData query parameters.

IMPORTANT: By default, results are ordered by 'changeDate desc' (most recently changed first).

ID FIELD NAMING:
- Principal's own ID: "databaseId" (primary UUID key)
- Link to insured: "insuredDatabaseId" (insured's UUID)

Common $filter examples:
- Search by ID: "databaseId eq '7c8b37f8-e4d0-42f9-a7d0-ffefd163f657'"
- Search by first name: "contains(firstName, 'John')"
- Search by last name: "contains(lastName, 'Smith')"
- Search by personal email: "contains(personalEmail, 'test@example.com')"
- Search by business email: "contains(businessEmail, 'business@example.com')"
- By type: "type eq 'Owner'" or "type eq 'Spouse'" or "type eq 'Other'"
- By insured ID: "insuredDatabaseId eq 'guid-here'"
- By insured name: "contains(insuredFirstName, 'John') or contains(insuredLastName, 'Smith')"
- Recent changes: "changeDate ge 2024-01-01T00:00:00Z"
- By gender: "gender eq 'Male'" or "gender eq 'Female'"

Pagination examples:
- All contacts for insured: $filter=insuredDatabaseId eq 'guid-here'&$top=100&$skip=0&$orderby=lastName asc&$count=true
- Owners only: $filter=type eq 'Owner'&$top=50&$skip=0&$orderby=changeDate desc&$count=true

Available fields: databaseId (primary key), firstName, middleName, lastName, description, type, personalEmail, businessEmail, homePhone, officePhone, cellPhone, personalFax, businessFax, ssn, birthday, insuredDatabaseId, insuredEmail, insuredFirstName, insuredLastName, insuredCommercialName, changeDate, dlNumber, dlYear, dlStateName, education, gender, industryName, isHealthPlanMember`,
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "OData filter expression (optional). Can be combined with other parameters.",
        },
        top: {
          type: "number",
          description: "Number of records to return (limit). Example: 100",
        },
        skip: {
          type: "number",
          description: "Number of records to skip (offset). Example: 0",
        },
        orderby: {
          type: "string",
          description: "Field to order by. Default: 'changeDate desc'. Example: 'PrincipalName asc'",
        },
        select: {
          type: "string",
          description: "Comma-separated list of columns to return (optional)",
        },
        count: {
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

  // ========== EXTERNAL API INTEGRATIONS ==========
  {
    name: "fenris_prefillHousehold",
    description: `Prefill household data using the Fenris Auto Insurance Prefill API.

This API provides comprehensive household information including:
- Household members (names, ages, relationships)
- Vehicles owned (VIN, year, make, model)
- Property details (year built, square footage, construction type)
- Prior insurance information

Use this BEFORE creating insureds/policies to save data entry time and improve accuracy.

Common use cases:
- New quote - auto-populate customer data
- Annual review - verify household composition
- Renewal - check for household changes

Returns structured data that can be directly used with NowCerts insert endpoints.`,
    inputSchema: {
      type: "object",
      properties: {
        firstName: {
          type: "string",
          description: "Primary insured first name (required)",
        },
        middleName: {
          type: "string",
          description: "Primary insured middle name (optional)",
        },
        lastName: {
          type: "string",
          description: "Primary insured last name (required)",
        },
        address: {
          type: "string",
          description: "Street address (required)",
        },
        city: {
          type: "string",
          description: "City (required)",
        },
        state: {
          type: "string",
          description: "State abbreviation (e.g., 'DE', 'TN') (required)",
        },
        zip: {
          type: "string",
          description: "5-digit ZIP code (required)",
        },
        dateOfBirth: {
          type: "string",
          description: "Date of birth in MM/DD/YYYY format (optional but recommended)",
        },
      },
      required: ["firstName", "lastName", "address", "city", "state", "zip"],
    },
  },
  {
    name: "smarty_verifyAddress",
    description: `Verify and standardize addresses using the Smarty Address Verification API.

This API validates addresses against USPS data and returns:
- Standardized address format (proper casing, abbreviations)
- Address components (street, city, state, ZIP+4)
- Delivery point validation
- County information
- Congressional district
- Latitude/Longitude coordinates
- Property metadata

Use this to:
- Validate addresses before creating insured records
- Standardize addresses for consistency
- Ensure accurate mailing addresses
- Get geocoding data for properties

IMPORTANT: Always use the standardized address returned by this API in your NowCerts records.`,
    inputSchema: {
      type: "object",
      properties: {
        street: {
          type: "string",
          description: "Street address line (required)",
        },
        street2: {
          type: "string",
          description: "Apartment, suite, unit number (optional)",
        },
        city: {
          type: "string",
          description: "City name (optional if providing ZIP)",
        },
        state: {
          type: "string",
          description: "State abbreviation (e.g., 'TN') (optional if providing ZIP)",
        },
        zipcode: {
          type: "string",
          description: "5 or 9-digit ZIP code (optional if providing city/state)",
        },
      },
      required: ["street"],
    },
  },
  {
    name: "nhtsa_decodeVin",
    description: `Decode VIN using the NHTSA Vehicle API to get comprehensive vehicle information.

This API returns detailed vehicle specifications including:
- Year, Make, Model, Trim
- Body Type (Sedan, SUV, Truck, etc.)
- Engine specifications (type, displacement, cylinders)
- Transmission type
- Drive type (FWD, RWD, AWD, 4WD)
- Manufacturer details
- Plant information
- Safety ratings
- GVWR (Gross Vehicle Weight Rating)
- Vehicle type classification

Use this to:
- Auto-populate vehicle fields when customer provides VIN
- Verify vehicle information for accuracy
- Get standard vehicle specifications
- Determine proper insurance classification

IMPORTANT: VIN must be exactly 17 characters.`,
    inputSchema: {
      type: "object",
      properties: {
        vin: {
          type: "string",
          description: "17-character Vehicle Identification Number (required)",
        },
        modelYear: {
          type: "number",
          description: "Model year (optional, helps with accuracy)",
        },
      },
      required: ["vin"],
    },
  },
  {
    name: "nhtsa_checkRecalls",
    description: `Check for open safety recalls on a vehicle using the NHTSA Recalls API.

This API searches the NHTSA database for any open safety recalls on the specified vehicle.

Returns for each recall:
- Recall campaign number
- Recall date
- Component description
- Summary of the defect
- Consequence of the defect
- Corrective action/remedy
- Manufacturer's recall number
- Whether the recall is safety-related

Use this to:
- Inform customers of open recalls when quoting
- Check recalls during annual review
- Verify recalls during claim investigation
- Due diligence before binding policies

IMPORTANT:
- Always inform customers of open recalls
- Document in notes if recalls are found
- Some states require disclosure of recall information`,
    inputSchema: {
      type: "object",
      properties: {
        vin: {
          type: "string",
          description: "17-character Vehicle Identification Number (required)",
        },
        modelYear: {
          type: "number",
          description: "Model year (optional but recommended)",
        },
        make: {
          type: "string",
          description: "Vehicle make (optional, improves search)",
        },
        model: {
          type: "string",
          description: "Vehicle model (optional, improves search)",
        },
      },
      required: ["vin"],
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

  // ========== EXTERNAL API HANDLERS ==========

  // Fenris Prefill API Handler
  if (toolName === "fenris_prefillHousehold") {
    // Note: Requires FENRIS_CLIENT_ID and FENRIS_CLIENT_SECRET environment variables
    const fenrisClientId = process.env.FENRIS_CLIENT_ID;
    const fenrisClientSecret = process.env.FENRIS_CLIENT_SECRET;

    if (!fenrisClientId || !fenrisClientSecret) {
      return {
        content: [
          {
            type: "text",
            text: "Error: FENRIS_CLIENT_ID and FENRIS_CLIENT_SECRET environment variables not set. Please add your Fenris credentials to use this feature.\n\nTo get credentials, visit: https://fenrisdata.com",
          },
        ],
        isError: true,
      };
    }

    try {
      // Get cached or fresh access token (automatically handles renewal)
      const accessToken = await getFenrisAccessToken(fenrisClientId, fenrisClientSecret);

      // Call Fenris API with Bearer token
      const response = await axios.post(
        "https://api.fenrisd.com/services/personal/v1/autoprefill/search",
        {
          responseType: "C",
          person: {
            firstName: args.firstName,
            middleName: args.middleName || "",
            lastName: args.lastName,
            dateOfBirth: args.dateOfBirth, // Format: MM/DD/YYYY
          },
          address: {
            addressLine1: args.address,
            addressLine2: "",
            city: args.city,
            state: args.state,
            zipCode: args.zip,
          },
        },
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "products": "Personal",
            "Request-Id": `mcp-${Date.now()}`,
          },
        }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error calling Fenris API: ${error.message}\n${error.response?.data ? JSON.stringify(error.response.data, null, 2) : ""}`,
          },
        ],
        isError: true,
      };
    }
  }

  // Smarty Address Verification Handler
  if (toolName === "smarty_verifyAddress") {
    const smartyAuthId = process.env.SMARTY_AUTH_ID;
    const smartyAuthToken = process.env.SMARTY_AUTH_TOKEN;

    if (!smartyAuthId || !smartyAuthToken) {
      return {
        content: [
          {
            type: "text",
            text: "Error: SMARTY_AUTH_ID and SMARTY_AUTH_TOKEN environment variables not set.\n\nTo get credentials, visit: https://www.smarty.com/pricing",
          },
        ],
        isError: true,
      };
    }

    try {
      const response = await axios.get(
        "https://us-street.api.smarty.com/street-address",
        {
          params: {
            "auth-id": smartyAuthId,
            "auth-token": smartyAuthToken,
            street: args.street,
            street2: args.street2,
            city: args.city,
            state: args.state,
            zipcode: args.zipcode,
          },
        }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error calling Smarty API: ${error.message}\n${error.response?.data ? JSON.stringify(error.response.data, null, 2) : ""}`,
          },
        ],
        isError: true,
      };
    }
  }

  // NHTSA VIN Decoder Handler (Free, no API key needed)
  if (toolName === "nhtsa_decodeVin") {
    try {
      const vin = (args as any).vin;
      if (!vin || vin.length !== 17) {
        return {
          content: [
            {
              type: "text",
              text: "Error: VIN must be exactly 17 characters",
            },
          ],
          isError: true,
        };
      }

      const modelYear = (args as any).modelYear ? `/${(args as any).modelYear}` : "";
      const response = await axios.get(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}${modelYear}?format=json`
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error calling NHTSA VIN Decoder API: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  // NHTSA Recalls Check Handler (Free, no API key needed)
  if (toolName === "nhtsa_checkRecalls") {
    try {
      const vin = (args as any).vin;
      if (!vin || vin.length !== 17) {
        return {
          content: [
            {
              type: "text",
              text: "Error: VIN must be exactly 17 characters",
            },
          ],
          isError: true,
        };
      }

      const response = await axios.get(
        `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${(args as any).make || ""}&model=${(args as any).model || ""}&modelYear=${(args as any).modelYear || ""}&vin=${vin}`
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error calling NHTSA Recalls API: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  // ========== NOWCERTS API HANDLERS ==========

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

### Type (for Insured/Prospect objects)
**IMPORTANT**: This field determines whether a contact is an Insured, Prospect, Carrier, etc.
Required for endpoints like Insured/Insert, Prospect/Insert, and similar operations.

Integer values required:
- 0 = Insured
- 1 = Prospect
- 2 = Underwriter (MGA)
- 3 = NAIC (Carrier)
- 4 = Finance_Company
- 5 = Referral_Source
- 6 = Other

Example usage in Insured/Insert:
\`\`\`json
{
  "Type": 0,
  "FirstName": "John",
  "LastName": "Doe",
  ...
}
\`\`\`

### InsuredType
**IMPORTANT**: This field specifies the business classification (Commercial vs Personal).
Required integer values:
- 0 = Commercial
- 1 = Personal
- 2 = LifeHealth_Group (Life-Health Group)
- 3 = LifeHealth_Individual (Life-Health Individual)
- 4 = Medicare

Example usage:
\`\`\`json
{
  "InsuredType": 0,  // Commercial
  "Type": 0,         // Insured (not Prospect)
  ...
}
\`\`\`

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

  // Special handling for insert endpoints that wrap data in a nested object
  // The API expects fields at root level, not wrapped in insured/data/etc objects
  let requestData = args;
  if (toolName === 'nowcerts_insured_insert' ||
      toolName === 'nowcerts_insured_insertNoOverride' ||
      toolName === 'nowcerts_insured_insertWithCustomFields') {
    requestData = (args.insured as Record<string, unknown>) || args;
  } else if (toolName === 'nowcerts_insured_insuredAndPoliciesInsert') {
    requestData = (args.data as Record<string, unknown>) || args;
  }

  try {
    const result = await client.request(endpoint.method, endpoint.path, requestData);
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
