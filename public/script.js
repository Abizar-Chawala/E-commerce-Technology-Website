console.log("script.js loaded");

// Helper to call backend JSON endpoints
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// Load cart count for navbar
async function loadCartCount() {
  try {
    const data = await fetchJSON("/B_getcartcount");
    const el = document.getElementById("cart-count");
    if (el) el.textContent = data.count ?? 0;
  } catch (err) {
    console.error("Failed to load cart count", err);
  }
}

// Set year in footer
function setYear() {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
}

// PRODUCTS PAGE
async function loadProductsPage() {
  const container = document.getElementById("products-container");
  if (!container) {
    console.log("No products-container found, skipping products page init");
    return;
  }

  console.log("Loading products page...");

  try {
    const data = await fetchJSON("/B_getproducts");
    const { products } = data;
    container.innerHTML = "";

    products.forEach((p) => {
      const card = document.createElement("div");
      card.className = "product-card";

      card.innerHTML = `
        <img src="${p.B_img}" alt="${p.B_name}" class="product-image" />
        <h3 class="product-name">${p.B_name}</h3>
        <p class="product-desc">${p.B_desc}</p>
        <p class="product-price">$${p.B_price.toFixed(2)}</p>
        <button class="add-to-cart-btn" data-id="${p.id}">Add to Cart</button>
      `;

      container.appendChild(card);
    });
    
    container.addEventListener("click", async (e) => {
      const btn = e.target.closest(".add-to-cart-btn");
      if (!btn) return;
      const id = Number(btn.dataset.id);
      try {
        await fetchJSON("/B_addtocart", {
          method: "POST",
          body: JSON.stringify({ id, quantity: 1 }),
        });
        await loadCartCount();
        btn.textContent = "Added!";
        setTimeout(() => (btn.textContent = "Add to Cart"), 800);
      } catch (err) {
        console.error("Add to cart failed", err);
        alert("Could not add to cart.");
      }
    });
  } catch (err) {
    console.error("Failed to load products", err);
    container.innerHTML = "<p>Failed to load products.</p>";
  }
}

// CART PAGE
function renderCartItems(items, taxRate) {
  const container = document.getElementById("cart-items");
  const subtotalEl = document.getElementById("subtotal");
  const taxEl = document.getElementById("tax");
  const totalEl = document.getElementById("total");
  const itemCountText = document.getElementById("item-count-text");

  if (!container) return;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  if (itemCountText) {
    itemCountText.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
  }

  if (!items.length) {
    container.innerHTML = "<p style='text-align:center; color:#6b7280; padding: 40px;'>Your cart is empty.</p>";
    if (subtotalEl) subtotalEl.textContent = "0.00";
    if (taxEl) taxEl.textContent = "0.00";
    if (totalEl) totalEl.textContent = "0.00";
    return;
  }

  let subtotal = 0;
  container.innerHTML = "";

  items.forEach(({ product, quantity }) => {
    if (!product) return;
    const itemTotal = product.B_price * quantity;
    subtotal += itemTotal;

    const row = document.createElement("div");
    row.className = "cart-item";

    row.innerHTML = `
      <img src="${product.B_img}" alt="${product.B_name}" class="cart-item-image" />
      <div class="cart-item-info">
        <h3>${product.B_name}</h3>
        <p>$${product.B_price.toFixed(2)}</p>
      </div>
      <div class="cart-item-actions">
        <span class="cart-item-total">$${itemTotal.toFixed(2)}</span>
        <input type="number" min="1" value="${quantity}" data-id="${product.id}" class="cart-qty" />
        <button class="remove-item-btn" data-id="${product.id}">Remove</button>
      </div>
    `;

    container.appendChild(row);
  });

  const tax = subtotal * (taxRate ?? 0.08);
  const total = subtotal + tax;

  if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);
  if (taxEl) taxEl.textContent = tax.toFixed(2);
  if (totalEl) totalEl.textContent = total.toFixed(2);
}

async function loadCartPage() {
  const itemsContainer = document.getElementById("cart-items");
  if (!itemsContainer) return;

  console.log("Loading cart page...");

  try {
    const data = await fetchJSON("/B_getcartitems");
    renderCartItems(data.items || [], data.taxRate);

    itemsContainer.addEventListener("change", async (e) => {
      const input = e.target.closest(".cart-qty");
      if (!input) return;
      const id = Number(input.dataset.id);
      const quantity = Number(input.value);
      try {
        await fetchJSON("/B_updateQuantity", {
          method: "PUT",
          body: JSON.stringify({ id, quantity }),
        });
        const updated = await fetchJSON("/B_getcartitems");
        renderCartItems(updated.items || [], updated.taxRate);
        await loadCartCount();
      } catch (err) {
        console.error("Update quantity failed", err);
      }
    });

    itemsContainer.addEventListener("click", async (e) => {
      const btn = e.target.closest(".remove-item-btn");
      if (!btn) return;
      const id = Number(btn.dataset.id);
      try {
        await fetchJSON("/B_removefromcart", {
          method: "DELETE",
          body: JSON.stringify({ id }),
        });
        const updated = await fetchJSON("/B_getcartitems");
        renderCartItems(updated.items || [], updated.taxRate);
        await loadCartCount();
      } catch (err) {
        console.error("Remove failed", err);
      }
    });

    const checkoutBtn = document.getElementById("checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        window.location.href = "/checkout";
      });
    }
  } catch (err) {
    console.error("Failed to load cart", err);
    itemsContainer.innerHTML = "<p>Failed to load cart.</p>";
  }
}

// CHECKOUT PAGE
async function loadCheckoutPage() {
  const form = document.getElementById("checkout-form");
  if (!form) return;

  console.log("Loading checkout page...");

  try {
    // Fetch cart data
    const data = await fetchJSON("/B_getcartitems");
    const items = data.items || [];
    const taxRate = data.taxRate || 0.08;
    
    // Calculate totals
    let subtotal = 0;
    items.forEach(({ product, quantity }) => {
      if (product) {
        subtotal += product.B_price * quantity;
      }
    });
    
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    // Update the checkout summary display
    const subtotalEl = document.getElementById("subtotal");
    const taxEl = document.getElementById("tax");
    const totalEl = document.getElementById("total");
    
    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);
    if (taxEl) taxEl.textContent = tax.toFixed(2);
    if (totalEl) totalEl.textContent = total.toFixed(2);

    // Populate checkout items list
    const checkoutItemsList = document.getElementById("checkout-items");
    if (checkoutItemsList) {
      checkoutItemsList.innerHTML = '';
      items.forEach(({ product, quantity }) => {
        if (!product) return;
        const itemDiv = document.createElement("div");
        itemDiv.className = "checkout-item";
        itemDiv.innerHTML = `
          <img src="${product.B_img}" alt="${product.B_name}" class="checkout-item-image" />
          <div class="checkout-item-details">
            <h4>${product.B_name}</h4>
            <p>Qty: ${quantity} × $${product.B_price.toFixed(2)}</p>
          </div>
          <span class="checkout-item-price">$${(product.B_price * quantity).toFixed(2)}</span>
        `;
        checkoutItemsList.appendChild(itemDiv);
      });
    }

    // Handle payment method toggle
    const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
    const cardDetails = document.getElementById('card-details');
    
    paymentRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.value === 'paypal') {
          if (cardDetails) cardDetails.style.display = 'none';
        } else {
          if (cardDetails) cardDetails.style.display = 'block';
        }
      });
    });
    
  } catch (err) {
    console.error("Failed to load checkout summary", err);
  }

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const customerInfo = {
      name: `${formData.get("firstName")} ${formData.get("lastName")}`,
      email: formData.get("email"),
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      zip: formData.get("zip"),
      phone: formData.get("phone"),
      paymentMethod: formData.get("paymentMethod"),
    };

    try {
      await fetchJSON("/B_checkout", {
        method: "POST",
        body: JSON.stringify({ customerInfo }),
      });
      window.location.href = "/confirmation";
    } catch (err) {
      console.error("Checkout failed", err);
      alert("Checkout failed. Please try again.");
    }
  });
}

// MAIN INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded – initializing page");
  setYear();
  loadCartCount();

  if (document.getElementById("products-container")) {
    loadProductsPage();
  }

  if (document.getElementById("cart-items")) {
    loadCartPage();
  }

  if (document.getElementById("checkout-form")) {
    loadCheckoutPage();
  }
});