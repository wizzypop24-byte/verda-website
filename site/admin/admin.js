import {
  auth,
  collection,
  db,
  doc,
  getDocs,
  onAuthStateChanged,
  serverTimestamp,
  signOut,
  updateDoc,
} from "../firestore-client.js";

const ADMIN_EMAIL = "wizzypop24@gmail.com";
const STATUSES = ["placed", "packed", "shipped", "delivered", "cancelled"];

const $ = (selector) => document.querySelector(selector);
const inr = (value) => `₹${Number(value ?? 0).toLocaleString("en-IN")}`;

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setStatus(message, kind = "info") {
  const el = $("#admin-status");
  el.textContent = message;
  el.dataset.kind = kind;
}

/* ---------------- Auth gate ---------------- */

onAuthStateChanged(auth, async (user) => {
  const signedOut = $("#signed-out");
  const denied = $("#denied");
  const app = $("#app");
  const signout = $("#signout");
  const refresh = $("#refresh");

  if (!user) {
    signedOut.hidden = false;
    denied.hidden = true;
    app.hidden = true;
    signout.hidden = true;
    refresh.hidden = true;
    return;
  }

  if (user.email !== ADMIN_EMAIL) {
    signedOut.hidden = true;
    denied.hidden = false;
    app.hidden = true;
    signout.hidden = false;
    refresh.hidden = true;
    return;
  }

  signedOut.hidden = true;
  denied.hidden = true;
  app.hidden = false;
  signout.hidden = false;
  refresh.hidden = false;
  await loadAll();
});

$("#signout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.assign("/");
});

$("#denied-signout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.assign("/auth/?next=/admin/");
});

$("#refresh").addEventListener("click", () => loadAll());

/* ---------------- Tabs ---------------- */

function selectTab(name) {
  const orders = name === "orders";
  $("#panel-orders").hidden = !orders;
  $("#panel-leads").hidden = orders;
  $("#tab-orders").classList.toggle("is-active", orders);
  $("#tab-leads").classList.toggle("is-active", !orders);
  $("#tab-orders").setAttribute("aria-selected", String(orders));
  $("#tab-leads").setAttribute("aria-selected", String(!orders));
}

$("#tab-orders").addEventListener("click", () => selectTab("orders"));
$("#tab-leads").addEventListener("click", () => selectTab("leads"));

/* ---------------- Data ---------------- */

let orders = [];
let leads = [];

async function loadAll() {
  setStatus("Loading…");

  try {
    const [orderSnap, leadSnap] = await Promise.all([
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "newsletter")),
    ]);

    orders = orderSnap.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

    leads = leadSnap.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

    renderStats();
    renderOrders();
    renderLeads();
    setStatus(`${orders.length} order(s) loaded`, "info");
  } catch (error) {
    console.error("[admin]", error?.code, error?.message);
    setStatus(
      error?.code === "permission-denied"
        ? "Permission denied. Sign in with the owner account."
        : "Could not load data. Check your connection and refresh.",
      "error",
    );
  }
}

function renderStats() {
  const active = orders.filter((order) => order.status !== "cancelled");
  $("#stat-orders").textContent = String(orders.length);
  $("#stat-revenue").textContent = inr(active.reduce((sum, order) => sum + Number(order.total ?? 0), 0));
  $("#stat-cod").textContent = String(orders.filter((order) => order.paymentMethod === "cod").length);
  $("#stat-leads").textContent = String(leads.length);
}

function renderOrders() {
  const list = $("#orders-list");
  $("#orders-empty").hidden = orders.length > 0;

  list.innerHTML = orders
    .map((order) => {
      const customer = order.customer ?? {};
      const items = Array.isArray(order.items) ? order.items : [];
      const status = STATUSES.includes(order.status) ? order.status : "placed";

      return `
        <details class="order-row">
          <summary>
            <span class="col-id">#${escapeHtml(order.id.slice(0, 8))}</span>
            <span class="col-date">${formatDate(order.createdAt)}</span>
            <span class="col-customer">${escapeHtml(customer.name ?? "Guest")}<br><small>${escapeHtml(customer.phone ?? "")}</small></span>
            <span class="col-total">${inr(order.total)}</span>
            <select class="status-select" data-id="${escapeHtml(order.id)}" data-prev="${status}" aria-label="Order status for ${escapeHtml(order.id.slice(0, 8))}">
              ${STATUSES.map((value) => `<option value="${value}"${value === status ? " selected" : ""}>${value}</option>`).join("")}
            </select>
          </summary>
          <div class="order-detail">
            <ul>
              ${items
                .map(
                  (item) =>
                    `<li>${escapeHtml(item.name ?? item.id)} × ${Number(item.qty ?? 1)} — <strong>${inr((item.price ?? 0) * (item.qty ?? 1))}</strong></li>`,
                )
                .join("")}
            </ul>
            <p><strong>Deliver to:</strong> ${escapeHtml(customer.address ?? "")}, ${escapeHtml([customer.city, customer.state, customer.pincode].filter(Boolean).join(", "))}</p>
            <p><strong>Payment:</strong> ${order.paymentMethod === "cod" ? "Cash on delivery" : "Online"} · <strong>Shipping + COD:</strong> ${inr((order.shipping ?? 0) + (order.codFee ?? 0))}</p>
          </div>
        </details>`;
    })
    .join("");
}

function renderLeads() {
  const table = $("#leads-table");
  const empty = $("#leads-empty");
  const body = $("#leads-body");

  table.hidden = leads.length === 0;
  empty.hidden = leads.length > 0;

  body.innerHTML = leads
    .map(
      (lead) => `
      <tr>
        <td>${escapeHtml(lead.email ?? "")}</td>
        <td>${escapeHtml(lead.source ?? "home")}</td>
        <td>${escapeHtml(lead.productInterest ?? "—")}</td>
        <td>${formatDate(lead.createdAt)}</td>
      </tr>`,
    )
    .join("");
}

/* ---------------- Status updates ---------------- */

$("#orders-list").addEventListener("click", (event) => {
  if (event.target.closest(".status-select")) event.stopPropagation();
});

$("#orders-list").addEventListener("change", async (event) => {
  const select = event.target.closest(".status-select");
  if (!select) return;

  const id = select.dataset.id;
  const next = select.value;
  const previous = select.dataset.prev;

  select.disabled = true;
  setStatus(`Updating #${id.slice(0, 8)} to ${next}…`);

  try {
    await updateDoc(doc(db, "orders", id), { status: next, updatedAt: serverTimestamp() });
    select.dataset.prev = next;
    setStatus(`#${id.slice(0, 8)} → ${next}`, "info");
    const order = orders.find((entry) => entry.id === id);
    if (order) order.status = next;
    renderStats();
  } catch (error) {
    console.error("[admin] status", error?.code, error?.message);
    select.value = previous;
    setStatus("Could not update status. Check permissions.", "error");
  } finally {
    select.disabled = false;
  }
});
