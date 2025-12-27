import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/ims.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Initializing database...');

// ==========================================
// MULTI-LOCATION SUPPORT TABLES
// ==========================================

// Franchise/Organization table
db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Locations table (each store/franchise location)
db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    phone TEXT,
    manager_name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )
`);

// ==========================================
// INVENTORY ITEMS (Ingredients/Materials)
// ==========================================

// Item categories
db.exec(`
  CREATE TABLE IF NOT EXISTS item_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Items table (ingredients - shared across locations)
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    unit_of_measure TEXT NOT NULL,
    default_cost_per_unit REAL DEFAULT 0,
    vendor TEXT,
    sku TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES item_categories(id)
  )
`);

// Location-specific inventory (tracks quantity per location)
db.exec(`
  CREATE TABLE IF NOT EXISTS location_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    current_quantity REAL DEFAULT 0,
    par_level REAL DEFAULT 0,
    cost_per_unit REAL DEFAULT 0,
    last_count_date DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (item_id) REFERENCES items(id),
    UNIQUE(location_id, item_id)
  )
`);

// ==========================================
// PREPS (Batched Ingredients)
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS preps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    yield_quantity REAL NOT NULL,
    yield_unit TEXT NOT NULL,
    cost_per_unit REAL DEFAULT 0,
    instructions TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Prep ingredients (items used in a prep)
db.exec(`
  CREATE TABLE IF NOT EXISTS prep_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prep_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    FOREIGN KEY (prep_id) REFERENCES preps(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
  )
`);

// ==========================================
// PRODUCTS (Menu items sold to guests)
// ==========================================

// Product categories
db.exec(`
  CREATE TABLE IF NOT EXISTS product_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pos_name TEXT,
    size TEXT,
    category_id INTEGER,
    menu_price REAL DEFAULT 0,
    theoretical_cost REAL DEFAULT 0,
    is_customizable INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES product_categories(id)
  )
`);

// Product components (items or preps that make up a product)
db.exec(`
  CREATE TABLE IF NOT EXISTS product_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    component_type TEXT NOT NULL CHECK(component_type IN ('item', 'prep')),
    component_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )
`);

// ==========================================
// PRODUCT MAPPINGS (POS to System mapping)
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS product_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pos_item_name TEXT NOT NULL,
    pos_size TEXT,
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(pos_item_name, pos_size)
  )
`);

// ==========================================
// VENDORS AND INVOICES
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    contact_email TEXT,
    phone TEXT,
    address TEXT,
    account_number TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'received', 'reconciled')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS invoice_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    extended_price REAL NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
  )
`);

// ==========================================
// SALES IMPORTS
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS sales_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_range_start DATE,
    date_range_end DATE,
    total_products_sold INTEGER DEFAULT 0,
    total_sales_value REAL DEFAULT 0,
    status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    notes TEXT,
    FOREIGN KEY (location_id) REFERENCES locations(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    sale_date DATE NOT NULL,
    product_id INTEGER,
    pos_item_name TEXT,
    pos_size TEXT,
    quantity INTEGER NOT NULL,
    unit_price REAL DEFAULT 0,
    total_value REAL DEFAULT 0,
    is_mapped INTEGER DEFAULT 0,
    FOREIGN KEY (import_id) REFERENCES sales_imports(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )
`);

// ==========================================
// INVENTORY COUNTS
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    count_date DATE NOT NULL,
    count_type TEXT DEFAULT 'full' CHECK(count_type IN ('full', 'partial', 'spot')),
    status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'cancelled')),
    notes TEXT,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory_count_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    count_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    system_quantity REAL DEFAULT 0,
    counted_quantity REAL,
    variance REAL DEFAULT 0,
    variance_cost REAL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (count_id) REFERENCES inventory_counts(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
  )
`);

// ==========================================
// INVENTORY TRANSACTIONS (Audit Trail)
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('received', 'used', 'waste', 'adjustment', 'transfer')),
    quantity REAL NOT NULL,
    cost_per_unit REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    reference_type TEXT CHECK(reference_type IN ('invoice', 'sales_import', 'count', 'manual', 'transfer')),
    reference_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
  )
`);

// ==========================================
// FOOD COST PERIODS (For reporting)
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS food_cost_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    beginning_inventory_value REAL DEFAULT 0,
    purchases_value REAL DEFAULT 0,
    ending_inventory_value REAL DEFAULT 0,
    actual_food_cost REAL DEFAULT 0,
    theoretical_food_cost REAL DEFAULT 0,
    total_sales REAL DEFAULT 0,
    variance_dollars REAL DEFAULT 0,
    variance_percent REAL DEFAULT 0,
    actual_food_cost_percent REAL DEFAULT 0,
    theoretical_food_cost_percent REAL DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'finalized')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id)
  )
`);

// ==========================================
// BUILD YOUR OWN PRODUCTS CONFIG
// ==========================================

db.exec(`
  CREATE TABLE IF NOT EXISTS byo_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    base_item_id INTEGER,
    base_quantity REAL DEFAULT 0,
    avg_toppings_count REAL DEFAULT 3,
    avg_topping_cost REAL DEFAULT 0.50,
    notes TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (base_item_id) REFERENCES items(id)
  )
`);

// ==========================================
// CREATE INDEXES FOR PERFORMANCE
// ==========================================

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_location_inventory_location ON location_inventory(location_id);
  CREATE INDEX IF NOT EXISTS idx_location_inventory_item ON location_inventory(item_id);
  CREATE INDEX IF NOT EXISTS idx_sales_location ON sales(location_id);
  CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
  CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_location ON invoices(location_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_transactions_location ON inventory_transactions(location_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id);
  CREATE INDEX IF NOT EXISTS idx_product_mappings_pos ON product_mappings(pos_item_name, pos_size);
`);

console.log('Database initialized successfully!');
console.log(`Database location: ${dbPath}`);

db.close();
