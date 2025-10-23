# Auto Insurance Quote Workflow - Comprehensive Guide

This is a detailed workflow for AI agents gathering complete auto insurance quote information through progressive questioning while minimizing redundant questions and leveraging external data sources.

---

## Overview

This workflow guides an AI agent through the complete process of gathering auto insurance quote information by:
- Using Fenris API for vehicle/household prefill (Personal/Commercial Auto only)
- Using Smarty API for property data (all property policies + homeowners discovered via Fenris)
- Progressive questioning to avoid asking the same question twice
- Cross-selling opportunities identification
- Complete data collection for accurate quoting

---

## Phase 1: Initial Contact & Document Gathering

### Step 1.1: Gather Basic Contact Information

**Objective**: Establish contact and get baseline information

**Questions to Ask** (one at a time or in small groups):
```
- Full name
- Current address
- Phone number
- Email address
- Preferred contact method
```

**MCP Tools**: None yet - just conversation

---

### Step 1.2: Check for Existing Policy Documents

**Objective**: Reduce questions by extracting data from existing documentation

**Questions to Ask**:
```
"Do you currently have insurance or a recent policy?
If so, can you attach a PDF or photo of your policy declaration page?"
```

**If Documents Provided**:
1. Extract all visible information:
   - Current carrier
   - Coverage limits
   - Listed drivers
   - Listed vehicles
   - Property details
   - Current premium
   - Expiration date
   - Deductibles

2. Briefly confirm information is still accurate
3. Ask about desired changes/additions/removals
4. Note any discrepancies for discussion later

**MCP Tools**: None (document analysis only)

---

### Step 1.3: Verify Address

**Objective**: Validate and standardize the address

**MCP Tool**: `smarty_verifyAddress`

**Input**:
```json
{
  "street": "from step 1.1",
  "city": "from step 1.1",
  "state": "from step 1.1",
  "zipCode": "from step 1.1"
}
```

**Save**: Standardized address, county, ZIP+4 for later use

---

## Phase 2: Coverage Needs Assessment

### Step 2.1: Determine Lines of Business Needed

**Questions to Ask**:
```
"What types of insurance are you looking to quote today?"

Options to present:
☐ Personal Auto
☐ Commercial Auto
☐ Homeowners
☐ Renters
☐ Dwelling Fire
☐ Condo
☐ Umbrella
☐ Commercial Property
☐ Garage Liability
☐ General Liability
☐ Business Owners Policy (BOP)
☐ Boat/Watercraft
☐ RV/Motorhome
☐ Motorcycle
☐ ATV
```

**Important**: Only run Fenris prefill if Personal Auto or Commercial Auto is requested

**Save**: List of requested coverage types for later steps

---

## Phase 3: Auto Insurance Data Collection

**⚠️ Only execute this phase if Personal Auto or Commercial Auto coverage is requested**

### Step 3.1: Run Fenris Household Prefill

**Objective**: Get baseline household and vehicle data

**MCP Tool**: `fenris_prefillHousehold`

**Input**:
```json
{
  "firstName": "from step 1.1",
  "lastName": "from step 1.1",
  "dateOfBirth": "ask if not yet collected",
  "address": "from step 1.3 standardized address",
  "city": "from step 1.3",
  "state": "from step 1.3",
  "zip": "from step 1.3"
}
```

**What You'll Receive**:
- `vehicles[]` - Array of vehicles owned (VIN, year, make, model)
- `drivers[]` - Array of household residents (name, DOB, relationship)
- `property{}` - Homeowner status, property details
- `currentInsurance{}` - Prior carrier information

**Save All Data**: Even if some items won't be included on the policy, save everything with notations

---

### Step 3.2: Discuss Household Residents (Drivers)

**Objective**: Confirm and complete driver information

**Questions to Ask** (for EACH household resident from Fenris):

```
"I found these household residents:
- [Name], DOB [date]
- [Name], DOB [date]

Are there any other household residents or vehicle operators not on this list?"
```

**For Each Driver**:

**a) Coverage Status**:
```
Age 15+: "Should [Name] be included on the policy or excluded?"

If EXCLUDED, ask reason:
- Has own vehicle and insurance
- Undesirable driving record
- Not licensed
- Away at college (no vehicle access)
- Other (specify)

Mark as EXCLUDED with reason
```

**b) Driver's License Information** (⚠️ CRITICAL - Fenris never returns this):
```
For RATED drivers:
- "What is [Name]'s driver's license number?"
- "What state is their license from?"
- "What is the issue date?"
- "What is the expiration date?"

For EXCLUDED drivers:
- Name and DOB only (already have from Fenris)
```

**c) Under 18 Drivers**:
```
If age < 18:
- "Does [Name] have a learner's permit or full license?"
- If permit: Note as learner's permit
- If license: Note license type and date obtained
```

**d) Driving History (Last 5 Years)**:
```
For EACH rated driver:
- "In the last 5 years, has [Name] had any tickets, accidents, claims, or violations?"
- If YES: Get details for each incident
  - Type (accident/ticket/claim)
  - Date
  - Description
  - At-fault? (if accident)
  - Amount paid (if claim)
```

**e) Financial Responsibility Filings**:
```
- "Does [Name] require an SR-22 or FR-44 filing?"
- If YES: Note which type and reason
```

**f) Occupation & Education**:
```
For EACH rated driver:
- "What is [Name]'s occupation?"
- "What is their specific job title?"
- "What is their highest level of education completed?"
```

**g) Military/Government Service**:
```
- "Has anyone in the household ever served in the military or worked as a government employee?"
- If YES: Get details - which person, which branch/agency
```

**h) Student Status & GPA** (if under 25 or appears to be student):
```
- "Is [Name] currently a student?"
- If YES: "Do they have a 3.0 GPA or better?"
- If YES to GPA: "This qualifies for a discount! Can you upload proof (report card/transcript)?"
```

**i) Email & Phone** (for all household members if possible):
```
- Gather contact info for all household residents when possible
- Helpful for multi-car policies and future contact
```

---

### Step 3.3: Web Research & Social Media (Background)

**Objective**: Build context profile WITHOUT disclosing to client

**Research Sources**:
- Social media (Facebook, LinkedIn, Instagram)
- Public records
- News articles
- Business listings

**Look For**:
- Life events (marriages, engagements, births, deaths)
- Home shopping activities
- Career changes
- Hobbies and interests
- Vehicle purchases
- Moving activities

**⚠️ Identify Risk Factors** (ask about tactfully if found):
- Rideshare driving (Uber, Lyft)
- Food delivery (DoorDash, Uber Eats, etc.)
- Package delivery (Amazon Flex)
- Taxi operations
- Business use of personal vehicle

**If High-Risk Activities Found**:
```
"I noticed [social media/public records show] that you may be doing [activity].
Are you still doing this?

Many insurance companies don't allow these activities on personal auto policies,
but we have carriers with special endorsements to cover the gap between rides/deliveries.
Let me know so I can find the right coverage for you."
```

**Save**: All findings and links (do NOT share links with client)

---

### Step 3.4: Compare Documents vs Fenris Data

**Objective**: Identify and resolve discrepancies

**If Documents Were Provided in Step 1.2**:

Compare:
- Drivers listed on documents vs Fenris residents
- Vehicles on documents vs Fenris vehicles
- Address on documents vs current address

**For Each Discrepancy, Ask**:
```
"I notice [discrepancy]. Can you explain this?"

Examples:
- "The documents show 3 vehicles but Fenris shows 4. Did you recently acquire a vehicle?"
- "The documents list [Person] as a driver but they're not in the household. Did they move out?"
- "Your current address is different from the policy documents. When did you move?"
```

**Save**: Responses and explanations

---

### Step 3.5: Confirm Homeowner Status

**Objective**: Determine if Smarty property search is needed

**From Fenris Response**: `property.homeownerStatus`

**Ask**:
```
"The records show you as a [homeowner/renter]. Is this correct?"
```

**If Homeowner**:
```
Option A (wants homeowners quote):
- Proceed to Phase 4 for property data collection
- Run Smarty property search

Option B (does NOT want homeowners quote):
- Run Smarty property search anyway (silently store for future use)
- Do NOT mention to client to avoid confusion
- Just say: "Noted - focusing on auto coverage only"
```

**Save**: Homeowner status and whether property quote is desired

---

### Step 3.6: Vehicle Ownership Confirmation

**Objective**: Confirm vehicle details and ownership

**For EACH Vehicle from Fenris**:

**a) Ownership Status**:
```
"I found these vehicles:
- [Year] [Make] [Model] (VIN: [last 4 digits])
- [Year] [Make] [Model] (VIN: [last 4 digits])

Do you still own all of these vehicles?"
```

**If NO** (vehicle sold/totaled/etc):
```
- Keep vehicle data but mark as NOT TO BE INSURED
- Note reason: "Sold on [date]" or "Totaled" or "Gifted to family member"
- Ask: "When was it sold/disposed of?"
```

**b) Vehicle Not Listed**:
```
"Do you own any vehicles not on this list?"
- If YES: Get full details
  - Year, Make, Model
  - VIN (use nhtsa_decodeVin if they don't know year/make/model)
  - When acquired
```

**c) Existing Damage**:
```
For EACH vehicle to be insured:
"Does [vehicle] have any existing damage?"
- If YES: Get details and estimated repair cost
- Note: May affect comprehensive/collision coverage or require inspection
```

**d) Annual Mileage**:
```
"How many miles per year do you drive the [vehicle]?"

Help them calculate:
"Think about your weekly driving - work commute, errands, etc.
About how many miles per week would you estimate?"
[multiply by 52 to annualize]

Explain: "Many carriers offer low mileage discounts for under 7,500 miles/year"
```

**e) Primary Driver**:
```
"Who is the primary driver of the [vehicle]?"
- Assign from household resident list
```

**f) Ownership Type**:
```
"Do you own this vehicle outright, or is it financed/leased?"

If FINANCED or LEASED:
- "What bank or dealership is it financed/leased through?"
- "Do you know their address for the lienholder info?"
- If NO: "I'll look that up for you"
  - Use web search or NowCerts data to find lienholder address
```

**g) Lienholder Recommendations**:
```
If financed/leased, recommend:
"Your lender requires certain coverage. I recommend:
- Comprehensive (covers theft, weather, vandalism)
- Collision (covers accidents)
- Uninsured Motorist Property Damage (UMPD)
- Uninsured/Underinsured Motorist (UM/UIM)

These protect both you and the lender's interest in the vehicle."
```

**h) Compare Against Documents**:
```
If documents were provided:
- Check for vehicles on documents but not in Fenris
- Ask about discrepancies
```

---

### Step 3.7: Coverage Selection & Limits

**Objective**: Determine desired coverage types and limits

**a) Liability Limits**:
```
"Let's discuss liability limits. These cover damage you cause to others.

Tennessee minimum is 25/50/25, but I strongly recommend higher limits because:
- Medical bills have increased dramatically
- Average vehicle values are much higher today
- A serious accident could exceed minimums easily

Common options:
- 25/50/25 (state minimum) - Not recommended
- 50/100/50 (better protection)
- 100/300/100 (recommended)
- 250/500/250 (excellent protection)
- 500/500/500 (maximum protection)

What limits would you like to quote?"
```

**b) Uninsured/Underinsured Motorist (UM/UIM)**:
```
"This protects YOU if you're hit by someone without insurance or with low limits.
In Tennessee, about 1 in 5 drivers are uninsured.

I recommend matching your liability limits for full protection.
Would you like UM/UIM coverage?"
```

**c) Medical Payments (Med Pay)**:
```
"Medical Payments covers your medical bills regardless of fault.
Common options: $1,000, $2,000, $5,000, $10,000

Would you like Medical Payments coverage?"
```

**d) Comprehensive & Collision (if vehicle is financed/leased or valuable)**:
```
For EACH vehicle:

"Comprehensive covers: theft, vandalism, weather, hitting an animal
Collision covers: accidents with other vehicles or objects

Deductible options:
- $500 (higher premium, lower out-of-pocket)
- $750 (balanced - RECOMMENDED)
- $1,000 (lower premium, but more out-of-pocket)
- $2,500 (for older vehicles you can afford to replace)

I recommend $750 or $1,000 to avoid filing small claims that could raise rates.

What deductible would you prefer?"
```

**e) Rental Reimbursement**:
```
If comprehensive or collision is selected:

"Rental coverage pays for a rental car if yours is being repaired.
Common options:
- $30/day up to $900 total
- $40/day up to $1,200 total
- $50/day up to $1,500 total

This only costs a few dollars per month. Would you like rental coverage?"
```

**f) Full Glass/Reduced Glass Deductible**:
```
If available in quote:

"Some carriers offer full glass coverage (no deductible for windshields)
or reduced glass deductibles.

Would you like to include glass coverage if available?"
```

**g) Roadside Assistance/Towing**:
```
"Roadside assistance covers towing, flat tires, lockouts, jump starts.
Usually $5-15 per year per vehicle.

Would you like roadside assistance?"
```

---

### Step 3.8: Telematics Programs (Optional)

**Objective**: Determine if customer wants usage-based insurance

**Explain Telematics**:
```
"Some carriers offer telematics programs like Progressive Snapshot or Safeco RightTrack.

How it works:
- Install app on your phone or plug-in device
- Monitors driving habits for 90 days
- Can save up to 30% if you're a safe driver

What they measure:
✓ Hard braking
✓ Rapid acceleration
✓ Late night driving (11pm-4am)
✓ Mileage
✓ Cell phone use while driving
✓ Speeding

PROS:
- Big potential savings (up to 30%)
- Immediate participation discount
- Makes you more aware of driving habits

CONS:
- Could INCREASE rates if driving habits are risky
- Privacy concerns (location tracking)
- Requires consistent phone use or device installation

This is optional and per-vehicle. Some drivers can opt in, others can decline.

Would you like to participate in a telematics program?"
```

**If YES**: Note which vehicles/drivers
**If NO**: Note as declined

**Save**: Telematics preference per vehicle/driver

---

### Step 3.9: Prior Insurance History

**Objective**: Confirm continuous coverage and prior carrier

**Ask**:
```
"Have you maintained continuous auto insurance for at least 6 months?"

If YES:
- "How many years have you been with your current carrier?"
- "What company are you with currently?"
- "What are your current liability limits?"

If NO (lapse in coverage):
- Note lapse dates and reason
- May affect rates or require non-standard coverage
```

**Save**: Prior carrier, limits, years with carrier, any lapses

---

## Phase 4: Property Insurance Data Collection

**Execute this phase if ANY of these apply:**
- Customer requested homeowners, renters, condo, or dwelling fire quote
- Fenris indicated homeowner status (even if customer declined property quote - collect data silently)
- Customer requested commercial property, garage, or BOP coverage

---

### Step 4.1: Run Smarty Property Search

**Objective**: Get detailed building and construction data

**MCP Tool**: `smarty_verifyAddress`

**Run for EACH property where coverage is desired** (or homeowner address from Fenris even if no quote requested)

**Input**:
```json
{
  "street": "property address",
  "city": "property city",
  "state": "property state",
  "zipCode": "property zip"
}
```

**What You'll Receive**:
- Standardized address
- County name
- Delivery point validation
- Metadata about property

**Note**: Smarty provides address validation, not full building data. You'll need to ask additional questions.

---

### Step 4.2: Property Details Questions

**For EACH property needing coverage**:

**a) Property Type**:
```
"What type of property is this?"
- Single Family Home
- Multi-Family (2-4 units)
- Condo
- Townhouse
- Mobile/Manufactured Home
- Commercial Property
```

**b) Occupancy**:
```
"How is the property occupied?"
- Owner-Occupied (you live there)
- Tenant-Occupied (you rent it out)
- Vacant
- Seasonal/Vacation Home
```

**c) Year Built / Roof Age** (CRITICAL):
```
"What year was the home built?"
"When was the roof last replaced?"

If roof is 15+ years old:
- May require inspection
- May affect coverage options
- Note roof material (asphalt shingle, metal, tile, etc.)
```

**d) Square Footage**:
```
"What is the approximate square footage of the home?"
```

**e) Construction Type**:
```
"What is the home's primary construction?"
- Frame (wood)
- Brick/Masonry
- Concrete Block
- Log
- Steel Frame
- Other
```

**f) Number of Stories**:
```
"How many stories is the home?"
- 1 story
- 2 stories
- 3+ stories
- Split-level
```

**g) Foundation Type**:
```
"What type of foundation?"
- Slab
- Crawl Space
- Basement (full/partial)
- Pier & Beam
```

**h) Heating Type**:
```
"What type of heating system?"
- Central Heat (gas/electric)
- Heat Pump
- Space Heaters
- Wood Stove
- Other
```

**i) Electrical**:
```
"What year was the electrical system updated?"
"What type: Breaker box or fuse box?"

Note: Old electrical (pre-1980) may require inspection or updates
```

**j) Plumbing**:
```
"What type of plumbing?"
- Copper
- PVC
- PEX
- Galvanized (may be uninsurable if old)
- Polybutylene (problematic - note if present)
```

**k) Pool/Trampoline**:
```
"Do you have a pool or trampoline?"

If pool:
- Above ground or in-ground?
- Fenced? (required by most carriers)
- Diving board or slide?

If trampoline:
- Fenced/netted?
- Note: Some carriers exclude or surcharge
```

**l) Dogs**:
```
"Do you have any dogs?"

If YES:
- How many?
- What breed(s)? (CRITICAL - some breeds are excluded/surcharged)
- Any bite history?

Problematic breeds (varies by carrier):
- Pit Bulls, Rottweilers, German Shepherds, Dobermans, etc.
```

**m) Alarm/Security System**:
```
"Do you have any alarm or security systems?"
- Burglar alarm (monitored/unmonitored)?
- Fire alarm?
- Cameras?
- Smart home system?

Note: May qualify for discounts (5-20% depending on carrier)
```

**n) Farming/Acreage**:
```
"How many acres is the property?"
"Any farming activity or livestock?"

If farming/livestock:
- May need farm policy instead of homeowners
- Note types of farming/livestock
```

**o) Other Structures**:
```
"Are there any other structures on the property?"
- Detached garage/carport
- Shed
- Barn
- Fence
- Pool house
- Guest house
- Greenhouse

For each, estimate replacement cost
```

**p) Personal Property / Contents Coverage**:
```
"Do you have any valuable collections you'd like to insure separately?"
- Jewelry (over $1,500 in value?)
- Guns/Firearms
- Artwork
- Furs
- Collectibles (coins, stamps, etc.)
- Musical instruments
- Cameras/Electronics

These may need scheduled personal property endorsements
```

**q) Prior Claims**:
```
"Have you filed any homeowners claims in the last 5 years?"

If YES:
- What type? (water damage, wind, theft, fire, etc.)
- Date of loss
- Amount paid
- Was it weather-related?
```

**r) Coverage Limits Needed**:
```
Dwelling (Coverage A):
- "What would it cost to completely rebuild your home?"
- Help them estimate if unsure
- Note: This is NOT the same as market value

Other Structures (Coverage B):
- Usually 10% of dwelling amount

Personal Property (Coverage C):
- Usually 50-70% of dwelling amount
- "Is this enough to replace all your belongings?"

Loss of Use (Coverage D):
- Usually 20-30% of dwelling amount
- Covers hotel/rent if home is uninhabitable

Liability (Coverage E):
- $100,000 minimum (usually)
- $300,000 recommended
- $500,000 for high net worth

Medical Payments (Coverage F):
- Usually $1,000-$5,000
```

**s) Deductibles**:
```
"What deductible would you prefer?"
- $500 (higher premium)
- $1,000 (balanced - RECOMMENDED)
- $2,500 (lower premium)
- $5,000 (significantly lower premium)
- % deductibles (1%, 2%, 5% of dwelling amount)

Note: Higher deductibles = lower premiums but more out-of-pocket when you claim
```

---

## Phase 5: Additional Coverage Discussion

**Objective**: Identify cross-sell opportunities

### Step 5.1: Bundle Opportunities

**Ask About**:
```
"To maximize your savings through bundling, do you also need coverage for:"

☐ Boat / Watercraft
  - If YES: Get details (length, year, make, model, value, motor HP)

☐ RV / Motorhome
  - If YES: Get details (year, make, model, class A/B/C, value)

☐ Motorcycle
  - If YES: Get details (year, make, model, CC, value)

☐ ATV / Off-Road Vehicle
  - If YES: Get details (year, make, model, value)

☐ Umbrella Policy (for high net worth individuals)
  - Recommended if assets exceed auto/home liability limits
  - Provides $1M-$5M additional liability coverage
  - Relatively inexpensive ($200-500/year for $1M)

Bundling these can often save 15-25% on overall premiums!
```

---

### Step 5.2: Commercial Coverage Assessment

**If Business Activities Identified**:
```
"I noticed you [own a business / use vehicle for work / etc.].
Do you need commercial coverage for:"

☐ Commercial Auto (if using vehicle for business)
☐ Commercial Property (if business owns building)
☐ General Liability (for business operations)
☐ Business Owners Policy (BOP - combines property + liability)
☐ Garage Liability (if you have a garage/repair shop)
☐ Garage Keepers Liability (if you store customer vehicles)
☐ Workers Compensation (if you have employees)

Let me know which ones you'd like to include."
```

---

## Phase 6: Create Quote in NowCerts

**Objective**: Insert quote record to begin quoting process

### Step 6.1: Create Prospect (If New Customer)

**MCP Tool**: `nowcerts_prospect_insert`

**Input** (combine all data gathered):
```json
{
  "FirstName": "from Phase 1",
  "LastName": "from Phase 1",
  "Email": "from Phase 1",
  "Phone": "from Phase 1",
  "CellPhone": "if collected",
  "AddressLine1": "from Smarty standardized address",
  "AddressLine2": "if applicable",
  "City": "from Smarty",
  "State": "from Smarty",
  "ZipCode": "from Smarty",
  "County": "from Smarty metadata",
  "DateOfBirth": "from Phase 3 or ask if not yet collected",
  "MaritalStatusCode": "ask if not yet collected (S/M/D/W)",
  "GenderCode": "ask if not yet collected (M/F)"
}
```

**Save**: ProspectDatabaseId for use in subsequent steps

---

### Step 6.2: Insert Quote Record

**MCP Tool**: `nowcerts_quote_insert`

**Input**:
```json
{
  "insuredDatabaseId": "from step 6.1 or existing insured ID",
  "effectiveDate": "ask customer or default to today + 7 days",
  "expirationDate": "effectiveDate + 6 months or 1 year",
  "lineOfBusiness": "Personal Auto, Homeowners, etc.",
  "status": "New",
  "agentDatabaseId": "Chase Henderson's ID: 7fa050a2-c4c0-4e1c-8860-2008a6f0aec2",
  "description": "Comprehensive quote for [customer name] - [coverage types]"
}
```

**Alternative Tool**: `nowcerts_quote_insert` via Zapier endpoint if preferred

**Save**: QuoteDatabaseId for tracking

---

### Step 6.3: Add Household Drivers

**For EACH rated driver identified in Phase 3.2**:

**MCP Tool**: `nowcerts_driver_insert`

**Input**:
```json
{
  "insuredDatabaseId": "from step 6.1",
  "firstName": "from Phase 3.2",
  "lastName": "from Phase 3.2",
  "dateOfBirth": "from Phase 3.2",
  "licenseNumber": "from Phase 3.2 - CRITICAL",
  "licenseState": "from Phase 3.2",
  "licenseIssueDate": "from Phase 3.2",
  "licenseExpirationDate": "from Phase 3.2",
  "genderCode": "M or F",
  "maritalStatusCode": "S/M/D/W",
  "occupation": "from Phase 3.2",
  "education": "from Phase 3.2",
  "goodStudent": "true if GPA 3.0+, from Phase 3.2h",
  "excluded": "false (or true if excluded driver)",
  "excludedReason": "if excluded, from Phase 3.2a"
}
```

**For Excluded Drivers**: Still add them with `excluded: true` and note reason

---

### Step 6.4: Add Vehicles

**For EACH vehicle to be insured from Phase 3.6**:

**MCP Tool**: `nowcerts_vehicle_insert`

**Input**:
```json
{
  "insuredDatabaseId": "from step 6.1",
  "vin": "from Fenris or customer",
  "year": "from Fenris/NHTSA decode",
  "make": "from Fenris/NHTSA decode",
  "model": "from Fenris/NHTSA decode",
  "primaryDriverDatabaseId": "driver ID from step 6.3",
  "annualMileage": "from Phase 3.6d",
  "existingDamage": "from Phase 3.6c",
  "ownership": "owned/financed/leased from Phase 3.6f",
  "garagedAddressLine1": "usually same as insured address",
  "garagedCity": "same",
  "garagedState": "same",
  "garagedZipCode": "same"
}
```

**Save**: VehicleDatabaseId for each vehicle (needed for lienholders in next step)

---

### Step 6.5: Add Lienholders/Additional Interests

**For EACH financed/leased vehicle from Phase 3.6f**:

**MCP Tool**: `nowcerts_policy_insertAdditionalInsured`

**Important**: This tool requires a PolicyDatabaseId, so this step happens AFTER a policy is created, not during quoting. However, you should **note the lienholder information** during the quote phase to add later.

**Lienholder Information to Collect Now**:
```json
{
  "lienholderName": "from Phase 3.6f or web search",
  "lienholderAddress": "from Phase 3.6f or web search",
  "lienholderCity": "from search",
  "lienholderState": "from search",
  "lienholderZipCode": "from search",
  "loanNumber": "ask customer if known",
  "vehicleDatabaseId": "from step 6.4"
}
```

**Note**: Store this for later when the policy is bound. You'll need to use `nowcerts_policy_insertAdditionalInsured` after the policy is created.

---

### Step 6.6: Add Property Information

**If homeowners/renters/condo/dwelling coverage requested**:

**MCP Tool**: `nowcerts_property_insert`

**Input** (from Phase 4.2):
```json
{
  "insuredDatabaseId": "from step 6.1",
  "addressLine1": "from Smarty",
  "city": "from Smarty",
  "state": "from Smarty",
  "zipCode": "from Smarty",
  "county": "from Smarty",
  "propertyType": "from Phase 4.2a",
  "occupancy": "from Phase 4.2b",
  "yearBuilt": "from Phase 4.2c",
  "squareFootage": "from Phase 4.2d",
  "constructionType": "from Phase 4.2e",
  "numberOfStories": "from Phase 4.2f",
  "roofYear": "from Phase 4.2c",
  "roofType": "from Phase 4.2c",
  "foundationType": "from Phase 4.2g",
  "heatingType": "from Phase 4.2h",
  "pool": "from Phase 4.2k",
  "trampoline": "from Phase 4.2k",
  "dogs": "from Phase 4.2l",
  "dogBreed": "from Phase 4.2l if applicable",
  "alarmSystem": "from Phase 4.2m",
  "acres": "from Phase 4.2n"
}
```

---

### Step 6.7: Add Tracking Notes

**MCP Tool**: `nowcerts_note_insert`

**Purpose**: Document the quote process and data sources

**Input**:
```json
{
  "insuredDatabaseId": "from step 6.1",
  "note": "Quote initiated via AI agent. Data sources: [list sources used - Fenris, Smarty, documents, web research]. Coverage requested: [list coverage types]. Special notes: [any special circumstances or requirements]. Telematics: [opted in/out]. Cross-sell opportunities identified: [list any additional coverage discussed].",
  "noteType": "Quote",
  "agentDatabaseId": "Chase Henderson's ID"
}
```

---

## Phase 7: Schedule Follow-Up

**Objective**: Book time for quoting and callback

### Step 7.1: Create Quoting Task

**MCP Tool**: `nowcerts_task_insert`

**Input**:
```json
{
  "insuredDatabaseId": "from step 6.1",
  "assignedToAgentDatabaseId": "Chase Henderson: 7fa050a2-c4c0-4e1c-8860-2008a6f0aec2",
  "taskType": "Quote",
  "subject": "Generate quotes for [customer name]",
  "description": "Lines of business: [list]. Data collection complete via AI agent. Review gathered information and generate quotes from multiple carriers. Compare rates and coverage options.",
  "dueDate": "[date/time from scheduling conversation]",
  "priority": "High",
  "status": "Not Started",
  "estimatedDuration": "60 minutes (or 120 minutes for large commercial)",
  "relatedQuoteId": "from step 6.2"
}
```

---

### Step 7.2: Schedule Callback Appointment

**Ask Customer**:
```
"I'd like to schedule a callback appointment to review the quotes with you.
When would be a good time for you?"

[Use scheduling logic to find available time with Chase Henderson]
[Typically schedule 24-48 hours after quote task to allow time for quoting]
```

**MCP Tool**: `nowcerts_task_insert` (for callback reminder)

**Input**:
```json
{
  "insuredDatabaseId": "from step 6.1",
  "assignedToAgentDatabaseId": "Chase Henderson ID",
  "taskType": "Call",
  "subject": "Quote review callback - [customer name]",
  "description": "Review quotes prepared for [customer]. Discuss coverage options, premiums, and answer questions. Close sale if customer is ready.",
  "dueDate": "[scheduled callback date/time]",
  "priority": "High",
  "status": "Not Started"
}
```

---

### Step 7.3: Send Confirmation

**Confirm to Customer**:
```
"Perfect! Here's what we've set up:

✓ Gathered all your information (household, vehicles, property)
✓ Created your quote in our system
✓ Scheduled quoting time: [date/time]
✓ Callback appointment: [date/time]

You'll receive a reminder before our callback.
In the meantime, if you think of anything else or have questions, feel free to reach out!

Is there anything else you'd like to add or any questions right now?"
```

---

## Summary of MCP Tools Used in This Workflow

### External APIs:
1. **`fenris_prefillHousehold`** - Get household/vehicle data (auto policies only)
2. **`smarty_verifyAddress`** - Validate and standardize all addresses
3. **`nhtsa_decodeVin`** - Decode VINs to get vehicle details (optional)

### NowCerts Tools:
4. **`nowcerts_prospect_insert`** - Create new prospect record
5. **`nowcerts_quote_insert`** - Create quote record
6. **`nowcerts_driver_insert`** - Add each driver (repeat for all)
7. **`nowcerts_vehicle_insert`** - Add each vehicle (repeat for all)
8. **`nowcerts_property_insert`** - Add property information
9. **`nowcerts_note_insert`** - Add tracking notes
10. **`nowcerts_task_insert`** - Create quoting and callback tasks
11. **`nowcerts_policy_insertAdditionalInsured`** - Add lienholders (AFTER policy is bound)

---

## Important Reminders

### ✅ DO:
- Run Fenris ONLY for auto policies (personal or commercial)
- Run Smarty for ALL property policies AND if Fenris shows homeowner status
- Collect driver's license numbers for ALL rated drivers (Fenris never returns these)
- Ask questions progressively (one at a time or small groups)
- Use documents to reduce questions
- Conduct background web research (but don't disclose to client)
- Identify cross-sell opportunities
- Mark excluded drivers with reasons
- Note lienholders for later addition
- Recommend appropriate coverage levels
- Explain telematics programs honestly
- Bundle for maximum savings

### ❌ DON'T:
- Run Fenris for property-only quotes
- Skip driver's license collection (critical for quoting)
- Ask the same question twice
- Disclose web research activities to client
- Skip excluded driver documentation
- Recommend state minimums (educate on proper coverage)
- Sign up customers for telematics if they have risky driving habits
- Forget to document data sources in notes

---

## Coverage Recommendations Quick Reference

### Auto Liability:
- **Minimum**: 25/50/25 (state minimum - NOT recommended)
- **Good**: 50/100/50
- **Better**: 100/300/100 ⭐ RECOMMENDED
- **Best**: 250/500/250 or higher

### Auto Deductibles:
- **Comprehensive**: $500-$1,000 ⭐ RECOMMENDED
- **Collision**: $500-$1,000 ⭐ RECOMMENDED
- Higher deductibles prevent small claims that raise rates

### Homeowners Liability:
- **Minimum**: $100,000
- **Good**: $300,000 ⭐ RECOMMENDED
- **Better**: $500,000+ (especially if high net worth)

### Homeowners Deductibles:
- **Standard**: $1,000 ⭐ RECOMMENDED
- **Higher**: $2,500 or $5,000 (for lower premiums)
- **Percentage**: 1%, 2%, or 5% of dwelling (wind/hail in some states)

---

## End of Workflow

After completing all phases, the customer data is fully captured in NowCerts, ready for Chase Henderson to generate quotes from multiple carriers and present options during the callback appointment.
