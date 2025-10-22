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
Customer calls requesting a quote for auto insurance. They provide their name, address, phone, email, and want quotes for 2 vehicles.

### Steps

#### 1. Search for Existing Customer
```
Tool: nowcerts_insured_getList
Parameters:
  $filter: "contains(phone, '615-555-1234') or contains(eMail, 'john.smith@email.com')"
  $top: 10
  $skip: 0
  $orderby: "changeDate desc"
  $count: true
```

**Decision Point**:
- If found → Use existing `id`
- If not found → Proceed to step 2

#### 2. Prefill Customer Data (Optional but Recommended)
```
Tool: fenris_prefillHousehold
Parameters:
  firstName: "John"
  lastName: "Smith"
  address: "123 Main St"
  city: "Nashville"
  state: "TN"
  zip: "37201"
```

**What you get**:
- Household composition (spouse, children)
- Vehicles already owned (VIN, year, make, model)
- Property information

#### 3. Verify Address
```
Tool: smarty_verifyAddress
Parameters:
  street: "123 Main St"
  city: "Nashville"
  state: "TN"
  zipcode: "37201"
```

**Use the standardized address** from Smarty response

#### 4. Create Insured Record (if not exists)
```
Tool: nowcerts_insured_insert
Parameters:
  insured: {
    "firstName": "John",
    "middleName": "",
    "lastName": "Smith",
    "dateOfBirth": "1985-05-15T00:00:00Z",
    "type": "Prospect",
    "insuredType": "Personal",
    "addressLine1": "123 Main St",  // From Smarty
    "city": "Nashville",
    "state": "TN",
    "zipCode": "37201",
    "eMail": "john.smith@email.com",
    "phone": "615-555-1234",
    "cellPhone": "615-555-1234",
    "active": true
  }
```

**Save the returned `id`** for next steps

#### 5. Decode VINs for Each Vehicle
```
Tool: nhtsa_decodeVin (for each vehicle)
Parameters:
  vin: "1HGCM82633A123456"
```

**What you get**:
- Year, Make, Model
- Body Type
- Engine info
- Safety ratings
- MSRP

#### 6. Check for Recalls
```
Tool: nhtsa_checkRecalls (for each vehicle)
Parameters:
  vin: "1HGCM82633A123456"
```

**Important**: Inform customer of any open recalls

#### 7. Create Quote/Policy
```
Tool: nowcerts_policy_insert
Parameters:
  policy: {
    "insuredDatabaseId": "{id from step 4}",
    "number": "Q-2025-001234",  // Quote number
    "isQuote": true,
    "effectiveDate": "2025-01-01T00:00:00Z",
    "expirationDate": "2025-07-01T00:00:00Z",  // 6 months
    "businessType": "New_Business",
    "businessSubType": "New",
    "carrierName": "State Farm",
    "billingType": "Direct_Bill_100",
    "totalPremium": 1200.00,
    "active": true,
    "status": "Quote"
  }
```

**Save the returned policy `id`**

#### 8. Add Vehicles
```
Tool: nowcerts_vehicle_insert (for each vehicle)
Parameters:
  vehicle: {
    "policyDatabaseId": "{policy id from step 7}",
    "type": "Car",  // From NHTSA decode
    "year": "2023",
    "make": "Honda",
    "model": "Accord",
    "vin": "1HGCM82633A123456",
    "typeOfUse": "Pleasure",
    "value": "28000",
    "deductibleComprehensive": 500,
    "deductibleCollision": 500
  }
```

#### 9. Add Drivers
```
Tool: nowcerts_driver_insert (for each driver)
Parameters:
  driver: {
    "policyDatabaseId": "{policy id from step 7}",
    "firstName": "John",
    "lastName": "Smith",
    "dateOfBirth": "1985-05-15T00:00:00Z",
    "licenseNumber": "12345678",
    "licenseState": "TN",
    "licenseYear": 2020,
    "maritalStatus": "Married",
    "gender": "Male",
    "excluded": false
  }
```

#### 10. Add Spouse as Contact (if applicable)
```
Tool: nowcerts_principal_insert
Parameters:
  principal: {
    "insuredDatabaseId": "{id from step 4}",
    "firstName": "Jane",
    "lastName": "Smith",
    "type": "Spouse",
    "personalEmail": "jane.smith@email.com",
    "cellPhone": "615-555-5678",
    "dateOfBirth": "1987-03-20T00:00:00Z"
  }
```

#### 11. Add Initial Note
```
Tool: nowcerts_note_insert
Parameters:
  note: {
    "insuredDatabaseId": "{id from step 4}",
    "noteText": "New quote created. Customer requested coverage for 2 vehicles. Informed of open recall on 2023 Honda Accord VIN:1HGCM82633A123456.",
    "category": "Quote",
    "createDate": "2025-01-15T10:30:00Z"
  }
```

#### 12. Create Follow-up Task
```
Tool: nowcerts_task_insert
Parameters:
  task: {
    "insuredDatabaseId": "{id from step 4}",
    "title": "Follow up on auto quote Q-2025-001234",
    "description": "Call customer to discuss quote and answer questions",
    "dueDate": "2025-01-17T00:00:00Z",
    "priority": "Normal",
    "status": "Not_Started",
    "assignedToUserId": "{agent id}"
  }
```

### Result
✅ Complete quote created with:
- Insured record
- Quote/Policy
- 2 Vehicles (with VIN validation)
- Primary driver + spouse
- Initial notes
- Follow-up task

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
