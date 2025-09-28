package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server configuration
	Port string
	Host string
	
	// Sentry configuration
	SentryDSN        string
	SentryEnvironment string
	SentryRelease    string
	
	// AI service configurations
	OpenAIAPIKey     string
	ClaudeAPIKey     string
	XaiAPIKey        string
	OpenRouterAPIKey string
	
	// Search API configurations
	KagiAPIKey  string
	BraveAPIKey string
	
	// Security
	JWTSecret string
	
	// Rate limiting
	RateLimit int
	
	// Debug mode
	Debug bool
}

func Load() (*Config, error) {
	// Load .env file if it exists
	if err := godotenv.Load("../.env"); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}
	
	config := &Config{
		Port: getEnv("PORT", "8080"),
		Host: getEnv("HOST", "0.0.0.0"),
		
		// Sentry
		SentryDSN:        getEnv("SENTRY_DSN", ""),
		SentryEnvironment: getEnv("SENTRY_ENVIRONMENT", "development"),
		SentryRelease:    getEnv("SENTRY_RELEASE", "1.0.0"),
		
		// AI APIs
		OpenAIAPIKey:     getEnv("OPENAI_API_KEY", ""),
		ClaudeAPIKey:     getEnv("CLAUDE_API_KEY", ""),
		XaiAPIKey:        getEnv("XAI_API_KEY", ""),
		OpenRouterAPIKey: getEnv("OPENROUTER_API_KEY", ""),
		
		// Search APIs
		KagiAPIKey:  getEnv("KAGI_API_KEY", ""),
		BraveAPIKey: getEnv("BRAVE_API_KEY", ""),
		
		// Security
		JWTSecret: getEnv("JWT_SECRET", "your-secret-key-change-this"),
		
		// Rate limiting
		RateLimit: getEnvAsInt("RATE_LIMIT", 1000),
		
		// Debug
		Debug: getEnvAsBool("DEBUG", false),
	}
	
	if err := config.validate(); err != nil {
		return nil, err
	}
	
	return config, nil
}

func (c *Config) validate() error {
	if c.Port == "" {
		return fmt.Errorf("PORT is required")
	}
	
	// At least one search API key should be provided
	if c.KagiAPIKey == "" && c.BraveAPIKey == "" {
		log.Printf("Warning: No search API keys configured. Search functionality will be limited.")
	}
	
	// At least one AI API key should be provided for AI features
	if c.OpenAIAPIKey == "" && c.ClaudeAPIKey == "" && c.XaiAPIKey == "" && c.OpenRouterAPIKey == "" {
		log.Printf("Warning: No AI API keys configured. AI features will be disabled.")
	}
	
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}