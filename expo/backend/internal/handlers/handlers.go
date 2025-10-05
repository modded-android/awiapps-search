package handlers

import (
	"net/http"
	"time"

	"github.com/awfixer/search/backend/internal/config"
	"github.com/awfixer/search/backend/pkg/ai"
	"github.com/awfixer/search/backend/pkg/search"
	customSentry "github.com/awfixer/search/backend/pkg/sentry"
	"github.com/gin-gonic/gin"
	"github.com/getsentry/sentry-go"
)

// APIHandlers contains all API handlers
type APIHandlers struct {
	config        *config.Config
	searchManager *search.SearchManager
	aiManager     *ai.AIManager
}

// NewAPIHandlers creates a new instance of API handlers
func NewAPIHandlers(cfg *config.Config, sm *search.SearchManager, am *ai.AIManager) *APIHandlers {
	return &APIHandlers{
		config:        cfg,
		searchManager: sm,
		aiManager:     am,
	}
}

// HealthCheck handles health check requests
func (h *APIHandlers) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
		"version":   "1.0.0",
		"services": gin.H{
			"search": "available",
			"ai":     "available",
			"sentry": "configured",
		},
	})
}

// SearchRequest represents the search request payload
type SearchRequest struct {
	Query      string                 `json:"query" binding:"required"`
	Count      int                    `json:"count,omitempty"`
	Offset     int                    `json:"offset,omitempty"`
	Country    string                 `json:"country,omitempty"`
	Lang       string                 `json:"lang,omitempty"`
	SafeSearch string                 `json:"safe_search,omitempty"`
	Options    map[string]interface{} `json:"options,omitempty"`
}

// Search handles search requests
func (h *APIHandlers) Search(c *gin.Context) {
	span := customSentry.StartTransaction("search.request", "http.request")
	defer span.Finish()
	
	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		customSentry.CaptureError(err, map[string]string{
			"endpoint": "search",
			"error_type": "validation",
		}, map[string]interface{}{
			"request_body": c.Request.Body,
		})
		
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}
	
	// Set defaults
	if req.Count == 0 {
		req.Count = 10
	}
	if req.Count > 50 {
		req.Count = 50 // Limit max results
	}
	
	opts := &search.SearchOptions{
		Count:      req.Count,
		Offset:     req.Offset,
		Country:    req.Country,
		Lang:       req.Lang,
		SafeSearch: req.SafeSearch,
	}
	
	if opts.SafeSearch == "" {
		opts.SafeSearch = "moderate"
	}
	
	// Perform search
	result, err := h.searchManager.Search(c.Request.Context(), req.Query, opts)
	if err != nil {
		customSentry.CaptureError(err, map[string]string{
			"endpoint": "search",
			"query": req.Query,
		}, map[string]interface{}{
			"search_options": opts,
		})
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Search failed",
			"message": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, result)
}

// SummarizeRequest represents the summarize request payload
type SummarizeRequest struct {
	Content string `json:"content" binding:"required"`
	URL     string `json:"url,omitempty"`
}

// Summarize handles content summarization requests
func (h *APIHandlers) Summarize(c *gin.Context) {
	span := customSentry.StartTransaction("ai.summarize", "http.request")
	defer span.Finish()
	
	var req SummarizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		customSentry.CaptureError(err, map[string]string{
			"endpoint": "summarize",
			"error_type": "validation",
		}, nil)
		
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}
	
	// Limit content length
	if len(req.Content) > 10000 {
		req.Content = req.Content[:10000]
	}
	
	result, err := h.aiManager.Summarize(c.Request.Context(), req.Content)
	if err != nil {
		customSentry.CaptureError(err, map[string]string{
			"endpoint": "summarize",
		}, map[string]interface{}{
			"content_length": len(req.Content),
			"url": req.URL,
		})
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Summarization failed",
			"message": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, result)
}

// AnalyzeBiasRequest represents the bias analysis request payload
type AnalyzeBiasRequest struct {
	Content string `json:"content" binding:"required"`
	URL     string `json:"url,omitempty"`
}

// AnalyzeBias handles bias analysis requests
func (h *APIHandlers) AnalyzeBias(c *gin.Context) {
	span := customSentry.StartTransaction("ai.analyze_bias", "http.request")
	defer span.Finish()
	
	var req AnalyzeBiasRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		customSentry.CaptureError(err, map[string]string{
			"endpoint": "analyze_bias",
			"error_type": "validation",
		}, nil)
		
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}
	
	// Limit content length
	if len(req.Content) > 5000 {
		req.Content = req.Content[:5000]
	}
	
	result, err := h.aiManager.AnalyzeBias(c.Request.Context(), req.Content)
	if err != nil {
		customSentry.CaptureError(err, map[string]string{
			"endpoint": "analyze_bias",
		}, map[string]interface{}{
			"content_length": len(req.Content),
			"url": req.URL,
		})
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Bias analysis failed",
			"message": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, result)
}

// SearchAndAnalyze handles combined search and AI analysis
func (h *APIHandlers) SearchAndAnalyze(c *gin.Context) {
	span := customSentry.StartTransaction("search_and_analyze", "http.request")
	defer span.Finish()
	
	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"message": err.Error(),
		})
		return
	}
	
	// Set defaults
	if req.Count == 0 {
		req.Count = 5 // Fewer results for analysis
	}
	if req.Count > 10 {
		req.Count = 10
	}
	
	opts := &search.SearchOptions{
		Count:      req.Count,
		Offset:     req.Offset,
		Country:    req.Country,
		Lang:       req.Lang,
		SafeSearch: req.SafeSearch,
	}
	
	if opts.SafeSearch == "" {
		opts.SafeSearch = "moderate"
	}
	
	// Perform search
	searchResult, err := h.searchManager.Search(c.Request.Context(), req.Query, opts)
	if err != nil {
		customSentry.CaptureError(err, map[string]string{
			"endpoint": "search_and_analyze",
			"stage": "search",
		}, nil)
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Search failed",
			"message": err.Error(),
		})
		return
	}
	
	// Analyze top results
	for i, result := range searchResult.Results {
		if i >= 3 { // Only analyze top 3 results
			break
		}
		
		if len(result.Description) > 50 {
			// Analyze bias for this result
			biasAnalysis, err := h.aiManager.AnalyzeBias(c.Request.Context(), result.Description)
			if err == nil {
				result.BiasScore = biasAnalysis.BiasScore
			}
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"search_results": searchResult,
		"analyzed": true,
		"analysis_count": len(searchResult.Results),
	})
}

// GetStats returns API usage statistics
func (h *APIHandlers) GetStats(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "stats endpoint not implemented yet",
		"message": "This endpoint will provide API usage statistics",
	})
}

// HandleError handles API errors with proper Sentry reporting
func (h *APIHandlers) HandleError(c *gin.Context, err error, message string, statusCode int) {
	// Capture error with context
	sentry.WithScope(func(scope *sentry.Scope) {
		scope.SetTag("endpoint", c.FullPath())
		scope.SetTag("method", c.Request.Method)
		scope.SetExtra("client_ip", c.ClientIP())
		scope.SetExtra("user_agent", c.Request.UserAgent())
		
		if c.Request.URL != nil {
			scope.SetExtra("query_params", c.Request.URL.RawQuery)
		}
		
		sentry.CaptureException(err)
	})
	
	c.JSON(statusCode, gin.H{
		"error":   message,
		"details": err.Error(),
	})
}

// SetupRoutes sets up all API routes
func (h *APIHandlers) SetupRoutes(r *gin.Engine) {
	// Health check
	r.GET("/health", h.HealthCheck)
	
	// API routes
	api := r.Group("/api/v1")
	{
		// Search endpoints
		api.POST("/search", h.Search)
		api.POST("/search/analyze", h.SearchAndAnalyze)
		
		// AI endpoints
		api.POST("/ai/summarize", h.Summarize)
		api.POST("/ai/analyze-bias", h.AnalyzeBias)
		
		// Stats endpoint
		api.GET("/stats", h.GetStats)
	}
	
	// Add route for handling 404s
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Not Found",
			"message": "The requested endpoint does not exist",
		})
	})
}