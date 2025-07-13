# Oda.com Web Scraper

A TypeScript-based web scraper using Playwright to extract product data from oda.com/no/categories/20-frukt-og-gront/.

## Features

- ✅ **Atomic & Testable**: Clean, dependency-injected functions
- ✅ **Comprehensive Scraping**: Handles pagination with "load more" buttons
- ✅ **Data Export**: Exports to both JSON and CSV formats
- ✅ **Error Handling**: Robust error handling for failed category scrapes
- ✅ **Unit Testing**: Full test coverage with Vitest
- ✅ **TypeScript**: Fully typed for better development experience

## Installation

```bash
npm install
```

## Usage

### Run the scraper (development mode with browser visible)

```bash
npm run dev
```

### Run the scraper in watch mode (auto-restart on file changes)

```bash
npm run watch
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

1. Navigate to the main category page
2. Find all subcategory buttons (excluding "Alle")
3. For each subcategory:
   - Open the subcategory page
   - Handle pagination by clicking "load more" buttons
   - Extract product data from all product tiles
4. Export all collected data to:
   - `oda-products.json` (structured JSON)
   - `oda-products.csv` (flat CSV for analysis)

## Project Structure

```
src/
├── index.ts           # Main orchestrator script
├── browser.ts         # Browser management and page navigation
├── scraper.ts         # Core scraping functions
├── utils.ts           # Pure utility functions
├── types.ts           # TypeScript interfaces
├── export.ts          # Data export utilities
└── __tests__/         # Unit tests
    ├── scraper.test.ts
    └── utils.test.ts
```

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

// Max pages to scrape per category (to avoid infinite pagination)
const products = await scrapeAllProductsFromPage(navigator, link.href, 5);
```

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
