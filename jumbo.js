// ============================================
// KVM AUTOMOBILES - Main Application JS
// ============================================

// ---- STATE ----
let currentUser = null;
let cartItems = [];
let productFilter = { search: '', category: '', vehicle: '', stock: '' };

// ============================================
// INIT
// ============================================
window.addEventListener('DOMContentLoaded', () => {
  DB.init();
  loadTheme();
  updateTodayDate();

  // Set default dates
  const t = today();
  const billDateEl = document.getElementById('billDate');
  if (billDateEl) billDateEl.value = t;

  const salesFromEl = document.getElementById('salesFromDate');
  const salesToEl = document.getElementById('salesToDate');
  if (salesFromEl) salesFromEl.value = t.substring(0, 8) + '01';
  if (salesToEl) salesToEl.value = t;

  const reportMonthEl = document.getElementById('reportMonth');
  if (reportMonthEl) reportMonthEl.value = t.substring(0, 7);

  const purchDateEl = document.getElementById('purchDate');
  if (purchDateEl) purchDateEl.value = t;

  // Check if already logged in
  const savedUser = sessionStorage.getItem('kvm_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    enterApp();
  }
});

function updateTodayDate() {
  const el = document.getElementById('todayDate');
  if (el) el.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ============================================
// AUTH
// ============================================
function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const users = DB.get('users', []);
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    document.getElementById('loginError').classList.remove('hidden');
    document.getElementById('loginPass').value = '';
    return;
  }
  currentUser = user;
  sessionStorage.setItem('kvm_user', JSON.stringify(user));
  enterApp();
}

function enterApp() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('appPage').classList.remove('hidden');
  document.getElementById('appPage').classList.add('active');

  // Set user info
  const initial = (currentUser.name || 'A')[0].toUpperCase();
  document.getElementById('sidebarName').textContent = currentUser.name;
  document.getElementById('sidebarRole').textContent = currentUser.role;
  document.getElementById('sidebarAvatar').textContent = initial;
  document.getElementById('topbarName').textContent = currentUser.name;
  document.getElementById('topbarAvatar').textContent = initial;

  loadDashboard();
}

function doLogout() {
  if (!confirm('Are you sure you want to logout?')) return;
  currentUser = null;
  sessionStorage.removeItem('kvm_user');
  document.getElementById('appPage').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}

function togglePass() {
  const inp = document.getElementById('loginPass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// Handle Enter key on login
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('loginPage').classList.contains('hidden')) {
    doLogin();
  }
});

// ============================================
// NAVIGATION
// ============================================
function showSection(name) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active');
  });
  // Show target
  const target = document.getElementById('sec-' + name);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }
  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(`'${name}'`)) {
      n.classList.add('active');
    }
  });
  // Update topbar title
  const titles = {
    dashboard: '📊 Dashboard', inventory: '📦 Products', billing: '🧾 New Invoice',
    sales: '💰 Sales History', purchases: '🛒 Purchases', suppliers: '🏭 Suppliers',
    customers: '👥 Customers', categories: '🏷️ Categories', reports: '📈 Reports', settings: '⚙️ Settings'
  };
  document.getElementById('topbarTitle').textContent = titles[name] || name;

  // Close sidebar on mobile
  if (window.innerWidth <= 768) closeSidebar();

  // Load section data
  const loaders = {
    dashboard: loadDashboard, inventory: loadInventory, sales: loadSales,
    purchases: loadPurchases, suppliers: loadSuppliers, customers: loadCustomers,
    categories: loadCategories, reports: loadReport
  };
  if (loaders[name]) loaders[name]();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('hidden');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.add('hidden');
}

// ============================================
// THEME
// ============================================
function loadTheme() {
  const saved = localStorage.getItem('kvm_theme') || 'light';
  document.body.className = saved + '-mode';
}
function setTheme(mode) {
  document.body.className = mode + '-mode';
  localStorage.setItem('kvm_theme', mode);
  document.querySelectorAll('.btn-theme').forEach(b => b.classList.remove('active'));
}
function toggleTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  setTheme(isDark ? 'light' : 'dark');
}

// ============================================
// TOAST
// ============================================
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = (type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : '⚠️ ') + msg;
  toast.className = 'toast ' + (type !== 'success' ? type : '');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ============================================
// MODAL
// ============================================
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal')) closeModal(e.target.id);
});

// ============================================
// DASHBOARD
// ============================================
function loadDashboard() {
  const products = DB.get('products', []);
  const invoices = DB.get('invoices', []);
  const purchases = DB.get('purchases', []);
  const customers = DB.get('customers', []);
  const settings = DB.get('settings', {});
  const threshold = settings.lowStockThreshold || 5;
  const t = today();
  const monthStr = t.substring(0, 7);

  // Today's sales
  const todayInvoices = invoices.filter(i => i.date === t);
  const todaySales = todayInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  document.getElementById('statTodaySales').textContent = formatCurrency(todaySales);
  document.getElementById('statTodayInvoices').textContent = todayInvoices.length + ' invoices';

  // Today's purchases
  const todayPurchases = purchases.filter(p => p.date === t);
  const todayPurchAmt = todayPurchases.reduce((s, p) => s + p.totalCost, 0);
  document.getElementById('statTodayPurchases').textContent = formatCurrency(todayPurchAmt);
  document.getElementById('statTodayPurchaseCount').textContent = todayPurchases.length + ' entries';

  // Products
  const totalStock = products.reduce((s, p) => s + p.qty, 0);
  document.getElementById('statTotalProducts').textContent = products.length;
  document.getElementById('statTotalStock').textContent = totalStock + ' items in stock';

  // Low stock
  const lowStock = products.filter(p => p.qty <= threshold);
  document.getElementById('statLowStock').textContent = lowStock.length;

  // Monthly revenue
  const monthInvoices = invoices.filter(i => i.date.startsWith(monthStr));
  const monthRev = monthInvoices.reduce((s, i) => s + i.grandTotal, 0);
  document.getElementById('statMonthRevenue').textContent = formatCurrency(monthRev);
  document.getElementById('statMonthName').textContent = getMonthName();

  // Customers
  document.getElementById('statCustomers').textContent = customers.length;

  // Low stock list
  const lowStockList = document.getElementById('lowStockList');
  if (lowStock.length === 0) {
    lowStockList.innerHTML = '<div class="empty-state">✅ All products well stocked!</div>';
  } else {
    lowStockList.innerHTML = lowStock.slice(0, 8).map(p => `
      <div class="low-stock-item">
        <div>
          <div class="prod-name">${p.name}</div>
          <div style="font-size:0.75rem;color:var(--text2)">${p.code} | ${p.rack || 'N/A'}</div>
        </div>
        <span class="qty-badge">${p.qty} left</span>
      </div>
    `).join('');
  }

  // Recent invoices
  const recentList = document.getElementById('recentInvoicesList');
  const recent = [...invoices].reverse().slice(0, 6);
  if (recent.length === 0) {
    recentList.innerHTML = '<div class="empty-state">No invoices yet. Create your first invoice!</div>';
  } else {
    recentList.innerHTML = recent.map(inv => `
      <div class="recent-item" onclick="printInvoice(${inv.id})">
        <div class="recent-item-left">
          <div class="inv-no">#${inv.invoiceNo}</div>
          <div class="cust-name">${inv.customerName} | ${formatDate(inv.date)}</div>
        </div>
        <div class="recent-item-right">
          <div class="amount">${formatCurrency(inv.grandTotal)}</div>
          <div style="font-size:0.75rem;color:var(--text2)">${inv.payMode}</div>
        </div>
      </div>
    `).join('');
  }
}

// ============================================
// INVENTORY
// ============================================
function loadInventory() {
  const products = DB.get('products', []);
  renderProducts(products);
}

function filterProducts() {
  const search = document.getElementById('productSearch').value.toLowerCase();
  const category = document.getElementById('filterCategory').value;
  const vehicle = document.getElementById('filterVehicle').value;
  const stock = document.getElementById('filterStock').value;
  const settings = DB.get('settings', {});
  const threshold = settings.lowStockThreshold || 5;

  let products = DB.get('products', []);
  if (search) products = products.filter(p =>
    p.name.toLowerCase().includes(search) ||
    p.code.toLowerCase().includes(search) ||
    (p.brand || '').toLowerCase().includes(search) ||
    (p.grade || '').toLowerCase().includes(search)
  );
  if (category) products = products.filter(p => p.category === category);
  if (vehicle) products = products.filter(p => p.vehicle === vehicle || p.vehicle === 'All Vehicles');
  if (stock === 'low') products = products.filter(p => p.qty <= threshold);
  if (stock === 'ok') products = products.filter(p => p.qty > threshold);
  renderProducts(products);
}

function renderProducts(products) {
  const tbody = document.getElementById('productTableBody');
  const empty = document.getElementById('productEmptyState');
  const settings = DB.get('settings', {});
  const threshold = settings.lowStockThreshold || 5;

  if (products.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = products.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div style="font-weight:700">${p.name}</div>
        ${p.grade ? `<div style="font-size:0.78rem;color:var(--text2)">${p.grade}</div>` : ''}
      </td>
      <td><span class="badge badge-blue">${p.code}</span></td>
      <td>${p.category}</td>
      <td><span class="badge badge-orange">${p.vehicle}</span></td>
      <td>${p.brand || '-'}</td>
      <td class="${p.qty <= threshold ? 'qty-low' : 'qty-ok'}">${p.qty} ${p.unit || ''}</td>
      <td>${formatCurrency(p.buyPrice)}</td>
      <td style="font-weight:700;color:var(--primary)">${formatCurrency(p.sellPrice)}</td>
      <td><span class="badge badge-green">${p.rack || '-'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="openEditProduct(${p.id})">✏️ Edit</button>
          <button class="btn-del" onclick="deleteProduct(${p.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddProduct() {
  document.getElementById('productModalTitle').textContent = '➕ Add Product';
  document.getElementById('prodEditId').value = '';
  ['prodName','prodCode','prodBrand','prodGrade','prodSupplier','prodRack'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('prodQty').value = '';
  document.getElementById('prodBuyPrice').value = '';
  document.getElementById('prodSellPrice').value = '';
  document.getElementById('prodCategory').value = 'Engine Oil';
  document.getElementById('prodVehicle').value = 'All Vehicles';
  document.getElementById('prodUnit').value = 'Pcs';
  openModal('productModal');
  showSection('inventory');
}

function openEditProduct(id) {
  const products = DB.get('products', []);
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('productModalTitle').textContent = '✏️ Edit Product';
  document.getElementById('prodEditId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodCode').value = p.code;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodVehicle').value = p.vehicle;
  document.getElementById('prodBrand').value = p.brand || '';
  document.getElementById('prodGrade').value = p.grade || '';
  document.getElementById('prodQty').value = p.qty;
  document.getElementById('prodBuyPrice').value = p.buyPrice;
  document.getElementById('prodSellPrice').value = p.sellPrice;
  document.getElementById('prodSupplier').value = p.supplier || '';
  document.getElementById('prodRack').value = p.rack || '';
  document.getElementById('prodUnit').value = p.unit || 'Pcs';
  openModal('productModal');
}

function saveProduct() {
  const name = document.getElementById('prodName').value.trim();
  const code = document.getElementById('prodCode').value.trim();
  const qty = parseInt(document.getElementById('prodQty').value);
  const buyPrice = parseFloat(document.getElementById('prodBuyPrice').value);
  const sellPrice = parseFloat(document.getElementById('prodSellPrice').value);

  if (!name || !code || isNaN(qty) || isNaN(buyPrice) || isNaN(sellPrice)) {
    showToast('Please fill all required fields', 'error'); return;
  }

  const prod = {
    name, code,
    category: document.getElementById('prodCategory').value,
    vehicle: document.getElementById('prodVehicle').value,
    brand: document.getElementById('prodBrand').value.trim(),
    grade: document.getElementById('prodGrade').value.trim(),
    qty, buyPrice, sellPrice,
    supplier: document.getElementById('prodSupplier').value.trim(),
    rack: document.getElementById('prodRack').value.trim(),
    unit: document.getElementById('prodUnit').value,
  };

  let products = DB.get('products', []);
  const editId = parseInt(document.getElementById('prodEditId').value);
  if (editId) {
    products = products.map(p => p.id === editId ? { ...p, ...prod } : p);
    showToast('Product updated successfully!');
  } else {
    prod.id = genId(products);
    products.push(prod);
    showToast('Product added successfully!');
  }
  DB.set('products', products);
  closeModal('productModal');
  loadInventory();
}

function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  let products = DB.get('products', []);
  products = products.filter(p => p.id !== id);
  DB.set('products', products);
  showToast('Product deleted', 'warning');
  loadInventory();
}

// ============================================
// BILLING
// ============================================
function searchBillProduct(query) {
  const dd = document.getElementById('billProductDropdown');
  if (!query.trim()) { dd.classList.add('hidden'); return; }
  const products = DB.get('products', []).filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.code.toLowerCase().includes(query.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(query.toLowerCase())
  );
  if (products.length === 0) {
    dd.innerHTML = '<div class="dropdown-item"><span class="prod-title">No products found</span></div>';
  } else {
    dd.innerHTML = products.slice(0, 8).map(p => `
      <div class="dropdown-item" onclick="addToCart(${p.id})">
        <div class="prod-title">${p.name}</div>
        <div class="prod-detail">${p.code} | ${p.category} | Stock: ${p.qty} | ₹${p.sellPrice}</div>
      </div>
    `).join('');
  }
  dd.classList.remove('hidden');
}

// Close dropdown on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.product-search-wrap')) {
    const dd = document.getElementById('billProductDropdown');
    if (dd) dd.classList.add('hidden');
  }
});

function addToCart(productId) {
  const products = DB.get('products', []);
  const prod = products.find(p => p.id === productId);
  if (!prod) return;
  if (prod.qty <= 0) { showToast('Product out of stock!', 'error'); return; }

  const existing = cartItems.find(c => c.productId === productId);
  if (existing) {
    if (existing.qty >= prod.qty) { showToast('Cannot exceed available stock!', 'warning'); return; }
    existing.qty++;
    existing.total = existing.qty * existing.rate;
  } else {
    cartItems.push({
      productId, name: prod.name, code: prod.code,
      rate: prod.sellPrice, qty: 1, total: prod.sellPrice,
      unit: prod.unit || 'Pcs', maxQty: prod.qty
    });
  }
  document.getElementById('billProductSearch').value = '';
  document.getElementById('billProductDropdown').classList.add('hidden');
  renderCart();
  calcTotals();
}

function renderCart() {
  const tbody = document.getElementById('cartTableBody');
  if (cartItems.length === 0) {
    tbody.innerHTML = '<tr id="cartEmpty"><td colspan="5" class="text-center text-muted">No items added</td></tr>';
    return;
  }
  tbody.innerHTML = cartItems.map((item, i) => `
    <tr>
      <td>
        <div style="font-weight:700">${item.name}</div>
        <div style="font-size:0.78rem;color:var(--text2)">${item.code}</div>
      </td>
      <td>
        <input type="number" class="qty-input" value="${item.qty}" min="1" max="${item.maxQty}"
          onchange="updateCartQty(${i}, this.value)" style="width:70px;text-align:center" />
      </td>
      <td>
        <input type="number" value="${item.rate}" min="0" step="0.01"
          onchange="updateCartRate(${i}, this.value)" style="width:90px;text-align:right" />
      </td>
      <td style="font-weight:700">${formatCurrency(item.total)}</td>
      <td>
        <button class="btn-del" onclick="removeFromCart(${i})" style="padding:4px 8px">✕</button>
      </td>
    </tr>
  `).join('');
}

function updateCartQty(idx, val) {
  const qty = Math.max(1, Math.min(parseInt(val) || 1, cartItems[idx].maxQty));
  cartItems[idx].qty = qty;
  cartItems[idx].total = qty * cartItems[idx].rate;
  renderCart(); calcTotals();
}
function updateCartRate(idx, val) {
  const rate = parseFloat(val) || 0;
  cartItems[idx].rate = rate;
  cartItems[idx].total = cartItems[idx].qty * rate;
  calcTotals();
}
function removeFromCart(idx) {
  cartItems.splice(idx, 1);
  renderCart(); calcTotals();
}

function calcTotals() {
  const subtotal = cartItems.reduce((s, c) => s + c.total, 0);
  const gstPct = parseFloat(document.getElementById('billGst').value) || 0;
  const discount = parseFloat(document.getElementById('billDiscount').value) || 0;
  const gstAmt = subtotal * gstPct / 100;
  const grand = subtotal + gstAmt - discount;

  document.getElementById('billSubtotal').textContent = formatCurrency(subtotal);
  document.getElementById('billGstAmt').textContent = formatCurrency(gstAmt);
  document.getElementById('billGrandTotal').textContent = formatCurrency(Math.max(0, grand));
}

function clearBill() {
  cartItems = [];
  renderCart(); calcTotals();
  document.getElementById('billCustName').value = '';
  document.getElementById('billCustPhone').value = '';
  document.getElementById('billVehicleNo').value = '';
  document.getElementById('billDate').value = today();
  document.getElementById('billGst').value = '18';
  document.getElementById('billDiscount').value = '0';
}

function saveBill() {
  if (cartItems.length === 0) { showToast('Add at least one product!', 'error'); return; }
  const custName = document.getElementById('billCustName').value.trim() || 'Walk-in Customer';

  // Calculate totals
  const subtotal = cartItems.reduce((s, c) => s + c.total, 0);
  const gstPct = parseFloat(document.getElementById('billGst').value) || 0;
  const discount = parseFloat(document.getElementById('billDiscount').value) || 0;
  const gstAmt = subtotal * gstPct / 100;
  const grandTotal = Math.max(0, subtotal + gstAmt - discount);

  // Get next invoice number
  let nextNo = DB.get('nextInvoiceNo', 1001);
  const invoiceNo = 'KVM' + String(nextNo).padStart(4, '0');
  DB.set('nextInvoiceNo', nextNo + 1);

  const invoice = {
    id: Date.now(),
    invoiceNo,
    date: document.getElementById('billDate').value || today(),
    customerName: custName,
    customerPhone: document.getElementById('billCustPhone').value.trim(),
    vehicleNo: document.getElementById('billVehicleNo').value.trim().toUpperCase(),
    items: JSON.parse(JSON.stringify(cartItems)),
    subtotal, gstPct, gstAmt, discount, grandTotal,
    payMode: document.getElementById('billPayMode').value,
    createdBy: currentUser.name
  };

  // Save invoice
  const invoices = DB.get('invoices', []);
  invoices.push(invoice);
  DB.set('invoices', invoices);

  // Update stock
  let products = DB.get('products', []);
  cartItems.forEach(item => {
    products = products.map(p => p.id === item.productId
      ? { ...p, qty: Math.max(0, p.qty - item.qty) } : p);
  });
  DB.set('products', products);

  // Add/update customer
  const phone = document.getElementById('billCustPhone').value.trim();
  if (custName !== 'Walk-in Customer' && phone) {
    let customers = DB.get('customers', []);
    const existing = customers.find(c => c.phone === phone);
    if (existing) {
      existing.totalPurchases = (existing.totalPurchases || 0) + 1;
      existing.lastVisit = invoice.date;
      if (!existing.vehicle && invoice.vehicleNo) existing.vehicle = invoice.vehicleNo;
    } else {
      customers.push({ id: genId(customers), name: custName, phone, vehicle: invoice.vehicleNo, lastVisit: invoice.date, totalPurchases: 1 });
    }
    DB.set('customers', customers);
  }

  showToast('Invoice saved: ' + invoiceNo);
  printInvoice(invoice.id);
  clearBill();
}

function suggestCustomer(val) {
  const customers = DB.get('customers', []);
  const dl = document.getElementById('customerSuggestions');
  dl.innerHTML = customers
    .filter(c => c.name.toLowerCase().includes(val.toLowerCase()) || c.phone.includes(val))
    .map(c => `<option value="${c.name}" data-phone="${c.phone}" data-vehicle="${c.vehicle}">${c.name} - ${c.phone}</option>`)
    .join('');
}

// ============================================
// PRINT INVOICE
// ============================================
function printInvoice(invoiceId) {
  const invoices = DB.get('invoices', []);
  const inv = invoices.find(i => i.id === invoiceId);
  if (!inv) return;
  const settings = DB.get('settings', {});

  const html = `
    <div class="invoice-print">
      <div class="inv-header">
        <div>
          <div class="inv-shop-name">🔧 ${settings.shopName || 'KVM AUTOMOBILES'}</div>
          <div class="inv-shop-sub">Automobile Spare Parts & Lubricants</div>
          <div class="inv-shop-sub">${settings.address || ''}</div>
          <div class="inv-shop-sub">📞 ${settings.phone || ''}</div>
          <div class="inv-shop-sub">GSTIN: ${settings.gstin || ''}</div>
        </div>
        <div class="inv-title">
          <h2>TAX INVOICE</h2>
          <div class="inv-no">Invoice No: <b>${inv.invoiceNo}</b></div>
          <div class="inv-no">Date: <b>${formatDate(inv.date)}</b></div>
          <div class="inv-no">Payment: <b>${inv.payMode}</b></div>
        </div>
      </div>

      <div class="inv-parties">
        <div class="inv-party-box">
          <h4>Bill To</h4>
          <p><b>${inv.customerName}</b></p>
          ${inv.customerPhone ? `<p>📞 ${inv.customerPhone}</p>` : ''}
          ${inv.vehicleNo ? `<p>🚗 ${inv.vehicleNo}</p>` : ''}
        </div>
        <div class="inv-party-box">
          <h4>Bill From</h4>
          <p><b>${settings.shopName || 'KVM AUTOMOBILES'}</b></p>
          <p>${settings.address || ''}</p>
          <p>GSTIN: ${settings.gstin || ''}</p>
        </div>
      </div>

      <table class="inv-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Product Name</th>
            <th>Code</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Rate</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map((item, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${item.name}</td>
              <td>${item.code}</td>
              <td style="text-align:center">${item.qty} ${item.unit || ''}</td>
              <td style="text-align:right">₹${parseFloat(item.rate).toFixed(2)}</td>
              <td style="text-align:right"><b>₹${parseFloat(item.total).toFixed(2)}</b></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="clearfix">
        <div class="inv-totals">
          <div class="inv-total-row"><span>Subtotal</span><span>₹${inv.subtotal.toFixed(2)}</span></div>
          ${inv.gstPct > 0 ? `<div class="inv-total-row"><span>GST (${inv.gstPct}%)</span><span>₹${inv.gstAmt.toFixed(2)}</span></div>` : ''}
          ${inv.discount > 0 ? `<div class="inv-total-row"><span>Discount</span><span>-₹${inv.discount.toFixed(2)}</span></div>` : ''}
          <div class="inv-total-row inv-grand"><span>TOTAL</span><span>₹${inv.grandTotal.toFixed(2)}</span></div>
        </div>
      </div>

      <div class="inv-sign">
        <div class="inv-sign-box">Customer Signature</div>
        <div class="inv-sign-box">Authorised Signatory</div>
      </div>

      <div class="inv-footer">
        <p>Thank you for your business! • Goods once sold cannot be returned.</p>
        <p>${settings.shopName || 'KVM AUTOMOBILES'} | ${settings.phone || ''}</p>
      </div>

      <div class="no-print" style="text-align:center;margin-top:1rem">
        <button onclick="window.print()" style="padding:10px 30px;background:#e85d04;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer;margin-right:10px">🖨️ Print</button>
        <button onclick="document.getElementById('invoicePrintArea').classList.add('hidden')" style="padding:10px 30px;background:#64748b;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer">✕ Close</button>
      </div>
    </div>
  `;

  const area = document.getElementById('invoicePrintArea');
  area.innerHTML = html;
  area.classList.remove('hidden');
  window.scrollTo(0, 0);
}

// ============================================
// SALES HISTORY
// ============================================
function loadSales() {
  const invoices = DB.get('invoices', []);
  const from = document.getElementById('salesFromDate').value;
  const to = document.getElementById('salesToDate').value;
  const tbody = document.getElementById('salesTableBody');
  const empty = document.getElementById('salesEmptyState');

  let filtered = [...invoices].reverse();
  if (from) filtered = filtered.filter(i => i.date >= from);
  if (to) filtered = filtered.filter(i => i.date <= to);

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = filtered.map(inv => `
    <tr>
      <td><b style="color:var(--primary)">${inv.invoiceNo}</b></td>
      <td>${formatDate(inv.date)}</td>
      <td>${inv.customerName}</td>
      <td>${inv.vehicleNo || '-'}</td>
      <td>${inv.items.length} items</td>
      <td style="font-weight:700;color:var(--green)">${formatCurrency(inv.grandTotal)}</td>
      <td><span class="badge badge-blue">${inv.payMode}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-print" onclick="printInvoice(${inv.id})">🖨️ Print</button>
          <button class="btn-del" onclick="deleteInvoice(${inv.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function deleteInvoice(id) {
  if (!confirm('Delete this invoice?')) return;
  let invoices = DB.get('invoices', []);
  invoices = invoices.filter(i => i.id !== id);
  DB.set('invoices', invoices);
  showToast('Invoice deleted', 'warning');
  loadSales();
}

// ============================================
// PURCHASES
// ============================================
function openAddPurchase() {
  const products = DB.get('products', []);
  const sel = document.getElementById('purchProduct');
  sel.innerHTML = '<option value="">-- Select Product --</option>' +
    products.map(p => `<option value="${p.id}">${p.name} (${p.code}) - Stock: ${p.qty}</option>`).join('');
  document.getElementById('purchQty').value = '';
  document.getElementById('purchCost').value = '';
  document.getElementById('purchTotal').value = '';
  document.getElementById('purchBillNo').value = '';
  document.getElementById('purchDate').value = today();
  document.getElementById('purchSupplier').value = '';
  openModal('purchaseModal');
}

function fillPurchasePrice() {
  const id = parseInt(document.getElementById('purchProduct').value);
  const products = DB.get('products', []);
  const prod = products.find(p => p.id === id);
  if (prod) document.getElementById('purchCost').value = prod.buyPrice;
  calcPurchTotal();
}

function calcPurchTotal() {
  const qty = parseFloat(document.getElementById('purchQty').value) || 0;
  const cost = parseFloat(document.getElementById('purchCost').value) || 0;
  document.getElementById('purchTotal').value = '₹' + (qty * cost).toFixed(2);
}

function savePurchase() {
  const productId = parseInt(document.getElementById('purchProduct').value);
  const qty = parseInt(document.getElementById('purchQty').value);
  const cost = parseFloat(document.getElementById('purchCost').value);

  if (!productId || isNaN(qty) || qty <= 0 || isNaN(cost)) {
    showToast('Fill all required fields', 'error'); return;
  }

  const products = DB.get('products', []);
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  const purchase = {
    id: Date.now(),
    productId, productName: prod.name, productCode: prod.code,
    supplier: document.getElementById('purchSupplier').value.trim(),
    qty, costPerUnit: cost, totalCost: qty * cost,
    billNo: document.getElementById('purchBillNo').value.trim(),
    date: document.getElementById('purchDate').value || today()
  };

  // Update stock
  const updatedProducts = products.map(p =>
    p.id === productId ? { ...p, qty: p.qty + qty, buyPrice: cost } : p
  );
  DB.set('products', updatedProducts);

  let purchases = DB.get('purchases', []);
  purchases.push(purchase);
  DB.set('purchases', purchases);

  showToast(`Stock updated! ${prod.name}: +${qty} units`);
  closeModal('purchaseModal');
  loadPurchases();
}

function loadPurchases() {
  const purchases = DB.get('purchases', []);
  const tbody = document.getElementById('purchaseTableBody');
  const empty = document.getElementById('purchaseEmptyState');

  if (purchases.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = [...purchases].reverse().map(p => `
    <tr>
      <td>${formatDate(p.date)}</td>
      <td>
        <div style="font-weight:700">${p.productName}</div>
        <div style="font-size:0.78rem;color:var(--text2)">${p.productCode}</div>
      </td>
      <td>${p.supplier || '-'}</td>
      <td style="font-weight:700;color:var(--blue)">${p.qty}</td>
      <td>${formatCurrency(p.costPerUnit)}</td>
      <td style="font-weight:700">${formatCurrency(p.totalCost)}</td>
      <td>${p.billNo || '-'}</td>
    </tr>
  `).join('');
}

// ============================================
// SUPPLIERS
// ============================================
function loadSuppliers() {
  const suppliers = DB.get('suppliers', []);
  const tbody = document.getElementById('supplierTableBody');
  tbody.innerHTML = suppliers.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td style="font-weight:700">${s.name}</td>
      <td>${s.phone}</td>
      <td>${s.email || '-'}</td>
      <td>${s.address || '-'}</td>
      <td>${s.gstin || '-'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-del" onclick="deleteSupplier(${s.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddSupplier() {
  ['suppName','suppPhone','suppEmail','suppAddress','suppGstin'].forEach(id => {
    document.getElementById(id).value = '';
  });
  openModal('supplierModal');
}

function saveSupplier() {
  const name = document.getElementById('suppName').value.trim();
  const phone = document.getElementById('suppPhone').value.trim();
  if (!name || !phone) { showToast('Name and phone required', 'error'); return; }
  let suppliers = DB.get('suppliers', []);
  suppliers.push({
    id: genId(suppliers), name, phone,
    email: document.getElementById('suppEmail').value.trim(),
    address: document.getElementById('suppAddress').value.trim(),
    gstin: document.getElementById('suppGstin').value.trim()
  });
  DB.set('suppliers', suppliers);
  showToast('Supplier added!');
  closeModal('supplierModal');
  loadSuppliers();
}

function deleteSupplier(id) {
  if (!confirm('Delete this supplier?')) return;
  let suppliers = DB.get('suppliers', []).filter(s => s.id !== id);
  DB.set('suppliers', suppliers);
  showToast('Supplier deleted', 'warning');
  loadSuppliers();
}

// ============================================
// CUSTOMERS
// ============================================
function loadCustomers() {
  const customers = DB.get('customers', []);
  const tbody = document.getElementById('customerTableBody');
  if (customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:2rem">No customers yet</td></tr>';
    return;
  }
  const invoices = DB.get('invoices', []);
  tbody.innerHTML = customers.map((c, i) => {
    const custInvoices = invoices.filter(inv => inv.customerPhone === c.phone);
    const total = custInvoices.reduce((s, inv) => s + inv.grandTotal, 0);
    return `
      <tr>
        <td>${i + 1}</td>
        <td style="font-weight:700">${c.name}</td>
        <td>${c.phone}</td>
        <td>${c.vehicle || '-'}</td>
        <td style="font-weight:700;color:var(--green)">${formatCurrency(total)}</td>
        <td>${formatDate(c.lastVisit) || '-'}</td>
      </tr>
    `;
  }).join('');
}

function openAddCustomer() {
  ['custName','custPhone','custVehicle'].forEach(id => document.getElementById(id).value = '');
  openModal('customerModal');
}

function saveCustomer() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  if (!name || !phone) { showToast('Name and phone required', 'error'); return; }
  let customers = DB.get('customers', []);
  if (customers.find(c => c.phone === phone)) { showToast('Customer with this phone already exists', 'warning'); return; }
  customers.push({
    id: genId(customers), name, phone,
    vehicle: document.getElementById('custVehicle').value.trim(),
    lastVisit: today(), totalPurchases: 0
  });
  DB.set('customers', customers);
  showToast('Customer added!');
  closeModal('customerModal');
  loadCustomers();
}

// ============================================
// CATEGORIES
// ============================================
function loadCategories() {
  const products = DB.get('products', []);
  const categories = [
    { name: 'Engine Oil', icon: '🛢️' }, { name: 'Gear Oil', icon: '⚙️' },
    { name: 'Hydraulic Oil', icon: '🔧' }, { name: 'Grease', icon: '🟡' },
    { name: 'Brake Fluid', icon: '🔴' }, { name: 'Mirrors', icon: '🪞' },
    { name: 'Wipers', icon: '🌧️' }, { name: 'Headlights', icon: '💡' },
    { name: 'Brake Liners', icon: '🔩' }, { name: 'Brake Shoes', icon: '🦶' },
    { name: 'Cables', icon: '〰️' }, { name: 'Nuts & Bolts', icon: '🔩' },
    { name: 'Washers', icon: '⭕' }, { name: 'Tools', icon: '🔨' },
    { name: 'Chain Products', icon: '⛓️' }, { name: 'Spare Parts', icon: '🚗' },
    { name: 'Fans', icon: '💨' }, { name: 'Filters', icon: '🔸' },
    { name: 'Other', icon: '📦' }
  ];

  const grid = document.getElementById('categoriesGrid');
  grid.innerHTML = categories.map(cat => {
    const count = products.filter(p => p.category === cat.name).length;
    const totalQty = products.filter(p => p.category === cat.name).reduce((s, p) => s + p.qty, 0);
    return `
      <div class="category-card" onclick="filterByCategory('${cat.name}')">
        <div class="category-icon">${cat.icon}</div>
        <div class="category-name">${cat.name}</div>
        <div class="category-count">${count} products · ${totalQty} in stock</div>
      </div>
    `;
  }).join('');
}

function filterByCategory(cat) {
  showSection('inventory');
  document.getElementById('filterCategory').value = cat;
  filterProducts();
}

// ============================================
// REPORTS
// ============================================
function loadReport() {
  const type = document.getElementById('reportType').value;
  const month = document.getElementById('reportMonth').value;
  const invoices = DB.get('invoices', []);
  const products = DB.get('products', []);
  const purchases = DB.get('purchases', []);

  const statsEl = document.getElementById('reportStats');
  const headEl = document.getElementById('reportTableHead');
  const bodyEl = document.getElementById('reportTableBody');

  if (type === 'daily' || type === 'monthly') {
    const filtered = type === 'daily'
      ? invoices.filter(i => i.date === today())
      : invoices.filter(i => i.date.startsWith(month));

    const totalSales = filtered.reduce((s, i) => s + i.grandTotal, 0);
    const totalItems = filtered.reduce((s, i) => s + i.items.length, 0);

    statsEl.innerHTML = `
      <div class="report-stat"><div class="report-stat-label">Total Sales</div><div class="report-stat-value">${formatCurrency(totalSales)}</div></div>
      <div class="report-stat"><div class="report-stat-label">Total Invoices</div><div class="report-stat-value">${filtered.length}</div></div>
      <div class="report-stat"><div class="report-stat-label">Items Sold</div><div class="report-stat-value">${totalItems}</div></div>
      <div class="report-stat"><div class="report-stat-label">Avg Invoice</div><div class="report-stat-value">${filtered.length ? formatCurrency(totalSales / filtered.length) : '₹0'}</div></div>
    `;

    headEl.innerHTML = '<tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment</th></tr>';
    bodyEl.innerHTML = [...filtered].reverse().map(inv => `
      <tr>
        <td><b style="color:var(--primary)">${inv.invoiceNo}</b></td>
        <td>${formatDate(inv.date)}</td>
        <td>${inv.customerName}</td>
        <td>${inv.items.length}</td>
        <td style="font-weight:700;color:var(--green)">${formatCurrency(inv.grandTotal)}</td>
        <td>${inv.payMode}</td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="text-center text-muted" style="padding:2rem">No records found</td></tr>';

  } else if (type === 'stock') {
    const settings = DB.get('settings', {});
    const threshold = settings.lowStockThreshold || 5;
    const totalValue = products.reduce((s, p) => s + p.qty * p.buyPrice, 0);
    const lowCount = products.filter(p => p.qty <= threshold).length;

    statsEl.innerHTML = `
      <div class="report-stat"><div class="report-stat-label">Total Products</div><div class="report-stat-value">${products.length}</div></div>
      <div class="report-stat"><div class="report-stat-label">Stock Value</div><div class="report-stat-value">${formatCurrency(totalValue)}</div></div>
      <div class="report-stat"><div class="report-stat-label">Low Stock Items</div><div class="report-stat-value" style="color:var(--red)">${lowCount}</div></div>
      <div class="report-stat"><div class="report-stat-label">Out of Stock</div><div class="report-stat-value" style="color:var(--red)">${products.filter(p => p.qty === 0).length}</div></div>
    `;

    headEl.innerHTML = '<tr><th>Product</th><th>Code</th><th>Category</th><th>Qty</th><th>Buy Price</th><th>Stock Value</th><th>Status</th></tr>';
    bodyEl.innerHTML = products.map(p => `
      <tr>
        <td style="font-weight:700">${p.name}</td>
        <td>${p.code}</td>
        <td>${p.category}</td>
        <td class="${p.qty <= threshold ? 'qty-low' : 'qty-ok'}">${p.qty} ${p.unit || ''}</td>
        <td>${formatCurrency(p.buyPrice)}</td>
        <td>${formatCurrency(p.qty * p.buyPrice)}</td>
        <td><span class="badge ${p.qty === 0 ? 'badge-red' : p.qty <= threshold ? 'badge-orange' : 'badge-green'}">${p.qty === 0 ? 'Out of Stock' : p.qty <= threshold ? 'Low Stock' : 'OK'}</span></td>
      </tr>
    `).join('');

  } else if (type === 'profit') {
    const filtered = invoices.filter(i => i.date.startsWith(month));
    let totalRevenue = 0, totalCOGS = 0;

    filtered.forEach(inv => {
      totalRevenue += inv.grandTotal;
      inv.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) totalCOGS += item.qty * prod.buyPrice;
      });
    });
    const profit = totalRevenue - totalCOGS;

    statsEl.innerHTML = `
      <div class="report-stat"><div class="report-stat-label">Revenue</div><div class="report-stat-value">${formatCurrency(totalRevenue)}</div></div>
      <div class="report-stat"><div class="report-stat-label">Cost of Goods</div><div class="report-stat-value" style="color:var(--red)">${formatCurrency(totalCOGS)}</div></div>
      <div class="report-stat"><div class="report-stat-label">Gross Profit</div><div class="report-stat-value" style="color:var(--green)">${formatCurrency(profit)}</div></div>
      <div class="report-stat"><div class="report-stat-label">Margin %</div><div class="report-stat-value">${totalRevenue > 0 ? ((profit/totalRevenue)*100).toFixed(1) : 0}%</div></div>
    `;

    headEl.innerHTML = '<tr><th>Invoice No</th><th>Date</th><th>Revenue</th><th>Est. Profit</th></tr>';
    bodyEl.innerHTML = [...filtered].reverse().map(inv => {
      let cogs = 0;
      inv.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) cogs += item.qty * prod.buyPrice;
      });
      const p = inv.grandTotal - cogs;
      return `
        <tr>
          <td><b style="color:var(--primary)">${inv.invoiceNo}</b></td>
          <td>${formatDate(inv.date)}</td>
          <td>${formatCurrency(inv.grandTotal)}</td>
          <td style="font-weight:700;color:${p >= 0 ? 'var(--green)' : 'var(--red)'}">${formatCurrency(p)}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="4" class="text-center text-muted" style="padding:2rem">No records</td></tr>';
  }
}

// ============================================
// SETTINGS
// ============================================
function saveSettings() {
  const settings = {
    shopName: document.getElementById('setShopName').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    address: document.getElementById('setAddress').value.trim(),
    gstin: document.getElementById('setGstin').value.trim(),
    lowStockThreshold: parseInt(document.getElementById('setLowStock').value) || 5
  };
  DB.set('settings', settings);
  showToast('Settings saved!');
}

function changePassword() {
  const curr = document.getElementById('setCurrPass').value;
  const newP = document.getElementById('setNewPass').value;
  const conf = document.getElementById('setConfPass').value;
  if (!curr || !newP) { showToast('Fill all fields', 'error'); return; }
  if (newP !== conf) { showToast('Passwords do not match', 'error'); return; }
  let users = DB.get('users', []);
  const user = users.find(u => u.id === currentUser.id && u.password === curr);
  if (!user) { showToast('Current password incorrect', 'error'); return; }
  users = users.map(u => u.id === currentUser.id ? { ...u, password: newP } : u);
  DB.set('users', users);
  showToast('Password changed!');
  document.getElementById('setCurrPass').value = '';
  document.getElementById('setNewPass').value = '';
  document.getElementById('setConfPass').value = '';
}

function exportData() {
  const data = {
    products: DB.get('products', []),
    invoices: DB.get('invoices', []),
    purchases: DB.get('purchases', []),
    customers: DB.get('customers', []),
    suppliers: DB.get('suppliers', []),
    settings: DB.get('settings', {})
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kvm-automobiles-backup-' + today() + '.json';
  a.click();
  showToast('Data exported!');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!confirm('This will overwrite all current data. Continue?')) return;
        if (data.products) DB.set('products', data.products);
        if (data.invoices) DB.set('invoices', data.invoices);
        if (data.purchases) DB.set('purchases', data.purchases);
        if (data.customers) DB.set('customers', data.customers);
        if (data.suppliers) DB.set('suppliers', data.suppliers);
        if (data.settings) DB.set('settings', data.settings);
        showToast('Data imported successfully!');
        loadDashboard();
      } catch { showToast('Invalid file format', 'error'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearAllData() {
  if (!confirm('⚠️ This will delete ALL data permanently. Are you sure?')) return;
  if (!confirm('Last chance! This cannot be undone. DELETE ALL DATA?')) return;
  const keys = ['products','invoices','purchases','customers','suppliers','settings','nextInvoiceNo'];
  keys.forEach(k => localStorage.removeItem('kvm_' + k));
  localStorage.removeItem('kvm_initialized');
  DB.init();
  showToast('All data cleared and reset to defaults', 'warning');
  loadDashboard();
}