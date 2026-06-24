import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
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
import { useAuth } from '../src/hooks/useAuth';
import { db } from '../src/services/firebase';

const { width } = Dimensions.get('window');

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
export default function MyTeamsScreen() {
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
      const colRef = collection(db, 'users', uid, 'teams');
      const docRef = await addDoc(colRef, payload);
      setModalVisible(false);
      // Redirect to Details editor screen immediately
      router.push({
        pathname: '/team-details/[id]',
        params: { id: docRef.id }
      });
    } catch (err) {
      console.error('Error saving team to Firestore:', err);
      Alert.alert('Database Error', 'Could not create team. Try again.');
    } finally {
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
          <View style={{ width: 44 }} /> {/* Spacer */}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.white,
  },
  badgeContainer: {
    backgroundColor: 'rgba(168,205,85,0.18)',
    borderWidth: 1,
    borderColor: C.green,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.green,
  },

  // Loader Styles
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  pulseLoader: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  loadingText: {
    color: C.textGray,
    fontSize: 14,
    fontWeight: '600',
  },

  // List & Cards style
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: C.glassBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#050A08',
  },
  cardTitleCol: {
    flex: 1,
  },
  cardTeamName: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
    marginBottom: 2,
  },
  cardTimeline: {
    fontSize: 11,
    color: C.textGray,
  },
  shareBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(168,205,85,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Captain chips
  rosterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  leaderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flex: 1,
  },
  leaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.white,
  },

  // Action footer
  actionRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: C.border,
    paddingTop: 12,
    marginTop: 2,
  },
  playerCountBadge: {
    backgroundColor: 'rgba(168,205,85,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  playerCountText: {
    color: C.green,
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRight: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.white,
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state styles
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(168,205,85,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.white,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: C.textGray,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  emptyBtn: {
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#050A08',
    fontSize: 13,
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
    width: width - 40,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.white,
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    padding: 20,
  },
  inputLabel: {
    color: C.textGray,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: C.white,
    fontSize: 14,
    marginBottom: 20,
  },

  // Modal Action Buttons
  saveBtn: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnTxt: {
    color: '#050A08',
    fontSize: 14,
    fontWeight: '900',
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  cancelBtnTxt: {
    color: C.textGray,
    fontSize: 13,
    fontWeight: '700',
  },
}) as any;
