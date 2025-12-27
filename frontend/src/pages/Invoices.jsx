import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { invoices, vendors as vendorsApi } from '../services/api';
import { Plus, FileText, Check, Clock, Trash2 } from 'lucide-react';

export default function Invoices() {
  const { currentLocation } = useLocation();
  const [invoiceList, setInvoiceList] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorFilter, setVendorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { if (currentLocation) { fetchInvoices(); fetchVendors(); } }, [currentLocation, vendorFilter, statusFilter]);

  const fetchInvoices = async () => {
    try { setLoading(true); const response = await invoices.getAll({ location_id: currentLocation.id, vendor_id: vendorFilter || undefined, status: statusFilter || undefined }); setInvoiceList(response.data); }
    catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const fetchVendors = async () => {
    try { const response = await vendorsApi.getAll(); setVendors(response.data); }
    catch (error) { console.error('Error:', error); }
  };

  const handleReceive = async (id) => {
    try { await invoices.receive(id); fetchInvoices(); }
    catch (error) { console.error('Error:', error); alert(error.response?.data?.error || 'Failed to receive'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try { await invoices.delete(id); fetchInvoices(); }
    catch (error) { console.error('Error:', error); alert(error.response?.data?.error || 'Failed to delete'); }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  if (!currentLocation) return <div className="text-center py-12"><p className="text-gray-500">Please select a location.</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Invoices</h1>
        <Link to="/invoices/new" className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />New Invoice
        </Link>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="border rounded-lg px-4 py-2">
            <option value="">All Vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-4 py-2">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="received">Received</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
        ) : invoiceList.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No invoices found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoiceList.map(inv => (
                <tr key={inv.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{inv.vendor_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{inv.invoice_date}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${inv.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {inv.status === 'received' ? <Check className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    {inv.status === 'pending' && (
                      <button onClick={() => handleReceive(inv.id)} className="text-green-600 hover:text-green-700 text-sm">Receive</button>
                    )}
                    <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-700 text-sm">Edit</Link>
                    {inv.status !== 'received' && (
                      <button onClick={() => handleDelete(inv.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4 inline" /></button>
                    )}
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
