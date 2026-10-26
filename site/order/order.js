import { auth, db, doc, getDoc, onAuthStateChanged } from "../firestore-client.js";

const $ = (selector) => document.querySelector(selector);
const inr = (value) => `₹${Number(value ?? 0).toLocaleString("en-IN")}`;

const orderId = new URLSearchParams(location.search).get("id") ?? "";
const STEPS = ["placed", "packed", "shipped", "delivered"];

function show(section) {
  $("#loading").hidden = true;
  ["signed-out", "denied", "not-found"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = id !== section;
  });
  $("#order-view").hidden = section !== "order";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const validId = /^[A-Za-z0-9]{10,40}$/.test(orderId);

if (!validId) {
  $("#loading").hidden = true;
  $("#not-found").hidden = false;
  $("#not-found h1").textContent = "Order ID missing";
  $("#not-found p").textContent = "Open this page from your account, or check the link in your confirmation.";
}

onAuthStateChanged(auth, async (user) => {
  if (!validId) return;

  if (!user) {
    const next = encodeURIComponent(`/order/?id=${orderId}`);
    $("#signin-link").href = `/auth/?next=${next}`;
    show("signed-out");
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, "orders", orderId));
    if (!snapshot.exists()) {
      show("not-found");
      return;
    }
    render(snapshot.data());
    show("order");
  } catch (error) {
    console.warn("[order]", error?.code ?? error);
    if (error?.code === "permission-denied") {
      $("#denied-copy").textContent =
        "This order is linked to a different account, or it was placed as a guest without signing in.";
      show("denied");
    } else {
      $("#not-found h1").textContent = "Could not load this order";
      $("#not-found p").textContent = "Check your connection and refresh the page.";
      show("not-found");
    }
  }
});

function render(order) {
  const status = order.status ?? "placed";
  const customer = order.customer ?? {};
  const items = Array.isArray(order.items) ? order.items : [];

  $("#order-id").textContent = `#${orderId.slice(0, 10)}`;
  $("#order-date").textContent = `Placed ${formatDate(order.createdAt)}`;

  const pill = $("#order-status");
  pill.textContent = status;
  pill.dataset.status = status;

  const activeIndex = status === "cancelled" ? -1 : STEPS.indexOf(status);
  document.querySelectorAll("#timeline li").forEach((item, index) => {
    item.classList.toggle("is-done", activeIndex >= index);
  });

  $("#order-items").innerHTML = items
    .map(
      (item) => `
      <li>
        <span>${escapeHtml(item.name ?? item.id)}<br><small>Qty ${Number(item.qty ?? 1)} · ${inr(item.price)}</small></span>
        <strong>${inr((item.price ?? 0) * (item.qty ?? 1))}</strong>
      </li>`,
    )
    .join("");

  $("#sum-subtotal").textContent = inr(order.subtotal);
  $("#sum-shipping").textContent = (order.shipping ?? 0) === 0 ? "Free" : inr(order.shipping);
  $("#sum-cod").textContent = inr(order.codFee);
  $("#sum-total").textContent = inr(order.total);

  $("#order-address").innerHTML = [
    escapeHtml(customer.name ?? ""),
    escapeHtml(customer.address ?? ""),
    escapeHtml([customer.city, customer.state, customer.pincode].filter(Boolean).join(", ")),
    escapeHtml(customer.phone ?? ""),
  ]
    .filter(Boolean)
    .join("<br>");

  $("#order-payment").textContent =
    order.paymentMethod === "cod" ? "Payment: cash on delivery" : "Payment: paid online";

  $("#order-contact").textContent = customer.email ? `Confirmation sent to ${customer.email}` : "";

  $("#help-link").href = `mailto:care@verda.in?subject=${encodeURIComponent(`Order ${orderId}`)}`;
}
