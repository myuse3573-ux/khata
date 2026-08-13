import React, { useState, useEffect } from "react";
import { useKitchen } from "../../context/KitchenContext";
import { usePersonal } from "../../context/PersonalContext";
import { translations } from "../../utils/translations";
import { X, RotateCw, CheckSquare, Square, Edit2, User, Plus } from "lucide-react";

export const AddTurnItemModal = ({ isOpen, onClose, initialRosterItem = null }) => {
  const { members: customers, addRosterItem, editRosterItem, addManualMember } = useKitchen();
  const { settings, customers: personalCustomers } = usePersonal();
  const t = translations[settings?.lang] || translations.en;

  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Drinking Water");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [cost, setCost] = useState("90");
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

  // Quick Add Roommate / Customer state
  const [showAddRoommate, setShowAddRoommate] = useState(false);
  const [roommateName, setRoommateName] = useState("");


  const isEditMode = !!initialRosterItem;

  useEffect(() => {
    if (initialRosterItem) {
      setItemName(initialRosterItem.itemName || "");
      setCategory(initialRosterItem.category || "Drinking Water");
      setSelectedMemberIds(initialRosterItem.memberIds || []);
      setCost(initialRosterItem.lastBroughtCost?.toString() || "90");
      setCurrentTurnIndex(initialRosterItem.currentTurnIndex || 0);
    } else {
      setItemName("");
      setCategory("Drinking Water");
      if (customers && customers.length > 0) {
        setSelectedMemberIds(customers.map((c) => c.id));
      }
      setCost("90");
      setCurrentTurnIndex(0);
    }
  }, [initialRosterItem, customers, isOpen]);

  if (!isOpen) return null;

  const categories = [
    "Drinking Water",
    "Kitchen & Dairy",
    "Gas & Energy",
    "Household & Cleaning",
    "Groceries",
    "Miscellaneous"
  ];

  const toggleMember = (id) => {
    setSelectedMemberIds((prev) => {
      const next = prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id];
      if (currentTurnIndex >= next.length) {
        setCurrentTurnIndex(0);
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemName.trim() || selectedMemberIds.length === 0) return;

    if (isEditMode) {
      editRosterItem(initialRosterItem.id, {
        itemName: itemName.trim(),
        category,
        memberIds: selectedMemberIds,
        currentTurnIndex: Number(currentTurnIndex) || 0,
        lastBroughtCost: Number(cost) || 0
      });
    } else {
      addRosterItem({
        itemName: itemName.trim(),
        category,
        memberIds: selectedMemberIds,
        currentTurnIndex: Number(currentTurnIndex) || 0,
        lastBroughtBy: selectedMemberIds[0],
        lastBroughtDate: new Date().toISOString(),
        lastBroughtCost: Number(cost) || 0
      });
    }

    setItemName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-slide-up relative">
        
        {/* Decorative Top Background */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-50 to-white -z-10"></div>
        
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-lg">
              {isEditMode ? <Edit2 className="w-5 h-5" /> : <RotateCw className="w-5 h-5" />}
            </div>
            <h3 className="font-black text-lg text-slate-900 tracking-tight">
              {isEditMode ? `Edit Duty Item` : t.addItemDuty}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Item Name */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 20L Water Can, Daily Milk 2L, Gas Refill"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:font-medium placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Usual Cost */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Estimated / Usual Cost (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 90"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Active Turn Member Dropdown (Whose Turn Is Next) */}
          {selectedMemberIds.length > 0 && (
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <label className="block text-xs font-black text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Current Turn (Who Brings Next?)</span>
              </label>
              <select
                value={currentTurnIndex}
                onChange={(e) => setCurrentTurnIndex(Number(e.target.value))}
                className="w-full bg-white border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23059669' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
              >
                {selectedMemberIds.map((mId, idx) => {
                  const m = customers.find((c) => c.id === mId);
                  return (
                    <option key={mId} value={idx}>
                      Turn #{idx + 1}: {m ? m.name : "Member"}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Rotation Members Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                {t.selectTurnMembers} ({selectedMemberIds.length}/{customers.length})
              </label>
              <button
                type="button"
                onClick={() => setShowAddRoommate(!showAddRoommate)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Roommate / Customer</span>
              </button>
            </div>

            {/* Quick Add Roommate Inline Box */}
            {showAddRoommate && (
              <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 space-y-2 animate-fade-in">
                <p className="text-xs font-bold text-slate-800">Add person to rotation (no account needed):</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Ramesh / Room 3"
                    value={roommateName}
                    onChange={(e) => setRoommateName(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!roommateName.trim()) return;
                      const newM = await addManualMember(roommateName.trim());
                      if (newM) {
                        setSelectedMemberIds(prev => [...prev, newM.id]);
                        setRoommateName("");
                        setShowAddRoommate(false);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs"
                  >
                    Add
                  </button>
                </div>

                {/* Option to pick from personal Khata customers */}
                {personalCustomers && personalCustomers.length > 0 && (
                  <div className="pt-1 border-t border-emerald-100">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-1">Or pick from your Khata customers:</span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {personalCustomers.map((pc) => (
                        <button
                          key={pc.id}
                          type="button"
                          onClick={async () => {
                            const newM = await addManualMember(pc.name, pc.phone || "");
                            if (newM) {
                              setSelectedMemberIds(prev => [...prev, newM.id]);
                              setShowAddRoommate(false);
                            }
                          }}
                          className="bg-white hover:bg-emerald-100 border border-slate-200 text-slate-700 font-semibold text-[11px] px-2 py-1 rounded-lg transition-colors"
                        >
                          + {pc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-slate-50/50 p-2 rounded-2xl border-2 border-slate-100 max-h-48 overflow-y-auto space-y-1">
              {customers.map((cust) => {
                const isSelected = selectedMemberIds.includes(cust.id);
                const isPaused = cust.status === "paused";

                return (
                  <div
                    key={cust.id}
                    onClick={() => toggleMember(cust.id)}
                    className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-white border-emerald-500 shadow-sm font-bold text-slate-900"
                        : "bg-transparent border-transparent text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                      <span className="text-sm font-bold">{cust.name}</span>
                      {cust.isManual && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                          Guest/Roommate
                        </span>
                      )}
                      {isPaused && (
                        <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md uppercase tracking-wide">
                          Paused
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {cust.phone || "No phone"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>


          {/* Submit */}
          <div className="pt-3 pb-1">
            <button
              type="submit"
              disabled={selectedMemberIds.length === 0 || !itemName.trim()}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-transform active:scale-95 text-sm uppercase tracking-wide"
            >
              {isEditMode ? "Save Duty Item Changes" : "Create Rotation Duty Item"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
