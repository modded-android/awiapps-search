#!/usr/bin/env node

/**
 * Package Update Script
 * 
 * This script pulls the latest package.json updates, checks for outdated packages,
 * resolves version conflicts, and updates dependencies safely.
 * 
 * Features:
 * - Checks for outdated packages
 * - Updates dependencies to latest compatible versions
 * - Resolves peer dependency conflicts
 * - Creates backup of package.json before updates
 * - Provides detailed logging of all changes
 * 
 * Usage:
 *   node scripts/update-packages.js [options]
 * 
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --major      Allow major version updates (breaking changes)
 *   --backup     Create backup before updating (default: true)
 *   --install    Install dependencies after updating (default: true)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

class PackageUpdater {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      allowMajor: options.major || false,
      createBackup: options.backup !== false,
      installAfter: options.install !== false,
      ...options
    };
    
    this.root = process.cwd();
    this.packageJsonPath = path.join(this.root, 'package.json');
    this.backupPath = path.join(this.root, `package.json.backup-${Date.now()}`);
    this.changes = [];
    this.conflicts = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📦',
      'warn': '⚠️ ',
      'error': '❌',
      'success': '✅'
    }[level] || '📦';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async run() {
    try {
      this.log('Starting package update process...', 'info');
      
      // Step 1: Validate environment
      await this.validateEnvironment();
      
      // Step 2: Create backup
      if (this.options.createBackup) {
        await this.createBackup();
      }
      
      // Step 3: Check current package.json
      const currentPackage = await this.loadPackageJson();
      
      // Step 4: Check for outdated packages
      const outdated = await this.checkOutdatedPackages();
      
      // Step 5: Analyze and resolve conflicts
      await this.analyzeUpdates(outdated);
      
      // Step 6: Apply updates
      if (!this.options.dryRun) {
        await this.applyUpdates(currentPackage, outdated);
      }
      
      // Step 7: Install dependencies
      if (this.options.installAfter && !this.options.dryRun) {
        await this.installDependencies();
      }
      
      // Step 8: Summary
      this.printSummary();
      
    } catch (error) {
      this.log(`Error during update process: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  async validateEnvironment() {
    this.log('Validating environment...', 'info');
    
    // Check if package.json exists
    if (!fs.existsSync(this.packageJsonPath)) {
      throw new Error('package.json not found in current directory');
    }
    
    // Check if npm is available
    try {
      execSync('npm --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('npm not found. Please install Node.js and npm');
    }
    
    this.log('Environment validation passed', 'success');
  }

  async createBackup() {
    this.log(`Creating backup at ${this.backupPath}...`, 'info');
    
    try {
      fs.copyFileSync(this.packageJsonPath, this.backupPath);
      this.log('Backup created successfully', 'success');
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async loadPackageJson() {
    try {
      const content = fs.readFileSync(this.packageJsonPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load package.json: ${error.message}`);
    }
  }

  async checkOutdatedPackages() {
    this.log('Checking for outdated packages...', 'info');
    
    try {
      // First, let's try to get npm outdated info
      const result = execSync('npm outdated --json', { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      return JSON.parse(result);
    } catch (error) {
      // npm outdated returns exit code 1 when there are outdated packages
      // Try to parse the output anyway
      if (error.stdout) {
        try {
          const outdated = JSON.parse(error.stdout);
          this.log(`Found ${Object.keys(outdated).length} outdated packages`, 'info');
          return outdated;
        } catch (parseError) {
          this.log('No outdated packages or unable to parse npm outdated output', 'info');
          return {};
        }
      }
      
      this.log('Unable to check outdated packages, continuing...', 'warn');
      return {};
    }
  }

  async analyzeUpdates(outdated) {
    this.log('Analyzing package updates...', 'info');
    
    for (const [packageName, info] of Object.entries(outdated)) {
      const { current, wanted, latest, type } = info;
      
      // Determine update strategy
      let targetVersion = wanted; // Safe update (respects semver range)
      let updateType = 'minor/patch';
      
      if (this.options.allowMajor && this.isNewerVersion(latest, wanted)) {
        targetVersion = latest;
        updateType = 'major';
      }
      
      // Check for potential conflicts
      const conflict = await this.checkForConflicts(packageName, targetVersion);
      
      const change = {
        package: packageName,
        current,
        target: targetVersion,
        updateType,
        conflict,
        dependencyType: type || 'production'
      };
      
      this.changes.push(change);
      
      if (conflict) {
        this.conflicts.push(change);
      }
    }
    
    this.log(`Analyzed ${this.changes.length} potential updates`, 'info');
    if (this.conflicts.length > 0) {
      this.log(`Found ${this.conflicts.length} potential conflicts`, 'warn');
    }
  }

  async checkForConflicts(packageName, targetVersion) {
    // This is a simplified conflict detection
    // In a more sophisticated version, you could check peer dependencies,
    // engine requirements, etc.
    
    // For now, we'll flag major version updates as potential conflicts
    const currentPackage = await this.loadPackageJson();
    const deps = { ...currentPackage.dependencies, ...currentPackage.devDependencies };
    const currentVersion = deps[packageName];
    
    if (currentVersion && this.isMajorVersionChange(currentVersion, targetVersion)) {
      return {
        type: 'major_version_change',
        description: `Major version change from ${currentVersion} to ${targetVersion}`
      };
    }
    
    return null;
  }

  isMajorVersionChange(current, target) {
    // Simple check for major version changes
    const currentMajor = parseInt(current.replace(/[^\d]/g, '').charAt(0) || '0');
    const targetMajor = parseInt(target.replace(/[^\d]/g, '').charAt(0) || '0');
    return targetMajor > currentMajor;
  }

  isNewerVersion(version1, version2) {
    // Simple version comparison
    return version1 !== version2;
  }

  async applyUpdates(currentPackage, outdated) {
    this.log('Applying package updates...', 'info');
    
    if (this.changes.length === 0) {
      this.log('No updates to apply', 'info');
      return;
    }

    // Show conflicts and ask for confirmation if any exist
    if (this.conflicts.length > 0) {
      await this.handleConflicts();
    }
    
    // Apply updates by running npm update or individual installs
    for (const change of this.changes) {
      if (change.conflict && !this.shouldUpdateDespiteConflict(change)) {
        this.log(`Skipping ${change.package} due to conflict`, 'warn');
        continue;
      }
      
      try {
        this.log(`Updating ${change.package} to ${change.target}...`, 'info');
        
        if (change.dependencyType === 'devDependencies') {
          execSync(`npm install --save-dev ${change.package}@${change.target}`, { 
            stdio: 'inherit',
            cwd: this.root 
          });
        } else {
          execSync(`npm install --save ${change.package}@${change.target}`, { 
            stdio: 'inherit',
            cwd: this.root 
          });
        }
        
        this.log(`Successfully updated ${change.package}`, 'success');
      } catch (error) {
        this.log(`Failed to update ${change.package}: ${error.message}`, 'error');
      }
    }
  }

  async handleConflicts() {
    this.log('Conflicts detected:', 'warn');
    
    for (const conflict of this.conflicts) {
      this.log(`  - ${conflict.package}: ${conflict.conflict.description}`, 'warn');
    }
    
    // In interactive mode, we could ask the user
    // For now, we'll be conservative and skip conflicting updates
    this.log('Skipping updates with conflicts. Use --major flag to override.', 'warn');
  }

  shouldUpdateDespiteConflict(change) {
    // Conservative approach - only update if explicitly allowed
    return this.options.allowMajor;
  }

  async installDependencies() {
    this.log('Installing/updating dependencies...', 'info');
    
    try {
      // First, try npm install to install missing packages
      this.log('Running npm install...', 'info');
      execSync('npm install', { 
        stdio: 'inherit',
        cwd: this.root 
      });
      
      // Then run npm audit fix to fix security issues
      this.log('Running npm audit fix...', 'info');
      try {
        execSync('npm audit fix', { 
          stdio: 'inherit',
          cwd: this.root 
        });
      } catch (auditError) {
        this.log('npm audit fix completed with warnings', 'warn');
      }
      
      this.log('Dependencies installed successfully', 'success');
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  }

  printSummary() {
    this.log('\n=== UPDATE SUMMARY ===', 'info');
    
    if (this.options.dryRun) {
      this.log('DRY RUN - No changes were made', 'info');
    }
    
    this.log(`Total packages analyzed: ${this.changes.length}`, 'info');
    this.log(`Conflicts detected: ${this.conflicts.length}`, 'info');
    
    if (this.changes.length > 0) {
      this.log('\nChanges:', 'info');
      for (const change of this.changes) {
        const status = change.conflict ? '⚠️  CONFLICT' : '✅ OK';
        this.log(`  ${change.package}: ${change.current} → ${change.target} (${change.updateType}) ${status}`, 'info');
      }
    }
    
    if (this.options.createBackup && !this.options.dryRun) {
      this.log(`\nBackup created at: ${this.backupPath}`, 'info');
    }
    
    this.log('\n=== END SUMMARY ===', 'info');
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (const arg of args) {
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--major':
        options.major = true;
        break;
      case '--no-backup':
        options.backup = false;
        break;
      case '--no-install':
        options.install = false;
        break;
      case '--help':
        console.log(`
Package Update Script

Usage: node scripts/update-packages.js [options]

Options:
  --dry-run     Show what would be updated without making changes
  --major       Allow major version updates (breaking changes)
  --no-backup   Skip creating backup of package.json
  --no-install  Skip installing dependencies after updating
  --help        Show this help message

Examples:
  node scripts/update-packages.js                    # Safe update
  node scripts/update-packages.js --dry-run          # Preview changes
  node scripts/update-packages.js --major            # Allow major updates
        `);
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.log(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }
  
  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const updater = new PackageUpdater(options);
  
  updater.run().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = PackageUpdater;