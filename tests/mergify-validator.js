const fs = require('fs');
const yaml = require('js-yaml');

class MergifyValidator {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = null;
    this.errors = [];
    this.warnings = [];
  }

  loadConfig() {
    try {
      const fileContents = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(fileContents);
      return true;
    } catch (error) {
      this.errors.push(`Failed to load config: ${error.message}`);
      return false;
    }
  }

  validateStructure() {
    if (!this.config) {
      this.errors.push('Configuration not loaded');
      return false;
    }

    // Validate merge_protections exists and is array
    if (!this.config.merge_protections) {
      this.warnings.push('No merge_protections found');
    } else if (!Array.isArray(this.config.merge_protections)) {
      this.errors.push('merge_protections must be an array');
    }

    return this.errors.length === 0;
  }

  validateRules() {
    if (!this.config || !this.config.merge_protections) {
      return false;
    }

    this.config.merge_protections.forEach((rule, index) => {
      this.validateRule(rule, index);
    });

    return this.errors.length === 0;
  }

  validateRule(rule, index) {
    const rulePrefix = `Rule ${index + 1}`;

    // Required fields
    if (!rule.name) {
      this.errors.push(`${rulePrefix}: Missing name`);
    }

    if (!rule.if || !Array.isArray(rule.if)) {
      this.errors.push(`${rulePrefix}: Missing or invalid 'if' conditions`);
    }

    if (!rule.success_conditions || !Array.isArray(rule.success_conditions)) {
      this.errors.push(`${rulePrefix}: Missing or invalid success_conditions`);
    }

    // Validate condition syntax
    if (rule.if) {
      rule.if.forEach((condition, i) => {
        if (typeof condition !== 'string' || !condition.trim()) {
          this.errors.push(`${rulePrefix}: Invalid if condition ${i + 1}`);
        }
      });
    }

    if (rule.success_conditions) {
      rule.success_conditions.forEach((condition, i) => {
        if (typeof condition !== 'string' || !condition.trim()) {
          this.errors.push(`${rulePrefix}: Invalid success condition ${i + 1}`);
        }
      });
    }
  }

  validate() {
    if (!this.loadConfig()) {
      return false;
    }
    if (!this.validateStructure()) {
      return false;
    }
    if (!this.validateRules()) {
      return false;
    }

    return this.errors.length === 0;
  }

  getReport() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

module.exports = MergifyValidator;