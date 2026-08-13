import React, { useState, useEffect } from "react";
import { useKhata } from "../../context/KhataContext";
import { translations } from "../../utils/translations";
import { X, User, Phone, MapPin, ShieldAlert, Edit2 } from "lucide-react";

export const AddCustomerModal = ({ isOpen, onClose, initialCustomer = null, onCustomerCreated }) => {
  const { addCustomer, editCustomer, settings } = useKhata();
  const t = translations[settings.lang] || translations.en;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("customer");
  const [creditLimit, setCreditLimit] = useState("10000");

  const isEditMode = !!initialCustomer;

  useEffect(() => {
    if (initialCustomer) {
      setName(initialCustomer.name || "");
      setPhone(initialCustomer.phone || "");
      setAddress(initialCustomer.address || "");
      setType(initialCustomer.type || "customer");
      setCreditLimit(initialCustomer.creditLimit?.toString() || "10000");
    } else {
      setName("");
      setPhone("");
      setAddress("");
      setType("customer");
      setCreditLimit("10000");
    }
  }, [initialCustomer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditMode) {
      editCustomer(initialCustomer.id, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        type,
        creditLimit: Number(creditLimit) || 0
      });
      onClose();
    } else {
      const newCust = addCustomer({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        type,
        creditLimit: Number(creditLimit) || 0
      });
      onClose();
      if (onCustomerCreated) onCustomerCreated(newCust);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-slide-up">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <Edit2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <User className="w-5 h-5 text-emerald-400" />
            )}
            <h3 className="font-bold text-base">
              {isEditMode ? `Edit Member: ${initialCustomer.name}` : t.addCustomer}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Customer Type Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setType("customer")}
              className={`py-2 rounded-xl transition-all ${
                type === "customer"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Customer / Member
            </button>
            <button
              type="button"
              onClick={() => setType("supplier")}
              className={`py-2 rounded-xl transition-all ${
                type === "supplier"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Supplier (सप्लायर)
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Member / Party Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                autoFocus
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Address / Location (Optional)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. House #42, Main Road"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Credit Limit */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Credit Limit (₹)
            </label>
            <div className="relative">
              <ShieldAlert className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                placeholder="10000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-2xl shadow-lg transition-all active:scale-98 text-sm"
            >
              {isEditMode ? "Save Changes" : "Save Customer"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
