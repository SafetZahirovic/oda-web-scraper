import { BrowserManager, createPageNavigator } from './browser';
import { extractSubcategoryLinks, scrapeAllProductsFromPage } from './scraper';
import { filterExcludedLinks } from './utils';
import { exportToJSON, exportToCSV } from './export';
import { BrowserConfig, SubcategoryLink, ProductData } from './types';

const BROWSER_CONFIG: BrowserConfig = {
    headless: true,
    viewport: { width: 1920, height: 1080 }
};

const BASE_URL = 'https://oda.com/no/categories/20-frukt-og-gront/';

async function main() {
    const browserManager = new BrowserManager();

    try {
        console.log('🚀 Starting web scraper...');

        // Launch browser with dependency injection
        const page = await browserManager.launch(BROWSER_CONFIG);
        const navigator = createPageNavigator(page);

        // Navigate to the main category page
        console.log(`📍 Navigating to ${BASE_URL}...`);
        await navigator.goto(BASE_URL);
        await navigator.waitForTimeout(2000);

        // Extract subcategory links
        console.log('🔍 Looking for choice chip buttons...');
        const allLinks = await extractSubcategoryLinks(navigator);
        console.log(`Found ${allLinks.length} choice chip buttons`);

        // Filter out excluded links
        const subcategoryLinks = filterExcludedLinks(allLinks, ['Alle']);
        console.log(`✅ Found ${subcategoryLinks.length} subcategory links (excluding 'Alle'):`);

        subcategoryLinks.forEach((link, index) => {
            console.log(`${index + 1}. ${link.text} -> ${link.href}`);
        });

        // Scrape products from each subcategory page
        const allProducts: ProductData[] = [];

        for (let i = 0; i < subcategoryLinks.length; i++) {
            const link = subcategoryLinks[i];
            console.log(`\n📖 Scraping products from ${i + 1}/${subcategoryLinks.length}: ${link.text}`);
            console.log(`🔗 URL: ${link.href}`);

            try {
                // Scrape all products from this category (with pagination)
                const products = await scrapeAllProductsFromPage(navigator, link.href, 5, link.text); // Max 5 pages per category

                // Add category to each product for flat structure (redundant now since scraper handles it)
                allProducts.push(...products);

                console.log(`   ✅ Scraped ${products.length} products from ${link.text}`);

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

        console.log(`\n🎉 Scraping Complete!`);
        console.log(`📊 Total products scraped: ${totalProducts}`);
        console.log(`📦 Successful categories: ${successfulCategories}/${subcategoryLinks.length}`);

        // Show summary by category
        console.log(`\n📋 Products by category:`);
        Object.entries(productsByCategory).forEach(([category, products]) => {
            console.log(`   ${category}: ${products.length} products`);
        });

        // Export data to files (flat structure)
        if (totalProducts > 0) {
            console.log(`\n💾 Exporting data...`);
            try {
                await exportToJSON(allProducts, 'oda-products');
                await exportToCSV(allProducts, 'oda-products');
                console.log(`✅ Data exported successfully!`);
            } catch (error) {
                console.error(`❌ Export failed:`, error);
            }
        } else {
            console.log(`\n⚠️ No products to export`);
        }

    } catch (error) {
        console.error('❌ Error occurred:', error);
    } finally {
        await browserManager.close();
        console.log('🔒 Browser closed');
    }
}

// Run the scraper
main();
