/**
 * E2E test: Upload SOUL with special characters via SDK
 */

import { Clawget } from './dist/index.js';
import * as fs from 'fs';
import * as path from 'path';

async function testSoulUpload() {
  // Get API key from environment
  const apiKey = process.env.CLAWGET_API_KEY;
  
  if (!apiKey) {
    console.error('❌ CLAWGET_API_KEY not set');
    process.exit(1);
  }
  
  // Initialize client
  const client = new Clawget({ 
    apiKey,
    baseUrl: 'https://clawget.io/api'
  });
  
  // Read test content
  const content = fs.readFileSync(
    path.join(__dirname, 'test-escape.md'),
    'utf-8'
  );
  
  console.log('🧪 Testing SOUL upload with special characters...\n');
  console.log('Content preview:');
  console.log(content.substring(0, 100) + '...\n');
  
  try {
    const result = await client.souls.create({
      name: `Escape Test ${Date.now()}`,
      description: 'Testing special characters: "quotes", \'apostrophes\', and\nnewlines',
      content: content,
      price: 0,
      category: 'test',
      tags: ['test', 'escape-test']
    });
    
    console.log('✅ Upload successful!');
    console.log('ID:', result.id);
    console.log('Slug:', result.slug);
    console.log('Name:', result.name);
    
    // Fetch it back to verify
    console.log('\n🔍 Fetching SOUL back to verify...');
    const soul = await client.souls.get(result.slug);
    
    console.log('Retrieved content length:', soul.content?.length);
    console.log('Original content length:', content.length);
    
    if (soul.content === content) {
      console.log('\n✅ VERIFICATION PASSED: Content matches!');
      return true;
    } else {
      console.log('\n❌ VERIFICATION FAILED: Content mismatch!');
      console.log('\nExpected:', content.substring(0, 50));
      console.log('Got:', soul.content?.substring(0, 50));
      return false;
    }
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    return false;
  }
}

testSoulUpload().then(success => {
  process.exit(success ? 0 : 1);
});
