import {
  auth,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  onAuthStateChanged,
  query,
  serverTimestamp,
  setDoc,
  signOut,
  where,
} from "../firestore-client.js";

const $ = (selector) => document.querySelector(selector);
const inr = (value) => `₹${Number(value ?? 0).toLocaleString("en-IN")}`;

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ---------------- Auth gate ---------------- */

onAuthStateChanged(auth, async (user) => {
  const signedOut = $("#signed-out");
  const signedIn = $("#signed-in");
  const signout = $("#signout");

  if (!user) {
    signedOut.hidden = false;
    signedIn.hidden = true;
    signout.hidden = true;
    $("#orders-loading").hidden = true;
    $("#profile-name").textContent = "";
    $("#profile-email").textContent = "";
    return;
  }

  signedOut.hidden = true;
  signedIn.hidden = false;
  signout.hidden = false;

  $("#profile-name").textContent = user.displayName ?? "Signed in";
  $("#profile-email").textContent = user.email ?? "";
  if (user.photoURL) {
    $("#avatar").src = user.photoURL;
    $("#avatar").alt = `${user.displayName ?? "User"} profile photo`;
  }

  await Promise.all([loadProfile(user), loadOrders(user)]);
});

$("#signout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.assign("/");
});

/* ---------------- Profile ---------------- */

async function loadProfile(user) {
  try {
    const snapshot = await getDoc(doc(db, "users", user.uid));
    if (!snapshot.exists()) return;
    const data = snapshot.data();

    if (data.createdAt) {
      $("#profile-meta").textContent = `Member since ${formatDate(data.createdAt)}`;
    }
    if (data.phone) $("#phone").value = data.phone;

    const address = data.lastAddress;
    if (address?.address) {
      $("#address-card").hidden = false;
      $("#address-text").innerHTML = [
        address.address,
        [address.city, address.state, address.pincode].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .map((line) => escapeHtml(line))
        .join("<br>");
    }
  } catch (error) {
    console.warn("[account] profile", error?.code ?? error);
  }
}

$("#phone-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = $("#phone-status");
  const value = $("#phone").value.trim();

  if (!/^[6-9]\d{9}$/.test(value)) {
    status.textContent = "Enter a valid 10-digit mobile number.";
    status.dataset.kind = "error";
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  status.textContent = "Saving…";
  status.dataset.kind = "info";

  try {
    await setDoc(
      doc(db, "users", user.uid),
      { phone: value, updatedAt: serverTimestamp() },
      { merge: true },
    );
    status.textContent = "Saved. We will use this number for delivery updates.";
    status.dataset.kind = "info";
  } catch (error) {
    console.warn("[account] phone", error?.code ?? error);
    status.textContent = "Could not save. Please try again.";
    status.dataset.kind = "error";
  }
});

/* ---------------- Orders ---------------- */

async function loadOrders(user) {
  const loading = $("#orders-loading");
  const empty = $("#orders-empty");
  const list = $("#orders-list");

  try {
    const snapshot = await getDocs(query(collection(db, "orders"), where("uid", "==", user.uid)));
    const orders = snapshot.docs
      .map((entry) => ({ id: entry.id, ...entry.data() }))
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

    loading.hidden = true;
    $("#orders-count").textContent = orders.length
      ? `${orders.length} order${orders.length === 1 ? "" : "s"}`
      : "";

    if (!orders.length) {
      empty.hidden = false;
      return;
    }

    list.innerHTML = orders.map(renderOrder).join("");
  } catch (error) {
    console.warn("[account] orders", error?.code ?? error);
    loading.textContent = "Could not load orders. Please refresh.";
  }
}

function renderOrder(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const customer = order.customer ?? {};
  const status = order.status ?? "placed";
  const payment = order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online";

  return `
    <li>
      <details class="order">
        <summary>
          <span class="order__id">#${escapeHtml(order.id.slice(0, 10))}</span>
          <span class="order__date">${formatDate(order.createdAt)}</span>
          <span class="order__total">${inr(order.total)}</span>
          <span class="order__status">${escapeHtml(status)}</span>
        </summary>
        <div class="order__body">
          <ul class="order__items">
            ${items
              .map(
                (item) => `<li><span>${escapeHtml(item.name ?? item.id)} × ${Number(item.qty ?? 1)}</span><strong>${inr((item.price ?? 0) * (item.qty ?? 1))}</strong></li>`,
              )
              .join("")}
          </ul>
          <div class="order__meta">
            <p class="order__shipping">
              <strong>Deliver to</strong>
              ${escapeHtml(customer.name ?? "")}<br>
              ${escapeHtml(customer.address ?? "")}<br>
              ${escapeHtml([customer.city, customer.state, customer.pincode].filter(Boolean).join(", "))}<br>
              ${escapeHtml(customer.phone ?? "")}
            </p>
            <p><strong>Payment</strong><br>${payment}</p>
            <p><strong>Subtotal</strong><br>${inr(order.subtotal)}</p>
            <p><strong>Shipping + COD</strong><br>${inr((order.shipping ?? 0) + (order.codFee ?? 0))}</p>
          </div>
          <a class="order__link" href="/order/?id=${encodeURIComponent(order.id)}">View order details →</a>
        </div>
      </details>
    </li>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ---------------- Input hygiene ---------------- */

$("#phone").addEventListener("input", (event) => {
  event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
});
