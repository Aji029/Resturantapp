import { CheckCircle2, Copy, Calendar, Gift } from 'lucide-react';
import { useState } from 'react';

interface CouponSuccessProps {
  couponCode: string;
  customerName: string;
}

export default function CouponSuccess({ couponCode, customerName }: CouponSuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Success Animation */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mb-4 shadow-xl animate-bounce-in">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Glückwunsch, {customerName.split(' ')[0]}!
          </h1>
          <p className="text-gray-600">
            Ihr exklusiver Rabatt ist bereit
          </p>
        </div>

        {/* Coupon Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden animate-slide-up">
          {/* Coupon Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-6 text-white text-center">
            <Gift className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium opacity-90 mb-1">Ihr Rabattcode</p>
            <div className="text-4xl font-bold tracking-wider mb-3 font-mono">
              {couponCode}
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-2 inline-block">
              <p className="text-2xl font-bold">15% RABATT</p>
            </div>
          </div>

          {/* Coupon Body */}
          <div className="px-8 py-6 space-y-4">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center"
            >
              <Copy className="w-5 h-5 mr-2" />
              {copied ? 'Kopiert!' : 'Code kopieren'}
            </button>

            {/* Info Boxes */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              <div className="bg-emerald-50 rounded-xl p-4 flex items-start">
                <Calendar className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Gültig für 30 Tage</p>
                  <p className="text-xs text-gray-600 mt-0.5">Nutzen Sie ihn vor Ablauf</p>
                </div>
              </div>

              <div className="bg-teal-50 rounded-xl p-4 flex items-start">
                <Gift className="w-5 h-5 text-teal-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Einmalige Nutzung</p>
                  <p className="text-xs text-gray-600 mt-0.5">Zeigen Sie diesen Code unserem Personal</p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 rounded-xl p-5 mt-6">
              <h3 className="font-semibold text-gray-900 mb-3 text-center">So lösen Sie ein</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-xs mr-3 flex-shrink-0">1</span>
                  <span>Besuchen Sie unser Restaurant innerhalb von 30 Tagen</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-xs mr-3 flex-shrink-0">2</span>
                  <span>Zeigen Sie diesen Code unserem Personal vor der Bestellung</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-xs mr-3 flex-shrink-0">3</span>
                  <span>Genießen Sie 15% Rabatt auf Ihre Gesamtrechnung</span>
                </li>
              </ol>
            </div>

            {/* Screenshot Reminder */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">Screenshot dieser Seite machen</span> oder Code speichern
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Wir haben Ihnen eine Bestätigung per E-Mail gesendet
        </p>
      </div>
    </div>
  );
}
