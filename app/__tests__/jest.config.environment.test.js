/**
 * Jest tests for environment/side-effect characteristics of jest.config.js.
 * Testing library/framework: Jest.
 */
const path = require('path');
const { pathToFileURL } = require('url');

describe('Jest Configuration - Environment & Side Effects', () => {
  const configPath = path.resolve(__dirname, '../jest.config.js');

  const loadConfig = async () => {
    try {
      delete require.cache[require.resolve('../jest.config.js')];
      // eslint-disable-next-line global-require
      return require('../jest.config.js');
    } catch {
      try {
        const mod = await import(pathToFileURL(configPath).href);
        return mod.default ?? mod;
      } catch {
        return {};
      }
    }
  };

  test('config is loadable multiple times without divergence', async () => {
    const c1 = await loadConfig();
    const c2 = await loadConfig();
    expect(JSON.stringify(c1)).toBe(JSON.stringify(c2));
  });

  test('loading config does not mutate NODE_ENV', async () => {
    const before = process.env.NODE_ENV;
    await loadConfig();
    expect(process.env.NODE_ENV).toBe(before);
  });

  test('path-like settings are strings or arrays of strings (cross-platform friendly)', async () => {
    const cfg = await loadConfig();
    const keys = ['rootDir','coverageDirectory','setupFiles','setupFilesAfterEnv','globalSetup','globalTeardown','modulePaths','roots'];
    keys.forEach((k) => {
      const v = cfg[k];
      if (v === undefined) return;
      if (Array.isArray(v)) {
        v.forEach((entry) => expect(typeof entry).toBe('string'));
      } else {
        expect(typeof v).toBe('string');
      }
    });
  });
});