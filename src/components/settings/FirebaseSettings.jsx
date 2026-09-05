import React, { useState, useEffect } from "react";
import { isFirebaseConfigured } from "../../config/firebase";
import { firestoreService } from "../../services/firestoreService";
import { usePersonal } from "../../context/usePersonal";
import { useAuth } from "../../context/useAuth";
import { Flame, CheckCircle, AlertCircle, RefreshCw, Database, CloudUpload, ShieldCheck, Copy, Check } from "lucide-react";

export const FirebaseSettings = () => {
  const { customers, transactions, cashbook, business, showToast } = usePersonal();
  const { user } = useAuth();

  const [configured, setConfigured] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    setConfigured(isFirebaseConfigured());
  }, []);

  const handleTestConnection = async () => {
    if (!configured) {
      setTestResult({
        success: false,
        message: "Firebase credentials missing in .env file."
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Try writing and reading a quick health-check document
      const testDocId = `test_${Date.now()}`;
      await firestoreService.setDocument("_connection_test", testDocId, {
        status: "ok",
        testedAt: new Date().toISOString(),
        testedBy: user?.name || "Khata User"
      });

      const readBack = await firestoreService.getDocument("_connection_test", testDocId);
      
      // Clean up test document
      await firestoreService.deleteDocument("_connection_test", testDocId);

      if (readBack) {
        setTestResult({
          success: true,
          message: "Successfully connected to Cloud Firestore."
        });
        showToast("Firestore connection verified! 🔥");
      } else {
        throw new Error("Could not verify read from Firestore.");
      }
    } catch (err) {
      console.error("Firestore test error:", err);
      setTestResult({
        success: false,
        message: err.message || "Failed to reach Firestore. Please verify API key and security rules."
      });
      showToast("Firestore connection failed", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleSyncToFirestore = async () => {
    if (!configured) {
      showToast("Please configure your .env Firebase credentials first", "error");
      return;
    }

    const userId = user?.id || user?._id || "default_user";
    setIsSyncing(true);
    setSyncStatus("Starting sync to Cloud Firestore...");

    try {
      // 1. Sync Business Profile
      setSyncStatus("Syncing business profile...");
      await firestoreService.setDocument(`users/${userId}/profile`, "business", {
        ...business,
        userId,
        syncedAt: new Date().toISOString()
      });

      // 2. Sync Customers
      if (customers && customers.length > 0) {
        setSyncStatus(`Syncing ${customers.length} customers...`);
        await firestoreService.syncBatch(`users/${userId}/customers`, customers);
      }

      // 3. Sync Transactions
      if (transactions && transactions.length > 0) {
        setSyncStatus(`Syncing ${transactions.length} transactions...`);
        await firestoreService.syncBatch(`users/${userId}/transactions`, transactions);
      }

      // 4. Sync Cashbook
      if (cashbook && cashbook.length > 0) {
        setSyncStatus(`Syncing ${cashbook.length} cashbook records...`);
        await firestoreService.syncBatch(`users/${userId}/cashbook`, cashbook);
      }

      setSyncStatus(`✓ All data successfully synced to Firestore! (${customers.length} customers, ${transactions.length} transactions)`);
      showToast("Cloud Firestore sync completed! 🔥");
    } catch (err) {
      console.error("Cloud sync error:", err);
      setSyncStatus(`❌ Sync failed: ${err.message}`);
      showToast("Cloud sync failed", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const sampleEnv = `VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:...`;

  const copyEnvSample = () => {
    navigator.clipboard.writeText(sampleEnv);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/10 border border-amber-500/20 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Flame className="w-7 h-7 text-amber-500 fill-amber-500/20 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Firebase & Cloud Firestore
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                configured ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-amber-100 text-amber-700 border border-amber-300"
              }`}>
                {configured ? "Configured" : "Needs Keys in .env"}
              </span>
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Connect your Khata application directly to Google Cloud Firestore for real-time cloud sync, automatic backups, and cross-device persistence.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-500" />
          Connection Status & Details
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-xs font-medium text-slate-400 uppercase">Firestore</span>
            <p className="font-medium text-slate-800 mt-0.5">{configured ? "Configured" : "Not configured"}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-xs font-medium text-slate-400 uppercase">Google Sign-In</span>
            <p className="font-medium text-slate-800 mt-0.5">{configured ? "Available" : "Needs setup"}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-xs font-medium text-slate-400 uppercase">Credentials</span>
            <p className="font-medium text-slate-800 mt-0.5">Hidden for security</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-xs font-medium text-slate-400 uppercase">Database Identifier</span>
            <p className="font-medium text-slate-800 mt-0.5">Hidden for security</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-all shadow-sm shadow-indigo-200 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? "animate-spin" : ""}`} />
            {testing ? "Testing Firestore..." : "Test Firestore Connection"}
          </button>

          <button
            onClick={handleSyncToFirestore}
            disabled={isSyncing || !configured}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-all shadow-sm shadow-emerald-200 cursor-pointer"
          >
            <CloudUpload className={`w-4 h-4 ${isSyncing ? "animate-bounce" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Local Data to Cloud"}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
            testResult.success ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
          }`}>
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium">{testResult.success ? "Connection Verified" : "Connection Error"}</p>
              <p className="text-xs mt-0.5 opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}

        {syncStatus && (
          <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 border border-slate-200">
            {syncStatus}
          </div>
        )}
      </div>

      {/* Setup Guide / Instruction Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          How to connect your Firebase Project
        </h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 leading-relaxed">
          <li>
            Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold underline">Firebase Console</a> and open or create your project.
          </li>
          <li>
            Navigate to <strong>Project Settings (⚙️) &gt; General &gt; Your apps</strong> and add a <strong>Web App (&lt;/&gt;)</strong>.
          </li>
          <li>
            Copy the configuration keys and paste them into your project root <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-xs">.env</code> file:
          </li>
        </ol>

        <div className="relative bg-slate-900 rounded-xl p-4 font-mono text-xs text-amber-300 overflow-x-auto">
          <button
            onClick={copyEnvSample}
            className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all flex items-center gap-1 text-[11px] cursor-pointer"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey ? "Copied" : "Copy"}
          </button>
          <pre>{sampleEnv}</pre>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          💡 <em>Tip: Enable <strong>Cloud Firestore</strong> in your Firebase Console under the "Build" menu, then set your Firestore Rules to allow read/write for development or authenticated users.</em>
        </p>
      </div>
    </div>
  );
};
