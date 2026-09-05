import React, { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextValue";
import { getApiBaseUrl } from "../config/api";
import { firestoreService } from "../services/firestoreService";
import { auth, isFirebaseConfigured } from "../config/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

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

      // Old client-only sessions are not valid credentials for protected data.
      if (isLocalSessionToken(savedToken)) {
        clearLocalSession();
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
        clearLocalSession();
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
    if (isFirebaseConfigured() && usr?.id) {
      firestoreService.setDocument("users", usr.id, {
        id: usr.id,
        name: usr.name || "",
        phone: usr.phone || "",
        email: usr.email || "",
        shopName: usr.shopName || "",
        lastLoginAt: new Date().toISOString()
      }).catch((error) => console.warn("[Firebase] Profile sync failed:", error.message));
    }
  };

  // ── Login ────────────────────────────────────────────────────────────────
  const login = async (identifier, password) => {
    setIsLoading(true);
    setAuthError("");

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    // The API is the source of truth for credentials and sessions. Firestore
    // is used for optional data sync, never for password authentication.
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
      // Backend server unavailable — do not create a fake authenticated session.
    }

    const errorMsg = "Unable to sign in. Please check your credentials and database connection.";
    setAuthError(errorMsg);
    setIsLoading(false);
    return { success: false, error: errorMsg };
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const register = async ({ name, phone, email, password, shopName }) => {
    setIsLoading(true);
    setAuthError("");

    // Register against the same API/database used by all protected features.
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
      // Backend unavailable; never create a client-only account.
    }

    const errorMsg = "Server unavailable. Your account was not created. Please try again when the database server is online.";
    setAuthError(errorMsg);
    setIsLoading(false);
    return { success: false, error: errorMsg };
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setAuthError("");
    try {
      if (!isFirebaseConfigured() || !auth) {
        throw new Error("Google sign-in is not configured. Add the Firebase web credentials first.");
      }
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();
      if (!res.ok || data.status !== "success") throw new Error(data.error || "Google sign-in failed.");
      saveSession(data.token, data.user);
      setIsLocked(false);
      return { success: true };
    } catch (error) {
      const message = error.message || "Google sign-in failed.";
      setAuthError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/auth/demo`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.status !== "success") throw new Error(data.error || "Demo login failed.");
      saveSession(data.token, data.user);
      setIsLocked(false);
      return { success: true };
    } catch (error) {
      const message = error.message || "Demo login failed.";
      setAuthError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
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
        loginWithGoogle,
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
