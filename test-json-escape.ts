/**
 * Test JSON escaping for SOUL content
 */

import * as fs from 'fs';
import * as path from 'path';

// Read test file
const content = fs.readFileSync(path.join(__dirname, 'test-escape.md'), 'utf-8');

console.log('=== ORIGINAL CONTENT ===');
console.log(content);
console.log('\n=== AFTER JSON.stringify ===');

const payload = {
  name: 'Escape Test',
  description: 'Testing special characters',
  content: content,
  price: 1.00,
  category: 'test'
};

const jsonString = JSON.stringify(payload);
console.log(jsonString);

console.log('\n=== PARSED BACK ===');
const parsed = JSON.parse(jsonString);
console.log(parsed.content);

console.log('\n=== VERIFICATION ===');
if (parsed.content === content) {
  console.log('✅ Content matches! JSON.stringify properly escaped everything.');
} else {
  console.log('❌ Content mismatch!');
  console.log('Original length:', content.length);
  console.log('Parsed length:', parsed.content.length);
}

// Test what the actual fetch body would be
console.log('\n=== FETCH BODY ===');
console.log('This is what gets sent to the API:');
console.log(jsonString.substring(0, 200) + '...');
