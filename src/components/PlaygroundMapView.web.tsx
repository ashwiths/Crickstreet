import React from 'react';
import { StyleSheet, View } from 'react-native';

interface PlaygroundMapViewProps {
  mapRegion: any;
  onRegionChangeComplete: any;
  permissionStatus: any;
  currentGroundCoords: { latitude: number; longitude: number };
  previousGroundCoords: any;
}

export default function PlaygroundMapView({ currentGroundCoords }: PlaygroundMapViewProps) {
  const lat = currentGroundCoords?.latitude ?? 25.0768;
  const lng = currentGroundCoords?.longitude ?? 55.1486;
  
  // Construct real OpenStreetMap embed URL with dynamic bounding box and marker coordinate
  const delta = 0.005;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <View style={styles.webMapContainer}>
      <iframe
        title="Crickstreet OpenStreetMap Playground"
        width="100%"
        height="100%"
        src={embedUrl}
        style={{
          border: 0,
          borderRadius: 16,
          // Premium dark mode custom styling filter matching the sports theme
          filter: 'invert(90%) hue-rotate(185deg) brightness(85%) contrast(110%)',
        } as any}
        allowFullScreen
        loading="lazy"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webMapContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#151715',
    borderRadius: 16,
    overflow: 'hidden',
  },
});
