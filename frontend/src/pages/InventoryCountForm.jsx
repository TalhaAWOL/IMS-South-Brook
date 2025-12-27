import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { inventory } from '../services/api';
import { ArrowLeft, Check, Save, Search } from 'lucide-react';

export default function InventoryCountForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentLocation } = useLocation();
  const [count, setCount] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ count_date: new Date().toISOString().split('T')[0], count_type: 'full', notes: '' });

  useEffect(() => { if (id && currentLocation) fetchCount(); }, [id, currentLocation]);

  const fetchCount = async () => {
    try { setLoading(true); const response = await inventory.getCount(currentLocation.id, id); setCount(response.data); setLines(response.data.lines || []); }
    catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try { setSaving(true); const response = await inventory.startCount(currentLocation.id, formData); navigate(`/counts/${response.data.id}`); }
    catch (error) { console.error('Error:', error); }
    finally { setSaving(false); }
  };

  const handleUpdateLine = async (lineId, counted) => {
    try {
      await inventory.updateCountLine(currentLocation.id, id, lineId, { counted_quantity: counted });
      setLines(lines.map(l => l.id === lineId ? { ...l, counted_quantity: counted, variance: counted - l.system_quantity } : l));
    } catch (error) { console.error('Error:', error); }
  };

  const handleFinalize = async () => {
    if (!confirm('Finalize this count? This will adjust inventory based on counted quantities.')) return;
    try { setSaving(true); await inventory.finalizeCount(currentLocation.id, id); navigate('/counts'); }
    catch (error) { console.error('Error:', error); alert(error.response?.data?.error || 'Failed to finalize'); }
    finally { setSaving(false); }
  };

  const filteredLines = lines.filter(l => l.item_name.toLowerCase().includes(search.toLowerCase()));

  if (!currentLocation) return <div className="text-center py-12"><p className="text-gray-500">Please select a location.</p></div>;

  // New count form
  if (!id) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/counts')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-2xl font-bold text-gray-900">Start Inventory Count</h1>
        </div>
        <form onSubmit={handleCreate} className="bg-white rounded-xl border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Count Date</label>
            <input type="date" value={formData.count_date} onChange={(e) => setFormData({...formData, count_date: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Count Type</label>
            <select value={formData.count_type} onChange={(e) => setFormData({...formData, count_type: e.target.value})} className="w-full border rounded-lg px-3 py-2">
              <option value="full">Full Count</option>
              <option value="partial">Partial Count</option>
              <option value="spot">Spot Check</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2" rows={2} />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={() => navigate('/counts')} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Start Count'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/counts')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Count</h1>
            <p className="text-gray-500">{count?.count_date} - {count?.status}</p>
          </div>
        </div>
        {count?.status !== 'completed' && (
          <button onClick={handleFinalize} disabled={saving} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            <Check className="h-4 w-4 mr-2" />{saving ? 'Finalizing...' : 'Finalize Count'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">System Qty</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Counted</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLines.map(line => (
              <tr key={line.id} className={line.variance && Math.abs(line.variance) > 0 ? 'bg-yellow-50' : ''}>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{line.item_name}</p>
                  <p className="text-sm text-gray-500">{line.category_name}</p>
                </td>
                <td className="px-6 py-4 text-right text-gray-500">{line.system_quantity} {line.unit_of_measure}</td>
                <td className="px-6 py-4 text-right">
                  {count?.status !== 'completed' ? (
                    <input
                      type="number"
                      step="0.01"
                      value={line.counted_quantity ?? ''}
                      onChange={(e) => handleUpdateLine(line.id, parseFloat(e.target.value) || 0)}
                      className="w-24 border rounded px-2 py-1 text-right"
                      placeholder="Count"
                    />
                  ) : (
                    <span>{line.counted_quantity}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {line.counted_quantity !== null && (
                    <span className={line.variance > 0 ? 'text-red-600' : line.variance < 0 ? 'text-green-600' : 'text-gray-500'}>
                      {line.variance > 0 ? '+' : ''}{line.variance?.toFixed(2)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
