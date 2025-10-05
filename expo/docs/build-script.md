# Build Script Documentation

This document explains how to use the build script to create Android and iOS builds of the search app using Expo's build infrastructure.

## Overview

The build script (`scripts/build.js`) provides a unified interface for building the app on both Android and iOS platforms. It supports both local builds (using your development environment) and remote builds (using Expo's EAS Build service).

## Security Features

The build script has been hardened against common security vulnerabilities:

- **Command Injection Prevention**: All user inputs are validated against strict regex patterns and allowlists
- **Argument Validation**: Only known command-line arguments are accepted
- **Working Directory Validation**: Ensures the script runs from the correct project directory
- **Process Timeouts**: Prevents hanging processes with configurable timeouts
- **Environment Sanitization**: Removes potentially dangerous environment variables
- **Safe Command Execution**: Uses argument arrays instead of string concatenation for spawn calls

## Prerequisites

### For Remote Builds (Recommended)
- **EAS CLI**: Automatically installed as a dev dependency
- **Expo Account**: You need to be logged in to Expo
  ```bash
  npx eas login
  ```
- **EAS Build Configuration**: The script will create `eas.json` automatically if it doesn't exist

### For Local Builds
- **Android Studio** (for Android builds)
  - Android SDK and emulator/device
  - Java Development Kit (JDK)
- **Xcode** (for iOS builds, macOS only)
  - iOS Simulator or physical iOS device
  - Apple Developer account (for device testing)

## Quick Start

### Build for All Platforms (Remote)
```bash
# Build preview versions for both Android and iOS
npm run build

# Build production versions
npm run build:production
```

### Platform-Specific Builds
```bash
# Android only
npm run build:android

# iOS only  
npm run build:ios
```

### Local Development Builds
```bash
# Build and run on local Android emulator/device
npm run build:local -- --platform android

# Build and run on local iOS simulator/device (macOS only)
npm run build:local -- --platform ios
```

## Build Profiles

The build script supports three build profiles defined in `eas.json`:

### Development Profile
- **Purpose**: Development and testing with Expo development client
- **Android**: Generates APK file
- **iOS**: Includes simulator support
- **Distribution**: Internal only

```bash
npm run build -- --profile development
```

### Preview Profile (Default)
- **Purpose**: Internal testing and sharing
- **Android**: Generates APK file for easy installation
- **iOS**: Standard build for TestFlight or ad-hoc distribution
- **Distribution**: Internal

```bash
npm run build:preview
# or simply
npm run build
```

### Production Profile
- **Purpose**: App store releases
- **Android**: Generates AAB (Android App Bundle) for Play Store
- **iOS**: Optimized build for App Store
- **Distribution**: App stores

```bash
npm run build:production
```

## Available Commands

### NPM Scripts (Recommended)
```bash
npm run build                    # Build all platforms (preview profile)
npm run build:android            # Build Android only
npm run build:ios                # Build iOS only
npm run build:production         # Build all platforms for production
npm run build:preview            # Build all platforms for preview
npm run build:local              # Build locally for all platforms
npm run build:dry-run            # Preview what would be built
```

### Direct Script Usage
```bash
# Basic usage
node scripts/build.js [options]

# Examples
node scripts/build.js --platform android --profile production
node scripts/build.js --local --platform ios
node scripts/build.js --dry-run --wait
```

## Command Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--platform` | `android`, `ios`, `all` | `all` | Target platform(s) |
| `--profile` | `development`, `preview`, `production` | `preview` | Build profile |
| `--local` | flag | `false` | Use local builds instead of EAS Build |
| `--dry-run` | flag | `false` | Show commands without executing |
| `--wait` | flag | `false` | Wait for remote builds to complete |
| `--help` | flag | - | Show help message |

## Build Types

### Remote Builds (EAS Build)
- **Advantages**: 
  - No local setup required
  - Consistent build environment
  - Supports iOS builds on any platform
  - Automatic code signing management
- **Requirements**: Expo account and internet connection
- **Output**: Download links provided after completion

### Local Builds
- **Advantages**: 
  - Faster development iteration
  - No internet required for building
  - Full control over build environment
- **Requirements**: Platform-specific development tools
- **Output**: Direct installation on connected devices

## Configuration Files

### `eas.json`
Contains build configuration for different profiles:
```json
{
  "cli": { "version": ">= 6.0.0" },
  "build": {
    "development": { ... },
    "preview": { ... },
    "production": { ... }
  }
}
```

### `app.json`
Contains app configuration including:
- App metadata (name, version, icons)
- Platform-specific settings
- EAS project configuration

## Troubleshooting

### Common Issues

#### "Not logged in to Expo"
```bash
npx eas login
```

#### "EAS CLI is not available"
```bash
npm install
# EAS CLI is installed as a dev dependency
```

#### Build fails with signing issues (iOS)
- Ensure you have a valid Apple Developer account
- Let EAS Build manage credentials automatically
- Or manually configure signing certificates

#### Android build fails locally
- Ensure Android Studio and SDK are installed
- Set up Android emulator or connect physical device
- Check that `ANDROID_HOME` environment variable is set

### Getting Help

1. **Check build status**: `npx eas build:list`
2. **View build logs**: Click the build URL in the EAS dashboard
3. **Expo documentation**: https://docs.expo.dev/build/introduction/
4. **EAS Build docs**: https://docs.expo.dev/build/eas-build/

## Examples

### Typical Development Workflow
```bash
# Test the build configuration
npm run build:dry-run

# Build preview for testing
npm run build:android

# Build production when ready to release
npm run build:production
```

### CI/CD Integration
The build script is designed to work in CI/CD environments:
```bash
# Non-interactive build for CI
npm run build -- --profile production --platform all
```

### Emergency Local Build
If EAS Build is unavailable:
```bash
# Build locally (requires local dev environment)
npm run build:local -- --platform android
```

## Performance Notes

- **EAS Build resource classes** are configured in `eas.json`
- **m-medium** class is used for faster builds (may incur cost)
- Consider **m1-medium** for Apple Silicon optimized iOS builds
- **Build caching** is enabled by default in EAS Build

## Security Considerations

- **Environment variables**: Sensitive keys are handled securely by EAS Build
- **Code signing**: EAS Build can manage certificates automatically
- **Source code**: Only uploaded to Expo's secure build infrastructure
- **Build artifacts**: Automatically cleaned up after download period