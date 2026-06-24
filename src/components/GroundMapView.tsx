import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

interface GroundMapViewProps {
  latitude: number;
  longitude: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  isReadOnly?: boolean;
}

export default function GroundMapView({
  latitude,
  longitude,
  onLocationSelect,
  isReadOnly = false,
}: GroundMapViewProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        500
      );
    }
  }, [latitude, longitude]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }}
      scrollEnabled={!isReadOnly}
      zoomEnabled={!isReadOnly}
      pitchEnabled={!isReadOnly}
      rotateEnabled={!isReadOnly}
      onPress={(e: any) => {
        if (!isReadOnly && onLocationSelect) {
          const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
          onLocationSelect(lat, lng);
        }
      }}
    >
      <Marker
        coordinate={{ latitude, longitude }}
        draggable={!isReadOnly}
        onDragEnd={(e: any) => {
          if (!isReadOnly && onLocationSelect) {
            const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
            onLocationSelect(lat, lng);
          }
        }}
      />
    </MapView>
  );
}
