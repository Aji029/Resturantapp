import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import SignupForm from './components/SignupForm';
import LoginForm from './components/LoginForm';
import CouponSuccess from './components/CouponSuccess';
import CustomerDashboard from './components/CustomerDashboard';
import RestaurantSignup from './components/RestaurantSignup';
import RestaurantLogin from './components/RestaurantLogin';
import RestaurantDashboard from './components/RestaurantDashboard';

type View = 'signup' | 'login' | 'success' | 'dashboard' | 'restaurant-signup' | 'restaurant-login' | 'restaurant-dashboard';

function App() {
  const [currentView, setCurrentView] = useState<View>('signup');
  const [couponCode, setCouponCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuthAndRoute();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCurrentView('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthAndRoute = async () => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');

    if (view === 'restaurant-signup') {
      setCurrentView('restaurant-signup');
      setIsCheckingAuth(false);
      return;
    }

    if (view === 'restaurant-login') {
      setCurrentView('restaurant-login');
      setIsCheckingAuth(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('auth_id', session.user.id)
        .maybeSingle();

      if (restaurant) {
        setCurrentView('restaurant-dashboard');
      } else {
        setCurrentView('dashboard');
      }
    } else if (view === 'login') {
      setCurrentView('login');
    } else {
      setCurrentView('signup');
    }

    setIsCheckingAuth(false);
  };

  const handleSignupSuccess = (code: string, name: string) => {
    setCouponCode(code);
    setCustomerName(name);
    setCurrentView('success');
  };

  const handleLoginSuccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('auth_id', session.user.id)
        .maybeSingle();

      if (restaurant) {
        setCurrentView('restaurant-dashboard');
      } else {
        setCurrentView('dashboard');
      }
    }
  };

  const handleLogout = () => {
    setCurrentView('login');
  };

  const switchToLogin = () => {
    setCurrentView('login');
  };

  const switchToSignup = () => {
    setCurrentView('signup');
  };

  const switchToRestaurantSignup = () => {
    setCurrentView('restaurant-signup');
  };

  const switchToRestaurantLogin = () => {
    setCurrentView('restaurant-login');
  };

  const handleRestaurantSignupSuccess = () => {
    setCurrentView('restaurant-dashboard');
  };

  const handleRestaurantLoginSuccess = () => {
    setCurrentView('restaurant-dashboard');
  };

  const handleRestaurantLogout = () => {
    setCurrentView('restaurant-login');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-emerald-600">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {currentView === 'signup' && (
        <SignupForm
          onSuccess={handleSignupSuccess}
          onLoginClick={switchToLogin}
          onRestaurantClick={switchToRestaurantSignup}
        />
      )}
      {currentView === 'login' && (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onSignupClick={switchToSignup}
          onRestaurantClick={switchToRestaurantLogin}
        />
      )}
      {currentView === 'success' && (
        <CouponSuccess couponCode={couponCode} customerName={customerName} />
      )}
      {currentView === 'dashboard' && <CustomerDashboard onLogout={handleLogout} />}
      {currentView === 'restaurant-signup' && (
        <RestaurantSignup
          onSuccess={handleRestaurantSignupSuccess}
          onLoginClick={switchToRestaurantLogin}
          onCustomerSignupClick={switchToSignup}
        />
      )}
      {currentView === 'restaurant-login' && (
        <RestaurantLogin
          onSuccess={handleRestaurantLoginSuccess}
          onSignupClick={switchToRestaurantSignup}
          onCustomerLoginClick={switchToLogin}
        />
      )}
      {currentView === 'restaurant-dashboard' && (
        <RestaurantDashboard onLogout={handleRestaurantLogout} />
      )}
    </>
  );
}

export default App;
