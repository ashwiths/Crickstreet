import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { s, fs, sp, br, avatarSz, iconSz } from '../../theme/responsive';

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 4;
const CORNER_COLOR = '#A8CD55';

export default function ScanPlayerScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const FRAME_SIZE = width * 0.72;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Scan-line animation
  const scanLineY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineY, {
          toValue: 0,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLineY]);

  const translateY = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_SIZE - 4],
  });

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Expect URL: crickstreet://player/<uid> OR https://.../player?id=<uid>
    let playerId = '';
    const customSchemeMatch = data.match(/crickstreet:\/\/player\/([a-zA-Z0-9_-]+)/);
    const webUrlMatch = data.match(/[\?&]id=([a-zA-Z0-9_-]+)/);

    if (customSchemeMatch && customSchemeMatch[1]) {
      playerId = customSchemeMatch[1];
    } else if (webUrlMatch && webUrlMatch[1]) {
      playerId = webUrlMatch[1];
    }

    if (playerId) {
      router.replace({ pathname: '/player-profile/[id]', params: { id: playerId } });
    } else {
      setScanError('This QR code is not a valid Crickstreet player profile.');
    }
  };

  // Permission not determined yet
  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Requesting camera permission…</Text>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <LinearGradient colors={['#0D1117', '#1A2332']} style={StyleSheet.absoluteFillObject} />
        <Feather name="camera-off" size={56} color="#A8CD55" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Crickstreet needs camera access to scan player QR codes.
        </Text>
        <TouchableOpacity style={styles.grantButton} onPress={requestPermission}>
          <LinearGradient
            colors={['#A8CD55', '#E3A85B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.grantButtonGradient}
          >
            <Text style={styles.grantButtonText}>Grant Permission</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLinkBtn}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Dark overlay with cutout */}
      <View style={styles.overlay}>
        {/* Top overlay */}
        <View style={[styles.overlaySection, { height: (height - FRAME_SIZE) / 2 }]} />

        {/* Middle row */}
        <View style={styles.middleRow}>
          <View style={[styles.overlaySection, { width: (width - FRAME_SIZE) / 2, height: FRAME_SIZE }]} />

          {/* Transparent viewfinder */}
          <View style={[styles.viewfinder, { width: FRAME_SIZE, height: FRAME_SIZE }]}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Scan line */}
            <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
          </View>

          <View style={[styles.overlaySection, { width: (width - FRAME_SIZE) / 2, height: FRAME_SIZE }]} />
        </View>

        {/* Bottom overlay */}
        <View style={[styles.overlaySection, { flex: 1 }]} />
      </View>

      {/* SafeArea UI */}
      <SafeAreaView style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Feather name="x" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Player QR</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Bottom info */}
        <View style={styles.bottomUI}>
          {scanError ? (
            <View style={styles.errorCard}>
              <Feather name="alert-circle" size={20} color="#FF6B6B" />
              <Text style={styles.errorText}>{scanError}</Text>
              <TouchableOpacity onPress={() => setScanned(false)}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.instructionCard}>
                <LinearGradient
                  colors={['rgba(168,205,85,0.15)', 'rgba(227,168,91,0.15)']}
                  style={styles.instructionGradient}
                >
                  <Feather name="grid" size={18} color="#A8CD55" />
                  <Text style={styles.instructionText}>
                    Point camera at a Crickstreet player&apos;s QR code
                  </Text>
                </LinearGradient>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
    padding: sp.xl,
    gap: sp.md,
  },
  overlay: { flex: 1 },
  overlaySection: { backgroundColor: 'rgba(0,0,0,0.72)' },
  middleRow: { flexDirection: 'row' },
  viewfinder: {
    overflow: 'hidden',
  },
  // Corner brackets
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderTopLeftRadius: br.xs,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderTopRightRadius: br.xs,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderBottomLeftRadius: br.xs,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderBottomRightRadius: br.xs,
  },
  scanLine: {
    height: 2,
    backgroundColor: '#A8CD55',
    shadowColor: '#A8CD55',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingTop: sp.xs,
    paddingBottom: sp.md,
  },
  closeButton: {
    width: avatarSz.md2, height: avatarSz.md2, borderRadius: avatarSz.md2 / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: fs.lg,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bottomUI: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: sp.xl,
    paddingBottom: sp.h,
  },
  instructionCard: { borderRadius: br.lg, overflow: 'hidden' },
  instructionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    padding: sp.lg,
    borderRadius: br.lg,
    borderWidth: 1,
    borderColor: 'rgba(168,205,85,0.3)',
  },
  instructionText: {
    color: '#E8E8E8',
    fontSize: fs.md,
    flex: 1,
    lineHeight: fs.md * 1.4,
  },
  errorCard: {
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderRadius: br.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    padding: sp.lg,
    alignItems: 'center',
    gap: sp.sm,
  },
  errorText: { color: '#FF6B6B', fontSize: fs.md, textAlign: 'center' },
  retryText: { color: '#A8CD55', fontSize: fs.md, fontWeight: '600', marginTop: sp.xs },
  permissionTitle: {
    color: '#FFF',
    fontSize: fs.xl2,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: sp.sm,
  },
  permissionText: {
    color: '#8A9BA8',
    fontSize: fs.lg,
    textAlign: 'center',
    lineHeight: fs.lg * 1.4,
  },
  grantButton: { borderRadius: br.md, overflow: 'hidden', marginTop: sp.sm },
  grantButtonGradient: { paddingHorizontal: sp.xxl, paddingVertical: sp.md },
  grantButtonText: { color: '#FFF', fontSize: fs.md2, fontWeight: '700' },
  backLinkBtn: { marginTop: sp.xs },
  backLinkText: { color: '#A8CD55', fontSize: fs.md },
});
