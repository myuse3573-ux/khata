import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useKhata } from "../../context/useKhata";
import { translations } from "../../utils/translations";
import { formatCurrency } from "../../utils/formatters";
import { QrCode, Share2, Copy, CheckCircle2, ShieldCheck } from "lucide-react";

export const QRPayView = () => {
  const { business, customers, settings, showToast } = useKhata();
  const t = translations[settings.lang] || translations.en;

  const [amount, setAmount] = useState("500");
  const [selectedCustId, setSelectedCustId] = useState("");
  const [copied, setCopied] = useState(false);

  const upiId = business.upiId || "9876543210@paytm";
  const payeeName = business.name || "Digital Khata";

  // Build standard UPI URL specification string
  // e.g. upi://pay?pa=address@upi&pn=PayeeName&am=100.00&cu=INR
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount || "0"}&cu=INR`;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    showToast("UPI ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: `Payment to ${payeeName}`,
        text: `Please pay ${formatCurrency(amount)} using UPI ID: ${upiId}`,
        url: upiUrl
      }).catch(() => {});
    } else {
      handleCopyUPI();
    }
  };

  return (
    <div className="pb-28 pt-2 px-3 max-w-2xl mx-auto space-y-4">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-md text-center space-y-2">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <QrCode className="w-5 h-5" />
        </div>
        <h2 className="font-extrabold text-lg">{t.collectPayment}</h2>
        <p className="text-xs text-slate-400">
          Accept direct payments via GPay, PhonePe, Paytm & BHIM
        </p>
      </div>

      {/* QR Code Container */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md text-center space-y-5">
        
        {/* Optional Customer Selection */}
        {customers && customers.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Select Customer (Optional)
            </label>
            <select
              value={selectedCustId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedCustId(id);
                if (id) {
                  const cust = customers.find((c) => c.id === id);
                  if (cust && cust.balance) {
                    setAmount(Math.abs(cust.balance).toString());
                  }
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs mx-auto"
            >
              <option value="">General Payment QR</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance ? `(₹${Math.abs(c.balance)})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            {t.enterAmount}
          </label>
          <div className="relative max-w-xs mx-auto">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-xl">
              ₹
            </span>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-2xl font-extrabold text-center text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Live Generated QR SVG */}
        <div className="bg-slate-50 p-6 rounded-2xl inline-block border border-slate-200 shadow-inner">
          <QRCodeSVG
            value={upiUrl}
            size={200}
            level="H"
            includeMargin={true}
            bgColor="#f8fafc"
            fgColor="#0f172a"
          />
          <div className="mt-2 text-xs font-extrabold text-slate-800 tracking-wide">
            SCAN & PAY {formatCurrency(amount)}
          </div>
        </div>

        {/* Shop UPI Details */}
        <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[11px] text-slate-500 font-medium block">
              Business UPI ID
            </span>
            <span className="text-xs font-bold text-slate-900">{upiId}</span>
          </div>

          <button
            onClick={handleCopyUPI}
            className="p-2 rounded-xl bg-white text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 border border-emerald-200 shadow-xs"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShareLink}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all active:scale-98"
        >
          <Share2 className="w-4 h-4" />
          <span>{t.shareQR}</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secure Instant UPI Settlement</span>
        </div>

      </div>

    </div>
  );
};
