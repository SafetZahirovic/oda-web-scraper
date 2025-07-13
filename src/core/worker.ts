import { parentPort, workerData } from 'worker_threads';
import { BrowserManager, createPageNavigator } from './browser.js';
import { extractSubcategoryLinks, scrapeAllProductsFromPage } from './scraper.js';
import { BrowserConfig, ProductData } from './types.js';
import { filterExcludedLinks } from './utils.js';
import { emitCategoryScrapingStarted, emitItemScrapingFinished } from "../connector.js"


type WorkerData = {
    url: string;
    urlIndex: number;
    totalUrls: number;
    browserConfig: BrowserConfig;
};

async function scrapeUrl(data: WorkerData): Promise<ProductData[]> {
    const { url, urlIndex, totalUrls, browserConfig } = data;
    const browserManager = new BrowserManager();

    try {
        console.log(`\n🚀 Worker ${urlIndex + 1}: Starting web scraper for URL ${urlIndex + 1}/${totalUrls}...`);

        // Launch browser with dependency injection
        const page = await browserManager.launch(browserConfig);
        const navigator = createPageNavigator(page);

        // Navigate to the main category page
        console.log(`📍 Worker ${urlIndex + 1}: Navigating to ${url}...`);
        await navigator.goto(url);
        await navigator.waitForTimeout(2000);

        // Extract subcategory links
        console.log(`🔍 Worker ${urlIndex + 1}: Looking for choice chip buttons...`);
        const allLinks = await extractSubcategoryLinks(navigator);
        console.log(`Worker ${urlIndex + 1}: Found ${allLinks.length} choice chip buttons`);

        // Filter out excluded links
        const subcategoryLinks = filterExcludedLinks(allLinks, ["Alle"]);
        console.log(
            `✅ Worker ${urlIndex + 1}: Found ${subcategoryLinks.length} subcategory links (excluding 'Alle'):`
        );

        subcategoryLinks.forEach((link, index) => {
            console.log(`Worker ${urlIndex + 1}: ${index + 1}. ${link.text} -> ${link.href}`);
        });

        // Scrape products from each subcategory page
        const allProducts: ProductData[] = [];

        for (let i = 0; i < subcategoryLinks.length; i++) {
            const link = subcategoryLinks[i];
            console.log(
                `\n📖 Worker ${urlIndex + 1}: Scraping products from ${i + 1}/${subcategoryLinks.length}: ${link.text}`
            );
            console.log(`🔗 Worker ${urlIndex + 1}: URL: ${link.href}`);

            try {
                // Emit category scraping started event
                emitCategoryScrapingStarted(url, urlIndex, link.text);

                // Scrape all products from this category (with pagination)
                const products = await scrapeAllProductsFromPage(
                    navigator,
                    link.href,
                    5,
                    link.text
                ); // Max 5 pages per category

                allProducts.push(...products);

                console.log(
                    `   ✅ Worker ${urlIndex + 1}: Scraped ${products.length} products from ${link.text}`
                );

                // Emit item scraping finished event for real-time processing
                emitItemScrapingFinished(url, urlIndex, link.text, products);
            } catch (error) {
                console.error(`   ❌ Worker ${urlIndex + 1}: Error scraping ${link.text}:`, error);
            }
        }

        // Group products by category for summary
        const productsByCategory = allProducts.reduce((acc, product) => {
            if (!acc[product.category]) {
                acc[product.category] = [];
            }
            acc[product.category].push(product);
            return acc;
        }, {} as Record<string, ProductData[]>);

        // Summary
        const totalProducts = allProducts.length;
        const successfulCategories = Object.keys(productsByCategory).length;

        console.log(`\n🎉 Worker ${urlIndex + 1}: Scraping Complete for ${url}!`);
        console.log(`📊 Worker ${urlIndex + 1}: Total products scraped: ${totalProducts}`);
        console.log(
            `📦 Worker ${urlIndex + 1}: Successful categories: ${successfulCategories}/${subcategoryLinks.length}`
        );

        // Show summary by category
        console.log(`\n📋 Worker ${urlIndex + 1}: Products by category:`);
        Object.entries(productsByCategory).forEach(([category, products]) => {
            console.log(`   Worker ${urlIndex + 1}: ${category}: ${products.length} products`);
        });

        await browserManager.close();
        console.log(`🔒 Worker ${urlIndex + 1}: Browser closed`);

        return allProducts;

    } catch (error) {
        console.error(`❌ Worker ${urlIndex + 1}: Error occurred:`, error);
        await browserManager.close();
        throw error;
    }
}

// Worker execution
if (parentPort && workerData) {
    scrapeUrl(workerData)
        .then((products) => {
            parentPort!.postMessage({
                success: true,
                products,
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
