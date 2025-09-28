package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/awfixer/search/backend/internal/config"
	customSentry "github.com/awfixer/search/backend/pkg/sentry"
	"github.com/sashabaranov/go-openai"
)

// AIService defines the interface for AI service implementations
type AIService interface {
	Summarize(ctx context.Context, content string) (*SummaryResponse, error)
	AnalyzeBias(ctx context.Context, content string) (*BiasAnalysis, error)
	GetName() string
}

// SummaryResponse represents the response from AI summarization
type SummaryResponse struct {
	Summary      string  `json:"summary"`
	KeyPoints    []string `json:"key_points"`
	Confidence   float64 `json:"confidence"`
	WordCount    int     `json:"word_count"`
	ProcessingMS int64   `json:"processing_ms"`
}

// BiasAnalysis represents bias analysis results
type BiasAnalysis struct {
	BiasScore     int      `json:"bias_score"`     // 1-100, lower is better
	BiasTypes     []string `json:"bias_types"`     // e.g., "Political", "Commercial"
	Explanation   string   `json:"explanation"`
	Confidence    float64  `json:"confidence"`
	ProcessingMS  int64    `json:"processing_ms"`
}

// AIManager manages multiple AI service providers
type AIManager struct {
	services []AIService
	config   *config.Config
}

// NewAIManager creates a new AI manager with configured services
func NewAIManager(cfg *config.Config) *AIManager {
	manager := &AIManager{
		config:   cfg,
		services: []AIService{},
	}
	
	// Initialize available services based on configuration
	if cfg.ClaudeAPIKey != "" {
		manager.services = append(manager.services, NewClaudeService(cfg.ClaudeAPIKey))
	}
	
	if cfg.XaiAPIKey != "" {
		manager.services = append(manager.services, NewXaiService(cfg.XaiAPIKey))
	}
	
	if cfg.OpenRouterAPIKey != "" {
		manager.services = append(manager.services, NewOpenRouterService(cfg.OpenRouterAPIKey))
	}
	
	if cfg.OpenAIAPIKey != "" {
		manager.services = append(manager.services, NewOpenAIService(cfg.OpenAIAPIKey))
	}
	
	return manager
}

// Summarize attempts to summarize content using available AI services with fallback
func (m *AIManager) Summarize(ctx context.Context, content string) (*SummaryResponse, error) {
	if len(m.services) == 0 {
		return nil, fmt.Errorf("no AI services configured")
	}
	
	var lastErr error
	for _, service := range m.services {
		start := time.Now()
		
		result, err := service.Summarize(ctx, content)
		if err != nil {
			lastErr = err
			customSentry.CaptureError(err, map[string]string{
				"service": service.GetName(),
				"operation": "summarize",
			}, map[string]interface{}{
				"content_length": len(content),
			})
			continue
		}
		
		result.ProcessingMS = time.Since(start).Milliseconds()
		return result, nil
	}
	
	return nil, fmt.Errorf("all AI services failed, last error: %v", lastErr)
}

// AnalyzeBias attempts to analyze bias using available AI services with fallback
func (m *AIManager) AnalyzeBias(ctx context.Context, content string) (*BiasAnalysis, error) {
	if len(m.services) == 0 {
		return nil, fmt.Errorf("no AI services configured")
	}
	
	var lastErr error
	for _, service := range m.services {
		start := time.Now()
		
		result, err := service.AnalyzeBias(ctx, content)
		if err != nil {
			lastErr = err
			customSentry.CaptureError(err, map[string]string{
				"service": service.GetName(),
				"operation": "analyze_bias",
			}, map[string]interface{}{
				"content_length": len(content),
			})
			continue
		}
		
		result.ProcessingMS = time.Since(start).Milliseconds()
		return result, nil
	}
	
	return nil, fmt.Errorf("all AI services failed, last error: %v", lastErr)
}

// OpenAIService implements AIService using OpenAI API
type OpenAIService struct {
	client *openai.Client
	name   string
}

func NewOpenAIService(apiKey string) *OpenAIService {
	return &OpenAIService{
		client: openai.NewClient(apiKey),
		name:   "OpenAI",
	}
}

func (s *OpenAIService) GetName() string {
	return s.name
}

func (s *OpenAIService) Summarize(ctx context.Context, content string) (*SummaryResponse, error) {
	resp, err := s.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: openai.GPT4oMini,
		Messages: []openai.ChatCompletionMessage{
			{
				Role: openai.ChatMessageRoleSystem,
				Content: "Summarize the following content and extract key points. Respond in JSON format with fields: summary, key_points (array), confidence (0-1), word_count.",
			},
			{
				Role:    openai.ChatMessageRoleUser,
				Content: content,
			},
		},
		MaxTokens: 500,
	})
	
	if err != nil {
		return nil, err
	}
	
	var result SummaryResponse
	if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &result); err != nil {
		// Fallback if JSON parsing fails
		result = SummaryResponse{
			Summary:    resp.Choices[0].Message.Content,
			KeyPoints:  []string{},
			Confidence: 0.8,
			WordCount:  len(resp.Choices[0].Message.Content),
		}
	}
	
	return &result, nil
}

func (s *OpenAIService) AnalyzeBias(ctx context.Context, content string) (*BiasAnalysis, error) {
	resp, err := s.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: openai.GPT4oMini,
		Messages: []openai.ChatCompletionMessage{
			{
				Role: openai.ChatMessageRoleSystem,
				Content: "Analyze the bias in the following content. Rate bias from 1-100 (lower is better). Respond in JSON format with fields: bias_score, bias_types (array), explanation, confidence (0-1).",
			},
			{
				Role:    openai.ChatMessageRoleUser,
				Content: content,
			},
		},
		MaxTokens: 300,
	})
	
	if err != nil {
		return nil, err
	}
	
	var result BiasAnalysis
	if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &result); err != nil {
		// Fallback if JSON parsing fails
		result = BiasAnalysis{
			BiasScore:   50,
			BiasTypes:   []string{"Unknown"},
			Explanation: resp.Choices[0].Message.Content,
			Confidence:  0.5,
		}
	}
	
	return &result, nil
}

// ClaudeService implements AIService using Claude API
type ClaudeService struct {
	apiKey string
	name   string
	client *http.Client
}

func NewClaudeService(apiKey string) *ClaudeService {
	return &ClaudeService{
		apiKey: apiKey,
		name:   "Claude",
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *ClaudeService) GetName() string {
	return s.name
}

func (s *ClaudeService) Summarize(ctx context.Context, content string) (*SummaryResponse, error) {
	return s.callClaude(ctx, content, "Summarize the following content and extract key points. Respond in JSON format with fields: summary, key_points (array), confidence (0-1), word_count.")
}

func (s *ClaudeService) AnalyzeBias(ctx context.Context, content string) (*BiasAnalysis, error) {
	result, err := s.callClaudeForBias(ctx, content, "Analyze the bias in the following content. Rate bias from 1-100 (lower is better). Respond in JSON format with fields: bias_score, bias_types (array), explanation, confidence (0-1).")
	return result, err
}

func (s *ClaudeService) callClaude(ctx context.Context, content, prompt string) (*SummaryResponse, error) {
	// Claude API implementation would go here
	// For now, return a mock response
	return &SummaryResponse{
		Summary:    "Claude service not fully implemented yet",
		KeyPoints:  []string{"Mock implementation"},
		Confidence: 0.5,
		WordCount:  len(content),
	}, nil
}

func (s *ClaudeService) callClaudeForBias(ctx context.Context, content, prompt string) (*BiasAnalysis, error) {
	// Claude API implementation would go here
	// For now, return a mock response
	return &BiasAnalysis{
		BiasScore:   50,
		BiasTypes:   []string{"Mock"},
		Explanation: "Claude service not fully implemented yet",
		Confidence:  0.5,
	}, nil
}

// XaiService implements AIService using Xai API
type XaiService struct {
	apiKey string
	name   string
	client *http.Client
}

func NewXaiService(apiKey string) *XaiService {
	return &XaiService{
		apiKey: apiKey,
		name:   "Xai",
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *XaiService) GetName() string {
	return s.name
}

func (s *XaiService) Summarize(ctx context.Context, content string) (*SummaryResponse, error) {
	// Xai API implementation would go here
	// For now, return a mock response
	return &SummaryResponse{
		Summary:    "Xai service not fully implemented yet",
		KeyPoints:  []string{"Mock implementation"},
		Confidence: 0.5,
		WordCount:  len(content),
	}, nil
}

func (s *XaiService) AnalyzeBias(ctx context.Context, content string) (*BiasAnalysis, error) {
	// Xai API implementation would go here
	// For now, return a mock response
	return &BiasAnalysis{
		BiasScore:   50,
		BiasTypes:   []string{"Mock"},
		Explanation: "Xai service not fully implemented yet",
		Confidence:  0.5,
	}, nil
}

// OpenRouterService implements AIService using OpenRouter API
type OpenRouterService struct {
	apiKey string
	name   string
	client *http.Client
}

func NewOpenRouterService(apiKey string) *OpenRouterService {
	return &OpenRouterService{
		apiKey: apiKey,
		name:   "OpenRouter",
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *OpenRouterService) GetName() string {
	return s.name
}

func (s *OpenRouterService) Summarize(ctx context.Context, content string) (*SummaryResponse, error) {
	return s.callOpenRouter(ctx, content, "Summarize the following content and extract key points. Respond in JSON format with fields: summary, key_points (array), confidence (0-1), word_count.")
}

func (s *OpenRouterService) AnalyzeBias(ctx context.Context, content string) (*BiasAnalysis, error) {
	return s.callOpenRouterForBias(ctx, content, "Analyze the bias in the following content. Rate bias from 1-100 (lower is better). Respond in JSON format with fields: bias_score, bias_types (array), explanation, confidence (0-1).")
}

func (s *OpenRouterService) callOpenRouter(ctx context.Context, content, prompt string) (*SummaryResponse, error) {
	reqBody := map[string]interface{}{
		"model": "anthropic/claude-3-haiku",
		"messages": []map[string]string{
			{"role": "system", "content": prompt},
			{"role": "user", "content": content},
		},
		"max_tokens": 500,
	}
	
	jsonData, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	
	var openRouterResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	
	if err := json.Unmarshal(body, &openRouterResp); err != nil {
		return nil, err
	}
	
	if len(openRouterResp.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenRouter")
	}
	
	var result SummaryResponse
	if err := json.Unmarshal([]byte(openRouterResp.Choices[0].Message.Content), &result); err != nil {
		// Fallback if JSON parsing fails
		result = SummaryResponse{
			Summary:    openRouterResp.Choices[0].Message.Content,
			KeyPoints:  []string{},
			Confidence: 0.8,
			WordCount:  len(openRouterResp.Choices[0].Message.Content),
		}
	}
	
	return &result, nil
}

func (s *OpenRouterService) callOpenRouterForBias(ctx context.Context, content, prompt string) (*BiasAnalysis, error) {
	reqBody := map[string]interface{}{
		"model": "anthropic/claude-3-haiku",
		"messages": []map[string]string{
			{"role": "system", "content": prompt},
			{"role": "user", "content": content},
		},
		"max_tokens": 300,
	}
	
	jsonData, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	
	var openRouterResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	
	if err := json.Unmarshal(body, &openRouterResp); err != nil {
		return nil, err
	}
	
	if len(openRouterResp.Choices) == 0 {
		return nil, fmt.Errorf("no response from OpenRouter")
	}
	
	var result BiasAnalysis
	if err := json.Unmarshal([]byte(openRouterResp.Choices[0].Message.Content), &result); err != nil {
		// Fallback if JSON parsing fails
		result = BiasAnalysis{
			BiasScore:   50,
			BiasTypes:   []string{"Unknown"},
			Explanation: openRouterResp.Choices[0].Message.Content,
			Confidence:  0.5,
		}
	}
	
	return &result, nil
}