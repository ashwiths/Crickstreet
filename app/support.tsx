import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  query,
  onSnapshot,
  where,
  orderBy,
  getDoc,
} from 'firebase/firestore';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/hooks/useAuth';
import { db } from '../src/services/firebase';
import { s, fs, sp, br, avatarSz, iconSz } from '../src/theme/responsive';

const getSupportApiUrl = (path: string) => {
  if (process.env.EXPO_PUBLIC_SUPPORT_API_URL) {
    const baseUrl = process.env.EXPO_PUBLIC_SUPPORT_API_URL.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }
  const cleanPath = path === '/send-support-ticket' ? '/api/support/send' : path;
  if (Platform.OS === 'web') return cleanPath;

  const debuggerHost = Constants.expoConfig?.hostUri;
  if (!debuggerHost) {
    return `http://localhost:8081${cleanPath}`;
  }
  return `http://${debuggerHost}${cleanPath}`;
};




// ── Types ────────────────────────────────────────────────────────────────────
interface SupportTicket {
  id: string;
  ticketId?: string;
  ticketRef: string;
  userId: string;
  userName: string;
  userEmail: string;
  category?: string;
  complaintType: string;
  subject: string;
  message?: string;
  description: string;
  screenshotUrl: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  emailStatus?: 'pending' | 'sent' | 'failed';
  createdAt: string;
  adminComment?: string;
  adminCommentedAt?: string;
}

// ── Skeleton Loader Card ─────────────────────────────────────────────────────
function SkeletonTicketCard({ isDark }: { isDark: boolean }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const bg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <Animated.View style={[styles.skeletonCard, { opacity: pulseAnim, backgroundColor: bg }]} />
  );
}

// ── Main Screen Component ────────────────────────────────────────────────────
export default function SupportCenterScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid || '';
  const userEmail = user?.email || '';
  const userName = user?.displayName || 'Crickstreet User';
  const systemScheme = useColorScheme();

  // Navigation and view tabs
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [userSubTab, setUserSubTab] = useState<'submit' | 'history'>('submit');

  // Loaders
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Lists
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [adminTickets, setAdminTickets] = useState<SupportTicket[]>([]);

  // Submission Form States
  const [complaintType, setComplaintType] = useState<string>('Bug Report');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');

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

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!loading && !uid) {
      Alert.alert('Authentication Required', 'Please log in to access the Support Center.');
      router.replace('/(auth)/welcome');
    }
  }, [loading, uid]);

  // Ticket Detail Modal States
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [adminStatus, setAdminStatus] = useState<'Open' | 'In Progress' | 'Resolved' | 'Closed'>('Open');

  // Theme support - unified to signature Crickstreet Home theme
  const theme = useMemo(() => {
    return {
      bg: '#F3F4F1',
      bgMid: '#FFFFFF',
      cardBg: '#FFFFFF',
      cardBorder: '#E8E4D4',
      text: '#1A1A1A',
      textSecondary: '#64748B',
      green: '#A8CD55',
      greenText: '#2D5016',
      greenLight: '#F0FDF4',
      red: '#EF4444',
      redLight: '#FEF2F2',
      inputBg: '#FAFAFA',
      inputBorder: '#CBD5E1',
      gold: '#D97706',
      blue: '#2563EB',
    };
  }, []);

  // 1. Sync User Role (Check Admin rights)
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsAdmin(data.isAdmin === true || data.role === 'admin');
      }
      setLoading(false);
    }, (err) => {
      console.warn('Firestore role check skipped:', err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  // 2. Sync User Tickets in Real-Time
  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, 'supportTickets'),
      where('userId', '==', uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: SupportTicket[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          userId: data.userId || '',
          userName: data.userName || '',
          userEmail: data.userEmail || '',
          complaintType: data.complaintType || 'Other',
          subject: data.subject || '',
          description: data.description || '',
          screenshotUrl: data.screenshotUrl || '',
          status: data.status || 'Open',
          createdAt: data.createdAt || new Date().toISOString(),
          ticketRef: data.ticketRef || '',
          adminComment: data.adminComment || '',
          adminCommentedAt: data.adminCommentedAt || '',
        });
      });
      // Sort client side by date descending to ensure chronological listing
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserTickets(fetched);
    }, (err) => {
      console.warn('Firestore user support tickets sync skipped:', err.message);
    });

    return () => unsubscribe();
  }, [uid]);

  // 3. Sync Admin Dashboard Console Tickets (Admins only)
  useEffect(() => {
    if (!uid || !isAdmin) return;

    const q = query(collection(db, 'supportTickets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: SupportTicket[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          userId: data.userId || '',
          userName: data.userName || '',
          userEmail: data.userEmail || '',
          complaintType: data.complaintType || 'Other',
          subject: data.subject || '',
          description: data.description || '',
          screenshotUrl: data.screenshotUrl || '',
          status: data.status || 'Open',
          createdAt: data.createdAt || new Date().toISOString(),
          ticketRef: data.ticketRef || '',
          adminComment: data.adminComment || '',
          adminCommentedAt: data.adminCommentedAt || '',
        });
      });
      // Sort all tickets chronologically desc
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAdminTickets(fetched);
    }, (err) => {
      console.warn('Firestore admin support tickets sync skipped:', err.message);
    });

    return () => unsubscribe();
  }, [uid, isAdmin]);

  // 4. Real-Time modified Alert Notifications (only for regular user tickets update)
  useEffect(() => {
    if (!uid || activeTab === 'admin') return;

    const q = query(
      collection(db, 'supportTickets'),
      where('userId', '==', uid)
    );

    let isInitial = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitial) {
        isInitial = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const ticketData = change.doc.data();
          const ref = ticketData.ticketRef || 'CRK-TICKET';
          const status = ticketData.status || 'Open';

          Alert.alert(
            'Ticket Update 🔔',
            `Your ticket #${ref} has been marked as ${status}.`
          );
        }
      });
    }, (err) => {
      console.warn('Firestore ticket alerts sync skipped:', err.message);
    });

    return () => unsubscribe();
  }, [uid, activeTab]);

  const handlePickScreenshot = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo gallery to attach a screenshot.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setScreenshotUrl(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          setScreenshotUrl(asset.uri);
        }
      }
    } catch (err) {
      console.error('Error picking screenshot:', err);
    }
  };

  // 5. Submit Support Ticket Form via Firestore + Serverless Resend Pipeline
  const handleSubmitTicket = async () => {
    if (!uid) {
      showToast('Authentication required.', 'error');
      return;
    }
    if (!subject.trim()) {
      showToast('Please enter a ticket subject.', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Please write a message description.', 'error');
      return;
    }

    setSubmitting(true);

    const ticketRef = 'SUP-' + Math.floor(1000 + Math.random() * 9000);
    const createdAt = new Date().toISOString();

    const payload = {
      userId: uid,
      userName: userName || 'Crickstreet User',
      userEmail: userEmail || 'no-email@crickstreet.com',
      category: complaintType,
      complaintType: complaintType,
      subject: subject.trim(),
      message: description.trim(),
      description: description.trim(),
      screenshotUrl: screenshotUrl.trim(),
      status: 'Open' as const,
      emailStatus: 'pending' as const,
      createdAt,
      ticketRef,
      ticketId: ticketRef,
    };

    let docRef: any = null;

    // 1. Save to Firestore First (Guarantees zero data loss even if network or email service blips)
    try {
      docRef = await addDoc(collection(db, 'supportTickets'), payload);
    } catch (firestoreErr: any) {
      console.error('Firestore ticket creation failed:', firestoreErr);
      showToast('Failed to save ticket to database. Please try again.', 'error');
      setSubmitting(false);
      return;
    }

    // 2. Dispatch Email via Secure Serverless Resend API
    try {
      console.log('[Support] Dispatching ticket email via serverless endpoint...');
      const response = await fetch(getSupportApiUrl('/send-support-ticket'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('[Support] Serverless response:', data);

      if (docRef?.id && data.success) {
        await setDoc(doc(db, 'supportTickets', docRef.id), { emailStatus: 'sent' }, { merge: true });
      }

      if (data.warning) {
        showToast(`Ticket #${ticketRef} submitted successfully! 🎟️`, 'success');
      } else {
        showToast(`Ticket #${ticketRef} submitted successfully! 🎟️`, 'success');
      }
    } catch (apiErr: any) {
      console.warn('[Support] Serverless email dispatch warning:', apiErr.message);
      if (docRef?.id) {
        try {
          await setDoc(doc(db, 'supportTickets', docRef.id), { emailStatus: 'failed' }, { merge: true });
        } catch (_) {}
      }
      // Confirms ticket is safely in user's history
      showToast(`Ticket #${ticketRef} created in your history! 🎟️`, 'success');
    } finally {
      // Clear the form
      setSubject('');
      setDescription('');
      setScreenshotUrl('');
      setComplaintType('Bug Report');
      setSubmitting(false);
    }
  };

  // 6. Admin Actions (Status Updates & Comments Posting)
  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    setUpdating(true);
    const docRef = doc(db, 'supportTickets', selectedTicket.id);

    const updates: any = {
      status: adminStatus,
    };

    if (replyText.trim()) {
      updates.adminComment = replyText.trim();
      updates.adminCommentedAt = new Date().toISOString();
    }

    try {
      await setDoc(docRef, updates, { merge: true });
      Alert.alert('Success', 'Support ticket updated successfully.');
      
      // Sync local modal state immediately
      setSelectedTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: adminStatus,
          adminComment: replyText.trim() || prev.adminComment,
          adminCommentedAt: replyText.trim() ? new Date().toISOString() : prev.adminCommentedAt,
        };
      });

      setReplyText('');
    } catch (err) {
      console.error('Admin update ticket error:', err);
      Alert.alert('Error', 'Could not update support ticket.');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAsResolved = async () => {
    if (!selectedTicket) return;
    setUpdating(true);
    const docRef = doc(db, 'supportTickets', selectedTicket.id);

    try {
      await setDoc(docRef, { status: 'Resolved' }, { merge: true });
      setAdminStatus('Resolved');
      setSelectedTicket((prev) => {
        if (!prev) return null;
        return { ...prev, status: 'Resolved' };
      });
      Alert.alert('Resolved', 'Ticket marked as Resolved.');
    } catch (err) {
      console.error('Admin resolve ticket error:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Helper for status badge color
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'Open':
        return { color: theme.gold, bg: 'rgba(227,168,91,0.12)', label: 'Open' };
      case 'In Progress':
        return { color: theme.blue, bg: 'rgba(84,168,255,0.12)', label: 'In Progress' };
      case 'Resolved':
        return { color: theme.greenText, bg: theme.greenLight, label: 'Resolved' };
      case 'Closed':
      default:
        return { color: theme.textSecondary, bg: theme.inputBg, label: 'Closed' };
    }
  };

  // Helper for complaint type icons
  const getComplaintIcon = (type: string) => {
    switch (type) {
      case 'Bug Report':
        return 'bug-outline';
      case 'Feature Request':
        return 'bulb-outline';
      case 'Payment Issue':
        return 'card-outline';
      case 'Match Issue':
        return 'trophy-outline';
      case 'Team Issue':
        return 'people-outline';
      case 'Ground Issue':
        return 'map-outline';
      case 'Other':
      default:
        return 'chatbox-ellipses-outline';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F3F4F1' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Signature Top Header Gradient matching HomeScreen */}
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.35, 0.7]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />

      {toast.visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
              backgroundColor: toast.type === 'success' ? '#2D5016' : theme.red,
            },
          ]}
        >
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.toastText, { color: '#FFFFFF' }]}>{toast.message}</Text>
        </Animated.View>
      )}

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#1A1A1A' }]}>Support Center</Text>
          <View style={{ width: 38 }} />
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.greenText} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Top Admin / User Switcher Tab Bar (only visible for administrators) */}
            {isAdmin && (
              <View style={[styles.topTabBar, { borderColor: theme.cardBorder }]}>
                <TouchableOpacity
                  style={[styles.topTabBtn, activeTab === 'user' && { borderBottomColor: theme.green }]}
                  onPress={() => setActiveTab('user')}
                >
                  <Text style={[styles.topTabTxt, { color: activeTab === 'user' ? theme.text : theme.textSecondary }]}>
                    User Workspace
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.topTabBtn, activeTab === 'admin' && { borderBottomColor: theme.green }]}
                  onPress={() => setActiveTab('admin')}
                >
                  <View style={styles.row}>
                    <Text style={[styles.topTabTxt, { color: activeTab === 'admin' ? theme.text : theme.textSecondary, marginRight: 6 }]}>
                      Admin Console
                    </Text>
                    {adminTickets.filter((t) => t.status === 'Open').length > 0 && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeTxt}>
                          {adminTickets.filter((t) => t.status === 'Open').length}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* ── USER PANEL ── */}
            {activeTab === 'user' && (
              <View style={{ flex: 1 }}>
                {/* Submit / History Tab bar */}
                <View style={styles.subTabBar}>
                  <TouchableOpacity
                    style={[styles.subTabBtn, userSubTab === 'submit' && { backgroundColor: theme.greenLight }]}
                    onPress={() => setUserSubTab('submit')}
                  >
                    <Ionicons name="create-outline" size={16} color={userSubTab === 'submit' ? theme.greenText : theme.textSecondary} />
                    <Text style={[styles.subTabTxt, { color: userSubTab === 'submit' ? theme.text : theme.textSecondary }]}>
                      Submit Ticket
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.subTabBtn, userSubTab === 'history' && { backgroundColor: theme.greenLight }]}
                    onPress={() => setUserSubTab('history')}
                  >
                    <Ionicons name="receipt-outline" size={16} color={userSubTab === 'history' ? theme.greenText : theme.textSecondary} />
                    <Text style={[styles.subTabTxt, { color: userSubTab === 'history' ? theme.text : theme.textSecondary }]}>
                      My History ({userTickets.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Sub Tab Contents */}
                {userSubTab === 'submit' ? (
                  /* Form Submission */
                  <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={[styles.formCard, { backgroundColor: theme.bgMid, borderColor: theme.cardBorder }]}>
                      <Text style={[styles.formTitle, { color: theme.text }]}>File a Complaint / Request</Text>

                      {/* Complaint Type Select */}
                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>COMPLAINT TYPE</Text>
                      <View style={styles.typeSelectorContainer}>
                        {(['Bug Report', 'Feature Request', 'Payment Issue', 'Match Issue', 'Team Issue', 'Ground Issue', 'Other'] as const).map((type) => {
                          const isSelected = complaintType === type;
                          return (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.typeChip,
                                { borderColor: theme.inputBorder, backgroundColor: theme.inputBg },
                                isSelected && { borderColor: theme.green, backgroundColor: theme.greenLight },
                              ]}
                              onPress={() => setComplaintType(type)}
                            >
                              <Text style={[styles.typeChipText, { color: isSelected ? theme.greenText : theme.text }]}>
                                {type}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Subject */}
                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>SUBJECT</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                        placeholder="Brief title of the issue"
                        placeholderTextColor="#64748B"
                        value={subject}
                        onChangeText={setSubject}
                      />

                      {/* Message */}
                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>MESSAGE</Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          styles.textAreaInput,
                          { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
                        ]}
                        placeholder="Write your support message details, query, or steps to reproduce..."
                        placeholderTextColor="#64748B"
                        multiline
                        numberOfLines={5}
                        value={description}
                        onChangeText={setDescription}
                      />

                      {/* Screenshot */}
                      <View style={styles.rowBetween}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>SCREENSHOT (OPTIONAL)</Text>
                        <TouchableOpacity onPress={handlePickScreenshot} style={styles.attachBtn} activeOpacity={0.7}>
                          <Feather name="paperclip" size={13} color="#2D5016" style={{ marginRight: 4 }} />
                          <Text style={styles.attachBtnTxt}>Attach from Gallery</Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                        placeholder="Paste image link or tap attach above"
                        placeholderTextColor="#64748B"
                        autoCapitalize="none"
                        value={screenshotUrl.startsWith('data:image') ? '[Attached Image from Device]' : screenshotUrl}
                        onChangeText={(text) => {
                          if (text !== '[Attached Image from Device]') {
                            setScreenshotUrl(text);
                          }
                        }}
                      />

                      {screenshotUrl.trim().length > 0 && (
                        <View style={styles.imagePreviewContainer}>
                          <View style={styles.rowBetween}>
                            <Text style={[styles.imagePreviewLabel, { color: theme.textSecondary }]}>Screenshot Preview:</Text>
                            <TouchableOpacity onPress={() => setScreenshotUrl('')}>
                              <Text style={styles.removeImgTxt}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                          <Image source={{ uri: screenshotUrl }} style={styles.imagePreview} resizeMode="contain" />
                        </View>
                      )}

                      {/* Submit CTA */}
                      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitTicket} disabled={submitting}>
                        <LinearGradient
                          colors={['#A8CD55', '#E3A85B']}
                          style={styles.btnGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          {submitting ? (
                            <ActivityIndicator size="small" color="#1A1A1A" />
                          ) : (
                            <Text style={styles.btnText}>Submit Support Ticket</Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                ) : (
                  /* History Listing */
                  <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {userTickets.length === 0 ? (
                      <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="ticket-outline" size={54} color={theme.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Ticket History</Text>
                        <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                          You haven&apos;t filed any complaints or requests. If you run into matches, payments, or grounds issues, submit a ticket above.
                        </Text>
                      </View>
                    ) : (
                      userTickets.map((ticket) => {
                        const status = getStatusDetails(ticket.status);
                        return (
                          <TouchableOpacity
                            key={ticket.id}
                            style={[styles.ticketCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                            onPress={() => {
                              setSelectedTicket(ticket);
                              setAdminStatus(ticket.status);
                              setDetailModalVisible(true);
                            }}
                          >
                            <View style={styles.ticketHeader}>
                              <View style={styles.row}>
                                <Ionicons name={getComplaintIcon(ticket.complaintType) as any} size={18} color={theme.greenText} style={{ marginRight: 6 }} />
                                <Text style={[styles.ticketRef, { color: theme.textSecondary }]}>#{ticket.ticketRef}</Text>
                              </View>
                              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                <Text style={[styles.statusBadgeTxt, { color: status.color }]}>{status.label}</Text>
                              </View>
                            </View>
                            <Text style={[styles.ticketSubject, { color: theme.text }]} numberOfLines={1}>
                              {ticket.subject}
                            </Text>
                            <View style={styles.ticketFooter}>
                              <Text style={[styles.ticketDate, { color: theme.textSecondary }]}>
                                {new Date(ticket.createdAt).toLocaleDateString()} {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                              <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                )}
              </View>
            )}

            {/* ── ADMIN PANEL ── */}
            {activeTab === 'admin' && (
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {adminTickets.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="dashboard-customize" size={54} color={theme.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No Admin Tickets</Text>
                    <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                      All support tickets have been resolved. Check back later.
                    </Text>
                  </View>
                ) : (
                  adminTickets.map((ticket) => {
                    const status = getStatusDetails(ticket.status);
                    return (
                      <TouchableOpacity
                        key={ticket.id}
                        style={[styles.ticketCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                        onPress={() => {
                          setSelectedTicket(ticket);
                          setAdminStatus(ticket.status);
                          setDetailModalVisible(true);
                        }}
                      >
                        <View style={styles.ticketHeader}>
                          <View style={styles.row}>
                            <Text style={[styles.ticketRef, { color: theme.textSecondary, fontWeight: '800' }]}>#{ticket.ticketRef}</Text>
                            <Text style={[styles.ticketUserLabel, { color: theme.textSecondary }]}>• By: {ticket.userName}</Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                            <Text style={[styles.statusBadgeTxt, { color: status.color }]}>{status.label}</Text>
                          </View>
                        </View>
                        <Text style={[styles.ticketSubject, { color: theme.text }]} numberOfLines={1}>
                          {ticket.subject}
                        </Text>
                        <Text style={[styles.ticketTypeBadge, { color: theme.greenText }]}>
                          Category: {ticket.complaintType}
                        </Text>
                        <View style={styles.ticketFooter}>
                          <Text style={[styles.ticketDate, { color: theme.textSecondary }]}>
                            {new Date(ticket.createdAt).toLocaleDateString()} {ticket.userEmail}
                          </Text>
                          <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        )}
      </SafeAreaView>

      {/* ── TICKET DETAIL MODAL (Common for Users & Admins) ── */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDetailModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.bgMid, borderColor: theme.cardBorder }]} onStartShouldSetResponder={() => true}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
              <View style={styles.row}>
                <Ionicons
                  name={selectedTicket ? (getComplaintIcon(selectedTicket.complaintType) as any) : 'chatbox-outline'}
                  size={20}
                  color={theme.greenText}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedTicket ? `Ticket #${selectedTicket.ticketRef}` : 'Ticket Details'}
                </Text>
              </View>
              <TouchableOpacity style={[styles.closeModalBtn, { backgroundColor: theme.inputBg }]} onPress={() => setDetailModalVisible(false)}>
                <Feather name="x" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            {selectedTicket && (
              <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                {/* Meta details */}
                <View style={styles.metaRow}>
                  <View>
                    <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>CATEGORY</Text>
                    <Text style={[styles.metaVal, { color: theme.text }]}>{selectedTicket.complaintType}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>STATUS</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusDetails(selectedTicket.status).bg, marginTop: 4 }]}>
                      <Text style={[styles.statusBadgeTxt, { color: getStatusDetails(selectedTicket.status).color }]}>
                        {selectedTicket.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.metaDivider} />

                {/* Sub details */}
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>SUBJECT</Text>
                <Text style={[styles.detailSubject, { color: theme.text }]}>{selectedTicket.subject}</Text>

                <Text style={[styles.detailLabel, { color: theme.textSecondary, marginTop: 12 }]}>DESCRIPTION</Text>
                <Text style={[styles.detailDesc, { color: theme.text }]}>{selectedTicket.description}</Text>

                {/* Optional Screenshot */}
                {selectedTicket.screenshotUrl ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary, marginBottom: 8 }]}>SCREENSHOT</Text>
                    <Image source={{ uri: selectedTicket.screenshotUrl }} style={styles.detailImage} resizeMode="contain" />
                  </View>
                ) : null}

                {/* Client / Admin Comment Log */}
                <View style={styles.metaDivider} />
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>ADMIN RESPONSE</Text>
                {selectedTicket.adminComment ? (
                  <View style={[styles.commentBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                    <Text style={[styles.commentText, { color: theme.text }]}>{selectedTicket.adminComment}</Text>
                    <Text style={[styles.commentTime, { color: theme.textSecondary }]}>
                      Replied on: {new Date(selectedTicket.adminCommentedAt || '').toLocaleDateString()}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.noCommentTxt, { color: theme.textSecondary }]}>
                    No comments from administrators yet.
                  </Text>
                )}

                {/* ADMIN ONLY CONTROLS */}
                {isAdmin && activeTab === 'admin' && (
                  <View style={[styles.adminControlsContainer, { borderTopColor: theme.cardBorder }]}>
                    <Text style={[styles.adminControlsTitle, { color: theme.text }]}>Admin Console Panel</Text>

                    {/* Status selection dropdown */}
                    <Text style={[styles.adminInputLabel, { color: theme.textSecondary }]}>UPDATE STATUS</Text>
                    <View style={styles.statusChipsContainer}>
                      {(['Open', 'In Progress', 'Resolved', 'Closed'] as const).map((status) => {
                        const isSelected = adminStatus === status;
                        return (
                          <TouchableOpacity
                            key={status}
                            style={[
                              styles.statusChip,
                              { borderColor: theme.inputBorder, backgroundColor: theme.inputBg },
                              isSelected && { borderColor: theme.green, backgroundColor: theme.greenLight },
                            ]}
                            onPress={() => setAdminStatus(status)}
                          >
                            <Text style={[styles.statusChipText, { color: isSelected ? theme.greenText : theme.text }]}>
                              {status}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Quick Resolve Button */}
                    {selectedTicket.status !== 'Resolved' && (
                      <TouchableOpacity style={[styles.resolveBtn, { borderColor: theme.green }]} onPress={handleMarkAsResolved} disabled={updating}>
                        <Ionicons name="checkmark-circle-outline" size={18} color={theme.greenText} />
                        <Text style={[styles.resolveBtnTxt, { color: theme.greenText }]}>Quick Mark as Resolved</Text>
                      </TouchableOpacity>
                    )}

                    {/* Text Reply */}
                    <Text style={[styles.adminInputLabel, { color: theme.textSecondary, marginTop: 12 }]}>ADD REPLY / NOTES</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        styles.adminReplyInput,
                        { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
                      ]}
                      placeholder="Write response to user..."
                      placeholderTextColor="#64748B"
                      multiline
                      value={replyText}
                      onChangeText={setReplyText}
                    />

                    {/* Submit changes */}
                    <TouchableOpacity style={styles.saveAdminBtn} onPress={handleUpdateTicket} disabled={updating}>
                      <LinearGradient
                        colors={['#A8CD55', '#E3A85B']}
                        style={styles.btnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {updating ? (
                          <ActivityIndicator size="small" color="#1A1A1A" />
                        ) : (
                          <Text style={styles.btnText}>Apply Admin Updates</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F1',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingTop: sp.sm,
    paddingBottom: sp.md,
  },
  backBtn: {
    width: s(38),
    height: s(38),
    borderRadius: s(19),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  headerTitle: {
    fontSize: fs.lg,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Tabs
  topTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: sp.lg,
    marginBottom: sp.sm,
  },
  topTabBtn: {
    flex: 1,
    paddingVertical: sp.md3,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topTabTxt: {
    fontSize: fs.md,
    fontWeight: '800',
  },
  adminBadge: {
    backgroundColor: '#FF4D4D',
    borderRadius: br.sm2,
    paddingHorizontal: sp.sm2,
    paddingVertical: sp.px2,
  },
  adminBadgeTxt: {
    color: '#FFF',
    fontSize: fs.xxs,
    fontWeight: '900',
  },

  subTabBar: {
    flexDirection: 'row',
    paddingHorizontal: sp.lg,
    gap: sp.sm,
    marginVertical: sp.md,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp.md2,
    borderRadius: br.full,
    gap: sp.sm2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4D4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  subTabTxt: {
    fontSize: fs.sm,
    fontWeight: '800',
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: sp.lg,
    paddingBottom: s(40),
  },

  // Form Submission Layout
  formCard: {
    padding: sp.lg,
    borderRadius: br.xl,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E4D4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  formTitle: {
    fontSize: fs.md2,
    fontWeight: '900',
    marginBottom: sp.lg,
  },
  inputLabel: {
    fontSize: fs.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: sp.sm,
    marginTop: sp.md,
  },
  textInput: {
    height: s(48),
    borderWidth: 1.5,
    borderRadius: br.md,
    paddingHorizontal: sp.md3,
    fontSize: fs.base,
    marginBottom: sp.sm2,
    backgroundColor: '#FAFAFA',
    borderColor: '#CBD5E1',
    color: '#0F172A',
  },
  textAreaInput: {
    height: s(100),
    paddingTop: sp.md,
    textAlignVertical: 'top',
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.sm2,
    marginBottom: sp.sm2,
  },
  typeChip: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: br.sm,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: fs.sm,
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: sp.sm,
    paddingVertical: sp.px2,
    borderRadius: br.sm,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginTop: sp.md,
    marginBottom: sp.sm,
  },
  attachBtnTxt: {
    fontSize: fs.xs,
    fontWeight: '700',
    color: '#2D5016',
  },
  removeImgTxt: {
    fontSize: fs.xs,
    fontWeight: '700',
    color: '#EF4444',
  },
  imagePreviewContainer: {
    marginTop: sp.sm2,
    marginBottom: sp.md,
  },
  imagePreviewLabel: {
    fontSize: fs.sm2,
    fontWeight: '700',
    marginBottom: sp.sm2,
  },
  imagePreview: {
    width: '100%',
    height: s(150),
    borderRadius: br.md,
    backgroundColor: '#F1F5F9',
  },
  submitBtn: {
    borderRadius: br.full,
    overflow: 'hidden',
    marginTop: sp.lg2,
    shadowColor: '#A8CD55',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  btnGradient: {
    paddingVertical: sp.md3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#1A1A1A',
    fontSize: fs.md,
    fontWeight: '900',
  },

  // Ticket History Cards
  ticketCard: {
    padding: sp.lg,
    borderRadius: br.lg,
    borderWidth: 1,
    marginBottom: sp.md,
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E4D4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.sm,
  },
  ticketRef: {
    fontSize: fs.base,
    fontWeight: '900',
  },
  ticketUserLabel: {
    fontSize: fs.sm2,
    marginLeft: sp.xs,
  },
  statusBadge: {
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
    borderRadius: br.sm2,
  },
  statusBadgeTxt: {
    fontSize: fs.xs,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  ticketSubject: {
    fontSize: fs.md2,
    fontWeight: '800',
    marginBottom: sp.sm2,
  },
  ticketTypeBadge: {
    fontSize: fs.sm,
    fontWeight: '600',
    marginBottom: sp.sm,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketDate: {
    fontSize: fs.xs,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(60),
    paddingHorizontal: sp.xxl,
  },
  emptyTitle: {
    fontSize: fs.lg,
    fontWeight: '900',
    marginTop: sp.md,
  },
  emptyDesc: {
    fontSize: fs.base,
    lineHeight: fs.base * 1.5,
    textAlign: 'center',
    marginTop: sp.sm,
  },

  // Skeleton Loaders
  skeletonCard: {
    height: s(100),
    borderRadius: br.lg,
    marginBottom: sp.md,
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: s(440),
    maxHeight: '85%',
    borderRadius: br.xxl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.xl,
    paddingTop: sp.xl,
    paddingBottom: sp.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fs.md2,
    fontWeight: '900',
  },
  closeModalBtn: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    padding: sp.xl,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: fs.sm2,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaVal: {
    fontSize: fs.md,
    fontWeight: '800',
    marginTop: sp.xs,
  },
  metaDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: sp.md3,
  },
  detailLabel: {
    fontSize: fs.sm2,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: sp.xs,
  },
  detailSubject: {
    fontSize: fs.md2,
    fontWeight: '900',
  },
  detailDesc: {
    fontSize: fs.base,
    lineHeight: fs.base * 1.5,
  },
  detailImage: {
    width: '100%',
    height: s(200),
    borderRadius: br.md,
    backgroundColor: '#151715',
    marginTop: sp.xs,
  },
  commentBox: {
    borderRadius: br.md,
    borderWidth: 1,
    padding: sp.md,
    marginTop: sp.sm2,
  },
  commentText: {
    fontSize: fs.base,
    lineHeight: fs.base * 1.5,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: fs.xs,
    marginTop: sp.sm2,
  },
  noCommentTxt: {
    fontSize: fs.sm,
    fontStyle: 'italic',
    marginTop: sp.xs,
  },

  // Admin Modal Controls
  adminControlsContainer: {
    borderTopWidth: 1,
    marginTop: sp.xl,
    paddingTop: sp.lg,
  },
  adminControlsTitle: {
    fontSize: fs.md,
    fontWeight: '900',
    marginBottom: sp.md,
  },
  adminInputLabel: {
    fontSize: fs.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: sp.sm2,
  },
  statusChipsContainer: {
    flexDirection: 'row',
    gap: sp.sm2,
    marginBottom: sp.md3,
  },
  statusChip: {
    flex: 1,
    paddingVertical: sp.sm,
    borderRadius: br.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusChipText: {
    fontSize: fs.sm2,
    fontWeight: '700',
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp.sm,
    borderRadius: br.sm,
    borderWidth: 1.5,
    gap: sp.sm2,
    marginBottom: sp.md3,
  },
  resolveBtnTxt: {
    fontSize: fs.sm,
    fontWeight: '800',
  },
  adminReplyInput: {
    height: s(70),
    paddingTop: sp.md2,
    textAlignVertical: 'top',
  },
  saveAdminBtn: {
    borderRadius: br.full,
    overflow: 'hidden',
    marginTop: sp.md2,
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
});
