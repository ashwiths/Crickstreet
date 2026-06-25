import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const systemScheme = useColorScheme();
  const activeDark = isDark !== undefined ? isDark : systemScheme === 'dark';

  // Save initial coordinates at mount to initialize the MapLibre map once
  const initialCoords = useRef({ latitude, longitude });

  // Style URL based on dark/light mode
  const styleUrl = useMemo(() => {
    return activeDark
      ? 'https://tiles.openfreemap.org/styles/dark'
      : 'https://tiles.openfreemap.org/styles/bright';
  }, [activeDark]);

  // Custom interactive MapLibre HTML (Initialized once using initial coords)
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
          /* Custom marker styling */
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
            width: 20px;
            height: 20px;
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
            width: 28px;
            height: 28px;
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

          // Add simple navigation controls (Zoom + Compass) if not read-only
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
            window.parent.postMessage({ type: 'OSM_MAP_CLICK', latitude: lat, longitude: lng }, '*');
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

          // Handle incoming location/theme changes dynamically
          window.addEventListener('message', function(event) {
            if (!event.data) return;
            if (event.data.type === 'SET_LOCATION') {
              var lat = event.data.latitude;
              var lng = event.data.longitude;
              var curr = marker.getLngLat();
              var diffLat = Math.abs(curr.lat - lat);
              var diffLng = Math.abs(curr.lng - lng);
              if (diffLat > 0.00001 || diffLng > 0.00001) {
                marker.setLngLat([lng, lat]);
                if (diffLat > 0.002 || diffLng > 0.002) {
                  map.flyTo({ center: [lng, lat], zoom: map.getZoom(), speed: 1.2 });
                }
              }
            } else if (event.data.type === 'SET_THEME') {
              var darkUrl = event.data.isDark 
                ? 'https://tiles.openfreemap.org/styles/dark' 
                : 'https://tiles.openfreemap.org/styles/bright';
              map.setStyle(darkUrl);
            }
          });
        </script>
      </body>
      </html>
    `.trim();
  }, [styleUrl, isReadOnly, activeDark, zoomLevel]);

  const embedUrl = useMemo(() => `data:text/html;charset=utf-8,${encodeURIComponent(maplibreHtml)}`, [maplibreHtml]);

  // Handle incoming map click events from within iframe
  useEffect(() => {
    if (isReadOnly || !onLocationSelect) return;

    const handleWebMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OSM_MAP_CLICK') {
        const { latitude: lat, longitude: lng } = event.data;
        onLocationSelect(lat, lng);
      }
    };

    window.addEventListener('message', handleWebMessage);
    return () => window.removeEventListener('message', handleWebMessage);
  }, [isReadOnly, onLocationSelect]);

  // Push updates to iframe whenever the parent coordinates or theme state updates
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'SET_LOCATION',
          latitude,
          longitude,
        },
        '*'
      );
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'SET_THEME',
          isDark: activeDark,
        },
        '*'
      );
    }
  }, [activeDark]);

  return (
    <View style={styles.webMapContainer}>
      <iframe
        ref={iframeRef}
        title="Ground MapLibre Selector Web"
        width="100%"
        height="100%"
        src={embedUrl}
        style={{ border: 0 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webMapContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#151715',
    overflow: 'hidden',
  },
});
