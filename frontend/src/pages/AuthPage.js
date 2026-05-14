import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { Blobs, cls, LOGO_URL } from '@/lib/theme';

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
      const credential = await createUserWithEmailAndPassword(auth, signupData.email, signupData.password);
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

      toast.success('Welcome to MakersTab ✨');
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
      toast.success('Welcome back 👋');
    } catch (error) {
      toast.error(prettyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const fieldCls =
    'mt-1 rounded-2xl border-2 border-emerald-100 bg-white focus-visible:ring-emerald-400';
  const selectCls =
    'mt-1 w-full px-4 py-2 rounded-2xl border-2 border-emerald-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400';

  return (
    <div className={cls.pageBg}>
      <Blobs />

      <header className="relative z-10 max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover-wobble">
          <div className="w-11 h-11 rounded-2xl bg-white sticker-shadow flex items-center justify-center">
            <img src={LOGO_URL} alt="MakersTab" className="w-7 h-7" />
          </div>
          <span className="font-display text-3xl text-emerald-700">makerstab</span>
        </Link>
        <Link to="/" className="text-sm text-gray-600 hover:text-emerald-700 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </header>

      <section className="relative z-10 max-w-md mx-auto px-4 pt-2 pb-16">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl text-emerald-700 mb-2">say hi 🍊</h1>
          <p className="text-gray-600">Let’s set up your tab.</p>
        </div>

        <div className={`${cls.card} p-2`}>
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-emerald-50/60 rounded-2xl p-1 mb-4">
              <TabsTrigger
                value="signup"
                data-testid="signup-tab"
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow"
              >
                New here
              </TabsTrigger>
              <TabsTrigger
                value="login"
                data-testid="login-tab"
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow"
              >
                I have a tab
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signup" className="px-4 pb-6">
              <form onSubmit={handleSignup} className="space-y-4" data-testid="signup-form">
                <div>
                  <Label htmlFor="signup-name" className="text-sm font-medium">Your name</Label>
                  <Input
                    id="signup-name"
                    data-testid="signup-name-input"
                    type="text"
                    placeholder="Rae Jin"
                    value={signupData.name}
                    onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                    required
                    className={fieldCls}
                  />
                </div>
                <div>
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="signup-email"
                    data-testid="signup-email-input"
                    type="email"
                    placeholder="you@cca.edu"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                    className={fieldCls}
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="signup-password"
                    data-testid="signup-password-input"
                    type="password"
                    placeholder="At least 6 characters"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                    minLength={6}
                    className={fieldCls}
                  />
                </div>
                <div>
                  <Label htmlFor="meal-plan" className="text-sm font-medium">Meal plan</Label>
                  <select
                    id="meal-plan"
                    data-testid="meal-plan-select"
                    className={selectCls}
                    value={signupData.meal_plan_amount}
                    onChange={(e) => setSignupData({ ...signupData, meal_plan_amount: e.target.value })}
                    required
                  >
                    <option value="">Pick your plan</option>
                    <option value="4005">Ultimate · $4,005</option>
                    <option value="3466">Essential · $3,466</option>
                    <option value="1865">Makers · $1,865</option>
                    <option value="1031">Mini · $1,031</option>
                    <option value="479">Micro · $479</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="semester" className="text-sm font-medium">Semester</Label>
                  <select
                    id="semester"
                    data-testid="semester-select"
                    className={selectCls}
                    value={signupData.semester}
                    onChange={(e) => setSignupData({ ...signupData, semester: e.target.value })}
                    required
                  >
                    <option value="fall">Fall (Aug 25 – Jan 19)</option>
                    <option value="spring">Spring (Jan 20 – May 17)</option>
                    <option value="summer">Summer (May 18 – Aug 16)</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  className={`${cls.btnPrimary} w-full mt-2`}
                  disabled={loading}
                  data-testid="signup-submit-button"
                >
                  {loading ? 'Making your tab…' : 'Make my tab'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="login" className="px-4 pb-6">
              <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                <div>
                  <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="login-email"
                    data-testid="login-email-input"
                    type="email"
                    placeholder="you@cca.edu"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    className={fieldCls}
                  />
                </div>
                <div>
                  <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="login-password"
                    data-testid="login-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    className={fieldCls}
                  />
                </div>
                <Button
                  type="submit"
                  className={`${cls.btnPrimary} w-full mt-2`}
                  disabled={loading}
                  data-testid="login-submit-button"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="text-emerald-700 hover:underline">Terms</Link>
          {' and '}
          <Link to="/privacy" className="text-emerald-700 hover:underline">Privacy Policy</Link>.
        </p>
      </section>
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
