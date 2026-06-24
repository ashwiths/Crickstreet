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
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/hooks/useAuth';
import { db } from '../src/services/firebase';

const { width } = Dimensions.get('window');

import GroundMapView from '../src/components/GroundMapView';

// ── Types ────────────────────────────────────────────────────────────────────
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
  const [selectedLat, setSelectedLat] = useState(11.1271); // Defaults to Tamil Nadu anchor coord
  const [selectedLng, setSelectedLng] = useState(78.6569);
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formDistrict, setFormDistrict] = useState('');

  // Manual input fields
  const [manualStreet, setManualStreet] = useState('');
  const [manualArea, setManualArea] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualPincode, setManualPincode] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);

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
    
    // Formatting street: combination of house_number and road/street/pedestrian
    const houseNo = address.house_number || '';
    const road = address.road || address.street || address.pedestrian || '';
    const streetVal = houseNo && road ? `${houseNo} ${road}` : (road || houseNo);
    
    // Formatting area: neighbourhood / suburb / village / hamlet / commercial / county
    const areaVal = address.neighbourhood || address.suburb || address.village || address.hamlet || address.commercial || '';
    
    // Formatting city: city / town / village / municipality
    const cityVal = address.city || address.town || address.village || address.municipality || '';
    
    // Formatting district: county / state_district
    const districtVal = address.county || address.state_district || '';
    
    // Formatting state
    const stateVal = address.state || '';
    
    // Formatting pincode
    const pincodeVal = address.postcode || '';
    
    setFormAddress(display);
    setManualStreet(streetVal || '');
    setManualArea(areaVal || '');
    setFormCity(cityVal || '');
    setFormDistrict(districtVal || '');
    setManualState(stateVal || '');
    setManualPincode(pincodeVal || '');
  };

  // Reverse Geocoding via OpenStreetMap Nominatim
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

  // Search Ground Location via OpenStreetMap Nominatim with Tamil Nadu bias
  const handleSearchLocation = async () => {
    if (!locationSearchQuery.trim()) {
      Alert.alert('Search Error', 'Please enter a location name to search.');
      return;
    }

    setSearchingLocation(true);
    try {
      let searchString = locationSearchQuery.trim();
      const lowerQuery = searchString.toLowerCase();
      
      // Bias checks for Tamil Nadu, India
      if (!lowerQuery.includes('tamil nadu') && !lowerQuery.includes('tn')) {
        searchString += ', Tamil Nadu';
      }
      if (!lowerQuery.includes('india') && !lowerQuery.includes('in')) {
        searchString += ', India';
      }

      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchString)}&format=json&limit=1&addressdetails=1&countrycodes=in&viewbox=76.13,13.58,80.35,8.08&bounded=0`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CrickstreetApp/1.0',
        },
      });
      const data = await response.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        setSelectedLat(lat);
        setSelectedLng(lng);
        parseAndSetAddress(item);
      } else {
        Alert.alert('Search Results', 'No matches found in Tamil Nadu, India. Please try a different search.');
      }
    } catch (err) {
      console.error('OSM Search Geocoding error:', err);
      Alert.alert('Search Error', 'An error occurred while contacting the geocoding service.');
    } finally {
      setSearchingLocation(false);
    }
  };

  // Detect and center map on current device location
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
        setDeviceLocation({ latitude, longitude });
        performReverseGeocode(latitude, longitude);
      }
    } catch (e) {
      console.log('Error getting current location:', e);
      Alert.alert('Location Error', 'Failed to retrieve your current location. Please verify your GPS settings.');
    }
  };

  // OpenStreetMap event message listener (React Native Web support)
  useEffect(() => {
    const handleWebMapMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OSM_MAP_CLICK') {
        const { latitude, longitude } = event.data;
        setSelectedLat(latitude);
        setSelectedLng(longitude);
        performReverseGeocode(latitude, longitude);
      }
    };

    if (Platform.OS === 'web') {
      window.addEventListener('message', handleWebMapMessage);
      return () => window.removeEventListener('message', handleWebMapMessage);
    }
  }, []);

  // Form setup for add
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

    // Default coordinates in case location permission is not granted and no pre-fetched location is available
    let initialLat = 11.1271;
    let initialLng = 78.6569;

    if (deviceLocation) {
      initialLat = deviceLocation.latitude;
      initialLng = deviceLocation.longitude;
    }

    setSelectedLat(initialLat);
    setSelectedLng(initialLng);
    setFormAddress('');
    setFormCity('');
    setFormDistrict('');
    setManualStreet('');
    setManualArea('');
    setManualState('');
    setManualPincode('');
    setModalVisible(true);

    // Trigger geocoding immediately for the initial coordinates
    performReverseGeocode(initialLat, initialLng);

    // If deviceLocation is not pre-fetched yet, try to obtain it now
    if (!deviceLocation) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc && loc.coords) {
            const { latitude, longitude } = loc.coords;
            setSelectedLat(latitude);
            setSelectedLng(longitude);
            setDeviceLocation({ latitude, longitude });
            performReverseGeocode(latitude, longitude);
          }
        }
      } catch (e) {
        console.log('Error fetching device location dynamically on add:', e);
      }
    }
  };

  // Form setup for edit
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
    setFormAddress(ground.address);
    setFormCity(ground.city);
    setFormDistrict(ground.district);
    setIsManual(false);
    setModalVisible(true);
  };

  // Drag/Select position on Map (Common Handler)
  const handleMapPinSelected = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    performReverseGeocode(lat, lng);
  };

  // Geocoding manual address fields via OpenStreetMap search
  const runManualGeocoding = async (): Promise<{ lat: number; lng: number } | null> => {
    const fullQuery = `${manualStreet} ${manualArea} ${formCity} ${formDistrict} ${manualState} ${manualPincode}`.trim();
    if (!fullQuery) return null;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=1&accept-language=en`,
        {
          headers: {
            'User-Agent': 'CrickstreetApp/1.0',
          },
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    } catch (err) {
      console.error('OSM Forward Geocoding error:', err);
    }
    return null;
  };

  // Save changes to Firestore
  const handleSaveGround = async () => {
    if (!formName.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid ground name.');
      return;
    }

    setSaving(true);
    let finalLat = selectedLat;
    let finalLng = selectedLng;
    let finalAddress = formAddress;

    // Handle manual entry coordinates conversion
    if (isManual) {
      if (!manualStreet.trim() || !formCity.trim() || !formDistrict.trim()) {
        Alert.alert('Validation Error', 'Please fill in Street, City, and District for manual entry.');
        setSaving(false);
        return;
      }
      
      const geocoded = await runManualGeocoding();
      if (geocoded) {
        finalLat = geocoded.lat;
        finalLng = geocoded.lng;
        finalAddress = `${manualStreet}, ${manualArea ? manualArea + ', ' : ''}${formCity}, ${formDistrict}${manualState ? ', ' + manualState : ''}${manualPincode ? ' - ' + manualPincode : ''}`;
      } else {
        Alert.alert('Geocoding Warning', 'Could not locate address on OpenStreetMap. Defaulting to system anchor coordinates.');
      }
    }

    // Check duplicate coordinates check (within ~10m range)
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
      address: finalAddress || 'Manual Address Resolved',
      city: formCity.trim(),
      district: formDistrict.trim(),
      latitude: finalLat,
      longitude: finalLng,
      contactNumber: formContact.trim(),
      entryFee: formFee.trim() || 'Free',
      images: formImages.trim() || 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=600',
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>My Ground</Text>
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

        {/* Floating Action Button */}
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

        {/* Create / Edit Form Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.bgMid, borderColor: theme.cardBorder }]}>
              
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {editingGround ? 'Edit Ground Details' : 'Add New Ground'}
                </Text>
                <TouchableOpacity
                  style={[styles.closeModalBtn, { backgroundColor: theme.inputBg }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Feather name="x" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                
                {/* Basic details */}
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>GROUND NAME</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="e.g. Crickstreet Stadium"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                  value={formName}
                  onChangeText={setFormName}
                />

                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>DESCRIPTION</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, height: 70, paddingTop: 10 }]}
                  placeholder="Describe turf, seating capacity, nets, etc."
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                  value={formDesc}
                  onChangeText={setFormDesc}
                  multiline
                />

                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>GROUND TYPE</Text>
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
                            borderColor: isSelected ? theme.greenText : theme.inputBorder,
                          },
                        ]}
                        onPress={() => setFormType(t)}
                      >
                        <Text style={[styles.typeChipText, { color: isSelected ? theme.greenText : theme.textSecondary, fontWeight: isSelected ? '700' : '500' }]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.rowForm}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>CONTACT NUMBER</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                      placeholder="Phone number"
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                      keyboardType="phone-pad"
                      value={formContact}
                      onChangeText={setFormContact}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>ENTRY FEE (PER HOUR)</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                      placeholder="e.g. Free or $20"
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                      value={formFee}
                      onChangeText={setFormFee}
                    />
                  </View>
                </View>

                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PHOTO URL (OPTIONAL)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="https://domain.com/ground.jpg"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                  value={formImages}
                  onChangeText={setFormImages}
                  autoCapitalize="none"
                />

                {/* Location Selection Method Switch */}
                <View style={[styles.toggleRow, { borderTopColor: theme.cardBorder, borderBottomColor: theme.cardBorder }]}>
                  <View>
                    <Text style={[styles.toggleTitle, { color: theme.text }]}>Enter Address Manually</Text>
                    <Text style={[styles.toggleSubtitle, { color: theme.textSecondary }]}>Convert text inputs to coordinates via Geocoder</Text>
                  </View>
                  <Switch
                    value={isManual}
                    onValueChange={setIsManual}
                    trackColor={{ false: '#767577', true: theme.green }}
                    thumbColor={isManual ? '#FFF' : '#f4f3f4'}
                  />
                </View>

                {isManual ? (
                  // Manual Address Entry Fields
                  <View style={styles.manualAddressSection}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>STREET / BUILDING</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                      placeholder="e.g. 12 Main St"
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                      value={manualStreet}
                      onChangeText={setManualStreet}
                    />

                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>AREA / LANDMARK</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                      placeholder="e.g. Near Uptown Mall"
                      placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                      value={manualArea}
                      onChangeText={setManualArea}
                    />

                    <View style={styles.rowForm}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>CITY</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                          placeholder="e.g. Dubai"
                          placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                          value={formCity}
                          onChangeText={setFormCity}
                        />
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>DISTRICT</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                          placeholder="e.g. Jumeirah"
                          placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                          value={formDistrict}
                          onChangeText={setFormDistrict}
                        />
                      </View>
                    </View>

                    <View style={styles.rowForm}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>STATE</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                          placeholder="e.g. Dubai Emirate"
                          placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                          value={manualState}
                          onChangeText={setManualState}
                        />
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PINCODE</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                          placeholder="e.g. 00000"
                          placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'}
                          value={manualPincode}
                          onChangeText={setManualPincode}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  // Map Selection Method (OSM)
                  <View style={styles.mapSelectorSection}>
                    {/* Search Location Bar */}
                    <Text style={[styles.inputLabel, { color: theme.textSecondary, marginBottom: 8 }]}>
                      SEARCH LOCATION (BIASED TO TAMIL NADU)
                    </Text>
                    <View style={styles.searchBarContainer}>
                      <TextInput
                        style={[styles.searchInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                        placeholder="Search local areas (e.g. Coimbatore)"
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)'}
                        value={locationSearchQuery}
                        onChangeText={setLocationSearchQuery}
                        onSubmitEditing={handleSearchLocation}
                      />
                      <TouchableOpacity 
                        style={[styles.searchButton, { backgroundColor: theme.green }]} 
                        onPress={handleSearchLocation}
                        disabled={searchingLocation}
                      >
                        {searchingLocation ? (
                          <ActivityIndicator size="small" color="#050A08" />
                        ) : (
                          <Ionicons name="search" size={20} color="#050A08" />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Use Current Location Option */}
                    <View style={styles.mapActionRow}>
                      <TouchableOpacity 
                        style={[styles.currentLocBtn, { borderColor: theme.green }]} 
                        onPress={handleUseCurrentLocation}
                      >
                        <Ionicons name="location-outline" size={18} color={theme.greenText} />
                        <Text style={[styles.currentLocBtnText, { color: theme.greenText }]}>
                          Use My Current Location
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12, marginBottom: 8 }]}>
                      TAP ON MAP OR DRAG MARKER TO CHOOSE LOCATION
                    </Text>

                    <View style={[styles.mapWrapper, { borderColor: theme.cardBorder }]}>
                      <GroundMapView
                        latitude={selectedLat}
                        longitude={selectedLng}
                        onLocationSelect={handleMapPinSelected}
                      />
                    </View>

                    {/* Coordinates Info */}
                    <View style={[styles.resolvedInfoBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, marginBottom: 12 }]}>
                      <Text style={[styles.resolvedInfoText, { color: theme.text, fontWeight: '700' }]}>
                        🧭 Coordinates: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
                      </Text>
                      <Text style={[styles.resolvedInfoText, { color: theme.textSecondary, marginTop: 4 }]}>
                        📍 Full Address: {formAddress || 'Fetching address...'}
                      </Text>
                    </View>

                    {/* Structured Geocoded Address Grid */}
                    <View style={[styles.addressGridContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                      <Text style={[styles.addressGridTitle, { color: theme.text }]}>Detected Address Details</Text>
                      
                      <View style={styles.addressGrid}>
                        <View style={styles.addressGridCol}>
                          <Text style={[styles.addressGridLabel, { color: theme.textSecondary }]}>STREET</Text>
                          <Text style={[styles.addressGridVal, { color: theme.text }]} numberOfLines={1}>
                            {manualStreet || '—'}
                          </Text>
                        </View>
                        <View style={styles.addressGridCol}>
                          <Text style={[styles.addressGridLabel, { color: theme.textSecondary }]}>AREA</Text>
                          <Text style={[styles.addressGridVal, { color: theme.text }]} numberOfLines={1}>
                            {manualArea || '—'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.addressGrid}>
                        <View style={styles.addressGridCol}>
                          <Text style={[styles.addressGridLabel, { color: theme.textSecondary }]}>CITY</Text>
                          <Text style={[styles.addressGridVal, { color: theme.text }]} numberOfLines={1}>
                            {formCity || '—'}
                          </Text>
                        </View>
                        <View style={styles.addressGridCol}>
                          <Text style={[styles.addressGridLabel, { color: theme.textSecondary }]}>DISTRICT</Text>
                          <Text style={[styles.addressGridVal, { color: theme.text }]} numberOfLines={1}>
                            {formDistrict || '—'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.addressGrid}>
                        <View style={styles.addressGridCol}>
                          <Text style={[styles.addressGridLabel, { color: theme.textSecondary }]}>STATE</Text>
                          <Text style={[styles.addressGridVal, { color: theme.text }]} numberOfLines={1}>
                            {manualState || '—'}
                          </Text>
                        </View>
                        <View style={styles.addressGridCol}>
                          <Text style={[styles.addressGridLabel, { color: theme.textSecondary }]}>PINCODE</Text>
                          <Text style={[styles.addressGridVal, { color: theme.text }]} numberOfLines={1}>
                            {manualPincode || '—'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Save CTA */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGround} disabled={saving}>
                  <LinearGradient
                    colors={['#A8CD55', '#E3A85B']}
                    style={styles.saveBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#050A08" />
                    ) : (
                      <Text style={styles.saveBtnText}>
                        {editingGround ? 'Update Ground Entry' : 'Create Ground Entry'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
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

  // Ground list cards
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

  // Floating Action Button
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

  // Modal Dialog Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 32,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 10,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 10,
  },
  rowForm: {
    flexDirection: 'row',
    marginBottom: 4,
  },

  // Type chips
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 11,
  },

  // Toggle switch row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 14,
    marginBottom: 14,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },

  // Manual Section
  manualAddressSection: {
    marginBottom: 10,
  },

  // Map Section
  mapSelectorSection: {
    marginBottom: 10,
  },
  mapWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#151715',
    marginBottom: 12,
  },
  resolvedInfoBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  resolvedInfoText: {
    fontSize: 11,
    lineHeight: 16,
  },

  // Search bar styles
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Map actions
  mapActionRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  currentLocBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Address details grid styles
  addressGridContainer: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  addressGridTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  addressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  addressGridCol: {
    flex: 1,
  },
  addressGridLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressGridVal: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Save btn
  saveBtn: {
    borderRadius: 100,
    overflow: 'hidden',
    marginTop: 16,
  },
  saveBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#050A08',
    fontSize: 14,
    fontWeight: '900',
  },
});
