import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  onSnapshot,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
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

const { width } = Dimensions.get('window');

// ── Types ────────────────────────────────────────────────────────────────────
interface Player {
  id: string;
  playerName: string;
  playerImage: string;
  role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket Keeper';
  jerseyNumber: string;
  isSubstitute: boolean;
}

// ── Skeleton View ────────────────────────────────────────────────────────────
function SkeletonView({ style, isDark }: { style: any; isDark: boolean }) {
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

  return <Animated.View style={[style, { opacity: pulseAnim, backgroundColor: bg }]} />;
}

// ── Animated Card Component ──────────────────────────────────────────────────
function PlayerCard({
  player,
  index,
  onEdit,
  theme,
  isSub,
}: {
  player: Player;
  index: number;
  onEdit: () => void;
  theme: any;
  isSub: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const getRoleColors = (role: string) => {
    switch (role) {
      case 'Batsman':
        return { text: '#A8CD55', bg: 'rgba(168,205,85,0.15)' };
      case 'Bowler':
        return { text: '#00B4DB', bg: 'rgba(0,180,219,0.15)' };
      case 'All-Rounder':
        return { text: '#E3A85B', bg: 'rgba(227,168,91,0.15)' };
      case 'Wicket Keeper':
        return { text: '#F48FB1', bg: 'rgba(244,143,177,0.15)' };
      default:
        return { text: '#FFF', bg: 'rgba(255,255,255,0.1)' };
    }
  };

  const roleStyles = getRoleColors(player.role);

  // If it's a substitute card, render a slightly different layout (horizontal) for responsiveness
  if (isSub) {
    return (
      <Animated.View style={[styles.subCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Image source={{ uri: player.playerImage }} style={styles.subAvatar} />
        
        <View style={styles.subInfo}>
          <Text style={[styles.subName, { color: theme.text }]} numberOfLines={1}>
            {player.playerName}
          </Text>
          
          <View style={styles.detailsRow}>
            <View style={[styles.roleBadge, { backgroundColor: roleStyles.bg }]}>
              <Text style={[styles.roleBadgeText, { color: roleStyles.text }]}>{player.role}</Text>
            </View>
            <Text style={[styles.jerseyText, { color: theme.textSecondary }]}>#{player.jerseyNumber}</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.editCircle, { backgroundColor: theme.inputBg }]} onPress={onEdit}>
          <Feather name="edit-2" size={14} color={theme.greenText} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Regular Playing XI vertical/grid card layout
  return (
    <Animated.View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.cardHeaderRow}>
        <View style={[styles.jerseyBadge, { backgroundColor: theme.inputBg }]}>
          <Text style={[styles.jerseyBadgeText, { color: theme.greenText }]}>#{player.jerseyNumber}</Text>
        </View>
        <TouchableOpacity style={[styles.editCircle, { backgroundColor: theme.inputBg }]} onPress={onEdit}>
          <Feather name="edit-2" size={12} color={theme.greenText} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <Image source={{ uri: player.playerImage }} style={styles.avatar} />
        <Text style={[styles.playerNameText, { color: theme.text }]} numberOfLines={1}>
          {player.playerName}
        </Text>
        <View style={[styles.roleBadge, { backgroundColor: roleStyles.bg, marginTop: 6 }]}>
          <Text style={[styles.roleBadgeText, { color: roleStyles.text }]}>{player.role}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Empty Slot Component ─────────────────────────────────────────────────────
function EmptySlot({
  slotNumber,
  isSub,
  onPress,
  theme,
}: {
  slotNumber: number;
  isSub: boolean;
  onPress: () => void;
  theme: any;
}) {
  if (isSub) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          styles.subCard,
          styles.emptyCardDashed,
          { backgroundColor: 'transparent', borderColor: theme.cardBorder },
        ]}
      >
        <View style={[styles.subAvatar, styles.emptyAvatarPlace]}>
          <Feather name="user-plus" size={18} color={theme.textSecondary} />
        </View>
        <View style={styles.subInfo}>
          <Text style={[styles.emptySlotTitle, { color: theme.textSecondary }]}>
            Empty Substitute #{slotNumber}
          </Text>
          <Text style={[styles.emptySlotDesc, { color: theme.textSecondary }]}>
            Tap to assign substitute
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        styles.emptyCardDashed,
        { backgroundColor: 'transparent', borderColor: theme.cardBorder },
      ]}
    >
      <MaterialCommunityIcons name="cricket" size={24} color={theme.textSecondary} style={{ marginBottom: 6 }} />
      <Text style={[styles.emptySlotTitle, { color: theme.textSecondary }]} numberOfLines={1}>
        Playing XI Slot {slotNumber}
      </Text>
      <Text style={[styles.emptySlotDesc, { color: theme.textSecondary }]}>
        Tap to assign
      </Text>
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function MyPlayersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid || '';
  const systemScheme = useColorScheme();

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket Keeper'>('Batsman');
  const [formJersey, setFormJersey] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formIsSubstitute, setFormIsSubstitute] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dynamic theme mapping
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
      gold: '#E3A85B',
      red: isDark ? '#FF6B6B' : '#D32F2F',
      redLight: isDark ? 'rgba(255,107,107,0.1)' : 'rgba(211,47,47,0.08)',
      inputBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      inputBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      white: '#FFFFFF',
    };
  }, [isDark]);

  // Synchronize with Firebase Firestore
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users', uid, 'players'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Player[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetched.push({
            id: docSnap.id,
            playerName: data.playerName || '',
            playerImage: data.playerImage || '',
            role: data.role || 'Batsman',
            jerseyNumber: String(data.jerseyNumber || ''),
            isSubstitute: !!data.isSubstitute,
          });
        });
        setPlayers(fetched);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching Firestore players:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  // Split players into sections
  const playingXI = useMemo(() => players.filter((p) => !p.isSubstitute).slice(0, 11), [players]);
  const substitutes = useMemo(() => players.filter((p) => p.isSubstitute).slice(0, 3), [players]);

  // Open Modal for Add
  const handleOpenAdd = (isSubAssignment: boolean = false) => {
    setEditingPlayer(null);
    setFormName('');
    setFormRole('Batsman');
    setFormJersey('');
    setFormImage('');
    setFormIsSubstitute(isSubAssignment);
    setModalVisible(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormName(player.playerName);
    setFormRole(player.role);
    setFormJersey(player.jerseyNumber);
    setFormImage(player.playerImage);
    setFormIsSubstitute(player.isSubstitute);
    setModalVisible(true);
  };

  // Move player directly between Playing XI and Substitute Bench
  const handleToggleSubstitute = async (player: Player) => {
    const nextSubstituteState = !player.isSubstitute;

    if (nextSubstituteState) {
      // Moving to Substitute Bench. Validate that substitutes size < 3
      if (substitutes.length >= 3) {
        Alert.alert('Roster Limit', 'The Substitute Bench is full. Maximum 3 substitute players allowed.');
        return;
      }
    } else {
      // Moving to Playing XI. Validate that playingXI size < 11
      if (playingXI.length >= 11) {
        Alert.alert('Roster Limit', 'The Playing XI is full. Maximum 11 players allowed.');
        return;
      }
    }

    try {
      const docRef = doc(db, 'users', uid, 'players', player.id);
      await setDoc(docRef, { isSubstitute: nextSubstituteState }, { merge: true });
      setModalVisible(false);
    } catch (err) {
      console.error('Error toggling player position:', err);
      Alert.alert('Database Error', 'Could not move player. Please try again.');
    }
  };

  // Delete Player
  const handleDeletePlayer = (playerId: string, name: string) => {
    Alert.alert(
      'Remove Player 🚨',
      `Are you sure you want to remove ${name} from your players list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const docRef = doc(db, 'users', uid, 'players', playerId);
              await deleteDoc(docRef);
              setModalVisible(false);
            } catch (err) {
              console.error('Error deleting player:', err);
              Alert.alert('Database Error', 'Could not delete player.');
            }
          },
        },
      ]
    );
  };

  // Save Player form submit (Create or Update)
  const handleSavePlayer = async () => {
    if (!formName.trim()) {
      Alert.alert('Validation Error', 'Please enter a player name.');
      return;
    }
    if (!formJersey.trim()) {
      Alert.alert('Validation Error', 'Please enter a jersey number.');
      return;
    }

    // Check if the change violates roster sizes
    const isAddingNew = !editingPlayer;
    const positionChanged = editingPlayer && editingPlayer.isSubstitute !== formIsSubstitute;

    if (isAddingNew) {
      if (formIsSubstitute && substitutes.length >= 3) {
        Alert.alert('Roster Limit', 'The Substitute Bench is full. Maximum 3 substitute players allowed.');
        return;
      }
      if (!formIsSubstitute && playingXI.length >= 11) {
        Alert.alert('Roster Limit', 'The Playing XI is full. Maximum 11 players allowed.');
        return;
      }
    } else if (positionChanged) {
      if (formIsSubstitute && substitutes.length >= 3) {
        Alert.alert('Roster Limit', 'The Substitute Bench is full. Maximum 3 substitute players allowed.');
        return;
      }
      if (!formIsSubstitute && playingXI.length >= 11) {
        Alert.alert('Roster Limit', 'The Playing XI is full. Maximum 11 players allowed.');
        return;
      }
    }

    setSaving(true);

    const resolvedImage =
      formImage.trim() ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(formName.trim())}&background=0D1F3C&color=A8CD55&size=150&bold=true`;

    const payload = {
      playerName: formName.trim(),
      role: formRole,
      jerseyNumber: formJersey.trim(),
      playerImage: resolvedImage,
      isSubstitute: formIsSubstitute,
    };

    try {
      if (editingPlayer) {
        // Update existing document
        const docRef = doc(db, 'users', uid, 'players', editingPlayer.id);
        await setDoc(docRef, payload, { merge: true });
      } else {
        // Add new document
        const colRef = collection(db, 'users', uid, 'players');
        await addDoc(colRef, payload);
      }
      setModalVisible(false);
    } catch (err) {
      console.error('Error saving player:', err);
      Alert.alert('Database Error', 'Could not save player details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
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
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>My Players</Text>
            {!loading && players.length > 0 && (
              <View style={[styles.badgeContainer, { backgroundColor: theme.greenLight, borderColor: theme.greenText }]}>
                <Text style={[styles.badgeText, { color: theme.greenText }]}>{players.length}/14</Text>
              </View>
            )}
          </View>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header Skeletons */}
            <SkeletonView style={{ width: 140, height: 20, borderRadius: 6, marginBottom: 16 }} isDark={isDark} />
            
            {/* Grid Skeletons */}
            <View style={styles.gridContainer}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonView key={i} style={{ width: (width - 40 - 12) / 2, height: 130, borderRadius: 16, marginBottom: 12 }} isDark={isDark} />
              ))}
            </View>
          </ScrollView>
        ) : players.length === 0 ? (
          // Empty State
          <View style={styles.emptyStateContainer}>
            <View style={[styles.emptyIconBg, { backgroundColor: theme.greenLight }]}>
              <MaterialCommunityIcons name="cricket" size={48} color={theme.greenText} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Players Added Yet</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Create your roster squad. Add your first players to assign them to either the Playing XI or Substitute bench.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => handleOpenAdd(false)}>
              <LinearGradient
                colors={['#A8CD55', '#4CAF50']}
                style={styles.emptyBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="plus" size={18} color="#050A08" style={{ marginRight: 6 }} />
                <Text style={styles.emptyBtnText}>Add Player</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* SECTION 1: Playing XI */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrapper}>
                <View style={[styles.sectionMarker, { backgroundColor: theme.green }]} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Playing XI</Text>
              </View>
              <Text style={[styles.counterText, { color: theme.textSecondary }]}>
                {playingXI.length}/11 players
              </Text>
            </View>

            <View style={styles.gridContainer}>
              {Array.from({ length: 11 }).map((_, idx) => {
                const player = playingXI[idx];
                if (player) {
                  return (
                    <View key={player.id} style={{ width: (width - 40 - 12) / 2 }}>
                      <PlayerCard
                        player={player}
                        index={idx}
                        onEdit={() => handleOpenEdit(player)}
                        theme={theme}
                        isSub={false}
                      />
                    </View>
                  );
                } else {
                  return (
                    <View key={`empty-xi-${idx}`} style={{ width: (width - 40 - 12) / 2 }}>
                      <EmptySlot
                        slotNumber={idx + 1}
                        isSub={false}
                        onPress={() => handleOpenAdd(false)}
                        theme={theme}
                      />
                    </View>
                  );
                }
              })}
            </View>

            {/* SECTION 2: Substitutes */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <View style={styles.sectionTitleWrapper}>
                <View style={[styles.sectionMarker, { backgroundColor: theme.gold }]} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Substitutes</Text>
              </View>
              <Text style={[styles.counterText, { color: theme.textSecondary }]}>
                {substitutes.length}/3 bench
              </Text>
            </View>

            <View style={styles.subscribersContainer}>
              {Array.from({ length: 3 }).map((_, idx) => {
                const player = substitutes[idx];
                if (player) {
                  return (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      index={idx}
                      onEdit={() => handleOpenEdit(player)}
                      theme={theme}
                      isSub={true}
                    />
                  );
                } else {
                  return (
                    <EmptySlot
                      key={`empty-sub-${idx}`}
                      slotNumber={idx + 1}
                      isSub={true}
                      onPress={() => handleOpenAdd(true)}
                      theme={theme}
                    />
                  );
                }
              })}
            </View>
          </ScrollView>
        )}

        {/* Floating Action Button */}
        {!loading && players.length > 0 && (
          <TouchableOpacity style={styles.fab} onPress={() => handleOpenAdd(false)}>
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

        {/* Create/Edit Form Modal */}
        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.bgMid, borderColor: theme.cardBorder }]}>
              
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderColor: theme.cardBorder }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {editingPlayer ? 'Edit Player Details' : 'Add New Player'}
                </Text>
                <TouchableOpacity
                  style={[styles.closeModalBtn, { backgroundColor: theme.inputBg }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Feather name="x" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                {/* Name */}
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PLAYER NAME</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="e.g. Player Name"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                  value={formName}
                  onChangeText={setFormName}
                />

                {/* Role selection (Chips) */}
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PLAYER ROLE</Text>
                <View style={styles.chipsRow}>
                  {(['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'] as const).map((r) => {
                    const isSelected = formRole === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected ? theme.greenLight : theme.inputBg,
                            borderColor: isSelected ? theme.greenText : theme.inputBorder,
                          },
                        ]}
                        onPress={() => setFormRole(r)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isSelected ? theme.greenText : theme.textSecondary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Jersey number */}
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>JERSEY NUMBER</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="e.g. 7 or 99"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                  keyboardType="numeric"
                  value={formJersey}
                  onChangeText={setFormJersey}
                />

                {/* Image URL */}
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PHOTO URL (OPTIONAL)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="e.g. https://domain.com/photo.png"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                  value={formImage}
                  onChangeText={setFormImage}
                  autoCapitalize="none"
                />

                {/* Assignment Options */}
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>ASSIGNMENT</Text>
                <View style={styles.assignmentRow}>
                  <TouchableOpacity
                    style={[
                      styles.assignmentChoice,
                      {
                        backgroundColor: !formIsSubstitute ? theme.greenLight : theme.inputBg,
                        borderColor: !formIsSubstitute ? theme.greenText : theme.inputBorder,
                      },
                    ]}
                    onPress={() => setFormIsSubstitute(false)}
                  >
                    <Feather name="users" size={16} color={!formIsSubstitute ? theme.greenText : theme.textSecondary} />
                    <Text style={[styles.assignmentText, { color: !formIsSubstitute ? theme.greenText : theme.textSecondary, fontWeight: !formIsSubstitute ? '700' : '500' }]}>
                      Playing XI
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.assignmentChoice,
                      {
                        backgroundColor: formIsSubstitute ? theme.greenLight : theme.inputBg,
                        borderColor: formIsSubstitute ? theme.greenText : theme.inputBorder,
                      },
                    ]}
                    onPress={() => setFormIsSubstitute(true)}
                  >
                    <Feather name="shield" size={16} color={formIsSubstitute ? theme.greenText : theme.textSecondary} />
                    <Text style={[styles.assignmentText, { color: formIsSubstitute ? theme.greenText : theme.textSecondary, fontWeight: formIsSubstitute ? '700' : '500' }]}>
                      Substitute
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Save CTA */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSavePlayer} disabled={saving}>
                  <LinearGradient
                    colors={['#A8CD55', '#E3A85B']}
                    style={styles.saveBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.saveBtnTxt}>
                      {saving ? 'Saving...' : editingPlayer ? 'Save Changes' : 'Add to Squad'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Toggle substitute state / Move button inside modal */}
                {editingPlayer && (
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: theme.inputBg }]}
                    onPress={() => {
                      handleToggleSubstitute(editingPlayer);
                    }}
                  >
                    <Feather
                      name={editingPlayer.isSubstitute ? 'users' : 'shield'}
                      size={15}
                      color={theme.text}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.modalActionBtnTxt, { color: theme.text }]}>
                      Move to {editingPlayer.isSubstitute ? 'Playing XI' : 'Substitute Bench'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Delete player inside modal */}
                {editingPlayer && (
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: theme.redLight }]}
                    onPress={() => handleDeletePlayer(editingPlayer.id, editingPlayer.playerName)}
                  >
                    <Feather name="trash-2" size={15} color={theme.red} style={{ marginRight: 6 }} />
                    <Text style={[styles.modalActionBtnTxt, { color: theme.red }]}>
                      Remove from Squad
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
  },
  badgeContainer: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionMarker: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Card Playing XI
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  jerseyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  jerseyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  editCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  playerNameText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },

  // Role badge
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },

  // Substitutes List Layout
  subscribersContainer: {
    gap: 10,
  },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  subAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  subInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  subName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jerseyText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty cards dashed
  emptyCardDashed: {
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptySlotDesc: {
    fontSize: 9,
    marginTop: 2,
  },
  emptyAvatarPlace: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(128,128,128,0.2)',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },

  // Empty State Layout
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#050A08',
    fontSize: 14,
    fontWeight: '900',
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#A8CD55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Dialog Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 440,
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
  },
  assignmentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  assignmentChoice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  assignmentText: {
    fontSize: 13,
  },
  saveBtn: {
    borderRadius: 100,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
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
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 100,
    marginTop: 8,
  },
  modalActionBtnTxt: {
    fontSize: 13,
    fontWeight: '700',
  },
});
