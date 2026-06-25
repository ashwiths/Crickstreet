import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaygroundMapView from '../src/components/PlaygroundMapView';
import { useAuth } from '../src/hooks/useAuth';
import { db } from '../src/services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const C = {
  hero:    '#1B3F14',
  green:   '#59C749',
  white:   '#FFFFFF',
  black:   '#0A0A0A',
  gray3:   '#9CA3AF',
  navBg:   '#111510',
  milky:   '#FFFDF1',
} as const;

const { width: W } = Dimensions.get('window');

// Steps for wizard
const STEPS = ['Team Setup', 'Match Setup', 'Venue', 'Review'] as const;

export default function CreateMatchesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<number>(0);

  // ─── STEP 1: TEAMS STATE ───────────────────────────────────────────────────
  const [myTeamName, setMyTeamName] = useState('Crickstreet CC');
  const [myCaptain, setMyCaptain] = useState('Ashil');
  const [myViceCaptain, setMyViceCaptain] = useState('Virat Kohli');
  const [myPlayers, setMyPlayers] = useState<string[]>([
    'Ashil', 'Virat Kohli', 'Rohit Sharma', 'K L Rahul', 'Rishabh Pant',
    'Hardik Pandya', 'Ravindra Jadeja', 'Jasprit Bumrah', 'Mohammed Shami',
    'Yuzvendra Chahal', 'Mohammed Siraj'
  ]);
  const [mySubs, setMySubs] = useState<string[]>(['Shubman Gill', 'Axar Patel']);
  const [newMySub, setNewMySub] = useState('');
  const [newMyPlayer, setNewMyPlayer] = useState('');
  const [showMyXI, setShowMyXI] = useState(false);

  const [oppTeamName, setOppTeamName] = useState('Royal Strikers');
  const [oppCaptain, setOppCaptain] = useState('Steve Smith');
  const [oppViceCaptain, setOppViceCaptain] = useState('Pat Cummins');
  const [oppPlayers, setOppPlayers] = useState<string[]>([
    'Steve Smith', 'Travis Head', 'David Warner', 'Marnus Labuschagne', 'Glenn Maxwell',
    'Marcus Stoinis', 'Alex Carey', 'Pat Cummins', 'Mitchell Starc',
    'Josh Hazlewood', 'Adam Zampa'
  ]);
  const [oppSubs, setOppSubs] = useState<string[]>(['Cameron Green', 'Nathan Lyon']);
  const [newOppSub, setNewOppSub] = useState('');
  const [newOppPlayer, setNewOppPlayer] = useState('');
  const [showOppXI, setShowOppXI] = useState(false);

  // Helper to handle playing XI name editing
  const handlePlayerNameChange = (team: 'my' | 'opp', index: number, value: string) => {
    if (team === 'my') {
      const updated = [...myPlayers];
      updated[index] = value;
      setMyPlayers(updated);
    } else {
      const updated = [...oppPlayers];
      updated[index] = value;
      setOppPlayers(updated);
    }
  };

  const handleAddPlayer = (team: 'my' | 'opp') => {
    if (team === 'my') {
      if (newMyPlayer.trim() && myPlayers.length < 11) {
        setMyPlayers([...myPlayers, newMyPlayer.trim()]);
        setNewMyPlayer('');
      } else if (myPlayers.length >= 11) {
        Alert.alert('Roster Full', 'You can only have 11 players in the Playing XI.');
      }
    } else {
      if (newOppPlayer.trim() && oppPlayers.length < 11) {
        setOppPlayers([...oppPlayers, newOppPlayer.trim()]);
        setNewOppPlayer('');
      } else if (oppPlayers.length >= 11) {
        Alert.alert('Roster Full', 'You can only have 11 players in the Playing XI.');
      }
    }
  };

  const handleRemovePlayer = (team: 'my' | 'opp', index: number) => {
    if (team === 'my') {
      setMyPlayers(myPlayers.filter((_, idx) => idx !== index));
    } else {
      setOppPlayers(oppPlayers.filter((_, idx) => idx !== index));
    }
  };

  // Helper to add substitute
  const handleAddSub = (team: 'my' | 'opp') => {
    if (team === 'my') {
      if (newMySub.trim()) {
        setMySubs([...mySubs, newMySub.trim()]);
        setNewMySub('');
      }
    } else {
      if (newOppSub.trim()) {
        setOppSubs([...oppSubs, newOppSub.trim()]);
        setNewOppSub('');
      }
    }
  };

  // Helper to remove substitute
  const handleRemoveSub = (team: 'my' | 'opp', index: number) => {
    if (team === 'my') {
      setMySubs(mySubs.filter((_, idx) => idx !== index));
    } else {
      setOppSubs(oppSubs.filter((_, idx) => idx !== index));
    }
  };

  const handleSubNameChange = (team: 'my' | 'opp', index: number, value: string) => {
    if (team === 'my') {
      const updated = [...mySubs];
      updated[index] = value;
      setMySubs(updated);
    } else {
      const updated = [...oppSubs];
      updated[index] = value;
      setOppSubs(updated);
    }
  };

  // ─── STEP 2: MATCH SETTINGS STATE ──────────────────────────────────────────
  const [format, setFormat] = useState<'T5' | 'T10' | 'T15' | 'T20' | 'Custom'>('T20');
  const [customOvers, setCustomOvers] = useState('12');
  const [matchType, setMatchType] = useState('Friendly Match');



  // ─── STEP 3: VENUE MAP STATE ───────────────────────────────────────────────
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [mapRegion, setMapRegion] = useState({
    latitude: 25.0768,
    longitude: 55.1486,
    latitudeDelta: 0.0122,
    longitudeDelta: 0.0121,
  });

  interface SearchResultType {
    latitude: number;
    longitude: number;
    displayName: string;
    city: string;
    state: string;
    country: string;
  }

  const [venueName, setVenueName] = useState('SO/Uptown Dubai');
  const [groundName, setGroundName] = useState('Turf Ground 1');
  const [manualAddress, setManualAddress] = useState('First Al Khail St, JLT, Dubai');

  const [selectedLat, setSelectedLat] = useState<number>(25.0768);
  const [selectedLng, setSelectedLng] = useState<number>(55.1486);
  const [isVenueConfirmed, setIsVenueConfirmed] = useState<boolean>(false);
  const [mapLayout, setMapLayout] = useState<{ width: number; height: number }>({ width: 320, height: 160 });

  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<SearchResultType | null>(null);

  const syncLocationDetails = async (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setIsVenueConfirmed(false); // Reset confirmation status when location changes
    try {
      // If coordinates are in/near Coimbatore, Tamil Nadu
      if (lat > 10.5 && lat < 11.5 && lng > 76.5 && lng < 77.5) {
        setVenueName('Ukkadam Cricket Turf');
        setGroundName('Main Turf 1');
        setManualAddress('Ukkadam Bypass Road, Near Bus Stand, Coimbatore, Tamil Nadu 641001');
        return;
      }
      
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geocode && geocode.length > 0) {
        const item = geocode[0];
        const name = item.name || item.street || 'Selected Venue';
        const city = item.city || item.subregion || '';
        setVenueName(name);
        setGroundName('Ground 1');
        setManualAddress(item.formattedAddress || `${name}, ${city}`);
      } else {
        setVenueName('Selected Location');
        setGroundName('Turf Ground 1');
        setManualAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
      }
    } catch (e) {
      console.log('Error reverse geocoding:', e);
      if (lat > 10.5 && lat < 11.5 && lng > 76.5 && lng < 77.5) {
        setVenueName('Ukkadam Cricket Turf');
        setGroundName('Main Turf 1');
        setManualAddress('Ukkadam Bypass Road, Near Bus Stand, Coimbatore, Tamil Nadu 641001');
      } else {
        setVenueName('Selected Location');
        setGroundName('Turf Ground 1');
        setManualAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
      }
    }
  };

  const handleConfirmVenue = () => {
    if (!venueName.trim()) {
      Alert.alert('Validation Error', 'Please enter a Venue/Stadium Name.');
      return;
    }
    if (!manualAddress.trim()) {
      Alert.alert('Validation Error', 'Please enter a Manual Address.');
      return;
    }
    setIsVenueConfirmed(true);
    Alert.alert(
      'Venue Confirmed! 🏆',
      `Locked in: ${venueName}\nGround: ${groundName || 'Ground 1'}\nCoords: ${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`
    );
  };

  const handleClearSelection = () => {
    setVenueName('');
    setGroundName('');
    setManualAddress('');
    setSelectedLat(25.0768);
    setSelectedLng(55.1486);
    setMapRegion({
      latitude: 25.0768,
      longitude: 55.1486,
      latitudeDelta: 0.0122,
      longitudeDelta: 0.0121,
    });
    setIsVenueConfirmed(false);
  };

  const handleMapPress = (e: any) => {
    // Support both native and web event coordinate properties
    const locX = e.nativeEvent.locationX ?? e.nativeEvent.offsetX;
    const locY = e.nativeEvent.locationY ?? e.nativeEvent.offsetY;
    
    if (locX === undefined || locY === undefined) return;

    const { width, height } = mapLayout;
    if (!width || !height) return;

    const latDelta = mapRegion.latitudeDelta || 0.0122;
    const lngDelta = mapRegion.longitudeDelta || 0.0121;

    const clickLat = mapRegion.latitude - (locY - height / 2) * (latDelta / height);
    const clickLng = mapRegion.longitude + (locX - width / 2) * (lngDelta / width);

    if (isNaN(clickLat) || isNaN(clickLng)) return;

    setMapRegion({
      ...mapRegion,
      latitude: clickLat,
      longitude: clickLng,
    });
    syncLocationDetails(clickLat, clickLng);
  };

  const handleZoomIn = () => {
    setMapRegion(prev => {
      const newLatDelta = Math.max(prev.latitudeDelta / 2, 0.0005);
      const newLngDelta = Math.max(prev.longitudeDelta / 2, 0.0005);
      return {
        ...prev,
        latitudeDelta: newLatDelta,
        longitudeDelta: newLngDelta,
      };
    });
  };

  const handleZoomOut = () => {
    setMapRegion(prev => {
      const newLatDelta = Math.min(prev.latitudeDelta * 2, 0.2);
      const newLngDelta = Math.min(prev.longitudeDelta * 2, 0.2);
      return {
        ...prev,
        latitudeDelta: newLatDelta,
        longitudeDelta: newLngDelta,
      };
    });
  };

  const requestLocation = async (isManual = false) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setMapRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        });

        await syncLocationDetails(lat, lng);
      } else if (isManual) {
        Alert.alert(
          'Location Permission Denied 📍',
          'Please enable location permissions in your browser or device settings to automatically detect your current coordinates.'
        );
      }
    } catch (error) {
      console.log('Error requesting location:', error);
      if (isManual) {
        Alert.alert('Location Error', 'Unable to fetch your current location. Please try manually selecting on the map or searching.');
      }
    }
  };

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchVenue = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Empty Search', 'Please type in a city, ground name, or venue to search.');
      return;
    }

    setSearchLoading(true);
    setSearchResult(null);

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&addressdetails=1`;
      console.log('Fetching Nominatim API:', url);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CrickstreetApp/1.0 (infan@users.noreply.github.com)',
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim API returned HTTP status ${response.status}`);
      }

      const results = await response.json();
      console.log('Nominatim API Response:', JSON.stringify(results, null, 2));

      if (results && results.length > 0) {
        const item = results[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        if (isNaN(lat) || isNaN(lon)) {
          throw new Error('Invalid coordinates returned from Nominatim.');
        }

        // Extract detailed address parameters
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || 'N/A';
        const state = addr.state || addr.region || 'N/A';
        const country = addr.country || 'N/A';
        const displayName = item.display_name;

        // Auto-fill coordinates and input fields
        setSelectedLat(lat);
        setSelectedLng(lon);
        setMapRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.0122,
          longitudeDelta: 0.0121,
        });

        // Set text inputs automatically
        // First part of the displayName usually has the landmark/venue name
        const displayParts = displayName.split(',');
        const firstPart = displayParts[0] ? displayParts[0].trim() : searchQuery;
        setVenueName(firstPart);
        setGroundName('Ground 1');
        setManualAddress(displayName);
        setIsVenueConfirmed(false); // require confirmation

        // Save result info card state
        setSearchResult({
          latitude: lat,
          longitude: lon,
          displayName,
          city,
          state,
          country,
        });
      } else {
        Alert.alert('No Results', `No locations matched "${searchQuery}". Please check the spelling or search another location.`);
      }
    } catch (e: any) {
      console.log('Error searching location via Nominatim:', e);
      Alert.alert('Search Error', 'Unable to fetch location from OpenStreetMap. Please try again later.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Roster summaries
  const getFormatText = () => format === 'Custom' ? `${customOvers} Overs` : `${format} Format`;

  // ─── ACTIONS ───────────────────────────────────────────────────────────────
  const handleStartScoring = async () => {
    // Validate Step 1
    if (!myTeamName.trim()) {
      Alert.alert('Missing Team Name', 'Please fill in your Team Name.');
      return;
    }
    const opponentDisplay = oppTeamName.trim() || 'Opponent Team';

    // Firebase match storage data structure prefill
    const matchData = {
      myTeam: {
        name: myTeamName,
        captain: myCaptain,
        viceCaptain: myViceCaptain,
        players: myPlayers,
        substitutes: mySubs,
      },
      opponentTeam: {
        name: oppTeamName.trim() || null,
        captain: oppCaptain.trim() || null,
        viceCaptain: oppViceCaptain.trim() || null,
        players: oppPlayers.length > 0 ? oppPlayers : null,
        substitutes: oppSubs.length > 0 ? oppSubs : null,
      },
      settings: {
        format,
        customOvers: format === 'Custom' ? customOvers : null,
        matchType,
      },
      venue: {
        name: venueName,
        ground: groundName,
        address: manualAddress,
        latitude: selectedLat,
        longitude: selectedLng,
        confirmed: isVenueConfirmed,
      },
      createdAt: new Date().toISOString(),
      status: 'live', // Start scoring makes the match active (live)
    };
    console.log('Firebase ready match data structure:', JSON.stringify(matchData, null, 2));

    let matchId = '';
    if (user) {
      try {
        const colRef = collection(db, 'users', user.uid, 'matches');
        const docRef = await addDoc(colRef, {
          myTeamName,
          oppTeamName: opponentDisplay,
          format,
          matchType,
          venueName,
          status: 'live',
          createdAt: serverTimestamp(),
          myScore: '0/0',
          oppScore: '0/0',
          statusText: 'Match started',
        });
        matchId = docRef.id;
      } catch (err) {
        console.error('Error saving match to Firestore:', err);
      }
    }

    Alert.alert(
      'Match Initiated 🏏',
      `Match successfully created!\n${myTeamName} vs ${opponentDisplay} (${getFormatText()}, ${matchType}) at ${venueName}.`,
      [
        {
          text: 'Start Scoring',
          onPress: () => {
            router.replace({
              pathname: '/scorecard',
              params: {
                myTeamName,
                oppTeamName,
                myPlayers: JSON.stringify(myPlayers),
                oppPlayers: JSON.stringify(oppPlayers),
                matchId: matchId,
              },
            });
          }
        }
      ]
    );
  };

  const handleSaveDraft = () => {
    Alert.alert('Draft Saved 💾', 'Your match configurations are successfully saved locally as a draft.');
  };

  const handleCancel = () => {
    router.replace('/(tabs)');
  };

  const handleNextStep = () => {
    if (currentStep === 0 && !myTeamName.trim()) {
      Alert.alert('Roster Incomplete', 'Please fill in your Team Name before continuing.');
      return;
    }
    if (currentStep === 2 && !isVenueConfirmed) {
      Alert.alert('Venue Unconfirmed', 'Please confirm your venue selection by tapping "Confirm Venue" before continuing.');
      return;
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBackStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      handleCancel();
    }
  };

  // ─── RENDERS ───────────────────────────────────────────────────────────────

  const renderStepIndicator = () => {
    return (
      <View style={styles.indicatorContainer}>
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          return (
            <React.Fragment key={step}>
              <TouchableOpacity 
                style={styles.stepItem} 
                onPress={() => {
                  if (idx <= currentStep) {
                    setCurrentStep(idx);
                  } else if (idx === 1 && myTeamName.trim()) {
                    setCurrentStep(idx);
                  } else if (idx === 2 && myTeamName.trim()) {
                    setCurrentStep(idx);
                  } else if (idx === 3 && myTeamName.trim() && isVenueConfirmed) {
                    setCurrentStep(idx);
                  }
                }}
              >
                <View style={[
                  styles.stepBadge,
                  isActive && styles.stepBadgeActive,
                  isCompleted && styles.stepBadgeCompleted
                ]}>
                  {isCompleted ? (
                    <Feather name="check" size={14} color="#0A0D0A" />
                  ) : (
                    <Text style={[styles.stepBadgeText, isActive && styles.stepBadgeTextActive]}>{idx + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step}</Text>
              </TouchableOpacity>
              {idx < STEPS.length - 1 && (
                <View style={[styles.stepConnector, idx < currentStep && styles.stepConnectorCompleted]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const renderStep1TeamSetup = () => {
    return (
      <View style={styles.stepContent}>
        {/* MY TEAM */}
        <View style={styles.glassCard}>
          <Text style={styles.cardHeaderTitle}><MaterialCommunityIcons name="shield-check-outline" size={18} color={C.green} /> MY TEAM</Text>
          
          <Text style={styles.inputLabel}>TEAM NAME</Text>
          <TextInput
            style={styles.textInput}
            value={myTeamName}
            onChangeText={setMyTeamName}
            placeholder="e.g. Crickstreet CC"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>CAPTAIN NAME</Text>
              <TextInput
                style={styles.textInput}
                value={myCaptain}
                onChangeText={setMyCaptain}
                placeholder="Captain"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>VICE CAPTAIN NAME</Text>
              <TextInput
                style={styles.textInput}
                value={myViceCaptain}
                onChangeText={setMyViceCaptain}
                placeholder="Vice Captain"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>
          </View>

          {/* PLAYING XI LIST */}
          <TouchableOpacity 
            style={styles.sectionToggleButton}
            onPress={() => setShowMyXI(!showMyXI)}
          >
            <Text style={styles.sectionToggleTitle}>Playing XI Roster ({myPlayers.length}/11 Players)</Text>
            <Feather name={showMyXI ? "chevron-up" : "chevron-down"} size={16} color={C.green} />
          </TouchableOpacity>

          {showMyXI && (
            <View style={styles.playersList}>
              <View style={styles.subsContainer}>
                {myPlayers.map((player, idx) => (
                  <View key={idx} style={styles.subPill}>
                    <Text style={styles.subPillTxt}>{player}</Text>
                    <TouchableOpacity onPress={() => handleRemovePlayer('my', idx)}>
                      <Feather name="x" size={12} color="#EF4444" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              {myPlayers.length < 11 && (
                <View style={styles.addSubRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                    value={newMyPlayer}
                    onChangeText={setNewMyPlayer}
                    placeholder="Add Playing XI Player"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  <TouchableOpacity style={styles.smallAddBtn} onPress={() => handleAddPlayer('my')}>
                    <Text style={styles.smallAddBtnTxt}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* SUBSTITUTES */}
          <Text style={styles.subSectionLabel}>Substitute Players (Optional)</Text>
          <View style={styles.playersList}>
            {mySubs.map((sub, idx) => (
              <View key={idx} style={styles.playerInputRow}>
                <Text style={styles.playerSlotLabel}>S{idx + 1}</Text>
                <TextInput
                  style={styles.playerInput}
                  value={sub}
                  onChangeText={(val) => handleSubNameChange('my', idx, val)}
                  placeholder={`Substitute ${idx + 1}`}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
                <TouchableOpacity onPress={() => handleRemoveSub('my', idx)} style={{ padding: 4, paddingLeft: 8 }}>
                  <Feather name="x" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            
            <View style={[styles.playerInputRow, { marginTop: mySubs.length > 0 ? 4 : 0 }]}>
              <Text style={styles.playerSlotLabel}>+</Text>
              <TextInput
                style={[styles.playerInput, { marginBottom: 0 }]}
                value={newMySub}
                onChangeText={setNewMySub}
                placeholder="Add Sub Player"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <TouchableOpacity style={styles.smallAddBtn} onPress={() => handleAddSub('my')}>
                <Text style={styles.smallAddBtnTxt}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* OPPONENT TEAM */}
        <View style={[styles.glassCard, { marginTop: 16 }]}>
          <Text style={styles.cardHeaderTitle}><MaterialCommunityIcons name="shield-outline" size={18} color={C.green} /> OPPONENT TEAM</Text>
          
          <Text style={styles.inputLabel}>TEAM NAME</Text>
          <TextInput
            style={styles.textInput}
            value={oppTeamName}
            onChangeText={setOppTeamName}
            placeholder="e.g. Royal Strikers"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>CAPTAIN (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                value={oppCaptain}
                onChangeText={setOppCaptain}
                placeholder="Opp Captain"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>VICE CAPTAIN (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                value={oppViceCaptain}
                onChangeText={setOppViceCaptain}
                placeholder="Opp Vice Captain"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>
          </View>

          {/* PLAYING XI LIST */}
          <TouchableOpacity 
            style={styles.sectionToggleButton}
            onPress={() => setShowOppXI(!showOppXI)}
          >
            <Text style={styles.sectionToggleTitle}>Playing XI Roster ({oppPlayers.length}/11 Players)</Text>
            <Feather name={showOppXI ? "chevron-up" : "chevron-down"} size={16} color={C.green} />
          </TouchableOpacity>

          {showOppXI && (
            <View style={styles.playersList}>
              <View style={styles.subsContainer}>
                {oppPlayers.map((player, idx) => (
                  <View key={idx} style={styles.subPill}>
                    <Text style={styles.subPillTxt}>{player}</Text>
                    <TouchableOpacity onPress={() => handleRemovePlayer('opp', idx)}>
                      <Feather name="x" size={12} color="#EF4444" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              {oppPlayers.length < 11 && (
                <View style={styles.addSubRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                    value={newOppPlayer}
                    onChangeText={setNewOppPlayer}
                    placeholder="Add Playing XI Player"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  <TouchableOpacity style={styles.smallAddBtn} onPress={() => handleAddPlayer('opp')}>
                    <Text style={styles.smallAddBtnTxt}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* SUBSTITUTES */}
          <Text style={styles.subSectionLabel}>Substitute Players (Optional)</Text>
          <View style={styles.playersList}>
            {oppSubs.map((sub, idx) => (
              <View key={idx} style={styles.playerInputRow}>
                <Text style={styles.playerSlotLabel}>S{idx + 1}</Text>
                <TextInput
                  style={styles.playerInput}
                  value={sub}
                  onChangeText={(val) => handleSubNameChange('opp', idx, val)}
                  placeholder={`Substitute ${idx + 1}`}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
                <TouchableOpacity onPress={() => handleRemoveSub('opp', idx)} style={{ padding: 4, paddingLeft: 8 }}>
                  <Feather name="x" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            
            <View style={[styles.playerInputRow, { marginTop: oppSubs.length > 0 ? 4 : 0 }]}>
              <Text style={styles.playerSlotLabel}>+</Text>
              <TextInput
                style={[styles.playerInput, { marginBottom: 0 }]}
                value={newOppSub}
                onChangeText={setNewOppSub}
                placeholder="Add Sub Player"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <TouchableOpacity style={styles.smallAddBtn} onPress={() => handleAddSub('opp')}>
                <Text style={styles.smallAddBtnTxt}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderStep2MatchSetup = () => {
    const formats: ('T5' | 'T10' | 'T15' | 'T20' | 'Custom')[] = ['T5', 'T10', 'T15', 'T20', 'Custom'];
    const matchTypes = ['Friendly Match', 'Practice Match', 'Tournament Match', 'Knockout Match', 'League Match'];

    return (
      <View style={styles.stepContent}>
        {/* MATCH SETTINGS */}
        <View style={styles.glassCard}>
          <Text style={styles.cardHeaderTitle}><Feather name="sliders" size={16} color={C.green} /> MATCH SETTINGS</Text>
          
          <Text style={styles.inputLabel}>MATCH FORMAT</Text>
          <View style={styles.oversRowSelect}>
            {formats.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.overOption, format === f && styles.overOptionActive]}
                onPress={() => setFormat(f)}
              >
                <Text style={[styles.overOptionText, format === f && styles.overOptionTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {format === 'Custom' && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>CUSTOM OVERS COUNT</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={customOvers}
                onChangeText={setCustomOvers}
                placeholder="Enter custom overs count"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>
          )}

          <Text style={styles.inputLabel}>MATCH TYPE</Text>
          <View style={styles.dropdownGrid}>
            {matchTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.dropdownOption, matchType === type && styles.dropdownOptionActive]}
                onPress={() => setMatchType(type)}
              >
                <Text style={[styles.dropdownOptionText, matchType === type && styles.dropdownOptionTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderStep3Venue = () => {
    const activeGroundCoords = { latitude: selectedLat, longitude: selectedLng };

    return (
      <View style={styles.stepContent}>
        {/* VENUE LOCATION */}
        <View style={styles.glassCard}>
          <Text style={styles.cardHeaderTitle}><Ionicons name="location-outline" size={18} color={C.green} /> VENUE LOCATION</Text>

          {/* Search bar */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search Venue/Stadium..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              onSubmitEditing={handleSearchVenue}
            />
            <TouchableOpacity style={styles.searchIconBtn} onPress={handleSearchVenue}>
              <Feather name="search" size={16} color={C.white} />
            </TouchableOpacity>
          </View>

          {/* Interactive map display */}
          <TouchableOpacity 
            style={styles.mapContainer} 
            activeOpacity={0.95}
            onLayout={(e) => setMapLayout(e.nativeEvent.layout)}
            onPress={handleMapPress}
          >
            <PlaygroundMapView
              mapRegion={{
                latitude: selectedLat,
                longitude: selectedLng,
                latitudeDelta: mapRegion.latitudeDelta,
                longitudeDelta: mapRegion.longitudeDelta,
              }}
              onRegionChangeComplete={(r) => setMapRegion(r)}
              permissionStatus={permissionStatus}
              currentGroundCoords={activeGroundCoords}
              previousGroundCoords={{ latitude: activeGroundCoords.latitude - 0.003, longitude: activeGroundCoords.longitude - 0.003 }}
            />

            {/* Transparent layer to intercept pointer events over the map iframe */}
            <View style={StyleSheet.absoluteFillObject} />

            {/* Sync Badge Overlay */}
            <View style={styles.mapClickOverlay}>
              <Ionicons name="sync" size={12} color="#0A0D0A" />
              <Text style={styles.mapClickOverlayTxt}>Tap Map to Select Venue</Text>
            </View>

            {/* Zoom Controls Overlay */}
            <View style={styles.zoomControlsContainer}>
              <TouchableOpacity 
                style={styles.zoomBtn} 
                onPress={handleZoomIn}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={12} color="#0A0D0A" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.zoomBtn, { marginTop: 6 }]} 
                onPress={handleZoomOut}
                activeOpacity={0.8}
              >
                <Feather name="minus" size={12} color="#0A0D0A" />
              </TouchableOpacity>
            </View>

            {/* Permission overlay removed to always show the map and allow manual interactions */}
          </TouchableOpacity>

          {/* Selected Coordinates Readout Display */}
          <View style={styles.coordinatesRow}>
            <Text style={styles.coordinatesLabel}>📍 SELECTED COORDINATES</Text>
            <Text style={styles.coordinatesVal}>
              Lat: {selectedLat.toFixed(6)} | Lng: {selectedLng.toFixed(6)}
            </Text>
          </View>

          {/* Actions Row */}
          <View style={styles.venueActionsRow}>
            <TouchableOpacity style={styles.useCurrentLocBtn} onPress={() => requestLocation(true)}>
              <Ionicons name="locate" size={16} color="#0A0D0A" />
              <Text style={styles.useCurrentLocBtnTxt}>Use Current Location</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.clearSelectionBtn} onPress={handleClearSelection}>
              <Feather name="trash-2" size={14} color="#EF4444" />
              <Text style={styles.clearSelectionBtnTxt}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Nominatim Search Loading state */}
          {searchLoading && (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="small" color={C.green} />
              <Text style={styles.searchLoadingText}>Searching OpenStreetMap (Nominatim)...</Text>
            </View>
          )}

          {/* Nominatim Search Result Card */}
          {searchResult && (
            <View style={styles.searchResultCard}>
              <Text style={styles.searchResultHeader}>🗺️ SEARCH RESULT FOUND</Text>
              
              <View style={styles.searchResultDivider} />
              
              <View style={styles.searchResultRow}>
                <Text style={styles.searchResultLabel}>Display Name:</Text>
                <Text style={styles.searchResultValue}>{searchResult.displayName}</Text>
              </View>

              <View style={styles.searchResultGrid}>
                <View style={styles.searchResultGridItem}>
                  <Text style={styles.searchResultSubLabel}>City / Region</Text>
                  <Text style={styles.searchResultSubValue}>{searchResult.city}</Text>
                </View>
                <View style={styles.searchResultGridItem}>
                  <Text style={styles.searchResultSubLabel}>State</Text>
                  <Text style={styles.searchResultSubValue}>{searchResult.state}</Text>
                </View>
              </View>

              <View style={styles.searchResultGrid}>
                <View style={styles.searchResultGridItem}>
                  <Text style={styles.searchResultSubLabel}>Country</Text>
                  <Text style={styles.searchResultSubValue}>{searchResult.country}</Text>
                </View>
                <View style={styles.searchResultGridItem}>
                  <Text style={styles.searchResultSubLabel}>Coordinates</Text>
                  <Text style={[styles.searchResultSubValue, { color: C.green }]}>
                    {searchResult.latitude.toFixed(5)}, {searchResult.longitude.toFixed(5)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Venue details inputs */}
          <Text style={styles.inputLabel}>VENUE / STADIUM NAME</Text>
          <TextInput
            style={styles.textInput}
            value={venueName}
            onChangeText={(val) => {
              setVenueName(val);
              setIsVenueConfirmed(false);
            }}
            placeholder="Stadium or Arena Name"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={styles.inputLabel}>GROUND NAME / NO.</Text>
          <TextInput
            style={styles.textInput}
            value={groundName}
            onChangeText={(val) => {
              setGroundName(val);
              setIsVenueConfirmed(false);
            }}
            placeholder="Ground 1, Turf Main, etc."
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={styles.inputLabel}>MANUAL ADDRESS</Text>
          <TextInput
            style={[styles.textInput, { height: 72, textAlignVertical: 'top' }]}
            value={manualAddress}
            onChangeText={(val) => {
              setManualAddress(val);
              setIsVenueConfirmed(false);
            }}
            placeholder="Full location street address"
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline
            numberOfLines={3}
          />

          {/* Summary Card */}
          <View style={styles.venueSummaryCard}>
            <Text style={styles.venueSummaryTitle}>VENUE SUMMARY</Text>
            <View style={styles.venueSummaryDivider} />
            <View style={styles.venueSummaryRow}>
              <Text style={styles.venueSummaryLabel}>Venue:</Text>
              <Text style={styles.venueSummaryValue}>{venueName || 'Not selected'}</Text>
            </View>
            <View style={styles.venueSummaryRow}>
              <Text style={styles.venueSummaryLabel}>Ground:</Text>
              <Text style={styles.venueSummaryValue}>{groundName || 'Not selected'}</Text>
            </View>
            <View style={styles.venueSummaryRow}>
              <Text style={styles.venueSummaryLabel}>Coords:</Text>
              <Text style={styles.venueSummaryValue}>{selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}</Text>
            </View>
            <View style={styles.venueSummaryRow}>
              <Text style={styles.venueSummaryLabel}>Status:</Text>
              <Text style={[
                styles.venueSummaryValue, 
                { color: isVenueConfirmed ? C.green : '#EAB308', fontWeight: '800' }
              ]}>
                {isVenueConfirmed ? 'Confirmed 🟢' : 'Pending Confirmation 🟡'}
              </Text>
            </View>
          </View>

          {/* Confirmation Button */}
          <TouchableOpacity 
            style={[styles.confirmVenueBtn, isVenueConfirmed && styles.confirmVenueBtnActive]} 
            onPress={handleConfirmVenue}
          >
            <Feather name={isVenueConfirmed ? "check" : "check-circle"} size={16} color="#0A0D0A" style={{ marginRight: 6 }} />
            <Text style={styles.confirmVenueBtnTxt}>
              {isVenueConfirmed ? 'Venue Confirmed' : 'Confirm Venue Selection'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep4Review = () => {
    const opponentDisplay = oppTeamName.trim() || 'Opponent Team';

    return (
      <View style={styles.stepContent}>
        {/* MATCH SUMMARY CARD */}
        <View style={styles.glassCard}>
          <Text style={styles.cardHeaderTitle}><Feather name="file-text" size={16} color={C.green} /> MATCH SUMMARY CARD</Text>
          
          <View style={styles.summaryCard}>
            {/* Header info */}
            <View style={styles.summaryBadgeRow}>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeTxt}>{getFormatText()}</Text>
              </View>
              <View style={[styles.summaryBadge, { backgroundColor: 'rgba(89, 199, 73, 0.15)' }]}>
                <Text style={[styles.summaryBadgeTxt, { color: C.green }]}>{matchType}</Text>
              </View>
            </View>

            {/* Vs match title */}
            <View style={styles.vsHeadingContainer}>
              <Text style={styles.summaryTeamTitle}>{myTeamName}</Text>
              <Text style={styles.vsText}>VS</Text>
              <Text style={styles.summaryTeamTitle}>{opponentDisplay}</Text>
            </View>

            {/* Divider */}
            <View style={styles.summaryDivider} />

            {/* Meta specs */}
            <View style={styles.summarySpecList}>
              <View style={styles.specRow}>
                <Feather name="map-pin" size={14} color={C.green} />
                <Text style={styles.specVal}>{venueName} ({groundName || 'Ground 1'})</Text>
              </View>
              <View style={styles.specRow}>
                <Feather name="compass" size={14} color={C.green} />
                <Text style={styles.specVal}>GPS: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)} (Confirmed ✅)</Text>
              </View>
              <View style={styles.specRow}>
                <Feather name="user" size={14} color={C.green} />
                <Text style={styles.specVal}>Captains: {myCaptain} vs {oppCaptain || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={[styles.glassCard, { marginTop: 16 }]}>
          <Text style={styles.cardHeaderTitle}><Feather name="check-square" size={16} color={C.green} /> ACTION BUTTONS</Text>
          
          <View style={{ gap: 12, marginTop: 8 }}>
            <TouchableOpacity style={styles.startScoringBtn} onPress={handleStartScoring}>
              <Text style={styles.startScoringBtnTxt}>Start Scoring Live</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveDraftBtn} onPress={handleSaveDraft}>
              <Text style={styles.saveDraftBtnTxt}>Save Draft</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.hero} />

      {/* ─── Header ─── */}
      <View style={styles.hero}>
        <View style={styles.deco1} />
        <View style={styles.deco2} />

        <View style={{ height: insets.top > 0 ? insets.top + 6 : 28 }} />

        {/* Header navigation row */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBackStep}>
            <Feather name="chevron-left" size={24} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Match Setup Wizard</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stepper Indicator */}
        {renderStepIndicator()}

        <View style={styles.curve} />
      </View>

      {/* ─── Wizard Content ─── */}
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepWrapper}>
          {currentStep === 0 && renderStep1TeamSetup()}
          {currentStep === 1 && renderStep2MatchSetup()}
          {currentStep === 2 && renderStep3Venue()}
          {currentStep === 3 && renderStep4Review()}
        </View>

        {/* Next/Back Bottom Buttons for steps 0, 1, 2 */}
        {currentStep < 3 && (
          <View style={styles.navigationRow}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.navBackBtn} onPress={handleBackStep}>
                <Text style={styles.navBackBtnTxt}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.navNextBtn} onPress={handleNextStep}>
              <Text style={styles.navNextBtnTxt}>Next Step</Text>
              <Feather name="arrow-right" size={16} color={C.white} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0D0A', // Dark Premium Theme
  },
  hero: {
    backgroundColor: C.hero,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute',
    width: W * 0.60,
    height: W * 0.60,
    borderRadius: W * 0.30,
    backgroundColor: 'rgba(89,199,73,0.07)',
    top: -W * 0.18,
    right: -W * 0.14,
  },
  deco2: {
    position: 'absolute',
    width: W * 0.38,
    height: W * 0.38,
    borderRadius: W * 0.19,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: 30,
    left: -W * 0.10,
  },
  curve: {
    height: 28,
    backgroundColor: '#0A0D0A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // ── Stepper Indicator ──
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  stepBadgeActive: {
    backgroundColor: 'transparent',
    borderColor: C.green,
    borderWidth: 2,
  },
  stepBadgeCompleted: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  stepBadgeTextActive: {
    color: C.green,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.2,
  },
  stepLabelActive: {
    color: C.green,
  },
  stepConnector: {
    height: 2,
    flex: 0.6,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  stepConnectorCompleted: {
    backgroundColor: C.green,
  },

  // ── Layout Core ──
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  stepWrapper: {
    flex: 1,
    width: '100%',
  },
  stepContent: {
    width: '100%',
  },

  // ── Cards (Glassmorphism) ──
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.5,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#828880',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },

  // ── Playing XI Toggle & Input ──
  sectionToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(89, 199, 73, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(89, 199, 73, 0.2)',
    marginTop: 12,
  },
  sectionToggleTitle: {
    color: C.green,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  playersList: {
    marginTop: 12,
    gap: 8,
  },
  playerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerSlotLabel: {
    width: 28,
    fontSize: 11,
    fontWeight: '800',
    color: C.green,
    textAlign: 'center',
  },
  playerInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: C.white,
    fontSize: 12,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },

  // ── Substitutes ──
  subSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#828880',
    marginTop: 14,
    marginBottom: 6,
  },
  subsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  subPillTxt: {
    fontSize: 11,
    color: C.white,
    fontWeight: '600',
  },
  addSubRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  smallAddBtn: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAddBtnTxt: {
    color: '#0A0D0A',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Format & Match Settings ──
  oversRowSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  overOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  overOptionActive: {
    backgroundColor: 'rgba(89, 199, 73, 0.15)',
    borderColor: C.green,
  },
  overOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  overOptionTextActive: {
    color: C.green,
    fontWeight: '800',
  },
  dropdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(89,199,73,0.12)',
    borderColor: C.green,
  },
  dropdownOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  dropdownOptionTextActive: {
    color: C.green,
    fontWeight: '700',
  },

  // ── Toss & Match Details ──
  tossButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  tossOptionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tossOptionBtnActive: {
    backgroundColor: 'rgba(89, 199, 73, 0.15)',
    borderColor: C.green,
  },
  tossOptionBtnTxt: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '700',
  },
  tossOptionBtnTxtActive: {
    color: C.green,
    fontWeight: '800',
  },

  // ── Venue Map Section ──
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E201E',
    marginBottom: 10,
  },
  locationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 13, 10, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  overlayTxt: {
    color: '#828880',
    fontSize: 11,
    fontWeight: '600',
  },
  mapClickOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(89, 199, 73, 0.95)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mapClickOverlayTxt: {
    color: '#0A0D0A',
    fontSize: 10,
    fontWeight: '800',
  },
  zoomControlsContainer: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -32,
    flexDirection: 'column',
    zIndex: 10,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  coordinatesRow: {
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  coordinatesLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#828880',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  coordinatesVal: {
    fontSize: 12,
    fontWeight: '700',
    color: C.green,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  venueActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  useCurrentLocBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.green,
    paddingVertical: 12,
    borderRadius: 12,
  },
  useCurrentLocBtnTxt: {
    color: '#0A0D0A',
    fontSize: 12,
    fontWeight: '800',
  },
  clearSelectionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearSelectionBtnTxt: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchLoadingText: {
    color: '#828880',
    fontSize: 12,
    fontWeight: '700',
  },
  searchResultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(89, 199, 73, 0.15)',
    marginBottom: 16,
  },
  searchResultHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: C.green,
    letterSpacing: 0.8,
  },
  searchResultDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 8,
  },
  searchResultRow: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  searchResultLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#828880',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  searchResultValue: {
    fontSize: 12,
    fontWeight: '700',
    color: C.white,
    lineHeight: 16,
  },
  searchResultGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  searchResultGridItem: {
    flex: 1,
  },
  searchResultSubLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#828880',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  searchResultSubValue: {
    fontSize: 12,
    fontWeight: '700',
    color: C.white,
  },
  venueSummaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 14,
    marginVertical: 14,
  },
  venueSummaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.8,
  },
  venueSummaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 8,
  },
  venueSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  venueSummaryLabel: {
    fontSize: 11,
    color: '#828880',
    fontWeight: '600',
  },
  venueSummaryValue: {
    fontSize: 11,
    color: C.white,
    fontWeight: '700',
    maxWidth: '70%',
    textAlign: 'right',
  },
  confirmVenueBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  confirmVenueBtnActive: {
    backgroundColor: 'rgba(89, 199, 73, 0.15)',
    borderColor: C.green,
  },
  confirmVenueBtnTxt: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Match Summary Card ──
  summaryCard: {
    backgroundColor: '#131713',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
  },
  vsHeadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 6,
  },
  summaryTeamTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
    flex: 1,
    textAlign: 'center',
  },
  vsText: {
    fontSize: 12,
    fontWeight: '900',
    color: C.green,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  summarySpecList: {
    gap: 10,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },

  // ── Action Buttons ──
  startScoringBtn: {
    backgroundColor: C.green,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  startScoringBtnTxt: {
    color: '#0A0D0A',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  saveDraftBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: 'center',
  },
  saveDraftBtnTxt: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnTxt: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Navigation Buttons ──
  navigationRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  navBackBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBackBtnTxt: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
  },
  navNextBtn: {
    flex: 2,
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  navNextBtnTxt: {
    color: '#0A0D0A',
    fontSize: 13,
    fontWeight: '900',
  },
});
