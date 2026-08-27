import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, BookOpen, Utensils, FileText, MoreHorizontal } from 'lucide-react-native';

export type TabType = 'home' | 'khata' | 'kitchen' | 'qr' | 'reports' | 'more';

interface NativeBottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const NativeBottomNav: React.FC<NativeBottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'khata' as TabType, label: 'Khata', icon: BookOpen },
    { id: 'kitchen' as TabType, label: 'Kitchen', icon: Utensils },
    { id: 'reports' as TabType, label: 'Reports', icon: FileText },
    { id: 'more' as TabType, label: 'More', icon: MoreHorizontal }
  ];

  return (
    <View style={styles.navBar}>
      {tabs.map(t => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            style={styles.tabItem}
            onPress={() => onTabChange(t.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, isActive && styles.activeIconBox]}>
              <Icon size={20} color={isActive ? '#10b981' : '#64748b'} />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 8,
    paddingBottom: 20
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBox: {
    padding: 4,
    borderRadius: 8
  },
  activeIconBox: {
    backgroundColor: '#05966920'
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500'
  },
  activeTabLabel: {
    color: '#10b981',
    fontWeight: 'bold'
  }
});
