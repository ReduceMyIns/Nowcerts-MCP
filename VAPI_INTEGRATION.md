# VAPI Integration Guide - NowCerts MCP Server

This guide explains how to create and configure VAPI voice AI assistants that use the NowCerts MCP server for dynamic tool access.

## Overview

The integration consists of three components:

1. **NowCerts MCP Server** - Provides 100+ insurance API tools via Model Context Protocol
2. **VAPI Voice AI** - Handles phone conversations with customers
3. **System Prompts** - Define the assistant's behavior and personality

## Architecture

```
Phone Call → VAPI Voice AI Assistant
                ↓
          System Prompts (Nathan, Insurance Agent)
                ↓
          NowCerts MCP Server (https://mcp.srv992249.hstgr.cloud/sse)
                ↓
          Dynamic Tools (129+ LOBs, Fenris, NHTSA, etc.)
```

## Prerequisites

- VAPI Account: https://dashboard.vapi.ai
- VAPI Private API Key: `ed7f45fa-d541-46e8-81f1-8f1f7b59e233`
- VAPI Public API Key: `ea7f98ff-0aae-49f0-9ce9-ff9ebcc8d784`
- NowCerts MCP Server: `https://mcp.srv992249.hstgr.cloud/sse`
- Node.js 18+ (for running creation scripts)

## Quick Start

### 1. Create Assistant via Script

```bash
# Set your VAPI API key
export VAPI_API_KEY="ed7f45fa-d541-46e8-81f1-8f1f7b59e233"

# Create the assistant
npm run create-vapi-assistant
```

This will:
- Load `VAPI_SYSTEM_PROMPT.md` and `VAPI_AGENCY_CONTEXT.md`
- Create an assistant named "Nathan - Insurance Quote Assistant"
- Configure MCP server connection to NowCerts
- Save assistant details to `vapi-assistant.json`

### 2. View Existing Assistants

```bash
npm run list-vapi-assistants
```

### 3. Test the Assistant

1. Visit https://dashboard.vapi.ai/assistants
2. Find your "Nathan - Insurance Quote Assistant"
3. Click "Test" to make a test call
4. Try: "I need car insurance"

## MCP Tool Configuration

The assistant is configured to use the NowCerts MCP server at the **global tools level** (not `model.tools`):

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

When a call starts, VAPI will:
1. Connect to the MCP server via SSE
2. Fetch all available tools dynamically
3. Inject tools into the model's context
4. Make tools available during the conversation

## Available MCP Tools

The assistant will have access to:

### NowCerts API (100+ tools)
- Customer/Insured management
- Policy and quote creation
- Driver and vehicle management
- Claims handling
- Notes and tags
- Line of Business discovery (129+ products)
- Carrier discovery (80+ carriers)

### Data Enrichment
- **Fenris API**: Household data prefill (discovers vehicles/residents)
- **Smarty API**: Address verification and standardization
- **NHTSA API**: VIN decoding and recall checks
- **AskKodiak API**: Commercial insurance classification

## System Prompts

The assistant uses two combined prompts:

### VAPI_SYSTEM_PROMPT.md
- Voice conversation style (short, natural responses)
- Phone etiquette and call flow
- Auto insurance quote workflow
- Phone number normalization
- Address confirmation
- Coverage recommendations
- Error handling for voice calls

### VAPI_AGENCY_CONTEXT.md
- Agency identity (ReduceMyInsurance.Net)
- Call transfer rules (Full Service vs Billing & Claim Service carriers)
- Product offerings (personal and commercial)
- Multi-carrier quoting workflow
- Appointment booking (Chase Henderson, Sherry Norton)
- Specific call scenarios and workflows

## Voice Configuration

The assistant uses:
- **Model**: OpenAI GPT-4o (fast, capable)
- **Voice**: ElevenLabs "rachel" (professional, friendly female)
- **Transcriber**: Deepgram Nova-2 (accurate, real-time)
- **First Message**: "Thanks for calling ReduceMyInsurance.Net! This is Nathan. How can I help you today?"

## Example Call Flow

```
Customer: "I need car insurance"
Nathan: "I'd be happy to help you with that! What's your name?"

Customer: "John Smith"
Nathan: "Great, John! What's the best number to reach you?"

Customer: "Five five five twelve thirty four fifty six seven"
Nathan: "Just to confirm, that's 5-5-5, 1-2-3, 4-5-6-7, right?"

Customer: "Yep"
Nathan: "And your email address?"

Customer: "john.smith@email.com"
Nathan: "So that's j-o-h-n dot s-m-i-t-h at e-mail dot com?"

Customer: "Yes"
Nathan: "What's your current address?"

Customer: "123 Main Street, Austin, Texas 78701"
Nathan: "Let me make sure I have that right - 123 Main Street in Austin, Texas, 78701?"

Customer: "Correct"
Nathan: "And your date of birth?"

Customer: "March fifteenth, eighty-five"
Nathan: "March 15th, 1985?"

Customer: "Yes"

[Silent: fenris_prefillHousehold, smarty_verifyAddress, nowcerts_insured_search]

Nathan: "Okay, I've pulled up your information. I see you have a twenty-twenty Honda Accord at that address. Is that right?"

Customer: "Yes"
Nathan: "Perfect. Who's the main driver?"

[Continue through quote workflow...]
```

## Creating Assistants Manually (VAPI Dashboard)

If you prefer to create assistants via the dashboard:

1. Go to https://dashboard.vapi.ai/assistants/create
2. Set **Name**: "Nathan - Insurance Quote Assistant"
3. Set **Model**: OpenAI GPT-4o
4. Set **System Prompt**: Copy contents of `VAPI_SYSTEM_PROMPT.md` + `VAPI_AGENCY_CONTEXT.md`
5. Set **Voice**: ElevenLabs "rachel"
6. Set **Transcriber**: Deepgram Nova-2
7. Under **Tools**, click "Add MCP Server":
   - URL: `https://mcp.srv992249.hstgr.cloud/sse`
   - Transport: SSE
8. Set **First Message**: "Thanks for calling ReduceMyInsurance.Net! This is Nathan. How can I help you today?"
9. Save

## Phone Number Configuration

To receive inbound calls:

1. Go to https://dashboard.vapi.ai/phone-numbers
2. Purchase a phone number (or use existing)
3. Configure the number:
   - **Assistant**: Select "Nathan - Insurance Quote Assistant"
   - **Server URL**: (optional) For webhooks/callbacks
4. Test by calling the number

## Outbound Calls

To make outbound calls programmatically:

```javascript
const response = await fetch('https://api.vapi.ai/call', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ed7f45fa-d541-46e8-81f1-8f1f7b59e233',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    assistantId: 'your-assistant-id',
    customer: {
      number: '+15551234567',
      name: 'John Smith'
    }
  })
});
```

## Testing and Debugging

### Test the MCP Connection

```bash
# Test that MCP server is accessible
curl https://mcp.srv992249.hstgr.cloud/sse

# Should return SSE connection
```

### View Call Logs

1. Go to https://dashboard.vapi.ai/calls
2. Find your test call
3. Review:
   - Transcript
   - Tool calls made
   - Errors (if any)
   - Recording

### Common Issues

**Tools not showing up in calls:**
- ✅ Ensure MCP server is running: https://mcp.srv992249.hstgr.cloud/sse
- ✅ Check MCP tool is at GLOBAL level (`tools: []`), not `model.tools`
- ✅ Verify SSE transport is specified
- ✅ Check VAPI dashboard for MCP connection errors

**Assistant sounds robotic:**
- ✅ Review VAPI_SYSTEM_PROMPT.md guidelines
- ✅ Adjust temperature (0.7 is good for natural conversation)
- ✅ Test different voices
- ✅ Add more natural language examples

**Fenris/NHTSA tools not working:**
- ✅ Check MCP server logs
- ✅ Verify API credentials are configured
- ✅ Test tools directly via MCP Inspector

## Advanced: Custom Variables

Pass custom data into calls using variables:

```javascript
{
  "assistantOverrides": {
    "variableValues": {
      "customerName": "John Smith",
      "referralSource": "Facebook Ad",
      "appointmentTime": "2pm tomorrow"
    }
  }
}
```

Reference in prompts:
```
"Hi {{customerName}}, I see you came in from {{referralSource}}..."
```

## Production Deployment

### Recommended Setup

1. **NowCerts MCP Server**: Already deployed on srv992249.hstgr.cloud with:
   - HTTPS via Traefik
   - Let's Encrypt SSL
   - Auto-restart on failure
   - Logging enabled

2. **VAPI Phone Numbers**: Purchase dedicated numbers for:
   - Main agency line: (615) 900-0288
   - Quote hotline: (separate number)
   - Spanish language line: (future)

3. **Call Routing**:
   - Configure business hours
   - Voicemail for after-hours
   - Fallback to human agents
   - Transfer to carriers when appropriate

### Monitoring

- **Call Analytics**: VAPI dashboard shows call volume, duration, success rate
- **MCP Server Logs**: Monitor via Docker logs
- **Error Alerts**: Set up notifications for failed API calls
- **Quality Assurance**: Review call recordings regularly

## Cost Estimates

### VAPI Costs (approximate)
- Phone number: $2/month
- Inbound calls: $0.05-0.10/minute
- Outbound calls: $0.10-0.15/minute
- Transcription: Included
- Voice (ElevenLabs): ~$0.18/1000 characters
- Model (GPT-4o): ~$0.015/1000 tokens

### Example Monthly Costs (100 calls, 5 min avg)
- Phone number: $2
- Call minutes: $25-50
- Voice synthesis: $10-15
- Model usage: $5-10
- **Total**: ~$42-77/month

## Security

- **API Keys**: Store in environment variables, never commit
- **HTTPS**: All communication encrypted (MCP server, VAPI API)
- **Call Recording**: Optional, configure per compliance requirements
- **HIPAA**: Not enabled by default, contact VAPI for HIPAA compliance

## Support

- **VAPI Documentation**: https://docs.vapi.ai
- **VAPI Discord**: https://discord.gg/vapi
- **NowCerts Support**: support@nowcerts.com
- **MCP Spec**: https://spec.modelcontextprotocol.io

## Next Steps

1. ✅ Create assistant via script
2. ✅ Test with sample call
3. ⏭️ Purchase phone number
4. ⏭️ Configure business hours
5. ⏭️ Set up call transfer rules
6. ⏭️ Train team on AI assistant capabilities
7. ⏭️ Monitor call quality and adjust prompts
8. ⏭️ Scale to additional phone numbers as needed

---

**Created**: 2025-10-27
**MCP Server**: https://mcp.srv992249.hstgr.cloud/sse
**VAPI Dashboard**: https://dashboard.vapi.ai
