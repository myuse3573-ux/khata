import React, { useState, useEffect, useCallback } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

/**
 * OnlineStatusBanner
 * Shows a persistent banner when the server is unreachable.
 * Distinguishes between:
 *   - "No internet" (navigator.onLine = false)
 *   - "Server offline" (internet ok, but /api/health fails)
 */
export const OnlineStatusBanner = () => {
  const [serverStatus, setServerStatus] = useState("checking"); // 'online' | 'offline' | 'checking'
  const [isVisible, setIsVisible] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const checkServer = useCallback(async () => {
    setIsRetrying(true);
    try {
      const res = await fetch("/api/health", {
        signal: AbortSignal.timeout(4000) // 4s timeout
      });
      if (res.ok) {
        setServerStatus("online");
        setIsVisible(false);
      } else {
        setServerStatus("offline");
        setIsVisible(true);
      }
    } catch {
      setServerStatus("offline");
      setIsVisible(true);
    }
    setLastChecked(new Date());
    setIsRetrying(false);
  }, []);

  useEffect(() => {
    // Initial check
    checkServer();

    // Re-check every 30 seconds
    const interval = setInterval(checkServer, 30000);

    // Also check when browser reports online/offline
    const handleOnline = () => checkServer();
    const handleOffline = () => { setServerStatus("offline"); setIsVisible(true); };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkServer]);

  if (!isVisible || serverStatus === "online") return null;

  const isNoInternet = !navigator.onLine;
  const timeStr = lastChecked ? lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-2 text-xs font-semibold shadow-lg">
      <div className="flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span>
          {isNoInternet
            ? "No internet connection — showing cached data"
            : "Server offline — showing cached data"}
          {timeStr && <span className="opacity-80 text-[11px] ml-1 font-mono">({timeStr})</span>}
        </span>
      </div>

      <button
        onClick={checkServer}
        disabled={isRetrying}
        className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-lg transition-colors shrink-0 disabled:opacity-60"
        title={timeStr ? `Last checked at ${timeStr}` : "Check server connection"}
      >
        <RefreshCw className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`} />
        <span>Retry</span>
      </button>
    </div>
  );
};

/**
 * ServerStatusDot — Compact status indicator for use in header
 */
export const ServerStatusDot = () => {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health", { signal: AbortSignal.timeout(3000) });
        setStatus(res.ok ? "online" : "offline");
      } catch {
        setStatus("offline");
      }
    };
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, []);

  if (status === "checking") return null;

  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg ${
        status === "online" ? "bg-emerald-800/60 text-emerald-200" : "bg-amber-700/60 text-amber-200"
      }`}
      title={status === "online" ? "Server connected" : "Server offline"}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${status === "online" ? "bg-emerald-400 animate-pulse-dot" : "bg-amber-400"}`} />
      <span className="hidden sm:inline">{status === "online" ? "Online" : "Offline"}</span>
    </div>
  );
};
