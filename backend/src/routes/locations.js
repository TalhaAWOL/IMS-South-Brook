import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all organizations
router.get('/organizations', (req, res) => {
  try {
    const orgs = db.prepare('SELECT * FROM organizations ORDER BY name').all();
    res.json(orgs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all locations
router.get('/', (req, res) => {
  try {
    const locations = db.prepare(`
      SELECT l.*, o.name as organization_name
      FROM locations l
      LEFT JOIN organizations o ON l.organization_id = o.id
      WHERE l.is_active = 1
      ORDER BY l.name
    `).all();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single location
router.get('/:id', (req, res) => {
  try {
    const location = db.prepare(`
      SELECT l.*, o.name as organization_name
      FROM locations l
      LEFT JOIN organizations o ON l.organization_id = o.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create location
router.post('/', (req, res) => {
  try {
    const { organization_id, name, code, address, city, state, postal_code, phone, manager_name } = req.body;

    const result = db.prepare(`
      INSERT INTO locations (organization_id, name, code, address, city, state, postal_code, phone, manager_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(organization_id, name, code, address, city, state, postal_code, phone, manager_name);

    const newLocation = db.prepare('SELECT * FROM locations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newLocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update location
router.put('/:id', (req, res) => {
  try {
    const { name, code, address, city, state, postal_code, phone, manager_name, is_active } = req.body;

    db.prepare(`
      UPDATE locations
      SET name = ?, code = ?, address = ?, city = ?, state = ?, postal_code = ?, phone = ?, manager_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, code, address, city, state, postal_code, phone, manager_name, is_active ? 1 : 0, req.params.id);

    const updated = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete location (soft delete)
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE locations SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    res.json({ message: 'Location deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get location inventory summary
router.get('/:id/inventory-summary', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_items,
        SUM(li.current_quantity * li.cost_per_unit) as total_value,
        SUM(CASE WHEN li.current_quantity < li.par_level THEN 1 ELSE 0 END) as low_stock_count
      FROM location_inventory li
      WHERE li.location_id = ?
    `).get(req.params.id);

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
