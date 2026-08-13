import React, { useState } from "react";
import { usePersonal } from "../../context/PersonalContext";
import { useKitchen } from "../../context/KitchenContext";
import { useAuth } from "../../context/AuthContext";
import { BookOpen, ChevronDown, Plus, Lock, LogOut, ChefHat } from "lucide-react";
import { ServerStatusDot } from "../ui/OnlineStatusBanner";
import { SyncStatusIndicator } from "../ui/SyncStatusIndicator";

export const MobileHeader = ({ onOpenSettings }) => {
  const { business, books, activeBookId, setActiveBookId, addBook, syncStatus } = usePersonal();
  const { activeGroup } = useKitchen();
  const { user, logout, lockApp } = useAuth();

  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [newBookName, setNewBookName] = useState("");
  const [isAddingBook, setIsAddingBook] = useState(false);
  const activeBook = books.find(b => b.id === activeBookId) || books[0];

  const handleCreateBook = (e) => {
    e.preventDefault();
    if (!newBookName.trim()) return;
    addBook(newBookName.trim());
    setNewBookName("");
    setIsAddingBook(false);
    setShowBookDropdown(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-emerald-600 text-white shadow-md">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Book Selector */}
        <div className="relative">
          <button
            onClick={() => setShowBookDropdown(!showBookDropdown)}
            className="flex items-center gap-2 text-left bg-emerald-700/60 hover:bg-emerald-700 active:bg-emerald-800 px-3 py-1.5 rounded-xl transition-all border border-emerald-500/40"
          >
            <div className="bg-emerald-800 p-1.5 rounded-lg text-emerald-200">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm leading-tight">{activeBook?.name || "Main Khata"}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </div>
              <span className="text-[11px] text-emerald-100 opacity-90 block leading-none">
                {user?.shopName || business?.name || user?.name}
              </span>
            </div>
          </button>

          {/* Book dropdown */}
          {showBookDropdown && (
            <div className="absolute top-12 left-0 w-64 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-fade-in">
              <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Select Khata Book
              </div>
              <div className="max-h-48 overflow-y-auto py-1">
                {books.map(b => (
                  <button key={b.id}
                    onClick={() => { setActiveBookId(b.id); setShowBookDropdown(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${
                      b.id === activeBookId ? "bg-emerald-50 text-emerald-700 font-semibold" : "hover:bg-slate-50"
                    }`}>
                    <span>{b.name}</span>
                    {b.id === activeBookId && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-1 mt-1">
                {isAddingBook ? (
                  <form onSubmit={handleCreateBook} className="p-2 flex flex-col gap-2">
                    <input type="text" placeholder="e.g. Branch 2 Khata"
                      value={newBookName} onChange={e => setNewBookName(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus />
                    <div className="flex gap-1 justify-end">
                      <button type="button" onClick={() => setIsAddingBook(false)}
                        className="text-xs px-2 py-1 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                      <button type="submit"
                        className="text-xs px-3 py-1 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Create</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setIsAddingBook(true)}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-xl flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Create New Book
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">

          {/* Sync status */}
          <SyncStatusIndicator status={syncStatus} />

          {/* Server status */}
          <ServerStatusDot />

          {/* Kitchen group indicator */}
          {activeGroup && (
            <button onClick={onOpenSettings}
              className="hidden sm:flex items-center gap-1 bg-emerald-800/60 px-2 py-1 rounded-xl text-[11px] font-bold text-emerald-200 border border-emerald-500/40">
              <ChefHat className="w-3.5 h-3.5" />
              <span className="max-w-[60px] truncate">{activeGroup.name}</span>
            </button>
          )}

          {/* Lock */}
          <button onClick={lockApp}
            className="p-2 rounded-xl bg-emerald-700/60 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-500/40"
            title="Lock App">
            <Lock className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button onClick={logout}
            className="p-2 rounded-xl bg-emerald-700/60 hover:bg-rose-700 text-white border border-emerald-500/40 transition-colors"
            title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
