  import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

import { useAuth } from '../../hooks/useAuth';
import { db, auth } from '../../services/firebase';
import { useTour, TourHighlight } from '../../hooks/useTour';
import { s, fs, sp, br, avatarSz, screen, isTablet as isTabletDevice } from '../../theme/responsive';
import FloatingBottomNav from '../../components/FloatingBottomNav';

const MODAL_WIDTH = isTabletDevice ? 420 : screen.width - sp.xxl * 2;

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
      <View style={styles.modalBackdrop}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        <Animated.View
          style={[styles.modalSheet, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        >
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
                <Image source={{ uri: photoURL }} style={styles.modalAvatar} />
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
                logo={{ uri: photoURL }}
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
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({
  visible,
  onClose,
  profileData,
  displayName,
  photoURL,
  user,
  uid,
}: {
  visible: boolean;
  onClose: () => void;
  profileData: any;
  displayName: string;
  photoURL: string;
  user: any;
  uid: string;
}) {
  const [formName, setFormName] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formRole, setFormRole] = useState<'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket Keeper'>('Batsman');
  const [formJersey, setFormJersey] = useState('');
  const [formRuns, setFormRuns] = useState('');
  const [formWickets, setFormWickets] = useState('');
  const [formMatches, setFormMatches] = useState('');
  const [formHighestScore, setFormHighestScore] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setFormName(profileData?.displayName || displayName || '');
      setFormPhoto(profileData?.photoURL || photoURL || '');
      setFormRole(profileData?.role || 'Batsman');
      setFormJersey(profileData?.jerseyNumber || '10');
      setFormRuns(String(profileData?.stats?.runs ?? '0'));
      setFormWickets(String(profileData?.stats?.wickets ?? '0'));
      setFormMatches(String(profileData?.stats?.matches ?? '0'));
      setFormHighestScore(String(profileData?.stats?.highestScore ?? '0'));
    }
  }, [visible, profileData, displayName, photoURL]);

  const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
  ];

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Validation Error', 'Player Display Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formName.trim(),
          photoURL: formPhoto.trim(),
        });
      }

      const userRef = doc(db, 'users', uid);
      await setDoc(
        userRef,
        {
          displayName: formName.trim(),
          photoURL: formPhoto.trim(),
          role: formRole,
          jerseyNumber: formJersey.trim(),
          stats: {
            runs: parseInt(formRuns, 10) || 0,
            wickets: parseInt(formWickets, 10) || 0,
            matches: parseInt(formMatches, 10) || 0,
            highestScore: parseInt(formHighestScore, 10) || 0,
          },
        },
        { merge: true }
      );

      Alert.alert('Success 🎉', 'Profile data updated successfully!');
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      Alert.alert('Save Error', 'Could not sync custom profile details.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetInitials = () => {
    const initialsUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      formName.trim() || 'Player'
    )}&background=0D1F3C&color=A8CD55&size=150&bold=true`;
    setFormPhoto(initialsUrl);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBackdrop}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        <View style={[styles.editProfileSheet, { maxHeight: '85%' }]} onStartShouldSetResponder={() => true}>
          {/* Modal Header */}
          <View style={styles.editProfileHeader}>
            <Text style={styles.editProfileTitle}>Edit Player Profile</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={18} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.editProfileForm} showsVerticalScrollIndicator={false}>
            {/* Display Name */}
            <Text style={styles.editInputLabel}>DISPLAY NAME</Text>
            <TextInput
              style={styles.editTextInput}
              placeholder="e.g. Player Name"
              value={formName}
              onChangeText={setFormName}
            />

            {/* Photo URL */}
            <Text style={styles.editInputLabel}>PHOTO URL</Text>
            <TextInput
              style={styles.editTextInput}
              placeholder="Image URL"
              value={formPhoto}
              onChangeText={setFormPhoto}
              autoCapitalize="none"
            />

            {/* Preset Avatars */}
            <Text style={styles.editInputLabelSub}>CHOOSE PRESET AVATAR</Text>
            <View style={styles.presetAvatarsRow}>
              {AVATAR_PRESETS.map((url, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setFormPhoto(url)}
                  style={[
                    styles.presetAvatarBtn,
                    formPhoto === url && styles.presetAvatarSelected,
                  ]}
                >
                  <Image source={{ uri: url }} style={styles.presetAvatarImg} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.initialsAvatarBtn} onPress={handleResetInitials}>
                <Text style={styles.initialsAvatarTxt}>Initials</Text>
              </TouchableOpacity>
            </View>

            {/* Role selector (Chips) */}
            <Text style={styles.editInputLabel}>PLAYER ROLE</Text>
            <View style={styles.chipsRow}>
              {(['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'] as const).map((r) => {
                const isSelected = formRole === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => setFormRole(r)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Jersey Number */}
            <Text style={styles.editInputLabel}>JERSEY NUMBER</Text>
            <TextInput
              style={styles.editTextInput}
              placeholder="e.g. 7"
              keyboardType="numeric"
              value={formJersey}
              onChangeText={setFormJersey}
            />

            {/* Statistics Grid */}
            <Text style={styles.editInputLabel}>CAREER STATS</Text>
            <View style={styles.statsFormGrid}>
              <View style={styles.statsFormCol}>
                <Text style={styles.editInputLabelSub}>MATCHES</Text>
                <TextInput
                  style={styles.editTextInputSmall}
                  keyboardType="numeric"
                  value={formMatches}
                  onChangeText={setFormMatches}
                />
              </View>
              <View style={styles.statsFormCol}>
                <Text style={styles.editInputLabelSub}>TOTAL RUNS</Text>
                <TextInput
                  style={styles.editTextInputSmall}
                  keyboardType="numeric"
                  value={formRuns}
                  onChangeText={setFormRuns}
                />
              </View>
            </View>

            <View style={styles.statsFormGrid}>
              <View style={styles.statsFormCol}>
                <Text style={styles.editInputLabelSub}>WICKETS</Text>
                <TextInput
                  style={styles.editTextInputSmall}
                  keyboardType="numeric"
                  value={formWickets}
                  onChangeText={setFormWickets}
                />
              </View>
              <View style={styles.statsFormCol}>
                <Text style={styles.editInputLabelSub}>HIGHEST SCORE</Text>
                <TextInput
                  style={styles.editTextInputSmall}
                  keyboardType="numeric"
                  value={formHighestScore}
                  onChangeText={setFormHighestScore}
                />
              </View>
            </View>

            {/* Action Save Button */}
            <TouchableOpacity style={styles.saveProfileBtn} onPress={handleSave} disabled={saving}>
              <LinearGradient
                colors={['#A8CD55', '#E3A85B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveProfileBtnGradient}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveProfileBtnText}>Save Profile Data</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Profile Screen ────────────────────────────────────────────────────────────

export default function ProfileScreen({ onBack }: { onBack?: () => void } = {}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { startTour } = useTour();
  const insets = useSafeAreaInsets();
  
  const [qrVisible, setQrVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const displayName = profileData?.displayName || user?.displayName || 'Player';
  const email = user?.email || '';
  const photoURL = profileData?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D1F3C&color=A8CD55&size=150&bold=true`;
  const uid = user?.uid || '';

  // Live profile data sync
  useEffect(() => {
    if (!user?.uid) return;
    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfileData(docSnap.data());
      }
    }, (error) => {
      console.error('Error fetching profile from Firestore:', error);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out my Crickstreet player profile! 🏏\nhttps://crickstreet-890e7.web.app/player?id=${uid}`,
        title: `${displayName}'s Cricket Profile`,
      });
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.4, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { height: Math.max(300, 300 + insets.top) }]}
      />

      <View style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}>
          <TouchableOpacity style={styles.iconButton} onPress={onBack || (() => router.back())}>
            <Feather name="arrow-left" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.iconButton} onPress={handleShareProfile}>
            <Feather name="share-2" size={20} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]} 
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile Card ── */}
          <View style={styles.profileCard}>
            <Image source={{ uri: photoURL }} style={styles.avatar} />
            <View style={styles.profileInfo}>
              <Text style={styles.nameText}>{displayName}</Text>
              <Text style={styles.emailText}>{email}</Text>
              {profileData?.role && (
                <View style={styles.roleTagContainer}>
                  <Text style={styles.roleTagText}>
                    🏏 {profileData.role} {profileData.jerseyNumber ? `• #${profileData.jerseyNumber}` : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Edit button */}
            <TouchableOpacity onPress={() => setEditVisible(true)}>
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
            <MenuItem icon="users" label="My Players" onPress={() => router.push('/my-players')} />
            <View style={styles.divider} />
            <MenuItem icon="user" label="My Teams" onPress={() => router.push('/my-teams')} />
            <View style={styles.divider} />
            <MenuItem icon="map-pin" label="My Ground" onPress={() => router.push('/my-grounds')} />
            <View style={styles.divider} />
            <TourHighlight id="notification-menu">
              <MenuItem icon="heart" label="Notification" onPress={() => router.push('/notification-settings' as any)} />
            </TourHighlight>
            <View style={styles.divider} />
            <MenuItem icon="file-text" label="Learn To Use" onPress={startTour} />
            <View style={styles.divider} />
            <MenuItem icon="info" label="Help & Support" onPress={() => router.push('/support')} />
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
      </View>
      {/* ── QR Modal ── */}
      <QRModal
        visible={qrVisible}
        onClose={() => setQrVisible(false)}
        displayName={displayName}
        photoURL={photoURL}
        uid={uid}
      />

      {/* ── Edit Profile Modal ── */}
      <EditProfileModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        profileData={profileData}
        displayName={displayName}
        photoURL={photoURL}
        user={user}
        uid={uid}
      />
      {!onBack && <FloatingBottomNav activeTab="profile" />}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F1' },
  headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: s(300) },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: sp.xl, paddingTop: sp.md2, paddingBottom: sp.xxl,
  },
  iconButton: {
    width: avatarSz.md2, height: avatarSz.md2, borderRadius: avatarSz.md2 / 2,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  headerTitle: { fontSize: fs.xl2, fontWeight: '700', color: '#1A1A1A' },
  scrollContent: { paddingHorizontal: sp.xl, paddingBottom: 120 },

  // Profile card
  profileCard: {
    backgroundColor: '#FFF', borderRadius: br.xxl, padding: sp.lg,
    flexDirection: 'row', alignItems: 'center', marginBottom: sp.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  avatar: { width: avatarSz.xl2, height: avatarSz.xl2, borderRadius: avatarSz.xl2 / 2, marginRight: sp.lg, backgroundColor: '#E0E0E0' },
  profileInfo: { flex: 1 },
  nameText: { fontSize: fs.xl, fontWeight: '700', color: '#1A1A1A', marginBottom: sp.xs },
  emailText: { fontSize: fs.md2, color: '#8A8A8A' },
  actionCircle: { width: avatarSz.md, height: avatarSz.md, borderRadius: avatarSz.md / 2, alignItems: 'center', justifyContent: 'center' },

  // Player ID chip
  playerIdChip: { borderRadius: br.md3, overflow: 'hidden', marginBottom: sp.xl },
  playerIdGradient: {
    flexDirection: 'row', alignItems: 'center', gap: sp.sm,
    paddingHorizontal: sp.md3, paddingVertical: sp.md2,
    borderRadius: br.md3, borderWidth: 1, borderColor: 'rgba(168,205,85,0.35)',
  },
  playerIdText: { color: '#2D5016', fontSize: fs.md, fontWeight: '600' },

  // Menu
  menuContainer: {
    backgroundColor: '#FFF', borderRadius: br.xxl, paddingVertical: sp.sm,
    marginBottom: sp.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: sp.md, paddingHorizontal: sp.lg },
  menuIconContainer: {
    width: avatarSz.md2, height: avatarSz.md2, borderRadius: avatarSz.md2 / 2,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginRight: sp.lg,
  },
  menuLabel: { flex: 1, fontSize: fs.lg, fontWeight: '500', color: '#1A1A1A' },
  menuChevron: { marginLeft: sp.sm },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: s(76), marginRight: sp.lg },
  newBadge: {
    backgroundColor: '#A8CD55', borderRadius: br.sm, paddingHorizontal: sp.sm2, paddingVertical: sp.px2, marginRight: sp.sm2,
  },
  newBadgeText: { color: '#FFF', fontSize: fs.xxs, fontWeight: '800', letterSpacing: 0.5 },

  // Logout
  logoutContainer: {
    backgroundColor: '#FFF', borderRadius: br.xxl, paddingVertical: sp.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  bottomSpacer: { height: sp.h },

  // ── QR Modal ──
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalSheet: {
    width: MODAL_WIDTH, borderRadius: s(28),
    backgroundColor: '#FFF', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35, shadowRadius: 30, elevation: 20,
  },
  modalHeaderGradient: {
    alignItems: 'center', paddingTop: s(36), paddingBottom: sp.xxl, overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute', top: -s(50), right: -s(50),
    width: s(160), height: s(160), borderRadius: s(80),
    backgroundColor: 'rgba(168,205,85,0.1)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -s(30), left: -s(30),
    width: s(120), height: s(120), borderRadius: s(60),
    backgroundColor: 'rgba(227,168,91,0.08)',
  },
  closeBtn: {
    position: 'absolute', top: sp.md3, right: sp.md3,
    width: s(32), height: s(32), borderRadius: s(16),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalAvatarRingOuter: { marginBottom: sp.md },
  modalAvatarRing: { width: avatarSz.h, height: avatarSz.h, borderRadius: avatarSz.h / 2, padding: sp.px2 },
  modalAvatar: { width: s(74), height: s(74), borderRadius: s(37), backgroundColor: '#1A2332' },
  modalName: { color: '#FFF', fontSize: fs.xl2, fontWeight: '800', marginBottom: sp.xs },
  modalPlayerId: { color: 'rgba(255,255,255,0.6)', fontSize: fs.base },

  // QR
  qrSection: { alignItems: 'center', paddingVertical: sp.xxl, backgroundColor: '#FFF' },
  qrWrapper: {
    padding: sp.lg, borderRadius: br.xl,
    backgroundColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  qrHint: { marginTop: sp.md3, color: '#8A8A8A', fontSize: fs.base },

  // Action buttons
  modalActions: {
    flexDirection: 'row', gap: sp.md,
    paddingHorizontal: sp.xl, paddingTop: sp.xs, paddingBottom: sp.xxl,
    backgroundColor: '#FFF',
  },
  actionBtn: { flex: 1, borderRadius: br.md3, overflow: 'hidden' },
  actionBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: sp.sm, paddingVertical: sp.md3,
  },
  actionBtnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: sp.sm, paddingVertical: sp.md,
    borderWidth: 1.5, borderColor: '#A8CD55', borderRadius: br.md3,
  },
  actionBtnText: { color: '#FFF', fontSize: fs.md2, fontWeight: '700' },

  // Edit Profile styles
  editProfileSheet: {
    width: MODAL_WIDTH,
    borderRadius: s(28),
    backgroundColor: '#FFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
    padding: sp.xl,
  },
  editProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: sp.lg,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: sp.lg,
  },
  editProfileTitle: {
    fontSize: fs.xl,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  editProfileForm: {
    paddingBottom: sp.xxl,
  },
  editInputLabel: {
    fontSize: fs.sm2,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 0.8,
    marginBottom: sp.sm,
    marginTop: sp.md,
  },
  editInputLabelSub: {
    fontSize: fs.xxs,
    fontWeight: '700',
    color: '#A2A2A2',
    letterSpacing: 0.5,
    marginBottom: sp.sm2,
  },
  editTextInput: {
    height: avatarSz.md2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: br.md,
    paddingHorizontal: sp.md,
    fontSize: fs.md2,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  editTextInputSmall: {
    height: avatarSz.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: br.md2,
    paddingHorizontal: sp.md2,
    fontSize: fs.md,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  presetAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    marginBottom: sp.md3,
    marginTop: sp.xs,
  },
  presetAvatarBtn: {
    width: s(38),
    height: s(38),
    borderRadius: s(19),
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  presetAvatarSelected: {
    borderColor: '#A8CD55',
  },
  presetAvatarImg: {
    width: '100%',
    height: '100%',
  },
  initialsAvatarBtn: {
    paddingHorizontal: sp.md2,
    paddingVertical: sp.sm2,
    borderRadius: br.md2,
    backgroundColor: '#F0F4EC',
    borderWidth: 1,
    borderColor: 'rgba(168,205,85,0.3)',
  },
  initialsAvatarTxt: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: '#2D5016',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.sm,
    marginBottom: sp.md2,
  },
  chip: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: br.xl,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipSelected: {
    backgroundColor: '#F0F4EC',
    borderColor: '#A8CD55',
  },
  chipText: {
    fontSize: fs.base,
    color: '#666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#2D5016',
    fontWeight: '700',
  },
  statsFormGrid: {
    flexDirection: 'row',
    gap: sp.md,
    marginBottom: sp.md2,
  },
  statsFormCol: {
    flex: 1,
  },
  saveProfileBtn: {
    borderRadius: br.full,
    overflow: 'hidden',
    marginTop: sp.xl,
  },
  saveProfileBtnGradient: {
    paddingVertical: sp.md3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveProfileBtnText: {
    color: '#FFF',
    fontSize: fs.md2,
    fontWeight: '800',
  },
  roleTagContainer: {
    marginTop: sp.sm2,
    alignSelf: 'flex-start',
    backgroundColor: '#F0F4EC',
    paddingHorizontal: sp.sm,
    paddingVertical: sp.px2,
    borderRadius: br.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(168,205,85,0.3)',
  },
  roleTagText: {
    fontSize: fs.sm2,
    fontWeight: '800',
    color: '#2D5016',
  },
});
