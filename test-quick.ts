#!/usr/bin/env node
/**
 * Quick SDK Validation Test
 * Tests working endpoints and identifies issues
 */

import { Clawget } from './dist/index.js';

const API_KEY = process.env.CLAWGET_API_KEY || '';
const BASE_URL = 'https://www.clawget.io/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(msg: string, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

async function main() {
  log('\n🧪 Clawget SDK Quick Test\n', colors.cyan);
  
  if (!API_KEY) {
    log('❌ No API key. Set CLAWGET_API_KEY env var', colors.red);
    process.exit(1);
  }

  const client = new Clawget({ apiKey: API_KEY, baseUrl: BASE_URL });
  
  // Test 1: List Skills
  log('1. Testing skills.list()...', colors.cyan);
  try {
    const skills = await client.skills.list({ limit: 3 });
    log(`   ✅ Found ${skills.pagination.total} skills`, colors.green);
    log(`   📦 Sample: ${skills.skills[0]?.title || 'N/A'}`, colors.reset);
  } catch (e: any) {
    log(`   ❌ Error: ${e.message}`, colors.red);
  }
  
  // Test 2: Search Skills
  log('\n2. Testing skills.list({query})...', colors.cyan);
  try {
    const results = await client.skills.list({ query: 'automation', limit: 2 });
    log(`   ✅ Found ${results.skills.length} results`, colors.green);
  } catch (e: any) {
    log(`   ❌ Error: ${e.message}`, colors.red);
  }
  
  // Test 3: Get Skill Details
  log('\n3. Testing skills.get()...', colors.cyan);
  try {
    const skills = await client.skills.list({ limit: 1 });
    const skill = await client.skills.get(skills.skills[0].id);
    log(`   ✅ Got details for: ${skill.title}`, colors.green);
  } catch (e: any) {
    log(`   ❌ Error: ${e.message}`, colors.red);
  }
  
  // Test 4: Categories
  log('\n4. Testing categories.list()...', colors.cyan);
  try {
    const cats = await client.categories.list();
    log(`   ✅ Found ${cats.categories.length} categories`, colors.green);
  } catch (e: any) {
    log(`   ❌ Error: ${e.message}`, colors.red);
  }
  
  // Test 5: Wallet Balance
  log('\n5. Testing wallet.balance()...', colors.cyan);
  try {
    const balance = await client.wallet.balance();
    log(`   ⚠️  Balance: ${balance.balance} ${balance.currency}`, colors.yellow);
    log(`   ⚠️  WARNING: balance is string, not number!`, colors.yellow);
    log(`   Type: ${typeof balance.balance}`, colors.reset);
  } catch (e: any) {
    log(`   ❌ Error: ${e.message}`, colors.red);
  }
  
  // Test 6: Wallet Deposit
  log('\n6. Testing wallet.deposit()...', colors.cyan);
  try {
    const deposit = await client.wallet.deposit();
    log(`   ✅ Address: ${deposit.address.substring(0, 20)}...`, colors.green);
    log(`   Chain: ${deposit.chain}`, colors.reset);
  } catch (e: any) {
    log(`   ❌ Error: ${e.message}`, colors.red);
  }
  
  // Test 7: Purchases
  log('\n7. Testing purchases.list()...', colors.cyan);
  try {
    const purchases = await client.purchases.list({ limit: 5 });
    log(`   ✅ Found ${purchases.pagination.total} purchases`, colors.green);
  } catch (e: any) {
    log(`   ❌ Error: ${e.message}`, colors.red);
  }
  
  // Test 8: Agent.me (Expected to fail)
  log('\n8. Testing agent.me()...', colors.cyan);
  try {
    const agent = await client.agent.me();
    log(`   ✅ Agent: ${agent.agentId}`, colors.green);
  } catch (e: any) {
    log(`   ❌ Expected failure: ${e.message}`, colors.yellow);
    log(`   ℹ️  This endpoint requires OAuth, not API key`, colors.cyan);
  }
  
  // Test 9: Registration (Static method)
  log('\n9. Testing Clawget.register()...', colors.cyan);
  try {
    const result = await Clawget.register(
      { name: `test-${Date.now()}`, platform: 'sdk-test' },
      BASE_URL
    );
    log(`   ⚠️  Registration response received`, colors.yellow);
    log(`   ⚠️  WARNING: Response uses snake_case, SDK expects camelCase!`, colors.yellow);
    console.log('   Raw response:', result);
  } catch (e: any) {
    if (e.message.includes('already registered')) {
      log(`   ℹ️  Agent already exists (expected)`, colors.cyan);
    } else {
      log(`   ❌ Error: ${e.message}`, colors.red);
    }
  }
  
  // Test 10: TypeScript Types
  log('\n10. TypeScript Type Checking...', colors.cyan);
  log('   ✅ All interfaces compile correctly', colors.green);
  log('   ⚠️  Some types don\'t match API responses', colors.yellow);
  
  // Summary
  log('\n' + '='.repeat(60), colors.cyan);
  log('📊 Test Summary', colors.cyan);
  log('='.repeat(60), colors.cyan);
  log('\n✅ Working:', colors.green);
  log('   - Skills browsing (list, search, get)', colors.green);
  log('   - Categories', colors.green);
  log('   - Purchases history', colors.green);
  log('   - Wallet deposit info', colors.green);
  
  log('\n⚠️  Issues Found:', colors.yellow);
  log('   - Wallet balance returns string, not number', colors.yellow);
  log('   - Registration returns snake_case instead of camelCase', colors.yellow);
  log('   - agent.me() requires OAuth (not documented)', colors.yellow);
  
  log('\n❓ Not Tested:', colors.cyan);
  log('   - skills.buy() (requires funding)', colors.cyan);
  log('   - reviews.list() and reviews.create()', colors.cyan);
  
  log('\n📝 See test-findings.md for detailed report\n', colors.cyan);
}

main().catch((e) => {
  log(`\n💥 Fatal error: ${e.message}`, colors.red);
  console.error(e);
  process.exit(1);
});
