import React from "react";
import { useKhata } from "../../context/useKhata";
import { translations } from "../../utils/translations";
import { formatCurrency, formatDate, calculateCustomerBalance } from "../../utils/formatters";
import { generateWhatsAppReminder } from "../../utils/whatsapp";
import { generateCustomerPDF } from "../../utils/pdfGenerator";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  FileDown,
  Trash2,
  Edit2,
  PlusCircle,
  MinusCircle,
  Calendar
} from "lucide-react";

export const CustomerDetail = ({
  customer,
  onBack,
  onOpenAddTxWithCustomer,
  onOpenEditCustomer,
  onOpenEditTx
}) => {
  const { transactions, business, settings, deleteTransaction, deleteCustomer } = useKhata();
  const t = translations[settings.lang] || translations.en;

  const customerTxs = transactions
    .filter((tx) => tx.customerId === customer.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const { balance, status } = calculateCustomerBalance(customerTxs);

  const totalGave = customerTxs
    .filter((t) => t.type === "gave")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalGot = customerTxs
    .filter((t) => t.type === "got")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const isGet = status === "get";
  const isGive = status === "give";

  // WhatsApp Reminder Handler
  const handleWhatsAppReminder = () => {
    const { waUrl } = generateWhatsAppReminder({
      customerName: customer.name,
      phone: customer.phone,
      amount: balance,
      status: status,
      businessName: business.name,
      lang: settings.lang
    });
    window.open(waUrl, "_blank");
  };

  // PDF Statement Handler
  const handleDownloadPDF = () => {
    generateCustomerPDF({
      customer,
      transactions: customerTxs,
      business
    });
  };

  // Customer Delete Handler
  const handleDeleteCustomer = () => {
    if (window.confirm(`${t.deleteConfirm} "${customer.name}"`)) {
      deleteCustomer(customer.id);
      onBack();
    }
  };

  return (
    <div className="pb-32 min-h-screen bg-slate-100 max-w-2xl mx-auto">
      
      {/* 1. Header Bar */}
      <div className="sticky top-0 z-40 bg-slate-900 text-white shadow-md">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 active:scale-95 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h2 className="font-bold text-base text-white leading-tight">
                {customer.name}
              </h2>
              <p className="text-xs text-slate-400">{customer.phone || "No Mobile Number"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Edit Customer Profile Button */}
            <button
              onClick={() => onOpenEditCustomer(customer)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center gap-1"
              title="Edit Customer Info"
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPDF}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold flex items-center gap-1"
              title={t.downloadPDF}
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Delete Customer Button */}
            <button
              onClick={handleDeleteCustomer}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-rose-400"
              title="Delete Customer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        
        {/* 2. Customer Summary Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          
          {/* Main Net Balance Badge */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs text-slate-500 font-medium block">
                {t.netBalance}
              </span>
              <div
                className={`text-2xl font-extrabold tracking-tight ${
                  isGet
                    ? "text-rose-600"
                    : isGive
                    ? "text-emerald-600"
                    : "text-slate-600"
                }`}
              >
                {formatCurrency(balance)}
              </div>
            </div>

            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                isGet
                  ? "bg-rose-100 text-rose-700"
                  : isGive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {isGet ? t.youWillGet : isGive ? t.youWillGive : "Settled"}
            </div>
          </div>

          {/* Gave vs Got Totals */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100">
              <span className="text-slate-500 block">{t.youGave} (Udhar)</span>
              <span className="text-sm font-extrabold text-rose-600">
                {formatCurrency(totalGave)}
              </span>
            </div>
            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block">{t.youGot} (Jama)</span>
              <span className="text-sm font-extrabold text-emerald-600">
                {formatCurrency(totalGot)}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons (Call & WhatsApp Reminder) */}
          <div className="flex gap-2 pt-1">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-slate-600" />
                <span>{t.callCustomer}</span>
              </a>
            )}

            <button
              onClick={handleWhatsAppReminder}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t.sendReminder}</span>
            </button>
          </div>
        </div>

        {/* 3. Transaction Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Transaction History ({customerTxs.length})
            </span>
          </div>

          {customerTxs.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
              {t.noTransactionsYet}
            </div>
          ) : (
            customerTxs.map((tx) => {
              const isGave = tx.type === "gave";

              return (
                <div
                  key={tx.id}
                  className={`bg-white rounded-2xl p-3.5 border shadow-xs transition-all ${
                    isGave ? "border-l-4 border-l-rose-500 border-slate-200" : "border-l-4 border-l-emerald-500 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    
                    {/* Left: Date, Note, Payment Mode */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            isGave
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isGave ? t.youGave : t.youGot}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(tx.date)}
                        </span>
                      </div>

                      {tx.note && (
                        <p className="text-sm font-semibold text-slate-800">
                          {tx.note}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {tx.mode && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            {tx.mode}
                          </span>
                        )}
                        {tx.billNumber && (
                          <span className="text-[11px] text-slate-400">
                            Bill #{tx.billNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount, Edit & Delete Buttons */}
                    <div className="text-right space-y-1">
                      <div
                        className={`text-lg font-extrabold ${
                          isGave ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {isGave ? "-" : "+"}{formatCurrency(tx.amount)}
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        {/* EDIT ENTRY BUTTON */}
                        <button
                          onClick={() => onOpenEditTx(tx)}
                          className="text-slate-400 hover:text-emerald-600 p-1 transition-colors"
                          title="Edit transaction entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* DELETE ENTRY BUTTON */}
                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 4. Fixed Dual Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl">
        <div className="max-w-2xl mx-auto flex gap-3">
          
          {/* YOU GAVE Button */}
          <button
            onClick={() => onOpenAddTxWithCustomer(customer, "gave")}
            className="flex-1 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-extrabold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
          >
            <MinusCircle className="w-5 h-5" />
            <span>{t.giveUdhar}</span>
          </button>

          {/* YOU GOT Button */}
          <button
            onClick={() => onOpenAddTxWithCustomer(customer, "got")}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{t.gotJama}</span>
          </button>

        </div>
      </div>

    </div>
  );
};
