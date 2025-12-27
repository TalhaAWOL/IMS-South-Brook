import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get dashboard summary for a location
router.get('/:locationId', (req, res) => {
  try {
    const locationId = req.params.locationId;
    const { days = 30 } = req.query;

    // Calculate date range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // ==========================================
    // SALES SUMMARY
    // ==========================================
    const salesSummary = db.prepare(`
      SELECT
        SUM(s.total_value) as total_sales,
        SUM(s.quantity) as total_products_sold,
        COUNT(DISTINCT s.sale_date) as days_with_sales,
        SUM(s.quantity * p.theoretical_cost) as theoretical_food_cost
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.location_id = ?
        AND s.sale_date >= ?
        AND s.sale_date <= ?
        AND s.is_mapped = 1
    `).get(locationId, startDate, endDate);

    // ==========================================
    // INVENTORY SUMMARY
    // ==========================================
    const inventorySummary = db.prepare(`
      SELECT
        COUNT(*) as total_items,
        SUM(li.current_quantity * li.cost_per_unit) as total_value,
        SUM(CASE WHEN li.current_quantity < li.par_level THEN 1 ELSE 0 END) as low_stock_count
      FROM location_inventory li
      JOIN items i ON li.item_id = i.id
      WHERE li.location_id = ? AND i.is_active = 1
    `).get(locationId);

    // ==========================================
    // PURCHASE SUMMARY
    // ==========================================
    const purchaseSummary = db.prepare(`
      SELECT
        SUM(total_amount) as total_purchases,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE location_id = ?
        AND invoice_date >= ?
        AND invoice_date <= ?
        AND status = 'received'
    `).get(locationId, startDate, endDate);

    // ==========================================
    // FOOD COST CALCULATIONS
    // ==========================================
    const totalSales = salesSummary?.total_sales || 0;
    const theoreticalFoodCost = salesSummary?.theoretical_food_cost || 0;
    const totalPurchases = purchaseSummary?.total_purchases || 0;

    // Simple actual food cost approximation using purchases
    // (In reality, you'd want beginning and ending inventory counts)
    const actualFoodCostPercent = totalSales > 0
      ? (totalPurchases / totalSales) * 100
      : 0;

    const theoreticalFoodCostPercent = totalSales > 0
      ? (theoreticalFoodCost / totalSales) * 100
      : 0;

    const variancePercent = theoreticalFoodCostPercent > 0
      ? actualFoodCostPercent - theoreticalFoodCostPercent
      : 0;

    // ==========================================
    // DAILY SALES TREND (for chart)
    // ==========================================
    const dailySales = db.prepare(`
      SELECT
        s.sale_date,
        SUM(s.total_value) as daily_sales,
        SUM(s.quantity * p.theoretical_cost) as daily_cost
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.location_id = ?
        AND s.sale_date >= ?
        AND s.sale_date <= ?
        AND s.is_mapped = 1
      GROUP BY s.sale_date
      ORDER BY s.sale_date
    `).all(locationId, startDate, endDate);

    // Add food cost percent to each day
    dailySales.forEach(day => {
      day.food_cost_percent = day.daily_sales > 0
        ? ((day.daily_cost / day.daily_sales) * 100).toFixed(1)
        : 0;
    });

    // ==========================================
    // TOP SELLING PRODUCTS
    // ==========================================
    const topProducts = db.prepare(`
      SELECT
        p.name as product_name,
        p.size,
        SUM(s.quantity) as quantity_sold,
        SUM(s.total_value) as total_revenue
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.location_id = ?
        AND s.sale_date >= ?
        AND s.sale_date <= ?
        AND s.is_mapped = 1
      GROUP BY s.product_id
      ORDER BY quantity_sold DESC
      LIMIT 10
    `).all(locationId, startDate, endDate);

    // ==========================================
    // LOW STOCK ITEMS
    // ==========================================
    const lowStockItems = db.prepare(`
      SELECT
        i.name as item_name,
        li.current_quantity,
        li.par_level,
        i.unit_of_measure,
        (li.par_level - li.current_quantity) as shortage
      FROM location_inventory li
      JOIN items i ON li.item_id = i.id
      WHERE li.location_id = ?
        AND li.current_quantity < li.par_level
        AND i.is_active = 1
      ORDER BY shortage DESC
      LIMIT 10
    `).all(locationId);

    // ==========================================
    // HIGH VARIANCE ITEMS (if we have transaction data)
    // ==========================================
    const highVarianceItems = db.prepare(`
      SELECT
        i.id,
        i.name as item_name,
        SUM(CASE WHEN it.transaction_type = 'used' THEN it.quantity ELSE 0 END) as actual_usage,
        i.default_cost_per_unit
      FROM inventory_transactions it
      JOIN items i ON it.item_id = i.id
      WHERE it.location_id = ?
        AND it.created_at >= ?
        AND it.created_at <= ?
      GROUP BY i.id
      HAVING actual_usage > 0
      ORDER BY actual_usage * i.default_cost_per_unit DESC
      LIMIT 10
    `).all(locationId, startDate, endDate);

    // ==========================================
    // RECENT ACTIVITY
    // ==========================================
    const recentInvoices = db.prepare(`
      SELECT i.id, i.invoice_number, i.invoice_date, i.total_amount, v.name as vendor_name, i.status
      FROM invoices i
      JOIN vendors v ON i.vendor_id = v.id
      WHERE i.location_id = ?
      ORDER BY i.created_at DESC
      LIMIT 5
    `).all(locationId);

    const recentImports = db.prepare(`
      SELECT id, filename, import_date, total_products_sold, total_sales_value, date_range_start, date_range_end
      FROM sales_imports
      WHERE location_id = ?
      ORDER BY import_date DESC
      LIMIT 5
    `).all(locationId);

    // ==========================================
    // UNMAPPED PRODUCTS COUNT
    // ==========================================
    const unmappedCount = db.prepare(`
      SELECT COUNT(DISTINCT pos_item_name || '|' || pos_size) as count
      FROM sales
      WHERE location_id = ? AND is_mapped = 0
    `).get(locationId);

    res.json({
      period: {
        start_date: startDate,
        end_date: endDate,
        days: parseInt(days)
      },
      kpis: {
        total_sales: totalSales,
        total_products_sold: salesSummary?.total_products_sold || 0,
        actual_food_cost_percent: actualFoodCostPercent.toFixed(1),
        theoretical_food_cost_percent: theoreticalFoodCostPercent.toFixed(1),
        variance_percent: variancePercent.toFixed(1),
        food_cost_status: actualFoodCostPercent > 35 ? 'high' : actualFoodCostPercent > 32 ? 'moderate' : 'good',
        variance_status: Math.abs(variancePercent) > 5 ? 'high' : Math.abs(variancePercent) > 2 ? 'moderate' : 'good'
      },
      inventory: {
        total_items: inventorySummary?.total_items || 0,
        total_value: inventorySummary?.total_value || 0,
        low_stock_count: inventorySummary?.low_stock_count || 0
      },
      purchases: {
        total_amount: purchaseSummary?.total_purchases || 0,
        invoice_count: purchaseSummary?.invoice_count || 0
      },
      charts: {
        daily_sales: dailySales
      },
      lists: {
        top_products: topProducts,
        low_stock_items: lowStockItems,
        high_variance_items: highVarianceItems
      },
      recent_activity: {
        invoices: recentInvoices,
        imports: recentImports
      },
      alerts: {
        low_stock_count: inventorySummary?.low_stock_count || 0,
        unmapped_products_count: unmappedCount?.count || 0,
        high_variance: Math.abs(variancePercent) > 5,
        high_food_cost: actualFoodCostPercent > 35
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comparison between locations
router.get('/compare/locations', (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const locations = db.prepare(`
      SELECT
        l.id,
        l.name,
        l.code,
        (SELECT SUM(s.total_value)
         FROM sales s
         WHERE s.location_id = l.id
           AND s.sale_date >= ?
           AND s.sale_date <= ?) as total_sales,
        (SELECT SUM(s.quantity * p.theoretical_cost)
         FROM sales s
         JOIN products p ON s.product_id = p.id
         WHERE s.location_id = l.id
           AND s.sale_date >= ?
           AND s.sale_date <= ?
           AND s.is_mapped = 1) as theoretical_cost,
        (SELECT SUM(i.total_amount)
         FROM invoices i
         WHERE i.location_id = l.id
           AND i.invoice_date >= ?
           AND i.invoice_date <= ?
           AND i.status = 'received') as purchases
      FROM locations l
      WHERE l.is_active = 1
    `).all(start_date, end_date, start_date, end_date, start_date, end_date);

    // Calculate metrics for each location
    locations.forEach(loc => {
      loc.total_sales = loc.total_sales || 0;
      loc.theoretical_cost = loc.theoretical_cost || 0;
      loc.purchases = loc.purchases || 0;

      loc.theoretical_food_cost_percent = loc.total_sales > 0
        ? ((loc.theoretical_cost / loc.total_sales) * 100).toFixed(1)
        : 0;

      loc.actual_food_cost_percent = loc.total_sales > 0
        ? ((loc.purchases / loc.total_sales) * 100).toFixed(1)
        : 0;

      loc.variance_percent = loc.theoretical_food_cost_percent > 0
        ? (parseFloat(loc.actual_food_cost_percent) - parseFloat(loc.theoretical_food_cost_percent)).toFixed(1)
        : 0;
    });

    res.json({
      period: { start_date, end_date },
      locations: locations.sort((a, b) => b.total_sales - a.total_sales)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
