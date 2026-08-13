import React, { useState } from "react";
import { useKitchen } from "../../context/useKitchen";
import { usePersonal } from "../../context/usePersonal";
import { translations } from "../../utils/translations";
import { formatDate } from "../../utils/formatters";
import {
  RotateCw,
  PlusCircle,
  CheckCircle2,
  MessageSquare,
  Clock,
  User,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Users,
  Calendar,
  PauseCircle,
  PlayCircle,
  Sparkles,
  UserCheck,
  Share2,
  LogOut,
  Plus
} from "lucide-react";
import { AddTurnItemModal } from "./AddTurnItemModal";

export const TurnTrackerView = () => {
  const {
    roster,
    members: customers,  // kitchen members mapped as 'customers' for backward compat
    markRosterBrought,
    deleteRosterItem,
    activeGroup,
    createKitchenGroup,
    joinKitchenGroup,
    leaveKitchenGroup,
    toggleMemberPause: toggleMemberPauseStatus,
    addManualMember,
    removeMember,
    showToast
  } = useKitchen();

  const { settings, customers: personalCustomers } = usePersonal();
  // Expose activeGroup.joinCode as kitchenGroupCode for backward compat
  const kitchenGroupCode = activeGroup?.joinCode || "";
  const t = translations[settings?.lang] || translations.en;

  // Add Roommate modal state
  const [isAddRoommateOpen, setIsAddRoommateOpen] = useState(false);
  const [newRoommateName, setNewRoommateName] = useState("");
  const [newRoommatePhone, setNewRoommatePhone] = useState("");


  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRosterItem, setEditingRosterItem] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // Group Code Join & Create Modal states
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [inputGroupCode, setInputGroupCode] = useState(kitchenGroupCode || "");

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [createCustomCode, setCreateCustomCode] = useState("");
  const [newlyCreatedCode, setNewlyCreatedCode] = useState(null);

  // Members Pause/Resume Drawer toggle
  const [showMemberManager, setShowMemberManager] = useState(false);


  // Quick Mark Modal state with Custom Date & Time support
  const [activeItemForMark, setActiveItemForMark] = useState(null);
  const [markCost, setMarkCost] = useState("");
  const [markNote, setMarkNote] = useState("");
  const [isCustomDateTime, setIsCustomDateTime] = useState(false);
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customTime, setCustomTime] = useState(() => new Date().toTimeString().slice(0, 5));

  // Automated WhatsApp Transition Modal state
  const [autoReminderData, setAutoReminderData] = useState(null);

  const handleOpenAddModal = () => {
    setEditingRosterItem(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingRosterItem(item);
    setIsAddModalOpen(true);
  };

  const handleOpenMarkModal = (item) => {
    setActiveItemForMark(item);
    setMarkCost(item.lastBroughtCost ? item.lastBroughtCost.toString() : "");
    setMarkNote("");
    setIsCustomDateTime(false);
    setCustomDate(new Date().toISOString().slice(0, 10));
    setCustomTime(new Date().toTimeString().slice(0, 5));
  };

  const handleCopyGroupCode = (codeOverride) => {
    const targetCode = typeof codeOverride === "string" ? codeOverride : kitchenGroupCode;
    if (!targetCode) return;
    navigator.clipboard.writeText(targetCode);
    showToast(`Kitchen Group Code "${targetCode}" copied to clipboard! Share with all 4 members.`);
  };

  const handleShareKitchenCodeWhatsApp = (codeOverride) => {
    const targetCode = typeof codeOverride === "string" ? codeOverride : kitchenGroupCode;
    if (!targetCode) return;
    const msg = `Hi Roommates! 🍲 Join our Shared Kitchen Duty Group on Digital Khata to track Aata, Water, Gas & Groceries turn by turn!\n\n🔑 Kitchen Group Code: *${targetCode}*\n\nOpen Digital Khata app -> Turn Tracker -> Join Roommate Code!`;
    sendWhatsAppMsg("", msg);
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    const groupName = createGroupName.trim() || "Shared Kitchen";
    const groupObj = await createKitchenGroup(groupName);
    if (groupObj && groupObj.joinCode) {
      setNewlyCreatedCode(groupObj.joinCode);
    }
  };

  const handleJoinGroupSubmit = async (e) => {
    e.preventDefault();
    if (inputGroupCode.trim()) {
      await joinKitchenGroup(inputGroupCode.trim());
      setIsJoinGroupOpen(false);
    }
  };


  const handleConfirmMarkBrought = (e) => {
    if (e) e.preventDefault();
    if (!activeItemForMark) return;

    // Filter active non-paused members for current turn calculation
    const activeMemberIds = (activeItemForMark.memberIds || []).filter((mId) => {
      const m = customers.find((c) => c.id === mId);
      return m ? m.status !== "paused" : true;
    });

    const memberListToUse = activeMemberIds.length > 0 ? activeMemberIds : (activeItemForMark.memberIds || []);

    const currentMemberId =
      memberListToUse.length > 0
        ? memberListToUse[activeItemForMark.currentTurnIndex % memberListToUse.length || 0]
        : null;

    if (!currentMemberId) {
      showToast("No active member found for this turn!", "error");
      return;
    }

    // Build custom timestamp if user picked past date & time
    let selectedISO = new Date().toISOString();
    if (isCustomDateTime && customDate && customTime) {
      try {
        const fullDateStr = `${customDate}T${customTime}:00`;
        selectedISO = new Date(fullDateStr).toISOString();
      } catch {
        selectedISO = new Date().toISOString();
      }
    }

    const currentMember = customers.find((c) => c.id === currentMemberId);
    const currentMemberName = currentMember ? currentMember.name : "Member";

    // Advance turn index calculation for next member
    const nextTurnIdx = memberListToUse.length > 0 ? (activeItemForMark.currentTurnIndex + 1) % memberListToUse.length : 0;
    const nextMemberId = memberListToUse[nextTurnIdx];
    const nextMember = customers.find((c) => c.id === nextMemberId);

    // Call context action
    markRosterBrought(
      activeItemForMark.id,
      currentMemberId,
      Number(markCost) || 0,
      markNote.trim(),
      selectedISO
    );

    const formattedLogTime = formatDate(selectedISO);

    // Prepare automatic WhatsApp transition reminder data if next member exists
    if (nextMember) {
      const msg = `Hi ${nextMember.name} 👋, ${currentMemberName} brought ${activeItemForMark.itemName} on ${formattedLogTime}. Next time it is YOUR TURN to bring ${activeItemForMark.itemName}! Don't forget! 🍲`;

      setAutoReminderData({
        itemName: activeItemForMark.itemName,
        broughtBy: currentMemberName,
        nextMember,
        dateTimeStr: formattedLogTime,
        message: msg
      });
    }

    setActiveItemForMark(null);
  };

  // Send WhatsApp Reminder Link
  const sendWhatsAppMsg = (phone, msg) => {
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
    const encodedMsg = encodeURIComponent(msg);
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;
    window.open(waUrl, "_blank");
  };

  const handleSendManualReminder = (item) => {
    const activeMemberIds = (item.memberIds || []).filter((mId) => {
      const m = customers.find((c) => c.id === mId || c.userId === mId);
      return m ? m.status !== "paused" : true;
    });

    const listToUse = activeMemberIds.length > 0 ? activeMemberIds : (item.memberIds || []);
    const nextMemberId = listToUse[item.currentTurnIndex % listToUse.length || 0];
    const nextMember = customers.find((c) => c.id === nextMemberId || c.userId === nextMemberId);

    if (!nextMember) {
      showToast("No active member assigned for this turn!", "error");
      return;
    }

    const lastMember = customers.find((c) => c.id === item.lastBroughtBy);
    const lastMemberName = lastMember ? lastMember.name : "Previous member";
    const lastDateStr = item.lastBroughtDate ? formatDate(item.lastBroughtDate) : "earlier";

    const msg = `Hi ${nextMember.name} 👋, reminder: It's your turn today to bring ${item.itemName}! Last brought by ${lastMemberName} on ${lastDateStr}. Thank you! 🍲`;

    sendWhatsAppMsg(nextMember.phone, msg);
  };

  const activeMembersCount = customers.filter((c) => c.status !== "paused").length;
  const pausedMembersCount = customers.filter((c) => c.status === "paused").length;

  return (
    <div className="pb-28 pt-2 px-3 max-w-2xl mx-auto space-y-4">
      
      {/* Premium Shared Kitchen Live Sync Header Banner */}
      {!kitchenGroupCode ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-3xl shadow-xl border border-emerald-500/20 text-center flex flex-col items-center gap-4 transition-all hover:shadow-emerald-900/20">
          
          {/* Decorative glowing orbs */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal-500/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shadow-inner">
            <Users className="w-8 h-8" />
          </div>
          
          <div className="relative z-10 space-y-1.5">
            <h2 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              Sync Your Roommate Kitchen
            </h2>
            <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
              Connect your roommates to track <strong className="text-emerald-300">Aata, Water, Gas & Groceries</strong>. Share a unique code and sync duties live!
            </p>
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto pt-2">
            <button
              onClick={() => {
                setCreateGroupName("");
                setCreateCustomCode("");
                setNewlyCreatedCode(null);
                setIsCreateGroupOpen(true);
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black px-6 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Group</span>
            </button>
            <button
              onClick={() => setIsJoinGroupOpen(true)}
              className="w-full sm:w-auto bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-sm text-white font-extrabold px-6 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 border border-slate-600 shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Join via Code</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-md space-y-3 border border-slate-800">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <RotateCw className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-extrabold text-base">{t.rosterTitle}</h2>
                  <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    LIVE DB SYNC
                  </span>
                </div>
                <p className="text-xs text-slate-400">Roommate Accounts Connected • Real-time Sync</p>
              </div>
            </div>

            <button
              onClick={() => leaveKitchenGroup()}
              className="text-slate-400 hover:text-rose-400 text-xs font-bold p-1.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1"
              title="Disconnect Kitchen Group"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>

          {/* Kitchen Group Code pill bar */}
          <div className="bg-slate-800/90 border border-emerald-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest block mb-0.5">
                  Your Group Code
                </span>
                <span className="text-lg font-black tracking-widest text-emerald-300 drop-shadow-sm">
                  {kitchenGroupCode}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 relative z-10 w-full sm:w-auto">
              <button
                onClick={() => handleShareKitchenCodeWhatsApp()}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                title="Share Code on WhatsApp"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              <button
                onClick={() => handleCopyGroupCode()}
                className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title="Copy Code"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>

              <button
                onClick={() => setIsJoinGroupOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <span>Switch Code</span>
              </button>
            </div>
          </div>

          {/* Member Status & Pause Manager Bar */}
          <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-slate-800 gap-2">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="font-bold text-emerald-400">
                {activeMembersCount} Active Members
              </span>
              {pausedMembersCount > 0 && (
                <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  ⏸️ {pausedMembersCount} Paused
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddRoommateOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Roommate</span>
              </button>

              <button
                onClick={() => setShowMemberManager(!showMemberManager)}
                className="text-emerald-400 hover:text-emerald-300 font-bold text-xs flex items-center gap-1"
              >
                <span>{showMemberManager ? "Hide Members" : "Manage Members"}</span>
                {showMemberManager ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

        </div>
      )}


      {/* Expandable Kitchen Member Manager Drawer */}
      {showMemberManager && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Kitchen Group Members ({customers.length})
              </h3>
            </div>
            <button
              onClick={() => setIsAddRoommateOpen(true)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Roommate / Customer</span>
            </button>
          </div>

          <div className="space-y-2">
            {customers.map((cust) => {
              const isPaused = cust.status === "paused";
              const isOwnerOrAdmin = activeGroup?.role === "OWNER" || activeGroup?.role === "ADMIN";

              return (
                <div
                  key={cust.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    isPaused
                      ? "bg-amber-50/60 border-amber-200 text-amber-900"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        isPaused ? "bg-amber-200 text-amber-900" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {(cust.name || "?").substring(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs">{cust.name}</span>
                        {cust.isManual && (
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md">
                            Roommate (No App)
                          </span>
                        )}
                        {isPaused ? (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300/60 px-2 py-0.5 rounded-md flex items-center gap-1" title={cust.pausedAt ? `Paused on ${new Date(cust.pausedAt).toLocaleString()}` : ""}>
                            <span>⏸️ Paused</span>
                            {cust.pausedByName && (
                              <span className="font-medium text-amber-800 border-l border-amber-300/80 pl-1">
                                by {cust.pausedByName}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
                            ▶️ Active
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">{cust.phone || (cust.isManual ? "Manual member" : "No phone")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleMemberPauseStatus(cust.id || cust.userId)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all ${
                        isPaused
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-amber-600 hover:bg-amber-700 text-white"
                      }`}
                    >
                      {isPaused ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Resume ▶️</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Pause ⏸️</span>
                        </>
                      )}
                    </button>

                    {(isOwnerOrAdmin || cust.isManual || cust.isMe) && cust.role !== "OWNER" && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove "${cust.name}" from this kitchen group?`)) {
                            removeMember(cust.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Roster Items List */}
      <div className="space-y-3">
        {roster.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-3">
            <RotateCw className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No duty rotation items added yet.</p>
            <p className="text-xs text-slate-400">Track who brings Water Cans, Milk, Gas Cylinders, Aata, Rice by turns.</p>
            <button
              onClick={handleOpenAddModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.addItemDuty}</span>
            </button>
          </div>
        ) : (
          roster.map((item) => {
            // Filter active non-paused members for turn display
            const activeMemberIds = (item.memberIds || []).filter((mId) => {
              const m = customers.find((c) => c.id === mId || c.userId === mId);
              return m ? m.status !== "paused" : true;
            });

            const listToUse = activeMemberIds.length > 0 ? activeMemberIds : (item.memberIds || []);
            const nextMemberId = listToUse[item.currentTurnIndex % listToUse.length || 0];
            const nextMember = customers.find((c) => c.id === nextMemberId || c.userId === nextMemberId);
            const lastMember = customers.find((c) => c.id === item.lastBroughtBy || c.userId === item.lastBroughtBy);
            const isExpanded = expandedHistoryId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3 transition-all hover:border-slate-300"
              >
                {/* Top Row: Item Name, Category & Actions */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {item.category || "Rotation Item"}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base mt-1">
                      {item.itemName}
                    </h3>

                    {/* Author / Edit Audit Label */}
                    {item.lastEditedBy && (
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Last edit: <strong className="text-slate-600">{item.lastEditedBy}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                      title="Edit Duty Item & Rotation"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => deleteRosterItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-slate-100 transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Whose Turn Next Banner */}
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/60 p-4 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-1">
                      🎯 {t.whoseTurnNext}:
                    </span>
                    <div className="text-lg font-black text-emerald-900 flex items-center gap-2">
                      <div className="bg-emerald-200/50 p-1 rounded-lg">
                        <User className="w-5 h-5 text-emerald-700" />
                      </div>
                      <span>{nextMember ? nextMember.name : "Unassigned"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendManualReminder(item)}
                    className="relative z-10 bg-white hover:bg-emerald-50 active:scale-95 text-emerald-700 border border-emerald-200 text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all shrink-0"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span>Remind</span>
                  </button>
                </div>

                {/* Last Brought By Info */}
                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-150 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {t.lastBroughtBy}: <strong className="text-slate-800">{lastMember ? lastMember.name : "N/A"}</strong>
                    </span>
                  </div>

                  <span className="text-slate-400 text-[11px]">
                    {item.lastBroughtDate ? formatDate(item.lastBroughtDate) : "No date"}
                  </span>
                </div>

                {/* Rotation Order Queue Pills */}
                {item.memberIds && item.memberIds.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {t.rotationOrder}:
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar text-xs">
                      {item.memberIds.map((mId) => {
                        const m = customers.find((c) => c.id === mId);
                        const isPaused = m?.status === "paused";
                        const isCurrentTurn = mId === nextMemberId;

                        return (
                          <div
                            key={mId}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 ${
                              isPaused
                                ? "bg-amber-100 text-amber-800 border border-amber-200 line-through opacity-70"
                                : isCurrentTurn
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span>{m ? m.name : "Member"}</span>
                            {isPaused && <span className="text-[10px]"> (Paused ⏸️)</span>}
                            {isCurrentTurn && !isPaused && <span className="text-[10px]"> (Turn)</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Primary Action: Mark Brought Today */}
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenMarkModal(item)}
                    className="w-full sm:w-auto flex-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-slate-900/10 text-sm flex items-center justify-center gap-2 transition-all uppercase tracking-wide"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>{t.markBroughtToday}</span>
                  </button>

                  <button
                    onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                    className="w-full sm:w-auto px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-95"
                  >
                    <span>Logs ({item.history?.length || 0})</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expandable History Log */}
                {isExpanded && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs animate-fade-in">
                    <span className="font-bold text-slate-700 block border-b border-slate-200 pb-1">
                      {t.historyLogs}
                    </span>
                    {!item.history || item.history.length === 0 ? (
                      <p className="text-slate-400 italic">No history records yet.</p>
                    ) : (
                      item.history.map((log, idx) => {
                        const m = customers.find((c) => c.id === log.memberId);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between border-b border-slate-100 last:border-0 pb-1.5"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">{m ? m.name : "Member"}</span>
                                {log.markedBy && (
                                  <span className="text-[10px] bg-slate-200 text-slate-700 font-medium px-1.5 py-0.2 rounded">
                                    Logged by {log.markedBy}
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-500 block text-[11px] font-medium">
                                📅 {formatDate(log.date)} {log.note ? `• ${log.note}` : ""}
                              </span>
                            </div>
                            {log.cost > 0 && (
                              <span className="font-extrabold text-emerald-600">₹{log.cost}</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-20 right-4 z-30">
        <button
          onClick={handleOpenAddModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400/40 transition-transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.addItemDuty}</span>
        </button>
      </div>

      {/* Quick Mark Modal with Custom Date & Time option */}
      {activeItemForMark && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 animate-slide-up">
            
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                Mark Brought: {activeItemForMark.itemName}
              </h3>
              <button
                onClick={() => setActiveItemForMark(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmMarkBrought} className="space-y-3">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs">
                <span>Member Bringing Today: </span>
                <strong className="text-emerald-800 text-sm">
                  {customers.find(
                    (c) =>
                      c.id ===
                      (
                        (activeItemForMark.memberIds || []).filter((mId) => {
                          const m = customers.find((cust) => cust.id === mId);
                          return m ? m.status !== "paused" : true;
                        })[
                          activeItemForMark.currentTurnIndex %
                            ((activeItemForMark.memberIds || []).filter((mId) => {
                              const m = customers.find((cust) => cust.id === mId);
                              return m ? m.status !== "paused" : true;
                            }).length || 1)
                        ]
                      )
                  )?.name || "Next Active Member"}
                </strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Item Cost (₹) (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 90 or 380"
                  value={markCost}
                  onChange={(e) => setMarkCost(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Note / Brand (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fortune 10kg Aata, Bisleri water"
                  value={markNote}
                  onChange={(e) => setMarkNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Backdated Date & Time Selector Option */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setIsCustomDateTime(!isCustomDateTime)}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>Log Past Date & Time (If brought earlier)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isCustomDateTime}
                    onChange={(e) => setIsCustomDateTime(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                </div>

                {isCustomDateTime && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-xs font-bold">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Time</label>
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl shadow-lg text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>CONFIRM BROUGHT & ADVANCE TURN 🔄</span>
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Automated WhatsApp Turn Transition Popup */}
      {autoReminderData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-5 space-y-4 text-center animate-slide-up">
            
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 animate-bounce" />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Turn Advanced Successfully!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                <strong className="text-slate-800">{autoReminderData.broughtBy}</strong> completed bringing <strong className="text-emerald-700">{autoReminderData.itemName}</strong> on {autoReminderData.dateTimeStr}.
              </p>
            </div>

            {/* Next Member WhatsApp Notice Box */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-left space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Next Turn: {autoReminderData.nextMember.name}</span>
              </div>

              <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-emerald-100 italic">
                "{autoReminderData.message}"
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  sendWhatsAppMsg(autoReminderData.nextMember.phone, autoReminderData.message);
                  setAutoReminderData(null);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl shadow-lg text-xs flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>SEND AUTOMATIC WHATSAPP TO {autoReminderData.nextMember.name.toUpperCase()}</span>
              </button>

              <button
                onClick={() => setAutoReminderData(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Close / Skip WhatsApp
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Create New Kitchen Group Modal */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5 animate-slide-up relative overflow-hidden">
            
            {/* Decorative Top Background */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-emerald-50 to-white -z-10"></div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="font-black text-lg text-slate-900 tracking-tight">
                  Create Group
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateGroupOpen(false);
                  setNewlyCreatedCode(null);
                }}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newlyCreatedCode ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-8 h-8 animate-bounce" />
                </div>

                <div>
                  <h4 className="font-black text-slate-900 text-xl tracking-tight">
                    Group Created! 🎉
                  </h4>
                  <p className="text-sm text-slate-500 mt-2 font-medium px-4">
                    Share this code with your roommates so they can sync duties.
                  </p>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border-2 border-emerald-500/20 shadow-lg relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="text-xs text-emerald-400/80 uppercase font-black tracking-widest block mb-1 relative z-10">
                    Your Kitchen Code
                  </span>
                  <span className="text-3xl font-black tracking-widest text-white relative z-10 drop-shadow-md">
                    {newlyCreatedCode}
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => handleShareKitchenCodeWhatsApp(newlyCreatedCode)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-transform active:scale-95"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>SHARE ON WHATSAPP 📲</span>
                  </button>

                  <button
                    onClick={() => handleCopyGroupCode(newlyCreatedCode)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy to Clipboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsCreateGroupOpen(false);
                      setNewlyCreatedCode(null);
                    }}
                    className="w-full text-slate-500 hover:text-slate-700 font-bold py-2 text-sm transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateGroupSubmit} className="space-y-5 pt-2">
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  Generate a <strong className="text-slate-800">Kitchen Group Code</strong> to connect your duty tracker instantly.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Group Name <span className="text-slate-400 font-medium">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 402 Roommates"
                      value={createGroupName}
                      onChange={(e) => setCreateGroupName(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:font-medium placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Custom Code <span className="text-slate-400 font-medium">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KITCHEN-9821"
                      value={createCustomCode}
                      onChange={(e) => setCreateCustomCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-black uppercase text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:font-medium placeholder:text-slate-400 tracking-wider"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl text-sm shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 transition-transform active:scale-95 mt-2"
                >
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                  <span>CREATE GROUP 🚀</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Join / Switch Group Code Modal */}
      {isJoinGroupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5 animate-slide-up relative overflow-hidden">
            
            {/* Decorative Top Background */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 to-white -z-10"></div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-black text-lg text-slate-900 tracking-tight">
                  Join Group
                </h3>
              </div>
              <button
                onClick={() => setIsJoinGroupOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinGroupSubmit} className="space-y-5 pt-2">
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Enter your roommate team's <strong className="text-slate-800">Shared Kitchen Code</strong> to join their database instantly.
              </p>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Kitchen Group Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KITCHEN-491"
                  value={inputGroupCode}
                  onChange={(e) => setInputGroupCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-base font-black uppercase text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:font-medium placeholder:text-slate-400 tracking-widest text-center"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black py-4 rounded-2xl text-sm shadow-xl shadow-emerald-500/20 transition-transform active:scale-95 mt-2"
              >
                CONNECT DATABASE 🟢
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Add / Edit Turn Duty Item Modal */}
      <AddTurnItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialRosterItem={editingRosterItem}
      />

      {/* Add Roommate / Customer Modal */}
      {isAddRoommateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4 animate-slide-up relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">Add Roommate / Customer</h3>
              </div>
              <button onClick={() => setIsAddRoommateOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Add any roommate, friend, or customer to the kitchen rotation. They do not need to have an account!
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newRoommateName.trim()) return;
                await addManualMember(newRoommateName.trim(), newRoommatePhone.trim());
                setNewRoommateName("");
                setNewRoommatePhone("");
                setIsAddRoommateOpen(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Roommate Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh / Room 4"
                  value={newRoommateName}
                  onChange={(e) => setNewRoommateName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newRoommatePhone}
                  onChange={(e) => setNewRoommatePhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {personalCustomers && personalCustomers.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Or import from your Khata customers:</label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {personalCustomers.map((pc) => (
                      <button
                        key={pc.id}
                        type="button"
                        onClick={async () => {
                          await addManualMember(pc.name, pc.phone || "");
                          setIsAddRoommateOpen(false);
                        }}
                        className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 text-slate-700 font-bold text-xs px-2.5 py-1.5 rounded-xl transition-colors"
                      >
                        + {pc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!newRoommateName.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-sm transition-colors shadow-sm"
              >
                Add Roommate to Rotation
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};


