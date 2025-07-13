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
