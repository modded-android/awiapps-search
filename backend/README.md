# Search API Backend

A comprehensive Go backend providing AI-powered search and analysis capabilities with extensive monitoring and error tracking through Sentry.

## Features

### 🔍 Search Services
- **Kagi Search API** - Premium, privacy-focused search results
- **Brave Search API** - Alternative search provider with fallback support
- **Quality Scoring** - Automated quality, bias, and credibility analysis
- **Fallback System** - Automatic failover between search providers

### 🤖 AI Services  
- **OpenAI GPT** - Text summarization and bias analysis
- **Claude (Anthropic)** - Advanced content understanding
- **Xai** - Alternative AI processing
- **OpenRouter** - Multi-model AI routing service
- **Fallback Chain** - Automatic service switching on failures

### 📊 Monitoring & Observability
- **Sentry Integration** - Comprehensive error tracking and performance monitoring
- **Request Tracing** - Distributed tracing for API calls
- **Health Checks** - Service availability monitoring
- **Rate Limiting** - API abuse protection
- **Security Headers** - OWASP security compliance

### 🛡️ Security & Reliability
- **CORS Protection** - Configurable cross-origin policies
- **Request Timeouts** - Prevent hanging requests
- **Input Validation** - Request sanitization and limits
- **Error Handling** - Graceful degradation with detailed logging

## Quick Start

### Prerequisites
- Go 1.24 or higher
- API keys for at least one search service (Kagi or Brave)
- Optional: AI service API keys for enhanced features
- Optional: Sentry DSN for monitoring

### Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   go mod download
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Run the server:**
   ```bash
   go run cmd/server/main.go
   ```

The server will start at `http://localhost:8080` by default.

## Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `PORT` | No | Server port | `8080` |
| `HOST` | No | Server host | `0.0.0.0` |
| `DEBUG` | No | Enable debug mode | `false` |
| `SENTRY_DSN` | No | Sentry monitoring URL | - |
| `SENTRY_ENVIRONMENT` | No | Environment name | `development` |
| `SENTRY_RELEASE` | No | Release version | `1.0.0` |
| `KAGI_API_KEY` | No* | Kagi search API key | - |
| `BRAVE_API_KEY` | No* | Brave search API key | - |
| `OPENAI_API_KEY` | No | OpenAI API key | - |
| `CLAUDE_API_KEY` | No | Claude API key | - |
| `XAI_API_KEY` | No | Xai API key | - |
| `OPENROUTER_API_KEY` | No | OpenRouter API key | - |
| `JWT_SECRET` | No | JWT signing secret | `default-secret` |
| `RATE_LIMIT` | No | Requests per hour per IP | `1000` |

*At least one search service API key is required for search functionality.

### API Key Setup

#### Kagi Search API (Preferred)
1. Sign up at [https://kagi.com](https://kagi.com)
2. Go to Settings > API
3. Generate an API key
4. Set `KAGI_API_KEY` in your environment

#### Brave Search API
1. Visit [https://api.search.brave.com/](https://api.search.brave.com/)
2. Create an account and subscription
3. Generate an API key
4. Set `BRAVE_API_KEY` in your environment

#### Sentry Monitoring
1. Create account at [https://sentry.io](https://sentry.io)
2. Create a new Go project
3. Copy the DSN from project settings
4. Set `SENTRY_DSN` in your environment

## API Reference

### Health Check
```
GET /health
```

Returns server status and available services.

### Search
```
POST /api/v1/search
Content-Type: application/json

{
  "query": "search terms",
  "count": 10,
  "offset": 0,
  "country": "US",
  "lang": "en",
  "safe_search": "moderate"
}
```

**Response:**
```json
{
  "query": "search terms",
  "results": [
    {
      "id": "1",
      "title": "Result Title",
      "url": "https://example.com",
      "description": "Result description...",
      "quality_score": 85,
      "ad_tracker_score": 20,
      "bias_score": 30,
      "credibility_score": 90
    }
  ],
  "total_results": 1,
  "processing_ms": 234,
  "provider": "Kagi",
  "summary": {
    "total_results": 1,
    "avg_quality": 85,
    "avg_ad_tracker": 20,
    "avg_bias": 30,
    "bias_variables": ["Political slant", "Commercial bias"],
    "top_domains": ["example.com"]
  }
}
```

### AI Summarization
```
POST /api/v1/ai/summarize
Content-Type: application/json

{
  "content": "Long text to summarize...",
  "url": "https://source-url.com"
}
```

### Bias Analysis
```
POST /api/v1/ai/analyze-bias
Content-Type: application/json

{
  "content": "Text to analyze for bias...",
  "url": "https://source-url.com"
}
```

### Combined Search & Analysis
```
POST /api/v1/search/analyze
Content-Type: application/json

{
  "query": "search terms",
  "count": 5
}
```

## Architecture

### Service Layer Architecture
```
┌─────────────────┐    ┌─────────────────┐
│   React Native  │ ← → │   Go Backend    │
│   Frontend      │    │   API Server    │
└─────────────────┘    └─────────────────┘
                              │
                              ├─────────────────┐
                              │                 │
                       ┌─────────────┐   ┌─────────────┐
                       │   Search    │   │     AI      │
                       │  Services   │   │  Services   │
                       └─────────────┘   └─────────────┘
                              │                 │
                    ┌─────────┼─────────┐      │
                    │         │         │      │
              ┌──────────┐ ┌──────────┐ │ ┌──────────┐
              │   Kagi   │ │  Brave   │ │ │ OpenAI/  │
              │   API    │ │   API    │ │ │ Claude/  │
              └──────────┘ └──────────┘ │ │   Xai    │
                                        │ └──────────┘
                              ┌─────────────────┐
                              │     Sentry      │
                              │   Monitoring    │
                              └─────────────────┘
```

### Request Flow
1. **Request** → Middleware (CORS, Rate Limiting, Security)
2. **Authentication** → API Key validation (if required)
3. **Handler** → Business logic processing
4. **Service Layer** → Search/AI service calls with fallbacks
5. **Response** → JSON response with monitoring data
6. **Monitoring** → Sentry error/performance tracking

## Development

### Building
```bash
go build -o search-server cmd/server/main.go
```

### Running Tests
```bash
go test ./...
```

### Docker Deployment
```bash
# Build image
docker build -t search-api .

# Run container
docker run -p 8080:8080 --env-file .env search-api
```

### Production Considerations
- Set `DEBUG=false` in production
- Use strong `JWT_SECRET` values
- Configure appropriate rate limits
- Monitor Sentry for errors and performance
- Use HTTPS in production
- Configure firewall rules appropriately

## Integration with React Native Frontend

The Go backend is designed to work seamlessly with the existing React Native frontend. Update your React Native app to point API calls to the Go backend:

```typescript
// In your React Native app
const API_BASE_URL = 'http://localhost:8080/api/v1';

const performSearch = async (query: string) => {
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, count: 10 }),
  });
  
  return response.json();
};
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the awfixer/search repository. See the main repository license for details.