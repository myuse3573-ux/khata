import React, { useState, useEffect } from "react";
import { usePersonal } from "../../context/usePersonal";
import { translations } from "../../utils/translations";
import { formatCurrency } from "../../utils/formatters";
import {
  X,
  UtensilsCrossed,
  Calculator,
  MessageSquare,
  CheckCircle2,
  CheckSquare,
  Square,
  Send,
  Phone,
  Share2,
  ExternalLink,
  ChevronRight
} from "lucide-react";

/**
 * Format phone number cleanly for WhatsApp API (wa.me)
 * Handles: "9876543210", "+91 9876543210", "919876543210", "09876543210"
 */
const cleanPhoneNumber = (phone) => {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
};

export const SplitExpenseModal = ({ isOpen, onClose }) => {
  const { customers, addTransaction, addCashEntry, business, settings, showToast } = usePersonal();
  const t = translations[settings?.lang] || translations.en;

  const [itemName, setItemName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [includeSelf, setIncludeSelf] = useState(true);

  // Broadcast step after saving
  const [splitResult, setSplitResult] = useState(null);

  // WhatsApp broadcast selection (Step 2)
  const [broadcastSelectedIds, setBroadcastSelectedIds] = useState([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState(0);
  const [sentIds, setSentIds] = useState([]);

  // Initialize selected members with all customers
  useEffect(() => {
    if (customers && customers.length > 0) {
      setSelectedMemberIds(customers.map((c) => c.id));
    }
  }, [customers, isOpen]);

  if (!isOpen) return null;

  // Toggle member selection (Step 1 - who pays)
  const toggleMember = (id) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  // Toggle select all (Step 1)
  const handleSelectAll = () => {
    if (selectedMemberIds.length === customers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(customers.map((c) => c.id));
    }
  };

  // Toggle broadcast selection (Step 2 - who gets WhatsApp)
  const toggleBroadcastMember = (id) => {
    setBroadcastSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleBroadcastSelectAll = () => {
    if (splitResult) {
      const allIds = splitResult.members.map((m) => m.id);
      if (broadcastSelectedIds.length === allIds.length) {
        setBroadcastSelectedIds([]);
      } else {
        setBroadcastSelectedIds(allIds);
      }
    }
  };

  // Live calculation math
  const numTotalPeople =
    selectedMemberIds.length + (includeSelf ? 1 : 0);
  const numericTotal = Number(totalAmount) || 0;
  const sharePerPerson =
    numTotalPeople > 0 ? Math.round(numericTotal / numTotalPeople) : 0;

  // Handle Save & Add entries
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemName.trim() || numericTotal <= 0 || selectedMemberIds.length === 0) return;

    const createdEntries = [];

    // 1. Automatically add Udhar entry to each selected roommate's ledger
    selectedMemberIds.forEach((mId) => {
      const member = customers.find((c) => c.id === mId);
      if (member) {
        addTransaction({
          customerId: mId,
          type: "gave",
          amount: sharePerPerson,
          note: `Kitchen Expense: ${itemName.trim()} (Total ₹${numericTotal})`,
          mode: "UPI / Cash"
        });
        createdEntries.push({ member, share: sharePerPerson });
      }
    });

    // 2. Automatically log Cash Out entry in Cashbook for total item cost
    addCashEntry({
      type: "out",
      amount: numericTotal,
      category: "Kitchen Expense",
      note: `Bought ${itemName.trim()} (Split among ${selectedMemberIds.length} members)`
    });

    showToast(
      t.splitSuccess
        .replace("{count}", selectedMemberIds.length)
        .replace("{share}", sharePerPerson)
    );

    const members = createdEntries.map((e) => e.member);

    // Switch to Broadcast WhatsApp Reminders Screen — pre-select ALL members
    setSplitResult({
      itemName: itemName.trim(),
      totalAmount: numericTotal,
      sharePerPerson,
      members
    });
    setBroadcastSelectedIds(members.map((m) => m.id));
    setActiveQueueIndex(0);
    setSentIds([]);
  };

  // Build WhatsApp URL for a single member using wa.me scheme
  const buildWhatsAppUrl = (member) => {
    if (!splitResult) return "#";
    const upiId = business.upiId || business.phone || "9876543210@paytm";
    const msg = t.splitReminderMsg
      ? t.splitReminderMsg
          .replace("{name}", member.name)
          .replace("{item}", splitResult.itemName)
          .replace("{total}", splitResult.totalAmount)
          .replace("{share}", formatCurrency(splitResult.sharePerPerson))
          .replace("{upi}", upiId)
      : `Hi ${member.name}, kitchen expense update: ${splitResult.itemName} (Total ₹${splitResult.totalAmount}). Your share is ${formatCurrency(splitResult.sharePerPerson)}. Please pay via GPay/PhonePe to ${upiId}. Thank you! 🙏`;

    const phone = cleanPhoneNumber(member.phone);
    const encodedMsg = encodeURIComponent(msg);

    return phone
      ? `https://wa.me/${phone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;
  };

  // Mark member as sent on click
  const markAsSent = (memberId) => {
    setSentIds((prev) => [...new Set([...prev, memberId])]);
  };

  // 1-CLICK MULTI-RECIPIENT / GROUP SUMMARY SHARE (WhatsApp contact/group picker)
  const handleShareGroupWhatsApp = () => {
    if (broadcastSelectedIds.length === 0) {
      showToast("Please select at least one member to include in summary.", "error");
      return;
    }

    const upiId = business.upiId || business.phone || "9876543210@paytm";
    const membersToSend = splitResult.members.filter((m) =>
      broadcastSelectedIds.includes(m.id)
    );

    const memberListStr = membersToSend
      .map((m) => `• *${m.name}*: ${formatCurrency(splitResult.sharePerPerson)}`)
      .join("\n");

    const groupMsg = `🍲 *Kitchen Expense Split Summary*\n\n` +
      `📝 *Item:* ${splitResult.itemName}\n` +
      `💰 *Total Bill:* ₹${splitResult.totalAmount}\n` +
      `👤 *Share Per Person:* ${formatCurrency(splitResult.sharePerPerson)}\n\n` +
      `📋 *Breakdown for Selected Members (${membersToSend.length}):*\n${memberListStr}\n\n` +
      `💳 *Pay via UPI to:* ${upiId}\n` +
      `Thank you! 🙏`;

    const encodedMsg = encodeURIComponent(groupMsg);
    const waGroupUrl = `https://wa.me/?text=${encodedMsg}`;

    if (navigator.share) {
      navigator.share({
        title: `Kitchen Expense: ${splitResult.itemName}`,
        text: groupMsg
      }).catch(() => {
        window.open(waGroupUrl, "_blank");
      });
    } else {
      window.open(waGroupUrl, "_blank");
    }

    setSentIds(membersToSend.map((m) => m.id));
    showToast(`Opening WhatsApp to send summary to ${membersToSend.length} members!`);
  };

  // Option 2 Direct Multi-Member Queue (Guaranteed to bypass popup blocker)
  const selectedMembersQueue = splitResult
    ? splitResult.members.filter((m) => broadcastSelectedIds.includes(m.id))
    : [];

  const currentQueueMember = selectedMembersQueue[activeQueueIndex] || selectedMembersQueue[0];

  const handleNextQueueMember = () => {
    if (!currentQueueMember) return;

    // Open WhatsApp for current member in queue
    const url = buildWhatsAppUrl(currentQueueMember);
    window.open(url, "_blank");
    markAsSent(currentQueueMember.id);

    // Advance queue index
    if (activeQueueIndex < selectedMembersQueue.length - 1) {
      setActiveQueueIndex(activeQueueIndex + 1);
    } else {
      showToast("🎉 All selected members notified!");
    }
  };

  const handleResetAndClose = () => {
    setItemName("");
    setTotalAmount("");
    setSplitResult(null);
    setBroadcastSelectedIds([]);
    setSentIds([]);
    setActiveQueueIndex(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-slide-up max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                {splitResult ? "WhatsApp Broadcast" : t.splitTitle}
              </h3>
              <p className="text-[11px] text-slate-400">
                {splitResult
                  ? `Notify members about their share`
                  : "Auto-calculate share & update roommate ledgers"}
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          
          {/* STEP 1: FORM INPUTS */}
          {!splitResult ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Item Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.itemName} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kitchen Rice 10kg, Groceries, Electricity Bill"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.totalAmount} *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-lg">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="1000"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xl font-extrabold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Include Self Checkbox */}
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 flex items-center justify-between cursor-pointer" onClick={() => setIncludeSelf(!includeSelf)}>
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    {t.includeSelf}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeSelf}
                  onChange={(e) => setIncludeSelf(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Roommates / Members Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t.selectMembers} ({selectedMemberIds.length}/{customers.length})
                  </label>

                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    {selectedMemberIds.length === customers.length
                      ? "Deselect All"
                      : t.selectAll}
                  </button>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto space-y-1.5">
                  {customers.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-4">
                      {t.noCustomersFound} Add roommates first in your Khata book.
                    </div>
                  ) : (
                    customers.map((cust) => {
                      const isSelected = selectedMemberIds.includes(cust.id);
                      return (
                        <div
                          key={cust.id}
                          onClick={() => toggleMember(cust.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? "bg-white border-emerald-500 shadow-xs font-bold text-slate-900"
                              : "bg-transparent border-slate-200 text-slate-500 hover:bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                            <span className="text-xs">{cust.name}</span>
                          </div>

                          <span className="text-[11px] text-slate-400">
                            {cust.phone || "No phone"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Live Calculation Display Box */}
              {numericTotal > 0 && numTotalPeople > 0 && (
                <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Total Bill: ₹{numericTotal} ÷ {numTotalPeople} People ({selectedMemberIds.length} Roommates + {includeSelf ? "You" : "0"})
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
                    <span className="text-xs font-bold text-slate-300">
                      {t.splitPerPerson}:
                    </span>
                    <span className="text-2xl font-extrabold text-emerald-400">
                      {formatCurrency(sharePerPerson)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    💡 Clicking save will automatically log an Udhar entry of ₹{sharePerPerson} in each selected member's ledger.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={selectedMemberIds.length === 0 || numericTotal <= 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl shadow-lg transition-all active:scale-98 text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{t.saveAndBroadcast}</span>
              </button>

            </form>
          ) : (
            
            /* STEP 2: WHATSAPP BROADCAST REMINDERS */
            <div className="space-y-4">
              
              {/* Success Banner */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-extrabold text-slate-900 text-base">
                  Split Saved Successfully!
                </h4>
                <p className="text-xs text-slate-600">
                  Total <span className="font-bold">₹{splitResult.totalAmount}</span> for <span className="font-bold">{splitResult.itemName}</span> has been split. Added <span className="font-bold text-rose-600">₹{splitResult.sharePerPerson}</span> Udhar to {splitResult.members.length} members.
                </p>
              </div>

              {/* Member Selection for Broadcast */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <div>
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                      Select Members to Include
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {broadcastSelectedIds.length} of {splitResult.members.length} selected
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBroadcastSelectAll}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {broadcastSelectedIds.length === splitResult.members.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>

                {/* Members checklist with direct links */}
                <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                  {splitResult.members.map((member) => {
                    const isChecked = broadcastSelectedIds.includes(member.id);
                    const isSent = sentIds.includes(member.id);
                    const waUrl = buildWhatsAppUrl(member);
                    const cleanP = cleanPhoneNumber(member.phone);

                    return (
                      <div
                        key={member.id}
                        className={`bg-white p-3 rounded-2xl border transition-all ${
                          isChecked
                            ? "border-emerald-400 shadow-sm ring-1 ring-emerald-400/30"
                            : "border-slate-200 opacity-60"
                        }`}
                      >
                        {/* Top row: checkbox + name + direct anchor button */}
                        <div className="flex items-center justify-between gap-2">
                          
                          {/* Left: Checkbox + Member info */}
                          <button
                            type="button"
                            onClick={() => toggleBroadcastMember(member.id)}
                            className="flex items-center gap-2.5 flex-1 text-left"
                          >
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all ${
                              isChecked
                                ? "bg-emerald-600 border-emerald-600"
                                : "bg-white border-slate-300"
                            }`}>
                              {isChecked && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h5 className="text-xs font-bold text-slate-900 leading-tight">
                                  {member.name}
                                </h5>
                                {isSent && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold">
                                    ✓ Sent
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <p className="text-[11px] text-slate-500">
                                  Owes: <span className="font-bold text-rose-600">{formatCurrency(splitResult.sharePerPerson)}</span>
                                </p>
                                {!cleanP && (
                                  <span className="text-[10px] text-amber-600 font-semibold">• No phone</span>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Right: Real <a> Anchor Link (100% immune to popup blockers) */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => markAsSent(member.id)}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shrink-0 transition-colors ${
                              isSent
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{isSent ? "Resend" : "Direct"}</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        </div>

                        {/* Phone number display */}
                        {member.phone && (
                          <div className="flex items-center gap-1 mt-1.5 ml-7">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="text-[11px] text-slate-400 font-mono">
                              +{cleanP || member.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DUAL ACTION BUTTONS FOR SENDING */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                
                {/* 1. WHATSAPP MULTI-CONTACT / GROUP SUMMARY SHARE (RECOMMENDED 1-CLICK) */}
                <button
                  onClick={handleShareGroupWhatsApp}
                  disabled={broadcastSelectedIds.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-sm transition-all active:scale-98"
                >
                  <Share2 className="w-4 h-4" />
                  <span>
                    1-Click Group / Multi Share ({broadcastSelectedIds.length} Selected)
                  </span>
                </button>
                <p className="text-center text-[10px] text-slate-500 font-medium -mt-1">
                  ⚡ Opens WhatsApp contact/group picker to select 4-5 roommates or a WhatsApp Group to send all at once!
                </p>

                {/* 2. DIRECT QUEUE BUTTON (ONE-TAP TAP-TO-NEXT FOR MULTIPLE MEMBERS) */}
                {selectedMembersQueue.length > 0 && (
                  <div className="bg-slate-900 text-white p-3 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">
                        Send Direct Chats ({activeQueueIndex + 1}/{selectedMembersQueue.length})
                      </span>
                      {currentQueueMember && (
                        <span className="text-emerald-400 font-bold">
                          Next: {currentQueueMember.name}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={handleNextQueueMember}
                      disabled={broadcastSelectedIds.length === 0}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        Send to {currentQueueMember?.name || "Next"} & Advance
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  onClick={handleResetAndClose}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-2xl text-xs transition-colors"
                >
                  Done / Return to Khata
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
