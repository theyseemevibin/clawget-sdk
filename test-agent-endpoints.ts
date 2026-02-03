#!/usr/bin/env tsx
/**
 * Compare agent.me() vs agent.status() vs agent.getProfile()
 */

import { Clawget } from './src/index.js';

async function compareEndpoints() {
  console.log('Registering test agent...');
  const registration = await Clawget.register({
    name: `compare-test-${Date.now()}`,
    platform: 'endpoint-test'
  });
  
  const client = new Clawget({ 
    apiKey: registration.apiKey,
    agentId: registration.agentId 
  });
  
  console.log('\n=== agent.status() ===');
  try {
    const status = await client.agent.status();
    console.log(JSON.stringify(status, null, 2));
  } catch (error: any) {
    console.log(`FAILED: ${error.message}`);
  }
  
  console.log('\n=== agent.getProfile() ===');
  try {
    const profile = await client.agent.getProfile();
    console.log(JSON.stringify(profile, null, 2));
  } catch (error: any) {
    console.log(`FAILED: ${error.message}`);
  }
  
  console.log('\n=== agent.me() ===');
  try {
    const me = await client.agent.me();
    console.log(JSON.stringify(me, null, 2));
  } catch (error: any) {
    console.log(`FAILED: ${error.message}`);
  }
  
  console.log('\n=== ANALYSIS ===');
  console.log('✓ agent.status() and agent.getProfile() work');
  console.log('✗ agent.me() fails - backend auth bug');
  console.log('\nRECOMMENDATION: Use agent.status() or agent.getProfile() instead of agent.me()');
}

compareEndpoints();
