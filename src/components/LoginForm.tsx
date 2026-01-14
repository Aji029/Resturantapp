import { useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Ungültige E-Mail oder Passwort.');
        } else {
          setError(signInError.message || 'Anmeldefehler aufgetreten.');
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        await onSuccess();
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
                  Wird angemeldet...
                </>
              ) : (
                <>
                  Anmelden
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
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
