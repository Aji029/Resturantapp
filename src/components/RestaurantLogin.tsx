import { useState } from 'react';
import { Store, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RestaurantLoginProps {
  onSuccess: () => void;
  onSignupClick?: () => void;
  onCustomerLoginClick?: () => void;
}

export default function RestaurantLogin({ onSuccess, onSignupClick, onCustomerLoginClick }: RestaurantLoginProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Login fehlgeschlagen');

      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('auth_id', authData.user.id)
        .maybeSingle();

      if (restaurantError) throw restaurantError;

      if (!restaurant) {
        await supabase.auth.signOut();
        throw new Error('Kein Restaurant-Konto gefunden. Bitte registrieren Sie sich zuerst.');
      }

      onSuccess();

    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message.includes('Invalid login credentials')) {
        setError('Ungültige E-Mail oder Passwort');
      } else {
        setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl mb-4 shadow-lg">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Restaurant Login</h1>
            <p className="text-gray-600">Melden Sie sich bei Ihrem Restaurant-Konto an</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="restaurant@beispiel.de"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Ihr Passwort"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Anmeldung läuft...</span>
                </>
              ) : (
                <>
                  <span>Anmelden</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {onSignupClick && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Noch kein Restaurant-Konto?{' '}
                <button
                  type="button"
                  onClick={onSignupClick}
                  className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
                >
                  Jetzt registrieren
                </button>
              </p>
            </div>
          )}
        </div>

        {onCustomerLoginClick && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onCustomerLoginClick}
              className="block w-full text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              ← Zum Kunden-Portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
