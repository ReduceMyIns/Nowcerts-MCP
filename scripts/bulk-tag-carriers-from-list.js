#!/usr/bin/env node
/**
 * Bulk Tag Carriers from Predefined List
 *
 * Tags all carriers based on the provided master list.
 * Matches carriers by name and applies the correct service level tag.
 *
 * Usage:
 *   NOWCERTS_USERNAME=user NOWCERTS_PASSWORD=pass node scripts/bulk-tag-carriers-from-list.js
 */

const NOWCERTS_API_URL = 'https://api.nowcerts.com/api';
const NOWCERTS_USERNAME = process.env.NOWCERTS_USERNAME;
const NOWCERTS_PASSWORD = process.env.NOWCERTS_PASSWORD;

let accessToken = null;

// Master list of carriers and their service levels
const CARRIER_TAGS = {
  '5 Star Specialty Programs': 'Agency Serviced',
  '28932F': 'Full Service',
  'Accident Fund Ins Co of America': 'Full Service',
  'ACCREDITED SURETY & CAS CO INC': 'Partial Service',
  'AEGIS': 'Partial Service',
  'AgentSecure': 'Agency Serviced',
  'AGEWELL NY LLC': 'Agency Serviced',
  'ALFA SPECIALTY INS CORP': 'Partial Service',
  'ALFA VISION INS CORP': 'Partial Service',
  'Allied General Agency': 'Full Service',
  'Allstate': 'Full Service',
  'ALLSTATE IND CO': 'Full Service',
  'ALLSTATE INS CO': 'Full Service',
  'ALLSTATE PROP & CAS INS CO': 'Full Service',
  'American Builders Ins Co RRG': 'Agency Serviced',
  'American Builders Ins Co RRG, Inc': 'Agency Serviced',
  'AMERICAN CAS CO OF READING PA': 'Partial Service',
  'AMERICAN ECONOMY INS CO': 'Full Service',
  'AMERICAN GEN IND CO': 'Full Service',
  'AMERICAN HALLMARK INS CO OF TX': 'Full Service',
  'AMERICAN INTERSTATE INS CO': 'Partial Service',
  'American Modern': 'Full Service',
  'AMERICAN ROAD INS CO': 'Partial Service',
  'AMERICAN STATES PREFERRED INS CO': 'Agency Serviced',
  'AMERICAN STRATEGIC INS CORP': 'Full Service',
  'American Strategic Insurance Corp': 'Full Service',
  'AMERICAN ZURICH INS CO': 'Partial Service',
  'Amerisafe': 'Partial Service',
  'AMGUARD INS CO': 'Full Service',
  'AmTrust': 'Partial Service',
  'Appalachian Underwriters': 'Agency Serviced',
  'Appalachian Underwriters, Inc': 'Agency Serviced',
  'Arlington Roe': 'Agency Serviced',
  'ARROWOOD SURPLUS LINES INS CO': 'Agency Serviced',
  'Atlantic Casualty': 'Agency Serviced',
  'Attune': 'Partial Service',
  'Auto-Owners Insurance Company': 'Agency Serviced',
  'AUTOMOBILE INS CO OF HARTFORD CT': 'Full Service',
  'Axis Surplus Insurance Company': 'Agency Serviced',
  'Benchmark Insurance Company': 'Full Service',
  'Berkley Risk': 'Agency Serviced',
  'Berkshire Hathaway Direct Insurance Company': 'Full Service',
  'biBERK': 'Full Service',
  'Branch': 'Full Service',
  'Bristol West': 'Full Service',
  'Builders & Tradesmen\'s Insurance Services': 'Agency Serviced',
  'Builders & Tradesmen\'s Insurance Services, Inc.': 'Agency Serviced',
  'BURLINGTON INS CO': 'Agency Serviced',
  'Canal Insurance Company': 'Agency Serviced',
  'Capital Premium Finance': 'Agency Serviced',
  'CENTURY SURETY CO': 'Agency Serviced',
  'CHARTER OAK FIRE INS CO': 'Partial Service',
  'Chubb': 'Full Service',
  'Clear Blue Insurance Group': 'Full Service',
  'CNA': 'Partial Service',
  'CNA Surety': 'Full Service',
  'CONNIE LEE INS CO': 'Full Service',
  'Consumer Insurance USA Inc': 'Agency Serviced',
  'CONTINENTAL CAS CO': 'Partial Service',
  'CONTINENTAL INS CO': 'Partial Service',
  'Coterie': 'Full Service',
  'Cover Whale': 'Agency Serviced',
  'CRUM & FORSTER SPECIALTY INS CO': 'Agency Serviced',
  'Dairyland': 'Full Service',
  'DEERBROOK INS CO': 'Full Service',
  'DIAMOND STATE INS CO': 'Full Service',
  'Donegal Insurance Group': 'Partial Service',
  'Dovetail': 'Agency Serviced',
  'ELEPHANT INS CO': 'Full Service',
  'Employers Mutual Casualty Co.': 'Agency Serviced',
  'Encompass': 'Full Service',
  'Encompass Auto': 'Full Service',
  'ENCOMPASS IND CO': 'Full Service',
  'ENCOMPASS INS CO': 'Full Service',
  'Essentia Insurance Company': 'Full Service',
  'Ethos': 'Full Service',
  'EVANSTON INS CO': 'Agency Serviced',
  'Evolution Insurance Brokers': 'Agency Serviced',
  'Evolution Insurance Brokers, LC': 'Agency Serviced',
  'FARMINGTON CAS CO': 'Partial Service',
  'FIDELITY & GUAR INS CO': 'Partial Service',
  'FIDELITY NATL INS CO': 'Full Service',
  'FIDELITY NATL PROP & CAS INS CO': 'Full Service',
  'FIRST MARINE INS CO': 'Full Service',
  'FIRSTCOMP INS CO': 'Full Service',
  'FOREMOST INS CO': 'Full Service',
  'GENERAL INS CO OF AMER': 'Full Service',
  'Grange Insurance': 'Full Service',
  'Gusto': 'Full Service',
  'Hagerty': 'Full Service',
  'HANOVER INS CO GRP': 'Agency Serviced',
  'HARTFORD FIRE IN CO': 'Full Service',
  'Hartford Flood': 'Full Service',
  'HARTFORD UNDERWRITERS INS CO': 'Full Service',
  'Hippo': 'Full Service',
  'Hiscox': 'Full Service',
  'HOME POINTE INS CO': 'Full Service',
  'IdentityIQ': 'Agency Serviced',
  'Insurance Helper': 'Full Service',
  'InsureZone': 'Agency Serviced',
  'InsureZone, Inc.': 'Agency Serviced',
  'INTEGON GENERAL INS CORP': 'Full Service',
  'INTEGON IND CORP': 'Full Service',
  'IPFS Corporation': 'Full Service',
  'ISC: Integrated Specialty Coverages': 'Agency Serviced',
  'Jupiter': 'Full Service',
  'K&K Insurance': 'Full Service',
  'KBK': 'Agency Serviced',
  'Lemic Ins Co': 'Agency Serviced',
  'Lexington': 'Agency Serviced',
  'Liberty Life Assurance Co': 'Full Service',
  'Liberty Mutual Insurance': 'Full Service',
  'Lloyds of London': 'Agency Serviced',
  'Markel': 'Full Service',
  'Markel American Insurance Company': 'Full Service',
  'MARKEL INS CO': 'Full Service',
  'MetLife': 'Full Service',
  'Mid-Continent Casualty Company': 'Agency Serviced',
  'MILBANK INS CO': 'Partial Service',
  'Mount Vernon Fire Ins Co.': 'Partial Service',
  'Mt Hawley Insurance Company': 'Agency Serviced',
  'MUSIC - MESA UNDERWRITERS SPECIALTY INSURANCE COMPANY': 'Agency Serviced',
  'Nation Safe Drivers': 'Agency Serviced',
  'National Casualty': 'Agency Serviced',
  'National General': 'Full Service',
  'National General Custom360®/ Premier OneChoice': 'Full Service',
  'National Indemnity Co.': 'Partial Service',
  'National Liability & Fire Insurance Co': 'Agency Serviced',
  'NATIONAL SPECIALTY INS CO': 'Full Service',
  'Nationwide': 'Agency Serviced',
  'NCCI': 'Full Service',
  'Neptune': 'Agency Serviced',
  'NetComp': 'Full Service',
  'Next': 'Agency Serviced',
  'Northern Star Management': 'Agency Serviced',
  'Northern Star Management, Inc': 'Agency Serviced',
  'NOVA CAS CO': 'Full Service',
  'Openly': 'Full Service',
  'Orion180': 'Full Service',
  'PERMANENT GEN ASSUR CORP OF OH': 'Full Service',
  'PERMANENT GENERAL ASSUR CORP': 'Agency Serviced',
  'PersonalUmbrella.com': 'Partial Service',
  'PHOENIX INS CO': 'Partial Service',
  'Pie': 'Partial Service',
  'PLAZA INS CO': 'Agency Serviced',
  'Preferred Contractors Ins Co RRG LLC': 'Agency Serviced',
  'Preferred Mutual': 'Full Service',
  'Progressive': 'Full Service',
  'PROGRESSIVE CAS INS CO': 'Full Service',
  'PROGRESSIVE HI INS CORP': 'Full Service',
  'PROGRESSIVE MOUNTAIN INS CO': 'Full Service',
  'PROGRESSIVE NORTHERN INS CO': 'Full Service',
  'Progressive Smart Savings': 'Full Service',
  'Progressive Smart Savings POP': 'Full Service',
  'PROGRESSIVE SPECIALTY INS CO': 'Full Service',
  'Risk Placement Services': 'Full Service',
  'SafeCo': 'Full Service',
  'SAFECO INS CO OF AMER': 'Full Service',
  'SAFECO INS CO OF IL': 'Full Service',
  'SAFECO INS CO OF IN': 'Full Service',
  'SAFECO INS CO OF OR': 'Full Service',
  'Safeco Insurance': 'Full Service',
  'Safeway Ins Co': 'Agency Serviced',
  'Scottsdale Insurance Company': 'Partial Service',
  'Security National Insurance Company': 'Agency Serviced',
  'SmartChoice': 'Agency Serviced',
  'Southeast Personnel Leasing': 'Agency Serviced',
  'Southeast Personnel Leasing, Inc.': 'Partial Service',
  'Southern Pioneer': 'Partial Service',
  'SOUTHERN PIONEER PROP & CAS INS CO': 'Agency Serviced',
  'Southern Specialty Underwriters': 'Full Service',
  'Spinnaker Insurance Company': 'Full Service',
  'Sports & Fitness Insurance Corporation': 'Partial Service',
  'ST PAUL FIRE & MARINE INS CO': 'Partial Service',
  'ST PAUL GUARDIAN INS CO': 'Full Service',
  'STANDARD FIRE INS CO': 'Agency Serviced',
  'Star Insurance Company': 'Partial Service',
  'State Auto Commercial': 'Partial Service',
  'State Auto Personal': 'Partial Service',
  'STATE AUTO PROP & CAS INS CO': 'Partial Service',
  'STATE AUTOMOBILE MUT INS CO': 'Partial Service',
  'STATE NATL INS CO INC': 'Full Service',
  'Steadily': 'Full Service',
  'Stillwater': 'Full Service',
  'TAPCO Underwriters Inc.': 'Agency Serviced',
  'Technology Insurance Co.': 'Agency Serviced',
  'Test Carrier': 'Agency Serviced',
  'The General': 'Full Service',
  'Thimble': 'Full Service',
  'TOWER HILL PRIME INSURANCE COMPANY': 'Partial Service',
  'TRANSVERSE SPECIALTY INS CO & AFF': 'Full Service',
  'Travelers': 'Full Service',
  'Travelers Assigned Risk': 'Full Service',
  'TRAVELERS CAS & SURETY CO': 'Partial Service',
  'TRAVELERS CAS INS CO OF AMER': 'Partial Service',
  'Travelers Commercial': 'Partial Service',
  'TRAVELERS COMMERCIAL CAS CO': 'Partial Service',
  'TRAVELERS HOME & MARINE INS CO': 'Full Service',
  'TRAVELERS IND CO': 'Partial Service',
  'TRAVELERS IND CO OF AMER': 'Partial Service',
  'TRAVELERS IND CO OF CT': 'Partial Service',
  'Travelers Personal': 'Full Service',
  'TRAVELERS PERSONAL SECURITY INS CO': 'Full Service',
  'TRAVELERS PROP CAS INS CO': 'Full Service',
  'TRAVELERS PROPERTY CAS CO OF AMER': 'Partial Service',
  'Trexis': 'Partial Service',
  'TWCIP': 'Agency Serviced',
  'United National Insurance Company': 'Agency Serviced',
  'United States Liability Insurance Co.': 'Partial Service',
  'VALLEY FORGE INS CO': 'Partial Service',
  'Victoria Insurance Co': 'Agency Serviced',
  'VIKING INS CO OF WI': 'Full Service',
  'Wellfleet New York Insurance Company': 'Full Service',
  'WESTERN SURETY CO': 'Full Service',
  'x_Encompass': 'Full Service',
  'x_National General': 'Full Service',
  'x_Steadily': 'Full Service',
};

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
  console.log('📋 Fetching carriers from NowCerts...');

  const response = await fetch(
    `${NOWCERTS_API_URL}/CarrierDetailList?$count=true&$orderby=changeDate asc&$top=1000&$skip=0`,
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
  console.log(`✓ Found ${data.value.length} carriers in NowCerts\n`);
  return data.value;
}

/**
 * Apply tag to carrier
 */
async function tagCarrier(carrierId, carrierName, serviceLevel) {
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
}

/**
 * Normalize carrier name for matching
 */
function normalizeCarrierName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/[.,]/g, '');
}

/**
 * Main bulk tagging process
 */
async function main() {
  try {
    await authenticate();
    const carriers = await getCarriers();

    console.log('═'.repeat(80));
    console.log('BULK CARRIER TAGGING');
    console.log('═'.repeat(80));
    console.log(`Master list contains ${Object.keys(CARRIER_TAGS).length} carriers`);
    console.log(`NowCerts contains ${carriers.length} carriers`);
    console.log();

    let taggedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    // Create lookup map
    const carrierMap = new Map();
    carriers.forEach((carrier) => {
      const name = carrier.insuredCommercialName || carrier.contactName || '';
      const normalized = normalizeCarrierName(name);
      if (normalized) {
        carrierMap.set(normalized, carrier);
      }
    });

    console.log('Processing carriers...\n');

    for (const [carrierName, serviceLevel] of Object.entries(CARRIER_TAGS)) {
      // Skip carriers with x_ prefix (inactive)
      if (carrierName.startsWith('x_')) {
        console.log(`⏭️  Skipping inactive: ${carrierName}`);
        skippedCount++;
        continue;
      }

      // Skip carriers with no service level
      if (!serviceLevel) {
        console.log(`⏭️  Skipping (no service level): ${carrierName}`);
        skippedCount++;
        continue;
      }

      // Find carrier in NowCerts
      const normalized = normalizeCarrierName(carrierName);
      const carrier = carrierMap.get(normalized);

      if (!carrier) {
        console.log(`❌ Not found in NowCerts: ${carrierName}`);
        notFoundCount++;
        continue;
      }

      try {
        console.log(`🏷️  Tagging: ${carrierName} → ${serviceLevel}`);
        await tagCarrier(carrier.id, carrierName, serviceLevel);
        console.log(`✓ Tagged successfully`);
        taggedCount++;
      } catch (error) {
        console.error(`❌ Error tagging ${carrierName}: ${error.message}`);
        errorCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log();
    console.log('═'.repeat(80));
    console.log('SUMMARY');
    console.log('═'.repeat(80));
    console.log(`✓ Successfully tagged: ${taggedCount}`);
    console.log(`⏭️  Skipped (inactive/no tag): ${skippedCount}`);
    console.log(`❌ Not found in NowCerts: ${notFoundCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log();

    if (notFoundCount > 0) {
      console.log('NOTE: Carriers not found in NowCerts may be:');
      console.log('  - Spelled differently in NowCerts');
      console.log('  - Already deleted from NowCerts');
      console.log('  - Merged with other carriers');
      console.log();
    }

    console.log('✓ Bulk tagging complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
