#!/usr/bin/env node

/**
 * Script to find driver Harold Cahuantzi Tonix
 */

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

async function findDriver() {
  console.log('Searching for driver Harold Cahuantzi Tonix...');

  // Try searching by first name and partial last name
  const filters = {
    firstName: 'Harold'
  };

  const response = await fetch(
    NOWCERTS_API_URL + '/Zapier/GetDrivers',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get drivers: ' + response.status + ' ' + await response.text());
  }

  const data = await response.json();
  console.log('Found ' + data.length + ' drivers named Harold\n');

  // Filter for Cahuantzi Tonix
  const matches = data.filter(d =>
    d.lastName && d.lastName.includes('Cahuantzi') || d.lastName && d.lastName.includes('Tonix')
  );

  console.log('Matching drivers:');
  console.log(JSON.stringify(matches, null, 2));

  return matches;
}

async function main() {
  try {
    await authenticate();
    const drivers = await findDriver();

    if (drivers.length === 0) {
      console.log('No matching driver found. Searching all drivers...');

      // Try searching with no filters
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
        throw new Error('Failed to get all drivers: ' + response.status);
      }

      const allDrivers = await response.json();
      console.log('Total drivers in system: ' + allDrivers.length);

      // Search for Harold or Cahuantzi in any field
      const matches = allDrivers.filter(d => {
        const fullText = JSON.stringify(d).toLowerCase();
        return fullText.includes('harold') || fullText.includes('cahuantzi') || fullText.includes('tonix');
      });

      console.log('\nDrivers matching Harold/Cahuantzi/Tonix:');
      console.log(JSON.stringify(matches, null, 2));
    }

  } catch (error) {
    console.error('\nError: ' + error.message);
    process.exit(1);
  }
}

main();
