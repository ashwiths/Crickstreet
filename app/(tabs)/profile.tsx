import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useAuth } from '../../src/hooks/useAuth';

const { width } = Dimensions.get('window');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePlayerUrl(uid: string) {
  return `https://crickstreet-890e7.web.app/player?id=${uid}`;
}

function makePlayerId(uid: string) {
  return `CSPL-${uid.slice(0, 8).toUpperCase()}`;
}

// ── QR Modal ──────────────────────────────────────────────────────────────────

function QRModal({
  visible,
  onClose,
  displayName,
  photoURL,
  uid,
}: {
  visible: boolean;
  onClose: () => void;
  displayName: string;
  photoURL: string;
  uid: string;
}) {
  const qrValue = makePlayerUrl(uid);
  const playerId = makePlayerId(uid);

  // Entrance animation
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 9 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my Crickstreet player profile! 🏏\n${qrValue}`,
        title: `${displayName}'s Cricket Profile`,
      });
    } catch (_) {}
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[styles.modalSheet, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Header gradient strip */}
            <LinearGradient
              colors={['#1A3A2A', '#0D2B1F', '#162A40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeaderGradient}
            >
              {/* Decorative circles */}
              <View style={styles.decorCircle1} />
              <View style={styles.decorCircle2} />

              {/* Close button */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Feather name="x" size={18} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>

              {/* Avatar */}
              <View style={styles.modalAvatarRingOuter}>
                <LinearGradient
                  colors={['#A8CD55', '#E3A85B']}
                  style={styles.modalAvatarRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image source={{ uri: photoURL || 'https://i.pravatar.cc/150?img=11' }} style={styles.modalAvatar} />
                </LinearGradient>
              </View>

              <Text style={styles.modalName}>{displayName}</Text>
              <Text style={styles.modalPlayerId}>{playerId}</Text>
            </LinearGradient>

            {/* QR Code */}
            <View style={styles.qrSection}>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrValue}
                  size={190}
                  color="#0A1628"
                  backgroundColor="#FFF"
                  logo={{ uri: photoURL || 'https://i.pravatar.cc/40?img=11' }}
                  logoSize={32}
                  logoBackgroundColor="#FFF"
                  logoBorderRadius={16}
                />
              </View>
              <Text style={styles.qrHint}>Scan to view player profile</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                <LinearGradient
                  colors={['#A8CD55', '#E3A85B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionBtnGradient}
                >
                  <Feather name="share-2" size={17} color="#FFF" />
                  <Text style={styles.actionBtnText}>Share</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={onClose}>
                <View style={styles.actionBtnOutline}>
                  <Feather name="download" size={17} color="#A8CD55" />
                  <Text style={[styles.actionBtnText, { color: '#A8CD55' }]}>Save QR</Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Profile Screen ────────────────────────────────────────────────────────────

export default function ProfileScreen({ onBack }: { onBack?: () => void } = {}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [qrVisible, setQrVisible] = useState(false);

  const displayName = user?.displayName || 'Galangal Richard';
  const email = user?.email || 'galangal82@gmail.com';
  const photoURL = user?.photoURL || 'https://i.pravatar.cc/150?img=11';
  const uid = user?.uid || 'demo-user-uid-0001';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.4, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={onBack || (() => router.back())}>
            <Feather name="arrow-left" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="share-2" size={20} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Profile Card ── */}
          <View style={styles.profileCard}>
            <Image source={{ uri: photoURL }} style={styles.avatar} />
            <View style={styles.profileInfo}>
              <Text style={styles.nameText}>{displayName}</Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            {/* Edit button */}
            <TouchableOpacity>
              <LinearGradient
                colors={['#A8CD55', '#E3A85B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCircle}
              >
                <Feather name="edit-2" size={16} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* QR Code button */}
            <TouchableOpacity onPress={() => setQrVisible(true)} style={{ marginLeft: 8 }}>
              <LinearGradient
                colors={['#0D2B1F', '#162A40']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCircle}
              >
                <Feather name="grid" size={16} color="#A8CD55" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ── Player ID chip ── */}
          <View style={styles.playerIdChip}>
            <LinearGradient
              colors={['rgba(168,205,85,0.15)', 'rgba(227,168,91,0.15)']}
              style={styles.playerIdGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="hash" size={14} color="#A8CD55" />
              <Text style={styles.playerIdText}>Player ID: {makePlayerId(uid)}</Text>
            </LinearGradient>
          </View>

          {/* ── Menu Items ── */}
          <View style={styles.menuContainer}>
            {/* Scan Player QR — highlighted item */}
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/qr-scanner')}>
              <LinearGradient
                colors={['rgba(168,205,85,0.18)', 'rgba(227,168,91,0.12)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.menuIconContainer, { backgroundColor: undefined }]}
              >
                <Feather name="camera" size={20} color="#A8CD55" />
              </LinearGradient>
              <Text style={[styles.menuLabel, { color: '#2D5016' }]}>Scan Player QR</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#A8CD55" style={styles.menuChevron} />
            </TouchableOpacity>

            <View style={styles.divider} />
            <MenuItem icon="users" label="My Players" />
            <View style={styles.divider} />
            <MenuItem icon="user" label="My Teams" onPress={() => router.push('/my-teams')} />
            <View style={styles.divider} />
            <MenuItem icon="git-merge" label="Care Coordination" />
            <View style={styles.divider} />
            <MenuItem icon="heart" label="Favorite Doctors" />
            <View style={styles.divider} />
            <MenuItem icon="file-text" label="Medical all History" />
            <View style={styles.divider} />
            <MenuItem icon="info" label="Helps & Supports" />
          </View>

          {/* ── Logout ── */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={logout}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#FFF0F0' }]}>
                <Feather name="log-out" size={20} color="#FF4D4D" style={{ marginLeft: 4 }} />
              </View>
              <Text style={[styles.menuLabel, { color: '#FF4D4D' }]}>Logout</Text>
              <Feather name="chevron-right" size={20} color="#FF4D4D" style={styles.menuChevron} />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>

      {/* ── QR Modal ── */}
      <QRModal
        visible={qrVisible}
        onClose={() => setQrVisible(false)}
        displayName={displayName}
        photoURL={photoURL}
        uid={uid}
      />
    </View>
  );
}

// ── MenuItem helper ───────────────────────────────────────────────────────────

function MenuItem({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Feather name={icon} size={20} color="#1A1A1A" />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Feather name="chevron-right" size={20} color="#CCCCCC" style={styles.menuChevron} />
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const MODAL_WIDTH = width - 48;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F1' },
  headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24,
  },
  iconButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },

  // Profile card
  profileCard: {
    backgroundColor: '#FFF', borderRadius: 24, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 16, backgroundColor: '#E0E0E0' },
  profileInfo: { flex: 1 },
  nameText: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  emailText: { fontSize: 14, color: '#8A8A8A' },
  actionCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // Player ID chip
  playerIdChip: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  playerIdGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,205,85,0.35)',
  },
  playerIdText: { color: '#2D5016', fontSize: 13, fontWeight: '600' },

  // Menu
  menuContainer: {
    backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 8,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  menuIconContainer: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1A1A1A' },
  menuChevron: { marginLeft: 8 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 76, marginRight: 16 },
  newBadge: {
    backgroundColor: '#A8CD55', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginRight: 6,
  },
  newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // Logout
  logoutContainer: {
    backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  bottomSpacer: { height: 40 },

  // ── QR Modal ──
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalSheet: {
    width: MODAL_WIDTH, borderRadius: 28,
    backgroundColor: '#FFF', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35, shadowRadius: 30, elevation: 20,
  },
  modalHeaderGradient: {
    alignItems: 'center', paddingTop: 36, paddingBottom: 24, overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute', top: -50, right: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(168,205,85,0.1)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -30, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(227,168,91,0.08)',
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalAvatarRingOuter: { marginBottom: 12 },
  modalAvatarRing: { width: 80, height: 80, borderRadius: 40, padding: 3 },
  modalAvatar: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#1A2332' },
  modalName: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalPlayerId: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  // QR
  qrSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#FFF' },
  qrWrapper: {
    padding: 16, borderRadius: 20,
    backgroundColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  qrHint: { marginTop: 14, color: '#8A8A8A', fontSize: 12 },

  // Action buttons
  modalActions: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24,
    backgroundColor: '#FFF',
  },
  actionBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  actionBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  actionBtnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13,
    borderWidth: 1.5, borderColor: '#A8CD55', borderRadius: 14,
  },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
