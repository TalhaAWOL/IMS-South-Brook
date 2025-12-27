import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Calculate product theoretical cost based on components
function calculateProductCost(productId) {
  const components = db.prepare(`
    SELECT pc.*,
      CASE
        WHEN pc.component_type = 'item' THEN i.default_cost_per_unit
        WHEN pc.component_type = 'prep' THEN p.cost_per_unit
      END as component_cost
    FROM product_components pc
    LEFT JOIN items i ON pc.component_type = 'item' AND pc.component_id = i.id
    LEFT JOIN preps p ON pc.component_type = 'prep' AND pc.component_id = p.id
    WHERE pc.product_id = ?
  `).all(productId);

  let totalCost = 0;
  components.forEach(comp => {
    totalCost += comp.quantity * (comp.component_cost || 0);
  });

  // Update the product's theoretical_cost
  db.prepare('UPDATE products SET theoretical_cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(totalCost, productId);

  return totalCost;
}

// Get all product categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM product_categories ORDER BY name').all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all products
router.get('/', (req, res) => {
  try {
    const { category_id, search } = req.query;

    let query = `
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.pos_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.name';

    const products = db.prepare(query).all(...params);

    // Calculate food cost percentage for each product
    products.forEach(product => {
      product.food_cost_percent = product.menu_price > 0
        ? ((product.theoretical_cost / product.menu_price) * 100).toFixed(1)
        : 0;
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product with full recipe
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare(`
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get components with full details
    product.components = db.prepare(`
      SELECT pc.*,
        CASE
          WHEN pc.component_type = 'item' THEN i.name
          WHEN pc.component_type = 'prep' THEN p.name
        END as component_name,
        CASE
          WHEN pc.component_type = 'item' THEN i.default_cost_per_unit
          WHEN pc.component_type = 'prep' THEN p.cost_per_unit
        END as component_cost,
        CASE
          WHEN pc.component_type = 'item' THEN i.unit_of_measure
          WHEN pc.component_type = 'prep' THEN p.yield_unit
        END as component_unit
      FROM product_components pc
      LEFT JOIN items i ON pc.component_type = 'item' AND pc.component_id = i.id
      LEFT JOIN preps p ON pc.component_type = 'prep' AND pc.component_id = p.id
      WHERE pc.product_id = ?
    `).all(product.id);

    // Calculate totals
    product.food_cost_percent = product.menu_price > 0
      ? ((product.theoretical_cost / product.menu_price) * 100).toFixed(1)
      : 0;

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
router.post('/', (req, res) => {
  try {
    const { name, pos_name, size, category_id, menu_price, is_customizable, components } = req.body;

    const result = db.prepare(`
      INSERT INTO products (name, pos_name, size, category_id, menu_price, is_customizable)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, pos_name, size, category_id, menu_price || 0, is_customizable ? 1 : 0);

    const productId = result.lastInsertRowid;

    // Add components
    if (components && components.length > 0) {
      const insertComp = db.prepare(`
        INSERT INTO product_components (product_id, component_type, component_id, quantity, unit)
        VALUES (?, ?, ?, ?, ?)
      `);

      components.forEach(comp => {
        insertComp.run(productId, comp.component_type, comp.component_id, comp.quantity, comp.unit);
      });

      // Calculate and update cost
      calculateProductCost(productId);
    }

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
router.put('/:id', (req, res) => {
  try {
    const { name, pos_name, size, category_id, menu_price, is_customizable, is_active, components } = req.body;
    const productId = req.params.id;

    db.prepare(`
      UPDATE products
      SET name = ?, pos_name = ?, size = ?, category_id = ?, menu_price = ?, is_customizable = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, pos_name, size, category_id, menu_price, is_customizable ? 1 : 0, is_active ? 1 : 0, productId);

    // Update components if provided
    if (components) {
      // Delete existing components
      db.prepare('DELETE FROM product_components WHERE product_id = ?').run(productId);

      // Insert new components
      const insertComp = db.prepare(`
        INSERT INTO product_components (product_id, component_type, component_id, quantity, unit)
        VALUES (?, ?, ?, ?, ?)
      `);

      components.forEach(comp => {
        insertComp.run(productId, comp.component_type, comp.component_id, comp.quantity, comp.unit);
      });

      // Recalculate cost
      calculateProductCost(productId);
    }

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product (soft delete)
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recalculate all product costs
router.post('/recalculate-costs', (req, res) => {
  try {
    const products = db.prepare('SELECT id FROM products WHERE is_active = 1').all();
    products.forEach(product => calculateProductCost(product.id));
    res.json({ message: 'Product costs recalculated', count: products.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create category
router.post('/categories', (req, res) => {
  try {
    const { name, description } = req.body;
    const result = db.prepare('INSERT INTO product_categories (name, description) VALUES (?, ?)').run(name, description);
    const newCategory = db.prepare('SELECT * FROM product_categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product usage breakdown (for cost analysis)
router.get('/:id/usage', (req, res) => {
  try {
    const productId = req.params.id;
    const { start_date, end_date, location_id } = req.query;

    let query = `
      SELECT
        SUM(s.quantity) as total_sold,
        SUM(s.total_value) as total_revenue
      FROM sales s
      WHERE s.product_id = ?
    `;
    const params = [productId];

    if (start_date) {
      query += ' AND s.sale_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND s.sale_date <= ?';
      params.push(end_date);
    }
    if (location_id) {
      query += ' AND s.location_id = ?';
      params.push(location_id);
    }

    const salesData = db.prepare(query).get(...params);

    const product = db.prepare('SELECT theoretical_cost FROM products WHERE id = ?').get(productId);

    const result = {
      total_sold: salesData?.total_sold || 0,
      total_revenue: salesData?.total_revenue || 0,
      theoretical_cost_total: (salesData?.total_sold || 0) * (product?.theoretical_cost || 0),
      theoretical_cost_per_unit: product?.theoretical_cost || 0
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
