document.getElementById("year").textContent = new Date().getFullYear();

const CART_KEY = "foodhub_cart";

const getCart = () => {
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { cart = []; }

  cart = cart.map((it) => {
    const rid = it.rid || it.restaurant || "r";
    const itemId = it.itemId || it.id || it.name || "x";
    const key = it.key || `${rid}__${itemId}`;
    return { ...it, key, rid, itemId, price: Number(it.price) || 0, qty: Number(it.qty) || 1 };
  });

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  return cart;
};

const saveCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const cartCount = (cart) => cart.reduce((s, i) => s + Number(i.qty || 0), 0);
const cartTotal = (cart) => cart.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0);

function addToCart(item){
  const cart = getCart();
  const f = cart.find(x => x.key === item.key);
  if (f) f.qty += 1;
  else cart.push({ ...item, qty: 1 });
  saveCart(cart);
  return cart;
}

function clearCart(){ saveCart([]); return []; }

const restGrid = document.getElementById("restGrid");
const menuTitle = document.getElementById("menuTitle");
const menuMeta  = document.getElementById("menuMeta");
const menuCats  = document.getElementById("menuCats");
const menuList  = document.getElementById("menuList");

const searchEl = document.getElementById("search");
const sortEl = document.getElementById("sort");
const chipBtns = document.querySelectorAll(".chip");

const cartCountEl = document.getElementById("cartCount");
const cartListEl = document.getElementById("cartList");
const cartTotalEl = document.getElementById("cartTotal");
const clearBtn = document.getElementById("clearCart");

let activeChip = "all";
let activeRestId = null;
let activeCat = "All";

function readRestaurants(){
  return Array.from(restGrid.querySelectorAll(".rest")).map(el => ({
    el,
    id: el.dataset.rid,
    name: el.dataset.name,
    rating: Number(el.dataset.rating),
    eta: Number(el.dataset.eta),
    tag: (el.dataset.tag || "").toLowerCase(),
    cuisines: el.dataset.cuisines
  }));
}

function readMenuItems(rid){
  const block = document.querySelector(`.menuBlock[data-rid="${rid}"]`);
  if(!block) return [];
  return Array.from(block.querySelectorAll(".mItem")).map(x => ({
    id: x.dataset.id,
    cat: x.dataset.cat,
    name: x.dataset.name,
    desc: x.dataset.desc,
    price: Number(x.dataset.price),
    offer: Number(x.dataset.offer || 0)
  }));
}

function finalPrice(item){
  if(!item.offer) return item.price;
  return Math.round(item.price - (item.price * item.offer / 100));
}

function minMenuPrice(rid){
  const items = readMenuItems(rid);
  if(!items.length) return 999999;
  return Math.min(...items.map(i => finalPrice(i)));
}

function applyFilters(list){
  const q = (searchEl.value || "").trim().toLowerCase();

  let out = list.filter(r => {
    if(!q) return true;
    const items = readMenuItems(r.id);
    return (
      r.name.toLowerCase().includes(q) ||
      r.cuisines.toLowerCase().includes(q) ||
      items.some(i => i.name.toLowerCase().includes(q))
    );
  });

  if(activeChip === "biryani") out = out.filter(r => r.tag === "biryani");
  if(activeChip === "under30") out = out.filter(r => r.eta <= 30);
  if(activeChip === "rating45") out = out.filter(r => r.rating >= 4.5);
  if(activeChip === "under200") out = out.filter(r => minMenuPrice(r.id) <= 200);

  const s = sortEl.value;
  if(s === "rating") out.sort((a,b)=>b.rating-a.rating);
  if(s === "eta") out.sort((a,b)=>a.eta-b.eta);

  return out;
}

function renderRestaurants(){
  const list = readRestaurants();
  const filtered = applyFilters(list);

  list.forEach(r => r.el.style.display = "none");
  filtered.forEach(r => r.el.style.display = "");
  list.forEach(r => r.el.classList.toggle("active", r.id === activeRestId));
}

function renderMenu(){
  const r = readRestaurants().find(x => x.id === activeRestId);

  if(!r){
    menuTitle.textContent = "Select a restaurant";
    menuMeta.textContent = "Click any restaurant card to view its menu.";
    menuCats.innerHTML = "";
    menuList.innerHTML = `<div class="muted" style="font-weight:900;">No restaurant selected.</div>`;
    menuList.dataset.activeRid = "";
    return;
  }

  menuTitle.textContent = r.name;
  menuMeta.textContent = `${r.rating.toFixed(1)}★ • ${r.eta} mins • ${r.cuisines}`;

  const all = readMenuItems(r.id);
  const cats = ["All", ...Array.from(new Set(all.map(i => i.cat)))];

  menuCats.innerHTML = cats.map(c => `
    <button class="cat ${c === activeCat ? "active" : ""}" data-cat="${c}">${c}</button>
  `).join("");

  menuCats.querySelectorAll("[data-cat]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCat = btn.dataset.cat;
      renderMenu();
    });
  });

  const q = (searchEl.value || "").trim().toLowerCase();
  let items = [...all];
  if(activeCat !== "All") items = items.filter(i => i.cat === activeCat);
  if(q) items = items.filter(i => i.name.toLowerCase().includes(q));

  menuList.dataset.activeRid = r.id;

  menuList.innerHTML = items.map(i => {
    const p = finalPrice(i);
    return `
      <div class="item">
        <div class="item-top">
          <div>
            <h4>${i.name}</h4>
            <p>${i.desc}</p>
            ${i.offer ? `<div class="offerTag">${i.offer}% OFF • Now ₹${p}</div>` : ``}
          </div>
          <div class="price">₹${p}</div>
        </div>
        <button class="add" data-add="${i.id}">Add</button>
      </div>
    `;
  }).join("");
}

function renderCart(cart = getCart()){
  cartCountEl.textContent = String(cartCount(cart));
  cartTotalEl.textContent = `₹${cartTotal(cart)}`;

  if(!cart.length){
    cartListEl.innerHTML = `<div class="muted" style="font-weight:900;">Cart is empty.</div>`;
    return;
  }

  cartListEl.innerHTML = cart.map(it => `
    <div class="cartRow" data-key="${it.key}">
      <div>
        <div class="name">${it.name}</div>
        <div class="meta">${it.restaurant} • Qty: ${it.qty}</div>
      </div>
      <div class="right">₹${Number(it.price) * Number(it.qty)}</div>
    </div>
  `).join("");
}

restGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".rest");
  if(!card) return;
  activeRestId = card.dataset.rid;
  activeCat = "All";
  renderRestaurants();
  renderMenu();
});

menuList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if(!btn) return;

  const rid = menuList.dataset.activeRid;
  if(!rid) return;

  const r = readRestaurants().find(x => x.id === rid);
  if(!r) return;

  const all = readMenuItems(rid);
  const it = all.find(x => x.id === btn.dataset.add);
  if(!it) return;

  const p = Number(finalPrice(it));

  const cart = addToCart({
    key: `${rid}__${it.id}`,
    rid: rid,
    itemId: it.id,
    name: it.name,
    price: p,
    restaurant: r.name
  });

  renderCart(cart);
  cartListEl.scrollTop = cartListEl.scrollHeight;
});

searchEl.addEventListener("input", () => {
  renderRestaurants();
  renderMenu();
});

sortEl.addEventListener("change", renderRestaurants);

chipBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    chipBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeChip = btn.dataset.chip;
    activeRestId = null;
    activeCat = "All";
    renderRestaurants();
    renderMenu();
  });
});

clearBtn.addEventListener("click", () => renderCart(clearCart()));

document.getElementById("locBtn").addEventListener("click", () => {
  const v = prompt("Enter your location:", document.getElementById("locPlace").textContent);
  if(v && v.trim()) document.getElementById("locPlace").textContent = v.trim();
});

renderRestaurants();
renderMenu();
renderCart();