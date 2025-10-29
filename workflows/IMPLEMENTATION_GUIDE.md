# N8N Workflow Implementation Guide

## Overview

This guide explains how to implement the multi-channel insurance intake workflows using the n8n-workflow-builder MCP server.

## What We've Built

### ✅ Completed Architecture

1. **Multi-Agent System** (`prompts/N8N_MULTI_AGENT_ARCHITECTURE.md`)
   - 7 specialized AI agents
   - Coordinator agent for routing
   - Clear separation of concerns

2. **Agent Prompts** (7 files in `prompts/`)
   - `N8N_COORDINATOR_AGENT.md` - Main routing agent
   - `N8N_INTAKE_AGENT.md` - Information gathering
   - `N8N_RESEARCH_AGENT.md` - External API enrichment
   - `N8N_COVERAGE_ADVISOR_AGENT.md` - Insurance recommendations
   - `N8N_DATA_MANAGER_AGENT.md` - NowCerts operations
   - `N8N_FOLLOWUP_AGENT.md` - Scheduling & tasks
   - `N8N_CROSSSELL_AGENT.md` - Bundle opportunities

3. **Workflow Architecture** (`workflows/N8N_WORKFLOW_ARCHITECTURE.md`)
   - 4 intake channels (Email, SMS, Chat, Voice)
   - Message classification system
   - Agent workflow definitions
   - Data flow diagrams
   - Implementation phases

## Using the N8N Workflow Builder MCP

### MCP Server Details

**Server URL**: `https://server.smithery.ai/@makafeli/n8n-workflow-builder/mcp`
**API Key**: `47ae352b-3d6c-43b7-a03e-c330e9a9bbd4`
**Profile**: `lively-girl-faACjx`

### Available Resources

- **n8n-mcp** (`/home/user/n8n-mcp/`) - Full n8n MCP server with 525+ node documentation
- **n8n instance** - https://n8n.srv992249.hstgr.cloud/
- **NowCerts MCP** - https://mcp.srv992249.hstgr.cloud/sse

## Step-by-Step Implementation

### Phase 1: Foundation Workflows (Priority 1)

#### 1.1 Message Classifier Workflow

**Purpose**: Classify incoming messages by intent and priority

**Nodes Needed**:
- Webhook Trigger (accepts from all channels)
- OpenAI/Claude AI node (classification)
- Function node (data extraction)
- HTTP Request (NowCerts customer search)
- Switch node (route by intent)

**Build Instructions**:
```
1. Create webhook that accepts:
   - channel: 'email' | 'sms' | 'chat' | 'voice'
   - messageText: string
   - customerData: object

2. Use AI node to classify:
   System Prompt: "You are an insurance request classifier. Analyze the message and return:
   - intent: (new_auto_quote, new_home_quote, add_driver, add_vehicle, etc.)
   - priority: (urgent, high, normal, low)
   - extractedData: {names, phones, emails, vins, addresses}"

3. Extract data with Function node:
   - Normalize phone numbers (###-###-####)
   - Validate emails
   - Clean names

4. Search NowCerts for existing customer:
   HTTP Request to NowCerts MCP:
   - Filter by phone
   - Filter by email

5. Route with Switch node:
   - Case 1: new_auto_quote → Auto Quote Workflow
   - Case 2: new_home_quote → Home Quote Workflow
   - Case 3: service_request → Service Workflow
   - Case 4: general_inquiry → General Workflow
```

**Test Data**:
```json
{
  "channel": "email",
  "messageText": "I need car insurance for my 2020 Honda Accord. My name is John Smith, phone 555-123-4567, email john@email.com",
  "customerEmail": "john@email.com"
}
```

---

#### 1.2 Email Intake Workflow

**Purpose**: Handle quote requests from Gmail

**Nodes Needed**:
- Gmail Trigger (watch inbox)
- Function node (parse email)
- HTTP Request node (call message classifier)
- Gmail Send node (auto-reply)
- Set node (store execution data)

**Build Instructions**:
```
1. Gmail Trigger:
   - Watch folder: "Inbox" or "Quotes"
   - Filters: to:quotes@reducemyins.com

2. Parse Email:
   Function node:
   - Extract from, subject, body
   - Parse attachments
   - Clean HTML

3. Call Message Classifier:
   HTTP Request (POST):
   URL: http://n8n-instance/webhook/classifier
   Body: {
     channel: "email",
     messageText: emailBody,
     customerEmail: fromEmail,
     subject: subject
   }

4. Send Auto-Reply:
   Gmail Send:
   To: {{ $json.fromEmail }}
   Subject: "Re: {{ $json.subject }}"
   Body: "Thank you for contacting ReduceMyIns! We received your request for {{ $json.intent }} and will respond within 1-2 hours."

5. Store Data:
   Set node to store execution info for monitoring
```

---

#### 1.3 SMS Intake Workflow

**Purpose**: Handle quote requests from Twilio SMS

**Nodes Needed**:
- Webhook Trigger (Twilio)
- Function node (parse SMS)
- HTTP Request (classifier)
- HTTP Request (NowCerts search)
- Twilio Send SMS node (auto-reply)

**Build Instructions**:
```
1. Webhook Trigger:
   Path: /webhook/sms
   HTTP Method: POST
   Accept: Twilio webhook format

2. Parse SMS:
   Function node:
   - Extract: From, Body, MessageSid
   - Normalize phone: ###-###-####

3. Search Customer History:
   HTTP Request to NowCerts MCP:
   POST /sse
   Body: {
     "tool": "nowcerts_insured_getList",
     "params": {
       "filter": "contains(phone, '{{phone}}') or contains(cellPhone, '{{phone}}')"
     }
   }

4. Call Classifier:
   Pass SMS + customer history

5. Send Auto-Reply:
   Twilio Send SMS:
   To: {{ $json.From }}
   Body: "Thanks {{name}}! We got your message about {{intent}}. We'll text you back with a quote shortly."
```

---

### Phase 2: Core Agent Workflows (Priority 2)

#### 2.1 Coordinator Agent Workflow

**Purpose**: Route to specialized sub-agents

**Nodes Needed**:
- Webhook Trigger
- Switch node (routing logic)
- HTTP Request nodes (call sub-agents)
- Function node (compile results)
- Webhook Response (return to channel)

**Build Instructions**:
```
1. Webhook Trigger:
   Accepts classified request from intake workflows

2. Route with Switch:
   Based on workflow stage:
   - Stage 1: need_contact_info → Intake Agent
   - Stage 2: have_address → Research Agent
   - Stage 3: have_data → Coverage Advisor
   - Stage 4: ready_to_save → Data Manager
   - Stage 5: complete → Follow-up Agent

3. Call Sub-Agent Workflows:
   HTTP Request to each agent's webhook
   Pass full context + specific task

4. Compile Results:
   Function node:
   - Merge agent responses
   - Format for customer
   - Determine next step

5. Return Response:
   Webhook Response with:
   - message: Customer-facing text
   - nextStep: What happens next
   - data: Structured data for next agent
```

**Reference**: See `prompts/N8N_COORDINATOR_AGENT.md` for full routing logic

---

#### 2.2 Intake Agent Workflow

**Purpose**: Gather and validate customer information

**Nodes Needed**:
- Webhook Trigger
- Function node (data extraction)
- HTTP Request (Smarty address validation)
- HTTP Request (NowCerts duplicate check)
- Function node (normalize data)
- Webhook Response

**Build Instructions**:
```
1. Receive Request:
   Input: {
     task: 'gather_contact_info',
     partialData: {...},
     customerResponses: [...]
   }

2. Extract & Normalize:
   Function node:
   - Phone: ANY format → ###-###-####
   - Email: Validate format
   - Name: Title case
   - Address: Parse components

3. Validate Address:
   HTTP Request to Smarty API:
   POST https://us-street.api.smarty.com/street-address
   Auth: {{SMARTY_AUTH_ID}}:{{SMARTY_AUTH_TOKEN}}
   Body: {
     street: address.line1,
     city: address.city,
     state: address.state,
     zipcode: address.zip
   }

4. Check Duplicates:
   HTTP Request to NowCerts MCP:
   - Search by phone
   - Search by email
   - Return if found

5. Return Structured Data:
   Webhook Response: {
     status: 'success',
     data: {validated customer data},
     validations: [checks performed],
     duplicate_found: boolean,
     next_recommended: 'research_agent'
   }
```

**Reference**: See `prompts/N8N_INTAKE_AGENT.md` for complete specification

---

#### 2.3 Research Agent Workflow

**Purpose**: Enrich data with external APIs

**Nodes Needed**:
- Webhook Trigger
- HTTP Request (Fenris API)
- HTTP Request (NHTSA VIN decode) - Loop node
- HTTP Request (NHTSA Recalls) - Loop node
- HTTP Request (Smarty property data)
- Function node (compile enriched data)
- Webhook Response

**Build Instructions**:
```
1. Receive Customer Data:
   Input: {
     customerData: {contact, address},
     policyType: 'auto' | 'home'
   }

2. Run Fenris (if auto):
   HTTP Request to Fenris API:
   POST /api/prefill
   Body: {
     firstName, lastName,
     address, city, state, zip
   }
   Returns: vehicles, drivers, property

3. Decode VINs (loop):
   For each vehicle with VIN:
   HTTP Request to NowCerts MCP:
   Tool: nhtsa_decodeVin
   Params: {vin: vehicleVin}

4. Check Recalls (loop):
   For each VIN:
   HTTP Request to NowCerts MCP:
   Tool: nhtsa_checkRecalls
   Params: {vin: vehicleVin}

5. Property Data (if home):
   HTTP Request to Smarty:
   Get property metadata

6. Compile Results:
   Function node:
   - Merge all enrichment data
   - Calculate confidence score
   - Identify opportunities
   - Flag any recalls

7. Return Enriched Package:
   Webhook Response: {
     status: 'success',
     enriched_data: {...},
     confidence: 'high' | 'medium' | 'low',
     opportunities: [...],
     warnings: [recalls, etc.]
   }
```

**Reference**: See `prompts/N8N_RESEARCH_AGENT.md` for full API specifications

---

#### 2.4 Data Manager Workflow

**Purpose**: Save quote data to NowCerts

**Nodes Needed**:
- Webhook Trigger
- HTTP Request (search customer)
- HTTP Request (create prospect/insured)
- HTTP Request (create quote)
- Loop node (add drivers)
- Loop node (add vehicles)
- HTTP Request (add property if applicable)
- HTTP Request (create comprehensive notes)
- Webhook Response

**Build Instructions**:
```
1. Receive Complete Data:
   Input: {
     customerData: {...},
     vehicles: [...],
     drivers: [...],
     property: {...},
     coverage: {...}
   }

2. Search/Create Customer:
   HTTP Request to NowCerts MCP:
   Tool: nowcerts_insured_getList
   If not found:
     Tool: nowcerts_prospect_insert

3. Create Quote:
   HTTP Request to NowCerts MCP:
   Tool: nowcerts_quote_insert
   Body: {
     insuredDatabaseId: from step 2,
     lineOfBusiness: 'Personal Auto',
     effectiveDate, expirationDate,
     status: 'Quoting',
     agentId: '7fa050a2-c4c0-4e1c-8860-2008a6f0aec2'
   }

4. Add Drivers (bulk):
   HTTP Request to NowCerts MCP:
   Tool: nowcerts_driver_bulkInsert
   Body: {
     policyDatabaseId: from step 3,
     drivers: [all drivers with details]
   }

5. Add Vehicles (bulk):
   HTTP Request to NowCerts MCP:
   Tool: nowcerts_vehicle_bulkInsert
   Body: {
     policyDatabaseId: from step 3,
     vehicles: [all vehicles]
   }

6. Add Property (if applicable):
   HTTP Request to NowCerts MCP:
   Tool: nowcerts_property_insert

7. Create Notes:
   HTTP Request to NowCerts MCP:
   Tool: nowcerts_note_insert
   Include:
   - Data sources (Fenris, NHTSA, etc.)
   - Lienholder info for manual addition
   - Special observations
   - Recall notifications

8. Return Success:
   Webhook Response: {
     status: 'success',
     insuredId, quoteId,
     driverIds: [...],
     vehicleIds: [...],
     propertyId: ...,
     noteIds: [...]
   }
```

**Reference**: See `prompts/N8N_DATA_MANAGER_AGENT.md` for complete field mappings

---

### Phase 3: Advanced Workflows (Priority 3)

#### 3.1 Coverage Advisor Workflow
- See `prompts/N8N_COVERAGE_ADVISOR_AGENT.md`
- Pure logic, no external APIs
- Returns coverage recommendations with reasoning

#### 3.2 Follow-up Agent Workflow
- See `prompts/N8N_FOLLOWUP_AGENT.md`
- Creates tasks in NowCerts
- Schedules callbacks
- Sends email confirmations

#### 3.3 Cross-Sell Agent Workflow
- See `prompts/N8N_CROSSSELL_AGENT.md`
- Analyzes for bundle opportunities
- Calculates potential savings
- Prioritizes recommendations

#### 3.4 Chat Intake Workflow
- Webhook trigger for chat platform
- Maintains conversation state (Redis/DB)
- Real-time responses
- Escalation to human agent

#### 3.5 Voice Intake Workflow
- Aircall webhook (call completed)
- Transcription analysis
- Same agent workflow
- SMS confirmation follow-up

---

## Environment Configuration

### Required Environment Variables

```bash
# NowCerts MCP
NOWCERTS_MCP_URL=https://mcp.srv992249.hstgr.cloud/sse

# Fenris API
FENRIS_CLIENT_ID=your-fenris-client-id
FENRIS_CLIENT_SECRET=your-fenris-client-secret

# Smarty API
SMARTY_AUTH_ID=your-smarty-auth-id
SMARTY_AUTH_TOKEN=your-smarty-auth-token

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Gmail
# (Configure OAuth in n8n credentials)

# Aircall
AIRCALL_API_ID=your-aircall-id
AIRCALL_API_TOKEN=your-aircall-token

# Chase Henderson
CHASE_AGENT_ID=7fa050a2-c4c0-4e1c-8860-2008a6f0aec2
```

---

## Testing Strategy

### Unit Tests (Per Workflow)

1. **Message Classifier**
   - Test email intent classification
   - Test SMS intent classification
   - Test data extraction
   - Test priority assignment

2. **Intake Agent**
   - Test phone normalization
   - Test address validation
   - Test duplicate detection

3. **Research Agent**
   - Test Fenris with sample address
   - Test VIN decode
   - Test recall check

4. **Data Manager**
   - Test prospect creation
   - Test quote creation
   - Test bulk driver/vehicle insert

### Integration Tests

1. **End-to-End Email Flow**
   - Send test email
   - Verify classification
   - Verify agent execution
   - Verify NowCerts record creation
   - Verify auto-reply sent

2. **End-to-End SMS Flow**
   - Send test SMS
   - Verify response
   - Verify quote created

3. **Error Scenarios**
   - API failures
   - Invalid data
   - Duplicate customers

---

## Monitoring & Alerts

### Key Metrics Dashboard

Create n8n workflow to track:
- Messages received per channel (last 24h)
- Average response time per channel
- Agent execution times
- API failure rates
- Quotes created per day
- Conversion rate (message → quote)

### Alert Conditions

1. **Critical Alerts** (Slack immediately):
   - NowCerts API down
   - Fenris API down >10 min
   - Email not sent for >1 hour
   - Workflow failure rate >10%

2. **Warning Alerts** (Email daily digest):
   - Slow response times (>30 sec)
   - Duplicate customer rate increasing
   - Missing data in quotes

---

## Deployment Checklist

### Pre-Deployment

- [ ] All workflows created and tested
- [ ] Environment variables configured
- [ ] Credentials added to n8n
- [ ] Webhooks registered (Twilio, Gmail, Aircall)
- [ ] Test emails/SMS sent successfully
- [ ] NowCerts MCP connectivity verified
- [ ] Error handling tested
- [ ] Monitoring dashboard created

### Post-Deployment

- [ ] Monitor first 10 requests closely
- [ ] Check NowCerts for created records
- [ ] Verify auto-replies sent
- [ ] Confirm tasks created for Chase
- [ ] Review agent execution times
- [ ] Check error logs
- [ ] Customer satisfaction check

### Ongoing Maintenance

- [ ] Weekly: Review metrics dashboard
- [ ] Weekly: Check error logs
- [ ] Monthly: Optimize slow workflows
- [ ] Monthly: Review and update prompts
- [ ] Quarterly: Add new features
- [ ] Quarterly: Review agent performance

---

## Troubleshooting

### Common Issues

**1. "NowCerts MCP timeout"**
- Check MCP server status
- Verify credentials
- Retry with exponential backoff

**2. "Fenris API error"**
- Fallback: Skip prefill, ask customer manually
- Log for later analysis

**3. "Duplicate customer detected"**
- Prompt Coordinator: "Found existing. Confirm?"
- Use existing if confirmed

**4. "SMS auto-reply not sent"**
- Check Twilio credentials
- Verify phone number format
- Check rate limits

**5. "Email classification incorrect"**
- Review AI prompt
- Add more examples
- Adjust classification logic

---

## Next Steps

### Immediate (This Week)

1. **Export existing workflow** from https://n8n.srv992249.hstgr.cloud/workflow/nqI0qW6mo0vpxPE7
2. **Build Phase 1 workflows**:
   - Message Classifier
   - Email Intake
   - SMS Intake
3. **Test with real data**
4. **Deploy to production**

### Short-term (Next 2 Weeks)

1. **Build Phase 2 workflows**:
   - Coordinator Agent
   - Intake Agent
   - Research Agent
   - Data Manager
2. **Integrate with existing workflow**
3. **Full end-to-end testing**

### Long-term (Next Month)

1. **Build Phase 3 workflows**:
   - Coverage Advisor
   - Follow-up Agent
   - Cross-Sell Agent
   - Chat Intake
   - Voice Intake
2. **Service request workflows**
3. **Advanced monitoring**
4. **Performance optimization**

---

## Support & Resources

### Documentation References

- **Agent Architecture**: `/prompts/N8N_MULTI_AGENT_ARCHITECTURE.md`
- **Coordinator Agent**: `/prompts/N8N_COORDINATOR_AGENT.md`
- **All Sub-Agents**: `/prompts/N8N_*_AGENT.md` (7 files)
- **Workflow Architecture**: `/workflows/N8N_WORKFLOW_ARCHITECTURE.md`
- **NowCerts MCP Tools**: See `src/index.ts` in Nowcerts-MCP repo

### N8N Resources

- **n8n Docs**: https://docs.n8n.io/
- **n8n Community**: https://community.n8n.io/
- **n8n MCP**: `/home/user/n8n-mcp/` (525+ nodes documented)

### Contact

For questions or issues:
1. Review this guide
2. Check agent prompt files
3. Review workflow architecture
4. Test with sample data
5. Contact development team

---

**This implementation guide provides everything needed to build the complete multi-channel insurance intake system using n8n workflows and the multi-agent architecture.**
