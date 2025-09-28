package search

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/awfixer/search/backend/internal/config"
	customSentry "github.com/awfixer/search/backend/pkg/sentry"
)

// SearchService defines the interface for search service implementations
type SearchService interface {
	Search(ctx context.Context, query string, opts *SearchOptions) (*SearchResponse, error)
	GetName() string
}

// SearchOptions defines search parameters
type SearchOptions struct {
	Count   int    `json:"count"`   // Number of results to return
	Offset  int    `json:"offset"`  // Offset for pagination
	Country string `json:"country"` // Country code for localized results
	Lang    string `json:"lang"`    // Language code
	SafeSearch string `json:"safe_search"` // off, moderate, strict
}

// SearchResult represents a single search result
type SearchResult struct {
	ID               string   `json:"id"`
	Title            string   `json:"title"`
	URL              string   `json:"url"`
	Description      string   `json:"description"`
	DisplayURL       string   `json:"display_url"`
	Snippet          string   `json:"snippet"`
	PublishedAt      string   `json:"published_at,omitempty"`
	Thumbnail        string   `json:"thumbnail,omitempty"`
	QualityScore     int      `json:"quality_score"`      // 1-100
	AdTrackerScore   int      `json:"ad_tracker_score"`   // Lower is better
	BiasScore        int      `json:"bias_score"`         // 1-100, lower is better
	CredibilityScore int      `json:"credibility_score"`  // 1-100
	Tags             []string `json:"tags,omitempty"`
}

// SearchResponse represents the full search response
type SearchResponse struct {
	Query        string          `json:"query"`
	Results      []*SearchResult `json:"results"`
	TotalResults int             `json:"total_results"`
	ProcessingMS int64           `json:"processing_ms"`
	Provider     string          `json:"provider"`
	Summary      *SearchSummary  `json:"summary,omitempty"`
}

// SearchSummary provides aggregate statistics about search results
type SearchSummary struct {
	TotalResults   int      `json:"total_results"`
	AvgQuality     int      `json:"avg_quality"`
	AvgAdTracker   int      `json:"avg_ad_tracker"`
	AvgBias        int      `json:"avg_bias"`
	BiasVariables  []string `json:"bias_variables"`
	TopDomains     []string `json:"top_domains"`
}

// SearchManager manages multiple search service providers
type SearchManager struct {
	services []SearchService
	config   *config.Config
}

// NewSearchManager creates a new search manager with configured services
func NewSearchManager(cfg *config.Config) *SearchManager {
	manager := &SearchManager{
		config:   cfg,
		services: []SearchService{},
	}
	
	// Initialize available services based on configuration
	// Kagi first as it's the preferred provider
	if cfg.KagiAPIKey != "" {
		manager.services = append(manager.services, NewKagiService(cfg.KagiAPIKey))
	}
	
	if cfg.BraveAPIKey != "" {
		manager.services = append(manager.services, NewBraveService(cfg.BraveAPIKey))
	}
	
	return manager
}

// Search attempts to search using available services with fallback
func (m *SearchManager) Search(ctx context.Context, query string, opts *SearchOptions) (*SearchResponse, error) {
	if len(m.services) == 0 {
		return nil, fmt.Errorf("no search services configured")
	}
	
	if opts == nil {
		opts = &SearchOptions{
			Count:  10,
			Offset: 0,
			SafeSearch: "moderate",
		}
	}
	
	var lastErr error
	for _, service := range m.services {
		start := time.Now()
		
		result, err := service.Search(ctx, query, opts)
		if err != nil {
			lastErr = err
			customSentry.CaptureError(err, map[string]string{
				"service": service.GetName(),
				"operation": "search",
				"query": query,
			}, map[string]interface{}{
				"search_options": opts,
			})
			continue
		}
		
		result.ProcessingMS = time.Since(start).Milliseconds()
		result.Summary = m.calculateSummary(result)
		return result, nil
	}
	
	return nil, fmt.Errorf("all search services failed, last error: %v", lastErr)
}

// calculateSummary computes aggregate statistics for search results
func (m *SearchManager) calculateSummary(response *SearchResponse) *SearchSummary {
	if len(response.Results) == 0 {
		return &SearchSummary{}
	}
	
	var totalQuality, totalAdTracker, totalBias int
	domainMap := make(map[string]int)
	
	for _, result := range response.Results {
		totalQuality += result.QualityScore
		totalAdTracker += result.AdTrackerScore
		totalBias += result.BiasScore
		
		// Extract domain from URL
		if parsedURL, err := url.Parse(result.URL); err == nil {
			domainMap[parsedURL.Host]++
		}
	}
	
	count := len(response.Results)
	
	// Get top domains
	var topDomains []string
	for domain := range domainMap {
		topDomains = append(topDomains, domain)
		if len(topDomains) >= 5 {
			break
		}
	}
	
	return &SearchSummary{
		TotalResults:   count,
		AvgQuality:     totalQuality / count,
		AvgAdTracker:   totalAdTracker / count,
		AvgBias:        totalBias / count,
		BiasVariables:  []string{"Political slant", "Commercial bias", "Source credibility"},
		TopDomains:     topDomains,
	}
}

// KagiService implements SearchService using Kagi API
type KagiService struct {
	apiKey string
	name   string
	client *http.Client
}

func NewKagiService(apiKey string) *KagiService {
	return &KagiService{
		apiKey: apiKey,
		name:   "Kagi",
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *KagiService) GetName() string {
	return s.name
}

func (s *KagiService) Search(ctx context.Context, query string, opts *SearchOptions) (*SearchResponse, error) {
	// Build URL with parameters
	params := url.Values{}
	params.Add("q", query)
	params.Add("limit", strconv.Itoa(opts.Count))
	
	apiURL := fmt.Sprintf("https://kagi.com/api/v0/search?%s", params.Encode())
	
	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", "Bot "+s.apiKey)
	req.Header.Set("User-Agent", "awfixer-search/1.0")
	
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("kagi API error %d: %s", resp.StatusCode, string(body))
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	
	var kagiResp struct {
		Meta struct {
			ID     string `json:"id"`
			Node   string `json:"node"`
			MS     int64  `json:"ms"`
		} `json:"meta"`
		Data []struct {
			T       int    `json:"t"`
			Rank    int    `json:"rank"`
			URL     string `json:"url"`
			Title   string `json:"title"`
			Snippet string `json:"snippet"`
			Published string `json:"published,omitempty"`
			Thumbnail struct {
				URL string `json:"url"`
			} `json:"thumbnail,omitempty"`
		} `json:"data"`
	}
	
	if err := json.Unmarshal(body, &kagiResp); err != nil {
		return nil, err
	}
	
	results := make([]*SearchResult, 0, len(kagiResp.Data))
	for i, item := range kagiResp.Data {
		// Skip non-web results (t=0 indicates web results)
		if item.T != 0 {
			continue
		}
		
		result := &SearchResult{
			ID:               fmt.Sprintf("kagi_%d", i),
			Title:            item.Title,
			URL:              item.URL,
			Description:      item.Snippet,
			DisplayURL:       item.URL,
			Snippet:          item.Snippet,
			PublishedAt:      item.Published,
			Thumbnail:        item.Thumbnail.URL,
			QualityScore:     s.calculateQualityScore(item.URL, item.Title, item.Snippet),
			AdTrackerScore:   s.calculateAdTrackerScore(item.URL),
			BiasScore:        s.calculateBiasScore(item.URL, item.Snippet),
			CredibilityScore: s.calculateCredibilityScore(item.URL),
		}
		results = append(results, result)
	}
	
	return &SearchResponse{
		Query:        query,
		Results:      results,
		TotalResults: len(results),
		Provider:     s.name,
	}, nil
}

// BraveService implements SearchService using Brave Search API
type BraveService struct {
	apiKey string
	name   string
	client *http.Client
}

func NewBraveService(apiKey string) *BraveService {
	return &BraveService{
		apiKey: apiKey,
		name:   "Brave",
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *BraveService) GetName() string {
	return s.name
}

func (s *BraveService) Search(ctx context.Context, query string, opts *SearchOptions) (*SearchResponse, error) {
	// Build URL with parameters
	params := url.Values{}
	params.Add("q", query)
	params.Add("count", strconv.Itoa(opts.Count))
	params.Add("offset", strconv.Itoa(opts.Offset))
	
	if opts.Country != "" {
		params.Add("country", opts.Country)
	}
	if opts.Lang != "" {
		params.Add("search_lang", opts.Lang)
	}
	if opts.SafeSearch != "" {
		params.Add("safesearch", opts.SafeSearch)
	}
	
	apiURL := fmt.Sprintf("https://api.search.brave.com/res/v1/web/search?%s", params.Encode())
	
	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("X-Subscription-Token", s.apiKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "awfixer-search/1.0")
	
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("brave API error %d: %s", resp.StatusCode, string(body))
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	
	var braveResp struct {
		Web struct {
			Type    string `json:"type"`
			Results []struct {
				Type        string `json:"type"`
				URL         string `json:"url"`
				Title       string `json:"title"`
				Description string `json:"description"`
				Age         string `json:"age,omitempty"`
				PageAge     string `json:"page_age,omitempty"`
				Profile     struct {
					Name string `json:"name"`
					URL  string `json:"url"`
					Long string `json:"long"`
					Img  string `json:"img"`
				} `json:"profile,omitempty"`
				Language   string `json:"language,omitempty"`
				FamilySafe bool   `json:"family_safe,omitempty"`
			} `json:"results"`
		} `json:"web"`
	}
	
	if err := json.Unmarshal(body, &braveResp); err != nil {
		return nil, err
	}
	
	results := make([]*SearchResult, 0, len(braveResp.Web.Results))
	for i, item := range braveResp.Web.Results {
		result := &SearchResult{
			ID:               fmt.Sprintf("brave_%d", i),
			Title:            item.Title,
			URL:              item.URL,
			Description:      item.Description,
			DisplayURL:       item.URL,
			Snippet:          item.Description,
			PublishedAt:      item.Age,
			Thumbnail:        item.Profile.Img,
			QualityScore:     s.calculateQualityScore(item.URL, item.Title, item.Description),
			AdTrackerScore:   s.calculateAdTrackerScore(item.URL),
			BiasScore:        s.calculateBiasScore(item.URL, item.Description),
			CredibilityScore: s.calculateCredibilityScore(item.URL),
		}
		results = append(results, result)
	}
	
	return &SearchResponse{
		Query:        query,
		Results:      results,
		TotalResults: len(results),
		Provider:     s.name,
	}, nil
}

// Helper methods for scoring (simplified implementations)

func (s *KagiService) calculateQualityScore(urlString, title, snippet string) int {
	score := 50 // Base score
	
	// Length checks
	if len(title) > 10 && len(title) < 100 {
		score += 10
	}
	if len(snippet) > 50 && len(snippet) < 200 {
		score += 10
	}
	
	// Domain reputation (simplified)
	if u, err := url.Parse(urlString); err == nil {
		domain := u.Host
		if isHighQualityDomain(domain) {
			score += 20
		}
	}
	
	if score > 100 {
		score = 100
	}
	if score < 1 {
		score = 1
	}
	
	return score
}

func (s *KagiService) calculateAdTrackerScore(urlString string) int {
	// Lower is better
	score := 20 // Base low score
	
	if u, err := url.Parse(urlString); err == nil {
		domain := u.Host
		if isKnownAdDomain(domain) {
			score += 50
		}
	}
	
	return score
}

func (s *KagiService) calculateBiasScore(urlString, content string) int {
	// Simplified bias calculation - lower is better
	score := 30 // Base score
	
	// Check for bias indicators in content
	biasKeywords := []string{"exclusive", "shocking", "unbelievable", "clickbait"}
	for _, keyword := range biasKeywords {
		if bytes.Contains(bytes.ToLower([]byte(content)), []byte(keyword)) {
			score += 10
		}
	}
	
	if score > 100 {
		score = 100
	}
	
	return score
}

func (s *KagiService) calculateCredibilityScore(urlString string) int {
	score := 50 // Base score
	
	if u, err := url.Parse(urlString); err == nil {
		domain := u.Host
		if isHighCredibilityDomain(domain) {
			score += 30
		}
	}
	
	if score > 100 {
		score = 100
	}
	
	return score
}

// BraveService uses the same scoring methods as Kagi for consistency
func (s *BraveService) calculateQualityScore(urlString, title, snippet string) int {
	return (&KagiService{}).calculateQualityScore(urlString, title, snippet)
}

func (s *BraveService) calculateAdTrackerScore(urlString string) int {
	return (&KagiService{}).calculateAdTrackerScore(urlString)
}

func (s *BraveService) calculateBiasScore(urlString, content string) int {
	return (&KagiService{}).calculateBiasScore(urlString, content)
}

func (s *BraveService) calculateCredibilityScore(urlString string) int {
	return (&KagiService{}).calculateCredibilityScore(urlString)
}

// Helper functions for domain reputation
func isHighQualityDomain(domain string) bool {
	highQualityDomains := []string{
		"wikipedia.org",
		"bbc.com",
		"reuters.com",
		"npr.org",
		"pbs.org",
		"gov",
		"edu",
		"nature.com",
		"science.org",
	}
	
	for _, hqDomain := range highQualityDomains {
		if bytes.Contains([]byte(domain), []byte(hqDomain)) {
			return true
		}
	}
	
	return false
}

func isKnownAdDomain(domain string) bool {
	adDomains := []string{
		"doubleclick.net",
		"googlesyndication.com",
		"facebook.com/tr",
		"googletagmanager.com",
		"google-analytics.com",
	}
	
	for _, adDomain := range adDomains {
		if bytes.Contains([]byte(domain), []byte(adDomain)) {
			return true
		}
	}
	
	return false
}

func isHighCredibilityDomain(domain string) bool {
	credibleDomains := []string{
		"wikipedia.org",
		"bbc.com",
		"reuters.com",
		"ap.org",
		"npr.org",
		"pbs.org",
		"cnn.com",
		"nytimes.com",
		"washingtonpost.com",
		"theguardian.com",
		".gov",
		".edu",
		"nature.com",
		"science.org",
		"nejm.org",
	}
	
	for _, credDomain := range credibleDomains {
		if bytes.Contains([]byte(domain), []byte(credDomain)) {
			return true
		}
	}
	
	return false
}