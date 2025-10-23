# NowCerts MCP Server - Use Case Workflows

## Table of Contents
1. [New Auto Insurance Quote](#new-auto-insurance-quote)
2. [New Homeowners Insurance Quote](#new-homeowners-insurance-quote)
3. [Policy Renewal](#policy-renewal)
4. [Add Vehicle to Existing Policy](#add-vehicle-to-existing-policy)
5. [Add Driver to Existing Policy](#add-driver-to-existing-policy)
6. [Remove Driver from Policy](#remove-driver-from-policy)
7. [Address Change](#address-change)
8. [File a Claim](#file-a-claim)
9. [Customer Service Lookup](#customer-service-lookup)
10. [Create Service Task](#create-service-task)
11. [Policy Cancellation](#policy-cancellation)
12. [Convert Quote to Policy](#convert-quote-to-policy)

---

## New Auto Insurance Quote

### Scenario
Customer requests a comprehensive auto insurance quote. This workflow uses progressive questioning, external data prefill, and systematic data collection to minimize customer effort while gathering complete information.

### Critical Rules

**⚠️ IMPORTANT - Read Before Starting:**
- ✅ **Run `fenris_prefillHousehold` ONLY for Personal Auto or Commercial Auto policies**
- ✅ **Run `smarty_verifyAddress` for ALL property policies AND if Fenris shows homeowner status**
- ✅ **ALWAYS collect driver's license numbers manually - Fenris never returns license numbers**
- ✅ **Ask questions progressively - never ask the same question twice**
- ✅ **Use documents (dec pages, etc.) to reduce questions**
- ✅ **Conduct background web/social research privately - don't disclose to client**
- ✅ **Default agent: Chase Henderson (ID: 7fa050a2-c4c0-4e1c-8860-2008a6f0aec2)**

---

### Phase 1: Initial Contact & Document Gathering

#### 1. Gather Basic Contact Information
Ask progressively:
- Full name, current address, phone, email, preferred contact method

#### 2. Request Existing Policy Documents
```
"Do you have your current policy declaration page?
This will save us time by showing what coverage you have now."
```

If provided:
- Extract all visible data (carriers, drivers, vehicles, coverage, limits, premium)
- Confirm if information is still accurate
- Ask about desired changes only

#### 3. Verify Address
```
Tool: smarty_verifyAddress
Parameters:
  street: "{from step 1}"
  city: "{from step 1}"
  state: "{from step 1}"
  zipCode: "{from step 1}"
```

**Save**: Standardized address, county, ZIP+4

---

### Phase 2: Coverage Needs Assessment

#### 4. Determine Lines of Business Needed
```
"What types of insurance are you looking to quote today?"

Present options:
☐ Personal Auto
☐ Commercial Auto
☐ Homeowners
☐ Renters
☐ Dwelling Fire
☐ Condo
☐ Umbrella
☐ Boat/Watercraft
☐ RV/Motorcycle
```

**Critical Decision Point**:
- If Personal Auto OR Commercial Auto selected → Proceed to Phase 3 (Fenris)
- If ONLY property coverage selected → Skip to Phase 4 (no Fenris)

---

### Phase 3: Auto Insurance Data Collection

**⚠️ Only execute if Personal Auto or Commercial Auto was requested**

#### 5. Run Fenris Household Prefill
```
Tool: fenris_prefillHousehold
Parameters:
  firstName: "{from step 1}"
  lastName: "{from step 1}"
  dateOfBirth: "{ask if not yet collected}"
  address: "{from step 3 standardized}"
  city: "{from step 3}"
  state: "{from step 3}"
  zip: "{from step 3}"
```

**What You Receive**:
- `vehicles[]` - VINs, year, make, model
- `drivers[]` - Household residents (name, DOB, relationship)
- `property{}` - Homeowner status, property details
- `currentInsurance{}` - Prior carrier info

**Save everything** for later use

#### 6. Discuss Household Residents (Drivers)

**For EACH household resident from Fenris**:

**a) Present household list:**
```
"I found these household residents:
- [Name], DOB [date], [relationship]
- [Name], DOB [date], [relationship]

Are there any other residents or vehicle operators not listed?"
```

**b) Coverage Status (for each age 15+):**
```
"Should [Name] be included on the policy or excluded?"

If EXCLUDED, ask reason:
- Has own vehicle and insurance
- Undesirable driving record
- Not licensed
- Away at college (no vehicle access)
- Other (specify)

Mark as EXCLUDED with reason
```

**c) Driver's License Information** ⚠️ **CRITICAL - ALWAYS COLLECT**:
```
For RATED drivers (not excluded):
- "What is [Name]'s driver's license number?"
- "What state is their license from?"
- "What is the issue date?"
- "What is the expiration date?"

Note: Fenris NEVER returns license numbers. You MUST collect manually.
```

**d) Driving History (last 5 years):**
```
For EACH rated driver:
"In the last 5 years, has [Name] had any tickets, accidents, claims, or violations?"

If YES, collect for each incident:
- Type (accident/ticket/claim)
- Date
- Description
- At-fault? (if accident)
- Amount paid (if claim)
```

**e) Additional Driver Details:**
```
For EACH rated driver:
- Occupation and job title
- Education level (high school, bachelor's, etc.)
- If under 25: Student status? GPA 3.0+? (good student discount)
- Financial responsibility filings needed? (SR-22/FR-44)
- Military/government service?
```

#### 7. Web Research & Social Media (Background)

**Research privately (DO NOT disclose to client)**:
- Social media (Facebook, LinkedIn, Instagram)
- Public records, news articles
- Look for: life events, home shopping, career changes, hobbies

**⚠️ Identify high-risk activities:**
- Rideshare (Uber, Lyft)
- Food delivery (DoorDash, Uber Eats)
- Package delivery (Amazon Flex)
- Taxi or business use of personal vehicle

**If found, ask tactfully:**
```
"I noticed you may be doing [activity]. Are you still doing this?
Many carriers don't cover these on personal policies, but we have
special endorsements to fill the gap."
```

#### 8. Compare Documents vs Fenris Data

If documents were provided in step 2:
- Compare drivers on documents vs Fenris residents
- Compare vehicles on documents vs Fenris vehicles
- Ask about any discrepancies

#### 9. Confirm Homeowner Status

```
"The records show you as a [homeowner/renter]. Is this correct?"

If HOMEOWNER:
  Option A (wants homeowners quote): Proceed to Phase 4
  Option B (does NOT want homeowners quote): Run Smarty silently anyway for future use
```

**Important**: If Fenris shows homeowner, ALWAYS run Smarty (even if no property quote requested)

#### 10. Vehicle Ownership Confirmation

**For EACH vehicle from Fenris**:

**a) Ownership Status:**
```
"I found these vehicles:
- [Year] [Make] [Model] (VIN: [last 4])
- [Year] [Make] [Model] (VIN: [last 4])

Do you still own all of these vehicles?"

If NO: Mark vehicle as NOT TO BE INSURED, note reason (sold/totaled/etc.)
```

**b) Additional Vehicles:**
```
"Do you own any vehicles not on this list?"

If YES: Get year, make, model, VIN
Use nhtsa_decodeVin if VIN is known but details are not
```

**c) Vehicle Details (for each to be insured):**
```
- "Does [vehicle] have any existing damage?"
- "How many miles per year do you drive it?"
- "Who is the primary driver?"
- "Do you own it outright, or is it financed/leased?"
```

**d) Lienholder Information (if financed/leased):**
```
"What bank or dealership is it financed/leased through?"
"Do you know their address?"

If NO: Research lienholder address online

Explain: "Your lender requires comprehensive, collision, and
uninsured motorist coverage to protect their interest."
```

**Save lienholder info** for later addition after policy is bound

#### 11. Coverage Selection & Limits

**a) Liability Limits:**
```
"Let's discuss liability limits. These cover damage you cause to others.

Tennessee minimum is 25/50/25, but I strongly recommend higher because:
- Medical bills have increased dramatically
- Average vehicle values are much higher
- A serious accident could exceed minimums easily

Options:
- 25/50/25 (state minimum) - NOT RECOMMENDED
- 50/100/50 (better)
- 100/300/100 (RECOMMENDED ⭐)
- 250/500/250 (excellent)
- 500/500/500 (maximum)

What limits would you like?"
```

**b) Uninsured/Underinsured Motorist (UM/UIM):**
```
"This protects YOU if hit by someone without insurance.
In Tennessee, about 1 in 5 drivers are uninsured.

I recommend matching your liability limits.
Would you like UM/UIM coverage?"
```

**c) Medical Payments:**
```
"Medical Payments covers your medical bills regardless of fault.
Options: $1,000, $2,000, $5,000, $10,000

Would you like Medical Payments?"
```

**d) Comprehensive & Collision:**
```
For EACH vehicle (especially if financed/leased or valuable):

"Comprehensive covers: theft, vandalism, weather, hitting animals
Collision covers: accidents with vehicles or objects

Deductible options:
- $500 (higher premium)
- $750 (balanced - RECOMMENDED ⭐)
- $1,000 (lower premium - RECOMMENDED ⭐)
- $2,500 (older vehicles only)

I recommend $750-$1,000 to avoid small claims that raise rates.
What deductible would you prefer?"
```

**e) Optional Coverages:**
```
- Rental Reimbursement: "$30-50/day if vehicle is being repaired"
- Full Glass: "No deductible for windshield replacement"
- Roadside Assistance: "$5-15/year for towing, flat tires, jump starts"
```

#### 12. Telematics Programs (Optional)

```
"Some carriers offer telematics programs (Progressive Snapshot, Safeco RightTrack).

How it works:
- Install app or plug-in device
- Monitors driving for 90 days
- Can save up to 30% for safe driving

They measure: hard braking, acceleration, late-night driving,
mileage, phone use, speeding

PROS:
- Big potential savings (up to 30%)
- Immediate participation discount

CONS:
- Could INCREASE rates if risky driving detected
- Privacy concerns (location tracking)

Would you like to participate?"
```

#### 13. Prior Insurance History

```
"Have you maintained continuous auto insurance for at least 6 months?"

If YES:
- "How many years with your current carrier?"
- "What company?"
- "What are your current liability limits?"

If NO (lapse):
- Note lapse dates and reason
- May affect rates
```

---

### Phase 4: Property Insurance Data Collection

**Execute this phase if:**
- Customer requested homeowners/renters/condo/dwelling quote, OR
- Fenris indicated homeowner status (even if customer declined property quote)

#### 14. Run Smarty Property Search

```
Tool: smarty_verifyAddress
Parameters:
  street: "{property address}"
  city: "{property city}"
  state: "{property state}"
  zipCode: "{property zip}"
```

Run for EACH property where coverage is desired (or homeowner address from Fenris)

#### 15. Property Details Questions

**For EACH property needing coverage**:

**a) Property Type & Occupancy:**
```
- "What type of property?" (Single family, multi-family, condo, etc.)
- "How is it occupied?" (Owner-occupied, tenant-occupied, vacant, seasonal)
```

**b) Construction Details** ⚠️ **CRITICAL**:
```
- "What year was the home built?"
- "When was the roof last replaced?" (15+ years may need inspection)
- "What is the roof material?" (asphalt, metal, tile)
- "Approximate square footage?"
- "Primary construction type?" (frame, brick, concrete, log)
- "Number of stories?" (1, 2, 3+, split-level)
- "Foundation type?" (slab, crawl space, basement, pier & beam)
```

**c) Systems:**
```
- "Heating type?" (central heat, heat pump, space heaters, wood stove)
- "When was electrical updated?" (pre-1980 may need inspection)
- "Breaker box or fuse box?"
- "Plumbing type?" (copper, PVC, PEX, galvanized, polybutylene)
```

**d) Risk Factors:**
```
- "Pool or trampoline?"
  - Pool: Above ground/in-ground? Fenced? Diving board?
  - Trampoline: Fenced/netted?
- "Any dogs?"
  - How many? Breeds? Any bite history?
  - Note: Some breeds excluded/surcharged (Pit Bulls, Rottweilers, etc.)
```

**e) Safety Features:**
```
- "Alarm or security system?"
  - Burglar alarm (monitored/unmonitored)?
  - Fire alarm?
  - May qualify for 5-20% discount
```

**f) Additional Details:**
```
- "How many acres?"
- "Any farming activity or livestock?" (may need farm policy)
- "Other structures?" (detached garage, shed, barn, pool house)
- "Valuable collections?" (jewelry, guns, artwork, furs - may need scheduled endorsements)
```

**g) Prior Claims:**
```
"Any homeowners claims in the last 5 years?"

If YES:
- Type (water, wind, theft, fire)
- Date of loss
- Amount paid
```

**h) Coverage Limits:**
```
Dwelling (Coverage A): "What would it cost to completely rebuild?"
Other Structures (Coverage B): Usually 10% of dwelling
Personal Property (Coverage C): Usually 50-70% of dwelling
Loss of Use (Coverage D): Usually 20-30% of dwelling
Liability (Coverage E): $100K minimum, $300K recommended ⭐
Medical Payments (Coverage F): $1,000-$5,000
```

**i) Deductibles:**
```
Options:
- $500 (higher premium)
- $1,000 (balanced - RECOMMENDED ⭐)
- $2,500 (lower premium)
- $5,000 (significantly lower premium)
- Percentage: 1%, 2%, 5% of dwelling amount
```

---

### Phase 5: Cross-Sell Opportunities

#### 16. Identify Bundle Opportunities

```
"To maximize savings through bundling, do you also need coverage for:"

☐ Boat/Watercraft (get: length, year, make, model, motor HP)
☐ RV/Motorhome (get: year, make, class A/B/C, value)
☐ Motorcycle (get: year, make, model, CC)
☐ ATV/Off-Road (get: year, make, model)
☐ Umbrella Policy (for high net worth - $1M-$5M additional liability)

"Bundling can save 15-25% on overall premiums!"
```

#### 17. Commercial Coverage Assessment (if applicable)

```
If business activities identified:

"I noticed you [own a business / use vehicle for work].
Do you need commercial coverage for:"

☐ Commercial Auto
☐ Commercial Property
☐ General Liability
☐ Business Owners Policy (BOP)
☐ Garage Liability
☐ Workers Compensation
```

---

### Phase 6: Create Quote in NowCerts

#### 18. Search for Existing Customer
```
Tool: nowcerts_insured_getList
Parameters:
  $filter: "contains(phone, '{phone}') or contains(eMail, '{email}')"
  $top: 10
  $skip: 0
  $orderby: "changeDate desc"
  $count: true
```

**Decision Point**:
- If found → Use existing `insuredDatabaseId`
- If not found → Create new prospect (step 19)

#### 19. Create Prospect (if new customer)
```
Tool: nowcerts_prospect_insert
Parameters:
  prospect: {
    "firstName": "{from Phase 1}",
    "lastName": "{from Phase 1}",
    "dateOfBirth": "{from Phase 3 or ask}",
    "eMail": "{from Phase 1}",
    "phone": "{from Phase 1}",
    "cellPhone": "{if collected}",
    "addressLine1": "{from Smarty standardized}",
    "city": "{from Smarty}",
    "state": "{from Smarty}",
    "zipCode": "{from Smarty}",
    "county": "{from Smarty metadata}",
    "maritalStatus": "{ask if not collected}",
    "gender": "{ask if not collected}"
  }
```

**Save**: `insuredDatabaseId`

#### 20. Insert Quote Record
```
Tool: nowcerts_quote_insert
Parameters:
  quote: {
    "insuredDatabaseId": "{from step 18 or 19}",
    "effectiveDate": "{ask customer or today + 7 days}",
    "expirationDate": "{effectiveDate + 6 months or 1 year}",
    "lineOfBusiness": "Personal Auto, Homeowners, etc.",
    "status": "New",
    "agentDatabaseId": "7fa050a2-c4c0-4e1c-8860-2008a6f0aec2",
    "description": "Comprehensive quote for {name} - {coverage types}"
  }
```

**Save**: `quoteDatabaseId`

#### 21. Add Household Drivers
```
Tool: nowcerts_driver_insert (repeat for EACH driver)
Parameters:
  driver: {
    "insuredDatabaseId": "{from step 19}",
    "firstName": "{from Phase 3.6}",
    "lastName": "{from Phase 3.6}",
    "dateOfBirth": "{from Phase 3.6}",
    "licenseNumber": "{from Phase 3.6c - CRITICAL}",
    "licenseState": "{from Phase 3.6c}",
    "licenseIssueDate": "{from Phase 3.6c}",
    "licenseExpirationDate": "{from Phase 3.6c}",
    "gender": "{from Phase 3.6e}",
    "maritalStatus": "{from Phase 3.6e}",
    "occupation": "{from Phase 3.6e}",
    "education": "{from Phase 3.6e}",
    "goodStudent": "{true if GPA 3.0+}",
    "excluded": "{false or true if excluded}",
    "excludedReason": "{if excluded, from Phase 3.6b}"
  }
```

**For excluded drivers**: Still add them with `excluded: true` and document reason

#### 22. Add Vehicles
```
Tool: nowcerts_vehicle_insert (repeat for EACH vehicle)
Parameters:
  vehicle: {
    "insuredDatabaseId": "{from step 19}",
    "vin": "{from Fenris or customer}",
    "year": "{from Fenris/NHTSA}",
    "make": "{from Fenris/NHTSA}",
    "model": "{from Fenris/NHTSA}",
    "primaryDriverDatabaseId": "{driver ID from step 21}",
    "annualMileage": "{from Phase 3.10c}",
    "existingDamage": "{from Phase 3.10c}",
    "ownership": "owned/financed/leased {from Phase 3.10c}",
    "garagedAddressLine1": "{usually same as insured address}",
    "garagedCity": "{same}",
    "garagedState": "{same}",
    "garagedZipCode": "{same}"
  }
```

**Save**: `vehicleDatabaseId` for each (needed for lienholders later)

#### 23. Note Lienholder Information

**For financed/leased vehicles from Phase 3.10d**:

**Save for later** (add after policy is bound using `nowcerts_policy_insertAdditionalInsured`):
```json
{
  "lienholderName": "{from Phase 3.10d or web search}",
  "lienholderAddress": "{from search}",
  "lienholderCity": "{from search}",
  "lienholderState": "{from search}",
  "lienholderZipCode": "{from search}",
  "loanNumber": "{ask customer if known}",
  "vehicleDatabaseId": "{from step 22}"
}
```

**Important**: Lienholders are added AFTER policy is bound (not during quoting)

#### 24. Add Property Information (if applicable)
```
Tool: nowcerts_property_insert
Parameters:
  property: {
    "insuredDatabaseId": "{from step 19}",
    "addressLine1": "{from Smarty Phase 4.14}",
    "city": "{from Smarty}",
    "state": "{from Smarty}",
    "zipCode": "{from Smarty}",
    "county": "{from Smarty}",
    "propertyType": "{from Phase 4.15a}",
    "occupancy": "{from Phase 4.15a}",
    "yearBuilt": "{from Phase 4.15b}",
    "squareFootage": "{from Phase 4.15b}",
    "constructionType": "{from Phase 4.15b}",
    "numberOfStories": "{from Phase 4.15b}",
    "roofYear": "{from Phase 4.15b}",
    "roofType": "{from Phase 4.15b}",
    "foundationType": "{from Phase 4.15b}",
    "heatingType": "{from Phase 4.15c}",
    "pool": "{from Phase 4.15d}",
    "trampoline": "{from Phase 4.15d}",
    "dogs": "{from Phase 4.15d}",
    "dogBreed": "{from Phase 4.15d}",
    "alarmSystem": "{from Phase 4.15e}",
    "acres": "{from Phase 4.15f}"
  }
```

#### 25. Add Tracking Notes
```
Tool: nowcerts_note_insert
Parameters:
  note: {
    "insuredDatabaseId": "{from step 19}",
    "noteText": "Quote initiated via AI agent. Data sources: [Fenris/Smarty/documents/web research]. Coverage requested: [list]. Special notes: [circumstances]. Telematics: [opted in/out]. Cross-sell opportunities: [list]. Lienholders to be added after binding: [list].",
    "category": "Quote",
    "agentDatabaseId": "7fa050a2-c4c0-4e1c-8860-2008a6f0aec2"
  }
```

---

### Phase 7: Schedule Follow-Up

#### 26. Create Quoting Task
```
Tool: nowcerts_task_insert
Parameters:
  task: {
    "insuredDatabaseId": "{from step 19}",
    "assignedToAgentDatabaseId": "7fa050a2-c4c0-4e1c-8860-2008a6f0aec2",
    "taskType": "Quote",
    "subject": "Generate quotes for {customer name}",
    "description": "Lines: {list}. Data collection complete via AI agent. Review and generate quotes from multiple carriers. Compare rates and options.",
    "dueDate": "{date/time from scheduling}",
    "priority": "High",
    "status": "Not_Started",
    "estimatedDuration": "60 minutes",
    "relatedQuoteId": "{from step 20}"
  }
```

#### 27. Schedule Callback Appointment
```
"I'd like to schedule a callback to review the quotes with you.
When would be a good time?"

[Schedule 24-48 hours after quote task to allow time for quoting]
```

```
Tool: nowcerts_task_insert
Parameters:
  task: {
    "insuredDatabaseId": "{from step 19}",
    "assignedToAgentDatabaseId": "7fa050a2-c4c0-4e1c-8860-2008a6f0aec2",
    "taskType": "Call",
    "subject": "Quote review callback - {customer name}",
    "description": "Review quotes with customer. Discuss coverage options, premiums, answer questions. Close sale if ready.",
    "dueDate": "{scheduled callback date/time}",
    "priority": "High",
    "status": "Not_Started"
  }
```

#### 28. Send Confirmation
```
"Perfect! Here's what we've set up:

✓ Gathered all your information (household, vehicles, property)
✓ Created your quote in our system
✓ Scheduled quoting time: {date/time}
✓ Callback appointment: {date/time}

You'll receive a reminder before our callback.
If you think of anything else, feel free to reach out!"
```

---

### Result

✅ **Complete quote created with:**
- Insured/prospect record
- Quote record in NowCerts
- All drivers (including excluded with reasons)
- All vehicles with ownership details
- Lienholder information saved for later
- Property information (if applicable)
- Tracking notes documenting data sources
- Quoting task for Chase Henderson
- Callback appointment scheduled

---

### Important Reminders

**✅ DO:**
- Run Fenris ONLY for auto policies (Personal/Commercial Auto)
- Run Smarty for ALL property policies AND if Fenris shows homeowner
- Collect driver's license numbers for ALL rated drivers (Fenris never returns these)
- Ask questions progressively (avoid redundancy)
- Use documents to reduce questions
- Conduct background research privately
- Mark excluded drivers with reasons
- Note lienholders for later addition (after binding)
- Recommend appropriate coverage (not minimums)
- Explain telematics honestly (pros and cons)
- Bundle for maximum savings
- Document all data sources in notes

**❌ DON'T:**
- Run Fenris for property-only quotes
- Skip driver's license collection (critical for quoting)
- Ask the same question twice
- Disclose web research to client
- Skip excluded driver documentation
- Recommend state minimums (educate on proper coverage)
- Sign up risky drivers for telematics
- Forget to document everything in notes

---

### Coverage Recommendations Quick Reference

**Auto Liability:**
- Minimum: 25/50/25 (NOT recommended)
- Good: 50/100/50
- **Recommended ⭐: 100/300/100**
- Best: 250/500/250+

**Auto Deductibles:**
- **Recommended ⭐: $750-$1,000** (Comp & Collision)
- Prevents small claims that raise rates

**Homeowners Liability:**
- Minimum: $100,000
- **Recommended ⭐: $300,000**
- Best: $500,000+ (high net worth)

**Homeowners Deductibles:**
- **Recommended ⭐: $1,000**
- Higher: $2,500-$5,000 (for lower premiums)

---

## New Homeowners Insurance Quote

### Scenario
Customer wants homeowners insurance quote for their house.

### Steps

#### 1. Search for Existing Customer
```
Tool: nowcerts_insured_getList
Filter by phone or email
```

#### 2. Prefill Property Data
```
Tool: fenris_prefillHousehold
Gets property details automatically
```

#### 3. Verify and Enrich Address
```
Tool: smarty_verifyAddress
Parameters:
  street: "456 Oak Ave"
  city: "Nashville"
  state: "TN"
  zipcode: "37215"
```

**Smarty returns**:
- Standardized address
- County
- Congressional district
- Coordinates
- Property metadata

#### 4. Create/Update Insured
```
Tool: nowcerts_insured_insert
Include verified address
```

#### 5. Create Quote
```
Tool: nowcerts_policy_insert
Parameters:
  policy: {
    "isQuote": true,
    "businessType": "New_Business",
    "carrierName": "Travelers",
    // Property-specific fields...
  }
```

#### 6. Add Property Details
```
Tool: nowcerts_property_insert
Parameters:
  property: {
    "policyDatabaseId": "{policy id}",
    "addressLine1": "456 Oak Ave",
    "city": "Nashville",
    "state": "TN",
    "zipCode": "37215",
    "propertyType": "Single_Family",
    "yearBuilt": 1998,
    "squareFootage": 2400,
    "constructionType": "Frame",
    "roofType": "Composition Shingle",
    "dwellingCoverage": 350000,
    "personalPropertyCoverage": 175000
  }
```

---

## Policy Renewal

### Scenario
Policy is expiring in 30 days, need to create renewal.

### Steps

#### 1. Find Expiring Policy
```
Tool: nowcerts_policy_getList
Parameters:
  $filter: "expirationDate ge 2025-06-01T00:00:00Z and expirationDate le 2025-07-01T00:00:00Z and active eq true"
  $orderby: "expirationDate asc"
  $top: 100
  $skip: 0
  $count: true
```

#### 2. Get Current Policy Details
```
Tool: nowcerts_policy_getList
Parameters:
  $filter: "id eq '{specific-policy-id}'"
```

#### 3. Verify Current Address
```
Tool: smarty_verifyAddress
Verify insured's current address hasn't changed
```

#### 4. Get Current Vehicles
```
Tool: nowcerts_vehicle_getVehicles
Filter by policyIds containing current policy
```

#### 5. Get Current Drivers
```
Tool: nowcerts_driver_getDrivers
Filter by policyIds containing current policy
```

#### 6. Check VINs for Recalls
```
Tool: nhtsa_checkRecalls
For each vehicle VIN
```

#### 7. Create Renewal Policy
```
Tool: nowcerts_policy_insert
Parameters:
  policy: {
    "insuredDatabaseId": "{same insured}",
    "number": "POL-2025-567890",  // New policy number
    "isQuote": false,  // This is a policy, not quote
    "effectiveDate": "2025-07-01T00:00:00Z",  // Day after current expires
    "expirationDate": "2026-07-01T00:00:00Z",  // 1 year
    "businessType": "Renewal",
    "businessSubType": "Renewal",
    "carrierName": "{same carrier}",
    // Copy other details, update premium if changed
  }
```

#### 8. Copy Vehicles to New Policy
```
Tool: nowcerts_vehicle_bulkInsert
Parameters:
  vehicles: [
    {
      "policyDatabaseId": "{new policy id}",
      // Copy all vehicle details from current policy
    },
    // ... more vehicles
  ]
```

#### 9. Copy Drivers to New Policy
```
Tool: nowcerts_driver_bulkInsert
Parameters:
  drivers: [
    {
      "policyDatabaseId": "{new policy id}",
      // Copy all driver details
    },
    // ... more drivers
  ]
```

#### 10. Add Renewal Note
```
Tool: nowcerts_note_insert
Parameters:
  note: {
    "insuredDatabaseId": "{insured id}",
    "noteText": "Policy renewed. Previous policy: {old number}. New policy: {new number}. Premium increased from $1200 to $1250 due to claims history.",
    "category": "Renewal"
  }
```

---

## Add Vehicle to Existing Policy

### Scenario
Customer purchased a new car and wants to add it to their existing policy.

### Steps

#### 1. Find Customer's Active Policy
```
Tool: nowcerts_policy_getList
Parameters:
  $filter: "insuredDatabaseId eq '{customer-id}' and active eq true and isQuote eq false"
```

#### 2. Decode VIN
```
Tool: nhtsa_decodeVin
Parameters:
  vin: "{new-vehicle-vin}"
```

#### 3. Check for Recalls
```
Tool: nhtsa_checkRecalls
Parameters:
  vin: "{new-vehicle-vin}"
```

#### 4. Add Vehicle to Policy
```
Tool: nowcerts_vehicle_insert
Parameters:
  vehicle: {
    "policyDatabaseId": "{policy-id}",
    "type": "SUV",  // From NHTSA decode
    "year": "2024",
    "make": "Toyota",
    "model": "RAV4",
    "vin": "{new-vehicle-vin}",
    "typeOfUse": "Pleasure",
    "value": "35000",
    "deductibleComprehensive": 500,
    "deductibleCollision": 500
  }
```

#### 5. Create Service Request (tracks the change)
```
Tool: nowcerts_serviceRequest_insertAddVehicle
Parameters:
  data: {
    "policyId": "{policy-id}",
    "effectiveDate": "2025-01-20T00:00:00Z",
    "vehicleDetails": {
      "vin": "{new-vehicle-vin}",
      "year": "2024",
      "make": "Toyota",
      "model": "RAV4"
    }
  }
```

#### 6. Add Note
```
Tool: nowcerts_note_insert
Parameters:
  note: {
    "insuredDatabaseId": "{customer-id}",
    "noteText": "Added 2024 Toyota RAV4 to policy. Effective 01/20/2025. No open recalls found.",
    "category": "Policy Change"
  }
```

---

## Add Driver to Existing Policy

### Scenario
Customer's teenage child got their license and needs to be added as a driver.

### Steps

#### 1. Find Policy
```
Tool: nowcerts_policy_getList
Filter: Policy number or insured ID
```

#### 2. Add Driver
```
Tool: nowcerts_driver_insert
Parameters:
  driver: {
    "policyDatabaseId": "{policy-id}",
    "firstName": "Emily",
    "lastName": "Smith",
    "dateOfBirth": "2007-08-10T00:00:00Z",
    "licenseNumber": "87654321",
    "licenseState": "TN",
    "licenseYear": 2024,
    "maritalStatus": "Single",
    "gender": "Female",
    "excluded": false,
    "relationship": "Child"
  }
```

#### 3. Create Service Request
```
Tool: nowcerts_serviceRequest_insertAddDriver
Parameters:
  data: {
    "policyId": "{policy-id}",
    "effectiveDate": "2025-01-25T00:00:00Z",
    "driverDetails": {
      "firstName": "Emily",
      "lastName": "Smith",
      "dateOfBirth": "2007-08-10T00:00:00Z",
      "licenseNumber": "87654321"
    }
  }
```

#### 4. Add Note
```
Tool: nowcerts_note_insert
Document the driver addition
```

---

## File a Claim

### Scenario
Customer was in an accident and needs to file a claim.

### Steps

#### 1. Find Policy
```
Tool: nowcerts_policy_getList
Filter: Policy number or customer phone
```

#### 2. Create Claim
```
Tool: nowcerts_claim_insert
Parameters:
  claim: {
    "insuredDatabaseId": "{customer-id}",
    "policyNumber": "{policy-number}",
    "claimNumber": "CLM-2025-00123",
    "status": "Open",
    "dateOfLossAndTime": "2025-01-18T14:30:00Z",
    "street": "1st Ave & Main St",
    "city": "Nashville",
    "state": "TN",
    "zipCode": "37201",
    "descriptionOfLossAndDamage": "Rear-ended at stoplight. Damage to rear bumper and trunk. Other driver admitted fault.",
    "policeOrFireDepartment": "Nashville Metro Police",
    "reportNumber": "NPD-2025-1234"
  }
```

#### 3. Add Detailed Note
```
Tool: nowcerts_note_insert
Parameters:
  note: {
    "insuredDatabaseId": "{customer-id}",
    "noteText": "Claim filed. Customer states they were stopped at red light when struck from behind. Other driver's insurance: XYZ Insurance, Policy #ABC123. Estimate for repairs: $3500. Customer vehicle drivable.",
    "category": "Claim"
  }
```

#### 4. Create Follow-up Task
```
Tool: nowcerts_task_insert
Parameters:
  task: {
    "title": "Follow up on claim CLM-2025-00123",
    "description": "Contact adjuster, get repair estimate, coordinate rental car",
    "dueDate": "2025-01-20T00:00:00Z",
    "priority": "High",
    "status": "In_Progress"
  }
```

---

## Customer Service Lookup

### Scenario
Customer calls with a question, need to pull up their information quickly.

### Steps

#### 1. Search by Phone or Email
```
Tool: nowcerts_insured_getList
Parameters:
  $filter: "contains(phone, '615-555-1234') or contains(cellPhone, '615-555-1234') or contains(eMail, 'customer@email.com')"
  $top: 10
```

#### 2. Get All Policies
```
Tool: nowcerts_policy_getList
Parameters:
  $filter: "insuredDatabaseId eq '{customer-id}'"
  $orderby: "effectiveDate desc"
```

#### 3. Get Vehicles (if auto policy)
```
Tool: nowcerts_vehicle_getVehicles
Filter by insuredDatabaseId
```

#### 4. Get Drivers (if auto policy)
```
Tool: nowcerts_driver_getDrivers
Filter by insuredDatabaseId
```

#### 5. Get Recent Notes
```
Tool: nowcerts_note_getNotes
Parameters:
  filters: {
    "insuredDatabaseId": "{customer-id}"
  }
Sorted by most recent
```

#### 6. Get Open Claims
```
Tool: nowcerts_claim_getList
Parameters:
  $filter: "insuredDatabaseId eq '{customer-id}' and status eq 'Open'"
```

#### 7. Get Open Tasks
```
Tool: nowcerts_task_getTasks
Parameters:
  filters: {
    "insuredDatabaseId": "{customer-id}",
    "status": "Not_Started or In_Progress"
  }
```

**Result**: Complete customer view in 7 quick lookups

---

## Convert Quote to Policy

### Scenario
Customer accepted the quote, now bind the policy.

### Steps

#### 1. Get Quote Details
```
Tool: nowcerts_policy_getList
Parameters:
  $filter: "number eq 'Q-2025-001234'"
```

#### 2. Update Quote to Policy
**Note**: Currently may need to create new policy and deactivate quote

```
Tool: nowcerts_policy_insert
Parameters:
  policy: {
    // Copy all quote details
    "isQuote": false,  // Change to policy
    "number": "POL-2025-001234",  // New policy number
    "status": "Active",
    "bindDate": "2025-01-20T00:00:00Z"
  }
```

#### 3. Copy Vehicles to Policy
```
Tool: nowcerts_vehicle_bulkInsert
Copy vehicles from quote to new policy
```

#### 4. Copy Drivers to Policy
```
Tool: nowcerts_driver_bulkInsert
Copy drivers from quote to new policy
```

#### 5. Add Bind Note
```
Tool: nowcerts_note_insert
Parameters:
  note: {
    "insuredDatabaseId": "{customer-id}",
    "noteText": "Quote Q-2025-001234 bound as policy POL-2025-001234. Effective date: 01/20/2025. Premium: $1200/6mo.",
    "category": "Policy Bind"
  }
```

---

## Common Patterns

### Pattern: Search → Create → Link
1. Search for parent record (insured, policy)
2. Create new record
3. Link using proper ID field

### Pattern: Prefill → Verify → Create
1. Prefill data (Fenris, NHTSA)
2. Verify data (Smarty addresses, NHTSA VINs)
3. Create NowCerts records

### Pattern: Get → Update → Note
1. Get existing record
2. Make changes
3. Document with note

### Pattern: Bulk Operations
1. Get list of items
2. Process in batches
3. Use bulk insert endpoints when available

---

This guide provides step-by-step workflows for common insurance operations using the NowCerts MCP Server.
