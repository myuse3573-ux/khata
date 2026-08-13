import React, { useState } from "react";
import { useKhata } from "../../context/KhataContext";
import { translations } from "../../utils/translations";
import { formatCurrency, formatDate } from "../../utils/formatters";
import {
  PlusCircle,
  MinusCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit2
} from "lucide-react";
import { AddCashModal } from "./AddCashModal";

export const CashbookView = () => {
  const { cashbook, settings, deleteCashEntry } = useKhata();
  const t = translations[settings.lang] || translations.en;

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashType, setCashType] = useState("in");
  const [editingCashEntry, setEditingCashEntry] = useState(null);

  const totalCashIn = cashbook
    .filter((c) => c.type === "in")
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const totalCashOut = cashbook
    .filter((c) => c.type === "out")
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const netCashHand = totalCashIn - totalCashOut;

  const handleOpenAddCash = (type) => {
    setEditingCashEntry(null);
    setCashType(type);
    setIsCashModalOpen(true);
  };

  const handleOpenEditCash = (entry) => {
    setEditingCashEntry(entry);
    setCashType(entry.type || "in");
    setIsCashModalOpen(true);
  };

  return (
    <div className="pb-28 pt-2 px-3 max-w-2xl mx-auto space-y-4">
      
      {/* 1. Header & Cash In Hand Card */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                {t.dailyBalance}
              </span>
              <div className="text-2xl font-extrabold text-white">
                {formatCurrency(netCashHand)}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-xl font-semibold border border-slate-700">
              Today's Tally
            </span>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs border-t border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-slate-400 block">{t.todayCashIn}</span>
              <span className="font-extrabold text-emerald-400">
                {formatCurrency(totalCashIn)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            <div>
              <span className="text-slate-400 block">{t.todayCashOut}</span>
              <span className="font-extrabold text-rose-400">
                {formatCurrency(totalCashOut)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cash History Entries */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Daily Cashbook Logs ({cashbook.length})
          </span>
        </div>

        {cashbook.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
            No cash logs added today yet.
          </div>
        ) : (
          cashbook.map((entry) => {
            const isIn = entry.type === "in";

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-2xl p-3.5 border shadow-xs flex items-center justify-between ${
                  isIn ? "border-l-4 border-l-emerald-500 border-slate-200" : "border-l-4 border-l-rose-500 border-slate-200"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        isIn
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {isIn ? t.cashIn : t.cashOut}
                    </span>

                    {entry.category && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {entry.category}
                      </span>
                    )}
                  </div>

                  {entry.note && (
                    <p className="text-sm font-semibold text-slate-800">
                      {entry.note}
                    </p>
                  )}

                  <span className="text-xs text-slate-400 block">
                    {formatDate(entry.date)}
                  </span>
                </div>

                <div className="text-right space-y-1">
                  <div
                    className={`text-base font-extrabold ${
                      isIn ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {isIn ? "+" : "-"}{formatCurrency(entry.amount)}
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    {/* EDIT CASH ENTRY BUTTON */}
                    <button
                      onClick={() => handleOpenEditCash(entry)}
                      className="text-slate-400 hover:text-emerald-600 p-1 transition-colors"
                      title="Edit cash log"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* DELETE CASH ENTRY BUTTON */}
                    <button
                      onClick={() => deleteCashEntry(entry.id)}
                      className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Sticky Bottom Action Buttons for Cashbook */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl">
        <div className="max-w-2xl mx-auto flex gap-3">
          
          <button
            onClick={() => handleOpenAddCash("in")}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{t.cashIn}</span>
          </button>

          <button
            onClick={() => handleOpenAddCash("out")}
            className="flex-1 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-extrabold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
          >
            <MinusCircle className="w-5 h-5" />
            <span>{t.cashOut}</span>
          </button>

        </div>
      </div>

      <AddCashModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        initialType={cashType}
        initialCashEntry={editingCashEntry}
      />

    </div>
  );
};
