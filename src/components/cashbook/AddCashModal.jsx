import React, { useState, useEffect } from "react";
import { useKhata } from "../../context/useKhata";
import { translations } from "../../utils/translations";
import { X, PlusCircle, MinusCircle, Edit2 } from "lucide-react";

export const AddCashModal = ({
  isOpen,
  onClose,
  initialType = "in",
  initialCashEntry = null
}) => {
  const { addCashEntry, editCashEntry, settings } = useKhata();
  const t = translations[settings.lang] || translations.en;

  const [type, setType] = useState("in");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Sales");
  const [note, setNote] = useState("");

  const isEditMode = !!initialCashEntry;

  useEffect(() => {
    if (initialCashEntry) {
      setType(initialCashEntry.type || "in");
      setAmount(initialCashEntry.amount?.toString() || "");
      setCategory(initialCashEntry.category || "Sales");
      setNote(initialCashEntry.note || "");
    } else {
      setType(initialType);
      setAmount("");
      setCategory("Sales");
      setNote("");
    }
  }, [initialCashEntry, initialType, isOpen]);

  if (!isOpen) return null;

  const categories = [
    "Sales",
    "Stock Purchase",
    "Shop Rent",
    "Electricity Bill",
    "Staff Salary",
    "Tea & Snacks",
    "Transportation",
    "Miscellaneous"
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    if (isEditMode) {
      editCashEntry(initialCashEntry.id, {
        type,
        amount: Number(amount),
        category,
        note: note.trim()
      });
    } else {
      addCashEntry({
        type,
        amount: Number(amount),
        category,
        note: note.trim()
      });
    }

    setAmount("");
    setNote("");
    onClose();
  };

  const isIn = type === "in";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-slide-up">
        
        {/* Header */}
        <div
          className={`px-5 py-4 text-white flex items-center justify-between transition-colors ${
            isIn ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <Edit2 className="w-5 h-5" />
            ) : isIn ? (
              <PlusCircle className="w-5 h-5" />
            ) : (
              <MinusCircle className="w-5 h-5" />
            )}
            <h3 className="font-bold text-base">
              {isEditMode ? "Edit Cash Log Entry" : isIn ? t.cashIn : t.cashOut}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-black/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Cash In vs Cash Out Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setType("in")}
              className={`py-2 rounded-xl transition-all ${
                type === "in"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              CASH IN (+)
            </button>
            <button
              type="button"
              onClick={() => setType("out")}
              className={`py-2 rounded-xl transition-all ${
                type === "out"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              CASH OUT (-)
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 text-2xl font-extrabold focus:outline-none ${
                isIn
                  ? "text-emerald-600 border-emerald-200 focus:ring-2 focus:ring-emerald-500"
                  : "text-rose-600 border-rose-200 focus:ring-2 focus:ring-rose-500"
              }`}
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Category / Expense Type
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Details / Remark */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Details / Remark (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Snacks for guests, Vendor cash payment..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full font-extrabold py-3.5 rounded-2xl shadow-lg transition-all active:scale-98 text-sm text-white ${
                isIn
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                  : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
              }`}
            >
              {isEditMode ? "UPDATE CASH LOG ENTRY" : "SAVE CASH LOG"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
