import { useState, useEffect } from 'react';
import { Store, QrCode, Users, Download, LogOut, Ticket, Award, TrendingUp, Copy, CheckCircle2, Search, X, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateQRCodeURL, getRestaurantSignupURL, downloadQRCode } from '../utils/qrCodeGenerator';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  location: string;
  owner_name: string;
  email: string;
  phone: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  stamp_count?: number;
}

interface Stats {
  totalCustomers: number;
  totalStamps: number;
  totalCoupons: number;
  redeemedCoupons: number;
}

interface CouponDetails {
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  customer: {
    name: string;
    email: string;
  };
}

type ActiveTab = 'overview' | 'stamps' | 'coupons';

interface RestaurantDashboardProps {
  onLogout: () => void;
}

export default function RestaurantDashboard({ onLogout }: RestaurantDashboardProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalStamps: 0,
    totalCoupons: 0,
    redeemedCoupons: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [copiedURL, setCopiedURL] = useState(false);
  const [downloadingQR, setDownloadingQR] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  const [customerIdInput, setCustomerIdInput] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [stampNote, setStampNote] = useState('');
  const [addingStamp, setAddingStamp] = useState(false);
  const [stampSuccess, setStampSuccess] = useState('');
  const [stampError, setStampError] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [couponDetails, setCouponDetails] = useState<CouponDetails | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  useEffect(() => {
    loadRestaurantData();
  }, []);

  const loadRestaurantData = async () => {
    try {
      console.log('[RestaurantDashboard] Starting loadRestaurantData...');

      const { data: { user } } = await supabase.auth.getUser();
      console.log('[RestaurantDashboard] User:', user?.id);

      if (!user) {
        console.error('[RestaurantDashboard] No user found');
        await supabase.auth.signOut();
        onLogout();
        return;
      }

      console.log('[RestaurantDashboard] Fetching restaurant data...');
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      console.log('[RestaurantDashboard] Restaurant data:', restaurantData, restaurantError);

      if (restaurantError) {
        console.error('[RestaurantDashboard] Error loading restaurant:', restaurantError);
        await supabase.auth.signOut();
        onLogout();
        return;
      }

      if (!restaurantData) {
        console.error('[RestaurantDashboard] No restaurant found for this user');
        await supabase.auth.signOut();
        onLogout();
        return;
      }

      setRestaurant(restaurantData);
      console.log('[RestaurantDashboard] Restaurant set successfully');

      console.log('[RestaurantDashboard] Fetching customers...');
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('created_at', { ascending: false });

      console.log('[RestaurantDashboard] Customers data:', customersData, customersError);

      if (customersError) {
        console.error('[RestaurantDashboard] Error loading customers:', customersError);
        throw customersError;
      }

      console.log('[RestaurantDashboard] Processing customer stamps...');
      const customersWithStamps = await Promise.all(
        (customersData || []).map(async (customer) => {
          const { count, error: stampError } = await supabase
            .from('stamps')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customer.id)
            .eq('restaurant_id', restaurantData.id);

          if (stampError) {
            console.error('[RestaurantDashboard] Error counting stamps for customer:', customer.id, stampError);
          }

          return {
            ...customer,
            stamp_count: count || 0,
          };
        })
      );

      setCustomers(customersWithStamps);
      console.log('[RestaurantDashboard] Customers with stamps:', customersWithStamps);

      console.log('[RestaurantDashboard] Fetching stats...');
      const { count: totalStamps } = await supabase
        .from('stamps')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantData.id);

      const { count: totalCoupons } = await supabase
        .from('coupons')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantData.id);

      const { count: redeemedCoupons } = await supabase
        .from('coupons')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantData.id)
        .eq('is_redeemed', true);

      setStats({
        totalCustomers: customersData?.length || 0,
        totalStamps: totalStamps || 0,
        totalCoupons: totalCoupons || 0,
        redeemedCoupons: redeemedCoupons || 0,
      });

      console.log('[RestaurantDashboard] All data loaded successfully');
    } catch (error) {
      console.error('[RestaurantDashboard] Error loading restaurant data:', error);
    } finally {
      console.log('[RestaurantDashboard] Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const handleCopyURL = async () => {
    if (!restaurant) return;
    const url = getRestaurantSignupURL(restaurant.slug);
    await navigator.clipboard.writeText(url);
    setCopiedURL(true);
    setTimeout(() => setCopiedURL(false), 2000);
  };

  const handleDownloadQR = async () => {
    if (!restaurant) return;
    setDownloadingQR(true);
    try {
      await downloadQRCode(restaurant.slug, restaurant.name);
    } catch (error) {
      console.error('Error downloading QR code:', error);
    } finally {
      setDownloadingQR(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleCustomerLookup = async () => {
    if (!customerIdInput.trim() || !restaurant) return;

    setStampError('');
    setStampSuccess('');

    try {
      let customerId: string | null = null;

      const trimmedInput = customerIdInput.trim();

      if (/^\d{6}$/.test(trimmedInput)) {
        console.log('[RestaurantDashboard] Looking up customer with code:', trimmedInput);
        console.log('[RestaurantDashboard] Restaurant ID:', restaurant.id);

        const { data: customer, error } = await supabase
          .from('customers')
          .select('*')
          .eq('redemption_code', trimmedInput)
          .eq('restaurant_id', restaurant.id)
          .maybeSingle();

        console.log('[RestaurantDashboard] Customer lookup result:', customer, error);

        if (error || !customer) {
          setStampError('Kunde mit diesem Code nicht gefunden oder gehört nicht zu Ihrem Restaurant');
          return;
        }

        customerId = customer.id;
      } else {
        try {
          const parsedData = JSON.parse(trimmedInput);

          if (parsedData.type !== 'stamp' || !parsedData.customerId) {
            setStampError('Ungültiger QR-Code');
            return;
          }

          customerId = parsedData.customerId;
        } catch (parseError) {
          setStampError('Bitte geben Sie einen 6-stelligen Code oder QR-Code-Daten ein');
          return;
        }
      }

      if (!customerId) {
        setStampError('Kunde nicht gefunden');
        return;
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();

      if (error || !customer) {
        setStampError('Kunde nicht gefunden');
        return;
      }

      const { count } = await supabase
        .from('stamps')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .eq('restaurant_id', restaurant.id);

      setSelectedCustomer({ ...customer, stamp_count: count || 0 });
    } catch (err) {
      setStampError('Fehler bei der Kundensuche');
    }
  };

  const handleAddStamp = async () => {
    if (!selectedCustomer || !restaurant) return;

    setAddingStamp(true);
    setStampError('');
    setStampSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStampError('Nicht authentifiziert');
        setAddingStamp(false);
        return;
      }

      const { data, error } = await supabase.rpc('add_stamp_to_customer', {
        p_customer_id: selectedCustomer.id,
        p_restaurant_auth_id: user.id,
        p_notes: stampNote || null,
      });

      if (error) {
        console.error('Error calling add_stamp_to_customer:', error);
        setStampError('Fehler beim Hinzufügen des Stempels');
        setAddingStamp(false);
        return;
      }

      const result = data;

      if (!result.success) {
        setStampError(result.error || 'Fehler beim Hinzufügen des Stempels');
        setAddingStamp(false);
        return;
      }

      if (result.reward_issued) {
        setStampSuccess(
          `🎉 ${result.message}\n` +
          `Gutschein-Code: ${result.coupon_code}\n` +
          `Belohnung: ${result.reward_value}`
        );
      } else {
        setStampSuccess(result.message);
      }

      setSelectedCustomer(null);
      setCustomerIdInput('');
      setStampNote('');

      await loadRestaurantData();

      setTimeout(() => setStampSuccess(''), 5000);
    } catch (err) {
      console.error('Unexpected error adding stamp:', err);
      setStampError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setAddingStamp(false);
    }
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim() || !restaurant) return;

    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');
    setCouponDetails(null);

    try {
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select(`
          code,
          discount_type,
          discount_value,
          expires_at,
          is_redeemed,
          redeemed_at,
          customer:customers (
            name,
            email
          )
        `)
        .eq('code', couponCode.toUpperCase())
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (couponError || !coupon) {
        setCouponError('Gutschein nicht gefunden oder gehört nicht zu Ihrem Restaurant');
        setCouponLoading(false);
        return;
      }

      if (new Date(coupon.expires_at) < new Date()) {
        setCouponError('Dieser Gutschein ist abgelaufen');
        setCouponLoading(false);
        return;
      }

      if (coupon.is_redeemed) {
        setCouponError(`Dieser Gutschein wurde bereits am ${new Date(coupon.redeemed_at!).toLocaleDateString('de-DE')} eingelöst`);
        setCouponLoading(false);
        return;
      }

      setCouponDetails({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        expires_at: coupon.expires_at,
        is_redeemed: coupon.is_redeemed,
        redeemed_at: coupon.redeemed_at,
        customer: Array.isArray(coupon.customer) ? coupon.customer[0] : coupon.customer,
      });
      setCouponLoading(false);
    } catch (err) {
      setCouponError('Ein Fehler ist aufgetreten');
      setCouponLoading(false);
    }
  };

  const handleRedeemCoupon = async () => {
    if (!couponDetails) return;

    setCouponLoading(true);
    setCouponError('');

    try {
      const { error: updateError } = await supabase
        .from('coupons')
        .update({
          is_redeemed: true,
          redeemed_at: new Date().toISOString(),
        })
        .eq('code', couponDetails.code);

      if (updateError) throw updateError;

      setCouponSuccess('Gutschein erfolgreich eingelöst!');
      setCouponDetails(null);
      setCouponCode('');

      await loadRestaurantData();

      setTimeout(() => setCouponSuccess(''), 3000);
    } catch (err) {
      setCouponError('Fehler beim Einlösen des Gutscheins');
    } finally {
      setCouponLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-orange-600">Laden...</div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-red-600">Restaurant nicht gefunden</div>
      </div>
    );
  }

  const qrCodeURL = generateQRCodeURL(restaurant.slug);
  const signupURL = getRestaurantSignupURL(restaurant.slug);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Store className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
              <p className="text-gray-600">{restaurant.location}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Abmelden</span>
          </button>
        </div>

        <div className="flex space-x-2 mb-8 bg-white rounded-xl p-2 shadow-lg border border-orange-100">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Übersicht
          </button>
          <button
            onClick={() => setActiveTab('stamps')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'stamps'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Stempel geben
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'coupons'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Gutscheine einlösen
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Kunden</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Stempel vergeben</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalStamps}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Gutscheine erstellt</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCoupons}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Ticket className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Eingelöst</p>
                <p className="text-3xl font-bold text-gray-900">{stats.redeemedCoupons}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100">
              <div className="flex items-center space-x-3 mb-4">
                <QrCode className="w-6 h-6 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">Ihr QR-Code</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Kunden scannen diesen QR-Code zum Anmelden
              </p>

              <div className="bg-white p-4 rounded-lg border-2 border-orange-200 mb-4">
                <img
                  src={qrCodeURL}
                  alt="Restaurant QR Code"
                  className="w-full h-auto"
                />
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleDownloadQR}
                  disabled={downloadingQR}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  <span>{downloadingQR ? 'Lädt...' : 'QR-Code herunterladen'}</span>
                </button>

                <button
                  onClick={handleCopyURL}
                  className="w-full flex items-center justify-center space-x-2 bg-white border-2 border-orange-300 text-orange-600 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-all"
                >
                  {copiedURL ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Kopiert!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Link kopieren</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Anmelde-Link:</p>
                <p className="text-xs text-gray-700 break-all font-mono">{signupURL}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100">
              <div className="flex items-center space-x-3 mb-6">
                <Users className="w-6 h-6 text-orange-600" />
                <h2 className="text-xl font-bold text-gray-900">Ihre Kunden</h2>
              </div>

              {customers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Noch keine Kunden registriert</p>
                  <p className="text-sm text-gray-400 mt-2">Teilen Sie Ihren QR-Code, um Kunden zu gewinnen</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">E-Mail</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Telefon</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Stempel</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Angemeldet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer) => (
                        <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-gray-900">{customer.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{customer.email}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{customer.phone}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full text-sm font-bold">
                              {customer.stamp_count}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(customer.created_at).toLocaleDateString('de-DE')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
          </>
        )}

        {activeTab === 'stamps' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-orange-100">
              <div className="flex items-center space-x-3 mb-6">
                <Sparkles className="w-7 h-7 text-orange-600" />
                <h2 className="text-2xl font-bold text-gray-900">Stempel vergeben</h2>
              </div>

              {stampSuccess && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-start">
                  <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="font-semibold">{stampSuccess}</p>
                </div>
              )}

              {stampError && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start">
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                  <p>{stampError}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  6-stelliger Code oder QR-Code
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={customerIdInput}
                    onChange={(e) => setCustomerIdInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomerLookup()}
                    placeholder="123456"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-2xl text-center tracking-widest"
                  />
                  <button
                    onClick={handleCustomerLookup}
                    disabled={!customerIdInput.trim()}
                    className="px-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Geben Sie den 6-stelligen Code des Kunden ein oder fügen Sie QR-Code-Daten ein
                </p>
              </div>

              {selectedCustomer && (
                <div className="border-t border-gray-200 pt-6 animate-fade-in">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                        <p className="text-green-50 text-sm">{selectedCustomer.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerIdInput('');
                          setStampError('');
                        }}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-sm text-green-50">Aktuelle Stempel</p>
                      <p className="text-2xl font-bold">{selectedCustomer.stamp_count || 0}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notiz (optional)
                    </label>
                    <input
                      type="text"
                      value={stampNote}
                      onChange={(e) => setStampNote(e.target.value)}
                      placeholder="z.B. Cappuccino gekauft"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={handleAddStamp}
                    disabled={addingStamp}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>{addingStamp ? 'Wird hinzugefügt...' : 'Stempel hinzufügen'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-orange-100">
              <div className="flex items-center space-x-3 mb-6">
                <Ticket className="w-7 h-7 text-orange-600" />
                <h2 className="text-2xl font-bold text-gray-900">Gutschein einlösen</h2>
              </div>

              {couponSuccess && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-start">
                  <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="font-semibold">{couponSuccess}</p>
                </div>
              )}

              {couponError && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start">
                  <X className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                  <p>{couponError}</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gutscheincode eingeben
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleValidateCoupon()}
                    placeholder="XXXX-XXXX"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-lg"
                  />
                  <button
                    onClick={handleValidateCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prüfen
                  </button>
                </div>
              </div>

              {couponDetails && (
                <div className="border-t border-gray-200 pt-6 animate-fade-in">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl p-6 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <CheckCircle2 className="w-6 h-6 mr-2" />
                        <span className="font-semibold">Gültiger Gutschein</span>
                      </div>
                      <span className="bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-sm font-bold">
                        {couponDetails.discount_value}% RABATT
                      </span>
                    </div>
                    <div className="text-3xl font-bold font-mono tracking-wider">
                      {couponDetails.code}
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start">
                      <div className="w-24 text-sm text-gray-500">Kunde:</div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{couponDetails.customer.name}</p>
                        <p className="text-sm text-gray-600">{couponDetails.customer.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-24 text-sm text-gray-500">Gültig bis:</div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {new Date(couponDetails.expires_at).toLocaleDateString('de-DE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleRedeemCoupon}
                    disabled={couponLoading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {couponLoading ? 'Wird eingelöst...' : 'Gutschein einlösen'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
