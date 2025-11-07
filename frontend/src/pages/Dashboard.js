import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  LogOut, 
  Upload, 
  Camera, 
  Receipt, 
  TrendingUp, 
  History, 
  DollarSign,
  Coffee,
  Salad,
  Wine,
  ShoppingBag
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_cafe-wallet-2/artifacts/d2wwykae_makerstab.svg';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [uploading, setUploading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [analyticsRes, receiptsRes, transactionsRes, menuRes] = await Promise.all([
        axios.get(`${API}/analytics`, { headers }),
        axios.get(`${API}/receipts`, { headers }),
        axios.get(`${API}/transactions`, { headers }),
        axios.get(`${API}/menu`)
      ]);

      setAnalytics(analyticsRes.data);
      setReceipts(receiptsRes.data);
      setTransactions(transactionsRes.data);
      setMenuItems(menuRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/receipts/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Receipt processed successfully!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = () => {
    document.getElementById('camera-input').click();
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

  const spentPercentage = analytics ? (analytics.total_spent / user.meal_plan_amount) * 100 : 0;
  const remainingBudget = user.meal_plan_amount - (analytics?.total_spent || 0);

  const pieData = analytics ? Object.entries(analytics.spending_by_category).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: parseFloat(value.toFixed(2))
  })) : [];

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
              <h1 className="text-lg sm:text-xl font-bold text-gray-800" style={{fontFamily: 'Space Grotesk'}}>MakersTab</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Welcome, {user.name}</p>
            </div>
          </div>
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

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 shadow-md w-full sm:w-auto overflow-x-auto flex">
            <TabsTrigger value="overview" data-testid="overview-tab" className="text-xs sm:text-sm flex-1 sm:flex-initial">Overview</TabsTrigger>
            <TabsTrigger value="upload" data-testid="upload-tab" className="text-xs sm:text-sm flex-1 sm:flex-initial">Upload</TabsTrigger>
            <TabsTrigger value="history" data-testid="history-tab" className="text-xs sm:text-sm flex-1 sm:flex-initial">History</TabsTrigger>
            <TabsTrigger value="menu" data-testid="menu-tab" className="text-xs sm:text-sm flex-1 sm:flex-initial">Menu</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6" data-testid="overview-content">
            {/* Budget Overview */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{fontFamily: 'Space Grotesk'}}>
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Meal Plan Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Spent</p>
                    <p className="text-3xl font-bold text-green-600">${analytics?.total_spent.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Remaining</p>
                    <p className="text-3xl font-bold text-gray-800">${remainingBudget.toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Budget Usage</span>
                    <span>{spentPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={spentPercentage} className="h-3" />
                </div>
                <div className="text-xs text-gray-500">
                  Total Budget: ${user.meal_plan_amount.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm opacity-90">Total Transactions</p>
                      <p className="text-2xl sm:text-3xl font-bold">{analytics?.transactions_count || 0}</p>
                    </div>
                    <Receipt className="w-8 h-8 sm:w-12 sm:h-12 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0 shadow-xl">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm opacity-90">Receipts Scanned</p>
                      <p className="text-2xl sm:text-3xl font-bold">{receipts.length}</p>
                    </div>
                    <Camera className="w-8 h-8 sm:w-12 sm:h-12 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0 shadow-xl">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm opacity-90">Avg Per Day</p>
                      <p className="text-2xl sm:text-3xl font-bold">
                        ${analytics?.spending_trend.length > 0 
                          ? (analytics.total_spent / analytics.spending_trend.length).toFixed(2)
                          : '0.00'
                        }
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            {analytics && pieData.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg" style={{fontFamily: 'Space Grotesk'}}>Spending by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: $${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(categoryColors)[index % Object.values(categoryColors).length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" data-testid="upload-content">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle style={{fontFamily: 'Space Grotesk'}}>Scan Receipt</CardTitle>
                <CardDescription>Upload a photo or take a picture of your receipt</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Upload */}
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-green-300 rounded-2xl cursor-pointer hover:border-green-500 hover:bg-green-50/50 duration-300 bg-white"
                    data-testid="file-upload-area"
                  >
                    <Upload className="w-12 h-12 text-green-600 mb-4" />
                    <p className="text-lg font-semibold text-gray-800 mb-2">Upload from Device</p>
                    <p className="text-sm text-gray-600 text-center">Click to select a receipt image</p>
                    <input
                      id="file-upload"
                      data-testid="file-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>

                  {/* Camera Capture */}
                  <button
                    onClick={handleCameraCapture}
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-orange-300 rounded-2xl cursor-pointer hover:border-orange-500 hover:bg-orange-50/50 duration-300 bg-white"
                    disabled={uploading}
                    data-testid="camera-capture-button"
                  >
                    <Camera className="w-12 h-12 text-orange-600 mb-4" />
                    <p className="text-lg font-semibold text-gray-800 mb-2">Take Photo</p>
                    <p className="text-sm text-gray-600 text-center">Use your camera to capture receipt</p>
                  </button>
                  <input
                    id="camera-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>

                {uploading && (
                  <div className="text-center p-8 bg-green-50 rounded-2xl">
                    <div className="animate-pulse text-green-600 font-semibold">Processing receipt with AI...</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" data-testid="history-content">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg" style={{fontFamily: 'Space Grotesk'}}>Transaction History</CardTitle>
                <CardDescription className="text-sm">Your recent purchases at Makers Cafe (Most Recent First)</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet. Upload a receipt to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {(() => {
                      // Calculate initial balance (current amount + all spent)
                      const totalSpentSoFar = transactions.reduce((sum, t) => sum + (t.price * t.quantity), 0);
                      let startingBalance = user.meal_plan_amount + totalSpentSoFar;
                      
                      return transactions.map((transaction, index) => {
                        const IconComponent = categoryIcons[transaction.category] || ShoppingBag;
                        const totalSpent = transaction.price * transaction.quantity;
                        
                        // Balance before this transaction
                        const balanceBefore = startingBalance;
                        // Subtract this transaction
                        startingBalance -= totalSpent;
                        const balanceAfter = startingBalance;
                        
                        return (
                        <div
                          key={transaction.id}
                          className="p-3 sm:p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md duration-300"
                          data-testid="transaction-item"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${categoryColors[transaction.category]}20` }}
                              >
                                <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: categoryColors[transaction.category] }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm sm:text-base text-gray-800 truncate">{transaction.item_name}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded capitalize">
                                    {transaction.category}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    Qty: {transaction.quantity}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    {new Date(transaction.transaction_date).toLocaleDateString()} {new Date(transaction.transaction_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-base sm:text-lg font-bold text-red-600">
                                -${totalSpent.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                Remaining: <span className={`font-semibold ${balanceAfter < 50 ? 'text-red-600' : 'text-green-600'}`}>${Math.max(0, balanceAfter).toFixed(2)}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                      });
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" data-testid="menu-content">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle style={{fontFamily: 'Space Grotesk'}}>Makers Cafe Menu</CardTitle>
                <CardDescription>Available items today</CardDescription>
              </CardHeader>
              <CardContent>
                {menuItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Coffee className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No menu items available. Check back later!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menuItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg duration-300"
                        data-testid="menu-item"
                      >
                        <h3 className="font-semibold text-gray-800 mb-2">{item.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full capitalize">
                            {item.category}
                          </span>
                          <span className="font-bold text-green-600">${item.price.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
