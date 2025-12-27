import { useState, useEffect } from 'react';
import { items as itemsApi } from '../services/api';
import { Search, Plus, Edit, Trash2, Package } from 'lucide-react';

export default function Items() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', category_id: '', unit_of_measure: 'oz', default_cost_per_unit: 0, vendor: '', sku: ''
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [search, categoryFilter]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await itemsApi.getAll({ search, category_id: categoryFilter || undefined });
      setItems(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await itemsApi.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await itemsApi.update(editingItem.id, formData);
      } else {
        await itemsApi.create(formData);
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: '', category_id: '', unit_of_measure: 'oz', default_cost_per_unit: 0, vendor: '', sku: '' });
      fetchItems();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category_id: item.category_id || '',
      unit_of_measure: item.unit_of_measure,
      default_cost_per_unit: item.default_cost_per_unit,
      vendor: item.vendor || '',
      sku: item.sku || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await itemsApi.delete(id);
      fetchItems();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Items (Ingredients)</h1>
        <button
          onClick={() => { setShowModal(true); setEditingItem(null); setFormData({ name: '', category_id: '', unit_of_measure: 'oz', default_cost_per_unit: 0, vendor: '', sku: '' }); }}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </button>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border rounded-lg px-4 py-2">
            <option value="">All Categories</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost/Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.category_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.unit_of_measure}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(item.default_cost_per_unit)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.vendor}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-700 mr-3"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingItem ? 'Edit Item' : 'Add Item'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select Category</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select value={formData.unit_of_measure} onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="oz">oz</option>
                    <option value="lb">lb</option>
                    <option value="each">each</option>
                    <option value="case">case</option>
                    <option value="bag">bag</option>
                    <option value="bottle">bottle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost/Unit</label>
                  <input type="number" step="0.0001" value={formData.default_cost_per_unit} onChange={(e) => setFormData({...formData, default_cost_per_unit: parseFloat(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <input type="text" value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input type="text" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
