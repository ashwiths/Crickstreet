import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  onSnapshot,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GroundMapView from '../src/components/GroundMapView';
import { useAuth } from '../src/hooks/useAuth';
import { db } from '../src/services/firebase';

const { height } = Dimensions.get('window');

// ── Types ────────────────────────────────────────────────────────────────────
interface Ground {
  id: string;
  groundName: string;
  description: string;
  groundType: 'Turf' | 'Concrete' | 'Matting' | 'Grass';
  address: string;
  city: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  contactNumber: string;
  entryFee: string;
  images: string; // Stored as comma-separated or single URL
  createdAt: string;
}

// ── Skeleton Loader Card ─────────────────────────────────────────────────────
function SkeletonCard({ isDark }: { isDark: boolean }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const bg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <Animated.View style={[styles.card, { opacity: pulseAnim, backgroundColor: bg, height: 180, marginBottom: 16 }]} />
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function MyGroundsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid || '';
  const systemScheme = useColorScheme();

  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceLocation, setDeviceLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Form Modal & Saving States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGround, setEditingGround] = useState<Ground | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<'Turf' | 'Concrete' | 'Matting' | 'Grass'>('Turf');
  const [formContact, setFormContact] = useState('');
  const [formFee, setFormFee] = useState('');
  const [formImages, setFormImages] = useState('');

  // Location Selector states
  const [isManual, setIsManual] = useState(false);
  const [selectedLat, setSelectedLat] = useState(11.1271); // Tamil Nadu center anchor coord
  const [selectedLng, setSelectedLng] = useState(78.6569);
  const [selectedZoom, setSelectedZoom] = useState(6); // default zoom 6
  
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualPincode, setManualPincode] = useState('');
  
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

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
      red: isDark ? '#FF6B6B' : '#D32F2F',
      redLight: isDark ? 'rgba(255,107,107,0.1)' : 'rgba(211,47,47,0.08)',
      inputBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      inputBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      glassBg: isDark ? 'rgba(13, 31, 60, 0.85)' : 'rgba(255, 255, 255, 0.88)',
      glassBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    };
  }, [isDark]);

  // Synchronize grounds with Firestore in real-time
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users', uid, 'grounds'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Ground[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetched.push({
            id: docSnap.id,
            groundName: data.groundName || '',
            description: data.description || '',
            groundType: data.groundType || 'Turf',
            address: data.address || '',
            city: data.city || '',
            district: data.district || '',
            state: data.state || 'Tamil Nadu',
            latitude: Number(data.latitude || 0),
            longitude: Number(data.longitude || 0),
            contactNumber: data.contactNumber || '',
            entryFee: data.entryFee || '',
            images: data.images || '',
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });
        setGrounds(fetched);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching Firestore grounds:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  // Pre-fetch device location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc && loc.coords) {
            setDeviceLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      } catch (e) {
        console.log('Error fetching device location on mount:', e);
      }
    })();
  }, []);

  // Helper to parse Nominatim response address components
  const parseAndSetAddress = (nominatimItem: any) => {
    if (!nominatimItem) return;
    
    const address = nominatimItem.address || {};
    const display = nominatimItem.display_name || '';
    
    const cityVal = address.city || address.town || address.village || address.municipality || '';
    const districtVal = address.county || address.state_district || '';
    const stateVal = address.state || 'Tamil Nadu';
    const pincodeVal = address.postcode || '';
    
    // Set formatted inputs
    setFormAddress(display);
    setFormCity(cityVal || '');
    setFormDistrict(districtVal || cityVal || '');
    setManualState(stateVal);
    setManualPincode(pincodeVal);
  };

  // Reverse Geocoding via Nominatim
  const performReverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
        {
          headers: {
            'User-Agent': 'CrickstreetApp/1.0',
          },
        }
      );
      const data = await response.json();
      if (data) {
        parseAndSetAddress(data);
      }
    } catch (err) {
      console.error('OSM Reverse Geocode error:', err);
    }
  };

  // Search places & local grounds dynamically
  const handleSearchTextChange = async (text: string) => {
    setLocationSearchQuery(text);
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }

    // 1. Filter local grounds
    const localMatches = grounds
      .filter(g => g.groundName.toLowerCase().includes(text.toLowerCase()) || g.address.toLowerCase().includes(text.toLowerCase()))
      .map(g => ({
        isLocal: true,
        displayName: g.groundName,
        subText: `Registered Ground - ${g.address}`,
        latitude: g.latitude,
        longitude: g.longitude,
        ground: g
      }));

    // 2. Fetch from Nominatim (biasing to Tamil Nadu, India)
    let externalMatches: any[] = [];
    setSearchingLocation(true);
    try {
      let queryStr = text.trim();
      if (!queryStr.toLowerCase().includes('tamil nadu') && !queryStr.toLowerCase().includes('tn')) {
        queryStr += ', Tamil Nadu';
      }
      if (!queryStr.toLowerCase().includes('india')) {
        queryStr += ', India';
      }

      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&limit=4&addressdetails=1&countrycodes=in&viewbox=76.13,13.58,80.35,8.08&bounded=0`;
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'CrickstreetApp/1.0' }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        externalMatches = data.map((item: any) => ({
          isLocal: false,
          displayName: item.display_name.split(',')[0] || 'Place Found',
          subText: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          rawItem: item
        }));
      }
    } catch (err) {
      console.error('OSM Geocoding search error:', err);
    } finally {
      setSearchingLocation(false);
    }

    setSuggestions([...localMatches, ...externalMatches]);
  };

  const handleSelectSuggestion = (item: any) => {
    setSuggestions([]);
    setLocationSearchQuery('');
    
    setSelectedLat(item.latitude);
    setSelectedLng(item.longitude);
    setSelectedZoom(13); // Zoom in on selection

    if (item.isLocal) {
      const g = item.ground;
      setEditingGround(g);
      setFormName(g.groundName);
      setFormDesc(g.description);
      setFormType(g.groundType);
      setFormContact(g.contactNumber);
      setFormFee(g.entryFee);
      setFormImages(g.images);
      setFormAddress(g.address);
      setFormCity(g.city);
      setFormDistrict(g.district);
      setManualState(g.state);
      setManualPincode('');
    } else {
      setFormAddress(item.subText);
      parseAndSetAddress(item.rawItem);
      // Auto-prefill ground name if empty
      if (!formName.trim()) {
        setFormName(item.displayName);
      }
    }
  };

  // Automatically geocode manual address inputs
  const triggerManualGeocode = async (
    addressStr: string,
    districtStr: string,
    stateStr: string,
    pincodeStr: string
  ) => {
    const queryParts = [addressStr, districtStr, stateStr, pincodeStr].filter(Boolean);
    if (queryParts.length < 2) return; 

    const fullQuery = queryParts.join(', ').trim();
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=1&accept-language=en`,
        {
          headers: { 'User-Agent': 'CrickstreetApp/1.0' }
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setSelectedLat(lat);
        setSelectedLng(lng);
        setSelectedZoom(14); // Zoom in closer on manual locate
      }
    } catch (err) {
      console.log('Manual geocoding error:', err);
    }
  };

  // Debounced effect for manual entry address geocoding
  useEffect(() => {
    if (!isManual) return;
    
    const delayDebounce = setTimeout(() => {
      triggerManualGeocode(formAddress, formDistrict, manualState, manualPincode);
    }, 1200);

    return () => clearTimeout(delayDebounce);
  }, [formAddress, formDistrict, manualState, manualPincode, isManual]);

  // Center map on device GPS location
  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permissions are required to detect your current position.'
        );
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc && loc.coords) {
        const { latitude, longitude } = loc.coords;
        setSelectedLat(latitude);
        setSelectedLng(longitude);
        setSelectedZoom(13);
        setDeviceLocation({ latitude, longitude });
        performReverseGeocode(latitude, longitude);
      }
    } catch (e) {
      console.log('Error getting current location:', e);
      Alert.alert('Location Error', 'Failed to retrieve your current location. Please verify your GPS settings.');
    }
  };

  // Compass rotation reset
  const handleResetCompass = () => {
    // Re-trigger setCamera with bearing 0 by forcing a minor zoom level reload
    const currentZoom = selectedZoom;
    setSelectedZoom(z => z + 0.0001);
    setTimeout(() => {
      setSelectedZoom(currentZoom);
    }, 50);
  };

  // Open modal in Add mode (defaults to Tamil Nadu anchor coords, zoom 6)
  const handleOpenAdd = async () => {
    setEditingGround(null);
    setFormName('');
    setFormDesc('');
    setFormType('Turf');
    setFormContact('');
    setFormFee('');
    setFormImages('');
    setIsManual(false);
    setLocationSearchQuery('');
    setSuggestions([]);

    let initialLat = 11.1271;
    let initialLng = 78.6569;
    let initialZoom = 6;

    if (deviceLocation) {
      initialLat = deviceLocation.latitude;
      initialLng = deviceLocation.longitude;
      initialZoom = 13;
    }

    setSelectedLat(initialLat);
    setSelectedLng(initialLng);
    setSelectedZoom(initialZoom);
    setFormAddress('');
    setFormCity('');
    setFormDistrict('');
    setManualState('Tamil Nadu');
    setManualPincode('');
    setModalVisible(true);

    // Initial reverse geocode if device GPS or anchor coordinates are set
    performReverseGeocode(initialLat, initialLng);
  };

  // Open modal in Edit mode (centers on target coordinate, zoom 13)
  const handleOpenEdit = (ground: Ground) => {
    setEditingGround(ground);
    setFormName(ground.groundName);
    setFormDesc(ground.description);
    setFormType(ground.groundType);
    setFormContact(ground.contactNumber);
    setFormFee(ground.entryFee);
    setFormImages(ground.images);
    setSelectedLat(ground.latitude);
    setSelectedLng(ground.longitude);
    setSelectedZoom(13);
    setFormAddress(ground.address);
    setFormCity(ground.city);
    setFormDistrict(ground.district);
    setManualState(ground.state || 'Tamil Nadu');
    setManualPincode('');
    setIsManual(false);
    setSuggestions([]);
    setModalVisible(true);
  };

  // Tap anywhere on Map Selection triggers reverse geocoding
  const handleMapPinSelected = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    performReverseGeocode(lat, lng);
  };

  // Save changes to Firestore
  const handleSaveGround = async () => {
    if (!formName.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid ground name.');
      return;
    }
    if (!formAddress.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid address.');
      return;
    }

    setSaving(true);
    let finalLat = selectedLat;
    let finalLng = selectedLng;
    let finalAddress = formAddress;

    if (isManual) {
      const fullQuery = `${formAddress}, ${formDistrict}, ${manualState} ${manualPincode}`.trim();
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=1&accept-language=en`,
          { headers: { 'User-Agent': 'CrickstreetApp/1.0' } }
        );
        const data = await response.json();
        if (data && data.length > 0) {
          finalLat = parseFloat(data[0].lat);
          finalLng = parseFloat(data[0].lon);
        }
      } catch (err) {
        console.error('Final geocode error:', err);
      }
    }

    // Coordinate duplicate validation (~10m range check)
    const isDuplicate = grounds.some((g) => {
      if (editingGround && g.id === editingGround.id) return false;
      return Math.abs(g.latitude - finalLat) < 0.0001 && Math.abs(g.longitude - finalLng) < 0.0001;
    });

    if (isDuplicate) {
      Alert.alert('Roster Validation', 'A cricket ground already exists at these exact coordinates.');
      setSaving(false);
      return;
    }

    const payload = {
      groundName: formName.trim(),
      description: formDesc.trim(),
      groundType: formType,
      address: finalAddress,
      city: formCity.trim() || formDistrict.trim(),
      district: formDistrict.trim(),
      state: manualState.trim() || 'Tamil Nadu',
      latitude: finalLat,
      longitude: finalLng,
      contactNumber: formContact.trim(),
      entryFee: formFee.trim() || 'Free',
      images: formImages.trim() || 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=600',
      createdBy: uid,
      createdAt: editingGround ? editingGround.createdAt : new Date().toISOString(),
    };

    try {
      if (editingGround) {
        const docRef = doc(db, 'users', uid, 'grounds', editingGround.id);
        await setDoc(docRef, payload, { merge: true });
      } else {
        const colRef = collection(db, 'users', uid, 'grounds');
        await addDoc(colRef, payload);
      }
      setModalVisible(false);
    } catch (err) {
      console.error('Error saving ground:', err);
      Alert.alert('Database Error', 'Could not save ground entry.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Ground
  const handleDeleteGround = (groundId: string, name: string) => {
    Alert.alert(
      'Delete Ground 🚨',
      `Are you sure you want to delete "${name}"? This action is permanent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const docRef = doc(db, 'users', uid, 'grounds', groundId);
              await deleteDoc(docRef);
            } catch (err) {
              console.error('Error deleting ground:', err);
              Alert.alert('Database Error', 'Could not remove ground.');
            }
          },
        },
      ]
    );
  };

  // Share Ground Card
  const handleShareGround = async (ground: Ground) => {
    try {
      const message = `🏟️ Ground: ${ground.groundName}\n📍 Address: ${ground.address}\n🏏 Type: ${ground.groundType}\n💵 Fee: ${ground.entryFee}\n🧭 Coords: ${ground.latitude.toFixed(5)}, ${ground.longitude.toFixed(5)}\nShared via Crickstreet!`;
      await Share.share({ message });
    } catch (err) {
      console.error('Error sharing ground:', err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {isDark && (
        <LinearGradient
          colors={['#0A1628', '#0D1F3C', '#111A2E']}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.inputBg }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>My Grounds</Text>
            {!loading && grounds.length > 0 && (
              <View style={[styles.badgeContainer, { backgroundColor: theme.greenLight, borderColor: theme.greenText }]}>
                <Text style={[styles.badgeText, { color: theme.greenText }]}>{grounds.length}</Text>
              </View>
            )}
          </View>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} isDark={isDark} />
            ))}
          </ScrollView>
        ) : grounds.length === 0 ? (
          // Empty State
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBg, { backgroundColor: theme.greenLight }]}>
              <MaterialCommunityIcons name="stadium-variant" size={48} color={theme.greenText} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Grounds Added Yet</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Register your local cricket turfs, concrete nets, and grass pitches. Manage coordinates, fees, and contact details in one place.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleOpenAdd}>
              <LinearGradient
                colors={['#A8CD55', '#4CAF50']}
                style={styles.emptyBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="plus" size={18} color="#050A08" style={{ marginRight: 6 }} />
                <Text style={styles.emptyBtnText}>Add Ground</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {grounds.map((ground) => (
              <TouchableOpacity
                key={ground.id}
                style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                onPress={() => router.push({ pathname: '/ground-details/[id]', params: { id: ground.id } })}
              >
                <Image source={{ uri: ground.images }} style={styles.cardImage} />
                <View style={styles.cardDetails}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
                      {ground.groundName}
                    </Text>
                    <View style={[styles.typeTag, { backgroundColor: theme.greenLight }]}>
                      <Text style={[styles.typeTagText, { color: theme.greenText }]}>{ground.groundType}</Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.cardAddress, { color: theme.textSecondary }]} numberOfLines={2}>
                    📍 {ground.address}
                  </Text>
                  
                  <View style={styles.cardBottomRow}>
                    <Text style={[styles.cardCoords, { color: theme.textSecondary }]}>
                      🧭 {ground.latitude.toFixed(4)}, {ground.longitude.toFixed(4)}
                    </Text>
                    <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
                      {new Date(ground.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  {/* Roster Actions Footer */}
                  <View style={[styles.actionsFooter, { borderTopColor: theme.cardBorder }]}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleShareGround(ground)}>
                      <Feather name="share-2" size={14} color={theme.greenText} />
                      <Text style={[styles.actionBtnText, { color: theme.greenText }]}>Share</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(ground)}>
                      <Feather name="edit" size={14} color={theme.greenText} />
                      <Text style={[styles.actionBtnText, { color: theme.greenText }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteGround(ground.id, ground.groundName)}>
                      <Feather name="trash-2" size={14} color={theme.red} />
                      <Text style={[styles.actionBtnText, { color: theme.red }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Add Ground Floating Action Button */}
        {!loading && grounds.length > 0 && (
          <TouchableOpacity style={styles.fab} onPress={handleOpenAdd}>
            <LinearGradient
              colors={['#A8CD55', '#E3A85B']}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="plus" size={24} color="#050A08" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Premium Fullscreen Map Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.mapModalContainer}>
            {/* Absolute Map Background */}
            <View style={StyleSheet.absoluteFillObject}>
              <GroundMapView
                latitude={selectedLat}
                longitude={selectedLng}
                zoomLevel={selectedZoom}
                onLocationSelect={handleMapPinSelected}
                isDark={isDark}
              />
            </View>

            {/* Premium Top Floating Search Panel */}
            <SafeAreaView style={styles.topSearchWrapper}>
              <View style={[styles.glassPanel, styles.searchBar, { backgroundColor: theme.glassBg, borderColor: theme.glassBorder }]}>
                <Ionicons name="search-outline" size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInputText, { color: theme.text }]}
                  placeholder="Search grounds, addresses, cities..."
                  placeholderTextColor={theme.textSecondary}
                  value={locationSearchQuery}
                  onChangeText={handleSearchTextChange}
                />
                {searchingLocation ? (
                  <ActivityIndicator size="small" color={theme.greenText} style={{ marginRight: 4 }} />
                ) : locationSearchQuery.length > 0 ? (
                  <TouchableOpacity onPress={() => { setLocationSearchQuery(''); setSuggestions([]); }}>
                    <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Glassmorphic Autocomplete Suggestions List */}
              {suggestions.length > 0 && (
                <View style={[styles.glassPanel, styles.suggestionsContainer, { backgroundColor: theme.glassBg, borderColor: theme.glassBorder }]}>
                  <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
                    {suggestions.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.suggestionItem, { borderBottomColor: theme.cardBorder }]}
                        onPress={() => handleSelectSuggestion(item)}
                      >
                        <Ionicons
                          name={item.isLocal ? "map-outline" : "location-outline"}
                          size={18}
                          color={theme.greenText}
                        />
                        <View style={styles.suggestionTextContainer}>
                          <Text style={[styles.suggestionDisplayName, { color: theme.text }]} numberOfLines={1}>
                            {item.displayName}
                          </Text>
                          <Text style={[styles.suggestionSubText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {item.subText}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </SafeAreaView>

            {/* Right Side Floating Map Controls */}
            <View style={styles.floatingControlsContainer}>
              {/* Save CTA */}
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: theme.green, borderColor: theme.greenLight }]}
                onPress={handleSaveGround}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#050A08" />
                ) : (
                  <Ionicons name="checkmark" size={24} color="#050A08" />
                )}
              </TouchableOpacity>

              {/* Device Locate */}
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: theme.glassBg, borderColor: theme.glassBorder }]}
                onPress={handleUseCurrentLocation}
              >
                <Ionicons name="location" size={20} color={theme.greenText} />
              </TouchableOpacity>

              {/* Zoom In */}
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: theme.glassBg, borderColor: theme.glassBorder }]}
                onPress={() => setSelectedZoom(z => Math.min(19, z + 1))}
              >
                <Ionicons name="add" size={22} color={theme.text} />
              </TouchableOpacity>

              {/* Zoom Out */}
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: theme.glassBg, borderColor: theme.glassBorder }]}
                onPress={() => setSelectedZoom(z => Math.max(1, z - 1))}
              >
                <Ionicons name="remove" size={22} color={theme.text} />
              </TouchableOpacity>

              {/* Compass */}
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: theme.glassBg, borderColor: theme.glassBorder }]}
                onPress={handleResetCompass}
              >
                <Ionicons name="compass-outline" size={20} color={theme.text} />
              </TouchableOpacity>

              {/* Close/Discard Modal */}
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: theme.glassBg, borderColor: theme.glassBorder }]}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={theme.red} />
              </TouchableOpacity>
            </View>

            {/* Premium Bottom Glassmorphic Card (Information & Form inputs) */}
            <View style={[styles.glassPanel, styles.bottomGlassCard, { backgroundColor: theme.glassBg, borderColor: theme.glassBorder }]}>
              
              {/* Segmented Mode Selector Tab */}
              <View style={[styles.modeToggleContainer, { borderColor: theme.glassBorder }]}>
                <TouchableOpacity
                  style={[styles.modeToggleTab, !isManual && [styles.modeToggleActiveTab, { backgroundColor: theme.green }]]}
                  onPress={() => setIsManual(false)}
                >
                  <Ionicons name="map" size={14} color={!isManual ? '#050A08' : theme.textSecondary} />
                  <Text style={[styles.modeToggleText, { color: !isManual ? '#050A08' : theme.textSecondary, fontWeight: !isManual ? '800' : '600' }]}>
                    Map Pin Selection
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modeToggleTab, isManual && [styles.modeToggleActiveTab, { backgroundColor: theme.green }]]}
                  onPress={() => setIsManual(true)}
                >
                  <Ionicons name="create" size={14} color={isManual ? '#050A08' : theme.textSecondary} />
                  <Text style={[styles.modeToggleText, { color: isManual ? '#050A08' : theme.textSecondary, fontWeight: isManual ? '800' : '600' }]}>
                    Manual Address
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bottomCardScroll}>
                
                <Text style={[styles.inputLabel, { color: theme.greenText }]}>GROUND NAME</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="e.g. Crickstreet Turf Stadium"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                  value={formName}
                  onChangeText={setFormName}
                />

                {isManual ? (
                  // Manual Address Entry Fields
                  <View style={{ gap: 4 }}>
                    <Text style={[styles.inputLabel, { color: theme.greenText }]}>STREET ADDRESS</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                      placeholder="e.g. 12 Gandhi Road"
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                      value={formAddress}
                      onChangeText={setFormAddress}
                    />

                    <View style={styles.rowForm}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: theme.greenText }]}>DISTRICT / CITY</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                          placeholder="e.g. Coimbatore"
                          placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                          value={formDistrict}
                          onChangeText={setFormDistrict}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.inputLabel, { color: theme.greenText }]}>STATE</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                          placeholder="e.g. Tamil Nadu"
                          placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                          value={manualState}
                          onChangeText={setManualState}
                        />
                      </View>
                    </View>

                    <Text style={[styles.inputLabel, { color: theme.greenText }]}>PINCODE</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                      placeholder="e.g. 641001"
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                      keyboardType="number-pad"
                      value={manualPincode}
                      onChangeText={setManualPincode}
                    />
                  </View>
                ) : (
                  // Map Selection - Display dynamic geocoded info
                  <View style={{ gap: 4 }}>
                    <Text style={[styles.inputLabel, { color: theme.greenText }]}>RESOLVED ADDRESS</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, height: 50, paddingTop: 10 }]}
                      placeholder="Tap on the map or drag pin to resolve address..."
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                      value={formAddress}
                      onChangeText={setFormAddress}
                      multiline
                    />

                    <View style={styles.rowForm}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>LATITUDE</Text>
                        <Text style={[styles.coordsTextVal, { color: theme.text }]}>
                          {selectedLat.toFixed(5)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>LONGITUDE</Text>
                        <Text style={[styles.coordsTextVal, { color: theme.text }]}>
                          {selectedLng.toFixed(5)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rowForm}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>DISTRICT</Text>
                        <Text style={[styles.coordsTextVal, { color: theme.text }]} numberOfLines={1}>
                          {formDistrict || 'Tamil Nadu District'}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>STATE</Text>
                        <Text style={[styles.coordsTextVal, { color: theme.text }]} numberOfLines={1}>
                          {manualState || 'Tamil Nadu'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Additional Metadata Fields for Crickstreet profile info */}
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: theme.cardBorder, paddingTop: 12 }}>
                  <Text style={[styles.inputLabel, { color: theme.greenText }]}>GROUND TYPE</Text>
                  <View style={styles.typeSelectorRow}>
                    {(['Turf', 'Concrete', 'Matting', 'Grass'] as const).map((t) => {
                      const isSelected = formType === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          style={[
                            styles.typeChip,
                            {
                              backgroundColor: isSelected ? theme.greenLight : theme.inputBg,
                              borderColor: isSelected ? theme.green : theme.inputBorder,
                            },
                          ]}
                          onPress={() => setFormType(t)}
                        >
                          <Text style={[styles.typeChipText, { color: isSelected ? theme.greenText : theme.textSecondary, fontWeight: isSelected ? '800' : '600' }]}>
                            {t}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.rowForm}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: theme.greenText }]}>CONTACT NUMBER</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                        placeholder="e.g. +91 99999 88888"
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                        keyboardType="phone-pad"
                        value={formContact}
                        onChangeText={setFormContact}
                      />
                    </View>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.inputLabel, { color: theme.greenText }]}>ENTRY FEE / HOUR</Text>
                      <TextInput
                        style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                        placeholder="e.g. ₹1500"
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                        value={formFee}
                        onChangeText={setFormFee}
                      />
                    </View>
                  </View>

                  <Text style={[styles.inputLabel, { color: theme.greenText }]}>DESCRIPTION</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, height: 60, paddingTop: 10 }]}
                    placeholder="Describe stadium capacity, availability of lights, nets etc."
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                    value={formDesc}
                    onChangeText={setFormDesc}
                    multiline
                  />

                  <Text style={[styles.inputLabel, { color: theme.greenText }]}>PHOTO URL</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                    placeholder="https://images.unsplash.com/photo-1..."
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                    value={formImages}
                    onChangeText={setFormImages}
                    autoCapitalize="none"
                  />
                </View>

                {/* Submit Saving Trigger */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGround} disabled={saving}>
                  <LinearGradient
                    colors={['#A8CD55', '#4CAF50']}
                    style={styles.saveBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#050A08" />
                    ) : (
                      <Text style={styles.saveBtnText}>
                        {editingGround ? 'Update Cricket Ground' : 'Save Cricket Ground'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badgeContainer: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 8,
  },

  // List Cards
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E0E0E0',
  },
  cardDetails: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 12,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cardAddress: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardCoords: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 10,
  },

  // Actions footer
  actionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // List FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#A8CD55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State Layout
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#050A08',
    fontSize: 14,
    fontWeight: '900',
  },

  // ── Modal Map Dashboard ───────────────────────────────────────────────────
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  glassPanel: {
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden',
  },
  
  // Floating Search bar
  topSearchWrapper: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    maxWidth: 568,
    alignSelf: 'center',
    width: '100%',
    zIndex: 999,
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
  },
  searchInputText: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    height: '100%',
  },

  // Search Results Container
  suggestionsContainer: {
    marginTop: 4,
    paddingVertical: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  suggestionTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  suggestionDisplayName: {
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionSubText: {
    fontSize: 11,
    marginTop: 2,
  },

  // Right Side Floating controls
  floatingControlsContainer: {
    position: 'absolute',
    right: 16,
    top: height * 0.18,
    zIndex: 99,
    gap: 12,
  },
  controlBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },

  // Premium Bottom Card
  bottomGlassCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    maxWidth: 568,
    alignSelf: 'center',
    width: '100%',
    maxHeight: height * 0.45,
    padding: 16,
    zIndex: 99,
  },
  bottomCardScroll: {
    paddingVertical: 6,
  },
  
  // Segment Toggle
  modeToggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  modeToggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  modeToggleActiveTab: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  modeToggleText: {
    fontSize: 12,
  },

  // Form Inside Card
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 8,
  },
  rowForm: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  coordsTextVal: {
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 4,
  },

  // Type chips
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 11,
  },

  // Save btn
  saveBtn: {
    borderRadius: 100,
    overflow: 'hidden',
    marginTop: 18,
  },
  saveBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#050A08',
    fontSize: 14,
    fontWeight: '900',
  },
});
