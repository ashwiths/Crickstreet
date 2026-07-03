import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  collection,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { db } from '../../src/services/firebase';
import { s, fs, sp, br, avatarSz, iconSz } from '../../src/theme/responsive';

// Color Palette
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
} as const;

interface Player {
  id: string;
  name: string;
  role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket Keeper';
  playerImage?: string;
  credits?: number;
}

export default function TeamDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const uid = user?.uid || '';
  const { height } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState('');
  
  // Real Database keys
  const [captainId, setCaptainId] = useState('');
  const [viceCaptainId, setViceCaptainId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  
  // Live user list fetched from Firestore
  const [liveUsers, setLiveUsers] = useState<Player[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Selector Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  // Custom Player Creator states
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState<'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket Keeper'>('Batsman');
  const [customCredits, setCustomCredits] = useState('9.0');

  // Load team data from Firestore
  useEffect(() => {
    if (!uid || !id) {
      setLoading(false);
      return;
    }

    async function fetchTeam() {
      try {
        const docRef = doc(db, 'users', uid, 'teams', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setTeamName(data.teamName || 'Unknown Team');
          setCaptainId(data.captainId || '');
          setViceCaptainId(data.viceCaptainId || '');
          setPlayers(data.players || []);
        } else {
          Alert.alert('Error', 'Team not found in database.');
          router.back();
        }
      } catch (err) {
        console.error('Error fetching team:', err);
        Alert.alert('Database Error', 'Could not fetch team details.');
      } finally {
        setLoading(false);
      }
    }

    fetchTeam();
  }, [uid, id]);

  // Load live registered Crickstreet users from Firestore
  useEffect(() => {
    if (!uid) return;

    async function fetchLiveUsers() {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const fetched: Player[] = [];
        usersSnapshot.forEach((userDoc) => {
          const userData = userDoc.data();
          const docId = userDoc.id;
          
          const displayName = userData.displayName || 'Unnamed Player';
          const photoURL = userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D1F3C&color=A8CD55&size=100&bold=true`;
          
          fetched.push({
            id: docId,
            name: displayName,
            role: userData.role || 'Batsman',
            playerImage: photoURL,
            credits: userData.credits || 9.0,
          });
        });
        setLiveUsers(fetched);
      } catch (err) {
        console.error("Error fetching live registered users:", err);
      }
    }

    fetchLiveUsers();
  }, [uid, modalVisible]);

  const recordChange = (updater: () => void) => {
    updater();
    setHasChanges(true);
  };

  // Rearrange order: move player position
  const movePlayer = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === players.length - 1) return;

    recordChange(() => {
      const next = [...players];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      setPlayers(next);
    });
  };

  // Remove player
  const removePlayer = (index: number) => {
    const removedPlayer = players[index];
    recordChange(() => {
      const next = players.filter((_, idx) => idx !== index);
      setPlayers(next);

      // If removed player was Captain or Vice Captain, clear designation
      if (removedPlayer.id === captainId) {
        setCaptainId('');
      }
      if (removedPlayer.id === viceCaptainId) {
        setViceCaptainId('');
      }
    });
  };

  // Designate Captaincy
  const handleSetCaptain = (playerId: string) => {
    recordChange(() => {
      if (captainId === playerId) {
        setCaptainId(''); // toggle off
      } else {
        setCaptainId(playerId);
        if (viceCaptainId === playerId) {
          setViceCaptainId(''); // clear VC if it was same player
        }
      }
    });
  };

  const handleSetViceCaptain = (playerId: string) => {
    recordChange(() => {
      if (viceCaptainId === playerId) {
        setViceCaptainId(''); // toggle off
      } else {
        setViceCaptainId(playerId);
        if (captainId === playerId) {
          setCaptainId(''); // clear Captain if it was same player
        }
      }
    });
  };

  // Add / Swap Player Confirmation
  const selectPlayer = (chosen: Player) => {
    try {
      // Check if player already exists in squad (to prevent duplicates)
      if (players.some((p, idx) => p.id === chosen.id && idx !== activeSlotIndex)) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Roster Error: ${chosen.name} is already selected in this team.`);
        } else {
          Alert.alert('Roster Error', `${chosen.name} is already selected in this team.`);
        }
        return;
      }

      recordChange(() => {
        if (activeSlotIndex !== null) {
          // Swap/Replace
          const oldPlayer = players[activeSlotIndex];
          if (!oldPlayer) {
            throw new Error(`No player found at slot index ${activeSlotIndex}`);
          }
          const next = [...players];
          next[activeSlotIndex] = chosen;
          setPlayers(next);

          // Adjust Captaincy shifts
          if (oldPlayer.id === captainId) {
            setCaptainId(chosen.id);
          }
          if (oldPlayer.id === viceCaptainId) {
            setViceCaptainId(chosen.id);
          }
        } else {
          // Add new
          if (players.length >= 11) {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.alert('Squad Limit: You cannot exceed the maximum 11 players roster limit.');
            } else {
              Alert.alert('Squad Limit', 'You cannot exceed the maximum 11 players roster limit.');
            }
            return;
          }
          setPlayers([...players, chosen]);
        }

        setModalVisible(false);
      });
    } catch (err: any) {
      console.error('Error selecting player:', err);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Selection Error: ${err?.message || 'Failed to select player.'}`);
      } else {
        Alert.alert('Selection Error', err?.message || 'Failed to select player.');
      }
    }
  };

  // Create Custom player form submit
  const handleCreateCustomPlayer = () => {
    try {
      if (!customName.trim()) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Form Error: Please enter a player name.');
        } else {
          Alert.alert('Form Error', 'Please enter a player name.');
        }
        return;
      }

      const creditsVal = parseFloat(customCredits) || 9.0;
      const initialUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(customName.trim())}&background=0D1F3C&color=A8CD55&size=100&bold=true`;
      const generatedId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      selectPlayer({
        id: generatedId,
        name: customName.trim(),
        role: customRole,
        credits: creditsVal,
        playerImage: initialUrl,
      });

      setCustomName('');
    } catch (err: any) {
      console.error('Error creating custom player:', err);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Creation Error: ${err?.message || 'Failed to create player.'}`);
      } else {
        Alert.alert('Creation Error', err?.message || 'Failed to create player.');
      }
    }
  };

  // Save changes to Firestore
  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Roster Validation', 'Please enter a valid Team Name.');
      return;
    }

    if (players.length > 11) {
      Alert.alert('Roster Validation', 'Roster count exceeds the maximum limit of 11 players.');
      return;
    }

    if (players.length > 0) {
      // If a Captain is set, verify they are in the players list
      if (captainId && !players.some((p) => p.id === captainId)) {
        Alert.alert('Roster Validation', 'Designated Captain is not in the player roster.');
        return;
      }
      // If a Vice Captain is set, verify they are in the players list
      if (viceCaptainId && !players.some((p) => p.id === viceCaptainId)) {
        Alert.alert('Roster Validation', 'Designated Vice Captain is not in the player roster.');
        return;
      }
    }

    setSaving(true);
    try {
      const docRef = doc(db, 'users', uid, 'teams', id);
      await setDoc(docRef, {
        teamName: teamName.trim(),
        captainId,
        viceCaptainId,
        players,
        createdAt: new Date().toISOString(),
      });
      setHasChanges(false);
      Alert.alert('Success 🏏', 'Team roster successfully saved to Firestore.');
    } catch (err) {
      console.error('Error saving team:', err);
      Alert.alert('Database Error', 'Could not save roster changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Duplicate team
  // Duplicate team
  const handleDuplicateTeam = async () => {
    const confirmDuplicate = async () => {
      setSaving(true);
      try {
        const colRef = collection(db, 'users', uid, 'teams');
        const docRef = await addDoc(colRef, {
          teamName: `${teamName} (Copy)`,
          captainId,
          viceCaptainId,
          players,
          createdAt: new Date().toISOString(),
        });
        
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Success: Team duplicated successfully.');
          router.replace(`/team-details/${docRef.id}` as any);
        } else {
          Alert.alert('Success', 'Team duplicated successfully.', [
            { text: 'OK', onPress: () => router.replace(`/team-details/${docRef.id}` as any) }
          ]);
        }
      } catch (err) {
        console.error('Error duplicating team:', err);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Database Error: Could not duplicate team.');
        } else {
          Alert.alert('Database Error', 'Could not duplicate team.');
        }
      } finally {
        setSaving(false);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Do you want to clone this team roster into a new card?')) {
        confirmDuplicate();
      }
    } else {
      Alert.alert(
        'Duplicate Team 👥',
        'Do you want to clone this team roster into a new card?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Duplicate', onPress: confirmDuplicate },
        ]
      );
    }
  };

  // Delete team
  const handleDeleteTeam = () => {
    const confirmDelete = async () => {
      try {
        setSaving(true);
        const docRef = doc(db, 'users', uid, 'teams', id as string);
        await deleteDoc(docRef);
        setSaving(false);
        
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Success: Team squad deleted successfully.');
          router.back();
        } else {
          Alert.alert('Deleted', 'Team squad deleted successfully.', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }
      } catch (err) {
        console.error('Error deleting team:', err);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Database Error: Could not delete team.');
        } else {
          Alert.alert('Database Error', 'Could not delete team.');
        }
        setSaving(false);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Are you sure you want to delete ${teamName}? This action cannot be undone.`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Team 🚨',
        `Are you sure you want to delete ${teamName}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  // Share team roster text
  const handleShareTeam = async () => {
    try {
      const rosterLines = players.map((p, i) => {
        let suffix = '';
        if (p.id === captainId) suffix = ' (Captain)';
        else if (p.id === viceCaptainId) suffix = ' (Vice Captain)';
        return `${i + 1}. ${p.name}${suffix} [${p.role}]`;
      });

      const capName = players.find((p) => p.id === captainId)?.name || 'Not set';
      const vcName = players.find((p) => p.id === viceCaptainId)?.name || 'Not set';

      const message = `Crickstreet Team: ${teamName}\nCaptain: ${capName}\nVice Captain: ${vcName}\n\nSelected Players:\n${rosterLines.join('\n')}`;
      
      if (Platform.OS === 'web') {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          window.alert('Roster text copied to clipboard! 📋');
        } else {
          window.alert(message);
        }
      } else {
        await Share.share({ message });
      }
    } catch (err) {
      console.error('Error sharing roster:', err);
    }
  };

  // Back trigger checking for unsaved changes
  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes? ⚠️',
        'You have unsaved changes in your team roster. Do you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard & Go Back', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  // Filtered live registered users list
  const filteredPresets = liveUsers.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const teamInitials = teamName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const captainName = players.find((p) => p.id === captainId)?.name || '';
  const viceCaptainName = players.find((p) => p.id === viceCaptainId)?.name || '';

  return (
    <View style={styles.container}>
      <LinearGradient colors={[C.bgDark, C.bgMid, C.bgLight]} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Roster Management</Text>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <Animated.Image
              source={{ uri: 'https://ui-avatars.com/api/?name=CS&background=A8CD55&color=0A1628&size=120&bold=true' }}
              style={[styles.pulseLoader, { opacity: 0.8 }]}
            />
            <Text style={styles.loadingText}>Loading squad roster...</Text>
          </View>
        ) : (
          <FlatList
            data={players}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.banner}>
                {/* Logo and Name Editing row */}
                <View style={styles.bannerLogoRow}>
                  <LinearGradient
                    colors={['#A8CD55', '#E3A85B']}
                    style={styles.teamLogoBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.teamLogoText}>{teamInitials || 'CS'}</Text>
                  </LinearGradient>
                  
                  <View style={styles.teamNameContainer}>
                    <TextInput
                      style={styles.teamNameInput}
                      value={teamName}
                      onChangeText={(val) => recordChange(() => setTeamName(val))}
                      placeholder="Enter Team Name"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                    <Feather name="edit-2" size={14} color={C.green} style={styles.pencilIcon} />
                  </View>
                </View>

                {/* Captain / VC Status bar */}
                <View style={styles.leaderSummaryBar}>
                  <View style={styles.summaryChip}>
                    <MaterialCommunityIcons name="crown" size={14} color={C.gold} />
                    <Text style={styles.summaryChipText} numberOfLines={1}>
                      C: {captainName || 'Select below'}
                    </Text>
                  </View>
                  <View style={styles.summaryChip}>
                    <Feather name="shield" size={13} color={C.green} />
                    <Text style={styles.summaryChipText} numberOfLines={1}>
                      VC: {viceCaptainName || 'Select below'}
                    </Text>
                  </View>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeTxt}>{players.length}/11</Text>
                  </View>
                </View>

                {/* Add Player action banner */}
                {players.length < 11 && (
                  <TouchableOpacity
                    style={styles.addPlayerCard}
                    onPress={() => {
                      setActiveSlotIndex(null);
                      setModalVisible(true);
                    }}
                  >
                    <Feather name="user-plus" size={18} color={C.green} />
                    <Text style={styles.addPlayerCardTxt}>Add Player to Squad ({11 - players.length} slots left)</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={({ item, index }) => {
              const isCap = item.id === captainId;
              const isVc = item.id === viceCaptainId;

              const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=0D1F3C&color=A8CD55&size=100&bold=true`;

              return (
                <View style={styles.playerCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']}
                    style={StyleSheet.absoluteFillObject}
                  />

                  {/* Left Side: Index & Avatar */}
                  <View style={styles.cardLeftCol}>
                    <Text style={styles.playerIndexTxt}>{index + 1}</Text>
                    
                    <View style={styles.avatarRing}>
                      <Animated.Image source={{ uri: item.playerImage || fallbackImage }} style={styles.playerAvatar} />
                      <View style={styles.roleMiniBadge}>
                        <Text style={styles.roleMiniText}>
                          {item.role === 'Batsman' ? 'BAT' : item.role === 'Bowler' ? 'BOWL' : item.role === 'All-Rounder' ? 'AR' : 'WK'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Middle Column: Name & Details */}
                  <View style={styles.cardMidCol}>
                    <Text style={styles.playerNameTxt} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.roleCreditRow}>
                      <Text style={styles.roleSubTxt}>{item.role}</Text>
                      {item.credits !== undefined && (
                        <>
                          <View style={styles.statDot} />
                          <Text style={styles.creditSubTxt}>{item.credits} Cr</Text>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Right Column: Roles C / VC Toggles */}
                  <View style={styles.cardRightCol}>
                    <TouchableOpacity
                      style={[styles.roleTagBtn, isCap && styles.roleTagActiveC]}
                      onPress={() => handleSetCaptain(item.id)}
                    >
                      <Text style={[styles.roleTagBtnTxt, isCap && styles.roleTagActiveTxt]}>C</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.roleTagBtn, isVc && styles.roleTagActiveVC]}
                      onPress={() => handleSetViceCaptain(item.id)}
                    >
                      <Text style={[styles.roleTagBtnTxt, isVc && styles.roleTagActiveTxt]}>VC</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Far Right: Reordering / Rearranging + Delete */}
                  <View style={styles.cardFarRightCol}>
                    <View style={styles.rearrangeControls}>
                      <TouchableOpacity
                        style={styles.rearrangeArrow}
                        onPress={() => movePlayer(index, 'up')}
                        disabled={index === 0}
                      >
                        <Feather name="chevron-up" size={14} color={index === 0 ? 'rgba(255,255,255,0.1)' : C.textGray} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rearrangeArrow}
                        onPress={() => movePlayer(index, 'down')}
                        disabled={index === players.length - 1}
                      >
                        <Feather name="chevron-down" size={14} color={index === players.length - 1 ? 'rgba(255,255,255,0.1)' : C.textGray} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.cardActionIconBtn}
                      onPress={() => {
                        setActiveSlotIndex(index);
                        setModalVisible(true);
                      }}
                    >
                      <Feather name="refresh-cw" size={13} color={C.green} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cardActionIconBtn}
                      onPress={() => removePlayer(index)}
                    >
                      <Feather name="trash-2" size={13} color={C.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="cricket" size={48} color={C.green} />
                <Text style={styles.emptyTitle}>Squad Roster is Empty</Text>
                <Text style={styles.emptyDesc}>
                  Select players from the registered user list or enter custom local players for your squad.
                </Text>
                <TouchableOpacity
                  style={styles.createRosterBtn}
                  onPress={() => {
                    setActiveSlotIndex(null);
                    setModalVisible(true);
                  }}
                >
                  <LinearGradient
                    colors={['#A8CD55', '#4CAF50']}
                    style={styles.createRosterGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.createRosterBtnTxt}>+ Add Roster Player</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={
              players.length > 0 ? (
                <View style={styles.footerContainer}>
                  {/* Save button */}
                  <TouchableOpacity style={styles.saveTeamBtn} onPress={handleSaveTeam} disabled={saving}>
                    <LinearGradient
                      colors={['#A8CD55', '#E3A85B']}
                      style={styles.saveTeamGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.saveTeamBtnTxt}>
                        {saving ? 'Saving changes...' : 'Save Roster Settings'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Actions Grid */}
                  <View style={styles.actionsGrid}>
                    <TouchableOpacity style={styles.gridActionBtn} onPress={handleShareTeam}>
                      <Feather name="share-2" size={16} color={C.white} />
                      <Text style={styles.gridActionTxt}>Share Team</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.gridActionBtn} onPress={handleDuplicateTeam}>
                      <Feather name="copy" size={16} color={C.green} />
                      <Text style={[styles.gridActionTxt, { color: C.green }]}>Duplicate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.gridActionBtn} onPress={handleDeleteTeam}>
                      <Feather name="trash-2" size={16} color={C.red} />
                      <Text style={[styles.gridActionTxt, { color: C.red }]}>Delete Squad</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* Player Selector Modal Overlay */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: height * 0.82 }]}>
              <LinearGradient colors={['#0D1F3C', '#0A1628']} style={StyleSheet.absoluteFillObject} />

              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {activeSlotIndex !== null ? 'Replace Player' : 'Add Player to Squad'}
                </Text>
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={20} color={C.white} />
                </TouchableOpacity>
              </View>

              {/* Form Scroll list */}
              <FlatList
                style={{ flex: 1 }}
                data={filteredPresets}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.modalList}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <View style={styles.modalHeaderComp}>
                    {/* Search preset */}
                    <View style={styles.searchBarContainer}>
                      <Feather name="search" size={16} color={C.textGray} />
                      <TextInput
                        style={styles.searchBar}
                        placeholder="Search app users (e.g. Ashil)"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                    </View>

                    {/* Custom Player Creator */}
                    <Text style={styles.modalSectionTitle}>OR CREATE CUSTOM PLAYER</Text>
                    <View style={styles.creatorCard}>
                      <TextInput
                        style={styles.creatorInput}
                        placeholder="Player Name"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={customName}
                        onChangeText={setCustomName}
                      />

                      <View style={styles.creatorSelectRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.creatorLabel}>ROLE</Text>
                          <View style={styles.rolePickerSelect}>
                            <FlatList
                              data={['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper']}
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              keyExtractor={(item) => item}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  style={[
                                    styles.roleOptionChip,
                                    customRole === item && styles.roleOptionChipActive,
                                  ]}
                                  onPress={() => setCustomRole(item as any)}
                                >
                                  <Text
                                    style={[
                                      styles.roleOptionChipTxt,
                                      customRole === item && styles.roleOptionChipTxtActive,
                                    ]}
                                  >
                                    {item === 'Wicket Keeper' ? 'WK' : item === 'All-Rounder' ? 'AR' : item === 'Batsman' ? 'BAT' : 'BOWL'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              contentContainerStyle={{ gap: 6 }}
                            />
                          </View>
                        </View>

                        <View style={{ width: 80 }}>
                          <Text style={styles.creatorLabel}>CREDITS</Text>
                          <TextInput
                            style={styles.creatorInputCredits}
                            keyboardType="numeric"
                            value={customCredits}
                            onChangeText={setCustomCredits}
                          />
                        </View>
                      </View>

                      <TouchableOpacity style={styles.addCustomBtn} onPress={handleCreateCustomPlayer}>
                        <Text style={styles.addCustomBtnTxt}>+ Save Custom Player</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.modalSectionTitle}>TAP CRICKSTREET USER TO SELECT</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.presetPlayerRow} onPress={() => selectPlayer(item)}>
                    <View style={styles.presetAvatarRing}>
                      <Animated.Image source={{ uri: item.playerImage || '' }} style={styles.presetAvatar} />
                    </View>
                    <View style={styles.presetDetails}>
                      <Text style={styles.presetNameTxt}>{item.name}</Text>
                      <Text style={styles.presetRoleTxt}>{item.role}</Text>
                    </View>
                    {item.credits !== undefined && (
                      <View style={styles.presetCreditsContainer}>
                        <Text style={styles.presetCreditsTxt}>{item.credits} Cr</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.presetsEmptyTxt}>No matching registered users found.</Text>
                }
              />
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
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  backBtn: {
    width: avatarSz.md2,
    height: avatarSz.md2,
    borderRadius: avatarSz.md2 / 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fs.lg,
    fontWeight: '700',
    color: C.white,
  },

  // Loader
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.md,
  },
  pulseLoader: {
    width: s(60),
    height: s(60),
    borderRadius: s(30),
  },
  loadingText: {
    color: C.textGray,
    fontSize: fs.md,
    fontWeight: '600',
  },

  // List layout
  listContainer: {
    paddingHorizontal: sp.lg,
    paddingTop: sp.md2,
    paddingBottom: s(120),
  },

  // Banner details
  banner: {
    marginBottom: sp.lg,
  },
  bannerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    marginBottom: sp.lg,
  },
  teamLogoBadge: {
    width: s(52),
    height: s(52),
    borderRadius: br.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    fontSize: fs.xl,
    fontWeight: '900',
    color: '#050A08',
  },
  teamNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    borderBottomWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingBottom: sp.xs,
  },
  teamNameInput: {
    flex: 1,
    fontSize: fs.xl2,
    fontWeight: '800',
    color: C.white,
    padding: 0,
  },
  pencilIcon: {
    opacity: 0.8,
  },

  // Leaders display row
  leaderSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: sp.sm,
    borderRadius: br.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: sp.lg,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: br.md,
    flex: 2,
  },
  summaryChipText: {
    fontSize: fs.sm,
    fontWeight: '600',
    color: C.white,
  },
  countBadge: {
    backgroundColor: 'rgba(168,205,85,0.15)',
    borderWidth: 1,
    borderColor: C.green,
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs,
    borderRadius: br.md,
    flex: 1,
    alignItems: 'center',
  },
  countBadgeTxt: {
    color: C.green,
    fontSize: fs.sm,
    fontWeight: '800',
  },

  // Add slots
  addPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    backgroundColor: 'rgba(168,205,85,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(168,205,85,0.2)',
    paddingVertical: sp.md,
    borderRadius: br.lg,
    borderStyle: 'dashed',
  },
  addPlayerCardTxt: {
    color: C.green,
    fontSize: fs.sm,
    fontWeight: '700',
  },

  // Player cards
  playerCard: {
    backgroundColor: C.glassBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: br.lg,
    padding: sp.sm,
    marginBottom: sp.sm,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  playerIndexTxt: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: C.textGray,
    width: s(14),
  },
  avatarRing: {
    position: 'relative',
  },
  playerAvatar: {
    width: s(42),
    height: s(42),
    borderRadius: s(21),
    backgroundColor: '#0D1F3C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#0A1628',
    borderWidth: 0.8,
    borderColor: C.green,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: br.xs,
  },
  roleMiniText: {
    fontSize: fs.xxs,
    fontWeight: '900',
    color: C.green,
  },
  cardMidCol: {
    flex: 1,
    paddingLeft: sp.md,
  },
  playerNameTxt: {
    fontSize: fs.md,
    fontWeight: '700',
    color: C.white,
    marginBottom: 3,
  },
  roleCreditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  roleSubTxt: {
    fontSize: fs.sm,
    color: C.textGray,
  },
  statDot: {
    width: s(3),
    height: s(3),
    borderRadius: s(1.5),
    backgroundColor: C.textGray,
  },
  creditSubTxt: {
    fontSize: fs.sm,
    color: C.gold,
    fontWeight: '600',
  },
  cardRightCol: {
    flexDirection: 'row',
    gap: sp.xs,
    paddingHorizontal: sp.xs,
  },
  roleTagBtn: {
    width: s(32),
    height: s(28),
    borderRadius: br.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  roleTagBtnTxt: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: C.textGray,
  },
  roleTagActiveC: {
    backgroundColor: 'rgba(227,168,91,0.2)',
    borderColor: C.gold,
  },
  roleTagActiveVC: {
    backgroundColor: 'rgba(168,205,85,0.2)',
    borderColor: C.green,
  },
  roleTagActiveTxt: {
    color: C.white,
  },

  // Rearranges far right
  cardFarRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    marginLeft: sp.xs,
  },
  rearrangeControls: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  rearrangeArrow: {
    padding: 1,
  },
  cardActionIconBtn: {
    width: s(28),
    height: s(28),
    borderRadius: br.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(60),
    paddingHorizontal: sp.xl,
  },
  emptyTitle: {
    fontSize: fs.md2,
    fontWeight: '800',
    color: C.white,
    marginTop: sp.md,
    marginBottom: sp.xs,
  },
  emptyDesc: {
    fontSize: fs.sm,
    color: C.textGray,
    textAlign: 'center',
    lineHeight: fs.sm * 1.5,
    marginBottom: sp.lg,
  },
  createRosterBtn: {
    borderRadius: br.full,
    overflow: 'hidden',
  },
  createRosterGradient: {
    paddingHorizontal: sp.xl,
    paddingVertical: sp.sm,
  },
  createRosterBtnTxt: {
    color: '#050A08',
    fontSize: fs.sm,
    fontWeight: '900',
  },

  // Footer layout
  footerContainer: {
    marginTop: sp.lg,
    gap: sp.md,
  },
  saveTeamBtn: {
    borderRadius: br.full,
    overflow: 'hidden',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  saveTeamGradient: {
    paddingVertical: sp.md,
    alignItems: 'center',
  },
  saveTeamBtnTxt: {
    color: '#050A08',
    fontSize: fs.md,
    fontWeight: '900',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: sp.sm,
  },
  gridActionBtn: {
    flex: 1,
    height: s(44),
    backgroundColor: C.glassBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: br.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.xs,
  },
  gridActionTxt: {
    color: C.white,
    fontSize: fs.sm,
    fontWeight: '700',
  },

  // Modal selector layout
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: br.xxl,
    borderTopRightRadius: br.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    maxWidth: s(600),
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.xl,
    paddingTop: sp.md3,
    paddingBottom: sp.md,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  modalTitle: {
    fontSize: fs.md2,
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
  modalList: {
    paddingHorizontal: sp.xl,
    paddingBottom: s(40),
  },
  modalHeaderComp: {
    paddingTop: sp.lg,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: br.md,
    paddingHorizontal: sp.md,
    height: s(44),
    marginBottom: sp.lg,
  },
  searchBar: {
    flex: 1,
    color: C.white,
    fontSize: fs.md,
    padding: 0,
  },
  modalSectionTitle: {
    color: C.textGray,
    fontSize: fs.xs,
    fontWeight: '800',
    letterSpacing: 1.0,
    marginBottom: sp.sm,
  },

  // Creator card
  creatorCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: br.xl,
    padding: sp.lg,
    marginBottom: sp.xl,
  },
  creatorInput: {
    height: s(42),
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: br.md,
    paddingHorizontal: sp.md,
    color: C.white,
    fontSize: fs.md,
    marginBottom: sp.md,
  },
  creatorSelectRow: {
    flexDirection: 'row',
    gap: sp.md,
    marginBottom: sp.lg,
  },
  creatorLabel: {
    color: C.textGray,
    fontSize: fs.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: sp.xs,
  },
  rolePickerSelect: {
    height: s(38),
    justifyContent: 'center',
  },
  roleOptionChip: {
    paddingHorizontal: sp.md,
    height: s(28),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: br.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  roleOptionChipActive: {
    backgroundColor: 'rgba(168,205,85,0.18)',
    borderColor: C.green,
  },
  roleOptionChipTxt: {
    fontSize: fs.xs,
    fontWeight: '700',
    color: C.textGray,
  },
  roleOptionChipTxtActive: {
    color: C.green,
    fontWeight: '900',
  },
  creatorInputCredits: {
    height: s(36),
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: br.md,
    textAlign: 'center',
    color: C.white,
    fontSize: fs.md,
    fontWeight: '700',
  },
  addCustomBtn: {
    height: s(38),
    backgroundColor: 'rgba(168,205,85,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168,205,85,0.25)',
    borderRadius: br.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCustomBtnTxt: {
    color: C.green,
    fontSize: fs.sm,
    fontWeight: '700',
  },

  // Preset row layout
  presetPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.md,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  presetAvatarRing: {
    width: s(38),
    height: s(38),
    borderRadius: s(19),
    overflow: 'hidden',
    backgroundColor: '#0D1F3C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  presetAvatar: {
    width: '100%',
    height: '100%',
  },
  presetDetails: {
    flex: 1,
    paddingLeft: sp.md,
  },
  presetNameTxt: {
    fontSize: fs.md,
    fontWeight: '700',
    color: C.white,
    marginBottom: 2,
  },
  presetRoleTxt: {
    fontSize: fs.xs,
    color: C.textGray,
  },
  presetCreditsContainer: {
    backgroundColor: 'rgba(227,168,91,0.1)',
    borderWidth: 0.8,
    borderColor: C.gold,
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs,
    borderRadius: br.sm,
  },
  presetCreditsTxt: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: C.gold,
  },
  presetsEmptyTxt: {
    color: C.textGray,
    fontSize: fs.sm,
    textAlign: 'center',
    marginTop: sp.lg,
    fontStyle: 'italic',
  },
}) as any;
