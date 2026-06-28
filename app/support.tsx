import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
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




// ── Types ────────────────────────────────────────────────────────────────────
interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  complaintType: string;
  subject: string;
  description: string;
  screenshotUrl: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  createdAt: string;
  ticketRef: string;
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

  // Theme support
  const isDark = systemScheme === 'dark';
  const theme = useMemo(() => {
    return {
      bg: isDark ? '#0A1628' : '#F3F4F1',
      bgMid: isDark ? '#0D1F3C' : '#FFFFFF',
      cardBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
      cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)',
      text: isDark ? '#FFFFFF' : '#1A1A1A',
      textSecondary: isDark ? '#8A9BA8' : '#666666',
      green: '#A8CD55',
      greenText: isDark ? '#A8CD55' : '#4CAF50',
      greenLight: isDark ? 'rgba(168,205,85,0.12)' : 'rgba(76,175,80,0.1)',
      red: isDark ? '#FF6B6B' : '#D32F2F',
      redLight: isDark ? 'rgba(255,107,107,0.1)' : 'rgba(211,47,47,0.08)',
      inputBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      inputBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      gold: '#E3A85B',
      blue: '#54A8FF',
    };
  }, [isDark]);

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
      console.error('Error loading role:', err);
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
    }, (error) => {
      console.log('Notification listener error:', error);
    });

    return () => unsubscribe();
  }, [uid, activeTab]);

  // 5. Submit Support Ticket Form via EmailJS
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

    const ticketRef = 'CRK' + Math.floor(1000 + Math.random() * 9000);
    const createdAt = new Date().toISOString();
    
    // Format timestamp in local IST style
    const formattedTime = new Date(createdAt).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    const emailJsPayload = {
      service_id: 'service_kkrg6ud',
      template_id: 'template_pqs46a9',
      user_id: '-hsu_e4K7ntVUa-z2',
      template_params: {
        name: userName || 'Crickstreet User',
        email: userEmail || 'no-email@crickstreet.com',
        complaint_type: complaintType,
        subject: subject.trim(),
        message: description.trim(),
        time: `${formattedTime} (Ref: #${ticketRef})`,
      },
    };

    try {
      console.log('Sending email via EmailJS REST API...');
      const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailJsPayload),
      });

      const responseText = await emailResponse.text();

      if (!emailResponse.ok) {
        console.error('EmailJS api response error:', responseText);
        throw new Error(responseText || 'EmailJS rejected email delivery.');
      }

      console.log('EmailJS sent successfully:', responseText);

      // Save a copy in Firestore for history tracking
      try {
        const payload = {
          userId: uid,
          userName: userName || 'Crickstreet User',
          userEmail: userEmail || 'no-email@crickstreet.com',
          complaintType,
          subject: subject.trim(),
          description: description.trim(),
          screenshotUrl: screenshotUrl.trim(),
          status: 'Open',
          createdAt,
          ticketRef,
        };
        await addDoc(collection(db, 'supportTickets'), payload);
      } catch (firestoreErr) {
        console.error('Firestore backup storage failed:', firestoreErr);
      }

      // Show success toast
      showToast('Support ticket sent successfully!', 'success');

      // Clear the form after successful submission
      setSubject('');
      setDescription('');
      setScreenshotUrl('');
      setComplaintType('Bug Report');
    } catch (err: any) {
      console.error('EmailJS submission error:', err);
      // Show error toast if sending fails
      showToast(err.message || 'Failed to deliver support ticket email.', 'error');
    } finally {
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
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.inputBg }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Support Center</Text>
          <View style={{ width: 44 }} />
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
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
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
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                        multiline
                        numberOfLines={5}
                        value={description}
                        onChangeText={setDescription}
                      />

                      {/* Screenshot URL */}
                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>SCREENSHOT URL (OPTIONAL)</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                        placeholder="Paste image link/URL here"
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                        autoCapitalize="none"
                        value={screenshotUrl}
                        onChangeText={setScreenshotUrl}
                      />

                      {screenshotUrl.trim().startsWith('http') && (
                        <View style={styles.imagePreviewContainer}>
                          <Text style={[styles.imagePreviewLabel, { color: theme.textSecondary }]}>Screenshot Preview:</Text>
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
                            <ActivityIndicator size="small" color="#050A08" />
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
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
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
                          <ActivityIndicator size="small" color="#050A08" />
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
    paddingTop: sp.md2,
    paddingBottom: sp.lg,
  },
  backBtn: {
    width: avatarSz.md2,
    height: avatarSz.md2,
    borderRadius: avatarSz.md2 / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fs.lg,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    borderWidth: 1,
    borderRadius: br.md,
    paddingHorizontal: sp.md3,
    fontSize: fs.md2,
    marginBottom: sp.sm2,
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
    backgroundColor: '#151715',
  },
  submitBtn: {
    borderRadius: br.full,
    overflow: 'hidden',
    marginTop: sp.lg2,
  },
  btnGradient: {
    paddingVertical: sp.md3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#050A08',
    fontSize: fs.md,
    fontWeight: '900',
  },

  // Ticket History Cards
  ticketCard: {
    padding: sp.lg,
    borderRadius: br.lg,
    borderWidth: 1,
    marginBottom: sp.md,
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
