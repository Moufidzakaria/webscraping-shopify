import express from 'express';
import mongoose from 'mongoose';
import { PlaywrightCrawler } from 'crawlee';
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';

const MONGO_URL = 'mongodb://mongodb:27017/shop';
const REDIS_URL = 'redis://redis:6379';
const PORT = 3000;

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, default: null },
  image: { type: String, default: null },
  url: { type: String, default: null }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
const redisClient = createClient({ url: REDIS_URL });
redisClient.on('error', err => console.error('Redis Error', err));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, try again later.' }
});

const productLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 20,
  message: { error: 'Rate limit reached for product endpoints.' }
});

async function runScraper() {
  const crawler = new PlaywrightCrawler({
    headless: true,
    maxRequestsPerCrawl: 50,
    async requestHandler({ page, enqueueLinks }) {
      await page.waitForSelector('div.product-item', { timeout: 15000 });
      const productsData = await page.$$eval('div.product-item', items =>
        items.map(item => {
          const name = item.querySelector('.product-item__title')?.textContent?.trim() || null;
          const price = parseFloat(item.querySelector('span.price')?.textContent?.replace(',', '.') || 0);
          const image = item.querySelector('img')?.src || null;
          const url = item.querySelector('a')?.href || null;
          return { name, price, image, url };
        })
      );
      for (const product of productsData) {
        if (product.name) {
          await Product.updateOne({ url: product.url }, { $set: product }, { upsert: true });
        }
      }
      await enqueueLinks({ selector: '.pagination__nav-item.link' });
    }
  });
  await crawler.run(['https://warehouse-theme-metal.myshopify.com/collections/headphones']);
  console.log('Scraping terminé !');
}

async function runServer() {
  const app = express();
  app.use(express.json());
  app.use(globalLimiter);

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/products', productLimiter, async (req, res) => {
    const cached = await redisClient.get('all_products');
    if (cached) return res.json(JSON.parse(cached));
    const products = await Product.find();
    await redisClient.setEx('all_products', 60, JSON.stringify(products));
    res.json(products);
  });

  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

async function main() {
  await mongoose.connect(MONGO_URL);
  await redisClient.connect();
  runServer();
  await runScraper();
}

main().catch(console.error);
