import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#1C1E1C" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8b908a" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1c1e1c" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#2a2d2a" }] },
  { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#1E201E" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#202320" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2d302c" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#252825" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#101210" }] }
];

interface PlaygroundMapViewProps {
  mapRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onRegionChangeComplete: (region: any) => void;
  permissionStatus: string | null;
  currentGroundCoords: { latitude: number; longitude: number };
  previousGroundCoords: { latitude: number; longitude: number };
}

export default function PlaygroundMapView({
  mapRegion,
  onRegionChangeComplete,
  permissionStatus,
  currentGroundCoords,
  previousGroundCoords,
}: PlaygroundMapViewProps) {
  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      region={mapRegion}
      onRegionChangeComplete={onRegionChangeComplete}
      customMapStyle={darkMapStyle}
      showsUserLocation={permissionStatus === 'granted'}
      showsMyLocationButton={false}
    >
      {/* Now Playing Ground (Primary Marker with Cricket Icon) */}
      <Marker
        coordinate={currentGroundCoords}
        title="Now Playing: SO/Uptown Dubai"
        description="Active Match Ground"
      >
        <View style={styles.customMarkerContainer}>
          <View style={styles.customMarkerCircle}>
            <Text style={{ fontSize: 20 }}>🏏</Text>
          </View>
          <View style={styles.customMarkerArrow} />
        </View>
      </Marker>

      {/* Previous Ground Marker */}
      <Marker
        coordinate={previousGroundCoords}
        title="Previous Ground"
        description="Last Played: Crickstreet Turf"
      >
        <View style={[styles.customMarkerContainer, { opacity: 0.8 }]}>
          <View style={[styles.customMarkerCircle, { backgroundColor: '#E2E8F0', width: 36, height: 36, borderRadius: 18 }]}>
            <Text style={{ fontSize: 16 }}>🏟️</Text>
          </View>
          <View style={[styles.customMarkerArrow, { borderTopColor: '#E2E8F0' }]} />
        </View>
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  customMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customMarkerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  customMarkerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.85)',
    marginTop: -1,
  },
});
