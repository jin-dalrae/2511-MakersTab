import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  LogOut, 
  Users, 
  DollarSign, 
  Receipt, 
  TrendingUp,
  Coffee,
  Salad,
  Wine,
  ShoppingBag,
  LayoutDashboard,
  Menu as MenuIcon,
  Trash2,
  Plus
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_cafe-wallet-2/artifacts/d2wwykae_makerstab.svg';

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [todayExpenses, setTodayExpenses] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    category: 'meal',
    price: '',
    description: ''
  });
  const [cafeItems, setCafeItems] = useState([]);
  const [scraperSettings, setScraperSettings] = useState(null);
  const [scraping, setScraping] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, usersRes, todayRes, menuRes, cafeItemsRes, scraperSettingsRes] = await Promise.all([
        axios.get(`${API}/admin/statistics`, { headers }),
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/today-expenses`, { headers }),
        axios.get(`${API}/menu`),
        axios.get(`${API}/admin/cafe-items-table`, { headers }),
        axios.get(`${API}/admin/scraper-settings`, { headers })
      ]);

      setStatistics(statsRes.data);
      setUsers(usersRes.data);
      setTodayExpenses(todayRes.data);
      setMenuItems(menuRes.data);
      setCafeItems(cafeItemsRes.data.items || []);
      setScraperSettings(scraperSettingsRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
      if (error.response?.status === 403) {
        toast.error('Admin access required');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/menu`, {
        ...newMenuItem,
        price: parseFloat(newMenuItem.price)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Menu item added successfully!');
      setNewMenuItem({ name: '', category: 'meal', price: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to add menu item');
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/menu/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Menu item deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete menu item');
    }
  };

  const handleManualScrape = async () => {
    setScraping(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/admin/scrape-menu`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        toast.success(`Menu scraped successfully! ${response.data.total_items} items found.`);
        fetchData();
      } else {
        toast.error(`Scraping failed: ${response.data.error}`);
      }
    } catch (error) {
      toast.error('Failed to trigger menu scrape');
    } finally {
      setScraping(false);
    }
  };

  const handleToggleAutoScrape = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/scraper-settings`, {
        auto_scrape_enabled: !scraperSettings.auto_scrape_enabled,
        scrape_time: scraperSettings.scrape_time || '04:00'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Auto-scraping ${!scraperSettings.auto_scrape_enabled ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/admin/users/${userId}/toggle-admin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User admin status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}? This will also delete all their receipts and transactions.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const categoryColors = {
    meal: '#22c55e',
    salad: '#84cc16',
    drinks: '#06b6d4',
    convenience: '#f59e0b',
    other: '#8b5cf6'
  };

  const categoryIcons = {
    meal: Coffee,
    salad: Salad,
    drinks: Wine,
    convenience: ShoppingBag
  };

  const categoryData = statistics ? Object.entries(statistics.category_stats).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    count: value.count,
    revenue: parseFloat(value.revenue.toFixed(2))
  })) : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
        <div className="text-xl font-medium text-green-700">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-lg border-b border-green-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-200">
              <img src={LOGO_URL} alt="MakersTab" className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800" style={{fontFamily: 'Space Grotesk'}}>MakersTab Admin</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Welcome, {user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 text-sm"
              data-testid="back-to-user-button"
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">My Dashboard</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={onLogout}
              className="gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 shadow-md w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm" data-testid="overview-tab">
              <LayoutDashboard className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm" data-testid="users-tab">
              <Users className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="today" className="text-xs sm:text-sm" data-testid="today-tab">
              <Receipt className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Today</span>
            </TabsTrigger>
            <TabsTrigger value="menu" className="text-xs sm:text-sm" data-testid="menu-tab">
              <MenuIcon className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Menu</span>
            </TabsTrigger>
            <TabsTrigger value="cafe-menu" className="text-xs sm:text-sm" data-testid="cafe-menu-tab">
              <Coffee className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Cafe Menu</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6" data-testid="overview-content">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0 shadow-xl">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm opacity-90">Total Users</p>
                      <p className="text-2xl sm:text-3xl font-bold">{statistics?.total_users || 0}</p>
                    </div>
                    <Users className="w-8 h-8 sm:w-12 sm:h-12 opacity-80 mt-2 sm:mt-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm opacity-90">Total Revenue</p>
                      <p className="text-2xl sm:text-3xl font-bold">${statistics?.total_revenue.toFixed(0) || 0}</p>
                    </div>
                    <DollarSign className="w-8 h-8 sm:w-12 sm:h-12 opacity-80 mt-2 sm:mt-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0 shadow-xl">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm opacity-90">Today's Revenue</p>
                      <p className="text-2xl sm:text-3xl font-bold">${statistics?.today_revenue.toFixed(0) || 0}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 opacity-80 mt-2 sm:mt-0" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-xl">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm opacity-90">Total Orders</p>
                      <p className="text-2xl sm:text-3xl font-bold">{statistics?.total_transactions || 0}</p>
                    </div>
                    <Receipt className="w-8 h-8 sm:w-12 sm:h-12 opacity-80 mt-2 sm:mt-0" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Category Revenue */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg" style={{fontFamily: 'Space Grotesk'}}>Revenue by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="revenue" fill="#22c55e" name="Revenue ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg" style={{fontFamily: 'Space Grotesk'}}>Order Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, count }) => `${name}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(categoryColors)[index % Object.values(categoryColors).length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" data-testid="users-content">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle style={{fontFamily: 'Space Grotesk'}}>All Users</CardTitle>
                <CardDescription>Manage registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 sm:p-4 font-semibold">Name</th>
                        <th className="text-left p-2 sm:p-4 font-semibold hidden sm:table-cell">Email</th>
                        <th className="text-left p-2 sm:p-4 font-semibold">Budget</th>
                        <th className="text-left p-2 sm:p-4 font-semibold hidden lg:table-cell">Joined</th>
                        <th className="text-left p-2 sm:p-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b hover:bg-green-50/50">
                          <td className="p-2 sm:p-4">
                            <div>
                              <p className="font-medium text-gray-800">{u.name}</p>
                              {u.is_admin && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Admin</span>}
                              <p className="text-xs text-gray-600 sm:hidden">{u.email}</p>
                            </div>
                          </td>
                          <td className="p-2 sm:p-4 hidden sm:table-cell text-gray-600">{u.email}</td>
                          <td className="p-2 sm:p-4 font-semibold text-green-600">${u.meal_plan_amount.toFixed(2)}</td>
                          <td className="p-2 sm:p-4 text-gray-600 hidden lg:table-cell text-sm">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-2 sm:p-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleAdmin(u.id)}
                                disabled={u.id === user.id}
                                className={`text-xs ${u.is_admin ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-700'}`}
                              >
                                {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                disabled={u.id === user.id}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Today's Expenses Tab */}
          <TabsContent value="today" data-testid="today-content">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle style={{fontFamily: 'Space Grotesk'}}>Today's Expenses</CardTitle>
                <CardDescription>
                  {todayExpenses?.count || 0} transactions totaling ${todayExpenses?.total_amount.toFixed(2) || '0.00'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayExpenses?.transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No transactions today yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {todayExpenses?.transactions.map((transaction) => {
                      const IconComponent = categoryIcons[transaction.category] || ShoppingBag;
                      return (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 sm:p-4 bg-white rounded-xl border border-gray-200"
                        >
                          <div className="flex items-center gap-3 sm:gap-4 flex-1">
                            <div
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${categoryColors[transaction.category]}20` }}
                            >
                              <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: categoryColors[transaction.category] }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm sm:text-base text-gray-800 truncate">{transaction.item_name}</p>
                              <p className="text-xs sm:text-sm text-gray-600 truncate">{transaction.user?.name || 'Unknown'}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base sm:text-lg font-bold text-gray-800">
                              ${(transaction.price * transaction.quantity).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-600 capitalize">{transaction.category}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Management Tab */}
          <TabsContent value="menu" data-testid="menu-content">
            <div className="space-y-4 sm:space-y-6">
              {/* Add Menu Item Form */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle style={{fontFamily: 'Space Grotesk'}}>Add Menu Item</CardTitle>
                  <CardDescription>Create new items for the menu</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddMenuItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="item-name" className="text-sm">Item Name</Label>
                      <Input
                        id="item-name"
                        placeholder="Chicken Sandwich"
                        value={newMenuItem.name}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category" className="text-sm">Category</Label>
                      <select
                        id="category"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        value={newMenuItem.category}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, category: e.target.value })}
                      >
                        <option value="meal">Meal</option>
                        <option value="salad">Salad</option>
                        <option value="drinks">Drinks</option>
                        <option value="convenience">Convenience</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="price" className="text-sm">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="9.99"
                        value={newMenuItem.price}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description" className="text-sm">Description</Label>
                      <Input
                        id="description"
                        placeholder="Delicious grilled chicken..."
                        value={newMenuItem.description}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 gap-2">
                        <Plus className="w-4 h-4" />
                        Add Item
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Menu Items List */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle style={{fontFamily: 'Space Grotesk'}}>Menu Items</CardTitle>
                  <CardDescription>{menuItems.length} items in menu</CardDescription>
                </CardHeader>
                <CardContent>
                  {menuItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Coffee className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No menu items yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {menuItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg duration-300"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{item.name}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMenuItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full capitalize">
                              {item.category}
                            </span>
                            <span className="font-bold text-green-600 text-sm sm:text-base">${item.price.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
