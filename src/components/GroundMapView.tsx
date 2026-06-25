import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import WebView from 'react-native-webview';

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

interface GroundMapViewProps {
  latitude: number;
  longitude: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  isReadOnly?: boolean;
  isDark?: boolean;
  zoomLevel?: number;
}

export default function GroundMapView({
  latitude,
  longitude,
  onLocationSelect,
  isReadOnly = false,
  isDark,
  zoomLevel = 13,
}: GroundMapViewProps) {
  const cameraRef = useRef<any>(null);
  const webViewRef = useRef<any>(null);
  const systemScheme = useColorScheme();
  const activeDark = isDark !== undefined ? isDark : systemScheme === 'dark';

  // Save initial coordinates at mount to initialize the MapLibre map once
  const initialCoords = useRef({ latitude, longitude });

  // OpenFreeMap vector styles (no API keys needed, fast and clean)
  const styleUrl = useMemo(() => {
    return activeDark
      ? 'https://tiles.openfreemap.org/styles/dark'
      : 'https://tiles.openfreemap.org/styles/bright';
  }, [activeDark]);

  // Sync camera position when coordinates update on Native MapLibre
  useEffect(() => {
    if (cameraRef.current && isMapLibreSupported) {
      cameraRef.current.setCamera({
        centerCoordinate: [longitude, latitude],
        zoomLevel,
        animationDuration: 500,
      });
    }
  }, [latitude, longitude, zoomLevel]);

  // Sync camera position when coordinates update on WebView MapLibre GL JS
  useEffect(() => {
    if (!isMapLibreSupported && webViewRef.current) {
      const script = `
        window.postMessage(JSON.stringify({
          type: 'SET_LOCATION',
          latitude: ${latitude},
          longitude: ${longitude}
        }), '*');
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [latitude, longitude]);

  // Sync theme when dark/light mode switches on WebView
  useEffect(() => {
    if (!isMapLibreSupported && webViewRef.current) {
      const script = `
        window.postMessage(JSON.stringify({
          type: 'SET_THEME',
          isDark: ${activeDark}
        }), '*');
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [activeDark]);

  const handleMapPress = (event: any) => {
    if (!isReadOnly && onLocationSelect) {
      const [lng, lat] = event.geometry.coordinates;
      onLocationSelect(lat, lng);
    }
  };

  const handleMarkerDrag = (event: any) => {
    if (!isReadOnly && onLocationSelect) {
      const [lng, lat] = event.geometry.coordinates;
      onLocationSelect(lat, lng);
    }
  };

  // Receive click coordinates back from MapLibre GL JS inside WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === 'OSM_MAP_CLICK' && onLocationSelect) {
        onLocationSelect(data.latitude, data.longitude);
      }
    } catch (e) {
      console.log('Error parsing WebView message:', e);
    }
  };

  // Custom interactive MapLibre GL JS HTML used as WebView fallback
  const maplibreHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.3.0/dist/maplibre-gl.css" />
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: ${activeDark ? '#0A1628' : '#F3F4F1'};
          }
          .custom-pin-container {
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: ${isReadOnly ? 'default' : 'grab'};
          }
          .custom-pin-container:active {
            cursor: ${isReadOnly ? 'default' : 'grabbing'};
          }
          .custom-pin {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #A8CD55;
            border: 2px solid #FFFFFF;
            box-shadow: 0 0 10px rgba(168,205,85,0.8);
            position: relative;
          }
          .pulse {
            position: absolute;
            top: -6px;
            left: -6px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid #A8CD55;
            opacity: 0;
            animation: pulse-anim 1.8s infinite;
          }
          @keyframes pulse-anim {
            0% {
              transform: scale(0.5);
              opacity: 0.8;
            }
            100% {
              transform: scale(1.5);
              opacity: 0;
            }
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
            style: '${styleUrl}',
            center: [${initialCoords.current.longitude}, ${initialCoords.current.latitude}],
            zoom: ${zoomLevel},
            interactive: ${!isReadOnly},
            attributionControl: false
          });

          if (${!isReadOnly}) {
            map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: false }), 'top-right');
          }

          var containerEl = document.createElement('div');
          containerEl.className = 'custom-pin-container';

          var markerEl = document.createElement('div');
          markerEl.className = 'custom-pin';
          var pulseEl = document.createElement('div');
          pulseEl.className = 'pulse';
          markerEl.appendChild(pulseEl);
          containerEl.appendChild(markerEl);

          var marker = new maplibregl.Marker({
            element: containerEl,
            draggable: ${!isReadOnly}
          })
          .setLngLat([${initialCoords.current.longitude}, ${initialCoords.current.latitude}])
          .addTo(map);

          function notifyChange(lat, lng) {
            var payload = JSON.stringify({ type: 'OSM_MAP_CLICK', latitude: lat, longitude: lng });
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(payload);
            }
          }

          if (${!isReadOnly}) {
            map.on('click', function(e) {
              var lat = e.lngLat.lat;
              var lng = e.lngLat.lng;
              marker.setLngLat([lng, lat]);
              notifyChange(lat, lng);
            });

            marker.on('dragend', function() {
              var lngLat = marker.getLngLat();
              notifyChange(lngLat.lat, lngLat.lng);
            });
          }

          // Handle incoming updates from parent React Native context
          window.addEventListener('message', function(event) {
            if (!event.data) return;
            var data;
            try {
              data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            } catch(e) { return; }
            if (data.type === 'SET_LOCATION') {
              var lat = data.latitude;
              var lng = data.longitude;
              var curr = marker.getLngLat();
              var diffLat = Math.abs(curr.lat - lat);
              var diffLng = Math.abs(curr.lng - lng);
              if (diffLat > 0.00001 || diffLng > 0.00001) {
                marker.setLngLat([lng, lat]);
                if (diffLat > 0.002 || diffLng > 0.002) {
                  map.flyTo({ center: [lng, lat], zoom: map.getZoom(), speed: 1.2 });
                }
              }
            } else if (data.type === 'SET_THEME') {
              var darkUrl = data.isDark 
                ? 'https://tiles.openfreemap.org/styles/dark' 
                : 'https://tiles.openfreemap.org/styles/bright';
              map.setStyle(darkUrl);
            }
          });
        </script>
      </body>
      </html>
    `.trim();
  }, [styleUrl, zoomLevel, isReadOnly, activeDark]);

  // If native MapLibre is not compiled (Expo Go), render the vector map in WebViews
  if (!isMapLibreSupported || !MapLibreGL) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: maplibreHtml }}
          style={StyleSheet.absoluteFillObject}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    );
  }

  return (
    <MapLibreGL.MapView
      style={StyleSheet.absoluteFillObject}
      mapStyle={styleUrl}
      logoEnabled={false}
      attributionEnabled={false}
      onPress={handleMapPress}
      scrollEnabled={!isReadOnly}
      zoomEnabled={!isReadOnly}
      pitchEnabled={!isReadOnly}
      rotateEnabled={!isReadOnly}
    >
      <MapLibreGL.Camera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: [longitude, latitude],
          zoomLevel,
        }}
      />
      
      <MapLibreGL.PointAnnotation
        id="ground-marker"
        coordinate={[longitude, latitude]}
        draggable={!isReadOnly}
        onDragEnd={handleMarkerDrag}
      >
        <View style={styles.markerContainer}>
          <View style={styles.markerCircle}>
            <View style={styles.markerCenter} />
          </View>
        </View>
      </MapLibreGL.PointAnnotation>
    </MapLibreGL.MapView>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  markerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A8CD55',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0A1628',
  },
});
