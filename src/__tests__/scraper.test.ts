import { describe, it, expect, vi } from 'vitest';
import { extractSubcategoryLinks, extractProductData, loadMoreProducts } from '../scraper.js';
import { PageNavigator } from '../scraper.js';

// Mock PageNavigator for testing
function createMockPageNavigator(): PageNavigator {
    return {
        goto: vi.fn(),
        waitForTimeout: vi.fn(),
        locator: vi.fn(),
        click: vi.fn(),
        waitForSelector: vi.fn()
    };
}

describe('extractSubcategoryLinks', () => {
    it('should extract valid subcategory links', async () => {
        const mockNavigator = createMockPageNavigator();

        // Mock chip elements
        const mockChips = [
            {
                textContent: vi.fn().mockResolvedValue('Fruits'),
                getAttribute: vi.fn().mockResolvedValue('/fruits')
            },
            {
                textContent: vi.fn().mockResolvedValue('Vegetables'),
                getAttribute: vi.fn().mockResolvedValue('/vegetables')
            }
        ];

        mockNavigator.locator = vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue(mockChips)
        });

        const result = await extractSubcategoryLinks(mockNavigator);

        expect(result).toEqual([
            { text: 'Fruits', href: 'https://oda.com/fruits' },
            { text: 'Vegetables', href: 'https://oda.com/vegetables' }
        ]);
    });

    it('should filter out invalid links', async () => {
        const mockNavigator = createMockPageNavigator();

        const mockChips = [
            {
                textContent: vi.fn().mockResolvedValue('Valid'),
                getAttribute: vi.fn().mockResolvedValue('/valid')
            },
            {
                textContent: vi.fn().mockResolvedValue(null),
                getAttribute: vi.fn().mockResolvedValue('/invalid')
            },
            {
                textContent: vi.fn().mockResolvedValue('Another Valid'),
                getAttribute: vi.fn().mockResolvedValue(null)
            }
        ];

        mockNavigator.locator = vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue(mockChips)
        });

        const result = await extractSubcategoryLinks(mockNavigator);

        expect(result).toEqual([
            { text: 'Valid', href: 'https://oda.com/valid' }
        ]);
    });
});

describe('extractProductData', () => {
    it('should extract product data from tiles using structured selectors', async () => {
        const mockNavigator = createMockPageNavigator();

        const mockTile = {
            locator: vi.fn().mockImplementation((selector) => {
                if (selector.includes('h3') || selector.includes('title') || selector.includes('name')) {
                    return {
                        first: vi.fn().mockReturnValue({
                            textContent: vi.fn().mockResolvedValue('Test Product')
                        })
                    };
                }
                if (selector.includes('price') || selector.includes('kr')) {
                    return {
                        allTextContents: vi.fn().mockResolvedValue(['kr 10,90', 'kr 2,50 /kg'])
                    };
                }
                if (selector.includes('brand') || selector === 'span, p') {
                    return {
                        allTextContents: vi.fn().mockResolvedValue(['Organic Brand', 'Test Product'])
                    };
                }
                if (selector === 'a') {
                    return {
                        first: vi.fn().mockReturnValue({
                            getAttribute: vi.fn().mockResolvedValue('/product/123')
                        })
                    };
                }
                if (selector === 'img') {
                    return {
                        first: vi.fn().mockReturnValue({
                            getAttribute: vi.fn().mockResolvedValue('/image.jpg')
                        })
                    };
                }
                return {
                    first: vi.fn().mockReturnValue({ textContent: vi.fn().mockResolvedValue(null) }),
                    allTextContents: vi.fn().mockResolvedValue([])
                };
            })
        };

        mockNavigator.locator = vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue([mockTile])
        });

        const result = await extractProductData(mockNavigator);

        expect(result).toEqual([
            {
                name: 'Test Product',
                price: 'kr 10,90',
                brand: 'Organic Brand',
                link: 'https://oda.com/product/123',
                image: '/image.jpg',
                description: 'Organic Brand',
                pricePerKilo: 'kr 2,50 /kg'
            }
        ]);
    });

    it('should handle missing product data gracefully', async () => {
        const mockNavigator = createMockPageNavigator();

        const mockTile = {
            locator: vi.fn().mockImplementation(() => ({
                first: vi.fn().mockReturnValue({
                    textContent: vi.fn().mockResolvedValue(null),
                    getAttribute: vi.fn().mockResolvedValue(null)
                }),
                allTextContents: vi.fn().mockResolvedValue([])
            }))
        };

        mockNavigator.locator = vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue([mockTile])
        });

        const result = await extractProductData(mockNavigator);

        expect(result).toEqual([]);
    });
});

describe('loadMoreProducts', () => {
    it('should click load more button when visible', async () => {
        const mockNavigator = createMockPageNavigator();
        const mockButton = {
            isVisible: vi.fn().mockResolvedValue(true),
            click: vi.fn().mockResolvedValue(undefined)
        };

        mockNavigator.locator = vi.fn().mockReturnValue(mockButton);

        const result = await loadMoreProducts(mockNavigator);

        expect(result).toBe(true);
        expect(mockButton.click).toHaveBeenCalled();
        expect(mockNavigator.waitForTimeout).toHaveBeenCalledWith(2000);
    });

    it('should return false when load more button is not visible', async () => {
        const mockNavigator = createMockPageNavigator();
        const mockButton = {
            isVisible: vi.fn().mockResolvedValue(false)
        };

        mockNavigator.locator = vi.fn().mockReturnValue(mockButton);

        const result = await loadMoreProducts(mockNavigator);

        expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
        const mockNavigator = createMockPageNavigator();
        mockNavigator.locator = vi.fn().mockImplementation(() => {
            throw new Error('Button not found');
        });

        const result = await loadMoreProducts(mockNavigator);

        expect(result).toBe(false);
    });
});
