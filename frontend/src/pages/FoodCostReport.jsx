import { useState, useEffect } from 'react';
import { useLocation } from '../context/LocationContext';
import { reports } from '../services/api';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  Calendar
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

export default function FoodCostReport() {
  const { currentLocation } = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (currentLocation) {
      fetchReport();
    }
  }, [currentLocation, startDate, endDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await reports.getFoodCost({
        location_id: currentLocation.id,
        start_date: startDate,
        end_date: endDate
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
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
        <p className="text-gray-500">Please select a location to view the report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actual vs Theoretical Food Cost</h1>
          <p className="text-gray-500">Analyze food cost variance and identify problem areas</p>
        </div>
        <button className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50">
          <Download className="h-4 w-4 mr-2" />
          Export
        </button>
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>
          <button
            onClick={fetchReport}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Update Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-6">
              <p className="text-sm font-medium text-gray-500">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.summary?.total_sales)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {data.summary?.total_products_sold?.toLocaleString()} items sold
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <p className="text-sm font-medium text-gray-500">Theoretical Food Cost</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.summary?.theoretical_food_cost)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {data.summary?.theoretical_food_cost_percent}% of sales
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <p className="text-sm font-medium text-gray-500">Actual Food Cost</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.summary?.actual_food_cost)}
              </p>
              <p className={`text-sm mt-1 ${
                parseFloat(data.summary?.actual_food_cost_percent) > 32 ? 'text-red-600' : 'text-green-600'
              }`}>
                {data.summary?.actual_food_cost_percent}% of sales
              </p>
            </div>

            <div className={`rounded-xl border p-6 ${
              data.summary?.variance_status === 'high' ? 'bg-red-50 border-red-200' :
              data.summary?.variance_status === 'moderate' ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}>
              <p className="text-sm font-medium text-gray-500">Variance</p>
              <p className={`text-2xl font-bold mt-1 ${
                parseFloat(data.summary?.variance_percent) > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {parseFloat(data.summary?.variance_percent) > 0 ? '+' : ''}{data.summary?.variance_percent}%
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatCurrency(Math.abs(data.summary?.variance_dollars))}
                {parseFloat(data.summary?.variance_dollars) > 0 ? ' over' : ' under'}
              </p>
            </div>
          </div>

          {/* Inventory Breakdown */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Food Cost Calculation</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Beginning Inventory</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(data.inventory?.beginning_value)}
                </p>
                {data.inventory?.beginning_count_date && (
                  <p className="text-xs text-gray-400">as of {data.inventory.beginning_count_date}</p>
                )}
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">+ Purchases</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(data.inventory?.purchases)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">- Ending Inventory</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(data.inventory?.ending_value)}
                </p>
                {data.inventory?.ending_count_date && (
                  <p className="text-xs text-gray-400">as of {data.inventory.ending_count_date}</p>
                )}
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-500">= Actual Food Cost</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(data.summary?.actual_food_cost)}
                </p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost by Category */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Category</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.by_category?.filter(c => c.theoretical_usage_cost > 0) || []}
                      dataKey="theoretical_usage_cost"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.by_category?.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Usage Items */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Usage Items by Cost</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.top_usage_items?.slice(0, 8) || []}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                    <YAxis
                      dataKey="item_name"
                      type="category"
                      width={120}
                      fontSize={12}
                      tickFormatter={(n) => n.length > 15 ? n.substring(0, 15) + '...' : n}
                    />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="theoretical_cost" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Item Usage Table */}
          <div className="bg-white rounded-xl border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Item Usage Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Theoretical Usage</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.top_usage_items?.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.item_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.category_name}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {item.theoretical_usage?.toFixed(2)} {item.unit_of_measure}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-500">
                        {formatCurrency(item.cost_per_unit)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(item.theoretical_cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
            <div className="space-y-3">
              {parseFloat(data.summary?.variance_percent) > 5 && (
                <div className="flex items-start p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">High Variance Alert</p>
                    <p className="text-sm text-red-700">
                      Your actual food cost is {data.summary?.variance_percent}% higher than theoretical.
                      This could indicate waste, theft, or portion control issues.
                    </p>
                  </div>
                </div>
              )}
              {parseFloat(data.summary?.actual_food_cost_percent) > 32 && (
                <div className="flex items-start p-3 bg-yellow-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Food Cost Above Target</p>
                    <p className="text-sm text-yellow-700">
                      Your food cost percentage ({data.summary?.actual_food_cost_percent}%) is above the industry target of 28-32%.
                      Review your pricing and purchasing strategies.
                    </p>
                  </div>
                </div>
              )}
              {parseFloat(data.summary?.variance_percent) <= 2 && (
                <div className="flex items-start p-3 bg-green-50 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Good Variance Control</p>
                    <p className="text-sm text-green-700">
                      Your variance is within acceptable limits. Continue monitoring to maintain this performance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No data available for the selected period.</p>
        </div>
      )}
    </div>
  );
}
