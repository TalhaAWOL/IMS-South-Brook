import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { invoices, vendors as vendorsApi, items as itemsApi } from '../services/api';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentLocation } = useLocation();
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendor_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], notes: '', lines: []
  });

  useEffect(() => { fetchVendors(); fetchItems(); if (id) fetchInvoice(); }, [id]);

  const fetchVendors = async () => {
    try { const response = await vendorsApi.getAll(); setVendors(response.data); }
    catch (error) { console.error('Error:', error); }
  };

  const fetchItems = async () => {
    try { const response = await itemsApi.getAll(); setItems(response.data); }
    catch (error) { console.error('Error:', error); }
  };

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoices.getOne(id);
      const inv = response.data;
      setFormData({
        vendor_id: inv.vendor_id, invoice_number: inv.invoice_number, invoice_date: inv.invoice_date, notes: inv.notes || '',
        lines: inv.lines?.map(l => ({ item_id: l.item_id, quantity: l.quantity, unit_price: l.unit_price })) || []
      });
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const addLine = () => { setFormData({ ...formData, lines: [...formData.lines, { item_id: '', quantity: 0, unit_price: 0 }] }); };
  const updateLine = (index, field, value) => { const updated = [...formData.lines]; updated[index][field] = value; setFormData({ ...formData, lines: updated }); };
  const removeLine = (index) => { setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, location_id: currentLocation.id };
      if (id) { await invoices.update(id, data); }
      else { await invoices.create(data); }
      navigate('/invoices');
    } catch (error) { console.error('Error:', error); alert(error.response?.data?.error || 'Failed to save'); }
  };

  const calculateTotal = () => formData.lines.reduce((sum, l) => sum + (l.quantity * l.unit_price), 0);
  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  if (!currentLocation) return <div className="text-center py-12"><p className="text-gray-500">Please select a location.</p></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/invoices')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Invoice' : 'New Invoice'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
            <select value={formData.vendor_id} onChange={(e) => setFormData({...formData, vendor_id: e.target.value})} className="w-full border rounded-lg px-3 py-2" required>
              <option value="">Select Vendor</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice # *</label>
            <input type="text" value={formData.invoice_number} onChange={(e) => setFormData({...formData, invoice_number: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" value={formData.invoice_date} onChange={(e) => setFormData({...formData, invoice_date: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Line Items</label>
            <button type="button" onClick={addLine} className="flex items-center text-sm text-red-600 hover:text-red-700">
              <Plus className="h-4 w-4 mr-1" />Add Item
            </button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-2">
              <div className="col-span-5">Item</div>
              <div className="col-span-2 text-right">Quantity</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-2 text-right">Extended</div>
              <div className="col-span-1"></div>
            </div>
            {formData.lines.map((line, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded">
                <select value={line.item_id} onChange={(e) => updateLine(index, 'item_id', e.target.value)} className="col-span-5 border rounded px-2 py-1 text-sm">
                  <option value="">Select item...</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <input type="number" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)} className="col-span-2 border rounded px-2 py-1 text-sm text-right" />
                <input type="number" step="0.01" value={line.unit_price} onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)} className="col-span-2 border rounded px-2 py-1 text-sm text-right" />
                <div className="col-span-2 text-right text-sm font-medium">{formatCurrency(line.quantity * line.unit_price)}</div>
                <button type="button" onClick={() => removeLine(index)} className="col-span-1 text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(calculateTotal())}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={2} />
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <button type="button" onClick={() => navigate('/invoices')} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Save Invoice</button>
        </div>
      </form>
    </div>
  );
}
