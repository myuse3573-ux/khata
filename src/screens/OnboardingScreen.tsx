import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { BookOpen, Utensils, CheckCircle2, ArrowRight } from 'lucide-react-native';

interface OnboardingScreenProps {
  onComplete: (choice: 'khata' | 'kitchen' | 'both') => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [selectedChoice, setSelectedChoice] = useState<'khata' | 'kitchen' | 'both'>('both');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoEmoji}>📙</Text>
        </View>
        <Text style={styles.title}>Welcome to Khata</Text>
        <Text style={styles.subtitle}>Digital Udhar Khata Book & Shared Household Manager</Text>
      </View>

      <Text style={styles.sectionTitle}>Select how you want to use Khata:</Text>

      <TouchableOpacity
        style={[styles.card, selectedChoice === 'khata' && styles.selectedCard]}
        onPress={() => setSelectedChoice('khata')}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#3b82f620' }]}>
            <BookOpen size={24} color="#3b82f6" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Personal Khata Only</Text>
            <Text style={styles.cardDesc}>Manage customer udhar, jama, payment reminders & cashbook</Text>
          </View>
          {selectedChoice === 'khata' && <CheckCircle2 size={24} color="#10b981" />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, selectedChoice === 'kitchen' && styles.selectedCard]}
        onPress={() => setSelectedChoice('kitchen')}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#f59e0b20' }]}>
            <Utensils size={24} color="#f59e0b" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Shared Kitchen Only</Text>
            <Text style={styles.cardDesc}>Manage roommate duty rosters, turn tracking & shared expenses</Text>
          </View>
          {selectedChoice === 'kitchen' && <CheckCircle2 size={24} color="#10b981" />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, selectedChoice === 'both' && styles.selectedCard]}
        onPress={() => setSelectedChoice('both')}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#10b98120' }]}>
            <Text style={{ fontSize: 20 }}>⭐</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Khata + Shared Kitchen (Recommended)</Text>
            <Text style={styles.cardDesc}>Use both personal customer management & roommate shared features</Text>
          </View>
          {selectedChoice === 'both' && <CheckCircle2 size={24} color="#10b981" />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.continueBtn}
        onPress={() => onComplete(selectedChoice)}
        activeOpacity={0.8}
      >
        <Text style={styles.continueBtnText}>Get Started</Text>
        <ArrowRight size={20} color="#ffffff" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    justifyContent: 'center'
  },
  header: {
    alignItems: 'center',
    marginBottom: 32
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#05966920',
    borderWidth: 1,
    borderColor: '#05966940',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  logoEmoji: {
    fontSize: 36
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 16
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  selectedCard: {
    borderColor: '#10b981',
    backgroundColor: '#10b98110'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  cardTextContainer: {
    flex: 1
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  cardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2
  },
  continueBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff'
  }
});
