# Oda.com Web Scraper

A robust, scalable TypeScript-based web scraper using Playwright to extract product data from oda.com categories with **parallel processing using worker threads**.

## Features

- ✅ **Worker Thread Parallelization**: Each URL is processed in its own worker thread for maximum performance
- ✅ **Atomic & Testable**: Clean, dependency-injected functions
- ✅ **Comprehensive Scraping**: Handles pagination with "load more" buttons
- ✅ **Data Export**: Exports to both JSON and CSV formats (Supabase-ready flat structure)
- ✅ **Error Handling**: Robust error handling for failed category scrapes
- ✅ **Unit Testing**: Full test coverage with Vitest
- ✅ **TypeScript**: Fully typed for better development experience
- ✅ **Scalable Architecture**: Support for multiple URLs processed in parallel

## Installation

```bash
npm install
```

## Usage

### Run the scraper with parallel workers (recommended)

```bash
npm run dev
```

This will process all URLs in parallel using worker threads, with each worker having its own browser instance.

### Run the scraper with TypeScript directly

```bash
npm run dev:ts
```

### Run the scraper in watch mode (auto-restart on file changes)

```bash
npm run dev:watch
```

### Demo the worker thread concept

```bash
node demo-workers.js
```

### Run unit tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

## Output

The scraper will:

1. **Spawn Workers**: Create one worker thread per URL for parallel processing
2. **Per Worker Process**:
   - Navigate to the main category page
   - Find all subcategory buttons (excluding "Alle")
   - For each subcategory:
     - Open the subcategory page
     - Handle pagination by clicking "load more" buttons
     - Extract product data from all product tiles
3. **Collect Results**: Main thread collects results from all workers
4. **Export Data**: Each URL's data is exported to separate files:
   - `oda-products-{category-id}.json` (structured JSON)
   - `oda-products-{category-id}.csv` (flat CSV for analysis)

### Performance Benefits

- **Parallel Processing**: All URLs are processed simultaneously
- **Isolated Browser Instances**: No resource conflicts between categories
- **Scalable**: Easily add more URLs to the `URLS` array
- **Faster Completion**: Total time is limited by the slowest URL, not the sum of all URLs

## Project Structure

```
src/
├── index.ts           # Main orchestrator script (spawns workers)
├── worker.ts          # Worker script for parallel URL processing
├── browser.ts         # Browser management and page navigation
├── scraper.ts         # Core scraping functions
├── utils.ts           # Pure utility functions
├── types.ts           # TypeScript interfaces
├── export.ts          # Data export utilities
└── __tests__/         # Unit tests
    ├── scraper.test.ts
    └── utils.test.ts
```

## Worker Thread Architecture

The scraper uses **Node.js Worker Threads** for maximum performance:

- **Main Thread (`index.ts`)**: Orchestrates workers and collects results
- **Worker Threads (`worker.ts`)**: Each URL gets its own worker with isolated browser instance
- **Parallel Processing**: Multiple URLs are scraped simultaneously
- **Resource Isolation**: Each worker has its own browser to avoid conflicts

## Architecture

The scraper is built with **atomic, testable functions** using dependency injection:

- **BrowserManager**: Handles browser lifecycle
- **PageNavigator**: Abstracted page operations (goto, click, wait, etc.)
- **Scraping Functions**: Pure functions that take a navigator and return data
- **Export Functions**: Handle JSON/CSV data export
- **Utils**: Pure helper functions for URLs, filtering, etc.

## Configuration

You can modify the scraper behavior in `src/index.ts`:

```typescript
const BROWSER_CONFIG: BrowserConfig = {
  headless: false, // Set to true for headless mode
  viewport: { width: 1920, height: 1080 },
};

// Add more URLs for parallel processing
const URLS = [
  "https://oda.com/no/categories/1135-bakeri-og-konditori/",
  "https://oda.com/no/categories/20-frukt-og-gront/",
  // Add more category URLs here
];

// Max pages to scrape per category (to avoid infinite pagination)
const products = await scrapeAllProductsFromPage(navigator, link.href, 5);
```

### Worker Configuration

Each worker receives:

- **URL**: The category URL to scrape
- **Browser Config**: Shared browser configuration
- **URL Index**: For logging and identification
- **Total URLs**: For progress tracking

## Testing

Unit tests cover all core functions:

- `extractSubcategoryLinks()` - Finding category buttons
- `extractProductData()` - Extracting product information
- `loadMoreProducts()` - Pagination handling
- `scrapeAllProductsFromPage()` - Full category scraping
- Utility functions for URL handling and filtering

Run tests with:

```bash
npm test
```

npm run start

````

### Build only:

```bash
npm run build
````

## What it does

The current scraper:

- Opens a Chromium browser
- Navigates to example.com
- Extracts the page title, heading, and description
- Takes a screenshot
- Saves the screenshot to `data/screenshot.png`
- Closes the browser

## Build on this

You can extend this starter by:

- Changing the target URL in `src/index.ts`
- Adding more data extraction logic
- Implementing error handling
- Adding data export functionality
- Creating reusable scraping functions

## Architecture

The scraper is now built with a modular, testable architecture:

### 📁 Project Structure

```
src/
├── types.ts              # TypeScript interfaces and types
├── utils.ts               # Pure utility functions
├── browser.ts             # Browser management and page navigation
├── scraper.ts             # Core scraping logic
├── index.ts               # Main application entry point
└── __tests__/            # Test files
    ├── utils.test.ts
    └── scraper.test.ts
```

### 🧪 Testing

We use **Vitest** for fast, modern testing:

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode
npm run test:ui       # Visual test UI
```

### 🏗️ Key Design Principles

- **Atomic Functions**: Small, focused, pure functions
- **Dependency Injection**: Easy to mock and test
- **Type Safety**: Full TypeScript coverage
- **Separation of Concerns**: Browser, scraping, and utility logic separated
- **Error Handling**: Graceful error handling throughout

### 🔧 Core Modules

#### `utils.ts` - Pure Functions

- `normalizeUrl()` - URL normalization
- `filterExcludedLinks()` - Link filtering
- `createSafeFilename()` - Filename sanitization
- `isValidSubcategoryLink()` - Link validation

#### `scraper.ts` - Scraping Logic

- `extractSubcategoryLinks()` - Extract links from page
- `scrapePageInfo()` - Extract page information
- `takeScreenshot()` - Screenshot functionality

#### `browser.ts` - Browser Management

- `BrowserManager` - Browser lifecycle
- `createPageNavigator()` - Page navigation adapter

All functions are fully tested and use dependency injection for easy mocking and testing.

## Project Structure

```
├── src/
│   └── index.ts          # Main scraper code
├── dist/                 # Compiled JavaScript (after build)
├── data/                 # Output directory for screenshots/data
├── package.json
├── tsconfig.json
└── README.md
```

# oda-web-scraper
