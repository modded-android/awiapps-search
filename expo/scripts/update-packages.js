#!/usr/bin/env node

/**
 * Multi-Environment Package Update Script
 * 
 * This script evaluates the environment and updates dependencies for all supported
 * package managers including JavaScript (npm) and Go modules.
 * 
 * Features:
 * - Multi-environment detection (Node.js, Go, Python, etc.)
 * - Checks for outdated packages across all detected environments
 * - Updates dependencies to latest compatible versions
 * - Resolves version conflicts and dependency issues
 * - Creates backups before updates
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
    this.environments = {};
    this.backups = [];
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
      this.log('Starting multi-environment package update process...', 'info');
      
      // Step 1: Validate and detect environments
      await this.validateEnvironment();
      
      // Step 2: Create backups for all detected environments
      if (this.options.createBackup) {
        await this.createBackups();
      }
      
      // Step 3: Check for outdated packages in all environments
      const allOutdated = await this.checkAllOutdatedPackages();
      
      // Step 4: Analyze and resolve conflicts
      await this.analyzeAllUpdates(allOutdated);
      
      // Step 5: Apply updates
      if (!this.options.dryRun) {
        await this.applyAllUpdates(allOutdated);
      }
      
      // Step 6: Install/update dependencies
      if (this.options.installAfter && !this.options.dryRun) {
        await this.installAllDependencies();
      }
      
      // Step 7: Summary
      this.printSummary();
      
    } catch (error) {
      this.log(`Error during update process: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  async validateEnvironment() {
    this.log('Validating and detecting environments...', 'info');
    
    // Detect available environments
    await this.detectEnvironments();
    
    if (Object.keys(this.environments).length === 0) {
      throw new Error('No supported package managers found');
    }
    
    this.log(`Detected environments: ${Object.keys(this.environments).join(', ')}`, 'success');
  }

  async detectEnvironments() {
    // Check for Node.js/npm
    if (fs.existsSync(this.packageJsonPath)) {
      try {
        execSync('npm --version', { stdio: 'pipe' });
        this.environments.npm = {
          name: 'Node.js (npm)',
          configFile: 'package.json',
          configPath: this.packageJsonPath,
          backupPath: this.backupPath
        };
        this.log('✓ Node.js/npm environment detected', 'info');
      } catch (error) {
        this.log('package.json found but npm not available', 'warn');
      }
    }
    
    // Check for Go modules
    const goModPath = path.join(this.root, 'backend', 'go.mod');
    if (fs.existsSync(goModPath)) {
      try {
        execSync('go version', { stdio: 'pipe' });
        this.environments.go = {
          name: 'Go Modules',
          configFile: 'go.mod',
          configPath: goModPath,
          backupPath: goModPath + `.backup-${Date.now()}`,
          workingDir: path.join(this.root, 'backend')
        };
        this.log('✓ Go modules environment detected', 'info');
      } catch (error) {
        this.log('go.mod found but go not available', 'warn');
      }
    }
    
    // Check for Python (requirements.txt or pyproject.toml)
    const requirementsPaths = [
      'requirements.txt',
      'requirements-dev.txt', 
      'pyproject.toml',
      'Pipfile'
    ];
    
    for (const reqFile of requirementsPaths) {
      const reqPath = path.join(this.root, reqFile);
      if (fs.existsSync(reqPath)) {
        try {
          execSync('python --version', { stdio: 'pipe' });
          if (!this.environments.python) {
            this.environments.python = {
              name: 'Python',
              configFiles: [],
              workingDir: this.root
            };
          }
          this.environments.python.configFiles.push({
            name: reqFile,
            path: reqPath,
            backupPath: reqPath + `.backup-${Date.now()}`
          });
          this.log(`✓ Python environment detected (${reqFile})`, 'info');
        } catch (error) {
          this.log(`${reqFile} found but python not available`, 'warn');
        }
        break; // Only detect once for Python
      }
    }
  }

  async createBackups() {
    this.log('Creating backups for all environments...', 'info');
    
    for (const [envName, envConfig] of Object.entries(this.environments)) {
      try {
        if (envName === 'npm' && fs.existsSync(envConfig.configPath)) {
          fs.copyFileSync(envConfig.configPath, envConfig.backupPath);
          this.backups.push({ env: envName, path: envConfig.backupPath });
          this.log(`✓ Created ${envName} backup`, 'success');
        }
        
        if (envName === 'go' && fs.existsSync(envConfig.configPath)) {
          fs.copyFileSync(envConfig.configPath, envConfig.backupPath);
          const goSumPath = envConfig.configPath.replace('go.mod', 'go.sum');
          if (fs.existsSync(goSumPath)) {
            const goSumBackup = envConfig.backupPath.replace('go.mod', 'go.sum');
            fs.copyFileSync(goSumPath, goSumBackup);
            this.backups.push({ env: envName, path: envConfig.backupPath });
            this.backups.push({ env: envName, path: goSumBackup });
          }
          this.log(`✓ Created ${envName} backup`, 'success');
        }
        
        if (envName === 'python') {
          for (const configFile of envConfig.configFiles) {
            if (fs.existsSync(configFile.path)) {
              fs.copyFileSync(configFile.path, configFile.backupPath);
              this.backups.push({ env: envName, path: configFile.backupPath });
            }
          }
          this.log(`✓ Created ${envName} backup`, 'success');
        }
      } catch (error) {
        this.log(`Failed to create backup for ${envName}: ${error.message}`, 'error');
      }
    }
  }

  async checkAllOutdatedPackages() {
    this.log('Checking for outdated packages in all environments...', 'info');
    
    const allOutdated = {};
    
    for (const [envName, envConfig] of Object.entries(this.environments)) {
      try {
        if (envName === 'npm') {
          allOutdated.npm = await this.checkOutdatedPackages();
        } else if (envName === 'go') {
          allOutdated.go = await this.checkOutdatedGoModules(envConfig);
        } else if (envName === 'python') {
          allOutdated.python = await this.checkOutdatedPythonPackages(envConfig);
        }
      } catch (error) {
        this.log(`Failed to check outdated packages for ${envName}: ${error.message}`, 'warn');
        allOutdated[envName] = {};
      }
    }
    
    return allOutdated;
  }

  async checkOutdatedGoModules(envConfig) {
    this.log('Checking Go modules for updates...', 'info');
    
    try {
      const result = execSync('go list -u -m all', {
        stdio: 'pipe',
        encoding: 'utf8',
        cwd: envConfig.workingDir
      });
      
      const lines = result.split('\n').filter(line => line.trim());
      const outdated = {};
      
      for (const line of lines) {
        // Parse lines like: "github.com/gin-gonic/gin v1.9.1 [v1.10.0]"
        const match = line.match(/^(.+?)\s+v(\S+)\s+\[v(\S+)\]$/);
        if (match) {
          const [, moduleName, currentVersion, latestVersion] = match;
          if (currentVersion !== latestVersion) {
            outdated[moduleName] = {
              current: currentVersion,
              wanted: latestVersion,
              latest: latestVersion,
              type: 'production'
            };
          }
        }
      }
      
      this.log(`Found ${Object.keys(outdated).length} outdated Go modules`, 'info');
      return outdated;
    } catch (error) {
      this.log('No outdated Go modules or unable to check', 'info');
      return {};
    }
  }

  async checkOutdatedPythonPackages(envConfig) {
    this.log('Checking Python packages for updates...', 'info');
    
    try {
      // Try pip list --outdated if pip is available
      const result = execSync('pip list --outdated --format=json', {
        stdio: 'pipe',
        encoding: 'utf8',
        cwd: envConfig.workingDir
      });
      
      const outdatedList = JSON.parse(result);
      const outdated = {};
      
      for (const pkg of outdatedList) {
        outdated[pkg.name] = {
          current: pkg.version,
          wanted: pkg.latest_version,
          latest: pkg.latest_version,
          type: 'production'
        };
      }
      
      this.log(`Found ${Object.keys(outdated).length} outdated Python packages`, 'info');
      return outdated;
    } catch (error) {
      this.log('No outdated Python packages or unable to check', 'info');
      return {};
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

  async analyzeAllUpdates(allOutdated) {
    this.log('Analyzing package updates for all environments...', 'info');
    
    for (const [envName, outdated] of Object.entries(allOutdated)) {
      if (Object.keys(outdated).length === 0) continue;
      
      this.log(`Analyzing ${envName} packages...`, 'info');
      
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
        const conflict = await this.checkForConflicts(packageName, targetVersion, envName);
        
        const change = {
          environment: envName,
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
    }
    
    this.log(`Analyzed ${this.changes.length} potential updates across all environments`, 'info');
    if (this.conflicts.length > 0) {
      this.log(`Found ${this.conflicts.length} potential conflicts`, 'warn');
    }
  }

  async analyzeUpdates(outdated) {
    // Legacy method for backwards compatibility
    return this.analyzeAllUpdates({ npm: outdated });
  }

  async checkForConflicts(packageName, targetVersion, environment = 'npm') {
    // This is a simplified conflict detection
    // In a more sophisticated version, you could check peer dependencies,
    // engine requirements, etc.
    
    if (environment === 'npm') {
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
    } else if (environment === 'go') {
      // For Go modules, major version changes are handled differently
      // v2+ modules should have different import paths
      if (this.isMajorVersionChange(targetVersion, targetVersion)) {
        return {
          type: 'go_major_version_change',
          description: `Go major version change may require import path changes`
        };
      }
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

  async applyAllUpdates(allOutdated) {
    this.log('Applying package updates for all environments...', 'info');
    
    if (this.changes.length === 0) {
      this.log('No updates to apply', 'info');
      return;
    }

    // Show conflicts and ask for confirmation if any exist
    if (this.conflicts.length > 0) {
      await this.handleConflicts();
    }
    
    // Group changes by environment
    const changesByEnv = {};
    for (const change of this.changes) {
      if (!changesByEnv[change.environment]) {
        changesByEnv[change.environment] = [];
      }
      changesByEnv[change.environment].push(change);
    }
    
    // Apply updates for each environment
    for (const [envName, changes] of Object.entries(changesByEnv)) {
      if (envName === 'npm') {
        await this.applyNpmUpdates(changes);
      } else if (envName === 'go') {
        await this.applyGoUpdates(changes);
      } else if (envName === 'python') {
        await this.applyPythonUpdates(changes);
      }
    }
  }

  async applyNpmUpdates(changes) {
    for (const change of changes) {
      if (change.conflict && !this.shouldUpdateDespiteConflict(change)) {
        this.log(`Skipping ${change.package} due to conflict`, 'warn');
        continue;
      }
      
      try {
        this.log(`Updating npm package ${change.package} to ${change.target}...`, 'info');
        
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
        
        this.log(`✓ Successfully updated ${change.package}`, 'success');
      } catch (error) {
        this.log(`Failed to update ${change.package}: ${error.message}`, 'error');
      }
    }
  }

  async applyGoUpdates(changes) {
    const goEnv = this.environments.go;
    
    for (const change of changes) {
      if (change.conflict && !this.shouldUpdateDespiteConflict(change)) {
        this.log(`Skipping ${change.package} due to conflict`, 'warn');
        continue;
      }
      
      try {
        this.log(`Updating Go module ${change.package} to v${change.target}...`, 'info');
        
        execSync(`go get ${change.package}@v${change.target}`, {
          stdio: 'inherit',
          cwd: goEnv.workingDir
        });
        
        this.log(`✓ Successfully updated ${change.package}`, 'success');
      } catch (error) {
        this.log(`Failed to update ${change.package}: ${error.message}`, 'error');
      }
    }
    
    // Run go mod tidy to clean up
    try {
      this.log('Running go mod tidy...', 'info');
      execSync('go mod tidy', {
        stdio: 'inherit',
        cwd: goEnv.workingDir
      });
    } catch (error) {
      this.log(`go mod tidy failed: ${error.message}`, 'warn');
    }
  }

  async applyPythonUpdates(changes) {
    for (const change of changes) {
      if (change.conflict && !this.shouldUpdateDespiteConflict(change)) {
        this.log(`Skipping ${change.package} due to conflict`, 'warn');
        continue;
      }
      
      try {
        this.log(`Updating Python package ${change.package} to ${change.target}...`, 'info');
        
        execSync(`pip install --upgrade ${change.package}==${change.target}`, {
          stdio: 'inherit',
          cwd: this.environments.python.workingDir
        });
        
        this.log(`✓ Successfully updated ${change.package}`, 'success');
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

  async installAllDependencies() {
    this.log('Installing/updating dependencies for all environments...', 'info');
    
    for (const [envName, envConfig] of Object.entries(this.environments)) {
      try {
        if (envName === 'npm') {
          await this.installNpmDependencies();
        } else if (envName === 'go') {
          await this.installGoDependencies(envConfig);
        } else if (envName === 'python') {
          await this.installPythonDependencies(envConfig);
        }
      } catch (error) {
        this.log(`Failed to install ${envName} dependencies: ${error.message}`, 'error');
      }
    }
  }

  async installNpmDependencies() {
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
      
      this.log('✓ npm dependencies installed successfully', 'success');
    } catch (error) {
      throw new Error(`Failed to install npm dependencies: ${error.message}`);
    }
  }

  async installGoDependencies(envConfig) {
    try {
      this.log('Running go mod download...', 'info');
      execSync('go mod download', {
        stdio: 'inherit',
        cwd: envConfig.workingDir
      });
      
      this.log('Running go mod tidy...', 'info');
      execSync('go mod tidy', {
        stdio: 'inherit',
        cwd: envConfig.workingDir
      });
      
      this.log('✓ Go dependencies installed successfully', 'success');
    } catch (error) {
      throw new Error(`Failed to install Go dependencies: ${error.message}`);
    }
  }

  async installPythonDependencies(envConfig) {
    try {
      this.log('Installing Python dependencies...', 'info');
      
      for (const configFile of envConfig.configFiles) {
        if (configFile.name === 'requirements.txt') {
          execSync(`pip install -r ${configFile.name}`, {
            stdio: 'inherit',
            cwd: envConfig.workingDir
          });
        } else if (configFile.name === 'pyproject.toml') {
          execSync('pip install -e .', {
            stdio: 'inherit',
            cwd: envConfig.workingDir
          });
        }
      }
      
      this.log('✓ Python dependencies installed successfully', 'success');
    } catch (error) {
      throw new Error(`Failed to install Python dependencies: ${error.message}`);
    }
  }

  // Legacy method for backwards compatibility
  async installDependencies() {
    return this.installAllDependencies();
  }

  // Legacy method for backwards compatibility  
  async applyUpdates(currentPackage, outdated) {
    return this.applyAllUpdates({ npm: outdated });
  }

  printSummary() {
    this.log('\n=== MULTI-ENVIRONMENT UPDATE SUMMARY ===', 'info');
    
    if (this.options.dryRun) {
      this.log('DRY RUN - No changes were made', 'info');
    }
    
    // Summary by environment
    const envSummary = {};
    for (const change of this.changes) {
      if (!envSummary[change.environment]) {
        envSummary[change.environment] = { total: 0, conflicts: 0 };
      }
      envSummary[change.environment].total++;
      if (change.conflict) {
        envSummary[change.environment].conflicts++;
      }
    }
    
    this.log('\nEnvironments detected:', 'info');
    for (const [envName, envConfig] of Object.entries(this.environments)) {
      const summary = envSummary[envName] || { total: 0, conflicts: 0 };
      this.log(`  ${envConfig.name}: ${summary.total} updates, ${summary.conflicts} conflicts`, 'info');
    }
    
    this.log(`\nTotal packages analyzed: ${this.changes.length}`, 'info');
    this.log(`Conflicts detected: ${this.conflicts.length}`, 'info');
    
    if (this.changes.length > 0) {
      this.log('\nChanges by environment:', 'info');
      for (const [envName, changes] of Object.entries(
        this.changes.reduce((acc, change) => {
          if (!acc[change.environment]) acc[change.environment] = [];
          acc[change.environment].push(change);
          return acc;
        }, {})
      )) {
        this.log(`\n  ${envName.toUpperCase()}:`, 'info');
        for (const change of changes) {
          const status = change.conflict ? '⚠️  CONFLICT' : '✅ OK';
          this.log(`    ${change.package}: ${change.current} → ${change.target} (${change.updateType}) ${status}`, 'info');
        }
      }
    }
    
    if (this.backups.length > 0 && !this.options.dryRun) {
      this.log('\nBackups created:', 'info');
      for (const backup of this.backups) {
        this.log(`  ${backup.env}: ${backup.path}`, 'info');
      }
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
Multi-Environment Package Update Script

Updates dependencies across all detected environments:
- Node.js (npm) - package.json 
- Go Modules - go.mod files
- Python - requirements.txt, pyproject.toml, Pipfile

Usage: node scripts/update-packages.js [options]

Options:
  --dry-run     Show what would be updated without making changes
  --major       Allow major version updates (breaking changes)
  --no-backup   Skip creating backups of configuration files
  --no-install  Skip installing dependencies after updating
  --help        Show this help message

Examples:
  node scripts/update-packages.js                    # Safe update (all environments)
  node scripts/update-packages.js --dry-run          # Preview changes (all environments)
  node scripts/update-packages.js --major            # Allow major updates (all environments)
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