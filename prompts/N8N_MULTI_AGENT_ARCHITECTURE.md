# N8N Multi-Agent Architecture for Insurance Workflows

## Overview

This architecture breaks down the insurance quoting workflow into a team of specialized AI agents, each with distinct responsibilities and expertise. Agents coordinate through a **Coordinator Agent** that routes requests and manages the overall workflow.

---

## Agent Team Structure

```
                    ┌─────────────────────┐
                    │  Coordinator Agent  │
                    │  (Nathan - Main)    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────┐ ┌──────────────┐
    │  Intake Agent   │ │   Research  │ │   Coverage   │
    │   (Gather)      │ │    Agent    │ │    Advisor   │
    └─────────────────┘ └─────────────┘ └──────────────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────┐ ┌──────────────┐
    │  Data Manager   │ │   Follow-up │ │  Cross-Sell  │
    │     Agent       │ │    Agent    │ │    Agent     │
    └─────────────────┘ └─────────────┘ └──────────────┘
```

---

## 1. Coordinator Agent (Nathan)

**Role**: Main customer-facing agent that orchestrates the entire workflow

**Responsibilities**:
- Greet customers and understand their needs
- Route requests to specialized agents
- Present information to customers conversationally
- Maintain conversation context
- Make final decisions on recommendations
- Coordinate handoffs between agents

**Tools Access**: All tools (can delegate to any agent)

**Communication Style**:
- Warm, professional, conversational
- Customer-facing language (no technical jargon)
- Maintains the "Nathan" personality

**Decision Making**:
```javascript
if (need_basic_info) → delegate to Intake Agent
if (need_external_data) → delegate to Research Agent
if (need_coverage_advice) → delegate to Coverage Advisor
if (need_to_save_data) → delegate to Data Manager
if (need_to_schedule) → delegate to Follow-up Agent
if (opportunity_for_bundle) → consult Cross-Sell Agent
```

---

## 2. Intake Agent

**Role**: Information gathering specialist

**Responsibilities**:
- Collect customer contact information
- Validate phone numbers and email addresses
- Normalize data formats (phone: ###-###-####)
- Check for duplicate customers (search before create)
- Gather vehicle/driver/property details
- Ask clarifying questions

**Tools Access**:
- `nowcerts_insured_getList` (search for duplicates)
- `smarty_verifyAddress` (validate addresses)

**Communication Style**:
- Asks questions one at a time
- Confirms critical information
- Patient and thorough

**Output**: Structured data package ready for Research Agent

**Example Workflow**:
```
1. Gather: Name, phone, email, address, DOB
2. Validate: Phone format, address via Smarty
3. Search: Check for existing customer records
4. Collect: Vehicle/driver/property details
5. Return: Clean, validated data to Coordinator
```

---

## 3. Research Agent

**Role**: External data specialist

**Responsibilities**:
- Run Fenris household prefill (auto policies)
- Decode VINs via NHTSA
- Check vehicle recalls
- Verify addresses via Smarty
- Conduct background research (web/social media)
- Identify risk factors

**Tools Access**:
- `fenris_prefillHousehold`
- `nhtsa_decodeVin`
- `nhtsa_checkRecalls`
- `smarty_verifyAddress`
- `askkodiak_classifyBusiness` (commercial)

**Communication Style**:
- Silent worker (doesn't talk to customer)
- Returns structured data to Coordinator

**Output**: Enriched data with external information

**Example Workflow**:
```
1. Receive: Basic customer data from Intake Agent
2. Run: Fenris prefill (if auto policy)
3. Decode: VINs for all vehicles
4. Check: Recalls for all vehicles
5. Verify: Property address (if homeowners)
6. Research: Background checks (silent)
7. Return: Enriched data package to Coordinator
```

---

## 4. Coverage Advisor Agent

**Role**: Insurance expertise and recommendations specialist

**Responsibilities**:
- Recommend appropriate coverage levels
- Explain coverage options in plain language
- Educate customers on proper protection
- Determine comp/collision requirements (based on lien)
- Suggest liability limits (never state minimums)
- Recommend deductibles
- Assess telematics suitability

**Tools Access**: None (pure advisory role)

**Communication Style**:
- Educational and consultative
- Explains "why" not just "what"
- Professional but accessible

**Coverage Logic**:
```javascript
// Comp/Collision
if (vehicle.lienholder) {
  REQUIRED: "Your lender requires comprehensive and collision coverage"
} else if (vehicle.value > 5000) {
  RECOMMENDED: "I recommend comp/collision to protect your investment"
} else {
  OPTIONAL: "Comp/collision is optional for this vehicle"
}

// Liability
ALWAYS_RECOMMEND: "100/300/100 minimum (NOT state minimums)"

// Uninsured Motorist
ALWAYS_RECOMMEND: "Strongly recommend - protects you from uninsured drivers"

// Deductibles
RECOMMEND: "$750-$1,000 to avoid small claims"
```

**Output**: Coverage recommendations with reasoning

---

## 5. Data Manager Agent

**Role**: NowCerts database specialist

**Responsibilities**:
- Create prospect/insured records
- Insert quotes/policies
- Add drivers to policies
- Add vehicles to policies
- Add property information
- Create comprehensive notes
- Document lienholder info (for manual addition)
- Ensure data integrity

**Tools Access**:
- `nowcerts_insured_insert`
- `nowcerts_prospect_insert`
- `nowcerts_policy_insert`
- `nowcerts_quote_insert`
- `nowcerts_driver_insert`
- `nowcerts_vehicle_insert`
- `nowcerts_property_insert`
- `nowcerts_note_insert`

**Communication Style**:
- Silent worker (doesn't talk to customer)
- Returns success/failure status to Coordinator

**Output**: NowCerts record IDs and confirmation

**Example Workflow**:
```
1. Receive: Complete data package from Coordinator
2. Create: Prospect/insured record (if doesn't exist)
3. Create: Quote record
4. Add: All drivers (including excluded)
5. Add: All vehicles
6. Add: Property (if applicable)
7. Note: Lienholder info for manual addition
8. Note: All data sources and decisions
9. Return: Success + record IDs to Coordinator
```

---

## 6. Follow-up Agent

**Role**: Scheduling and communication specialist

**Responsibilities**:
- Schedule callback appointments
- Create tasks for Chase Henderson
- Send email confirmations
- Set reminders
- Create follow-up workflows

**Tools Access**:
- `nowcerts_task_insert`
- Gmail (via MCP if available)
- Google Calendar (via MCP if available)

**Communication Style**:
- Confirms scheduling details with customer
- Professional and organized

**Output**: Confirmation of scheduled items

**Example Workflow**:
```
1. Receive: Quote completion from Coordinator
2. Create: Quoting task for Chase Henderson
3. Create: Callback task (24-48 hours out)
4. Schedule: Calendar appointment
5. Send: Email confirmation to customer
6. Return: Confirmation to Coordinator
```

---

## 7. Cross-Sell Agent

**Role**: Bundle opportunity specialist

**Responsibilities**:
- Identify cross-sell opportunities
- Detect bundle possibilities (boat, RV, motorcycle, umbrella)
- Assess commercial insurance needs
- Calculate bundle savings (15-25%)
- Suggest timing for cross-sell conversation

**Tools Access**: None (pure analytical role)

**Communication Style**:
- Consultative, not pushy
- Focuses on value and savings

**Output**: List of cross-sell opportunities with reasoning

**Example Logic**:
```javascript
if (homeowner && auto) {
  SUGGEST: "Bundle discount - save 15-25%"
}

if (high_value_assets) {
  SUGGEST: "Umbrella policy for additional protection"
}

if (business_vehicle_use) {
  SUGGEST: "Commercial auto policy"
}

if (mentions_boat || mentions_rv) {
  SUGGEST: "Add to bundle for maximum savings"
}
```

---

## Agent Coordination Flow

### Example: Personal Auto Quote

```
1. COORDINATOR (Nathan):
   "I'd be happy to help you with that! Let me get some basic information."
   → DELEGATE to Intake Agent

2. INTAKE AGENT:
   - Gathers: name, phone, email, address, DOB
   - Validates: phone format, address via Smarty
   - Searches: existing customers
   → RETURNS clean data to Coordinator

3. COORDINATOR:
   [Receives data]
   → DELEGATE to Research Agent

4. RESEARCH AGENT:
   - Runs: Fenris prefill
   - Gets: 2 vehicles, 3 household members
   - Decodes: VINs
   - Checks: Recalls (1 open recall found)
   → RETURNS enriched data to Coordinator

5. COORDINATOR:
   "Okay, I've pulled up your information. I see you have a 2020 Honda Accord
   and a 2018 Toyota RAV4. Is that right?"
   [Customer confirms]
   "Perfect. Let's start with the Honda..."
   [Gathers usage, driver, loan info]
   → DELEGATE to Coverage Advisor

6. COVERAGE ADVISOR:
   - Analyzes: Vehicle 1 has lienholder
   - Recommends: Comp/Collision required
   - Recommends: 100/300/100 liability
   - Recommends: Uninsured motorist
   - Recommends: $1,000 deductibles
   → RETURNS recommendations to Coordinator

7. COORDINATOR:
   "Since there's a loan on the Honda, your lender requires comprehensive
   and collision coverage. I also recommend 100/300/100 liability limits
   for better protection..."
   [Customer agrees to coverage]
   → DELEGATE to Data Manager

8. DATA MANAGER:
   - Creates: Prospect record
   - Creates: Quote record
   - Adds: 2 drivers
   - Adds: 2 vehicles
   - Notes: Lienholder info
   - Notes: All data sources
   → RETURNS success + IDs to Coordinator

9. COORDINATOR:
   [Checks with Cross-Sell Agent]

10. CROSS-SELL AGENT:
    - Detects: Homeowner (from Fenris)
    - Suggests: "Bundle home + auto for 20% savings"
    → RETURNS opportunity to Coordinator

11. COORDINATOR:
    "By the way, I noticed you own your home. If you bundle your home and
    auto insurance, you could save about 20%. Would you like me to prepare
    a homeowners quote as well?"
    [Customer: "Yes, send me both"]
    → DELEGATE to Follow-up Agent

12. FOLLOW-UP AGENT:
    - Creates: Quoting task for Chase (both auto + home)
    - Creates: Callback task (tomorrow 2pm)
    - Sends: Email with quote details
    → RETURNS confirmation to Coordinator

13. COORDINATOR:
    "Perfect! I'll send both quotes to your email. I'll call you tomorrow
    at 2pm to review everything. Have a great day!"
```

---

## Benefits of Multi-Agent Architecture

### 1. Specialization
- Each agent focuses on one area of expertise
- Easier to improve individual components
- Clearer separation of concerns

### 2. Maintainability
- Update one agent without affecting others
- Test agents independently
- Debug issues more easily

### 3. Scalability
- Add new agents for new insurance lines (life, health)
- Parallel processing (research while intake continues)
- Load balancing across agents

### 4. Quality
- Each agent becomes an expert in its domain
- Consistent handling of specific tasks
- Better error handling per specialty

### 5. Flexibility
- Easy to add new features (e.g., Claims Agent)
- Can bypass agents if data already available
- Conditional routing based on customer needs

---

## Agent Communication Protocol

### Request Format
```json
{
  "from": "coordinator",
  "to": "intake_agent",
  "task": "gather_contact_info",
  "context": {
    "customer_intent": "auto_insurance_quote",
    "conversation_history": [...],
    "partial_data": {}
  }
}
```

### Response Format
```json
{
  "from": "intake_agent",
  "to": "coordinator",
  "status": "success",
  "data": {
    "firstName": "John",
    "lastName": "Smith",
    "phone": "555-123-4567",
    "email": "john@email.com",
    "address": {
      "line1": "123 Main St",
      "city": "Austin",
      "state": "TX",
      "zip": "78701"
    }
  },
  "notes": ["Address validated via Smarty", "No duplicate found"],
  "next_recommended": "research_agent"
}
```

---

## Implementation in n8n

### Option 1: Sub-workflows
- Each agent is a separate n8n sub-workflow
- Coordinator calls sub-workflows via "Execute Workflow" node
- Pass data via JSON

### Option 2: Agent Nodes
- Create custom n8n nodes for each agent
- Each node encapsulates agent logic
- Connect nodes in workflow canvas

### Option 3: LangGraph Integration
- Use LangGraph for agent orchestration
- n8n triggers LangGraph workflow
- Agents defined in Python/TypeScript

### Option 4: MCP Multi-Agent Server
- Extend MCP server with agent routing
- Each agent has dedicated prompt/context
- Coordinator routes via tool calls

**Recommended**: Start with Option 1 (sub-workflows) for easy implementation in n8n

---

## Next Steps

1. ✅ Create individual agent prompt files
2. ✅ Define agent interfaces (inputs/outputs)
3. ✅ Build coordinator routing logic
4. ✅ Implement in n8n as sub-workflows
5. ✅ Test with sample customer scenarios
6. ✅ Iterate and refine based on results

---

## Agent Prompt Files to Create

- `N8N_COORDINATOR_AGENT.md` - Main orchestrator
- `N8N_INTAKE_AGENT.md` - Information gathering
- `N8N_RESEARCH_AGENT.md` - External data enrichment
- `N8N_COVERAGE_ADVISOR_AGENT.md` - Insurance recommendations
- `N8N_DATA_MANAGER_AGENT.md` - NowCerts operations
- `N8N_FOLLOWUP_AGENT.md` - Scheduling and communication
- `N8N_CROSSSELL_AGENT.md` - Bundle opportunities

Each agent prompt will include:
- Role and responsibilities
- Available tools
- Input/output formats
- Communication style
- Decision logic
- Error handling
- Example workflows
