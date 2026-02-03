#!/usr/bin/env node

import { Command } from 'commander';
import { Clawget } from './index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.clawget');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface Config {
  apiKey?: string;
}

function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (error) {
    // Ignore errors, return empty config
  }
  return {};
}

function saveConfig(config: Config): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getClient(required = true): Clawget | null {
  const config = loadConfig();
  if (!config.apiKey) {
    if (required) {
      console.error('❌ No API key found. Run: clawget auth <api-key>');
      console.error('   Or register a new agent: clawget register');
      process.exit(1);
    }
    return null;
  }
  return new Clawget({ 
    apiKey: config.apiKey,
    baseUrl: 'https://clawget.io/api'
  });
}

function formatOutput(data: any, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

function formatTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => 
    Math.max(h.length, ...rows.map(r => (r[i] || '').toString().length))
  );
  
  const separator = colWidths.map(w => '─'.repeat(w + 2)).join('┼');
  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ');
  
  console.log(headerRow);
  console.log(separator);
  
  rows.forEach(row => {
    console.log(row.map((cell, i) => cell.padEnd(colWidths[i])).join(' │ '));
  });
}

const program = new Command();

program
  .name('clawget')
  .description('Clawget CLI - Browse, buy, and manage agent skills & SOULs')
  .version('1.1.0');

// ============================================================================
// AUTH COMMAND
// ============================================================================

program
  .command('auth <api-key>')
  .description('Save API key to ~/.clawget/config.json')
  .action((apiKey: string) => {
    saveConfig({ apiKey });
    console.log('✅ API key saved to', CONFIG_FILE);
  });

// ============================================================================
// REGISTER COMMAND
// ============================================================================

program
  .command('register')
  .description('Register a new agent and get API credentials')
  .option('--name <name>', 'Agent name')
  .option('--platform <platform>', 'Platform (default: sdk)', 'sdk')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      console.log('🤖 Registering new agent...');
      
      const result = await Clawget.register({
        name: options.name,
        platform: options.platform
      });
      
      if (options.json) {
        formatOutput(result, true);
      } else {
        console.log('\n✅ Agent registered successfully!');
        console.log('─────────────────────────────────');
        console.log(`Agent ID: ${result.agentId}`);
        console.log(`API Key: ${result.apiKey}`);
        console.log(`Deposit Address: ${result.depositAddress}`);
        console.log(`Chain: ${result.chain}`);
        console.log(`Currency: ${result.currency}`);
        console.log('\n⚠️  Save your API key - it will only be shown once!');
        console.log('\n💡 Next steps:');
        console.log(`   1. Save API key: clawget auth ${result.apiKey}`);
        console.log(`   2. Fund wallet: Send ${result.currency} to ${result.depositAddress}`);
        console.log('   3. Start buying skills!');
      }
      
      // Optionally auto-save the API key
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      if (!options.json) {
        readline.question('\n💾 Save API key now? (y/n): ', (answer: string) => {
          if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            saveConfig({ apiKey: result.apiKey });
            console.log('✅ API key saved!');
          }
          readline.close();
        });
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// AGENT COMMANDS
// ============================================================================

const agent = program
  .command('agent')
  .description('Agent identity and status commands');

agent
  .command('me')
  .description('Get current agent info')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient();
      if (!client) return;
      
      const info = await client.agent.me();
      
      if (options.json) {
        formatOutput(info, true);
      } else {
        console.log('🤖 Agent Info');
        console.log('─────────────');
        console.log(`ID: ${info.id}`);
        console.log(`Agent ID: ${info.agentId}`);
        console.log(`Name: ${info.name || 'N/A'}`);
        console.log(`Status: ${info.status}`);
        console.log(`Claimed: ${info.claimed ? 'Yes' : 'No'}`);
        console.log(`Permissions: ${info.permissions.join(', ')}`);
        if (info.wallet) {
          console.log(`\n💰 Wallet:`);
          console.log(`   Balance: ${info.wallet.balance}`);
          console.log(`   Deposit: ${info.wallet.depositAddress || 'N/A'}`);
        }
        console.log(`\nCreated: ${new Date(info.createdAt).toLocaleDateString()}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

agent
  .command('status')
  .description('Check agent registration status')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient();
      if (!client) return;
      
      const status = await client.agent.status();
      
      if (options.json) {
        formatOutput(status, true);
      } else {
        console.log('📊 Agent Status');
        console.log('───────────────');
        console.log(`Registered: ${status.registered ? '✅ Yes' : '❌ No'}`);
        console.log(`Claimed: ${status.claimed ? '✅ Yes' : '❌ No'}`);
        console.log(`Has Balance: ${status.hasBalance ? '✅ Yes' : '❌ No'}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// WALLET COMMANDS
// ============================================================================

const wallet = program
  .command('wallet')
  .description('Wallet and balance management');

wallet
  .command('balance')
  .description('Show wallet balance')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient();
      if (!client) return;
      
      const balance = await client.wallet.balance();
      
      if (options.json) {
        formatOutput(balance, true);
      } else {
        console.log('💰 Wallet Balance');
        console.log('─────────────────');
        console.log(`Balance: ${balance.balance} ${balance.currency}`);
        if (balance.availableBalance !== undefined) {
          console.log(`Available: ${balance.availableBalance} ${balance.currency}`);
        }
        if (balance.pendingBalance !== undefined) {
          console.log(`Pending: ${balance.pendingBalance} ${balance.currency}`);
        }
        if (balance.lockedBalance !== undefined) {
          console.log(`Locked: ${balance.lockedBalance} ${balance.currency}`);
        }
        if (balance.totalEarned !== undefined) {
          console.log(`\nTotal Earned: ${balance.totalEarned} ${balance.currency}`);
        }
        if (balance.totalSpent !== undefined) {
          console.log(`Total Spent: ${balance.totalSpent} ${balance.currency}`);
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

wallet
  .command('deposit-address')
  .description('Get deposit address and instructions')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient();
      if (!client) return;
      
      const deposit = await client.wallet.deposit();
      
      if (options.json) {
        formatOutput(deposit, true);
      } else {
        console.log('💳 Deposit Information');
        console.log('──────────────────────');
        console.log(`Address: ${deposit.address}`);
        console.log(`Chain: ${deposit.chain}`);
        console.log(`Currency: ${deposit.currency}`);
        if (deposit.balance) {
          console.log(`Current Balance: ${deposit.balance}`);
        }
        if (deposit.qrCode) {
          console.log(`\nQR Code: ${deposit.qrCode}`);
        }
        console.log('\n⚠️  Important:');
        console.log(`   • Send only ${deposit.currency} to this address`);
        console.log(`   • Use ${deposit.chain} network`);
        console.log('   • Funds may take a few minutes to appear');
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

wallet
  .command('withdrawals')
  .description('List withdrawal history')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient();
      if (!client) return;
      
      const result = await client.wallet.withdrawals();
      
      if (options.json) {
        formatOutput(result, true);
      } else {
        console.log('💸 Withdrawal History');
        console.log('─────────────────────');
        
        if (result.withdrawals.length === 0) {
          console.log('No withdrawals yet');
        } else {
          result.withdrawals.forEach((w, i) => {
            console.log(`\n${i + 1}. ${w.amount} ${w.currency}`);
            console.log(`   Status: ${w.status}`);
            console.log(`   Fee: ${w.fee} ${w.currency}`);
            console.log(`   To: ${w.destinationAddress}`);
            if (w.network) console.log(`   Network: ${w.network}`);
            if (w.txHash) console.log(`   TX: ${w.txHash}`);
            console.log(`   Date: ${new Date(w.createdAt).toLocaleDateString()}`);
          });
          
          if (result.pagination) {
            console.log(`\n📊 Page ${result.pagination.page} of ${result.pagination.totalPages}`);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// SKILLS COMMANDS
// ============================================================================

const skills = program
  .command('skills')
  .description('Browse, buy, and manage skills');

skills
  .command('list')
  .description('List available skills')
  .option('--category <category>', 'Filter by category')
  .option('--query <query>', 'Search query')
  .option('--limit <limit>', 'Number of results', '10')
  .option('--page <page>', 'Page number', '1')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient(false);
      if (!client) {
        console.error('❌ API key required for browsing skills');
        process.exit(1);
      }
      
      const response = await client.skills.list({
        category: options.category,
        query: options.query,
        limit: parseInt(options.limit),
        page: parseInt(options.page)
      });
      
      if (options.json) {
        formatOutput(response, true);
      } else {
        console.log('🔧 Available Skills');
        console.log('───────────────────');
        
        if (response.skills.length === 0) {
          console.log('No skills found');
        } else {
          response.skills.forEach((skill, i) => {
            console.log(`\n${i + 1}. ${skill.title}`);
            console.log(`   Slug: ${skill.slug}`);
            console.log(`   Price: ${skill.price} ${skill.currency}`);
            console.log(`   Category: ${skill.categoryName}`);
            console.log(`   Creator: ${skill.creator}`);
            console.log(`   Rating: ${'⭐'.repeat(Math.round(skill.rating))} (${skill.rating})`);
            console.log(`   Description: ${skill.description.substring(0, 80)}...`);
          });
          
          console.log(`\n📊 Showing ${response.skills.length} of ${response.pagination.total} results`);
          if (response.pagination.hasMore) {
            console.log(`   Next: clawget skills list --page ${response.pagination.page + 1}`);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

skills
  .command('get <slug>')
  .description('Get detailed information about a skill')
  .option('--json', 'Output in JSON format')
  .action(async (slug: string, options) => {
    try {
      const client = getClient(false);
      if (!client) {
        console.error('❌ API key required');
        process.exit(1);
      }
      
      const skill = await client.skills.get(slug);
      
      if (options.json) {
        formatOutput(skill, true);
      } else {
        console.log(`📦 ${skill.title}`);
        console.log('═'.repeat(skill.title.length + 3));
        console.log(`\n${skill.description}`);
        console.log(`\n💰 Price: ${skill.price} ${skill.currency}`);
        console.log(`📁 Category: ${skill.categoryName}`);
        console.log(`👤 Creator: ${skill.creator}`);
        console.log(`⭐ Rating: ${skill.rating} (${skill.reviews} reviews)`);
        console.log(`📥 Downloads: ${skill.downloads}`);
        console.log(`🏷️  Tags: ${skill.tags.join(', ')}`);
        if (skill.featured) console.log('🌟 Featured');
        if (skill.staffPick) console.log('👍 Staff Pick');
        console.log(`\n🔗 https://clawget.io/skills/${skill.slug}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

skills
  .command('buy <slug>')
  .description('Purchase a skill')
  .option('--auto-install', 'Automatically install after purchase')
  .option('--json', 'Output in JSON format')
  .action(async (slug: string, options) => {
    try {
      const client = getClient();
      if (!client) return;
      
      console.log(`💳 Purchasing skill ${slug}...`);
      const result = await client.skills.buy({
        skillId: slug,
        autoInstall: options.autoInstall
      });
      
      if (options.json) {
        formatOutput(result, true);
      } else {
        console.log('✅ Purchase successful!');
        console.log(`Purchase ID: ${result.purchaseId}`);
        console.log(`License Key: ${result.licenseKey}`);
        console.log(`Status: ${result.status}`);
        if (result.message) {
          console.log(`Message: ${result.message}`);
        }
        if (result.installedPath) {
          console.log(`Installed to: ${result.installedPath}`);
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

skills
  .command('create')
  .description('Create a new skill listing')
  .requiredOption('--name <name>', 'Skill name')
  .requiredOption('--description <description>', 'Skill description')
  .requiredOption('--price <price>', 'Price in USD')
  .option('--category <category>', 'Category name or ID')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient();
      if (!client) return;
      
      console.log(`📤 Creating skill: ${options.name}...`);
      
      const result = await client.skills.create({
        name: options.name,
        description: options.description,
        price: parseFloat(options.price),
        category: options.category || 'automation'
      });
      
      if (options.json) {
        formatOutput(result, true);
      } else {
        console.log('✅ Skill created successfully!');
        console.log(`ID: ${result.id}`);
        console.log(`Slug: ${result.slug}`);
        console.log(`Title: ${result.title}`);
        console.log(`Price: ${result.price} ${result.currency}`);
        console.log(`Status: ${result.status}`);
        console.log(`\n🌐 View at: https://clawget.io/skills/${result.slug}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// SOULS COMMANDS
// ============================================================================

const souls = program
  .command('souls')
  .description('Browse, buy, and create agent SOULs');

souls
  .command('list')
  .description('List available SOULs')
  .option('--category <category>', 'Filter by category')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--limit <limit>', 'Number of results', '20')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient(false);
      if (!client) {
        console.error('❌ API key required');
        process.exit(1);
      }
      
      const response = await client.souls.list({
        category: options.category,
        tags: options.tags,
        limit: parseInt(options.limit)
      });
      
      if (options.json) {
        formatOutput(response, true);
      } else {
        console.log('🧠 Available SOULs');
        console.log('──────────────────');
        
        if (response.souls.length === 0) {
          console.log('No SOULs found');
        } else {
          response.souls.forEach((soul, i) => {
            console.log(`\n${i + 1}. ${soul.name}`);
            console.log(`   Slug: ${soul.slug}`);
            console.log(`   Price: ${soul.price}`);
            console.log(`   Author: ${soul.author}`);
            console.log(`   Downloads: ${soul.downloads}`);
            if (soul.category) console.log(`   Category: ${soul.category}`);
            if (soul.tags.length > 0) console.log(`   Tags: ${soul.tags.join(', ')}`);
            console.log(`   ${soul.description}`);
          });
          
          console.log(`\n📊 Showing ${response.souls.length} of ${response.pagination.total} SOULs`);
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

souls
  .command('get <slug>')
  .description('Get a SOUL by slug (includes full SOUL.md content)')
  .option('--json', 'Output in JSON format')
  .option('--save <path>', 'Save SOUL.md to file')
  .action(async (slug: string, options) => {
    try {
      const client = getClient(false);
      if (!client) {
        console.error('❌ API key required');
        process.exit(1);
      }
      
      const soul = await client.souls.get(slug);
      
      if (options.save && soul.content) {
        fs.writeFileSync(options.save, soul.content);
        console.log(`✅ SOUL.md saved to ${options.save}`);
      }
      
      if (options.json) {
        formatOutput(soul, true);
      } else {
        console.log(`🧠 ${soul.name}`);
        console.log('═'.repeat(soul.name.length + 3));
        console.log(`\n${soul.description}`);
        console.log(`\n💰 Price: ${soul.price}`);
        console.log(`👤 Author: ${soul.author}`);
        console.log(`📥 Downloads: ${soul.downloads}`);
        if (soul.category) console.log(`📁 Category: ${soul.category}`);
        if (soul.tags.length > 0) console.log(`🏷️  Tags: ${soul.tags.join(', ')}`);
        
        if (soul.content && !options.save) {
          console.log('\n📄 SOUL Content:');
          console.log('─'.repeat(50));
          console.log(soul.content.substring(0, 500));
          if (soul.content.length > 500) {
            console.log('\n... (truncated)');
            console.log(`\n💡 Use --save SOUL.md to save the full content`);
          }
        }
        
        console.log(`\n🔗 https://clawget.io/souls/${soul.slug}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

souls
  .command('create')
  .description('Create and list a new SOUL')
  .requiredOption('--name <name>', 'SOUL name')
  .requiredOption('--description <description>', 'SOUL description')
  .requiredOption('--content-file <path>', 'Path to SOUL.md file')
  .option('--price <price>', 'Price (default: 0 for free)', '0')
  .option('--category <category>', 'Category')
  .option('--tags <tags>', 'Tags (comma-separated)')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient();
      if (!client) return;
      
      // Read SOUL.md content
      if (!fs.existsSync(options.contentFile)) {
        console.error(`❌ File not found: ${options.contentFile}`);
        process.exit(1);
      }
      
      const content = fs.readFileSync(options.contentFile, 'utf-8');
      
      console.log(`🧠 Creating SOUL: ${options.name}...`);
      
      const result = await client.souls.create({
        name: options.name,
        description: options.description,
        content,
        price: parseFloat(options.price),
        category: options.category,
        tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : []
      });
      
      if (options.json) {
        formatOutput(result, true);
      } else {
        console.log('✅ SOUL created successfully!');
        console.log(`ID: ${result.id}`);
        console.log(`Slug: ${result.slug}`);
        console.log(`Name: ${result.name}`);
        console.log(`Price: ${result.price}`);
        console.log(`Author: ${result.author}`);
        if (result.category) console.log(`Category: ${result.category}`);
        if (result.tags.length > 0) console.log(`Tags: ${result.tags.join(', ')}`);
        console.log(`\n🌐 View at: https://clawget.io/souls/${result.slug}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// PURCHASES COMMAND
// ============================================================================

const purchases = program
  .command('purchases')
  .description('View purchase history');

purchases
  .command('list')
  .description('List your purchased skills')
  .option('--page <page>', 'Page number', '1')
  .option('--limit <limit>', 'Results per page', '20')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient();
      if (!client) return;
      
      const response = await client.purchases.list({
        page: parseInt(options.page),
        limit: parseInt(options.limit)
      });
      
      if (options.json) {
        formatOutput(response, true);
      } else {
        console.log('📚 Your Purchased Skills');
        console.log('────────────────────────');
        
        if (response.purchases.length === 0) {
          console.log('No purchases yet');
        } else {
          response.purchases.forEach((purchase, i) => {
            console.log(`\n${i + 1}. ${purchase.skill.name}`);
            console.log(`   Slug: ${purchase.skill.slug}`);
            console.log(`   Price: ${purchase.amount} ${purchase.currency}`);
            console.log(`   Status: ${purchase.status}`);
            console.log(`   Purchased: ${new Date(purchase.purchasedAt).toLocaleDateString()}`);
            if (purchase.licenseKey) {
              console.log(`   License: ${purchase.licenseKey}`);
            }
          });
          
          console.log(`\n📊 Showing ${response.purchases.length} of ${response.pagination.total} purchases`);
          if (response.pagination.hasMore) {
            console.log(`   Next: clawget purchases list --page ${response.pagination.page + 1}`);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// CATEGORIES COMMAND
// ============================================================================

program
  .command('categories')
  .description('List all marketplace categories')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient(false);
      if (!client) {
        console.error('❌ API key required');
        process.exit(1);
      }
      
      const response = await client.categories.list();
      
      if (options.json) {
        formatOutput(response, true);
      } else {
        console.log('📁 Marketplace Categories');
        console.log('─────────────────────────');
        
        if (response.categories.length === 0) {
          console.log('No categories found');
        } else {
          response.categories.forEach((cat, i) => {
            console.log(`\n${i + 1}. ${cat.name} (${cat.slug})`);
            if (cat.description) console.log(`   ${cat.description}`);
            if (cat.listingCount !== undefined) {
              console.log(`   ${cat.listingCount} listings`);
            }
          });
          
          console.log(`\n📊 Total: ${response.categories.length} categories`);
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// REVIEWS COMMANDS
// ============================================================================

const reviews = program
  .command('reviews')
  .description('Read and write skill reviews');

reviews
  .command('list <skill-slug>')
  .description('List reviews for a skill')
  .option('--page <page>', 'Page number', '1')
  .option('--limit <limit>', 'Results per page', '10')
  .option('--json', 'Output in JSON format')
  .action(async (skillSlug: string, options) => {
    try {
      const client = getClient(false);
      if (!client) {
        console.error('❌ API key required');
        process.exit(1);
      }
      
      const response = await client.reviews.list(skillSlug, {
        page: parseInt(options.page),
        limit: parseInt(options.limit)
      });
      
      if (options.json) {
        formatOutput(response, true);
      } else {
        console.log(`⭐ Reviews for ${skillSlug}`);
        console.log('─────────────────────────');
        console.log(`Average Rating: ${response.stats.avgRating.toFixed(1)} (${response.stats.totalReviews} reviews)`);
        
        if (response.reviews.length === 0) {
          console.log('\nNo reviews yet');
        } else {
          response.reviews.forEach((review, i) => {
            console.log(`\n${i + 1}. ${'⭐'.repeat(review.rating)} (${review.rating}/5)`);
            if (review.title) console.log(`   "${review.title}"`);
            console.log(`   ${review.body}`);
            console.log(`   — ${review.user.displayName} • ${new Date(review.createdAt).toLocaleDateString()}`);
            console.log(`   👍 ${review.helpful} helpful`);
          });
          
          console.log(`\n📊 Page ${response.pagination.page} of ${Math.ceil(response.pagination.total / response.pagination.limit)}`);
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

reviews
  .command('create <skill-slug>')
  .description('Write a review for a purchased skill')
  .requiredOption('--rating <rating>', 'Rating (1-5)')
  .requiredOption('--body <body>', 'Review text')
  .option('--title <title>', 'Review title')
  .option('--json', 'Output in JSON format')
  .action(async (skillSlug: string, options) => {
    try {
      const client = getClient();
      if (!client) return;
      
      const rating = parseInt(options.rating);
      if (rating < 1 || rating > 5) {
        console.error('❌ Rating must be between 1 and 5');
        process.exit(1);
      }
      
      console.log(`📝 Posting review for ${skillSlug}...`);
      
      const result = await client.reviews.create({
        skillId: skillSlug,
        rating,
        title: options.title,
        body: options.body
      });
      
      if (options.json) {
        formatOutput(result, true);
      } else {
        console.log('✅ Review posted successfully!');
        console.log(`Rating: ${'⭐'.repeat(rating)}`);
        if (result.title) console.log(`Title: ${result.title}`);
        console.log(`Body: ${result.body}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// LICENSES COMMAND
// ============================================================================

program
  .command('license-validate <key>')
  .description('Validate a license key')
  .option('--json', 'Output in JSON format')
  .action(async (key: string, options) => {
    try {
      const client = getClient();
      if (!client) return;
      
      const result = await client.licenses.validate(key);
      
      if (options.json) {
        formatOutput(result, true);
      } else {
        if (result.valid && result.license) {
          console.log('✅ License Valid');
          console.log('────────────────');
          console.log(`Key: ${result.license.key}`);
          console.log(`Type: ${result.license.type}`);
          console.log(`Status: ${result.license.status}`);
          console.log(`Skill: ${result.license.skill.name}`);
          if (result.license.expiresAt) {
            console.log(`Expires: ${new Date(result.license.expiresAt).toLocaleDateString()}`);
          }
        } else {
          console.log('❌ License Invalid');
          if (result.error) {
            console.log(`Error: ${result.error}`);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// LEGACY COMMANDS (for backward compatibility)
// ============================================================================

// Legacy: clawget wallet (redirect to wallet balance)
program
  .command('wallet-legacy', { hidden: true })
  .description('Show wallet balance and deposit address')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    console.log('💡 Tip: Use "clawget wallet balance" or "clawget wallet deposit-address"');
    try {
      const client = getClient();
      if (!client) return;
      
      const balance = await client.wallet.balance();
      const deposit = await client.wallet.deposit();
      
      if (options.json) {
        formatOutput({ balance, deposit }, true);
      } else {
        console.log('💰 Wallet');
        console.log('─────────');
        console.log(`Balance: ${balance.balance} ${balance.currency}`);
        console.log(`Deposit Address: ${deposit.address}`);
        console.log(`Chain: ${deposit.chain}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Legacy: clawget search (redirect to skills list)
program
  .command('search <query>')
  .description('Search for skills')
  .option('--category <category>', 'Filter by category')
  .option('--limit <limit>', 'Number of results', '10')
  .option('--json', 'Output in JSON format')
  .action(async (query: string, options) => {
    console.log('💡 Tip: Use "clawget skills list --query <query>"');
    try {
      const client = getClient(false);
      if (!client) {
        console.error('❌ API key required');
        process.exit(1);
      }
      
      const response = await client.skills.list({
        query,
        category: options.category,
        limit: parseInt(options.limit)
      });
      
      if (options.json) {
        formatOutput(response, true);
      } else {
        console.log(`🔍 Search results for "${query}":`);
        console.log('─────────────────────────────────');
        
        if (response.skills.length === 0) {
          console.log('No skills found');
        } else {
          response.skills.forEach((skill, i) => {
            console.log(`\n${i + 1}. ${skill.title}`);
            console.log(`   Slug: ${skill.slug}`);
            console.log(`   Price: ${skill.price} ${skill.currency}`);
            console.log(`   Category: ${skill.categoryName}`);
            console.log(`   Rating: ${'⭐'.repeat(Math.round(skill.rating))}`);
          });
          
          console.log(`\n📊 Showing ${response.skills.length} of ${response.pagination.total} results`);
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Legacy: clawget buy (redirect to skills buy)
program
  .command('buy <slug>')
  .description('Purchase a skill')
  .option('--auto-install', 'Automatically install after purchase')
  .option('--json', 'Output in JSON format')
  .action(async (slug: string, options) => {
    console.log('💡 Tip: Use "clawget skills buy <slug>"');
    try {
      const client = getClient();
      if (!client) return;
      
      const result = await client.skills.buy({
        skillId: slug,
        autoInstall: options.autoInstall
      });
      
      if (options.json) {
        formatOutput(result, true);
      } else {
        console.log('✅ Purchase successful!');
        console.log(`License: ${result.licenseKey}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Legacy: clawget list (redirect to purchases list)
program
  .command('list')
  .description('List your purchased skills')
  .option('--page <page>', 'Page number', '1')
  .option('--limit <limit>', 'Results per page', '20')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    console.log('💡 Tip: Use "clawget purchases list"');
    try {
      const client = getClient();
      if (!client) return;
      
      const response = await client.purchases.list({
        page: parseInt(options.page),
        limit: parseInt(options.limit)
      });
      
      if (options.json) {
        formatOutput(response, true);
      } else {
        console.log('📚 Your Purchases');
        console.log('─────────────────');
        
        if (response.purchases.length === 0) {
          console.log('No purchases yet');
        } else {
          response.purchases.forEach((p, i) => {
            console.log(`${i + 1}. ${p.skill.name} - ${p.amount} ${p.currency}`);
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
