import React, { useState } from "react";
import { useKitchen } from "../../context/KitchenContext";
import {
  ChefHat, Plus, UserPlus, LogOut, Users, Copy, Check,
  Share2, QrCode, Crown, Shield, User, Pause, Play,
  ChevronRight, AlertCircle, Loader2, RefreshCw
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useConfirm } from "../ui/ConfirmDialog";

export const KitchenGroupScreen = () => {
  const {
    activeGroup, myGroups, activateGroup,
    createKitchenGroup, joinKitchenGroup, leaveKitchenGroup,
    members, roster, kitchenCashbook,
    toggleMemberPause, kitchenError, setKitchenError,
    isLoading, fetchGroupData, getInviteInfo, showToast
  } = useKitchen();

  const { confirm, ConfirmUI } = useConfirm();

  const [view, setView] = useState("main"); // main | create | join | groupDetail | invite
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteInfo, setInviteInfo] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setIsBusy(true);
    setKitchenError("");
    await createKitchenGroup(groupName.trim());
    setIsBusy(false);
    setGroupName("");
    setView("groupDetail");
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsBusy(true);
    setKitchenError("");
    const result = await joinKitchenGroup(joinCode.trim());
    setIsBusy(false);
    if (result) { setJoinCode(""); setView("groupDetail"); }
  };

  const handleLeave = () => {
    confirm({
      title: `Leave "${activeGroup?.name}"?`,
      description: "You will lose access to this kitchen group's shared data. You can rejoin with the group code.",
      confirmLabel: "Leave Group",
      variant: "danger",
      onConfirm: async () => {
        await leaveKitchenGroup(activeGroup.id);
        setView("main");
      }
    });
  };

  const handleGetInvite = async () => {
    setIsBusy(true);
    const info = await getInviteInfo();
    setInviteInfo(info);
    setIsBusy(false);
    setView("invite");
  };

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      showToast("Copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsAppShare = () => {
    if (!inviteInfo) return;
    const text = encodeURIComponent(inviteInfo.whatsappText);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const roleIcon = (role) => {
    if (role === "OWNER") return <Crown className="w-3.5 h-3.5 text-amber-500" />;
    if (role === "ADMIN") return <Shield className="w-3.5 h-3.5 text-blue-500" />;
    return <User className="w-3.5 h-3.5 text-slate-400" />;
  };

  // ── Main view — no group selected ──────────────────────────────────────
  if (view === "main") {
    return (
      <div className="space-y-4">
        {ConfirmUI}

        {/* My groups list */}
        {myGroups.length > 0 && (
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-800 mb-3 flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-emerald-600" />
              My Kitchen Groups
            </h3>
            <div className="space-y-2">
              {myGroups.map(g => (
                <button key={g.id}
                  onClick={() => { activateGroup(g); setView("groupDetail"); }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 transition-colors text-left">
                  <div>
                    <p className="font-bold text-sm text-slate-800">{g.name}</p>
                    <p className="text-xs text-slate-500">{g.memberCount} members · {g.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeGroup?.id === g.id && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create / Join actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setView("create"); setKitchenError(""); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl flex flex-col items-center gap-1.5 text-xs transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            Create Group
          </button>
          <button onClick={() => { setView("join"); setKitchenError(""); }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 rounded-2xl flex flex-col items-center gap-1.5 text-xs transition-colors border border-slate-200">
            <UserPlus className="w-5 h-5 text-slate-600" />
            Join Group
          </button>
        </div>

        {myGroups.length === 0 && (
          <div className="text-center py-6 text-slate-400">
            <ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No kitchen groups yet</p>
            <p className="text-xs mt-1">Create a group for your flatmates or join an existing one</p>
          </div>
        )}
      </div>
    );
  }

  // ── Create group ───────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {ConfirmUI}
        <div className="flex items-center gap-2">
          <button onClick={() => setView("main")} className="text-slate-400 hover:text-slate-700">←</button>
          <h3 className="font-extrabold text-base text-slate-800">Create Kitchen Group</h3>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Group Name</label>
            <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. Room 204 Kitchen" maxLength={100}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus />
          </div>

          {kitchenError && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {kitchenError}
            </div>
          )}

          <button type="submit" disabled={isBusy || !groupName.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Group
          </button>
        </form>
      </div>
    );
  }

  // ── Join group ─────────────────────────────────────────────────────────
  if (view === "join") {
    return (
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {ConfirmUI}
        <div className="flex items-center gap-2">
          <button onClick={() => setView("main")} className="text-slate-400 hover:text-slate-700">←</button>
          <h3 className="font-extrabold text-base text-slate-800">Join Kitchen Group</h3>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Group Join Code</label>
            <input type="text" value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
              placeholder="e.g. KT-A8F2B3" maxLength={12}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus />
            <p className="text-xs text-slate-400 mt-1">Get this code from the kitchen group OWNER or ADMIN</p>
          </div>

          {kitchenError && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {kitchenError}
            </div>
          )}

          <button type="submit" disabled={isBusy || joinCode.length < 5}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Join Group
          </button>
        </form>
      </div>
    );
  }

  // ── Group detail view ──────────────────────────────────────────────────
  if (view === "groupDetail" && activeGroup) {
    const canInvite = activeGroup.role === "OWNER" || activeGroup.role === "ADMIN";
    const totalSpent = kitchenCashbook
      .filter(e => e.type === "out")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return (
      <div className="space-y-4">
        {ConfirmUI}

        {/* Header */}
        <div className="bg-emerald-600 text-white p-5 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setView("main")} className="text-emerald-200 hover:text-white text-sm">← Groups</button>
            <div className="flex items-center gap-1">
              {roleIcon(activeGroup.role)}
              <span className="text-xs font-bold opacity-90">{activeGroup.role}</span>
            </div>
          </div>
          <h2 className="font-extrabold text-xl">{activeGroup.name}</h2>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-emerald-100">
              <Users className="w-3.5 h-3.5" />
              <span>{members.length} / {activeGroup.maxMembers} members</span>
            </div>
            <button onClick={() => fetchGroupData(activeGroup.id)} className="text-emerald-200 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
            <p className="text-lg font-extrabold text-slate-900">{members.length}</p>
            <p className="text-xs text-slate-500">Members</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
            <p className="text-lg font-extrabold text-slate-900">{roster.length}</p>
            <p className="text-xs text-slate-500">Duties</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center border border-slate-100 shadow-sm">
            <p className="text-lg font-extrabold text-emerald-600">₹{totalSpent.toLocaleString("en-IN")}</p>
            <p className="text-xs text-slate-500">Spent</p>
          </div>
        </div>

        {/* Join code */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-600 mb-2">Join Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5 font-mono text-lg font-extrabold text-slate-800 tracking-widest border border-slate-200">
              {activeGroup.joinCode}
            </div>
            <button onClick={() => handleCopyCode(activeGroup.joinCode)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors" title="Copy Join Code">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowQR(true)}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors flex items-center gap-1 text-xs" title="Show QR Code">
              <QrCode className="w-4 h-4" />
              <span>QR</span>
            </button>
          </div>
        </div>

        {/* Join QR Modal */}
        {showQR && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Scan to Join "{activeGroup.name}"</h3>
              <div className="bg-slate-50 p-4 rounded-2xl inline-block border border-slate-200">
                <QRCodeSVG value={activeGroup.joinCode} size={180} level="H" includeMargin />
              </div>
              <div className="font-mono text-xl font-black text-emerald-600 tracking-widest">
                {activeGroup.joinCode}
              </div>
              <button
                onClick={() => setShowQR(false)}
                className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-800 mb-3">Members</h3>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">
                    {(m.name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-800">{m.name}</p>
                      {m.isMe && <span className="text-[10px] text-slate-400">(you)</span>}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {roleIcon(m.role)}
                      <span className="text-[10px] text-slate-500">{m.role}</span>
                      {m.status === "paused" && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold ml-1">PAUSED</span>
                      )}
                    </div>
                  </div>
                </div>
                {(canInvite || m.isMe) && m.role !== "OWNER" && (
                  <button onClick={() => toggleMemberPause(m.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title={m.status === "paused" ? "Resume member" : "Pause member (skip in rotation)"}>
                    {m.status === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {canInvite && (
            <button onClick={handleGetInvite} disabled={isBusy}
              className="w-full bg-white border border-slate-200 hover:bg-emerald-50 text-slate-800 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors shadow-sm">
              <Share2 className="w-4 h-4 text-emerald-600" />
              Share Invite
            </button>
          )}
          <button onClick={handleLeave}
            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors">
            <LogOut className="w-4 h-4" />
            Leave Group
          </button>
        </div>
      </div>
    );
  }

  // ── Invite view ────────────────────────────────────────────────────────
  if (view === "invite" && inviteInfo) {
    return (
      <div className="space-y-4">
        {ConfirmUI}
        <div className="flex items-center gap-2">
          <button onClick={() => setView("groupDetail")} className="text-slate-400 hover:text-slate-700">← Back</button>
          <h3 className="font-extrabold text-base text-slate-800">Share Invite</h3>
        </div>

        {/* QR Code */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <QRCodeSVG
              value={inviteInfo.joinCode}
              size={180}
              bgColor="white"
              fgColor="#1e293b"
              level="M"
            />
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Scan QR or use code</p>
            <p className="font-mono text-2xl font-extrabold text-slate-800 tracking-widest">{inviteInfo.joinCode}</p>
          </div>
        </div>

        {/* Share actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleCopyCode(inviteInfo.joinCode)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            Copy Code
          </button>
          <button onClick={handleWhatsAppShare}
            className="bg-[#25D366] hover:bg-[#20b558] text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors">
            <Share2 className="w-4 h-4" />
            WhatsApp
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Code expires: {inviteInfo.expiresAt ? new Date(inviteInfo.expiresAt).toLocaleDateString("en-IN") : "Never"}
        </p>
      </div>
    );
  }

  // Loading fallback
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return null;
};
