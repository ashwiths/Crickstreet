import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, fs, sp, br, avatarSz } from '../src/theme/responsive';
import { useAuth } from '../src/hooks/useAuth';
import { db } from '../src/services/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

interface TournamentMatch {
  id: string;
  teamAName: string;
  teamBName: string;
  teamAScore: string; // e.g. "120/5"
  teamBScore: string; // e.g. "80/3"
  teamAOvers: string; // e.g. "20"
  teamBOvers: string; // e.g. "12.4"
  status: 'upcoming' | 'live' | 'completed';
  statusText: string; // e.g. "Team A won by 40 runs"
  date: string;
}

interface Tournament {
  id: string;
  name: string;
  format: string; // T20, T10, etc.
  overs: number;
  createdAt: any;
  matches: TournamentMatch[];
}

export default function TournamentModeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'scoreboard'>('tournaments');

  // Active Selected Tournament Detail View
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  // Modals visibility
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [addMatchModalVisible, setAddMatchModalVisible] = useState(false);
  const [scoreUpdateModalVisible, setScoreUpdateModalVisible] = useState(false);

  // Create Tournament Form States
  const [newTourName, setNewTourName] = useState('');
  const [newTourFormat, setNewTourFormat] = useState('T20');
  const [newTourOvers, setNewTourOvers] = useState('20');

  // Add Match Form States
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));

  // Score Update Form States
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [teamAScore, setTeamAScore] = useState('0/0');
  const [teamBScore, setTeamBScore] = useState('0/0');
  const [teamAOvers, setTeamAOvers] = useState('0');
  const [teamBOvers, setTeamBOvers] = useState('0');
  const [matchStatus, setMatchStatus] = useState<'upcoming' | 'live' | 'completed'>('upcoming');
  const [matchStatusText, setMatchStatusText] = useState('');

  // Fetch Tournaments in Real-Time
  useEffect(() => {
    if (!user) return;

    const colRef = collection(db, 'users', user.uid, 'tournaments');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: Tournament[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            name: data.name || 'Unnamed Tournament',
            format: data.format || 'T20',
            overs: data.overs || 20,
            createdAt: data.createdAt,
            matches: data.matches || [],
          } as Tournament);
        });
        setTournaments(list);
        setLoading(false);

        // Keep selected tournament reference fresh
        if (selectedTournament) {
          const updated = list.find((t) => t.id === selectedTournament.id);
          if (updated) setSelectedTournament(updated);
        }
      },
      (err) => {
        console.error('Error fetching tournaments:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, selectedTournament?.id]);

  // Aggregate live scoreboard matches
  const liveMatches = useMemo(() => {
    const list: { tournamentName: string; tournamentId: string; match: TournamentMatch }[] = [];
    tournaments.forEach((t) => {
      t.matches.forEach((m) => {
        if (m.status === 'live') {
          list.push({
            tournamentName: t.name,
            tournamentId: t.id,
            match: m,
          });
        }
      });
    });
    return list;
  }, [tournaments]);

  // Create Tournament Handler
  const handleCreateTournament = async () => {
    if (!newTourName.trim()) {
      Alert.alert('Validation Error', 'Tournament name cannot be empty.');
      return;
    }
    if (!user) return;

    try {
      const colRef = collection(db, 'users', user.uid, 'tournaments');
      await addDoc(colRef, {
        name: newTourName.trim(),
        format: newTourFormat,
        overs: parseInt(newTourOvers, 10) || 20,
        createdAt: serverTimestamp(),
        matches: [],
      });

      setCreateModalVisible(false);
      setNewTourName('');
      setNewTourFormat('T20');
      setNewTourOvers('20');
      Alert.alert('Tournament Created 🏆', 'Start scheduling fixtures now.');
    } catch (err) {
      console.error('Error creating tournament:', err);
      Alert.alert('Error', 'Failed to create tournament.');
    }
  };

  // Add Match Handler
  const handleAddMatch = async () => {
    if (!selectedTournament || !user) return;
    if (!teamA.trim() || !teamB.trim()) {
      Alert.alert('Validation Error', 'Please fill in both team names.');
      return;
    }

    try {
      const docRef = doc(db, 'users', user.uid, 'tournaments', selectedTournament.id);
      const newMatch: TournamentMatch = {
        id: 'm_' + Date.now(),
        teamAName: teamA.trim(),
        teamBName: teamB.trim(),
        teamAScore: '0/0',
        teamBScore: '0/0',
        teamAOvers: '0',
        teamBOvers: '0',
        status: 'upcoming',
        statusText: 'Scheduled',
        date: matchDate,
      };

      const updatedMatches = [...selectedTournament.matches, newMatch];
      await updateDoc(docRef, {
        matches: updatedMatches,
      });

      setAddMatchModalVisible(false);
      setTeamA('');
      setTeamB('');
      Alert.alert('Fixture Scheduled 🏏', 'Match added to tournament schedule.');
    } catch (err) {
      console.error('Error adding match:', err);
      Alert.alert('Error', 'Failed to schedule match.');
    }
  };

  // Delete Tournament Handler
  const handleDeleteTournament = (id: string) => {
    if (!user) return;
    Alert.alert(
      'Delete Tournament 🗑️',
      'Are you sure you want to delete this tournament and all its fixtures? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', user.uid, 'tournaments', id));
              setSelectedTournament(null);
            } catch (err) {
              console.error('Error deleting tournament:', err);
            }
          },
        },
      ]
    );
  };

  // Update Score Handler
  const handleUpdateScore = async () => {
    if (!selectedTournament || !selectedMatch || !user) return;

    try {
      const docRef = doc(db, 'users', user.uid, 'tournaments', selectedTournament.id);
      const updatedMatches = selectedTournament.matches.map((m) => {
        if (m.id === selectedMatch.id) {
          return {
            ...m,
            teamAScore: teamAScore.trim(),
            teamBScore: teamBScore.trim(),
            teamAOvers: teamAOvers.trim(),
            teamBOvers: teamBOvers.trim(),
            status: matchStatus,
            statusText: matchStatusText.trim() || getDefaultStatusText(m.teamAName, m.teamBName),
          };
        }
        return m;
      });

      await updateDoc(docRef, {
        matches: updatedMatches,
      });

      setScoreUpdateModalVisible(false);
      setSelectedMatch(null);
      Alert.alert('Scoreboard Updated ⚡', 'Live score saved successfully.');
    } catch (err) {
      console.error('Error updating match score:', err);
      Alert.alert('Error', 'Failed to update score.');
    }
  };

  const getDefaultStatusText = (teamA: string, teamB: string) => {
    if (matchStatus === 'upcoming') return 'Scheduled';
    if (matchStatus === 'live') return 'Match In Progress';
    return 'Match Completed';
  };

  const openScoreUpdateModal = (tournamentId: string, match: TournamentMatch) => {
    const tournament = tournaments.find((t) => t.id === tournamentId);
    if (!tournament) return;

    setSelectedTournament(tournament);
    setSelectedMatch(match);
    setTeamAScore(match.teamAScore);
    setTeamBScore(match.teamBScore);
    setTeamAOvers(match.teamAOvers);
    setTeamBOvers(match.teamBOvers);
    setMatchStatus(match.status);
    setMatchStatusText(match.statusText);
    setScoreUpdateModalVisible(true);
  };

  const getStatusColor = (status: TournamentMatch['status']) => {
    if (status === 'live') return { bg: '#FFECEC', text: '#FF4D4D', label: 'LIVE' };
    if (status === 'completed') return { bg: '#EAF6E3', text: '#59C749', label: 'FINISHED' };
    return { bg: '#F2F2F2', text: '#8A8A8A', label: 'UPCOMING' };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0D0B" />
      <LinearGradient
        colors={['#101510', '#1A2E16', '#F3F4F1']}
        locations={[0, 0.35, 0.9]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { height: 200 + insets.top }]}
      />

      <View style={styles.safeArea}>
        {/* Header Navigation */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}
        >
          <TouchableOpacity onPress={() => {
            if (selectedTournament) {
              setSelectedTournament(null);
            } else {
              router.back();
            }
          }} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.pageTitle}>
              {selectedTournament ? selectedTournament.name : 'Tournament Hub 🏆'}
            </Text>
            <Text style={styles.pageSubtitle}>
              {selectedTournament
                ? `${selectedTournament.format} Format • ${selectedTournament.overs} Overs`
                : 'Manage leagues, matches, and real-time scores'}
            </Text>
          </View>
          {selectedTournament && (
            <TouchableOpacity
              onPress={() => handleDeleteTournament(selectedTournament.id)}
              style={styles.deleteTourBtn}
            >
              <Feather name="trash-2" size={18} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#59C749" />
            <Text style={styles.loadingTxt}>Loading Tournament Data...</Text>
          </View>
        ) : selectedTournament ? (
          /* ==============================================================
             TOURNAMENT DETAIL VIEW
             ============================================================== */
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          >
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>FIXTURES & SCHEDULE</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.addMatchButton}
                  onPress={() => setAddMatchModalVisible(true)}
                >
                  <Feather name="plus" size={14} color="#FFF" />
                  <Text style={styles.addMatchBtnText}>Schedule Match</Text>
                </TouchableOpacity>
              </View>

              {selectedTournament.matches.length > 0 ? (
                selectedTournament.matches.map((m) => {
                  const statusInfo = getStatusColor(m.status);
                  return (
                    <View key={m.id} style={styles.matchCard}>
                      <View style={styles.matchTop}>
                        <Text style={styles.matchDate}>{m.date}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                          <Text style={[styles.statusText, { color: statusInfo.text }]}>
                            {statusInfo.label}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.vsRow}>
                        <View style={styles.teamCol}>
                          <Text style={styles.teamName} numberOfLines={1}>
                            {m.teamAName}
                          </Text>
                          {m.status !== 'upcoming' && (
                            <Text style={styles.scoreText}>
                              {m.teamAScore} <Text style={styles.oversText}>({m.teamAOvers} Ov)</Text>
                            </Text>
                          )}
                        </View>

                        <Text style={styles.vsText}>VS</Text>

                        <View style={[styles.teamCol, { alignItems: 'flex-end' }]}>
                          <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
                            {m.teamBName}
                          </Text>
                          {m.status !== 'upcoming' && (
                            <Text style={styles.scoreText}>
                              {m.teamBScore} <Text style={styles.oversText}>({m.teamBOvers} Ov)</Text>
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.cardDivider} />

                      <View style={styles.matchBottom}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.metaStatusText} numberOfLines={1}>
                            💬 {m.statusText}
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => openScoreUpdateModal(selectedTournament.id, m)}
                          style={styles.updateScoreBtn}
                        >
                          <MaterialCommunityIcons name="scoreboard" size={14} color="#0A0D0A" />
                          <Text style={styles.updateScoreBtnTxt}>Update Score</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No fixtures scheduled yet.</Text>
                  <TouchableOpacity
                    style={styles.emptyActionBtn}
                    onPress={() => setAddMatchModalVisible(true)}
                  >
                    <Text style={styles.emptyActionBtnTxt}>Add First Match</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </ScrollView>
        ) : (
          /* ==============================================================
             TOURNAMENTS HUB HOME LIST
             ============================================================== */
          <>
            {/* Filter Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'tournaments' && styles.tabButtonActive]}
                onPress={() => setActiveTab('tournaments')}
              >
                <Text style={[styles.tabText, activeTab === 'tournaments' && styles.tabTextActive]}>
                  Tournaments ({tournaments.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'scoreboard' && styles.tabButtonActive]}
                onPress={() => setActiveTab('scoreboard')}
              >
                <Text style={[styles.tabText, activeTab === 'scoreboard' && styles.tabTextActive]}>
                  Live Board ({liveMatches.length})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
            >
              {activeTab === 'tournaments' ? (
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                  <View style={styles.createBanner}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.bannerTitle}>Host a Tournament 🏆</Text>
                      <Text style={styles.bannerSubtitle}>
                        Organize team fixtures and keep real-time live scoreboard records.
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.createBtn}
                      onPress={() => setCreateModalVisible(true)}
                    >
                      <Text style={styles.createBtnTxt}>Create</Text>
                    </TouchableOpacity>
                  </View>

                  {tournaments.length > 0 ? (
                    tournaments.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={styles.tourCard}
                        activeOpacity={0.9}
                        onPress={() => setSelectedTournament(t)}
                      >
                        <View style={styles.tourCardHeader}>
                          <View style={styles.tourIconWrap}>
                            <MaterialCommunityIcons name="trophy" size={22} color="#59C749" />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.tourName}>{t.name}</Text>
                            <Text style={styles.tourOvers}>
                              {t.format} Format • {t.overs} Overs
                            </Text>
                          </View>
                          <Feather name="chevron-right" size={18} color="#CCCCCC" />
                        </View>
                        <View style={styles.tourMetaRow}>
                          <View style={styles.metaItem}>
                            <Feather name="calendar" size={12} color="#8A8A8A" />
                            <Text style={styles.metaItemTxt}>
                              {t.matches.length} Fixtures
                            </Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Feather name="activity" size={12} color="#8A8A8A" />
                            <Text style={styles.metaItemTxt}>
                              {t.matches.filter((m) => m.status === 'live').length} Active Live
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>You haven&apos;t created any tournaments.</Text>
                      <Text style={styles.emptySubText}>
                        Create one now and manage your community matches!
                      </Text>
                    </View>
                  )}
                </Animated.View>
              ) : (
                /* LIVE SCOREBOARDS */
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                  {liveMatches.length > 0 ? (
                    liveMatches.map(({ tournamentName, tournamentId, match }) => (
                      <View key={match.id} style={styles.liveScoreCard}>
                        <View style={styles.liveHeader}>
                          <Text style={styles.liveTourLabel}>🏆 {tournamentName}</Text>
                          <View style={styles.redDotContainer}>
                            <View style={styles.redDot} />
                            <Text style={styles.liveLabelText}>LIVE SCOREBOARD</Text>
                          </View>
                        </View>

                        <View style={styles.liveVsRow}>
                          <View style={styles.liveTeamCol}>
                            <Text style={styles.liveTeamName}>{match.teamAName}</Text>
                            <Text style={styles.liveScoreTxt}>{match.teamAScore}</Text>
                            <Text style={styles.liveOversTxt}>{match.teamAOvers} Ov</Text>
                          </View>

                          <View style={styles.liveVsCol}>
                            <Text style={styles.liveVsDivider}>VS</Text>
                          </View>

                          <View style={[styles.liveTeamCol, { alignItems: 'flex-end' }]}>
                            <Text style={[styles.liveTeamName, { textAlign: 'right' }]}>
                              {match.teamBName}
                            </Text>
                            <Text style={styles.liveScoreTxt}>{match.teamBScore}</Text>
                            <Text style={styles.liveOversTxt}>{match.teamBOvers} Ov</Text>
                          </View>
                        </View>

                        <View style={styles.cardDivider} />

                        <View style={styles.liveFooterRow}>
                          <Text style={styles.liveStatusTxt} numberOfLines={1}>
                            💬 {match.statusText}
                          </Text>
                          <TouchableOpacity
                            style={styles.liveQuickUpdateBtn}
                            onPress={() => openScoreUpdateModal(tournamentId, match)}
                          >
                            <Feather name="edit" size={12} color="#0A0D0A" />
                            <Text style={styles.liveQuickUpdateBtnTxt}>Score</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyCard}>
                      <MaterialCommunityIcons name="scoreboard-outline" size={42} color="#CCCCCC" />
                      <Text style={[styles.emptyText, { marginTop: 12 }]}>
                        No matches are currently active.
                      </Text>
                      <Text style={styles.emptySubText}>
                        Schedule matches and mark them as Live to display scores here.
                      </Text>
                    </View>
                  )}
                </Animated.View>
              )}
            </ScrollView>
          </>
        )}
      </View>

      {/* ==============================================================
         MODALS RENDER AREA
         ============================================================== */}

      {/* Modal 1: Create Tournament */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Tournament 🏆</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Feather name="x" size={20} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>TOURNAMENT NAME</Text>
            <TextInput
              style={styles.modalInput}
              value={newTourName}
              onChangeText={setNewTourName}
              placeholder="e.g. Crickstreet Premier League"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.formRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.modalLabel}>FORMAT</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newTourFormat}
                  onChangeText={setNewTourFormat}
                  placeholder="e.g. T20, T10, Custom"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>OVERS COUNT</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newTourOvers}
                  onChangeText={setNewTourOvers}
                  keyboardType="numeric"
                  placeholder="Overs"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateTournament}>
              <Text style={styles.modalSubmitBtnTxt}>Create Tournament</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Add Match */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addMatchModalVisible}
        onRequestClose={() => setAddMatchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Fixture 🏏</Text>
              <TouchableOpacity onPress={() => setAddMatchModalVisible(false)}>
                <Feather name="x" size={20} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>TEAM A</Text>
            <TextInput
              style={styles.modalInput}
              value={teamA}
              onChangeText={setTeamA}
              placeholder="Team A Name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>TEAM B</Text>
            <TextInput
              style={styles.modalInput}
              value={teamB}
              onChangeText={setTeamB}
              placeholder="Team B Name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>DATE / TIME</Text>
            <TextInput
              style={styles.modalInput}
              value={matchDate}
              onChangeText={setMatchDate}
              placeholder="e.g. July 12, 4:00 PM"
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddMatch}>
              <Text style={styles.modalSubmitBtnTxt}>Schedule Match</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Update Match Score */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={scoreUpdateModalVisible}
        onRequestClose={() => setScoreUpdateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.modalContent, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Live Scorecard ⚡</Text>
                <TouchableOpacity onPress={() => setScoreUpdateModalVisible(false)}>
                  <Feather name="x" size={20} color="#1A1A1A" />
                </TouchableOpacity>
              </View>

              {selectedMatch && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.modalMatchSummary}>
                    {selectedMatch.teamAName} vs {selectedMatch.teamBName}
                  </Text>
                </View>
              )}

              {/* Status Picker Buttons */}
              <Text style={styles.modalLabel}>MATCH STATUS</Text>
              <View style={styles.statusPickerRow}>
                {(['upcoming', 'live', 'completed'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusPickerBtn,
                      matchStatus === st && styles.statusPickerBtnActive,
                    ]}
                    onPress={() => setMatchStatus(st)}
                  >
                    <Text
                      style={[
                        styles.statusPickerTxt,
                        matchStatus === st && styles.statusPickerTxtActive,
                      ]}
                    >
                      {st.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Score Input Groups */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.modalLabel}>TEAM A SCORE</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={teamAScore}
                    onChangeText={setTeamAScore}
                    placeholder="Runs/Wkts (e.g. 140/3)"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>TEAM A OVERS</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={teamAOvers}
                    onChangeText={setTeamAOvers}
                    keyboardType="numeric"
                    placeholder="Overs"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.modalLabel}>TEAM B SCORE</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={teamBScore}
                    onChangeText={setTeamBScore}
                    placeholder="Runs/Wkts (e.g. 90/6)"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>TEAM B OVERS</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={teamBOvers}
                    onChangeText={setTeamBOvers}
                    keyboardType="numeric"
                    placeholder="Overs"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <Text style={styles.modalLabel}>STATUS TEXT / SUMMARY</Text>
              <TextInput
                style={styles.modalInput}
                value={matchStatusText}
                onChangeText={setMatchStatusText}
                placeholder="e.g. Team A won by 42 runs, or Team B needs 15 runs from 8 balls"
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleUpdateScore}>
                <Text style={styles.modalSubmitBtnTxt}>Save Scorecard Data</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

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
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.xl,
    paddingBottom: sp.md,
  },
  backButton: {
    width: s(36),
    height: s(36),
    borderRadius: br.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: fs.xl2,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pageSubtitle: {
    fontSize: fs.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  deleteTourBtn: {
    padding: 8,
    borderRadius: br.sm,
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTxt: {
    marginTop: 12,
    fontSize: fs.sm2,
    color: '#6B7280',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: br.full,
    marginHorizontal: sp.xl,
    padding: 4,
    marginBottom: sp.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: br.full,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#1A1A1A',
  },
  scrollContent: {
    paddingHorizontal: sp.xl,
  },
  createBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A1A',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginBottom: sp.lg,
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerTitle: {
    fontSize: fs.md2,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerSubtitle: {
    fontSize: fs.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    lineHeight: fs.xs * 1.3,
  },
  createBtn: {
    backgroundColor: '#59C749',
    paddingVertical: 8,
    paddingHorizontal: sp.md,
    borderRadius: br.lg,
  },
  createBtnTxt: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: '#0B0D0B',
  },
  tourCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginBottom: sp.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  tourCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tourIconWrap: {
    width: s(40),
    height: s(40),
    borderRadius: br.md3,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourName: {
    fontSize: fs.base,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  tourOvers: {
    fontSize: fs.xs,
    color: '#8A8A8A',
    marginTop: 2,
  },
  tourMetaRow: {
    flexDirection: 'row',
    marginTop: sp.md,
    paddingTop: sp.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: sp.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemTxt: {
    fontSize: fs.xs,
    color: '#6B7280',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  sectionTitle: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 1.0,
  },
  addMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A1A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: br.md,
    gap: 4,
  },
  addMatchBtnText: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: '#FFF',
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginBottom: sp.md,
    borderWidth: 1.5,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  matchTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  matchDate: {
    fontSize: fs.xs,
    fontWeight: '700',
    color: '#8A8A8A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: br.sm,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: sp.xs,
  },
  teamCol: {
    flex: 1,
  },
  teamName: {
    fontSize: fs.base,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  scoreText: {
    fontSize: fs.md,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 4,
  },
  oversText: {
    fontSize: fs.xs,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  vsText: {
    fontSize: fs.sm,
    fontWeight: '900',
    color: '#CCCCCC',
    marginHorizontal: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginVertical: sp.md,
  },
  matchBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaStatusText: {
    fontSize: fs.xs,
    color: '#6B7280',
    fontWeight: '500',
  },
  updateScoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#59C749',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: br.md,
  },
  updateScoreBtnTxt: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: '#0A0D0A',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  emptyText: {
    fontSize: fs.md,
    color: '#8A8A8A',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: fs.xs,
    color: '#AEAEAE',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyActionBtn: {
    backgroundColor: '#1E3A1A',
    paddingVertical: 10,
    paddingHorizontal: sp.lg,
    borderRadius: br.lg,
    marginTop: 16,
  },
  emptyActionBtnTxt: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: '#FFF',
  },
  liveScoreCard: {
    backgroundColor: '#111511',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginBottom: sp.md,
    borderWidth: 1.5,
    borderColor: 'rgba(89, 199, 73, 0.25)',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  liveTourLabel: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  redDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4D4D',
  },
  liveLabelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF4D4D',
  },
  liveVsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: sp.xs,
  },
  liveTeamCol: {
    flex: 1,
  },
  liveTeamName: {
    fontSize: fs.base,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  liveScoreTxt: {
    fontSize: fs.lg,
    fontWeight: '900',
    color: '#59C749',
    marginTop: 4,
  },
  liveOversTxt: {
    fontSize: fs.xs,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  liveVsCol: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  liveVsDivider: {
    fontSize: fs.sm,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.15)',
  },
  liveFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  liveStatusTxt: {
    fontSize: fs.xs,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    flex: 1,
  },
  liveQuickUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#59C749',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: br.md,
  },
  liveQuickUpdateBtnTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0A0D0A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: sp.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.lg,
  },
  modalTitle: {
    fontSize: fs.md2,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  modalMatchSummary: {
    fontSize: fs.sm2,
    fontWeight: '700',
    color: '#6B7280',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: br.sm,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 1.0,
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: br.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: fs.base,
    color: '#1A1A1A',
    marginBottom: sp.sm,
  },
  formRow: {
    flexDirection: 'row',
  },
  modalSubmitBtn: {
    backgroundColor: '#1E3A1A',
    paddingVertical: 14,
    borderRadius: br.full,
    alignItems: 'center',
    marginTop: sp.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSubmitBtnTxt: {
    fontSize: fs.sm2,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statusPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: sp.md,
  },
  statusPickerBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: br.md,
    alignItems: 'center',
  },
  statusPickerBtnActive: {
    backgroundColor: '#1E3A1A',
    borderColor: '#1E3A1A',
  },
  statusPickerTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },
  statusPickerTxtActive: {
    color: '#FFFFFF',
  },
});
