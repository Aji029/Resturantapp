console.log('[App] ============================================');
console.log('[App] MODULE LOADING');
console.log('[App] ============================================');

import { useState, useEffect } from 'react';

console.log('[App] React hooks imported');

import { supabase } from './lib/supabase';

console.log('[App] Supabase client imported');

import SignupForm from './components/SignupForm';
import LoginForm from './components/LoginForm';
import CouponSuccess from './components/CouponSuccess';
import CustomerDashboard from './components/CustomerDashboard';
import RestaurantSignup from './components/RestaurantSignup';
import RestaurantLogin from './components/RestaurantLogin';
import RestaurantDashboard from './components/RestaurantDashboard';

console.log('[App] All components imported');

type View = 'signup' | 'login' | 'success' | 'dashboard' | 'restaurant-signup' | 'restaurant-login' | 'restaurant-dashboard';

console.log('[App] ✓ Module loaded successfully');
console.log('[App] ============================================');

function App() {
  console.log('[App] 🚀 Component rendering...');

  const [currentView, setCurrentView] = useState<View>('signup');
  const [couponCode, setCouponCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    console.log('[App] useEffect mounting...');

    let mounted = true;
    let authCheckTimeoutId: NodeJS.Timeout | null = null;

    const initApp = async () => {
      if (mounted) {
        authCheckTimeoutId = await checkAuthAndRoute();
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[App] Auth state changed:', event);

      if (!mounted) return;

      // Clear any pending auth check timeouts
      if (authCheckTimeoutId) {
        console.log('[App] Clearing auth check timeout due to auth state change');
        clearTimeout(authCheckTimeoutId);
        authCheckTimeoutId = null;
      }

      if (event === 'SIGNED_IN' && session) {
        console.log('[App] SIGNED_IN - checking user type...');
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('id')
          .eq('auth_id', session.user.id)
          .maybeSingle();

        if (restaurant) {
          console.log('[App] Restaurant found, showing dashboard');
          setCurrentView('restaurant-dashboard');
          setIsCheckingAuth(false);
        } else {
          const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (customer) {
            console.log('[App] Customer found, showing dashboard');
            setCurrentView('dashboard');
            setIsCheckingAuth(false);
          } else {
            console.log('[App] No customer or restaurant found');
            setIsCheckingAuth(false);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[App] SIGNED_OUT');
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');

        if (view === 'restaurant-login' || view === 'restaurant-signup') {
          setCurrentView(view as View);
        } else if (view === 'login') {
          setCurrentView('login');
        } else {
          setCurrentView('signup');
        }
        setIsCheckingAuth(false);
      }
    });

    return () => {
      console.log('[App] useEffect cleanup');
      mounted = false;
      if (authCheckTimeoutId) {
        clearTimeout(authCheckTimeoutId);
      }
      subscription.unsubscribe();
    };
  }, []);

  const checkAuthAndRoute = async (): Promise<NodeJS.Timeout> => {
    console.log('[App] Starting auth check...');

    const timeoutId = setTimeout(() => {
      console.warn('[App] Auth check taking too long, forcing completion');
      setIsCheckingAuth(false);
      setCurrentView('signup');
    }, 5000);

    try {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      console.log('[App] URL view param:', view);

      if (view === 'restaurant-signup') {
        console.log('[App] Restaurant signup view requested');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('id')
            .eq('auth_id', session.user.id)
            .maybeSingle();

          if (!restaurant) {
            await supabase.auth.signOut();
          }
        }
        clearTimeout(timeoutId);
        setCurrentView('restaurant-signup');
        setIsCheckingAuth(false);
        return;
      }

      if (view === 'restaurant-login') {
        console.log('[App] Restaurant login view requested');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('id')
            .eq('auth_id', session.user.id)
            .maybeSingle();

          if (restaurant) {
            clearTimeout(timeoutId);
            setCurrentView('restaurant-dashboard');
            setIsCheckingAuth(false);
            return;
          } else {
            await supabase.auth.signOut();
          }
        }
        clearTimeout(timeoutId);
        setCurrentView('restaurant-login');
        setIsCheckingAuth(false);
        return;
      }

      console.log('[App] Checking session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[App] Session error:', sessionError);
        clearTimeout(timeoutId);
        setCurrentView(view === 'login' ? 'login' : 'signup');
        setIsCheckingAuth(false);
        return;
      }

      if (session) {
        console.log('[App] Session found, checking user type...');
        const { data: restaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id')
          .eq('auth_id', session.user.id)
          .maybeSingle();

        if (restaurantError) {
          console.error('[App] Restaurant lookup error:', restaurantError);
        }

        if (restaurant) {
          console.log('[App] Restaurant found, routing to dashboard');
          clearTimeout(timeoutId);
          setCurrentView('restaurant-dashboard');
        } else {
          console.log('[App] Not a restaurant, checking for customer...');
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (customerError) {
            console.error('[App] Customer lookup error:', customerError);
            await supabase.auth.signOut();
            clearTimeout(timeoutId);
            setCurrentView('login');
          } else if (customer) {
            console.log('[App] Customer found, routing to dashboard');
            clearTimeout(timeoutId);
            setCurrentView('dashboard');
          } else {
            console.warn('[App] No customer or restaurant found for authenticated user');
            await supabase.auth.signOut();
            clearTimeout(timeoutId);
            setCurrentView('login');
          }
        }
      } else {
        console.log('[App] No session, routing to', view === 'login' ? 'login' : 'signup');
        clearTimeout(timeoutId);
        if (view === 'login') {
          setCurrentView('login');
        } else {
          setCurrentView('signup');
        }
      }
    } catch (error) {
      console.error('[App] Unexpected error in checkAuthAndRoute:', error);
      clearTimeout(timeoutId);
      setCurrentView('signup');
    } finally {
      console.log('[App] Auth check complete');
      clearTimeout(timeoutId);
      setIsCheckingAuth(false);
    }

    return timeoutId;
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
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (customer) {
          setCurrentView('dashboard');
        } else {
          await supabase.auth.signOut();
          setCurrentView('login');
        }
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

  const handleRestaurantSignupSuccess = async () => {
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
        await supabase.auth.signOut();
        setCurrentView('restaurant-signup');
      }
    }
  };

  const handleRestaurantLoginSuccess = async () => {
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
        await supabase.auth.signOut();
        setCurrentView('restaurant-login');
      }
    }
  };

  const handleRestaurantLogout = () => {
    setCurrentView('restaurant-login');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-emerald-600 text-lg mb-4">Loading...</div>
          <button
            onClick={() => {
              console.log('[App] Force refresh clicked');
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = window.location.origin;
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Taking too long? Click here to refresh
          </button>
        </div>
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
