#!/usr/bin/env node
/**
 * Comprehensive SDK Test Suite
 * Tests all Clawget SDK functionality
 */

import { Clawget, ClawgetError } from './src/index.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const API_KEY = process.env.CLAWGET_API_KEY || '';
const BASE_URL = process.env.CLAWGET_BASE_URL || 'https://www.clawget.io/api';

let testsPassed = 0;
let testsFailed = 0;

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.cyan);
  console.log('='.repeat(60));
}

function logTest(name: string) {
  process.stdout.write(`${colors.blue}Testing: ${name}${colors.reset} ... `);
}

function pass(message?: string) {
  testsPassed++;
  log(`✓ PASS${message ? ` - ${message}` : ''}`, colors.green);
}

function fail(error: any) {
  testsFailed++;
  log(`✗ FAIL - ${error.message || error}`, colors.red);
  if (error.response) {
    console.log('Response:', JSON.stringify(error.response, null, 2));
  }
}

async function testRegister() {
  logTest('Agent registration (Clawget.register)');
  
  try {
    const result = await Clawget.register(
      { 
        name: `test-agent-${Date.now()}`,
        platform: 'sdk-test'
      },
      BASE_URL
    );
    
    // Verify response structure
    if (!result.apiKey || !result.agentId || !result.depositAddress) {
      throw new Error('Missing fields in registration response');
    }
    
    pass(`API Key: ${result.apiKey.substring(0, 20)}...`);
    return result;
  } catch (error: any) {
    // Registration might fail if already exists - that's ok for testing
    if (error.message?.includes('already registered') || error.statusCode === 409) {
      log(`⚠ Skip - Agent already exists (expected)`, colors.yellow);
      return null;
    }
    fail(error);
    return null;
  }
}

async function testAuthentication() {
  logTest('Authentication with API key');
  
  try {
    if (!API_KEY) {
      throw new Error('No API key provided. Set CLAWGET_API_KEY environment variable');
    }
    
    const client = new Clawget({ apiKey: API_KEY, baseUrl: BASE_URL });
    
    // Try to fetch agent info to verify auth
    const agentInfo = await client.agent.me();
    
    pass(`Authenticated as: ${agentInfo.agentId}`);
    return client;
  } catch (error: any) {
    fail(error);
    return null;
  }
}

async function testSkillsList(client: Clawget) {
  logTest('List skills (skills.list)');
  
  try {
    const response = await client.skills.list({ limit: 5 });
    
    if (!response.skills || !Array.isArray(response.skills)) {
      throw new Error('Invalid response structure');
    }
    
    if (!response.pagination) {
      throw new Error('Missing pagination data');
    }
    
    pass(`Found ${response.pagination.total} total skills, showing ${response.skills.length}`);
  } catch (error: any) {
    fail(error);
  }
}

async function testSkillsSearch(client: Clawget) {
  logTest('Search skills (skills.list with query)');
  
  try {
    const response = await client.skills.list({ 
      query: 'automation',
      limit: 3 
    });
    
    if (!Array.isArray(response.skills)) {
      throw new Error('Invalid response structure');
    }
    
    pass(`Found ${response.skills.length} skills matching "automation"`);
  } catch (error: any) {
    fail(error);
  }
}

async function testSkillsGet(client: Clawget) {
  logTest('Get skill details (skills.get)');
  
  try {
    // First get a skill ID from the list
    const listResponse = await client.skills.list({ limit: 1 });
    
    if (listResponse.skills.length === 0) {
      throw new Error('No skills available to test');
    }
    
    const skillId = listResponse.skills[0].id;
    const skill = await client.skills.get(skillId);
    
    if (!skill.id || !skill.title || !skill.description) {
      throw new Error('Missing required fields in skill details');
    }
    
    pass(`Retrieved: ${skill.title}`);
  } catch (error: any) {
    fail(error);
  }
}

async function testCategories(client: Clawget) {
  logTest('List categories (categories.list)');
  
  try {
    const response = await client.categories.list();
    
    if (!response.categories || !Array.isArray(response.categories)) {
      throw new Error('Invalid categories response');
    }
    
    pass(`Found ${response.categories.length} categories`);
  } catch (error: any) {
    fail(error);
  }
}

async function testWalletBalance(client: Clawget) {
  logTest('Get wallet balance (wallet.balance)');
  
  try {
    const balance = await client.wallet.balance();
    
    if (balance.balance === undefined || !balance.currency) {
      throw new Error('Invalid balance response');
    }
    
    pass(`Balance: ${balance.balance} ${balance.currency}`);
  } catch (error: any) {
    fail(error);
  }
}

async function testWalletDeposit(client: Clawget) {
  logTest('Get deposit info (wallet.deposit)');
  
  try {
    const deposit = await client.wallet.deposit();
    
    if (!deposit.address || !deposit.chain) {
      throw new Error('Invalid deposit response');
    }
    
    pass(`Deposit address: ${deposit.address.substring(0, 20)}... (${deposit.chain})`);
  } catch (error: any) {
    fail(error);
  }
}

async function testPurchasesList(client: Clawget) {
  logTest('List purchases (purchases.list)');
  
  try {
    const response = await client.purchases.list({ limit: 10 });
    
    if (!response.purchases || !Array.isArray(response.purchases)) {
      throw new Error('Invalid purchases response');
    }
    
    if (!response.pagination) {
      throw new Error('Missing pagination data');
    }
    
    pass(`Found ${response.pagination.total} total purchases`);
    return response.purchases;
  } catch (error: any) {
    fail(error);
    return [];
  }
}

async function testSkillBuy(client: Clawget) {
  logTest('Buy skill (skills.buy) - Dry run check');
  
  try {
    // Don't actually buy, just verify the method exists and throws proper error
    // We'll try to buy with an invalid skill ID to test error handling
    await client.skills.buy({ skillId: 'invalid-skill-id-test' });
    
    fail(new Error('Should have thrown error for invalid skill'));
  } catch (error: any) {
    // We expect this to fail - verify it's a proper ClawgetError
    if (error instanceof ClawgetError) {
      pass('Error handling works correctly');
    } else {
      fail(new Error('Error is not a ClawgetError instance'));
    }
  }
}

async function testTypeScript() {
  logTest('TypeScript type checking');
  
  try {
    // These should all compile without errors
    const config: import('./src/index.js').ClawgetConfig = {
      apiKey: 'test',
      baseUrl: 'https://test.com',
      agentId: 'test-agent'
    };
    
    const client = new Clawget(config);
    
    // Verify all methods exist with correct signatures
    const methods = [
      'skills.list',
      'skills.buy',
      'skills.get',
      'skills.create',
      'wallet.balance',
      'wallet.deposit',
      'purchases.list',
      'categories.list',
      'agent.me',
    ];
    
    for (const method of methods) {
      const [obj, fn] = method.split('.');
      if (!client[obj as keyof typeof client] || 
          typeof (client[obj as keyof typeof client] as any)[fn] !== 'function') {
        throw new Error(`Method ${method} not found`);
      }
    }
    
    // Verify static register method
    if (typeof Clawget.register !== 'function') {
      throw new Error('Static register method not found');
    }
    
    pass('All methods and types present');
  } catch (error: any) {
    fail(error);
  }
}

async function testReadmeExample() {
  logTest('README example code');
  
  try {
    if (!API_KEY) {
      throw new Error('No API key for README test');
    }
    
    // This is the exact code from the README Quick Start section
    const client = new Clawget({
      apiKey: API_KEY
    });

    // Browse available skills
    const skills = await client.skills.list();
    
    if (!skills || !skills.skills) {
      throw new Error('README example failed: skills.list');
    }

    // Check balance
    const balance = await client.wallet.balance();
    
    if (balance.balance === undefined) {
      throw new Error('README example failed: wallet.balance');
    }
    
    pass('README example code works correctly');
  } catch (error: any) {
    fail(error);
  }
}

async function testErrorHandling() {
  logTest('Error handling (invalid API key)');
  
  try {
    const client = new Clawget({ 
      apiKey: 'invalid-api-key-12345',
      baseUrl: BASE_URL
    });
    
    await client.skills.list();
    
    fail(new Error('Should have thrown error for invalid API key'));
  } catch (error: any) {
    if (error instanceof ClawgetError && error.statusCode === 401) {
      pass('401 error handled correctly');
    } else {
      fail(new Error(`Wrong error type or status: ${error.statusCode}`));
    }
  }
}

async function testAgentInfo(client: Clawget) {
  logTest('Get agent info (agent.me)');
  
  try {
    const agentInfo = await client.agent.me();
    
    if (!agentInfo.id || !agentInfo.agentId) {
      throw new Error('Invalid agent info response');
    }
    
    pass(`Agent: ${agentInfo.agentId} (${agentInfo.status})`);
  } catch (error: any) {
    fail(error);
  }
}

async function testReviews(client: Clawget) {
  logTest('Get skill reviews (reviews.list)');
  
  try {
    // Get a skill first
    const listResponse = await client.skills.list({ limit: 1 });
    
    if (listResponse.skills.length === 0) {
      log(`⚠ Skip - No skills to test reviews`, colors.yellow);
      return;
    }
    
    const skillId = listResponse.skills[0].id;
    const reviews = await client.reviews.list(skillId, { limit: 5 });
    
    if (!reviews.reviews || !Array.isArray(reviews.reviews)) {
      throw new Error('Invalid reviews response');
    }
    
    pass(`Found ${reviews.pagination.total} reviews`);
  } catch (error: any) {
    fail(error);
  }
}

async function runAllTests() {
  log('\n🧪 Clawget SDK Test Suite\n', colors.cyan);
  
  // Section 1: Registration
  logSection('1. Agent Registration');
  await testRegister();
  
  // Section 2: Authentication
  logSection('2. Authentication');
  const client = await testAuthentication();
  
  if (!client) {
    log('\n❌ Cannot proceed without valid authentication', colors.red);
    process.exit(1);
  }
  
  // Section 3: Skills API
  logSection('3. Skills API');
  await testSkillsList(client);
  await testSkillsSearch(client);
  await testSkillsGet(client);
  await testSkillBuy(client);
  
  // Section 4: Categories API
  logSection('4. Categories API');
  await testCategories(client);
  
  // Section 5: Wallet API
  logSection('5. Wallet API');
  await testWalletBalance(client);
  await testWalletDeposit(client);
  
  // Section 6: Purchases API
  logSection('6. Purchases API');
  await testPurchasesList(client);
  
  // Section 7: Agent API
  logSection('7. Agent API');
  await testAgentInfo(client);
  
  // Section 8: Reviews API
  logSection('8. Reviews API');
  await testReviews(client);
  
  // Section 9: TypeScript Types
  logSection('9. TypeScript Types');
  await testTypeScript();
  
  // Section 10: README Examples
  logSection('10. README Examples');
  await testReadmeExample();
  
  // Section 11: Error Handling
  logSection('11. Error Handling');
  await testErrorHandling();
  
  // Summary
  logSection('Test Summary');
  log(`\n✓ Passed: ${testsPassed}`, colors.green);
  log(`✗ Failed: ${testsFailed}`, colors.red);
  log(`Total: ${testsPassed + testsFailed}`, colors.cyan);
  
  const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
  log(`\nSuccess Rate: ${successRate}%`, 
      testsFailed === 0 ? colors.green : colors.yellow);
  
  if (testsFailed === 0) {
    log('\n🎉 All tests passed!', colors.green);
    process.exit(0);
  } else {
    log(`\n⚠️  ${testsFailed} test(s) failed`, colors.red);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  log(`\n💥 Unhandled error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
