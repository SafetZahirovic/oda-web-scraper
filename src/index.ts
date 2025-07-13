import { BrowserManager, createPageNavigator } from "./browser";
import { exportToCSV, exportToJSON } from "./export";
import { extractSubcategoryLinks, scrapeAllProductsFromPage } from "./scraper";
import { BrowserConfig, ProductData } from "./types";
import { filterExcludedLinks } from "./utils";

const BROWSER_CONFIG: BrowserConfig = {
    headless: true,
    viewport: { width: 1920, height: 1080 },
};

const URLS = [
    "https://oda.com/no/categories/1135-bakeri-og-konditori/",
    "https://oda.com/no/categories/20-frukt-og-gront/",
];

async function main() {
    const browserManager = new BrowserManager();

    try {
        // Process URLs sequentially to avoid browser conflicts
        for (let urlIndex = 0; urlIndex < URLS.length; urlIndex++) {
            const url = URLS[urlIndex];

            try {
                console.log(`\n🚀 Starting web scraper for URL ${urlIndex + 1}/${URLS.length}...`);

                // Launch browser with dependency injection
                const page = await browserManager.launch(BROWSER_CONFIG);
                const navigator = createPageNavigator(page);

                // Navigate to the main category page
                console.log(`📍 Navigating to ${url}...`);
                await navigator.goto(url);
                await navigator.waitForTimeout(2000);

                // Extract subcategory links
                console.log("🔍 Looking for choice chip buttons...");
                const allLinks = await extractSubcategoryLinks(navigator);
                console.log(`Found ${allLinks.length} choice chip buttons`);

                // Filter out excluded links
                const subcategoryLinks = filterExcludedLinks(allLinks, ["Alle"]);
                console.log(
                    `✅ Found ${subcategoryLinks.length} subcategory links (excluding 'Alle'):`
                );

                subcategoryLinks.forEach((link, index) => {
                    console.log(`${index + 1}. ${link.text} -> ${link.href}`);
                });

                // Scrape products from each subcategory page
                const allProducts: ProductData[] = [];

                for (let i = 0; i < subcategoryLinks.length; i++) {
                    const link = subcategoryLinks[i];
                    console.log(
                        `\n📖 Scraping products from ${i + 1}/${subcategoryLinks.length}: ${link.text}`
                    );
                    console.log(`🔗 URL: ${link.href}`);

                    try {
                        // Scrape all products from this category (with pagination)
                        const products = await scrapeAllProductsFromPage(
                            navigator,
                            link.href,
                            5,
                            link.text
                        ); // Max 5 pages per category

                        allProducts.push(...products);

                        console.log(
                            `   ✅ Scraped ${products.length} products from ${link.text}`
                        );
                    } catch (error) {
                        console.error(`   ❌ Error scraping ${link.text}:`, error);
                    }
                }

                // Group products by category for summary (but keep flat structure for export)
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

                console.log(`\n🎉 Scraping Complete for ${url}!`);
                console.log(`📊 Total products scraped: ${totalProducts}`);
                console.log(
                    `📦 Successful categories: ${successfulCategories}/${subcategoryLinks.length}`
                );

                // Show summary by category
                console.log(`\n📋 Products by category:`);
                Object.entries(productsByCategory).forEach(([category, products]) => {
                    console.log(`   ${category}: ${products.length} products`);
                });

                // Export data to files (flat structure) with URL-specific filename
                if (totalProducts > 0) {
                    console.log(`\n💾 Exporting data...`);
                    try {
                        const urlSlug = url.split('/').slice(-2, -1)[0]; // Extract category ID from URL
                        await exportToJSON(allProducts, `oda-products-${urlSlug}`);
                        await exportToCSV(allProducts, `oda-products-${urlSlug}`);
                        console.log(`✅ Data exported successfully!`);
                    } catch (error) {
                        console.error(`❌ Export failed:`, error);
                    }
                } else {
                    console.log(`\n⚠️ No products to export`);
                }

                console.log(`✅ URL ${urlIndex + 1}/${URLS.length} processed successfully`);

            } catch (error) {
                console.error(`❌ URL ${urlIndex + 1}/${URLS.length} failed:`, error);
            }
        }

    } catch (error) {
        console.error("❌ Error occurred:", error);
    } finally {
        await browserManager.close();
        console.log("🔒 Browser closed");
    }
}

// Run the scraper
main();
