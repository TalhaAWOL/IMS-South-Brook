import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// ==========================================
// ACTUAL VS THEORETICAL FOOD COST REPORT
// This is the MOST IMPORTANT feature
// ==========================================

router.get('/food-cost', (req, res) => {
  try {
    const { location_id, start_date, end_date } = req.query;

    if (!location_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'location_id, start_date, and end_date are required' });
    }

    // ==========================================
    // THEORETICAL FOOD COST
    // Sum of (Quantity Sold x Product Theoretical Cost)
    // ==========================================
    const theoreticalData = db.prepare(`
      SELECT
        SUM(s.quantity * p.theoretical_cost) as theoretical_food_cost,
        SUM(s.total_value) as total_sales,
        SUM(s.quantity) as total_products_sold
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.location_id = ?
        AND s.sale_date >= ?
        AND s.sale_date <= ?
        AND s.is_mapped = 1
    `).get(location_id, start_date, end_date);

    // ==========================================
    // ACTUAL FOOD COST
    // Beginning Inventory + Purchases - Ending Inventory
    // ==========================================

    // Get beginning inventory value (sum of inventory at start of period)
    // We'll use the inventory count closest to start_date, or transactions before start_date
    const beginningInventory = db.prepare(`
      SELECT SUM(li.current_quantity * li.cost_per_unit) as value
      FROM location_inventory li
      WHERE li.location_id = ?
    `).get(location_id);

    // Actually, for a proper calculation we need to track inventory value over time
    // For now, we'll calculate based on:
    // Current Inventory - Purchases in period + Sales deductions in period = Beginning Inventory
    // OR use inventory counts if available

    // Get inventory count at start of period (if exists)
    const startCount = db.prepare(`
      SELECT ic.id, ic.count_date,
        SUM(icl.counted_quantity * COALESCE(li.cost_per_unit, 0)) as inventory_value
      FROM inventory_counts ic
      JOIN inventory_count_lines icl ON icl.count_id = ic.id
      LEFT JOIN location_inventory li ON li.item_id = icl.item_id AND li.location_id = ic.location_id
      WHERE ic.location_id = ? AND ic.status = 'completed' AND ic.count_date <= ?
      GROUP BY ic.id
      ORDER BY ic.count_date DESC
      LIMIT 1
    `).get(location_id, start_date);

    // Get inventory count at end of period (if exists)
    const endCount = db.prepare(`
      SELECT ic.id, ic.count_date,
        SUM(icl.counted_quantity * COALESCE(li.cost_per_unit, 0)) as inventory_value
      FROM inventory_counts ic
      JOIN inventory_count_lines icl ON icl.count_id = ic.id
      LEFT JOIN location_inventory li ON li.item_id = icl.item_id AND li.location_id = ic.location_id
      WHERE ic.location_id = ? AND ic.status = 'completed' AND ic.count_date <= ?
      GROUP BY ic.id
      ORDER BY ic.count_date DESC
      LIMIT 1
    `).get(location_id, end_date);

    // Get purchases in the period
    const purchases = db.prepare(`
      SELECT SUM(i.total_amount) as total_purchases
      FROM invoices i
      WHERE i.location_id = ?
        AND i.invoice_date >= ?
        AND i.invoice_date <= ?
        AND i.status = 'received'
    `).get(location_id, start_date, end_date);

    // Calculate values
    const beginningInventoryValue = startCount?.inventory_value || beginningInventory?.value || 0;
    const endingInventoryValue = endCount?.inventory_value || beginningInventory?.value || 0;
    const purchasesValue = purchases?.total_purchases || 0;

    // Actual Food Cost = Beginning Inventory + Purchases - Ending Inventory
    const actualFoodCost = beginningInventoryValue + purchasesValue - endingInventoryValue;

    const theoreticalFoodCost = theoreticalData?.theoretical_food_cost || 0;
    const totalSales = theoreticalData?.total_sales || 0;

    // ==========================================
    // VARIANCE CALCULATIONS
    // ==========================================
    const varianceDollars = actualFoodCost - theoreticalFoodCost;
    const variancePercent = theoreticalFoodCost > 0
      ? ((varianceDollars / theoreticalFoodCost) * 100)
      : 0;

    const actualFoodCostPercent = totalSales > 0
      ? ((actualFoodCost / totalSales) * 100)
      : 0;

    const theoreticalFoodCostPercent = totalSales > 0
      ? ((theoreticalFoodCost / totalSales) * 100)
      : 0;

    // ==========================================
    // VARIANCE BY CATEGORY
    // ==========================================
    const varianceByCategory = db.prepare(`
      SELECT
        ic.name as category_name,
        SUM(s.quantity * pc_cost.component_cost) as theoretical_usage_cost,
        COUNT(DISTINCT s.product_id) as products_count
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN product_components pc ON pc.product_id = p.id
      LEFT JOIN items i ON pc.component_type = 'item' AND pc.component_id = i.id
      LEFT JOIN preps pr ON pc.component_type = 'prep' AND pc.component_id = pr.id
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      LEFT JOIN (
        SELECT
          pc.id as pc_id,
          CASE
            WHEN pc.component_type = 'item' THEN i.default_cost_per_unit * pc.quantity
            WHEN pc.component_type = 'prep' THEN pr.cost_per_unit * pc.quantity
          END as component_cost
        FROM product_components pc
        LEFT JOIN items i ON pc.component_type = 'item' AND pc.component_id = i.id
        LEFT JOIN preps pr ON pc.component_type = 'prep' AND pc.component_id = pr.id
      ) pc_cost ON pc_cost.pc_id = pc.id
      WHERE s.location_id = ?
        AND s.sale_date >= ?
        AND s.sale_date <= ?
        AND s.is_mapped = 1
      GROUP BY ic.id
      ORDER BY theoretical_usage_cost DESC
    `).all(location_id, start_date, end_date);

    // ==========================================
    // TOP VARIANCE ITEMS
    // ==========================================
    const itemUsage = db.prepare(`
      SELECT
        i.id as item_id,
        i.name as item_name,
        ic.name as category_name,
        SUM(CASE
          WHEN pc.component_type = 'item' THEN s.quantity * pc.quantity
          ELSE 0
        END) as theoretical_usage,
        i.unit_of_measure,
        i.default_cost_per_unit as cost_per_unit
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN product_components pc ON pc.product_id = p.id
      JOIN items i ON pc.component_type = 'item' AND pc.component_id = i.id
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE s.location_id = ?
        AND s.sale_date >= ?
        AND s.sale_date <= ?
        AND s.is_mapped = 1
      GROUP BY i.id
      ORDER BY (SUM(CASE WHEN pc.component_type = 'item' THEN s.quantity * pc.quantity ELSE 0 END) * i.default_cost_per_unit) DESC
      LIMIT 20
    `).all(location_id, start_date, end_date);

    // Add cost calculations to item usage
    itemUsage.forEach(item => {
      item.theoretical_cost = item.theoretical_usage * item.cost_per_unit;
    });

    res.json({
      period: {
        start_date,
        end_date,
        location_id: parseInt(location_id)
      },
      summary: {
        total_sales: totalSales,
        total_products_sold: theoreticalData?.total_products_sold || 0,

        // Food Cost Values
        theoretical_food_cost: theoreticalFoodCost,
        actual_food_cost: actualFoodCost,

        // Food Cost Percentages (of sales)
        theoretical_food_cost_percent: theoreticalFoodCostPercent.toFixed(1),
        actual_food_cost_percent: actualFoodCostPercent.toFixed(1),

        // Variance
        variance_dollars: varianceDollars,
        variance_percent: variancePercent.toFixed(1),

        // Status indicators
        variance_status: variancePercent > 5 ? 'high' : variancePercent > 2 ? 'moderate' : 'good',
        food_cost_status: actualFoodCostPercent > 35 ? 'high' : actualFoodCostPercent > 32 ? 'moderate' : 'good'
      },
      inventory: {
        beginning_value: beginningInventoryValue,
        purchases: purchasesValue,
        ending_value: endingInventoryValue,
        beginning_count_date: startCount?.count_date || null,
        ending_count_date: endCount?.count_date || null
      },
      by_category: varianceByCategory,
      top_usage_items: itemUsage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ITEM USAGE REPORT
// Shows theoretical vs actual usage per item
// ==========================================
router.get('/item-usage', (req, res) => {
  try {
    const { location_id, start_date, end_date, category_id } = req.query;

    if (!location_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'location_id, start_date, and end_date are required' });
    }

    // Get theoretical usage based on sales
    let theoreticalQuery = `
      SELECT
        i.id as item_id,
        i.name as item_name,
        ic.name as category_name,
        i.unit_of_measure,
        i.default_cost_per_unit,
        SUM(CASE
          WHEN pc.component_type = 'item' THEN s.quantity * pc.quantity
          ELSE 0
        END) as theoretical_usage
      FROM items i
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      LEFT JOIN product_components pc ON pc.component_type = 'item' AND pc.component_id = i.id
      LEFT JOIN products p ON pc.product_id = p.id
      LEFT JOIN sales s ON s.product_id = p.id
        AND s.location_id = ?
        AND s.sale_date >= ?
        AND s.sale_date <= ?
        AND s.is_mapped = 1
      WHERE i.is_active = 1
    `;
    const params = [location_id, start_date, end_date];

    if (category_id) {
      theoreticalQuery += ' AND i.category_id = ?';
      params.push(category_id);
    }

    theoreticalQuery += ' GROUP BY i.id ORDER BY theoretical_usage DESC';

    const items = db.prepare(theoreticalQuery).all(...params);

    // Get actual usage from transactions
    const actualUsage = db.prepare(`
      SELECT
        item_id,
        SUM(CASE WHEN transaction_type = 'used' THEN quantity ELSE 0 END) as actual_used,
        SUM(CASE WHEN transaction_type = 'received' THEN quantity ELSE 0 END) as received,
        SUM(CASE WHEN transaction_type = 'waste' THEN quantity ELSE 0 END) as wasted,
        SUM(CASE WHEN transaction_type = 'adjustment' THEN quantity ELSE 0 END) as adjustments
      FROM inventory_transactions
      WHERE location_id = ?
        AND created_at >= ?
        AND created_at <= ?
      GROUP BY item_id
    `).all(location_id, start_date, end_date);

    const actualMap = new Map(actualUsage.map(a => [a.item_id, a]));

    // Calculate variance for each item
    items.forEach(item => {
      const actual = actualMap.get(item.item_id);
      item.actual_usage = actual?.actual_used || 0;
      item.received = actual?.received || 0;
      item.wasted = actual?.wasted || 0;
      item.adjustments = actual?.adjustments || 0;

      item.theoretical_cost = item.theoretical_usage * item.default_cost_per_unit;
      item.actual_cost = item.actual_usage * item.default_cost_per_unit;

      item.variance_units = item.actual_usage - item.theoretical_usage;
      item.variance_cost = item.variance_units * item.default_cost_per_unit;
      item.variance_percent = item.theoretical_usage > 0
        ? ((item.variance_units / item.theoretical_usage) * 100).toFixed(1)
        : 0;

      // Flag high variance items (over 5%)
      item.is_high_variance = Math.abs(parseFloat(item.variance_percent)) > 5;
    });

    // Filter to only items with usage
    const itemsWithUsage = items.filter(i => i.theoretical_usage > 0 || i.actual_usage > 0);

    res.json({
      period: { start_date, end_date, location_id: parseInt(location_id) },
      items: itemsWithUsage,
      high_variance_count: itemsWithUsage.filter(i => i.is_high_variance).length,
      total_theoretical_cost: itemsWithUsage.reduce((sum, i) => sum + i.theoretical_cost, 0),
      total_actual_cost: itemsWithUsage.reduce((sum, i) => sum + i.actual_cost, 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PRODUCT PROFITABILITY REPORT
// ==========================================
router.get('/product-profitability', (req, res) => {
  try {
    const { location_id, start_date, end_date, category_id } = req.query;

    if (!location_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'location_id, start_date, and end_date are required' });
    }

    let query = `
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.size,
        pc.name as category_name,
        p.menu_price,
        p.theoretical_cost,
        SUM(s.quantity) as quantity_sold,
        SUM(s.total_value) as total_revenue,
        SUM(s.quantity * p.theoretical_cost) as total_cost,
        (p.menu_price - p.theoretical_cost) as profit_per_unit,
        ((p.menu_price - p.theoretical_cost) / p.menu_price * 100) as profit_margin_percent
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN sales s ON s.product_id = p.id
        AND s.location_id = ?
        AND s.sale_date >= ?
        AND s.sale_date <= ?
      WHERE p.is_active = 1
    `;
    const params = [location_id, start_date, end_date];

    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }

    query += `
      GROUP BY p.id
      HAVING quantity_sold > 0
      ORDER BY total_revenue DESC
    `;

    const products = db.prepare(query).all(...params);

    // Calculate additional metrics
    products.forEach(p => {
      p.food_cost_percent = p.total_revenue > 0
        ? ((p.total_cost / p.total_revenue) * 100).toFixed(1)
        : 0;
      p.total_profit = p.total_revenue - p.total_cost;
      p.profit_margin_percent = p.profit_margin_percent?.toFixed(1) || 0;
    });

    res.json({
      period: { start_date, end_date, location_id: parseInt(location_id) },
      products,
      totals: {
        total_revenue: products.reduce((sum, p) => sum + (p.total_revenue || 0), 0),
        total_cost: products.reduce((sum, p) => sum + (p.total_cost || 0), 0),
        total_profit: products.reduce((sum, p) => sum + (p.total_profit || 0), 0),
        total_units_sold: products.reduce((sum, p) => sum + (p.quantity_sold || 0), 0)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// WASTE REPORT
// ==========================================
router.get('/waste', (req, res) => {
  try {
    const { location_id, start_date, end_date } = req.query;

    if (!location_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'location_id, start_date, and end_date are required' });
    }

    const waste = db.prepare(`
      SELECT
        it.item_id,
        i.name as item_name,
        ic.name as category_name,
        i.unit_of_measure,
        SUM(it.quantity) as total_wasted,
        SUM(it.total_cost) as total_cost,
        COUNT(*) as waste_incidents
      FROM inventory_transactions it
      JOIN items i ON it.item_id = i.id
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE it.location_id = ?
        AND it.transaction_type = 'waste'
        AND it.created_at >= ?
        AND it.created_at <= ?
      GROUP BY it.item_id
      ORDER BY total_cost DESC
    `).all(location_id, start_date, end_date);

    const wasteByCategory = db.prepare(`
      SELECT
        ic.name as category_name,
        SUM(it.total_cost) as total_cost,
        COUNT(*) as waste_incidents
      FROM inventory_transactions it
      JOIN items i ON it.item_id = i.id
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE it.location_id = ?
        AND it.transaction_type = 'waste'
        AND it.created_at >= ?
        AND it.created_at <= ?
      GROUP BY ic.id
      ORDER BY total_cost DESC
    `).all(location_id, start_date, end_date);

    res.json({
      period: { start_date, end_date, location_id: parseInt(location_id) },
      items: waste,
      by_category: wasteByCategory,
      totals: {
        total_cost: waste.reduce((sum, w) => sum + w.total_cost, 0),
        total_incidents: waste.reduce((sum, w) => sum + w.waste_incidents, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PURCHASE ANALYSIS REPORT
// ==========================================
router.get('/purchases', (req, res) => {
  try {
    const { location_id, start_date, end_date, vendor_id } = req.query;

    if (!location_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'location_id, start_date, and end_date are required' });
    }

    let query = `
      SELECT
        i.vendor_id,
        v.name as vendor_name,
        COUNT(DISTINCT i.id) as invoice_count,
        SUM(i.total_amount) as total_spend,
        AVG(i.total_amount) as avg_invoice_amount
      FROM invoices i
      JOIN vendors v ON i.vendor_id = v.id
      WHERE i.location_id = ?
        AND i.invoice_date >= ?
        AND i.invoice_date <= ?
        AND i.status = 'received'
    `;
    const params = [location_id, start_date, end_date];

    if (vendor_id) {
      query += ' AND i.vendor_id = ?';
      params.push(vendor_id);
    }

    query += ' GROUP BY i.vendor_id ORDER BY total_spend DESC';

    const byVendor = db.prepare(query).all(...params);

    // Get item details
    const itemPurchases = db.prepare(`
      SELECT
        il.item_id,
        i.name as item_name,
        ic.name as category_name,
        SUM(il.quantity) as total_quantity,
        AVG(il.unit_price) as avg_unit_price,
        SUM(il.extended_price) as total_spend,
        MIN(il.unit_price) as min_price,
        MAX(il.unit_price) as max_price
      FROM invoice_lines il
      JOIN invoices inv ON il.invoice_id = inv.id
      JOIN items i ON il.item_id = i.id
      LEFT JOIN item_categories ic ON i.category_id = ic.id
      WHERE inv.location_id = ?
        AND inv.invoice_date >= ?
        AND inv.invoice_date <= ?
        AND inv.status = 'received'
      GROUP BY il.item_id
      ORDER BY total_spend DESC
    `).all(location_id, start_date, end_date);

    // Flag price variations
    itemPurchases.forEach(item => {
      item.price_variation_percent = item.min_price > 0
        ? (((item.max_price - item.min_price) / item.min_price) * 100).toFixed(1)
        : 0;
      item.has_price_increase = parseFloat(item.price_variation_percent) > 5;
    });

    res.json({
      period: { start_date, end_date, location_id: parseInt(location_id) },
      by_vendor: byVendor,
      items: itemPurchases,
      totals: {
        total_spend: byVendor.reduce((sum, v) => sum + v.total_spend, 0),
        invoice_count: byVendor.reduce((sum, v) => sum + v.invoice_count, 0),
        items_with_price_increase: itemPurchases.filter(i => i.has_price_increase).length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
