/**
 * Generates one collection page per concern.
 * Usage: node scripts/build-collections.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const products = JSON.parse(readFileSync("site/products/products.json", "utf8"));
const SITE = "https://fir-479b9.web.app";

const CONCERNS = [
  {
    slug: "sleep",
    name: "Sleep",
    tagline: "Wind down without the fog",
    description: "Magnesium in the gentler glycinate form, with the dose printed on the label.",
    image: "/assets/images/product-magnesium.webp",
    products: ["magnesium"],
    live: true,
  },
  {
    slug: "energy",
    name: "Energy",
    tagline: "Fuel the everyday, not the hype",
    description: "Our energy range is in formulation and testing. Join the list to hear when the first batch clears.",
    image: "",
    products: [],
    live: false,
  },
  {
    slug: "immunity",
    name: "Immunity",
    tagline: "Daily defence, dosed properly",
    description: "Vitamin D3 with K2 for people who spend most of the day indoors.",
    image: "/assets/images/product-d3k2.webp",
    products: ["d3k2"],
    live: true,
  },
  {
    slug: "gut",
    name: "Gut",
    tagline: "Digest comfortably, every day",
    description: "A six-strain probiotic with a small prebiotic base — strain names and counts printed.",
    image: "/assets/images/product-probiotic.webp",
    products: ["probiotic"],
    live: true,
  },
  {
    slug: "hair-skin",
    name: "Hair & Skin",
    tagline: "Support from the inside",
    description: "A single high-strength biotin tablet, with no fillers or added sugar.",
    image: "/assets/images/product-biotin.webp",
    products: ["biotin"],
    live: true,
  },
  {
    slug: "joints",
    name: "Joints",
    tagline: "Move comfortably",
    description: "Our joints range is in formulation and testing. Join the list to hear when it launches.",
    image: "",
    products: [],
    live: false,
  },
  {
    slug: "fitness",
    name: "Fitness",
    tagline: "Built for the training week",
    description: "Our fitness range is in formulation and testing. Join the list to hear when it launches.",
    image: "",
    products: [],
    live: false,
  },
];

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const inr = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

function render(concern) {
  const url = `${SITE}/collections/${concern.slug}/`;
  const items = products.filter((product) => concern.products.includes(product.id));
  const title = `${concern.name} supplements | Verda`.slice(0, 60);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${concern.name} supplements`,
        description: concern.description,
        url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "By concern", item: `${SITE}/#concerns` },
          { "@type": "ListItem", position: 3, name: concern.name, item: url },
        ],
      },
      ...(items.length
        ? [
            {
              "@type": "ItemList",
              name: `${concern.name} products`,
              itemListElement: items.map((product, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: {
                  "@type": "Product",
                  name: product.name,
                  image: `${SITE}${product.image}`,
                  url: `${SITE}/products/${product.slug}/`,
                  offers: {
                    "@type": "Offer",
                    price: String(product.price),
                    priceCurrency: "INR",
                    availability: "https://schema.org/InStock",
                  },
                },
              })),
            },
          ]
        : []),
    ],
  };

  const cards = items
    .map(
      (product) => `
        <li class="collection-card">
          <a class="collection-card__media" href="/products/${product.slug}/" aria-label="View ${esc(product.name)}">
            <img src="${esc(product.image)}" alt="${esc(product.name)} (demo image)" width="300" height="300" loading="lazy" />
          </a>
          <div class="collection-card__body">
            <span class="collection-card__badge">${esc(product.badge)}</span>
            <h3><a href="/products/${product.slug}/">${esc(product.name)}</a></h3>
            <p class="collection-card__spec">${esc(product.servingLabel)}</p>
            <div class="rating"><span aria-hidden="true">★★★★★</span><span class="rating__text">${product.rating} (${product.reviews})</span></div>
            <div class="price"><span class="price__now">${inr(product.price)}</span><span class="price__mrp">${inr(product.mrp)}</span></div>
            <button class="btn btn--small" type="button" data-add="${esc(product.id)}">Add to cart</button>
          </div>
        </li>`,
    )
    .join("");

  const empty = `
    <div class="collection-empty">
      <p class="collection-empty__title">Launching soon</p>
      <p>${esc(concern.description)}</p>
      <a class="btn btn--primary" href="/#newsletter">Notify me when it launches</a>
      <p><a class="link" href="/#bestsellers">Browse what is available now</a></p>
    </div>`;

  return `<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(concern.description).slice(0, 155)}" />
    <link rel="canonical" href="${url}" />
    <meta name="robots" content="${concern.live ? "index,follow" : "noindex,follow"}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(concern.name)} supplements" />
    <meta property="og:description" content="${esc(concern.description).slice(0, 155)}" />
    <meta property="og:url" content="${url}" />
    ${concern.image ? `<meta property="og:image" content="${SITE}${esc(concern.image)}" />` : ""}
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/collections/collections.css" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body class="collection" data-concern="${esc(concern.slug)}">
    <a class="skip-link" href="#main">Skip to content</a>

    <header class="collection-head">
      <div class="container collection-head__inner">
        <a class="logo" href="/" aria-label="Verda home">verda<span class="logo__dot" aria-hidden="true">.</span></a>
        <div class="collection-head__actions">
          <a class="collection-head__link" href="/#concerns">All concerns</a>
          <a class="collection-head__cart" href="/checkout/" aria-label="Cart">Cart <span id="cart-count">0</span></a>
        </div>
      </div>
    </header>

    <main id="main">
      <nav class="crumbs container" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li><a href="/#concerns">By concern</a></li>
          <li aria-current="page">${esc(concern.name)}</li>
        </ol>
      </nav>

      <section class="collection-hero container">
        <p class="eyebrow">Shop by concern</p>
        <h1>${esc(concern.name)}</h1>
        <p class="collection-hero__tagline">${esc(concern.tagline)}</p>
        <p class="collection-hero__desc">${esc(concern.description)}</p>
        ${items.length ? `<p class="collection-hero__count">${items.length} formula${items.length === 1 ? "" : "s"} available</p>` : ""}
      </section>

      <section class="container collection-grid-wrap" aria-label="${esc(concern.name)} products">
        ${items.length ? `<ul class="collection-grid${items.length === 1 ? " collection-grid--single" : ""}">${cards}</ul>` : empty}
      </section>

      <nav class="container collection-others" aria-label="Other concerns">
        <h2>Other concerns</h2>
        <ul>
          ${CONCERNS.filter((item) => item.slug !== concern.slug)
            .map(
              (item) =>
                `<li><a href="/collections/${item.slug}/">${esc(item.name)}${item.live ? "" : " (soon)"}</a></li>`,
            )
            .join("")}
        </ul>
      </nav>
    </main>

    <footer class="collection-foot">
      <div class="container">
        <p><a href="/">Home</a> · <a href="/policies/shipping/">Shipping</a> · <a href="/policies/returns/">Returns</a> · <a href="/policies/privacy/">Privacy</a> · <a href="/policies/terms/">Terms</a></p>
        <p>Imported by Verda Nutrition Pvt Ltd (placeholder) · FSSAI Lic. No. 10024055000123</p>
        <p>Not for medicinal use. Consult a qualified healthcare professional before use.</p>
      </div>
    </footer>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <script type="module" src="/collections/collections.js"></script>
  </body>
</html>`;
}

for (const concern of CONCERNS) {
  const dir = join("site", "collections", concern.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), render(concern), "utf8");
  console.log(`built /collections/${concern.slug}/`);
}
