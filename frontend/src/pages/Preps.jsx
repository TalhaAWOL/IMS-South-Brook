import { useState, useEffect } from 'react';
import { preps as prepsApi, items as itemsApi } from '../services/api';
import { Plus, Edit, Trash2, ChefHat } from 'lucide-react';

export default function Preps() {
  const [preps, setPreps] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPrep, setEditingPrep] = useState(null);
  const [formData, setFormData] = useState({ name: '', yield_quantity: 0, yield_unit: 'oz', instructions: '', items: [] });

  useEffect(() => { fetchPreps(); fetchItems(); }, []);

  const fetchPreps = async () => {
    try { setLoading(true); const response = await prepsApi.getAll(); setPreps(response.data); }
    catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const fetchItems = async () => {
    try { const response = await itemsApi.getAll(); setItems(response.data); }
    catch (error) { console.error('Error:', error); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPrep) { await prepsApi.update(editingPrep.id, formData); }
      else { await prepsApi.create(formData); }
      setShowModal(false);
      setEditingPrep(null);
      setFormData({ name: '', yield_quantity: 0, yield_unit: 'oz', instructions: '', items: [] });
      fetchPreps();
    } catch (error) { console.error('Error:', error); }
  };

  const handleEdit = (prep) => {
    setEditingPrep(prep);
    setFormData({
      name: prep.name, yield_quantity: prep.yield_quantity, yield_unit: prep.yield_unit, instructions: prep.instructions || '',
      items: prep.items?.map(i => ({ item_id: i.item_id, quantity: i.quantity, unit: i.unit })) || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try { await prepsApi.delete(id); fetchPreps(); }
    catch (error) { console.error('Error:', error); }
  };

  const addItem = () => { setFormData({ ...formData, items: [...formData.items, { item_id: '', quantity: 0, unit: 'oz' }] }); };
  const updateItem = (index, field, value) => { const updated = [...formData.items]; updated[index][field] = value; setFormData({ ...formData, items: updated }); };
  const removeItem = (index) => { setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) }); };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Preps (Batched Ingredients)</h1>
        <button onClick={() => { setShowModal(true); setEditingPrep(null); setFormData({ name: '', yield_quantity: 0, yield_unit: 'oz', instructions: '', items: [] }); }}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />Add Prep
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prep</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yield</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost/Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingredients</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {preps.map(prep => (
                <tr key={prep.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <ChefHat className="h-5 w-5 text-gray-400 mr-3" />
                      <p className="font-medium text-gray-900">{prep.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{prep.yield_quantity} {prep.yield_unit}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(prep.cost_per_unit)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{prep.items?.length || 0} items</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleEdit(prep)} className="text-blue-600 hover:text-blue-700 mr-3"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(prep.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingPrep ? 'Edit Prep' : 'Add Prep'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yield Quantity</label>
                  <input type="number" value={formData.yield_quantity} onChange={(e) => setFormData({...formData, yield_quantity: parseFloat(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yield Unit</label>
                  <select value={formData.yield_unit} onChange={(e) => setFormData({...formData, yield_unit: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="oz">oz</option><option value="lb">lb</option><option value="each">each</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Ingredients</label>
                  <button type="button" onClick={addItem} className="text-sm text-red-600">+ Add</button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                      <select value={item.item_id} onChange={(e) => updateItem(index, 'item_id', e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm">
                        <option value="">Select item...</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                      <input type="number" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-20 border rounded px-2 py-1 text-sm" />
                      <input type="text" value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} className="w-16 border rounded px-2 py-1 text-sm" />
                      <button type="button" onClick={() => removeItem(index)} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
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
