export type SubcategoryLink = {
    text: string;
    href: string;
};

export type BrowserConfig = {
    headless: boolean;
    viewport: {
        width: number;
        height: number;
    };
};

export type ScrapingResult = {
    url: string;
    title: string;
    heading: string;
    success: boolean;
    error?: string;
};

export type ProductData = {
    name: string;
    price: string | null;
    brand: string | null;
    link: string | null;
    image: string | null;
    description: string | null;
    pricePerKilo: string | null;
    discount: string | null;
    category: string;
};

/**
 * Extended types for database integration
 */
export type CategoryInfo = {
    id?: string;
    name: string;
    url: string;
    urlIndex: number;
    subcategoryLinks: SubcategoryLink[];
};

export type SubcategoryInfo = {
    id?: string;
    categoryId?: string;
    name: string;
    url: string;
    products: ProductData[];
};

export type ProductDataExtended = ProductData & {
    subcategoryId?: string;
    categoryId?: string;
    inStock?: boolean;
    originalPrice?: string;
    scrapedAt?: Date;
};
