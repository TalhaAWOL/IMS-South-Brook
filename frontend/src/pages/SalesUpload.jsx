import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { sales, products, mappings } from '../services/api';
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function SalesUpload() {
  const { currentLocation } = useLocation();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showUnmapped, setShowUnmapped] = useState(true);
  const [productList, setProductList] = useState([]);
  const [mappingModal, setMappingModal] = useState(null);
  const [deductInventory, setDeductInventory] = useState(true);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(null);
    setError(null);
    setSuccess(null);

    // Preview the file
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await sales.preview(formData);
      setPreview(response.data);

      // Fetch products for mapping
      const productsRes = await products.getAll();
      setProductList(productsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!currentLocation || !file) return;

    try {
      setImporting(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('location_id', currentLocation.id);
      formData.append('deduct_inventory', deductInventory);

      const response = await sales.import(formData);
      setSuccess(response.data);
      setPreview(null);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import sales');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateMapping = async (posItemName, posSize, productId) => {
    try {
      await mappings.create({
        pos_item_name: posItemName,
        pos_size: posSize,
        product_id: productId
      });

      // Update preview
      setPreview(prev => ({
        ...prev,
        mappedCount: prev.mappedCount + 1,
        unmappedCount: prev.unmappedCount - 1,
        products: prev.products.map(p =>
          p.pos_item_name === posItemName && p.pos_size === posSize
            ? { ...p, is_mapped: true, mapped_product_id: productId }
            : p
        ),
        unmappedProducts: prev.unmappedProducts.filter(
          p => !(p.pos_item_name === posItemName && p.pos_size === posSize)
        )
      }));

      setMappingModal(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create mapping');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  if (!currentLocation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please select a location to upload sales.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Sales Report</h1>
        <p className="text-gray-500">
          Upload your Milton Itemized Sales report to import sales data and update inventory.
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl border p-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer"
          >
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">
              {file ? file.name : 'Drop your Excel file here or click to browse'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports .xls and .xlsx files (Milton Itemized Sales format)
            </p>
          </label>
        </div>

        {loading && (
          <div className="mt-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <span className="ml-2 text-gray-600">Parsing file...</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Import Successful!</p>
              <div className="text-green-700 mt-2 space-y-1">
                <p>Total records imported: {success.total_records}</p>
                <p>Mapped products: {success.mapped_count}</p>
                <p>Unmapped products: {success.unmapped_count}</p>
                {success.inventory_deductions > 0 && (
                  <p>Inventory deductions made: {success.inventory_deductions}</p>
                )}
                <p>Date range: {success.date_range?.start} to {success.date_range?.end}</p>
              </div>
              <div className="mt-4 space-x-2">
                <button
                  onClick={() => navigate('/sales')}
                  className="text-sm font-medium text-green-700 hover:text-green-800"
                >
                  View Sales History
                </button>
                <button
                  onClick={() => {
                    setSuccess(null);
                    setFile(null);
                  }}
                  className="text-sm font-medium text-gray-600 hover:text-gray-700"
                >
                  Upload Another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <p className="text-sm text-gray-500">Date Range</p>
              <p className="font-medium text-gray-900">
                {preview.dateRange?.start} - {preview.dateRange?.end}
              </p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="font-medium text-gray-900">{formatCurrency(preview.totalValue)}</p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <p className="text-sm text-gray-500">Items Sold</p>
              <p className="font-medium text-gray-900">{preview.totalQuantity?.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <p className="text-sm text-gray-500">Products Found</p>
              <p className="font-medium text-gray-900">{preview.productCount}</p>
            </div>
          </div>

          {/* Mapping Status */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Mapping Status</h3>

            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">
                  Mapped: {preview.mappedCount} products
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">
                  Unmapped: {preview.unmappedCount} products
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div
                className="bg-green-500 h-4 rounded-full transition-all"
                style={{ width: `${(preview.mappedCount / preview.productCount) * 100}%` }}
              ></div>
            </div>

            {/* Unmapped Products */}
            {preview.unmappedCount > 0 && (
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowUnmapped(!showUnmapped)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="font-medium text-gray-900">
                      {preview.unmappedCount} products need mapping
                    </span>
                  </div>
                  {showUnmapped ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>

                {showUnmapped && (
                  <div className="mt-4 space-y-2">
                    {preview.unmappedProducts?.map((product, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-yellow-50 rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{product.pos_item_name}</p>
                          <p className="text-sm text-gray-500">
                            Size: {product.pos_size || 'N/A'} | Qty: {product.total_quantity} | Value: {formatCurrency(product.total_value)}
                          </p>
                        </div>
                        <button
                          onClick={() => setMappingModal(product)}
                          className="flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Map
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* All Products Preview */}
          <div className="bg-white rounded-xl border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Products in Report</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.products?.map((product, index) => (
                    <tr key={index} className={!product.is_mapped ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-3 text-sm text-gray-900">{product.pos_item_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{product.pos_size || '-'}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">{product.total_quantity}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">{formatCurrency(product.total_value)}</td>
                      <td className="px-6 py-3 text-center">
                        {product.is_mapped ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            <Check className="h-3 w-3 mr-1" />
                            Mapped
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Unmapped
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Options */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Options</h3>

            <label className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                checked={deductInventory}
                onChange={(e) => setDeductInventory(e.target.checked)}
                className="h-4 w-4 text-red-600 rounded border-gray-300"
              />
              <div>
                <span className="font-medium text-gray-900">Deduct inventory based on recipes</span>
                <p className="text-sm text-gray-500">
                  Automatically subtract ingredient usage from inventory for mapped products
                </p>
              </div>
            </label>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Sales Data
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Modal */}
      {mappingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Map Product</h3>
              <button onClick={() => setMappingModal(null)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{mappingModal.pos_item_name}</p>
              <p className="text-sm text-gray-500">Size: {mappingModal.pos_size || 'N/A'}</p>
            </div>

            <p className="text-sm text-gray-600 mb-3">Select a product to map to:</p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {productList.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleCreateMapping(
                    mappingModal.pos_item_name,
                    mappingModal.pos_size,
                    product.id
                  )}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      Size: {product.size || 'N/A'} | Cost: {formatCurrency(product.theoretical_cost)}
                    </p>
                  </div>
                  <LinkIcon className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
