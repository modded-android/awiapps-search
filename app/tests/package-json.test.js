const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
const packageJson = JSON.parse(packageContent);

const versionRangeRegex = /^[~^]?\d+\.\d+\.\d+(?:[-+].*)?$/;

test('package.json metadata :: name and privacy', () => {
  assert.equal(packageJson.name, 'awfixer-app', 'Project name should match expected value');
  assert.equal(packageJson.private, true, 'Project should be marked as private');
});

test('package.json metadata :: version uses strict semver', () => {
  assert.equal(packageJson.version, '1.0.0');
  assert.ok(/^\d+\.\d+\.\d+$/.test(packageJson.version), 'Version must follow semver (x.y.z)');
});

test('package.json metadata :: entry point is expo-router/entry', () => {
  assert.equal(packageJson.main, 'expo-router/entry');
});

test('package.json scripts :: required commands are present and exact', () => {
  assert.ok(packageJson.scripts, 'Scripts object must exist');
  const requiredScripts = {
    test: 'node --test tests',
    start: 'expo start',
    android: 'expo start --android',
    ios: 'expo start --ios',
    web: 'expo start --web',
    lint: 'expo lint',
    'reset-project': 'node ./scripts/reset-project.js',
    'update-packages': 'node ./scripts/update-packages.js',
    'update-packages:dry-run': 'node ./scripts/update-packages.js --dry-run',
    'update-packages:major': 'node ./scripts/update-packages.js --major',
    build: 'node ./scripts/build.js',
    'build:android': 'node ./scripts/build.js --platform android',
    'build:ios': 'node ./scripts/build.js --platform ios',
    'build:production': 'node ./scripts/build.js --profile production',
    'build:preview': 'node ./scripts/build.js --profile preview',
    'build:local': 'node ./scripts/build.js --local',
    'build:dry-run': 'node ./scripts/build.js --dry-run',
    'test:build': 'node ./scripts/test-build.js'
  };

  Object.entries(requiredScripts).forEach(([scriptName, expectedCommand]) => {
    assert.equal(
      packageJson.scripts[scriptName],
      expectedCommand,
      `Script "${scriptName}" should equal "${expectedCommand}"`
    );
  });
});

test('package.json scripts :: commands referencing node scripts resolve to existing files', () => {
  const scriptsDirectory = path.resolve(__dirname, '..', 'scripts');
  const scriptFileMap = {
    'reset-project': 'reset-project.js',
    'update-packages': 'update-packages.js',
    'test:build': 'test-build.js',
    build: 'build.js'
  };

  Object.entries(scriptFileMap).forEach(([scriptName, fileName]) => {
    assert.ok(
      packageJson.scripts[scriptName],
      `Script "${scriptName}" should be defined before checking file existence`
    );
    const scriptPath = path.join(scriptsDirectory, fileName);
    assert.ok(
      fs.existsSync(scriptPath),
      `Referenced script file "${scriptPath}" for "${scriptName}" must exist`
    );
  });
});

test('package.json scripts :: commands avoid leading or trailing whitespace', () => {
  Object.entries(packageJson.scripts).forEach(([name, command]) => {
    assert.equal(
      command.trim(),
      command,
      `Script "${name}" should not include leading or trailing whitespace`
    );
  });
});

test('package.json dependencies :: required Expo and React stack dependencies exist', () => {
  const requiredDependencies = [
    'expo',
    'expo-router',
    '@expo/metro-runtime',
    '@expo/vector-icons',
    '@react-navigation/native',
    '@react-navigation/bottom-tabs',
    '@react-navigation/elements',
    'react',
    'react-dom',
    'react-native',
    'react-native-reanimated',
    'react-native-web',
    'react-native-worklets'
  ];

  requiredDependencies.forEach((dependencyName) => {
    assert.ok(
      packageJson.dependencies[dependencyName],
      `Dependency "${dependencyName}" must be declared`
    );
  });
});

test('package.json dependencies :: versions use supported range syntax', () => {
  Object.entries(packageJson.dependencies).forEach(([dependencyName, versionRange]) => {
    assert.ok(
      versionRangeRegex.test(versionRange),
      `Dependency "${dependencyName}" should use ^ or ~ semver range, received "${versionRange}"`
    );
    assert.ok(
      !/[\*xX]/.test(versionRange),
      `Dependency "${dependencyName}" should not use wildcard ranges`
    );
    assert.ok(
      !/latest/i.test(versionRange),
      `Dependency "${dependencyName}" should not use the "latest" tag`
    );
  });
});

test('package.json dependencies :: react and react-native versions are aligned', () => {
  const reactVersion = packageJson.dependencies.react;
  const reactNativeVersion = packageJson.dependencies['react-native'];

  assert.ok(reactVersion, 'React dependency must exist');
  assert.ok(reactNativeVersion, 'React Native dependency must exist');
  assert.ok(
    /^[~^]?19\./.test(reactVersion),
    `React version should target 19.x, received "${reactVersion}"`
  );
  assert.ok(
    /^[~^]?0\.81\./.test(reactNativeVersion),
    `React Native version should target 0.81.x, received "${reactNativeVersion}"`
  );
});

test('package.json devDependencies :: tooling is declared with expected ranges', () => {
  assert.ok(
    packageJson.devDependencies && typeof packageJson.devDependencies === 'object',
    'devDependencies must exist'
  );
  const requiredDevDependencies = {
    typescript: /^~5\.9\./,
    '@types/react': /^~19\.1\./,
    eslint: /^\^9\./,
    'eslint-config-expo': /^~10\./,
    'eas-cli': /^\^16\./
  };

  Object.entries(requiredDevDependencies).forEach(([name, pattern]) => {
    const versionRange = packageJson.devDependencies[name];
    assert.ok(
      versionRange,
      `Dev dependency "${name}" must be declared`
    );
    assert.ok(
      pattern.test(versionRange),
      `Dev dependency "${name}" should satisfy ${pattern}, received "${versionRange}"`
    );
  });
});

test('package.json dependencies :: expo sdk uses expected major version', () => {
  const expoVersion = packageJson.dependencies.expo;
  assert.ok(expoVersion, 'expo dependency must exist');
  assert.ok(
    /^[~^]?54\./.test(expoVersion),
    `Expo version should target SDK 54, received "${expoVersion}"`
  );
});

test('package.json configuration :: no unsafe lifecycle scripts present', () => {
  const forbiddenScripts = ['preinstall', 'postinstall', 'preuninstall', 'postuninstall'];
  forbiddenScripts.forEach((hook) => {
    assert.ok(
      !Object.prototype.hasOwnProperty.call(packageJson.scripts, hook),
      `Lifecycle hook "${hook}" should not be defined`
    );
  });
});

test('package.json metadata :: dependencies collections are non-empty', () => {
  assert.ok(
    Object.keys(packageJson.dependencies).length > 0,
    'Dependencies should not be empty'
  );
  assert.ok(
    Object.keys(packageJson.devDependencies).length > 0,
    'DevDependencies should not be empty'
  );
});

test('package.json metadata :: parsed JSON matches serialized content', () => {
  const reparsed = JSON.parse(JSON.stringify(packageJson));
  assert.deepEqual(
    reparsed,
    packageJson,
    'Serializing and parsing should preserve package.json structure'
  );
});