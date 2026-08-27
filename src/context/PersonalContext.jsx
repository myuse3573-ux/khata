/**
 * PersonalContext.jsx
 * Manages ONLY personal Khata data:
 * business profile, books, customers, transactions, cashbook, settings
 *
 * Strictly scoped to the authenticated userId — never touches kitchen data.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { PersonalContext } from "./personalContextValue";
import { getApiBaseUrl } from "../config/api";
import { firestoreService } from "../services/firestoreService";
import { isFirebaseConfigured } from "../config/firebase";

const API_BASE = getApiBaseUrl();
const isLocalSessionToken = (value) => value?.startsWith("token_");

// ── Storage helpers (user-scoped) ──────────────────────────────────────────
const loadLocal = (userId, key, fallback) => {
  try {
    const raw = localStorage.getItem(`khata_${userId}_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
};

const saveLocal = (userId, key, data) => {
  try {
    localStorage.setItem(`khata_${userId}_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Could not save ${key} to localStorage:`, e.message);
  }
};

// Empty defaults for a brand new user — NO hardcoded demo data
const emptyBusiness = (user) => ({
  id: `b_${user?.id || "new"}`,
  name: user?.shopName || `${user?.name || "User"}'s Khata`,
  owner: user?.name || "",
  phone: user?.phone || "",
  address: "",
  upiId: "",
  gstin: "",
  createdDate: new Date().toISOString()
});

export const PersonalProvider = ({ children }) => {
  const { user, token, isAuthenticated, logout } = useAuth();
  const userId = user?.id;

  const [business, setBusiness] = useState({});
  const [books, setBooks] = useState([]);
  const [activeBookId, setActiveBookId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cashbook, setCashbook] = useState([]);
  const [settings, setSettings] = useState({ lang: "en", pin: "", theme: "light" });
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState("synced"); // 'synced' | 'pending' | 'failed'

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Load user data when authenticated user changes ─────────────────────
  useEffect(() => {
    if (!isAuthenticated || !userId || !token) {
      // Clear all state on logout
      setBusiness({});
      setBooks([]);
      setActiveBookId("");
      setCustomers([]);
      setTransactions([]);
      setCashbook([]);
      setSettings({ lang: "en", pin: "", theme: "light" });
      return;
    }

    const loadData = async () => {
      setIsLoading(true);

      const loadCachedData = () => {
        const biz = loadLocal(userId, "business", emptyBusiness(user));
        const bks = loadLocal(userId, "books", [{ id: `book_${userId}_1`, name: "Main Khata", isDefault: true }]);
        setBusiness(biz);
        setBooks(bks);
        setActiveBookId(bks[0]?.id || "");
        setCustomers(loadLocal(userId, "customers", []));
        setTransactions(loadLocal(userId, "transactions", []));
        setCashbook(loadLocal(userId, "cashbook", []));
        setSettings(loadLocal(userId, "settings", { lang: "en", pin: "", theme: "light" }));
        setSyncStatus("pending");
      };

      if (isLocalSessionToken(token)) {
        loadCachedData();
        setIsLoading(false);
        return;
      }

      // Try fetching from server first
      try {
        const res = await fetch(`${API_BASE}/personal`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
          logout();
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.status === "success" && data.database) {
            const db = data.database;
            const biz = db.business && Object.keys(db.business).length > 0
              ? db.business : emptyBusiness(user);
            const bks = db.books?.length > 0
              ? db.books
              : [{ id: `book_${userId}_1`, name: "Main Khata", isDefault: true }];

            setBusiness(biz);
            setBooks(bks);
            setActiveBookId(bks[0]?.id || "");
            setCustomers(db.customers || []);
            setTransactions(db.transactions || []);
            setCashbook(db.cashbook || []);
            setSettings(db.settings || { lang: "en", pin: "", theme: "light" });

            // Update local cache
            saveLocal(userId, "business", biz);
            saveLocal(userId, "books", bks);
            saveLocal(userId, "customers", db.customers || []);
            saveLocal(userId, "transactions", db.transactions || []);
            saveLocal(userId, "cashbook", db.cashbook || []);
            saveLocal(userId, "settings", db.settings || { lang: "en", pin: "", theme: "light" });
            setSyncStatus("synced");
          }
        } else {
          loadCachedData();
        }
      } catch {
        // Server offline — use local cache
        loadCachedData();
      }

      setIsLoading(false);
    };

    loadData();
  }, [userId, token, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync helper — saves locally + pushes to server & Firestore ──────────
  const syncField = useCallback(async (field, value) => {
    if (!userId) return;
    saveLocal(userId, field, value);
    setSyncStatus("pending");

    // 1. Sync to local/express server if token exists
    if (token && !isLocalSessionToken(token)) {
      try {
        const res = await fetch(`${API_BASE}/personal/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ [field]: value })
        });
        if (res.status === 401) { logout(); return; }
        if (res.ok) setSyncStatus("synced");
      } catch {
        // Continue to firestore sync
      }
    }

    // 2. Automatically sync to Cloud Firestore in background
    if (isFirebaseConfigured()) {
      try {
        if (field === "business" || field === "settings" || field === "books") {
          await firestoreService.setDocument(`users/${userId}/profile`, field, {
            data: value,
            updatedAt: new Date().toISOString()
          });
        } else if (Array.isArray(value)) {
          await firestoreService.syncBatch(`users/${userId}/${field}`, value);
        }
        setSyncStatus("synced");
      } catch (err) {
        console.warn(`[Firebase] Firestore sync for ${field}:`, err.message);
      }
    }
  }, [userId, token, logout]);

  // ── Business ────────────────────────────────────────────────────────────
  const updateBusinessProfile = (updated) => {
    const next = { ...business, ...updated };
    setBusiness(next);
    syncField("business", next);
    showToast("Business profile updated!");
  };

  // ── Books ────────────────────────────────────────────────────────────────
  const addBook = (name) => {
    const newBook = { id: `book_${Date.now()}`, name: name.trim(), isDefault: false };
    const next = [...books, newBook];
    setBooks(next);
    setActiveBookId(newBook.id);
    syncField("books", next);
    showToast(`Book "${name}" created!`);
    return newBook;
  };

  const renameBook = (id, newName) => {
    const next = books.map(b => b.id === id ? { ...b, name: newName.trim() } : b);
    setBooks(next);
    syncField("books", next);
    showToast("Book renamed.");
  };

  // ── Settings ─────────────────────────────────────────────────────────────
  const updateSettings = (updates) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    syncField("settings", next);
    // Save settings separately so PIN check in AuthContext can access it
    saveLocal(userId, "settings", next);
  };

  const setLang = (lang) => {
    updateSettings({ lang });
    showToast(`Language: ${lang.toUpperCase()}`);
  };

  // ── Customers ─────────────────────────────────────────────────────────────
  const addCustomer = (customerData) => {
    const newCust = {
      id: `cust_${Date.now()}`,
      bookId: activeBookId,
      status: "active",
      createdDate: new Date().toISOString(),
      ...customerData
    };
    const next = [newCust, ...customers];
    setCustomers(next);
    syncField("customers", next);
    showToast(`${newCust.name} added!`);
    return newCust;
  };

  const editCustomer = (id, updatedData) => {
    const next = customers.map(c =>
      c.id === id ? { ...c, ...updatedData, updatedAt: new Date().toISOString() } : c
    );
    setCustomers(next);
    syncField("customers", next);
    showToast("Customer updated.");
  };

  const deleteCustomer = (id) => {
    const nextCustomers = customers.filter(c => c.id !== id);
    const nextTxs = transactions.filter(t => t.customerId !== id);
    setCustomers(nextCustomers);
    setTransactions(nextTxs);
    syncField("customers", nextCustomers);
    syncField("transactions", nextTxs);
    showToast("Customer deleted.", "error");
  };

  // ── Transactions ──────────────────────────────────────────────────────────
  const addTransaction = (txData) => {
    const newTx = {
      id: `tx_${Date.now()}`,
      bookId: activeBookId,
      date: txData.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...txData
    };
    const next = [newTx, ...transactions];
    setTransactions(next);
    syncField("transactions", next);
    showToast(newTx.type === "gave" ? "Udhar entry added!" : "Jama payment added!");
    return newTx;
  };

  const editTransaction = (id, updatedData) => {
    const next = transactions.map(t =>
      t.id === id ? { ...t, ...updatedData, updatedAt: new Date().toISOString() } : t
    );
    setTransactions(next);
    syncField("transactions", next);
    showToast("Transaction updated.");
  };

  const deleteTransaction = (id) => {
    const next = transactions.filter(t => t.id !== id);
    setTransactions(next);
    syncField("transactions", next);
    showToast("Transaction removed.", "error");
  };

  // ── Cashbook ─────────────────────────────────────────────────────────────
  const addCashEntry = (cashData) => {
    const newEntry = {
      id: `cb_${Date.now()}`,
      bookId: activeBookId,
      date: cashData.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...cashData
    };
    const next = [newEntry, ...cashbook];
    setCashbook(next);
    syncField("cashbook", next);
    showToast(newEntry.type === "in" ? "Cash In logged!" : "Cash Out logged!");
    return newEntry;
  };

  const editCashEntry = (id, updatedData) => {
    const next = cashbook.map(c =>
      c.id === id ? { ...c, ...updatedData, updatedAt: new Date().toISOString() } : c
    );
    setCashbook(next);
    syncField("cashbook", next);
    showToast("Cash entry updated.");
  };

  const deleteCashEntry = (id) => {
    const next = cashbook.filter(c => c.id !== id);
    setCashbook(next);
    syncField("cashbook", next);
    showToast("Cash entry deleted.", "error");
  };

  // ── Active book filtered views ────────────────────────────────────────────
  const currentCustomers = customers.filter(c => !c.bookId || c.bookId === activeBookId);
  const currentTransactions = transactions.filter(t => !t.bookId || t.bookId === activeBookId);
  const currentCashbook = cashbook.filter(c => !c.bookId || c.bookId === activeBookId);

  // ── Backup Import ─────────────────────────────────────────────────────────
  const importBackupData = (importedData) => {
    if (!userId || !token) return;
    const nextBusiness = importedData.business || business;
    const nextBooks = importedData.books || books;
    const nextCustomers = importedData.customers || customers;
    const nextTransactions = importedData.transactions || transactions;
    const nextCashbook = importedData.cashbook || cashbook;
    const nextSettings = importedData.settings || settings;

    setBusiness(nextBusiness);
    setBooks(nextBooks);
    setCustomers(nextCustomers);
    setTransactions(nextTransactions);
    setCashbook(nextCashbook);
    setSettings(nextSettings);

    saveLocal(userId, "business", nextBusiness);
    saveLocal(userId, "books", nextBooks);
    saveLocal(userId, "customers", nextCustomers);
    saveLocal(userId, "transactions", nextTransactions);
    saveLocal(userId, "cashbook", nextCashbook);
    saveLocal(userId, "settings", nextSettings);

    if (token && !isLocalSessionToken(token)) {
      fetch(`${API_BASE}/personal/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          business: nextBusiness,
          books: nextBooks,
          customers: nextCustomers,
          transactions: nextTransactions,
          cashbook: nextCashbook,
          settings: nextSettings
        })
      }).catch(() => {});
    }
  };

  return (
    <PersonalContext.Provider
      value={{
        // Business
        business, updateBusinessProfile,
        // Books
        books, activeBookId, setActiveBookId, addBook, renameBook,
        // Settings
        settings, setLang, updateSettings, importBackupData,
        // Customers (active book)
        customers: currentCustomers,
        allCustomers: customers,
        addCustomer, editCustomer, deleteCustomer,
        // Transactions (active book)
        transactions: currentTransactions,
        allTransactions: transactions,
        addTransaction, editTransaction, deleteTransaction,
        // Cashbook (active book)
        cashbook: currentCashbook,
        allCashbook: cashbook,
        addCashEntry, editCashEntry, deleteCashEntry,
        // State
        isLoading, syncStatus,
        // Toast
        toast, showToast
      }}
    >
      {children}
    </PersonalContext.Provider>
  );
};
 
