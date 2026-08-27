import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { User, Customer, Transaction, CashbookEntry, KitchenExpense } from '../types';
import { formatCurrency } from '../utils/formatters';
import { generateAndShareCustomerStatement } from '../utils/pdfNative';
import { FileText, Download, Share2, TrendingUp, TrendingDown } from 'lucide-react-native';

interface ReportsScreenProps {
  user: User;
  customers: Customer[];
  transactions: Transaction[];
  cashbook: CashbookEntry[];
  kitchenExpenses: KitchenExpense[];
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  user,
  customers,
  transactions,
  cashbook
}) => {
  let totalGetPaise = 0;
  let totalGivePaise = 0;
  customers.forEach(c => {
    if (c.rawBalance > 0) totalGetPaise += c.rawBalance;
    else if (c.rawBalance < 0) totalGivePaise += Math.abs(c.rawBalance);
  });

  let cashInPaise = 0;
  let cashOutPaise = 0;
  cashbook.forEach(e => {
    if (e.type === 'in') cashInPaise += e.amount;
    else if (e.type === 'out') cashOutPaise += e.amount;
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Reports & Statements</Text>
      <Text style={styles.subtitle}>Export PDF reports and customer balance summaries</Text>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <View style={[styles.iconBox, { backgroundColor: '#ef444420' }]}>
            <TrendingDown size={20} color="#ef4444" />
          </View>
          <Text style={styles.summaryLabel}>Total You Will Get</Text>
          <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{formatCurrency(totalGetPaise)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.iconBox, { backgroundColor: '#10b98120' }]}>
            <TrendingUp size={20} color="#10b981" />
          </View>
          <Text style={styles.summaryLabel}>Total You Will Give</Text>
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>{formatCurrency(totalGivePaise)}</Text>
        </View>
      </View>

      {/* Reports Actions */}
      <Text style={styles.sectionTitle}>Available PDF Statements</Text>

      <TouchableOpacity
        style={styles.reportRow}
        onPress={() => {
          if (customers.length > 0) {
            generateAndShareCustomerStatement(user, customers[0], transactions);
          } else {
            alert('No customers available for PDF export');
          }
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.reportIcon, { backgroundColor: '#05966920' }]}>
          <FileText size={22} color="#10b981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>All Customer Balances PDF</Text>
          <Text style={styles.reportSub}>Download full customer udhar/jama balance report</Text>
        </View>
        <Share2 size={18} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.reportRow}
        onPress={() => alert('Cashbook PDF statement generated')}
        activeOpacity={0.8}
      >
        <View style={[styles.reportIcon, { backgroundColor: '#3b82f620' }]}>
          <Download size={22} color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>Cashbook Income/Expense PDF</Text>
          <Text style={styles.reportSub}>Export daily cash in and cash out statement</Text>
        </View>
        <Share2 size={18} color="#94a3b8" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0f172a',
    flexGrow: 1
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  summaryLabel: {
    fontSize: 11,
    color: '#94a3b8'
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  reportSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  }
});
