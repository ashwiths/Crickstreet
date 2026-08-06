import FloatingBottomNav from '@/src/components/FloatingBottomNav';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, deleteDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { br, fs, s, sp } from '../../theme/responsive';

// Modular Screen Component Imports
import MatchesScreen from '../Matches/MatchesScreen';
import ProfileScreen from '../Profile/ProfileScreen';
import TournamentScreen from '../Tournament/TournamentScreen';
import ActiveMatchCard from './ActiveMatchCard';
import HomeHeader from './HomeHeader';
import ShareMatchModal from '../../components/ShareMatchModal';

// ─── Greeting helper ─────────────────────────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const CRICKET_TIPS = [
  "Update every ball to keep player statistics accurate.",
  "Assign vice-captain and captain roles to track leadership achievements.",
  "Register your local pitch in 'Grounds' to load auto-coordinates next time.",
  "Scan player QR codes at the pitch to add them to your squad instantly.",
  "Check out your profile page for advanced statistics graphs and run rates.",
  "A practice match is perfect for informal games with no tournament restrictions."
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'home' | 'matches' | 'tournament' | 'profile'>('home');
  const [draftAvailable, setDraftAvailable] = useState<boolean>(false);
  const [draftData, setDraftData] = useState<any>(null);

  const [tossChoice, setTossChoice] = useState<'bat' | 'bowl' | null>(null);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareMatchData, setShareMatchData] = useState<{
    id: string;
    myTeamName: string;
    oppTeamName: string;
    format: string;
  } | null>(null);

  const handleShareActiveMatch = (match: any) => {
    setShareMatchData({
      id: match.id,
      myTeamName: match.myTeamName || 'My Team',
      oppTeamName: match.oppTeamName || 'Opp Team',
      format: match.format || 'Overs',
    });
    setShareModalVisible(true);
  };

  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [grounds, setGrounds] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // Firestore Sync Effect
  useEffect(() => {
    if (!user) {
      setMatches([]);
      setUserStats(null);
      setTeams([]);
      setGrounds([]);
      setPlayers([]);
      setLoadingDb(false);
      return;
    }

    setLoadingDb(true);

    const mQuery = query(
      collection(db, 'users', user.uid, 'matches'),
      orderBy('createdAt', 'desc')
    );

    const unsubMatches = onSnapshot(mQuery, (snapshot) => {
      const fetchedMatches: any[] = [];
      snapshot.forEach((docSnap) => {
        fetchedMatches.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMatches(fetchedMatches);
      setLoadingDb(false);
    }, (err) => {
      console.error('Error loading matches:', err);
      setLoadingDb(false);
    });

    const userDocRef = doc(db, 'users', user.uid);
    const unsubStats = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserStats(data.stats || null);
      }
    });

    const unsubTeams = onSnapshot(collection(db, 'users', user.uid, 'teams'), (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() });
      });
      setTeams(fetched);
    });

    const unsubGrounds = onSnapshot(collection(db, 'users', user.uid, 'grounds'), (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() });
      });
      setGrounds(fetched);
    });

    const unsubPlayers = onSnapshot(collection(db, 'users', user.uid, 'players'), (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPlayers(fetched);
    });

    return () => {
      unsubMatches();
      unsubStats();
      unsubTeams();
      unsubGrounds();
      unsubPlayers();
    };
  }, [user]);

  // Draft Checking Effect
  useEffect(() => {
    const checkDraft = async () => {
      try {
        const stored = await AsyncStorage.getItem('@crickstreet:match_draft');
        if (stored) {
          setDraftAvailable(true);
          setDraftData(JSON.parse(stored));
        } else {
          setDraftAvailable(false);
          setDraftData(null);
        }
      } catch (e) {
        console.error('Error checking draft:', e);
      }
    };
    checkDraft();
  }, [activeTab]);

  // Tab switching from navigation params
  useEffect(() => {
    if (params.tab === 'matches') {
      setActiveTab('matches');
    } else if (params.tab === 'tournament') {
      setActiveTab('tournament');
    } else if (params.tab === 'profile') {
      setActiveTab('profile');
    } else if (params.tab === 'home') {
      setActiveTab('home');
    }
  }, [params.tab]);

  // Live and completed lists
  const liveMatches = useMemo(() => matches.filter((m: any) => m.status === 'live'), [matches]);
  const completedMatches = useMemo(() => matches.filter((m: any) => m.status === 'completed'), [matches]);

  // --- Real-Data Calculations for Stats ---
  const totalMatchesCount = matches.length;
  const winsCount = useMemo(() => {
    return completedMatches.filter((m: any) => {
      let res = m.result;
      if (!res && m.winner) {
        res = m.winner === 'teamA' ? 'Won' : 'Lost';
      } else if (!res && m.status === 'completed') {
        const scoreA = parseInt(m.myScore?.split('/')[0] || m.teamAScore || '0', 10);
        const scoreB = parseInt(m.oppScore?.split('/')[0] || m.teamBScore || '0', 10);
        if (scoreA > scoreB) res = 'Won';
        else if (scoreB > scoreA) res = 'Lost';
      }
      return res === 'Won';
    }).length;
  }, [completedMatches]);

  const winRatePct = useMemo(() => {
    return totalMatchesCount > 0 ? Math.round((winsCount / totalMatchesCount) * 100) : 0;
  }, [winsCount, totalMatchesCount]);

  const totalRunsCount = useMemo(() => {
    let runs = 0;
    completedMatches.forEach((m: any) => {
      const scoreA = parseInt(m.myScore?.split('/')[0] || m.teamAScore || '0', 10);
      if (!isNaN(scoreA)) runs += scoreA;
    });
    if (userStats && typeof userStats.runs === 'number') {
      runs = userStats.runs;
    }
    return runs;
  }, [completedMatches, userStats]);

  const totalWicketsCount = useMemo(() => {
    let wickets = 0;
    completedMatches.forEach((m: any) => {
      const wkts = parseInt(m.myScore?.split('/')[1] || m.teamAWickets || '0', 10);
      if (!isNaN(wkts)) wickets += wkts;
    });
    if (userStats && typeof userStats.wickets === 'number') {
      wickets = userStats.wickets;
    }
    return wickets;
  }, [completedMatches, userStats]);

  const dashboardAchievements = useMemo(() => {
    const badges = [
      { id: 'first_win', emoji: '🥇', title: 'First Victory', unlocked: winsCount >= 1, progressText: winsCount >= 1 ? '1/1 Won' : '0/1 Won', color: '#E3A85B' },
      { id: 'century', emoji: '💯', title: 'Century Club', unlocked: totalRunsCount >= 100, progressText: totalRunsCount >= 100 ? '100+ Runs' : `${totalRunsCount}/100 Runs`, color: '#A8CD55' },
      { id: 'winning_streak', emoji: '🔥', title: 'Streak Master', unlocked: winsCount >= 3, progressText: winsCount >= 3 ? '3+ Streak' : `${winsCount}/3 Wins`, color: '#FF4D4D' },
      { id: 'run_machine', emoji: '⚡', title: 'Run Machine', unlocked: totalRunsCount >= 500, progressText: totalRunsCount >= 500 ? '500+ Runs' : `${totalRunsCount}/500 Runs`, color: '#A8CD55' }
    ];
    let nextBadge = 'All Badges Unlocked!';
    let progressPercent = 100;
    if (winsCount < 1) {
      nextBadge = 'First Victory';
      progressPercent = 0;
    } else if (totalRunsCount < 100) {
      nextBadge = 'Century Club';
      progressPercent = Math.min(Math.round((totalRunsCount / 100) * 100), 100);
    } else if (winsCount < 3) {
      nextBadge = 'Streak Master';
      progressPercent = Math.min(Math.round((winsCount / 3) * 100), 100);
    } else if (totalRunsCount < 500) {
      nextBadge = 'Run Machine';
      progressPercent = Math.min(Math.round((totalRunsCount / 500) * 100), 100);
    }
    return { badges, nextBadge, progressPercent };
  }, [winsCount, totalRunsCount]);

  const recentActivities = useMemo(() => {
    const list: Array<{ type: string; title: string; desc: string; timestamp: Date; emoji: string }> = [];
    matches.forEach((m: any) => {
      const date = m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000) : (m.createdAt ? new Date(m.createdAt) : new Date());
      if (m.status === 'completed') {
        list.push({
          type: 'match_completed',
          title: 'Match Completed 🏆',
          desc: `${m.myTeamName} vs ${m.oppTeamName} • ${m.statusText || 'Scored'}`,
          timestamp: date,
          emoji: '🏆',
        });
      } else {
        list.push({
          type: 'match_created',
          title: 'Match Created 🏏',
          desc: `${m.myTeamName} vs ${m.oppTeamName} • Ready to score`,
          timestamp: date,
          emoji: '🏏',
        });
      }
    });
    teams.forEach((t: any) => {
      const date = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : (t.createdAt ? new Date(t.createdAt) : new Date());
      list.push({
        type: 'team_created',
        title: 'Team Created 👥',
        desc: `Registered squad "${t.teamName}"`,
        timestamp: date,
        emoji: '👥',
      });
    });
    grounds.forEach((g: any) => {
      const date = g.createdAt?.seconds ? new Date(g.createdAt.seconds * 1000) : (g.createdAt ? new Date(g.createdAt) : new Date());
      list.push({
        type: 'ground_added',
        title: 'Ground Registered 📍',
        desc: `Added home pitch "${g.groundName}"`,
        timestamp: date,
        emoji: '📍',
      });
    });
    players.forEach((p: any) => {
      const date = p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : (p.createdAt ? new Date(p.createdAt) : new Date());
      list.push({
        type: 'player_added',
        title: 'Player Joined 👤',
        desc: `Added player "${p.name}"`,
        timestamp: date,
        emoji: '👤',
      });
    });
    list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return list.slice(0, 5);
  }, [matches, teams, grounds, players]);

  const tipOfTheDay = useMemo(() => {
    const day = new Date().getDate();
    return CRICKET_TIPS[day % CRICKET_TIPS.length];
  }, []);

  const unfinishedMatch = liveMatches[0] || null;

  const isTossSelected = tossChoice !== null;

  const handleGetStarted = async () => {
    if (!unfinishedMatch || !tossChoice || !user) return;

    const battingFirst = tossChoice === 'bat' ? 'my' : 'opp';

    // Resolve live team rosters to populate players if the match was created before team setups
    const myTeamDoc = teams.find((t: any) => t.id === unfinishedMatch.myTeamId || t.teamName === unfinishedMatch.myTeamName);
    const oppTeamDoc = teams.find((t: any) => t.id === unfinishedMatch.oppTeamId || t.teamName === unfinishedMatch.oppTeamName);

    const myPlayers = (myTeamDoc?.players && myTeamDoc.players.length > 0)
      ? myTeamDoc.players.map((p: any) => p.name || 'Unnamed Player')
      : (unfinishedMatch.myPlayers || []);

    let oppPlayers = (oppTeamDoc?.players && oppTeamDoc.players.length > 0)
      ? oppTeamDoc.players.map((p: any) => p.name || 'Unnamed Player')
      : (unfinishedMatch.oppPlayers || []);

    // Dynamically set opponent squad size for practice match based on toss choice
    const isDefaultPracticeOpponent = 
      !oppPlayers || 
      oppPlayers.length === 0 || 
      (oppPlayers.length === 1 && oppPlayers[0] === 'Opp Player 1') || 
      (oppPlayers.length === 2 && oppPlayers[0] === 'Opp Player 1' && oppPlayers[1] === 'Opp Player 2');

    if (unfinishedMatch.oppTeamName === 'Practice Opponent' && isDefaultPracticeOpponent) {
      oppPlayers = battingFirst === 'opp' ? ['Opp Player 1', 'Opp Player 2'] : ['Opp Player 1'];
    }

    const initRoles = (players: string[]) => {
      const r: Record<string, string> = {};
      players.forEach((p) => { r[p] = 'Batter'; });
      return r;
    };
    const myRoles = initRoles(myPlayers);
    const oppRoles = initRoles(oppPlayers);

    // Auto-populate initial choices for opponents if applicable
    const autoStriker = battingFirst === 'opp' ? (oppPlayers[0] || '') : '';
    const autoNonStriker = battingFirst === 'opp' ? (oppPlayers[1] || '') : '';
    const autoBowler = battingFirst === 'my' ? (oppPlayers[0] || '') : '';

    // Update match document in database
    try {
      const docRef = doc(db, 'users', user.uid, 'matches', unfinishedMatch.id);
      await updateDoc(docRef, {
        battingFirst,
        striker: autoStriker,
        nonStriker: autoNonStriker,
        openingBowler: autoBowler,
      });
    } catch (err) {
      console.error('Error updating match setup in database:', err);
    }

    router.push({
      pathname: '/match-warning',
      params: {
        myTeamName: unfinishedMatch.myTeamName,
        oppTeamName: unfinishedMatch.oppTeamName,
        myPlayers: JSON.stringify(myPlayers),
        oppPlayers: JSON.stringify(oppPlayers),
        myRoles: JSON.stringify(myRoles),
        oppRoles: JSON.stringify(oppRoles),
        battingFirst,
        striker: autoStriker,
        nonStriker: autoNonStriker,
        openingBowler: autoBowler,
        matchId: unfinishedMatch.id,
        format: unfinishedMatch.format || 'T20',
        customOvers: String(unfinishedMatch.customOvers || '20'),
      }
    } as any);
  };

  const handleResumeMatch = () => {
    if (!unfinishedMatch) return;

    // Resolve live team rosters to populate players if the match was created before team setups
    const myTeamDoc = teams.find((t: any) => t.id === unfinishedMatch.myTeamId || t.teamName === unfinishedMatch.myTeamName);
    const oppTeamDoc = teams.find((t: any) => t.id === unfinishedMatch.oppTeamId || t.teamName === unfinishedMatch.oppTeamName);

    const myPlayers = (myTeamDoc?.players && myTeamDoc.players.length > 0)
      ? myTeamDoc.players.map((p: any) => p.name || 'Unnamed Player')
      : (unfinishedMatch.myPlayers || []);

    const battingFirst = unfinishedMatch.battingFirst || 'my';

    let oppPlayers = (oppTeamDoc?.players && oppTeamDoc.players.length > 0)
      ? oppTeamDoc.players.map((p: any) => p.name || 'Unnamed Player')
      : (unfinishedMatch.oppPlayers || []);

    // Dynamically set opponent squad size for practice match based on toss choice
    const isDefaultPracticeOpponent2 = 
      !oppPlayers || 
      oppPlayers.length === 0 || 
      (oppPlayers.length === 1 && oppPlayers[0] === 'Opp Player 1') || 
      (oppPlayers.length === 2 && oppPlayers[0] === 'Opp Player 1' && oppPlayers[1] === 'Opp Player 2');

    if (unfinishedMatch.oppTeamName === 'Practice Opponent' && isDefaultPracticeOpponent2) {
      oppPlayers = battingFirst === 'opp' ? ['Opp Player 1', 'Opp Player 2'] : ['Opp Player 1'];
    }

    router.push({
      pathname: '/match-setup',
      params: {
        myTeamName: unfinishedMatch.myTeamName,
        oppTeamName: unfinishedMatch.oppTeamName,
        myPlayers: JSON.stringify(myPlayers),
        oppPlayers: JSON.stringify(oppPlayers),
        battingFirst: battingFirst,
        striker: unfinishedMatch.striker || '',
        nonStriker: unfinishedMatch.nonStriker || '',
        openingBowler: unfinishedMatch.openingBowler || '',
        matchId: unfinishedMatch.id,
        format: unfinishedMatch.format || 'T20',
        customOvers: String(unfinishedMatch.customOvers || '20'),
      }
    } as any);
  };

  const handleCancelMatch = () => {
    if (!unfinishedMatch || !user) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmCancel = async () => {
        const saveToHistory = window.confirm(
          "Cancel Match ⚠️\n\nWould you like to save this match to your History? (Click OK to save & archive, Cancel to delete without saving)"
        );
        if (saveToHistory) {
          try {
            const docRef = doc(db, 'users', user.uid, 'matches', unfinishedMatch.id);
            await updateDoc(docRef, {
              status: 'completed',
              statusText: 'Match ended'
            });
            window.alert('Match successfully saved to history. 🏏');
          } catch (err) {
            console.error('Error saving and ending match:', err);
            window.alert('Failed to save match.');
          }
        } else {
          const deleteMatch = window.confirm(
            "Delete Match 🚨\n\nAre you sure you want to delete this match permanently? This will delete all progress and cannot be undone."
          );
          if (deleteMatch) {
            try {
              const docRef = doc(db, 'users', user.uid, 'matches', unfinishedMatch.id);
              await deleteDoc(docRef);
              window.alert('Match successfully deleted. 🏏');
            } catch (err) {
              console.error('Error deleting match:', err);
              window.alert('Failed to delete match.');
            }
          }
        }
      };

      confirmCancel();
      return;
    }

    Alert.alert(
      'Cancel Match ⚠️',
      'Choose how you want to cancel the current active match:',
      [
        {
          text: 'Save in History & End',
          onPress: async () => {
            try {
              const docRef = doc(db, 'users', user.uid, 'matches', unfinishedMatch.id);
              await updateDoc(docRef, {
                status: 'completed',
                statusText: 'Match ended'
              });
              Alert.alert('Success 🏏', 'Match successfully saved to history.');
            } catch (err) {
              console.error('Error saving and ending match:', err);
              Alert.alert('Error', 'Failed to save match.');
            }
          }
        },
        {
          text: "Cancel & Don't Save",
          style: 'destructive',
          onPress: async () => {
            try {
              const docRef = doc(db, 'users', user.uid, 'matches', unfinishedMatch.id);
              await deleteDoc(docRef);
              Alert.alert('Success 🏏', 'Match successfully cancelled and deleted.');
            } catch (err) {
              console.error('Error deleting match:', err);
              Alert.alert('Error', 'Failed to delete match.');
            }
          }
        },
        {
          text: 'Go Back',
          style: 'cancel'
        }
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={activeTab === 'home' ? 'dark-content' : 'light-content'}
        backgroundColor={activeTab === 'home' ? 'transparent' : '#0A0D0A'}
        translucent={activeTab === 'home'}
      />

      {activeTab === 'home' && (
        <LinearGradient
          colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
          locations={[0, 0.4, 0.8]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { height: Math.max(300, 300 + insets.top) }]}
        />
      )}

      {activeTab === 'home' && (
        loadingDb ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#59C749" />
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <HomeHeader
              user={user}
              insets={insets}
              pulseStyle={{ opacity: 1 }}
              setActiveTab={setActiveTab}
              getGreeting={getGreeting}
            />

            {/* Welcome Banner */}
            <View style={styles.welcomeBanner}>
              <Text style={styles.welcomeTitle}>Welcome to Crickstreet! 👋</Text>
              <Text style={styles.welcomeSubtitle}>
                Your local cricket companion. Score games, track squads, and ask our custom AI for tips & rules! ⚡
              </Text>
            </View>

            {/* Tournament Mode Promotion Banner - Only shown when no active match is ongoing */}
            {!unfinishedMatch && (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.tournamentPromoCard}
                onPress={() => router.push('/tournament-mode')}
              >
                <LinearGradient
                  colors={['#1E3A1A', '#0D1A0A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tournamentPromoGradient}
                >
                  <View style={styles.tournamentPromoContent}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeTxt}>NEW FEATURE</Text>
                      </View>
                      <Text style={styles.promoTitle}>Tournament Hub 🏆</Text>
                      <Text style={styles.promoDesc}>
                        Create custom leagues, schedule matches, and manage real-time live scoreboards!
                      </Text>
                    </View>
                    <View style={styles.promoIconWrap}>
                      <MaterialCommunityIcons name="trophy-outline" size={32} color="#59C749" />
                    </View>
                  </View>
                  <View style={styles.promoFooter}>
                    <Text style={styles.promoFooterTxt}>Enter Tournament Mode</Text>
                    <Feather name="arrow-right" size={14} color="#59C749" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {unfinishedMatch ? (
              <View style={styles.activeMatchStatusSection}>
                <View style={styles.activeMatchStatusCard}>
                  <View style={styles.activeMatchHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8) }}>
                      <View style={styles.liveBadge}>
                        <View style={styles.liveBadgeDot} />
                        <Text style={styles.liveBadgeText}>ACTIVE</Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleShareActiveMatch(unfinishedMatch)}
                        style={{
                          width: s(26),
                          height: s(26),
                          borderRadius: s(13),
                          backgroundColor: 'rgba(89, 199, 73, 0.12)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Feather name="share-2" size={12} color="#59C749" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.formatText}>🏏 {unfinishedMatch.format || 'Overs'}</Text>
                  </View>
                  <View style={styles.activeMatchTeamsContainer}>
                    <View style={styles.activeMatchTeamRow}>
                      <Text style={styles.activeMatchTeamName} numberOfLines={1}>
                        {unfinishedMatch.myTeamName || 'My Team'}
                      </Text>
                      <Text style={styles.activeMatchTeamScore}>
                        {unfinishedMatch.myScore || '0/0'}
                      </Text>
                    </View>

                    <View style={styles.activeMatchVsDivider}>
                      <View style={styles.vsLine} />
                      <Text style={styles.vsText}>VS</Text>
                      <View style={styles.vsLine} />
                    </View>

                    <View style={styles.activeMatchTeamRow}>
                      <Text style={styles.activeMatchTeamName} numberOfLines={1}>
                        {unfinishedMatch.oppTeamName || 'Opp Team'}
                      </Text>
                      <Text style={styles.activeMatchTeamScore}>
                        {unfinishedMatch.oppScore || '0/0'}
                      </Text>
                    </View>
                  </View>

                  {unfinishedMatch.battingFirst ? (
                    <>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.getStartBtn}
                        onPress={handleResumeMatch}
                      >
                        <Text style={styles.getStartBtnText}>Resume Match</Text>
                        <Feather name="play" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[styles.getStartBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#FF6B6B', marginTop: 10 }]}
                        onPress={handleCancelMatch}
                      >
                        <Text style={[styles.getStartBtnText, { color: '#FF6B6B' }]}>Cancel Match</Text>
                        <Feather name="trash-2" size={14} color="#FF6B6B" style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {/* Choose to bat or bowl Selector */}
                      <Text style={styles.tossSectionLabel}>Choose to?</Text>
                      <View style={styles.tossButtonsRow}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.tossOptionBtn,
                            tossChoice === 'bat' && styles.tossOptionBtnActive,
                          ]}
                          onPress={() => setTossChoice('bat')}
                        >
                          <Text style={[
                            styles.tossOptionBtnTxt,
                            tossChoice === 'bat' && styles.tossOptionBtnTxtActive
                          ]}>
                            🏏 Bat
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.tossOptionBtn,
                            tossChoice === 'bowl' && styles.tossOptionBtnActive,
                          ]}
                          onPress={() => setTossChoice('bowl')}
                        >
                          <Text style={[
                            styles.tossOptionBtnTxt,
                            tossChoice === 'bowl' && styles.tossOptionBtnTxtActive
                          ]}>
                            ⚾ Bowl
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        activeOpacity={isTossSelected ? 0.85 : 1.0}
                        disabled={!isTossSelected}
                        style={[
                          styles.getStartBtn,
                          !isTossSelected && styles.getStartBtnDisabled
                        ]}
                        onPress={handleGetStarted}
                      >
                        <Text style={[
                          styles.getStartBtnText,
                          !isTossSelected && styles.getStartBtnTextDisabled
                        ]}>Get Start</Text>
                        <Feather name="arrow-right" size={16} color={isTossSelected ? "#FFFFFF" : "rgba(0,0,0,0.25)"} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[styles.getStartBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#FF6B6B', marginTop: 10 }]}
                        onPress={handleCancelMatch}
                      >
                        <Text style={[styles.getStartBtnText, { color: '#FF6B6B' }]}>Cancel Match</Text>
                        <Feather name="trash-2" size={14} color="#FF6B6B" style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ) : (
              <ActiveMatchCard />
            )}

            {/* Last Match Score Card */}
            {completedMatches.length > 0 && (
              <View style={styles.lastMatchCard}>
                <View style={styles.lastMatchHeader}>
                  <View style={styles.lastMatchTitleWrap}>
                    <Text style={styles.lastMatchLabel}>LAST MATCH SCORE</Text>
                    <Text style={styles.lastMatchFormat}>🏏 {completedMatches[0].format || 'Overs'}</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.lastMatchViewBtn}
                    onPress={() => {
                      setActiveTab('tournament');
                      router.push({
                        pathname: '/scorecard',
                        params: {
                          matchId: completedMatches[0].id,
                          myTeamName: completedMatches[0].myTeamName,
                          oppTeamName: completedMatches[0].oppTeamName,
                        },
                      });
                    }}
                  >
                    <Text style={styles.lastMatchViewBtnText}>View Scorecard</Text>
                    <Feather name="chevron-right" size={14} color="#59C749" />
                  </TouchableOpacity>
                </View>

                <View style={styles.lastMatchDivider} />

                <View style={styles.lastMatchTeams}>
                  <View style={styles.lastMatchTeamRow}>
                    <Text style={styles.lastMatchTeamName} numberOfLines={1}>
                      {completedMatches[0].myTeamName}
                    </Text>
                    <Text style={styles.lastMatchTeamScore}>
                      {completedMatches[0].myScore}
                    </Text>
                  </View>
                  <View style={styles.lastMatchTeamRow}>
                    <Text style={styles.lastMatchTeamName} numberOfLines={1}>
                      {completedMatches[0].oppTeamName}
                    </Text>
                    <Text style={styles.lastMatchTeamScore}>
                      {completedMatches[0].oppScore}
                    </Text>
                  </View>
                </View>

                {completedMatches[0].statusText && (
                  <View style={styles.lastMatchResultWrap}>
                    <Text style={styles.lastMatchResultText}>
                      🏆 {completedMatches[0].statusText}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Always display the Features Overview Card */}
            <View style={styles.featuresCard}>
              <Text style={styles.featuresTitle}>What&apos;s in Crickstreet? 🏏</Text>

              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, { backgroundColor: '#F0F4EC' }]}>
                  <Feather name="users" size={16} color="#2D5016" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureName}>Squad Management</Text>
                  <Text style={styles.featureDesc}>Create teams, add local players, and share QR player cards.</Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, { backgroundColor: '#FFF9E6' }]}>
                  <Feather name="map-pin" size={16} color="#E3A85B" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureName}>Pitch & Ground Locator</Text>
                  <Text style={styles.featureDesc}>Pin and save your local cricket pitches to pre-load map coordinates.</Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, { backgroundColor: '#FFF0F0' }]}>
                  <Feather name="bar-chart-2" size={16} color="#FF4D4D" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureName}>Advanced Statistics</Text>
                  <Text style={styles.featureDesc}>Track individual player runs, bowling metrics, and run rates.</Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, { backgroundColor: '#E5F2D9' }]}>
                  <Feather name="message-square" size={16} color="#59C749" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureName}>AI Cricket Assistant</Text>
                  <Text style={styles.featureDesc}>Ask our AI chat bot for strategic suggestions and match rules.</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )
      )}


      {activeTab === 'matches' && (
        <MatchesScreen
          matches={matches}
          user={user}
          draftAvailable={draftAvailable}
          draftData={draftData}
        />
      )}

      {activeTab === 'tournament' && (
        <TournamentScreen
          onBack={() => setActiveTab('home')}
          matches={matches}
          userStats={userStats}
        />
      )}

      {activeTab === 'profile' && (
        <ProfileScreen onBack={() => setActiveTab('home')} />
      )}

      <FloatingBottomNav activeTab={activeTab} onTabPress={setActiveTab} />

      {shareMatchData && (
        <ShareMatchModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          matchId={shareMatchData.id}
          ownerUid={user?.uid || ''}
          myTeamName={shareMatchData.myTeamName}
          oppTeamName={shareMatchData.oppTeamName}
          format={shareMatchData.format}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F1',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMatchStatusSection: {
    gap: sp.xs,
  },
  activeMatchStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginHorizontal: sp.lg,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8E4D4',
  },
  activeMatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderWidth: 0.5,
    borderColor: '#FF4D4D',
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
    borderRadius: br.sm,
  },
  liveBadgeDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: '#FF4D4D',
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: fs.xxs,
    fontWeight: '800',
    color: '#FF4D4D',
    letterSpacing: 0.5,
  },
  formatText: {
    fontSize: fs.sm,
    color: '#8A8A8A',
    fontWeight: '700',
  },
  activeMatchTitleText: {
    fontSize: fs.md2,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginTop: sp.xs,
    marginBottom: sp.xs,
  },
  activeMatchSubtitleText: {
    fontSize: fs.sm,
    color: '#8A8A8A',
    textAlign: 'center',
    marginBottom: sp.lg,
    lineHeight: fs.sm * 1.3,
  },
  activeMatchTeamsContainer: {
    backgroundColor: '#F9F9F8',
    borderRadius: br.lg,
    paddingVertical: sp.md,
    paddingHorizontal: sp.lg,
    marginBottom: sp.md,
    borderWidth: 1,
    borderColor: '#E8E4D4',
  },
  activeMatchTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  activeMatchTeamName: {
    fontSize: fs.md,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 10,
  },
  activeMatchTeamScore: {
    fontSize: fs.md2,
    fontWeight: '800',
    color: '#2D5016',
  },
  activeMatchVsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  vsLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: '#E0E0DB',
  },
  vsText: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: '#A8CD55',
    marginHorizontal: 10,
  },
  getStartBtn: {
    backgroundColor: '#59C749',
    paddingVertical: 14,
    borderRadius: br.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  getStartBtnDisabled: {
    backgroundColor: 'rgba(89,199,73,0.15)',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  getStartBtnText: {
    fontSize: fs.md,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  getStartBtnTextDisabled: {
    color: 'rgba(0,0,0,0.25)',
  },
  viewDetailsLinkTxt: {
    textDecorationLine: 'underline',
    color: '#59C749',
    fontSize: fs.sm,
    fontWeight: '700',
  },
  horizontalTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.lg,
    paddingVertical: sp.xs,
  },
  horizontalTeamName: {
    fontSize: fs.md,
    fontWeight: '900',
    color: '#111827',
    maxWidth: '42%',
    textAlign: 'center',
  },
  horizontalVsText: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: '#59C749',
    textTransform: 'lowercase',
  },
  vsBadge: {
    width: s(30),
    height: s(30),
    borderRadius: s(15),
    backgroundColor: 'rgba(89,199,73,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(89,199,73,0.2)',
  },
  vsBadgeText: {
    fontSize: fs.xs - 1,
    fontWeight: '900',
    color: '#59C749',
    textTransform: 'lowercase',
  },
  tossSectionLabel: {
    fontSize: fs.xs,
    fontWeight: '900',
    color: '#8A8A8A',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 18,
    paddingHorizontal: 4,
  },
  tossButtonsRow: {
    flexDirection: 'row',
    gap: sp.md,
    marginBottom: 16,
  },
  tossOptionBtn: {
    flex: 1,
    height: s(44),
    borderRadius: br.lg,
    borderWidth: 1,
    borderColor: '#E8E4D4',
    backgroundColor: '#F9F9F8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  tossOptionBtnActive: {
    backgroundColor: '#59C749',
    borderColor: '#59C749',
  },
  tossOptionBtnTxt: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: '#4B5563',
  },
  tossOptionBtnTxtActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  anotherMatchHeaderContainer: {
    marginTop: sp.md,
    marginBottom: sp.xs,
  },
  anotherMatchSectionTitle: {
    fontSize: fs.md,
    fontWeight: '800',
    color: '#8A8A8A',
    paddingHorizontal: sp.lg,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginHorizontal: sp.lg,
    marginTop: sp.md,
    borderWidth: 1,
    borderColor: '#E8E4D4',
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  featuresTitle: {
    fontSize: fs.md,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: sp.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    marginVertical: 8,
  },
  featureIconContainer: {
    width: s(36),
    height: s(36),
    borderRadius: br.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureName: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  featureDesc: {
    fontSize: fs.xs,
    color: '#8A8A8A',
    lineHeight: fs.xs * 1.3,
    marginTop: 2,
  },
  welcomeBanner: {
    paddingHorizontal: sp.lg,
    marginTop: sp.md,
    marginBottom: sp.sm,
  },
  welcomeTitle: {
    fontSize: fs.xl,
    fontWeight: '900',
    color: '#1A1A1A',
    marginBottom: sp.xs,
  },
  welcomeSubtitle: {
    fontSize: fs.sm,
    color: '#6B7280',
    lineHeight: fs.sm * 1.4,
  },
  floatingAiBtn: {
    position: 'absolute',
    bottom: 95,
    right: sp.lg,
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  floatingAiGradient: {
    flex: 1,
    borderRadius: s(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastMatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginHorizontal: sp.lg,
    marginTop: sp.md,
    borderWidth: 1,
    borderColor: '#E8E4D4',
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  lastMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.sm,
  },
  lastMatchTitleWrap: {
    flex: 1,
  },
  lastMatchLabel: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 0.5,
  },
  lastMatchFormat: {
    fontSize: fs.sm,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  lastMatchViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF7E6',
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs,
    borderRadius: br.full,
    gap: 4,
  },
  lastMatchViewBtnText: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: '#59C749',
  },
  lastMatchDivider: {
    height: 1,
    backgroundColor: '#F3F4F1',
    marginVertical: sp.sm,
  },
  lastMatchTeams: {
    gap: sp.sm,
  },
  lastMatchTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMatchTeamName: {
    fontSize: fs.md,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    marginRight: sp.md,
  },
  lastMatchTeamScore: {
    fontSize: fs.md,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  lastMatchResultWrap: {
    backgroundColor: '#F0F4EC',
    borderRadius: br.md,
    paddingVertical: sp.xs,
    paddingHorizontal: sp.sm,
    marginTop: sp.md,
    alignSelf: 'flex-start',
  },
  lastMatchResultText: {
    fontSize: fs.xs,
    fontWeight: '700',
    color: '#2D5016',
  },
  tournamentPromoCard: {
    marginHorizontal: sp.lg,
    marginBottom: sp.lg,
    borderRadius: br.xxl,
    overflow: 'hidden',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  tournamentPromoGradient: {
    padding: sp.lg,
  },
  tournamentPromoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(89, 199, 73, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: br.sm,
    marginBottom: sp.xs,
  },
  newBadgeTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#59C749',
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontSize: fs.md2,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  promoDesc: {
    fontSize: fs.xs,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 4,
    lineHeight: fs.xs * 1.3,
  },
  promoIconWrap: {
    marginLeft: 12,
    width: s(48),
    height: s(48),
    borderRadius: br.md3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: sp.md,
    paddingTop: sp.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  promoFooterTxt: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: '#59C749',
  },
});
