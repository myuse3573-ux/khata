import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Customer, CashbookEntry } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Search, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';

interface KhataScreenProps {
  customers: Customer[];
  cashbook: CashbookEntry[];
  onSelectCustomer: (c: Customer) => void;
  onAddCustomer: () => void;
  onAddTransaction: () => void;
  onAddCashbookEntry: () => void;
}

export const KhataScreen: React.FC<KhataScreenProps> = ({
  customers,
  cashbook,
  onSelectCustomer,
  onAddCustomer,
  onAddTransaction,
  onAddCashbookEntry
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'cashbook'>('customers');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      {/* Sub-tab navigation (Customers vs Cashbook) */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'customers' && styles.activeSubTab]}
          onPress={() => setActiveSubTab('customers')}
        >
          <Text style={[styles.subTabText, activeSubTab === 'customers' && styles.activeSubTabText]}>
            Customers ({customers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'cashbook' && styles.activeSubTab]}
          onPress={() => setActiveSubTab('cashbook')}
        >
          <Text style={[styles.subTabText, activeSubTab === 'cashbook' && styles.activeSubTabText]}>
            Cashbook ({cashbook.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === 'customers' ? (
        <>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <Search size={18} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by customer name or phone..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Customers List */}
          <FlatList
            data={filteredCustomers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.customerCard} onPress={() => onSelectCustomer(item)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerPhone}>{item.phone}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.balanceText, { color: item.status === 'get' ? '#ef4444' : item.status === 'give' ? '#10b981' : '#64748b' }]}>
                    {formatCurrency(item.rawBalance)}
                  </Text>
                  <Text style={styles.statusLabel}>
                    {item.status === 'get' ? 'You Will Get' : item.status === 'give' ? 'You Will Give' : 'Settled'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No customers found</Text>
              </View>
            }
          />

          {/* Floating Action Button */}
          <TouchableOpacity style={styles.fab} onPress={onAddCustomer} activeOpacity={0.8}>
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Cashbook List */}
          <FlatList
            data={cashbook}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.cashCard}>
                <View style={[styles.cashIcon, { backgroundColor: item.type === 'in' ? '#10b98120' : '#ef444420' }]}>
                  {item.type === 'in' ? <ArrowDownLeft size={20} color="#10b981" /> : <ArrowUpRight size={20} color="#ef4444" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cashCategory}>{item.category || 'General Entry'}</Text>
                  <Text style={styles.cashDate}>{formatDate(item.date)}</Text>
                </View>
                <Text style={[styles.cashAmount, { color: item.type === 'in' ? '#10b981' : '#ef4444' }]}>
                  {item.type === 'in' ? '+' : '-'}{formatCurrency(item.amount)}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No cashbook entries found</Text>
              </View>
            }
          />

          <TouchableOpacity style={styles.fab} onPress={onAddCashbookEntry} activeOpacity={0.8}>
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 4
  },
  subTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  activeSubTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#10b981'
  },
  subTabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600'
  },
  activeSubTabText: {
    color: '#10b981'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    height: 46
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  customerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  customerPhone: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  balanceText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  statusLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14
  },
  cashCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  cashIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  cashCategory: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  cashDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2
  },
  cashAmount: {
    fontSize: 16,
    fontWeight: 'bold'
  }
});
