package main

import (
	"fmt"
	"log"
	"time"

	"github.com/awfixer/search/backend/internal/config"
	"github.com/awfixer/search/backend/internal/handlers"
	"github.com/awfixer/search/backend/internal/middleware"
	"github.com/awfixer/search/backend/pkg/ai"
	"github.com/awfixer/search/backend/pkg/search"
	customSentry "github.com/awfixer/search/backend/pkg/sentry"
	"github.com/gin-gonic/gin"
	"github.com/getsentry/sentry-go"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	
	// Initialize Sentry
	if err := customSentry.Initialize(cfg); err != nil {
		log.Fatalf("Failed to initialize Sentry: %v", err)
	}
	defer customSentry.Flush(2 * time.Second)
	
	// Set Gin mode based on debug setting
	if !cfg.Debug {
		gin.SetMode(gin.ReleaseMode)
	}
	
	// Initialize services
	searchManager := search.NewSearchManager(cfg)
	aiManager := ai.NewAIManager(cfg)
	
	// Initialize handlers
	apiHandlers := handlers.NewAPIHandlers(cfg, searchManager, aiManager)
	
	// Create Gin router
	r := gin.New()
	
	// Add middleware
	r.Use(middleware.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.SentryMiddleware())
	
	// Add rate limiting
	rateLimiter := middleware.NewRateLimiter(cfg.RateLimit, time.Hour)
	r.Use(middleware.RateLimit(rateLimiter))
	
	// Add request timeout
	r.Use(middleware.RequestTimeout(30 * time.Second))
	
	// Setup routes
	apiHandlers.SetupRoutes(r)
	
	// Log startup information
	log.Printf("🚀 Search API Server starting...")
	log.Printf("📍 Host: %s", cfg.Host)
	log.Printf("🔌 Port: %s", cfg.Port)
	log.Printf("🐛 Debug mode: %v", cfg.Debug)
	log.Printf("📊 Sentry environment: %s", cfg.SentryEnvironment)
	
	// Log configured services
	searchServices := 0
	if cfg.KagiAPIKey != "" {
		searchServices++
		log.Printf("🔍 Kagi search: enabled")
	}
	if cfg.BraveAPIKey != "" {
		searchServices++
		log.Printf("🔍 Brave search: enabled")
	}
	log.Printf("🔍 Total search services: %d", searchServices)
	
	aiServices := 0
	if cfg.OpenAIAPIKey != "" {
		aiServices++
		log.Printf("🤖 OpenAI: enabled")
	}
	if cfg.ClaudeAPIKey != "" {
		aiServices++
		log.Printf("🤖 Claude: enabled")
	}
	if cfg.XaiAPIKey != "" {
		aiServices++
		log.Printf("🤖 Xai: enabled")
	}
	if cfg.OpenRouterAPIKey != "" {
		aiServices++
		log.Printf("🤖 OpenRouter: enabled")
	}
	log.Printf("🤖 Total AI services: %d", aiServices)
	
	// Capture startup event in Sentry
	customSentry.CaptureMessage("Server started successfully", sentry.LevelInfo, map[string]string{
		"host": cfg.Host,
		"port": cfg.Port,
		"environment": cfg.SentryEnvironment,
		"search_services": fmt.Sprintf("%d", searchServices),
		"ai_services": fmt.Sprintf("%d", aiServices),
	})
	
	// Start server
	address := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	log.Printf("✅ Server ready at http://%s", address)
	log.Printf("🏥 Health check: http://%s/health", address)
	log.Printf("📚 API base: http://%s/api/v1", address)
	
	if err := r.Run(address); err != nil {
		customSentry.CaptureError(err, map[string]string{
			"operation": "server_start",
		}, map[string]interface{}{
			"address": address,
		})
		log.Fatalf("Failed to start server: %v", err)
	}
}