import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  addDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { s, fs, sp, br, avatarSz, iconSz } from '../../theme/responsive';

// Premium Dark Theme Palette
const C = {
  bgDark: '#0A1628',
  bgMid: '#0D1F3C',
  bgLight: '#111A2E',
  green: '#A8CD55',
  gold: '#E3A85B',
  white: '#FFFFFF',
  textGray: '#8A9BA8',
  border: 'rgba(255, 255, 255, 0.08)',
  glassBg: 'rgba(255, 255, 255, 0.04)',
  red: '#FF6B6B',
  redGlass: 'rgba(255, 107, 107, 0.1)',
} as const;

interface Team {
  id: string;
  teamName: string;
  captain: string;
  viceCaptain: string;
  playerCount: number;
  createdAt: string;
}

// ── Entry Animated Card Component ──────────────────────────────────────────
function AnimatedTeamCard({
  team,
  index,
  onView,
  onShare,
  onDelete,
}: {
  team: Team;
  index: number;
  onView: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const initials = team.teamName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={onView}>
        <LinearGradient
          colors={['rgba(168,205,85,0.06)', 'rgba(227,168,91,0.02)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Card Header Row */}
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={['#A8CD55', '#E3A85B']}
            style={styles.logoBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoText}>{initials || 'CS'}</Text>
          </LinearGradient>
          
          <View style={styles.cardTitleCol}>
            <Text style={styles.cardTeamName} numberOfLines={1}>{team.teamName}</Text>
            <Text style={styles.cardTimeline}>Created {new Date(team.createdAt).toLocaleDateString()}</Text>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
            <Feather name="share-2" size={16} color={C.green} />
          </TouchableOpacity>
        </View>

        {/* Captain & Vice Captain Row */}
        <View style={styles.rosterRow}>
          <View style={styles.leaderChip}>
            <MaterialCommunityIcons name="crown" size={14} color={C.gold} />
            <Text style={styles.leaderText} numberOfLines={1}>
              C: {team.captain || 'Not Designated'}
            </Text>
          </View>
          <View style={styles.leaderChip}>
            <Feather name="shield" size={12} color={C.green} />
            <Text style={styles.leaderText} numberOfLines={1}>
              VC: {team.viceCaptain || 'Not Designated'}
            </Text>
          </View>
        </View>

        {/* Squad Status & Action Row */}
        <View style={styles.actionRowContainer}>
          <View style={styles.playerCountBadge}>
            <Text style={styles.playerCountText}>{team.playerCount}/11 Players</Text>
          </View>

          <View style={styles.actionsRight}>
            <TouchableOpacity style={styles.actionButton} onPress={onView}>
              <Feather name="edit-3" size={14} color={C.green} />
              <Text style={[styles.actionBtnText, { color: C.green }]}>Manage Roster</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
              <Feather name="trash-2" size={14} color={C.red} />
              <Text style={[styles.actionBtnText, { color: C.red }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function TeamScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid || '';

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [formTeamName, setFormTeamName] = useState('');
  const [saving, setSaving] = useState(false);

  // Real-time synchronization
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users', uid, 'teams'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Team[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const players = data.players || [];
        const captainId = data.captainId || '';
        const viceCaptainId = data.viceCaptainId || '';

        const captainPlayer = players.find((p: any) => p.id === captainId);
        const viceCaptainPlayer = players.find((p: any) => p.id === viceCaptainId);

        fetched.push({
          id: docSnap.id,
          teamName: data.teamName || 'Unknown Team',
          captain: captainPlayer ? captainPlayer.name : '',
          viceCaptain: viceCaptainPlayer ? viceCaptainPlayer.name : '',
          playerCount: players.length,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      setTeams(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Firestore loading error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  // Pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  // Open Modal to Create
  const handleOpenCreate = () => {
    setFormTeamName('');
    setModalVisible(true);
  };

  // Share team card summary
  const handleShareTeam = async (team: Team) => {
    try {
      const message = `🏏 Crickstreet Team: ${team.teamName}\n👑 Captain: ${team.captain || 'Not set'}\n🛡️ Vice Captain: ${team.viceCaptain || 'Not set'}\n👥 Squad Size: ${team.playerCount}/11 Players\nCreate and manage your cricket rosters inside Crickstreet app!`;
      await Share.share({ message });
    } catch (err) {
      console.error('Error sharing team:', err);
    }
  };

  // Delete team confirmation
  const handleDeleteTeam = (teamId: string, name: string) => {
    Alert.alert(
      'Delete Team 🚨',
      `Are you sure you want to delete "${name}"? This action is permanent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const docRef = doc(db, 'users', uid, 'teams', teamId);
              await deleteDoc(docRef);
            } catch (err) {
              console.error('Error deleting document:', err);
              Alert.alert('Database Error', 'Could not delete the team. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Create Team (Initial Setup)
  const handleSaveForm = async () => {
    console.log('[TeamScreen] handleSaveForm invoked. TeamName:', formTeamName, 'UID:', uid);
    if (!formTeamName.trim()) {
      Alert.alert('Form Error', 'Please enter a valid Team Name.');
      return;
    }

    setSaving(true);
    const payload = {
      teamName: formTeamName.trim(),
      captain: '',
      viceCaptain: '',
      players: [],
      createdAt: new Date().toISOString(),
    };

    try {
      if (!uid) {
        throw new Error('User UID is empty. Please ensure you are logged in.');
      }
      
      const colRef = collection(db, 'users', uid, 'teams');
      const docRef = doc(colRef); // Client-side generated ID!
      const teamId = docRef.id;

      console.log('[TeamScreen] Saving to path:', docRef.path);
      // Save document and wait for database write to prevent race conditions
      await setDoc(docRef, payload);
      console.log('[TeamScreen] setDoc completed successfully.');

      setModalVisible(false);
      setSaving(false);
      // Redirect to Details editor screen immediately
      router.push(`/team-details/${teamId}` as any);
    } catch (err: any) {
      console.error('Error saving team to Firestore:', err);
      Alert.alert('Database Error', `Could not create team: ${err?.message || err}`);
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[C.bgDark, C.bgMid, C.bgLight]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>My 11 Teams</Text>
            {!loading && teams.length > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{teams.length}</Text>
              </View>
            )}
          </View>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <Animated.Image 
              source={{ uri: 'https://ui-avatars.com/api/?name=CS&background=A8CD55&color=0A1628&size=120&bold=true' }}
              style={[styles.pulseLoader, { opacity: 0.8 }]}
            />
            <Text style={styles.loadingText}>Fetching team squads...</Text>
          </View>
        ) : (
          <FlatList
            data={teams}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <AnimatedTeamCard
                team={item}
                index={index}
                onView={() => router.push({
                  pathname: '/team-details/[id]',
                  params: { id: item.id }
                })}
                onShare={() => handleShareTeam(item)}
                onDelete={() => handleDeleteTeam(item.id, item.teamName)}
              />
            )}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={C.green}
                colors={[C.green]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBg}>
                  <MaterialCommunityIcons name="cricket" size={48} color={C.green} />
                </View>
                <Text style={styles.emptyTitle}>No Teams Created Yet</Text>
                <Text style={styles.emptyDesc}>
                  Create your first cricket team squad to start managing statistics, captains, and match rosters.
                </Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={handleOpenCreate}>
                  <LinearGradient
                    colors={['#A8CD55', '#4CAF50']}
                    style={styles.emptyBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.emptyBtnText}>Create First Team</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* Floating Action Button */}
        {!loading && (
          <TouchableOpacity style={styles.fab} onPress={handleOpenCreate}>
            <LinearGradient
              colors={['#A8CD55', '#E3A85B']}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="plus" size={24} color="#050A08" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Create Dialog Modal */}
        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={['#0D1F3C', '#0A1628']}
                style={StyleSheet.absoluteFillObject}
              />
              
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Team</Text>
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={20} color={C.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                {/* Team Name */}
                <Text style={styles.inputLabel}>TEAM NAME</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Crickstreet Stars"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={formTeamName}
                  onChangeText={setFormTeamName}
                  autoFocus
                />

                {/* CTA Buttons */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveForm} disabled={saving}>
                  <LinearGradient
                    colors={['#A8CD55', '#E3A85B']}
                    style={styles.saveBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.saveBtnTxt}>
                      {saving ? 'Creating...' : 'Initialize Team & Edit Roster'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnTxt}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.xl,
    paddingTop: sp.md2,
    paddingBottom: sp.lg,
  },
  backBtn: {
    width: avatarSz.md2,
    height: avatarSz.md2,
    borderRadius: avatarSz.md2 / 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  headerTitle: {
    fontSize: fs.xl,
    fontWeight: '700',
    color: C.white,
  },
  badgeContainer: {
    backgroundColor: 'rgba(168,205,85,0.18)',
    borderWidth: 1,
    borderColor: C.green,
    paddingHorizontal: sp.sm,
    paddingVertical: sp.px2,
    borderRadius: br.md,
  },
  badgeText: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: C.green,
  },

  // Loader Styles
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.lg,
  },
  pulseLoader: {
    width: s(60),
    height: s(60),
    borderRadius: s(30),
  },
  loadingText: {
    color: C.textGray,
    fontSize: fs.md2,
    fontWeight: '600',
  },

  // List & Cards style
  listContainer: {
    paddingHorizontal: sp.lg,
    paddingTop: sp.sm,
    paddingBottom: s(100),
  },
  card: {
    backgroundColor: C.glassBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: br.xxl,
    padding: sp.lg,
    marginBottom: sp.md3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    marginBottom: sp.lg,
  },
  logoBadge: {
    width: avatarSz.md2,
    height: avatarSz.md2,
    borderRadius: br.md3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: fs.lg,
    fontWeight: '900',
    color: '#050A08',
  },
  cardTitleCol: {
    flex: 1,
  },
  cardTeamName: {
    fontSize: fs.lg,
    fontWeight: '800',
    color: C.white,
    marginBottom: sp.px2,
  },
  cardTimeline: {
    fontSize: fs.sm,
    color: C.textGray,
  },
  shareBtn: {
    width: s(32),
    height: s(32),
    borderRadius: br.sm,
    backgroundColor: 'rgba(168,205,85,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Captain chips
  rosterRow: {
    flexDirection: 'row',
    gap: sp.md,
    marginBottom: sp.lg,
  },
  leaderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm2,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm2,
    borderRadius: br.md,
    flex: 1,
  },
  leaderText: {
    fontSize: fs.md,
    fontWeight: '600',
    color: C.white,
  },

  actionRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: C.border,
    paddingTop: sp.lg,
    marginTop: sp.px2,
  },
  playerCountBadge: {
    backgroundColor: 'rgba(168,205,85,0.12)',
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs,
    borderRadius: br.sm,
  },
  playerCountText: {
    color: C.green,
    fontSize: fs.md,
    fontWeight: '700',
  },
  actionsRight: {
    flexDirection: 'row',
    gap: sp.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm2,
  },
  actionBtnText: {
    fontSize: fs.md,
    fontWeight: '700',
    color: C.white,
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: sp.xl,
    right: sp.lg,
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: s(28),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state styles
  emptyState: {
    paddingVertical: s(80),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sp.xl,
  },
  emptyIconBg: {
    width: s(80),
    height: s(80),
    borderRadius: br.xxl,
    backgroundColor: 'rgba(168,205,85,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.xl,
  },
  emptyTitle: {
    fontSize: fs.xl,
    fontWeight: '800',
    color: C.white,
    marginBottom: sp.sm,
  },
  emptyDesc: {
    fontSize: fs.md,
    color: C.textGray,
    textAlign: 'center',
    lineHeight: fs.md * 1.5,
    paddingHorizontal: sp.lg,
    marginBottom: sp.xl,
  },
  emptyBtn: {
    borderRadius: br.full,
    overflow: 'hidden',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnGradient: {
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
  },
  emptyBtnText: {
    color: '#050A08',
    fontSize: fs.md,
    fontWeight: '900',
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
    borderRadius: br.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.xl,
    paddingTop: sp.xl,
    paddingBottom: sp.lg,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  modalTitle: {
    fontSize: fs.lg,
    fontWeight: '800',
    color: C.white,
  },
  closeModalBtn: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    padding: sp.xl,
  },
  inputLabel: {
    color: C.textGray,
    fontSize: fs.sm2,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: sp.sm,
  },
  textInput: {
    height: s(48),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: br.md,
    paddingHorizontal: sp.md3,
    color: C.white,
    fontSize: fs.md2,
    marginBottom: sp.xl,
  },

  // Modal Action Buttons
  saveBtn: {
    borderRadius: br.full,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    paddingVertical: sp.md3,
    alignItems: 'center',
  },
  saveBtnTxt: {
    color: '#050A08',
    fontSize: fs.md2,
    fontWeight: '900',
  },
  cancelBtn: {
    marginTop: sp.md,
    paddingVertical: sp.md3,
    borderRadius: br.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  cancelBtnTxt: {
    color: C.textGray,
    fontSize: fs.md,
    fontWeight: '700',
  },
});
