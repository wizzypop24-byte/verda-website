import {
  CATALOG,
  COD_CAP,
  GST_RATE,
  clearCart,
  inr,
  readCart,
  totals,
} from "../catalog.js";
import { addDoc, auth, collection, db, doc, getDoc, onAuthStateChanged, serverTimestamp, setDoc } from "../firestore-client.js";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
];

const $ = (selector) => document.querySelector(selector);
const cart = readCart();
const money = totals(cart);
let currentUid = null;

/* ---------- Consent-gated purchase event ---------- */

function track(name, params = {}) {
  try {
    const consent = JSON.parse(localStorage.getItem("verda_consent") ?? "null");
    if (!consent?.analytics) return;
  } catch {
    return;
  }
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, ...params });
}

/* ---------- Summary ---------- */

const stateSelect = $("#state");
STATES.forEach((state) => {
  const option = document.createElement("option");
  option.value = state;
  option.textContent = state;
  stateSelect.append(option);
});

/* ---------- Prefill for signed-in shoppers ---------- */

onAuthStateChanged(auth, async (user) => {
  currentUid = user?.uid ?? null;
  if (!user) return;
  try {
    const snapshot = await getDoc(doc(db, "users", user.uid));
    if (!snapshot.exists()) return;
    const data = snapshot.data();

    if (!$("#name").value) $("#name").value = data.displayName ?? "";
    if (!$("#email").value) $("#email").value = data.email ?? "";
    if (!$("#phone").value) $("#phone").value = data.phone ?? "";

    const last = data.lastAddress;
    if (last) {
      if (!$("#address").value) $("#address").value = last.address ?? "";
      if (!$("#city").value) $("#city").value = last.city ?? "";
      if (!$("#pincode").value) $("#pincode").value = last.pincode ?? "";
      if (last.state && STATES.includes(last.state)) $("#state").value = last.state;
    }
  } catch (error) {
    console.warn("[checkout] prefill failed", error?.code ?? error);
  }
});

function renderSummary() {
  const list = $("#summary-list");
  list.innerHTML = cart
    .map(
      (line) => `
      <li class="summary-item">
        <span class="summary-item__thumb" aria-hidden="true"></span>
        <div>
          <p class="summary-item__name">${CATALOG[line.id].name}</p>
          <p class="summary-item__meta">Qty ${line.qty} × ${inr(CATALOG[line.id].price)}</p>
        </div>
        <strong>${inr(CATALOG[line.id].price * line.qty)}</strong>
      </li>`,
    )
    .join("");

  $("#sum-subtotal").textContent = inr(money.subtotal);
  $("#sum-shipping").textContent = money.shipping === 0 ? "Free" : inr(money.shipping);
  $("#sum-cod").textContent = inr(money.codFee);
  $("#sum-total").textContent = inr(money.total);
  $("#tax-note").textContent = `Prices include ${(GST_RATE * 100).toFixed(0)}% GST.`;

  const overCap = money.total > COD_CAP;
  $("#cod-note").hidden = !overCap;
  $("#place-order").disabled = overCap;
}

if (!cart.length) {
  $("#empty-cart").hidden = false;
  $("#checkout-form").hidden = true;
  $("#summary-list").innerHTML = `<li class="summary-item__meta">No items yet.</li>`;
} else {
  renderSummary();
}

/* ---------- Validation ---------- */

const fields = {
  name: { el: $("#name"), error: $("#name-error"), test: (v) => v.trim().length >= 2, message: "Enter your full name." },
  phone: { el: $("#phone"), error: $("#phone-error"), test: (v) => /^[6-9]\d{9}$/.test(v), message: "Enter a valid 10-digit mobile number." },
  email: { el: $("#email"), error: $("#email-error"), test: (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), message: "Enter a valid email address." },
  address: { el: $("#address"), error: $("#address-error"), test: (v) => v.trim().length >= 10, message: "Enter the full address (at least 10 characters)." },
  city: { el: $("#city"), error: $("#city-error"), test: (v) => v.trim().length >= 2, message: "Enter your city." },
  pincode: { el: $("#pincode"), error: $("#pincode-error"), test: (v) => /^[1-9]\d{5}$/.test(v), message: "Enter a valid 6-digit PIN code." },
  state: { el: $("#state"), error: $("#state-error"), test: (v) => STATES.includes(v), message: "Select your state." },
};

for (const [key, field] of Object.entries(fields)) {
  field.el.addEventListener("blur", () => validateField(key));
}

function validateField(key) {
  const field = fields[key];
  const value = field.el.value;
  field.el.setAttribute("aria-invalid", "true");
  const ok = field.test(value);
  if (ok) {
    field.el.removeAttribute("aria-invalid");
    field.error.textContent = "";
    return true;
  }
  field.error.textContent = field.message;
  return false;
}

/* ---------- Submit ---------- */

$("#checkout-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = $("#order-status");
  const button = $("#place-order");

  if (!cart.length) return;

  let allValid = true;
  for (const key of Object.keys(fields)) {
    if (!validateField(key)) allValid = false;
  }
  if (!$("#terms").checked) {
    status.textContent = "Please accept the terms and returns policy.";
    status.dataset.kind = "error";
    allValid = false;
  }
  if (money.total > COD_CAP) {
    status.textContent = `Cash on delivery is capped at ${inr(COD_CAP)}.`;
    status.dataset.kind = "error";
    allValid = false;
  }
  if (!allValid) {
    status.dataset.kind = "error";
    if (!status.textContent) {
      status.textContent = "Please fix the highlighted fields.";
      status.dataset.kind = "error";
    }
    document.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  status.textContent = "Placing your order…";
  status.dataset.kind = "info";
  button.disabled = true;

  const order = {
    items: cart.map((line) => ({
      id: line.id,
      name: CATALOG[line.id].name,
      price: CATALOG[line.id].price,
      qty: line.qty,
    })),
    subtotal: money.subtotal,
    shipping: money.shipping,
    codFee: money.codFee,
    discount: money.discount,
    total: money.total,
    paymentMethod: "cod",
    status: "placed",
    customer: {
      name: $("#name").value.trim(),
      phone: $("#phone").value.trim(),
      email: $("#email").value.trim(),
      address: $("#address").value.trim(),
      city: $("#city").value.trim(),
      state: $("#state").value,
      pincode: $("#pincode").value.trim(),
    },
    uid: currentUid,
    source: "web",
    createdAt: serverTimestamp(),
  };

  try {
    const ref = await addDoc(collection(db, "orders"), order);

    if (currentUid && order.customer.email) {
      try {
        await setDoc(
          doc(db, "users", currentUid),
          {
            displayName: order.customer.name,
            email: order.customer.email,
            phone: order.customer.phone,
            lastAddress: {
              address: order.customer.address,
              city: order.customer.city,
              state: order.customer.state,
              pincode: order.customer.pincode,
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error) {
        console.warn("[checkout] profile not updated", error?.code ?? error);
      }
    }

    clearCart();
    track("purchase", {
      order_id: ref.id,
      value: money.total,
      currency: "INR",
      payment_method: "cod",
    });
    $("#checkout-form").hidden = true;
    $(".checkout__summary").hidden = true;
    status.textContent = "Order placed.";
    status.dataset.kind = "info";
    $("#confirmation").hidden = false;
    $("#order-id").textContent = ref.id;
    $("#confirmation").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("[checkout]", error?.code, error?.message);
    status.textContent = "Could not place the order. Check your connection and try again.";
    status.dataset.kind = "error";
    button.disabled = false;
  }
});

/* ---------- Input hygiene ---------- */

for (const selector of ["#phone", "#pincode"]) {
  const input = $(selector);
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, input.maxLength);
  });
}
