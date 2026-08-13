import React, { useState, useEffect } from "react";
import { useKhata } from "../../context/KhataContext";
import { translations } from "../../utils/translations";
import { X, PlusCircle, MinusCircle, Edit2 } from "lucide-react";

export const AddTransactionModal = ({
  isOpen,
  onClose,
  initialCustomer = null,
  initialType = "gave",
  initialTransaction = null
}) => {
  const { customers, addTransaction, editTransaction, settings } = useKhata();
  const t = translations[settings.lang] || translations.en;

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [type, setType] = useState("gave");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [mode, setMode] = useState("Cash");

  const isEditMode = !!initialTransaction;

  useEffect(() => {
    if (initialTransaction) {
      setSelectedCustomerId(initialTransaction.customerId);
      setType(initialTransaction.type || "gave");
      setAmount(initialTransaction.amount?.toString() || "");
      setNote(initialTransaction.note || "");
      setBillNumber(initialTransaction.billNumber || "");
      setMode(initialTransaction.mode || "Cash");
    } else {
      if (initialCustomer) {
        setSelectedCustomerId(initialCustomer.id);
      } else if (customers.length > 0) {
        setSelectedCustomerId(customers[0].id);
      }
      if (initialType) {
        setType(initialType);
      }
      setAmount("");
      setNote("");
      setBillNumber("");
      setMode("Cash");
    }
  }, [initialTransaction, initialCustomer, initialType, customers, isOpen]);

  if (!isOpen) return null;

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount || Number(amount) <= 0) return;

    if (isEditMode) {
      editTransaction(initialTransaction.id, {
        customerId: selectedCustomerId,
        type,
        amount: Number(amount),
        note: note.trim(),
        billNumber: billNumber.trim(),
        mode
      });
    } else {
      addTransaction({
        customerId: selectedCustomerId,
        type,
        amount: Number(amount),
        note: note.trim(),
        billNumber: billNumber.trim(),
        mode
      });
    }

    setAmount("");
    setNote("");
    setBillNumber("");
    onClose();
  };

  const isGave = type === "gave";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-slide-up">
        
        {/* Header */}
        <div
          className={`px-5 py-4 text-white flex items-center justify-between transition-colors ${
            isGave ? "bg-rose-600" : "bg-emerald-600"
          }`}
        >
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <Edit2 className="w-5 h-5" />
            ) : isGave ? (
              <MinusCircle className="w-5 h-5" />
            ) : (
              <PlusCircle className="w-5 h-5" />
            )}
            <h3 className="font-bold text-base">
              {isEditMode
                ? `Edit Entry (${isGave ? "YOU GAVE" : "YOU GOT"})`
                : isGave
                ? t.giveUdhar
                : t.gotJama}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-black/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setType("gave")}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                type === "gave"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MinusCircle className="w-4 h-4" />
              <span>YOU GAVE (उधार)</span>
            </button>

            <button
              type="button"
              onClick={() => setType("got")}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                type === "got"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>YOU GOT (जमा)</span>
            </button>
          </div>

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Customer / Party *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={!!initialCustomer || isEditMode}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || "No Phone"})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Enter Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-xl">
                ₹
              </span>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full bg-slate-50 border rounded-2xl pl-10 pr-4 py-3 text-2xl font-extrabold focus:outline-none focus:bg-white ${
                  isGave
                    ? "text-rose-600 border-rose-200 focus:ring-2 focus:ring-rose-500"
                    : "text-emerald-600 border-emerald-200 focus:ring-2 focus:ring-emerald-500"
                }`}
                autoFocus
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto py-1">
              {quickAmounts.map((qAmt) => (
                <button
                  key={qAmt}
                  type="button"
                  onClick={() => setAmount(qAmt.toString())}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-xl transition-colors shrink-0"
                >
                  +₹{qAmt}
                </button>
              ))}
            </div>
          </div>

          {/* Details / Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Item Details / Note
            </label>
            <input
              type="text"
              placeholder="e.g. 5kg Wheat, Grocery bill..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Bill No & Payment Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bill / Invoice No.
              </label>
              <input
                type="text"
                placeholder="INV-101"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="NetBanking">Net Banking</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full font-extrabold py-3.5 rounded-2xl shadow-lg transition-all active:scale-98 text-sm text-white ${
                isGave
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
              }`}
            >
              {isEditMode ? "UPDATE TRANSACTION ENTRY" : "SAVE TRANSACTION ENTRY"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
