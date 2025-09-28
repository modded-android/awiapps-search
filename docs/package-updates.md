# Package Update Script

This script helps maintain your project's dependencies by checking for updates, resolving conflicts, and keeping packages current.

## Usage

### Via npm scripts (recommended):

```bash
# Safe update - only minor and patch updates
npm run update-packages

# Preview what would be updated without making changes
npm run update-packages:dry-run

# Allow major version updates (breaking changes)
npm run update-packages:major
```

### Direct script execution:

```bash
# Basic usage
node scripts/update-packages.js

# Show help
node scripts/update-packages.js --help

# Dry run (preview changes)
node scripts/update-packages.js --dry-run

# Allow major version updates
node scripts/update-packages.js --major

# Skip backup creation
node scripts/update-packages.js --no-backup

# Skip dependency installation after updates
node scripts/update-packages.js --no-install
```

## Features

- ✅ **Safe Updates**: By default, only installs minor and patch updates that respect semver ranges
- 🔍 **Conflict Detection**: Identifies potential version conflicts and breaking changes
- 💾 **Automatic Backup**: Creates a timestamped backup of package.json before making changes
- 🔧 **Dependency Resolution**: Automatically installs missing dependencies and runs npm audit fix
- 📊 **Detailed Logging**: Provides comprehensive feedback on all changes made
- 🚀 **Dry Run Mode**: Preview changes before applying them

## How It Works

1. **Validation**: Checks that npm is available and package.json exists
2. **Backup**: Creates a timestamped backup of your current package.json
3. **Analysis**: Uses `npm outdated` to find packages that can be updated
4. **Conflict Check**: Analyzes potential version conflicts and breaking changes
5. **Updates**: Applies updates safely, respecting semver ranges unless `--major` is used
6. **Installation**: Runs `npm install` and `npm audit fix` to ensure everything works
7. **Summary**: Provides a detailed report of all changes made

## Safety Features

- Creates automatic backups before making any changes
- Conservative update strategy (minor/patch only by default)
- Detailed logging of all operations
- Dry-run mode to preview changes
- Graceful error handling and rollback capabilities

## Examples

```bash
# Check what would be updated
npm run update-packages:dry-run

# Update safely (recommended)
npm run update-packages

# Update everything including major versions (use with caution)
npm run update-packages:major
```

## Backup Recovery

If something goes wrong, you can restore from the backup:

```bash
# Find your backup (they're timestamped)
ls -la package.json.backup-*

# Restore from backup
cp package.json.backup-1234567890123 package.json

# Reinstall from restored package.json
npm install
```