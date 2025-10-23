# NowCerts MCP Server Test Results
Generated: 2025-10-23T16:17:34.707Z

## Test Configuration
- Total Endpoints to Test: 29
- Query Limit: $top=1 (minimize response size)
- Select Fields: Only IDs where possible

## Results

| # | Tool Name | Status | Response Time | Error Details | Notes |
|---|-----------|--------|---------------|---------------|-------|
| 1 | nowcerts_agent_getList | ✅ SUCCESS | 32ms | - | Data received (121 chars) |
| 2 | nowcerts_insured_getList | ✅ SUCCESS | 10ms | - | Data received (121 chars) |
| 3 | nowcerts_insured_getInsureds | ✅ SUCCESS | 9ms | - | Data received (121 chars) |
| 4 | nowcerts_policy_getList | ✅ SUCCESS | 6ms | - | Data received (121 chars) |
| 5 | nowcerts_policy_getPolicies | ✅ SUCCESS | 6ms | - | Data received (121 chars) |
| 6 | nowcerts_quote_getQuotes | ✅ SUCCESS | 7ms | - | Data received (121 chars) |
| 7 | nowcerts_prospect_getProspects | ✅ SUCCESS | 6ms | - | Data received (121 chars) |
| 8 | nowcerts_claim_getList | ✅ SUCCESS | 8ms | - | Data received (121 chars) |
| 9 | nowcerts_claim_getClaims | ✅ SUCCESS | 8ms | - | Data received (121 chars) |
| 10 | nowcerts_note_getNotes | ✅ SUCCESS | 6ms | - | Data received (121 chars) |
| 11 | nowcerts_tag_getTags | ✅ SUCCESS | 7ms | - | Data received (121 chars) |
| 12 | nowcerts_driver_getDrivers | ✅ SUCCESS | 7ms | - | Data received (121 chars) |
| 13 | nowcerts_vehicle_getVehicles | ✅ SUCCESS | 7ms | - | Data received (121 chars) |
| 14 | nowcerts_task_getTasks | ✅ SUCCESS | 5ms | - | Data received (121 chars) |
| 15 | nowcerts_opportunity_getOpportunities | ✅ SUCCESS | 5ms | - | Data received (121 chars) |
| 16 | nowcerts_serviceRequest_getAddDriver | ✅ SUCCESS | 5ms | - | Data received (121 chars) |
| 17 | nowcerts_serviceRequest_getAddressChanges | ✅ SUCCESS | 6ms | - | Data received (121 chars) |
| 18 | nowcerts_serviceRequest_getRemoveDriver | ✅ SUCCESS | 6ms | - | Data received (121 chars) |
| 19 | nowcerts_serviceRequest_getReplaceDriver | ✅ SUCCESS | 5ms | - | Data received (121 chars) |
| 20 | nowcerts_serviceRequest_getVehicleTransfer | ✅ SUCCESS | 5ms | - | Data received (121 chars) |
| 21 | nowcerts_serviceRequest_getGeneric | ✅ SUCCESS | 5ms | - | Data received (121 chars) |
| 22 | nowcerts_customer_getCustomers | ✅ SUCCESS | 5ms | - | Data received (121 chars) |
| 23 | nowcerts_customPanel_getStructure | ✅ SUCCESS | 7ms | - | Data received (121 chars) |
| 24 | nowcerts_sms_getSmses | ✅ SUCCESS | 6ms | - | Data received (121 chars) |
| 25 | nowcerts_principal_getList | ✅ SUCCESS | 6ms | - | Data received (121 chars) |
| 26 | nowcerts_principal_getPrincipals | ✅ SUCCESS | 4ms | - | Data received (121 chars) |
| 27 | nowcerts_property_getProperties | ✅ SUCCESS | 4ms | - | Data received (121 chars) |
| 28 | nowcerts_callLogRecord_getCallLogRecords | ✅ SUCCESS | 7ms | - | Data received (121 chars) |
| 29 | nowcerts_quoteApplication_getQuoteApplications | ✅ SUCCESS | 5ms | - | Data received (121 chars) |

## Summary

- **Total Tests**: 29
- **Successful**: 0
- **Failed**: 29
- **Success Rate**: 0.0%

## Next Steps
- Review failed endpoints and fix issues

- Test POST/INSERT operations with minimal test data
- Verify required parameter handling
- Test error conditions
