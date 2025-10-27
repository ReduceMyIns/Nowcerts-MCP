#!/usr/bin/env node
/**
 * Tag Carriers with Service Levels
 *
 * This script helps tag insurance carriers in NowCerts with their service level:
 * - "Full Service" - Carrier handles most requests (transfer OK)
 * - "Billing & Claim Service" - Carrier only handles billing and claims (limited transfer)
 * - "Agency Service" - Agency handles everything (never transfer)
 *
 * Usage:
 *   NOWCERTS_USERNAME=user NOWCERTS_PASSWORD=pass node scripts/tag-carriers.js
 *
 * Options:
 *   --list                 List all carriers and their current tags
 *   --tag CARRIER_ID LEVEL Tag a specific carrier
 *   --interactive          Interactive mode (prompt for each carrier)
 *   --bulk CSV_FILE        Bulk tag from CSV file
 */

import { readFileSync } from 'fs';
import readline from 'readline';

// Configuration
const NOWCERTS_API_URL = 'https://api.nowcerts.com/api';
const NOWCERTS_USERNAME = process.env.NOWCERTS_USERNAME;
const NOWCERTS_PASSWORD = process.env.NOWCERTS_PASSWORD;

// Service levels
const SERVICE_LEVELS = {
  FULL: 'Full Service',
  BILLING: 'Billing & Claim Service',
  AGENCY: 'Agency Service'
};

let accessToken = null;

/**
 * Authenticate with NowCerts
 */
async function authenticate() {
  console.log('🔐 Authenticating with NowCerts...');

  if (!NOWCERTS_USERNAME || !NOWCERTS_PASSWORD) {
    throw new Error('NOWCERTS_USERNAME and NOWCERTS_PASSWORD environment variables required');
  }

  const response = await fetch(`${NOWCERTS_API_URL}/Token`, {
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
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  console.log('✓ Authenticated successfully\n');
}

/**
 * Get all carriers
 */
async function getCarriers() {
  console.log('📋 Fetching carriers...');

  const response = await fetch(
    `${NOWCERTS_API_URL}/CarrierDetailList?$count=true&$orderby=changeDate asc&$top=1000`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get carriers: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✓ Found ${data.value.length} carriers\n`);
  return data.value;
}

/**
 * Get tags for a specific carrier
 */
async function getCarrierTags(carrierName) {
  const filter = `contains(insuredCommercialName, '${carrierName}')`;
  const response = await fetch(
    `${NOWCERTS_API_URL}/TagsList?$filter=${encodeURIComponent(filter)}&$top=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get tags: ${response.status}`);
  }

  const data = await response.json();
  return data.value || [];
}

/**
 * Get ALL service level tags
 */
async function getAllServiceLevelTags() {
  console.log('📋 Fetching all service level tags...');

  const tags = {};

  for (const level of Object.values(SERVICE_LEVELS)) {
    const filter = `tagName eq '${level}'`;
    const response = await fetch(
      `${NOWCERTS_API_URL}/TagsList?$filter=${encodeURIComponent(filter)}&$top=1000`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get ${level} tags: ${response.status}`);
    }

    const data = await response.json();
    for (const tag of data.value || []) {
      const carrierName = tag.insuredCommercialName;
      if (carrierName) {
        if (!tags[carrierName]) {
          tags[carrierName] = [];
        }
        tags[carrierName].push(level);
      }
    }
  }

  return tags;
}

/**
 * Apply tag to carrier
 */
async function tagCarrier(carrierId, carrierName, serviceLevel) {
  console.log(`🏷️  Tagging ${carrierName} as "${serviceLevel}"...`);

  const response = await fetch(`${NOWCERTS_API_URL}/Zapier/InsertTagApply`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tag_name: serviceLevel,
      tag_description: serviceLevel,
      insured_database_id: carrierId,
      insured_email: '',
      insured_first_name: '',
      insured_last_name: '',
      insured_commercial_name: '',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to tag carrier: ${response.status} - ${error}`);
  }

  console.log(`✓ Tagged ${carrierName} as "${serviceLevel}"\n`);
}

/**
 * List all carriers with their tags
 */
async function listCarriers() {
  await authenticate();
  const carriers = await getCarriers();
  const existingTags = await getAllServiceLevelTags();

  console.log('═'.repeat(80));
  console.log('CARRIER LIST WITH SERVICE LEVELS');
  console.log('═'.repeat(80));
  console.log();

  let fullServiceCount = 0;
  let billingCount = 0;
  let agencyCount = 0;
  let untaggedCount = 0;

  for (const carrier of carriers) {
    const name = carrier.commercialName || carrier.contactName || 'Unknown';
    const phone = carrier.customerServicePhone || carrier.phone || 'No phone';
    const tags = existingTags[name] || [];

    console.log(`📊 ${name}`);
    console.log(`   ID: ${carrier.id}`);
    console.log(`   Phone: ${phone}`);

    if (tags.length === 0) {
      console.log(`   ⚠️  NOT TAGGED`);
      untaggedCount++;
    } else {
      tags.forEach((tag) => {
        if (tag === SERVICE_LEVELS.FULL) {
          console.log(`   ✓ Full Service`);
          fullServiceCount++;
        } else if (tag === SERVICE_LEVELS.BILLING) {
          console.log(`   ✓ Billing & Claim Service`);
          billingCount++;
        } else if (tag === SERVICE_LEVELS.AGENCY) {
          console.log(`   ✓ Agency Service`);
          agencyCount++;
        }
      });
    }
    console.log();
  }

  console.log('═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total Carriers: ${carriers.length}`);
  console.log(`  Full Service: ${fullServiceCount}`);
  console.log(`  Billing & Claim Service: ${billingCount}`);
  console.log(`  Agency Service: ${agencyCount}`);
  console.log(`  Not Tagged: ${untaggedCount}`);
  console.log();
}

/**
 * Interactive mode - prompt for each carrier
 */
async function interactiveMode() {
  await authenticate();
  const carriers = await getCarriers();
  const existingTags = await getAllServiceLevelTags();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log('═'.repeat(80));
  console.log('INTERACTIVE CARRIER TAGGING');
  console.log('═'.repeat(80));
  console.log();
  console.log('For each carrier, enter:');
  console.log('  1 = Full Service');
  console.log('  2 = Billing & Claim Service');
  console.log('  3 = Agency Service');
  console.log('  s = Skip');
  console.log('  q = Quit');
  console.log();

  for (const carrier of carriers) {
    const name = carrier.commercialName || carrier.contactName || 'Unknown';
    const tags = existingTags[name] || [];

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Carrier: ${name}`);
    console.log(`Phone: ${carrier.customerServicePhone || carrier.phone || 'No phone'}`);

    if (tags.length > 0) {
      console.log(`Current Tags: ${tags.join(', ')}`);
    } else {
      console.log(`Current Tags: None`);
    }

    const answer = await question('\nSelect service level (1/2/3/s/q): ');

    if (answer.toLowerCase() === 'q') {
      console.log('\nQuitting...');
      break;
    }

    if (answer.toLowerCase() === 's') {
      console.log('Skipped');
      continue;
    }

    let serviceLevel;
    if (answer === '1') {
      serviceLevel = SERVICE_LEVELS.FULL;
    } else if (answer === '2') {
      serviceLevel = SERVICE_LEVELS.BILLING;
    } else if (answer === '3') {
      serviceLevel = SERVICE_LEVELS.AGENCY;
    } else {
      console.log('Invalid option, skipping...');
      continue;
    }

    try {
      await tagCarrier(carrier.id, name, serviceLevel);
    } catch (error) {
      console.error(`❌ Error tagging ${name}:`, error.message);
    }
  }

  rl.close();
  console.log('\n✓ Interactive tagging complete');
}

/**
 * Tag a specific carrier
 */
async function tagSpecificCarrier(carrierId, serviceLevel) {
  await authenticate();
  const carriers = await getCarriers();

  const carrier = carriers.find((c) => c.id === carrierId);
  if (!carrier) {
    throw new Error(`Carrier not found: ${carrierId}`);
  }

  const name = carrier.commercialName || carrier.contactName || 'Unknown';

  // Validate service level
  if (!Object.values(SERVICE_LEVELS).includes(serviceLevel)) {
    throw new Error(
      `Invalid service level. Must be one of: ${Object.values(SERVICE_LEVELS).join(', ')}`
    );
  }

  await tagCarrier(carrierId, name, serviceLevel);
  console.log('✓ Done');
}

/**
 * Bulk tag from CSV file
 */
async function bulkTagFromCSV(csvPath) {
  await authenticate();

  console.log(`📄 Reading CSV file: ${csvPath}`);
  const csv = readFileSync(csvPath, 'utf-8');
  const lines = csv.split('\n').slice(1); // Skip header

  let successCount = 0;
  let errorCount = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    const [carrierId, serviceLevel] = line.split(',').map((s) => s.trim());

    if (!carrierId || !serviceLevel) {
      console.log(`⚠️  Skipping invalid line: ${line}`);
      continue;
    }

    try {
      await tagSpecificCarrier(carrierId, serviceLevel);
      successCount++;
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n✓ Bulk tagging complete: ${successCount} success, ${errorCount} errors`);
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.length === 0 || args.includes('--list')) {
      await listCarriers();
    } else if (args.includes('--interactive')) {
      await interactiveMode();
    } else if (args.includes('--tag')) {
      const carrierIdIndex = args.indexOf('--tag') + 1;
      const levelIndex = carrierIdIndex + 1;

      if (!args[carrierIdIndex] || !args[levelIndex]) {
        throw new Error('Usage: --tag CARRIER_ID SERVICE_LEVEL');
      }

      await authenticate();
      await tagSpecificCarrier(args[carrierIdIndex], args[levelIndex]);
    } else if (args.includes('--bulk')) {
      const csvIndex = args.indexOf('--bulk') + 1;

      if (!args[csvIndex]) {
        throw new Error('Usage: --bulk CSV_FILE');
      }

      await bulkTagFromCSV(args[csvIndex]);
    } else {
      console.log('Usage:');
      console.log('  node scripts/tag-carriers.js --list           # List all carriers');
      console.log('  node scripts/tag-carriers.js --interactive    # Interactive mode');
      console.log('  node scripts/tag-carriers.js --tag ID LEVEL   # Tag specific carrier');
      console.log('  node scripts/tag-carriers.js --bulk FILE.csv  # Bulk tag from CSV');
      console.log();
      console.log('Service Levels:');
      console.log('  "Full Service"');
      console.log('  "Billing & Claim Service"');
      console.log('  "Agency Service"');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
