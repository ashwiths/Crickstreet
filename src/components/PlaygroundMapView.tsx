import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';

let MapLibreGL: any = null;
let isMapLibreSupported = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  MapLibreGL = require('@maplibre/maplibre-react-native').default;
  if (MapLibreGL) {
    MapLibreGL.setAccessToken(null);
    isMapLibreSupported = true;
  }
} catch (e) {
  console.warn('MapLibre React Native is not supported in this environment (e.g. Expo Go):', e);
}

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
  const cameraRef = useRef<any>(null);

  const { latitude, longitude, longitudeDelta } = mapRegion;

  // Sync camera position when mapRegion changes from parent component
  useEffect(() => {
    if (cameraRef.current && isMapLibreSupported) {
      cameraRef.current.setCamera({
        centerCoordinate: [longitude, latitude],
        zoomLevel: Math.max(1, Math.min(19, Math.round(Math.log2(360 / (longitudeDelta || 0.0121))))),
        animationDuration: 500,
      });
    }
  }, [latitude, longitude, longitudeDelta]);

  const handleRegionChange = (event: any) => {
    if (!onRegionChangeComplete) return;
    
    const props = event.properties || event.nativeEvent?.properties;
    const geom = event.geometry || event.nativeEvent?.geometry;
    
    if (props && geom) {
      const [lng, lat] = geom.coordinates;
      const bounds = props.visibleBounds;
      let latitudeDelta = mapRegion.latitudeDelta;
      let longitudeDelta = mapRegion.longitudeDelta;
      
      if (bounds && bounds.length >= 2) {
        latitudeDelta = Math.abs(bounds[0][1] - bounds[1][1]);
        longitudeDelta = Math.abs(bounds[0][0] - bounds[1][0]);
      }
      
      onRegionChangeComplete({
        latitude: lat,
        longitude: lng,
        latitudeDelta,
        longitudeDelta,
      });
    }
  };

  // Custom interactive MapLibre GL JS HTML used as WebView fallback for multi-marker layout
  const maplibreHtml = useMemo(() => {
    const calculatedZoom = Math.max(1, Math.min(19, Math.round(Math.log2(360 / (longitudeDelta || 0.0121)))));
    const activeLat = currentGroundCoords?.latitude ?? latitude;
    const activeLng = currentGroundCoords?.longitude ?? longitude;
    const prevLat = previousGroundCoords?.latitude ?? activeLat - 0.003;
    const prevLng = previousGroundCoords?.longitude ?? activeLng - 0.003;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.3.0/dist/maplibre-gl.css" />
        <style>
          html, body, #map {
            height: 100%;
            margin: 0;
            padding: 0;
            background: #111311;
          }
          /* Custom cricket marker styling */
          .cricket-marker {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255,255,255,0.9);
            border: 2px solid #59C749;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(89, 199, 73, 0.4);
            position: relative;
          }
          .cricket-marker::after {
            content: '';
            position: absolute;
            bottom: -6px;
            left: 15px;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid #59C749;
          }
          /* Custom history/previous marker styling */
          .history-marker {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #E2E8F0;
            border: 2px solid #94A3B8;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            opacity: 0.85;
            position: relative;
          }
          .history-marker::after {
            content: '';
            position: absolute;
            bottom: -6px;
            left: 11px;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid #94A3B8;
          }
          .maplibregl-ctrl-logo, .maplibregl-ctrl-attrib {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/maplibre-gl@4.3.0/dist/maplibre-gl.js"></script>
        <script>
          var map = new maplibregl.Map({
            container: 'map',
            style: 'https://tiles.openfreemap.org/styles/dark',
            center: [${longitude}, ${latitude}],
            zoom: ${calculatedZoom},
            interactive: false,
            attributionControl: false
          });

          // Active marker (Cricket)
          var markerActiveEl = document.createElement('div');
          markerActiveEl.className = 'cricket-marker';
          markerActiveEl.innerHTML = '<span style="font-size: 18px; margin-top: -2px;">🏏</span>';
          new maplibregl.Marker({ element: markerActiveEl })
            .setLngLat([${activeLng}, ${activeLat}])
            .addTo(map);

          // Previous marker (Stadium)
          var markerPrevEl = document.createElement('div');
          markerPrevEl.className = 'history-marker';
          markerPrevEl.innerHTML = '<span style="font-size: 14px;">🏟️</span>';
          new maplibregl.Marker({ element: markerPrevEl })
            .setLngLat([${prevLng}, ${prevLat}])
            .addTo(map);
        </script>
      </body>
      </html>
    `.trim();
  }, [latitude, longitude, longitudeDelta, currentGroundCoords, previousGroundCoords]);

  // Fallback to web-based multi-marker rendering in WebView inside Expo Go
  if (!isMapLibreSupported || !MapLibreGL) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <WebView
          originWhitelist={['*']}
          source={{ html: maplibreHtml }}
          style={StyleSheet.absoluteFillObject}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    );
  }

  return (
    <MapLibreGL.MapView
      style={StyleSheet.absoluteFillObject}
      mapStyle="https://tiles.openfreemap.org/styles/dark"
      logoEnabled={false}
      attributionEnabled={false}
      onRegionDidChange={handleRegionChange}
    >
      <MapLibreGL.Camera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: [mapRegion.longitude, mapRegion.latitude],
          zoomLevel: 13,
        }}
      />

      {permissionStatus === 'granted' && <MapLibreGL.UserLocation visible={true} />}

      {/* Now Playing Ground (Primary Marker with Cricket Icon) */}
      {currentGroundCoords && (
        <MapLibreGL.PointAnnotation
          id="current-ground-marker"
          coordinate={[currentGroundCoords.longitude, currentGroundCoords.latitude]}
          title="Active Match Ground"
        >
          <View style={styles.customMarkerContainer}>
            <View style={styles.customMarkerCircle}>
              <Text style={{ fontSize: 20 }}>🏏</Text>
            </View>
            <View style={styles.customMarkerArrow} />
          </View>
        </MapLibreGL.PointAnnotation>
      )}

      {/* Previous Ground Marker */}
      {previousGroundCoords && (
        <MapLibreGL.PointAnnotation
          id="previous-ground-marker"
          coordinate={[previousGroundCoords.longitude, previousGroundCoords.latitude]}
          title="Previous Ground"
        >
          <View style={[styles.customMarkerContainer, { opacity: 0.8 }]}>
            <View style={[styles.customMarkerCircle, { backgroundColor: '#E2E8F0', width: 36, height: 36, borderRadius: 18 }]}>
              <Text style={{ fontSize: 16 }}>🏟️</Text>
            </View>
            <View style={[styles.customMarkerArrow, { borderTopColor: '#E2E8F0' }]} />
          </View>
        </MapLibreGL.PointAnnotation>
      )}
    </MapLibreGL.MapView>
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
