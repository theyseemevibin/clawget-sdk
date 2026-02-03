# Clawget CLI Specification

> CLI for the Clawget skill marketplace — buy, sell, and manage AI agent skills.

## Design Philosophy

The CLI serves two distinct users:
1. **Humans** — interactive terminal use with colored output, progress indicators, helpful prompts
2. **Agents** — programmatic use with `--json` flag for machine-parseable output, predictable exit codes

Every command MUST work well for both.

---

## Installation

```bash
npm install -g @clawget/sdk
```

This installs the `clawget` binary globally.

---

## Global Options

| Flag | Description |
|------|-------------|
| `--json` | Output JSON instead of human-readable text |
| `--quiet`, `-q` | Suppress non-essential output |
| `--config <path>` | Use alternate config file (default: `~/.clawget/config.json`) |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |

---

## Commands

### `clawget auth`

Authenticate with the Clawget marketplace.

```bash
# Interactive (prompts for API key)
clawget auth

# Non-interactive (for agents/scripts)
clawget auth --key <api-key>

# Using environment variable
CLAWGET_API_KEY=sk_xxx clawget auth --from-env
```

**Options:**
| Flag | Description |
|------|-------------|
| `--key <key>` | API key (non-interactive) |
| `--from-env` | Read from `CLAWGET_API_KEY` environment variable |

**Config File:** `~/.clawget/config.json`
```json
{
  "apiKey": "sk_xxx",
  "savedAt": "2025-02-03T12:00:00Z"
}
```

**Output (human):**
```
✓ Authenticated as james@example.com
  Config saved to ~/.clawget/config.json
```

**Output (--json):**
```json
{
  "success": true,
  "email": "james@example.com",
  "configPath": "/Users/james/.clawget/config.json"
}
```

**Exit Codes:**
- `0` — Success
- `1` — Invalid API key
- `2` — Network error

---

### `clawget wallet`

Show wallet balance and deposit address.

```bash
clawget wallet
```

**Output (human):**
```
💰 Wallet Balance
   Available: $42.50 USD
   Pending:   $5.00 USD

📥 Deposit Address
   Bitcoin:  bc1q...xyz
   Ethereum: 0x...abc
   
   Or top up at: https://clawget.com/wallet/deposit
```

**Output (--json):**
```json
{
  "balance": {
    "available": 42.50,
    "pending": 5.00,
    "currency": "USD"
  },
  "depositAddresses": {
    "bitcoin": "bc1q...xyz",
    "ethereum": "0x...abc"
  },
  "depositUrl": "https://clawget.com/wallet/deposit"
}
```

**Exit Codes:**
- `0` — Success
- `1` — Not authenticated
- `2` — Network error

---

### `clawget search <query>`

Search the skill marketplace.

```bash
# Basic search
clawget search "web scraper"

# With filters
clawget search "automation" --category tools --max-price 10

# Show more results
clawget search "data" --limit 20
```

**Options:**
| Flag | Description |
|------|-------------|
| `--category <cat>` | Filter by category (tools, integrations, utilities, agents) |
| `--max-price <n>` | Maximum price in USD |
| `--min-price <n>` | Minimum price in USD |
| `--sort <field>` | Sort by: `relevance` (default), `price`, `downloads`, `rating` |
| `--limit <n>` | Number of results (default: 10, max: 50) |
| `--offset <n>` | Pagination offset |

**Output (human):**
```
Found 23 skills matching "web scraper"

  web-scraper-pro (by @devmaster)           $4.99
  ├─ Advanced web scraping with JS rendering
  ├─ ★★★★★ (4.8) · 1.2k downloads
  └─ clawget buy web-scraper-pro

  simple-fetch (by @toolsmith)              FREE
  ├─ Lightweight HTTP fetcher for agents
  ├─ ★★★★☆ (4.2) · 3.4k downloads
  └─ clawget buy simple-fetch

  ... (21 more)

Use --limit to see more results.
```

**Output (--json):**
```json
{
  "query": "web scraper",
  "total": 23,
  "limit": 10,
  "offset": 0,
  "results": [
    {
      "id": "web-scraper-pro",
      "name": "Web Scraper Pro",
      "author": "devmaster",
      "description": "Advanced web scraping with JS rendering",
      "price": 4.99,
      "currency": "USD",
      "rating": 4.8,
      "downloads": 1200,
      "category": "tools",
      "tags": ["scraping", "web", "automation"]
    }
  ]
}
```

**Exit Codes:**
- `0` — Success (even if no results)
- `1` — Not authenticated
- `2` — Network error
- `3` — Invalid filter value

---

### `clawget buy <skill-id>`

Purchase a skill from the marketplace.

```bash
# Interactive (confirms purchase)
clawget buy web-scraper-pro

# Non-interactive (for agents)
clawget buy web-scraper-pro --yes
```

**Options:**
| Flag | Description |
|------|-------------|
| `--yes`, `-y` | Skip confirmation prompt |
| `--install` | Install immediately after purchase |
| `--install-path <path>` | Custom install location (default: `./skills/`) |

**Output (human):**
```
Purchasing: Web Scraper Pro by @devmaster
Price: $4.99 USD

Your balance: $42.50 → $37.51

Confirm purchase? [y/N] y

✓ Purchased web-scraper-pro
  Run `clawget install web-scraper-pro` to download
```

**Output (--json):**
```json
{
  "success": true,
  "skillId": "web-scraper-pro",
  "price": 4.99,
  "newBalance": 37.51,
  "purchasedAt": "2025-02-03T12:00:00Z"
}
```

**Exit Codes:**
- `0` — Success
- `1` — Not authenticated
- `2` — Network error
- `3` — Insufficient balance
- `4` — Skill not found
- `5` — Already owned

---

### `clawget install <skill-id>`

Download a purchased skill to local directory.

```bash
# Install to ./skills/
clawget install web-scraper-pro

# Custom path
clawget install web-scraper-pro --path ./my-skills/

# Force overwrite existing
clawget install web-scraper-pro --force
```

**Options:**
| Flag | Description |
|------|-------------|
| `--path <dir>` | Install directory (default: `./skills/`) |
| `--force`, `-f` | Overwrite if already exists |

**Installed Structure:**
```
./skills/
└── web-scraper-pro/
    ├── SKILL.md          # Skill documentation
    ├── skill.json        # Skill manifest
    ├── index.js          # Entry point
    └── ...               # Additional files
```

**Output (human):**
```
Installing web-scraper-pro...
  Downloading... done (24 KB)
  Extracting... done

✓ Installed to ./skills/web-scraper-pro/

  Read ./skills/web-scraper-pro/SKILL.md for usage instructions.
```

**Output (--json):**
```json
{
  "success": true,
  "skillId": "web-scraper-pro",
  "installedTo": "./skills/web-scraper-pro",
  "files": ["SKILL.md", "skill.json", "index.js", "lib/scraper.js"],
  "sizeBytes": 24576
}
```

**Exit Codes:**
- `0` — Success
- `1` — Not authenticated
- `2` — Network error
- `4` — Skill not found / not purchased
- `6` — Already exists (use --force)
- `7` — Write permission denied

---

### `clawget list`

List your purchased skills.

```bash
# All purchased skills
clawget list

# Filter by installed status
clawget list --installed
clawget list --not-installed
```

**Options:**
| Flag | Description |
|------|-------------|
| `--installed` | Only show installed skills |
| `--not-installed` | Only show not-yet-installed skills |
| `--check-path <dir>` | Check installation status against path (default: `./skills/`) |

**Output (human):**
```
Your Skills (12 total)

  INSTALLED
  ✓ web-scraper-pro      $4.99   ./skills/web-scraper-pro/
  ✓ simple-fetch         FREE    ./skills/simple-fetch/
  
  NOT INSTALLED
  ○ data-transformer     $2.00   clawget install data-transformer
  ○ api-client-gen       $9.99   clawget install api-client-gen

  ... (8 more)
```

**Output (--json):**
```json
{
  "total": 12,
  "skills": [
    {
      "id": "web-scraper-pro",
      "name": "Web Scraper Pro",
      "price": 4.99,
      "purchasedAt": "2025-02-03T12:00:00Z",
      "installed": true,
      "installedPath": "./skills/web-scraper-pro"
    }
  ]
}
```

**Exit Codes:**
- `0` — Success
- `1` — Not authenticated
- `2` — Network error

---

### `clawget publish <path>`

Publish a skill to the marketplace.

```bash
# Publish from directory
clawget publish ./my-skill/

# Set price
clawget publish ./my-skill/ --price 4.99

# Free skill
clawget publish ./my-skill/ --free

# Update existing
clawget publish ./my-skill/ --update
```

**Required Files:**
```
./my-skill/
├── skill.json     # REQUIRED: Manifest with name, description, etc.
├── SKILL.md       # REQUIRED: Documentation
└── ...            # Your skill files
```

**skill.json Schema:**
```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "What this skill does",
  "author": "your-username",
  "category": "tools",
  "tags": ["tag1", "tag2"],
  "main": "index.js",
  "license": "MIT"
}
```

**Options:**
| Flag | Description |
|------|-------------|
| `--price <n>` | Price in USD (0 for free) |
| `--free` | Shorthand for --price 0 |
| `--category <cat>` | Override category from skill.json |
| `--update` | Update existing published skill |
| `--draft` | Publish as draft (not visible in search) |
| `--yes`, `-y` | Skip confirmation |

**Output (human):**
```
Publishing: my-skill v1.0.0

  Files: 5 (12 KB total)
  Price: $4.99 USD
  Category: tools

  This will be visible to all marketplace users.

Confirm? [y/N] y

Uploading... done
Validating... done

✓ Published my-skill v1.0.0
  View at: https://clawget.com/skills/my-skill
```

**Output (--json):**
```json
{
  "success": true,
  "skillId": "my-skill",
  "version": "1.0.0",
  "price": 4.99,
  "url": "https://clawget.com/skills/my-skill",
  "publishedAt": "2025-02-03T12:00:00Z"
}
```

**Exit Codes:**
- `0` — Success
- `1` — Not authenticated
- `2` — Network error
- `8` — Invalid skill.json
- `9` — Missing required files
- `10` — Skill ID already taken (and not yours)
- `11` — Validation failed

---

## Exit Code Reference

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Not authenticated / invalid auth |
| `2` | Network error |
| `3` | Invalid input / bad filter value |
| `4` | Resource not found |
| `5` | Already exists (purchase) |
| `6` | Already exists (file) |
| `7` | Permission denied |
| `8` | Invalid manifest |
| `9` | Missing required files |
| `10` | Name conflict |
| `11` | Validation error |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAWGET_API_KEY` | API key (overrides config file) |
| `CLAWGET_CONFIG` | Config file path |
| `CLAWGET_SKILLS_PATH` | Default install path |
| `NO_COLOR` | Disable colored output |

---

## Agent Integration Patterns

### Programmatic Search & Install

```bash
#!/bin/bash
# Agent script to find and install best-rated tool under $5

SKILL=$(clawget search "automation" \
  --category tools \
  --max-price 5 \
  --sort rating \
  --limit 1 \
  --json | jq -r '.results[0].id')

if [ -n "$SKILL" ] && [ "$SKILL" != "null" ]; then
  clawget buy "$SKILL" --yes --json
  clawget install "$SKILL" --json
fi
```

### Check Balance Before Purchase

```bash
BALANCE=$(clawget wallet --json | jq '.balance.available')
PRICE=$(clawget search "target-skill" --json | jq '.results[0].price')

if (( $(echo "$BALANCE >= $PRICE" | bc -l) )); then
  clawget buy target-skill --yes
fi
```

### Bulk Install Purchased Skills

```bash
clawget list --not-installed --json | \
  jq -r '.skills[].id' | \
  xargs -I {} clawget install {} --force
```

---

## Human UX Guidelines

1. **Colors:** Use ANSI colors for status (green=success, red=error, yellow=warning)
2. **Progress:** Show spinners/progress bars for operations >1s
3. **Confirmations:** Always confirm purchases and publishes unless `--yes`
4. **Helpful errors:** Include fix suggestions in error messages
5. **Examples:** Show example commands in help text

---

## Implementation Notes

### Config Precedence
1. Command-line flags (highest)
2. Environment variables
3. Config file `~/.clawget/config.json`
4. Defaults (lowest)

### JSON Output Contract
- Always valid JSON, even on error
- Error structure: `{"error": true, "code": "AUTH_REQUIRED", "message": "..."}`
- Never mix JSON with human text
- Exit code matches error severity

### Streaming Considerations
For large skill lists or downloads, support:
- `--limit` / `--offset` for pagination
- Progress to stderr (so stdout stays clean for pipes)
