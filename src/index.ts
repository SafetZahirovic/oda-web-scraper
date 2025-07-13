import { Worker } from 'worker_threads';
import path from 'path';
import { exportToCSV, exportToJSON } from "./export";
import { BrowserConfig, ProductData } from "./types";

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
    "https://oda.com/no/categories/1044-frokostblandinger-og-musli/",
];

interface WorkerResult {
    success: boolean;
    products?: ProductData[];
    error?: string;
    url: string;
    urlIndex: number;
}

function createWorker(url: string, urlIndex: number): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
        // Use correct path to worker file
        const workerPath = path.join(__dirname, 'worker.js');
        const worker = new Worker(workerPath, {
            workerData: {
                url,
                urlIndex,
                totalUrls: URLS.length,
                browserConfig: BROWSER_CONFIG
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
        console.log(`� Starting ${URLS.length} workers for parallel scraping...`);

        // Create workers for each URL
        const workerPromises = URLS.map((url, index) => createWorker(url, index));

        // Wait for all workers to complete
        const results = await Promise.allSettled(workerPromises);

        // Process results
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const url = URLS[i];

            if (result.status === 'fulfilled' && result.value.success) {
                const { products, urlIndex } = result.value;

                console.log(`\n✅ Worker ${urlIndex + 1}: Successfully processed ${url}`);

                if (products && products.length > 0) {
                    console.log(`\n💾 Worker ${urlIndex + 1}: Exporting data...`);
                    try {
                        const urlSlug = url.split('/').slice(-2, -1)[0]; // Extract category ID from URL
                        await exportToJSON(products, `oda-products-${urlSlug}`);
                        await exportToCSV(products, `oda-products-${urlSlug}`);
                        console.log(`✅ Worker ${urlIndex + 1}: Data exported successfully!`);
                    } catch (error) {
                        console.error(`❌ Worker ${urlIndex + 1}: Export failed:`, error);
                    }
                } else {
                    console.log(`\n⚠️ Worker ${urlIndex + 1}: No products to export`);
                }
            } else {
                const urlIndex = i;
                if (result.status === 'fulfilled') {
                    console.error(`❌ Worker ${urlIndex + 1}: Failed - ${result.value.error}`);
                } else {
                    console.error(`❌ Worker ${urlIndex + 1}: Failed - ${result.reason}`);
                }
            }
        }

        // Summary
        const successfulWorkers = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        console.log(`\n🎉 All workers completed!`);
        console.log(`📊 Successful workers: ${successfulWorkers}/${URLS.length}`);

    } catch (error) {
        console.error("❌ Error occurred:", error);
    }
}

// Run the scraper
main();
