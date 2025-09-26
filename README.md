# Privacy-Focused Search App

This is a mobile app built with [Expo](https://expo.dev) for fast, trustworthy, and efficient web searches. Unlike bloated search engines, this app prioritizes quality over quantity—no sponsored results, no review boosting, no ads. It provides scores for content quality, ad/tracker presence, and bias analysis to help you find reliable information quickly and exit the app.

## Features
- **Unbiased Search**: Powered by Brave Search API for ad-free, privacy-focused results.
- **Quality Scores**: Each result includes scores for content quality (1-100), ads/trackers (lower is better), and bias analysis.
- **Search Summary**: Overview of results with averages and potential bias variables.
- **Efficient UX**: Clean interface designed to get you results fast and out of the app.
- **Cross-Platform**: Runs on Android, iOS, and web.

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

3. **Start the App**:
   ```bash
   npx expo start
   ```

   Open in your preferred platform (Android emulator, iOS simulator, or web).

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