# Privacy-Focused Search App

This is a mobile app built with [Expo](https://expo.dev) for fast, trustworthy, and efficient web searches. Unlike bloated search engines, this app prioritizes quality over quantity—no sponsored results, no review boosting, no ads. It provides scores for content quality, ad/tracker presence, and bias analysis to help you find reliable information quickly and exit the app.

## Features
- **Unbiased Search**: Powered by Brave Search API for ad-free, privacy-focused results.
- **Quality Scores**: Each result includes scores for content quality (1-100), ads/trackers (lower is better), and bias analysis.
- **Search Summary**: Overview of results with averages and potential bias variables.
- **Efficient UX**: Clean interface designed to get you results fast and out of the app.
- **Cross-Platform**: Runs on Android, iOS, and web.

## Architecture

### Frontend (React Native/Expo)
- **Mobile App**: Cross-platform search interface for Android, iOS, and web
- **Quality Scoring UI**: Visual representation of content quality, bias, and ad/tracker metrics
- **Fast Navigation**: Optimized for quick search and result access

### Backend (Go API Server)
- **Search Services**: Kagi and Brave Search API integrations with fallback support
- **AI Services**: OpenAI, Claude, Xai, and OpenRouter for content analysis and bias detection
- **Sentry Monitoring**: Comprehensive error tracking and performance monitoring
- **Security**: Rate limiting, CORS protection, input validation, and secure headers
- **Health Monitoring**: Service availability checks and usage statistics

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Up API Key**:
   - Sign up for a Brave Search API key at [https://api.search.brave.com/](https://api.search.brave.com/).
   - Add it to the `.env` file:
     ```
     BRAVE_API_KEY=your_actual_api_key_here
     ```

3. **Start the Backend (Optional but Recommended)**:
   ```bash
   cd backend
   go run cmd/server/main.go
   ```
   
   The backend provides real search functionality and AI analysis. See [backend/README.md](backend/README.md) for detailed setup instructions.

4. **Start the App**:
   ```bash
   npx expo start
   ```

   Open in your preferred platform (Android emulator, iOS simulator, or web).

## Backend API Server

The project now includes a comprehensive Go backend that provides:

### 🔍 **Search Services**
- **Kagi Search API** - Premium privacy-focused search results
- **Brave Search API** - Alternative search with ad-free results  
- **Automatic Fallback** - Seamless switching between providers
- **Quality Scoring** - Automated content quality analysis

### 🤖 **AI-Powered Analysis**
- **Content Summarization** - AI-powered result summaries
- **Bias Detection** - Automated bias scoring and analysis
- **Multiple AI Providers** - OpenAI, Claude, Xai, OpenRouter support
- **Intelligent Fallbacks** - Service redundancy for reliability

### 📊 **Monitoring & Security**
- **Sentry Integration** - Real-time error tracking and performance monitoring
- **Rate Limiting** - API abuse protection
- **CORS & Security Headers** - Production-ready security
- **Health Checks** - Service availability monitoring

### 🚀 **Quick Backend Setup**
```bash
cd backend
go mod download
go run cmd/server/main.go
```

Server starts at `http://localhost:8080` with health check at `/health`.

For detailed backend documentation, see [backend/README.md](backend/README.md).

## Maintenance

### Package Updates

Keep dependencies up to date across all environments with the built-in multi-environment package update script:

```bash
# Check for available updates (Node.js, Go, Python)
npm run update-packages:dry-run

# Update packages safely (minor/patch versions only, all environments)
npm run update-packages

# Update all packages including major versions (use with caution, all environments)
npm run update-packages:major
```

The script automatically detects and updates:
- **Node.js packages** in `package.json`
- **Go modules** in `backend/go.mod`
- **Python packages** in requirements files (if present)

See [Multi-Environment Package Update Documentation](docs/package-updates.md) for detailed usage and safety features.

## How It Works
- Enter a search query in the Search tab.
- View results with scores and a summary.
- Tap a result to open it in your browser.
- Check the Info tab for tips, philosophy, and recent searches.

## Philosophy
This app is the anti-Google: no manipulation, no distractions. We believe in empowering users with transparent, high-quality search results that respect privacy and efficiency.

## Learn More
- [Expo Documentation](https://docs.expo.dev/)
- [Brave Search API](https://api.search.brave.com/)
- [Expo Router](https://docs.expo.dev/router/introduction/)

## Contributing
Feel free to contribute improvements, especially for more accurate scoring algorithms or additional features.

## License
This project is open-source. Use at your own risk.