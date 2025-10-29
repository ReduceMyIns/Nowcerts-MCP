# N8N Workflows for NowCerts Insurance Automation

## Overview

This directory contains n8n workflow JSON files that implement the multi-agent insurance automation system described in the architecture documents.

## Workflow Files

### Phase 1: Foundation Workflows (Ready to Import)

1. **01_message_classifier.json** - Message Classification Workflow
   - **Purpose**: Classifies incoming messages by intent and priority
   - **Trigger**: Webhook (called by intake workflows)
   - **Features**:
     - AI-powered intent classification
     - Phone number normalization
     - Email validation
     - Customer search in NowCerts
     - Routes to appropriate workflows
   - **Dependencies**: OpenAI API key

2. **02_customer_history_loader.json** - Customer History Loader (Sub-workflow)
   - **Purpose**: Loads complete customer history from NowCerts
   - **Trigger**: Called by other workflows
   - **Features**:
     - Search by customer ID, phone, or email
     - Loads policies, quotes, and notes
     - Returns comprehensive customer history
   - **Dependencies**: NowCerts MCP Server

3. **03_email_intake.json** - Email Intake Workflow
   - **Purpose**: Processes incoming emails via Gmail
   - **Trigger**: Gmail webhook (new email received)
   - **Features**:
     - Extracts email content (HTML to text)
     - Calls message classifier
     - Loads customer history
     - Generates AI-powered auto-reply
     - Creates task for Chase Henderson
     - Routes quote requests to Coordinator Agent
   - **Dependencies**: Gmail OAuth2, OpenAI API

4. **04_sms_intake.json** - SMS Intake Workflow
   - **Purpose**: Processes incoming SMS via Twilio
   - **Trigger**: Twilio webhook (new SMS received)
   - **Features**:
     - Extracts SMS data
     - Calls message classifier
     - Generates auto-reply (max 160 characters)
     - Creates task for Chase Henderson
     - Routes quote requests to Coordinator Agent
   - **Dependencies**: Twilio credentials, OpenAI API

5. **05_coordinator_agent.json** - Coordinator Agent Workflow (Nathan)
   - **Purpose**: Main orchestration agent that routes to specialized sub-agents
   - **Trigger**: Called by intake workflows
   - **Features**:
     - Loads Coordinator Agent system prompt
     - AI-powered routing to specialized agents
     - Placeholder connections to 6 sub-agents
     - Customer-facing conversation management
   - **Dependencies**: OpenAI API, Coordinator Agent prompt
   - **Status**: Sub-agent workflows are placeholders (Phase 2)

## How to Import Workflows

### Prerequisites

1. **n8n instance** running at https://n8n.srv992249.hstgr.cloud/
2. **NowCerts MCP Server** at https://mcp.srv992249.hstgr.cloud/sse
3. **API Credentials** configured:
   - OpenAI API key (for AI nodes)
   - Gmail OAuth2 credentials (for email intake)
   - Twilio credentials (for SMS intake)

### Import Steps

1. **Open n8n** in your browser
2. Click **"Workflows"** in the sidebar
3. Click **"Import from File"** or **"Add Workflow"** → **"Import from File"**
4. Select the workflow JSON file (e.g., `01_message_classifier.json`)
5. Click **"Import"**
6. Configure credentials for nodes that require them
7. **Save** and **Activate** the workflow

### Recommended Import Order

Import in this order to ensure dependencies are met:

1. **02_customer_history_loader.json** (sub-workflow, no dependencies)
2. **01_message_classifier.json** (foundation)
3. **03_email_intake.json** (uses classifier)
4. **04_sms_intake.json** (uses classifier)
5. **05_coordinator_agent.json** (called by intake workflows)

## Required Configuration

### 1. OpenAI Credentials

All workflows use OpenAI's GPT-4 model for AI processing.

**Setup**:
- In n8n, go to **Credentials** → **Create New**
- Select **OpenAI**
- Enter your OpenAI API key
- Save as "OpenAI API"

### 2. Gmail OAuth2 (Email Intake)

**Setup**:
- In n8n, go to **Credentials** → **Create New**
- Select **Gmail OAuth2**
- Follow the OAuth flow to authorize access
- Save as "Gmail OAuth2"

### 3. Twilio API (SMS Intake)

**Setup**:
- In n8n, go to **Credentials** → **Create New**
- Select **Twilio**
- Enter:
  - Account SID: `TWILIO_ACCOUNT_SID`
  - Auth Token: `TWILIO_AUTH_TOKEN`
- Save as "Twilio API"

### 4. NowCerts MCP Server

All workflows use HTTP Request nodes to communicate with the NowCerts MCP server at:
```
https://mcp.srv992249.hstgr.cloud/sse
```

No special credentials are needed if the MCP server is publicly accessible. If authentication is required, add HTTP Header authentication to the HTTP Request nodes.

### 5. Update Webhook URLs

After importing workflows:

1. **Message Classifier Webhook**:
   - Open `01_message_classifier.json`
   - Copy the webhook URL from the "Webhook - Receive Message" node
   - Update this URL in `03_email_intake.json` and `04_sms_intake.json` at the "HTTP - Call Message Classifier" nodes

2. **Gmail Webhook**:
   - Open `03_email_intake.json`
   - Configure the Gmail Trigger node with your Gmail account
   - Gmail will automatically create the webhook

3. **Twilio Webhook**:
   - Open `04_sms_intake.json`
   - Copy the webhook URL from the "Webhook - Twilio SMS" node
   - Configure this URL in your Twilio console as the SMS webhook URL

## Testing Workflows

### Test Message Classifier

**Webhook Test**:
```bash
curl -X POST https://n8n.srv992249.hstgr.cloud/webhook/classify-message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "messageText": "I need car insurance for my 2020 Honda Accord. My name is John Smith, phone 555-123-4567, email john@email.com",
    "customerEmail": "john@email.com"
  }'
```

**Expected Response**:
```json
{
  "intent": "new_auto_quote",
  "priority": "high",
  "summary": "New auto insurance quote request for 2020 Honda Accord",
  "customer": {
    "primaryName": "John Smith",
    "primaryPhone": "555-123-4567",
    "primaryEmail": "john@email.com"
  },
  "vehicles": [{"year": 2020, "make": "Honda", "model": "Accord"}],
  "isNewCustomer": true
}
```

### Test Customer History Loader

This is a sub-workflow, so it must be called by another workflow. Test it by using the "Execute Workflow" node in a test workflow:

```json
{
  "customerId": "existing-customer-id"
}
```

or

```json
{
  "phone": "555-123-4567",
  "email": "john@email.com"
}
```

### Test Email Intake

Send a test email to the configured Gmail account:

**Subject**: Need car insurance

**Body**:
```
Hi, I need a quote for car insurance. My name is John Smith, phone is 555-123-4567.

I have a 2020 Honda Accord.

Thanks!
```

**Expected Behavior**:
1. Workflow triggers on new email
2. Extracts email data
3. Classifies the message (intent: new_auto_quote)
4. Loads customer history
5. Generates auto-reply email
6. Sends auto-reply to customer
7. Creates task for Chase Henderson
8. Routes to Coordinator Agent (if quote request)

### Test SMS Intake

Send a test SMS to your Twilio number:

**Message**: "Need car insurance for my Honda"

**Expected Behavior**:
1. Workflow triggers on new SMS
2. Classifies the message
3. Generates SMS auto-reply (max 160 chars)
4. Sends auto-reply
5. Creates task for Chase Henderson
6. Routes to Coordinator Agent (if quote request)

## Workflow Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER CHANNELS                        │
│                                                             │
│           📧 Email (Gmail)        📱 SMS (Twilio)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   Message Classifier (AI)    │
        │  Intent Detection & Routing  │
        └─────────────┬────────────────┘
                      │
                      ├──────────────────┐
                      │                  │
                      ▼                  ▼
        ┌──────────────────────┐  ┌─────────────────┐
        │ Customer History     │  │ Auto-Reply      │
        │ Loader (Sub-workflow)│  │ Generation (AI) │
        └──────────────────────┘  └─────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │   Coordinator Agent (Nathan) │
        │    Routes to Sub-Agents      │
        └─────────────┬────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   Intake Agent  Research     Coverage
   (Phase 2)     Agent        Advisor
                 (Phase 2)    (Phase 2)
        │             │             │
        └─────────────┼─────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   Data Manager  Follow-up   Cross-Sell
   (Phase 2)     Agent        Agent
                 (Phase 2)    (Phase 2)
```

## Implementation Status

### ✅ Phase 1: Foundation (Complete)

- [x] Message Classifier workflow
- [x] Customer History Loader sub-workflow
- [x] Email Intake workflow
- [x] SMS Intake workflow
- [x] Basic auto-replies (AI-generated)

### ⏳ Phase 2: Core Agents (Placeholders)

- [ ] Coordinator Agent workflow (skeleton created)
- [ ] Intake Agent sub-workflow
- [ ] Research Agent sub-workflow
- [ ] Data Manager sub-workflow
- [ ] Coverage Advisor sub-workflow
- [ ] Follow-up Agent sub-workflow
- [ ] Cross-Sell Agent sub-workflow

### ⏳ Phase 3: Advanced Features

- [ ] Chat intake workflow
- [ ] Voice intake workflow (Aircall)
- [ ] Advanced routing logic
- [ ] Multi-turn conversations

### ⏳ Phase 4: Service Requests

- [ ] Add driver workflow
- [ ] Add vehicle workflow
- [ ] Change address workflow
- [ ] Other service workflows

## Next Steps

### For Phase 2 Implementation

1. **Create Intake Agent Sub-workflow**
   - Implement the logic from `prompts/N8N_INTAKE_AGENT.md`
   - Gather and validate customer information
   - Normalize phone numbers and addresses
   - Check for duplicate customers
   - Return structured data

2. **Create Research Agent Sub-workflow**
   - Implement the logic from `prompts/N8N_RESEARCH_AGENT.md`
   - Call Fenris API for household prefill
   - Call NHTSA API to decode VINs
   - Check for vehicle recalls
   - Validate addresses with Smarty
   - Return enriched data

3. **Create Coverage Advisor Sub-workflow**
   - Implement the logic from `prompts/N8N_COVERAGE_ADVISOR_AGENT.md`
   - Provide insurance recommendations
   - Determine comp/collision requirements
   - Suggest liability limits
   - Return recommendations with reasoning

4. **Create Data Manager Sub-workflow**
   - Implement the logic from `prompts/N8N_DATA_MANAGER_AGENT.md`
   - Create prospect/insured records in NowCerts
   - Create quote records
   - Add drivers and vehicles
   - Create comprehensive notes
   - Return success status and record IDs

5. **Create Follow-up Agent Sub-workflow**
   - Implement the logic from `prompts/N8N_FOLLOWUP_AGENT.md`
   - Create tasks for Chase Henderson
   - Schedule callbacks
   - Send email confirmations
   - Return scheduling confirmations

6. **Create Cross-Sell Agent Sub-workflow**
   - Implement the logic from `prompts/N8N_CROSSSELL_AGENT.md`
   - Identify bundle opportunities
   - Calculate savings
   - Suggest additional coverage
   - Return cross-sell recommendations

7. **Update Coordinator Agent**
   - Replace placeholder nodes with actual Execute Workflow nodes
   - Connect to the new sub-workflows
   - Implement conversation state management
   - Add error handling

## Troubleshooting

### Common Issues

1. **"Webhook not found" error**
   - Ensure the workflow is activated
   - Copy the correct webhook URL from the webhook node
   - Update any workflows that call this webhook

2. **"Credentials not found" error**
   - Configure the required credentials in n8n
   - Assign credentials to the nodes that need them
   - Save and reactivate the workflow

3. **"OpenAI API error"**
   - Verify your OpenAI API key is valid
   - Check that you have sufficient credits
   - Ensure you're using a supported model (gpt-4, gpt-4-turbo)

4. **"NowCerts MCP not responding"**
   - Verify the MCP server is running
   - Check the URL: https://mcp.srv992249.hstgr.cloud/sse
   - Test the MCP server directly with a curl command

5. **"Gmail trigger not working"**
   - Verify Gmail OAuth2 credentials are configured
   - Re-authorize the Gmail connection if needed
   - Check that the Gmail account has emails to process

6. **"Twilio webhook not receiving messages"**
   - Verify the webhook URL is configured in Twilio console
   - Check that the Twilio number is active
   - Ensure the workflow is activated in n8n

### Getting Help

- **Architecture Documentation**: See `N8N_WORKFLOW_ARCHITECTURE.md`
- **Implementation Guide**: See `IMPLEMENTATION_GUIDE.md`
- **Agent Prompts**: See `prompts/` directory
- **Project Summary**: See `PROJECT_SUMMARY.md`

## References

- **n8n Documentation**: https://docs.n8n.io/
- **NowCerts API**: https://nowcerts.com/developers
- **OpenAI API**: https://platform.openai.com/docs
- **Twilio API**: https://www.twilio.com/docs
- **Gmail API**: https://developers.google.com/gmail/api

---

*Last Updated: {{ new Date().toISOString().split('T')[0] }}*
*Version: 1.0.0*
*Phase: 1 (Foundation) Complete*
