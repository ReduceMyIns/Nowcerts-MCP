#!/usr/bin/env node

/**
 * Update Harold Cahuantzi Tonix driver via MCP server
 * This script:
 * 1. Finds the driver
 * 2. Adds all 24 MVR incidents as notes
 * 3. Creates Commercial Auto, General Liability, and Workers Comp quotes
 * 4. Creates opportunities for each quote
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

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

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    env: {
      ...process.env,
      NOWCERTS_USERNAME: process.env.NOWCERTS_USERNAME,
      NOWCERTS_PASSWORD: process.env.NOWCERTS_PASSWORD,
    },
  });

  const client = new Client(
    {
      name: 'update-driver-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    console.log('Connected to MCP server\n');

    console.log('='.repeat(80));
    console.log('UPDATE DRIVER HAROLD CAHUANTZI TONIX - COMPLETE WORKFLOW');
    console.log('='.repeat(80));
    console.log();

    // Step 1: Find driver
    console.log('Step 1: Finding driver Harold Cahuantzi Tonix...');

    // Try with firstName filter first
    const driversResult = await client.callTool('nowcerts_driver_getDrivers', {
      filters: { firstName: 'Harold' }
    });

    if (!driversResult.content || driversResult.content.length === 0) {
      throw new Error('No drivers returned from API');
    }

    const driversData = JSON.parse(driversResult.content[0].text);
    const drivers = Array.isArray(driversData) ? driversData : (driversData.value || []);

    console.log('  Found ' + drivers.length + ' drivers named Harold');

    const driver = drivers.find(d => {
      const lastName = (d.lastName || '').toLowerCase();
      return lastName.includes('cahuantzi') || lastName.includes('tonix');
    });

    if (!driver) {
      console.log('  Drivers found:');
      drivers.forEach(d => console.log('    - ' + d.firstName + ' ' + d.lastName));
      throw new Error('Driver Harold Cahuantzi Tonix not found. Please verify the exact last name.');
    }

    console.log('  Found driver:');
    console.log('    Name: ' + driver.firstName + ' ' + driver.lastName);
    console.log('    ID: ' + driver.id);
    console.log('    Insured ID: ' + driver.insuredDatabaseId);
    console.log();

    // Step 2: Add all violations as notes
    console.log('Step 2: Adding ' + violations.length + ' MVR incidents as notes...');
    let successCount = 0;

    for (let i = 0; i < violations.length; i++) {
      const violation = violations[i];
      const noteText = `MVR ${violation.type} #${i + 1}

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

      try {
        await client.callTool('nowcerts_note_insert', { note: noteData });
        console.log('  [' + (i + 1) + '/' + violations.length + '] Added: ' + violation.description + ' (' + violation.date + ')');
        successCount++;
      } catch (error) {
        console.error('  [' + (i + 1) + '/' + violations.length + '] Failed: ' + error.message);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('  Successfully added ' + successCount + '/' + violations.length + ' violation notes\n');

    // Step 3: Create quotes
    console.log('Step 3: Creating quotes...');
    const linesOfBusiness = ['Commercial Auto', 'General Liability', 'Workers Comp'];
    const createdQuotes = [];

    for (const lob of linesOfBusiness) {
      const quoteData = {
        insuredDatabaseId: driver.insuredDatabaseId,
        effectiveDate: new Date().toISOString(),
        lineOfBusiness: lob,
        status: 'Open',
        description: 'Quote for ' + driver.firstName + ' ' + driver.lastName,
      };

      try {
        const quoteResult = await client.callTool('nowcerts_quote_insert', { quote: quoteData });
        const quoteResponse = JSON.parse(quoteResult.content[0].text);
        createdQuotes.push({ lob, data: quoteResponse });
        console.log('  Created ' + lob + ' quote');
      } catch (error) {
        console.error('  Failed to create ' + lob + ' quote: ' + error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log();

    // Step 4: Create opportunities
    console.log('Step 4: Creating opportunities...');

    for (const quote of createdQuotes) {
      const opportunityData = {
        insuredDatabaseId: driver.insuredDatabaseId,
        name: quote.lob + ' Opportunity - ' + driver.firstName + ' ' + driver.lastName,
        stage: 'Qualification',
        lineOfBusiness: quote.lob,
        description: 'Opportunity for ' + quote.lob + ' coverage',
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      try {
        await client.callTool('nowcerts_opportunity_insert', { opportunity: opportunityData });
        console.log('  Created ' + quote.lob + ' opportunity');
      } catch (error) {
        console.error('  Failed to create ' + quote.lob + ' opportunity: ' + error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log();

    console.log('='.repeat(80));
    console.log('WORKFLOW COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log();
    console.log('Summary:');
    console.log('  Driver: ' + driver.firstName + ' ' + driver.lastName);
    console.log('  MVR Incidents Added: ' + successCount + '/' + violations.length);
    console.log('  Quotes Created: ' + createdQuotes.length);
    console.log('  Opportunities Created: ' + createdQuotes.length);
    console.log();

  } catch (error) {
    console.error('\nError: ' + error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
