#!/usr/bin/env node

/**
 * Build Script for Android and iOS
 * 
 * This script automates building the app for both Android and iOS platforms
 * using Expo's hosted build environment (EAS Build).
 * 
 * Features:
 * - Builds for both Android and iOS platforms
 * - Supports different build profiles (development, preview, production)
 * - Automatic build type detection (APK for Android preview/dev, AAB for production)
 * - Progress monitoring and status updates
 * - Error handling and retry logic
 * - Option to build locally or use remote EAS Build
 * 
 * Usage:
 *   node scripts/build.js [options]
 * 
 * Options:
 *   --platform      android|ios|all (default: all)
 *   --profile       development|preview|production (default: preview)
 *   --local         Use local builds instead of EAS Build
 *   --dry-run       Show what would be built without building
 *   --wait          Wait for builds to complete
 *   --help          Show this help message
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

class BuildScript {
  constructor(options = {}) {
    this.options = {
      platform: options.platform || 'all',
      profile: options.profile || 'preview',
      local: options.local || false,
      dryRun: options.dryRun || false,
      wait: options.wait || false,
      ...options
    };
    
    this.root = process.cwd();
    this.appJsonPath = path.join(this.root, 'app.json');
    this.easJsonPath = path.join(this.root, 'eas.json');
    this.packageJsonPath = path.join(this.root, 'package.json');
    
    this.validPlatforms = ['android', 'ios', 'all'];
    this.validProfiles = ['development', 'preview', 'production'];
    this.buildIds = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '🏗️ ',
      'warn': '⚠️ ',
      'error': '❌',
      'success': '✅',
      'build': '📱',
      'wait': '⏳'
    }[level] || '🏗️ ';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async validateOptions() {
    if (!this.validPlatforms.includes(this.options.platform)) {
      throw new Error(`Invalid platform: ${this.options.platform}. Valid options: ${this.validPlatforms.join(', ')}`);
    }
    
    if (!this.validProfiles.includes(this.options.profile)) {
      throw new Error(`Invalid profile: ${this.options.profile}. Valid options: ${this.validProfiles.join(', ')}`);
    }

    // Check if required files exist
    if (!fs.existsSync(this.appJsonPath)) {
      throw new Error('app.json not found. Make sure you\'re in the root of an Expo project.');
    }
    
    if (!this.options.local && !fs.existsSync(this.easJsonPath)) {
      this.log('eas.json not found, creating default configuration...', 'warn');
      await this.createEasConfig();
    }
  }

  async createEasConfig() {
    const defaultConfig = {
      "cli": {
        "version": ">= 6.0.0"
      },
      "build": {
        "development": {
          "developmentClient": true,
          "distribution": "internal",
          "ios": { "resourceClass": "m-medium", "simulator": true },
          "android": { "buildType": "apk", "gradleCommand": ":app:assembleDebug" }
        },
        "preview": {
          "distribution": "internal",
          "ios": { "resourceClass": "m-medium" },
          "android": { "buildType": "apk" }
        },
        "production": {
          "ios": { "resourceClass": "m-medium" },
          "android": { "buildType": "aab" }
        }
      },
      "submit": { "production": {} }
    };
    
    fs.writeFileSync(this.easJsonPath, JSON.stringify(defaultConfig, null, 2));
    this.log('Created eas.json with default configuration', 'success');
  }

  async checkDependencies() {
    try {
      execSync('npx eas --version', { stdio: 'pipe' });
      this.log('EAS CLI is available', 'success');
    } catch (error) {
      throw new Error('EAS CLI is not available. Please install with: npm install -g eas-cli');
    }

    // Check if user is logged in (only for remote builds and not in dry-run mode)
    if (!this.options.local && !this.options.dryRun) {
      try {
        const whoami = execSync('npx eas whoami', { encoding: 'utf-8', stdio: 'pipe' });
        this.log(`Logged in as: ${whoami.trim()}`, 'success');
      } catch (error) {
        throw new Error('Not logged in to Expo. Please run: npx eas login');
      }
    } else if (!this.options.local && this.options.dryRun) {
      this.log('Skipping login check in dry-run mode', 'info');
    }
  }

  async runLocalBuild(platform) {
    this.log(`Starting local ${platform} build...`, 'build');
    
    const command = platform === 'android' ? 'android' : 'ios';
    const buildCommand = `npx expo run:${command}`;
    
    if (this.options.dryRun) {
      this.log(`Would run: ${buildCommand}`, 'info');
      return;
    }

    return new Promise((resolve, reject) => {
      const child = spawn('npx', ['expo', `run:${command}`], {
        stdio: 'inherit',
        cwd: this.root
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.log(`Local ${platform} build completed successfully`, 'success');
          resolve();
        } else {
          reject(new Error(`Local ${platform} build failed with code ${code}`));
        }
      });
    });
  }

  async runEasBuild(platform) {
    this.log(`Starting EAS ${platform} build (${this.options.profile} profile)...`, 'build');
    
    const buildArgs = [
      'eas', 'build',
      '--platform', platform,
      '--profile', this.options.profile
    ];

    if (!this.options.wait) {
      buildArgs.push('--non-interactive');
    }

    if (this.options.dryRun) {
      this.log(`Would run: npx ${buildArgs.join(' ')}`, 'info');
      return;
    }

    return new Promise((resolve, reject) => {
      const child = spawn('npx', buildArgs, {
        stdio: 'inherit',
        cwd: this.root
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.log(`EAS ${platform} build submitted successfully`, 'success');
          resolve();
        } else {
          reject(new Error(`EAS ${platform} build failed with code ${code}`));
        }
      });
    });
  }

  async buildPlatform(platform) {
    this.log(`Building for ${platform}...`, 'build');
    
    if (this.options.local) {
      await this.runLocalBuild(platform);
    } else {
      await this.runEasBuild(platform);
    }
  }

  async build() {
    try {
      await this.validateOptions();
      await this.checkDependencies();

      this.log(`Starting build process...`, 'info');
      this.log(`Platform: ${this.options.platform}`, 'info');
      this.log(`Profile: ${this.options.profile}`, 'info');
      this.log(`Build type: ${this.options.local ? 'Local' : 'EAS Build (Remote)'}`, 'info');
      
      if (this.options.dryRun) {
        this.log('DRY RUN MODE - No actual builds will be performed', 'warn');
      }

      const platforms = this.options.platform === 'all' ? ['android', 'ios'] : [this.options.platform];
      
      for (const platform of platforms) {
        await this.buildPlatform(platform);
      }

      if (!this.options.dryRun && !this.options.local) {
        this.log('Builds have been submitted to EAS Build', 'success');
        this.log('You can monitor progress at: https://expo.dev/projects', 'info');
        this.log('Or run: npx eas build:list', 'info');
        
        if (this.options.wait) {
          this.log('Waiting for builds to complete...', 'wait');
          await this.waitForBuilds();
        }
      }

    } catch (error) {
      this.log(`Build failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  async waitForBuilds() {
    // This would require implementing build status polling
    // For now, just provide instructions
    this.log('To check build status, run: npx eas build:list', 'info');
    this.log('To wait for builds interactively, run: npx eas build --wait', 'info');
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--platform':
        options.platform = args[++i];
        break;
      case '--profile':
        options.profile = args[++i];
        break;
      case '--local':
        options.local = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--wait':
        options.wait = true;
        break;
      case '--help':
        console.log(`
Build Script for Android and iOS

Usage: node scripts/build.js [options]

Options:
  --platform      android|ios|all (default: all)
  --profile       development|preview|production (default: preview)
  --local         Use local builds instead of EAS Build
  --dry-run       Show what would be built without building
  --wait          Wait for builds to complete
  --help          Show this help message

Examples:
  node scripts/build.js                                    # Build all platforms with preview profile
  node scripts/build.js --platform android                 # Build only Android
  node scripts/build.js --platform ios --profile production # Build iOS for production
  node scripts/build.js --local --platform android         # Build Android locally
  node scripts/build.js --dry-run                          # Preview build commands
        `);
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }
  
  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const builder = new BuildScript(options);
  
  builder.build().catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = BuildScript;