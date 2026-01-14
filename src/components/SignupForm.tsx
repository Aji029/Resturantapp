import { useState, useEffect } from 'react';
import { User, Mail, Phone, Loader2, Store, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateCouponCode, getExpiryDate } from '../utils/couponGenerator';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  location: string;
}

interface SignupFormProps {
  onSuccess: (couponCode: string, customerName: string) => void;
  onLoginClick?: () => void;
  onRestaurantClick?: () => void;
}

export default function SignupForm({ onSuccess, onLoginClick, onRestaurantClick }: SignupFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    restaurantId: '',
    password: '',
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, slug, location')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching restaurants:', error);
        setError('Restaurants konnten nicht geladen werden.');
        setLoadingRestaurants(false);
        return;
      }

      if (data && data.length > 0) {
        setRestaurants(data);

        const urlParams = new URLSearchParams(window.location.search);
        const restaurantSlug = urlParams.get('restaurant');

        if (restaurantSlug) {
          const preSelectedRestaurant = data.find((r) => r.slug === restaurantSlug);
          if (preSelectedRestaurant) {
            setFormData((prev) => ({ ...prev, restaurantId: preSelectedRestaurant.id }));
          } else {
            setFormData((prev) => ({ ...prev, restaurantId: data[0].id }));
          }
        } else {
          setFormData((prev) => ({ ...prev, restaurantId: data[0].id }));
        }
      }

      setLoadingRestaurants(false);
    } catch (err) {
      console.error('Unexpected error fetching restaurants:', err);
      setError('Ein Fehler ist aufgetreten.');
      setLoadingRestaurants(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Starting signup process...');

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
          },
        },
      });

      if (authError) {
        console.error('Auth error:', authError);
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          setError('Diese E-Mail ist bereits registriert! Bitte verwenden Sie die Anmeldung.');
        } else {
          setError(`Registrierung fehlgeschlagen: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Benutzer konnte nicht erstellt werden.');
        setLoading(false);
        return;
      }

      console.log('Auth user created:', authData.user.id);

      const redemptionCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      console.log('Creating customer record...');
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            restaurant_id: formData.restaurantId,
            user_id: authData.user.id,
            redemption_code: redemptionCode,
          },
        ])
        .select()
        .maybeSingle();

      if (customerError) {
        console.error('Customer insert error:', customerError);
        await supabase.auth.signOut();
        setError(`Kundenkonto konnte nicht erstellt werden: ${customerError.message}`);
        setLoading(false);
        return;
      }

      if (!customer) {
        console.error('Customer record not returned');
        await supabase.auth.signOut();
        setError('Kundenkonto konnte nicht erstellt werden.');
        setLoading(false);
        return;
      }

      console.log('Customer created:', customer.id);

      const couponCode = generateCouponCode();
      const expiryDate = getExpiryDate(30);

      console.log('Creating welcome coupon...');
      const { error: couponError } = await supabase.from('coupons').insert([
        {
          code: couponCode,
          discount_type: 'percentage',
          discount_value: 15,
          expires_at: expiryDate.toISOString(),
          customer_id: customer.id,
          restaurant_id: formData.restaurantId,
        },
      ]);

      if (couponError) {
        console.error('Coupon creation error:', couponError);
      }

      const { data: stampProgram } = await supabase
        .from('stamp_programs')
        .select('id')
        .eq('restaurant_id', formData.restaurantId)
        .eq('is_active', true)
        .maybeSingle();

      if (stampProgram) {
        console.log('Creating stamp card...');
        await supabase.from('stamp_cards').insert([
          {
            customer_id: customer.id,
            program_id: stampProgram.id,
            current_stamps: 0,
            total_stamps_earned: 0,
            status: 'active',
          },
        ]);
      }

      console.log('Signup completed successfully!');
      onSuccess(couponCode, formData.name);
    } catch (err) {
      console.error('Unexpected error during signup:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
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
            Willkommen!
          </h1>
          <p className="text-gray-600">
            Jetzt registrieren und <span className="font-semibold text-emerald-600">15% Rabatt</span> bei Ihrem nächsten Besuch erhalten
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="restaurant" className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Store className="h-5 w-5 text-gray-400" />
                </div>
                {loadingRestaurants ? (
                  <div className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-400">
                    Restaurants werden geladen...
                  </div>
                ) : (
                  <select
                    id="restaurant"
                    required
                    value={formData.restaurantId}
                    onChange={(e) =>
                      setFormData({ ...formData, restaurantId: e.target.value })
                    }
                    className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white appearance-none cursor-pointer"
                  >
                    {restaurants.map((restaurant) => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name} - {restaurant.location}
                      </option>
                    ))}
                  </select>
                )}
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Teil unseres Netzwerks von {restaurants.length} Partnerrestaurants
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Vollständiger Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                  placeholder="Max Mustermann"
                />
              </div>
            </div>

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
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Telefonnummer
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                  placeholder="+49 151 12345678"
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
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                  placeholder="Mindestens 6 Zeichen"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Verwenden Sie dieses Passwort später für die Anmeldung
              </p>
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
                  Registrierung läuft...
                </>
              ) : (
                'Jetzt registrieren'
              )}
            </button>
          </form>

          {onLoginClick && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Bereits ein Konto?{' '}
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                >
                  Jetzt anmelden
                </button>
              </p>
            </div>
          )}

          <p className="text-center text-xs text-gray-500 mt-6">
            Mit der Registrierung stimmen Sie dem Erhalt von Werbeangeboten per E-Mail zu
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
