import express from 'express';
import mongoose from 'mongoose';
import { PlaywrightCrawler } from 'crawlee';
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';   // ⬅️ 1) أضفناه هنا

// -------------------- CONFIG --------------------
const MONGO_URL = 'mongodb://mongodb:27017/shop';
const REDIS_URL = 'redis://redis:6379';
const BASE_URL = 'https://warehouse-theme-metal.myshopify.com/collections/headphones';
const PORT = 3000;

// -------------------- MONGODB --------------------
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, default: null },
    image: { type: String, default: null },
    url: { type: String, default: null }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// -------------------- REDIS --------------------
const redisClient = createClient({ url: REDIS_URL });
redisClient.on('error', err => console.error('Redis Error', err));

// -------------------- RATE LIMIT --------------------
// ⬅️ 2) تحديد limit عام على جميع API routes
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 60,                   // 60 requests per minute لكل IP
    message: { error: 'Too many requests, try again later.' }
});

// ⬅️ 3) limiter خاص ببعض routes فقط
const productLimiter = rateLimit({
    windowMs: 30 * 1000,       // 30 seconds
    max: 20,                   // 20 requests فقط
    message: { error: 'Rate limit reached for product endpoints.' }
});

// -------------------- SCRAPER --------------------
async function runScraper() {
    const crawler = new PlaywrightCrawler({
        headless: true,
        maxRequestsPerCrawl: 50,
        async requestHandler({ page, enqueueLinks }) {
            await page.waitForSelector('div.product-item', { timeout: 15000 });

            const productsData = await page.$$eval('div.product-item', items =>
                items.map(item => {
                    const name = item.querySelector('.product-item__title')?.textContent?.trim() || null;
                    const priceSpans = item.querySelectorAll('span.price');
                    let price = null;

                    for (const span of priceSpans) {
                        const match = span.textContent?.match(/[\d,.]+/);
                        if (match) {
                            price = parseFloat(match[0].replace(',', '.'));
                            break;
                        }
                    }

                    const image = item.querySelector('img')?.src || null;
                    const url = item.querySelector('a')?.href || null;

                    return { name, price, image, url };
                })
            );

            for (const product of productsData) {
                if (product.name) {
                    await Product.updateOne(
                        { url: product.url },
                        { $set: product },
                        { upsert: true }
                    );
                }
            }

            await enqueueLinks({ selector: '.pagination__nav-item.link' });
        }
    });

    await crawler.run([BASE_URL]);
    console.log('Scraping terminé !');
}

// -------------------- API EXPRESS --------------------
async function runServer() {
    const app = express();
    app.use(express.json());

    // ⬅️ 4) تطبيق rate limit على جميع API routes
    app.use(globalLimiter);

    // ------------- API ROUTES ---------------
    app.get('/products', productLimiter, async (req, res) => {
        const cached = await redisClient.get('all_products');
        if (cached) return res.json(JSON.parse(cached));

        const products = await Product.find();
        await redisClient.setEx('all_products', 60, JSON.stringify(products));
        res.json(products);
    });

    app.get('/products/:id', productLimiter, async (req, res) => {
        const { id } = req.params;

        const cached = await redisClient.get(`product_${id}`);
        if (cached) return res.json(JSON.parse(cached));

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

        await redisClient.setEx(`product_${id}`, 60, JSON.stringify(product));
        res.json(product);
    });

    app.get('/products/search/:keyword', productLimiter, async (req, res) => {
        const { keyword } = req.params;
        const regex = new RegExp(keyword, 'i');
        const products = await Product.find({ name: regex });
        res.json(products);
    });

    // ------------------ SERVER ------------------
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

// -------------------- MAIN --------------------
async function main() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('✅ MongoDB connecté');

        await redisClient.connect();
        console.log('✅ Redis connecté');

        runServer();
        await runScraper();
    } catch (err) {
        console.error('Erreur main:', err);
    }
}

main();
