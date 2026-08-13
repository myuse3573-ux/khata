import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { User } from '../types';
import { NativeStorage } from '../services/nativeStorage';
import { Lock, Globe, Database, LogOut } from 'lucide-react-native';

interface MoreScreenProps {
  user: User;
  onLogout: () => void;
  onLanguageChange: (lang: 'en' | 'hi') => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({ user, onLogout, onLanguageChange }) => {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [currentLang, setCurrentLang] = useState<'en' | 'hi'>('en');

  const handleTogglePin = async (val: boolean) => {
    setPinEnabled(val);
    if (val) {
      await NativeStorage.savePinSecret('1234');
      alert('Security PIN enabled (1234)');
    } else {
      await NativeStorage.savePinSecret('');
      alert('Security PIN disabled');
    }
  };

  const handleLangToggle = async () => {
    const nextLang = currentLang === 'en' ? 'hi' : 'en';
    setCurrentLang(nextLang);
    await NativeStorage.setLanguage(nextLang);
    onLanguageChange(nextLang);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Box */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.name || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user.name || 'User'}</Text>
          <Text style={styles.userShop}>{user.shopName || 'Khata Shop'}</Text>
          <Text style={styles.userPhone}>{user.phone}</Text>
        </View>
      </View>

      {/* Settings Options */}
      <Text style={styles.sectionTitle}>Security & Preferences</Text>

      <View style={styles.settingRow}>
        <View style={[styles.settingIcon, { backgroundColor: '#3b82f620' }]}>
          <Lock size={20} color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingTitle}>App PIN Lock</Text>
          <Text style={styles.settingSub}>Protect app with 4-digit PIN</Text>
        </View>
        <Switch value={pinEnabled} onValueChange={handleTogglePin} trackColor={{ false: '#334155', true: '#059669' }} />
      </View>

      <TouchableOpacity style={styles.settingRow} onPress={handleLangToggle} activeOpacity={0.8}>
        <View style={[styles.settingIcon, { backgroundColor: '#8b5cf620' }]}>
          <Globe size={20} color="#8b5cf6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingTitle}>Language</Text>
          <Text style={styles.settingSub}>{currentLang === 'en' ? 'English (En)' : 'हिंदी (Hindi)'}</Text>
        </View>
        <Text style={styles.langBadge}>{currentLang.toUpperCase()}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Data & Backup</Text>

      <TouchableOpacity style={styles.settingRow} onPress={() => alert('Local database backup saved to Device')} activeOpacity={0.8}>
        <View style={[styles.settingIcon, { backgroundColor: '#10b98120' }]}>
          <Database size={20} color="#10b981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingTitle}>Local Database Backup</Text>
          <Text style={styles.settingSub}>Export offline database to device</Text>
        </View>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
        <LogOut size={20} color="#ef4444" style={{ marginRight: 8 }} />
        <Text style={styles.logoutBtnText}>Secure Logout</Text>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  userShop: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2
  },
  userPhone: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginBottom: 12
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  settingSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  langBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10b981',
    backgroundColor: '#10b98120',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef444460',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 24
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: 'bold'
  }
});
