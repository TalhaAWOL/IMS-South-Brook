# IMS - Multi-Location Restaurant Inventory Management System

A comprehensive inventory management and food cost analysis system for Big Mama's and Papa's Pizzeria (BMPP) and other multi-location restaurant franchises.

## Features

### Core Features
- **Multi-Location Support**: Manage inventory across multiple franchise locations
- **Inventory Management**: Track all ingredients/items with par levels and low-stock alerts
- **Recipe Management**: Create and manage Preps (batched ingredients) and Products (menu items)
- **Sales Report Upload**: Parse Milton Itemized Sales reports to track what was sold
- **Actual vs Theoretical Food Cost**: The core feature - compare what you should have used vs what you actually used
- **Vendor Invoice Entry**: Track purchases and automatically update inventory
- **Inventory Counts**: Perform physical counts and identify variances
- **Product Mapping**: Link POS product names to system recipes

### Key Metrics
- Food Cost Percentage (Target: 28-32%)
- Actual vs Theoretical Variance
- Low Stock Alerts
- High Variance Items

## Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: React with Vite and Tailwind CSS
- **Database**: SQLite (can be upgraded to PostgreSQL)
- **Charts**: Recharts
- **Excel Parsing**: xlsx library

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd IMS-South-Brook
```

2. Install dependencies:
```bash
npm install
```

3. Initialize the database:
```bash
npm run db:init
```

4. (Optional) Seed with sample data:
```bash
npm run db:seed
```

5. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend API on http://localhost:3001
- Frontend on http://localhost:3000

## Project Structure

```
IMS-South-Brook/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.js    # Database connection
│   │   │   ├── init.js        # Schema initialization
│   │   │   └── seed.js        # Sample data
│   │   ├── routes/
│   │   │   ├── locations.js   # Location management
│   │   │   ├── items.js       # Ingredient management
│   │   │   ├── preps.js       # Prep recipes
│   │   │   ├── products.js    # Product recipes
│   │   │   ├── mappings.js    # POS to product mapping
│   │   │   ├── vendors.js     # Vendor management
│   │   │   ├── invoices.js    # Invoice entry
│   │   │   ├── sales.js       # Sales report upload
│   │   │   ├── inventory.js   # Inventory & counts
│   │   │   ├── reports.js     # Food cost reports
│   │   │   └── dashboard.js   # Dashboard data
│   │   └── index.js           # Express server
│   ├── uploads/               # Uploaded files
│   └── data/                  # SQLite database
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── context/           # React context
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   └── App.jsx            # Main app
│   └── index.html
└── package.json
```

## Terminology

- **Item**: Any ingredient or material received (e.g., dough, mozzarella, eggs)
- **Prep**: Combination of items prepared together (e.g., Mozzarella and Feta Mix)
- **Product**: Anything sold to guests (e.g., 1 Egg Gondola, Cajun Wings 12pc)
- **Recipe**: Breakdown tracing each Product to its Preps and Items

## Key Workflows

### 1. Uploading Sales Reports (Proof of Concept)

1. Navigate to Sales → Upload Sales Report
2. Upload your Milton Itemized Sales Excel file (.xls or .xlsx)
3. Preview the parsed data and mapping status
4. Map any unmapped products to system recipes
5. Import the sales data (optionally deduct inventory)

### 2. Actual vs Theoretical Food Cost

1. Navigate to Food Cost Report
2. Select date range
3. View:
   - Theoretical Food Cost (based on recipes × sales)
   - Actual Food Cost (beginning inventory + purchases - ending inventory)
   - Variance ($ and %)
   - Cost breakdown by category
   - High variance items

### 3. Inventory Count

1. Navigate to Inventory Counts → Start New Count
2. Enter counted quantities for each item
3. Finalize to adjust inventory and record variance

### 4. Invoice Entry

1. Navigate to Invoices → New Invoice
2. Select vendor, enter invoice details
3. Add line items
4. Save and "Receive" to add to inventory

## Sales Report Format

The system parses Milton Itemized Sales reports with this structure:
- Row 0: Date headers (e.g., "Sep 1, Mon 2025")
- Row 1: Column headers (Category, Item, Size)
- Row 2: Sub-headers (Quantity, Value, Sales Percent)
- Row 4+: Sales data

For each date, there are 3 columns: Quantity, Value, Sales Percent

## API Endpoints

### Locations
- `GET /api/locations` - List all locations
- `POST /api/locations` - Create location

### Items
- `GET /api/items` - List items (with optional location inventory)
- `POST /api/items` - Create item
- `PUT /api/items/:id/inventory/:locationId` - Update inventory

### Products
- `GET /api/products` - List products with food cost %
- `POST /api/products` - Create product with recipe

### Sales
- `POST /api/sales/preview` - Preview uploaded file
- `POST /api/sales/import` - Import sales data

### Reports
- `GET /api/reports/food-cost` - Actual vs Theoretical report
- `GET /api/reports/item-usage` - Item usage breakdown

### Dashboard
- `GET /api/dashboard/:locationId` - Dashboard KPIs

## Recipe Book Integration

To import recipes from the BMPP Recipe Book PDF:
1. Extract product names, sizes, and ingredients
2. Create Items for each ingredient with costs
3. Create Preps for batched ingredients
4. Create Products with their component recipes
5. Create mappings to link POS names to products

## Future Enhancements

- [ ] POS Integration (Clover, Toast, Square)
- [ ] EDI Integration (GFS, Sysco)
- [ ] User authentication and roles
- [ ] Waste tracking
- [ ] Purchase order generation
- [ ] Mobile app for inventory counts
- [ ] Export to Excel/PDF

## Support

For issues or questions, contact the development team.
