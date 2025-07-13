import { chromium, Browser, Page } from 'playwright';
import { BrowserConfig } from './types.js';

/**
 * Browser manager with dependency injection support
 */
export class BrowserManager {
    private browser: Browser | null = null;
    private page: Page | null = null;

    async launch(config: BrowserConfig): Promise<Page> {
        this.browser = await chromium.launch({
            headless: config.headless
        });

        this.page = await this.browser.newPage();
        await this.page.setViewportSize(config.viewport);

        return this.page;
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    getPage(): Page | null {
        return this.page;
    }
}

/**
 * Creates a page navigator adapter for dependency injection
 */
export function createPageNavigator(page: Page) {
    return {
        goto: async (url: string) => {
            await page.goto(url, { waitUntil: 'networkidle' });
        },
        waitForTimeout: (ms: number) => page.waitForTimeout(ms),
        locator: (selector: string) => page.locator(selector),
        click: async (selector: string) => {
            await page.click(selector);
        },
        waitForSelector: async (selector: string, options?: { timeout?: number }) => {
            await page.waitForSelector(selector, options);
        }
    };
}
