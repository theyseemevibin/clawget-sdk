#!/usr/bin/env tsx
/**
 * Test product delivery for existing purchases
 * Verifies that license keys and download endpoints work correctly
 */

import { Clawget } from './src/index.js';

const API_KEY = process.env.CLAWGET_TEST_API_KEY || '';
const BASE_URL = 'https://www.clawget.io/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

async function testDelivery() {
  console.log(`${colors.cyan}=== Product Delivery Verification Test ===${colors.reset}\n`);
  
  if (!API_KEY) {
    console.error(`${colors.red}Error: CLAWGET_TEST_API_KEY not set${colors.reset}`);
    process.exit(1);
  }
  
  const client = new Clawget({ apiKey: API_KEY, baseUrl: BASE_URL });
  
  try {
    // Get all purchases
    console.log('Fetching purchases...');
    const purchases = await client.purchases.list({ limit: 10 });
    
    console.log(`${colors.green}✓ Found ${purchases.purchases.length} purchases${colors.reset}\n`);
    
    if (purchases.purchases.length === 0) {
      console.log(`${colors.yellow}No purchases found. Run a purchase test first.${colors.reset}`);
      process.exit(0);
    }
    
    // Test each purchase
    for (const purchase of purchases.purchases) {
      console.log(`${colors.cyan}Testing purchase: ${(purchase as any).title || purchase.skill?.name}${colors.reset}`);
      console.log(`  Purchase ID: ${(purchase as any).purchaseId || purchase.id}`);
      console.log(`  Skill ID: ${(purchase as any).skillId || purchase.skill?.id}`);
      console.log(`  Status: ${purchase.status}`);
      console.log(`  Amount: $${purchase.amount}`);
      console.log(`  Date: ${purchase.purchasedAt || (purchase as any).date}`);
      
      // Check if license key is present
      if (purchase.licenseKey) {
        console.log(`  ${colors.green}✓ License key present: ${purchase.licenseKey.substring(0, 30)}...${colors.reset}`);
        
        // Test license validation
        try {
          const validationResponse = await client.licenses.validate(purchase.licenseKey) as any;
          const validation = validationResponse.data || validationResponse;
          
          if (validation.valid) {
            console.log(`  ${colors.green}✓ License key is VALID${colors.reset}`);
            if (validation.license) {
              console.log(`    - Type: ${validation.license.type}`);
              console.log(`    - Status: ${validation.license.status}`);
              console.log(`    - Expires: ${validation.license.expiresAt || 'Never'}`);
            }
          } else {
            console.log(`  ${colors.yellow}⚠ License validation returned invalid: ${validation.error}${colors.reset}`);
          }
        } catch (error: any) {
          console.log(`  ${colors.red}✗ License validation error: ${error.message}${colors.reset}`);
        }
      } else {
        console.log(`  ${colors.yellow}⚠ No license key in purchase record${colors.reset}`);
      }
      
      // Test download endpoint
      const skillId = (purchase as any).skillId || purchase.skill?.id;
      if (skillId) {
        try {
          console.log(`  Testing download endpoint...`);
          const downloadInfo = await client.skills.download(skillId);
          
          console.log(`  ${colors.green}✓ Download endpoint accessible${colors.reset}`);
          console.log(`    - Package URL: ${downloadInfo.packageUrl ? 'Present' : 'Missing'}`);
          console.log(`    - License Key: ${downloadInfo.licenseKey ? 'Present' : 'Missing'}`);
          console.log(`    - Activations: ${downloadInfo.activations}/${downloadInfo.maxActivations}`);
          
          if (!downloadInfo.packageUrl) {
            console.log(`  ${colors.yellow}⚠ Warning: packageUrl is missing${colors.reset}`);
          }
        } catch (error: any) {
          console.log(`  ${colors.red}✗ Download endpoint failed: ${error.message}${colors.reset}`);
          console.log(`    Status: ${error.statusCode}`);
        }
      } else {
        console.log(`  ${colors.yellow}⚠ Cannot test download - no skill ID${colors.reset}`);
      }
      
      console.log('');
    }
    
    console.log(`${colors.green}=== Delivery verification complete ===${colors.reset}`);
    
  } catch (error: any) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

testDelivery();
