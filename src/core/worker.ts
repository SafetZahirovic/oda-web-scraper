import { parentPort, workerData } from 'worker_threads';
import { BrowserManager, createPageNavigator } from './browser.js';
import { extractSubcategoryLinks, scrapeAllProductsFromPage } from './scraper.js';
import { BrowserConfig, ProductData } from './types.js';
import { filterExcludedLinks } from './utils.js';
import { emitCategoryScrapingStarted } from '../connector.js';


type WorkerData = {
    url: string;
    urlIndex: number;
    totalUrls: number;
    browserConfig: BrowserConfig;
};

/**
 * Extract category name from URL
 */
function extractCategoryNameFromUrl(url: string): string {
    const match = url.match(/\/categories\/\d+-([^\/]+)\//);
    if (match && match[1]) {
        return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'Unknown Category';
}

/**
 * Clean subcategory name by removing the number at the end
 * Example: "Grønsaker 140" -> "Grønsaker"
 */
function cleanSubcategoryName(name: string): string {
    // Remove numbers and whitespace at the end of the string
    return name.replace(/[0-9]/g, '').trim();
}

async function scrapeUrl(data: WorkerData): Promise<{ name: string; subcategories: { name: string; url: string; products: ProductData[] }[] }> {
    const { url, urlIndex, totalUrls, browserConfig } = data;
    const browserManager = new BrowserManager();

    // Extract category name once at the beginning
    const categoryName = extractCategoryNameFromUrl(url);

    try {
        console.log(`\n🚀 Worker ${urlIndex + 1}: Starting web scraper for URL ${urlIndex + 1}/${totalUrls}...`);

        // Launch browser with dependency injection
        const page = await browserManager.launch(browserConfig);
        const navigator = createPageNavigator(page);

        // Navigate to the main category page
        await navigator.goto(url);
        await navigator.waitForTimeout(2000);

        // Emit category started event
        emitCategoryScrapingStarted(url, urlIndex, categoryName);

        // Extract subcategory links
        const allLinks = await extractSubcategoryLinks(navigator);

        // Filter out excluded links
        const subcategoryLinks = filterExcludedLinks(allLinks, ["Alle"]);

        // Scrape products from each subcategory page
        const subcategories: { name: string; url: string; products: ProductData[] }[] = [];

        for (let i = 0; i < subcategoryLinks.length; i++) {
            const link = subcategoryLinks[i];
            const cleanName = cleanSubcategoryName(link.text);

            try {
                // Scrape all products from this category (with pagination)
                const products = await scrapeAllProductsFromPage(
                    navigator,
                    link.href,
                    5,
                    cleanName
                ); // Max 5 pages per category

                subcategories.push({
                    name: cleanName,
                    url: link.href,
                    products: products
                });

                console.log(
                    `   ✅ Worker ${urlIndex + 1}: Scraped ${products.length} products from ${cleanName}`
                );

            } catch (error) {
                console.error(`   ❌ Worker ${urlIndex + 1}: Error scraping ${cleanName}:`, error);
                // Still add the subcategory but with empty products
                subcategories.push({
                    name: cleanName,
                    url: link.href,
                    products: []
                });
            }
        }

        // Calculate totals for summary
        const totalProducts = subcategories.reduce((sum, sub) => sum + sub.products.length, 0);
        const successfulSubcategories = subcategories.filter(sub => sub.products.length > 0).length;

        // Show summary by subcategory
        console.log(`\n📋 Worker ${urlIndex + 1}: Products by subcategory:`);
        subcategories.forEach(({ name, products }) => {
            console.log(`   Worker ${urlIndex + 1}: ${name}: ${products.length} products`);
        });

        await browserManager.close();
        console.log(`🔒 Worker ${urlIndex + 1}: Browser closed`);

        return {
            name: categoryName,
            subcategories: subcategories
        };

    } catch (error) {
        console.error(`❌ Worker ${urlIndex + 1}: Error occurred:`, error);
        await browserManager.close();
        throw error;
    }
}

// Worker execution
if (parentPort && workerData) {
    scrapeUrl(workerData)
        .then((categoryInfo) => {
            parentPort!.postMessage({
                success: true,
                categoryInfo,
                url: workerData.url,
                urlIndex: workerData.urlIndex
            });
        })
        .catch((error) => {
            parentPort!.postMessage({
                success: false,
                error: error.message,
                url: workerData.url,
                urlIndex: workerData.urlIndex
            });
        });
}
