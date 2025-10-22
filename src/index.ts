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
      const response = await this.axiosInstance.request({
        method,
        url: endpoint,
        data,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.refreshToken();
        const response = await this.axiosInstance.request({
          method,
          url: endpoint,
          data,
        });
        return response.data;
      }
      throw error;
    }
  }
}

// Tool definitions for all NowCerts endpoints
const tools: Tool[] = [
  // ========== AGENT ENDPOINTS ==========
  {
    name: "nowcerts_agent_getList",
    description: "Retrieve a list of agents with OData-style pagination. Must provide either $filter OR all three of ($top, $skip, $orderby).",
    inputSchema: {
      type: "object",
      properties: {
        $filter: {
          type: "string",
          description: "OData filter expression (e.g., 'AgentName eq John'). Use this OR the pagination trio ($top, $skip, $orderby).",
        },
        $top: {
          type: "number",
          description: "Number of records to return (limit). Required with $skip and $orderby if not using $filter.",
        },
        $skip: {
          type: "number",
          description: "Number of records to skip (offset). Required with $top and $orderby if not using $filter.",
        },
        $orderby: {
          type: "string",
          description: "Field to order by (e.g., 'AgentName asc' or 'AgentId desc'). Required with $top and $skip if not using $filter.",
        },
        $select: {
          type: "string",
          description: "Comma-separated list of columns to return (e.g., 'AgentId,AgentName,Email')",
        },
      },
    },
  },

  // ========== INSURED ENDPOINTS ==========
  {
    name: "nowcerts_insured_getList",
    description: "Retrieve a paginated list of insureds using OData. Must provide either $filter OR all three of ($top, $skip, $orderby).",
    inputSchema: {
      type: "object",
      properties: {
        $filter: {
          type: "string",
          description: "OData filter expression. Use this OR the pagination trio ($top, $skip, $orderby).",
        },
        $top: {
          type: "number",
          description: "Number of records to return. Required with $skip and $orderby if not using $filter.",
        },
        $skip: {
          type: "number",
          description: "Number of records to skip. Required with $top and $orderby if not using $filter.",
        },
        $orderby: {
          type: "string",
          description: "Field to order by (e.g., 'InsuredName asc'). Required with $top and $skip if not using $filter.",
        },
        $select: {
          type: "string",
          description: "Comma-separated list of columns to return",
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
    description: "Get paginated list of policies using OData. Must provide either $filter OR all three of ($top, $skip, $orderby).",
    inputSchema: {
      type: "object",
      properties: {
        $filter: {
          type: "string",
          description: "OData filter expression. Use this OR the pagination trio ($top, $skip, $orderby).",
        },
        $top: {
          type: "number",
          description: "Number of records to return. Required with $skip and $orderby if not using $filter.",
        },
        $skip: {
          type: "number",
          description: "Number of records to skip. Required with $top and $orderby if not using $filter.",
        },
        $orderby: {
          type: "string",
          description: "Field to order by (e.g., 'EffectiveDate desc'). Required with $top and $skip if not using $filter.",
        },
        $select: {
          type: "string",
          description: "Comma-separated list of columns to return",
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
    description: "Get paginated list of claims using OData. Must provide either $filter OR all three of ($top, $skip, $orderby).",
    inputSchema: {
      type: "object",
      properties: {
        $filter: {
          type: "string",
          description: "OData filter expression. Use this OR the pagination trio ($top, $skip, $orderby).",
        },
        $top: {
          type: "number",
          description: "Number of records to return. Required with $skip and $orderby if not using $filter.",
        },
        $skip: {
          type: "number",
          description: "Number of records to skip. Required with $top and $orderby if not using $filter.",
        },
        $orderby: {
          type: "string",
          description: "Field to order by (e.g., 'ClaimDate desc'). Required with $top and $skip if not using $filter.",
        },
        $select: {
          type: "string",
          description: "Comma-separated list of columns to return",
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
    description: "Get drivers via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_driver_insert",
    description: "Insert a new driver",
    inputSchema: {
      type: "object",
      properties: {
        driver: {
          type: "object",
          description: "Driver data",
          required: true,
        },
      },
      required: ["driver"],
    },
  },
  {
    name: "nowcerts_driver_bulkInsert",
    description: "Bulk insert multiple drivers",
    inputSchema: {
      type: "object",
      properties: {
        drivers: {
          type: "array",
          items: { type: "object" },
          description: "Array of driver data",
          required: true,
        },
      },
      required: ["drivers"],
    },
  },

  // ========== VEHICLE ENDPOINTS ==========
  {
    name: "nowcerts_vehicle_getVehicles",
    description: "Get vehicles via Zapier endpoint",
    inputSchema: {
      type: "object",
      properties: {
        filters: { type: "object" },
      },
    },
  },
  {
    name: "nowcerts_vehicle_insert",
    description: "Insert a new vehicle",
    inputSchema: {
      type: "object",
      properties: {
        vehicle: {
          type: "object",
          description: "Vehicle data",
          required: true,
        },
      },
      required: ["vehicle"],
    },
  },
  {
    name: "nowcerts_vehicle_bulkInsert",
    description: "Bulk insert multiple vehicles",
    inputSchema: {
      type: "object",
      properties: {
        vehicles: {
          type: "array",
          items: { type: "object" },
          description: "Array of vehicle data",
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
    description: "Get paginated list of principals using OData. Must provide either $filter OR all three of ($top, $skip, $orderby).",
    inputSchema: {
      type: "object",
      properties: {
        $filter: {
          type: "string",
          description: "OData filter expression. Use this OR the pagination trio ($top, $skip, $orderby).",
        },
        $top: {
          type: "number",
          description: "Number of records to return. Required with $skip and $orderby if not using $filter.",
        },
        $skip: {
          type: "number",
          description: "Number of records to skip. Required with $top and $orderby if not using $filter.",
        },
        $orderby: {
          type: "string",
          description: "Field to order by (e.g., 'PrincipalName asc'). Required with $top and $skip if not using $filter.",
        },
        $select: {
          type: "string",
          description: "Comma-separated list of columns to return",
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
  // Agent
  nowcerts_agent_getList: { method: "GET", path: "/AgentList()" },

  // Insured
  nowcerts_insured_getList: { method: "GET", path: "/InsuredList()" },
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
  nowcerts_policy_getList: { method: "GET", path: "/PolicyList()" },
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
  nowcerts_claim_getList: { method: "GET", path: "/ClaimList()" },
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
  nowcerts_principal_getList: { method: "GET", path: "/PrincipalList()" },
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

  const endpoint = endpointMap[toolName];
  if (!endpoint) {
    throw new Error(`Unknown tool: ${toolName}`);
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
