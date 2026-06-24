import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

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
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Save initial coordinates at mount to initialize the Leaflet map once
  const initialCoords = useRef({ latitude, longitude });

  // Custom interactive Leaflet HTML (Initialized once using initial coords)
  const leafletHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body, #map {
            height: 100%;
            margin: 0;
            padding: 0;
            background: #111311;
          }
          .leaflet-tile-container {
            filter: invert(90%) hue-rotate(185deg) brightness(85%) contrast(110%);
          }
          .custom-pin {
            width: 18px;
            height: 18px;
            border-radius: 50% 50% 50% 0;
            background: #A8CD55;
            position: absolute;
            transform: rotate(-45deg);
            left: 50%;
            top: 50%;
            margin: -9px 0 0 -9px;
            box-shadow: 0 0 8px rgba(168,205,85,0.7);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          var map = L.map('map', {
            zoomControl: ${!isReadOnly},
            attributionControl: false,
            dragging: ${!isReadOnly},
            scrollWheelZoom: ${!isReadOnly},
            doubleClickZoom: ${!isReadOnly},
            boxZoom: ${!isReadOnly},
            touchZoom: ${!isReadOnly},
            keyboard: ${!isReadOnly}
          }).setView([${initialCoords.current.latitude}, ${initialCoords.current.longitude}], 13);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

          var markerIcon = L.divIcon({
            className: 'custom-icon',
            html: '<div class="custom-pin"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 18]
          });

          var marker = L.marker([${initialCoords.current.latitude}, ${initialCoords.current.longitude}], {
            icon: markerIcon,
            draggable: ${!isReadOnly}
          }).addTo(map);

          function notifyChange(lat, lng) {
            window.parent.postMessage({ type: 'OSM_MAP_CLICK', latitude: lat, longitude: lng }, '*');
          }

          if (${!isReadOnly}) {
            map.on('click', function(e) {
              var lat = e.latlng.lat;
              var lng = e.latlng.lng;
              marker.setLatLng(e.latlng);
              notifyChange(lat, lng);
            });

            marker.on('dragend', function() {
              var lat = marker.getLatLng().lat;
              var lng = marker.getLatLng().lng;
              notifyChange(lat, lng);
            });
          }

          // Handle incoming location changes from parent smoothly
          window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'SET_LOCATION') {
              var lat = event.data.latitude;
              var lng = event.data.longitude;
              var curr = marker.getLatLng();
              if (Math.abs(curr.lat - lat) > 0.00001 || Math.abs(curr.lng - lng) > 0.00001) {
                marker.setLatLng([lat, lng]);
                map.setView([lat, lng], map.getZoom());
              }
            }
          });
        </script>
      </body>
      </html>
    `.trim();
  }, [isReadOnly]);

  const embedUrl = useMemo(() => `data:text/html;charset=utf-8,${encodeURIComponent(leafletHtml)}`, [leafletHtml]);

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

  // Push updates to iframe whenever the parent coordinates state updates
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

  return (
    <View style={styles.webMapContainer}>
      <iframe
        ref={iframeRef}
        title="Ground OSM Selector Web"
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
