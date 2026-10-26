import { addDoc, collection, db, serverTimestamp } from "../firestore-client.js";

const $ = (selector) => document.querySelector(selector);

const fields = {
  name: { el: $("#c-name"), error: $("#name-error"), test: (v) => v.trim().length >= 2, message: "Enter your name." },
  email: { el: $("#c-email"), error: $("#email-error"), test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), message: "Enter a valid email address." },
  message: {
    el: $("#c-message"),
    error: $("#message-error"),
    test: (v) => v.trim().length >= 10 && v.trim().length <= 2000,
    message: "Write at least 10 characters (max 2000).",
  },
};

function validateField(key) {
  const field = fields[key];
  const ok = field.test(field.el.value);
  field.el.setAttribute("aria-invalid", String(!ok));
  field.error.textContent = ok ? "" : field.message;
  return ok;
}

Object.keys(fields).forEach((key) => {
  fields[key].el.addEventListener("blur", () => validateField(key));
});

function trackSubmit() {
  try {
    const consent = JSON.parse(localStorage.getItem("verda_consent") ?? "null");
    if (!consent?.analytics) return;
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: "contact_submit" });
  } catch {
    /* ignore */
  }
}

$("#contact-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = $("#contact-status");
  const button = $("#contact-submit");

  let valid = true;
  Object.keys(fields).forEach((key) => {
    if (!validateField(key)) valid = false;
  });
  if (!$("#c-consent").checked) {
    status.textContent = "Please tick the consent box so we can reply.";
    status.dataset.kind = "error";
    valid = false;
  }
  if (!valid) {
    if (!status.textContent) {
      status.textContent = "Please fix the highlighted fields.";
      status.dataset.kind = "error";
    }
    return;
  }

  status.textContent = "Sending…";
  status.dataset.kind = "info";
  button.disabled = true;

  const payload = {
    name: $("#c-name").value.trim(),
    email: $("#c-email").value.trim(),
    topic: $("#c-topic").value,
    orderId: $("#c-order").value.trim() || null,
    message: $("#c-message").value.trim(),
    status: "new",
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "messages"), payload);
    trackSubmit();
    status.textContent = "Message sent. We will reply within one working day.";
    status.dataset.kind = "info";
    $("#contact-form").reset();
  } catch (error) {
    console.warn("[contact]", error?.code ?? error);
    status.textContent = "Could not send the message. Check your connection and try again.";
    status.dataset.kind = "error";
  } finally {
    button.disabled = false;
  }
});
