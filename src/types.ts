export interface SubcategoryLink {
    text: string;
    href: string;
}

export interface BrowserConfig {
    headless: boolean;
    viewport: {
        width: number;
        height: number;
    };
}

export interface ScrapingResult {
    url: string;
    title: string;
    heading: string;
    success: boolean;
    error?: string;
}

export interface ProductData {
    name: string;
    price: string | null;
    brand: string | null;
    link: string | null;
    image: string | null;
    description: string | null;
    pricePerKilo: string | null;
    discount: string | null;
    category: string;
}
