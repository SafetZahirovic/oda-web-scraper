import { Browser, Page, Locator } from 'playwright';
import { SubcategoryLink, ProductData } from './types';
import { normalizeUrl, isValidSubcategoryLink } from './utils';

export interface PageNavigator {
    goto(url: string): Promise<void>;
    waitForTimeout(ms: number): Promise<void>;
    locator(selector: string): Locator;
    click(selector: string): Promise<void>;
    waitForSelector(selector: string, options?: { timeout?: number }): Promise<void>;
}

/**
 * Extracts subcategory links from choice chip elements
 */
export async function extractSubcategoryLinks(
    navigator: PageNavigator,
    selector: string = 'a.k-choice-chip'
): Promise<SubcategoryLink[]> {
    const choiceChips = await navigator.locator(selector).all();
    const links: SubcategoryLink[] = [];

    for (const chip of choiceChips) {
        const text = await chip.textContent();
        const href = await chip.getAttribute('href');

        if (isValidSubcategoryLink(text, href)) {
            links.push({
                text: text!.trim(),
                href: normalizeUrl(href!)
            });
        }
    }

    return links;
}

/**
 * Extracts product data from product tile elements
 */
export async function extractProductData(
    navigator: PageNavigator,
    selector: string = 'article[data-testid="product-tile"]'
): Promise<ProductData[]> {
    const productTiles = await navigator.locator(selector).all();
    const products: ProductData[] = [];

    for (const tile of productTiles) {
        try {
            // Extract structured data from specific common selectors
            const allParagraphs = await tile.locator('p').allInnerTexts();
            const allSpans = await tile.locator('span').allInnerTexts();

            const [title, description, price] = allParagraphs
            const [pricePerKiloOrDiscount] = allSpans

            // Extract product link
            const productLink = await tile.locator('a').first().getAttribute('href');

            // Extract image if available
            const image = await tile.locator('img').first().getAttribute('src');

            if (title) {
                products.push({
                    name: title,
                    price: price,
                    brand: description,
                    link: productLink ? normalizeUrl(productLink) : null,
                    image: image || null,
                    description: description,
                    pricePerKilo: pricePerKiloOrDiscount.includes('kr') ? pricePerKiloOrDiscount : null,
                    discount: pricePerKiloOrDiscount.includes('kr') ? null : pricePerKiloOrDiscount,
                });
            }
        } catch (error) {
            console.warn('Failed to extract product data from tile:', error);
        }
    }

    return products;
}

/**
 * Clicks the "load more" button and waits for new content
 */
export async function loadMoreProducts(
    navigator: PageNavigator,
    loadMoreSelector: string = 'a[rel="next"]'
): Promise<boolean> {
    try {
        // Check if load more button exists and is visible
        const loadMoreButton = navigator.locator(loadMoreSelector);
        const isVisible = await loadMoreButton.isVisible();

        if (!isVisible) {
            return false;
        }

        // Click the load more button
        await loadMoreButton.click();

        // Wait for new content to load
        await navigator.waitForTimeout(2000);

        return true;
    } catch (error) {
        console.warn('Failed to load more products:', error);
        return false;
    }
}

/**
 * Scrapes all products from a category page, handling pagination
 */
export async function scrapeAllProductsFromPage(
    navigator: PageNavigator,
    url: string,
    maxPages: number = 10
): Promise<ProductData[]> {
    await navigator.goto(url);
    await navigator.waitForTimeout(2000);

    const allProducts: ProductData[] = [];
    let currentPage = 1;

    while (currentPage <= maxPages) {
        console.log(`   📦 Loading page ${currentPage}...`);

        // Extract products from current page
        const products = await extractProductData(navigator);
        allProducts.push(...products);

        console.log(`   ✅ Found ${products.length} products (total: ${allProducts.length})`);

        // Try to load more products
        const hasMore = await loadMoreProducts(navigator);

        if (!hasMore) {
            console.log(`   🏁 No more products to load`);
            break;
        }

        currentPage++;
    }

    return allProducts;
}
