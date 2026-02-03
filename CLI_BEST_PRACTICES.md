# CLI Best Practices - Clawget SDK

This document outlines CLI design standards for building intuitive, agent-friendly command-line tools. These practices are implemented in the Clawget CLI and serve as guidelines for extending or integrating with the SDK.

---

## 1. Help System

### Every Command Needs `--help`

Users (human and agent) should never guess what a command does.

```bash
# Global help
clawget --help
clawget -h

# Command-specific help
clawget search --help
clawget buy --help
```

**Requirements:**
- Short description at the top
- List all options with descriptions
- Include practical examples
- Show related commands when relevant

**Example:**
```
$ clawget buy --help

Purchase a skill from the marketplace

Usage: clawget buy <skill-id> [options]

Options:
  --yes, -y           Skip confirmation prompt
  --json              Output in JSON format
  --auto-install      Install immediately after purchase
  --help, -h          Show this help

Examples:
  $ clawget buy web-scraper-pro
  $ clawget buy web-scraper-pro --yes --auto-install
  $ clawget buy web-scraper-pro --json

Related:
  clawget search      Find skills to buy
  clawget install     Download purchased skills
```

### Suggest Similar Commands on Typos

When a user types a command that doesn't exist, help them find what they meant:

```bash
$ clawget serach "automation"
❌ Unknown command: serach

Did you mean:
  clawget search
```

**Implementation tip:** Use Levenshtein distance or simple string matching.

---

## 2. Configuration

### Support Multiple Config Sources

Config should be flexible and follow a clear precedence:

1. **Command-line flags** (highest priority)
2. **Environment variables**
3. **Config file** (`~/.clawget/config.json` or `.clawgetrc`)
4. **Defaults** (lowest priority)

### API Key from Environment

```bash
# Option 1: Environment variable
export CLAWGET_API_KEY=sk_abc123
clawget wallet

# Option 2: Config file
clawget auth sk_abc123  # Saves to ~/.clawget/config.json

# Option 3: Inline flag (for testing)
clawget --api-key sk_abc123 wallet
```

### Config File Format

**`~/.clawget/config.json`:**
```json
{
  "apiKey": "sk_abc123",
  "defaultCategory": "automation",
  "installPath": "./skills",
  "outputFormat": "table"
}
```

**`.clawgetrc` (project-level):**
```json
{
  "installPath": "./my-custom-skills",
  "autoInstall": true
}
```

### Default Values for Common Options

Set sensible defaults so users don't repeat themselves:

```bash
# Without defaults (annoying)
clawget search "automation" --limit 10 --format table

# With defaults (better)
clawget search "automation"  # Defaults: limit=10, format=table
```

Store user preferences in the config file:
```json
{
  "defaults": {
    "search": {
      "limit": 20,
      "sort": "rating"
    },
    "install": {
      "dir": "./agent-skills"
    }
  }
}
```

---

## 3. Output Formats

### Human-Readable by Default

CLIs should assume a human is using them unless told otherwise.

**Use:**
- **Colors** for status (green=success, red=error, yellow=warning)
- **Tables** for structured data
- **Emojis** sparingly for visual anchors (💰 wallet, 📦 install, ❌ error)
- **Progress indicators** for slow operations

**Example (human mode):**
```
$ clawget search "scraper"

🔍 Found 12 skills matching "scraper"

┌────────────────────┬────────┬────────┬─────────┐
│ Name               │ Price  │ Rating │ Creator │
├────────────────────┼────────┼────────┼─────────┤
│ web-scraper-pro    │ $4.99  │ ⭐⭐⭐⭐⭐ │ @dev    │
│ simple-fetch       │ FREE   │ ⭐⭐⭐⭐   │ @tools  │
└────────────────────┴────────┴────────┴─────────┘

💡 Tip: Use --json for machine-readable output
```

### `--json` for Scripting

Agents and scripts need predictable, parseable output.

**Example (JSON mode):**
```bash
$ clawget search "scraper" --json
{
  "query": "scraper",
  "total": 12,
  "results": [
    {
      "id": "web-scraper-pro",
      "name": "Web Scraper Pro",
      "price": 4.99,
      "currency": "USD",
      "rating": 4.8,
      "creator": "dev"
    }
  ]
}
```

**Rules for `--json`:**
- Always valid JSON (even on error)
- Never mix JSON with human text
- Use stderr for progress/warnings, stdout for data
- Include error structure: `{"error": true, "code": "...", "message": "..."}`

### `--quiet` for Minimal Output

When scripts only need the result, not the commentary:

```bash
# Default (verbose)
$ clawget buy web-scraper-pro
💳 Purchasing skill web-scraper-pro...
✅ Purchase successful!
Purchase ID: pur_xyz
License Key: lic_abc

# Quiet mode (just the essentials)
$ clawget buy web-scraper-pro --quiet
pur_xyz

# Quiet + JSON (perfect for scripts)
$ clawget buy web-scraper-pro --quiet --json
{"purchaseId":"pur_xyz","licenseKey":"lic_abc"}
```

### Progress Indicators for Slow Operations

Don't leave users hanging. Show what's happening:

```bash
$ clawget install large-dataset-skill
📦 Installing large-dataset-skill...
   Downloading... ████████████░░░░░░░░ 60% (24MB / 40MB)
```

**Implementation:**
- Use spinners for indeterminate tasks (searching, authenticating)
- Use progress bars for downloads/uploads with known size
- Always write progress to **stderr** so stdout stays clean for piping

---

## 4. Error Handling

### Clear Error Messages

Tell the user:
1. **What went wrong**
2. **Why it happened**
3. **How to fix it**

**Bad:**
```bash
❌ Error: invalid_auth
```

**Good:**
```bash
❌ Authentication failed

The API key is invalid or has expired.

Fix:
  1. Get a new API key: https://clawget.io/dashboard/api-keys
  2. Save it: clawget auth <your-new-key>
  3. Or set environment variable: export CLAWGET_API_KEY=sk_...
```

### Suggest Fixes ("Did you mean...?")

**Command typo:**
```bash
$ clawget serach "automation"
❌ Unknown command: serach

Did you mean:
  clawget search
```

**Option typo:**
```bash
$ clawget search "automation" --limit 10 --categry tools
❌ Unknown option: --categry

Did you mean:
  --category
```

**Missing authentication:**
```bash
$ clawget wallet
❌ No API key found

Run: clawget auth <your-api-key>

Or set environment variable:
  export CLAWGET_API_KEY=sk_...
```

### Exit Codes

Scripts and agents rely on exit codes to know if a command succeeded.

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error / authentication failure |
| `2` | Network error |
| `3` | Invalid input / bad parameters |
| `4` | Resource not found |
| `5` | Already exists (purchase) |
| `6` | Already exists (file conflict) |
| `7` | Permission denied |
| `8` | Invalid manifest/config |
| `9` | Missing required files |
| `10` | Name conflict |
| `11` | Validation error |

**Usage in scripts:**
```bash
#!/bin/bash
clawget buy web-scraper-pro --yes

if [ $? -eq 0 ]; then
  echo "Purchase successful"
elif [ $? -eq 3 ]; then
  echo "Insufficient balance"
elif [ $? -eq 5 ]; then
  echo "Already owned"
else
  echo "Unknown error"
fi
```

---

## 5. Practical Examples

### Quick Start Workflow

Show users the happy path first:

```bash
# 1. Get API key from https://clawget.io/dashboard
# 2. Authenticate
clawget auth sk_abc123

# 3. Check balance
clawget wallet

# 4. Search for skills
clawget search "automation" --category tools

# 5. Buy a skill
clawget buy web-scraper-pro

# 6. Install it
clawget install web-scraper-pro

# 7. Start using it
cd skills/web-scraper-pro/
cat SKILL.md
```

### Agent Integration Examples

**Search and auto-install best tool:**
```bash
SKILL=$(clawget search "scraper" --sort rating --limit 1 --json | \
  jq -r '.results[0].id')

clawget buy "$SKILL" --yes --auto-install
```

**Check balance before purchase:**
```bash
BALANCE=$(clawget wallet --json | jq '.balance')
PRICE=$(clawget search "target-skill" --json | jq '.results[0].price')

if (( $(echo "$BALANCE >= $PRICE" | bc -l) )); then
  clawget buy target-skill --yes
else
  echo "Insufficient balance"
fi
```

**Batch install all purchased skills:**
```bash
clawget list --json | \
  jq -r '.purchases[].skill.id' | \
  xargs -I {} clawget install {}
```

### Power User Shortcuts

**Use config file for common settings:**
```json
{
  "defaults": {
    "search": {
      "limit": 20,
      "category": "automation"
    },
    "install": {
      "dir": "./my-skills"
    }
  }
}
```

**Combine with pipes and jq:**
```bash
# Find top 5 free automation tools
clawget search "automation" --json | \
  jq '[.results[] | select(.price == 0)] | .[0:5]'

# Get all purchased skill IDs
clawget list --json | jq -r '.purchases[].skill.id'
```

---

## 6. Implementation Checklist

When building or extending a CLI, ensure:

### Help & Discovery
- [ ] `--help` / `-h` works globally and per-command
- [ ] Examples included in help text
- [ ] Typo suggestions for unknown commands/options
- [ ] Version flag `--version` / `-v` shows current version

### Configuration
- [ ] API key from env (`CLAWGET_API_KEY`) or config file
- [ ] Config file at `~/.clawget/config.json` (or `XDG_CONFIG_HOME`)
- [ ] `.clawgetrc` support for project-level overrides
- [ ] Clear precedence: CLI flags > env > config > defaults

### Output
- [ ] Human-readable by default (colors, tables, emojis)
- [ ] `--json` flag for machine-parseable output
- [ ] `--quiet` / `-q` for minimal output
- [ ] Progress indicators for operations >1s
- [ ] Respect `NO_COLOR` environment variable

### Error Handling
- [ ] Clear, actionable error messages
- [ ] Suggest fixes or next steps
- [ ] Consistent exit codes
- [ ] JSON errors include `error`, `code`, `message` fields

### Documentation
- [ ] README includes CLI quickstart
- [ ] Examples for common workflows
- [ ] Link to full CLI reference (like `CLI_SPEC.md`)
- [ ] Agent integration patterns documented

---

## 7. Testing Standards

### Test Coverage

Ensure CLI commands work in both modes:

```bash
# Human mode
clawget search "automation"

# Machine mode
clawget search "automation" --json | jq .
```

### Test Exit Codes

```bash
# Success
clawget wallet && echo "Exit: $?"  # Should print 0

# Auth failure
clawget wallet --api-key invalid && echo "Exit: $?"  # Should print 1

# Network error (mock)
clawget search "test" --json  # Should return exit 2 on failure
```

### Test Config Precedence

```bash
# 1. Default
clawget search "test"  # Uses default limit (10)

# 2. Config file
echo '{"defaults":{"search":{"limit":20}}}' > ~/.clawget/config.json
clawget search "test"  # Uses limit from config (20)

# 3. Env variable
export CLAWGET_SEARCH_LIMIT=30
clawget search "test"  # Uses env (30)

# 4. CLI flag (highest)
clawget search "test" --limit 50  # Uses CLI flag (50)
```

---

## 8. Common Pitfalls to Avoid

### ❌ Don't Mix JSON with Human Text

**Bad:**
```bash
$ clawget search "test" --json
Searching for skills...
{"results": [...]}
```

**Good:**
```bash
$ clawget search "test" --json
{"results": [...]}
```

### ❌ Don't Use stdout for Progress When Piping

**Bad:**
```bash
$ clawget list --json | jq .
Loading purchases...
{"purchases": [...]}  # jq will fail parsing this!
```

**Good:**
```bash
$ clawget list --json | jq .
# Progress goes to stderr
{"purchases": [...]}  # Clean JSON to stdout
```

### ❌ Don't Require Config for Read-Only Operations

**Bad:**
```bash
$ clawget search "automation"
❌ No API key found
```

**Good:**
```bash
$ clawget search "automation"
# Works without auth (public browsing)
```

### ❌ Don't Silently Fail

**Bad:**
```bash
$ clawget buy web-scraper-pro
# Command returns exit 0 but nothing happened
```

**Good:**
```bash
$ clawget buy web-scraper-pro
❌ Insufficient balance: $0.00 available, $4.99 required

Fund your wallet:
  clawget wallet  # Get deposit address
```

---

## 9. Resources

### Libraries for Building Better CLIs

- **[Commander.js](https://github.com/tj/commander.js)** - Command parsing (used in Clawget)
- **[Chalk](https://github.com/chalk/chalk)** - Terminal colors
- **[Ora](https://github.com/sindresorhus/ora)** - Spinners and progress
- **[Inquirer](https://github.com/SBoudrias/Inquirer.js)** - Interactive prompts
- **[cli-table3](https://github.com/cli-table/cli-table3)** - ASCII tables
- **[yargs](https://github.com/yargs/yargs)** - Alternative command parser

### Inspiration

Well-designed CLIs to learn from:
- `git` - Clear subcommands, excellent help
- `npm` - Config precedence, sensible defaults
- `docker` - JSON output, exit codes
- `gh` (GitHub CLI) - Interactive + scriptable
- `stripe` - Agent-friendly API client

---

## 10. Summary

**Good CLI design is about empathy.**

- **For humans:** Make it intuitive, helpful, and pleasant to use
- **For agents:** Make it predictable, parseable, and automatable
- **For everyone:** Make errors clear and fixable

Follow these practices and your CLI will be a joy to use, whether it's being run by a human at a terminal or an AI agent in a script.

**The Clawget CLI implements all these practices.** Use it as a reference when extending or building integrations.

---

*Questions or suggestions? Open an issue on [GitHub](https://github.com/theyseemevibin/clawget-sdk) or join our [Discord](https://discord.gg/clawget).*
