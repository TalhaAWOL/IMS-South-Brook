import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all vendors
router.get('/', (req, res) => {
  try {
    const vendors = db.prepare(`
      SELECT v.*,
        (SELECT COUNT(*) FROM invoices WHERE vendor_id = v.id) as invoice_count,
        (SELECT SUM(total_amount) FROM invoices WHERE vendor_id = v.id) as total_spend
      FROM vendors v
      WHERE v.is_active = 1
      ORDER BY v.name
    `).all();
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single vendor
router.get('/:id', (req, res) => {
  try {
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Get recent invoices
    vendor.recent_invoices = db.prepare(`
      SELECT i.*, l.name as location_name
      FROM invoices i
      JOIN locations l ON i.location_id = l.id
      WHERE i.vendor_id = ?
      ORDER BY i.invoice_date DESC
      LIMIT 10
    `).all(vendor.id);

    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create vendor
router.post('/', (req, res) => {
  try {
    const { name, code, contact_email, phone, address, account_number } = req.body;

    const result = db.prepare(`
      INSERT INTO vendors (name, code, contact_email, phone, address, account_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, code, contact_email, phone, address, account_number);

    const newVendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newVendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update vendor
router.put('/:id', (req, res) => {
  try {
    const { name, code, contact_email, phone, address, account_number, is_active } = req.body;

    db.prepare(`
      UPDATE vendors
      SET name = ?, code = ?, contact_email = ?, phone = ?, address = ?, account_number = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, code, contact_email, phone, address, account_number, is_active ? 1 : 0, req.params.id);

    const updated = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete vendor (soft delete)
router.delete('/:id', (req, res) => {
  try {
    db.prepare('UPDATE vendors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    res.json({ message: 'Vendor deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor spending by location
router.get('/:id/spending', (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT l.id as location_id, l.name as location_name,
        COUNT(i.id) as invoice_count,
        SUM(i.total_amount) as total_amount
      FROM invoices i
      JOIN locations l ON i.location_id = l.id
      WHERE i.vendor_id = ?
    `;
    const params = [req.params.id];

    if (start_date) {
      query += ' AND i.invoice_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND i.invoice_date <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY l.id ORDER BY total_amount DESC';

    const spending = db.prepare(query).all(...params);
    res.json(spending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
