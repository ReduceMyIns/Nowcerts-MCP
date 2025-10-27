# NowCerts MCP Server - VAPI Tool Description

## For VAPI Voice AI (1000 characters or less)

NowCerts MCP Server: Power your voice AI with complete insurance management capabilities. Enable phone agents to quote insurance, manage customers, and access real-time data during live calls. 100+ tools including: search/create insureds, generate quotes, manage policies, add vehicles/drivers, process claims. Smart automations perfect for phone conversations: Fenris API auto-discovers vehicles and household members from just an address (no need to ask customer for vehicle details), NHTSA decodes VINs and checks recalls when customer reads VIN over phone, Smarty verifies addresses as customer speaks them, AskKodiak classifies commercial risks. Handles all authentication automatically - voice agent never needs API credentials. Works seamlessly with VAPI over HTTPS/SSE. Optimized for conversational workflows: gather name/address → Fenris prefills vehicles → discuss each vehicle naturally → generate multi-carrier quotes. Perfect for insurance agencies automating phone quotes, policy changes, claims intake. Production-ready with auto-restart, SSL support, 24/7 operation.

**Character count**: 997 characters

---

## Alternative: Conversation-Focused (985 characters)

Transform your insurance phone conversations with AI. This MCP server connects VAPI voice agents to complete insurance management tools. Perfect for live phone calls: Customer says their address → Fenris instantly discovers all vehicles and residents → Agent discusses each vehicle naturally → Generates quotes from multiple carriers. 100+ tools enable voice agents to: Quote auto/home insurance in real-time, search existing customers by phone/email, add/remove vehicles during call, process policy changes, create claims, decode VINs when customer reads them, check vehicle recalls, verify addresses, classify commercial businesses. All authentication handled automatically - agent focuses on conversation, not technical details. Optimized for natural phone workflows: minimal questions (name, address, DOB) then auto-populate everything else. Works over HTTPS/SSE for reliable voice calls. Includes smart features: Fenris token caching for instant responses, automatic error handling, graceful API failures. Deploy once, handle unlimited concurrent calls. Perfect for agencies using VAPI to automate quotes, customer service, policy management via phone.

**Character count**: 985 characters

---

## Ultra-Concise for VAPI (495 characters)

Power VAPI phone agents with complete insurance tools. Quote auto/home insurance, manage customers, process claims - all during live calls. Fenris auto-discovers vehicles from address (no interrogating customers). NHTSA decodes VINs and checks recalls. Smarty verifies addresses. 100+ NowCerts tools for insureds, policies, quotes, claims. Automatic authentication. Perfect for insurance agencies automating phone conversations. Deploy via HTTPS/SSE. Production-ready, handles concurrent calls, 24/7 operation.

**Character count**: 495 characters

---

## Key Features for VAPI Configuration

When configuring in VAPI, highlight these features:

**Real-Time Conversation Support:**
- Instant Fenris lookups (discovers vehicles in <2 seconds)
- Cached tokens for fast repeated requests
- Graceful error handling (won't break call flow)
- Concurrent call support

**Phone-Optimized Workflows:**
- Minimal customer questions needed
- Auto-discovery reduces interrogation
- Natural conversation flow
- Multi-carrier quote generation

**Voice-Specific Use Cases:**
1. **New Auto Quote**: Name + Address → Fenris discovers vehicles → Discuss each → Quote
2. **Add Vehicle**: Customer reads VIN → NHTSA decodes → Add to policy
3. **Claims Intake**: Search customer → Create claim record → Send to carrier
4. **Policy Changes**: Search by phone → Verify identity → Process change
5. **Address Verification**: Customer says address → Smarty validates → Update record

**Connection Details for VAPI:**
- **Endpoint**: `https://mcp.srv992249.hstgr.cloud/sse`
- **Transport**: SSE over HTTPS
- **Authentication**: Handled server-side (no credentials in prompts)
- **Uptime**: 24/7 with auto-restart
- **SSL**: Let's Encrypt certificate via Traefik

**Recommended VAPI System Prompt Integration:**
Use `VAPI_SYSTEM_PROMPT.md` + `VAPI_AGENCY_CONTEXT.md` for complete phone conversation guidelines including:
- When to use each tool
- How to present discovered data naturally
- Coverage recommendations based on loan status
- Verbal confirmation protocols
- Error handling during calls
