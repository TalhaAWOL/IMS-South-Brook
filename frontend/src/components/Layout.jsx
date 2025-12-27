import { useState } from 'react';
import { Outlet, Link, useLocation as useRouterLocation } from 'react-router-dom';
import { useLocation } from '../context/LocationContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronDown,
  MapPin,
  Boxes,
  ClipboardList,
  Receipt,
  Link as LinkIcon,
  ChefHat,
  Utensils
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Package },
  {
    name: 'Recipes',
    icon: ChefHat,
    children: [
      { name: 'Items', href: '/items', icon: Boxes },
      { name: 'Preps', href: '/preps', icon: Utensils },
      { name: 'Products', href: '/products', icon: ShoppingCart },
      { name: 'Product Mappings', href: '/mappings', icon: LinkIcon },
    ]
  },
  {
    name: 'Purchases',
    icon: Receipt,
    children: [
      { name: 'Invoices', href: '/invoices', icon: FileText },
    ]
  },
  {
    name: 'Sales',
    icon: ShoppingCart,
    children: [
      { name: 'Sales History', href: '/sales', icon: FileText },
      { name: 'Upload Sales Report', href: '/sales/upload', icon: FileText },
    ]
  },
  { name: 'Inventory Counts', href: '/counts', icon: ClipboardList },
  { name: 'Food Cost Report', href: '/reports/food-cost', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const routerLocation = useRouterLocation();
  const { locations, currentLocation, selectLocation } = useLocation();
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  const toggleMenu = (name) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isActive = (href) => {
    if (href === '/') return routerLocation.pathname === '/';
    return routerLocation.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">IMS</span>
            </div>
            <span className="font-semibold text-gray-900">Inventory</span>
          </Link>
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Location Selector */}
        <div className="p-4 border-b">
          <div className="relative">
            <button
              onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium truncate">
                  {currentLocation?.name || 'Select Location'}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            {locationDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10">
                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => {
                      selectLocation(location);
                      setLocationDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                      currentLocation?.id === location.id ? 'bg-red-50 text-red-700' : ''
                    }`}
                  >
                    {location.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <div key={item.name}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedMenus[item.name] ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedMenus[item.name] && (
                    <div className="ml-8 space-y-1 mt-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          to={child.href}
                          className={`flex items-center space-x-3 px-3 py-2 text-sm rounded-lg ${
                            isActive(child.href)
                              ? 'bg-red-50 text-red-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <child.icon className="h-4 w-4" />
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg ${
                    isActive(item.href)
                      ? 'bg-red-50 text-red-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex items-center h-16 bg-white border-b px-4 lg:px-6">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 flex items-center justify-between ml-4 lg:ml-0">
            <h1 className="text-lg font-semibold text-gray-900">
              {currentLocation?.name || 'Select a Location'}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
