# N8N Multi-Channel Insurance Workflow Architecture

## Overview

This document defines the complete n8n workflow architecture for handling insurance quote requests and policy service tasks across **4 intake channels**:

1. **Email** - Customer emails to quotes@reducemyins.com
2. **SMS** - Text messages to agency number
3. **Chat** - Website chat widget or messaging platform
4. **Voice** - Aircall phone calls (transcribed)

All channels route to the same **multi-agent processing system** based on the agent architecture defined in `N8N_MULTI_AGENT_ARCHITECTURE.md`.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTAKE CHANNELS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📧 Email          📱 SMS          💬 Chat          ☎️ Voice     │
│  (Gmail)        (Twilio)      (Chat Widget)     (Aircall)       │
│                                                                 │
└────────┬──────────────┬──────────────┬──────────────┬───────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────┐
         │   MESSAGE CLASSIFIER & ROUTER        │
         │  (Determines intent & priority)      │
         └──────────────┬───────────────────────┘
                        │
         ┌──────────────┴───────────────┐
         │                              │
         ▼                              ▼
┌─────────────────┐           ┌─────────────────┐
│  QUOTE REQUEST  │           │ SERVICE REQUEST │
│    WORKFLOW     │           │    WORKFLOW     │
└────────┬────────┘           └────────┬────────┘
         │                              │
         ▼                              ▼
┌────────────────────────────────────────────────┐
│         COORDINATOR AGENT (Nathan)             │
│     Routes to specialized sub-agents           │
└────────┬───────────────────────────────────────┘
         │
         ├─────► Intake Agent
         ├─────► Research Agent
         ├─────► Coverage Advisor Agent
         ├─────► Data Manager Agent
         ├─────► Follow-up Agent
         └─────► Cross-Sell Agent
                        │
                        ▼
         ┌──────────────────────────┐
         │   NOWCERTS MCP SERVER    │
         │  (Insurance Management)  │
         └──────────────────────────┘
```

---

## Channel-Specific Workflows

### 1. Email Intake Workflow

**Trigger**: Gmail webhook (new email to quotes@reducemyins.com)

**Process Flow**:
```
1. Gmail Trigger - New email received
2. Extract Email Data
   - From: Customer email
   - Subject: Often includes intent
   - Body: Full customer message
   - Attachments: Policy documents, etc.
3. Classify Intent
   - Quote request
   - Policy service (add driver, change address, etc.)
   - Claim report
   - General inquiry
4. Route to Appropriate Workflow
5. Send Auto-Reply
   - "Thank you for contacting us..."
   - Estimated response time
6. Execute Agent Workflow
7. Notify Chase Henderson
8. Send Follow-up Email
```

**Key N8N Nodes**:
- `Gmail Trigger` - Watch for new emails
- `Extract Email Data` - Parse email content
- `OpenAI` / `Claude AI` - Classify intent
- `Switch` - Route based on intent
- `HTTP Request` - Call NowCerts MCP
- `Gmail Send` - Auto-reply and follow-up

---

### 2. SMS Intake Workflow

**Trigger**: Twilio webhook (new SMS)

**Process Flow**:
```
1. Twilio Webhook - New SMS received
2. Extract SMS Data
   - From: Customer phone number
   - Body: Text message
3. Check Customer History
   - Search NowCerts by phone
   - Load conversation context
4. Classify Intent
   - New quote request
   - Follow-up to existing quote
   - Quick question
   - Policy service
5. Route to Appropriate Workflow
6. Send SMS Auto-Reply
   - "Thanks! We received your message..."
7. Execute Agent Workflow (if needed)
8. Send SMS Follow-up
```

**Key N8N Nodes**:
- `Webhook` - Twilio SMS trigger
- `HTTP Request` - NowCerts search
- `Code` - Parse and normalize phone
- `OpenAI` / `Claude AI` - Classify intent
- `Twilio Send SMS` - Replies

**SMS-Specific Handling**:
- Keep responses under 160 characters
- Multiple SMS for longer messages
- Use link for detailed quotes
- Store conversation context

---

### 3. Chat Intake Workflow

**Trigger**: Chat widget webhook (new conversation or message)

**Process Flow**:
```
1. Chat Webhook - New message
2. Extract Chat Data
   - User ID / Session ID
   - Message text
   - Page context (what page they're on)
3. Load Chat History
   - Previous messages in conversation
   - User profile if known
4. Route Based on Stage
   - First message → Greeting + Intent detection
   - Mid-conversation → Continue with agent
   - Handoff request → Notify human agent
5. Execute Agent Workflow
   - Coordinator responds
   - Agents work in background
6. Send Chat Response
   - Immediate reply
   - Typing indicator while processing
7. Escalate if Needed
   - Customer frustrated
   - Complex question
   - Agent can't help
```

**Key N8N Nodes**:
- `Webhook` - Chat platform trigger
- `Redis` / `Database` - Store conversation state
- `OpenAI` / `Claude AI` - Conversational responses
- `HTTP Request` - NowCerts MCP
- `Webhook Response` - Send chat message
- `Slack` / `HubSpot` - Alert human agent

**Chat-Specific Features**:
- Real-time conversation
- Maintain context across messages
- Typing indicators
- Hand-off to human agent
- Proactive suggestions

---

### 4. Voice (Aircall) Intake Workflow

**Trigger**: Aircall webhook (call completed with transcription)

**Process Flow**:
```
1. Aircall Webhook - Call completed
2. Extract Call Data
   - Caller phone number
   - Call recording URL
   - Transcription text
   - Call duration
3. Analyze Call Transcription
   - Extract customer intent
   - Identify information provided
   - Detect sentiment
4. Search Existing Customer
   - Match by phone number
5. Route Based on Intent
   - Quote request → Quote workflow
   - Policy service → Service workflow
   - Callback request → Schedule task
6. Execute Agent Workflow
7. Create Follow-up Tasks
   - Chase Henderson callback
   - Quote preparation
   - Email summary to customer
8. Send SMS Confirmation
   - "Thanks for your call..."
   - Summary of next steps
```

**Key N8N Nodes**:
- `Webhook` - Aircall trigger
- `HTTP Request` - Fetch recording/transcription
- `OpenAI` / `Claude AI` - Analyze conversation
- `HTTP Request` - NowCerts search & create
- `Twilio Send SMS` - Confirmation message
- `Gmail Send` - Email summary

**Voice-Specific Handling**:
- Transcription analysis (NLP)
- Sentiment detection
- Extract quoted information
- Handle interrupted calls
- Store recording link in NowCerts

---

## Core Agent Workflows

### Coordinator Workflow (Main Router)

**Purpose**: Routes customer requests to specialized agents

```
Input: {
  channel: 'email' | 'sms' | 'chat' | 'voice',
  customerData: {...},
  requestType: 'quote' | 'service' | 'claim' | 'inquiry',
  context: {...}
}

Flow:
1. Validate Input
2. Load Customer History (if exists)
3. Determine Agent Routing
   - Intake Agent → IF need basic info
   - Research Agent → IF have address/VIN
   - Coverage Advisor → IF discussing coverage
   - Data Manager → IF ready to save
   - Follow-up Agent → IF need scheduling
   - Cross-Sell Agent → IF identify opportunities
4. Execute Agent Sub-Workflow
5. Compile Results
6. Respond to Customer (via original channel)
```

---

### Sub-Agent Workflows

#### 1. Intake Agent Workflow

**Tools Used**:
- `nowcerts_insured_getList` (search customers)
- `smarty_verifyAddress` (validate address)

```
Input: {
  task: 'gather_contact_info' | 'validate_data' | 'check_duplicates',
  partialData: {...},
  customerResponses: [...]
}

Flow:
1. Extract Information from Input
2. Normalize Data
   - Phone: ###-###-####
   - Address: Standardize
   - Email: Validate format
3. Validate with External APIs
   - smarty_verifyAddress for addresses
4. Check for Duplicates
   - nowcerts_insured_getList by phone
   - nowcerts_insured_getList by email
5. Return Structured Data
```

#### 2. Research Agent Workflow

**Tools Used**:
- `fenris_prefillHousehold`
- `nhtsa_decodeVin`
- `nhtsa_checkRecalls`
- `smarty_verifyAddress`
- `askkodiak_classifyBusiness`

```
Input: {
  customerData: {...},
  policyType: 'auto' | 'home' | 'commercial'
}

Flow:
1. Run Fenris (if auto policy)
   - Get vehicles, drivers, property
2. Decode VINs
   - nhtsa_decodeVin for each vehicle
3. Check Recalls
   - nhtsa_checkRecalls for each VIN
4. Verify Property Address (if home policy)
   - smarty_verifyAddress with full details
5. Classify Business (if commercial)
   - askkodiak_classifyBusiness
6. Compile Enriched Data Package
7. Calculate Confidence Score
```

#### 3. Coverage Advisor Workflow

**Tools Used**: None (pure logic)

```
Input: {
  vehicles: [...],
  drivers: [...],
  property: {...},
  assets: {...}
}

Flow:
1. Analyze Vehicle Requirements
   - Check for lienholders → Comp/Coll REQUIRED
   - Recommend liability (100/300/100 minimum)
2. Assess Driver Risk
   - Young drivers, violations, etc.
3. Recommend Deductibles
   - $750-$1,000 for most
4. Property Coverage (if applicable)
   - Dwelling coverage (replacement cost)
   - Personal property
   - Liability $300k+
5. Umbrella Assessment
   - If assets > liability coverage
6. Return Recommendations with Reasoning
```

#### 4. Data Manager Workflow

**Tools Used**:
- `nowcerts_prospect_insert` or `nowcerts_insured_insert`
- `nowcerts_quote_insert`
- `nowcerts_driver_bulkInsert`
- `nowcerts_vehicle_bulkInsert`
- `nowcerts_property_insert`
- `nowcerts_note_insert`

```
Input: {
  customerData: {...},
  quoteData: {...},
  enrichmentSources: [...]
}

Flow:
1. Search for Existing Customer
   - nowcerts_insured_getList
2. Create or Use Existing Insured
3. Create Quote Record
   - nowcerts_quote_insert
4. Add Drivers
   - nowcerts_driver_bulkInsert
5. Add Vehicles
   - nowcerts_vehicle_bulkInsert
6. Add Property (if applicable)
   - nowcerts_property_insert
7. Create Comprehensive Notes
   - Data sources
   - Lienholder info (for manual add)
   - Special observations
8. Return Record IDs
```

#### 5. Follow-up Agent Workflow

**Tools Used**:
- `nowcerts_task_insert`
- Gmail / Google Calendar (if available)

```
Input: {
  quoteData: {...},
  callbackTime: '...'
}

Flow:
1. Create Quoting Task
   - Assign to Chase Henderson
   - Due in 24-48 hours
2. Create Callback Task
   - Scheduled for customer's preferred time
   - Business hours only
3. Send Email Confirmation
   - Quote summary
   - Next steps
4. Schedule Calendar Event (if available)
5. Return Confirmation
```

#### 6. Cross-Sell Agent Workflow

**Tools Used**: None (pure analysis)

```
Input: {
  customerData: {...},
  enrichmentData: {...}
}

Flow:
1. Check for Bundle Opportunities
   - Auto + Home
   - Multiple vehicles
2. Assess Umbrella Need
   - Net worth vs coverage
3. Detect Recreational Vehicles
   - Boat, RV, Motorcycle mentions
4. Identify Commercial Needs
   - Business vehicle use
   - High mileage
5. Calculate Potential Savings
6. Prioritize Opportunities
7. Return Ranked Recommendations
```

---

## Common Workflow Components

### Message Classifier (Used by All Channels)

**Purpose**: Determine customer intent and route appropriately

```
Input: {
  messageText: string,
  customerHistory: {...},
  channel: string
}

Process:
1. AI Classification
   - Use OpenAI/Claude to analyze message
2. Intent Categories:
   - new_auto_quote
   - new_home_quote
   - add_driver
   - add_vehicle
   - change_address
   - policy_cancellation
   - claim_report
   - payment_question
   - general_inquiry
3. Priority Assessment:
   - urgent (claim, incident)
   - high (expiring policy, hot lead)
   - normal (general quote)
   - low (info request)
4. Extract Key Information:
   - Names mentioned
   - Phone numbers
   - Email addresses
   - VINs
   - Addresses
   - Dates
5. Return Classification + Extracted Data
```

**N8N Implementation**:
```javascript
// OpenAI Function Calling
{
  "model": "gpt-4",
  "messages": [{
    "role": "system",
    "content": "You are an insurance request classifier..."
  }, {
    "role": "user",
    "content": messageText
  }],
  "functions": [{
    "name": "classify_request",
    "parameters": {
      "intent": "string (enum)",
      "priority": "string (enum)",
      "extractedData": "object"
    }
  }],
  "function_call": {"name": "classify_request"}
}
```

---

### Customer History Loader

**Purpose**: Load existing customer data for context

```
Input: {
  phone: string,
  email: string,
  name: string
}

Process:
1. Search NowCerts
   - nowcerts_insured_getList by phone
   - nowcerts_insured_getList by email
2. If Found:
   - Load policies
   - Load recent quotes
   - Load notes
   - Load claims
3. If Not Found:
   - Return empty context
4. Return Customer Context Object
```

---

### Auto-Reply Generator

**Purpose**: Send immediate acknowledgment to customer

```
Input: {
  channel: string,
  intent: string,
  customerName: string
}

Output Templates:
- Email: Professional email with ETA
- SMS: Brief "Got it, we'll respond soon"
- Chat: "Thanks! Let me look into this..."
- Voice: SMS follow-up to call

Response Time Promises:
- Quote requests: 1-2 hours
- Service requests: 4 hours
- General inquiry: 24 hours
- Claims: Immediate (15 min)
```

---

## Workflow Execution Patterns

### Pattern 1: Synchronous (Chat, Voice)

Customer expects immediate response:
```
1. Receive message
2. Process with minimal delay (<5 seconds)
3. Return response to customer
4. Continue background processing
5. Update customer if needed
```

### Pattern 2: Asynchronous (Email, SMS)

Customer accepts delayed response:
```
1. Receive message
2. Send auto-reply immediately
3. Process in background (agents, APIs)
4. Send complete response when ready
5. Follow up with tasks/scheduling
```

### Pattern 3: Hybrid (Chat with Handoff)

Start bot, escalate to human if needed:
```
1. Bot handles initial conversation
2. Gathers basic information
3. If complex or customer requests:
   - Alert human agent
   - Transfer conversation context
   - Human takes over
4. Bot continues background work
5. Human closes conversation
```

---

## Error Handling & Fallbacks

### API Failure Scenarios

**Fenris Down**:
```
1. Detect Fenris API error
2. Log failure
3. Continue without prefill
4. Coordinator asks customer manually
5. Note in system: "Fenris unavailable"
```

**NowCerts Down**:
```
1. Detect NowCerts API error
2. Store data temporarily
3. Notify customer: "Technical issue, we'll follow up"
4. Alert Chase Henderson urgently
5. Retry when service restored
```

**NHTSA Down**:
```
1. Skip VIN decode/recall check
2. Continue with quote
3. Note for manual verification
4. Follow up later when API restored
```

---

## Data Flow Diagram

```
Customer Message
      │
      ▼
┌──────────────┐
│  Normalize   │  - Format phone numbers
│    Data      │  - Clean email addresses
└──────┬───────┘  - Standardize names
       │
       ▼
┌──────────────┐
│  Classify    │  - Determine intent
│   Intent     │  - Extract key info
└──────┬───────┘  - Set priority
       │
       ▼
┌──────────────┐
│   Search     │  - Check for existing
│  Customer    │  - Load history
└──────┬───────┘  - Build context
       │
       ▼
┌──────────────┐
│  Route to    │  - Select agent workflow
│    Agent     │  - Pass context
└──────┬───────┘  - Set expectations
       │
       ▼
┌──────────────┐
│   Execute    │  - Intake Agent
│    Agent     │  - Research Agent
│  Workflow    │  - Coverage Advisor
└──────┬───────┘  - Data Manager
       │          - Follow-up Agent
       ▼          - Cross-Sell Agent
┌──────────────┐
│   Respond    │  - Format for channel
│     to       │  - Send via original
│  Customer    │  - Create tasks
└──────────────┘  - Schedule follow-up
```

---

## N8N Workflow Files Structure

```
workflows/
├── README.md                          # This file
├── intake/
│   ├── email-intake.json             # Gmail trigger → classifier
│   ├── sms-intake.json               # Twilio trigger → classifier
│   ├── chat-intake.json              # Chat webhook → classifier
│   └── voice-intake.json             # Aircall webhook → classifier
│
├── routing/
│   ├── message-classifier.json       # AI intent classification
│   ├── customer-history-loader.json  # Load existing data
│   └── request-router.json           # Route to appropriate workflow
│
├── quote/
│   ├── coordinator-agent.json        # Main coordinator
│   ├── intake-agent.json             # Info gathering
│   ├── research-agent.json           # External API enrichment
│   ├── coverage-advisor.json         # Recommendations
│   ├── data-manager.json             # NowCerts operations
│   ├── followup-agent.json           # Scheduling
│   └── crosssell-agent.json          # Opportunities
│
├── service/
│   ├── add-driver.json               # Add driver to policy
│   ├── add-vehicle.json              # Add vehicle to policy
│   ├── change-address.json           # Update address
│   ├── remove-driver.json            # Remove driver
│   └── generic-service.json          # Other service requests
│
├── shared/
│   ├── auto-reply.json               # Automatic responses
│   ├── error-handler.json            # Global error handling
│   └── notification.json             # Slack/email alerts
│
└── testing/
    ├── test-intake.json              # Test message intake
    ├── test-agents.json              # Test agent workflows
    └── test-e2e.json                 # End-to-end test
```

---

## Implementation Priorities

### Phase 1: Foundation (Week 1)
1. ✅ Message classifier workflow
2. ✅ Customer history loader
3. ✅ Email intake workflow
4. ✅ SMS intake workflow
5. ✅ Basic auto-replies

### Phase 2: Core Agents (Week 2)
1. ✅ Coordinator agent workflow
2. ✅ Intake agent workflow
3. ✅ Research agent workflow
4. ✅ Data manager workflow
5. ✅ Simple quote workflow (auto only)

### Phase 3: Advanced Features (Week 3)
1. ✅ Coverage advisor agent
2. ✅ Follow-up agent
3. ✅ Cross-sell agent
4. ✅ Chat intake workflow
5. ✅ Voice intake workflow

### Phase 4: Service Requests (Week 4)
1. ✅ Add driver workflow
2. ✅ Add vehicle workflow
3. ✅ Change address workflow
4. ✅ Other service request workflows
5. ✅ Testing & refinement

---

## Monitoring & Logging

### Key Metrics to Track

1. **Channel Performance**
   - Messages received per channel
   - Response times
   - Conversion rates

2. **Agent Performance**
   - Agent execution times
   - Error rates per agent
   - Success rates

3. **Customer Experience**
   - Time to first response
   - Time to quote delivered
   - Customer satisfaction (if surveyed)

4. **System Health**
   - API availability (Fenris, NHTSA, NowCerts)
   - Error frequency
   - Failed workflows

### N8N Monitoring Setup

```javascript
// Add to each workflow
{
  "name": "Log Metrics",
  "type": "Function",
  "parameters": {
    "functionCode": `
      const startTime = $input.item.json.startTime;
      const endTime = Date.now();
      const duration = endTime - startTime;

      return [{
        json: {
          workflow: 'intake-agent',
          duration: duration,
          success: true,
          timestamp: new Date().toISOString()
        }
      }];
    `
  }
}
```

---

## Next Steps

1. **Build Core Workflows**
   - Use n8n MCP to create workflows
   - Test each component
   - Integrate agents

2. **Set Up Integrations**
   - Connect Gmail
   - Connect Twilio
   - Connect Aircall
   - Connect NowCerts MCP

3. **Test End-to-End**
   - Send test emails
   - Send test SMS
   - Simulate chat conversations
   - Test with recorded calls

4. **Deploy to Production**
   - Monitor first 100 requests
   - Refine based on results
   - Scale as needed

5. **Iterate & Improve**
   - Analyze metrics
   - Optimize agent performance
   - Add new features
   - Improve customer experience

---

**This architecture provides a complete, scalable system for handling all insurance quote and service requests across multiple channels using specialized AI agents and the NowCerts MCP server.**
