import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, doc, getDoc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../src/services/firebase';
import { useAuth } from '../src/hooks/useAuth';
import { triggerLocalNotification } from '../src/services/notifications';
import { s, fs, sp, br, avatarSz } from '../src/theme/responsive';
import MyTeamWinAnimation from '../src/components/MyTeamWinAnimation';
import OpponentWinAnimation from '../src/components/OpponentWinAnimation';
import { isPracticeMatch, getNextOpponentBatterName, getNextOpponentBowlerName } from '../src/utils/practiceMatchHelper';

const C = {
  bg: '#F3F4F1',
  green: '#59C749',
  greenDark: '#3A9E2E',
  white: '#FFFFFF',
  textDark: '#1A1A1A',
  textGray: '#6B7280',
  border: '#E8E4D4',
  btnGray: '#F3F4F1',
  red: '#FF4D4D',
} as const;

interface PlayerRowState {
  name: string;
  runs: string;
  balls: string;
  wickets: string;
}

interface ScoreStateSnapshot {
  myScore: number;
  myWickets: number;
  myBalls: number;
  oppScore: number;
  oppWickets: number;
  oppBalls: number;
  myRoster: PlayerRowState[];
  oppRoster: PlayerRowState[];
  strikerName: string;
  nonStrikerName: string;
  isOnStrike: 'striker' | 'nonStriker';
  currentBowlerName: string;
  myExtras: number;
  oppExtras: number;
  dismissedPlayers: string[];
  matchStatus: 'Upcoming' | 'Live' | 'Innings Break' | 'Completed';
  currentInnings: 'First Innings' | 'Second Innings';
  batterHistories: Record<string, string[]>;
  bowlerHistories: Record<string, string[]>;
  bowlerStats: Record<string, { runs: number; balls: number; wickets: number }>;
  currentOverBalls: string[];
}

export default function ScorecardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    myTeamName?: string;
    oppTeamName?: string;
    myPlayers?: string;
    oppPlayers?: string;
    matchId?: string;
    battingFirst?: string;
    striker?: string;
    nonStriker?: string;
    openingBowler?: string;
    format?: string;
    customOvers?: string;
  }>();

  const myTeamName = params.myTeamName || 'Crickstreet CC';
  const oppTeamName = params.oppTeamName || 'Opponents';
  const matchId = params.matchId || '';
  const matchFormat = params.format || 'T20';
  const maxOvers = parseInt(params.customOvers || '20', 10);
  
  const initialMyPlayers: string[] = useMemo(() => {
    try { return params.myPlayers ? JSON.parse(params.myPlayers) : []; } catch { return []; }
  }, [params.myPlayers]);
  const initialOppPlayers: string[] = useMemo(() => {
    try { return params.oppPlayers ? JSON.parse(params.oppPlayers) : []; } catch { return []; }
  }, [params.oppPlayers]);

  const { user } = useAuth();
  const uid = user?.uid || '';

  // ── Innings States & Core Scores ──────────────────────────────────────────
  const [matchStatus, setMatchStatus] = useState<'Upcoming' | 'Live' | 'Innings Break' | 'Completed'>('Live');
  const [currentInnings, setCurrentInnings] = useState<'First Innings' | 'Second Innings'>('First Innings');
  const [battingTeam, setBattingTeam] = useState<'my' | 'opp'>(params.battingFirst === 'opp' ? 'opp' : 'my');

  // Scores
  const [myScore, setMyScore] = useState(0);
  const [myWickets, setMyWickets] = useState(0);
  const [myBalls, setMyBalls] = useState(0);
  const [myExtras, setMyExtras] = useState(0);

  const [oppScore, setOppScore] = useState(0);
  const [oppWickets, setOppWickets] = useState(0);
  const [oppBalls, setOppBalls] = useState(0);
  const [oppExtras, setOppExtras] = useState(0);

  // Player Stats rosters
  const [myRoster, setMyRoster] = useState<PlayerRowState[]>(
    initialMyPlayers.map(name => ({ name, runs: '0', balls: '0', wickets: '0' }))
  );
  const [oppRoster, setOppRoster] = useState<PlayerRowState[]>(
    initialOppPlayers.map(name => ({ name, runs: '0', balls: '0', wickets: '0' }))
  );

  // Active Players
  const battingPlayers = battingTeam === 'my' ? initialMyPlayers : initialOppPlayers;
  const bowlingPlayers = battingTeam === 'my' ? initialOppPlayers : initialMyPlayers;

  const [strikerName, setStrikerName] = useState<string>(
    params.striker || battingPlayers[0] || 'Batter 1'
  );
  const [nonStrikerName, setNonStrikerName] = useState<string>(
    params.nonStriker || battingPlayers[1] || 'Batter 2'
  );
  const [isOnStrike, setIsOnStrike] = useState<'striker' | 'nonStriker'>('striker');
  const [currentBowlerName, setCurrentBowlerName] = useState<string>(
    params.openingBowler || bowlingPlayers[0] || 'Bowler'
  );

  // Tracking dismissals
  const [dismissedPlayers, setDismissedPlayers] = useState<string[]>([]);
  const [batterRoleToReplace, setBatterRoleToReplace] = useState<'striker' | 'nonStriker' | null>(null);

  // Individual ball histories
  const [batterHistories, setBatterHistories] = useState<Record<string, string[]>>({});
  const [bowlerHistories, setBowlerHistories] = useState<Record<string, string[]>>({});

  // Bowler stats map (runs, balls, wickets)
  const [bowlerStats, setBowlerStats] = useState<Record<string, { runs: number; balls: number; wickets: number }>>({});
  const [currentOverBalls, setCurrentOverBalls] = useState<string[]>([]);

  // History stack for Undo
  const [history, setHistory] = useState<ScoreStateSnapshot[]>([]);

  // Modal selectors
  const [showNewBatterModal, setShowNewBatterModal] = useState(false);
  const [winAnimationWinner, setWinAnimationWinner] = useState<'my' | 'opp' | null>(null);
  const [completedMatchScores, setCompletedMatchScores] = useState<{
    myScore: number;
    oppScore: number;
    myWickets: number;
    oppWickets: number;
    resultText: string;
  } | null>(null);
  const [showNewBowlerModal, setShowNewBowlerModal] = useState(false);
  const [loadingDb, setLoadingDb] = useState(true);
  const [saving, setSaving] = useState(false);

  // Practice Match States
  const [matchType, setMatchType] = useState<string>('');
  const isPractice = useMemo(() => {
    return isPracticeMatch(oppTeamName, matchType);
  }, [oppTeamName, matchType]);

  // Notification settings
  const [notifPrefs, setNotifPrefs] = useState<any>({
    inningsBreakNotification: true,
    matchCompletedNotification: true,
  });

  // Calculate current display values
  const currentBattingScore = battingTeam === 'my' ? myScore : oppScore;
  const currentBattingWickets = battingTeam === 'my' ? myWickets : oppWickets;
  const currentBattingBalls = battingTeam === 'my' ? myBalls : oppBalls;
  const currentBattingExtras = battingTeam === 'my' ? myExtras : oppExtras;

  const currentOvers = Math.floor(currentBattingBalls / 6);
  const currentBallsInOver = currentBattingBalls % 6;
  const overDisplay = `${currentOvers}.${currentBallsInOver}`;

  const currentRunRate = useMemo(() => {
    if (currentBattingBalls === 0) return '0.00';
    return ((currentBattingScore / currentBattingBalls) * 6).toFixed(2);
  }, [currentBattingScore, currentBattingBalls]);

  // Striker & Non-Striker details
  const activeStrikerStats = useMemo(() => {
    const roster = battingTeam === 'my' ? myRoster : oppRoster;
    return roster.find(p => p.name === strikerName) || { runs: '0', balls: '0' };
  }, [myRoster, oppRoster, battingTeam, strikerName]);

  const activeNonStrikerStats = useMemo(() => {
    const roster = battingTeam === 'my' ? myRoster : oppRoster;
    return roster.find(p => p.name === nonStrikerName) || { runs: '0', balls: '0' };
  }, [myRoster, oppRoster, battingTeam, nonStrikerName]);

  // Load live match state from Firestore (resuming scorecard)
  useEffect(() => {
    if (!uid || !matchId) {
      setLoadingDb(false);
      return;
    }

    async function loadMatchState() {
      try {
        const matchRef = doc(db, 'users', uid, 'matches', matchId);
        const matchSnap = await getDoc(matchRef);
        if (matchSnap.exists()) {
          const data = matchSnap.data();
          
          if (data.status === 'live' || data.status === 'Live' || data.status === 'Innings Break' || data.status === 'completed' || data.status === 'Completed') {
            if (data.myScoreRuns !== undefined) setMyScore(data.myScoreRuns);
            if (data.myScoreWickets !== undefined) setMyWickets(data.myScoreWickets);
            if (data.myScoreBalls !== undefined) setMyBalls(data.myScoreBalls);
            if (data.myExtras !== undefined) setMyExtras(data.myExtras);

            if (data.oppScoreRuns !== undefined) setOppScore(data.oppScoreRuns);
            if (data.oppScoreWickets !== undefined) setOppWickets(data.oppScoreWickets);
            if (data.oppScoreBalls !== undefined) setOppBalls(data.oppScoreBalls);
            if (data.oppExtras !== undefined) setOppExtras(data.oppExtras);

            if (data.myRoster !== undefined) setMyRoster(data.myRoster);
            if (data.oppRoster !== undefined) setOppRoster(data.oppRoster);

            if (data.strikerName !== undefined) setStrikerName(data.strikerName);
            if (data.nonStrikerName !== undefined) setNonStrikerName(data.nonStrikerName);
            if (data.isOnStrike !== undefined) setIsOnStrike(data.isOnStrike);
            if (data.currentBowlerName !== undefined) setCurrentBowlerName(data.currentBowlerName);
            if (data.dismissedPlayers !== undefined) setDismissedPlayers(data.dismissedPlayers);
            if (data.currentInnings !== undefined) setCurrentInnings(data.currentInnings);
            if (data.battingTeam !== undefined) setBattingTeam(data.battingTeam);
            if (data.matchStatus !== undefined) setMatchStatus(data.matchStatus);
            if (data.matchType !== undefined) setMatchType(data.matchType);
            if (data.matchStatus === 'Innings Break') {
              router.replace({
                pathname: '/innings-break-timer',
                params: { matchId, uid }
              });
              return;
            }
            if (data.status === 'completed' || data.status === 'Completed') {
              setMatchStatus('Completed');
            }
            if (data.batterHistories !== undefined) setBatterHistories(data.batterHistories);
            if (data.bowlerHistories !== undefined) setBowlerHistories(data.bowlerHistories);
            if (data.bowlerStats !== undefined) setBowlerStats(data.bowlerStats);
            if (data.currentOverBalls !== undefined) setCurrentOverBalls(data.currentOverBalls);
            
            if (data.historySnapshotStack !== undefined) {
              setHistory(data.historySnapshotStack);
            }
          }
        }
      } catch (err) {
        console.error('Error loading match state from Firestore:', err);
      } finally {
        setLoadingDb(false);
      }
    }

    loadMatchState();
  }, [uid, matchId]);

  // Load notification preferences
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
          }
        }
      } catch (err) {
        console.log('Error loading notification preferences:', err);
      }
    }
    fetchPrefs();
  }, [uid]);

  // Firestore intermediate state sync function
  const syncMatchStateToDb = async (updates: Record<string, any>) => {
    if (!uid || !matchId) return;
    try {
      const matchRef = doc(db, 'users', uid, 'matches', matchId);
      await updateDoc(matchRef, updates);
    } catch (err) {
      console.error('Error syncing live match progress to Firestore:', err);
    }
  };

  // Helper to compile state snapshot
  const getSnapshot = (): ScoreStateSnapshot => {
    return {
      myScore,
      myWickets,
      myBalls,
      oppScore,
      oppWickets,
      oppBalls,
      myRoster: JSON.parse(JSON.stringify(myRoster)),
      oppRoster: JSON.parse(JSON.stringify(oppRoster)),
      strikerName,
      nonStrikerName,
      isOnStrike,
      currentBowlerName,
      myExtras,
      oppExtras,
      dismissedPlayers,
      matchStatus,
      currentInnings,
      batterHistories: JSON.parse(JSON.stringify(batterHistories)),
      bowlerHistories: JSON.parse(JSON.stringify(bowlerHistories)),
      bowlerStats: JSON.parse(JSON.stringify(bowlerStats)),
      currentOverBalls: [...currentOverBalls],
    };
  };

  // Save current state to history stack
  const saveToHistory = () => {
    const snap = getSnapshot();
    const nextHistory = [...history, snap];
    setHistory(nextHistory);
    return nextHistory;
  };

  // Revert last action
  const handleUndo = () => {
    if (history.length === 0) {
      Alert.alert('Info', 'Nothing to undo!');
      return;
    }
    const prevHistory = [...history];
    const prev = prevHistory.pop()!;
    
    if (currentInnings === 'Second Innings' && prev.currentInnings === 'First Innings') {
      Alert.alert('Undo Blocked', 'Cannot undo across innings break!');
      return;
    }
    
    setMyScore(prev.myScore);
    setMyWickets(prev.myWickets);
    setMyBalls(prev.myBalls);
    setOppScore(prev.oppScore);
    setOppWickets(prev.oppWickets);
    setOppBalls(prev.oppBalls);
    setMyRoster(prev.myRoster);
    setOppRoster(prev.oppRoster);
    setStrikerName(prev.strikerName);
    setNonStrikerName(prev.nonStrikerName);
    setIsOnStrike(prev.isOnStrike);
    setCurrentBowlerName(prev.currentBowlerName);
    setMyExtras(prev.myExtras);
    setOppExtras(prev.oppExtras);
    setDismissedPlayers(prev.dismissedPlayers);
    setMatchStatus(prev.matchStatus);
    setCurrentInnings(prev.currentInnings);
    setBatterHistories(prev.batterHistories);
    setBowlerHistories(prev.bowlerHistories);
    setBowlerStats(prev.bowlerStats);
    setCurrentOverBalls(prev.currentOverBalls || []);
    setBatterRoleToReplace(null);

    setHistory(prevHistory);

    // Sync reverted state to DB
    syncMatchStateToDb({
      myScoreRuns: prev.myScore,
      myScoreWickets: prev.myWickets,
      myScoreBalls: prev.myBalls,
      myExtras: prev.myExtras,
      oppScoreRuns: prev.oppScore,
      oppScoreWickets: prev.oppWickets,
      oppScoreBalls: prev.oppBalls,
      oppExtras: prev.oppExtras,
      myScore: `${prev.myScore}/${prev.myWickets}`,
      oppScore: `${prev.oppScore}/${prev.oppWickets}`,
      myRoster: prev.myRoster,
      oppRoster: prev.oppRoster,
      strikerName: prev.strikerName,
      nonStrikerName: prev.nonStrikerName,
      isOnStrike: prev.isOnStrike,
      currentBowlerName: prev.currentBowlerName,
      dismissedPlayers: prev.dismissedPlayers,
      currentInnings: prev.currentInnings,
      battingTeam: battingTeam,
      matchStatus: prev.matchStatus,
      batterHistories: prev.batterHistories,
      bowlerHistories: prev.bowlerHistories,
      bowlerStats: prev.bowlerStats,
      currentOverBalls: prev.currentOverBalls || [],
      historySnapshotStack: prevHistory,
    });
  };

  // Toggle Strike
  const handleToggleStrike = (target: 'striker' | 'nonStriker') => {
    const nextHistory = saveToHistory();
    setIsOnStrike(target);
    syncMatchStateToDb({
      isOnStrike: target,
      historySnapshotStack: nextHistory,
    });
  };

  const rotateStrike = (currentStrike: 'striker' | 'nonStriker') => {
    return currentStrike === 'striker' ? 'nonStriker' : 'striker';
  };

  // Check Over ending
  const checkOverCompletion = (
    updatedBalls: number,
    currentStrike: 'striker' | 'nonStriker',
    wickets: number,
    score: number,
    customDismissedList?: string[]
  ) => {
    const rotated = rotateStrike(currentStrike);

    // Calculate if the innings is ending
    const isFirstInnings = currentInnings === 'First Innings';
    const firstInningsScore = battingTeam === 'my' ? oppScore : myScore;
    const target = firstInningsScore + 1;

    const currentDismissed = customDismissedList || dismissedPlayers;
    const totalBattingPlayers = battingPlayers.length;
    const maxWickets = totalBattingPlayers > 1 ? Math.min(10, totalBattingPlayers - 1) : 10;
    const isAllOut = wickets >= maxWickets;
    const isOversFinished = updatedBalls >= maxOvers * 6;
    const isTargetChased = !isFirstInnings && score >= target;
    
    const isEnding = isAllOut || isOversFinished || isTargetChased;

    if (updatedBalls > 0 && updatedBalls % 6 === 0 && !isEnding) {
      setIsOnStrike(rotated);
      
      const opponentIsBowling = battingTeam === 'my';
      if (isPractice && opponentIsBowling) {
        // Skip over-ended Alert for opponent bowlers!
        return { overCompleted: true, nextStrike: rotated };
      }

      Alert.alert('Over Completed 🏏', 'Please select the next bowler.', [
        { text: 'OK', onPress: () => setShowNewBowlerModal(true) }
      ]);
      return { overCompleted: true, nextStrike: rotated };
    }
    return { overCompleted: false, nextStrike: currentStrike };
  };

  // Check Innings or Match Ending Conditions
  const checkInningsOrMatchEnd = (
    nextScore: number,
    nextBalls: number,
    nextWickets: number,
    customDismissedList?: string[]
  ) => {
    const isMyBatting = battingTeam === 'my';
    const currentDismissed = customDismissedList || dismissedPlayers;
    
    if (currentInnings === 'First Innings') {
      const totalBattingPlayers = battingPlayers.length;
      const maxWickets = totalBattingPlayers > 1 ? Math.min(10, totalBattingPlayers - 1) : 10;
      const isAllOut = nextWickets >= maxWickets;
      const isOversFinished = nextBalls >= maxOvers * 6;
      
      if (isAllOut || isOversFinished) {
        // Prepare parameters for Second Innings and redirect to timer screen
        const nextHistory = saveToHistory();
        const nextBattingTeam = battingTeam === 'my' ? 'opp' : 'my';
        const nextBattingPlayers = nextBattingTeam === 'my' ? initialMyPlayers : initialOppPlayers;
        const nextBowlingPlayers = nextBattingTeam === 'my' ? initialOppPlayers : initialMyPlayers;
        
        const nextStriker = (isPractice && nextBattingTeam === 'opp')
          ? 'Opp 1'
          : (nextBattingPlayers[0] || 'Batter 1');
        const nextNonStriker = (isPractice && nextBattingTeam === 'opp')
          ? 'Opp 2'
          : (nextBattingPlayers[1] || 'Batter 2');
        const nextBowler = (isPractice && nextBattingTeam === 'my')
          ? 'Opp bowl 1'
          : (nextBowlingPlayers[0] || 'Bowler');

        setMatchStatus('Innings Break');

        if (uid && matchId) {
          const matchRef = doc(db, 'users', uid, 'matches', matchId);
          updateDoc(matchRef, {
            currentInnings: 'Second Innings',
            matchStatus: 'Innings Break',
            status: 'live',
            battingTeam: nextBattingTeam,
            strikerName: nextStriker,
            nonStrikerName: nextNonStriker,
            currentBowlerName: nextBowler,
            isOnStrike: 'striker',
            dismissedPlayers: [],
            historySnapshotStack: nextHistory,
          }).then(() => {
            router.replace({
              pathname: '/innings-break-timer',
              params: { matchId, uid }
            });
          });
        }
        return true;
      }
    } else {
      // Second Innings
      const firstInningsScore = isMyBatting ? oppScore : myScore;
      const target = firstInningsScore + 1;
      
      if (nextScore >= target) {
        const chasingTeamName = isMyBatting ? myTeamName : oppTeamName;
        const wicketsWonBy = 10 - nextWickets;
        const winReason = `${chasingTeamName} won by ${wicketsWonBy} wicket${wicketsWonBy !== 1 ? 's' : ''}`;
        
        setCompletedMatchScores({
          myScore: isMyBatting ? nextScore : myScore,
          oppScore: !isMyBatting ? nextScore : oppScore,
          myWickets: isMyBatting ? nextWickets : myWickets,
          oppWickets: !isMyBatting ? nextWickets : oppWickets,
          resultText: winReason,
        });
        setWinAnimationWinner(isMyBatting ? 'my' : 'opp');
        return true;
      }
      
      const totalBattingPlayers = battingPlayers.length;
      const maxWickets = totalBattingPlayers > 1 ? Math.min(10, totalBattingPlayers - 1) : 10;
      const isAllOut = nextWickets >= maxWickets;
      const isOversFinished = nextBalls >= maxOvers * 6;
      
      if (isAllOut || isOversFinished) {
        const chasingTeamName = isMyBatting ? myTeamName : oppTeamName;
        const defendingTeamName = isMyBatting ? oppTeamName : myTeamName;
        
        let resultMessage = '';
        if (nextScore === target - 1) {
          resultMessage = 'Match Tied!';
        } else {
          const runMargin = firstInningsScore - nextScore;
          resultMessage = `${defendingTeamName} won by ${runMargin} run${runMargin !== 1 ? 's' : ''}`;
        }
        
        const finalWinnerKey = nextScore === target - 1 ? 'opp' : (isMyBatting ? 'opp' : 'my');

        setCompletedMatchScores({
          myScore: isMyBatting ? nextScore : myScore,
          oppScore: !isMyBatting ? nextScore : oppScore,
          myWickets: isMyBatting ? nextWickets : myWickets,
          oppWickets: !isMyBatting ? nextWickets : oppWickets,
          resultText: resultMessage,
        });
        setWinAnimationWinner(finalWinnerKey === 'my' ? 'my' : 'opp');
        return true;
      }
    }
    return false;
  };

  // Record Runs Conceded/Scored
  const handleRecordRuns = (runs: number) => {
    const nextHistory = saveToHistory();

    const activeBatter = isOnStrike === 'striker' ? strikerName : nonStrikerName;
    const nextBatterHistories = {
      ...batterHistories,
      [activeBatter]: [...(batterHistories[activeBatter] || []), runs.toString()]
    };
    setBatterHistories(nextBatterHistories);

    // Update bowler stats and bowler over history
    const bStats = bowlerStats[currentBowlerName] || { runs: 0, balls: 0, wickets: 0 };
    const nextBowlerStats = {
      ...bowlerStats,
      [currentBowlerName]: {
        ...bStats,
        runs: bStats.runs + runs,
        balls: bStats.balls + 1,
      }
    };
    setBowlerStats(nextBowlerStats);

    const nextBowlerHistories = {
      ...bowlerHistories,
      [currentBowlerName]: [...(bowlerHistories[currentBowlerName] || []), runs.toString()]
    };
    setBowlerHistories(nextBowlerHistories);

    const nextOverBalls = [...currentOverBalls, runs.toString()];

    let nextStrike = isOnStrike;
    if (runs % 2 !== 0) {
      nextStrike = rotateStrike(isOnStrike);
      setIsOnStrike(nextStrike);
    }

    const isMyBatting = battingTeam === 'my';
    const nextMyScore = isMyBatting ? myScore + runs : myScore;
    const nextOppScore = !isMyBatting ? oppScore + runs : oppScore;

    const nextRoster = (isMyBatting ? myRoster : oppRoster).map(p => {
      if (p.name === activeBatter) {
        return {
          ...p,
          runs: String(parseInt(p.runs, 10) + runs),
          balls: String(parseInt(p.balls, 10) + 1)
        };
      }
      return p;
    });

    if (isMyBatting) {
      setMyRoster(nextRoster);
      setMyScore(nextMyScore);
      setMyBalls(prev => {
        const nextBalls = prev + 1;
        const check = checkOverCompletion(nextBalls, nextStrike, myWickets, nextMyScore);
        
        const nextBowlerName = (check.overCompleted && isPractice)
          ? getNextOpponentBowlerName(currentBowlerName)
          : currentBowlerName;

        const nextOverBallsState = check.overCompleted ? [] : nextOverBalls;
        setCurrentOverBalls(nextOverBallsState);

        syncMatchStateToDb({
          myScoreRuns: nextMyScore,
          myScoreBalls: nextBalls,
          myScore: `${nextMyScore}/${myWickets}`,
          myRoster: nextRoster,
          oppRoster: oppRoster,
          batterHistories: nextBatterHistories,
          bowlerHistories: nextBowlerHistories,
          bowlerStats: nextBowlerStats,
          currentOverBalls: nextOverBallsState,
          isOnStrike: check.nextStrike,
          currentBowlerName: nextBowlerName,
          historySnapshotStack: nextHistory,
        });

        if (check.overCompleted && isPractice) {
          setTimeout(() => {
            setCurrentBowlerName(nextBowlerName);
          }, 0);
        }

        return nextBalls;
      });

      checkInningsOrMatchEnd(nextMyScore, myBalls + 1, myWickets);
    } else {
      setOppRoster(nextRoster);
      setOppScore(nextOppScore);
      setOppBalls(prev => {
        const nextBalls = prev + 1;
        const check = checkOverCompletion(nextBalls, nextStrike, oppWickets, nextOppScore);

        const nextOverBallsState = check.overCompleted ? [] : nextOverBalls;
        setCurrentOverBalls(nextOverBallsState);

        syncMatchStateToDb({
          oppScoreRuns: nextOppScore,
          oppScoreBalls: nextBalls,
          oppScore: `${nextOppScore}/${oppWickets}`,
          oppRoster: nextRoster,
          myRoster: myRoster,
          batterHistories: nextBatterHistories,
          bowlerHistories: nextBowlerHistories,
          bowlerStats: nextBowlerStats,
          currentOverBalls: nextOverBallsState,
          isOnStrike: check.nextStrike,
          historySnapshotStack: nextHistory,
        });
        return nextBalls;
      });

      checkInningsOrMatchEnd(nextOppScore, oppBalls + 1, oppWickets);
    }
  };

  // Record Extras Conceded/Scored
  const handleRecordExtra = (type: 'wide' | 'noball') => {
    const nextHistory = saveToHistory();

    const isMyBatting = battingTeam === 'my';
    const nextMyScore = isMyBatting ? myScore + 1 : myScore;
    const nextOppScore = !isMyBatting ? oppScore + 1 : oppScore;
    const nextMyExtras = isMyBatting ? myExtras + 1 : myExtras;
    const nextOppExtras = !isMyBatting ? oppExtras + 1 : oppExtras;

    // Bowler conceded stats
    const bStats = bowlerStats[currentBowlerName] || { runs: 0, balls: 0, wickets: 0 };
    const nextBowlerStats = {
      ...bowlerStats,
      [currentBowlerName]: {
        ...bStats,
        runs: bStats.runs + 1,
        // balls does not increment on wide or no ball
      }
    };
    setBowlerStats(nextBowlerStats);

    const nextBowlerHistories = {
      ...bowlerHistories,
      [currentBowlerName]: [...(bowlerHistories[currentBowlerName] || []), type === 'wide' ? 'wd' : 'nb']
    };
    setBowlerHistories(nextBowlerHistories);

    const nextOverBalls = [...currentOverBalls, type === 'wide' ? 'wd' : 'nb'];
    setCurrentOverBalls(nextOverBalls);

    let nextRoster = isMyBatting ? myRoster : oppRoster;
    let nextBatterHistories = batterHistories;

    if (type === 'noball') {
      const activeBatter = isOnStrike === 'striker' ? strikerName : nonStrikerName;
      nextRoster = (isMyBatting ? myRoster : oppRoster).map(p => {
        if (p.name === activeBatter) {
          return { ...p, balls: String(parseInt(p.balls, 10) + 1) };
        }
        return p;
      });
      nextBatterHistories = {
        ...batterHistories,
        [activeBatter]: [...(batterHistories[activeBatter] || []), 'nb']
      };
      setBatterHistories(nextBatterHistories);
    } else if (type === 'wide') {
      const activeBatter = isOnStrike === 'striker' ? strikerName : nonStrikerName;
      nextBatterHistories = {
        ...batterHistories,
        [activeBatter]: [...(batterHistories[activeBatter] || []), 'wd']
      };
      setBatterHistories(nextBatterHistories);
    }

    if (isMyBatting) {
      setMyScore(nextMyScore);
      setMyExtras(nextMyExtras);
      setMyRoster(nextRoster);

      syncMatchStateToDb({
        myScoreRuns: nextMyScore,
        myExtras: nextMyExtras,
        myScore: `${nextMyScore}/${myWickets}`,
        myRoster: nextRoster,
        oppRoster: oppRoster,
        batterHistories: nextBatterHistories,
        bowlerHistories: nextBowlerHistories,
        bowlerStats: nextBowlerStats,
        currentOverBalls: nextOverBalls,
        historySnapshotStack: nextHistory,
      });

      if (currentInnings === 'Second Innings') {
        checkInningsOrMatchEnd(nextMyScore, myBalls, myWickets);
      }
    } else {
      setOppScore(nextOppScore);
      setOppExtras(nextOppExtras);
      setOppRoster(nextRoster);

      syncMatchStateToDb({
        oppScoreRuns: nextOppScore,
        oppExtras: nextOppExtras,
        oppScore: `${nextOppScore}/${oppWickets}`,
        oppRoster: nextRoster,
        myRoster: myRoster,
        batterHistories: nextBatterHistories,
        bowlerHistories: nextBowlerHistories,
        bowlerStats: nextBowlerStats,
        currentOverBalls: nextOverBalls,
        historySnapshotStack: nextHistory,
      });

      if (currentInnings === 'Second Innings') {
        checkInningsOrMatchEnd(nextOppScore, oppBalls, oppWickets);
      }
    }
  };

  // Record Wicket Conceded/Taken
  const handleRecordWicket = () => {
    const nextHistory = saveToHistory();
    setBatterRoleToReplace(isOnStrike);

    const activeBatter = isOnStrike === 'striker' ? strikerName : nonStrikerName;
    const nextBatterHistories = {
      ...batterHistories,
      [activeBatter]: [...(batterHistories[activeBatter] || []), 'W']
    };
    setBatterHistories(nextBatterHistories);

    // Update bowler stats and bowler over history
    const bStats = bowlerStats[currentBowlerName] || { runs: 0, balls: 0, wickets: 0 };
    const nextBowlerStats = {
      ...bowlerStats,
      [currentBowlerName]: {
        ...bStats,
        balls: bStats.balls + 1,
        wickets: bStats.wickets + 1,
      }
    };
    setBowlerStats(nextBowlerStats);

    const nextBowlerHistories = {
      ...bowlerHistories,
      [currentBowlerName]: [...(bowlerHistories[currentBowlerName] || []), 'W']
    };
    setBowlerHistories(nextBowlerHistories);

    const nextOverBalls = [...currentOverBalls, 'W'];

    const isMyBatting = battingTeam === 'my';
    const nextMyWickets = isMyBatting ? myWickets + 1 : myWickets;
    const nextOppWickets = !isMyBatting ? oppWickets + 1 : oppWickets;

    let localMyRoster = myRoster;
    let localOppRoster = oppRoster;

    const nextDismissed = [...dismissedPlayers, activeBatter];
    setDismissedPlayers(nextDismissed);

    if (isMyBatting) {
      localMyRoster = myRoster.map(p => {
        if (p.name === activeBatter) {
          return { ...p, balls: String(parseInt(p.balls, 10) + 1) };
        }
        return p;
      });
      localOppRoster = oppRoster.map(p => {
        if (p.name === currentBowlerName) {
          return { ...p, wickets: String(parseInt(p.wickets, 10) + 1) };
        }
        return p;
      });

      setMyWickets(nextMyWickets);
      setMyRoster(localMyRoster);
      setOppRoster(localOppRoster);

      setMyBalls(prev => {
        const nextBalls = prev + 1;
        const check = checkOverCompletion(nextBalls, isOnStrike, nextMyWickets, myScore, nextDismissed);
        
        const nextBowlerName = (check.overCompleted && isPractice)
          ? getNextOpponentBowlerName(currentBowlerName)
          : currentBowlerName;

        const nextOverBallsState = check.overCompleted ? [] : nextOverBalls;
        setCurrentOverBalls(nextOverBallsState);

        syncMatchStateToDb({
          myScoreWickets: nextMyWickets,
          myScoreBalls: nextBalls,
          myScore: `${myScore}/${nextMyWickets}`,
          myRoster: localMyRoster,
          oppRoster: localOppRoster,
          batterHistories: nextBatterHistories,
          bowlerHistories: nextBowlerHistories,
          bowlerStats: nextBowlerStats,
          currentOverBalls: nextOverBallsState,
          isOnStrike: check.nextStrike,
          currentBowlerName: nextBowlerName,
          dismissedPlayers: nextDismissed,
          historySnapshotStack: nextHistory,
        });

        if (check.overCompleted && isPractice) {
          setTimeout(() => {
            setCurrentBowlerName(nextBowlerName);
          }, 0);
        }

        return nextBalls;
      });

      const isFinished = checkInningsOrMatchEnd(myScore, myBalls + 1, nextMyWickets, nextDismissed);
      if (!isFinished) {
        setShowNewBatterModal(true);
      }
    } else {
      localOppRoster = oppRoster.map(p => {
        if (p.name === activeBatter) {
          return { ...p, balls: String(parseInt(p.balls, 10) + 1) };
        }
        return p;
      });
      localMyRoster = myRoster.map(p => {
        if (p.name === currentBowlerName) {
          return { ...p, wickets: String(parseInt(p.wickets, 10) + 1) };
        }
        return p;
      });

      setOppWickets(nextOppWickets);
      setOppRoster(localOppRoster);
      setMyRoster(localMyRoster);

      const isFinished = checkInningsOrMatchEnd(oppScore, oppBalls + 1, nextOppWickets, nextDismissed);

      setOppBalls(prev => {
        const nextBalls = prev + 1;
        const check = checkOverCompletion(nextBalls, isOnStrike, nextOppWickets, oppScore, nextDismissed);
        
        const nextBatterName = isPractice ? getNextOpponentBatterName(nextDismissed.length) : (isOnStrike === 'striker' ? strikerName : nonStrikerName);

        const nextOverBallsState = check.overCompleted ? [] : nextOverBalls;
        setCurrentOverBalls(nextOverBallsState);

        syncMatchStateToDb({
          oppScoreWickets: nextOppWickets,
          oppScoreBalls: nextBalls,
          oppScore: `${oppScore}/${nextOppWickets}`,
          oppRoster: localOppRoster,
          myRoster: localMyRoster,
          batterHistories: nextBatterHistories,
          bowlerHistories: nextBowlerHistories,
          bowlerStats: nextBowlerStats,
          currentOverBalls: nextOverBallsState,
          isOnStrike: check.nextStrike,
          strikerName: isOnStrike === 'striker' ? nextBatterName : strikerName,
          nonStrikerName: isOnStrike === 'nonStriker' ? nextBatterName : nonStrikerName,
          dismissedPlayers: nextDismissed,
          historySnapshotStack: nextHistory,
        });

        if (!isFinished && isPractice) {
          setTimeout(() => {
            if (isOnStrike === 'striker') {
              setStrikerName(nextBatterName);
            } else {
              setNonStrikerName(nextBatterName);
            }
          }, 0);
        }

        return nextBalls;
      });

      if (!isFinished) {
        if (isPractice) {
          // Bypassed opponent batter selection modal
        } else {
          setShowNewBatterModal(true);
        }
      }
    }
  };

  // Innings Break Transition
  const handleInningsBreak = () => {
    const nextHistory = saveToHistory();

    if (currentInnings === 'First Innings') {
      setCurrentInnings('Second Innings');
      setMatchStatus('Live');
      
      const nextBattingTeam = battingTeam === 'my' ? 'opp' : 'my';
      setBattingTeam(nextBattingTeam);
      
      const nextBattingPlayers = nextBattingTeam === 'my' ? initialMyPlayers : initialOppPlayers;
      const nextBowlingPlayers = nextBattingTeam === 'my' ? initialOppPlayers : initialMyPlayers;

      const nextStriker = nextBattingPlayers[0] || 'Batter 1';
      const nextNonStriker = nextBattingPlayers[1] || 'Batter 2';
      const nextBowler = nextBowlingPlayers[0] || 'Bowler';

      setStrikerName(nextStriker);
      setNonStrikerName(nextNonStriker);
      setCurrentBowlerName(nextBowler);
      setIsOnStrike('striker');
      setDismissedPlayers([]);

      if (notifPrefs.inningsBreakNotification) {
        triggerLocalNotification('Innings Break ⏸️', 'First innings completed. Switch over in progress.');
      }

      syncMatchStateToDb({
        currentInnings: 'Second Innings',
        matchStatus: 'Live',
        battingTeam: nextBattingTeam,
        strikerName: nextStriker,
        nonStrikerName: nextNonStriker,
        currentBowlerName: nextBowler,
        isOnStrike: 'striker',
        dismissedPlayers: [],
        historySnapshotStack: nextHistory,
      });
    } else {
      handleCompleteMatchDirectly();
    }
  };

  // Complete and Save Match (Database Submit)
  const handleCompleteMatchDirectly = async (
    overrideMyScore?: number,
    overrideOppScore?: number,
    overrideMyWickets?: number,
    overrideOppWickets?: number
  ) => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const querySnapshot = await getDocs(collection(db, 'users'));

      const allStats = [...myRoster, ...oppRoster];
      const myTeamRuns = overrideMyScore !== undefined ? overrideMyScore : myScore;
      const oppTeamRuns = overrideOppScore !== undefined ? overrideOppScore : oppScore;
      const myTeamWickets = overrideMyWickets !== undefined ? overrideMyWickets : myWickets;
      const oppTeamWickets = overrideOppWickets !== undefined ? overrideOppWickets : oppWickets;
      
      const winner = myTeamRuns > oppTeamRuns ? 'my' : (oppTeamRuns > myTeamRuns ? 'opp' : 'tie');
      const winningTeamName = winner === 'my' ? myTeamName : (winner === 'opp' ? oppTeamName : 'Tie');

      const firstBattingTeam = params.battingFirst === 'opp' ? 'opp' : 'my';
      const chasingTeam = firstBattingTeam === 'my' ? 'opp' : 'my';

      let resultString = 'Match Tied';
      if (winner !== 'tie') {
        if (winner === chasingTeam) {
          const wicketsLost = chasingTeam === 'my' ? myTeamWickets : oppTeamWickets;
          const wicketsWonBy = 10 - wicketsLost;
          resultString = `${winningTeamName} won by ${wicketsWonBy} wicket${wicketsWonBy !== 1 ? 's' : ''}`;
        } else {
          const runMargin = Math.abs(myTeamRuns - oppTeamRuns);
          resultString = `${winningTeamName} won by ${runMargin} run${runMargin !== 1 ? 's' : ''}`;
        }
      }

      let matchUpdatesCount = 0;

      querySnapshot.forEach(docSnap => {
        const userData = docSnap.data();
        const docId = docSnap.id;
        const displayName = userData.displayName || '';

        const playerStat = allStats.find(p => p.name.trim().toLowerCase() === displayName.trim().toLowerCase());
        if (playerStat) {
          const stats = userData.stats || {};
          const runsScored = parseInt(playerStat.runs, 10) || 0;
          const wicketsTaken = parseInt(playerStat.wickets, 10) || 0;
          const ballsFaced = parseInt(playerStat.balls, 10) || 0;

          const isMyTeamPlayer = myRoster.some(p => p.name === playerStat.name);
          const playerTeamName = isMyTeamPlayer ? myTeamName : oppTeamName;
          const isWinner = winner === 'tie' ? false : playerTeamName === winningTeamName;

          const newMatches = (stats.matches || 0) + 1;
          const newRuns = (stats.runs || 0) + runsScored;
          const newWickets = (stats.wickets || 0) + wicketsTaken;
          const newMatchesWon = (stats.matchesWon || 0) + (isWinner ? 1 : 0);
          const newWinPercentage = Math.round((newMatchesWon / newMatches) * 100);
          const newHighestScore = Math.max(stats.highestScore || 0, runsScored);
          
          const newBallsFaced = (stats.totalBallsFaced || 0) + ballsFaced;
          const newBattingAverage = Number((newRuns / newMatches).toFixed(1));
          const newStrikeRate = Number((newBallsFaced > 0 ? (runsScored / ballsFaced) * 100 : 0).toFixed(1));

          const matchLabel = `M${newMatches}`;
          const newLast5 = [
            { match: matchLabel, runs: runsScored, won: isWinner },
            ...(stats.last5 || [])
          ].slice(0, 5);

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
              totalBallsFaced: newBallsFaced,
              battingAverage: newBattingAverage,
              strikeRate: newStrikeRate,
              last5: newLast5,
            }
          });
          
          matchUpdatesCount++;
        }
      });

      if (uid && matchId) {
        const matchRef = doc(db, 'users', uid, 'matches', matchId);
        batch.update(matchRef, {
          status: 'completed',
          myScore: `${myTeamRuns}/${myTeamWickets}`,
          oppScore: `${oppTeamRuns}/${oppTeamWickets}`,
          statusText: resultString,
          endedAt: new Date().toISOString(),
          // Complete details
          myScoreRuns: myTeamRuns,
          oppScoreRuns: oppTeamRuns,
          myScoreWickets: myTeamWickets,
          oppScoreWickets: oppTeamWickets,
          myScoreBalls: myBalls,
          oppScoreBalls: oppBalls,
          myExtras,
          oppExtras,
          myRoster,
          oppRoster,
          batterHistories,
          bowlerHistories,
          bowlerStats,
          currentInnings,
          battingTeam,
          strikerName,
          nonStrikerName,
          currentBowlerName,
          dismissedPlayers,
          matchStatus: 'Completed',
        });
      }

      await batch.commit();

      if (notifPrefs.matchCompletedNotification) {
        triggerLocalNotification('Match Completed 🏆', 'The match scorecard has been calculated & archived.');
      }

      router.replace({
        pathname: '/(tabs)',
        params: { tab: 'home' }
      });

    } catch (err) {
      console.error('Error completing match stats:', err);
      Alert.alert('Database Error', 'Could not save scorecard stats.');
    } finally {
      setSaving(false);
    }
  };

  const selectNewBatter = (name: string) => {
    const nextHistory = saveToHistory();
    const roleToReplace = batterRoleToReplace || isOnStrike;
    if (roleToReplace === 'striker') {
      setStrikerName(name);
      syncMatchStateToDb({
        strikerName: name,
        historySnapshotStack: nextHistory,
      });
    } else {
      setNonStrikerName(name);
      syncMatchStateToDb({
        nonStrikerName: name,
        historySnapshotStack: nextHistory,
      });
    }
    setBatterRoleToReplace(null);
    setShowNewBatterModal(false);
  };

  const selectNewBowler = (name: string) => {
    const nextHistory = saveToHistory();
    setCurrentBowlerName(name);
    syncMatchStateToDb({
      currentBowlerName: name,
      historySnapshotStack: nextHistory,
    });
    setShowNewBowlerModal(false);
  };

  // Options bench
  const availableBatters = useMemo(() => {
    return battingPlayers.filter(
      p => p !== strikerName && p !== nonStrikerName && !dismissedPlayers.includes(p)
    );
  }, [battingPlayers, strikerName, nonStrikerName, dismissedPlayers]);

  const availableBowlers = useMemo(() => {
    const list = bowlingPlayers.filter(p => p !== currentBowlerName);
    return list.length > 0 ? list : bowlingPlayers;
  }, [bowlingPlayers, currentBowlerName]);

  // Render individual batsman wagon/ball history ( circles with 1, 6, 4, W)
  const renderBatterHistory = (playerName: string) => {
    const historyList = batterHistories[playerName] || [];
    if (historyList.length === 0) return null;
    
    return (
      <View style={styles.historyBallsRow}>
        {historyList.map((val, idx) => {
          const isBoundary = val === '4' || val === '6';
          const isWicket = val === 'W';
          return (
            <View
              key={idx}
              style={[
                styles.historyBallCircle,
                isBoundary && styles.historyBallCircleBoundary,
                isWicket && styles.historyBallCircleWkt
              ]}
            >
              <Text
                style={[
                  styles.historyBallTxt,
                  isBoundary && styles.historyBallTxtBoundary,
                  isWicket && styles.historyBallTxtWkt
                ]}
              >
                {val}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  // Render bowler over history
  const renderBowlerHistory = () => {
    if (currentOverBalls.length === 0) return null;
    
    return (
      <View style={styles.historyBallsRow}>
        {currentOverBalls.map((val, idx) => {
          const isBoundary = val === '4' || val === '6';
          const isWicket = val === 'W';
          return (
            <View
              key={idx}
              style={[
                styles.historyBallCircle,
                isBoundary && styles.historyBallCircleBoundary,
                isWicket && styles.historyBallCircleWkt
              ]}
            >
              <Text
                style={[
                  styles.historyBallTxt,
                  isBoundary && styles.historyBallTxtBoundary,
                  isWicket && styles.historyBallTxtWkt
                ]}
              >
                {val}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const getBowlerStatsDisplay = (name: string) => {
    const stats = bowlerStats[name] || { runs: 0, balls: 0, wickets: 0 };
    const overs = Math.floor(stats.balls / 6);
    const balls = stats.balls % 6;
    return `${overs}.${balls} overs • ${stats.runs} runs conceded • ${stats.wickets} wickets`;
  };

  // Dynamic Completed Match Result String
  const matchResultText = useMemo(() => {
    const myTeamRuns = myScore;
    const oppTeamRuns = oppScore;
    const winner = myTeamRuns > oppTeamRuns ? 'my' : (oppTeamRuns > myTeamRuns ? 'opp' : 'tie');
    const winningTeamName = winner === 'my' ? myTeamName : (winner === 'opp' ? oppTeamName : 'Tie');

    const firstBattingTeam = params.battingFirst === 'opp' ? 'opp' : 'my';
    const chasingTeam = firstBattingTeam === 'my' ? 'opp' : 'my';

    if (winner === 'tie') return 'Match Tied';
    
    if (winner === chasingTeam) {
      const wicketsLost = chasingTeam === 'my' ? myWickets : oppWickets;
      const wicketsWonBy = 10 - wicketsLost;
      return `${winningTeamName} won by ${wicketsWonBy} wicket${wicketsWonBy !== 1 ? 's' : ''}`;
    } else {
      const runMargin = Math.abs(myTeamRuns - oppTeamRuns);
      return `${winningTeamName} won by ${runMargin} run${runMargin !== 1 ? 's' : ''}`;
    }
  }, [myScore, oppScore, myWickets, oppWickets, myTeamName, oppTeamName, params.battingFirst]);

  if (loadingDb) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  const isUserBowling = battingTeam === 'opp';

  // Target and chase details
  const firstInningsScore = battingTeam === 'my' ? oppScore : myScore;
  const target = firstInningsScore + 1;
  const runsNeeded = target - currentBattingScore;
  const ballsRemaining = Math.max(0, (maxOvers * 6) - currentBattingBalls);

  return (
    <View style={styles.root}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.4, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header bar */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={C.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isUserBowling ? 'Live Bowling' : 'Live Scorecard'}
          </Text>
          <View style={{ width: s(40) }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          {/* Scoreboard overview card */}
          <View style={styles.scoreOverviewCard}>
            <View style={styles.scoreCardHeader}>
              {matchStatus === 'Completed' ? (
                <View style={[styles.liveIndicatorBadge, { backgroundColor: '#F3F4F1', borderColor: C.textGray }]}>
                  <Text style={[styles.liveIndicatorText, { color: C.textGray }]}>FINISHED</Text>
                </View>
              ) : (
                <View style={styles.liveIndicatorBadge}>
                  <View style={styles.liveIndicatorDot} />
                  <Text style={styles.liveIndicatorText}>LIVE</Text>
                </View>
              )}
              <Text style={styles.inningsText}>
                {currentInnings} • {matchFormat}
              </Text>
            </View>

            <Text style={styles.battingTeamName}>
              Batting: {battingTeam === 'my' ? myTeamName : oppTeamName}
            </Text>

            <View style={styles.runsOversContainer}>
              <View style={styles.runsCol}>
                <Text style={styles.runsText}>
                  {currentBattingScore}/{currentBattingWickets}
                </Text>
              </View>
              <View style={styles.oversCol}>
                <Text style={styles.oversLabel}>Overs</Text>
                <Text style={styles.oversText}>{overDisplay}</Text>
              </View>
            </View>

            {/* Target Display Row if Second Innings */}
            {currentInnings === 'Second Innings' && (
              <View style={styles.targetRow}>
                <Text style={styles.targetText}>
                  Target: {target}
                </Text>
                <Text style={styles.runsNeededText}>
                  Need {runsNeeded} runs off {ballsRemaining} balls
                </Text>
              </View>
            )}

            <View style={styles.scoreCardFooter}>
              <Text style={styles.footerStatText}>Extras: {currentBattingExtras}</Text>
              <Text style={styles.footerStatText}>CRR: {currentRunRate}</Text>
            </View>
          </View>

          {/* Completed Match Banner */}
          {matchStatus === 'Completed' && (
            <View style={styles.completedBanner}>
              <Text style={styles.completedBannerTitle}>🏆 Match Completed</Text>
              <Text style={styles.completedBannerDesc}>{matchResultText}</Text>
            </View>
          )}

          {/* DYNAMIC LAYOUT BASED ON BATTING/BOWLING (Sketches integration) */}
          {isUserBowling ? (
            /* User Team is Bowling -> Bowler main card at top */
            <>
              {/* Bowler Main Card (Second Drawing: Bowler -- card) */}
              <View style={styles.bowlerSection}>
                <Text style={styles.sectionLabel}>BOWLER (MY TEAM)</Text>
                <TouchableOpacity
                  activeOpacity={matchStatus === 'Completed' ? 1.0 : 0.8}
                  onPress={matchStatus === 'Completed' ? undefined : () => setShowNewBowlerModal(true)}
                  style={[styles.bowlerCard, matchStatus !== 'Completed' && styles.bowlerCardActive]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#EAF7E6' }]}>
                    <Text style={{ fontSize: 18 }}>⚾</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bowlerName, { color: C.greenDark, fontWeight: '800' }]}>
                      {currentBowlerName}
                    </Text>
                    <Text style={styles.bowlerSubtitle}>
                      {getBowlerStatsDisplay(currentBowlerName)}
                    </Text>
                    {/* ball history tracker circles under bowler name */}
                    {renderBowlerHistory()}
                  </View>
                  {matchStatus !== 'Completed' && (
                    <Feather name="refresh-cw" size={16} color={C.greenDark} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Batsmen Roster (Smaller cards below) */}
              <View style={styles.battersSection}>
                <Text style={styles.sectionLabel}>BATSMEN (OPP TEAM)</Text>
                
                <TouchableOpacity
                  activeOpacity={matchStatus === 'Completed' ? 1.0 : 0.9}
                  onPress={matchStatus === 'Completed' ? undefined : () => handleToggleStrike('striker')}
                  style={[
                    styles.batterRowCard,
                    matchStatus !== 'Completed' && isOnStrike === 'striker' && styles.batterRowCardActiveMini
                  ]}
                >
                  <View style={styles.batterDetails}>
                    <Text style={styles.playerName}>{strikerName}</Text>
                    <Text style={styles.playerStatsText}>
                      {activeStrikerStats.runs} runs ({activeStrikerStats.balls} balls)
                    </Text>
                  </View>
                  {isOnStrike === 'striker' && (
                    <View style={[styles.strikeIconBadge, { width: s(20), height: s(20) }]}>
                      <Text style={{ fontSize: 10 }}>🏏</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={matchStatus === 'Completed' ? 1.0 : 0.9}
                  onPress={matchStatus === 'Completed' ? undefined : () => handleToggleStrike('nonStriker')}
                  style={[
                    styles.batterRowCard,
                    matchStatus !== 'Completed' && isOnStrike === 'nonStriker' && styles.batterRowCardActiveMini
                  ]}
                >
                  <View style={styles.batterDetails}>
                    <Text style={styles.playerName}>{nonStrikerName}</Text>
                    <Text style={styles.playerStatsText}>
                      {activeNonStrikerStats.runs} runs ({activeNonStrikerStats.balls} balls)
                    </Text>
                  </View>
                  {isOnStrike === 'nonStriker' && (
                    <View style={[styles.strikeIconBadge, { width: s(20), height: s(20) }]}>
                      <Text style={{ fontSize: 10 }}>🏏</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* User Team is Batting -> Batsmen cards at top */
            <>
              {/* Active Batsmen cards (First Drawing: Player 1 & Player 2 layout with ball histories) */}
              <View style={styles.battersSection}>
                <Text style={styles.sectionLabel}>BATSMEN (MY TEAM)</Text>
                
                {/* Batter 1: Striker */}
                <TouchableOpacity
                  activeOpacity={matchStatus === 'Completed' ? 1.0 : 0.9}
                  onPress={matchStatus === 'Completed' ? undefined : () => handleToggleStrike('striker')}
                  style={[
                    styles.batterRowCard,
                    matchStatus !== 'Completed' && isOnStrike === 'striker' && styles.batterRowCardActive
                  ]}
                >
                  <View style={styles.batterDetails}>
                    <Text style={[styles.playerName, isOnStrike === 'striker' && styles.playerNameActive]}>
                      {strikerName}
                    </Text>
                    <Text style={styles.playerStatsText}>
                      {activeStrikerStats.runs} runs ({activeStrikerStats.balls} balls)
                    </Text>
                    {renderBatterHistory(strikerName)}
                  </View>
                  <View style={styles.strikeIndicatorWrap}>
                    {isOnStrike === 'striker' ? (
                      <View style={styles.strikeIconBadge}>
                        <Text style={styles.strikeIconText}>🏏</Text>
                      </View>
                    ) : (
                      <View style={styles.strikeRadioInactive} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Batter 2: Non-Striker */}
                <TouchableOpacity
                  activeOpacity={matchStatus === 'Completed' ? 1.0 : 0.9}
                  onPress={matchStatus === 'Completed' ? undefined : () => handleToggleStrike('nonStriker')}
                  style={[
                    styles.batterRowCard,
                    matchStatus !== 'Completed' && isOnStrike === 'nonStriker' && styles.batterRowCardActive
                  ]}
                >
                  <View style={styles.batterDetails}>
                    <Text style={[styles.playerName, isOnStrike === 'nonStriker' && styles.playerNameActive]}>
                      {nonStrikerName}
                    </Text>
                    <Text style={styles.playerStatsText}>
                      {activeNonStrikerStats.runs} runs ({activeNonStrikerStats.balls} balls)
                    </Text>
                    {renderBatterHistory(nonStrikerName)}
                  </View>
                  <View style={styles.strikeIndicatorWrap}>
                    {isOnStrike === 'nonStriker' ? (
                      <View style={styles.strikeIconBadge}>
                        <Text style={styles.strikeIconText}>🏏</Text>
                      </View>
                    ) : (
                      <View style={styles.strikeRadioInactive} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Active Bowler Card (Opponent Bowler, smaller card) */}
              <View style={styles.bowlerSection}>
                <Text style={styles.sectionLabel}>BOWLER (OPP TEAM)</Text>
                <TouchableOpacity
                  activeOpacity={matchStatus === 'Completed' ? 1.0 : 0.8}
                  onPress={matchStatus === 'Completed' ? undefined : () => setShowNewBowlerModal(true)}
                  style={styles.bowlerCard}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#FFF0F0' }]}>
                    <Text style={{ fontSize: 16 }}>⚾</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bowlerName}>{currentBowlerName}</Text>
                    <Text style={styles.bowlerSubtitle}>Tap to switch bowler</Text>
                  </View>
                  {matchStatus !== 'Completed' && (
                    <Feather name="chevron-right" size={20} color={C.textGray} />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {matchStatus !== 'Completed' && (
            <>
              {/* Scoring panel (Drawing circular buttons layout) */}
              {matchStatus === 'Live' && winAnimationWinner === null && (
                <View style={styles.scoringCard}>
                  <Text style={styles.scoringPanelLabel}>SCORING DIAL</Text>
                  
                  {isUserBowling ? (
                    /* Bowling Scoring Pad Dial (Second Drawing scoring buttons grid) */
                    <>
                      {/* Row 1: 0 (Dot), 1, 2, 3, 4 */}
                      <View style={[styles.scoringRow, { gap: sp.xs }]}>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.dialBtn, styles.dialBtnMini]} onPress={() => handleRecordRuns(0)}>
                          <Text style={styles.dialBtnTxtMini}>Dot</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.dialBtn, styles.dialBtnMini]} onPress={() => handleRecordRuns(1)}>
                          <Text style={styles.dialBtnTxtMini}>1</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.dialBtn, styles.dialBtnMini]} onPress={() => handleRecordRuns(2)}>
                          <Text style={styles.dialBtnTxtMini}>2</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.dialBtn, styles.dialBtnMini]} onPress={() => handleRecordRuns(3)}>
                          <Text style={styles.dialBtnTxtMini}>3</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.dialBtn, styles.dialBtnMini, styles.dialBtnBoundaryMini]} onPress={() => handleRecordRuns(4)}>
                          <Text style={[styles.dialBtnTxtMini, styles.dialBtnTxtBoundary]}>4</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Row 2: WKT, 6 */}
                      <View style={styles.scoringRow}>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.dialBtn, styles.dialBtnWkt]} onPress={handleRecordWicket}>
                          <Text style={styles.dialBtnTxtWkt}>WKT</Text>
                          <Text style={styles.dialBtnSubWkt}>wicket</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.dialBtn, styles.dialBtnBoundary]} onPress={() => handleRecordRuns(6)}>
                          <Text style={[styles.dialBtnTxt, styles.dialBtnTxtBoundary]}>6</Text>
                          <Text style={[styles.dialBtnSub, styles.dialBtnSubBoundary]}>sixer</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    /* Batting Scoring Pad Dial (First Drawing scoring buttons grid) */
                    <>
                      {/* Row 1: 0 (Dot), 1, 2, 3 */}
                      <View style={styles.scoringRow}>
                        <TouchableOpacity activeOpacity={0.8} style={styles.dialBtn} onPress={() => handleRecordRuns(0)}>
                          <Text style={styles.dialBtnTxt}>0</Text>
                          <Text style={styles.dialBtnSub}>dot</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={styles.dialBtn} onPress={() => handleRecordRuns(1)}>
                          <Text style={styles.dialBtnTxt}>1</Text>
                          <Text style={styles.dialBtnSub}>runs</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={styles.dialBtn} onPress={() => handleRecordRuns(2)}>
                          <Text style={styles.dialBtnTxt}>2</Text>
                          <Text style={styles.dialBtnSub}>runs</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={styles.dialBtn} onPress={() => handleRecordRuns(3)}>
                          <Text style={styles.dialBtnTxt}>3</Text>
                          <Text style={styles.dialBtnSub}>runs</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Row 2: 4, 6, WKT */}
                      <View style={styles.scoringRow}>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.dialBtn, styles.dialBtnBoundary]} onPress={() => handleRecordRuns(4)}>
                          <Text style={[styles.dialBtnTxt, styles.dialBtnTxtBoundary]}>4</Text>
                          <Text style={[styles.dialBtnSub, styles.dialBtnSubBoundary]}>boundary</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.dialBtn, styles.dialBtnBoundary]} onPress={() => handleRecordRuns(6)}>
                          <Text style={[styles.dialBtnTxt, styles.dialBtnTxtBoundary]}>6</Text>
                          <Text style={[styles.dialBtnSub, styles.dialBtnSubBoundary]}>sixer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.dialBtn, styles.dialBtnWkt]} onPress={handleRecordWicket}>
                          <Text style={styles.dialBtnTxtWkt}>WKT</Text>
                          <Text style={styles.dialBtnSubWkt}>wicket</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {/* Row 3 Extras: No Ball, Wide */}
                  <View style={styles.extrasRow}>
                    <TouchableOpacity activeOpacity={0.8} style={styles.extraBtn} onPress={() => handleRecordExtra('noball')}>
                      <Text style={styles.extraBtnTxt}>No Ball</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.8} style={styles.extraBtn} onPress={() => handleRecordExtra('wide')}>
                      <Text style={styles.extraBtnTxt}>Wide</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Bottom Actions (Undo & Innings Break) */}
              <View style={styles.bottomActionsRow}>
                <TouchableOpacity activeOpacity={0.8} style={styles.undoBtn} onPress={handleUndo}>
                  <MaterialCommunityIcons name="undo" size={18} color={C.red} />
                  <Text style={styles.undoBtnTxt}>Undo</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.8} style={styles.breakBtn} onPress={handleInningsBreak}>
                  <Text style={styles.breakBtnTxt}>Innings Break</Text>
                  <Feather name="arrow-right" size={16} color={C.white} />
                </TouchableOpacity>
              </View>

              {/* Complete Match Button */}
              <TouchableOpacity activeOpacity={0.8} style={styles.completeBtn} onPress={() => handleCompleteMatchDirectly()}>
                <Text style={styles.completeBtnTxt}>Complete & Save Match</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* MODAL: Choose new batsman */}
      <Modal visible={showNewBatterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select New Batsman</Text>
            <Text style={styles.modalSubtitle}>Choose a player to resume batting</Text>
            
            {availableBatters.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No batsmen left in the roster.</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    setShowNewBatterModal(false);
                    handleInningsBreak();
                  }}
                >
                  <Text style={styles.modalCloseBtnTxt}>End Innings</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={availableBatters}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.optionRow} onPress={() => selectNewBatter(item)}>
                    <View style={styles.optionAvatar}>
                      <Text style={styles.optionAvatarTxt}>{item.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: Choose new bowler */}
      <Modal visible={showNewBowlerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Bowler</Text>
            <Text style={styles.modalSubtitle}>Select a bowler for the new over</Text>
            
            <FlatList
              data={availableBowlers}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.optionRow} onPress={() => selectNewBowler(item)}>
                  <View style={[styles.optionAvatar, { backgroundColor: '#FFF0F0' }]}>
                    <Text style={[styles.optionAvatarTxt, { color: C.red }]}>{item.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Win Animation Overlays */}
      {winAnimationWinner === 'my' && completedMatchScores && (
        <MyTeamWinAnimation
          resultText={completedMatchScores.resultText}
          onComplete={() => {
            setWinAnimationWinner(null);
            handleCompleteMatchDirectly(
              completedMatchScores.myScore,
              completedMatchScores.oppScore,
              completedMatchScores.myWickets,
              completedMatchScores.oppWickets
            );
          }}
        />
      )}
      {winAnimationWinner === 'opp' && completedMatchScores && (
        <OpponentWinAnimation
          resultText={completedMatchScores.resultText}
          onComplete={() => {
            setWinAnimationWinner(null);
            handleCompleteMatchDirectly(
              completedMatchScores.myScore,
              completedMatchScores.oppScore,
              completedMatchScores.myWickets,
              completedMatchScores.oppWickets
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingTop: sp.sm,
    paddingBottom: sp.md,
  },
  backBtn: {
    width: avatarSz.md,
    height: avatarSz.md,
    borderRadius: avatarSz.md / 2,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: {
    fontSize: fs.lg,
    fontWeight: '800',
    color: C.textDark,
  },
  scroll: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.xxl,
  },

  // Score Card Widget
  scoreOverviewCard: {
    backgroundColor: '#1E3F14',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginBottom: sp.md,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.sm,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
    borderWidth: 0.5,
    borderColor: C.red,
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs - 2,
    borderRadius: br.sm,
  },
  liveIndicatorDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: C.red,
    marginRight: 4,
  },
  liveIndicatorText: {
    fontSize: fs.xxs,
    fontWeight: '800',
    color: C.red,
  },
  inningsText: {
    fontSize: fs.xs,
    fontWeight: '700',
    color: '#D1E7CD',
  },
  battingTeamName: {
    fontSize: fs.md,
    fontWeight: '800',
    color: C.white,
    marginTop: 4,
  },
  runsOversContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginVertical: sp.md,
  },
  runsCol: {
    flex: 1.5,
  },
  runsText: {
    fontSize: fs.xxl + 4,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -1,
  },
  oversCol: {
    alignItems: 'flex-end',
  },
  oversLabel: {
    fontSize: fs.xs - 2,
    fontWeight: '800',
    color: '#A8CD55',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  oversText: {
    fontSize: fs.lg,
    fontWeight: '800',
    color: C.white,
  },
  scoreCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: sp.sm,
    marginTop: sp.xs,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -sp.xs,
    marginBottom: sp.xs,
    paddingVertical: sp.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  targetText: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: '#F9E5C8',
  },
  runsNeededText: {
    fontSize: fs.xs,
    fontWeight: '700',
    color: '#D1E7CD',
  },
  completedBanner: {
    backgroundColor: '#EAF7E6',
    borderColor: '#59C749',
    borderWidth: 1,
    borderRadius: br.xl,
    padding: sp.md,
    marginBottom: sp.md,
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  completedBannerTitle: {
    fontSize: fs.md,
    fontWeight: '800',
    color: '#2D5016',
    marginBottom: 4,
  },
  completedBannerDesc: {
    fontSize: fs.xs,
    fontWeight: '600',
    color: C.textGray,
    textAlign: 'center',
  },
  footerStatText: {
    fontSize: fs.xs,
    fontWeight: '600',
    color: '#D1E7CD',
  },

  // Batsmen and Bowler Section
  sectionLabel: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: C.textGray,
    letterSpacing: 0.8,
    marginBottom: sp.sm,
    textTransform: 'uppercase',
  },
  battersSection: {
    marginBottom: sp.md,
  },
  batterRowCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: br.xl,
    paddingVertical: sp.md,
    paddingHorizontal: sp.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.sm,
  },
  batterRowCardActive: {
    borderColor: C.green,
    borderWidth: 1.5,
    backgroundColor: '#F5FCF3',
  },
  batterRowCardActiveMini: {
    borderColor: C.green,
    borderWidth: 1,
    backgroundColor: '#F5FCF3',
  },
  batterDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: fs.md,
    fontWeight: '700',
    color: C.textDark,
  },
  playerNameActive: {
    color: C.greenDark,
    fontWeight: '800',
  },
  playerStatsText: {
    fontSize: fs.xs,
    color: C.textGray,
    marginTop: 2,
    fontWeight: '500',
  },
  strikeIndicatorWrap: {
    width: s(28),
    alignItems: 'center',
  },
  strikeIconBadge: {
    width: s(24),
    height: s(24),
    borderRadius: br.full,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strikeIconText: {
    fontSize: 12,
  },
  strikeRadioInactive: {
    width: s(16),
    height: s(16),
    borderRadius: s(8),
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },

  // Wagon wheel/ball history styles
  historyBallsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  historyBallCircle: {
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    backgroundColor: '#F3F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
  },
  historyBallCircleBoundary: {
    backgroundColor: '#EAF7E6',
    borderColor: '#59C749',
  },
  historyBallCircleWkt: {
    backgroundColor: '#FFF0F0',
    borderColor: C.red,
  },
  historyBallTxt: {
    fontSize: fs.xxs - 1,
    fontWeight: '800',
    color: C.textDark,
  },
  historyBallTxtBoundary: {
    color: C.greenDark,
  },
  historyBallTxtWkt: {
    color: C.red,
  },

  // Bowler Section
  bowlerSection: {
    marginBottom: sp.md,
  },
  bowlerCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: br.xl,
    paddingVertical: sp.md,
    paddingHorizontal: sp.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
  },
  bowlerCardActive: {
    borderColor: C.green,
    borderWidth: 1.5,
    backgroundColor: '#F5FCF3',
  },
  iconCircle: {
    width: s(36),
    height: s(36),
    borderRadius: br.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bowlerName: {
    fontSize: fs.md,
    fontWeight: '700',
    color: C.textDark,
  },
  bowlerSubtitle: {
    fontSize: fs.xs,
    color: C.textGray,
    marginTop: 1,
    fontWeight: '500',
  },

  // Scoring Pad
  scoringCard: {
    backgroundColor: C.white,
    borderRadius: br.xxl,
    padding: sp.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: sp.md,
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  scoringPanelLabel: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: C.textGray,
    letterSpacing: 0.8,
    marginBottom: sp.md,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  scoringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: sp.md,
    gap: sp.md,
  },
  dialBtn: {
    flex: 1,
    height: s(68),
    borderRadius: s(34),
    backgroundColor: C.btnGray,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dialBtnMini: {
    height: s(48),
    borderRadius: s(24),
  },
  dialBtnTxt: {
    fontSize: fs.xl,
    fontWeight: '900',
    color: C.textDark,
  },
  dialBtnTxtMini: {
    fontSize: fs.md,
    fontWeight: '800',
    color: C.textDark,
  },
  dialBtnSub: {
    fontSize: fs.xxs - 2,
    color: C.textGray,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: -2,
  },
  dialBtnBoundary: {
    backgroundColor: '#EAF7E6',
    borderColor: 'rgba(89,199,73,0.3)',
  },
  dialBtnBoundaryMini: {
    backgroundColor: '#EAF7E6',
    borderColor: 'rgba(89,199,73,0.3)',
  },
  dialBtnTxtBoundary: {
    color: C.greenDark,
  },
  dialBtnSubBoundary: {
    color: C.greenDark,
  },
  dialBtnWkt: {
    backgroundColor: '#FFF0F0',
    borderColor: 'rgba(255,77,77,0.3)',
  },
  dialBtnTxtWkt: {
    fontSize: fs.lg,
    fontWeight: '900',
    color: C.red,
  },
  dialBtnSubWkt: {
    fontSize: fs.xxs - 2,
    color: C.red,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: -2,
  },
  extrasRow: {
    flexDirection: 'row',
    gap: sp.md,
  },
  extraBtn: {
    flex: 1,
    height: s(44),
    borderRadius: br.full,
    backgroundColor: C.btnGray,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraBtnTxt: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: C.textDark,
  },

  // Bottom action rows (Undo & Innings Break)
  bottomActionsRow: {
    flexDirection: 'row',
    gap: sp.md,
    marginBottom: sp.md,
  },
  undoBtn: {
    flex: 0.4,
    height: s(50),
    borderRadius: br.full,
    backgroundColor: '#FFF0F0',
    borderWidth: 1.5,
    borderColor: 'rgba(255,77,77,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.xs,
  },
  undoBtnTxt: {
    fontSize: fs.md,
    fontWeight: '800',
    color: C.red,
  },
  breakBtn: {
    flex: 0.6,
    height: s(50),
    borderRadius: br.full,
    backgroundColor: '#2D5016',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.xs,
  },
  breakBtnTxt: {
    fontSize: fs.md,
    fontWeight: '800',
    color: C.white,
  },

  // Complete Match button
  completeBtn: {
    backgroundColor: C.green,
    height: s(52),
    borderRadius: br.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  completeBtnTxt: {
    fontSize: fs.md2,
    fontWeight: '900',
    color: C.white,
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: br.xxl,
    borderTopRightRadius: br.xxl,
    padding: sp.xl,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: fs.xl,
    fontWeight: '800',
    color: C.textDark,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: fs.sm,
    color: C.textGray,
    textAlign: 'center',
    marginBottom: sp.lg,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F1',
    gap: sp.md,
  },
  optionAvatar: {
    width: s(36),
    height: s(36),
    borderRadius: br.md,
    backgroundColor: '#EAF7E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionAvatarTxt: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: C.greenDark,
  },
  optionText: {
    fontSize: fs.md,
    fontWeight: '600',
    color: C.textDark,
  },
  emptyWrap: {
    paddingVertical: sp.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fs.md,
    color: C.textGray,
    fontWeight: '600',
    marginBottom: sp.lg,
  },
  modalCloseBtn: {
    backgroundColor: C.green,
    paddingVertical: sp.md,
    paddingHorizontal: sp.xl,
    borderRadius: br.full,
  },
  modalCloseBtnTxt: {
    fontSize: fs.md,
    fontWeight: '800',
    color: C.white,
  },
});
