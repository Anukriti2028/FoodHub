const CART_KEY = "foodhub_cart";
const ADDR_KEY = "foodhub_address";

/* ---------- helpers ---------- */
const num = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const intNum = (v) => {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

function getCart() {
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { cart = []; }

  cart = cart
    .map((it) => {
      const rid = it.rid || it.restaurantId || "r";
      const itemId = it.itemId || it.id || it.name || "x";
      const key = it.key || `${rid}__${itemId}`;
      return {
        ...it,
        key,
        rid,
        itemId,
        name: (it.name || "").trim(),
        restaurant: (it.restaurant || it.restName || "Restaurant").trim(),
        price: num(it.price),
        qty: intNum(it.qty) || 1,
      };
    })
    .filter((it) => it.name && it.price >= 0 && it.qty > 0);

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  return cart;
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function cartCount(cart) {
  return cart.reduce((s, i) => s + intNum(i.qty), 0);
}

function itemsTotal(cart) {
  return cart.reduce((s, i) => s + intNum(i.qty) * num(i.price), 0);
}

function computeFees(itemsTotalValue) {
  if (itemsTotalValue <= 0) return { delivery: 0, platform: 0, grand: 0 };

  // simple professional-feel fees (local)
  const delivery = itemsTotalValue >= 299 ? 0 : 25;
  const platform = 5;
  const grand = itemsTotalValue + delivery + platform;
  return { delivery, platform, grand };
}

/* ---------- DOM ---------- */
const navCartCount = document.getElementById("navCartCount");

const emptyState = document.getElementById("emptyState");
const itemsCard = document.getElementById("itemsCard");
const itemsList = document.getElementById("itemsList");
const clearCartBtn = document.getElementById("clearCartBtn");

const itemsTotalEl = document.getElementById("itemsTotal");
const deliveryFeeEl = document.getElementById("deliveryFee");
const platformFeeEl = document.getElementById("platformFee");
const grandTotalEl = document.getElementById("grandTotal");
const proceedBtn = document.getElementById("proceedBtn");
const hintText = document.getElementById("hintText");

/* checkout modal */
const checkoutModal = document.getElementById("checkoutModal");
const closeCheckout = document.getElementById("closeCheckout");
const modalGrand = document.getElementById("modalGrand");

const custName = document.getElementById("custName");
const custPhone = document.getElementById("custPhone");
const custAddress = document.getElementById("custAddress");

const payMethods = document.getElementById("payMethods");
const upiBox = document.getElementById("upiBox");
const cardBox = document.getElementById("cardBox");
const upiId = document.getElementById("upiId");

const cardNo = document.getElementById("cardNo");
const cardName = document.getElementById("cardName");
const cardExp = document.getElementById("cardExp");
const cardCvv = document.getElementById("cardCvv");

const payNowBtn = document.getElementById("payNowBtn");

/* success */
const successModal = document.getElementById("successModal");
const closeSuccess = document.getElementById("closeSuccess");
const successText = document.getElementById("successText");

let activePayMethod = "upi";

/* ---------- render ---------- */
function render() {
  const cart = getCart();

  // navbar count
  navCartCount.textContent = String(cartCount(cart));

  // empty vs items UI (BUG FIX)
  const isEmpty = cart.length === 0;
  emptyState.hidden = !isEmpty;
  itemsCard.style.display = isEmpty ? "none" : "block";

  // list
  if (isEmpty) {
    itemsList.innerHTML = "";
  } else {
    itemsList.innerHTML = cart.map((it) => `
      <div class="itemRow" data-key="${it.key}">
        <div class="thumb" aria-hidden="true"></div>

        <div class="itemInfo">
          <div class="name">${escapeHtml(it.name)}</div>
          <div class="meta">${escapeHtml(it.restaurant)}</div>
          <div class="each">₹${num(it.price)} each</div>
        </div>

        <div class="itemRight">
          <div class="price">₹${num(it.price) * intNum(it.qty)}</div>

          <div class="qty" role="group" aria-label="Quantity">
            <button class="qBtn" type="button" data-dec>-</button>
            <div class="qVal">${intNum(it.qty)}</div>
            <button class="qBtn" type="button" data-inc>+</button>
          </div>

          <button class="removeBtn" type="button" data-remove>Remove</button>
        </div>
      </div>
    `).join("");
  }

  // totals
  const itTotal = itemsTotal(cart);
  const fees = computeFees(itTotal);

  itemsTotalEl.textContent = `₹${itTotal}`;
  deliveryFeeEl.textContent = `₹${fees.delivery}`;
  platformFeeEl.textContent = `₹${fees.platform}`;
  grandTotalEl.textContent = `₹${fees.grand}`;
  modalGrand.textContent = `₹${fees.grand}`;

  // proceed state
  proceedBtn.disabled = isEmpty;
  hintText.textContent = isEmpty ? "Add at least 1 item to checkout." : "Free delivery above ₹299.";
}

/* ---------- actions ---------- */
itemsList.addEventListener("click", (e) => {
  const row = e.target.closest(".itemRow");
  if (!row) return;

  const key = row.dataset.key;
  const cart = getCart();
  const idx = cart.findIndex((x) => x.key === key);
  if (idx === -1) return;

  if (e.target.closest("[data-inc]")) {
    cart[idx].qty = intNum(cart[idx].qty) + 1;
    saveCart(cart);
    render();
    return;
  }

  if (e.target.closest("[data-dec]")) {
    const q = intNum(cart[idx].qty) - 1;
    if (q <= 0) cart.splice(idx, 1);
    else cart[idx].qty = q;
    saveCart(cart);
    render();
    return;
  }

  if (e.target.closest("[data-remove]")) {
    cart.splice(idx, 1);
    saveCart(cart);
    render();
    return;
  }
});

clearCartBtn.addEventListener("click", () => {
  saveCart([]);
  render();
});

/* ---------- checkout modal ---------- */
function openModal(el) {
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");
}
function closeModal(el) {
  el.classList.remove("show");
  el.setAttribute("aria-hidden", "true");
}

function hydrateAddress() {
  try {
    const saved = JSON.parse(localStorage.getItem(ADDR_KEY) || "null");
    if (!saved) return;
    if (saved.name) custName.value = saved.name;
    if (saved.phone) custPhone.value = saved.phone;
    if (saved.address) custAddress.value = saved.address;
  } catch {}
}

function setPayMethod(m) {
  activePayMethod = m;

  // active pill
  Array.from(payMethods.querySelectorAll(".pm")).forEach((b) => {
    b.classList.toggle("active", b.dataset.method === m);
  });

  // sections
  if (m === "upi") {
    upiBox.hidden = false;
    cardBox.hidden = true;
  } else if (m === "card") {
    upiBox.hidden = true;
    cardBox.hidden = false;
  } else {
    upiBox.hidden = true;
    cardBox.hidden = true;
  }
}

payMethods.addEventListener("click", (e) => {
  const btn = e.target.closest(".pm");
  if (!btn) return;
  setPayMethod(btn.dataset.method);
});

proceedBtn.addEventListener("click", () => {
  const cart = getCart();
  if (!cart.length) return;
  hydrateAddress();
  setPayMethod("upi");
  openModal(checkoutModal);
});

closeCheckout.addEventListener("click", () => closeModal(checkoutModal));

checkoutModal.addEventListener("click", (e) => {
  if (e.target === checkoutModal) closeModal(checkoutModal);
});

/* ---------- pay now (local simulation) ---------- */
function validateCheckout() {
  const name = custName.value.trim();
  const phone = custPhone.value.trim();
  const address = custAddress.value.trim();

  if (name.length < 2) return "Please enter your name.";
  if (!/^\d{10}$/.test(phone)) return "Please enter a valid 10-digit phone number.";
  if (address.length < 10) return "Please enter a proper delivery address.";

  if (activePayMethod === "upi") {
    const u = upiId.value.trim();
    if (!u || !u.includes("@")) return "Please enter a valid UPI ID (example@upi).";
  }

  if (activePayMethod === "card") {
    const cNo = cardNo.value.replace(/\s+/g, "");
    const cName = cardName.value.trim();
    const cExp = cardExp.value.trim();
    const cCvv = cardCvv.value.trim();

    if (cNo.length < 12) return "Please enter a valid card number.";
    if (cName.length < 2) return "Please enter name on card.";
    if (!/^\d{2}\/\d{2}$/.test(cExp)) return "Expiry must be MM/YY.";
    if (!/^\d{3,4}$/.test(cCvv)) return "Please enter a valid CVV.";
  }

  return "";
}

payNowBtn.addEventListener("click", () => {
  const cart = getCart();
  if (!cart.length) return;

  const msg = validateCheckout();
  if (msg) {
    alert(msg);
    return;
  }

  // save address locally
  const payload = {
    name: custName.value.trim(),
    phone: custPhone.value.trim(),
    address: custAddress.value.trim(),
    method: activePayMethod,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(ADDR_KEY, JSON.stringify(payload));

  // success -> clear cart
  const total = computeFees(itemsTotal(cart)).grand;
  saveCart([]);

  closeModal(checkoutModal);
  successText.textContent = `Payment received. Your order of ₹${total} has been placed successfully.`;
  openModal(successModal);

  render();
});

closeSuccess.addEventListener("click", () => closeModal(successModal));

successModal.addEventListener("click", (e) => {
  if (e.target === successModal) closeModal(successModal);
});

/* ---------- safe text ---------- */
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- init ---------- */
render();