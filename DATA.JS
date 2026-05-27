// ============================================
// KVM AUTOMOBILES - Sample Data & Storage
// ============================================

// ============================================
// DEFAULT USERS
// ============================================

const DEFAULT_USERS = [
  {
    id: 1,
    username: 'kvm',
    password: 'kvm1414',
    name: 'KVM Admin',
    role: 'admin'
  },
  {
    id: 2,
    username: 'staff',
    password: 'staff123',
    name: 'Staff Member',
    role: 'staff'
  }
];

// ============================================
// SAMPLE PRODUCTS
// ============================================

const SAMPLE_PRODUCTS = [
  {
    id: 1,
    name: 'Castrol GTX 20W-40',
    code: 'EO-001',
    category: 'Engine Oil',
    vehicle: 'All Vehicles',
    brand: 'Castrol',
    grade: '20W-40',
    qty: 48,
    buyPrice: 180,
    sellPrice: 220,
    supplier: 'Castrol India',
    rack: 'A-01',
    unit: 'Litre'
  },
  {
    id: 2,
    name: 'Motul 7100 10W-40',
    code: 'EO-002',
    category: 'Engine Oil',
    vehicle: '2 Wheeler',
    brand: 'Motul',
    grade: '10W-40',
    qty: 24,
    buyPrice: 420,
    sellPrice: 520,
    supplier: 'Motul India',
    rack: 'A-02',
    unit: 'Litre'
  },
  {
    id: 3,
    name: 'DOT 3 Brake Fluid',
    code: 'BF-001',
    category: 'Brake Fluid',
    vehicle: 'All Vehicles',
    brand: 'Brembo',
    grade: 'DOT 3',
    qty: 28,
    buyPrice: 110,
    sellPrice: 145,
    supplier: 'Auto Parts Ltd',
    rack: 'C-02',
    unit: 'Pcs'
  },
  {
    id: 4,
    name: 'TVS Wiper Blade 14"',
    code: 'WP-001',
    category: 'Wipers',
    vehicle: '4 Wheeler',
    brand: 'TVS',
    grade: '',
    qty: 2,
    buyPrice: 120,
    sellPrice: 160,
    supplier: 'TVS Auto',
    rack: 'D-01',
    unit: 'Pcs'
  }
];

// ============================================
// SAMPLE SUPPLIERS
// ============================================

const SAMPLE_SUPPLIERS = [
  {
    id: 1,
    name: 'Castrol India Ltd',
    phone: '9876543210',
    email: 'orders@castrolindia.com',
    address: 'Mumbai, Maharashtra',
    gstin: '27AAAC1234A1ZX'
  },
  {
    id: 2,
    name: 'Motul India Pvt Ltd',
    phone: '9876543211',
    email: 'supply@motulindia.com',
    address: 'Delhi',
    gstin: '07AABC1234A1ZX'
  }
];

// ============================================
// SAMPLE CUSTOMERS
// ============================================

const SAMPLE_CUSTOMERS = [
  {
    id: 1,
    name: 'Rajan P',
    phone: '9876501234',
    vehicle: 'KL-01-AB-1234',
    lastVisit: '2025-01-20',
    totalPurchases: 3
  },
  {
    id: 2,
    name: 'Suresh Kumar',
    phone: '9876501235',
    vehicle: 'KL-05-CD-5678',
    lastVisit: '2025-01-18',
    totalPurchases: 7
  }
];

// ============================================
// LOCAL STORAGE DATABASE
// ============================================

const DB = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem('kvm_' + key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, val) {
    try {
      localStorage.setItem('kvm_' + key, JSON.stringify(val));
    } catch (e) {
      console.error(e);
    }
  },

  init() {
    if (!this.get('initialized')) {

      this.set('users', DEFAULT_USERS);
      this.set('products', SAMPLE_PRODUCTS);
      this.set('suppliers', SAMPLE_SUPPLIERS);
      this.set('customers', SAMPLE_CUSTOMERS);

      this.set('invoices', []);
      this.set('purchases', []);

      this.set('settings', {
        shopName: 'KVM AUTOMOBILES',
        phone: '8547588208,9744635232,8921784205',
        address: 'Thekkekavala, Pattimattom P.O',
        gstin: '32XXXXXXXXXXXZX',
        lowStockThreshold: 5
      });

      this.set('nextInvoiceNo', 1001);

      this.set('initialized', true);
    }
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function genId(arr) {
  return arr.length > 0
    ? Math.max(...arr.map(x => x.id)) + 1
    : 1;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d) {
  if (!d) return '';

  const dt = new Date(d);

  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatCurrency(n) {
  return '₹' + parseFloat(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2
  });
}

function getMonthName(d) {
  return new Date(d || Date.now())
    .toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric'
    });
}

// ============================================
// INITIALIZE DATABASE
// ============================================

DB.init();