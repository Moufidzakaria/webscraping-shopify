# Getting started with Crawlee

This example uses `PlaywrightCrawler` to recursively crawl https://crawlee.dev using the browser automation library [Playwright](https://playwright.dev).

You can find more examples and documentation at the following links:

- [Step-by-step tutorial](https://crawlee.dev/js/docs/introduction) for Crawlee
- `PlaywrightCrawler` [API documentation](https://crawlee.dev/js/api/playwright-crawler/class/PlaywrightCrawler)
- Other [examples](https://crawlee.dev/js/docs/examples/playwright-crawler)
# web-scraping-shopify
# shoipfy-scraping
# Web Scraper API

Une API Node.js qui scrape des produits depuis une boutique Shopify et les expose via une API REST.  
Elle utilise **MongoDB** pour le stockage des données et **Redis** pour le caching, et est prête pour un déploiement Docker.

---

## ⚙️ Fonctionnalités

- Scraper les produits depuis Shopify (`BASE_URL` configurable)
- Stockage dans MongoDB
- Mise en cache des requêtes avec Redis
- API REST pour récupérer :
  - Tous les produits
  - Produit par ID
  - Recherche par mot-clé
- Prêt pour le déploiement avec **Docker** et **Docker Compose**
- CI/CD configuré via **GitHub Actions**

---

## 🛠️ Tech Stack

- Node.js 22
- Express
- MongoDB 7
- Redis 8
- Crawlee (PlaywrightCrawler)
- Docker & Docker Compose
- GitHub Actions pour CI/CD

---

## 🚀 Installation

Cloner le projet :

```bash
git clone https://github.com/<votre-utilisateur>/web-scraping.git
cd web-scraping
