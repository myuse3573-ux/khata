import React, { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextValue";
import { getApiBaseUrl } from "../config/api";
import { firestoreService } from "../services/firestoreService";
import { isFirebaseConfigured } from "../config/firebase";

const API_BASE = getApiBaseUrl();
const isLocalSessionToken = (value) => value?.startsWith("token_");

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

      // Local/demo sessions are intentionally not sent to the API.
      if (isLocalSessionToken(savedToken)) {
        try {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        } catch {
          clearLocalSession();
        }
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
          // Restore from cached user seamlessly
          try {
            const cached = JSON.parse(savedUser);
            setToken(savedToken);
            setUser(cached);
          } catch {
            clearLocalSession();
          }
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

    // 1. Firestore Cloud Database Lookup (primary backend — Firebase)
    if (isFirebaseConfigured()) {
      try {
        // Look up user by phone or email in Firestore
        const allUsers = await firestoreService.getCollection("users");
        const found = allUsers.find(
          (u) => u.phone === cleanIdentifier || u.email?.toLowerCase() === cleanIdentifier.toLowerCase()
        );

        if (found) {
          const sessionToken = "token_fs_" + found.id + "_" + Date.now();
          saveSession(sessionToken, found);
          setIsLocked(false);
          setIsLoading(false);
          return { success: true };
        }
      } catch (err) {
        console.warn("[Firebase] Firestore login lookup error:", err.message);
      }
    }

    // 2. Local offline cache fallback
    const savedUserStr = localStorage.getItem("khata_user");
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && (savedUser.phone === cleanIdentifier || savedUser.email === cleanIdentifier)) {
          saveSession("token_local_" + Date.now(), savedUser);
          setIsLocked(false);
          setIsLoading(false);
          return { success: true, isOffline: true };
        }
      } catch { /* parse error */ }
    }

    // 3. Legacy MongoDB server fallback (only if still in use)
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
      }
    } catch {
      // Backend server unavailable — proceed to error
    }

    const errorMsg = "No account found matching this phone or email. Please check your credentials or register a New Account.";
    setAuthError(errorMsg);
    setIsLoading(false);
    return { success: false, error: errorMsg };
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const register = async ({ name, phone, email, password, shopName }) => {
    setIsLoading(true);
    setAuthError("");

    const userId = "usr_" + (phone || email?.replace(/[^a-zA-Z0-9]/g, "") || Date.now());
    const newUser = {
      id: userId,
      name: name || "Khata User",
      phone: phone || "",
      email: email || "",
      shopName: shopName || `${name || "User"}'s Khata`,
      createdAt: new Date().toISOString()
    };
    const sessionToken = "token_" + Date.now();

    // 1. Save to Cloud Firestore Database
    if (isFirebaseConfigured()) {
      try {
        await firestoreService.setDocument("users", userId, newUser);
        // Initialize user business profile in Firestore
        await firestoreService.setDocument(`users/${userId}/profile`, "business", {
          id: `b_${userId}`,
          name: newUser.shopName,
          owner: newUser.name,
          phone: newUser.phone,
          address: "",
          upiId: "",
          gstin: "",
          createdDate: new Date().toISOString()
        });
      } catch (err) {
        console.warn("[Firebase] Error creating user in Firestore:", err.message);
      }
    }

    // 2. Try server registration if online
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
      }
    } catch {
      // Backend offline — proceed with Firestore / Local user
    }

    // Save session locally and complete login
    saveSession(sessionToken, newUser);
    setIsLocked(false);
    setIsLoading(false);
    return { success: true };
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
    setIsLoading(true);
    setAuthError("");
    const demoUser = {
      id: "usr_demo_admin",
      name: "Rajesh Sharma",
      phone: "9876543210",
      email: "demo@khata.app",
      shopName: "Sharma General Store",
      createdAt: new Date().toISOString()
    };
    saveSession("token_demo_" + Date.now(), demoUser);
    setIsLocked(false);
    setIsLoading(false);
    return { success: true };
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
