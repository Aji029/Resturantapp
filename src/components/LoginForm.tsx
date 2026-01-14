import { useState } from 'react';
import { Mail, Lock, Loader2, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginFormProps {
  onSuccess: () => void | Promise<void>;
  onSignupClick?: () => void;
  onRestaurantClick?: () => void;
}

export default function LoginForm({ onSuccess, onSignupClick, onRestaurantClick }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Starting customer login process...');

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        console.error('Login error:', signInError);
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Ungültige E-Mail oder Passwort.');
        } else {
          setError(`Anmeldung fehlgeschlagen: ${signInError.message}`);
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Anmeldung fehlgeschlagen.');
        setLoading(false);
        return;
      }

      console.log('User authenticated:', data.user.id);

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (customerError) {
        console.error('Error checking customer:', customerError);
      }

      if (!customer) {
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('id')
          .eq('auth_id', data.user.id)
          .maybeSingle();

        if (!restaurant) {
          console.error('No customer or restaurant record found');
          setError('Kein Kundenkonto gefunden. Bitte registrieren Sie sich zuerst.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }

      console.log('Customer login successful!');
      await onSuccess();
    } catch (err) {
      console.error('Unexpected login error:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Willkommen zurück!
          </h1>
          <p className="text-gray-600">
            Melden Sie sich an, um Ihre Gutscheine und Stempelkarten zu verwalten
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                  placeholder="max@beispiel.de"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Passwort
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                  placeholder="Ihr Passwort"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Anmeldung läuft...
                </>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>

          {onSignupClick && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Noch kein Konto?{' '}
                <button
                  onClick={onSignupClick}
                  className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                >
                  Jetzt registrieren
                </button>
              </p>
            </div>
          )}

          <p className="text-center text-xs text-gray-500 mt-6">
            Ihre Daten sind sicher verschlüsselt
          </p>
        </div>

        {onRestaurantClick && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onRestaurantClick}
              className="block w-full text-sm text-orange-600 hover:text-orange-700 transition-colors font-semibold"
            >
              Restaurant-Portal →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
