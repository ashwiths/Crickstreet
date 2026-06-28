import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const STORAGE_KEY = '@crickstreet:tour_completed';

export interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TourStep {
  id: string;
  title: string;
  description: string;
  route: string;
  tab?: 'home' | 'matches' | 'tournament' | 'profile';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'create-match',
    title: 'Create a Match',
    description: 'Create a new cricket match and start live scoring.',
    route: '/(tabs)?tab=home',
    tab: 'home',
  },
  {
    id: 'matches-tab',
    title: 'Matches',
    description: 'View all current, upcoming, and completed matches.',
    route: '/(tabs)?tab=matches',
    tab: 'matches',
  },
  {
    id: 'tournament-tab',
    title: 'Tournament',
    description: 'Create and manage cricket tournaments.',
    route: '/(tabs)?tab=tournament',
    tab: 'tournament',
  },
  {
    id: 'profile-tab',
    title: 'Profile',
    description: 'Manage your account, teams, players, grounds, and settings.',
    route: '/(tabs)?tab=profile',
    tab: 'profile',
  },
  {
    id: 'notification-menu',
    title: 'Notifications',
    description: 'Receive reminders for scoring, innings breaks, and match completion.',
    route: '/(tabs)?tab=profile',
    tab: 'profile',
  },
  {
    id: 'live-score',
    title: 'Live Scoring',
    description: 'Update runs, wickets, and overs during a match.',
    route: '/scorecard',
  },
];

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  registeredElements: Record<string, Layout>;
  isCompleted: boolean;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
  completeTour: () => void;
  registerElement: (id: string, layout: Layout) => void;
  unregisterElement: (id: string) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [registeredElements, setRegisteredElements] = useState<Record<string, Layout>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const router = useRouter();

  // Load completion state from local storage
  useEffect(() => {
    async function checkCompletion() {
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEY);
        if (value === 'true') {
          setIsCompleted(true);
        }
      } catch (err) {
        console.error('[Tour] Error reading completion state:', err);
      }
    }
    checkCompletion();
  }, []);

  const registerElement = useCallback((id: string, layout: Layout) => {
    setRegisteredElements((prev) => ({ ...prev, [id]: layout }));
  }, []);

  const unregisterElement = useCallback((id: string) => {
    setRegisteredElements((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const startTour = useCallback(() => {
    console.log('[Tour] Starting Tour...');
    setCurrentStep(0);
    setIsActive(true);
    // Automatically navigate to Home Page
    router.replace('/(tabs)?tab=home' as any);
  }, [router]);

  const navigateToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= TOUR_STEPS.length || stepIndex < 0) return;
    const step = TOUR_STEPS[stepIndex];
    console.log(`[Tour] Navigating to Step ${stepIndex + 1}: ${step.title}`);

    if (step.route === '/(tabs)?tab=profile' || step.route === '/(tabs)?tab=matches' || step.route === '/(tabs)?tab=tournament' || step.route === '/(tabs)?tab=home') {
      router.replace(step.route as any);
    } else {
      router.replace(step.route as any);
    }
  }, [router]);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      navigateToStep(nextIdx);
    } else {
      // Final step -> Finish state
      setCurrentStep(TOUR_STEPS.length);
    }
  }, [currentStep, navigateToStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      setCurrentStep(prevIdx);
      navigateToStep(prevIdx);
    }
  }, [currentStep, navigateToStep]);

  const skipTour = useCallback(() => {
    console.log('[Tour] Skipping Tour...');
    setIsActive(false);
    router.replace('/(tabs)?tab=home' as any);
  }, [router]);

  const finishTour = useCallback(() => {
    setCurrentStep(TOUR_STEPS.length); // Enter completion screen state
  }, []);

  const completeTour = useCallback(async () => {
    console.log('[Tour] Tour Finished & Completed.');
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      setIsCompleted(true);
    } catch (err) {
      console.error('[Tour] Error saving completion state:', err);
    }
    setIsActive(false);
    router.replace('/(tabs)?tab=home' as any);
  }, [router]);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        registeredElements,
        isCompleted,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        finishTour,
        completeTour,
        registerElement,
        unregisterElement,
      }}
    >
      {children}
      <TourOverlay />
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

// ─── TourHighlight ────────────────────────────────────────────────────────────
export function TourHighlight({
  id,
  children,
  style,
}: {
  id: string;
  children: React.ReactNode;
  style?: any;
}) {
  const ref = useRef<View>(null);
  const { registerElement, isActive, currentStep } = useTour();

  const measure = useCallback(() => {
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          registerElement(id, { x, y, width, height });
        }
      });
    }
  }, [id, registerElement]);

  useEffect(() => {
    if (isActive) {
      // Re-measure after renders and animations
      const timer = setTimeout(measure, 300);
      return () => clearTimeout(timer);
    }
  }, [isActive, currentStep, measure]);

  return (
    <View
      ref={ref}
      onLayout={measure}
      style={style}
      collapsable={false}
    >
      {children}
    </View>
  );
}

// ─── TourOverlay ──────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function TourOverlay() {
  const {
    isActive,
    currentStep,
    registeredElements,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
  } = useTour();

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Active state animation
  useEffect(() => {
    if (isActive) {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();

      // Spotlight pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, opacityAnim, pulseAnim]);

  if (!isActive) return null;

  const isCompletedScreen = currentStep >= TOUR_STEPS.length;
  const step = !isCompletedScreen ? TOUR_STEPS[currentStep] : null;
  const coord = step ? registeredElements[step.id] : null;

  // Setup bounds for 4 darkening panels around the spotlight hole
  const padding = 6;
  const hx = coord ? coord.x - padding : 0;
  const hy = coord ? coord.y - padding : 0;
  const hw = coord ? coord.width + padding * 2 : 0;
  const hh = coord ? coord.height + padding * 2 : 0;

  // Determine card placement
  let cardPositionStyle: any = {};
  if (isCompletedScreen) {
    cardPositionStyle = {
      alignSelf: 'center',
      top: SCREEN_HEIGHT * 0.28,
    };
  } else if (coord) {
    if (hy > SCREEN_HEIGHT / 2) {
      // Spotlight is in lower half -> card goes above
      cardPositionStyle = {
        bottom: SCREEN_HEIGHT - hy + 12,
      };
    } else {
      // Spotlight is in upper half -> card goes below
      cardPositionStyle = {
        top: hy + hh + 12,
      };
    }
  } else {
    // Fallback: Center of the screen
    cardPositionStyle = {
      top: SCREEN_HEIGHT * 0.32,
    };
  }

  return (
    <Animated.View style={[styles.overlayContainer, { opacity: opacityAnim }]} pointerEvents="box-none">
      {/* 4 dark panels to block background */}
      {!isCompletedScreen && coord ? (
        <>
          {/* Top */}
          <View style={[styles.darkPanel, { top: 0, left: 0, right: 0, height: hy }]} />
          {/* Bottom */}
          <View style={[styles.darkPanel, { top: hy + hh, left: 0, right: 0, bottom: 0 }]} />
          {/* Left */}
          <View style={[styles.darkPanel, { top: hy, left: 0, width: hx, height: hh }]} />
          {/* Right */}
          <View style={[styles.darkPanel, { top: hy, left: hx + hw, right: 0, height: hh }]} />

          {/* Animated green ring spotlight boundary */}
          <Animated.View
            style={[
              styles.spotlightRing,
              {
                left: hx,
                top: hy,
                width: hw,
                height: hh,
                transform: [{ scale: pulseAnim }],
              },
            ]}
            pointerEvents="none"
          />
        </>
      ) : (
        // Entire screen dimmed fallback
        <View style={[StyleSheet.absoluteFillObject, styles.darkPanel]} />
      )}

      {/* StatusBar tint support */}
      <StatusBar barStyle="light-content" />

      {/* Main card panel */}
      <SafeAreaView style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <View style={[styles.cardContainer, cardPositionStyle]} pointerEvents="auto">
          {isCompletedScreen ? (
            /* Tour Completed Screen */
            <LinearGradient
              colors={['#162B15', '#0A0E0A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.completedCard}
            >
              <View style={styles.completedHeader}>
                <Ionicons name="sparkles" size={32} color="#59C749" style={styles.sparkleIcon} />
                <Text style={styles.completedTitle}>🎉 Tour Completed</Text>
                <Text style={styles.completedSubtitle}>You&apos;re ready to use Crickstreet.</Text>
              </View>

              <TouchableOpacity style={styles.startAppBtn} onPress={completeTour}>
                <Text style={styles.startAppBtnText}>Start Using App</Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            /* Tooltip Step Screen */
            <View style={styles.tooltipCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.stepIndicator}>
                  STEP {currentStep + 1} OF {TOUR_STEPS.length}
                </Text>
                <TouchableOpacity style={styles.skipBtn} onPress={skipTour}>
                  <Text style={styles.skipBtnText}>Skip</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardTitle}>{step?.title}</Text>
              <Text style={styles.cardDescription}>{step?.description}</Text>

              {/* Progress dots bar */}
              <View style={styles.dotsContainer}>
                {TOUR_STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === currentStep ? styles.dotActive : null,
                    ]}
                  />
                ))}
              </View>

              {/* Navigation Actions Row */}
              <View style={styles.actionRow}>
                {currentStep > 0 ? (
                  <TouchableOpacity style={styles.prevBtn} onPress={prevStep}>
                    <Feather name="chevron-left" size={16} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.prevBtnText}>Previous</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flex: 1 }} />
                )}

                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={nextStep}
                >
                  <Text style={styles.nextBtnText}>
                    {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                  </Text>
                  <Feather
                    name={currentStep === TOUR_STEPS.length - 1 ? 'check' : 'chevron-right'}
                    size={16}
                    color="#000"
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
  },
  darkPanel: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  spotlightRing: {
    position: 'absolute',
    borderColor: '#59C749',
    borderWidth: 2.5,
    borderRadius: 14,
    backgroundColor: 'transparent',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  cardContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    maxWidth: SCREEN_WIDTH - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  tooltipCard: {
    backgroundColor: '#111511',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(89, 199, 73, 0.2)',
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepIndicator: {
    fontSize: 10,
    fontWeight: '800',
    color: '#59C749',
    letterSpacing: 1,
  },
  skipBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  skipBtnText: {
    fontSize: 12,
    color: '#828880',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 18,
    marginBottom: 16,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotActive: {
    backgroundColor: '#59C749',
    width: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  prevBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 100,
    backgroundColor: '#59C749',
    marginLeft: 'auto',
  },
  nextBtnText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '800',
  },
  completedCard: {
    width: SCREEN_WIDTH - 40,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(89, 199, 73, 0.25)',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  completedHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  sparkleIcon: {
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  startAppBtn: {
    width: '100%',
    backgroundColor: '#59C749',
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  startAppBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
