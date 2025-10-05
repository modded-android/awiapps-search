/**
 * Jest tests for schema-ish and logical consistency of jest.config.js.
 * Testing library/framework: Jest.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

describe('Jest Configuration - Schema & Consistency', () => {
  let jestConfig = {};
  const configPath = path.resolve(__dirname, '../jest.config.js');

  beforeAll(async () => {
    if (!fs.existsSync(configPath)) return;
    try {
      delete require.cache[require.resolve('../jest.config.js')];
      // eslint-disable-next-line global-require
      jestConfig = require('../jest.config.js');
    } catch {
      try {
        const mod = await import(pathToFileURL(configPath).href);
        jestConfig = mod.default ?? mod;
      } catch {
        jestConfig = {};
      }
    }
  });

  test('preset (if used) is a non-empty string', () => {
    if (jestConfig.preset !== undefined) {
      expect(typeof jestConfig.preset).toBe('string');
      expect(jestConfig.preset.trim()).not.toBe('');
    }
  });

  test('projects (if used) is an array', () => {
    if (jestConfig.projects !== undefined) {
      expect(Array.isArray(jestConfig.projects)).toBe(true);
    }
  });

  test('path-related keys are non-empty strings', () => {
    ['rootDir','coverageDirectory','globalSetup','globalTeardown','resolver','snapshotResolver'].forEach((k) => {
      if (jestConfig[k] !== undefined) {
        expect(typeof jestConfig[k]).toBe('string');
        expect(jestConfig[k].trim()).not.toBe('');
      }
    });
  });

  test('reasonable testTimeout (if set): 1s..10m', () => {
    if (jestConfig.testTimeout !== undefined) {
      expect(jestConfig.testTimeout).toBeGreaterThanOrEqual(1000);
      expect(jestConfig.testTimeout).toBeLessThanOrEqual(600000);
    }
  });

  test('maxWorkers (if numeric) <= 2x CPU cores', () => {
    if (typeof jestConfig.maxWorkers === 'number') {
      expect(jestConfig.maxWorkers).toBeGreaterThan(0);
      expect(jestConfig.maxWorkers).toBeLessThanOrEqual(os.cpus().length * 2);
    }
  });

  test('transform keys (if present) compile as RegExp', () => {
    if (jestConfig.transform) {
      Object.keys(jestConfig.transform).forEach((pattern) => {
        expect(() => new RegExp(pattern)).not.toThrow();
      });
    }
  });

  test('roots (if present) is array of non-empty strings', () => {
    if (jestConfig.roots) {
      expect(Array.isArray(jestConfig.roots)).toBe(true);
      jestConfig.roots.forEach((r) => {
        expect(typeof r).toBe('string');
        expect(r.trim()).not.toBe('');
      });
    }
  });

  test('collectCoverage implies some coverage configuration', () => {
    if (jestConfig.collectCoverage === true) {
      const hasSomething = Boolean(
        (jestConfig.collectCoverageFrom && jestConfig.collectCoverageFrom.length) ||
        jestConfig.coverageDirectory ||
        (jestConfig.coverageReporters && jestConfig.coverageReporters.length)
      );
      expect(hasSomething).toBe(true);
    }
  });
});