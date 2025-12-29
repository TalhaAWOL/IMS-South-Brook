import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import db from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xls' || ext === '.xlsx') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Parse Milton Itemized Sales report format
function parseMiltonSalesReport(filePath) {
  // Read file as buffer for better ES module compatibility
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (data.length < 5) {
    throw new Error('File appears to be empty or has wrong format');
  }

  // Row 0 contains date headers starting at column 6 (index 6)
  // Format: "Sep 1, Mon 2025", etc.
  const dateRow = data[0];
  const dates = [];

  // Find date columns (every 3 columns starting from column 6)
  for (let col = 6; col < dateRow.length; col += 3) {
    const dateStr = dateRow[col];
    if (dateStr && typeof dateStr === 'string' && dateStr.includes(',')) {
      // Parse date like "Sep 1, Mon 2025"
      const parsed = parseDateString(dateStr);
      if (parsed) {
        dates.push({ column: col, date: parsed });
      }
    }
  }

  // Find the last date column before totals
  // The last few columns are typically monthly totals

  const salesData = [];
  let currentCategory = '';

  // Data starts at row 4 (index 4)
  for (let row = 4; row < data.length; row++) {
    const rowData = data[row];

    // Column A (index 0) is category
    if (rowData[0] && typeof rowData[0] === 'string' && rowData[0].trim()) {
      currentCategory = rowData[0].trim();
    }

    // Column D (index 3) is item name
    const itemName = rowData[3];
    if (!itemName || typeof itemName !== 'string') continue;

    // Skip total rows
    if (itemName.toLowerCase().includes('total')) continue;

    // Column F (index 5) is size
    const size = rowData[5] ? String(rowData[5]).trim() : '';

    // Get quantities for each date
    dates.forEach(({ column, date }) => {
      const quantity = parseInt(rowData[column]) || 0;
      const value = parseFloat(rowData[column + 1]) || 0;

      if (quantity > 0) {
        salesData.push({
          category: currentCategory,
          pos_item_name: itemName.trim(),
          pos_size: size,
          sale_date: date,
          quantity,
          total_value: value
        });
      }
    });
  }

  return {
    dates: dates.map(d => d.date),
    sales: salesData,
    dateRangeStart: dates.length > 0 ? dates[0].date : null,
    dateRangeEnd: dates.length > 0 ? dates[dates.length - 1].date : null
  };
}

// Parse date string like "Sep 1, Mon 2025"
function parseDateString(dateStr) {
  try {
    // Clean up the string
    const cleaned = dateStr.replace(/\s+/g, ' ').trim();

    // Try to parse with Date
    const parts = cleaned.split(',');
    if (parts.length >= 2) {
      // Format: "Sep 1, Mon 2025" or "Sep 1, 2025"
      const monthDay = parts[0].trim(); // "Sep 1"
      let year = '';

      // Find the year (4 digit number)
      for (const part of parts) {
        const match = part.match(/\d{4}/);
        if (match) {
          year = match[0];
          break;
        }
      }

      if (year) {
        const dateToparse = `${monthDay} ${year}`;
        const parsed = new Date(dateToparse);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0]; // Return YYYY-MM-DD
        }
      }
    }

    // Fallback: try direct parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  } catch (e) {
    return null;
  }
}

// Get all sales imports
router.get('/imports', (req, res) => {
  try {
    const { location_id } = req.query;

    let query = `
      SELECT si.*, l.name as location_name
      FROM sales_imports si
      JOIN locations l ON si.location_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (location_id) {
      query += ' AND si.location_id = ?';
      params.push(location_id);
    }

    query += ' ORDER BY si.import_date DESC';

    const imports = db.prepare(query).all(...params);
    res.json(imports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single import with sales
router.get('/imports/:id', (req, res) => {
  try {
    const importRecord = db.prepare(`
      SELECT si.*, l.name as location_name
      FROM sales_imports si
      JOIN locations l ON si.location_id = l.id
      WHERE si.id = ?
    `).get(req.params.id);

    if (!importRecord) {
      return res.status(404).json({ error: 'Import not found' });
    }

    importRecord.sales = db.prepare(`
      SELECT s.*, p.name as product_name
      FROM sales s
      LEFT JOIN products p ON s.product_id = p.id
      WHERE s.import_id = ?
      ORDER BY s.sale_date, s.pos_item_name
    `).all(importRecord.id);

    res.json(importRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Preview uploaded file (parse but don't import)
router.post('/preview', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const parsed = parseMiltonSalesReport(req.file.path);

    // Group by product for summary
    const productSummary = {};
    parsed.sales.forEach(sale => {
      const key = `${sale.pos_item_name}|${sale.pos_size}`;
      if (!productSummary[key]) {
        productSummary[key] = {
          category: sale.category,
          pos_item_name: sale.pos_item_name,
          pos_size: sale.pos_size,
          total_quantity: 0,
          total_value: 0
        };
      }
      productSummary[key].total_quantity += sale.quantity;
      productSummary[key].total_value += sale.total_value;
    });

    // Check which products are mapped
    const products = Object.values(productSummary);
    const mappingCheck = db.prepare(`
      SELECT pm.*, p.name as product_name, p.theoretical_cost
      FROM product_mappings pm
      JOIN products p ON pm.product_id = p.id
      WHERE pm.pos_item_name = ? AND (pm.pos_size = ? OR (pm.pos_size IS NULL AND ? = ''))
    `);

    products.forEach(product => {
      const mapping = mappingCheck.get(product.pos_item_name, product.pos_size, product.pos_size);
      product.is_mapped = !!mapping;
      if (mapping) {
        product.mapped_product_name = mapping.product_name;
        product.mapped_product_id = mapping.product_id;
        product.theoretical_cost = mapping.theoretical_cost;
      }
    });

    const mapped = products.filter(p => p.is_mapped);
    const unmapped = products.filter(p => !p.is_mapped);

    res.json({
      filename: req.file.originalname,
      filepath: req.file.path,
      dateRange: {
        start: parsed.dateRangeStart,
        end: parsed.dateRangeEnd
      },
      totalDates: parsed.dates.length,
      totalSalesRecords: parsed.sales.length,
      totalValue: parsed.sales.reduce((sum, s) => sum + s.total_value, 0),
      totalQuantity: parsed.sales.reduce((sum, s) => sum + s.quantity, 0),
      productCount: products.length,
      mappedCount: mapped.length,
      unmappedCount: unmapped.length,
      products: products.sort((a, b) => b.total_quantity - a.total_quantity),
      unmappedProducts: unmapped
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import sales from uploaded file
router.post('/import', upload.single('file'), (req, res) => {
  try {
    const { location_id, deduct_inventory } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!location_id) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    const parsed = parseMiltonSalesReport(req.file.path);

    // Create import record
    const importResult = db.prepare(`
      INSERT INTO sales_imports (location_id, filename, date_range_start, date_range_end, total_products_sold, total_sales_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      location_id,
      req.file.originalname,
      parsed.dateRangeStart,
      parsed.dateRangeEnd,
      parsed.sales.reduce((sum, s) => sum + s.quantity, 0),
      parsed.sales.reduce((sum, s) => sum + s.total_value, 0)
    );

    const importId = importResult.lastInsertRowid;

    // Get all mappings
    const mappings = db.prepare('SELECT * FROM product_mappings').all();
    const mappingMap = new Map();
    mappings.forEach(m => {
      const key = `${m.pos_item_name}|${m.pos_size || ''}`;
      mappingMap.set(key, m);
    });

    // Insert sales records
    const insertSale = db.prepare(`
      INSERT INTO sales (import_id, location_id, sale_date, product_id, pos_item_name, pos_size, quantity, unit_price, total_value, is_mapped)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let mappedCount = 0;
    let unmappedCount = 0;

    parsed.sales.forEach(sale => {
      const key = `${sale.pos_item_name}|${sale.pos_size}`;
      const mapping = mappingMap.get(key);

      const productId = mapping ? mapping.product_id : null;
      const isMapped = mapping ? 1 : 0;
      const unitPrice = sale.quantity > 0 ? sale.total_value / sale.quantity : 0;

      insertSale.run(
        importId,
        location_id,
        sale.sale_date,
        productId,
        sale.pos_item_name,
        sale.pos_size,
        sale.quantity,
        unitPrice,
        sale.total_value,
        isMapped
      );

      if (isMapped) mappedCount++;
      else unmappedCount++;
    });

    // Deduct inventory based on theoretical usage if requested
    let inventoryDeductions = [];
    if (deduct_inventory === 'true' || deduct_inventory === true) {
      inventoryDeductions = deductInventoryFromSales(importId, location_id);
    }

    res.status(201).json({
      message: 'Sales imported successfully',
      import_id: importId,
      total_records: parsed.sales.length,
      mapped_count: mappedCount,
      unmapped_count: unmappedCount,
      inventory_deductions: inventoryDeductions.length,
      date_range: {
        start: parsed.dateRangeStart,
        end: parsed.dateRangeEnd
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deduct inventory based on sales (theoretical usage)
function deductInventoryFromSales(importId, locationId) {
  const sales = db.prepare(`
    SELECT s.*, p.id as product_id
    FROM sales s
    JOIN products p ON s.product_id = p.id
    WHERE s.import_id = ? AND s.is_mapped = 1
  `).all(importId);

  const deductions = [];

  // Get all product components
  const getComponents = db.prepare(`
    SELECT pc.*,
      CASE
        WHEN pc.component_type = 'item' THEN pc.component_id
        ELSE NULL
      END as direct_item_id
    FROM product_components pc
    WHERE pc.product_id = ?
  `);

  // Get prep items
  const getPrepItems = db.prepare(`
    SELECT pi.item_id, pi.quantity, p.yield_quantity
    FROM prep_items pi
    JOIN preps p ON pi.prep_id = p.id
    WHERE pi.prep_id = ?
  `);

  // Update inventory
  const updateInventory = db.prepare(`
    UPDATE location_inventory
    SET current_quantity = current_quantity - ?, updated_at = CURRENT_TIMESTAMP
    WHERE location_id = ? AND item_id = ?
  `);

  // Record transaction
  const insertTransaction = db.prepare(`
    INSERT INTO inventory_transactions (location_id, item_id, transaction_type, quantity, reference_type, reference_id, notes)
    VALUES (?, ?, 'used', ?, 'sales_import', ?, ?)
  `);

  // Calculate usage for each sale
  const itemUsage = new Map();

  sales.forEach(sale => {
    const components = getComponents.all(sale.product_id);

    components.forEach(comp => {
      if (comp.component_type === 'item') {
        // Direct item usage
        const itemId = comp.component_id;
        const usage = comp.quantity * sale.quantity;
        itemUsage.set(itemId, (itemUsage.get(itemId) || 0) + usage);
      } else if (comp.component_type === 'prep') {
        // Prep - need to break down to items
        const prepItems = getPrepItems.all(comp.component_id);
        prepItems.forEach(pi => {
          // Calculate how much of the prep is used, then how much of each item
          const prepUsage = comp.quantity / pi.yield_quantity;
          const itemUsageAmount = prepUsage * pi.quantity * sale.quantity;
          itemUsage.set(pi.item_id, (itemUsage.get(pi.item_id) || 0) + itemUsageAmount);
        });
      }
    });
  });

  // Apply deductions
  itemUsage.forEach((usage, itemId) => {
    updateInventory.run(usage, locationId, itemId);
    insertTransaction.run(locationId, itemId, usage, importId, `Theoretical usage from sales import #${importId}`);

    deductions.push({
      item_id: itemId,
      quantity_deducted: usage
    });
  });

  return deductions;
}

// Endpoint to manually deduct inventory from an existing import
router.post('/imports/:id/deduct-inventory', (req, res) => {
  try {
    const importId = req.params.id;

    const importRecord = db.prepare('SELECT * FROM sales_imports WHERE id = ?').get(importId);
    if (!importRecord) {
      return res.status(404).json({ error: 'Import not found' });
    }

    const deductions = deductInventoryFromSales(importId, importRecord.location_id);

    res.json({
      message: 'Inventory deducted based on theoretical usage',
      deductions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sales summary by date range
router.get('/summary', (req, res) => {
  try {
    const { location_id, start_date, end_date } = req.query;

    let query = `
      SELECT
        s.sale_date,
        SUM(s.quantity) as total_quantity,
        SUM(s.total_value) as total_value,
        COUNT(DISTINCT s.product_id) as product_count
      FROM sales s
      WHERE s.is_mapped = 1
    `;
    const params = [];

    if (location_id) {
      query += ' AND s.location_id = ?';
      params.push(location_id);
    }
    if (start_date) {
      query += ' AND s.sale_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND s.sale_date <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY s.sale_date ORDER BY s.sale_date';

    const summary = db.prepare(query).all(...params);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top selling products
router.get('/top-products', (req, res) => {
  try {
    const { location_id, start_date, end_date, limit = 20 } = req.query;

    let query = `
      SELECT
        s.product_id,
        p.name as product_name,
        p.theoretical_cost,
        SUM(s.quantity) as total_quantity,
        SUM(s.total_value) as total_revenue,
        SUM(s.quantity * p.theoretical_cost) as total_cost,
        AVG(s.total_value / s.quantity) as avg_price
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.is_mapped = 1
    `;
    const params = [];

    if (location_id) {
      query += ' AND s.location_id = ?';
      params.push(location_id);
    }
    if (start_date) {
      query += ' AND s.sale_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND s.sale_date <= ?';
      params.push(end_date);
    }

    query += ` GROUP BY s.product_id ORDER BY total_quantity DESC LIMIT ?`;
    params.push(parseInt(limit));

    const topProducts = db.prepare(query).all(...params);

    // Calculate food cost percent for each
    topProducts.forEach(p => {
      p.food_cost_percent = p.total_revenue > 0
        ? ((p.total_cost / p.total_revenue) * 100).toFixed(1)
        : 0;
    });

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete import (and associated sales)
router.delete('/imports/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM sales WHERE import_id = ?').run(req.params.id);
    db.prepare('DELETE FROM sales_imports WHERE id = ?').run(req.params.id);
    res.json({ message: 'Import deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
