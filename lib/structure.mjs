/**
 * Home page structure model for Requirement 4.
 *
 * Order matters: the array below is the render order, top to bottom.
 * Tests compare it with the PRD (Section 4) so the document and the
 * component tree cannot drift apart.
 */

export const PRIMARY_NAV = ["Shop All", "By Concern", "Bundles", "Our Science", "About", "Blog"];

/** Single concern taxonomy shared by the mega-menu (HM-02) and the grid (HM-05). */
export const CONCERNS = ["Sleep", "Energy", "Immunity", "Gut", "Hair & Skin", "Joints", "Fitness"];

export const SECTIONS = [
  {
    id: "HM-01",
    name: "Announcement bar",
    component: "AnnouncementBar",
    order: 1,
    required: ["rotating messages", "dismiss", "no layout shift"],
  },
  {
    id: "HM-02",
    name: "Header / Navigation",
    component: "SiteHeader",
    order: 2,
    required: ["primary nav", "mega-menu", "cart drawer", "keyboard"],
  },
  {
    id: "HM-03",
    name: "Hero",
    component: "Hero",
    order: 3,
    required: ["h1", "primary cta", "secondary cta", "lcp image"],
  },
  {
    id: "HM-04",
    name: "Trust strip",
    component: "TrustStrip",
    order: 4,
    required: ["trust items", "no carousel", "verifiable claims"],
  },
  {
    id: "HM-05",
    name: "Shop by concern",
    component: "ConcernGrid",
    order: 5,
    required: ["concern cards", "filtered collection link"],
  },
  {
    id: "HM-06",
    name: "Bestsellers",
    component: "BestsellerRail",
    order: 6,
    required: ["product cards", "quick add", "sold-out state"],
  },
  {
    id: "HM-07",
    name: "Why us / differentiation",
    component: "ValueProps",
    order: 7,
    required: ["value props", "lab report link"],
  },
  {
    id: "HM-08",
    name: "Ingredient transparency",
    component: "IngredientTable",
    order: 8,
    required: ["dose", "form", "evidence"],
  },
  {
    id: "HM-09",
    name: "Social proof",
    component: "ReviewSection",
    order: 9,
    required: ["aggregate rating", "review cards"],
  },
  {
    id: "HM-10",
    name: "Supplement quiz CTA",
    component: "QuizBanner",
    order: 10,
    required: ["quiz entry", "result recommendations"],
  },
  {
    id: "HM-11",
    name: "Bundles & subscription",
    component: "BundleSection",
    order: 11,
    required: ["bundles", "subscription terms", "per-day cost"],
  },
  {
    id: "HM-12",
    name: "Expert / founder credibility",
    component: "ExpertBlock",
    order: 12,
    required: ["qualification", "bio", "photo"],
  },
  {
    id: "HM-13",
    name: "Blog teaser",
    component: "BlogTeaser",
    order: 13,
    required: ["three articles", "read time"],
  },
  {
    id: "HM-14",
    name: "FAQ",
    component: "FaqAccordion",
    order: 14,
    required: ["questions", "faqpage schema"],
  },
  {
    id: "HM-15",
    name: "Newsletter / WhatsApp",
    component: "NewsletterSignup",
    order: 15,
    required: ["single field", "consent", "double opt-in"],
  },
  {
    id: "HM-16",
    name: "Footer",
    component: "SiteFooter",
    order: 16,
    required: ["columns", "policies", "importer block", "fssai number"],
  },
];

export const FLOW_ORDER = SECTIONS.map((section) => section.id);

/** Structural validation used by tests and (later) by the build. */
export function validateStructure(sections, { docIds = [] } = {}) {
  const issues = [];

  const ids = sections.map((section) => section.id);
  const orders = sections.map((section) => section.order);
  const components = sections.map((section) => section.component);

  if (new Set(ids).size !== ids.length) issues.push("Duplicate section ids.");
  if (new Set(orders).size !== orders.length) issues.push("Duplicate render order.");
  if (new Set(components).size !== components.length) issues.push("Two sections share a component name.");

  orders.forEach((order, index) => {
    if (order !== index + 1) issues.push(`Section ${ids[index]} has order ${order}, expected ${index + 1}.`);
  });

  for (const section of sections) {
    if (!section.name || !section.component) issues.push(`${section.id}: name and component are required.`);
    if (!section.required?.length) issues.push(`${section.id}: no required elements declared.`);
    if (!/^HM-\d{2}$/.test(section.id)) issues.push(`${section.id}: invalid section id format.`);
  }

  if (docIds.length) {
    for (const id of docIds) if (!ids.includes(id)) issues.push(`Document section ${id} is missing from the model.`);
    for (const id of ids) if (!docIds.includes(id)) issues.push(`Model section ${id} is not in the document.`);
  }

  return { ok: issues.length === 0, issues };
}

/** Every section that must exist between the header and the footer. */
export const CORE_SECTIONS = SECTIONS.filter((section) => section.order >= 3 && section.order <= 12).map((s) => s.id);
