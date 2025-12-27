import { useState, useEffect } from 'react';
import { useLocation } from '../context/LocationContext';
import { mappings, products as productsApi } from '../services/api';
import { Link as LinkIcon, Trash2, Plus, AlertTriangle } from 'lucide-react';

export default function Mappings() {
  const { currentLocation } = useLocation();
  const [mappingList, setMappingList] = useState([]);
  const [unmapped, setUnmapped] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUnmapped, setSelectedUnmapped] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('');

  useEffect(() => { fetchMappings(); fetchProducts(); if (currentLocation) fetchUnmapped(); }, [currentLocation]);

  const fetchMappings = async () => {
    try { setLoading(true); const response = await mappings.getAll(); setMappingList(response.data); }
    catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const fetchUnmapped = async () => {
    try { const response = await mappings.getUnmapped(currentLocation.id); setUnmapped(response.data); }
    catch (error) { console.error('Error:', error); }
  };

  const fetchProducts = async () => {
    try { const response = await productsApi.getAll(); setProducts(response.data); }
    catch (error) { console.error('Error:', error); }
  };

  const handleCreateMapping = async () => {
    if (!selectedUnmapped || !selectedProduct) return;
    try {
      await mappings.create({ pos_item_name: selectedUnmapped.pos_item_name, pos_size: selectedUnmapped.pos_size, product_id: selectedProduct });
      setShowModal(false);
      setSelectedUnmapped(null);
      setSelectedProduct('');
      fetchMappings();
      fetchUnmapped();
    } catch (error) { console.error('Error:', error); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this mapping?')) return;
    try { await mappings.delete(id); fetchMappings(); }
    catch (error) { console.error('Error:', error); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Product Mappings</h1>
      </div>

      {/* Unmapped Products Alert */}
      {unmapped.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="font-medium text-yellow-800">{unmapped.length} Unmapped Products</h3>
          </div>
          <p className="text-sm text-yellow-700 mb-3">These products from sales imports need to be mapped to system products:</p>
          <div className="space-y-2">
            {unmapped.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3">
                <div>
                  <p className="font-medium text-gray-900">{item.pos_item_name}</p>
                  <p className="text-sm text-gray-500">Size: {item.pos_size || 'N/A'} | {item.occurrence_count} occurrences</p>
                </div>
                <button onClick={() => { setSelectedUnmapped(item); setShowModal(true); }} className="flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                  <LinkIcon className="h-4 w-4 mr-1" />Map
                </button>
              </div>
            ))}
            {unmapped.length > 5 && <p className="text-sm text-yellow-600">+{unmapped.length - 5} more</p>}
          </div>
        </div>
      )}

      {/* Existing Mappings */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Existing Mappings</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
        ) : mappingList.length === 0 ? (
          <div className="text-center py-12">
            <LinkIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No mappings yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">POS Item Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">POS Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Maps To</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mappingList.map(mapping => (
                <tr key={mapping.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{mapping.pos_item_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{mapping.pos_size || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <LinkIcon className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{mapping.product_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleDelete(mapping.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mapping Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Map Product</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{selectedUnmapped?.pos_item_name}</p>
              <p className="text-sm text-gray-500">Size: {selectedUnmapped?.pos_size || 'N/A'}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Map to Product</label>
              <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option value="">Select a product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.size ? `(${p.size})` : ''}</option>)}
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => { setShowModal(false); setSelectedUnmapped(null); setSelectedProduct(''); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateMapping} disabled={!selectedProduct} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Create Mapping</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
