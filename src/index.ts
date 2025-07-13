import { Worker } from 'worker_threads';
import path from 'path';
import { BrowserConfig, ProductData } from "./core/types";
import { createDatabaseConnector } from './connector';
import { databaseService } from './database/service';
import { emitCategoryScrapingStarted, emitSubcategoryScrapingStarted, emitSubcategoryScrapingFinished, emitCategoryScrapingFinished, emitAllScrapingFinished } from './connector';

const BROWSER_CONFIG: BrowserConfig = {
    headless: true,
    viewport: { width: 1920, height: 1080 },
};

const URLS = [
    "https://oda.com/no/categories/1135-bakeri-og-konditori/",
    "https://oda.com/no/categories/20-frukt-og-gront/",
    "https://oda.com/no/categories/1044-frokostblandinger-og-musli/",
    "https://oda.com/no/categories/26-kylling-og-kjott/",
    "https://oda.com/no/categories/2872-plantebasert/",
    "https://oda.com/no/categories/1283-meieri-ost-og-egg/",
    "https://oda.com/no/categories/283-fisk-og-sjomat/",
    "https://oda.com/no/categories/1347-restaurant/",
    "https://oda.com/no/categories/42-palegg/",
    "https://oda.com/no/categories/15-bakeingredienser/",
    "https://oda.com/no/categories/60-drikke/",
    "https://oda.com/no/categories/32-middager-og-tilbehor/",
    "https://oda.com/no/categories/1209-iskrem-dessert-og-kjeks/",
    "https://oda.com/no/categories/67-sjokolade-snacks-og-godteri/",
    "https://oda.com/no/categories/73-baby-og-barn/",
    "https://oda.com/no/categories/1181-hygiene-og-skjonnhet/",
    "https://oda.com/no/categories/365-legemidler-og-helsekost/",
    "https://oda.com/no/categories/1190-trening/",
    "https://oda.com/no/categories/85-hus-og-hjem/",
    "https://oda.com/no/categories/401-blomster-og-planter/",
    "https://oda.com/no/categories/488-mathall/",
    "https://oda.com/no/categories/85-hus-og-hjem/",
    "https://oda.com/no/categories/101-snus-og-tobakk/",
];



const databaseConnector = createDatabaseConnector({
    handleCategoryScrapingStarted: async (event) => {
        console.log(`🚀 Category started: ${event.categoryName} (${event.url})`);
        // Event handler only logs - database operations handled in main loop
    },
    handleSubcategoryScrapingStarted: async (event) => {
        console.log(`🚀 Subcategory started: ${event.subcategoryName} for category ${event.categoryId}`);
        // Event handler only logs - database operations handled in main loop
    },
    handleSubcategoryScrapingFinished: async (event) => {
        console.log(`✅ Subcategory finished: ${event.subcategoryName} with ${event.products.length} products`);
        // Event handler only logs - database operations handled in main loop
    },
    handleCategoryScrapingFinished: async (event) => {
        console.log(`✅ Category finished: ${event.url} with ${event.totalProducts} products across ${event.totalSubcategories} subcategories`);
        // Event handler only logs - database operations handled in main loop
    },
    handleAllScrapingFinished: async (event) => {
        console.log(`🎉 All scraping finished. Total URLs: ${event.totalUrls}, Successful: ${event.successfulUrls}, Products: ${event.totalProducts}`);
        // Event handler only logs - database operations handled in main loop
    }
})

interface WorkerResult {
    success: boolean;
    categoryInfo?: {
        name: string;
        subcategories: {
            name: string;
            url: string;
            products: ProductData[];
        }[];
    };
    error?: string;
    url: string;
    urlIndex: number;
}

function createWorker(url: string, urlIndex: number): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
        // Use correct path to worker file in core folder
        const workerPath = path.join(__dirname, 'core', 'worker.js');
        const worker = new Worker(workerPath, {
            workerData: {
                url,
                urlIndex,
                totalUrls: URLS.length,
                browserConfig: BROWSER_CONFIG,
            }
        });

        worker.on('message', (result: WorkerResult) => {
            resolve(result);
        });

        worker.on('error', (error) => {
            reject(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}

async function main() {
    try {
        // Connect to database
        await databaseConnector.connect();

        // Map to store category IDs for each URL
        const categoryIds = new Map<string, string>();

        // Create workers for each URL
        const workerPromises = URLS.map((url, index) => {
            return createWorker(url, index);
        });

        // Wait for all workers to complete
        const results = await Promise.allSettled(workerPromises);

        // Process results and emit events
        let totalProducts = 0;
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const url = URLS[i];

            if (result.status === 'fulfilled' && result.value.success) {
                const { categoryInfo, urlIndex } = result.value;


                if (categoryInfo && categoryInfo.subcategories.length > 0) {
                    try {
                        const categoryName = extractCategoryNameFromUrl(url);

                        // Emit category started event first
                        emitCategoryScrapingStarted(url, urlIndex, categoryName);

                        // Create category in database (upsert handles duplicates)
                        const categoryId = await databaseService.createCategory(url, categoryName, urlIndex);
                        categoryIds.set(url, categoryId);

                        console.log(`📝 Created/updated category "${categoryName}" with ID: ${categoryId}`);

                        // Process each subcategory
                        let categoryTotalProducts = 0;
                        for (const subcategory of categoryInfo.subcategories) {
                            try {
                                // Emit subcategory started event
                                emitSubcategoryScrapingStarted(url, urlIndex, categoryId, subcategory.name, subcategory.url);

                                // Create subcategory (upsert handles duplicates)
                                const subcategoryId = await databaseService.createSubcategory(categoryId, subcategory.name, subcategory.url);

                                // Save products (upsert handles duplicates)
                                await databaseService.saveProducts(categoryId, subcategoryId, subcategory.products);

                                // Update subcategory completion
                                await databaseService.updateSubcategoryCompletion(subcategoryId, true);

                                categoryTotalProducts += subcategory.products.length;
                                console.log(`   ✅ Processed subcategory "${subcategory.name}" with ${subcategory.products.length} products`);

                                // Emit subcategory finished event
                                emitSubcategoryScrapingFinished(url, urlIndex, categoryId, subcategoryId, subcategory.name, subcategory.products, true);

                            } catch (error) {
                                console.error(`   ❌ Error processing subcategory "${subcategory.name}":`, error);

                                // Emit subcategory finished event with error
                                emitSubcategoryScrapingFinished(url, urlIndex, categoryId, 'ERROR', subcategory.name, [], false, error instanceof Error ? error.message : String(error));
                            }
                        }

                        // Update category completion
                        await databaseService.updateCategoryCompletion(categoryId, true);
                        totalProducts += categoryTotalProducts;

                        // Emit category finished event
                        emitCategoryScrapingFinished(url, urlIndex, categoryId, categoryTotalProducts, categoryInfo.subcategories.length, true);

                        console.log(`📦 Worker ${urlIndex + 1}: Total products for category: ${categoryTotalProducts}`);

                    } catch (error) {
                        console.error(`❌ Worker ${urlIndex + 1}: Error processing category:`, error);

                        // Try to emit category finished event with error if we have a categoryId
                        const categoryId = categoryIds.get(url);
                        if (categoryId) {
                            emitCategoryScrapingFinished(url, urlIndex, categoryId, 0, 0, false, error instanceof Error ? error.message : String(error));
                        }
                    }
                } else {
                    console.log(`\n⚠️ Worker ${urlIndex + 1}: No subcategories found`);

                    // Still create category and emit events for completeness
                    try {
                        const categoryName = extractCategoryNameFromUrl(url);

                        // Emit category started event
                        emitCategoryScrapingStarted(url, urlIndex, categoryName);

                        // Create category in database
                        const categoryId = await databaseService.createCategory(url, categoryName, urlIndex);
                        await databaseService.updateCategoryCompletion(categoryId, true);

                        // Emit category finished event with no subcategories
                        emitCategoryScrapingFinished(url, urlIndex, categoryId, 0, 0, true);
                    } catch (error) {
                        console.error(`❌ Failed to create empty category:`, error);
                    }
                }
            } else {
                const urlIndex = i;
                const errorMessage = result.status === 'fulfilled'
                    ? result.value.error
                    : String(result.reason);

                console.error(`❌ Worker ${urlIndex + 1}: Failed - ${errorMessage}`);

                // Try to create category and mark as failed
                try {
                    const categoryName = extractCategoryNameFromUrl(url);

                    // Emit category started event
                    emitCategoryScrapingStarted(url, urlIndex, categoryName);

                    // Create category and mark as failed
                    const categoryId = await databaseService.createCategory(url, categoryName, urlIndex);
                    await databaseService.updateCategoryCompletion(categoryId, false, errorMessage);

                    // Emit category finished event with error
                    emitCategoryScrapingFinished(url, urlIndex, categoryId, 0, 0, false, errorMessage);
                } catch (dbError) {
                    console.error(`❌ Failed to create failed category in database:`, dbError);
                }
            }
        }

        // Summary and final event
        const successfulWorkers = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        console.log(`\n🎉 All workers completed!`);
        console.log(`📊 Successful workers: ${successfulWorkers}/${URLS.length}`);
        console.log(`📦 Total products collected: ${totalProducts}`);

        // Emit all scraping finished event
        emitAllScrapingFinished(URLS.length, successfulWorkers, totalProducts);

    } catch (error) {
        console.error("❌ Error occurred:", error);
    } finally {
        // Disconnect from database
        await databaseConnector.disconnect();
    }
}

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

// Run the scraper
main();
