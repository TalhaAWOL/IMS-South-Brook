import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Items from './pages/Items';
import Preps from './pages/Preps';
import Products from './pages/Products';
import Sales from './pages/Sales';
import SalesUpload from './pages/SalesUpload';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InventoryCounts from './pages/InventoryCounts';
import InventoryCountForm from './pages/InventoryCountForm';
import FoodCostReport from './pages/FoodCostReport';
import Mappings from './pages/Mappings';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="items" element={<Items />} />
        <Route path="preps" element={<Preps />} />
        <Route path="products" element={<Products />} />
        <Route path="sales" element={<Sales />} />
        <Route path="sales/upload" element={<SalesUpload />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<InvoiceForm />} />
        <Route path="invoices/:id" element={<InvoiceForm />} />
        <Route path="counts" element={<InventoryCounts />} />
        <Route path="counts/new" element={<InventoryCountForm />} />
        <Route path="counts/:id" element={<InventoryCountForm />} />
        <Route path="reports/food-cost" element={<FoodCostReport />} />
        <Route path="mappings" element={<Mappings />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
