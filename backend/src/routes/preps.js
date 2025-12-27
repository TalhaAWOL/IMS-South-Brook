import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Calculate prep cost based on items
function calculatePrepCost(prepId) {
  const items = db.prepare(`
    SELECT pi.quantity, pi.unit, i.default_cost_per_unit, i.unit_of_measure
    FROM prep_items pi
    JOIN items i ON pi.item_id = i.id
    WHERE pi.prep_id = ?
  `).all(prepId);

  let totalCost = 0;
  items.forEach(item => {
    totalCost += item.quantity * item.default_cost_per_unit;
  });

  const prep = db.prepare('SELECT yield_quantity FROM preps WHERE id = ?').get(prepId);
  const costPerUnit = prep.yield_quantity > 0 ? totalCost / prep.yield_quantity : 0;

  // Update the prep's cost_per_unit
  db.prepare('UPDATE preps SET cost_per_unit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(costPerUnit, prepId);

  return costPerUnit;
}

// Get all preps
router.get('/', (req, res) => {
  try {
    const preps = db.prepare(`
      SELECT * FROM preps
      WHERE is_active = 1
      ORDER BY name
    `).all();

    // Get items for each prep
    const prepItemsQuery = db.prepare(`
      SELECT pi.*, i.name as item_name, i.unit_of_measure as item_unit, i.default_cost_per_unit
      FROM prep_items pi
      JOIN items i ON pi.item_id = i.id
      WHERE pi.prep_id = ?
    `);

    preps.forEach(prep => {
      prep.items = prepItemsQuery.all(prep.id);
    });

    res.json(preps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single prep
router.get('/:id', (req, res) => {
  try {
    const prep = db.prepare('SELECT * FROM preps WHERE id = ?').get(req.params.id);

    if (!prep) {
      return res.status(404).json({ error: 'Prep not found' });
    }

    prep.items = db.prepare(`
      SELECT pi.*, i.name as item_name, i.unit_of_measure as item_unit, i.default_cost_per_unit
      FROM prep_items pi
      JOIN items i ON pi.item_id = i.id
      WHERE pi.prep_id = ?
    `).all(prep.id);

    res.json(prep);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create prep
router.post('/', (req, res) => {
  try {
    const { name, yield_quantity, yield_unit, instructions, items } = req.body;

    const result = db.prepare(`
      INSERT INTO preps (name, yield_quantity, yield_unit, instructions)
      VALUES (?, ?, ?, ?)
    `).run(name, yield_quantity, yield_unit, instructions);

    const prepId = result.lastInsertRowid;

    // Add prep items
    if (items && items.length > 0) {
      const insertItem = db.prepare(`
        INSERT INTO prep_items (prep_id, item_id, quantity, unit)
        VALUES (?, ?, ?, ?)
      `);

      items.forEach(item => {
        insertItem.run(prepId, item.item_id, item.quantity, item.unit);
      });

      // Calculate and update cost
      calculatePrepCost(prepId);
    }

    const newPrep = db.prepare('SELECT * FROM preps WHERE id = ?').get(prepId);
    newPrep.items = db.prepare('SELECT * FROM prep_items WHERE prep_id = ?').all(prepId);

    res.status(201).json(newPrep);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update prep
router.put('/:id', (req, res) => {
  try {
    const { name, yield_quantity, yield_unit, instructions, items, is_active } = req.body;
    const prepId = req.params.id;

    db.prepare(`
      UPDATE preps
      SET name = ?, yield_quantity = ?, yield_unit = ?, instructions = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, yield_quantity, yield_unit, instructions, is_active ? 1 : 0, prepId);

    // Update prep items if provided
    if (items) {
      // Delete existing items
      db.prepare('DELETE FROM prep_items WHERE prep_id = ?').run(prepId);

      // Insert new items
      const insertItem = db.prepare(`
        INSERT INTO prep_items (prep_id, item_id, quantity, unit)
        VALUES (?, ?, ?, ?)
      `);

      items.forEach(item => {
        insertItem.run(prepId, item.item_id, item.quantity, item.unit);
      });

      // Recalculate cost
      calculatePrepCost(prepId);
    }

    const updated = db.prepare('SELECT * FROM preps WHERE id = ?').get(prepId);
    updated.items = db.prepare(`
      SELECT pi.*, i.name as item_name
      FROM prep_items pi
      JOIN items i ON pi.item_id = i.id
      WHERE pi.prep_id = ?
    `).all(prepId);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete prep (soft delete)
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE preps SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    res.json({ message: 'Prep deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recalculate all prep costs
router.post('/recalculate-costs', (req, res) => {
  try {
    const preps = db.prepare('SELECT id FROM preps WHERE is_active = 1').all();
    preps.forEach(prep => calculatePrepCost(prep.id));
    res.json({ message: 'Prep costs recalculated', count: preps.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
