import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import locationsRouter from './routes/locations.js';
import itemsRouter from './routes/items.js';
import prepsRouter from './routes/preps.js';
import productsRouter from './routes/products.js';
import mappingsRouter from './routes/mappings.js';
import vendorsRouter from './routes/vendors.js';
import invoicesRouter from './routes/invoices.js';
import salesRouter from './routes/sales.js';
import inventoryRouter from './routes/inventory.js';
import reportsRouter from './routes/reports.js';
import dashboardRouter from './routes/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/locations', locationsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/preps', prepsRouter);
app.use('/api/products', productsRouter);
app.use('/api/mappings', mappingsRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
