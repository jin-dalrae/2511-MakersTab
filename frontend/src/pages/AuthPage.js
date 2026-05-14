import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Receipt, TrendingUp, History } from 'lucide-react';
import { auth } from '@/lib/firebase';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_cafe-wallet-2/artifacts/d2wwykae_makerstab.svg';
const PROFILE_KEY = (uid) => `makerstab_profile_${uid}`;
const FIRST_USER_FLAG = 'makerstab_first_user_signed_up';

function saveLocalProfile(uid, profile) {
  localStorage.setItem(PROFILE_KEY(uid), JSON.stringify(profile));
}

const AuthPage = () => {
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    meal_plan_amount: '',
    semester: 'fall',
  });

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        signupData.email,
        signupData.password,
      );
      await updateProfile(credential.user, { displayName: signupData.name });

      const isFirstUser = !localStorage.getItem(FIRST_USER_FLAG);
      if (isFirstUser) localStorage.setItem(FIRST_USER_FLAG, '1');

      const mealPlan = parseFloat(signupData.meal_plan_amount) || 0;
      saveLocalProfile(credential.user.uid, {
        name: signupData.name,
        meal_plan_amount: mealPlan,
        initial_meal_plan_amount: mealPlan,
        semester: signupData.semester,
        is_admin: isFirstUser,
      });

      toast.success('Account created successfully!');
    } catch (error) {
      toast.error(prettyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error(prettyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <img src={LOGO_URL} alt="MakersTab" className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800" style={{ fontFamily: 'Space Grotesk' }}>
              MakersTab
            </h1>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>
            Your Smart Meal Plan Companion
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Track spending, stay on budget, and never miss a meal at CCA
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-3xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
            <div className="bg-white/20 rounded-2xl p-3 w-fit mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ fontFamily: 'Space Grotesk' }}>Scan Receipts</h3>
            <p className="text-sm text-white/90">Instant AI-powered receipt scanning. Just snap a photo!</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
            <div className="bg-white/20 rounded-2xl p-3 w-fit mb-4">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ fontFamily: 'Space Grotesk' }}>Track Balance</h3>
            <p className="text-sm text-white/90">Real-time balance updates. Know exactly what you have left.</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
            <div className="bg-white/20 rounded-2xl p-3 w-fit mb-4">
              <History className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ fontFamily: 'Space Grotesk' }}>Daily Menu</h3>
            <p className="text-sm text-white/90">Check what's cooking at Makers Cafe today.</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
            <div className="bg-white/20 rounded-2xl p-3 w-fit mb-4">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ fontFamily: 'Space Grotesk' }}>Stay Organized</h3>
            <p className="text-sm text-white/90">Weekly recommendations to keep you on track.</p>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="shadow-2xl border-0 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white pb-8">
              <CardTitle className="text-2xl sm:text-3xl text-center" style={{ fontFamily: 'Space Grotesk' }}>
                Join MakersTab
              </CardTitle>
              <CardDescription className="text-center text-white/90 text-base">
                Made for CCA students 🎨
              </CardDescription>
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
                        minLength={6}
                      />
                    </div>
                    <div>
                      <Label htmlFor="meal-plan" className="text-sm">Meal Plan</Label>
                      <select
                        id="meal-plan"
                        data-testid="meal-plan-select"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        value={signupData.meal_plan_amount}
                        onChange={(e) => setSignupData({ ...signupData, meal_plan_amount: e.target.value })}
                        required
                      >
                        <option value="">Select your meal plan</option>
                        <option value="4005">Ultimate - $4,005</option>
                        <option value="3466">Essential - $3,466</option>
                        <option value="1865">Makers - $1,865</option>
                        <option value="1031">Mini - $1,031</option>
                        <option value="479">Micro - $479</option>
                      </select>
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
                        <option value="fall">Fall Semester (Aug 25 - Jan 19)</option>
                        <option value="spring">Spring Semester (Jan 20 - May 17)</option>
                        <option value="summer">Summer Semester (May 18 - Aug 16)</option>
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

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              By signing up, you agree to our{' '}
              <a href="/terms" className="text-green-600 hover:underline font-medium">Terms</a>
              {' '}and{' '}
              <a href="/privacy" className="text-green-600 hover:underline font-medium">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function prettyAuthError(error) {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Invalid email or password';
    case 'auth/user-not-found':
      return 'No account found for that email';
    case 'auth/email-already-in-use':
      return 'An account already exists for that email';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/invalid-email':
      return 'That email address looks wrong';
    case 'auth/too-many-requests':
      return 'Too many attempts — try again in a few minutes';
    default:
      return error?.message || 'Authentication failed';
  }
}

export default AuthPage;
