const STORAGE_KEY = "zarli_cart_v2";
const WHATSAPP_NUMBER = "201121770453";

const els = {
  grid: document.getElementById("grid"),
  empty: document.getElementById("empty"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  results: document.getElementById("resultsCount"),
  cartBtn: document.getElementById("cartBtn"),
  cartCount: document.getElementById("cartCount"),
  cartDialog: document.getElementById("cartDialog"),
  cartItems: document.getElementById("cartItems"),
  cartForm: document.getElementById("cartForm"),
  clearCart: document.getElementById("clearCart"),
  submitOrder: document.getElementById("submitOrder"),
  status: document.getElementById("status"),
  name: document.getElementById("name"),
  phone: document.getElementById("phone"),
  address: document.getElementById("address"),
  notes: document.getElementById("notes"),
  cartTotal: document.getElementById("cartTotal"),
  filterCategories: document.getElementById("filterCategories"),
  filterSizes: document.getElementById("filterSizes"),
  filterColors: document.getElementById("filterColors"),
  priceMin: document.getElementById("priceMin"),
  priceMax: document.getElementById("priceMax"),
  clearFilters: document.getElementById("clearFilters"),
};

let products = [];

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalize(str) {
  return String(str || "").trim().toLowerCase();
}

function uniq(values) {
  return [...new Set(values)];
}

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function cartCount(cart) {
  return cart.reduce((sum, item) => sum + (item.qty || 0), 0);
}

function setStatus(text, kind) {
  els.status.textContent = text || "";
  els.status.classList.remove("ok", "err");
  if (kind) els.status.classList.add(kind);
}

function priceOf(product) {
  return Number(product.salePrice || product.price || 0);
}

function discountOf(product) {
  const price = Number(product.price || 0);
  const sale = Number(product.salePrice || 0);
  if (!price || !sale || sale >= price) return 0;
  return Math.round(((price - sale) / price) * 100);
}

function renderFilterList(container, values, type) {
  container.innerHTML = values
    .map(
      (value) => `
      <label class="filterItem">
        <input type="checkbox" data-filter="${type}" value="${escapeHtml(value)}" />
        <span>${escapeHtml(value)}</span>
      </label>`
    )
    .join("");
}

function renderFilters() {
  const categories = uniq(products.map((p) => p.category).filter(Boolean)).sort((a, b) =>
    a.localeCompare(b, "ar")
  );
  const sizes = uniq(
    products.flatMap((p) => (Array.isArray(p.sizes) ? p.sizes : []))
  ).sort((a, b) => String(a).localeCompare(String(b), "ar"));
  const colors = uniq(
    products.flatMap((p) => (Array.isArray(p.colors) ? p.colors : []))
  ).sort((a, b) => a.localeCompare(b, "ar"));

  renderFilterList(els.filterCategories, categories, "category");
  renderFilterList(els.filterSizes, sizes, "size");
  renderFilterList(els.filterColors, colors, "color");
}

function readFilters() {
  const getChecked = (type) =>
    new Set(
      [...document.querySelectorAll(`input[data-filter="${type}"]:checked`)].map(
        (el) => el.value
      )
    );

  return {
    search: normalize(els.search.value),
    sort: els.sort.value,
    categories: getChecked("category"),
    sizes: getChecked("size"),
    colors: getChecked("color"),
    priceMin: Number(els.priceMin.value || 0) || null,
    priceMax: Number(els.priceMax.value || 0) || null,
  };
}

function applyFilters(list, filters) {
  return list.filter((p) => {
    const query = filters.search;
    const matchesQuery =
      !query ||
      normalize(p.title).includes(query) ||
      normalize(p.category).includes(query) ||
      normalize(p.sku).includes(query);

    const matchesCategory =
      filters.categories.size === 0 || filters.categories.has(p.category);

    const sizeList = Array.isArray(p.sizes) ? p.sizes : [];
    const matchesSize =
      filters.sizes.size === 0 || sizeList.some((s) => filters.sizes.has(s));

    const colorList = Array.isArray(p.colors) ? p.colors : [];
    const matchesColor =
      filters.colors.size === 0 || colorList.some((c) => filters.colors.has(c));

    const price = priceOf(p);
    const minOk = !filters.priceMin || price >= filters.priceMin;
    const maxOk = !filters.priceMax || price <= filters.priceMax;

    return matchesQuery && matchesCategory && matchesSize && matchesColor && minOk && maxOk;
  });
}

function sortProducts(list, sortKey) {
  const sorted = [...list];
  if (sortKey === "price-asc") {
    sorted.sort((a, b) => priceOf(a) - priceOf(b));
  } else if (sortKey === "price-desc") {
    sorted.sort((a, b) => priceOf(b) - priceOf(a));
  } else if (sortKey === "discount-desc") {
    sorted.sort((a, b) => discountOf(b) - discountOf(a));
  }
  return sorted;
}

function productCard(product) {
  const sale = Number(product.salePrice || 0);
  const price = Number(product.price || 0);
  const hasSale = sale && price && sale < price;
  const discount = discountOf(product);
  const sizeOptions = (product.sizes || [])
    .map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
    .join("");
  const colorOptions = (product.colors || [])
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    .join("");

  return `
    <article class="productCard" data-id="${escapeHtml(product.id)}">
      <div class="media">
        ${
          product.image
            ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" />`
            : `<div class="placeholder">${escapeHtml(product.category || "ZARLI")}</div>`
        }
        ${hasSale ? `<div class="badgeSale">خصم ${discount}%</div>` : ""}
      </div>
      <div class="cardBody">
        <div class="cardTitle">${escapeHtml(product.title)}</div>
        <div class="cardMeta">${escapeHtml(product.category || "")}${
          product.sku ? ` • ${escapeHtml(product.sku)}` : ""
        }</div>
        <div class="priceRow">
          <div class="salePrice">${priceOf(product)} جنيه</div>
          ${hasSale ? `<div class="oldPrice">${price} جنيه</div>` : ""}
        </div>
        <div class="options">
          ${
            sizeOptions
              ? `<select class="input" data-size><option value="">المقاس</option>${sizeOptions}</select>`
              : ""
          }
          ${
            colorOptions
              ? `<select class="input" data-color><option value="">اللون</option>${colorOptions}</select>`
              : ""
          }
          <input class="input" type="number" min="1" max="20" value="1" data-qty />
        </div>
        <button class="addBtn" type="button" data-add>إضافة للسلة</button>
      </div>
    </article>
  `;
}

function renderProducts(list) {
  els.grid.innerHTML = list.map(productCard).join("");
  els.empty.classList.toggle("hidden", list.length > 0);
  els.results.textContent = `عدد المنتجات: ${list.length}`;

  els.grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest("[data-id]");
      const id = card?.dataset.id;
      const product = products.find((p) => p.id === id);
      if (!product) return;

      const size = card.querySelector("[data-size]")?.value || "";
      const color = card.querySelector("[data-color]")?.value || "";
      const qty = Math.max(
        1,
        Math.min(20, Number(card.querySelector("[data-qty]")?.value || 1))
      );

      const needsSize = Array.isArray(product.sizes) && product.sizes.length > 0;
      const needsColor = Array.isArray(product.colors) && product.colors.length > 0;
      if (needsSize && !size) {
        alert("اختار المقاس الأول");
        return;
      }
      if (needsColor && !color) {
        alert("اختار اللون الأول");
        return;
      }

      addToCart(product, { size, color, qty });
      setStatus("", null);
    });
  });
}

function updateView() {
  const filters = readFilters();
  const filtered = sortProducts(applyFilters(products, filters), filters.sort);
  renderProducts(filtered);
}

function addToCart(product, { size, color, qty }) {
  const cart = loadCart();
  const key = { id: product.id, size, color };
  const idx = cart.findIndex(
    (x) => x.id === key.id && x.size === key.size && x.color === key.color
  );
  if (idx >= 0) {
    cart[idx].qty = Math.min(99, (cart[idx].qty || 0) + qty);
  } else {
    cart.push({
      id: product.id,
      sku: product.sku,
      title: product.title,
      size,
      color,
      qty,
      price: priceOf(product),
    });
  }
  saveCart(cart);
  renderCartCount();
}

function renderCartCount() {
  const cart = loadCart();
  els.cartCount.textContent = String(cartCount(cart));
}

function renderCart() {
  const cart = loadCart();
  if (cart.length === 0) {
    els.cartItems.innerHTML = `<div class="empty">السلة فاضية. اختار منتجات الأول.</div>`;
    els.cartTotal.textContent = "0 جنيه";
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.qty || 0) * (item.price || 0), 0);
  els.cartTotal.textContent = `${total} جنيه`;

  els.cartItems.innerHTML = cart
    .map((item, idx) => {
      const meta = [
        item.sku ? `SKU: ${item.sku}` : "",
        item.size ? `المقاس: ${item.size}` : "",
        item.color ? `اللون: ${item.color}` : "",
      ]
        .filter(Boolean)
        .join(" - ");
      return `
        <div class="cartItem">
          <div>
            <div class="cartItemTitle">${escapeHtml(item.title)}</div>
            <div class="cartItemMeta">${escapeHtml(meta)}</div>
          </div>
          <div class="cartItemRight">
            <input class="mini" type="number" min="1" max="99" value="${Number(item.qty || 1)}" data-qty="${idx}" aria-label="الكمية" />
            <button class="btn secondary" type="button" data-remove="${idx}">حذف</button>
          </div>
        </div>
      `;
    })
    .join("");

  els.cartItems.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => removeLine(Number(btn.dataset.remove)));
  });
  els.cartItems.querySelectorAll("[data-qty]").forEach((inp) => {
    inp.addEventListener("change", () => updateQty(Number(inp.dataset.qty), inp.value));
  });
}

function removeLine(index) {
  const cart = loadCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
  renderCartCount();
}

function updateQty(index, qty) {
  const cart = loadCart();
  const value = Number(qty);
  if (!Number.isFinite(value) || value <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].qty = Math.min(99, Math.floor(value));
  }
  saveCart(cart);
  renderCart();
  renderCartCount();
}

function buildWhatsAppMessage(cart, customer) {
  const lines = [];
  lines.push("طلب جديد من ZARLI (رجالي)");
  lines.push("");
  lines.push(`الاسم: ${customer.name}`);
  lines.push(`الموبايل: ${customer.phone}`);
  lines.push(`العنوان: ${customer.address}`);
  if (customer.notes) lines.push(`ملاحظات: ${customer.notes}`);
  lines.push("");
  lines.push("المنتجات:");

  let total = 0;
  cart.forEach((item) => {
    const meta = [
      item.size ? `المقاس: ${item.size}` : "",
      item.color ? `اللون: ${item.color}` : "",
    ]
      .filter(Boolean)
      .join(" - ");

    const lineTotal = (item.price || 0) * (item.qty || 0);
    total += lineTotal;

    lines.push(`- ${item.title} × ${item.qty}${meta ? ` (${meta})` : ""} = ${lineTotal} جنيه`);
  });
  lines.push("");
  lines.push(`الإجمالي: ${total} جنيه`);
  return lines.join("\n");
}

function submitOrder() {
  const cart = loadCart();
  const customer = {
    name: els.name.value.trim(),
    phone: els.phone.value.trim(),
    address: els.address.value.trim(),
    notes: els.notes.value.trim(),
  };

  if (!customer.name || !customer.phone || !customer.address) {
    setStatus("من فضلك اكتب الاسم والموبايل والعنوان.", "err");
    return;
  }
  if (cart.length === 0) {
    setStatus("السلة فاضية.", "err");
    return;
  }

  const message = buildWhatsAppMessage(cart, customer);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank");
  setStatus("تم فتح واتساب برسالة الطلب.", "ok");
  saveCart([]);
  renderCart();
  renderCartCount();
}

async function init() {
  renderCartCount();

  try {
    const res = await fetch("/products.json");
    products = await res.json();
  } catch {
    products = [];
  }

  renderFilters();
  updateView();

  els.search.addEventListener("input", updateView);
  els.sort.addEventListener("change", updateView);
  els.priceMin.addEventListener("input", updateView);
  els.priceMax.addEventListener("input", updateView);

  document.getElementById("filtersPanel").addEventListener("change", updateView);

  els.clearFilters.addEventListener("click", () => {
    document
      .querySelectorAll("#filtersPanel input[type=checkbox]")
      .forEach((el) => (el.checked = false));
    els.priceMin.value = "";
    els.priceMax.value = "";
    updateView();
  });

  els.cartBtn.addEventListener("click", () => {
    renderCart();
    setStatus("", null);
    els.cartDialog.showModal();
  });

  els.clearCart.addEventListener("click", () => {
    saveCart([]);
    renderCart();
    renderCartCount();
    setStatus("تم تفريغ السلة.", "ok");
  });

  els.cartForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitOrder();
  });
}

init();
