#!/usr/bin/env node

// Configuration
const NOWCERTS_API_URL = 'https://api.nowcerts.com/api';
const NOWCERTS_USERNAME = process.env.NOWCERTS_USERNAME;
const NOWCERTS_PASSWORD = process.env.NOWCERTS_PASSWORD;

let accessToken = null;

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

async function getCarriers() {
  console.log('Fetching carriers from NowCerts...');

  const response = await fetch(
    NOWCERTS_API_URL + '/CarrierDetailList?$count=true&$orderby=changeDate asc&$top=1000&$skip=0',
    {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get carriers: ' + response.status);
  }

  const data = await response.json();
  console.log('Found ' + data.value.length + ' carriers\n');
  return data.value;
}

async function main() {
  try {
    await authenticate();
    const carriers = await getCarriers();

    console.log('='.repeat(80));
    console.log('CARRIER NAMES IN NOWCERTS (First 30)');
    console.log('='.repeat(80));
    console.log();

    for (let i = 0; i < Math.min(30, carriers.length); i++) {
      const carrier = carriers[i];
      console.log('[' + (i + 1) + ']');
      console.log('  ID: ' + carrier.id);
      console.log('  commercialName: ' + (carrier.commercialName || 'EMPTY'));
      console.log('  contactName: ' + (carrier.contactName || 'EMPTY'));
      console.log('  firstName: ' + (carrier.firstName || 'EMPTY'));
      console.log('  lastName: ' + (carrier.lastName || 'EMPTY'));
      console.log('  phone: ' + (carrier.phone || carrier.customerServicePhone || 'N/A'));
      console.log('  status: ' + (carrier.status || 'N/A'));
      console.log();
    }

    console.log('='.repeat(80));
    console.log('SAMPLE FROM MASTER LIST (For Comparison)');
    console.log('='.repeat(80));
    console.log();
    console.log('Progressive');
    console.log('Safeco');
    console.log('State Auto');
    console.log('Nationwide');
    console.log('Travelers');
    console.log();

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log('Total carriers in NowCerts: ' + carriers.length);
    console.log();
    console.log('Next Steps:');
    console.log('1. Compare carrier names from NowCerts with the master list');
    console.log('2. Identify format differences');
    console.log('3. Update the normalization function in bulk-tag-carriers-from-list.js');
    console.log('4. Consider using fuzzy matching or partial matching');
    console.log();

  } catch (error) {
    console.error('\nError: ' + error.message);
    process.exit(1);
  }
}

main();
