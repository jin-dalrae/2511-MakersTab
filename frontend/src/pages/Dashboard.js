import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
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
  ShoppingBag,
  Users
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
  const [semesterInfo, setSemesterInfo] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [memo, setMemo] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [analyticsRes, receiptsRes, transactionsRes, menuRes, semesterRes] = await Promise.all([
        axios.get(`${API}/analytics`, { headers }),
        axios.get(`${API}/receipts`, { headers }),
        axios.get(`${API}/transactions`, { headers }),
        axios.get(`${API}/menu`),
        axios.get(`${API}/semester-info`, { headers })
      ]);

      setAnalytics(analyticsRes.data);
      setReceipts(receiptsRes.data);
      setTransactions(transactionsRes.data);
      setMenuItems(menuRes.data);
      setSemesterInfo(semesterRes.data);
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
      const response = await axios.post(`${API}/receipts/preview`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Show preview modal with extracted data
      setPreviewData(response.data);
      setShowPreview(true);
      setMemo('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/receipts/confirm`, {
        parsed_data: previewData.preview_data,
        ocr_text: previewData.ocr_text,
        memo: memo
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      toast.success('Receipt saved successfully!');
      setShowPreview(false);
      setPreviewData(null);
      setMemo('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewData(null);
    setMemo('');
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
          <div className="flex items-center gap-2">
            {user.is_admin && (
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/admin'}
                className="gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-300 text-sm"
                data-testid="admin-panel-button"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Panel</span>
              </Button>
            )}
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
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 shadow-md w-full sm:w-auto overflow-x-auto flex">
            <TabsTrigger value="overview" data-testid="overview-tab" className="text-xs sm:text-sm flex-1 sm:flex-initial">Overview</TabsTrigger>
            <TabsTrigger value="upload" data-testid="upload-tab" className="text-xs sm:text-sm flex-1 sm:flex-initial">Upload</TabsTrigger>
            <TabsTrigger value="history" data-testid="history-tab" className="text-xs sm:text-sm flex-1 sm:flex-initial">History</TabsTrigger>
            <TabsTrigger value="menu" data-testid="menu-tab" className="text-xs sm:text-sm flex-1 sm:flex-initial">Menu</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6" data-testid="overview-content">
            {/* Quick Upload Receipt Section */}
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-0 shadow-xl">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1" style={{fontFamily: 'Space Grotesk'}}>
                      Quick Upload Receipt
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Scan your receipt instantly with AI-powered OCR
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <label
                      htmlFor="quick-file-upload"
                      className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-orange-300 rounded-xl cursor-pointer hover:bg-orange-50 hover:border-orange-400 duration-300 shadow-md"
                      data-testid="quick-file-upload-btn"
                    >
                      <Upload className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-orange-700 text-sm">Upload</span>
                      <input
                        id="quick-file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    <button
                      onClick={handleCameraCapture}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl cursor-pointer hover:bg-orange-700 duration-300 shadow-md"
                      disabled={uploading}
                      data-testid="quick-camera-btn"
                    >
                      <Camera className="w-5 h-5" />
                      <span className="font-semibold text-sm">Camera</span>
                    </button>
                  </div>
                </div>
                {uploading && (
                  <div className="mt-4 text-center p-3 bg-white rounded-xl">
                    <div className="animate-pulse text-orange-600 font-semibold text-sm">Processing receipt with AI...</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Semester & Weekly Spending Card */}
            {semesterInfo && (
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-xl">
                <CardContent className="pt-4 sm:pt-6 space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        {semesterInfo.semester.charAt(0).toUpperCase() + semesterInfo.semester.slice(1)} Term
                        {semesterInfo.status === 'active' && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span>}
                        {semesterInfo.status === 'upcoming' && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Upcoming</span>}
                        {semesterInfo.status === 'ended' && <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">Ended</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {semesterInfo.weeks_remaining} weeks remaining • {semesterInfo.days_remaining} days left
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">Recommended This Week</p>
                      <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                        ${semesterInfo.recommended_weekly_spending.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Budget Health Indicator */}
                  <div className="pt-4 border-t border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">Budget Health</span>
                      <span className={`text-xs sm:text-sm font-semibold px-3 py-1 rounded-full ${
                        semesterInfo.budget_status === 'on_track' ? 'bg-green-100 text-green-700' :
                        semesterInfo.budget_status === 'over_budget' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {semesterInfo.status_message}
                      </span>
                    </div>
                    
                    {/* Progress bars comparison */}
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">Time Passed</span>
                          <span className="font-semibold text-gray-700">{semesterInfo.time_elapsed_percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{width: `${Math.min(semesterInfo.time_elapsed_percentage, 100)}%`}}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">Budget Used</span>
                          <span className="font-semibold text-gray-700">{semesterInfo.budget_used_percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              semesterInfo.budget_status === 'on_track' ? 'bg-green-500' :
                              semesterInfo.budget_status === 'over_budget' ? 'bg-red-500' :
                              'bg-yellow-500'
                            }`}
                            style={{width: `${Math.min(semesterInfo.budget_used_percentage, 100)}%`}}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Spending comparison */}
                    <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                      <div className="p-2 bg-white/60 rounded-lg">
                        <p className="text-gray-600 mb-1">Ideal Weekly</p>
                        <p className="font-bold text-gray-800">${semesterInfo.ideal_weekly_rate.toFixed(2)}</p>
                      </div>
                      <div className="p-2 bg-white/60 rounded-lg">
                        <p className="text-gray-600 mb-1">Your Average</p>
                        <p className={`font-bold ${
                          semesterInfo.actual_weekly_rate > semesterInfo.ideal_weekly_rate ? 'text-red-600' :
                          semesterInfo.actual_weekly_rate < semesterInfo.ideal_weekly_rate * 0.8 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          ${semesterInfo.actual_weekly_rate.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Overview */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg" style={{fontFamily: 'Space Grotesk'}}>
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Meal Plan Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Spent</p>
                    <p className="text-xl sm:text-3xl font-bold text-red-600">${analytics?.total_spent.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Remaining</p>
                    <p className={`text-xl sm:text-3xl font-bold ${user.meal_plan_amount < 50 ? 'text-red-600' : 'text-green-600'}`}>
                      ${user.meal_plan_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-gray-500 text-center p-2 bg-gray-50 rounded-lg">
                  Original Budget: ${(user.meal_plan_amount + (analytics?.total_spent || 0)).toFixed(2)}
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
                    {transactions.map((transaction, index) => {
                      const IconComponent = categoryIcons[transaction.category] || ShoppingBag;
                      const totalSpent = transaction.price * transaction.quantity;
                      
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
                                <p className="font-semibold text-sm sm:text-base text-gray-800">{transaction.item_name}</p>
                                <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600">
                                  <span className="px-2 py-0.5 bg-gray-100 rounded capitalize">
                                    {transaction.category}
                                  </span>
                                  <span>Qty: {transaction.quantity}</span>
                                  <span className="hidden sm:inline">•</span>
                                  <span>
                                    {new Date(transaction.transaction_date).toLocaleDateString()} {new Date(transaction.transaction_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-base sm:text-lg font-bold text-red-600">
                                -${totalSpent.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

      {/* Receipt Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="receipt-preview-modal">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl">
            <CardHeader className="border-b">
              <CardTitle className="text-xl" style={{fontFamily: 'Space Grotesk'}}>Review Receipt</CardTitle>
              <CardDescription>Please review the extracted information and add a memo</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Receipt Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Merchant</span>
                  <span className="font-semibold text-gray-800">{previewData.preview_data.merchant}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Date</span>
                  <span className="font-semibold text-gray-800">{previewData.preview_data.date}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-bold text-red-600 text-lg">${previewData.preview_data.total.toFixed(2)}</span>
                </div>
                {previewData.preview_data.remaining_balance > 0 && (
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm text-gray-600">Remaining Balance</span>
                    <span className="font-bold text-green-600 text-lg">${previewData.preview_data.remaining_balance.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Items ({previewData.preview_data.items.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {previewData.preview_data.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded capitalize">{item.category}</span>
                          <span className="text-xs text-gray-600">Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <span className="font-semibold text-gray-800">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Memo Input */}
              <div>
                <Label htmlFor="memo" className="text-sm font-semibold">Add Memo (Optional)</Label>
                <textarea
                  id="memo"
                  data-testid="receipt-memo-input"
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="3"
                  placeholder="Add notes about this purchase..."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancelPreview}
                  className="flex-1"
                  disabled={uploading}
                  data-testid="cancel-receipt-button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmReceipt}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={uploading}
                  data-testid="confirm-receipt-button"
                >
                  {uploading ? 'Saving...' : 'Confirm & Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
