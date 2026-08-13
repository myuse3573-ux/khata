import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Store, Lock, Globe, RefreshCw } from 'lucide-react-native';

interface NativeHeaderProps {
  shopName: string;
  isOnline: boolean;
  onLockPress?: () => void;
  onLanguageToggle?: () => void;
}

export const NativeHeader: React.FC<NativeHeaderProps> = ({
  shopName,
  isOnline,
  onLockPress,
  onLanguageToggle
}) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.leftSection}>
        <View style={styles.iconContainer}>
          <Store size={20} color="#10b981" />
        </View>
        <View>
          <Text style={styles.shopNameText} numberOfLines={1}>{shopName || 'My Khata'}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#f59e0b' }]} />
            <Text style={styles.statusText}>{isOnline ? 'Online Synced' : 'Offline Mode'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        {onLanguageToggle && (
          <TouchableOpacity style={styles.actionBtn} onPress={onLanguageToggle} activeOpacity={0.7}>
            <Globe size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
        {onLockPress && (
          <TouchableOpacity style={styles.actionBtn} onPress={onLockPress} activeOpacity={0.7}>
            <Lock size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#05966920',
    borderWidth: 1,
    borderColor: '#05966940',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  shopNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  statusText: {
    fontSize: 11,
    color: '#94a3b8'
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  }
});
