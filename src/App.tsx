import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Text, TextInput, TouchableOpacity } from 'react-native';
import { User, Customer, Transaction, CashbookEntry, KitchenGroup, KitchenMember, KitchenDuty, KitchenExpense } from './types';
import { NativeStorage } from './services/nativeStorage';
import { LocalDb } from './services/localDb';
import { SyncEngine } from './services/syncEngine';
import { NativeHeader } from './components/native/NativeHeader';
import { NativeBottomNav, TabType } from './components/native/NativeBottomNav';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { KhataScreen } from './screens/KhataScreen';
import { CustomerDetailScreen } from './screens/CustomerDetailScreen';
import { KitchenScreen } from './screens/KitchenScreen';
import { QRPayScreen } from './screens/QRPayScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { MoreScreen } from './screens/MoreScreen';
import { rupeesToPaise } from './utils/formatters';

export default function App() {
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // In-memory data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashbook, setCashbook] = useState<CashbookEntry[]>([]);
  const [currentGroup, setCurrentGroup] = useState<KitchenGroup | null>(null);
  const [members, setMembers] = useState<KitchenMember[]>([]);
  const [duties, setDuties] = useState<KitchenDuty[]>([]);
  const [expenses, setExpenses] = useState<KitchenExpense[]>([]);

  // Modals state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txType, setTxType] = useState<'gave' | 'got'>('gave');
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');

  useEffect(() => {
    // Restore session on app startup
    (async () => {
      const token = await NativeStorage.getAccessToken();
      if (token) {
        setSessionUser({
          id: 'usr_demo',
          name: 'Rajesh Sharma',
          phone: '9876543210',
          shopName: 'Sharma General Store',
          createdAt: new Date().toISOString()
        });
        loadUserData('usr_demo');
      }
    })();
  }, []);

  const loadUserData = async (userId: string) => {
    const custs = await LocalDb.getCustomers(userId);
    const txs = await LocalDb.getTransactions(userId);
    const cash = await LocalDb.getCashbook(userId);
    setCustomers(custs);
    setTransactions(txs);
    setCashbook(cash);
  };

  const handleLoginSuccess = async (data: any) => {
    const user: User = data.user || {
      id: 'usr_' + Date.now(),
      name: data.name || 'User',
      phone: data.phone || '9876543210',
      shopName: data.shopName || 'Khata Store',
      createdAt: new Date().toISOString()
    };

    await NativeStorage.saveSession({
      accessToken: data.token || 'demo_jwt_token',
      refreshToken: 'refresh_token_secret',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      deviceId: 'android_device_01',
      user
    });

    setSessionUser(user);
    loadUserData(user.id);
  };

  const handleLogout = async () => {
    if (sessionUser) {
      await LocalDb.clearUserLocalData(sessionUser.id);
    }
    await NativeStorage.clearSession();
    setSessionUser(null);
    setCustomers([]);
    setTransactions([]);
    setCashbook([]);
    setSelectedCustomer(null);
  };

  // Add Customer Handler
  const handleSaveCustomer = async () => {
    if (!newCustName.trim() || !newCustPhone.trim() || !sessionUser) return;

    const newCustomer: Customer = {
      id: 'cust_' + Date.now(),
      userId: sessionUser.id,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      rawBalance: 0,
      status: 'settled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await LocalDb.saveCustomer(newCustomer);
    await SyncEngine.enqueueOperation(sessionUser.id, 'customer', newCustomer.id, 'CREATE', newCustomer);

    setCustomers(prev => [...prev, newCustomer]);
    setNewCustName('');
    setNewCustPhone('');
    setIsAddCustomerOpen(false);
  };

  // Add Transaction Handler
  const handleSaveTransaction = async () => {
    if (!selectedCustomer || !txAmount || !sessionUser) return;
    const amountPaise = rupeesToPaise(txAmount);
    if (amountPaise <= 0) return;

    const newTx: Transaction = {
      id: 'tx_' + Date.now(),
      userId: sessionUser.id,
      customerId: selectedCustomer.id,
      type: txType,
      amount: amountPaise,
      notes: txNotes.trim(),
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await LocalDb.saveTransaction(newTx);
    await SyncEngine.enqueueOperation(sessionUser.id, 'transaction', newTx.id, 'CREATE', newTx);

    // Update customer raw balance
    const updatedRawBalance = selectedCustomer.rawBalance + (txType === 'gave' ? amountPaise : -amountPaise);
    const updatedStatus = updatedRawBalance > 0 ? 'get' : updatedRawBalance < 0 ? 'give' : 'settled';

    const updatedCust: Customer = {
      ...selectedCustomer,
      rawBalance: updatedRawBalance,
      status: updatedStatus,
      updatedAt: new Date().toISOString()
    };

    await LocalDb.saveCustomer(updatedCust);
    setSelectedCustomer(updatedCust);

    setTransactions(prev => [newTx, ...prev]);
    setCustomers(prev => prev.map(c => c.id === updatedCust.id ? updatedCust : c));

    setTxAmount('');
    setTxNotes('');
    setIsAddTxOpen(false);
  };

  if (!sessionUser) {
    if (showOnboarding) {
      return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
    }
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <View style={styles.container}>
      <NativeHeader
        shopName={sessionUser.shopName}
        isOnline={true}
        onLockPress={() => alert('PIN Lock Active')}
      />

      <View style={{ flex: 1 }}>
        {selectedCustomer ? (
          <CustomerDetailScreen
            user={sessionUser}
            customer={selectedCustomer}
            transactions={transactions}
            onBack={() => setSelectedCustomer(null)}
            onAddTx={(type) => { setTxType(type); setIsAddTxOpen(true); }}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                customers={customers}
                transactions={transactions}
                todayDuty={duties[0] || null}
                onNavigateTab={tab => setActiveTab(tab)}
                onAddCustomerPress={() => setIsAddCustomerOpen(true)}
                onAddTxPress={() => {
                  if (customers.length > 0) {
                    setSelectedCustomer(customers[0]);
                    setIsAddTxOpen(true);
                  } else {
                    setIsAddCustomerOpen(true);
                  }
                }}
              />
            )}

            {activeTab === 'khata' && (
              <KhataScreen
                customers={customers}
                cashbook={cashbook}
                onSelectCustomer={c => setSelectedCustomer(c)}
                onAddCustomer={() => setIsAddCustomerOpen(true)}
                onAddTransaction={() => setIsAddTxOpen(true)}
                onAddCashbookEntry={() => alert('Add Cashbook Entry')}
              />
            )}

            {activeTab === 'kitchen' && (
              <KitchenScreen
                currentGroup={currentGroup}
                members={members}
                duties={duties}
                expenses={expenses}
                onCreateGroup={(name) => {
                  const grp: KitchenGroup = {
                    id: 'kg_' + Date.now(),
                    name: name || 'Shared Kitchen',
                    joinCode: 'KT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                    createdBy: sessionUser.id,
                    maxMembers: 20,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  setCurrentGroup(grp);
                }}
                onJoinGroup={(code) => alert(`Joined kitchen with code: ${code}`)}
                onCompleteDuty={(id) => setDuties(prev => prev.map(d => d.id === id ? { ...d, status: 'completed' } : d))}
                onAddExpense={() => alert('Add Kitchen Expense')}
                onScanQR={() => setActiveTab('qr')}
              />
            )}

            {activeTab === 'qr' && (
              <QRPayScreen
                user={sessionUser}
                currentGroup={currentGroup}
                onScannedCode={(code) => alert(`Scanned QR Code: ${code}`)}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsScreen
                user={sessionUser}
                customers={customers}
                transactions={transactions}
                cashbook={cashbook}
                kitchenExpenses={expenses}
              />
            )}

            {activeTab === 'more' && (
              <MoreScreen
                user={sessionUser}
                onLogout={handleLogout}
                onLanguageChange={() => alert('Language preference saved')}
              />
            )}
          </>
        )}
      </View>

      {!selectedCustomer && (
        <NativeBottomNav activeTab={activeTab} onTabChange={tab => setActiveTab(tab)} />
      )}

      {/* Add Customer Modal */}
      <Modal visible={isAddCustomerOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add New Customer</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Customer Name"
              placeholderTextColor="#64748b"
              value={newCustName}
              onChangeText={setNewCustName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number (10 digits)"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={newCustPhone}
              onChangeText={setNewCustPhone}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAddCustomerOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCustomer}>
                <Text style={styles.saveBtnText}>Save Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal visible={isAddTxOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Transaction ({txType.toUpperCase()})</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Amount (₹)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={txAmount}
              onChangeText={setTxAmount}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Notes / Item details (optional)"
              placeholderTextColor="#64748b"
              value={txNotes}
              onChangeText={setTxNotes}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAddTxOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: txType === 'gave' ? '#ef4444' : '#10b981' }]} onPress={handleSaveTransaction}>
                <Text style={styles.saveBtnText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20
  },
  modalBox: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontWeight: 'bold'
  },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold'
  }
});
