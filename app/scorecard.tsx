import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../src/services/firebase';

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

  const allPlayersList = [...myRoster.map(p => p.name), ...oppRoster.map(p => p.name)];

  const updatePlayerStat = (
    team: 'my' | 'opp',
    index: number,
    field: 'runs' | 'balls' | 'wickets',
    val: string
  ) => {
    // Keep only numbers
    const cleanVal = val.replace(/[^0-9]/g, '');
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
});
