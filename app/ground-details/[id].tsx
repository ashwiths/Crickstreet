import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../src/hooks/useAuth';
import { db } from '../../src/services/firebase';
import { s, fs, sp, br, avatarSz, iconSz } from '../../src/theme/responsive';

import GroundMapView from '../../src/components/GroundMapView';

interface Ground {
  id: string;
  groundName: string;
  description: string;
  groundType: 'Turf' | 'Concrete' | 'Matting' | 'Grass';
  address: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  contactNumber: string;
  entryFee: string;
  images: string;
  createdAt: string;
}

export default function GroundDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const uid = user?.uid || '';
  const systemScheme = useColorScheme();

  const [ground, setGround] = useState<Ground | null>(null);
  const [loading, setLoading] = useState(true);

  // Theme support
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
      inputBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      inputBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    };
  }, [isDark]);

  useEffect(() => {
    if (!uid || !id) {
      setLoading(false);
      return;
    }

    async function fetchGround() {
      try {
        const docRef = doc(db, 'users', uid, 'grounds', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setGround({
            id: docSnap.id,
            groundName: data.groundName || '',
            description: data.description || '',
            groundType: data.groundType || 'Turf',
            address: data.address || '',
            city: data.city || '',
            district: data.district || '',
            latitude: Number(data.latitude || 0),
            longitude: Number(data.longitude || 0),
            contactNumber: data.contactNumber || '',
            entryFee: data.entryFee || '',
            images: data.images || '',
            createdAt: data.createdAt || new Date().toISOString(),
          });
        } else {
          Alert.alert('Error', 'Ground profile not found in database.');
          router.back();
        }
      } catch (err) {
        console.error('Error fetching ground:', err);
        Alert.alert('Database Error', 'Could not retrieve ground profile details.');
      } finally {
        setLoading(false);
      }
    }

    fetchGround();
  }, [uid, id]);

  const handleOpenDirections = () => {
    if (!ground) return;
    const { latitude, longitude } = ground;
    
    // Generic URL scheme that redirects to Google/Apple maps
    const url = Platform.select({
      ios: `maps://app?saddr=&daddr=${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });

    Linking.openURL(url).catch((err) => {
      console.error('Could not open maps application:', err);
      // Fallback web url
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    });
  };



  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.greenText} />
      </View>
    );
  }

  if (!ground) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.text }}>Ground not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {isDark && (
        <LinearGradient
          colors={['#0A1628', '#0D1F3C', '#111A2E']}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {/* Banner & Header overlap */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.bannerContainer}>
          <Image source={{ uri: ground.images }} style={styles.bannerImage} />
          
          <TouchableOpacity 
            style={[
              styles.backBtn, 
              { 
                backgroundColor: 'rgba(0,0,0,0.5)', 
                top: insets.top > 0 ? insets.top + 8 : 24 
              }
            ]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Content details wrapper */}
        <View style={styles.content}>
          {/* Title Row */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.groundName, { color: theme.text }]}>{ground.groundName}</Text>
              <Text style={[styles.cityName, { color: theme.textSecondary }]}>
                📍 {ground.city}, {ground.district}
              </Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: theme.greenLight }]}>
              <Text style={[styles.typeBadgeText, { color: theme.greenText }]}>{ground.groundType}</Text>
            </View>
          </View>

          {/* Quick Stats Strip */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <Text style={[styles.statVal, { color: theme.text }]}>8</Text>
              <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Matches Hosted</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <Text style={[styles.statVal, { color: theme.text }]}>12</Text>
              <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Teams Played</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <Text style={[styles.statVal, { color: theme.text }]}>4.9 ★</Text>
              <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Rating (18)</Text>
            </View>
          </View>

          {/* Ground Attributes list */}
          <View style={[styles.infoCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={styles.infoRow}>
              <Feather name="phone" size={16} color={theme.greenText} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>CONTACT NUMBER</Text>
                <Text style={[styles.infoVal, { color: theme.text }]}>{ground.contactNumber || 'Not provided'}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, { marginTop: 16 }]}>
              <Feather name="dollar-sign" size={16} color={theme.greenText} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>ENTRY FEE (PER HOUR)</Text>
                <Text style={[styles.infoVal, { color: theme.text }]}>{ground.entryFee}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, { marginTop: 16 }]}>
              <Feather name="file-text" size={16} color={theme.greenText} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>DESCRIPTION</Text>
                <Text style={[styles.infoVal, { color: theme.text, lineHeight: 20 }]}>
                  {ground.description || 'No description provided.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Map Preview section */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Location Details</Text>
          <Text style={[styles.addressText, { color: theme.textSecondary }]}>{ground.address}</Text>

          <View style={[styles.mapContainer, { borderColor: theme.cardBorder }]}>
            <GroundMapView
              latitude={ground.latitude}
              longitude={ground.longitude}
              isReadOnly
            />
          </View>

          {/* Directions button */}
          <TouchableOpacity style={styles.dirBtn} onPress={handleOpenDirections}>
            <LinearGradient
              colors={['#A8CD55', '#4CAF50']}
              style={styles.dirBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="navigation" size={16} color="#050A08" style={{ marginRight: 8 }} />
              <Text style={styles.dirBtnText}>Get Directions</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Reviews list empty state */}
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Player Reviews</Text>
          <View style={[styles.reviewsCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <MaterialCommunityIcons name="comment-text-outline" size={24} color={theme.textSecondary} style={{ marginBottom: 6 }} />
            <Text style={[styles.noReviewsTitle, { color: theme.text }]}>No Reviews Yet</Text>
            <Text style={[styles.noReviewsDesc, { color: theme.textSecondary }]}>
              There are no reviews left for this ground. Check back after matching sessions are hosted!
            </Text>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: s(60) },
  
  // Banner
  bannerContainer: {
    width: '100%',
    height: s(240),
    backgroundColor: '#000',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  backBtn: {
    position: 'absolute',
    left: sp.lg,
    width: avatarSz.md,
    height: avatarSz.md,
    borderRadius: avatarSz.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content
  content: {
    paddingHorizontal: sp.lg,
    paddingTop: sp.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: sp.md,
  },
  groundName: {
    fontSize: fs.xl,
    fontWeight: '800',
    marginBottom: sp.xs,
  },
  cityName: {
    fontSize: fs.sm,
    fontWeight: '500',
  },
  typeBadge: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.xs,
    borderRadius: br.sm,
  },
  typeBadgeText: {
    fontSize: fs.sm2,
    fontWeight: '800',
  },

  // Quick stats
  statsRow: {
    flexDirection: 'row',
    gap: sp.sm,
    marginBottom: sp.lg,
  },
  statBox: {
    flex: 1,
    paddingVertical: sp.md,
    borderRadius: br.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: fs.md2,
    fontWeight: '800',
    marginBottom: sp.xs,
  },
  statLbl: {
    fontSize: fs.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Attributes card
  infoCard: {
    padding: sp.md3,
    borderRadius: br.xxl,
    borderWidth: 1,
    marginBottom: sp.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: fs.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: sp.xs,
  },
  infoVal: {
    fontSize: fs.md,
    fontWeight: '600',
  },

  // Map preview
  sectionTitle: {
    fontSize: fs.md2,
    fontWeight: '800',
    marginBottom: sp.sm,
  },
  addressText: {
    fontSize: fs.sm,
    lineHeight: fs.sm * 1.5,
    marginBottom: sp.md,
  },
  mapContainer: {
    width: '100%',
    height: s(180),
    borderRadius: br.lg,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#151715',
    marginBottom: sp.md,
  },

  // Directions
  dirBtn: {
    borderRadius: br.full,
    overflow: 'hidden',
    marginBottom: sp.sm,
  },
  dirBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp.md,
  },
  dirBtnText: {
    color: '#050A08',
    fontSize: fs.md,
    fontWeight: '900',
  },

  // Reviews
  reviewsCard: {
    borderRadius: br.xxl,
    borderWidth: 1,
    padding: sp.lg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: sp.xs,
  },
  noReviewsTitle: {
    fontSize: fs.md,
    fontWeight: '800',
    marginTop: sp.xs,
    marginBottom: sp.xs,
  },
  noReviewsDesc: {
    fontSize: fs.sm,
    textAlign: 'center',
    lineHeight: fs.sm * 1.4,
    paddingHorizontal: sp.md,
  },
});
