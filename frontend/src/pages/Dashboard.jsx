import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import { dashboard } from '../services/api';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  ShoppingCart,
  FileText,
  ArrowRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

function KPICard({ title, value, subtitle, icon: Icon, trend, trendUp, status }) {
  const statusColors = {
    good: 'bg-green-50 border-green-200',
    moderate: 'bg-yellow-50 border-yellow-200',
    high: 'bg-red-50 border-red-200'
  };

  return (
    <div className={`bg-white rounded-xl border p-6 ${status ? statusColors[status] : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${status === 'high' ? 'bg-red-100' : status === 'moderate' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
          <Icon className={`h-6 w-6 ${status === 'high' ? 'text-red-600' : status === 'moderate' ? 'text-yellow-600' : 'text-gray-600'}`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center mt-3 text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trendUp ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

function AlertCard({ title, count, items, linkTo, type = 'warning' }) {
  const colors = {
    warning: 'border-yellow-200 bg-yellow-50',
    danger: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50'
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[type]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <AlertTriangle className={`h-5 w-5 ${type === 'danger' ? 'text-red-600' : 'text-yellow-600'}`} />
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${type === 'danger' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
          {count}
        </span>
      </div>
      <ul className="space-y-1 text-sm text-gray-600 mb-3">
        {items?.slice(0, 3).map((item, i) => (
          <li key={i} className="truncate">{item}</li>
        ))}
        {items?.length > 3 && <li className="text-gray-400">+{items.length - 3} more</li>}
      </ul>
      <Link to={linkTo} className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center">
        View all <ArrowRight className="h-4 w-4 ml-1" />
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const { currentLocation } = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (currentLocation) {
      fetchDashboard();
    }
  }, [currentLocation, days]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await dashboard.get(currentLocation.id, { days });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentLocation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please select a location to view the dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">
            {data?.period?.start_date} to {data?.period?.end_date}
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Sales"
          value={formatCurrency(data?.kpis?.total_sales)}
          subtitle={`${data?.kpis?.total_products_sold || 0} items sold`}
          icon={DollarSign}
        />
        <KPICard
          title="Actual Food Cost %"
          value={`${data?.kpis?.actual_food_cost_percent || 0}%`}
          subtitle="Target: 28-32%"
          icon={TrendingUp}
          status={data?.kpis?.food_cost_status}
        />
        <KPICard
          title="Theoretical Food Cost %"
          value={`${data?.kpis?.theoretical_food_cost_percent || 0}%`}
          subtitle="Based on recipes"
          icon={TrendingDown}
        />
        <KPICard
          title="Variance"
          value={`${data?.kpis?.variance_percent || 0}%`}
          subtitle={parseFloat(data?.kpis?.variance_percent) > 0 ? 'Over theoretical' : 'Under theoretical'}
          icon={AlertTriangle}
          status={data?.kpis?.variance_status}
        />
      </div>

      {/* Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Inventory Value"
          value={formatCurrency(data?.inventory?.total_value)}
          subtitle={`${data?.inventory?.total_items || 0} items tracked`}
          icon={Package}
        />
        <KPICard
          title="Total Purchases"
          value={formatCurrency(data?.purchases?.total_amount)}
          subtitle={`${data?.purchases?.invoice_count || 0} invoices`}
          icon={ShoppingCart}
        />
        <KPICard
          title="Low Stock Items"
          value={data?.alerts?.low_stock_count || 0}
          subtitle="Items below par level"
          icon={AlertTriangle}
          status={data?.alerts?.low_stock_count > 0 ? 'moderate' : 'good'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Sales Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.charts?.daily_sales || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="sale_date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  fontSize={12}
                />
                <YAxis tickFormatter={(value) => `$${value}`} fontSize={12} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="daily_sales"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Food Cost Trend */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Food Cost %</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.charts?.daily_sales || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="sale_date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  fontSize={12}
                />
                <YAxis tickFormatter={(value) => `${value}%`} fontSize={12} domain={[0, 50]} />
                <Tooltip
                  formatter={(value) => `${value}%`}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="food_cost_percent"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top Selling Products</h3>
          <Link to="/sales" className="text-sm text-red-600 hover:text-red-700">View all</Link>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.lists?.top_products?.slice(0, 10) || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                dataKey="product_name"
                type="category"
                width={150}
                fontSize={12}
                tickFormatter={(name) => name.length > 20 ? name.substring(0, 20) + '...' : name}
              />
              <Tooltip />
              <Bar dataKey="quantity_sold" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.alerts?.low_stock_count > 0 && (
          <AlertCard
            title="Low Stock Items"
            count={data.alerts.low_stock_count}
            items={data?.lists?.low_stock_items?.map(i => `${i.item_name}: ${i.current_quantity} ${i.unit_of_measure}`)}
            linkTo="/inventory"
            type="warning"
          />
        )}
        {data?.alerts?.unmapped_products_count > 0 && (
          <AlertCard
            title="Unmapped Products"
            count={data.alerts.unmapped_products_count}
            items={['Products from sales not linked to recipes']}
            linkTo="/mappings"
            type="warning"
          />
        )}
        {data?.alerts?.high_variance && (
          <AlertCard
            title="High Variance Alert"
            count="!"
            items={[`Variance is ${data.kpis.variance_percent}% above target`]}
            linkTo="/reports/food-cost"
            type="danger"
          />
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            <Link to="/invoices" className="text-sm text-red-600 hover:text-red-700">View all</Link>
          </div>
          <div className="space-y-3">
            {data?.recent_activity?.invoices?.length > 0 ? (
              data.recent_activity.invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{invoice.vendor_name}</p>
                    <p className="text-sm text-gray-500">#{invoice.invoice_number} - {invoice.invoice_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      invoice.status === 'received' ? 'bg-green-100 text-green-700' :
                      invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent invoices</p>
            )}
          </div>
        </div>

        {/* Recent Imports */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Sales Imports</h3>
            <Link to="/sales/upload" className="text-sm text-red-600 hover:text-red-700">Upload new</Link>
          </div>
          <div className="space-y-3">
            {data?.recent_activity?.imports?.length > 0 ? (
              data.recent_activity.imports.map((imp) => (
                <div key={imp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{imp.filename}</p>
                    <p className="text-sm text-gray-500">
                      {imp.date_range_start} to {imp.date_range_end}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(imp.total_sales_value)}</p>
                    <p className="text-sm text-gray-500">{imp.total_products_sold} items</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent imports</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
