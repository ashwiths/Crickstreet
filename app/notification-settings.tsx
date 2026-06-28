import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/hooks/useAuth';
import { db } from '../src/services/firebase';
import { requestNotificationPermissions, triggerLocalNotification, checkNotificationPermissions } from '../src/services/notifications';
import { s, fs, sp, br, avatarSz, iconSz } from '../src/theme/responsive';

interface NotificationPreferences {
  scoreUpdateReminder: boolean;
  inningsBreakReminder: boolean;
  inningsStartedNotification: boolean;
  inningsBreakNotification: boolean;
  matchCompletedNotification: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  scoreUpdateReminder: true,
  inningsBreakReminder: true,
  inningsStartedNotification: true,
  inningsBreakNotification: true,
  matchCompletedNotification: true,
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid || '';
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Custom Toast State
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-50)).current;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    toastOpacity.setValue(0);
    toastTranslateY.setValue(-50);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      });
    }, 4000);
  };

  const handleTestNotification = async () => {
    // 1. Request notification permission if not already granted
    const hasPerm = await requestNotificationPermissions();
    setPermissionGranted(hasPerm);

    if (hasPerm) {
      // 2. Trigger local push notification immediately
      await triggerLocalNotification(
        'Crickstreet Test Alert',
        'Notifications are working correctly on your device.'
      );

      // 3. Show success toast
      showToast('Test notification sent successfully.', 'success');
    } else {
      // 4. If permissions are disabled
      showToast('Please enable notifications in device settings.', 'error');
    }
  };

  // Theme styling
  const theme = useMemo(() => {
    return {
      bg: isDark ? '#0A1628' : '#F3F4F1',
      bgMid: isDark ? '#0D1F3C' : '#FFFFFF',
      cardBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
      cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)',
      text: isDark ? '#FFFFFF' : '#1A1A1A',
      textSecondary: isDark ? '#8A9BA8' : '#666666',
      green: '#A8CD55',
      greenLight: isDark ? 'rgba(168,205,85,0.12)' : 'rgba(76,175,80,0.1)',
      red: isDark ? '#FF6B6B' : '#D32F2F',
      inputBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    };
  }, [isDark]);

  // Intercept unauthenticated users
  useEffect(() => {
    if (!uid && !loading) {
      Alert.alert('Authentication Required', 'Please log in to manage your notification settings.');
      router.replace('/(auth)/welcome');
    }
  }, [uid, loading, router]);

  // Load current settings from Firestore and verify system permissions
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    async function loadSettings() {
      try {
        // Query permissions
        const hasPerms = await requestNotificationPermissions();
        setPermissionGranted(hasPerms);

        // Fetch from user doc
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.notificationSettings) {
            setPreferences({
              ...DEFAULT_PREFERENCES,
              ...userData.notificationSettings,
            });
            setLoading(false);
            return;
          }
        }

        // Fallback: try separate document path subcollection users/{uid}/notificationSettings/preferences
        const backupRef = doc(db, 'users', uid, 'notificationSettings', 'preferences');
        const backupSnap = await getDoc(backupRef);
        if (backupSnap.exists()) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...backupSnap.data(),
          });
        }
      } catch (err) {
        console.error('Failed to load notification settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [uid]);

  // Handle Switch Toggles and Sync to Firestore immediately
  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!uid) return;

    const nextPreferences = {
      ...preferences,
      [key]: value,
    };

    // Update local state first for instant UX response
    setPreferences(nextPreferences);
    setSaving(true);

    try {
      // 1. Save in users/{uid} document under map field "notificationSettings"
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { notificationSettings: nextPreferences }, { merge: true });

      // 2. Save in subcollection documentusers/{uid}/notificationSettings/preferences
      const backupRef = doc(db, 'users', uid, 'notificationSettings', 'preferences');
      await setDoc(backupRef, nextPreferences, { merge: true });
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
      // Revert local state on error
      setPreferences(preferences);
      Alert.alert('Sync Error', 'Could not sync preferences with Firestore database.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestSystemPermission = async () => {
    const hasPerm = await requestNotificationPermissions();
    setPermissionGranted(hasPerm);
    if (hasPerm) {
      Alert.alert('Permission Granted 🎉', 'Local push alerts are now active for Crickstreet match updates.');
    } else {
      Alert.alert(
        'Permission Denied ⚠️',
        'Please enable notifications inside your device application settings to receive match alerts.'
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.green} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
              backgroundColor: toast.type === 'success' ? theme.green : theme.red,
            },
          ]}
        >
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color="#050A08"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}

      {isDark && (
        <LinearGradient
          colors={['#0A1628', '#0D1F3C', '#111A2E']}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.inputBg }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Notification Settings</Text>
          {saving ? (
            <ActivityIndicator size="small" color={theme.green} style={{ marginRight: 12 }} />
          ) : (
            <View style={styles.savedIndicator}>
              <Feather name="cloud-drizzle" size={14} color={theme.green} style={{ marginRight: 4 }} />
              <Text style={[styles.savedText, { color: theme.green }]}>Synced</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Permission Status Banner */}
          <View
            style={[
              styles.permissionBanner,
              {
                backgroundColor: permissionGranted ? theme.greenLight : 'rgba(234,179,8,0.12)',
                borderColor: permissionGranted ? theme.green : '#EAB308',
              },
            ]}
          >
            <Ionicons
              name={permissionGranted ? 'notifications-outline' : 'notifications-off-outline'}
              size={24}
              color={permissionGranted ? theme.green : '#EAB308'}
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.permissionTitle,
                  { color: permissionGranted ? theme.text : '#EAB308' },
                ]}
              >
                {permissionGranted ? 'System Alerts Active' : 'System Alerts Disabled'}
              </Text>

              {/* System Permission Indicator Badge */}
              <View style={styles.statusIndicatorRow}>
                <Text style={[styles.statusIndicatorText, { color: permissionGranted ? '#A8CD55' : '#FF6B6B', fontWeight: '800', fontSize: 12 }]}>
                  {permissionGranted ? '🟢 Notifications Enabled' : '🔴 Notifications Disabled'}
                </Text>
              </View>

              <Text style={[styles.permissionDesc, { color: theme.textSecondary, marginTop: 4 }]}>
                {permissionGranted
                  ? 'System-level permissions are granted. Toggles below will manage local push alert triggers.'
                  : 'Operating system permissions are currently ungranted. Tap Enable below to prompt device configuration.'}
              </Text>
              
              <View style={styles.bannerActionRow}>
                {!permissionGranted && (
                  <TouchableOpacity
                    style={[styles.enableBtn, { backgroundColor: '#EAB308', marginRight: 8 }]}
                    onPress={handleRequestSystemPermission}
                  >
                    <Text style={styles.enableBtnText}>Enable System Alerts</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.testBtn, { borderColor: theme.green, borderWidth: 1 }]}
                  onPress={handleTestNotification}
                >
                  <Text style={[styles.testBtnText, { color: theme.green, fontWeight: '700', fontSize: 11 }]}>
                    🧪 Test Notification
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Toggle Group Title */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MATCH SCORING NOTIFICATIONS</Text>

          {/* Toggles List */}
          <View style={[styles.card, { backgroundColor: theme.bgMid, borderColor: theme.cardBorder }]}>
            {/* 1. Score Update Reminder */}
            <View style={styles.toggleRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="time-outline" size={22} color={theme.green} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>Score Update Reminder</Text>
                <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>
                  If a match is live but no scoring has been entered for 1 minute, send a reminder push notification.
                </Text>
              </View>
              <Switch
                value={preferences.scoreUpdateReminder}
                onValueChange={(val) => handleToggle('scoreUpdateReminder', val)}
                trackColor={{ false: '#3E4E5B', true: theme.green }}
                thumbColor="#FFF"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

            {/* 2. Innings Break Reminder */}
            <View style={styles.toggleRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="coffee-outline" size={22} color={theme.green} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>Innings Break Reminder</Text>
                <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>
                  If an innings break starts and remains idle for 10 minutes, remind to begin the next innings.
                </Text>
              </View>
              <Switch
                value={preferences.inningsBreakReminder}
                onValueChange={(val) => handleToggle('inningsBreakReminder', val)}
                trackColor={{ false: '#3E4E5B', true: theme.green }}
                thumbColor="#FFF"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

            {/* 3. Innings Started */}
            <View style={styles.toggleRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="play-circle-outline" size={22} color={theme.green} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>Innings Started Alert</Text>
                <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>
                  Notify immediately when the very first score or run is entered in a new innings.
                </Text>
              </View>
              <Switch
                value={preferences.inningsStartedNotification}
                onValueChange={(val) => handleToggle('inningsStartedNotification', val)}
                trackColor={{ false: '#3E4E5B', true: theme.green }}
                thumbColor="#FFF"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

            {/* 4. Innings Break Alert */}
            <View style={styles.toggleRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="pause-circle-outline" size={22} color={theme.green} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>Innings Break Alerts</Text>
                <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>
                  Notify when the first innings completes and the innings break period begins.
                </Text>
              </View>
              <Switch
                value={preferences.inningsBreakNotification}
                onValueChange={(val) => handleToggle('inningsBreakNotification', val)}
                trackColor={{ false: '#3E4E5B', true: theme.green }}
                thumbColor="#FFF"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

            {/* 5. Match Completed */}
            <View style={styles.toggleRow}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="trophy-outline" size={22} color={theme.green} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>Match Completed Alert</Text>
                <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>
                  Notify instantly when the match finishes and the final results/scorecards are computed.
                </Text>
              </View>
              <Switch
                value={preferences.matchCompletedNotification}
                onValueChange={(val) => handleToggle('matchCompletedNotification', val)}
                trackColor={{ false: '#3E4E5B', true: theme.green }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.xl,
    paddingVertical: sp.md2,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: avatarSz.md,
    height: avatarSz.md,
    borderRadius: avatarSz.md / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fs.lg,
    fontWeight: '800',
    flex: 1,
    marginLeft: sp.md2,
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.xs,
    paddingHorizontal: sp.sm,
    borderRadius: br.md,
  },
  savedText: {
    fontSize: fs.sm,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: sp.xl,
    paddingBottom: s(40),
  },
  permissionBanner: {
    flexDirection: 'row',
    padding: sp.lg,
    borderRadius: br.md,
    borderWidth: 1,
    marginBottom: sp.xxl,
  },
  permissionTitle: {
    fontSize: fs.md2,
    fontWeight: '700',
    marginBottom: sp.xs,
  },
  permissionDesc: {
    fontSize: fs.base,
    lineHeight: fs.base * 1.4,
  },
  enableBtn: {
    paddingVertical: sp.xs,
    paddingHorizontal: sp.md,
    borderRadius: br.sm2,
  },
  enableBtnText: {
    color: '#000',
    fontSize: fs.sm,
    fontWeight: '700',
  },
  statusIndicatorRow: {
    marginTop: sp.xs,
    marginBottom: sp.xs,
  },
  statusIndicatorText: {
    fontSize: fs.base,
    fontWeight: '800',
  },
  bannerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp.md2,
  },
  testBtn: {
    paddingVertical: sp.xs,
    paddingHorizontal: sp.md,
    borderRadius: br.sm2,
    backgroundColor: 'transparent',
  },
  testBtnText: {
    fontSize: fs.sm,
    fontWeight: '700',
  },
  toastContainer: {
    position: 'absolute',
    top: s(50),
    left: sp.xl,
    right: sp.xl,
    paddingVertical: sp.md,
    paddingHorizontal: sp.lg,
    borderRadius: br.md2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  toastText: {
    color: '#050A08',
    fontWeight: '800',
    fontSize: fs.md,
    flex: 1,
  },
  sectionTitle: {
    fontSize: fs.sm2,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: sp.sm,
  },
  card: {
    borderRadius: br.lg,
    borderWidth: 1,
    paddingVertical: sp.sm,
    paddingHorizontal: sp.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.md3,
  },
  iconContainer: {
    marginRight: sp.md2,
    width: s(32),
    height: s(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: sp.md2,
  },
  toggleTitle: {
    fontSize: fs.md2,
    fontWeight: '700',
    marginBottom: sp.xs,
  },
  toggleDesc: {
    fontSize: fs.sm,
    lineHeight: fs.sm * 1.4,
  },
  divider: {
    height: 1,
  },
});
