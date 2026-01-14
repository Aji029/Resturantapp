import { useState, useEffect } from 'react';
import { Ticket, Gift, LogOut, Loader2, Calendar, CheckCircle, QrCode, History, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
}

interface StampCard {
  id: string;
  current_stamps: number;
  total_stamps_earned: number;
  status: string;
  program: {
    name: string;
    description: string;
    stamps_required: number;
    reward_value: string;
  };
}

interface StampTransaction {
  id: string;
  created_at: string;
  added_by_email: string;
  notes: string;
}

interface CustomerDashboardProps {
  onLogout: () => void;
}

export default function CustomerDashboard({ onLogout }: CustomerDashboardProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [redemptionCode, setRedemptionCode] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stampCards, setStampCards] = useState<StampCard[]>([]);
  const [stampHistory, setStampHistory] = useState<StampTransaction[]>([]);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        onLogout();
        return;
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name, redemption_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (customerError) {
        console.error('Error fetching customer:', customerError);
      }

      if (!customer) {
        console.error('No customer found for user:', user.id);
        setError('Kundenkonto nicht gefunden. Bitte melden Sie sich ab und registrieren Sie sich erneut.');
        setLoading(false);
        return;
      }

      if (customer) {
        setCustomerName(customer.name);
        setCustomerId(customer.id);
        setRedemptionCode(customer.redemption_code || '');

        const { data: couponsData } = await supabase
          .from('coupons')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });

        if (couponsData) {
          setCoupons(couponsData);
        }

        const { data: cardsData } = await supabase
          .from('stamp_cards')
          .select(`
            id,
            current_stamps,
            total_stamps_earned,
            status,
            program:stamp_programs(
              name,
              description,
              stamps_required,
              reward_value
            )
          `)
          .eq('customer_id', customer.id)
          .eq('status', 'active');

        if (cardsData) {
          setStampCards(cardsData as unknown as StampCard[]);
        }

        const { data: stampsData } = await supabase
          .from('stamps')
          .select('id, created_at, added_by_email, notes')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (stampsData) {
          setStampHistory(stampsData);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateCustomerQRCode = () => {
    const qrData = JSON.stringify({
      customerId,
      customerName,
      type: 'stamp'
    });
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  };

  const activeCoupons = coupons.filter(c => !c.is_redeemed && new Date(c.expires_at) > new Date());
  const usedCoupons = coupons.filter(c => c.is_redeemed);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Fehler</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-4xl mx-auto p-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Willkommen, {customerName}!
            </h1>
            <p className="text-gray-600 mt-1">Verwalten Sie Ihre Gutscheine und Stempelkarten</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-white rounded-xl transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Abmelden
          </button>
        </div>

        <div className="grid gap-6 mb-8">
          {stampCards.map((card) => {
            const progress = (card.current_stamps / card.program.stamps_required) * 100;
            return (
              <div key={card.id} className="bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold">{card.program.name}</h2>
                      <p className="text-emerald-50 text-sm mt-1">{card.program.description}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold">
                      {card.current_stamps} / {card.program.stamps_required}
                    </div>
                  </div>

                  <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-white transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    {Array.from({ length: card.program.stamps_required }).map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          i < card.current_stamps
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {i < card.current_stamps ? (
                          <Sparkles className="w-6 h-6" />
                        ) : (
                          <span className="text-lg font-bold">{i + 1}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {card.current_stamps === card.program.stamps_required && (
                    <div className="mb-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                      <Gift className="w-5 h-5" />
                      Glückwunsch! Sie haben {card.program.reward_value} verdient!
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowQRCode(!showQRCode)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg"
                    >
                      <QrCode className="w-5 h-5" />
                      QR-Code anzeigen
                    </button>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                    >
                      <History className="w-5 h-5" />
                      Verlauf
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showQRCode && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Ihr Stempel-Code</h2>
              <button
                onClick={() => setShowQRCode(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">QR-Code</h3>
                <div className="bg-white p-6 rounded-2xl shadow-lg mb-4">
                  <img
                    src={generateCustomerQRCode()}
                    alt="Customer QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-center text-gray-600 text-sm">
                  Zum Scannen bereithalten
                </p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">6-stelliger Code</h3>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-2xl shadow-lg mb-4">
                  <div className="text-5xl font-bold text-white tracking-widest font-mono">
                    {redemptionCode}
                  </div>
                </div>
                <p className="text-center text-gray-600 text-sm max-w-xs">
                  Alternative: Nennen Sie dem Personal diesen Code
                </p>
              </div>
            </div>

            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm text-emerald-800 text-center">
                <strong>Hinweis:</strong> Das Personal kann entweder Ihren QR-Code scannen oder Sie nennen den 6-stelligen Code
              </p>
            </div>
          </div>
        )}

        {showHistory && stampHistory.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-bold text-gray-900">Stempel-Verlauf</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {stampHistory.map((stamp) => (
                <div
                  key={stamp.id}
                  className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 p-2 rounded-lg">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          Stempel erhalten
                        </div>
                        {stamp.notes && (
                          <div className="text-sm text-gray-600 mt-1">
                            {stamp.notes}
                          </div>
                        )}
                        {stamp.added_by_email && (
                          <div className="text-xs text-gray-500 mt-1">
                            Hinzugefügt von: {stamp.added_by_email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDateTime(stamp.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Ticket className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-900">Aktive Gutscheine</h2>
          </div>

          {activeCoupons.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Keine aktiven Gutscheine vorhanden
            </p>
          ) : (
            <div className="space-y-4">
              {activeCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="border-2 border-emerald-200 rounded-2xl p-4 bg-gradient-to-br from-emerald-50 to-teal-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-2xl font-bold text-emerald-700 font-mono tracking-wider">
                        {coupon.code}
                      </div>
                      <div className="text-lg font-semibold text-gray-900 mt-1">
                        {coupon.discount_value}% Rabatt
                      </div>
                    </div>
                    <Gift className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                    <Calendar className="w-4 h-4" />
                    Gültig bis {formatDate(coupon.expires_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {usedCoupons.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900">Verwendete Gutscheine</h2>
            </div>

            <div className="space-y-3">
              {usedCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-lg font-mono text-gray-500">
                        {coupon.code}
                      </div>
                      <div className="text-sm text-gray-600">
                        {coupon.discount_value}% Rabatt
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        Eingelöst am
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {coupon.redeemed_at && formatDate(coupon.redeemed_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
