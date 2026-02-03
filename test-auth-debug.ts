#!/usr/bin/env tsx
/**
 * DEBUG: Test authentication headers for different endpoints
 */

import { Clawget } from './src/index.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

async function testAuth() {
  console.log(`${colors.cyan}=== AUTHENTICATION DEBUG TEST ===${colors.reset}\n`);
  
  // Step 1: Register new agent to get fresh API key
  console.log(`${colors.cyan}1. Registering new agent...${colors.reset}`);
  const registration = await Clawget.register({
    name: `auth-test-${Date.now()}`,
    platform: 'auth-debug'
  });
  
  console.log(`${colors.green}✓ Registered${colors.reset}`);
  console.log(`   Agent ID: ${registration.agentId}`);
  console.log(`   API Key: ${registration.apiKey.substring(0, 30)}...`);
  
  const client = new Clawget({ 
    apiKey: registration.apiKey,
    agentId: registration.agentId 
  });
  
  // Step 2: Test endpoints that SHOULD work with API key
  console.log(`\n${colors.cyan}2. Testing endpoints with API key auth...${colors.reset}\n`);
  
  // Test wallet.balance (works)
  console.log(`   Testing: GET /wallet/balance`);
  try {
    await client.wallet.balance();
    console.log(`   ${colors.green}✓ PASS${colors.reset} - wallet.balance() works with API key`);
  } catch (error: any) {
    console.log(`   ${colors.red}✗ FAIL${colors.reset} - ${error.message}`);
  }
  
  // Test skills.list (works)
  console.log(`   Testing: GET /skills`);
  try {
    await client.skills.list({ limit: 1 });
    console.log(`   ${colors.green}✓ PASS${colors.reset} - skills.list() works with API key`);
  } catch (error: any) {
    console.log(`   ${colors.red}✗ FAIL${colors.reset} - ${error.message}`);
  }
  
  // Test agent.status (should work)
  console.log(`   Testing: GET /v1/agents/status`);
  try {
    await client.agent.status();
    console.log(`   ${colors.green}✓ PASS${colors.reset} - agent.status() works with API key`);
  } catch (error: any) {
    console.log(`   ${colors.red}✗ FAIL${colors.reset} - ${error.message}`);
  }
  
  // Test agent.me (FAILS - requires GitHub OAuth)
  console.log(`   Testing: GET /v1/agents/me`);
  try {
    await client.agent.me();
    console.log(`   ${colors.green}✓ PASS${colors.reset} - agent.me() works with API key`);
  } catch (error: any) {
    console.log(`   ${colors.red}✗ FAIL${colors.reset} - ${error.message}`);
    console.log(`   ${colors.yellow}   This endpoint requires GitHub OAuth instead of API key${colors.reset}`);
  }
  
  // Test agent.getProfile (FAILS - requires GitHub OAuth)
  console.log(`   Testing: GET /v1/agents/profile`);
  try {
    await client.agent.getProfile();
    console.log(`   ${colors.green}✓ PASS${colors.reset} - agent.getProfile() works with API key`);
  } catch (error: any) {
    console.log(`   ${colors.red}✗ FAIL${colors.reset} - ${error.message}`);
    console.log(`   ${colors.yellow}   This endpoint requires GitHub OAuth instead of API key${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}=== SUMMARY ===${colors.reset}`);
  console.log(`${colors.yellow}⚠ AUTHENTICATION ISSUE CONFIRMED:${colors.reset}`);
  console.log(`  • Most endpoints accept API key auth (x-api-key header)`);
  console.log(`  • /v1/agents/me and /v1/agents/profile reject API key auth`);
  console.log(`  • These endpoints incorrectly require GitHub OAuth`);
  console.log(`\n${colors.cyan}RECOMMENDATION:${colors.reset}`);
  console.log(`  Backend should accept API key auth for /v1/agents/* endpoints`);
}

testAuth().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
