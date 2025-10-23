#!/usr/bin/env node

/**
 * Direct test of Fenris OAuth and API call
 * Tests the actual implementation to verify it works
 */

import axios from 'axios';

const FENRIS_CLIENT_ID = process.env.FENRIS_CLIENT_ID || 'o787cue0simna6s1gngo80k66';
const FENRIS_CLIENT_SECRET = process.env.FENRIS_CLIENT_SECRET || '1phsgp5ouin6medi0e3gklq8ekm1gpnm8f97u39cbvlifa7artvh';

const TEST_DATA = {
  responseType: "C",
  person: {
    firstName: "Kyle",
    lastName: "Murdock",
    dateOfBirth: "05/20/1970"
  },
  address: {
    addressLine1: "18595 Old Aldrin Highway",
    addressLine2: "",
    city: "HIGHLANDS RANCH",
    state: "CO",
    zipCode: "80126"
  }
};

async function testFenris() {
  console.log('='.repeat(60));
  console.log('FENRIS API DIRECT TEST');
  console.log('='.repeat(60));
  console.log();

  console.log('Step 1: Getting OAuth Token...');
  console.log(`  Client ID: ${FENRIS_CLIENT_ID}`);
  console.log(`  Client Secret: ${FENRIS_CLIENT_SECRET.substring(0, 10)}...`);
  console.log();

  try {
    // Step 1: Get OAuth token using Basic Auth
    const basicAuth = Buffer.from(`${FENRIS_CLIENT_ID}:${FENRIS_CLIENT_SECRET}`).toString('base64');

    const tokenResponse = await axios.post(
      "https://auth.fenrisd.com/realms/fenris/protocol/openid-connect/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${basicAuth}`,
        },
      }
    );

    console.log('✅ OAuth Token Retrieved Successfully!');
    console.log(`  Access Token: ${tokenResponse.data.access_token.substring(0, 50)}...`);
    console.log(`  Expires In: ${tokenResponse.data.expires_in} seconds`);
    console.log();

    const accessToken = tokenResponse.data.access_token;

    // Step 2: Call Fenris API
    console.log('Step 2: Calling Fenris API...');
    console.log(`  Endpoint: https://api.fenrisd.com/services/personal/v1/autoprefill/search`);
    console.log(`  Test Person: ${TEST_DATA.person.firstName} ${TEST_DATA.person.lastName}`);
    console.log();

    const apiResponse = await axios.post(
      "https://api.fenrisd.com/services/personal/v1/autoprefill/search",
      TEST_DATA,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "products": "Personal",
          "Request-Id": `test-${Date.now()}`,
        },
      }
    );

    console.log('✅ Fenris API Call Successful!');
    console.log();
    console.log('Response Data:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(apiResponse.data, null, 2));
    console.log('='.repeat(60));
    console.log();

    // Parse what we got
    const data = apiResponse.data;
    const vehicles = data.vehicles || data.Vehicles || [];
    const drivers = data.drivers || data.Drivers || [];
    const property = data.property || data.Property || {};

    console.log('Parsed Data Summary:');
    console.log(`  Vehicles: ${vehicles.length}`);
    console.log(`  Drivers: ${drivers.length}`);
    console.log(`  Property: ${Object.keys(property).length > 0 ? 'Yes' : 'No'}`);
    console.log();

    if (vehicles.length > 0) {
      console.log('Vehicles Found:');
      vehicles.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.year || v.Year} ${v.make || v.Make} ${v.model || v.Model} (VIN: ${v.vin || v.VIN || 'N/A'})`);
      });
      console.log();
    }

    if (drivers.length > 0) {
      console.log('Drivers Found:');
      drivers.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.firstName || d.FirstName} ${d.lastName || d.LastName} (DOB: ${d.dateOfBirth || d.DateOfBirth || 'N/A'})`);
      });
      console.log();
    }

    console.log('='.repeat(60));
    console.log('✅ TEST PASSED - Fenris integration is working correctly!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ TEST FAILED');
    console.log('='.repeat(60));
    console.error();
    console.error('Error Details:');
    console.error(`  Message: ${error.message}`);

    if (error.response) {
      console.error(`  Status: ${error.response.status} ${error.response.statusText}`);
      console.error(`  Response Data:`, JSON.stringify(error.response.data, null, 2));
      console.error();

      if (error.response.status === 403) {
        console.error('DIAGNOSIS: 403 Forbidden Error');
        console.error('  This typically means:');
        console.error('  1. The credentials are invalid or expired');
        console.error('  2. The scope requested is not allowed');
        console.error('  3. The client_id/client_secret combination is wrong');
        console.error();
        console.error('RECOMMENDATION:');
        console.error('  Please verify your Fenris credentials are current and have access to the "bitfrost/post" scope.');
      } else if (error.response.status === 401) {
        console.error('DIAGNOSIS: 401 Unauthorized Error');
        console.error('  The OAuth token may have been rejected by the API endpoint.');
        console.error('  This could mean the token scope doesn\'t match what the API requires.');
      }
    } else {
      console.error(`  Full Error:`, error);
    }

    console.log('='.repeat(60));
    process.exit(1);
  }
}

testFenris();
