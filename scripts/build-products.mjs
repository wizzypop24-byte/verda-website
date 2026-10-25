/**
 * Generates one static, SEO-friendly page per product.
 * Usage: node scripts/build-products.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const products = JSON.parse(readFileSync("site/products/products.json", "utf8"));
const SITE = "https://fir-479b9.web.app";

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const inr = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

function renderProduct(p) {
  const url = `${SITE}/products/${p.slug}/`;
  const title = `${p.name} | Verda`.slice(0, 60);
  const off = Math.round((1 - p.price / p.mrp) * 100);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: p.name,
        image: `${SITE}${p.image}`,
        description: p.description,
        sku: p.id,
        brand: { "@type": "Brand", name: "Verda" },
        offers: {
          "@type": "Offer",
          price: String(p.price),
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url,
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: String(p.rating),
          reviewCount: String(p.reviews),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: p.concern, item: `${SITE}/#concerns` },
          { "@type": "ListItem", position: 3, name: p.name, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: p.faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  const related = products.filter((item) => p.related.includes(item.id));

  return `<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(p.tagline)}" />
    <link rel="canonical" href="${url}" />
    <meta name="theme-color" content="#17724a" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${esc(p.name)}" />
    <meta property="og:description" content="${esc(p.tagline)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE}${esc(p.image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/products/product.css" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body class="pdp" data-product="${esc(p.id)}">
    <a class="skip-link" href="#main">Skip to content</a>

    <header class="pdp-head">
      <div class="container pdp-head__inner">
        <a class="logo" href="/" aria-label="Verda home">verda<span class="logo__dot" aria-hidden="true">.</span></a>
        <div class="pdp-head__actions">
          <a class="pdp-head__link" href="/#bestsellers">Shop all</a>
          <a class="pdp-head__cart" href="/checkout/" aria-label="Cart">
            Cart <span class="pdp-head__count" id="cart-count">0</span>
          </a>
        </div>
      </div>
    </header>

    <main id="main">
      <nav class="crumbs container" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li><a href="/#concerns">${esc(p.concern)}</a></li>
          <li aria-current="page">${esc(p.name)}</li>
        </ol>
      </nav>

      <section class="pdp-grid container" aria-labelledby="product-title">
        <figure class="pdp-media">
          <img src="${esc(p.image)}" alt="${esc(p.name)} bottle (demo image)" width="600" height="600" fetchpriority="high" />
        </figure>

        <div class="pdp-info">
          <p class="pdp-concern">${esc(p.concern)}</p>
          <h1 id="product-title">${esc(p.name)}</h1>
          <p class="pdp-tagline">${esc(p.tagline)}</p>

          <div class="rating">
            <span aria-hidden="true">★★★★★</span>
            <span class="rating__text">${p.rating} (${p.reviews} reviews)</span>
          </div>

          <div class="price pdp-price">
            <span class="price__now">${inr(p.price)}</span>
            <span class="price__mrp">${inr(p.mrp)}</span>
            <span class="price__off">${off}% off</span>
          </div>
          <p class="pdp-tax">Inclusive of 5% GST · ${esc(p.servingLabel)}</p>

          <p class="pdp-desc">${esc(p.description)}</p>

          <form class="pdp-buy" id="buy-form">
            <div class="qty qty--lg" aria-label="Quantity">
              <button type="button" id="qty-minus" aria-label="Decrease quantity">−</button>
              <input id="qty" name="qty" type="number" value="1" min="1" max="10" inputmode="numeric" aria-label="Quantity" />
              <button type="button" id="qty-plus" aria-label="Increase quantity">+</button>
            </div>
            <button class="btn btn--primary" type="submit">Add to cart</button>
            <button class="btn btn--ghost" type="button" id="buy-now">Buy now</button>
          </form>

          <ul class="pdp-trust">
            <li>Free shipping over ₹999</li>
            <li>COD up to ₹2,000</li>
            <li>Sealed returns within 30 days</li>
          </ul>

          <details class="pdp-acc">
            <summary>Suggested use</summary>
            <p>${esc(p.use)}</p>
          </details>
          <details class="pdp-acc">
            <summary>Storage and allergens</summary>
            <p>${esc(p.storage)}</p>
            <p>${esc(p.allergens)}</p>
          </details>
          <details class="pdp-acc">
            <summary>Lab reports</summary>
            <p>Every batch is tested by an independent laboratory. The certificate of analysis for this batch is published here before dispatch.</p>
            <p><a href="#" class="link" data-lab-report>View lab report (demo)</a></p>
          </details>

          <p class="pdp-disclaimer">Not for medicinal use. Consult a qualified healthcare professional before use, especially if pregnant, nursing, or on medication.</p>
        </div>
      </section>

      <section class="pdp-section container" aria-labelledby="benefits-title">
        <h2 id="benefits-title">What it supports</h2>
        <div class="pdp-benefits">
          ${p.benefits
            .map(
              (benefit) => `<article><h3>${esc(benefit.title)}</h3><p>${esc(benefit.text)}</p></article>`,
            )
            .join("")}
        </div>
      </section>

      <section class="pdp-section container" aria-labelledby="ingredients-title">
        <h2 id="ingredients-title">What's inside</h2>
        <table class="pdp-table">
          <caption class="visually-hidden">Ingredients in ${esc(p.name)}</caption>
          <thead><tr><th scope="col">Ingredient</th><th scope="col">Dose</th><th scope="col">Form</th><th scope="col">Why it's included</th></tr></thead>
          <tbody>
            ${p.ingredients
              .map(
                (item) =>
                  `<tr><th scope="row" data-label="Ingredient">${esc(item.name)}</th><td data-label="Dose">${esc(item.dose)}</td><td data-label="Form">${esc(item.form)}</td><td data-label="Why it's included">${esc(item.why)}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </section>

      <section class="pdp-section container" aria-labelledby="related-title">
        <h2 id="related-title">Pairs well with</h2>
        <div class="pdp-related">
          ${related
            .map(
              (item) => `
            <a class="pdp-related__card" href="/products/${item.slug}/">
              <img src="${esc(item.image)}" alt="${esc(item.name)} (demo image)" width="300" height="300" loading="lazy" />
              <span>${esc(item.name)}</span>
              <strong>${inr(item.price)}</strong>
            </a>`,
            )
            .join("")}
        </div>
      </section>

      <section class="pdp-section container pdp-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Questions</h2>
        ${p.faq
          .map(
            (item) => `
          <details class="pdp-acc" data-faq="${esc(item.q)}">
            <summary>${esc(item.q)}</summary>
            <p>${esc(item.a)}</p>
          </details>`,
          )
          .join("")}
      </section>
    </main>

    <footer class="pdp-foot">
      <div class="container">
        <p><strong>Imported by:</strong> Verda Nutrition Pvt Ltd (placeholder), Mumbai 400069 · <strong>Country of origin:</strong> USA</p>
        <p><strong>FSSAI Lic. No.</strong> 10024055000123 · care@verda.in</p>
        <p class="pdp-foot__small">This product is not intended to diagnose, treat, cure, or prevent any disease. Not for medicinal use.</p>
        <p class="pdp-foot__small"><a href="/">Home</a> · <a href="/policies/shipping/">Shipping</a> · <a href="/policies/returns/">Returns</a> · <a href="/policies/privacy/">Privacy</a> · <a href="/policies/terms/">Terms</a> · <a href="/policies/disclaimer/">Disclaimer</a> · <a href="/#faq">FAQ</a></p>
      </div>
    </footer>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <script type="module" src="/products/product.js"></script>
  </body>
</html>`;
}

for (const product of products) {
  const dir = join("site", "products", product.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), renderProduct(product), "utf8");
  console.log(`built /products/${product.slug}/`);
}
