import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Customer, Transaction, KitchenDuty } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ArrowUpRight, ArrowDownLeft, Users, Utensils, QrCode, Plus, ChevronRight } from 'lucide-react-native';

interface HomeScreenProps {
  customers: Customer[];
  transactions: Transaction[];
  todayDuty: KitchenDuty | null;
  onNavigateTab: (tab: 'khata' | 'kitchen' | 'qr' | 'reports') => void;
  onAddCustomerPress: () => void;
  onAddTxPress: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  customers,
  transactions,
  todayDuty,
  onNavigateTab,
  onAddCustomerPress,
  onAddTxPress
}) => {
  // Calculate total balances
  let totalGetPaise = 0;
  let totalGivePaise = 0;

  customers.forEach(c => {
    if (c.rawBalance > 0) totalGetPaise += c.rawBalance;
    else if (c.rawBalance < 0) totalGivePaise += Math.abs(c.rawBalance);
  });

  const netPaise = totalGetPaise - totalGivePaise;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Net Balance Overview Card */}
      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>TOTAL NET BALANCE</Text>
        <Text style={[styles.netBalanceText, { color: netPaise >= 0 ? '#10b981' : '#ef4444' }]}>
          {netPaise >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netPaise))}
        </Text>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderColor: '#ef444440' }]}>
            <View style={styles.statIconRow}>
              <ArrowDownLeft size={16} color="#ef4444" />
              <Text style={styles.statLabel}>You Will Get</Text>
            </View>
            <Text style={[styles.statVal, { color: '#ef4444' }]}>{formatCurrency(totalGetPaise)}</Text>
          </View>

          <View style={[styles.statBox, { borderColor: '#10b98140' }]}>
            <View style={styles.statIconRow}>
              <ArrowUpRight size={16} color="#10b981" />
              <Text style={styles.statLabel}>You Will Give</Text>
            </View>
            <Text style={[styles.statVal, { color: '#10b981' }]}>{formatCurrency(totalGivePaise)}</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickGrid}>
        <TouchableOpacity style={styles.quickCard} onPress={onAddTxPress} activeOpacity={0.8}>
          <View style={[styles.quickIcon, { backgroundColor: '#05966920' }]}>
            <Plus size={22} color="#10b981" />
          </View>
          <Text style={styles.quickText}>Add Entry</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickCard} onPress={onAddCustomerPress} activeOpacity={0.8}>
          <View style={[styles.quickIcon, { backgroundColor: '#3b82f620' }]}>
            <Users size={22} color="#3b82f6" />
          </View>
          <Text style={styles.quickText}>Add Customer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickCard} onPress={() => onNavigateTab('qr')} activeOpacity={0.8}>
          <View style={[styles.quickIcon, { backgroundColor: '#8b5cf620' }]}>
            <QrCode size={22} color="#8b5cf6" />
          </View>
          <Text style={styles.quickText}>UPI QR Code</Text>
        </TouchableOpacity>
      </View>

      {/* Kitchen Duty Widget */}
      <View style={styles.widgetHeader}>
        <Text style={styles.sectionTitle}>Today's Kitchen Duty</Text>
        <TouchableOpacity onPress={() => onNavigateTab('kitchen')}>
          <Text style={styles.linkText}>View Roster <ChevronRight size={14} color="#10b981" /></Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dutyCard}>
        <View style={styles.dutyRow}>
          <View style={styles.dutyIconBox}>
            <Utensils size={22} color="#f59e0b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dutyTitle}>
              {todayDuty ? todayDuty.title : 'No active kitchen duty today'}
            </Text>
            <Text style={styles.dutySub}>
              {todayDuty ? `Assigned to: ${todayDuty.assignedUserName}` : 'Join or create a kitchen group to assign duties'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0f172a',
    flexGrow: 1
  },
  overviewCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20
  },
  overviewTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 1
  },
  netBalanceText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8'
  },
  statVal: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  quickText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0'
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  linkText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600'
  },
  dutyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  dutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  dutyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f59e0b20',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dutyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  dutySub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  }
});
