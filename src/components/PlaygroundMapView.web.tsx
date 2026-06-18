import React from 'react';
import { StyleSheet, View } from 'react-native';

interface PlaygroundMapViewProps {
  mapRegion: any;
  onRegionChangeComplete: any;
  permissionStatus: any;
  currentGroundCoords: { latitude: number; longitude: number };
  previousGroundCoords: any;
}

export default function PlaygroundMapView({ mapRegion, currentGroundCoords }: PlaygroundMapViewProps) {
  const lat = currentGroundCoords?.latitude ?? mapRegion?.latitude ?? 25.0768;
  const lng = currentGroundCoords?.longitude ?? mapRegion?.longitude ?? 55.1486;
  
  // Use mapRegion deltas to size the bounding box for dynamic zoom in/out
  const lngDelta = mapRegion?.longitudeDelta ?? 0.0121;
  
  // Calculate zoom level based on longitudeDelta
  const zoom = Math.max(1, Math.min(19, Math.round(Math.log2(360 / (lngDelta || 0.0121)))));

  // Premium Custom Leaflet Document for Crickstreet dark sports aesthetic
  const leafletHtml = `
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
    /* Crickstreet Custom Dark Styling Filter for Map Tiles */
    .leaflet-tile-container {
      filter: invert(90%) hue-rotate(185deg) brightness(85%) contrast(110%);
    }
    .leaflet-container {
      background: #111311 !important;
    }
    /* Style the custom marker to look like Crickstreet green pin */
    .custom-pin {
      width: 20px;
      height: 20px;
      border-radius: 50% 50% 50% 0;
      background: #59C749;
      position: absolute;
      transform: rotate(-45deg);
      left: 50%;
      top: 50%;
      margin: -10px 0 0 -10px;
      box-shadow: 0 0 12px rgba(89, 199, 73, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .custom-pin::after {
      content: '';
      width: 8px;
      height: 8px;
      margin: -1px 0 0 0;
      background: #0A0D0A;
      position: absolute;
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoom: false,
      keyboard: false
    }).setView([${lat}, ${lng}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Custom HTML marker matching Crickstreet neon green theme
    var greenIcon = L.divIcon({
      className: 'custom-icon',
      html: '<div class="custom-pin"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 20]
    });

    L.marker([${lat}, ${lng}], { icon: greenIcon }).addTo(map);
  </script>
</body>
</html>
  `.trim();

  const embedUrl = `data:text/html;charset=utf-8,${encodeURIComponent(leafletHtml)}`;

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

