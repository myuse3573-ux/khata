import React from "react";
import { Users, BookOpenCheck, BarChart3, QrCode, RotateCw, Settings } from "lucide-react";
import { usePersonal } from "../../context/PersonalContext";
import { translations } from "../../utils/translations";

export const BottomNav = ({ activeTab, setActiveTab }) => {
  const { settings } = usePersonal();
  const t = translations[settings?.lang] || translations.en;

  const tabs = [
    { id: "customers", label: t.customers || "Khata", icon: Users },
    { id: "cashbook", label: t.cashbook || "Cash", icon: BookOpenCheck },
    { id: "roster", label: "Kitchen 🍳", icon: RotateCw },
    { id: "qr", label: t.qrPay || "QR Pay", icon: QrCode },
    { id: "reports", label: t.reports || "Reports", icon: BarChart3 },
    { id: "settings", label: t.more || "More", icon: Settings }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg pb-safe">
      <div className="max-w-2xl mx-auto flex items-center justify-around py-1.5 px-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200 ${
                isActive ? "text-emerald-600 scale-105 font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${isActive ? "bg-emerald-50 text-emerald-600" : ""}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium leading-none mt-0.5 truncate max-w-[54px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
