import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { User, KitchenGroup } from '../types';
import { QrCode, Camera } from 'lucide-react-native';

interface QRPayScreenProps {
  user: User;
  currentGroup: KitchenGroup | null;
  onScannedCode: (code: string) => void;
}

export const QRPayScreen: React.FC<QRPayScreenProps> = ({ user, currentGroup, onScannedCode }) => {
  const [activeTab, setActiveTab] = useState<'my_qr' | 'scan'>('my_qr');
  const [upiId, setUpiId] = useState('9876543210@upi');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [copied, setCopied] = useState(false);

  const qrValue = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(user.name || 'Merchant')}&cu=INR`;

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScannedCode(data);
  };

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTab, activeTab === 'my_qr' && styles.activeSubTab]}
          onPress={() => setActiveTab('my_qr')}
        >
          <QrCode size={18} color={activeTab === 'my_qr' ? '#10b981' : '#64748b'} style={{ marginRight: 6 }} />
          <Text style={[styles.subTabText, activeTab === 'my_qr' && styles.activeSubTabText]}>
            My Payment QR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeTab === 'scan' && styles.activeSubTab]}
          onPress={() => { setScanned(false); setActiveTab('scan'); }}
        >
          <Camera size={18} color={activeTab === 'scan' ? '#10b981' : '#64748b'} style={{ marginRight: 6 }} />
          <Text style={[styles.subTabText, activeTab === 'scan' && styles.activeSubTabText]}>
            Scan QR Code
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'my_qr' ? (
        <View style={styles.qrCard}>
          <Text style={styles.shopName}>{user.shopName || 'Khata Store'}</Text>
          <Text style={styles.subTitle}>Scan with PhonePe, Paytm, Google Pay</Text>

          <View style={styles.qrBox}>
            <QRCode value={qrValue} size={220} backgroundColor="#ffffff" color="#0f172a" />
          </View>

          <View style={styles.upiInputRow}>
            <Text style={styles.upiLabel}>UPI ID:</Text>
            <TextInput
              style={styles.upiInput}
              value={upiId}
              onChangeText={setUpiId}
              placeholder="e.g. 9876543210@upi"
              placeholderTextColor="#64748b"
            />
          </View>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          {!permission ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>Requesting camera permission...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>Camera permission is required to scan QR codes</Text>
              <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                <Text style={styles.grantBtnText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            >
              <View style={styles.overlay}>
                <View style={styles.targetFrame} />
                <Text style={styles.scanInstruction}>Position QR code inside frame to scan</Text>
              </View>
            </CameraView>
          )}
        </View>
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
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
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
  qrCard: {
    backgroundColor: '#1e293b',
    margin: 20,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  subTitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20
  },
  qrBox: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20
  },
  upiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  upiLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#10b981',
    marginRight: 8
  },
  upiInput: {
    flex: 1,
    height: 44,
    color: '#f8fafc',
    fontSize: 13
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  permissionBox: {
    padding: 24,
    alignItems: 'center'
  },
  permissionText: {
    color: '#f8fafc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16
  },
  grantBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10
  },
  grantBtnText: {
    color: '#ffffff',
    fontWeight: 'bold'
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  targetFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 16,
    backgroundColor: 'transparent'
  },
  scanInstruction: {
    color: '#ffffff',
    marginTop: 20,
    fontSize: 13,
    fontWeight: '600'
  }
});
