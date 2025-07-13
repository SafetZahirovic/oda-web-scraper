import { SubcategoryLink } from './types.js';

/**
 * Normalizes a URL by prepending the base URL if it's relative
 */
export function normalizeUrl(href: string, baseUrl: string = 'https://oda.com'): string {
    return href.startsWith('http') ? href : `${baseUrl}${href}`;
}

/**
 * Filters out links that contain the specified excluded text
 */
export function filterExcludedLinks(
    links: SubcategoryLink[],
    excludedTexts: string[] = ['Alle']
): SubcategoryLink[] {
    return links.filter(link =>
        !excludedTexts.some(excludedText =>
            link.text.includes(excludedText)
        )
    );
}

/**
 * Creates a safe filename from text by replacing non-alphanumeric characters
 */
export function createSafeFilename(text: string): string {
    return text.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Validates that a subcategory link has required properties
 */
export function isValidSubcategoryLink(
    text: string | null,
    href: string | null
): boolean {
    return Boolean(text && href && text.trim().length > 0 && href.trim().length > 0);
}
