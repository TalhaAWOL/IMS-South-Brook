import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all invoices
router.get('/', (req, res) => {
  try {
    const { location_id, vendor_id, status, start_date, end_date } = req.query;

    let query = `
      SELECT i.*, v.name as vendor_name, l.name as location_name,
        (SELECT COUNT(*) FROM invoice_lines WHERE invoice_id = i.id) as line_count
      FROM invoices i
      JOIN vendors v ON i.vendor_id = v.id
      JOIN locations l ON i.location_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (location_id) {
      query += ' AND i.location_id = ?';
      params.push(location_id);
    }
    if (vendor_id) {
      query += ' AND i.vendor_id = ?';
      params.push(vendor_id);
    }
    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }
    if (start_date) {
      query += ' AND i.invoice_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND i.invoice_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY i.invoice_date DESC';

    const invoices = db.prepare(query).all(...params);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single invoice with lines
router.get('/:id', (req, res) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, v.name as vendor_name, l.name as location_name
      FROM invoices i
      JOIN vendors v ON i.vendor_id = v.id
      JOIN locations l ON i.location_id = l.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    invoice.lines = db.prepare(`
      SELECT il.*, i.name as item_name, i.unit_of_measure, i.default_cost_per_unit as previous_cost
      FROM invoice_lines il
      JOIN items i ON il.item_id = i.id
      WHERE il.invoice_id = ?
    `).all(invoice.id);

    // Check for price increases
    invoice.lines.forEach(line => {
      if (line.previous_cost > 0) {
        const priceChange = ((line.unit_price - line.previous_cost) / line.previous_cost) * 100;
        line.price_change_percent = priceChange.toFixed(1);
        line.has_price_increase = priceChange > 5;
      }
    });

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice
router.post('/', (req, res) => {
  try {
    const { location_id, vendor_id, invoice_number, invoice_date, notes, lines } = req.body;

    // Calculate total
    let total_amount = 0;
    if (lines) {
      total_amount = lines.reduce((sum, line) => sum + (line.extended_price || line.quantity * line.unit_price), 0);
    }

    const result = db.prepare(`
      INSERT INTO invoices (location_id, vendor_id, invoice_number, invoice_date, total_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(location_id, vendor_id, invoice_number, invoice_date, total_amount, notes);

    const invoiceId = result.lastInsertRowid;

    // Add invoice lines
    if (lines && lines.length > 0) {
      const insertLine = db.prepare(`
        INSERT INTO invoice_lines (invoice_id, item_id, quantity, unit_price, extended_price)
        VALUES (?, ?, ?, ?, ?)
      `);

      lines.forEach(line => {
        const extended = line.extended_price || line.quantity * line.unit_price;
        insertLine.run(invoiceId, line.item_id, line.quantity, line.unit_price, extended);
      });
    }

    const newInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    res.status(201).json(newInvoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update invoice
router.put('/:id', (req, res) => {
  try {
    const { vendor_id, invoice_number, invoice_date, notes, status, lines } = req.body;
    const invoiceId = req.params.id;

    // Calculate total
    let total_amount = 0;
    if (lines) {
      total_amount = lines.reduce((sum, line) => sum + (line.extended_price || line.quantity * line.unit_price), 0);
    }

    db.prepare(`
      UPDATE invoices
      SET vendor_id = ?, invoice_number = ?, invoice_date = ?, total_amount = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(vendor_id, invoice_number, invoice_date, total_amount, notes, status, invoiceId);

    // Update lines if provided
    if (lines) {
      // Delete existing lines
      db.prepare('DELETE FROM invoice_lines WHERE invoice_id = ?').run(invoiceId);

      // Insert new lines
      const insertLine = db.prepare(`
        INSERT INTO invoice_lines (invoice_id, item_id, quantity, unit_price, extended_price)
        VALUES (?, ?, ?, ?, ?)
      `);

      lines.forEach(line => {
        const extended = line.extended_price || line.quantity * line.unit_price;
        insertLine.run(invoiceId, line.item_id, line.quantity, line.unit_price, extended);
      });
    }

    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Receive invoice (mark as received and add to inventory)
router.post('/:id/receive', (req, res) => {
  try {
    const invoiceId = req.params.id;

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'received') {
      return res.status(400).json({ error: 'Invoice already received' });
    }

    const lines = db.prepare('SELECT * FROM invoice_lines WHERE invoice_id = ?').all(invoiceId);

    // Add items to inventory
    const updateInventory = db.prepare(`
      INSERT INTO location_inventory (location_id, item_id, current_quantity, cost_per_unit)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(location_id, item_id) DO UPDATE SET
        current_quantity = current_quantity + excluded.current_quantity,
        cost_per_unit = excluded.cost_per_unit,
        updated_at = CURRENT_TIMESTAMP
    `);

    const insertTransaction = db.prepare(`
      INSERT INTO inventory_transactions (location_id, item_id, transaction_type, quantity, cost_per_unit, total_cost, reference_type, reference_id)
      VALUES (?, ?, 'received', ?, ?, ?, 'invoice', ?)
    `);

    lines.forEach(line => {
      // Update inventory
      updateInventory.run(invoice.location_id, line.item_id, line.quantity, line.unit_price);

      // Record transaction
      insertTransaction.run(invoice.location_id, line.item_id, line.quantity, line.unit_price, line.extended_price, invoiceId);

      // Update item's default cost if price changed significantly
      const item = db.prepare('SELECT default_cost_per_unit FROM items WHERE id = ?').get(line.item_id);
      if (item) {
        const priceChange = Math.abs((line.unit_price - item.default_cost_per_unit) / item.default_cost_per_unit);
        if (priceChange > 0.05) {
          db.prepare('UPDATE items SET default_cost_per_unit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(line.unit_price, line.item_id);
        }
      }
    });

    // Mark invoice as received
    db.prepare("UPDATE invoices SET status = 'received', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(invoiceId);

    const updated = db.prepare(`
      SELECT i.*, v.name as vendor_name, l.name as location_name
      FROM invoices i
      JOIN vendors v ON i.vendor_id = v.id
      JOIN locations l ON i.location_id = l.id
      WHERE i.id = ?
    `).get(invoiceId);

    res.json({ message: 'Invoice received and inventory updated', invoice: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete invoice
router.delete('/:id', (req, res) => {
  try {
    const invoice = db.prepare('SELECT status FROM invoices WHERE id = ?').get(req.params.id);
    if (invoice && invoice.status === 'received') {
      return res.status(400).json({ error: 'Cannot delete a received invoice' });
    }

    db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
