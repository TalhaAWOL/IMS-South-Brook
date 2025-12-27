import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get inventory for a location
router.get('/location/:locationId', (req, res) => {
  try {
    const { category_id, low_stock_only, search } = req.query;

    let query = `
      SELECT
        li.*,
        i.name as item_name,
        i.unit_of_measure,
        ic.name as category_name,
        i.vendor,
        i.sku,
        (li.current_quantity * li.cost_per_unit) as total_value,
        CASE WHEN li.current_quantity < li.par_level THEN 1 ELSE 0 END as is_low_stock
      FROM location_inventory li
      JOIN items i ON li.item_id = i.id
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE li.location_id = ? AND i.is_active = 1
    `;
    const params = [req.params.locationId];

    if (category_id) {
      query += ' AND i.category_id = ?';
      params.push(category_id);
    }

    if (low_stock_only === 'true') {
      query += ' AND li.current_quantity < li.par_level';
    }

    if (search) {
      query += ' AND (i.name LIKE ? OR i.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY i.name';

    const inventory = db.prepare(query).all(...params);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get inventory summary for a location
router.get('/location/:locationId/summary', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_items,
        SUM(li.current_quantity * li.cost_per_unit) as total_value,
        SUM(CASE WHEN li.current_quantity < li.par_level THEN 1 ELSE 0 END) as low_stock_count,
        (SELECT COUNT(*) FROM items WHERE is_active = 1) as items_available
      FROM location_inventory li
      JOIN items i ON li.item_id = i.id
      WHERE li.location_id = ? AND i.is_active = 1
    `).get(req.params.locationId);

    // Get value by category
    summary.by_category = db.prepare(`
      SELECT
        ic.name as category_name,
        COUNT(*) as item_count,
        SUM(li.current_quantity * li.cost_per_unit) as total_value
      FROM location_inventory li
      JOIN items i ON li.item_id = i.id
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE li.location_id = ?
      GROUP BY ic.id
      ORDER BY total_value DESC
    `).all(req.params.locationId);

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adjust inventory manually
router.post('/location/:locationId/adjust', (req, res) => {
  try {
    const { item_id, adjustment, notes } = req.body;
    const locationId = req.params.locationId;

    // Get current inventory
    const current = db.prepare(`
      SELECT li.*, i.name as item_name
      FROM location_inventory li
      JOIN items i ON li.item_id = i.id
      WHERE li.location_id = ? AND li.item_id = ?
    `).get(locationId, item_id);

    if (!current) {
      return res.status(404).json({ error: 'Inventory record not found' });
    }

    const newQuantity = current.current_quantity + adjustment;

    // Update inventory
    db.prepare(`
      UPDATE location_inventory
      SET current_quantity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE location_id = ? AND item_id = ?
    `).run(newQuantity, locationId, item_id);

    // Record transaction
    db.prepare(`
      INSERT INTO inventory_transactions (location_id, item_id, transaction_type, quantity, cost_per_unit, total_cost, reference_type, notes)
      VALUES (?, ?, 'adjustment', ?, ?, ?, 'manual', ?)
    `).run(locationId, item_id, adjustment, current.cost_per_unit, adjustment * current.cost_per_unit, notes);

    res.json({
      message: 'Inventory adjusted',
      item_name: current.item_name,
      previous_quantity: current.current_quantity,
      adjustment,
      new_quantity: newQuantity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all inventory counts for a location
router.get('/counts/:locationId', (req, res) => {
  try {
    const counts = db.prepare(`
      SELECT ic.*,
        (SELECT COUNT(*) FROM inventory_count_lines WHERE count_id = ic.id) as line_count,
        (SELECT SUM(ABS(variance_cost)) FROM inventory_count_lines WHERE count_id = ic.id) as total_variance
      FROM inventory_counts ic
      WHERE ic.location_id = ?
      ORDER BY ic.count_date DESC
    `).all(req.params.locationId);
    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single inventory count
router.get('/counts/:locationId/:countId', (req, res) => {
  try {
    const count = db.prepare('SELECT * FROM inventory_counts WHERE id = ? AND location_id = ?')
      .get(req.params.countId, req.params.locationId);

    if (!count) {
      return res.status(404).json({ error: 'Count not found' });
    }

    count.lines = db.prepare(`
      SELECT icl.*, i.name as item_name, i.unit_of_measure, ic.name as category_name
      FROM inventory_count_lines icl
      JOIN items i ON icl.item_id = i.id
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE icl.count_id = ?
      ORDER BY i.name
    `).all(count.id);

    res.json(count);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start new inventory count
router.post('/counts/:locationId', (req, res) => {
  try {
    const { count_date, count_type, notes } = req.body;
    const locationId = req.params.locationId;

    // Create count record
    const result = db.prepare(`
      INSERT INTO inventory_counts (location_id, count_date, count_type, notes)
      VALUES (?, ?, ?, ?)
    `).run(locationId, count_date, count_type || 'full', notes);

    const countId = result.lastInsertRowid;

    // Create count lines for all items in inventory
    const inventory = db.prepare(`
      SELECT li.item_id, li.current_quantity, li.cost_per_unit
      FROM location_inventory li
      JOIN items i ON li.item_id = i.id
      WHERE li.location_id = ? AND i.is_active = 1
    `).all(locationId);

    const insertLine = db.prepare(`
      INSERT INTO inventory_count_lines (count_id, item_id, system_quantity)
      VALUES (?, ?, ?)
    `);

    inventory.forEach(inv => {
      insertLine.run(countId, inv.item_id, inv.current_quantity);
    });

    const newCount = db.prepare('SELECT * FROM inventory_counts WHERE id = ?').get(countId);
    newCount.lines_created = inventory.length;

    res.status(201).json(newCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update count line (enter counted quantity)
router.put('/counts/:locationId/:countId/lines/:lineId', (req, res) => {
  try {
    const { counted_quantity, notes } = req.body;
    const lineId = req.params.lineId;

    // Get current line
    const line = db.prepare('SELECT * FROM inventory_count_lines WHERE id = ?').get(lineId);
    if (!line) {
      return res.status(404).json({ error: 'Count line not found' });
    }

    // Get item cost
    const inventory = db.prepare('SELECT cost_per_unit FROM location_inventory WHERE location_id = ? AND item_id = ?')
      .get(req.params.locationId, line.item_id);

    const variance = counted_quantity - line.system_quantity;
    const varianceCost = variance * (inventory?.cost_per_unit || 0);

    db.prepare(`
      UPDATE inventory_count_lines
      SET counted_quantity = ?, variance = ?, variance_cost = ?, notes = ?
      WHERE id = ?
    `).run(counted_quantity, variance, varianceCost, notes, lineId);

    const updated = db.prepare(`
      SELECT icl.*, i.name as item_name
      FROM inventory_count_lines icl
      JOIN items i ON icl.item_id = i.id
      WHERE icl.id = ?
    `).get(lineId);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finalize inventory count
router.post('/counts/:locationId/:countId/finalize', (req, res) => {
  try {
    const { countId, locationId } = req.params;

    const count = db.prepare('SELECT * FROM inventory_counts WHERE id = ? AND location_id = ?')
      .get(countId, locationId);

    if (!count) {
      return res.status(404).json({ error: 'Count not found' });
    }

    if (count.status === 'completed') {
      return res.status(400).json({ error: 'Count already finalized' });
    }

    // Get all lines with counted quantities
    const lines = db.prepare(`
      SELECT icl.*, li.cost_per_unit
      FROM inventory_count_lines icl
      JOIN location_inventory li ON li.item_id = icl.item_id AND li.location_id = ?
      WHERE icl.count_id = ? AND icl.counted_quantity IS NOT NULL
    `).all(locationId, countId);

    // Update inventory to match counted quantities
    const updateInventory = db.prepare(`
      UPDATE location_inventory
      SET current_quantity = ?, last_count_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE location_id = ? AND item_id = ?
    `);

    const insertTransaction = db.prepare(`
      INSERT INTO inventory_transactions (location_id, item_id, transaction_type, quantity, cost_per_unit, total_cost, reference_type, reference_id, notes)
      VALUES (?, ?, 'adjustment', ?, ?, ?, 'count', ?, ?)
    `);

    let totalVariance = 0;
    let adjustmentsMade = 0;

    lines.forEach(line => {
      if (line.variance !== 0) {
        updateInventory.run(line.counted_quantity, count.count_date, locationId, line.item_id);
        insertTransaction.run(
          locationId,
          line.item_id,
          line.variance,
          line.cost_per_unit,
          line.variance_cost,
          countId,
          `Inventory count adjustment`
        );
        totalVariance += Math.abs(line.variance_cost);
        adjustmentsMade++;
      }
    });

    // Mark count as completed
    db.prepare(`
      UPDATE inventory_counts
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(countId);

    res.json({
      message: 'Inventory count finalized',
      adjustments_made: adjustmentsMade,
      total_variance_value: totalVariance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get inventory transaction history
router.get('/transactions/:locationId', (req, res) => {
  try {
    const { item_id, type, start_date, end_date, limit = 100 } = req.query;

    let query = `
      SELECT it.*, i.name as item_name, i.unit_of_measure
      FROM inventory_transactions it
      JOIN items i ON it.item_id = i.id
      WHERE it.location_id = ?
    `;
    const params = [req.params.locationId];

    if (item_id) {
      query += ' AND it.item_id = ?';
      params.push(item_id);
    }
    if (type) {
      query += ' AND it.transaction_type = ?';
      params.push(type);
    }
    if (start_date) {
      query += ' AND it.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND it.created_at <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY it.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const transactions = db.prepare(query).all(...params);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
