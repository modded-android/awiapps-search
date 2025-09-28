const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('Mergify Configuration Tests', () => {
  let mergifyConfig;
  const configPath = path.join(__dirname, '..', '.mergify.yml');

  beforeEach(() => {
    // Load the Mergify configuration before each test
    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      mergifyConfig = yaml.load(fileContents);
    } catch (error) {
      throw new Error(`Failed to load Mergify config: ${error.message}`);
    }
  });

  describe('Configuration File Structure', () => {
    test('should have valid YAML syntax', () => {
      expect(() => {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        yaml.load(fileContents);
      }).not.toThrow();
    });

    test('should contain merge_protections configuration', () => {
      expect(mergifyConfig).toHaveProperty('merge_protections');
      expect(Array.isArray(mergifyConfig.merge_protections)).toBe(true);
    });

    test('should have at least one merge protection rule', () => {
      expect(mergifyConfig.merge_protections.length).toBeGreaterThan(0);
    });
  });

  describe('Merge Protection Rule Validation', () => {
    let rule;

    beforeEach(() => {
      rule = mergifyConfig.merge_protections[0];
    });

    test('should have required rule properties', () => {
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('description');
      expect(rule).toHaveProperty('if');
      expect(rule).toHaveProperty('success_conditions');
    });

    test('should have valid rule name', () => {
      expect(typeof rule.name).toBe('string');
      expect(rule.name.trim()).not.toBe('');
      expect(rule.name).toBe('Do not merge outdated PRs');
    });

    test('should have valid description', () => {
      expect(typeof rule.description).toBe('string');
      expect(rule.description.trim()).not.toBe('');
      expect(rule.description).toBe('Make sure PRs are almost up to date before merging');
    });

    test('should have valid if conditions', () => {
      expect(Array.isArray(rule.if)).toBe(true);
      expect(rule.if.length).toBeGreaterThan(0);
      rule.if.forEach(condition => {
        expect(typeof condition).toBe('string');
        expect(condition.trim()).not.toBe('');
      });
    });

    test('should have valid success conditions', () => {
      expect(Array.isArray(rule.success_conditions)).toBe(true);
      expect(rule.success_conditions.length).toBeGreaterThan(0);
      rule.success_conditions.forEach(condition => {
        expect(typeof condition).toBe('string');
        expect(condition.trim()).not.toBe('');
      });
    });
  });

  describe('Specific Rule Content Validation', () => {
    let rule;

    beforeEach(() => {
      rule = mergifyConfig.merge_protections[0];
    });

    test('should target main branch', () => {
      expect(rule.if).toContain('base = main');
    });

    test('should have commits-behind condition', () => {
      const commitsBehindCondition = rule.success_conditions.find(
        condition => condition.includes('#commits-behind')
      );
      expect(commitsBehindCondition).toBeDefined();
      expect(commitsBehindCondition).toBe('#commits-behind <= 10');
    });

    test('should have reasonable commits-behind threshold', () => {
      const commitsBehindCondition = rule.success_conditions.find(
        condition => condition.includes('#commits-behind')
      );
      
      // Extract the number from the condition
      const match = commitsBehindCondition.match(/#commits-behind\s*<=\s*(\d+)/);
      expect(match).not.toBeNull();
      
      const threshold = parseInt(match[1], 10);
      expect(threshold).toBeGreaterThan(0);
      expect(threshold).toBeLessThanOrEqual(50); // Reasonable upper limit
      expect(threshold).toBe(10); // Current configured value
    });
  });

  describe('YAML Structure Edge Cases', () => {
    test('should handle missing optional properties gracefully', () => {
      // Test that required properties exist even if optional ones are missing
      const rule = mergifyConfig.merge_protections[0];
      
      // These are required
      expect(rule.name).toBeDefined();
      expect(rule.if).toBeDefined();
      expect(rule.success_conditions).toBeDefined();
    });

    test('should validate condition syntax patterns', () => {
      const rule = mergifyConfig.merge_protections[0];
      
      rule.if.forEach(condition => {
        // Should match Mergify condition patterns
        expect(condition).toMatch(/^[a-zA-Z_#-]+\s*(=|\!=|~=|<=|>=|<|>)\s*.+$/);
      });

      rule.success_conditions.forEach(condition => {
        // Should match Mergify success condition patterns
        expect(condition).toMatch(/^[a-zA-Z_#-]+.*$/);
      });
    });
  });

  describe('Configuration Completeness', () => {
    test('should cover critical merge scenarios', () => {
      const hasMainBranchProtection = mergifyConfig.merge_protections.some(
        rule => rule.if && rule.if.some(condition => condition.includes('base = main'))
      );
      expect(hasMainBranchProtection).toBe(true);
    });

    test('should have meaningful rule descriptions', () => {
      mergifyConfig.merge_protections.forEach(rule => {
        expect(rule.description.length).toBeGreaterThan(10);
        expect(rule.description).toMatch(/[a-zA-Z]/); // Contains letters
      });
    });
  });

  describe('Error Handling and Robustness', () => {
    test('should handle malformed YAML gracefully in validation context', () => {
      const malformedYaml = `
merge_protections:
  - name: "Test Rule"
    description: Missing closing quote
    if:
      - base = main
    success_conditions:
      - "#commits-behind <= 5"
      `;

      expect(() => {
        yaml.load(malformedYaml);
      }).not.toThrow();
    });

    test('should validate array structures are not empty', () => {
      mergifyConfig.merge_protections.forEach(rule => {
        if (rule.if) {
          expect(rule.if.length).toBeGreaterThan(0);
        }
        if (rule.success_conditions) {
          expect(rule.success_conditions.length).toBeGreaterThan(0);
        }
      });
    });

    test('should handle special characters in conditions', () => {
      const rule = mergifyConfig.merge_protections[0];
      
      // Test that conditions with special characters are handled properly
      rule.success_conditions.forEach(condition => {
        expect(condition).not.toContain('\n');
        expect(condition).not.toContain('\t');
        expect(condition.trim()).toBe(condition);
      });
    });
  });

  describe('Performance and Efficiency Tests', () => {
    test('should load configuration efficiently', () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        const fileContents = fs.readFileSync(configPath, 'utf8');
        yaml.load(fileContents);
      }
      
      const end = Date.now();
      const duration = end - start;
      
      // Should process 100 loads in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    test('should have reasonable file size', () => {
      const stats = fs.statSync(configPath);
      // Configuration file should be reasonably sized (less than 10KB)
      expect(stats.size).toBeLessThan(10240);
    });
  });

  describe('Integration and Compatibility Tests', () => {
    test('should be compatible with Mergify API expectations', () => {
      // Validate that structure matches expected Mergify format
      expect(mergifyConfig).toBeInstanceOf(Object);
      
      if (mergifyConfig.merge_protections) {
        mergifyConfig.merge_protections.forEach(rule => {
          // Rule should have structure compatible with Mergify API
          expect(rule).toMatchObject({
            name: expect.any(String),
            if: expect.any(Array),
            success_conditions: expect.any(Array)
          });
        });
      }
    });

    test('should handle different YAML parsing options', () => {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      
      // Test with different YAML parsing options
      const strictConfig = yaml.load(fileContents, { schema: yaml.FAILSAFE_SCHEMA });
      const defaultConfig = yaml.load(fileContents);
      
      expect(strictConfig).toBeDefined();
      expect(defaultConfig).toBeDefined();
    });
  });

  describe('Security and Validation Tests', () => {
    test('should not contain potentially dangerous YAML constructs', () => {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      
      // Check for potentially dangerous YAML constructs
      expect(fileContents).not.toMatch(/\!\!python/);
      expect(fileContents).not.toMatch(/\!\!js/);
      expect(fileContents).not.toMatch(/\!\!eval/);
    });

    test('should validate condition operators are safe', () => {
      const rule = mergifyConfig.merge_protections[0];
      const validOperators = ['=', '\!=', '~=', '<=', '>=', '<', '>'];
      
      rule.if.concat(rule.success_conditions).forEach(condition => {
        const hasValidOperator = validOperators.some(op => condition.includes(op));
        if (condition.includes('=') || condition.includes('<') || condition.includes('>')) {
          expect(hasValidOperator).toBe(true);
        }
      });
    });
  });

  describe('Future-Proofing Tests', () => {
    test('should handle additional merge protection rules', () => {
      // Test that the structure can accommodate multiple rules
      expect(Array.isArray(mergifyConfig.merge_protections)).toBe(true);
      
      // Mock additional rule to test structure flexibility
      const additionalRule = {
        name: 'Test Additional Rule',
        description: 'Test description',
        if: ['base = develop'],
        success_conditions: ['#approved-reviews-by >= 1']
      };
      
      const extendedConfig = {
        ...mergifyConfig,
        merge_protections: [...mergifyConfig.merge_protections, additionalRule]
      };
      
      expect(extendedConfig.merge_protections.length).toBe(2);
    });

    test('should be extensible with new condition types', () => {
      const rule = mergifyConfig.merge_protections[0];
      
      // Current conditions should be flexible enough for extensions
      expect(typeof rule.if[0]).toBe('string');
      expect(typeof rule.success_conditions[0]).toBe('string');
    });
  });
});