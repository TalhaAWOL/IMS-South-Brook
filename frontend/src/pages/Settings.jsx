import { useState, useEffect } from 'react';
import { useLocation } from '../context/LocationContext';
import api, { vendors as vendorsApi, items as itemsApi, products as productsApi } from '../services/api';
import { Building, Users, Package, Tag, Plus, Edit, Trash2, Save } from 'lucide-react';

export default function Settings() {
  const { locations, currentLocation, refreshLocations } = useLocation();
  const [activeTab, setActiveTab] = useState('locations');
  const [vendors, setVendors] = useState([]);
  const [itemCategories, setItemCategories] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'vendors') { const res = await vendorsApi.getAll(); setVendors(res.data); }
      if (activeTab === 'item-categories') { const res = await itemsApi.getCategories(); setItemCategories(res.data); }
      if (activeTab === 'product-categories') { const res = await productsApi.getCategories(); setProductCategories(res.data); }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const openModal = (type, data = {}) => { setModalType(type); setFormData(data); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (modalType === 'vendor') {
        if (formData.id) { await vendorsApi.update(formData.id, formData); }
        else { await vendorsApi.create(formData); }
      } else if (modalType === 'item-category') {
        await api.post('/items/categories', formData);
      } else if (modalType === 'product-category') {
        await api.post('/products/categories', formData);
      } else if (modalType === 'location') {
        if (formData.id) { await api.put(`/locations/${formData.id}`, formData); }
        else { await api.post('/locations', { ...formData, organization_id: 1 }); }
        refreshLocations();
      }
      setShowModal(false);
      fetchData();
    } catch (error) { console.error('Error:', error); alert(error.response?.data?.error || 'Failed to save'); }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure?')) return;
    try {
      if (type === 'vendor') await vendorsApi.delete(id);
      fetchData();
    } catch (error) { console.error('Error:', error); }
  };

  const tabs = [
    { id: 'locations', label: 'Locations', icon: Building },
    { id: 'vendors', label: 'Vendors', icon: Users },
    { id: 'item-categories', label: 'Item Categories', icon: Package },
    { id: 'product-categories', label: 'Product Categories', icon: Tag },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Tabs */}
      <div className="bg-white rounded-xl border">
        <div className="border-b flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-4 text-sm font-medium whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
          ) : (
            <>
              {/* Locations */}
              {activeTab === 'locations' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900">Store Locations</h3>
                    <button onClick={() => openModal('location', { name: '', code: '', city: '', state: '' })} className="flex items-center text-sm text-red-600 hover:text-red-700">
                      <Plus className="h-4 w-4 mr-1" />Add Location
                    </button>
                  </div>
                  <div className="space-y-2">
                    {locations.map(loc => (
                      <div key={loc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{loc.name}</p>
                          <p className="text-sm text-gray-500">{loc.code} - {loc.city}, {loc.state}</p>
                        </div>
                        <button onClick={() => openModal('location', loc)} className="text-blue-600 hover:text-blue-700"><Edit className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vendors */}
              {activeTab === 'vendors' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900">Vendors</h3>
                    <button onClick={() => openModal('vendor', { name: '', code: '', contact_email: '', phone: '' })} className="flex items-center text-sm text-red-600 hover:text-red-700">
                      <Plus className="h-4 w-4 mr-1" />Add Vendor
                    </button>
                  </div>
                  <div className="space-y-2">
                    {vendors.map(vendor => (
                      <div key={vendor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{vendor.name}</p>
                          <p className="text-sm text-gray-500">{vendor.code} - {vendor.contact_email}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={() => openModal('vendor', vendor)} className="text-blue-600 hover:text-blue-700"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete('vendor', vendor.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Item Categories */}
              {activeTab === 'item-categories' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900">Item Categories</h3>
                    <button onClick={() => openModal('item-category', { name: '', description: '' })} className="flex items-center text-sm text-red-600 hover:text-red-700">
                      <Plus className="h-4 w-4 mr-1" />Add Category
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {itemCategories.map(cat => (
                      <div key={cat.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{cat.name}</p>
                        <p className="text-sm text-gray-500">{cat.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Categories */}
              {activeTab === 'product-categories' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900">Product Categories</h3>
                    <button onClick={() => openModal('product-category', { name: '', description: '' })} className="flex items-center text-sm text-red-600 hover:text-red-700">
                      <Plus className="h-4 w-4 mr-1" />Add Category
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {productCategories.map(cat => (
                      <div key={cat.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{cat.name}</p>
                        <p className="text-sm text-gray-500">{cat.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {formData.id ? 'Edit' : 'Add'} {modalType.replace('-', ' ')}
            </h3>
            <div className="space-y-4">
              {(modalType === 'location' || modalType === 'vendor') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <input type="text" value={formData.code || ''} onChange={(e) => setFormData({...formData, code: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </>
              )}
              {modalType === 'location' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" value={formData.city || ''} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                    <input type="text" value={formData.state || ''} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </div>
              )}
              {modalType === 'vendor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={formData.contact_email || ''} onChange={(e) => setFormData({...formData, contact_email: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </>
              )}
              {(modalType === 'item-category' || modalType === 'product-category') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input type="text" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                <Save className="h-4 w-4 mr-2" />Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
