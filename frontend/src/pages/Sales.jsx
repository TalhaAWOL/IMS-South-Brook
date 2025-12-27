import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { sales } from '../services/api';
import { Upload, FileText, Trash2, Calendar } from 'lucide-react';

export default function Sales() {
  const { currentLocation } = useLocation();
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (currentLocation) fetchImports(); }, [currentLocation]);

  const fetchImports = async () => {
    try { setLoading(true); const response = await sales.getImports({ location_id: currentLocation.id }); setImports(response.data); }
    catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this import?')) return;
    try { await sales.deleteImport(id); fetchImports(); }
    catch (error) { console.error('Error:', error); }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  if (!currentLocation) return <div className="text-center py-12"><p className="text-gray-500">Please select a location.</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
        <Link to="/sales/upload" className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          <Upload className="h-4 w-4 mr-2" />Upload Sales Report
        </Link>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
        ) : imports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No sales imports yet</p>
            <Link to="/sales/upload" className="text-red-600 hover:text-red-700 mt-2 inline-block">Upload your first report</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Products Sold</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imported</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {imports.map(imp => (
                <tr key={imp.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <p className="font-medium text-gray-900">{imp.filename}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {imp.date_range_start} - {imp.date_range_end}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{imp.total_products_sold?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(imp.total_sales_value)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(imp.import_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleDelete(imp.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
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
