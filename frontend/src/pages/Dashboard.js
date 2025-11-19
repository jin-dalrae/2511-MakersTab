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
  Users,
  Trash2
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
  const [cafeMenu, setCafeMenu] = useState(null);
  const [cafeMenuMode, setCafeMenuMode] = useState('all');
  const [semesterInfo, setSemesterInfo] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [memo, setMemo] = useState('');
  const [groupBy, setGroupBy] = useState('day');
  const [uploadQueue, setUploadQueue] = useState([]);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);

  // Ensure transactions is always an array
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [analyticsRes, receiptsRes, transactionsRes, menuRes, semesterRes, cafeMenuRes] = await Promise.all([
        axios.get(`${API}/analytics`, { headers }),
        axios.get(`${API}/receipts?page=1&limit=50`, { headers }),
        axios.get(`${API}/transactions?page=1&limit=100`, { headers }),
        axios.get(`${API}/menu`),
        axios.get(`${API}/semester-info`, { headers }),
        axios.get(`${API}/cafe-menu`)
      ]);

      setAnalytics(analyticsRes.data);
      
      // Handle paginated responses - ensure we get arrays
      const receiptsData = receiptsRes.data.receipts || (Array.isArray(receiptsRes.data) ? receiptsRes.data : []);
      const transactionsData = transactionsRes.data.transactions || (Array.isArray(transactionsRes.data) ? transactionsRes.data : []);
      
      setReceipts(receiptsData);
      setTransactions(transactionsData);
      setMenuItems(menuRes.data);
      setSemesterInfo(semesterRes.data);
      setCafeMenu(cafeMenuRes.data.menu);
      setCafeMenuMode(cafeMenuRes.data.display_mode);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Reset file input
    event.target.value = '';

    if (files.length === 1) {
      // Single file - show preview modal
      await processSingleFile(files[0]);
    } else {
      // Multiple files - process in queue
      setUploadQueue(files);
      setCurrentUploadIndex(0);
      await processMultipleFiles(files);
    }
  };

  const processSingleFile = async (file) => {
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

  const processMultipleFiles = async (files) => {
    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      setCurrentUploadIndex(i);
      const file = files[i];
      
      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);

        // Get preview
        const previewResponse = await axios.post(`${API}/receipts/preview`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        // Auto-confirm without showing preview modal
        await axios.post(`${API}/receipts/confirm`, {
          parsed_data: previewResponse.data.preview_data,
          ocr_text: previewResponse.data.ocr_text,
          memo: `Auto-uploaded ${i + 1}/${files.length}`
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        failCount++;
      }
    }

    setUploading(false);
    setUploadQueue([]);
    setCurrentUploadIndex(0);

    // Show summary
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} receipt${successCount > 1 ? 's' : ''}!`);
    }
    if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} receipt${failCount > 1 ? 's' : ''}`);
    }

    // Refresh data
    fetchData();
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

  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm('Are you sure you want to delete this receipt? This will also delete all associated transactions. This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/receipts/${receiptId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      toast.success('Receipt deleted successfully!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete receipt');
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
    untracked: '#ef4444',
    other: '#8b5cf6'
  };

  const categoryIcons = {
    meal: Coffee,
    salad: Salad,
    drinks: Wine,
    convenience: ShoppingBag,
    untracked: Receipt
  };

  const spentPercentage = analytics ? (analytics.total_spent / user.meal_plan_amount) * 100 : 0;
  const remainingBudget = user.meal_plan_amount - (analytics?.total_spent || 0);

  const pieData = analytics ? Object.entries(analytics.spending_by_category).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: parseFloat(value.toFixed(2))
  })) : [];

  // Group transactions by day, week, or month
  const groupTransactions = (transactionsList, groupType) => {
    const grouped = {};
    
    if (!Array.isArray(transactionsList)) return {};
    
    transactionsList.forEach(transaction => {
      const date = new Date(transaction.transaction_date);
      let key;
      
      if (groupType === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupType === 'week') {
        const year = date.getFullYear();
        const weekNum = getWeekNumber(date);
        key = `${year}-W${weekNum}`;
      } else if (groupType === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(transaction);
    });
    
    // Sort by key descending (most recent first)
    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const sortedGrouped = {};
    sortedKeys.forEach(key => {
      sortedGrouped[key] = grouped[key];
    });
    
    return sortedGrouped;
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const formatGroupLabel = (key, groupType) => {
    if (groupType === 'day') {
      const date = new Date(key);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
    } else if (groupType === 'week') {
      const [year, week] = key.split('-W');
      return `Week ${week}, ${year}`;
    } else if (groupType === 'month') {
      const [year, month] = key.split('-');
      const date = new Date(year, parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return key;
  };

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
        
        {/* Tabs directly below header - no margin */}
        <div className="max-w-7xl mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/80 backdrop-blur-sm p-1 shadow-md w-full sm:w-auto overflow-x-auto flex border-t border-green-100">
              <TabsTrigger value="overview" data-testid="overview-tab" className="text-xs sm:text-sm flex-1 sm:flex-initial">Overview</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="analytics-tab" className="text-xs sm:text-sm flex-1 sm:flex-initial">Analytics</TabsTrigger>
              <TabsTrigger value="menu" data-testid="menu-tab" className="text-xs sm:text-sm flex-1 sm:flex-initial">Menu</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="hidden">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="menu">Menu</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4" data-testid="overview-content">
            {/* Current Balance & Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Balance */}
              <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-xl">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm opacity-90">Current Balance</p>
                    <p className="text-4xl font-bold">${user.meal_plan_amount?.toFixed(2) || '0.00'}</p>
                    {receipts.length > 0 && (
                      <p className="text-xs opacity-75">
                        Last purchase: {new Date(receipts[0].receipt_date).toLocaleDateString()} {new Date(receipts[0].receipt_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Recommendation */}
              {semesterInfo && (
                <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0 shadow-xl">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm opacity-90">Recommended This Week</p>
                      <p className="text-4xl font-bold">
                        ${(() => {
                          const now = new Date();
                          const sunday = new Date(now);
                          sunday.setDate(now.getDate() + (7 - now.getDay()));
                          const daysUntilSunday = Math.ceil((sunday - now) / (1000 * 60 * 60 * 24));
                          const weeklyBudget = semesterInfo.recommended_weekly_spending || 0;
                          const dailyRate = weeklyBudget / 7;
                          const remainingThisWeek = dailyRate * daysUntilSunday;
                          return remainingThisWeek.toFixed(2);
                        })()}
                      </p>
                      <p className="text-xs opacity-75">
                        Expected balance by Sunday: ${(() => {
                          const now = new Date();
                          const sunday = new Date(now);
                          sunday.setDate(now.getDate() + (7 - now.getDay()));
                          const daysUntilSunday = Math.ceil((sunday - now) / (1000 * 60 * 60 * 24));
                          const weeklyBudget = semesterInfo.recommended_weekly_spending || 0;
                          const dailyRate = weeklyBudget / 7;
                          const remainingThisWeek = dailyRate * daysUntilSunday;
                          const expectedBalance = (user.meal_plan_amount || 0) - remainingThisWeek;
                          return expectedBalance.toFixed(2);
                        })()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Slim Quick Upload Section */}
            <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-0 shadow-md">
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-gray-700">Quick Upload Receipt(s)</p>
                  <div className="flex gap-2">
                    <label
                      htmlFor="quick-file-upload"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-300 rounded-lg cursor-pointer hover:bg-orange-50 duration-200 text-sm"
                      data-testid="quick-file-upload-btn"
                    >
                      <Upload className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-orange-700">Upload</span>
                      <input
                        id="quick-file-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    <button
                      onClick={handleCameraCapture}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 duration-200 text-sm"
                      disabled={uploading}
                      data-testid="quick-camera-btn"
                    >
                      <Camera className="w-4 h-4" />
                      <span className="font-medium">Camera</span>
                    </button>
                  </div>
                </div>
                {uploading && (
                  <div className="mt-2 text-center">
                    <div className="animate-pulse text-orange-600 font-medium text-xs">
                      {uploadQueue.length > 0 
                        ? `Processing ${currentUploadIndex + 1}/${uploadQueue.length}...`
                        : 'Processing...'}
                    </div>
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

            {/* Budget Overview with Transaction History */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg" style={{fontFamily: 'Space Grotesk'}}>
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Meal Plan Budget & History
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

                {/* Transaction History */}
                {safeTransactions.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Recent Transactions</h3>
                      <select
                        className="text-xs sm:text-sm px-3 py-1 border border-gray-300 rounded-lg bg-white"
                        value={activeTab === 'overview' ? groupBy : 'day'}
                        onChange={(e) => setGroupBy(e.target.value)}
                      >
                        <option value="day">Group by Day</option>
                        <option value="week">Group by Week</option>
                        <option value="month">Group by Month</option>
                      </select>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {(() => {
                        const grouped = groupTransactions(safeTransactions, groupBy);
                        
                        return Object.entries(grouped).map(([groupKey, groupTransactions]) => {
                          const groupTotal = groupTransactions.reduce((sum, t) => sum + (t.price * t.quantity), 0);
                          
                          return (
                            <div key={groupKey} className="space-y-2">
                              {/* Group Header */}
                              <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                                <span className="text-xs sm:text-sm font-semibold text-gray-700">
                                  {formatGroupLabel(groupKey, groupBy)}
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-red-600">
                                  -${groupTotal.toFixed(2)}
                                </span>
                              </div>

                              {/* Transactions in Group */}
                              <div className="space-y-1 pl-2 sm:pl-4">
                                {groupTransactions.map((transaction) => {
                                  const totalSpent = transaction.price * transaction.quantity;
                                  
                                  return (
                                    <div
                                      key={transaction.id}
                                      className="flex items-center justify-between p-2 sm:p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-xs sm:text-sm text-gray-800 truncate">
                                          {transaction.item_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {new Date(transaction.transaction_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                      </div>
                                      <div className="text-right flex-shrink-0 ml-2">
                                        <p className="text-xs sm:text-sm font-bold text-red-600">
                                          -${totalSpent.toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
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
          {/* Analytics Tab */}
          <TabsContent value="analytics" data-testid="analytics-content">
            <div className="space-y-4">
              {/* Spending Analytics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-0 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Spent</p>
                        <p className="text-2xl font-bold text-gray-800">${analytics?.total_spent?.toFixed(2) || '0.00'}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Transactions</p>
                        <p className="text-2xl font-bold text-gray-800">{analytics?.transactions_count || 0}</p>
                      </div>
                      <Receipt className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Avg Per Transaction</p>
                        <p className="text-2xl font-bold text-gray-800">
                          ${analytics?.transactions_count > 0 
                            ? (analytics.total_spent / analytics.transactions_count).toFixed(2) 
                            : '0.00'}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Spending by Category */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle style={{fontFamily: 'Space Grotesk'}}>Spending by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.spending_by_category && Object.keys(analytics.spending_by_category).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(analytics.spending_by_category).map(([category, amount]) => {
                        const percentage = (amount / analytics.total_spent) * 100;
                        const IconComponent = categoryIcons[category] || ShoppingBag;
                        return (
                          <div key={category} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <IconComponent 
                                  className="w-5 h-5" 
                                  style={{ color: categoryColors[category] }} 
                                />
                                <span className="text-sm font-medium capitalize">{category}</span>
                              </div>
                              <span className="text-sm font-bold">${amount.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: categoryColors[category]
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No spending data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle style={{fontFamily: 'Space Grotesk'}}>Recent Transactions</CardTitle>
                  <CardDescription>Your recent purchases (Most Recent First)</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No transactions yet. Upload a receipt to get started!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {safeTransactions.map((transaction) => {
                        const IconComponent = categoryIcons[transaction.category] || ShoppingBag;
                        const totalSpent = transaction.price * transaction.quantity;
                        
                        return (
                          <div
                            key={transaction.id}
                            className="p-3 sm:p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md duration-300"
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
            </div>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" data-testid="menu-content">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle style={{fontFamily: 'Space Grotesk'}}>Makers Cafe Menu</CardTitle>
                <CardDescription>
                  {cafeMenuMode === 'all' && 'All meals for today'}
                  {cafeMenuMode === 'breakfast' && 'Breakfast (7:00 AM - 10:00 AM)'}
                  {cafeMenuMode === 'lunch' && 'Lunch (11:00 AM - 2:00 PM)'}
                  {cafeMenuMode === 'dinner' && 'Dinner (5:00 PM - 8:00 PM)'}
                  {cafeMenuMode === 'no_data' && 'Menu not yet updated'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!cafeMenu || Object.keys(cafeMenu).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Coffee className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No menu items available. Check back later!</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(cafeMenu).map(([period, items]) => (
                      items && items.length > 0 && (
                        <div key={period}>
                          <h3 className="text-xl font-bold capitalize mb-4 text-green-700 border-b-2 border-green-200 pb-2">
                            {period}
                          </h3>
                          
                          {/* Group items by station */}
                          {(() => {
                            const stations = {};
                            items.forEach(item => {
                              if (!stations[item.station]) stations[item.station] = [];
                              stations[item.station].push(item);
                            });
                            
                            return Object.entries(stations).map(([station, stationItems]) => (
                              <div key={station} className="mb-6">
                                <h4 className="text-md font-semibold text-gray-700 mb-3">{station}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {stationItems.map((item, idx) => (
                                    <div
                                      key={`${item.item_id}-${idx}`}
                                      className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg duration-300"
                                      data-testid="menu-item"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-gray-800 flex-1">{item.name}</h3>
                                        {item.calories && (
                                          <span className="text-xs text-gray-500 ml-2">{item.calories} cal</span>
                                        )}
                                      </div>
                                      {item.description && (
                                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                                      )}
                                      {item.dietary_tags && item.dietary_tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {item.dietary_tags.map(tag => (
                                            <span 
                                              key={tag} 
                                              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full capitalize"
                                            >
                                              {tag.replace('-', ' ')}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )
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
