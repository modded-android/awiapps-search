# Multi-Environment Package Update Script

This script helps maintain dependencies across all supported environments in your project by checking for updates, resolving conflicts, and keeping packages current.

## Supported Environments

The script automatically detects and updates dependencies for:

- **Node.js (npm)** - Updates packages in `package.json` 
- **Go Modules** - Updates modules in `backend/go.mod`
- **Python** - Updates packages in `requirements.txt`, `pyproject.toml`, or `Pipfile` (when detected)

## Usage

### Via npm scripts (recommended):

```bash
# Safe update - only minor and patch updates (all environments)
npm run update-packages

# Preview what would be updated without making changes (all environments)
npm run update-packages:dry-run

# Allow major version updates - use with caution (all environments)
npm run update-packages:major
```

### Direct script execution:

```bash
# Basic usage - updates all detected environments
node scripts/update-packages.js

# Show help including supported environments
node scripts/update-packages.js --help

# Dry run (preview changes in all environments)
node scripts/update-packages.js --dry-run

# Allow major version updates (all environments)
node scripts/update-packages.js --major

# Skip backup creation
node scripts/update-packages.js --no-backup

# Skip dependency installation after updates
node scripts/update-packages.js --no-install
```

## Features

- ✅ **Multi-Environment Support**: Automatically detects and updates Node.js, Go, and Python dependencies
- ✅ **Safe Updates**: By default, only installs minor and patch updates that respect semver ranges  
- 🔍 **Conflict Detection**: Identifies potential version conflicts and breaking changes across all environments
- 💾 **Automatic Backups**: Creates timestamped backups of all dependency files before making changes
- 🔧 **Dependency Resolution**: Automatically installs missing dependencies and resolves issues
- 📊 **Detailed Logging**: Provides comprehensive feedback on all changes made across environments
- 🚀 **Dry Run Mode**: Preview changes before applying them to any environment

## How It Works

1. **Environment Detection**: Automatically detects available environments (Node.js, Go, Python)
2. **Validation**: Checks that required package managers are available for detected environments
3. **Backup**: Creates timestamped backups of all dependency configuration files
4. **Analysis**: Uses environment-specific tools to find packages that can be updated:
   - `npm outdated` for Node.js packages
   - `go list -u -m all` for Go modules  
   - `pip list --outdated` for Python packages
5. **Conflict Check**: Analyzes potential version conflicts and breaking changes in each environment
6. **Updates**: Applies updates safely across all environments, respecting semver ranges unless `--major` is used
7. **Installation**: Runs environment-specific commands to ensure everything works:
   - `npm install` and `npm audit fix` for Node.js
   - `go mod download` and `go mod tidy` for Go
   - `pip install` for Python requirements
8. **Summary**: Provides a detailed report of all changes made across all environments

## Safety Features

- Creates automatic backups of all dependency files before making any changes
- Conservative update strategy (minor/patch only by default) across all environments
- Detailed logging of all operations in all environments
- Dry-run mode to preview changes across all environments
- Graceful error handling and rollback capabilities for each environment
- Environment-specific conflict detection and resolution

## Examples

```bash
# Check what would be updated across all environments
npm run update-packages:dry-run

# Update safely across all environments (recommended)
npm run update-packages

# Update everything including major versions across all environments (use with caution)
npm run update-packages:major
```

## Backup Recovery

If something goes wrong, you can restore from the appropriate backup:

```bash
# Find your backups (they're timestamped by environment)
ls -la package.json.backup-*     # Node.js backups
ls -la backend/go.mod.backup-*   # Go module backups

# Restore from backup (example for Node.js)
cp package.json.backup-1234567890123 package.json

# Reinstall from restored files
npm install                      # For Node.js
cd backend && go mod download    # For Go modules
```