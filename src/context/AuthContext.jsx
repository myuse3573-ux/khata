import React, { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextValue";
import { getApiBaseUrl } from "../config/api";

const API_BASE = getApiBaseUrl();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(true); // true on startup while restoring session

  // ── Session restoration on app startup ──────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = localStorage.getItem("khata_token");
      const savedUser = localStorage.getItem("khata_user");

      if (!savedToken || !savedUser) {
        setIsLoading(false);
        return;
      }

      // Validate token against server or fallback to local cache
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` }
        });

        if (res.ok) {
          const data = await res.json();
          setToken(savedToken);
          setUser(data.user);
        } else {
          clearLocalSession();
        }
      } catch {
        // Server offline — restore from local cache seamlessly
        try {
          const cachedUser = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(cachedUser);
        } catch {
          clearLocalSession();
        }
      }

      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const clearLocalSession = () => {
    localStorage.removeItem("khata_token");
    localStorage.removeItem("khata_user");
    setUser(null);
    setToken(null);
  };

  const saveSession = (tok, usr) => {
    localStorage.setItem("khata_token", tok);
    localStorage.setItem("khata_user", JSON.stringify(usr));
    setToken(tok);
    setUser(usr);
  };

  // ── Login ────────────────────────────────────────────────────────────────
  const login = async (identifier, password) => {
    setIsLoading(true);
    setAuthError("");

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cleanIdentifier, password: cleanPassword })
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        saveSession(data.token, data.user);
        setIsLocked(false);
        setIsLoading(false);
        return { success: true };
      } else {
        setAuthError(data.error || "Login failed. Please try again.");
        setIsLoading(false);
        return { success: false, error: data.error };
      }
    } catch {
      // Server unreachable / Offline Mode Fallback
      console.log("Server unreachable: Activating local offline session...");
      const offlineUser = {
        id: "usr_offline_" + cleanIdentifier.replace(/[^0-9]/g, ""),
        name: cleanIdentifier.includes("@") ? cleanIdentifier.split("@")[0] : "Khata User",
        phone: cleanIdentifier.replace(/[^0-9]/g, "") || "9876543210",
        shopName: "My Khata (Offline Mode)",
        isOfflineMode: true,
        createdAt: new Date().toISOString()
      };
      const offlineToken = "offline_session_token_" + Date.now();
      saveSession(offlineToken, offlineUser);
      setIsLocked(false);
      setIsLoading(false);
      return { success: true, isOffline: true };
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const register = async ({ name, phone, email, password, shopName }) => {
    setIsLoading(true);
    setAuthError("");

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, password, shopName })
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        saveSession(data.token, data.user);
        setIsLocked(false);
        setIsLoading(false);
        return { success: true };
      } else {
        setAuthError(data.error || "Registration failed. Please try again.");
        setIsLoading(false);
        return { success: false, error: data.error };
      }
    } catch {
      // Server unreachable / Offline Mode Fallback
      const offlineUser = {
        id: "usr_offline_" + Date.now(),
        name: name || "Khata User",
        phone: phone || "9876543210",
        email: email || "",
        shopName: shopName || "My Khata Store",
        isOfflineMode: true,
        createdAt: new Date().toISOString()
      };
      const offlineToken = "offline_session_token_" + Date.now();
      saveSession(offlineToken, offlineUser);
      setIsLocked(false);
      setIsLoading(false);
      return { success: true, isOffline: true };
    }
  };

  // ── Forgot Password (Request OTP) ─────────────────────────────────────────
  const forgotPassword = async (identifier) => {
    setIsLoading(true);
    setAuthError("");

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() })
      });
      const data = await res.json();
      setIsLoading(false);

      if (res.ok && data.status === "success") {
        return { success: true, message: data.message, otp: data.otp };
      } else {
        setAuthError(data.error || "Could not request OTP.");
        return { success: false, error: data.error };
      }
    } catch {
      const msg = "Server unavailable. Please check your connection.";
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  // ── Reset Password (Verify OTP) ───────────────────────────────────────────
  const resetPassword = async ({ identifier, otp, newPassword }) => {
    setIsLoading(true);
    setAuthError("");

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), otp: otp.trim(), newPassword: newPassword.trim() })
      });
      const data = await res.json();
      setIsLoading(false);

      if (res.ok && data.status === "success") {
        return { success: true, message: data.message };
      } else {
        setAuthError(data.error || "Password reset failed.");
        return { success: false, error: data.error };
      }
    } catch {
      const msg = "Server unavailable. Please check your connection.";
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearLocalSession();
    setIsLocked(false);
    setAuthError("");
    // Clear all user-scoped localStorage data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("khata_")) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }, []);

  // ── Change Password ──────────────────────────────────────────────────────
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      return { success: res.ok, error: data.error };
    } catch {
      return { success: false, error: "Server unavailable." };
    }
  };

  // ── App Lock (PIN) ───────────────────────────────────────────────────────
  const lockApp = () => setIsLocked(true);

  const unlockApp = (inputPin) => {
    // Retrieve stored PIN from settings (personal context stores it)
    const settingsRaw = localStorage.getItem(`khata_settings_${user?.id}`);
    const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    const storedPin = settings.pin || "";

    if (!storedPin) {
      // No PIN set — unlock freely (can't lock without PIN)
      setIsLocked(false);
      return { success: true };
    }

    if (inputPin === storedPin) {
      setIsLocked(false);
      return { success: true };
    }

    return { success: false, error: "Incorrect PIN. Please try again." };
  };

  // ── Auth header helper ───────────────────────────────────────────────────
  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  });

  const loginAsDemo = async () => {
    return login("9876543210", "1234");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLocked,
        authError,
        isLoading,
        login,
        register,
        forgotPassword,
        resetPassword,
        loginAsDemo,
        logout,
        lockApp,
        unlockApp,
        changePassword,
        authHeaders,
        setAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
