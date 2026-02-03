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

function getClient(): Clawget {
  const config = loadConfig();
  if (!config.apiKey) {
    console.error('❌ No API key found. Run: clawget auth <api-key>');
    process.exit(1);
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

const program = new Command();

program
  .name('clawget')
  .description('Clawget CLI - Browse, buy, and manage agent skills')
  .version('1.0.0');

// Auth command
program
  .command('auth <api-key>')
  .description('Save API key to ~/.clawget/config.json')
  .action((apiKey: string) => {
    saveConfig({ apiKey });
    console.log('✅ API key saved to', CONFIG_FILE);
  });

// Wallet command
program
  .command('wallet')
  .description('Show wallet balance and deposit address')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const client = getClient();
      const wallet = await client.wallet.balance();
      
      if (options.json) {
        formatOutput(wallet, true);
      } else {
        console.log('💰 Wallet Balance');
        console.log('─────────────────');
        console.log(`Balance: ${wallet.balance} ${wallet.currency}`);
        if (wallet.depositAddress) {
          console.log(`Deposit Address: ${wallet.depositAddress}`);
        }
        if (wallet.depositChain) {
          console.log(`Chain: ${wallet.depositChain}`);
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Search command
program
  .command('search <query>')
  .description('Search for skills')
  .option('--json', 'Output in JSON format')
  .option('--category <category>', 'Filter by category')
  .option('--limit <limit>', 'Number of results', '10')
  .action(async (query: string, options) => {
    try {
      const client = getClient();
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
            console.log(`   ID: ${skill.id}`);
            console.log(`   Price: ${skill.price} ${skill.currency}`);
            console.log(`   Category: ${skill.categoryName}`);
            console.log(`   Creator: ${skill.creator}`);
            console.log(`   Rating: ${'⭐'.repeat(Math.round(skill.rating))} (${skill.rating})`);
            console.log(`   Description: ${skill.description.substring(0, 100)}...`);
          });
          
          console.log(`\n📊 Showing ${response.skills.length} of ${response.pagination.total} results`);
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Buy command
program
  .command('buy <skill-id>')
  .description('Purchase a skill')
  .option('--json', 'Output in JSON format')
  .option('--auto-install', 'Automatically install after purchase')
  .action(async (skillId: string, options) => {
    try {
      const client = getClient();
      
      console.log(`💳 Purchasing skill ${skillId}...`);
      const result = await client.skills.buy({
        skillId,
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

// Install command
program
  .command('install <skill-id>')
  .description('Download and install a purchased skill')
  .option('--json', 'Output in JSON format')
  .option('--dir <directory>', 'Installation directory', './skills')
  .action(async (skillId: string, options) => {
    try {
      const client = getClient();
      
      // First, verify the purchase exists
      console.log(`📦 Installing skill ${skillId}...`);
      
      // Get skill details
      const skill = await client.skills.get(skillId);
      
      // Check if already purchased
      const purchases = await client.purchases.list();
      const purchase = purchases.purchases.find(p => p.skill.id === skillId || p.skill.slug === skillId);
      
      if (!purchase) {
        console.error('❌ Skill not purchased. Buy it first with: clawget buy', skillId);
        process.exit(1);
      }
      
      // Create installation directory
      const installDir = path.join(process.cwd(), options.dir, skill.slug);
      
      if (fs.existsSync(installDir)) {
        console.error(`❌ Directory already exists: ${installDir}`);
        process.exit(1);
      }
      
      fs.mkdirSync(installDir, { recursive: true });
      
      // Create a basic SKILL.md file with license info
      const skillMd = `# ${skill.title}

${skill.description}

## License
- Purchase ID: ${purchase.id}
- License Key: ${purchase.licenseKey || 'N/A'}
- Purchased: ${new Date(purchase.purchasedAt).toLocaleDateString()}

## Details
- Category: ${skill.category}
- Creator: ${skill.creator}
- Rating: ${skill.rating}
- Price: ${skill.price} ${skill.currency}

## Installation
Skill installed via Clawget CLI on ${new Date().toLocaleDateString()}
`;
      
      fs.writeFileSync(path.join(installDir, 'SKILL.md'), skillMd);
      
      // Create a README with basic info
      const readme = `# ${skill.title}

${skill.description}

For full documentation and updates, visit: https://clawget.com/skills/${skill.slug}
`;
      
      fs.writeFileSync(path.join(installDir, 'README.md'), readme);
      
      if (options.json) {
        formatOutput({
          installed: true,
          path: installDir,
          skill: skill.title,
          licenseKey: purchase.licenseKey
        }, true);
      } else {
        console.log('✅ Skill installed successfully!');
        console.log(`📁 Location: ${installDir}`);
        console.log(`🔑 License: ${purchase.licenseKey || 'N/A'}`);
        console.log('\n📝 Next steps:');
        console.log(`   cd ${installDir}`);
        console.log('   cat SKILL.md');
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// List purchases command
program
  .command('list')
  .description('List your purchased skills')
  .option('--json', 'Output in JSON format')
  .option('--page <page>', 'Page number', '1')
  .option('--limit <limit>', 'Results per page', '20')
  .action(async (options) => {
    try {
      const client = getClient();
      const response = await client.purchases.list({
        page: parseInt(options.page),
        limit: parseInt(options.limit)
      });
      
      if (options.json) {
        formatOutput(response, true);
      } else {
        console.log('📚 Your Purchased Skills');
        console.log('─────────────────────────');
        
        if (response.purchases.length === 0) {
          console.log('No purchases yet');
        } else {
          response.purchases.forEach((purchase, i) => {
            console.log(`\n${i + 1}. ${purchase.skill.name}`);
            console.log(`   ID: ${purchase.skill.id}`);
            console.log(`   Price: ${purchase.amount} ${purchase.currency}`);
            console.log(`   Status: ${purchase.status}`);
            console.log(`   Purchased: ${new Date(purchase.purchasedAt).toLocaleDateString()}`);
            if (purchase.licenseKey) {
              console.log(`   License: ${purchase.licenseKey}`);
            }
          });
          
          console.log(`\n📊 Showing ${response.purchases.length} of ${response.pagination.total} purchases`);
          if (response.pagination.hasMore) {
            console.log(`   Next page: clawget list --page ${response.pagination.page + 1}`);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Publish command
program
  .command('publish <path>')
  .description('Publish a skill to the marketplace')
  .option('--json', 'Output in JSON format')
  .option('--price <price>', 'Skill price (default: 0 for free)')
  .option('--category <category>', 'Category name or ID')
  .action(async (skillPath: string, options) => {
    try {
      const client = getClient();
      
      // Read SKILL.md from the path
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      
      if (!fs.existsSync(skillMdPath)) {
        console.error(`❌ SKILL.md not found in ${skillPath}`);
        process.exit(1);
      }
      
      const skillMd = fs.readFileSync(skillMdPath, 'utf-8');
      
      // Parse SKILL.md for metadata (basic parsing)
      const titleMatch = skillMd.match(/^#\s+(.+)$/m);
      const descMatch = skillMd.match(/^##\s+Description\s*\n+([\s\S]+?)(?=\n##|\n$)/m);
      
      if (!titleMatch) {
        console.error('❌ Could not find skill title in SKILL.md (should start with # Title)');
        process.exit(1);
      }
      
      const title = titleMatch[1].trim();
      const description = descMatch ? descMatch[1].trim() : 'No description provided';
      const price = options.price ? parseFloat(options.price) : 0;
      
      console.log(`📤 Publishing skill: ${title}...`);
      
      const result = await client.skills.create({
        name: title,
        description,
        price,
        category: options.category || 'automation'
      });
      
      if (options.json) {
        formatOutput(result, true);
      } else {
        console.log('✅ Skill published successfully!');
        console.log(`ID: ${result.id}`);
        console.log(`Slug: ${result.slug}`);
        console.log(`Title: ${result.title}`);
        console.log(`Price: ${result.price} ${result.currency}`);
        console.log(`Status: ${result.status}`);
        console.log(`\n🌐 View at: https://clawget.com/skills/${result.slug}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
