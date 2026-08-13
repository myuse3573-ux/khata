import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { KitchenGroup, KitchenMember, KitchenDuty, KitchenExpense } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Utensils, Plus, CheckCircle, Clock, QrCode } from 'lucide-react-native';

interface KitchenScreenProps {
  currentGroup: KitchenGroup | null;
  members: KitchenMember[];
  duties: KitchenDuty[];
  expenses: KitchenExpense[];
  onCreateGroup: (name: string) => void;
  onJoinGroup: (code: string) => void;
  onCompleteDuty: (dutyId: string) => void;
  onAddExpense: () => void;
  onScanQR: () => void;
}

export const KitchenScreen: React.FC<KitchenScreenProps> = ({
  currentGroup,
  members,
  duties,
  expenses,
  onCreateGroup,
  onJoinGroup,
  onCompleteDuty,
  onAddExpense,
  onScanQR
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'expenses' | 'members'>('roster');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  if (!currentGroup) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Utensils size={32} color="#f59e0b" />
          </View>
          <Text style={styles.emptyTitle}>Shared Kitchen / Household</Text>
          <Text style={styles.emptyDesc}>
            Join or create a kitchen group to manage turn rotations, daily cook/cleaning duties, and split shared expenses with flatmates.
          </Text>

          <View style={styles.formBox}>
            <Text style={styles.formLabel}>Join Kitchen Group</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter Join Code (e.g. KT-XYZ123)"
                placeholderTextColor="#64748b"
                value={joinCodeInput}
                onChangeText={setJoinCodeInput}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => onJoinGroup(joinCodeInput)}
              >
                <Text style={styles.joinBtnText}>Join</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.scanQrBtn} onPress={onScanQR}>
              <QrCode size={18} color="#10b981" style={{ marginRight: 8 }} />
              <Text style={styles.scanQrBtnText}>Scan Kitchen Invitation QR</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <Text style={styles.dividerText}>OR CREATE NEW</Text>
            </View>

            <Text style={styles.formLabel}>Create New Kitchen Group</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Group Name (e.g. Room 402 Kitchen)"
                placeholderTextColor="#64748b"
                value={newGroupName}
                onChangeText={setNewGroupName}
              />
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => onCreateGroup(newGroupName)}
              >
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Kitchen Group Header */}
      <View style={styles.groupHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupName}>{currentGroup.name}</Text>
          <Text style={styles.joinCodeText}>Join Code: {currentGroup.joinCode}</Text>
        </View>
        <TouchableOpacity style={styles.qrCodeBtn} onPress={onScanQR}>
          <QrCode size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'roster' && styles.activeTab]}
          onPress={() => setActiveTab('roster')}
        >
          <Text style={[styles.tabText, activeTab === 'roster' && styles.activeTabText]}>
            Duty Roster
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'expenses' && styles.activeTab]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.activeTabText]}>
            Expenses ({expenses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
            Members ({members.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'roster' ? (
        <FlatList
          data={duties}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.dutyRow}>
              <View style={[styles.dutyStatusIcon, { backgroundColor: item.status === 'completed' ? '#10b98120' : '#f59e0b20' }]}>
                {item.status === 'completed' ? <CheckCircle size={20} color="#10b981" /> : <Clock size={20} color="#f59e0b" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dutyTitle}>{item.title}</Text>
                <Text style={styles.dutyAssigned}>Assigned to: {item.assignedUserName}</Text>
              </View>
              {item.status === 'pending' && (
                <TouchableOpacity style={styles.completeBtn} onPress={() => onCompleteDuty(item.id)}>
                  <Text style={styles.completeBtnText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      ) : activeTab === 'expenses' ? (
        <>
          <FlatList
            data={expenses}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.dutyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dutyTitle}>{item.title}</Text>
                  <Text style={styles.dutyAssigned}>Paid by: {item.paidByUserName} • {formatDate(item.date)}</Text>
                </View>
                <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
              </View>
            )}
          />
          <TouchableOpacity style={styles.fab} onPress={onAddExpense} activeOpacity={0.8}>
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        </>
      ) : (
        <FlatList
          data={members}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{item.displayName}</Text>
                <Text style={styles.memberRole}>{item.role}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    margin: 20,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center'
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#f59e0b20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20
  },
  formBox: {
    width: '100%'
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginBottom: 8
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#f8fafc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    height: 46
  },
  joinBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center'
  },
  joinBtnText: {
    color: '#ffffff',
    fontWeight: 'bold'
  },
  createBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center'
  },
  createBtnText: {
    color: '#ffffff',
    fontWeight: 'bold'
  },
  scanQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05966920',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#05966940',
    marginBottom: 16
  },
  scanQrBtnText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 13
  },
  divider: {
    alignItems: 'center',
    marginVertical: 12
  },
  dividerText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 'bold'
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  joinCodeText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2
  },
  qrCodeBtn: {
    padding: 8
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#10b981'
  },
  tabText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600'
  },
  activeTabText: {
    color: '#10b981'
  },
  dutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155'
  },
  dutyStatusIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  dutyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  dutyAssigned: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  completeBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8
  },
  completeBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444'
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  memberAvatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16
  },
  memberName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  memberRole: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600'
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
    justifyContent: 'center'
  }
});
