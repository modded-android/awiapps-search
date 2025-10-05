# Go Backend Integration Guide

This guide shows how to integrate the Go backend API with the existing React Native search app.

## API Endpoints

### Health Check
```
GET /health
```

### Search
```
POST /api/v1/search
Content-Type: application/json

{
  "query": "your search query",
  "count": 10,
  "safe_search": "moderate"
}
```

### AI Summarization
```
POST /api/v1/ai/summarize
Content-Type: application/json

{
  "content": "content to summarize"
}
```

### Bias Analysis
```
POST /api/v1/ai/analyze-bias
Content-Type: application/json

{
  "content": "content to analyze"
}
```

## React Native Integration

Update your search function in `app/(tabs)/index.tsx`:

```typescript
const API_BASE_URL = 'http://localhost:8080/api/v1';

const handleSearch = async () => {
  if (!query.trim()) return;
  setLoading(true);
  
  try {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        count: 10,
        safe_search: 'moderate'
      }),
    });
    
    if (!response.ok) {
      throw new Error('Search failed');
    }
    
    const searchData = await response.json();
    
    // Transform the results to match the existing interface
    const transformedResults = searchData.results.map((item: any) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      description: item.description,
      qualityScore: item.quality_score,
      adTrackerScore: item.ad_tracker_score,
      biasScore: item.bias_score
    }));
    
    setResults(transformedResults);
    
    // Use the summary from the API
    if (searchData.summary) {
      setSummary({
        totalResults: searchData.summary.total_results,
        avgQuality: searchData.summary.avg_quality,
        avgAdTracker: searchData.summary.avg_ad_tracker,
        avgBias: searchData.summary.avg_bias,
        biasVariables: searchData.summary.bias_variables
      });
    }
    
  } catch (error) {
    console.error('Search error:', error);
    Alert.alert('Error', 'Search failed. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

## Configuration

1. **Start the Go backend:**
   ```bash
   cd backend
   go run cmd/server/main.go
   ```

2. **Configure API keys** (optional for testing):
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env with your API keys
   ```

3. **Update React Native app** to point to the Go backend instead of mock data.

## Production Deployment

For production, change the API_BASE_URL to your deployed backend:

```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api.example.com/api/v1';
```