import { useState, useEffect, lazy, Suspense } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Toaster } from '@/components/ui/sonner';
import { auth } from '@/lib/firebase';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const OneCardSettings = lazy(() => import('./pages/OneCardSettings'));

export const API = 'http://localhost:8000/api';

const PROFILE_KEY = (uid) => `makerstab_profile_${uid}`;

function buildUserFromFirebase(fbUser) {
  if (!fbUser) return null;
  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY(fbUser.uid)) || '{}');
    } catch {
      return {};
    }
  })();
  return {
    id: fbUser.uid,
    email: fbUser.email,
    name: fbUser.displayName || stored.name || fbUser.email?.split('@')[0] || '',
    meal_plan_amount: stored.meal_plan_amount ?? 0,
    initial_meal_plan_amount: stored.initial_meal_plan_amount ?? stored.meal_plan_amount ?? 0,
    semester: stored.semester || 'fall',
    is_admin: Boolean(stored.is_admin),
  };
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setUser(buildUserFromFirebase(fbUser));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-orange-50 to-yellow-50">
      <div className="text-xl font-medium text-green-700">Loading...</div>
    </div>
  );

  if (loading) {
    return <LoadingScreen />;
  }

  const isAuthenticated = Boolean(user);

  return (
    <div className="App">
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <AuthPage />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                isAuthenticated ? (
                  <Dashboard user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/admin"
              element={
                isAuthenticated && user?.is_admin ? (
                  <AdminDashboard user={user} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/onecard"
              element={
                isAuthenticated ? (
                  <OneCardSettings user={user} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
