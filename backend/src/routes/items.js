import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all item categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM item_categories ORDER BY name').all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all items
router.get('/', (req, res) => {
  try {
    const { category_id, search, location_id } = req.query;

    let query = `
      SELECT i.*, ic.name as category_name
      FROM items i
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE i.is_active = 1
    `;
    const params = [];

    if (category_id) {
      query += ' AND i.category_id = ?';
      params.push(category_id);
    }

    if (search) {
      query += ' AND (i.name LIKE ? OR i.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY i.name';

    const items = db.prepare(query).all(...params);

    // If location_id is provided, add inventory info
    if (location_id) {
      const inventoryQuery = db.prepare(`
        SELECT item_id, current_quantity, par_level, cost_per_unit
        FROM location_inventory
        WHERE location_id = ?
      `);
      const inventory = inventoryQuery.all(location_id);
      const invMap = new Map(inventory.map(inv => [inv.item_id, inv]));

      items.forEach(item => {
        const inv = invMap.get(item.id);
        item.current_quantity = inv?.current_quantity || 0;
        item.par_level = inv?.par_level || 0;
        item.location_cost_per_unit = inv?.cost_per_unit || item.default_cost_per_unit;
        item.is_low_stock = item.current_quantity < item.par_level;
      });
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single item
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare(`
      SELECT i.*, ic.name as category_name
      FROM items i
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create item
router.post('/', (req, res) => {
  try {
    const { name, category_id, unit_of_measure, default_cost_per_unit, vendor, sku } = req.body;

    const result = db.prepare(`
      INSERT INTO items (name, category_id, unit_of_measure, default_cost_per_unit, vendor, sku)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, category_id, unit_of_measure, default_cost_per_unit || 0, vendor, sku);

    const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update item
router.put('/:id', (req, res) => {
  try {
    const { name, category_id, unit_of_measure, default_cost_per_unit, vendor, sku, is_active } = req.body;

    db.prepare(`
      UPDATE items
      SET name = ?, category_id = ?, unit_of_measure = ?, default_cost_per_unit = ?, vendor = ?, sku = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, category_id, unit_of_measure, default_cost_per_unit, vendor, sku, is_active ? 1 : 0, req.params.id);

    const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete item (soft delete)
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE items SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    res.json({ message: 'Item deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get item inventory for a location
router.get('/:id/inventory/:locationId', (req, res) => {
  try {
    const inventory = db.prepare(`
      SELECT li.*, i.name as item_name, i.unit_of_measure
      FROM location_inventory li
      JOIN items i ON li.item_id = i.id
      WHERE li.item_id = ? AND li.location_id = ?
    `).get(req.params.id, req.params.locationId);

    if (!inventory) {
      // Return default values if no inventory record exists
      const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
      return res.json({
        item_id: parseInt(req.params.id),
        location_id: parseInt(req.params.locationId),
        current_quantity: 0,
        par_level: 0,
        cost_per_unit: item?.default_cost_per_unit || 0
      });
    }
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update item inventory for a location
router.put('/:id/inventory/:locationId', (req, res) => {
  try {
    const { current_quantity, par_level, cost_per_unit } = req.body;
    const itemId = req.params.id;
    const locationId = req.params.locationId;

    // Check if inventory record exists
    const existing = db.prepare('SELECT id FROM location_inventory WHERE item_id = ? AND location_id = ?').get(itemId, locationId);

    if (existing) {
      db.prepare(`
        UPDATE location_inventory
        SET current_quantity = ?, par_level = ?, cost_per_unit = ?, updated_at = CURRENT_TIMESTAMP
        WHERE item_id = ? AND location_id = ?
      `).run(current_quantity, par_level, cost_per_unit, itemId, locationId);
    } else {
      db.prepare(`
        INSERT INTO location_inventory (location_id, item_id, current_quantity, par_level, cost_per_unit)
        VALUES (?, ?, ?, ?, ?)
      `).run(locationId, itemId, current_quantity, par_level, cost_per_unit);
    }

    const updated = db.prepare('SELECT * FROM location_inventory WHERE item_id = ? AND location_id = ?').get(itemId, locationId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create category
router.post('/categories', (req, res) => {
  try {
    const { name, description } = req.body;
    const result = db.prepare('INSERT INTO item_categories (name, description) VALUES (?, ?)').run(name, description);
    const newCategory = db.prepare('SELECT * FROM item_categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
