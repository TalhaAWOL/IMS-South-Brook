import { useState, useEffect } from 'react';
import { useLocation } from '../context/LocationContext';
import { inventory, items as itemsApi } from '../services/api';
import { Search, Package, AlertTriangle, Plus, Minus } from 'lucide-react';

export default function Inventory() {
  const { currentLocation } = useLocation();
  const [inventoryData, setInventoryData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustment, setAdjustment] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState('');

  useEffect(() => {
    if (currentLocation) {
      fetchInventory();
      fetchCategories();
    }
  }, [currentLocation, search, categoryFilter, lowStockOnly]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventory.getForLocation(currentLocation.id, {
        search,
        category_id: categoryFilter || undefined,
        low_stock_only: lowStockOnly
      });
      setInventoryData(response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await itemsApi.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAdjust = async () => {
    if (!adjustModal || adjustment === 0) return;

    try {
      await inventory.adjust(currentLocation.id, {
        item_id: adjustModal.item_id,
        adjustment,
        notes: adjustNotes
      });
      setAdjustModal(null);
      setAdjustment(0);
      setAdjustNotes('');
      fetchInventory();
    } catch (error) {
      console.error('Error adjusting inventory:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  if (!currentLocation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please select a location to view inventory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500">Manage inventory for {currentLocation.name}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="h-4 w-4 text-red-600 rounded"
            />
            <span className="text-sm text-gray-700">Low stock only</span>
          </label>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">On Hand</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Par Level</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost/Unit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventoryData.map((item) => (
                <tr key={item.id} className={item.is_low_stock ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{item.item_name}</p>
                        <p className="text-sm text-gray-500">{item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.category_name}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                    {item.current_quantity} {item.unit_of_measure}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">
                    {item.par_level} {item.unit_of_measure}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">
                    {formatCurrency(item.cost_per_unit)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                    {formatCurrency(item.total_value)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.is_low_stock ? (
                      <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setAdjustModal(item)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Adjustment Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjust Inventory</h3>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{adjustModal.item_name}</p>
              <p className="text-sm text-gray-500">
                Current: {adjustModal.current_quantity} {adjustModal.unit_of_measure}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adjustment
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAdjustment(adjustment - 1)}
                  className="p-2 border rounded-lg hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
                  className="w-24 text-center border rounded-lg px-3 py-2"
                />
                <button
                  onClick={() => setAdjustment(adjustment + 1)}
                  className="p-2 border rounded-lg hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                New quantity: {(adjustModal.current_quantity + adjustment).toFixed(2)} {adjustModal.unit_of_measure}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
                placeholder="Reason for adjustment..."
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setAdjustModal(null);
                  setAdjustment(0);
                  setAdjustNotes('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjustment === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
