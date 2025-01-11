# Twitter Trending Hashtags Generator

This project scrapes trending topics from Trends24 and generates hashtags. It supports English-only filtering, customizable character limits, and can be used with a Node.js API or serverless functions on Netlify.

## Features
- Scrapes trending topics, ranks, tweet counts, and durations.
- Generates hashtags for the top trends.
- Option to filter only English trends or allow all languages.
- Ensures the total length of hashtags does not exceed the tweet character limit.

## Usage

1. Clone the repository.
2. Install dependencies:
```bash
npm install
```
3. Run the server:
```bash
npm run start
```
4. Access the endpoints at http://localhost:3000.

## API Endpoints

### `/api/generate-hashtags`
- **GET** request to fetch trending data and generate hashtags.
- **Query parameters**:
  - `ENGLISH_ONLY`: `true` or `false` (defaults to `true` if not provided).
  - `TWEET_MAX_CHARS`: Maximum characters for hashtags (defaults to `280`).
