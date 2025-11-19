import { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Receipt, TrendingUp, History } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_cafe-wallet-2/artifacts/d2wwykae_makerstab.svg';

const AuthPage = ({ onLogin }) => {
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    meal_plan_amount: '',
    semester: 'fall'
  });

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/signup`, {
        ...signupData,
        meal_plan_amount: parseFloat(signupData.meal_plan_amount)
      });
      toast.success('Account created successfully!');
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      toast.success('Welcome back!');
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
        {/* Left Side - Branding */}
        <div className="flex-1 text-center lg:text-left space-y-6 w-full">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-gray-200">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <img src={LOGO_URL} alt="MakersTab" className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800" style={{fontFamily: 'Space Grotesk'}}>MakersTab</h1>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 leading-tight" style={{fontFamily: 'Space Grotesk'}}>
            Smart Meal Plan
            <br />
            <span className="text-green-600">Management for CCA</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-md leading-relaxed">
            MakersTab helps California College of the Arts students effortlessly track their meal plan spending at Makers Cafe with AI-powered receipt scanning, real-time balance tracking, and smart budget recommendations.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl shadow-md hover:shadow-lg transform hover:-translate-y-1 duration-300">
              <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mb-2" />
              <h3 className="font-semibold text-sm sm:text-base text-gray-800">AI Receipt Scanner</h3>
              <p className="text-xs sm:text-sm text-gray-600">Instant OCR extraction with balance tracking</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl shadow-md hover:shadow-lg transform hover:-translate-y-1 duration-300">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mb-2" />
              <h3 className="font-semibold text-sm sm:text-base text-gray-800">Smart Analytics</h3>
              <p className="text-xs sm:text-sm text-gray-600">Weekly budget recommendations & insights</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl shadow-md hover:shadow-lg transform hover:-translate-y-1 duration-300">
              <History className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mb-2" />
              <h3 className="font-semibold text-sm sm:text-base text-gray-800">Live Cafe Menu</h3>
              <p className="text-xs sm:text-sm text-gray-600">Daily menu from Cafe Bon Appetit</p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center lg:text-left">
            <p className="text-xs text-gray-500">
              By signing up, you agree to our{' '}
              <a href="/terms" className="text-green-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="flex-1 w-full max-w-md">
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl" style={{fontFamily: 'Space Grotesk'}}>Get Started</CardTitle>
              <CardDescription className="text-sm">Create an account or sign in to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signup" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signup" data-testid="signup-tab">Sign Up</TabsTrigger>
                  <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                </TabsList>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4" data-testid="signup-form">
                    <div>
                      <Label htmlFor="signup-name" className="text-sm">Full Name</Label>
                      <Input
                        id="signup-name"
                        data-testid="signup-name-input"
                        type="text"
                        placeholder="John Doe"
                        value={signupData.name}
                        onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-email" className="text-sm">Email</Label>
                      <Input
                        id="signup-email"
                        data-testid="signup-email-input"
                        type="email"
                        placeholder="you@example.com"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-password" className="text-sm">Password</Label>
                      <Input
                        id="signup-password"
                        data-testid="signup-password-input"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="meal-plan" className="text-sm">Meal Plan Budget ($)</Label>
                      <Input
                        id="meal-plan"
                        data-testid="meal-plan-input"
                        type="number"
                        step="0.01"
                        placeholder="500.00"
                        value={signupData.meal_plan_amount}
                        onChange={(e) => setSignupData({ ...signupData, meal_plan_amount: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="semester" className="text-sm">Semester</Label>
                      <select
                        id="semester"
                        data-testid="semester-select"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        value={signupData.semester}
                        onChange={(e) => setSignupData({ ...signupData, semester: e.target.value })}
                        required
                      >
                        <option value="fall">Fall Term (Jul 10 - Sep 1)</option>
                        <option value="spring">Spring Term (Dec 1 - Jan 18)</option>
                        <option value="summer">Summer Term (May 1 - May 16)</option>
                      </select>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base"
                      disabled={loading}
                      data-testid="signup-submit-button"
                    >
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                    <div>
                      <Label htmlFor="login-email" className="text-sm">Email</Label>
                      <Input
                        id="login-email"
                        data-testid="login-email-input"
                        type="email"
                        placeholder="you@example.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-password" className="text-sm">Password</Label>
                      <Input
                        id="login-password"
                        data-testid="login-password-input"
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base"
                      disabled={loading}
                      data-testid="login-submit-button"
                    >
                      {loading ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
