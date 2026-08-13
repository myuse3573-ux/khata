import React, { useState } from "react";
import { usePersonal } from "../../context/PersonalContext";
import { useAuth } from "../../context/AuthContext";
import { exportBackupData, downloadAsJson, parseImportData } from "../../utils/storage";
import {
  Store, Globe, Download, Upload, Shield,
  Smartphone, Lock, User, LogOut, KeyRound, Eye, EyeOff,
  ChefHat
} from "lucide-react";
import { KitchenGroupScreen } from "../kitchen/KitchenGroupScreen";

export const SettingsView = () => {
  const { business, updateBusinessProfile, settings, setLang, updateSettings, importBackupData,
    customers, transactions, cashbook, books, showToast } = usePersonal();
  const { user, logout, changePassword, lockApp } = useAuth();
  const [activeSection, setActiveSection] = useState("profile"); // profile | kitchen | lang | backup | account

  // Business profile form
  const [shopName, setShopName] = useState(business.name || "");
  const [ownerName, setOwnerName] = useState(business.owner || "");
  const [phone, setPhone] = useState(business.phone || "");
  const [address, setAddress] = useState(business.address || "");
  const [upiId, setUpiId] = useState(business.upiId || "");
  const [gstin, setGstin] = useState(business.gstin || "");

  // PIN form
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState("");

  // Password change
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [passError, setPassError] = useState("");

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateBusinessProfile({ name: shopName, owner: ownerName, phone, address, upiId, gstin });
  };

  const handleExportBackup = () => {
    const data = exportBackupData({ business, books, customers, transactions, cashbook, settings });
    downloadAsJson(data, `Khata_Backup_${user?.name?.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`);
    showToast("Backup downloaded!");
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseImportData(ev.target.result);
      if (!result.valid) {
        showToast(result.error, "error");
        return;
      }
      importBackupData(result.data);
      showToast("Backup imported successfully!");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSavePIN = () => {
    setPinError("");
    if (!newPin || newPin.length < 4) { setPinError("PIN must be at least 4 digits."); return; }
    if (!/^\d+$/.test(newPin)) { setPinError("PIN must contain only digits."); return; }
    if (currentPin !== settings.pin && settings.pin) { setPinError("Current PIN is incorrect."); return; }
    updateSettings({ pin: newPin });
    setCurrentPin("");
    setNewPin("");
    showToast("PIN updated!");
  };

  const handleRemovePIN = () => {
    if (currentPin !== settings.pin) { setPinError("Current PIN is incorrect."); return; }
    updateSettings({ pin: "" });
    setCurrentPin("");
    showToast("PIN removed.");
  };

  const handleChangePassword = async () => {
    setPassError("");
    if (!currentPass || !newPass) { setPassError("Both fields required."); return; }
    if (newPass.length < 4) { setPassError("New password must be at least 4 characters."); return; }
    const result = await changePassword(currentPass, newPass);
    if (result.success) { showToast("Password changed!"); setCurrentPass(""); setNewPass(""); }
    else setPassError(result.error || "Failed.");
  };

  const sections = [
    { id: "profile", label: "Business", icon: Store },
    { id: "kitchen", label: "Kitchen", icon: ChefHat },
    { id: "lang", label: "Language", icon: Globe },
    { id: "backup", label: "Backup", icon: Shield },
    { id: "account", label: "Account", icon: User }
  ];

  return (
    <div className="pb-28 pt-2 max-w-2xl mx-auto">
      {/* Section tabs */}
      <div className="px-3 mb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  activeSection === s.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 space-y-4">
        {/* ── Business Profile ───────────────────────────────────────── */}
        {activeSection === "profile" && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <Store className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-base text-slate-800">Business Profile</h3>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Shop / Business Name</label>
                <input type="text" value={shopName} onChange={e => setShopName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Owner Name</label>
                  <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block mb-1">Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block mb-1">Address</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">UPI ID</label>
                  <input type="text" placeholder="9876543210@paytm" value={upiId} onChange={e => setUpiId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block mb-1">GSTIN (optional)</label>
                  <input type="text" placeholder="07AAAAA0000A1Z5" value={gstin} onChange={e => setGstin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl shadow-sm transition-all text-xs">
                Save Business Info
              </button>
            </form>
          </div>
        )}

        {/* ── Kitchen Group ──────────────────────────────────────────── */}
        {activeSection === "kitchen" && <KitchenGroupScreen />}

        {/* ── Language ──────────────────────────────────────────────── */}
        {activeSection === "lang" && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-3 mb-1 border-b border-slate-100">
              <Globe className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-base text-slate-800">Language</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[["en","English"],["hi","हिन्दी"],["hinglish","Hinglish"]].map(([code, label]) => (
                <button key={code} onClick={() => setLang(code)}
                  className={`py-3 rounded-xl text-xs font-bold transition-all ${
                    settings.lang === code
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Backup & Restore ───────────────────────────────────────── */}
        {activeSection === "backup" && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Shield className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-base text-slate-800">Backup & Restore</h3>
            </div>
            <p className="text-xs text-slate-500">
              Export your personal Khata data as a JSON file. You can restore it later or move to another device.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleExportBackup}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs transition-colors border border-emerald-200">
                <Download className="w-4 h-4" /> Export Backup
              </button>
              <label className="bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs cursor-pointer transition-colors border border-sky-200">
                <Upload className="w-4 h-4" /> Import Backup
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* ── Account Security ───────────────────────────────────────── */}
        {activeSection === "account" && (
          <div className="space-y-4">
            {/* PIN Section */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Lock className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">App Lock PIN</h3>
                  <p className="text-xs text-slate-400">Lock the app with a numeric PIN</p>
                </div>
              </div>

              <div className="space-y-2 text-xs font-bold text-slate-700">
                {settings.pin && (
                  <div>
                    <label className="block mb-1">Current PIN</label>
                    <div className="relative">
                      <input type={showPin ? "text" : "password"} inputMode="numeric" maxLength={6}
                        value={currentPin} onChange={e => { setCurrentPin(e.target.value.replace(/\D/g,"")); setPinError(""); }}
                        placeholder="Enter current PIN"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      <button type="button" onClick={() => setShowPin(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block mb-1">New PIN (4-6 digits)</label>
                  <input type={showPin ? "text" : "password"} inputMode="numeric" maxLength={6}
                    value={newPin} onChange={e => { setNewPin(e.target.value.replace(/\D/g,"")); setPinError(""); }}
                    placeholder="e.g. 1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                {pinError && <p className="text-rose-500 font-normal">{pinError}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleSavePIN}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors">
                    {settings.pin ? "Change PIN" : "Set PIN"}
                  </button>
                  {settings.pin && (
                    <button onClick={handleRemovePIN}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors">
                      Remove PIN
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-800">Change Password</h3>
              </div>
              <div className="space-y-2 text-xs font-bold text-slate-700">
                <div>
                  <label className="block mb-1">Current Password</label>
                  <input type="password" value={currentPass} onChange={e => { setCurrentPass(e.target.value); setPassError(""); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block mb-1">New Password</label>
                  <input type="password" value={newPass} onChange={e => { setNewPass(e.target.value); setPassError(""); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                {passError && <p className="text-rose-500 font-normal">{passError}</p>}
                <button onClick={handleChangePassword}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors">
                  Change Password
                </button>
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-sm space-y-3">
              <h3 className="font-extrabold text-sm text-slate-800">Account Actions</h3>
              <button onClick={lockApp}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors">
                <Lock className="w-4 h-4" /> Lock App Now
              </button>
              <button onClick={logout}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-rose-200">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* App Version */}
        <div className="text-center text-xs text-slate-400 py-2">
          <Smartphone className="w-4 h-4 mx-auto mb-1 text-slate-300" />
          <p className="font-bold text-slate-500">Digital Khata v3.0</p>
          <p>Offline ready • Secure • Multi-user</p>
        </div>
      </div>
    </div>
  );
};
