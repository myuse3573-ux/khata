import React, { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { PersonalProvider } from "./context/PersonalContext";
import { usePersonal } from "./context/usePersonal";
import { KitchenProvider } from "./context/KitchenContext";
import { useKitchen } from "./context/useKitchen";
import { LoginView } from "./components/auth/LoginView";
import { LockScreenModal } from "./components/auth/LockScreenModal";
import { Toast } from "./components/ui/Toast";
import { OnlineStatusBanner } from "./components/ui/OnlineStatusBanner";
import { MobileHeader } from "./components/layout/MobileHeader";
import { BottomNav } from "./components/layout/BottomNav";
import { DashboardView } from "./components/dashboard/DashboardView";
import { CustomerDetail } from "./components/customer/CustomerDetail";
import { AddCustomerModal } from "./components/customer/AddCustomerModal";
import { AddTransactionModal } from "./components/customer/AddTransactionModal";
import { SplitExpenseModal } from "./components/split/SplitExpenseModal";
import { CashbookView } from "./components/cashbook/CashbookView";
import { TurnTrackerView } from "./components/roster/TurnTrackerView";
import { ReportsView } from "./components/reports/ReportsView";
import { QRPayView } from "./components/qr/QRPayView";
import { SettingsView } from "./components/settings/SettingsView";
import "./App.css";

function MainContent() {
  const { isAuthenticated, isLocked, isLoading } = useAuth();
  const { customers, toast: personalToast } = usePersonal();
  const { toast: kitchenToast } = useKitchen();

  const [activeTab, setActiveTab] = useState("customers");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [txInitialCustomer, setTxInitialCustomer] = useState(null);
  const [txInitialType, setTxInitialType] = useState("gave");

  // Loading spinner while restoring session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <span className="text-3xl">📙</span>
          </div>
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-xs mt-3">Loading Khata...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginView />;

  const toast = kitchenToast || personalToast;

  const handleOpenAddCustomer = () => { setEditingCustomer(null); setIsAddCustomerOpen(true); };
  const handleOpenEditCustomer = (c) => { setEditingCustomer(c); setIsAddCustomerOpen(true); };
  const handleOpenAddTxGlobal = () => { setEditingTx(null); setTxInitialCustomer(null); setTxInitialType("gave"); setIsAddTxOpen(true); };
  const handleOpenAddTxWithCustomer = (customer, type) => { setEditingTx(null); setTxInitialCustomer(customer); setTxInitialType(type); setIsAddTxOpen(true); };
  const handleOpenEditTx = (tx) => { setEditingTx(tx); setIsAddTxOpen(true); };

  const activeSelectedCustomer = selectedCustomer
    ? customers.find(c => c.id === selectedCustomer.id) || selectedCustomer
    : null;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">

      {/* Offline/server status banner */}
      <OnlineStatusBanner />

      {/* App lock overlay */}
      {isLocked && <LockScreenModal />}

      {/* Toast notifications */}
      <Toast message={toast?.message} type={toast?.type} />

      {/* Header */}
      {!activeSelectedCustomer && (
        <MobileHeader onOpenSettings={() => { setSelectedCustomer(null); setActiveTab("settings"); }} />
      )}

      {/* Main content */}
      <main>
        {activeSelectedCustomer ? (
          <CustomerDetail
            customer={activeSelectedCustomer}
            onBack={() => setSelectedCustomer(null)}
            onOpenAddTxWithCustomer={handleOpenAddTxWithCustomer}
            onOpenEditCustomer={handleOpenEditCustomer}
            onOpenEditTx={handleOpenEditTx}
          />
        ) : (
          <>
            {activeTab === "customers" && (
              <DashboardView
                onSelectCustomer={c => setSelectedCustomer(c)}
                onOpenAddCustomer={handleOpenAddCustomer}
                onOpenAddTx={handleOpenAddTxGlobal}
                onOpenSplitBill={() => setIsSplitModalOpen(true)}
              />
            )}
            {activeTab === "cashbook" && <CashbookView />}
            {activeTab === "roster" && <TurnTrackerView />}
            {activeTab === "qr" && <QRPayView />}
            {activeTab === "reports" && <ReportsView />}
            {activeTab === "settings" && <SettingsView />}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeSelectedCustomer ? "customers" : activeTab}
        setActiveTab={tab => { setSelectedCustomer(null); setActiveTab(tab); }}
      />

      {/* Modals */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        initialCustomer={editingCustomer}
        onCustomerCreated={c => setSelectedCustomer(c)}
      />
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        initialCustomer={txInitialCustomer}
        initialType={txInitialType}
        initialTransaction={editingTx}
      />
      <SplitExpenseModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PersonalProvider>
        <KitchenProvider>
          <MainContent />
        </KitchenProvider>
      </PersonalProvider>
    </AuthProvider>
  );
}
