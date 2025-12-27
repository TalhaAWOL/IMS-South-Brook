import { useState, useEffect } from 'react';
import { products as productsApi, items as itemsApi, preps as prepsApi } from '../services/api';
import { Search, Plus, Edit, Trash2, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [preps, setPreps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', pos_name: '', size: '', category_id: '', menu_price: 0, is_customizable: false, components: []
  });

  useEffect(() => { fetchProducts(); fetchCategories(); fetchItems(); fetchPreps(); }, [search, categoryFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getAll({ search, category_id: categoryFilter || undefined });
      setProducts(response.data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try { const response = await productsApi.getCategories(); setCategories(response.data); }
    catch (error) { console.error('Error:', error); }
  };

  const fetchItems = async () => {
    try { const response = await itemsApi.getAll(); setItems(response.data); }
    catch (error) { console.error('Error:', error); }
  };

  const fetchPreps = async () => {
    try { const response = await prepsApi.getAll(); setPreps(response.data); }
    catch (error) { console.error('Error:', error); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) { await productsApi.update(editingProduct.id, formData); }
      else { await productsApi.create(formData); }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', pos_name: '', size: '', category_id: '', menu_price: 0, is_customizable: false, components: [] });
      fetchProducts();
    } catch (error) { console.error('Error:', error); }
  };

  const handleEdit = async (product) => {
    try {
      const response = await productsApi.getOne(product.id);
      const p = response.data;
      setEditingProduct(p);
      setFormData({
        name: p.name, pos_name: p.pos_name || '', size: p.size || '', category_id: p.category_id || '',
        menu_price: p.menu_price, is_customizable: p.is_customizable,
        components: p.components?.map(c => ({ component_type: c.component_type, component_id: c.component_id, quantity: c.quantity, unit: c.unit })) || []
      });
      setShowModal(true);
    } catch (error) { console.error('Error:', error); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try { await productsApi.delete(id); fetchProducts(); }
    catch (error) { console.error('Error:', error); }
  };

  const addComponent = () => {
    setFormData({ ...formData, components: [...formData.components, { component_type: 'item', component_id: '', quantity: 0, unit: 'oz' }] });
  };

  const updateComponent = (index, field, value) => {
    const updated = [...formData.components];
    updated[index][field] = value;
    setFormData({ ...formData, components: updated });
  };

  const removeComponent = (index) => {
    setFormData({ ...formData, components: formData.components.filter((_, i) => i !== index) });
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products (Menu Items)</h1>
        <button onClick={() => { setShowModal(true); setEditingProduct(null); setFormData({ name: '', pos_name: '', size: '', category_id: '', menu_price: 0, is_customizable: false, components: [] }); }}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Menu Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Food Cost %</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(product => (
                <tr key={product.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <button onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)} className="mr-2">
                        {expandedProduct === product.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <ShoppingCart className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.pos_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.size}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.category_name}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(product.menu_price)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500">{formatCurrency(product.theoretical_cost)}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${parseFloat(product.food_cost_percent) > 35 ? 'bg-red-100 text-red-700' : parseFloat(product.food_cost_percent) > 32 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {product.food_cost_percent}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-700 mr-3"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 my-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">POS Name</label>
                  <input type="text" value={formData.pos_name} onChange={(e) => setFormData({...formData, pos_name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <input type="text" value={formData.size} onChange={(e) => setFormData({...formData, size: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="">Select</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Menu Price</label>
                  <input type="number" step="0.01" value={formData.menu_price} onChange={(e) => setFormData({...formData, menu_price: parseFloat(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Recipe Components</label>
                  <button type="button" onClick={addComponent} className="text-sm text-red-600 hover:text-red-700">+ Add Component</button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {formData.components.map((comp, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                      <select value={comp.component_type} onChange={(e) => updateComponent(index, 'component_type', e.target.value)} className="border rounded px-2 py-1 text-sm">
                        <option value="item">Item</option>
                        <option value="prep">Prep</option>
                      </select>
                      <select value={comp.component_id} onChange={(e) => updateComponent(index, 'component_id', e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm">
                        <option value="">Select...</option>
                        {(comp.component_type === 'item' ? items : preps).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      <input type="number" step="0.01" value={comp.quantity} onChange={(e) => updateComponent(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1 text-sm" placeholder="Qty" />
                      <input type="text" value={comp.unit} onChange={(e) => updateComponent(index, 'unit', e.target.value)} className="w-16 border rounded px-2 py-1 text-sm" placeholder="Unit" />
                      <button type="button" onClick={() => removeComponent(index)} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
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
