import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, doc, getDoc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../src/services/firebase';
import { useAuth } from '../src/hooks/useAuth';
import { triggerLocalNotification } from '../src/services/notifications';
import { TourHighlight } from '../src/hooks/useTour';

const C = {
  hero:    '#1B3F14',
  green:   '#59C749',
  white:   '#FFFFFF',
  black:   '#0A0A0A',
  gray3:   '#9CA3AF',
  navBg:   '#111510',
  milky:   '#FFFDF1',
  glassBg: 'rgba(255, 255, 255, 0.04)',
  border:  'rgba(255, 255, 255, 0.08)',
} as const;

interface PlayerRowState {
  name: string;
  runs: string;
  balls: string;
  wickets: string;
}

export default function ScorecardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    myTeamName?: string;
    oppTeamName?: string;
    myPlayers?: string;
    oppPlayers?: string;
  }>();

  const myTeamName = params.myTeamName || 'Crickstreet CC';
  const oppTeamName = params.oppTeamName || 'Opponents';
  
  const initialMyPlayers: string[] = params.myPlayers ? JSON.parse(params.myPlayers) : [];
  const initialOppPlayers: string[] = params.oppPlayers ? JSON.parse(params.oppPlayers) : [];

  // Initialize input state tables
  const [myRoster, setMyRoster] = useState<PlayerRowState[]>(
    initialMyPlayers.map(name => ({ name, runs: '0', balls: '0', wickets: '0' }))
  );
  const [oppRoster, setOppRoster] = useState<PlayerRowState[]>(
    initialOppPlayers.map(name => ({ name, runs: '0', balls: '0', wickets: '0' }))
  );

  const [activeTeamTab, setActiveTeamTab] = useState<'my' | 'opp'>('my');
  const [winnerTeam, setWinnerTeam] = useState<'my' | 'opp'>('my');
  const [selectedMom, setSelectedMom] = useState<string>(initialMyPlayers[0] || 'Select Player');
  const [showMomSelect, setShowMomSelect] = useState(false);
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const uid = user?.uid || '';

  // 1. Notification Preferences State & Firestore Loader
  const [notifPrefs, setNotifPrefs] = useState<any>({
    scoreUpdateReminder: true,
    inningsBreakReminder: true,
    inningsStartedNotification: true,
    inningsBreakNotification: true,
    matchCompletedNotification: true,
  });

  useEffect(() => {
    if (!uid) return;
    async function fetchPrefs() {
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.notificationSettings) {
            setNotifPrefs(data.notificationSettings);
            return;
          }
        }

        // Try fallback collection users/{uid}/notificationSettings/preferences
        const backupRef = doc(db, 'users', uid, 'notificationSettings', 'preferences');
        const backupSnap = await getDoc(backupRef);
        if (backupSnap.exists()) {
          setNotifPrefs(backupSnap.data());
        }
      } catch (err) {
        console.log('Error loading notification preferences in scorecard:', err);
      }
    }
    fetchPrefs();
  }, [uid]);

  // 2. Match Status and Innings States
  const [matchStatus, setMatchStatus] = useState<'Upcoming' | 'Live' | 'Innings Break' | 'Completed'>('Upcoming');
  const [currentInnings, setCurrentInnings] = useState<'First Innings' | 'Second Innings'>('First Innings');

  // 3. Score & Break Timers Trackers
  const [lastScoreUpdateTime, setLastScoreUpdateTime] = useState<Date>(new Date());
  const [inningsBreakStartTime, setInningsBreakStartTime] = useState<Date | null>(null);

  const [firstInningsStarted, setFirstInningsStarted] = useState(false);
  const [secondInningsStarted, setSecondInningsStarted] = useState(false);

  const [scoreTimerSeconds, setScoreTimerSeconds] = useState(0);
  const [breakTimerSeconds, setBreakTimerSeconds] = useState(0);

  const hasWarnedScoreUpdate = useRef(false);
  const hasWarnedInningsBreak = useRef(false);

  // 4. Timer Tick Interval Effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();

      if (matchStatus === 'Live') {
        const elapsed = Math.floor((now.getTime() - lastScoreUpdateTime.getTime()) / 1000);
        setScoreTimerSeconds(elapsed);

        // Score Update Reminder (60 seconds idle)
        if (elapsed >= 60 && !hasWarnedScoreUpdate.current) {
          hasWarnedScoreUpdate.current = true;
          if (notifPrefs.scoreUpdateReminder) {
            triggerLocalNotification(
              'Score Update Pending 🏏',
              'Score update pending. Please update the live match score.'
            );
          }
        }
      } else {
        setScoreTimerSeconds(0);
      }

      if (matchStatus === 'Innings Break' && inningsBreakStartTime) {
        const elapsed = Math.floor((now.getTime() - inningsBreakStartTime.getTime()) / 1000);
        setBreakTimerSeconds(elapsed);

        // Innings Break Reminder (10 minutes idle = 600 seconds)
        if (elapsed >= 600 && !hasWarnedInningsBreak.current) {
          hasWarnedInningsBreak.current = true;
          if (notifPrefs.inningsBreakReminder) {
            triggerLocalNotification(
              'Innings Break Alert ☕',
              'Innings break is still active. Please start the next innings.'
            );
          }
        }
      } else {
        setBreakTimerSeconds(0);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [matchStatus, lastScoreUpdateTime, inningsBreakStartTime, notifPrefs]);

  // 5. Status Transition Handler
  const handleStatusChange = (newStatus: typeof matchStatus) => {
    setMatchStatus(newStatus);

    if (newStatus === 'Live') {
      setLastScoreUpdateTime(new Date());
      hasWarnedScoreUpdate.current = false;
    } else if (newStatus === 'Innings Break') {
      setInningsBreakStartTime(new Date());
      hasWarnedInningsBreak.current = false;

      // Innings Break started notification
      if (notifPrefs.inningsBreakNotification) {
        triggerLocalNotification('Innings Break ⏸️', 'Innings Break has started.');
      }
    } else if (newStatus === 'Completed') {
      // Completed status notification
      if (notifPrefs.matchCompletedNotification) {
        triggerLocalNotification(
          'Match Completed 🏆',
          'Match completed successfully. View scorecard and results.'
        );
      }
    }
  };

  // 6. Innings Switcher Handler
  const handleInningsChange = (newInnings: typeof currentInnings) => {
    setCurrentInnings(newInnings);
    setLastScoreUpdateTime(new Date());
    hasWarnedScoreUpdate.current = false;
  };

  // 7. Manual test simulation triggers
  const simulateScoreUpdateTimeout = () => {
    const pastTime = new Date(new Date().getTime() - 60000);
    setLastScoreUpdateTime(pastTime);
    hasWarnedScoreUpdate.current = false;
    Alert.alert('Simulating Score Idle ⏱️', 'Last update set to 60s ago. Push reminder should trigger shortly.');
  };

  const simulateInningsBreakTimeout = () => {
    const pastTime = new Date(new Date().getTime() - 600000);
    setInningsBreakStartTime(pastTime);
    hasWarnedInningsBreak.current = false;
    Alert.alert('Simulating Break Idle ☕', 'Break idle set to 10m ago. Push reminder should trigger shortly.');
  };

  const allPlayersList = [...myRoster.map(p => p.name), ...oppRoster.map(p => p.name)];

  const updatePlayerStat = (
    team: 'my' | 'opp',
    index: number,
    field: 'runs' | 'balls' | 'wickets',
    val: string
  ) => {
    // Keep only numbers
    const cleanVal = val.replace(/[^0-9]/g, '');

    // Reset scoring update reminder clock
    setLastScoreUpdateTime(new Date());
    hasWarnedScoreUpdate.current = false;

    // Check first score update in new innings
    if (field === 'runs' && cleanVal !== '0' && cleanVal !== '') {
      if (currentInnings === 'First Innings' && !firstInningsStarted) {
        setFirstInningsStarted(true);
        if (notifPrefs.inningsStartedNotification) {
          triggerLocalNotification('Innings Started 🏏', 'First Innings has started.');
        }
      } else if (currentInnings === 'Second Innings' && !secondInningsStarted) {
        setSecondInningsStarted(true);
        if (notifPrefs.inningsStartedNotification) {
          triggerLocalNotification('Innings Started 🏏', 'Second Innings has started.');
        }
      }
    }

    if (team === 'my') {
      const next = [...myRoster];
      next[index] = { ...next[index], [field]: cleanVal };
      setMyRoster(next);
    } else {
      const next = [...oppRoster];
      next[index] = { ...next[index], [field]: cleanVal };
      setOppRoster(next);
    }
  };

  const handleCompleteMatch = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const querySnapshot = await getDocs(collection(db, 'users'));

      const allStats = [...myRoster, ...oppRoster];
      const winningTeamName = winnerTeam === 'my' ? myTeamName : oppTeamName;

      let matchUpdatesCount = 0;

      // Iterate through Firestore users to find who was in the match
      querySnapshot.forEach(docSnap => {
        const userData = docSnap.data();
        const docId = docSnap.id;
        const displayName = userData.displayName || '';

        // Match case-insensitively
        const playerStat = allStats.find(p => p.name.trim().toLowerCase() === displayName.trim().toLowerCase());
        if (playerStat) {
          const stats = userData.stats || {};
          
          const runsScored = parseInt(playerStat.runs) || 0;
          const wicketsTaken = parseInt(playerStat.wickets) || 0;
          const ballsFaced = parseInt(playerStat.balls) || 0;

          // Determine if player was on the winning team
          const isMyTeamPlayer = myRoster.some(p => p.name === playerStat.name);
          const playerTeamName = isMyTeamPlayer ? myTeamName : oppTeamName;
          const isWinner = playerTeamName === winningTeamName;
          const isMoM = playerStat.name === selectedMom;

          const newMatches = (stats.matches || 0) + 1;
          const newRuns = (stats.runs || 0) + runsScored;
          const newWickets = (stats.wickets || 0) + wicketsTaken;
          const newMatchesWon = (stats.matchesWon || 0) + (isWinner ? 1 : 0);
          const newWinPercentage = Math.round((newMatchesWon / newMatches) * 100);
          const newHighestScore = Math.max(stats.highestScore || 0, runsScored);
          const newMomAwards = (stats.momAwards || 0) + (isMoM ? 1 : 0);
          
          const newBallsFaced = (stats.totalBallsFaced || 0) + ballsFaced;
          const newBattingAverage = Number((newRuns / newMatches).toFixed(1));
          const newStrikeRate = Number((newBallsFaced > 0 ? (runsScored / ballsFaced) * 100 : 0).toFixed(1));

          // Append recent match runs and outcomes
          const matchLabel = `M${newMatches}`;
          const newLast5 = [
            { match: matchLabel, runs: runsScored, won: isWinner },
            ...(stats.last5 || [])
          ].slice(0, 5);

          // Recalculate achievement locks
          const newAchievements = [...(stats.achievements || [])];
          if (newMomAwards >= 3 && !newAchievements.includes('mvp')) {
            newAchievements.push('mvp');
          }
          if (newRuns >= 200 && !newAchievements.includes('top_scorer')) {
            newAchievements.push('top_scorer');
          }
          if ((runsScored >= 50 || wicketsTaken >= 3) && !newAchievements.includes('match_winner')) {
            newAchievements.push('match_winner');
          }
          if (newMatchesWon >= 5 && !newAchievements.includes('champion')) {
            newAchievements.push('champion');
          }

          // Queue database updates
          const userRef = doc(db, 'users', docId);
          batch.update(userRef, {
            stats: {
              ...stats,
              matches: newMatches,
              runs: newRuns,
              wickets: newWickets,
              highestScore: newHighestScore,
              winPercentage: newWinPercentage,
              matchesWon: newMatchesWon,
              momAwards: newMomAwards,
              totalBallsFaced: newBallsFaced,
              battingAverage: newBattingAverage,
              strikeRate: newStrikeRate,
              last5: newLast5,
              achievements: newAchievements,
            }
          });
          
          matchUpdatesCount++;
        }
      });

      // Submit all batch updates
      await batch.commit();

      // Trigger Match Completed local notification if enabled
      if (notifPrefs.matchCompletedNotification) {
        triggerLocalNotification(
          'Match Completed 🏆',
          'Match completed successfully. View scorecard and results.'
        );
      }

      Alert.alert(
        'Match Completed! 🏆',
        `Successfully scored and saved.\nUpdated ${matchUpdatesCount} player profiles in Firestore.`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace({
                pathname: '/(tabs)',
                params: { tab: 'matches' }
              });
            }
          }
        ]
      );

    } catch (err) {
      console.error('Error completing match stats:', err);
      Alert.alert('Database Error', 'Could not save scorecard stats. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0E1C12', '#0A0F0D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/create-matches')}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Match Scorecard</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          {/* Notification & Match Status Controller (Vibrant Glassmorphism Panel) */}
          <TourHighlight id="live-score">
            <View style={styles.controlPanelCard}>
              <Text style={styles.controlPanelHeader}>
                <Feather name="bell" size={14} color={C.green} style={{ marginRight: 6 }} /> LIVE MATCH CONTROL PANEL
              </Text>
              
              {/* Match Status Toggles */}
              <Text style={styles.controlLabel}>MATCH STATUS</Text>
              <View style={styles.statusButtonGrid}>
                {(['Upcoming', 'Live', 'Innings Break', 'Completed'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusSelectBtn, matchStatus === s && styles.statusSelectBtnActive]}
                    onPress={() => handleStatusChange(s)}
                  >
                    <Text style={[styles.statusSelectBtnTxt, matchStatus === s && styles.statusSelectBtnTxtActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Innings Selector */}
              <View style={styles.inningsControlsRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.controlLabel}>CURRENT INNINGS</Text>
                  <View style={styles.inningsButtonGrid}>
                    {(['First Innings', 'Second Innings'] as const).map(i => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.inningsSelectBtn, currentInnings === i && styles.inningsSelectBtnActive]}
                        onPress={() => handleInningsChange(i)}
                        disabled={matchStatus !== 'Live' && matchStatus !== 'Upcoming'}
                      >
                        <Text style={[styles.inningsSelectBtnTxt, currentInnings === i && styles.inningsSelectBtnTxtActive]}>
                          {i === 'First Innings' ? '1st Inn' : '2nd Inn'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Dev Simulation actions */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.controlLabel}>TEST REMINDERS</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity 
                      style={[styles.simulateBtn, matchStatus !== 'Live' && styles.simulateBtnDisabled]}
                      onPress={simulateScoreUpdateTimeout}
                      disabled={matchStatus !== 'Live'}
                    >
                      <Text style={styles.simulateBtnTxt}>Score Idle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.simulateBtn, matchStatus !== 'Innings Break' && styles.simulateBtnDisabled]}
                      onPress={simulateInningsBreakTimeout}
                      disabled={matchStatus !== 'Innings Break'}
                    >
                      <Text style={styles.simulateBtnTxt}>10m Idle</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Real-time counters information */}
              {matchStatus === 'Live' && (
                <Text style={styles.timerBadge}>
                  ⏱️ Time since last score update: {scoreTimerSeconds}s / 60s
                </Text>
              )}
              {matchStatus === 'Innings Break' && (
                <Text style={styles.timerBadge}>
                  ⏱️ Innings break active for: {Math.floor(breakTimerSeconds / 60)}m {breakTimerSeconds % 60}s
                </Text>
              )}
            </View>
          </TourHighlight>

          {/* Team Switcher tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTeamTab === 'my' && styles.tabButtonActive]}
              onPress={() => setActiveTeamTab('my')}
            >
              <Text style={[styles.tabText, activeTeamTab === 'my' && styles.tabTextActive]}>{myTeamName}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTeamTab === 'opp' && styles.tabButtonActive]}
              onPress={() => setActiveTeamTab('opp')}
            >
              <Text style={[styles.tabText, activeTeamTab === 'opp' && styles.tabTextActive]}>{oppTeamName}</Text>
            </TouchableOpacity>
          </View>

          {/* Roster entries */}
          <View style={styles.rosterCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 2 }]}>Player</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>Runs</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>Balls</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>Wkts</Text>
            </View>

            {(activeTeamTab === 'my' ? myRoster : oppRoster).map((player, idx) => (
              <View key={player.name} style={styles.tableRow}>
                <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
                
                <TextInput
                  style={styles.cellInput}
                  keyboardType="numeric"
                  value={player.runs}
                  onChangeText={val => updatePlayerStat(activeTeamTab, idx, 'runs', val)}
                />
                <TextInput
                  style={styles.cellInput}
                  keyboardType="numeric"
                  value={player.balls}
                  onChangeText={val => updatePlayerStat(activeTeamTab, idx, 'balls', val)}
                />
                <TextInput
                  style={styles.cellInput}
                  keyboardType="numeric"
                  value={player.wickets}
                  onChangeText={val => updatePlayerStat(activeTeamTab, idx, 'wickets', val)}
                />
              </View>
            ))}
          </View>

          {/* Settings Section */}
          <View style={styles.settingsCard}>
            <Text style={styles.settingsHeader}><MaterialCommunityIcons name="trophy-outline" size={16} color={C.green} /> MATCH RESOLUTION</Text>
            
            {/* Winner selection */}
            <Text style={styles.inputLabel}>CHOOSE WINNER</Text>
            <View style={styles.winnerRow}>
              <TouchableOpacity 
                style={[styles.winnerBtn, winnerTeam === 'my' && styles.winnerBtnActive]}
                onPress={() => setWinnerTeam('my')}
              >
                <Text style={[styles.winnerBtnText, winnerTeam === 'my' && styles.winnerBtnTextActive]}>{myTeamName}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.winnerBtn, winnerTeam === 'opp' && styles.winnerBtnActive]}
                onPress={() => setWinnerTeam('opp')}
              >
                <Text style={[styles.winnerBtnText, winnerTeam === 'opp' && styles.winnerBtnTextActive]}>{oppTeamName}</Text>
              </TouchableOpacity>
            </View>

            {/* Man of the Match selection */}
            <Text style={styles.inputLabel}>MAN OF THE MATCH</Text>
            <TouchableOpacity 
              style={styles.selectorDropdown}
              onPress={() => setShowMomSelect(!showMomSelect)}
            >
              <Text style={styles.selectorDropdownTxt}>{selectedMom}</Text>
              <Feather name={showMomSelect ? 'chevron-up' : 'chevron-down'} size={18} color={C.green} />
            </TouchableOpacity>

            {showMomSelect && (
              <View style={styles.dropdownMenu}>
                {allPlayersList.map(name => (
                  <TouchableOpacity 
                    key={name} 
                    style={styles.dropdownOption}
                    onPress={() => {
                      setSelectedMom(name);
                      setShowMomSelect(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, selectedMom === name && { color: C.green, fontWeight: '700' }]}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={{ gap: 12, marginTop: 10 }}>
            <TouchableOpacity 
              style={styles.completeBtn} 
              onPress={handleCompleteMatch}
              disabled={saving}
            >
              <LinearGradient colors={['#59C749', '#3E8E31']} style={styles.completeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.completeBtnTxt}>{saving ? 'Saving stats...' : 'Complete & Save Match'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => router.replace('/create-matches')}
            >
              <Text style={styles.cancelBtnTxt}>Discard & Cancel</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  scroll: { paddingHorizontal: 16, paddingBottom: 60 },

  // Team Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14, padding: 4, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
  },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabButtonActive: { backgroundColor: C.green },
  tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: C.black, fontWeight: '800' },

  // Table Card
  rosterCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20,
    borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 16,
  },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: C.border, paddingBottom: 10, marginBottom: 6 },
  thText: { color: C.gray3, fontSize: 11, fontWeight: '700' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  playerName: { flex: 2, color: '#FFF', fontSize: 14, fontWeight: '600', paddingRight: 8 },
  cellInput: {
    flex: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8, color: '#FFF', textAlign: 'center', fontSize: 13, fontWeight: '700',
    marginHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  // Settings Card
  settingsCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20,
    borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 20,
  },
  settingsHeader: { color: '#FFF', fontSize: 13, fontWeight: '800', marginBottom: 16 },
  inputLabel: { color: C.gray3, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10 },
  
  // Winner Selection
  winnerRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  winnerBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  winnerBtnActive: { backgroundColor: 'rgba(89, 199, 73, 0.15)', borderColor: C.green },
  winnerBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
  winnerBtnTextActive: { color: C.green, fontWeight: '800' },

  // Dropdown Selector
  selectorDropdown: {
    height: 48, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  selectorDropdownTxt: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  dropdownMenu: {
    marginTop: 8, backgroundColor: '#131A15', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(89, 199, 73, 0.2)', paddingVertical: 6,
    maxHeight: 200, overflow: 'scroll',
  },
  dropdownOption: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  dropdownOptionText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },

  // Buttons
  completeBtn: { width: '100%', borderRadius: 100, overflow: 'hidden' },
  completeGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  completeBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  cancelBtn: { paddingVertical: 14, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  cancelBtnTxt: { color: C.gray3, fontSize: 14, fontWeight: '700' },

  // Live Match Control Panel
  controlPanelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 16,
  },
  controlPanelHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 14,
  },
  controlLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  statusButtonGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  statusSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSelectBtnActive: {
    backgroundColor: 'rgba(89, 199, 73, 0.15)',
    borderColor: '#59C749',
  },
  statusSelectBtnTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statusSelectBtnTxtActive: {
    color: '#59C749',
    fontWeight: '800',
  },
  inningsControlsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  inningsButtonGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  inningsSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inningsSelectBtnActive: {
    backgroundColor: 'rgba(89, 199, 73, 0.15)',
    borderColor: '#59C749',
  },
  inningsSelectBtnTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  inningsSelectBtnTxtActive: {
    color: '#59C749',
    fontWeight: '800',
  },
  simulateBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulateBtnDisabled: {
    opacity: 0.4,
  },
  simulateBtnTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  timerBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EAB308',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
});
