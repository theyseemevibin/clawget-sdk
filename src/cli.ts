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
  defaults?: {
    search?: { limit?: number; category?: string; };
    install?: { dir?: string; };
  };
}

// Color codes (respect NO_COLOR env)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m'
};

const noColor = process.env.NO_COLOR !== undefined;

function color(text: string, colorCode: string): string {
  if (noColor) return text;
  return `${colorCode}${text}${colors.reset}`;
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

function getClient(requireAuth: boolean = true): Clawget {
  // Precedence: ENV > Config file
  const apiKey = process.env.CLAWGET_API_KEY || loadConfig().apiKey;
  
  if (requireAuth && !apiKey) {
    console.error(color('❌ No API key found', colors.red));
    console.error('\nAuthenticate with:');
    console.error('  clawget auth <your-api-key>');
    console.error('\nOr set environment variable:');
    console.error('  export CLAWGET_API_KEY=sk_...');
    console.error('\nGet your API key at: https://clawget.io/dashboard/api-keys');
    process.exit(1);
  }
  
  return new Clawget({ 
    apiKey: apiKey || '',
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

function handleError(error: any, json: boolean = false): never {
  if (json) {
    console.error(JSON.stringify({
      error: true,
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred'
    }, null, 2));
  } else {
    console.error(color('❌ Error:', colors.red), error.message);
  }
  
  // Exit with appropriate code
  const exitCode = error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' ? 2 : 1;
  process.exit(exitCode);
}

// Command suggestion helper (simple Levenshtein distance)
function suggestCommand(input: string, commands: string[]): string | null {
  function levenshtein(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
  
  let closest = null;
  let minDistance = Infinity;
  
  for (const cmd of commands) {
    const distance = levenshtein(input, cmd);
    if (distance < minDistance && distance <= 2) {
      minDistance = distance;
      closest = cmd;
    }
  }
  
  return closest;
}

const program = new Command();

program
  .name('clawget')
  .description('Clawget CLI - Browse, buy, and manage agent skills')
  .version('1.1.0')
  .option('--json', 'Output in JSON format')
  .configureHelp({
    commandUsage: (cmd) => {
      const usage = cmd.usage();
      return `${usage}\n\nExamples:\n  $ clawget search "automation"\n  $ clawget buy web-scraper-pro --yes\n  $ clawget wallet --json\n\nGet help:\n  $ clawget --help\n  $ clawget <command> --help`;
    }
  });

// Login command (browser-based auth flow)
program
  .command('login')
  .description('Authenticate via browser (recommended)')
  .addHelpText('after', `
Examples:
  $ clawget login

This will:
  1. Open your browser to sign in
  2. Generate a one-time token
  3. Prompt you to paste the token here
  4. Exchange token for an API key

Manual auth:
  $ clawget auth <api-key>  # Use existing API key`)
  .action(async () => {
    try {
      // Dynamic import for 'open' package
      const openModule = await import('open');
      const open = openModule.default || openModule;
      
      console.log(color('🦞 Welcome to Clawget!', colors.blue));
      console.log('\nOpening your browser to authenticate...');
      
      const authUrl = 'https://clawget.io/cli-auth';
      await (open as any)(authUrl);
      
      console.log(color('\n📝 Steps:', colors.dim));
      console.log('  1. Sign in on the web page');
      console.log('  2. Click "Generate CLI Token"');
      console.log('  3. Copy the token');
      console.log('  4. Paste it below\n');
      
      // Prompt for token
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      rl.question(color('Paste your token here: ', colors.blue), async (token) => {
        rl.close();
        
        if (!token || token.trim().length === 0) {
          console.error(color('❌ No token provided', colors.red));
          process.exit(1);
        }
        
        console.log(color('\n🔄 Exchanging token for API key...', colors.dim));
        
        try {
          const response = await fetch('https://clawget.io/api/cli-auth/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.trim() }),
          });
          
          if (!response.ok) {
            const data: any = await response.json();
            throw new Error(data.error || 'Failed to exchange token');
          }
          
          const data: any = await response.json();
          
          // Save API key
          saveConfig({ apiKey: data.apiKey });
          
          console.log(color('\n✅ Authentication successful!', colors.green));
          console.log(`API Key: ${data.apiKey.slice(0, 20)}...`);
          console.log(`Permissions: ${data.permissions}`);
          console.log(`\nSaved to: ${CONFIG_FILE}`);
          
          console.log(color('\n🚀 Try it out:', colors.blue));
          console.log('  $ clawget wallet');
          console.log('  $ clawget search "automation"');
          
        } catch (error: any) {
          console.error(color('\n❌ Authentication failed:', colors.red), error.message);
          console.error('\nTry again:');
          console.error('  $ clawget login');
          process.exit(1);
        }
      });
      
    } catch (error: any) {
      handleError(error);
    }
  });

// Auth command
program
  .command('auth <api-key>')
  .description('Save API key to ~/.clawget/config.json')
  .addHelpText('after', `
Examples:
  $ clawget auth sk_abc123
  $ CLAWGET_API_KEY=sk_abc123 clawget wallet  # Use without saving

Get your API key:
  https://clawget.io/dashboard/api-keys

Recommended:
  $ clawget login  # Interactive browser auth`)
  .action((apiKey: string) => {
    try {
      saveConfig({ apiKey });
      console.log(color('✅ API key saved to', colors.green), CONFIG_FILE);
      console.log('\nTest it:');
      console.log('  $ clawget wallet');
    } catch (error: any) {
      handleError(error);
    }
  });

// Wallet command
program
  .command('wallet')
  .description('Show wallet balance and deposit address')
  .option('--json', 'Output in JSON format')
  .addHelpText('after', `
Examples:
  $ clawget wallet
  $ clawget wallet --json
  $ clawget wallet --json | jq '.balance'`)
  .action(async (options) => {
    try {
      const client = getClient();
      const wallet = await client.wallet.balance();
      
      if (options.json) {
        formatOutput(wallet, true);
      } else {
        console.log(color('💰 Wallet Balance', colors.blue));
        console.log('─────────────────');
        console.log(`Balance: ${color(`${wallet.balance} ${wallet.currency}`, colors.green)}`);
        if (wallet.depositAddress) {
          console.log(`\n📥 Deposit Address`);
          console.log(`   ${wallet.depositAddress}`);
          if (wallet.depositChain) {
            console.log(`   Chain: ${wallet.depositChain}`);
          }
        }
      }
    } catch (error: any) {
      handleError(error, options.json);
    }
  });

// Search command
program
  .command('search <query>')
  .description('Search for skills')
  .option('--json', 'Output in JSON format')
  .option('--category <category>', 'Filter by category')
  .option('--limit <limit>', 'Number of results (default: 10)', '10')
  .addHelpText('after', `
Examples:
  $ clawget search "automation"
  $ clawget search "scraper" --category tools
  $ clawget search "api" --limit 20 --json
  $ clawget search "web" --json | jq '.skills[0]'

Categories:
  automation, tools, integrations, utilities, agents

Related:
  $ clawget buy <skill-id>    Purchase a skill
  $ clawget list              List purchased skills`)
  .action(async (query: string, options) => {
    try {
      const config = loadConfig();
      const limit = parseInt(options.limit) || config.defaults?.search?.limit || 10;
      const category = options.category || config.defaults?.search?.category;
      
      const client = getClient(false); // Search doesn't require auth
      const response = await client.skills.list({
        query,
        category,
        limit
      });
      
      if (options.json) {
        formatOutput(response, true);
      } else {
        console.log(color(`🔍 Search results for "${query}":`, colors.blue));
        console.log('─────────────────────────────────');
        
        if (response.skills.length === 0) {
          console.log(color('No skills found', colors.dim));
          console.log('\nTry:');
          console.log('  - Broader search terms');
          console.log('  - Different category with --category');
        } else {
          response.skills.forEach((skill, i) => {
            const priceStr = Number(skill.price) === 0 ? color('FREE', colors.green) : color(`$${skill.price}`, colors.yellow);
            const stars = '⭐'.repeat(Math.round(skill.rating));
            
            console.log(`\n${i + 1}. ${color(skill.title, colors.green)}`);
            console.log(`   ID: ${color(skill.id, colors.dim)}`);
            console.log(`   Price: ${priceStr} | Category: ${skill.categoryName} | Rating: ${stars} (${skill.rating})`);
            console.log(`   Creator: ${skill.creator}`);
            console.log(`   ${color(skill.description.substring(0, 100), colors.dim)}${skill.description.length > 100 ? '...' : ''}`);
            console.log(`   ${color(`$ clawget buy ${skill.id}`, colors.dim)}`);
          });
          
          console.log(color(`\n📊 Showing ${response.skills.length} of ${response.pagination.total} results`, colors.dim));
          
          if (response.pagination.total > response.skills.length) {
            console.log(color(`    Use --limit ${response.pagination.total} to see all`, colors.dim));
          }
        }
      }
    } catch (error: any) {
      handleError(error, options.json);
    }
  });

// Buy command
program
  .command('buy <skill-id>')
  .description('Purchase a skill')
  .option('--json', 'Output in JSON format')
  .option('--yes, -y', 'Skip confirmation prompt')
  .option('--auto-install', 'Automatically install after purchase')
  .addHelpText('after', `
Examples:
  $ clawget buy web-scraper-pro
  $ clawget buy web-scraper-pro --yes
  $ clawget buy web-scraper-pro --yes --auto-install --json

Related:
  $ clawget search <query>    Find skills to buy
  $ clawget wallet            Check balance
  $ clawget install <skill>   Install after purchase`)
  .action(async (skillId: string, options) => {
    try {
      const client = getClient();
      
      if (!options.json && !options.yes) {
        console.log(color(`💳 Purchasing skill: ${skillId}`, colors.blue));
        console.log('\nConfirm? [y/N] ', { newline: false });
        
        // Simple confirmation (in production, use inquirer for better UX)
        process.stdin.once('data', async (data) => {
          const answer = data.toString().trim().toLowerCase();
          if (answer !== 'y' && answer !== 'yes') {
            console.log(color('❌ Purchase cancelled', colors.yellow));
            process.exit(0);
          }
          
          await executePurchase(skillId, options, client);
        });
        return;
      }
      
      await executePurchase(skillId, options, client);
    } catch (error: any) {
      handleError(error, options.json);
    }
  });

async function executePurchase(skillId: string, options: any, client: Clawget) {
  try {
    if (!options.json) {
      console.log(color('Processing purchase...', colors.dim));
    }
    
    const result = await client.skills.buy({
      skillId,
      autoInstall: options.autoInstall
    });
    
    if (options.json) {
      formatOutput(result, true);
    } else {
      console.log(color('✅ Purchase successful!', colors.green));
      console.log(`Purchase ID: ${result.purchaseId}`);
      console.log(`License Key: ${result.licenseKey}`);
      console.log(`Status: ${result.status}`);
      if (result.message) {
        console.log(`Message: ${result.message}`);
      }
      if (result.installedPath) {
        console.log(color(`\n📦 Installed to: ${result.installedPath}`, colors.green));
      } else {
        console.log(color(`\n💡 Install with: clawget install ${skillId}`, colors.dim));
      }
    }
  } catch (error: any) {
    if (error.message.includes('insufficient balance')) {
      if (!options.json) {
        console.error(color('❌ Insufficient balance', colors.red));
        console.error('\nFund your wallet:');
        console.error('  $ clawget wallet  # Get deposit address');
      }
      process.exit(3);
    }
    handleError(error, options.json);
  }
}

// Install command
program
  .command('install <skill-id>')
  .description('Download and install a purchased skill')
  .option('--json', 'Output in JSON format')
  .option('--dir <directory>', 'Installation directory (default: ./skills)')
  .option('--force, -f', 'Overwrite if already exists')
  .addHelpText('after', `
Examples:
  $ clawget install web-scraper-pro
  $ clawget install web-scraper-pro --dir ./my-skills
  $ clawget install web-scraper-pro --force --json

Related:
  $ clawget buy <skill>       Purchase before installing
  $ clawget list              See all purchased skills`)
  .action(async (skillId: string, options) => {
    try {
      const config = loadConfig();
      const installDir = options.dir || config.defaults?.install?.dir || './skills';
      const client = getClient();
      
      if (!options.json) {
        console.log(color(`📦 Installing skill: ${skillId}...`, colors.blue));
      }
      
      // Get skill details
      const skill = await client.skills.get(skillId);
      
      // Check if already purchased
      const purchases = await client.purchases.list();
      const purchase = purchases.purchases.find(p => p.skill.id === skillId || p.skill.slug === skillId);
      
      if (!purchase) {
        if (options.json) {
          console.error(JSON.stringify({
            error: true,
            code: 'NOT_PURCHASED',
            message: `Skill not purchased: ${skillId}`
          }, null, 2));
        } else {
          console.error(color('❌ Skill not purchased', colors.red));
          console.error(`\nBuy it first:`);
          console.error(`  $ clawget buy ${skillId}`);
        }
        process.exit(4);
      }
      
      // Create installation directory
      const targetDir = path.join(process.cwd(), installDir, skill.slug);
      
      if (fs.existsSync(targetDir) && !options.force) {
        if (options.json) {
          console.error(JSON.stringify({
            error: true,
            code: 'ALREADY_EXISTS',
            message: `Directory already exists: ${targetDir}`
          }, null, 2));
        } else {
          console.error(color('❌ Directory already exists', colors.red));
          console.error(`Path: ${targetDir}`);
          console.error(`\nUse --force to overwrite`);
        }
        process.exit(6);
      }
      
      // Create or clean directory
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true });
      }
      fs.mkdirSync(targetDir, { recursive: true });
      
      // Create SKILL.md with license info
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
      
      fs.writeFileSync(path.join(targetDir, 'SKILL.md'), skillMd);
      
      // Create README
      const readme = `# ${skill.title}

${skill.description}

For full documentation and updates, visit: https://clawget.io/skills/${skill.slug}
`;
      
      fs.writeFileSync(path.join(targetDir, 'README.md'), readme);
      
      if (options.json) {
        formatOutput({
          installed: true,
          path: targetDir,
          skill: skill.title,
          licenseKey: purchase.licenseKey
        }, true);
      } else {
        console.log(color('✅ Skill installed successfully!', colors.green));
        console.log(`📁 Location: ${targetDir}`);
        console.log(`🔑 License: ${purchase.licenseKey || 'N/A'}`);
        console.log(color('\n📝 Next steps:', colors.dim));
        console.log(`   cd ${targetDir}`);
        console.log('   cat SKILL.md');
      }
    } catch (error: any) {
      handleError(error, options.json);
    }
  });

// List purchases command
program
  .command('list')
  .description('List your purchased skills')
  .option('--json', 'Output in JSON format')
  .option('--page <page>', 'Page number (default: 1)', '1')
  .option('--limit <limit>', 'Results per page (default: 20)', '20')
  .addHelpText('after', `
Examples:
  $ clawget list
  $ clawget list --page 2 --limit 50
  $ clawget list --json | jq '.purchases[].skill.name'

Related:
  $ clawget install <skill>   Install a purchased skill
  $ clawget search <query>    Find more skills`)
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
        console.log(color('📚 Your Purchased Skills', colors.blue));
        console.log('─────────────────────────');
        
        if (response.purchases.length === 0) {
          console.log(color('No purchases yet', colors.dim));
          console.log('\nBrowse skills:');
          console.log('  $ clawget search "automation"');
        } else {
          response.purchases.forEach((purchase, i) => {
            const priceStr = purchase.amount === 0 ? color('FREE', colors.green) : color(`$${purchase.amount}`, colors.yellow);
            const statusColor = purchase.status === 'completed' ? colors.green : colors.yellow;
            
            console.log(`\n${i + 1}. ${color(purchase.skill.name, colors.green)}`);
            console.log(`   ID: ${color(purchase.skill.id, colors.dim)}`);
            console.log(`   Price: ${priceStr} | Status: ${color(purchase.status, statusColor)}`);
            console.log(`   Purchased: ${new Date(purchase.purchasedAt).toLocaleDateString()}`);
            if (purchase.licenseKey) {
              console.log(`   License: ${purchase.licenseKey}`);
            }
            console.log(`   ${color(`$ clawget install ${purchase.skill.id}`, colors.dim)}`);
          });
          
          console.log(color(`\n📊 Showing ${response.purchases.length} of ${response.pagination.total} purchases`, colors.dim));
          
          if (response.pagination.hasMore) {
            console.log(color(`    Next page: clawget list --page ${response.pagination.page + 1}`, colors.dim));
          }
        }
      }
    } catch (error: any) {
      handleError(error, options.json);
    }
  });

// Publish command
program
  .command('publish <path>')
  .description('Publish a skill to the marketplace')
  .option('--json', 'Output in JSON format')
  .option('--price <price>', 'Skill price (default: 0 for free)')
  .option('--category <category>', 'Category name or ID')
  .addHelpText('after', `
Examples:
  $ clawget publish ./my-skill/
  $ clawget publish ./my-skill/ --price 9.99
  $ clawget publish ./my-skill/ --price 0 --category automation
  $ clawget publish ./my-skill/ --json

Required files in skill directory:
  - SKILL.md    (Documentation with title and description)

Get started:
  https://clawget.io/docs/publishing`)
  .action(async (skillPath: string, options) => {
    try {
      const client = getClient();
      
      // Read SKILL.md from the path
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      
      if (!fs.existsSync(skillMdPath)) {
        if (options.json) {
          console.error(JSON.stringify({
            error: true,
            code: 'MISSING_FILES',
            message: `SKILL.md not found in ${skillPath}`
          }, null, 2));
        } else {
          console.error(color('❌ SKILL.md not found', colors.red));
          console.error(`Path: ${skillMdPath}`);
          console.error('\nCreate a SKILL.md file with:');
          console.error('  # Skill Title');
          console.error('  ## Description');
          console.error('  Your skill description here...');
        }
        process.exit(9);
      }
      
      const skillMd = fs.readFileSync(skillMdPath, 'utf-8');
      
      // Parse SKILL.md for metadata
      const titleMatch = skillMd.match(/^#\s+(.+)$/m);
      const descMatch = skillMd.match(/^##\s+Description\s*\n+([\s\S]+?)(?=\n##|\n$)/m);
      
      if (!titleMatch) {
        if (options.json) {
          console.error(JSON.stringify({
            error: true,
            code: 'INVALID_MANIFEST',
            message: 'Could not find skill title in SKILL.md (should start with # Title)'
          }, null, 2));
        } else {
          console.error(color('❌ Could not find skill title', colors.red));
          console.error('SKILL.md should start with: # Your Skill Title');
        }
        process.exit(8);
      }
      
      const title = titleMatch[1].trim();
      const description = descMatch ? descMatch[1].trim() : 'No description provided';
      const price = options.price ? parseFloat(options.price) : 0;
      
      if (!options.json) {
        console.log(color(`📤 Publishing skill: ${title}...`, colors.blue));
      }
      
      const result = await client.skills.create({
        name: title,
        description,
        price,
        category: options.category || 'automation'
      });
      
      if (options.json) {
        formatOutput(result, true);
      } else {
        console.log(color('✅ Skill published successfully!', colors.green));
        console.log(`ID: ${result.id}`);
        console.log(`Slug: ${result.slug}`);
        console.log(`Title: ${result.title}`);
        console.log(`Price: ${result.price} ${result.currency}`);
        console.log(`Status: ${result.status}`);
        console.log(color(`\n🌐 View at: https://clawget.io/skills/${result.slug}`, colors.blue));
      }
    } catch (error: any) {
      handleError(error, options.json);
    }
  });

// Handle unknown commands with suggestions
program.on('command:*', (operands) => {
  const unknownCommand = operands[0];
  const availableCommands = program.commands.map(cmd => cmd.name());
  
  console.error(color(`❌ Unknown command: ${unknownCommand}`, colors.red));
  
  const suggestion = suggestCommand(unknownCommand, availableCommands);
  if (suggestion) {
    console.error(color(`\nDid you mean:`, colors.yellow));
    console.error(`  clawget ${suggestion}`);
  }
  
  console.error('\nAvailable commands:');
  availableCommands.forEach(cmd => {
    console.error(`  ${cmd}`);
  });
  console.error('\nRun "clawget --help" for more information');
  
  process.exit(1);
});

program.parse();
