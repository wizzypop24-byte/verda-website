/**
 * Generates the legal/policy pages from site/policies/policies.json.
 * Usage: node scripts/build-policies.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync("site/policies/policies.json", "utf8"));
const SITE = "https://fir-479b9.web.app";

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const allLinks = data.policies
  .map((page) => `<a href="/policies/${page.slug}/">${esc(page.title)}</a>`)
  .join(" · ");

function render(page) {
  const url = `${SITE}/policies/${page.slug}/`;
  const title = `${page.title} | Verda`.slice(0, 60);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url,
    dateModified: "2026-10-25",
    isPartOf: { "@type": "WebSite", name: "Verda", url: `${SITE}/` },
  };

  return `<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <link rel="canonical" href="${url}" />
    <meta name="robots" content="index,follow" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/policies/policies.css" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body class="policy">
    <header class="policy-head">
      <div class="container policy-head__inner">
        <a class="logo" href="/" aria-label="Verda home">verda<span class="logo__dot" aria-hidden="true">.</span></a>
        <a class="policy-head__back" href="/">← Back to store</a>
      </div>
    </header>

    <main class="container policy-main" id="main">
      <nav class="crumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li aria-current="page">${esc(page.title)}</li>
        </ol>
      </nav>

      <article>
        <h1>${esc(page.title)}</h1>
        <p class="policy-updated">Last updated: ${esc(data.updated)}</p>
        <p class="policy-intro">${esc(page.intro)}</p>

        ${page.sections
          .map(
            (section, index) => `
          <section aria-labelledby="s-${index + 1}">
            <h2 id="s-${index + 1}">${esc(section.heading)}</h2>
            ${section.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("\n            ")}
          </section>`,
          )
          .join("\n")}

        <p class="policy-contact">
          Questions? Email <a href="mailto:care@verda.in">care@verda.in</a> — Verda Nutrition Pvt Ltd (placeholder), Mumbai 400069.
        </p>
      </article>

      <nav class="policy-links" aria-label="All policies">
        <h2>All policies</h2>
        <p>${allLinks}</p>
      </nav>
    </main>

    <footer class="policy-foot">
      <div class="container">
        <p><strong>Imported by:</strong> Verda Nutrition Pvt Ltd (placeholder), Mumbai 400069 · <strong>Country of origin:</strong> USA</p>
        <p><strong>FSSAI Lic. No.</strong> 10024055000123 · care@verda.in</p>
        <p>This product is not intended to diagnose, treat, cure, or prevent any disease. Not for medicinal use.</p>
      </div>
    </footer>
  </body>
</html>`;
}

for (const page of data.policies) {
  const dir = join("site", "policies", page.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), render(page), "utf8");
  console.log(`built /policies/${page.slug}/`);
}
