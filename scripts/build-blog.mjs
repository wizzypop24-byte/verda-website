/**
 * Generates the blog index and one static page per article.
 * Usage: node scripts/build-blog.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync("site/blog/posts.json", "utf8"));
const SITE = "https://fir-479b9.web.app";

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function shell({ title, description, canonical, jsonLd, body }) {
  return `<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="index,follow" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${canonical}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/pages/pages.css" />
    <link rel="stylesheet" href="/blog/blog.css" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body class="page blog-page">
    <header class="page-head">
      <div class="container page-head__inner">
        <a class="logo" href="/" aria-label="Verda home">verda<span class="logo__dot" aria-hidden="true">.</span></a>
        <div class="page-head__actions">
          <a class="page-head__link" href="/#bestsellers">Shop</a>
          <a class="page-head__link" href="/about/">About</a>
          <a class="page-head__link" href="/contact/">Contact</a>
        </div>
      </div>
    </header>

    <main class="container page-main" id="main">
      ${body}
    </main>

    <footer class="page-foot">
      <div class="container">
        <p><a href="/">Home</a> · <a href="/blog/">Blog</a> · <a href="/policies/shipping/">Shipping</a> · <a href="/policies/returns/">Returns</a> · <a href="/policies/privacy/">Privacy</a> · <a href="/policies/terms/">Terms</a> · <a href="/contact/">Contact</a></p>
        <p>Imported by Verda Nutrition Pvt Ltd (placeholder) · FSSAI Lic. No. 10024055000123</p>
        <p>This product is not intended to diagnose, treat, cure, or prevent any disease. Not for medicinal use.</p>
      </div>
    </footer>
  </body>
</html>`;
}

function renderPost(post) {
  const url = `${SITE}/blog/${post.slug}/`;
  const related = data.posts.filter((item) => item.slug !== post.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        image: `${SITE}${post.image}`,
        datePublished: post.date,
        dateModified: post.date,
        author: { "@type": "Organization", name: "Verda" },
        publisher: { "@type": "Organization", name: "Verda" },
        mainEntityOfPage: url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog/` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  const body = `
      <nav class="crumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li><a href="/blog/">Blog</a></li>
          <li aria-current="page">${esc(post.title)}</li>
        </ol>
      </nav>

      <article class="article">
        <p class="article__tag">${esc(post.tag)}</p>
        <h1>${esc(post.title)}</h1>
        <p class="article__meta">${formatDate(post.date)} · ${esc(post.readTime)}</p>
        <img class="article__image" src="${esc(post.image)}" alt="${esc(post.title)} (demo image)" width="447" height="447" />
        <p class="article__intro">${esc(post.intro)}</p>

        ${post.sections
          .map(
            (section, index) => `
        <section aria-labelledby="s-${index + 1}">
          <h2 id="s-${index + 1}">${esc(section.heading)}</h2>
          ${section.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("\n          ")}
        </section>`,
          )
          .join("\n")}

        <p class="article__note">This article is general information, not medical advice. Supplements are foods, not medicines.</p>
      </article>

      <section class="article__related" aria-labelledby="related-title">
        <h2 id="related-title">Read next</h2>
        <div class="blog-grid">
          ${related
            .map(
              (item) => `
            <a class="blog-card" href="/blog/${item.slug}/">
              <img src="${esc(item.image)}" alt="${esc(item.title)} (demo image)" width="300" height="300" loading="lazy" />
              <span class="blog-card__tag">${esc(item.tag)}</span>
              <strong>${esc(item.title)}</strong>
              <span class="blog-card__meta">${esc(item.readTime)}</span>
            </a>`,
            )
            .join("")}
        </div>
      </section>`;

  return shell({
    title: `${post.title} | Verda`.slice(0, 60),
    description: post.description,
    canonical: url,
    jsonLd,
    body,
  });
}

function renderIndex() {
  const url = `${SITE}/blog/`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Verda journal",
    url,
    blogPost: data.posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `${SITE}/blog/${post.slug}/`,
      datePublished: post.date,
    })),
  };

  const body = `
      <nav class="crumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li aria-current="page">Blog</li>
        </ol>
      </nav>

      <header class="page-hero">
        <h1>Read before you buy</h1>
        <p>Plain-language guides to ingredients, testing and labels. No hype, no miracle claims.</p>
      </header>

      <div class="blog-grid">
        ${data.posts
          .map(
            (post) => `
          <a class="blog-card" href="/blog/${post.slug}/">
            <img src="${esc(post.image)}" alt="${esc(post.title)} (demo image)" width="300" height="300" loading="lazy" />
            <span class="blog-card__tag">${esc(post.tag)}</span>
            <strong>${esc(post.title)}</strong>
            <span class="blog-card__desc">${esc(post.description)}</span>
            <span class="blog-card__meta">${formatDate(post.date)} · ${esc(post.readTime)}</span>
          </a>`,
          )
          .join("")}
      </div>`;

  return shell({
    title: "Blog — Verda",
    description: "Plain-language guides to supplement ingredients, testing and labels.",
    canonical: url,
    jsonLd,
    body,
  });
}

writeFileSync("site/blog/index.html", renderIndex(), "utf8");
console.log("built /blog/");

for (const post of data.posts) {
  const dir = join("site", "blog", post.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), renderPost(post), "utf8");
  console.log(`built /blog/${post.slug}/`);
}
