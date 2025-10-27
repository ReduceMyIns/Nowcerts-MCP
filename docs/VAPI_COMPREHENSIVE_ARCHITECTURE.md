# VAPI Assistant Architecture for All Lines of Business

## Overview

This document outlines the comprehensive VAPI assistant architecture capable of handling:
- **129+ Lines of Business**: All personal, commercial, life, and specialty insurance products
- **New Business**: Quote applications, prospect creation, policy setup
- **Service Requests**: Policy changes, certificates, billing, claims
- **Intelligent Routing**: Dynamic carrier service level detection

## Architecture Decision: Single Assistant vs Squad

### ✅ Recommended: Single Comprehensive Assistant

**Why ONE assistant is better:**

1. **Dynamic Intent Routing**: LLM naturally determines what the customer needs without explicit transfers
2. **Seamless Multi-Product Quotes**: "I need auto insurance AND a business policy" → One conversation
3. **Context Preservation**: All conversation history stays with the assistant
4. **Simpler Maintenance**: One system prompt to maintain
5. **Better UX**: No awkward "Let me transfer you to..." moments

**When to use a Squad:**
- ❌ NOT for different insurance types (personal vs commercial)
- ❌ NOT for different request types (quote vs service)
- ✅ YES for different channels (English vs Spanish)
- ✅ YES for different agent personas (Sales vs Support)

### Our Approach: One Nathan, Multiple Capabilities

```
Single VAPI Assistant: "Nathan"
├── Greeting & Intent Detection
├── New Business Branch
│   ├── Personal Lines (Auto, Home, Life, Pet, etc.)
│   ├── Commercial Lines (BOP, GL, WC, etc.)
│   └── Specialty Lines (Cyber, Travel, Wedding, etc.)
├── Service Request Branch
│   ├── Check Carrier Service Level (TagsList tool)
│   ├── Route: Transfer vs Appointment
│   └── Handle Request
└── Information Branch
    ├── Quote questions
    ├── Certificate requests
    └── General inquiries
```

## Carrier Service Level Strategy

### Tag-Based Routing System

All carriers in NowCerts are tagged with their service level:

**Service Level Tags:**
1. **"Full Service"** → Transfer for most requests
   - Policy changes (add vehicle, driver, address)
   - Billing questions
   - Claims (file or inquire)
   - General policy information

2. **"Partial Service"** → Transfer ONLY for billing and claims
   - Billing questions (due dates, payment methods)
   - File new claims
   - Existing claim status
   - ❌ NOT for: policy changes, certificates, cancellations

3. **"Agency Serviced"** → NEVER transfer, always book appointment
   - All requests handled by agency staff
   - Book with Sherry Norton (service) or Chase Henderson (sales)

### How It Works

```
Customer: "I need to add a car to my policy"
    ↓
1. Nathan searches for customer by phone → Finds policy
2. Extracts carrierId (insuredDatabaseId) from policy
3. Calls nowcerts_tag_getTagsList
   Filter: "$filter=insuredDatabaseId eq '{carrierId}'"
   (Alternative if ID unavailable: "$filter=insuredCommercialName eq 'Progressive'")
4. Check returned tags array for service level tag:

   IF Contains "Full Service" tag:
     → "Great! Progressive can help you with that right away. Let me transfer you."
     → Transfer to carrier phone number
     → Log in NowCerts

   IF Contains "Partial Service" tag:
     → "For adding a vehicle, I'll need to book you with our service team."
     → Book appointment with Sherry Norton
     → Email details

   IF Contains "Agency Serviced" OR no service level tag:
     → "I'll get you set up with Sherry Norton who handles policy changes."
     → Book appointment
```

### Implementation: TagsList Tool

The MCP server now includes `nowcerts_tag_getTagsList` which returns:
```json
{
  "value": [
    {
      "id": "uuid",
      "tagName": "Full Service",
      "insuredDatabaseId": "carrier-uuid",
      "insuredCommercialName": "Progressive",
      "insuredPhoneNumber": "800-876-5581",
      "insuredEmail": "customerservice@e.progressive.com"
    }
  ]
}
```

## Lines of Business Coverage

### Personal Lines (66+)

**Auto & Vehicles:**
- Personal Auto, Classic/Collector Cars
- Motorcycle, RV, ATV, Snowmobile
- Watercraft, Golf Cart
- Non-owner Auto, SR-22

**Property:**
- Homeowners, Condo, Renters
- Mobile Home, Manufactured Home
- Vacant Dwelling, Landlord
- Flood, Earthquake, Wind/Hail
- Vacation Rental

**Life & Health:**
- Term Life, Whole Life, Universal Life
- Annuities, Disability Income
- Long-Term Care
- Health, Dental, Vision
- Medicare Supplements
- Pet Insurance

**Specialty:**
- Personal Umbrella
- Wedding Insurance, Special Event
- Travel Insurance
- Identity Theft Protection
- Cyber Liability (Personal)
- Jewelry, Art, Collectibles

### Commercial Lines (55+)

**Core Business:**
- Commercial Auto, Fleet
- General Liability
- Commercial Property
- Business Owners Policy (BOP)
- Workers' Compensation
- Professional Liability (E&O)
- Directors & Officers (D&O)

**Industry-Specific:**
- Garage & Dealers
- Trucking, Motor Carrier
- Aviation, Marine
- Agriculture, Farm & Ranch
- Contractors Equipment
- Builders Risk
- Pollution Liability
- Liquor Liability

**Business Protection:**
- Cyber Liability (Commercial)
- Employment Practices Liability
- Crime Insurance
- Surety Bonds
- Commercial Umbrella
- Inland Marine

### Life & Health (8+)
- Life, Term Life, Whole Life
- Annuities, Disability Income
- Long-Term Care
- Health, Dental, Medical

## Entity Creation Workflow

### What Can Be Created?

**Prospects** (Potential customers)
- Created for ALL quote requests
- Stores: name, phone, email, address, DOB
- Tools: `nowcerts_prospect_insert`, `nowcerts_prospect_insertWithCustomFields`

**Insureds** (Actual customers)
- Created when binding policy
- Linked to policies
- Tools: `nowcerts_insured_insert`, `nowcerts_insured_insertWithCustomFields`

**Opportunities** (Sales pipeline)
- Track quote follow-ups
- Link to prospects/insureds
- Tool: `nowcerts_opportunity_insert`

**Quotes**
- All LOBs supported
- Tool: `nowcerts_quote_insert`

**Vehicles** (For auto quotes)
- Linked to policies/insureds
- Tools: `nowcerts_vehicle_insert`, `nowcerts_vehicle_bulkInsert`

**Drivers** (For auto quotes)
- Linked to policies/vehicles
- Tools: `nowcerts_driver_insert`, `nowcerts_driver_bulkInsert`

**Properties** (For home/commercial quotes)
- Property details
- Tools: `nowcerts_property_insert`, `nowcerts_property_insertOrUpdate`

**Principals** (For commercial quotes)
- Business owners/officers
- Tools: `nowcerts_principal_insert`

**Contacts**
- Additional contacts
- Multiple per insured/prospect

## Workflow Examples

### Example 1: Auto Insurance Quote (Personal)

```
Customer: "I need car insurance"
    ↓
1. Greet naturally
2. Gather: Name, phone, email, address, DOB
3. fenris_prefillHousehold → Discovers vehicles
4. Discuss each vehicle:
   - Year, make, model (confirmed or VIN decoded via nhtsa_decodeVin)
   - Driver (who drives it)
   - Usage (commute, pleasure, business)
   - Annual mileage
   - Loan status (determines if comp/coll required)
5. nhtsa_checkRecalls → Check for recalls, mention if found
6. nowcerts_prospect_insert → Create prospect
7. nowcerts_vehicle_insert → Add vehicles
8. nowcerts_driver_insert → Add drivers
9. nowcerts_quote_insert → Create quote(s)
10. "Okay, I'm showing rates from Progressive at $185, State Auto at $192..."
11. Email quote
12. Schedule callback
```

### Example 2: Commercial BOP Quote

```
Customer: "I need insurance for my bakery"
    ↓
1. Greet & identify as business insurance
2. Gather: Business name, owner name, phone, email, address
3. askkodiak_classifyBusiness → "bakery" → NAICS 311811
4. Get business details:
   - Years in business
   - Number of employees
   - Annual revenue
   - Square footage
   - Building owned/rented
5. askkodiak_getEligibleCarriers → Find carriers that write bakeries
6. askkodiak_getApplicationQuestions → Get product-specific questions
7. Ask questions (dynamic, product-specific)
8. nowcerts_prospect_insert → Create business prospect
9. nowcerts_property_insert → Add business property
10. nowcerts_quote_insert → Create BOP quote
11. "I'm showing quotes from Hartford at $2,400/year, Travelers at $2,650..."
12. Email quote
13. Schedule callback with Chase Henderson (commercial specialist)
```

### Example 3: Service Request - Add Vehicle (Full Service Carrier)

```
Customer: "I need to add a car to my policy"
    ↓
1. Get phone number
2. nowcerts_customer_search → Find customer
3. nowcerts_policy_get → Get policy details → Carrier: "Progressive"
4. nowcerts_tag_getTagsList → Check Progressive service level
   Filter: "tagName eq 'Full Service' and contains(insuredCommercialName, 'Progressive')"
5. Result: Progressive IS Full Service
6. "Great! Since you're with Progressive, they can add that for you right away. Let me transfer you to their team."
7. Transfer to carrier: 800-876-5581
8. nowcerts_callLogRecord_insert → Log the transfer
```

### Example 4: Service Request - Add Vehicle (Billing & Claim Service Carrier)

```
Customer: "I need to add a car to my policy"
    ↓
1-3. [Same as Example 3]
4. nowcerts_tag_getTagsList → Check carrier
   Result: "Billing & Claim Service" tag
5. "For adding a vehicle, I'll need to get you set up with Sherry Norton, our service manager. She'll handle that for you."
6. Get vehicle details (year, make, model, VIN, driver, loan status)
7. Book appointment with Sherry Norton
8. Email details to customer and Sherry
9. nowcerts_task_insert → Create task for Sherry
10. "Perfect! Sherry will call you tomorrow at 2pm to get that added."
```

### Example 5: Certificate of Insurance Request

```
Customer: "I need a certificate of insurance for my landlord"
    ↓
1. Get phone number
2. nowcerts_customer_search → Find customer
3. "No problem! I'll have Sherry Norton prepare that certificate for you."
4. Gather details:
   - Landlord name
   - Landlord address
   - What it's for (lease requirement)
   - When needed by
5. Book appointment with Sherry (or mark as urgent if same-day)
6. Email confirmation
7. nowcerts_task_insert → Create task for Sherry
8. "Sherry will have that emailed to you within a few hours."
```

## System Prompt Enhancements

The VAPI system prompt must be enhanced to include:

1. **Service Level Awareness**
   - Always check carrier tags before transferring
   - Know the three service levels
   - Route appropriately

2. **All LOB Knowledge**
   - Recognize requests for all 129+ products
   - Know which tools to use for each
   - Gather appropriate information per product type

3. **Entity Creation**
   - Always create prospects for quotes
   - Create opportunities for follow-up
   - Link entities correctly

4. **AskKodiak for Commercial**
   - Use for ALL commercial quotes
   - Classify business → Find carriers → Get questions
   - Dynamic questionnaires replace ACORD forms

## Next Steps

1. ✅ Add TagsList tool to MCP server
2. ⏭️ Tag all carriers in NowCerts with service levels
3. ⏭️ Update VAPI_SYSTEM_PROMPT.md with service level routing
4. ⏭️ Add commercial lines workflow to prompt
5. ⏭️ Add all LOB examples to prompt
6. ⏭️ Create carrier tagging script
7. ⏭️ Test comprehensive assistant

## Carrier Tagging Script (To Do)

We need to create a script that:
1. Gets all carriers via `nowcerts_carrier_getList`
2. For each carrier, prompt for service level
3. Apply tag via `nowcerts_tag_insert`
4. Verify with `nowcerts_tag_getTagsList`

Example tag application:
```json
{
  "tag_name": "Full Service",
  "tag_description": "Full Service",
  "insured_database_id": "carrier-uuid",
  "insured_email": "",
  "insured_first_name": "",
  "insured_last_name": "",
  "insured_commercial_name": ""
}
```

---

**Summary**: One comprehensive assistant with intelligent routing beats multiple specialized assistants. The TagsList tool enables dynamic carrier service level detection, allowing Nathan to make smart routing decisions in real-time.
