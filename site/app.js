/* Verda home page — behaviour, consent-gated analytics, cart and quiz. */
(() => {
  "use strict";

  const CATALOG = {
    magnesium: { name: "Magnesium Glycinate 200 mg", price: 899, concern: "Sleep", tags: ["sleep", "magnesium", "stress", "muscle"] },
    probiotic: { name: "Probiotic 10B CFU", price: 1099, concern: "Gut", tags: ["gut", "digestion", "probiotic", "immunity"] },
    d3k2: { name: "Vitamin D3 + K2", price: 649, concern: "Immunity", tags: ["immunity", "vitamin d", "bones", "d3", "k2"] },
    biotin: { name: "Biotin 10,000 mcg", price: 749, concern: "Hair & Skin", tags: ["hair", "skin", "biotin", "nails"] },
    "bundle-basics": { name: "Daily Basics bundle", price: 1249, concern: "Bundle", tags: ["bundle", "daily", "value"] },
    "bundle-gut": { name: "Gut & Immunity bundle", price: 1499, concern: "Bundle", tags: ["bundle", "gut", "immunity"] },
  };

  const FREE_SHIPPING = 999;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  /* ---------------- Consent-gated analytics ---------------- */

  const CONSENT_KEY = "verda_consent";
  const CONSENT_DAYS = 180;

  const readConsent = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null");
      if (!raw || !raw.ts) return null;
      if (Date.now() - raw.ts > CONSENT_DAYS * 864e5) return null;
      return raw;
    } catch {
      return null;
    }
  };

  let consent = readConsent() ?? { analytics: false, marketing: false, ts: 0 };
  window.dataLayer = window.dataLayer ?? [];

  function track(name, params = {}, destination = "analytics") {
    const allowed = destination === "ads" ? consent.marketing : consent.analytics;
    if (!allowed) return false;
    window.dataLayer.push({ event: name, ...params, destination });
    return true;
  }

  /* ---------------- Cart ---------------- */

  const CART_KEY = "verda_cart";
  let cart = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
      return Array.isArray(saved) ? saved.filter((line) => CATALOG[line.id]) : [];
    } catch {
      return [];
    }
  })();

  const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const cartCount = () => cart.reduce((sum, line) => sum + line.qty, 0);
  const cartSubtotal = () => cart.reduce((sum, line) => sum + (CATALOG[line.id]?.price ?? 0) * line.qty, 0);
  const inr = (value) => `₹${value.toLocaleString("en-IN")}`;

  function renderCart() {
    const list = $("#cart-list");
    const badge = $("#cart-badge");
    if (!list || !badge) return;

    badge.textContent = String(cartCount());
    badge.hidden = cartCount() === 0;
    $("#cart-open").setAttribute("aria-label", `Open cart, ${cartCount()} item${cartCount() === 1 ? "" : "s"}`);

    list.innerHTML = cart.length
      ? cart
          .map(
            (line) => `
        <li class="cart-item">
          <div class="cart-item__thumb" aria-hidden="true"></div>
          <div>
            <p class="cart-item__name">${CATALOG[line.id].name}</p>
            <p class="cart-item__price">${inr(CATALOG[line.id].price)}</p>
            <div class="qty">
              <button type="button" data-qty="-1" data-id="${line.id}" aria-label="Decrease quantity of ${CATALOG[line.id].name}">−</button>
              <span aria-live="polite">${line.qty}</span>
              <button type="button" data-qty="1" data-id="${line.id}" aria-label="Increase quantity of ${CATALOG[line.id].name}">+</button>
            </div>
          </div>
          <button class="cart-item__remove" type="button" data-remove="${line.id}">Remove</button>
        </li>`,
          )
          .join("")
      : `<li class="cart-empty">Your cart is empty. Add a formula to see free-shipping progress.</li>`;

    const subtotal = cartSubtotal();
    $("#cart-subtotal").textContent = inr(subtotal);
    const remaining = Math.max(0, FREE_SHIPPING - subtotal);
    $("#ship-text").textContent = remaining
      ? `Add ${inr(remaining)} more for free shipping`
      : "Free shipping unlocked";
    const fill = $("#ship-fill");
    if (fill) fill.style.width = `${Math.min(100, Math.round((subtotal / FREE_SHIPPING) * 100))}%`;
  }

  function addToCart(id, { silent = false } = {}) {
    const line = cart.find((item) => item.id === id);
    if (line) line.qty += 1;
    else cart.push({ id, qty: 1 });
    saveCart();
    renderCart();
    if (!silent) toast(`${CATALOG[id].name} added to cart`);
  }

  /* ---------------- Dialogs ---------------- */

  let lastFocused = null;

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    lastFocused = document.activeElement;
    dialog.hidden = false;
    document.body.style.overflow = "hidden";
    const focusable = dialog.querySelector("button, [href], input, summary, [tabindex]:not([tabindex='-1'])");
    (focusable ?? dialog).focus?.();
  }

  function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    dialog.hidden = true;
    document.body.style.overflow = "";
    lastFocused?.focus?.();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    ["cart-drawer", "search-modal", "quiz-modal", "mobile-nav"].forEach((id) => {
      const dialog = document.getElementById(id);
      if (dialog && !dialog.hidden) closeDialog(id);
    });
    const mega = $("#concern-menu");
    if (mega && !mega.hidden) {
      mega.hidden = true;
      $("#concern-menu-btn").setAttribute("aria-expanded", "false");
    }
  });

  /* ---------------- Announcement ---------------- */

  const MESSAGES = ["Free shipping over ₹999", "Extra 12% off on subscriptions", "FSSAI-licensed · third-party tested"];
  const ANNOUNCEMENT_KEY = "verda_announcement_dismissed";

  function initAnnouncement() {
    const bar = $("#announcement");
    if (!bar) return;
    const dismissed = Number(localStorage.getItem(ANNOUNCEMENT_KEY) ?? 0);
    if (dismissed && Date.now() - dismissed < 7 * 864e5) {
      bar.style.display = "none";
      return;
    }

    let index = 0;
    let timer = null;
    const msg = $("#announcement-msg");
    const start = () => {
      timer = setInterval(() => {
        index = (index + 1) % MESSAGES.length;
        msg.textContent = MESSAGES[index];
      }, 4000);
    };
    const stop = () => clearInterval(timer);
    bar.addEventListener("mouseenter", stop);
    bar.addEventListener("mouseleave", start);
    bar.addEventListener("focusin", stop);
    bar.addEventListener("focusout", start);
    start();

    $("#announcement-close").addEventListener("click", () => {
      stop();
      localStorage.setItem(ANNOUNCEMENT_KEY, String(Date.now()));
      bar.style.display = "none";
    });
  }

  /* ---------------- Header ---------------- */

  function initHeader() {
    const header = $("#header");
    window.addEventListener("scroll", () => header?.classList.toggle("is-scrolled", window.scrollY > 8), { passive: true });

    const btn = $("#concern-menu-btn");
    const menu = $("#concern-menu");
    btn?.addEventListener("click", () => {
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) menu.querySelector("a")?.focus();
    });

    $("#nav-open")?.addEventListener("click", () => openDialog("mobile-nav"));
    $("#nav-close")?.addEventListener("click", () => closeDialog("mobile-nav"));
    $("#nav-scrim")?.addEventListener("click", () => closeDialog("mobile-nav"));
    $$("#mobile-nav a").forEach((link) => link.addEventListener("click", () => closeDialog("mobile-nav")));
  }

  /* ---------------- Cart UI ---------------- */

  let toastTimer = null;
  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2600);
  }

  function initCart() {
    $("#cart-open")?.addEventListener("click", () => openDialog("cart-drawer"));
    $("#cart-close")?.addEventListener("click", () => closeDialog("cart-drawer"));
    $("#cart-scrim")?.addEventListener("click", () => closeDialog("cart-drawer"));
    $("#cart-continue")?.addEventListener("click", () => closeDialog("cart-drawer"));

    $$("#cart-list").forEach((list) =>
      list.addEventListener("click", (event) => {
        const remove = event.target.closest("[data-remove]");
        if (remove) {
          cart = cart.filter((line) => line.id !== remove.dataset.remove);
          saveCart();
          renderCart();
          return;
        }
        const qty = event.target.closest("[data-qty]");
        if (qty) {
          const line = cart.find((item) => item.id === qty.dataset.id);
          if (!line) return;
          line.qty += Number(qty.dataset.qty);
          if (line.qty <= 0) cart = cart.filter((item) => item.id !== line.id);
          saveCart();
          renderCart();
        }
      }),
    );

    $$("[data-add]").forEach((button) => {
      button.addEventListener("click", () => {
        addToCart(button.dataset.add);
        if (button.dataset.add.startsWith("bundle")) {
          track("bundle_click", { bundle_id: button.dataset.add });
        } else {
          track("quick_add", { product_id: button.dataset.add, value: CATALOG[button.dataset.add].price, currency: "INR" });
        }
      });
    });

    renderCart();
  }

  /* ---------------- Search ---------------- */

  function initSearch() {
    const modal = $("#search-modal");
    const input = $("#search-input");
    const results = $("#search-results");
    if (!modal || !input || !results) return;

    const render = () => {
      const query = input.value.trim();
      const term = query.toLowerCase();
      results.innerHTML = "";

      if (term.length < 2) {
        results.innerHTML = `<li class="search-empty">Type at least two letters.</li>`;
        return;
      }

      const matches = Object.entries(CATALOG)
        .filter(([id, item]) => !id.startsWith("bundle") && (item.name.toLowerCase().includes(term) || item.tags.some((tag) => tag.includes(term))))
        .slice(0, 6);

      if (!matches.length) {
        results.innerHTML = `<li class="search-empty">No products match “${query}”. Try a concern like sleep, gut or immunity.</li>`;
      } else {
        results.innerHTML = matches
          .map(
            ([id, item]) => `
          <li><a href="#bestsellers" data-result="${id}">
            <span>${item.name}</span><span class="muted">${inr(item.price)}</span>
          </a></li>`,
          )
          .join("");
      }

      track("search_submit", { query, results_count: matches.length });
    };

    $("#search-open")?.addEventListener("click", () => {
      openDialog("search-modal");
      input.focus();
    });
    $$("[data-close-modal]", modal).forEach((el) => el.addEventListener("click", () => closeDialog("search-modal")));
    input.addEventListener("input", render);
    results.addEventListener("click", (event) => {
      const link = event.target.closest("[data-result]");
      if (!link) return;
      track("product_card_click", { product_id: link.dataset.result, list_name: "search", position: 1 });
      closeDialog("search-modal");
    });
  }

  /* ---------------- Quiz ---------------- */

  const QUIZ = [
    { q: "What do you want to improve first?", options: [["Sleep", "sleep"], ["Digestion", "gut"], ["Immunity", "immunity"], ["Hair and skin", "hair"]] },
    { q: "How would you describe your sleep?", options: [["Hard to fall asleep", "sleep"], ["Wake up tired", "sleep"], ["Fine, want to maintain", "immunity"], ["Not my focus", "gut"]] },
    { q: "How often do you feel bloated or uncomfortable after meals?", options: [["Most days", "gut"], ["A few times a week", "gut"], ["Rarely", "immunity"], ["Never", "hair"]] },
    { q: "How much time do you spend outdoors in daylight?", options: [["Under 15 minutes", "immunity"], ["15 to 30 minutes", "immunity"], ["More than 30 minutes", "sleep"], ["Varies a lot", "gut"]] },
    { q: "What matters most when you choose a supplement?", options: [["Printed dose and lab test", "sleep"], ["Fewer capsules", "hair"], ["Price per day", "immunity"], ["Subscription convenience", "gut"]] },
  ];

  function initQuiz() {
    let step = 0;
    const scores = {};
    const body = $("#quiz-body");

    const render = () => {
      if (step < QUIZ.length) {
        const item = QUIZ[step];
        body.innerHTML = `
          <p class="quiz-progress">Question ${step + 1} of ${QUIZ.length}</p>
          <div class="quiz-q">
            <h3>${item.q}</h3>
            <div class="quiz-opts">
              ${item.options.map(([label, key]) => `<button type="button" data-key="${key}">${label}</button>`).join("")}
            </div>
          </div>`;
        return;
      }

      const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      const top = ranked.slice(0, 2).map(([key]) => key);
      const picks = [...new Set(top.map((key) => ({ sleep: "magnesium", gut: "probiotic", immunity: "d3k2", hair: "biotin" }[key])))];
      body.innerHTML = `
        <div class="quiz-result">
          <h3>Your starting point</h3>
          <p>Based on your answers, start with:</p>
          <ul>${picks.map((id) => `<li>${CATALOG[id].name} — ${inr(CATALOG[id].price)}</li>`).join("")}</ul>
          <button class="btn btn--primary" type="button" id="quiz-add">Add all to cart</button>
          <form id="quiz-email" style="margin-top:16px">
            <label for="quiz-email-input" style="font-size:13px;font-weight:700">Email me this plan (optional)</label>
            <div class="signup__row" style="margin-top:6px">
              <input id="quiz-email-input" type="email" placeholder="you@example.com" autocomplete="email" />
              <button class="btn btn--ghost btn--small" type="submit">Send</button>
            </div>
            <p class="help" id="quiz-email-status" role="status" aria-live="polite"></p>
          </form>
        </div>`;
      track("quiz_complete", { result_products: picks.join(",") });

      $("#quiz-add")?.addEventListener("click", () => {
        picks.forEach((id) => addToCart(id, { silent: true }));
        toast(`${picks.length} formula${picks.length > 1 ? "s" : ""} added to cart`);
        closeDialog("quiz-modal");
      });

      $("#quiz-email")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const value = $("#quiz-email-input").value.trim();
        const status = $("#quiz-email-status");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
          status.textContent = "Enter a valid email address.";
          status.dataset.kind = "error";
          return;
        }
        status.textContent = "Saved on this device — email delivery connects at launch.";
        status.dataset.kind = "info";
        track("newsletter_submit", { channel: "email" });
      });
    };

    $("#quiz-open")?.addEventListener("click", () => {
      step = 0;
      Object.keys(scores).forEach((key) => delete scores[key]);
      openDialog("quiz-modal");
      render();
      track("quiz_start", { step: 0 });
    });
    $("#hero-quiz")?.addEventListener("click", () => $("#quiz-open").click());

    body?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-key]");
      if (!button) return;
      scores[button.dataset.key] = (scores[button.dataset.key] ?? 0) + 1;
      step += 1;
      render();
    });

    $$("[data-close-modal]").forEach((el) => el.addEventListener("click", () => closeDialog("quiz-modal")));
  }

  /* ---------------- Static interactions ---------------- */

  function initStatic() {
    $$("[data-cta]").forEach((el) =>
      el.addEventListener("click", () => track("hero_cta_click", { cta_label: el.dataset.cta, position: "hero" })),
    );
    $$("[data-concern-card]").forEach((el) =>
      el.addEventListener("click", () => track("concern_card_click", { concern_name: el.dataset.concernCard })),
    );
    $$("[data-concern]").forEach((el) =>
      el.addEventListener("click", () => track("concern_card_click", { concern_name: el.dataset.concern, source: "mega_menu" })),
    );
    $$("[data-lab-report]").forEach((el) =>
      el.addEventListener("click", (event) => {
        event.preventDefault();
        track("lab_report_click", { report_type: "coa" });
        toast("Lab reports publish with the first batch");
      }),
    );
    $$(".product-card").forEach((card) =>
      card.addEventListener("click", (event) => {
        if (event.target.closest("[data-add]")) return;
        track("product_card_click", { product_id: card.dataset.product, list_name: "bestsellers", position: [...card.parentElement.children].indexOf(card) + 1 });
      }),
    );
    $$(".faq__item").forEach((item) =>
      item.addEventListener("toggle", () => {
        if (item.open) track("faq_open", { question: item.dataset.faq });
      }),
    );

    const rail = $("#product-rail");
    const scrollBy = (direction) => rail?.scrollBy({ left: direction * (rail.clientWidth * 0.8), behavior: "smooth" });
    $("#rail-prev")?.addEventListener("click", () => scrollBy(-1));
    $("#rail-next")?.addEventListener("click", () => scrollBy(1));

    $("#year").textContent = String(new Date().getFullYear());
  }

  /* ---------------- Newsletter ---------------- */

  function initNewsletter() {
    const form = $("#newsletter-form");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = $("#email").value.trim();
      const status = $("#newsletter-status");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        status.textContent = "Enter a valid email address.";
        status.dataset.kind = "error";
        $("#email").setAttribute("aria-invalid", "true");
        return;
      }
      $("#email").removeAttribute("aria-invalid");
      status.textContent = "Check your inbox — confirm the email to activate your ₹100 code.";
      status.dataset.kind = "info";
      track("newsletter_submit", { channel: "email" });
      form.reset();
    });
  }

  /* ---------------- Consent ---------------- */

  function applyConsent(next) {
    consent = { ...next, ts: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    $("#consent").hidden = true;
    if (consent.analytics) track("view_home", { referrer: document.referrer || "direct" });
  }

  function initConsent() {
    const banner = $("#consent");
    if (!banner) return;
    if (!readConsent()) {
      banner.hidden = false;
    } else {
      $("#consent-analytics").checked = consent.analytics;
      $("#consent-marketing").checked = consent.marketing;
    }

    $("#consent-accept").addEventListener("click", () => {
      $("#consent-analytics").checked = true;
      $("#consent-marketing").checked = true;
      applyConsent({ analytics: true, marketing: true });
    });
    $("#consent-reject").addEventListener("click", () => applyConsent({ analytics: false, marketing: false }));
    $("#consent-save").addEventListener("click", () =>
      applyConsent({ analytics: $("#consent-analytics").checked, marketing: $("#consent-marketing").checked }),
    );
  }

  /* ---------------- Measurement ---------------- */

  function initMeasurement() {
    track("view_home", { referrer: document.referrer || "direct" });

    const seen = new Set();
    window.addEventListener(
      "scroll",
      () => {
        const depth = Math.round(((window.scrollY + window.innerHeight) / document.body.scrollHeight) * 100);
        [25, 50, 75, 100].forEach((mark) => {
          if (depth >= mark && !seen.has(mark)) {
            seen.add(mark);
            track("scroll_depth", { percent: mark });
          }
        });
      },
      { passive: true },
    );

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entry = list.getEntries().at(-1);
        if (entry) track("web_vitals", { metric: "LCP", value: Math.round(entry.startTime), page: "/" });
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

      let cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
      addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") track("web_vitals", { metric: "CLS", value: Number(cls.toFixed(3)), page: "/" });
      });
    } catch {
      /* PerformanceObserver unavailable */
    }
  }

  /* ---------------- Boot ---------------- */

  initAnnouncement();
  initHeader();
  initCart();
  initSearch();
  initQuiz();
  initStatic();
  initNewsletter();
  initConsent();
  initMeasurement();
})();
