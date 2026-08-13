import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Customer, Transaction, User } from '../types';
import { formatCurrency, formatDate, calculateCustomerBalance } from '../utils/formatters';
import { generateAndShareCustomerStatement } from '../utils/pdfNative';
import { generateWhatsAppReminder } from '../utils/whatsapp';
import { ArrowLeft, Send, FileText, Plus, Minus } from 'lucide-react-native';

interface CustomerDetailScreenProps {
  user: User;
  customer: Customer;
  transactions: Transaction[];
  onBack: () => void;
  onAddTx: (type: 'gave' | 'got') => void;
}

export const CustomerDetailScreen: React.FC<CustomerDetailScreenProps> = ({
  user,
  customer,
  transactions,
  onBack,
  onAddTx
}) => {
  const customerTxs = transactions.filter(t => t.customerId === customer.id && !t.deletedAt);
  const { balancePaise, status } = calculateCustomerBalance(customerTxs);

  const handleSendWhatsApp = () => {
    const { waUrl } = generateWhatsAppReminder({
      customerName: customer.name,
      phone: customer.phone,
      amount: balancePaise,
      status,
      businessName: user.shopName || 'Khata Book'
    });
    Linking.openURL(waUrl).catch(() => alert('Could not open WhatsApp app'));
  };

  const handleExportPDF = () => {
    generateAndShareCustomerStatement(user, customer, transactions);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} color="#f8fafc" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{customer.name}</Text>
          <Text style={styles.headerPhone}>{customer.phone}</Text>
        </View>
        <TouchableOpacity onPress={handleExportPDF} style={styles.actionHeaderBtn}>
          <FileText size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* Balance Summary Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>NET BALANCE</Text>
        <Text style={[styles.balanceAmount, { color: status === 'get' ? '#ef4444' : status === 'give' ? '#10b981' : '#64748b' }]}>
          {formatCurrency(balancePaise)}
        </Text>
        <Text style={styles.statusSub}>
          {status === 'get' ? 'You Will Get (Udhar)' : status === 'give' ? 'You Will Give (Jama)' : 'Account Settled'}
        </Text>

        <TouchableOpacity style={styles.whatsappBtn} onPress={handleSendWhatsApp} activeOpacity={0.8}>
          <Send size={16} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.whatsappBtnText}>Send WhatsApp Reminder</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction Timeline */}
      <FlatList
        data={customerTxs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txDate}>{formatDate(item.date)}</Text>
              {item.notes ? <Text style={styles.txNotes}>{item.notes}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.txAmount, { color: item.type === 'gave' ? '#ef4444' : '#10b981' }]}>
                {item.type === 'gave' ? 'GAVE ' : 'GOT '}{formatCurrency(item.amount)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transaction history</Text>
          </View>
        }
      />

      {/* Bottom Give / Got Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.btn, styles.gaveBtn]} onPress={() => onAddTx('gave')} activeOpacity={0.8}>
          <Minus size={18} color="#ffffff" />
          <Text style={styles.btnText}>YOU GAVE ₹ (Udhar)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.gotBtn]} onPress={() => onAddTx('got')} activeOpacity={0.8}>
          <Plus size={18} color="#ffffff" />
          <Text style={styles.btnText}>YOU GOT ₹ (Jama)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  backBtn: {
    marginRight: 12
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  headerPhone: {
    fontSize: 12,
    color: '#94a3b8'
  },
  actionHeaderBtn: {
    padding: 8
  },
  balanceCard: {
    backgroundColor: '#1e293b',
    margin: 16,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8'
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 6
  },
  statusSub: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 16
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12
  },
  whatsappBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155'
  },
  txDate: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '600'
  },
  txNotes: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  txAmount: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b'
  },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  gaveBtn: {
    backgroundColor: '#ef4444'
  },
  gotBtn: {
    backgroundColor: '#10b981'
  },
  btnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14
  }
});
