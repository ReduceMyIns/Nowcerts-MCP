# NowCerts MCP Server - VAPI Tool Description

## For VAPI Voice AI (1000 characters or less)

NowCerts MCP Server: Power your voice AI with complete insurance management for ALL lines of business. Enable phone agents to quote auto, home, commercial, life, and specialty insurance while managing customers and accessing real-time data during live calls. 100+ tools including: search/create insureds, generate quotes, manage policies, add vehicles/drivers, process claims. Smart automations perfect for phone conversations: Fenris API auto-discovers vehicles and household members from just an address (no need to ask customer for vehicle details), NHTSA decodes VINs and checks recalls when customer reads VIN over phone, Smarty verifies addresses as customer speaks them, AskKodiak classifies commercial risks. Handles all authentication automatically - voice agent never needs API credentials. Works seamlessly with VAPI over HTTPS/SSE. Optimized for conversational workflows across all insurance types. Perfect for agencies automating quotes, policy changes, claims intake for personal and commercial lines. Production-ready with auto-restart, SSL support, 24/7 operation.

**Character count**: 997 characters

---

## Alternative: Conversation-Focused (985 characters)

Transform your insurance phone conversations with AI across ALL lines of business. This MCP server connects VAPI voice agents to complete insurance management tools for auto, home, commercial, life, and specialty insurance. Perfect for live phone calls: Customer says their address → Fenris instantly discovers all vehicles and residents → Agent discusses each naturally → Generates quotes from multiple carriers. 100+ tools enable voice agents to: Quote any insurance type in real-time, search existing customers by phone/email, add/remove vehicles during call, process policy changes, create claims, decode VINs when customer reads them, check vehicle recalls, verify addresses, classify commercial businesses. All authentication handled automatically - agent focuses on conversation, not technical details. Optimized for natural phone workflows: minimal questions then auto-populate everything else. Works over HTTPS/SSE for reliable voice calls. Includes smart features: Fenris token caching for instant responses, automatic error handling, graceful API failures. Deploy once, handle unlimited concurrent calls across all insurance lines.

**Character count**: 985 characters

---

## Ultra-Concise for VAPI (495 characters)

Power VAPI phone agents with complete insurance tools for ALL lines of business: auto, home, commercial, life, specialty. Quote any insurance type, manage customers, process claims - all during live calls. Fenris auto-discovers vehicles from address. NHTSA decodes VINs and checks recalls. Smarty verifies addresses. AskKodiak classifies commercial risks. 100+ NowCerts tools for insureds, policies, quotes, claims. Automatic authentication. Perfect for agencies automating phone conversations across all insurance types. Deploy via HTTPS/SSE. Production-ready, handles concurrent calls, 24/7 operation.

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

**Voice-Specific Use Cases (All Lines of Business):**
1. **Auto Quote**: Name + Address → Fenris discovers vehicles → Discuss each → Multi-carrier quote
2. **Homeowners Quote**: Address → Fenris gets property details → Discuss coverage → Quote
3. **Commercial Quote**: Business name + address → AskKodiak classifies risk → Custom coverage
4. **Life Insurance**: Basic info → Create quote → Send application
5. **Add Vehicle**: Customer reads VIN → NHTSA decodes → Add to policy
6. **Claims Intake**: Search customer → Create claim (any LOB) → Route to carrier
7. **Policy Changes**: Search by phone → Verify identity → Process change (any policy type)
8. **Certificate Request**: Search policy → Generate certificate (auto, GL, property, etc.)

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
