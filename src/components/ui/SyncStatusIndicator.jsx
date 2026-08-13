import React from "react";
import { CheckCircle2, Clock, AlertCircle, RefreshCw } from "lucide-react";

/**
 * SyncStatusIndicator — Small badge showing sync state
 * @param {'synced'|'pending'|'failed'|'offline'} status
 */
export const SyncStatusIndicator = ({ status, className = "" }) => {
  if (status === "synced") {
    return (
      <div className={`flex items-center gap-1 text-[10px] font-semibold text-emerald-300 ${className}`}>
        <CheckCircle2 className="w-3 h-3" />
        <span className="hidden sm:inline">Synced</span>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className={`flex items-center gap-1 text-[10px] font-semibold text-amber-300 ${className}`}>
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span className="hidden sm:inline">Syncing...</span>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className={`flex items-center gap-1 text-[10px] font-semibold text-rose-300 ${className}`} title="Sync failed — data saved locally">
        <AlertCircle className="w-3 h-3" />
        <span className="hidden sm:inline">Sync failed</span>
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div className={`flex items-center gap-1 text-[10px] font-semibold text-slate-400 ${className}`}>
        <Clock className="w-3 h-3" />
        <span className="hidden sm:inline">Cached</span>
      </div>
    );
  }

  return null;
};
