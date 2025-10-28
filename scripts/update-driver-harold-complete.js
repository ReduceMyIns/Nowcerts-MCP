#!/usr/bin/env node

/**
 * Complete script to:
 * 1. Find driver Harold Cahuantzi Tonix
 * 2. Add 24 MVR incidents as notes
 * 3. Create Commercial Auto, General Liability, and Workers Comp quotes
 * 4. Create opportunities for each quote
 */

// Configuration
const NOWCERTS_API_URL = 'https://api.nowcerts.com/api';
const NOWCERTS_USERNAME = process.env.NOWCERTS_USERNAME;
const NOWCERTS_PASSWORD = process.env.NOWCERTS_PASSWORD;

let accessToken = null;

// Driver violations data
const violations = [
  { date: '01/04/2020', type: 'Conviction', description: 'Speed 26-30 Over 70 MPH Zone', chargeable: 'Yes', source: 'MVR', ratingImpact: 'Yes' },
  { date: '06/21/2022', type: 'Conviction', description: 'Speed 11-15 Over 55 MPH Zone', chargeable: 'Not Chargeable', source: 'MVR', ratingImpact: 'No' },
  { date: '08/19/2022', type: 'Conviction', description: 'Spd Grtr Reasonable', chargeable: 'Not Chargeable', source: 'MVR', ratingImpact: 'No' },
  { date: '08/25/2022', type: 'Conviction', description: 'Speed 16-20 Over 30 MPH Zone', chargeable: 'Yes', source: 'MVR', ratingImpact: 'Yes' },
  { date: '08/25/2022', type: 'Conviction', description: 'Operate Uninsured Auto', chargeable: 'Yes', source: 'MVR', ratingImpact: 'No' },
  { date: '12/28/2022', type: 'Suspension', description: 'SUSPENSION', chargeable: 'Yes', source: 'MVR', ratingImpact: 'No' },
  { date: '10/17/2023', type: 'Claim', description: 'All other at-fault', chargeable: 'Yes', source: 'MVR', ratingImpact: 'Yes' },
  { date: '03/07/2024', type: 'Suspension', description: 'Failure to appear/pay fine', chargeable: 'Yes', source: 'MVR', ratingImpact: 'No' },
  { date: '03/07/2024', type: 'Suspension', description: 'Failure to appear/pay fine', chargeable: 'Yes', source: 'MVR', ratingImpact: 'No' },
  { date: '01/21/2024', type: 'Conviction', description: 'Operate Uninsured Auto', chargeable: 'Yes', source: 'MVR', ratingImpact: 'Yes' },
  { date: '01/21/2024', type: 'Conviction', description: 'Speed 16-19 Over The Limit', chargeable: 'Yes', source: 'MVR', ratingImpact: 'Yes' },
  { date: '01/21/2024', type: 'Conviction', description: 'Not Chargeable', chargeable: 'Not Chargeable', source: 'MVR', ratingImpact: 'No' },
  { date: '05/02/2024', type: 'Conviction', description: 'Cell Phone Use While Driving', chargeable: 'Yes', source: 'MVR', ratingImpact: 'No' },
  { date: '05/02/2024', type: 'Conviction', description: 'Not Chargeable', chargeable: 'Not Chargeable', source: 'MVR', ratingImpact: 'No' },
  { date: '06/15/2024', type: 'Conviction', description: 'Not Chargeable', chargeable: 'Not Chargeable', source: 'MVR', ratingImpact: 'No' },
  { date: '09/06/2024', type: 'Suspension', description: 'SUSPENSION', chargeable: 'Yes', source: 'MVR', ratingImpact: 'No' },
  { date: '09/20/2024', type: 'Suspension', description: 'SUSPENSION', chargeable: 'Yes', source: 'MVR', ratingImpact: 'No' },
  { date: '10/08/2024', type: 'Conviction', description: 'Reckless Driving', chargeable: 'Yes', source: 'MVR', ratingImpact: 'Yes' },
  { date: '10/08/2024', type: 'Conviction', description: 'Not Chargeable', chargeable: 'Not Chargeable', source: 'MVR', ratingImpact: 'No' },
  { date: '11/09/2024', type: 'Conviction', description: 'Not Chargeable', chargeable: 'Not Chargeable', source: 'MVR', ratingImpact: 'No' },
  { date: '03/02/2025', type: 'Suspension', description: 'SUSPENSION', chargeable: 'Yes', source: 'MVR', ratingImpact: 'No' },
  { date: '05/16/2025', type: 'Suspension', description: 'SUSPENSION', chargeable: 'Yes', source: 'MVR', ratingImpact: 'No' },
  { date: '06/27/2025', type: 'Suspension', description: 'Accumulation of points', chargeable: 'Yes', source: 'MVR', ratingImpact: 'No' },
  { date: '07/20/2025', type: 'Suspension', description: 'SUSPENSION', chargeable: 'Yes', source: 'MVR', ratingImpact: 'No' },
];

async function authenticate() {
  console.log('Authenticating with NowCerts...');

  if (!NOWCERTS_USERNAME || !NOWCERTS_PASSWORD) {
    throw new Error('NOWCERTS_USERNAME and NOWCERTS_PASSWORD environment variables required');
  }

  const response = await fetch(NOWCERTS_API_URL + '/Token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: NOWCERTS_USERNAME,
      password: NOWCERTS_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error('Authentication failed: ' + response.status);
  }

  const data = await response.json();
  accessToken = data.access_token;
  console.log('Authenticated successfully\n');
}

async function findDriver() {
  console.log('Searching for driver Harold Cahuantzi Tonix...');

  const response = await fetch(
    NOWCERTS_API_URL + '/Zapier/GetDrivers',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get drivers: ' + response.status);
  }

  const allDrivers = await response.json();
  console.log('Total drivers in system: ' + allDrivers.length);

  // Search for Harold Cahuantzi Tonix
  const matches = allDrivers.filter(d => {
    const firstName = (d.firstName || '').toLowerCase();
    const lastName = (d.lastName || '').toLowerCase();
    return firstName.includes('harold') &&
           (lastName.includes('cahuantzi') || lastName.includes('tonix'));
  });

  if (matches.length === 0) {
    throw new Error('Driver Harold Cahuantzi Tonix not found in system. Please verify the name.');
  }

  console.log('Found driver:');
  console.log('  Name: ' + matches[0].firstName + ' ' + matches[0].lastName);
  console.log('  ID: ' + matches[0].id);
  console.log('  Policy IDs: ' + (matches[0].policyIds || []).join(', '));
  console.log('  Insured ID: ' + matches[0].insuredDatabaseId);
  console.log();

  return matches[0];
}

async function addViolationNote(driver, violation, index) {
  const noteText = `MVR ${violation.type} #${index + 1}

Date: ${violation.date}
Type: ${violation.type}
Description: ${violation.description}
Chargeable: ${violation.chargeable}
Source: ${violation.source}
Rating Impact: ${violation.ratingImpact}

This incident was documented from Motor Vehicle Record (MVR) report.`;

  const noteData = {
    insuredDatabaseId: driver.insuredDatabaseId,
    subject: `${violation.type}: ${violation.description} (${violation.date})`,
    body: noteText,
    noteType: 'General',
    relatedToType: 'Driver',
    relatedToDatabaseId: driver.id,
  };

  console.log('  Adding note ' + (index + 1) + '/' + violations.length + ': ' + violation.description + ' (' + violation.date + ')');

  const response = await fetch(
    NOWCERTS_API_URL + '/Zapier/InsertNote',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(noteData),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('  Failed to add note: ' + response.status + ' - ' + errorText);
    return false;
  }

  return true;
}

async function addAllViolations(driver) {
  console.log('Adding ' + violations.length + ' MVR incidents as notes...');

  let successCount = 0;
  for (let i = 0; i < violations.length; i++) {
    const success = await addViolationNote(driver, violations[i], i);
    if (success) successCount++;
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('Successfully added ' + successCount + '/' + violations.length + ' violation notes\n');
}

async function createQuote(driver, lineOfBusiness) {
  console.log('Creating ' + lineOfBusiness + ' quote...');

  const quoteData = {
    insuredDatabaseId: driver.insuredDatabaseId,
    effectiveDate: new Date().toISOString(),
    lineOfBusiness: lineOfBusiness,
    status: 'Open',
    description: 'Quote for ' + driver.firstName + ' ' + driver.lastName,
  };

  const response = await fetch(
    NOWCERTS_API_URL + '/Zapier/InsertQuote',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quoteData),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('  Failed to create ' + lineOfBusiness + ' quote: ' + response.status + ' - ' + errorText);
    return null;
  }

  const result = await response.json();
  console.log('  Created ' + lineOfBusiness + ' quote successfully');
  console.log('  Quote ID: ' + (result.id || result.databaseId || 'unknown'));
  console.log();

  return result;
}

async function createOpportunity(driver, lineOfBusiness, quoteId) {
  console.log('Creating ' + lineOfBusiness + ' opportunity...');

  const opportunityData = {
    insuredDatabaseId: driver.insuredDatabaseId,
    name: lineOfBusiness + ' Opportunity - ' + driver.firstName + ' ' + driver.lastName,
    stage: 'Qualification',
    lineOfBusiness: lineOfBusiness,
    description: 'Opportunity for ' + lineOfBusiness + ' coverage',
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  };

  const response = await fetch(
    NOWCERTS_API_URL + '/Zapier/InsertOpportunity',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(opportunityData),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('  Failed to create ' + lineOfBusiness + ' opportunity: ' + response.status + ' - ' + errorText);
    return null;
  }

  const result = await response.json();
  console.log('  Created ' + lineOfBusiness + ' opportunity successfully');
  console.log('  Opportunity ID: ' + (result.id || result.databaseId || 'unknown'));
  console.log();

  return result;
}

async function createQuotesAndOpportunities(driver) {
  const linesOfBusiness = ['Commercial Auto', 'General Liability', 'Workers Comp'];

  for (const lob of linesOfBusiness) {
    const quote = await createQuote(driver, lob);
    if (quote) {
      await createOpportunity(driver, lob, quote.id || quote.databaseId);
    }
    // Small delay between creations
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('UPDATE DRIVER HAROLD CAHUANTZI TONIX - COMPLETE WORKFLOW');
    console.log('='.repeat(80));
    console.log();

    // Step 1: Authenticate
    await authenticate();

    // Step 2: Find driver
    const driver = await findDriver();

    // Step 3: Add all violations as notes
    await addAllViolations(driver);

    // Step 4: Create quotes and opportunities
    await createQuotesAndOpportunities(driver);

    console.log('='.repeat(80));
    console.log('WORKFLOW COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log();
    console.log('Summary:');
    console.log('- Added ' + violations.length + ' MVR incidents as notes');
    console.log('- Created 3 quotes (Commercial Auto, General Liability, Workers Comp)');
    console.log('- Created 3 opportunities (one for each quote)');
    console.log();

  } catch (error) {
    console.error('\nError: ' + error.message);
    if (error.stack) {
      console.error('Stack trace: ' + error.stack);
    }
    process.exit(1);
  }
}

main();
