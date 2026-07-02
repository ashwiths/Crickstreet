import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingBottomNav from '@/src/components/FloatingBottomNav';
import { s, vs, ms, fs, sp, br, avatarSz } from '../../theme/responsive';

// Modular Screen Component Imports
import HomeHeader from './HomeHeader';
import ActiveMatchCard from './ActiveMatchCard';
import MatchesScreen from '../Matches/MatchesScreen';
import TournamentScreen from '../Tournament/TournamentScreen';
import ProfileScreen from '../Profile/ProfileScreen';

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
            <ActiveMatchCard />
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
});
