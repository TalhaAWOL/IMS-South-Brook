import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { inventory } from '../services/api';
import { Plus, ClipboardList, Check, Clock } from 'lucide-react';

export default function InventoryCounts() {
  const { currentLocation } = useLocation();
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (currentLocation) fetchCounts(); }, [currentLocation]);

  const fetchCounts = async () => {
    try { setLoading(true); const response = await inventory.getCounts(currentLocation.id); setCounts(response.data); }
    catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  if (!currentLocation) return <div className="text-center py-12"><p className="text-gray-500">Please select a location.</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Counts</h1>
        <Link to="/counts/new" className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />Start New Count
        </Link>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
        ) : counts.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No inventory counts yet</p>
            <Link to="/counts/new" className="text-red-600 hover:text-red-700 mt-2 inline-block">Start your first count</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {counts.map(count => (
                <tr key={count.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{count.count_date}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 capitalize">{count.count_type}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">{count.line_count}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className={count.total_variance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(count.total_variance || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${count.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {count.status === 'completed' ? <Check className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                      {count.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link to={`/counts/${count.id}`} className="text-blue-600 hover:text-blue-700 text-sm">
                      {count.status === 'completed' ? 'View' : 'Continue'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
