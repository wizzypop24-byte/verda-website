/**
 * Analytics contract for Requirement 12.
 *
 * The document lists events; this module makes them enforceable: required
 * params, allowed enums, consent gating and a PII guard so the tracking plan
 * cannot leak personal data.
 */

export const EVENT_SCHEMA = {
  view_home: { required: [], description: "Home page view" },
  page_view: { required: ["page_type"], enums: { page_type: ["home", "collection", "pdp", "cart"] } },
  hero_cta_click: { required: ["cta_label", "position"] },
  concern_card_click: { required: ["concern_name"] },
  product_card_click: { required: ["product_id", "list_name", "position"] },
  quick_add: { required: ["product_id", "value", "currency"] },
  add_to_cart: { required: ["product_id", "value", "currency"] },
  lab_report_click: { required: ["product_id"] },
  bundle_click: { required: ["bundle_id"] },
  quiz_start: { required: [] },
  quiz_complete: { required: ["result_products"] },
  search_submit: { required: ["query", "results_count"] },
  newsletter_submit: { required: ["channel"], enums: { channel: ["email", "whatsapp"] } },
  faq_open: { required: ["question"] },
  scroll_depth: { required: ["percent"], enums: { percent: [25, 50, 75, 100] } },
  purchase: { required: ["order_id", "value", "currency", "payment_method"] },
  web_vitals: { required: ["metric", "value", "page"], enums: { metric: ["LCP", "CLS", "INP"] } },
};

export const PII_KEYS = ["email", "phone", "mobile", "name", "address", "full_name"];
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const PHONE = /\b(?:\+91[- ]?)?[6-9]\d{9}\b/;
const HASHED_ID = /^[a-f0-9]{32,64}$/i;

export function isSnakeCase(name = "") {
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name) && name.length <= 40;
}

/** Find PII anywhere in the event payload. Hashed user ids are allowed. */
export function findPii(event = {}) {
  const hits = [];
  const walk = (value, key, path) => {
    if (PII_KEYS.includes(String(key).toLowerCase())) {
      hits.push(path);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, key, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value)) {
        walk(childValue, childKey, `${path}.${childKey}`);
      }
      return;
    }
    if (typeof value !== "string") return;
    if (key === "user_id" && HASHED_ID.test(value)) return;
    if (EMAIL.test(value)) hits.push(`${path} (email)`);
    if (PHONE.test(value)) hits.push(`${path} (phone)`);
  };

  for (const [key, value] of Object.entries(event)) {
    walk(value, key, key);
  }
  return [...new Set(hits)];
}

/** Validate a single event against the tracking plan. */
export function validateEvent(event = {}) {
  const issues = [];
  const name = event.name;
  const schema = EVENT_SCHEMA[name];

  if (!name) issues.push({ rule: "name", message: "Event name is missing." });
  else if (!schema) issues.push({ rule: "unknown", message: `Unknown event "${name}".` });
  else if (!isSnakeCase(name)) issues.push({ rule: "naming", message: `"${name}" is not snake_case.` });

  const params = event.params ?? {};

  if (schema) {
    for (const param of schema.required) {
      if (params[param] === undefined || params[param] === null || params[param] === "") {
        issues.push({ rule: "param", message: `${name}: missing required param "${param}".` });
      }
    }
    for (const [param, allowed] of Object.entries(schema.enums ?? {})) {
      if (params[param] !== undefined && !allowed.includes(params[param])) {
        issues.push({ rule: "enum", message: `${name}: "${param}" must be one of ${allowed.join(", ")}.` });
      }
    }
  }

  if (params.value !== undefined && !Number.isFinite(params.value)) {
    issues.push({ rule: "type", message: `${name}: "value" must be a number.` });
  }
  if (params.currency !== undefined && params.currency !== "INR") {
    issues.push({ rule: "currency", message: `${name}: currency must be INR.` });
  }

  const pii = findPii(params);
  for (const hit of pii) {
    issues.push({ rule: "pii", message: `${name}: personal data found at ${hit}.` });
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Consent gate. Analytics destinations need analytics consent;
 * ad destinations need marketing consent. Nothing is sent without consent.
 */
export function track(event, consent = {}, { destination = "analytics" } = {}) {
  const validation = validateEvent(event);
  if (!validation.ok) {
    return { sent: false, reason: "invalid_event", issues: validation.issues };
  }

  const allowed = destination === "ads" ? consent.marketing === true : consent.analytics === true;
  if (!allowed) {
    return { sent: false, reason: "no_consent", destination };
  }

  return { sent: true, destination, name: event.name };
}

/** Validate and gate a whole batch — what a data-layer test should run. */
export function auditEventLog(events = [], consent = {}) {
  const accepted = [];
  const dropped = [];
  const violations = [];

  for (const event of events) {
    const result = track(event, consent, { destination: event.destination ?? "analytics" });
    if (result.sent) accepted.push(event.name);
    else {
      dropped.push({ name: event.name, reason: result.reason });
      violations.push(...(result.issues ?? []));
    }
  }

  return {
    ok: violations.length === 0,
    accepted,
    dropped,
    violations,
    events: events.length,
  };
}

/** Integration helper: which KPI/persona signals are missing from the plan. */
export function missingFromPlan(names = []) {
  return [...new Set(names.filter((name) => !EVENT_SCHEMA[name]))];
}
