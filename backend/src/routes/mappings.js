import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all product mappings
router.get('/', (req, res) => {
  try {
    const mappings = db.prepare(`
      SELECT pm.*, p.name as product_name, p.size as product_size, p.menu_price
      FROM product_mappings pm
      JOIN products p ON pm.product_id = p.id
      ORDER BY pm.pos_item_name, pm.pos_size
    `).all();
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find mapping by POS name and size
router.get('/find', (req, res) => {
  try {
    const { pos_item_name, pos_size } = req.query;

    const mapping = db.prepare(`
      SELECT pm.*, p.name as product_name, p.size as product_size, p.theoretical_cost
      FROM product_mappings pm
      JOIN products p ON pm.product_id = p.id
      WHERE pm.pos_item_name = ? AND (pm.pos_size = ? OR (pm.pos_size IS NULL AND ? IS NULL))
    `).get(pos_item_name, pos_size, pos_size);

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    res.json(mapping);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create mapping
router.post('/', (req, res) => {
  try {
    const { pos_item_name, pos_size, product_id } = req.body;

    // Check if mapping already exists
    const existing = db.prepare(`
      SELECT id FROM product_mappings
      WHERE pos_item_name = ? AND (pos_size = ? OR (pos_size IS NULL AND ? IS NULL))
    `).get(pos_item_name, pos_size, pos_size);

    if (existing) {
      // Update existing mapping
      db.prepare('UPDATE product_mappings SET product_id = ? WHERE id = ?').run(product_id, existing.id);
      const updated = db.prepare(`
        SELECT pm.*, p.name as product_name
        FROM product_mappings pm
        JOIN products p ON pm.product_id = p.id
        WHERE pm.id = ?
      `).get(existing.id);
      return res.json(updated);
    }

    const result = db.prepare(`
      INSERT INTO product_mappings (pos_item_name, pos_size, product_id)
      VALUES (?, ?, ?)
    `).run(pos_item_name, pos_size, product_id);

    const newMapping = db.prepare(`
      SELECT pm.*, p.name as product_name
      FROM product_mappings pm
      JOIN products p ON pm.product_id = p.id
      WHERE pm.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newMapping);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create multiple mappings at once
router.post('/bulk', (req, res) => {
  try {
    const { mappings } = req.body;
    const results = [];

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO product_mappings (pos_item_name, pos_size, product_id)
      VALUES (?, ?, ?)
    `);

    mappings.forEach(mapping => {
      const result = insertStmt.run(mapping.pos_item_name, mapping.pos_size, mapping.product_id);
      results.push({ ...mapping, id: result.lastInsertRowid });
    });

    res.status(201).json({ message: 'Mappings created', count: results.length, mappings: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update mapping
router.put('/:id', (req, res) => {
  try {
    const { pos_item_name, pos_size, product_id } = req.body;

    db.prepare(`
      UPDATE product_mappings
      SET pos_item_name = ?, pos_size = ?, product_id = ?
      WHERE id = ?
    `).run(pos_item_name, pos_size, product_id, req.params.id);

    const updated = db.prepare(`
      SELECT pm.*, p.name as product_name
      FROM product_mappings pm
      JOIN products p ON pm.product_id = p.id
      WHERE pm.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete mapping
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM product_mappings WHERE id = ?').run(req.params.id);
    res.json({ message: 'Mapping deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unmapped products from sales
router.get('/unmapped', (req, res) => {
  try {
    const { location_id } = req.query;

    let query = `
      SELECT DISTINCT s.pos_item_name, s.pos_size, COUNT(*) as occurrence_count
      FROM sales s
      WHERE s.is_mapped = 0
    `;
    const params = [];

    if (location_id) {
      query += ' AND s.location_id = ?';
      params.push(location_id);
    }

    query += ' GROUP BY s.pos_item_name, s.pos_size ORDER BY occurrence_count DESC';

    const unmapped = db.prepare(query).all(...params);
    res.json(unmapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
