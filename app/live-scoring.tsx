import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { s, fs, sp, br } from '../src/theme/responsive';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Types ─────────────────────────────────────────────────────────────────────
type BallType = 'run' | 'wide' | 'noball' | 'bye' | 'legbye' | 'wicket';
type WicketType =
  | 'Bowled'
  | 'Caught'
  | 'LBW'
  | 'Stumped'
  | 'Run Out'
  | 'Hit Wicket'
  | 'Retired Out';
type Phase = 'live' | 'innings_break' | 'completed';

interface BallEvent {
  id: string;
  type: BallType;
  runs: number;
  extras: number;
  isLegal: boolean;
  wicketType?: WicketType;
  batsmanOut?: string;
  striker: string;
  nonStriker: string;
  bowler: string;
}

interface BatterStat {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string;
}

interface BowlerStat {
  completedOvers: number;
  currentBalls: number;
  runs: number;
  wickets: number;
  maidens: number;
  currentOverRuns: number;
}

// ─── Colors ─────────────────────────────────────────────────────────────────────
const C = {
  bg: '#080C08',
  hero: '#0D1A10',
  green: '#59C749',
  greenDim: 'rgba(89,199,73,0.12)',
  white: '#FFFFFF',
  gray: '#9CA3AF',
  border: 'rgba(255,255,255,0.08)',
  card: 'rgba(255,255,255,0.04)',
  red: '#EF4444',
  redDim: 'rgba(239,68,68,0.12)',
  yellow: '#EAB308',
  yellowDim: 'rgba(234,179,8,0.12)',
  blue: '#3B82F6',
  blueDim: 'rgba(59,130,246,0.12)',
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────────
function getOvers(fmt: string, custom: string): number {
  if (fmt === 'Custom') return parseInt(custom, 10) || 20;
  const m = fmt.match(/T(\d+)/);
  return m ? parseInt(m[1], 10) : 20;
}

function fmtOvers(completed: number, balls: number): string {
  return `${completed}.${balls}`;
}

function calcSR(runs: number, balls: number): string {
  if (!balls) return '0.00';
  return ((runs / balls) * 100).toFixed(1);
}

function calcEcon(runs: number, co: number, cb: number): string {
  const ov = co + cb / 6;
  return ov ? (runs / ov).toFixed(2) : '0.00';
}

function calcCRR(runs: number, co: number, cb: number): string {
  return calcEcon(runs, co, cb);
}

function calcRRR(
  target: number,
  runs: number,
  co: number,
  cb: number,
  total: number
): string {
  const needed = target - runs;
  const ballsLeft = total * 6 - (co * 6 + cb);
  if (ballsLeft <= 0) return '∞';
  return (needed / (ballsLeft / 6)).toFixed(2);
}

function ballDisplay(b: BallEvent): string {
  if (b.wicketType) return 'W';
  if (b.type === 'wide') return b.extras > 1 ? `Wd+${b.extras - 1}` : 'Wd';
  if (b.type === 'noball') return b.runs > 0 ? `Nb+${b.runs}` : 'Nb';
  if (b.type === 'bye') return `B${b.extras}`;
  if (b.type === 'legbye') return `Lb${b.extras}`;
  return `${b.runs}`;
}

function ballColor(b: BallEvent): string {
  if (b.wicketType) return C.red;
  if (b.type === 'wide' || b.type === 'noball') return C.yellow;
  if (b.runs === 4) return C.blue;
  if (b.runs === 6) return C.green;
  if (b.runs === 0) return 'rgba(255,255,255,0.12)';
  return 'rgba(255,255,255,0.22)';
}

// ─── Default stat factories ──────────────────────────────────────────────────────
const defaultBatter = (): BatterStat => ({
  runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false,
});
const defaultBowler = (): BowlerStat => ({
  completedOvers: 0, currentBalls: 0, runs: 0, wickets: 0, maidens: 0, currentOverRuns: 0,
});

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function LiveScoringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    myTeamName?: string;
    oppTeamName?: string;
    myPlayers?: string;
    oppPlayers?: string;
    battingFirst?: string;
    striker?: string;
    nonStriker?: string;
    openingBowler?: string;
    matchId?: string;
    format?: string;
    customOvers?: string;
  }>();

  // ─── Parse params ──────────────────────────────────────────────────────────────
  const myTeamName = params.myTeamName || 'My Team';
  const oppTeamName = params.oppTeamName || 'Opponent';
  const matchId = params.matchId || '';
  const format = params.format || 'T20';
  const customOvers = params.customOvers || '20';
  const totalOvers = getOvers(format, customOvers);

  const myPlayers: string[] = params.myPlayers ? JSON.parse(params.myPlayers) : [];
  const oppPlayers: string[] = params.oppPlayers ? JSON.parse(params.oppPlayers) : [];

  const bf = params.battingFirst === 'opp' ? 'opp' : 'my';

  // who bats first
  const bat1 = bf === 'my' ? myPlayers : oppPlayers;
  const field1 = bf === 'my' ? oppPlayers : myPlayers;
  const bat1Name = bf === 'my' ? myTeamName : oppTeamName;
  const field1Name = bf === 'my' ? oppTeamName : myTeamName;

  // second innings swapped
  const bat2 = bf === 'my' ? oppPlayers : myPlayers;
  const field2 = bf === 'my' ? myPlayers : oppPlayers;
  const bat2Name = bf === 'my' ? oppTeamName : myTeamName;
  const field2Name = bf === 'my' ? myTeamName : oppTeamName;

  // ─── Match State ───────────────────────────────────────────────────────────────
  const [innings, setInnings] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<Phase>('live');

  // Per-innings scores
  const [runs1, setRuns1] = useState(0);
  const [wkts1, setWkts1] = useState(0);
  const [co1, setCo1] = useState(0); // completed overs
  const [cb1, setCb1] = useState(0); // current balls
  const [runs2, setRuns2] = useState(0);
  const [wkts2, setWkts2] = useState(0);
  const [co2, setCo2] = useState(0);
  const [cb2, setCb2] = useState(0);

  // Current batting
  const [striker, setStriker] = useState(params.striker || bat1[0] || '');
  const [nonStriker, setNonStriker] = useState(params.nonStriker || bat1[1] || '');
  const [bowler, setBowler] = useState(params.openingBowler || field1[0] || '');
  const [partnership, setPartnership] = useState({ runs: 0, balls: 0 });

  // Ball histories
  const [allBalls, setAllBalls] = useState<BallEvent[]>([]);
  const [overBalls, setOverBalls] = useState<BallEvent[]>([]);

  // Player stats — single combined map
  const [batStats, setBatStats] = useState<Record<string, BatterStat>>({});
  const [bowlStats, setBowlStats] = useState<Record<string, BowlerStat>>({});

  // Out tracking
  const [outBatters, setOutBatters] = useState<string[]>([]);

  // Modals
  const [wicketModal, setWicketModal] = useState(false);
  const [pendingWT, setPendingWT] = useState<WicketType | null>(null);
  const [changeBatModal, setChangeBatModal] = useState(false);
  const [changeBowlModal, setChangeBowlModal] = useState(false);

  // Celebration
  const [celeb, setCeleb] = useState<null | '4' | '6' | 'W' | '50' | '100'>(null);
  const celebRef = useRef<ReturnType<typeof setTimeout>>();

  // Tab
  const [activeTab, setActiveTab] = useState(0);
  const tabRef = useRef<ScrollView>(null);

  // ─── Derived ───────────────────────────────────────────────────────────────────
  const currentBatTeam = innings === 1 ? bat1 : bat2;
  const currentFieldTeam = innings === 1 ? field1 : field2;
  const currentBatName = innings === 1 ? bat1Name : bat2Name;
  const currentFieldName = innings === 1 ? field1Name : field2Name;

  const runs = innings === 1 ? runs1 : runs2;
  const wkts = innings === 1 ? wkts1 : wkts2;
  const co = innings === 1 ? co1 : co2;
  const cb = innings === 1 ? cb1 : cb2;

  const setRuns = innings === 1 ? setRuns1 : setRuns2;
  const setWkts = innings === 1 ? setWkts1 : setWkts2;
  const setCo = innings === 1 ? setCo1 : setCo2;
  const setCb = innings === 1 ? setCb1 : setCb2;

  const maxWkts = currentBatTeam.length - 1;
  const target = innings === 2 ? runs1 + 1 : null;

  const getBat = (n: string) => batStats[n] || defaultBatter();
  const getBowl = (n: string) => bowlStats[n] || defaultBowler();

  const availableBatters = currentBatTeam.filter(
    (p) => !outBatters.includes(p) && p !== striker && p !== nonStriker
  );

  // ─── Celebration ──────────────────────────────────────────────────────────────
  const fireCeleb = (type: typeof celeb) => {
    if (celebRef.current) clearTimeout(celebRef.current);
    setCeleb(type);
    celebRef.current = setTimeout(() => setCeleb(null), 2200);
  };

  // ─── Tab switch ───────────────────────────────────────────────────────────────
  const switchTab = (i: number) => {
    setActiveTab(i);
    tabRef.current?.scrollTo({ x: i * SCREEN_W, animated: true });
  };

  // ─── End innings ──────────────────────────────────────────────────────────────
  const endInnings = useCallback(() => {
    if (innings === 1) {
      setPhase('innings_break');
    } else {
      setPhase('completed');
    }
  }, [innings]);

  const startSecondInnings = () => {
    setInnings(2);
    setPhase('live');
    setStriker(bat2[0] || '');
    setNonStriker(bat2[1] || '');
    setBowler(field2[0] || '');
    setOverBalls([]);
    setPartnership({ runs: 0, balls: 0 });
    setOutBatters([]);
  };

  // ─── Core record ball ──────────────────────────────────────────────────────────
  const recordBall = useCallback(
    (
      type: BallType,
      ballRuns: number,
      extraRuns: number = 0,
      wtType?: WicketType,
      bOut?: string
    ) => {
      const isLegal = type !== 'wide' && type !== 'noball';
      const totalAdded = ballRuns + extraRuns;

      const ball: BallEvent = {
        id: `${Date.now()}${Math.random()}`,
        type,
        runs: ballRuns,
        extras: extraRuns,
        isLegal,
        wicketType: wtType,
        batsmanOut: bOut,
        striker,
        nonStriker,
        bowler,
      };

      setAllBalls((p) => [...p, ball]);
      setOverBalls((p) => [...p, ball]);
      setRuns((p) => p + totalAdded);
      setPartnership((p) => ({
        runs: p.runs + totalAdded,
        balls: p.balls + (isLegal ? 1 : 0),
      }));

      // ── Update batter stats ──
      if (isLegal && type !== 'bye' && type !== 'legbye') {
        const prev = getBat(striker);
        const newRuns = prev.runs + ballRuns;
        setBatStats((p) => ({
          ...p,
          [striker]: {
            ...prev,
            runs: newRuns,
            balls: prev.balls + 1,
            fours: prev.fours + (ballRuns === 4 ? 1 : 0),
            sixes: prev.sixes + (ballRuns === 6 ? 1 : 0),
          },
        }));
        if (newRuns >= 100 && prev.runs < 100) fireCeleb('100');
        else if (newRuns >= 50 && prev.runs < 50) fireCeleb('50');
      } else if (isLegal) {
        setBatStats((p) => ({
          ...p,
          [striker]: { ...getBat(striker), balls: getBat(striker).balls + 1 },
        }));
      }

      // ── Update bowler stats ──
      const prevBwl = getBowl(bowler);
      setBowlStats((p) => ({
        ...p,
        [bowler]: {
          ...prevBwl,
          runs: prevBwl.runs + totalAdded,
          currentBalls: prevBwl.currentBalls + (isLegal ? 1 : 0),
          wickets:
            prevBwl.wickets +
            (wtType && wtType !== 'Run Out' && wtType !== 'Retired Out' ? 1 : 0),
          currentOverRuns: prevBwl.currentOverRuns + totalAdded,
        },
      }));

      // ── Handle wicket ──
      let newWkts = wkts;
      if (wtType && bOut) {
        newWkts = wkts + 1;
        setWkts((p) => p + 1);
        setOutBatters((p) => [...p, bOut]);
        setBatStats((p) => ({
          ...p,
          [bOut]: { ...getBat(bOut), isOut: true, dismissal: wtType },
        }));
        setPartnership({ runs: 0, balls: 0 });
        fireCeleb('W');
        if (newWkts >= maxWkts) {
          setTimeout(() => endInnings(), 400);
          return;
        }
        setChangeBatModal(true);
      }

      // ── Boundary celebrations ──
      if (ballRuns === 4) fireCeleb('4');
      if (ballRuns === 6) fireCeleb('6');

      // ── Rotate strike & over logic ──
      if (isLegal) {
        const newCb = cb + 1;
        if (newCb >= 6) {
          // Over complete
          const bwl = getBowl(bowler);
          const isMaiden = bwl.currentOverRuns + totalAdded === 0;
          setBowlStats((p) => ({
            ...p,
            [bowler]: {
              ...bwl,
              completedOvers: bwl.completedOvers + 1,
              currentBalls: 0,
              maidens: bwl.maidens + (isMaiden ? 1 : 0),
              currentOverRuns: 0,
            },
          }));
          setCo((p) => p + 1);
          setCb(0);
          setOverBalls([]);
          // rotate strike at end of over
          setStriker(nonStriker);
          setNonStriker(striker);

          if (co + 1 >= totalOvers) {
            setTimeout(() => endInnings(), 300);
            return;
          }
          if (!wtType) setChangeBowlModal(true);
        } else {
          setCb(newCb);
          // rotate on odd runs
          if (ballRuns % 2 === 1) {
            setStriker(nonStriker);
            setNonStriker(striker);
          }
        }
      } else {
        // illegal: rotate on odd runs
        if (ballRuns % 2 === 1) {
          setStriker(nonStriker);
          setNonStriker(striker);
        }
      }

      // ── 2nd innings chase check ──
      if (innings === 2 && target) {
        const newTotal = runs + totalAdded;
        if (newTotal >= target) {
          setTimeout(() => setPhase('completed'), 400);
        }
      }
    },
    [
      striker, nonStriker, bowler, cb, co, runs, wkts, maxWkts,
      totalOvers, innings, target, endInnings, batStats, bowlStats,
    ]
  );

  // ─── Undo ─────────────────────────────────────────────────────────────────────
  const undoLastBall = () => {
    if (!allBalls.length) return;
    const last = allBalls[allBalls.length - 1];
    setAllBalls((p) => p.slice(0, -1));
    setOverBalls((p) => (p.length ? p.slice(0, -1) : p));
    setRuns((p) => Math.max(0, p - last.runs - last.extras));
    setPartnership((p) => ({
      runs: Math.max(0, p.runs - last.runs - last.extras),
      balls: Math.max(0, p.balls - (last.isLegal ? 1 : 0)),
    }));
    setStriker(last.striker);
    setNonStriker(last.nonStriker);

    if (last.isLegal) {
      if (cb === 0 && co > 0) {
        setCo((p) => Math.max(0, p - 1));
        setCb(5);
      } else {
        setCb((p) => Math.max(0, p - 1));
      }
    }

    if (last.wicketType && last.batsmanOut) {
      setWkts((p) => Math.max(0, p - 1));
      setOutBatters((p) => p.filter((x) => x !== last.batsmanOut));
      setBatStats((p) => ({
        ...p,
        [last.batsmanOut!]: { ...getBat(last.batsmanOut!), isOut: false, dismissal: undefined },
      }));
    }

    if (last.isLegal && last.type !== 'bye' && last.type !== 'legbye') {
      setBatStats((p) => ({
        ...p,
        [last.striker]: {
          ...getBat(last.striker),
          runs: Math.max(0, getBat(last.striker).runs - last.runs),
          balls: Math.max(0, getBat(last.striker).balls - 1),
          fours: Math.max(0, getBat(last.striker).fours - (last.runs === 4 ? 1 : 0)),
          sixes: Math.max(0, getBat(last.striker).sixes - (last.runs === 6 ? 1 : 0)),
        },
      }));
    }
  };

  // ─── Best performers ───────────────────────────────────────────────────────────
  const highestScorer = () => {
    let top = { name: '', runs: 0 };
    bat1.forEach((p) => {
      const r = getBat(p).runs;
      if (r > top.runs) top = { name: p, runs: r };
    });
    return top;
  };

  const bestBowler = () => {
    let top = { name: '', wickets: 0 };
    field1.forEach((p) => {
      const w = getBowl(p).wickets;
      if (w > top.wickets) top = { name: p, wickets: w };
    });
    return top;
  };

  // ─── INNINGS BREAK SCREEN ─────────────────────────────────────────────────────
  if (phase === 'innings_break') {
    const hs = highestScorer();
    const bb = bestBowler();
    return (
      <View style={st.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1B3F14', '#0A0D0A', '#080C08']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={st.breakCenter}>
          <View style={st.breakBadge}>
            <Text style={st.breakBadgeText}>⏸ INNINGS BREAK</Text>
          </View>

          <Text style={st.breakTeam}>{bat1Name}</Text>
          <Text style={st.breakScore}>{runs1}/{wkts1}</Text>
          <Text style={st.breakOvers}>{fmtOvers(co1, cb1)} overs · RR {calcCRR(runs1, co1, cb1)}</Text>

          <View style={st.breakDivider} />

          <Text style={st.breakTargetLabel}>TARGET</Text>
          <Text style={st.breakTarget}>{runs1 + 1}</Text>
          <Text style={st.breakTargetSub}>{bat2Name} need {runs1 + 1} runs to win</Text>

          {(hs.name || bb.name) ? (
            <View style={st.breakStatsRow}>
              {hs.name ? (
                <View style={st.breakStat}>
                  <Text style={st.breakStatLabel}>TOP SCORER</Text>
                  <Text style={st.breakStatName} numberOfLines={1}>{hs.name}</Text>
                  <Text style={st.breakStatVal}>{hs.runs} runs</Text>
                </View>
              ) : null}
              {bb.name ? (
                <View style={st.breakStat}>
                  <Text style={st.breakStatLabel}>BEST BOWLER</Text>
                  <Text style={st.breakStatName} numberOfLines={1}>{bb.name}</Text>
                  <Text style={st.breakStatVal}>{bb.wickets} wkts</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity
            style={{ width: '100%', borderRadius: br.full, overflow: 'hidden', marginTop: sp.xl }}
            onPress={startSecondInnings}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[C.green, '#3E8E31']} style={st.breakStartBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="play" size={s(20)} color="#0A0D0A" />
              <Text style={st.breakStartBtnText}>Start 2nd Innings</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={st.breakSummaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={st.breakSummaryBtnText}>End Match Early</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // ─── MATCH COMPLETE SCREEN ────────────────────────────────────────────────────
  if (phase === 'completed') {
    const chased = innings === 2 && target && runs2 >= target;
    const winner = chased ? bat2Name : bat1Name;
    const margin = chased
      ? `${maxWkts - wkts2} wickets`
      : innings === 2
      ? `${runs1 - runs2} runs`
      : `${runs1} runs (completed)`;

    return (
      <View style={st.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1B3F14', '#0A0D0A']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={st.breakCenter}>
          <Text style={{ fontSize: s(64) }}>🏆</Text>
          <Text style={st.completedWinner}>{winner}</Text>
          <Text style={st.completedTitle}>WON!</Text>
          <Text style={st.completedMargin}>by {margin}</Text>

          <View style={st.completedScores}>
            {[
              { name: bat1Name, score: `${runs1}/${wkts1}`, overs: fmtOvers(co1, cb1) },
              { name: bat2Name, score: innings >= 2 ? `${runs2}/${wkts2}` : 'DNB', overs: innings >= 2 ? fmtOvers(co2, cb2) : '' },
            ].map((t, i) => (
              <View key={i} style={st.completedTeam}>
                <Text style={st.completedTeamName} numberOfLines={1}>{t.name}</Text>
                <Text style={st.completedTeamScore}>{t.score}</Text>
                {t.overs ? <Text style={st.completedTeamOvers}>({t.overs} ov)</Text> : null}
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={{ width: '100%', borderRadius: br.full, overflow: 'hidden', marginTop: sp.xl }}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[C.green, '#3E8E31']} style={st.breakStartBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={st.breakStartBtnText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // ─── MODALS ───────────────────────────────────────────────────────────────────
  const WICKET_TYPES: WicketType[] = [
    'Bowled', 'Caught', 'LBW', 'Stumped', 'Run Out', 'Hit Wicket', 'Retired Out',
  ];

  const ModalOverlay = ({ children }: { children: React.ReactNode }) => (
    <View style={st.modalOverlay}>{children}</View>
  );

  const WicketModal = () => (
    <ModalOverlay>
      <View style={st.modalCard}>
        <Text style={st.modalTitle}>🎯 Wicket!</Text>
        <Text style={st.modalSub}>Select dismissal type</Text>
        <View style={st.wicketGrid}>
          {WICKET_TYPES.map((w) => (
            <TouchableOpacity
              key={w}
              style={[st.wicketBtn, pendingWT === w && st.wicketBtnActive]}
              onPress={() => setPendingWT(w)}
            >
              <Text style={[st.wicketBtnText, pendingWT === w && st.wicketBtnTextActive]}>{w}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={st.modalActions}>
          <TouchableOpacity
            style={st.modalCancel}
            onPress={() => { setWicketModal(false); setPendingWT(null); }}
          >
            <Text style={st.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.modalConfirm, !pendingWT && { opacity: 0.4 }]}
            disabled={!pendingWT}
            onPress={() => {
              if (pendingWT) {
                recordBall('wicket', 0, 0, pendingWT, striker);
                setWicketModal(false);
                setPendingWT(null);
              }
            }}
          >
            <LinearGradient colors={[C.red, '#B91C1C']} style={st.modalConfirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={st.modalConfirmText}>Confirm Wicket</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ModalOverlay>
  );

  const ChangeBatsmanModal = () => (
    <ModalOverlay>
      <View style={st.modalCard}>
        <Text style={st.modalTitle}>Next Batsman</Text>
        <Text style={st.modalSub}>{availableBatters.length} batter(s) available</Text>
        {availableBatters.length === 0 ? (
          <Text style={st.modalEmpty}>No more batters — innings must end.</Text>
        ) : (
          <ScrollView style={{ maxHeight: s(220) }} showsVerticalScrollIndicator={false}>
            {availableBatters.map((p) => (
              <TouchableOpacity
                key={p}
                style={st.playerRow}
                onPress={() => { setStriker(p); setChangeBatModal(false); }}
              >
                <Text style={st.playerRowText}>{p}</Text>
                <Feather name="chevron-right" size={16} color={C.green} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <TouchableOpacity style={st.modalCancel} onPress={() => setChangeBatModal(false)}>
          <Text style={st.modalCancelText}>Close</Text>
        </TouchableOpacity>
      </View>
    </ModalOverlay>
  );

  const ChangeBowlerModal = () => (
    <ModalOverlay>
      <View style={st.modalCard}>
        <Text style={st.modalTitle}>Select Bowler</Text>
        <Text style={st.modalSub}>New over — choose bowler</Text>
        <ScrollView style={{ maxHeight: s(250) }} showsVerticalScrollIndicator={false}>
          {currentFieldTeam.map((p) => {
            const isCurrent = p === bowler;
            return (
              <TouchableOpacity
                key={p}
                style={[st.playerRow, isCurrent && { opacity: 0.4 }]}
                disabled={isCurrent}
                onPress={() => { setBowler(p); setChangeBowlModal(false); }}
              >
                <Text style={st.playerRowText}>{p}</Text>
                {isCurrent
                  ? <Text style={{ fontSize: fs.sm, color: C.gray }}>current</Text>
                  : <Feather name="chevron-right" size={16} color={C.green} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={st.modalCancel} onPress={() => setChangeBowlModal(false)}>
          <Text style={st.modalCancelText}>Close</Text>
        </TouchableOpacity>
      </View>
    </ModalOverlay>
  );

  // ─── LIVE HEADER ──────────────────────────────────────────────────────────────
  const LiveHeader = () => {
    const bStr = getBat(striker);
    const bBwl = getBowl(bowler);
    return (
      <View style={st.liveHeader}>
        {/* Top row: LIVE badge + scores */}
        <View style={st.liveTopRow}>
          <View style={st.liveBadge}>
            <View style={st.liveDot} />
            <Text style={st.liveBadgeText}>LIVE</Text>
          </View>

          <View style={st.liveScoreBlock}>
            <View style={st.liveTeam}>
              <Text style={st.liveTeamName} numberOfLines={1}>{bat1Name}</Text>
              <Text style={[st.liveScore, innings === 1 && { color: C.green }]}>
                {runs1}/{wkts1}
              </Text>
            </View>

            <View style={st.liveVs}>
              <Text style={st.liveVsText}>vs</Text>
              <Text style={st.liveOvers}>{fmtOvers(co, cb)}/{totalOvers}</Text>
            </View>

            <View style={[st.liveTeam, { alignItems: 'flex-end' }]}>
              <Text style={st.liveTeamName} numberOfLines={1}>{bat2Name}</Text>
              <Text style={[st.liveScore, innings === 2 && { color: C.green }]}>
                {innings >= 2 ? `${runs2}/${wkts2}` : 'NYB'}
              </Text>
            </View>
          </View>
        </View>

        {/* Player info */}
        <View style={st.livePlayersRow}>
          <Text style={st.livePlayerText} numberOfLines={1}>
            🏏 {striker} {bStr.runs}*({bStr.balls})
          </Text>
          <Text style={st.livePlayerText} numberOfLines={1}>
            ⚡ {bowler} {fmtOvers(bBwl.completedOvers, bBwl.currentBalls)}-{bBwl.runs}-{bBwl.wickets}
          </Text>
        </View>

        {/* Target strip */}
        {innings === 2 && target ? (
          <View style={st.liveTargetStrip}>
            <Text style={st.liveTargetText}>
              Need {Math.max(0, target - runs2)} off {totalOvers * 6 - (co * 6 + cb)} balls
              {'  '}·{'  '}RRR {calcRRR(target, runs2, co, cb, totalOvers)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  // ─── BATTING TAB ──────────────────────────────────────────────────────────────
  const BattingTab = () => {
    const bStr = getBat(striker);
    const bNs = getBat(nonStriker);
    const bBwl = getBowl(bowler);

    return (
      <ScrollView
        style={{ width: SCREEN_W }}
        contentContainerStyle={st.tabContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Current batters ── */}
        <View style={st.battersCard}>
          {/* Striker */}
          <View style={st.batterRow}>
            <View style={st.batterLeft}>
              <View style={st.strikerBall} />
              <View>
                <Text style={st.batterName}>{striker || '—'}</Text>
                <Text style={st.batterRole}>STRIKER</Text>
              </View>
            </View>
            <View style={st.batterRight}>
              <Text style={st.batterRuns}>{bStr.runs}<Text style={st.batterStar}>*</Text></Text>
              <Text style={st.batterBalls}>({bStr.balls})</Text>
              <View style={st.batterMeta}>
                <Text style={st.batterMetaText}>4s:{bStr.fours}</Text>
                <Text style={st.batterMetaText}>6s:{bStr.sixes}</Text>
                <Text style={st.batterMetaText}>SR:{calcSR(bStr.runs, bStr.balls)}</Text>
              </View>
            </View>
          </View>

          <View style={st.batDivider} />

          {/* Non-striker */}
          <View style={[st.batterRow, { opacity: 0.72 }]}>
            <View style={st.batterLeft}>
              <View style={st.nonStrikerBall} />
              <View>
                <Text style={st.batterName}>{nonStriker || '—'}</Text>
                <Text style={st.batterRole}>NON-STRIKER</Text>
              </View>
            </View>
            <View style={st.batterRight}>
              <Text style={[st.batterRuns, { fontSize: fs.xl2 }]}>{bNs.runs}</Text>
              <Text style={st.batterBalls}>({bNs.balls})</Text>
            </View>
          </View>
        </View>

        {/* ── Score summary ── */}
        <View style={st.scoreSummary}>
          {[
            { label: 'SCORE', value: `${runs}/${wkts}` },
            { label: 'OVERS', value: fmtOvers(co, cb) },
            { label: 'CRR', value: calcCRR(runs, co, cb) },
            ...(innings === 2 && target
              ? [{ label: 'RRR', value: calcRRR(target, runs, co, cb, totalOvers) }]
              : []),
            { label: 'PART', value: `${partnership.runs}(${partnership.balls})` },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <View style={st.scoreSummaryItem}>
                <Text style={st.scoreSummaryVal}>{item.value}</Text>
                <Text style={st.scoreSummaryLabel}>{item.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={st.scoreSummaryDiv} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Current over ── */}
        <View style={st.overCard}>
          <Text style={st.overLabel}>
            OVER {co + 1}{'  '}
            <Text style={{ color: C.gray }}>Bowler: {bowler}</Text>
          </Text>
          <View style={st.overBalls}>
            {overBalls.map((b, i) => (
              <View key={b.id || i} style={[st.overBall, { backgroundColor: ballColor(b) }]}>
                <Text style={[st.overBallText, (b.wicketType || b.runs === 4 || b.runs === 6) && { fontWeight: '900' }]}>
                  {ballDisplay(b)}
                </Text>
              </View>
            ))}
            {Array.from({ length: Math.max(0, 6 - overBalls.length) }).map((_, i) => (
              <View key={`e${i}`} style={st.overBallEmpty} />
            ))}
          </View>
        </View>

        {/* ── Run buttons ── */}
        <Text style={st.secLabel}>RUNS</Text>
        <View style={st.runGrid}>
          {[0, 1, 2, 3, 4, 6].map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                st.runBtn,
                r === 4 && st.runBtn4,
                r === 6 && st.runBtn6,
                r === 0 && st.runBtn0,
              ]}
              onPress={() => recordBall('run', r)}
              activeOpacity={0.65}
            >
              <Text style={[
                st.runBtnText,
                r === 4 && st.runBtnText4,
                r === 6 && st.runBtnText6,
              ]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Extras ── */}
        <Text style={st.secLabel}>EXTRAS</Text>
        <View style={st.extrasRow}>
          {[
            { label: 'Wide', type: 'wide' as BallType, ex: 1 },
            { label: 'No Ball', type: 'noball' as BallType, ex: 1 },
            { label: 'Bye', type: 'bye' as BallType, ex: 1 },
            { label: 'Leg Bye', type: 'legbye' as BallType, ex: 1 },
          ].map((e) => (
            <TouchableOpacity
              key={e.label}
              style={st.extraBtn}
              onPress={() => recordBall(e.type, 0, e.ex)}
              activeOpacity={0.7}
            >
              <Text style={st.extraBtnText}>{e.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Wicket ── */}
        <Text style={st.secLabel}>WICKET</Text>
        <TouchableOpacity
          style={st.wicketMainBtn}
          onPress={() => setWicketModal(true)}
          activeOpacity={0.75}
        >
          <LinearGradient
            colors={['rgba(239,68,68,0.18)', 'rgba(239,68,68,0.08)']}
            style={st.wicketMainBtnInner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={st.wicketMainBtnText}>🎯  WICKET!</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Ball controls ── */}
        <Text style={st.secLabel}>CONTROLS</Text>
        <View style={st.controlsGrid}>
          <TouchableOpacity style={st.ctrlBtn} onPress={undoLastBall} activeOpacity={0.75}>
            <Feather name="rotate-ccw" size={s(18)} color={C.yellow} />
            <Text style={[st.ctrlBtnText, { color: C.yellow }]}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.ctrlBtn}
            onPress={() => { const t = striker; setStriker(nonStriker); setNonStriker(t); }}
            activeOpacity={0.75}
          >
            <Ionicons name="swap-horizontal" size={s(18)} color={C.white} />
            <Text style={st.ctrlBtnText}>Strike</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.ctrlBtn} onPress={() => setChangeBatModal(true)} activeOpacity={0.75}>
            <Feather name="user-plus" size={s(18)} color={C.white} />
            <Text style={st.ctrlBtnText}>Ret. Hurt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.ctrlBtn, { borderColor: C.red }]}
            onPress={() => {
              if (Platform.OS === 'web') {
                endInnings();
              } else {
                Alert.alert(
                  'End Innings?',
                  'Are you sure you want to end this innings?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'End Innings', style: 'destructive', onPress: endInnings },
                  ]
                );
              }
            }}
            activeOpacity={0.75}
          >
            <Feather name="flag" size={s(18)} color={C.red} />
            <Text style={[st.ctrlBtnText, { color: C.red }]}>End Inn.</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: s(80) }} />
      </ScrollView>
    );
  };

  // ─── BOWLING TAB ──────────────────────────────────────────────────────────────
  const BowlingTab = () => {
    const bBwl = getBowl(bowler);

    return (
      <ScrollView
        style={{ width: SCREEN_W }}
        contentContainerStyle={st.tabContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current bowler card */}
        <View style={st.currentBowlerCard}>
          <Text style={st.currentBowlerLabel}>CURRENT BOWLER</Text>
          <Text style={st.currentBowlerName}>{bowler}</Text>
          <View style={st.bowlerStatsRow}>
            {[
              { l: 'O', v: fmtOvers(bBwl.completedOvers, bBwl.currentBalls) },
              { l: 'M', v: bBwl.maidens },
              { l: 'R', v: bBwl.runs },
              { l: 'W', v: bBwl.wickets },
              { l: 'Econ', v: calcEcon(bBwl.runs, bBwl.completedOvers, bBwl.currentBalls) },
            ].map((s) => (
              <View key={s.l} style={st.bowlerStatItem}>
                <Text style={[st.bowlerStatVal, s.l === 'W' && bBwl.wickets > 0 && { color: C.green }]}>
                  {s.v}
                </Text>
                <Text style={st.bowlerStatLabel}>{s.l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick actions */}
        <Text style={st.secLabel}>BOWLING ACTIONS</Text>
        <View style={st.bowlActionsRow}>
          {[
            { icon: 'user-plus', label: 'Change Bowler', color: C.green, action: () => setChangeBowlModal(true) },
            { icon: 'rotate-ccw', label: 'Undo Ball', color: C.yellow, action: undoLastBall },
            { icon: 'flag', label: 'End Innings', color: C.red, action: endInnings },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={st.bowlActionBtn} onPress={item.action} activeOpacity={0.75}>
              <Feather name={item.icon as any} size={s(22)} color={item.color} />
              <Text style={[st.bowlActionText, { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* All Bowlers scorecard */}
        <Text style={st.secLabel}>BOWLING SCORECARD</Text>
        <View style={st.scorecardCard}>
          <View style={st.scorecardHeader}>
            <Text style={[st.scorecardTh, { flex: 2 }]}>Bowler</Text>
            {['O', 'M', 'R', 'W', 'Eco'].map((h) => (
              <Text key={h} style={st.scorecardTh}>{h}</Text>
            ))}
          </View>
          {currentFieldTeam.map((p) => {
            const bs = getBowl(p);
            const active = p === bowler;
            const played = bs.completedOvers > 0 || bs.currentBalls > 0;
            return (
              <View key={p} style={[st.scorecardRow, active && st.scorecardRowActive]}>
                <Text style={[st.scorecardName, active && { color: C.green }]} numberOfLines={1}>{p}</Text>
                <Text style={st.scorecardCell}>{played || active ? fmtOvers(bs.completedOvers, bs.currentBalls) : '-'}</Text>
                <Text style={st.scorecardCell}>{played ? bs.maidens : '-'}</Text>
                <Text style={st.scorecardCell}>{played || active ? bs.runs : '-'}</Text>
                <Text style={[st.scorecardCell, bs.wickets > 0 && { color: C.green, fontWeight: '800' }]}>
                  {played || active ? bs.wickets : '-'}
                </Text>
                <Text style={st.scorecardCell}>
                  {played || active ? calcEcon(bs.runs, bs.completedOvers, bs.currentBalls) : '-'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Batting scorecard */}
        <Text style={st.secLabel}>BATTING SCORECARD</Text>
        <View style={st.scorecardCard}>
          <View style={st.scorecardHeader}>
            <Text style={[st.scorecardTh, { flex: 2 }]}>Batter</Text>
            {['R', 'B', '4s', '6s', 'SR'].map((h) => (
              <Text key={h} style={st.scorecardTh}>{h}</Text>
            ))}
          </View>
          {currentBatTeam.map((p) => {
            const bs = getBat(p);
            const isStriking = p === striker;
            const isNS = p === nonStriker;
            const active = isStriking || isNS;
            const played = bs.balls > 0 || active;
            return (
              <View key={p} style={[st.scorecardRow, active && st.scorecardRowActive]}>
                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: s(4) }}>
                  {isStriking && <View style={{ width: s(6), height: s(6), borderRadius: s(3), backgroundColor: C.green }} />}
                  <Text style={[st.scorecardName, active && { color: C.white }]} numberOfLines={1}>{p}</Text>
                  {bs.isOut && <Text style={{ fontSize: fs.xxs, color: C.red }}>✗</Text>}
                </View>
                <Text style={[st.scorecardCell, isStriking && !bs.isOut && { color: C.green, fontWeight: '800' }]}>
                  {played ? `${bs.runs}${isStriking && !bs.isOut ? '*' : ''}` : '-'}
                </Text>
                <Text style={st.scorecardCell}>{played ? bs.balls : '-'}</Text>
                <Text style={st.scorecardCell}>{played ? bs.fours : '-'}</Text>
                <Text style={st.scorecardCell}>{played ? bs.sixes : '-'}</Text>
                <Text style={st.scorecardCell}>{played ? calcSR(bs.runs, bs.balls) : '-'}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: s(80) }} />
      </ScrollView>
    );
  };

  // ─── CELEBRATION OVERLAY ─────────────────────────────────────────────────────
  const CelebOverlay = () => {
    if (!celeb) return null;
    const cfg: Record<string, { emoji: string; text: string; bg: string; border: string }> = {
      '4': { emoji: '🏏', text: 'FOUR!', bg: C.blueDim, border: C.blue },
      '6': { emoji: '💥', text: 'SIX!', bg: C.greenDim, border: C.green },
      W: { emoji: '🎯', text: 'WICKET!', bg: C.redDim, border: C.red },
      '50': { emoji: '⭐', text: 'FIFTY!', bg: C.yellowDim, border: C.yellow },
      '100': { emoji: '💯', text: 'CENTURY!', bg: C.yellowDim, border: C.yellow },
    };
    const c = cfg[celeb];
    return (
      <View style={st.celebOverlay} pointerEvents="none">
        <View style={[st.celebCard, { backgroundColor: c.bg, borderColor: c.border }]}>
          <Text style={st.celebEmoji}>{c.emoji}</Text>
          <Text style={[st.celebText, { color: c.border }]}>{c.text}</Text>
        </View>
      </View>
    );
  };

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────────
  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080C08" />
      <LinearGradient colors={['#0D1A10', '#080C08']} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={{ flex: 1 }}>
        <LiveHeader />

        {/* Tab bar */}
        <View style={st.tabBar}>
          {['🏏 Batting', '🎯 Bowling'].map((label, i) => (
            <TouchableOpacity
              key={label}
              style={[st.tab, activeTab === i && st.tabActive]}
              onPress={() => switchTab(i)}
            >
              <Text style={[st.tabText, activeTab === i && st.tabTextActive]}>{label}</Text>
              {activeTab === i && <View style={st.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Swipeable tabs */}
        <ScrollView
          ref={tabRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
            setActiveTab(page);
          }}
          style={{ flex: 1 }}
          nestedScrollEnabled
        >
          <BattingTab />
          <BowlingTab />
        </ScrollView>
      </SafeAreaView>

      {/* Modals */}
      {wicketModal && <WicketModal />}
      {changeBatModal && <ChangeBatsmanModal />}
      {changeBowlModal && <ChangeBowlerModal />}

      {/* Celebration */}
      <CelebOverlay />
    </View>
  );
}

// ─── StyleSheet ────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // ── Live Header ──
  liveHeader: {
    backgroundColor: C.hero,
    paddingHorizontal: sp.lg,
    paddingTop: sp.md,
    paddingBottom: sp.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(89,199,73,0.12)',
  },
  liveTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: sp.sm },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: s(5),
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: br.full,
    paddingHorizontal: sp.sm, paddingVertical: s(3), marginRight: sp.md,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  liveDot: { width: s(6), height: s(6), borderRadius: s(3), backgroundColor: '#EF4444' },
  liveBadgeText: { fontSize: fs.xs, fontWeight: '900', color: '#EF4444', letterSpacing: 0.8 },
  liveScoreBlock: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  liveTeam: { flex: 1, alignItems: 'flex-start' },
  liveTeamName: { fontSize: fs.sm, fontWeight: '700', color: C.gray, marginBottom: 2 },
  liveScore: { fontSize: fs.xl2, fontWeight: '900', color: C.white },
  liveVs: { alignItems: 'center', paddingHorizontal: sp.sm },
  liveVsText: { fontSize: fs.xs, fontWeight: '700', color: C.gray },
  liveOvers: { fontSize: fs.sm2, fontWeight: '700', color: C.green, marginTop: 2 },
  livePlayersRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: br.md,
    paddingHorizontal: sp.md, paddingVertical: sp.sm, gap: sp.sm,
  },
  livePlayerText: { flex: 1, fontSize: fs.sm2, fontWeight: '700', color: C.white },
  liveTargetStrip: {
    marginTop: sp.sm, backgroundColor: 'rgba(234,179,8,0.1)',
    borderRadius: br.sm, paddingHorizontal: sp.md, paddingVertical: sp.xs,
    borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)',
  },
  liveTargetText: { fontSize: fs.sm2, fontWeight: '700', color: C.yellow, textAlign: 'center' },

  // ── Tab bar ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.hero,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: sp.md, position: 'relative',
  },
  tabActive: {},
  tabText: { fontSize: fs.md, fontWeight: '700', color: 'rgba(255,255,255,0.45)' },
  tabTextActive: { color: C.green, fontWeight: '800' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 2, backgroundColor: C.green, borderRadius: 1,
  },

  tabContent: { paddingHorizontal: sp.lg, paddingTop: sp.lg },

  // ── Batters Card ──
  battersCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: br.xl,
    borderWidth: 1, borderColor: C.border, padding: sp.md, marginBottom: sp.md,
  },
  batterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  batterLeft: { flexDirection: 'row', alignItems: 'center', gap: sp.md, flex: 1 },
  strikerBall: { width: s(10), height: s(10), borderRadius: s(5), backgroundColor: C.green },
  nonStrikerBall: { width: s(10), height: s(10), borderRadius: s(5), backgroundColor: 'rgba(255,255,255,0.25)' },
  batterName: { fontSize: fs.md2, fontWeight: '700', color: C.white },
  batterRole: { fontSize: fs.xs, fontWeight: '700', color: C.gray, marginTop: 1 },
  batterRight: { alignItems: 'flex-end' },
  batterRuns: { fontSize: fs.xxl, fontWeight: '900', color: C.white },
  batterStar: { fontSize: fs.xl2, color: C.green },
  batterBalls: { fontSize: fs.sm, color: C.gray, fontWeight: '600' },
  batterMeta: { flexDirection: 'row', gap: sp.sm, marginTop: s(2) },
  batterMetaText: { fontSize: fs.xs, color: C.gray, fontWeight: '600' },
  batDivider: { height: 1, backgroundColor: C.border, marginVertical: sp.md },

  // ── Score Summary ──
  scoreSummary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(89,199,73,0.06)', borderRadius: br.xl,
    borderWidth: 1, borderColor: 'rgba(89,199,73,0.15)',
    padding: sp.md, marginBottom: sp.md,
  },
  scoreSummaryItem: { flex: 1, alignItems: 'center' },
  scoreSummaryVal: { fontSize: fs.md2, fontWeight: '900', color: C.white },
  scoreSummaryLabel: { fontSize: fs.xxs, fontWeight: '700', color: C.gray, marginTop: 2 },
  scoreSummaryDiv: { width: 1, height: s(30), backgroundColor: C.border },

  // ── Current Over ──
  overCard: {
    backgroundColor: C.card, borderRadius: br.xl, borderWidth: 1, borderColor: C.border,
    padding: sp.md, marginBottom: sp.md,
  },
  overLabel: { fontSize: fs.sm, fontWeight: '800', color: C.green, marginBottom: sp.sm },
  overBalls: { flexDirection: 'row', gap: sp.sm, flexWrap: 'wrap' },
  overBall: {
    width: s(38), height: s(38), borderRadius: s(19),
    alignItems: 'center', justifyContent: 'center',
  },
  overBallText: { fontSize: fs.sm2, fontWeight: '800', color: C.white },
  overBallEmpty: {
    width: s(38), height: s(38), borderRadius: s(19),
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
  },

  // ── Section label ──
  secLabel: {
    fontSize: fs.xs, fontWeight: '800', color: C.gray,
    letterSpacing: 0.8, marginBottom: sp.sm, marginTop: sp.xs,
  },

  // ── Run buttons ──
  runGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: sp.sm, marginBottom: sp.md,
  },
  runBtn: {
    flex: 1, minWidth: s(50), aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: br.xl, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    minHeight: s(60),
  },
  runBtn0: { borderColor: 'rgba(255,255,255,0.06)' },
  runBtn4: { backgroundColor: C.blueDim, borderColor: C.blue },
  runBtn6: { backgroundColor: C.greenDim, borderColor: C.green },
  runBtnText: { fontSize: fs.xl2, fontWeight: '900', color: C.white },
  runBtnText4: { color: C.blue },
  runBtnText6: { color: C.green },

  // ── Extras ──
  extrasRow: {
    flexDirection: 'row', gap: sp.sm, marginBottom: sp.md, flexWrap: 'wrap',
  },
  extraBtn: {
    flex: 1, paddingVertical: sp.md, borderRadius: br.lg,
    backgroundColor: C.yellowDim, borderWidth: 1, borderColor: C.yellow,
    alignItems: 'center', justifyContent: 'center', minWidth: s(70),
  },
  extraBtnText: { fontSize: fs.sm2, fontWeight: '800', color: C.yellow },

  // ── Wicket main btn ──
  wicketMainBtn: {
    borderRadius: br.xl, overflow: 'hidden',
    borderWidth: 1.5, borderColor: C.red, marginBottom: sp.md,
  },
  wicketMainBtnInner: {
    paddingVertical: sp.md2, alignItems: 'center', justifyContent: 'center',
  },
  wicketMainBtnText: { fontSize: fs.xl, fontWeight: '900', color: C.red },

  // ── Controls ──
  controlsGrid: { flexDirection: 'row', gap: sp.sm, flexWrap: 'wrap' },
  ctrlBtn: {
    flex: 1, minWidth: s(72), paddingVertical: sp.md, borderRadius: br.lg,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', gap: s(4),
  },
  ctrlBtnText: { fontSize: fs.xs, fontWeight: '700', color: C.white },

  // ── Bowling tab ──
  currentBowlerCard: {
    backgroundColor: 'rgba(89,199,73,0.06)', borderRadius: br.xl,
    borderWidth: 1, borderColor: 'rgba(89,199,73,0.15)', padding: sp.md, marginBottom: sp.md,
  },
  currentBowlerLabel: { fontSize: fs.xs, fontWeight: '800', color: C.green, letterSpacing: 0.8 },
  currentBowlerName: { fontSize: fs.xl, fontWeight: '900', color: C.white, marginVertical: sp.sm },
  bowlerStatsRow: { flexDirection: 'row', gap: sp.sm },
  bowlerStatItem: { flex: 1, alignItems: 'center' },
  bowlerStatVal: { fontSize: fs.md2, fontWeight: '900', color: C.white },
  bowlerStatLabel: { fontSize: fs.xxs, fontWeight: '700', color: C.gray, marginTop: 2 },

  bowlActionsRow: { flexDirection: 'row', gap: sp.md, marginBottom: sp.md },
  bowlActionBtn: {
    flex: 1, backgroundColor: C.card, borderRadius: br.xl, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', paddingVertical: sp.md, gap: sp.sm,
  },
  bowlActionText: { fontSize: fs.sm, fontWeight: '700', color: C.white },

  // ── Scorecard table ──
  scorecardCard: {
    backgroundColor: C.card, borderRadius: br.xl, borderWidth: 1, borderColor: C.border,
    marginBottom: sp.md, overflow: 'hidden',
  },
  scorecardHeader: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: sp.md, paddingVertical: sp.sm2,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  scorecardTh: { flex: 1, fontSize: fs.xs, fontWeight: '800', color: C.gray, textAlign: 'center' },
  scorecardRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: sp.md, paddingVertical: sp.md2,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  scorecardRowActive: { backgroundColor: 'rgba(255,255,255,0.03)' },
  scorecardName: { flex: 2, fontSize: fs.sm, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  scorecardCell: { flex: 1, fontSize: fs.sm, fontWeight: '700', color: 'rgba(255,255,255,0.65)', textAlign: 'center' },

  // ── Modals ──
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: sp.lg,
  },
  modalCard: {
    width: '100%', backgroundColor: '#111710',
    borderRadius: br.xxl, borderWidth: 1, borderColor: C.border,
    padding: sp.xl,
  },
  modalTitle: { fontSize: fs.xl, fontWeight: '900', color: C.white, textAlign: 'center' },
  modalSub: { fontSize: fs.sm, color: C.gray, textAlign: 'center', marginTop: sp.xs, marginBottom: sp.lg },
  modalEmpty: { fontSize: fs.md, color: C.gray, textAlign: 'center', marginBottom: sp.lg },
  wicketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm, marginBottom: sp.lg },
  wicketBtn: {
    paddingHorizontal: sp.md, paddingVertical: sp.md2, borderRadius: br.lg,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  wicketBtnActive: { backgroundColor: C.redDim, borderColor: C.red },
  wicketBtnText: { fontSize: fs.md, fontWeight: '700', color: C.gray },
  wicketBtnTextActive: { color: C.red, fontWeight: '900' },
  modalActions: { flexDirection: 'row', gap: sp.md },
  modalCancel: {
    flex: 1, paddingVertical: sp.md, borderRadius: br.full,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  modalCancelText: { color: C.gray, fontSize: fs.md, fontWeight: '700' },
  modalConfirm: { flex: 2, borderRadius: br.full, overflow: 'hidden' },
  modalConfirmGrad: { paddingVertical: sp.md, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { color: C.white, fontSize: fs.md, fontWeight: '900' },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: sp.md2, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  playerRowText: { fontSize: fs.md2, fontWeight: '700', color: C.white },

  // ── Celebration ──
  celebOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  celebCard: {
    borderRadius: br.xxl, borderWidth: 2,
    paddingHorizontal: s(48), paddingVertical: s(28),
    alignItems: 'center', gap: s(8),
  },
  celebEmoji: { fontSize: s(56) },
  celebText: { fontSize: fs.huge, fontWeight: '900', letterSpacing: -0.5 },

  // ── Innings Break ──
  breakCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: sp.xl,
  },
  breakBadge: {
    backgroundColor: 'rgba(234,179,8,0.15)', borderRadius: br.full,
    borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)',
    paddingHorizontal: sp.lg, paddingVertical: sp.sm, marginBottom: sp.xl,
  },
  breakBadgeText: { fontSize: fs.sm, fontWeight: '900', color: C.yellow, letterSpacing: 1 },
  breakTeam: { fontSize: fs.xl, fontWeight: '800', color: C.gray, textAlign: 'center' },
  breakScore: { fontSize: fs.hero, fontWeight: '900', color: C.white, lineHeight: s(64) },
  breakOvers: { fontSize: fs.md2, color: C.gray, fontWeight: '600', marginBottom: sp.md },
  breakDivider: { height: 1, backgroundColor: C.border, width: '80%', marginVertical: sp.xl },
  breakTargetLabel: { fontSize: fs.sm, fontWeight: '900', color: C.green, letterSpacing: 1 },
  breakTarget: { fontSize: fs.hero, fontWeight: '900', color: C.green, lineHeight: s(64) },
  breakTargetSub: { fontSize: fs.md, color: C.gray, fontWeight: '600', marginBottom: sp.xl, textAlign: 'center' },
  breakStatsRow: {
    flexDirection: 'row', gap: sp.lg, marginBottom: sp.xl,
    backgroundColor: C.card, borderRadius: br.xl, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: sp.xl, paddingVertical: sp.lg, width: '100%',
  },
  breakStat: { flex: 1, alignItems: 'center' },
  breakStatLabel: { fontSize: fs.xxs, fontWeight: '800', color: C.gray, letterSpacing: 0.8 },
  breakStatName: { fontSize: fs.md2, fontWeight: '800', color: C.white, marginTop: sp.xs, textAlign: 'center' },
  breakStatVal: { fontSize: fs.sm, fontWeight: '700', color: C.green, marginTop: sp.xs },
  breakStartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: sp.md2, gap: sp.sm, borderRadius: br.full,
  },
  breakStartBtnText: { fontSize: fs.lg, fontWeight: '900', color: '#0A0D0A' },
  breakSummaryBtn: { marginTop: sp.md, paddingVertical: sp.md, width: '100%', alignItems: 'center' },
  breakSummaryBtnText: { fontSize: fs.md, color: C.gray, fontWeight: '600' },

  // ── Completed ──
  completedWinner: { fontSize: fs.h2, fontWeight: '900', color: C.white, marginTop: sp.md, textAlign: 'center' },
  completedTitle: { fontSize: fs.huge, fontWeight: '900', color: C.green },
  completedMargin: { fontSize: fs.md2, color: C.gray, fontWeight: '600', marginBottom: sp.xl },
  completedScores: {
    flexDirection: 'row', gap: sp.xl,
    backgroundColor: C.card, borderRadius: br.xl, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: sp.xl, paddingVertical: sp.lg, width: '100%',
    alignItems: 'center', justifyContent: 'space-around',
  },
  completedTeam: { flex: 1, alignItems: 'center' },
  completedTeamName: { fontSize: fs.sm, fontWeight: '700', color: C.gray, textAlign: 'center' },
  completedTeamScore: { fontSize: fs.xl2, fontWeight: '900', color: C.white, textAlign: 'center' },
  completedTeamOvers: { fontSize: fs.sm, color: C.gray, fontWeight: '600' },
});
