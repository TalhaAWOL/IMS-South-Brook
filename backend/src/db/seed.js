import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/ims.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('Seeding database with sample data...');

// ==========================================
// SEED ORGANIZATION AND LOCATIONS
// ==========================================

const insertOrg = db.prepare(`
  INSERT OR IGNORE INTO organizations (id, name, contact_email, phone)
  VALUES (?, ?, ?, ?)
`);

insertOrg.run(1, "Big Mama's and Papa's Pizzeria", 'contact@bmpp.com', '1-800-BIGPAPA');

const insertLocation = db.prepare(`
  INSERT OR IGNORE INTO locations (id, organization_id, name, code, city, state)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertLocation.run(1, 1, 'Milton Location', 'MILTON', 'Milton', 'ON');
insertLocation.run(2, 1, 'Brampton Location', 'BRAMPTON', 'Brampton', 'ON');
insertLocation.run(3, 1, 'Mississauga Location', 'MISS', 'Mississauga', 'ON');

// ==========================================
// SEED ITEM CATEGORIES
// ==========================================

const insertCategory = db.prepare(`
  INSERT OR IGNORE INTO item_categories (id, name, description)
  VALUES (?, ?, ?)
`);

insertCategory.run(1, 'Proteins', 'Meats, poultry, and protein items');
insertCategory.run(2, 'Dairy', 'Cheese, milk, eggs, and dairy products');
insertCategory.run(3, 'Produce', 'Fresh vegetables and fruits');
insertCategory.run(4, 'Dry Goods', 'Flour, dough, pasta, and dry ingredients');
insertCategory.run(5, 'Beverages', 'Sodas, juices, and drinks');
insertCategory.run(6, 'Sauces', 'Pizza sauce, BBQ, buffalo, and other sauces');
insertCategory.run(7, 'Packaging', 'Boxes, containers, and packaging materials');
insertCategory.run(8, 'Seasonings', 'Spices, salt, pepper, and seasonings');

// ==========================================
// SEED ITEMS (Ingredients)
// ==========================================

const insertItem = db.prepare(`
  INSERT OR IGNORE INTO items (id, name, category_id, unit_of_measure, default_cost_per_unit, vendor, sku)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Dry Goods
insertItem.run(1, 'Pizza Dough', 4, 'oz', 0.05, 'GFS', 'DG-001');
insertItem.run(2, 'Calzone Dough', 4, 'oz', 0.05, 'GFS', 'DG-002');
insertItem.run(3, 'Gluten Free Dough', 4, 'oz', 0.12, 'GFS', 'DG-003');
insertItem.run(4, 'Cauliflower Crust', 4, 'each', 3.50, 'Sysco', 'DG-004');

// Dairy
insertItem.run(10, 'Mozzarella Cheese', 2, 'oz', 0.15, 'GFS', 'DA-001');
insertItem.run(11, 'Feta Cheese', 2, 'oz', 0.20, 'GFS', 'DA-002');
insertItem.run(12, 'Parmesan Cheese', 2, 'oz', 0.25, 'GFS', 'DA-003');
insertItem.run(13, 'Ricotta Cheese', 2, 'oz', 0.18, 'GFS', 'DA-004');
insertItem.run(14, 'Eggs', 2, 'each', 0.25, 'GFS', 'DA-005');
insertItem.run(15, 'Butter', 2, 'oz', 0.10, 'GFS', 'DA-006');
insertItem.run(16, 'Cheddar Cheese', 2, 'oz', 0.14, 'GFS', 'DA-007');

// Proteins
insertItem.run(20, 'Chicken Wings', 1, 'each', 0.35, 'GFS', 'PR-001');
insertItem.run(21, 'Pepperoni', 1, 'oz', 0.18, 'Sysco', 'PR-002');
insertItem.run(22, 'Italian Sausage', 1, 'oz', 0.20, 'Sysco', 'PR-003');
insertItem.run(23, 'Ground Beef', 1, 'oz', 0.22, 'GFS', 'PR-004');
insertItem.run(24, 'Canadian Bacon', 1, 'oz', 0.24, 'GFS', 'PR-005');
insertItem.run(25, 'Bacon Strips', 1, 'oz', 0.28, 'GFS', 'PR-006');
insertItem.run(26, 'Grilled Chicken', 1, 'oz', 0.30, 'GFS', 'PR-007');
insertItem.run(27, 'Meatballs', 1, 'each', 0.45, 'Sysco', 'PR-008');
insertItem.run(28, 'Salami', 1, 'oz', 0.22, 'Sysco', 'PR-009');
insertItem.run(29, 'Ham', 1, 'oz', 0.19, 'GFS', 'PR-010');

// Sauces
insertItem.run(30, 'Pizza Sauce', 6, 'oz', 0.08, 'GFS', 'SA-001');
insertItem.run(31, 'BBQ Sauce', 6, 'oz', 0.10, 'GFS', 'SA-002');
insertItem.run(32, 'Buffalo Sauce', 6, 'oz', 0.10, 'GFS', 'SA-003');
insertItem.run(33, 'Cajun Sauce', 6, 'oz', 0.12, 'Sysco', 'SA-004');
insertItem.run(34, 'Honey Garlic Sauce', 6, 'oz', 0.11, 'Sysco', 'SA-005');
insertItem.run(35, 'Alfredo Sauce', 6, 'oz', 0.15, 'GFS', 'SA-006');
insertItem.run(36, 'Marinara Sauce', 6, 'oz', 0.09, 'GFS', 'SA-007');
insertItem.run(37, 'Ranch Dressing', 6, 'oz', 0.08, 'GFS', 'SA-008');
insertItem.run(38, 'Garlic Butter', 6, 'oz', 0.12, 'GFS', 'SA-009');

// Produce
insertItem.run(40, 'Mushrooms', 3, 'oz', 0.15, 'GFS', 'PD-001');
insertItem.run(41, 'Bell Peppers', 3, 'oz', 0.12, 'GFS', 'PD-002');
insertItem.run(42, 'Onions', 3, 'oz', 0.06, 'GFS', 'PD-003');
insertItem.run(43, 'Tomatoes', 3, 'oz', 0.10, 'GFS', 'PD-004');
insertItem.run(44, 'Black Olives', 3, 'oz', 0.18, 'GFS', 'PD-005');
insertItem.run(45, 'Green Olives', 3, 'oz', 0.18, 'GFS', 'PD-006');
insertItem.run(46, 'Jalapenos', 3, 'oz', 0.14, 'GFS', 'PD-007');
insertItem.run(47, 'Pineapple', 3, 'oz', 0.12, 'GFS', 'PD-008');
insertItem.run(48, 'Spinach', 3, 'oz', 0.16, 'GFS', 'PD-009');
insertItem.run(49, 'Lettuce', 3, 'oz', 0.08, 'GFS', 'PD-010');
insertItem.run(50, 'Banana Peppers', 3, 'oz', 0.14, 'GFS', 'PD-011');

// Beverages
insertItem.run(60, 'Coca-Cola 355ml Can', 5, 'each', 0.65, 'Sysco', 'BV-001');
insertItem.run(61, 'Sprite 355ml Can', 5, 'each', 0.65, 'Sysco', 'BV-002');
insertItem.run(62, 'Fanta 355ml Can', 5, 'each', 0.65, 'Sysco', 'BV-003');
insertItem.run(63, '2-Liter Soda Bottle', 5, 'each', 1.50, 'Sysco', 'BV-004');
insertItem.run(64, 'Mexican Coke 500ml', 5, 'each', 1.25, 'Sysco', 'BV-005');
insertItem.run(65, 'Bottled Water', 5, 'each', 0.35, 'GFS', 'BV-006');

// Seasonings
insertItem.run(70, 'Salt', 8, 'oz', 0.02, 'GFS', 'SE-001');
insertItem.run(71, 'Black Pepper', 8, 'oz', 0.08, 'GFS', 'SE-002');
insertItem.run(72, 'Oregano', 8, 'oz', 0.12, 'GFS', 'SE-003');
insertItem.run(73, 'Garlic Powder', 8, 'oz', 0.10, 'GFS', 'SE-004');
insertItem.run(74, 'Red Pepper Flakes', 8, 'oz', 0.09, 'GFS', 'SE-005');
insertItem.run(75, 'Italian Seasoning', 8, 'oz', 0.11, 'GFS', 'SE-006');

// Packaging
insertItem.run(80, 'Pizza Box Small', 7, 'each', 0.35, 'Sysco', 'PK-001');
insertItem.run(81, 'Pizza Box Medium', 7, 'each', 0.45, 'Sysco', 'PK-002');
insertItem.run(82, 'Pizza Box Large', 7, 'each', 0.55, 'Sysco', 'PK-003');
insertItem.run(83, 'Pizza Box X-Large', 7, 'each', 0.65, 'Sysco', 'PK-004');
insertItem.run(84, 'Wing Container', 7, 'each', 0.25, 'Sysco', 'PK-005');
insertItem.run(85, 'Pasta Container', 7, 'each', 0.30, 'Sysco', 'PK-006');

// ==========================================
// SEED LOCATION INVENTORY (for Milton)
// ==========================================

const insertLocationInventory = db.prepare(`
  INSERT OR IGNORE INTO location_inventory (location_id, item_id, current_quantity, par_level, cost_per_unit)
  VALUES (?, ?, ?, ?, ?)
`);

// Milton location inventory
insertLocationInventory.run(1, 1, 500, 200, 0.05);   // Pizza Dough
insertLocationInventory.run(1, 2, 200, 100, 0.05);   // Calzone Dough
insertLocationInventory.run(1, 10, 300, 150, 0.15);  // Mozzarella
insertLocationInventory.run(1, 11, 100, 50, 0.20);   // Feta
insertLocationInventory.run(1, 14, 120, 60, 0.25);   // Eggs
insertLocationInventory.run(1, 15, 50, 25, 0.10);    // Butter
insertLocationInventory.run(1, 20, 200, 100, 0.35);  // Chicken Wings
insertLocationInventory.run(1, 21, 150, 75, 0.18);   // Pepperoni
insertLocationInventory.run(1, 27, 50, 25, 0.45);    // Meatballs
insertLocationInventory.run(1, 30, 200, 100, 0.08);  // Pizza Sauce
insertLocationInventory.run(1, 31, 50, 25, 0.10);    // BBQ Sauce
insertLocationInventory.run(1, 32, 50, 25, 0.10);    // Buffalo Sauce
insertLocationInventory.run(1, 33, 50, 25, 0.12);    // Cajun Sauce
insertLocationInventory.run(1, 34, 50, 25, 0.11);    // Honey Garlic
insertLocationInventory.run(1, 60, 48, 24, 0.65);    // Coca-Cola
insertLocationInventory.run(1, 63, 24, 12, 1.50);    // 2-Liter Soda

// ==========================================
// SEED PREPS
// ==========================================

const insertPrep = db.prepare(`
  INSERT OR IGNORE INTO preps (id, name, yield_quantity, yield_unit, cost_per_unit)
  VALUES (?, ?, ?, ?, ?)
`);

const insertPrepItem = db.prepare(`
  INSERT OR IGNORE INTO prep_items (prep_id, item_id, quantity, unit)
  VALUES (?, ?, ?, ?)
`);

// Mozzarella and Feta Mix (80% mozz, 20% feta)
insertPrep.run(1, 'Mozzarella and Feta Mix', 100, 'oz', 0.16);
insertPrepItem.run(1, 10, 80, 'oz');  // 80 oz Mozzarella
insertPrepItem.run(1, 11, 20, 'oz');  // 20 oz Feta

// Three Cheese Blend
insertPrep.run(2, 'Three Cheese Blend', 100, 'oz', 0.17);
insertPrepItem.run(2, 10, 60, 'oz');  // Mozzarella
insertPrepItem.run(2, 12, 20, 'oz');  // Parmesan
insertPrepItem.run(2, 16, 20, 'oz');  // Cheddar

// ==========================================
// SEED PRODUCT CATEGORIES
// ==========================================

const insertProdCategory = db.prepare(`
  INSERT OR IGNORE INTO product_categories (id, name, description)
  VALUES (?, ?, ?)
`);

insertProdCategory.run(1, 'Appetizers', 'Wings, meatballs, and starters');
insertProdCategory.run(2, 'Calzones', 'Folded pizza pockets');
insertProdCategory.run(3, 'Desserts', 'Sweet treats and desserts');
insertProdCategory.run(4, 'Drinks', 'Beverages and sodas');
insertProdCategory.run(5, 'Egg Gondola Pizza', 'Breakfast gondola pizzas');
insertProdCategory.run(6, 'Extra', 'Extra toppings and add-ons');
insertProdCategory.run(7, 'Pastas', 'Pasta dishes');
insertProdCategory.run(8, 'Pizzas - Round', 'Traditional round pizzas');
insertProdCategory.run(9, 'Pizzas - Slices', 'Pizza by the slice');
insertProdCategory.run(10, 'Salads', 'Fresh salads');
insertProdCategory.run(11, 'Sandwiches', 'Hot and cold sandwiches');

// ==========================================
// SEED PRODUCTS
// ==========================================

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (id, name, pos_name, size, category_id, menu_price, theoretical_cost, is_customizable)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertProductComponent = db.prepare(`
  INSERT OR IGNORE INTO product_components (product_id, component_type, component_id, quantity, unit)
  VALUES (?, ?, ?, ?, ?)
`);

// Egg Gondolas
insertProduct.run(1, '1 Egg Gondola', 'Egg Gondola Pizza', 'One Egg', 5, 8.99, 1.65, 0);
insertProductComponent.run(1, 'item', 1, 4, 'oz');     // Dough
insertProductComponent.run(1, 'prep', 1, 4, 'oz');     // Mozz/Feta Mix
insertProductComponent.run(1, 'item', 14, 1, 'each');  // Egg
insertProductComponent.run(1, 'item', 15, 0.25, 'oz'); // Butter

insertProduct.run(2, '2 Egg Gondola', 'Egg Gondola Pizza', 'Two Egg', 5, 12.99, 2.85, 0);
insertProductComponent.run(2, 'item', 1, 8, 'oz');     // Dough
insertProductComponent.run(2, 'prep', 1, 6, 'oz');     // Mozz/Feta Mix
insertProductComponent.run(2, 'item', 14, 2, 'each');  // Eggs
insertProductComponent.run(2, 'item', 15, 0.5, 'oz');  // Butter

// Wings
insertProduct.run(10, 'Cajun Wings 6pc', 'Cajun Chicken Wings (531)', '6 pc', 1, 9.99, 2.82, 0);
insertProductComponent.run(10, 'item', 20, 6, 'each');  // Wings
insertProductComponent.run(10, 'item', 33, 1, 'oz');    // Cajun Sauce

insertProduct.run(11, 'Cajun Wings 8pc', 'Cajun Chicken Wings (531)', '8 pc', 1, 12.99, 3.76, 0);
insertProductComponent.run(11, 'item', 20, 8, 'each');
insertProductComponent.run(11, 'item', 33, 1.5, 'oz');

insertProduct.run(12, 'Cajun Wings 12pc', 'Cajun Chicken Wings (531)', '12 pc', 1, 17.99, 5.64, 0);
insertProductComponent.run(12, 'item', 20, 12, 'each');
insertProductComponent.run(12, 'item', 33, 2, 'oz');

insertProduct.run(13, 'Cajun Wings 16pc', 'Cajun Chicken Wings (531)', '16 pc', 1, 22.99, 7.52, 0);
insertProductComponent.run(13, 'item', 20, 16, 'each');
insertProductComponent.run(13, 'item', 33, 2.5, 'oz');

insertProduct.run(14, 'Cajun Wings 24pc', 'Cajun Chicken Wings (531)', '24 pc', 1, 32.99, 11.28, 0);
insertProductComponent.run(14, 'item', 20, 24, 'each');
insertProductComponent.run(14, 'item', 33, 3, 'oz');

// Buffalo Wings
insertProduct.run(15, 'Buffalo Wings 6pc', 'Classic Buffalo Chicken Wings (525)', '6 pc', 1, 9.99, 2.70, 0);
insertProductComponent.run(15, 'item', 20, 6, 'each');
insertProductComponent.run(15, 'item', 32, 1, 'oz');

insertProduct.run(16, 'Buffalo Wings 12pc', 'Classic Buffalo Chicken Wings (525)', '12 pc', 1, 17.99, 5.40, 0);
insertProductComponent.run(16, 'item', 20, 12, 'each');
insertProductComponent.run(16, 'item', 32, 2, 'oz');

// BBQ Wings
insertProduct.run(17, 'BBQ Wings 6pc', 'Classic BBQ Chicken Wings (527)', '6 pc', 1, 9.99, 2.70, 0);
insertProductComponent.run(17, 'item', 20, 6, 'each');
insertProductComponent.run(17, 'item', 31, 1, 'oz');

insertProduct.run(18, 'BBQ Wings 12pc', 'Classic BBQ Chicken Wings (527)', '12 pc', 1, 17.99, 5.40, 0);
insertProductComponent.run(18, 'item', 20, 12, 'each');
insertProductComponent.run(18, 'item', 31, 2, 'oz');

// Honey Garlic Wings
insertProduct.run(19, 'Honey Garlic Wings 6pc', 'Honey Garlic Chicken Wings (532)', '6 pc', 1, 9.99, 2.76, 0);
insertProductComponent.run(19, 'item', 20, 6, 'each');
insertProductComponent.run(19, 'item', 34, 1, 'oz');

insertProduct.run(20, 'Honey Garlic Wings 12pc', 'Honey Garlic Chicken Wings (532)', '12 pc', 1, 17.99, 5.52, 0);
insertProductComponent.run(20, 'item', 20, 12, 'each');
insertProductComponent.run(20, 'item', 34, 2, 'oz');

// Appetizers
insertProduct.run(21, 'Baked Meatballs', 'Baked Meatballs Appetizer (104)', 'Regular', 1, 10.99, 3.60, 0);
insertProductComponent.run(21, 'item', 27, 8, 'each');   // 8 meatballs
insertProductComponent.run(21, 'item', 36, 3, 'oz');     // Marinara

// Drinks
insertProduct.run(30, 'Coca-Cola Can', 'Coca-Cola (505)', '355ml Soda Can', 4, 2.49, 0.65, 0);
insertProductComponent.run(30, 'item', 60, 1, 'each');

insertProduct.run(31, '2-Liter Soda', 'Coca-Cola (505)', '2-Liter Soda Bottle', 4, 4.99, 1.50, 0);
insertProductComponent.run(31, 'item', 63, 1, 'each');

// Calzones
insertProduct.run(40, 'CYO Calzone', 'CYO Calzone (304)', 'Calzone', 2, 14.99, 4.50, 1);
insertProductComponent.run(40, 'item', 2, 12, 'oz');    // Calzone Dough
insertProductComponent.run(40, 'item', 10, 4, 'oz');    // Mozzarella
insertProductComponent.run(40, 'item', 13, 2, 'oz');    // Ricotta
insertProductComponent.run(40, 'item', 30, 2, 'oz');    // Sauce

insertProduct.run(41, 'Cheese Lover Calzone', 'Cheese Lover Calzone (322)', 'Calzone', 2, 15.99, 5.20, 0);
insertProductComponent.run(41, 'item', 2, 12, 'oz');
insertProductComponent.run(41, 'item', 10, 6, 'oz');
insertProductComponent.run(41, 'item', 13, 3, 'oz');
insertProductComponent.run(41, 'item', 12, 2, 'oz');
insertProductComponent.run(41, 'item', 30, 2, 'oz');

insertProduct.run(42, 'Deluxe Calzone', 'Deluxe Calzone (320)', 'Calzone', 2, 17.99, 6.80, 0);
insertProductComponent.run(42, 'item', 2, 12, 'oz');
insertProductComponent.run(42, 'item', 10, 5, 'oz');
insertProductComponent.run(42, 'item', 21, 2, 'oz');
insertProductComponent.run(42, 'item', 22, 2, 'oz');
insertProductComponent.run(42, 'item', 40, 1, 'oz');
insertProductComponent.run(42, 'item', 41, 1, 'oz');
insertProductComponent.run(42, 'item', 30, 2, 'oz');

// Pepperoni Pizza (various sizes)
insertProduct.run(50, 'Pepperoni Pizza Slice', 'Pepperoni Pizza (223)', 'Slice', 9, 4.99, 1.20, 0);
insertProductComponent.run(50, 'item', 1, 3, 'oz');
insertProductComponent.run(50, 'item', 10, 2, 'oz');
insertProductComponent.run(50, 'item', 30, 1, 'oz');
insertProductComponent.run(50, 'item', 21, 1, 'oz');

insertProduct.run(51, 'Pepperoni Pizza Medium', 'Pepperoni Pizza (223)', 'Medium 12 inch', 8, 16.99, 5.50, 0);
insertProductComponent.run(51, 'item', 1, 10, 'oz');
insertProductComponent.run(51, 'item', 10, 8, 'oz');
insertProductComponent.run(51, 'item', 30, 4, 'oz');
insertProductComponent.run(51, 'item', 21, 4, 'oz');

insertProduct.run(52, 'Pepperoni Pizza Large', 'Pepperoni Pizza (223)', 'Large 14 inch', 8, 19.99, 7.20, 0);
insertProductComponent.run(52, 'item', 1, 14, 'oz');
insertProductComponent.run(52, 'item', 10, 10, 'oz');
insertProductComponent.run(52, 'item', 30, 5, 'oz');
insertProductComponent.run(52, 'item', 21, 5, 'oz');

insertProduct.run(53, 'Pepperoni Pizza X-Large', 'Pepperoni Pizza (223)', 'X-Large 16 inch', 8, 23.99, 9.00, 0);
insertProductComponent.run(53, 'item', 1, 18, 'oz');
insertProductComponent.run(53, 'item', 10, 12, 'oz');
insertProductComponent.run(53, 'item', 30, 6, 'oz');
insertProductComponent.run(53, 'item', 21, 6, 'oz');

// ==========================================
// SEED PRODUCT MAPPINGS
// ==========================================

const insertMapping = db.prepare(`
  INSERT OR IGNORE INTO product_mappings (pos_item_name, pos_size, product_id)
  VALUES (?, ?, ?)
`);

// Egg Gondola mappings
insertMapping.run('Egg Gondola Pizza', 'One Egg', 1);
insertMapping.run('Egg Gondola Pizza', 'Two Egg', 2);

// Wing mappings
insertMapping.run('Cajun Chicken Wings (531)', '6 pc', 10);
insertMapping.run('Cajun Chicken Wings (531)', '8 pc', 11);
insertMapping.run('Cajun Chicken Wings (531)', '12 pc', 12);
insertMapping.run('Cajun Chicken Wings (531)', '16 pc', 13);
insertMapping.run('Cajun Chicken Wings (531)', '24 pc', 14);

insertMapping.run('Classic Buffalo Chicken Wings (525)', '6 pc', 15);
insertMapping.run('Classic Buffalo Chicken Wings (525)', '12 pc', 16);

insertMapping.run('Classic BBQ Chicken Wings (527)', '6 pc', 17);
insertMapping.run('Classic BBQ Chicken Wings (527)', '12 pc', 18);

insertMapping.run('Honey Garlic Chicken Wings (532)', '6 pc', 19);
insertMapping.run('Honey Garlic Chicken Wings (532)', '12 pc', 20);

// Appetizer mappings
insertMapping.run('Baked Meatballs Appetizer (104)', 'Regular', 21);

// Drink mappings
insertMapping.run('Coca-Cola (505)', '355ml Soda Can', 30);
insertMapping.run('Coca-Cola (505)', '2-Liter Soda Bottle', 31);

// Calzone mappings
insertMapping.run('CYO Calzone (304)', 'Calzone', 40);
insertMapping.run('Cheese Lover Calzone (322)', 'Calzone', 41);
insertMapping.run('Deluxe Calzone (320)', 'Calzone', 42);

// Pizza mappings
insertMapping.run('Pepperoni Pizza (223)', 'Slice', 50);
insertMapping.run('Pepperoni Pizza (223)', 'Medium 12 inch', 51);
insertMapping.run('Pepperoni Pizza (223)', 'Large 14 inch', 52);
insertMapping.run('Pepperoni Pizza (223)', 'X-Large 16 inch', 53);

// ==========================================
// SEED VENDORS
// ==========================================

const insertVendor = db.prepare(`
  INSERT OR IGNORE INTO vendors (id, name, code, contact_email, phone)
  VALUES (?, ?, ?, ?, ?)
`);

insertVendor.run(1, 'Gordon Food Service (GFS)', 'GFS', 'orders@gfs.com', '1-800-555-0101');
insertVendor.run(2, 'Sysco', 'SYSCO', 'orders@sysco.com', '1-800-555-0102');
insertVendor.run(3, 'Coca-Cola', 'COKE', 'orders@coca-cola.com', '1-800-555-0103');

console.log('Database seeded successfully!');

db.close();
