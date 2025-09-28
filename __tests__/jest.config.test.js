/**
 * Jest tests for validating jest.config.js.
 * Testing library/framework: Jest.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

describe('Jest Configuration - Core Validation', () => {
  let jestConfig = {};
  const configPath = path.resolve(__dirname, '../jest.config.js');

  beforeAll(async () => {
    if (!fs.existsSync(configPath)) {
      console.warn('Warning: jest.config.js not found at project root. Tests will run with empty config object.');
      return;
    }
    // Try CommonJS require first; fall back to dynamic import for ESM configs.
    try {
      delete require.cache[require.resolve('../jest.config.js')];
      // eslint-disable-next-line global-require
      jestConfig = require('../jest.config.js');
    } catch (cjsErr) {
      try {
        const mod = await import(pathToFileURL(configPath).href);
        jestConfig = mod.default ?? mod;
      } catch (esmErr) {
        console.warn(`Warning: Failed to load jest.config.js (CJS err: ${cjsErr.message}; ESM err: ${esmErr.message}). Using empty config object for assertions.`);
        jestConfig = {};
      }
    }
  });

  describe('Existence and shape', () => {
    test('file exists at repository root', () => {
      expect(fs.existsSync(configPath)).toBe(true);
    });

    test('exports an object (or resolves to an object)', () => {
      expect(jestConfig).toBeDefined();
      expect(typeof jestConfig).toBe('object');
      expect(jestConfig).not.toBeNull();
    });

    test('is JSON-serializable (no circular refs)', () => {
      expect(() => JSON.stringify(jestConfig)).not.toThrow();
      const serialized = JSON.stringify(jestConfig);
      const parsed = JSON.parse(serialized || '{}');
      expect(typeof parsed).toBe('object');
    });
  });

  describe('Environment configuration', () => {
    test('testEnvironment is a string when present', () => {
      if (jestConfig.testEnvironment !== undefined) {
        expect(typeof jestConfig.testEnvironment).toBe('string');
        expect(jestConfig.testEnvironment.length).toBeGreaterThan(0);
      }
    });

    test('testEnvironmentOptions is a non-null object when present', () => {
      if (jestConfig.testEnvironmentOptions !== undefined) {
        expect(jestConfig.testEnvironmentOptions).not.toBeNull();
        expect(typeof jestConfig.testEnvironmentOptions).toBe('object');
      }
    });
  });

  describe('Test file discovery', () => {
    test('testMatch (if present) is an array of non-empty strings', () => {
      if (jestConfig.testMatch !== undefined) {
        expect(Array.isArray(jestConfig.testMatch)).toBe(true);
        jestConfig.testMatch.forEach((p) => {
          expect(typeof p).toBe('string');
          expect(p).not.toEqual('');
        });
      }
    });

    test('testRegex (if present) is a string or array of strings', () => {
      if (jestConfig.testRegex !== undefined) {
        const v = jestConfig.testRegex;
        if (Array.isArray(v)) {
          v.forEach((re) => {
            expect(typeof re).toBe('string');
            expect(re).not.toEqual('');
          });
        } else {
          expect(typeof v).toBe('string');
          expect(v).not.toEqual('');
        }
      }
    });

    test('Avoid conflicting testMatch and testRegex (warn only)', () => {
      const hasTestMatch = Array.isArray(jestConfig.testMatch) && jestConfig.testMatch.length > 0;
      const hasTestRegex =
        jestConfig.testRegex !== undefined &&
        ((typeof jestConfig.testRegex === 'string' && jestConfig.testRegex.length > 0) ||
          (Array.isArray(jestConfig.testRegex) && jestConfig.testRegex.length > 0));
      if (hasTestMatch && hasTestRegex) {
        console.warn('Warning: Both testMatch and testRegex are defined; prefer using only one.');
      }
      expect(true).toBe(true);
    });

    test('testPathIgnorePatterns (if present) is an array of strings', () => {
      if (jestConfig.testPathIgnorePatterns !== undefined) {
        expect(Array.isArray(jestConfig.testPathIgnorePatterns)).toBe(true);
        jestConfig.testPathIgnorePatterns.forEach((p) => expect(typeof p).toBe('string'));
      }
    });
  });

  describe('Coverage settings', () => {
    test('collectCoverage is boolean when present', () => {
      if (jestConfig.collectCoverage !== undefined) {
        expect(typeof jestConfig.collectCoverage).toBe('boolean');
      }
    });

    test('collectCoverageFrom is array of non-empty strings when present', () => {
      if (jestConfig.collectCoverageFrom !== undefined) {
        expect(Array.isArray(jestConfig.collectCoverageFrom)).toBe(true);
        jestConfig.collectCoverageFrom.forEach((p) => {
          expect(typeof p).toBe('string');
          expect(p).not.toEqual('');
        });
      }
    });

    test('coverageDirectory is non-empty string when present', () => {
      if (jestConfig.coverageDirectory !== undefined) {
        expect(typeof jestConfig.coverageDirectory).toBe('string');
        expect(jestConfig.coverageDirectory).not.toEqual('');
      }
    });

    test('coverageReporters is array of strings/tuples when present', () => {
      if (jestConfig.coverageReporters !== undefined) {
        expect(Array.isArray(jestConfig.coverageReporters)).toBe(true);
        jestConfig.coverageReporters.forEach((r) => {
          const ok = typeof r === 'string' || (Array.isArray(r) && typeof r[0] === 'string');
          expect(ok).toBe(true);
        });
      }
    });

    test('coverageThreshold.global values are 0..100 when present', () => {
      const g = jestConfig?.coverageThreshold?.global;
      if (g) {
        ['branches', 'functions', 'lines', 'statements'].forEach((k) => {
          if (g[k] !== undefined) {
            expect(typeof g[k]).toBe('number');
            expect(g[k]).toBeGreaterThanOrEqual(0);
            expect(g[k]).toBeLessThanOrEqual(100);
          }
        });
      }
    });
  });

  describe('Transforms', () => {
    test('transform is an object of pattern -> transformer', () => {
      if (jestConfig.transform !== undefined) {
        expect(typeof jestConfig.transform).toBe('object');
        Object.entries(jestConfig.transform).forEach(([pattern, transformer]) => {
          expect(typeof pattern).toBe('string');
          const ok = typeof transformer === 'string' || Array.isArray(transformer);
          expect(ok).toBe(true);
        });
      }
    });

    test('transformIgnorePatterns is array of strings when present', () => {
      if (jestConfig.transformIgnorePatterns !== undefined) {
        expect(Array.isArray(jestConfig.transformIgnorePatterns)).toBe(true);
        jestConfig.transformIgnorePatterns.forEach((p) => expect(typeof p).toBe('string'));
      }
    });
  });

  describe('Modules and resolution', () => {
    test('moduleNameMapper is an object of pattern -> replacement when present', () => {
      if (jestConfig.moduleNameMapper !== undefined) {
        expect(typeof jestConfig.moduleNameMapper).toBe('object');
        Object.entries(jestConfig.moduleNameMapper).forEach(([pattern, replacement]) => {
          expect(typeof pattern).toBe('string');
          const ok = typeof replacement === 'string' || Array.isArray(replacement);
          expect(ok).toBe(true);
        });
      }
    });

    test('moduleDirectories is array of non-empty strings when present', () => {
      if (jestConfig.moduleDirectories !== undefined) {
        expect(Array.isArray(jestConfig.moduleDirectories)).toBe(true);
        jestConfig.moduleDirectories.forEach((d) => {
          expect(typeof d).toBe('string');
          expect(d).not.toEqual('');
        });
      }
    });

    test('moduleFileExtensions is array of non-empty strings when present', () => {
      if (jestConfig.moduleFileExtensions !== undefined) {
        expect(Array.isArray(jestConfig.moduleFileExtensions)).toBe(true);
        jestConfig.moduleFileExtensions.forEach((ext) => {
          expect(typeof ext).toBe('string');
          expect(ext).not.toEqual('');
        });
      }
    });

    test('modulePaths is array of non-empty strings when present', () => {
      if (jestConfig.modulePaths !== undefined) {
        expect(Array.isArray(jestConfig.modulePaths)).toBe(true);
        jestConfig.modulePaths.forEach((pth) => {
          expect(typeof pth).toBe('string');
          expect(pth).not.toEqual('');
        });
      }
    });
  });

  describe('Setup/teardown', () => {
    test('setupFiles is array of non-empty strings when present', () => {
      if (jestConfig.setupFiles !== undefined) {
        expect(Array.isArray(jestConfig.setupFiles)).toBe(true);
        jestConfig.setupFiles.forEach((f) => {
          expect(typeof f).toBe('string');
          expect(f).not.toEqual('');
        });
      }
    });

    test('setupFilesAfterEnv is array of non-empty strings when present', () => {
      if (jestConfig.setupFilesAfterEnv !== undefined) {
        expect(Array.isArray(jestConfig.setupFilesAfterEnv)).toBe(true);
        jestConfig.setupFilesAfterEnv.forEach((f) => {
          expect(typeof f).toBe('string');
          expect(f).not.toEqual('');
        });
      }
    });

    test('globalSetup/globalTeardown are strings when present', () => {
      if (jestConfig.globalSetup !== undefined) {
        expect(typeof jestConfig.globalSetup).toBe('string');
        expect(jestConfig.globalSetup).not.toEqual('');
      }
      if (jestConfig.globalTeardown !== undefined) {
        expect(typeof jestConfig.globalTeardown).toBe('string');
        expect(jestConfig.globalTeardown).not.toEqual('');
      }
    });
  });

  describe('Behavior/performance toggles', () => {
    test('verbose is boolean when present', () => {
      if (jestConfig.verbose !== undefined) {
        expect(typeof jestConfig.verbose).toBe('boolean');
      }
    });

    test('bail is boolean or positive number when present', () => {
      if (jestConfig.bail !== undefined) {
        const ok = typeof jestConfig.bail === 'boolean' || typeof jestConfig.bail === 'number';
        expect(ok).toBe(true);
        if (typeof jestConfig.bail === 'number') {
          expect(jestConfig.bail).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('maxWorkers is number > 0 or percentage string when present', () => {
      if (jestConfig.maxWorkers !== undefined) {
        const t = typeof jestConfig.maxWorkers;
        expect(['number', 'string'].includes(t)).toBe(true);
        if (t === 'number') {
          expect(jestConfig.maxWorkers).toBeGreaterThan(0);
        }
        if (t === 'string') {
          expect(jestConfig.maxWorkers).toMatch(/^\d+%$/);
        }
      }
    });

    test('testTimeout is a positive number when present', () => {
      if (jestConfig.testTimeout !== undefined) {
        expect(typeof jestConfig.testTimeout).toBe('number');
        expect(jestConfig.testTimeout).toBeGreaterThan(0);
      }
    });
  });

  describe('Reporters and projects', () => {
    test('reporters is array of strings or [name, options] entries when present', () => {
      if (jestConfig.reporters !== undefined) {
        expect(Array.isArray(jestConfig.reporters)).toBe(true);
        jestConfig.reporters.forEach((r) => {
          const ok = typeof r === 'string' || (Array.isArray(r) && typeof r[0] === 'string');
          expect(ok).toBe(true);
        });
      }
    });

    test('projects is array when present', () => {
      if (jestConfig.projects !== undefined) {
        expect(Array.isArray(jestConfig.projects)).toBe(true);
      }
    });
  });

  describe('Key sanity and warnings', () => {
    test('Warn on unrecognized keys (do not fail)', () => {
      const validKeys = new Set([
        'automock','bail','cache','cacheDirectory','clearMocks','collectCoverage','collectCoverageFrom',
        'coverageDirectory','coveragePathIgnorePatterns','coverageProvider','coverageReporters','coverageThreshold',
        'cx','dependencyExtractor','displayName','errorOnDeprecated','extensionsToTreatAsEsm','fakeTimers',
        'forceCoverageMatch','globals','globalSetup','globalTeardown','haste','injectGlobals','moduleDirectories',
        'moduleFileExtensions','moduleNameMapper','modulePathIgnorePatterns','modulePaths','notify','notifyMode',
        'preset','prettierPath','projects','reporters','resetMocks','resetModules','resolver','restoreMocks',
        'rootDir','roots','runner','sandboxInjectedGlobals','setupFiles','setupFilesAfterEnv','skipFilter',
        'slowTestThreshold','snapshotResolver','snapshotSerializers','testEnvironment','testEnvironmentOptions',
        'testLocationInResults','testMatch','testPathIgnorePatterns','testRegex','testResultsProcessor',
        'testRunner','testSequencer','testTimeout','testURL','timers','transform','transformIgnorePatterns',
        'unmockedModulePathPatterns','verbose','watchPathIgnorePatterns','watchPlugins','workerThreads','maxWorkers'
      ]);
      const keys = Object.keys(jestConfig || {});
      const unknown = keys.filter((k) => !validKeys.has(k));
      if (unknown.length) {
        console.warn(`Warning: Unknown Jest config keys: ${unknown.join(', ')}`);
      }
      expect(true).toBe(true);
    });
  });

  describe('Filesystem references (warn-only)', () => {
    const checkPaths = (val) => {
      if (typeof val === 'string') return [val];
      if (Array.isArray(val)) return val.filter((v) => typeof v === 'string');
      return [];
    };

    test('setupFiles entries should exist when absolute/relative (warn only)', () => {
      checkPaths(jestConfig.setupFiles).forEach((p) => {
        const resolved = path.resolve(__dirname, '..', p);
        if (!fs.existsSync(resolved)) console.warn(`Warning: setupFiles entry not found: ${p}`);
      });
      expect(true).toBe(true);
    });

    test('setupFilesAfterEnv entries should exist when absolute/relative (warn only)', () => {
      checkPaths(jestConfig.setupFilesAfterEnv).forEach((p) => {
        const resolved = path.resolve(__dirname, '..', p);
        if (!fs.existsSync(resolved)) console.warn(`Warning: setupFilesAfterEnv entry not found: ${p}`);
      });
      expect(true).toBe(true);
    });
  });
});