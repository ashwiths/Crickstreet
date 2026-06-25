import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

interface PlaygroundMapViewProps {
  mapRegion: any;
  onRegionChangeComplete: any;
  permissionStatus: any;
  currentGroundCoords: { latitude: number; longitude: number };
  previousGroundCoords: any;
}

export default function PlaygroundMapView({
  mapRegion,
  currentGroundCoords,
  previousGroundCoords,
}: PlaygroundMapViewProps) {
  const lat = currentGroundCoords?.latitude ?? mapRegion?.latitude ?? 25.0768;
  const lng = currentGroundCoords?.longitude ?? mapRegion?.longitude ?? 55.1486;

  // Use mapRegion deltas to size the bounding box for dynamic zoom in/out
  const lngDelta = mapRegion?.longitudeDelta ?? 0.0121;

  // Calculate zoom level based on longitudeDelta
  const zoom = Math.max(1, Math.min(19, Math.round(Math.log2(360 / (lngDelta || 0.0121)))));

  // Re-calculate previous coords
  const prevLat = previousGroundCoords?.latitude ?? lat - 0.003;
  const prevLng = previousGroundCoords?.longitude ?? lng - 0.003;

  // Premium Custom MapLibre Document for Crickstreet dark sports aesthetic
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
            center: [${lng}, ${lat}],
            zoom: ${zoom},
            interactive: false,
            attributionControl: false
          });

          // Active marker (Cricket)
          var markerActiveEl = document.createElement('div');
          markerActiveEl.className = 'cricket-marker';
          markerActiveEl.innerHTML = '<span style="font-size: 18px; margin-top: -2px;">🏏</span>';
          new maplibregl.Marker({ element: markerActiveEl })
            .setLngLat([${lng}, ${lat}])
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
  }, [lat, lng, zoom, prevLat, prevLng]);

  const embedUrl = useMemo(() => `data:text/html;charset=utf-8,${encodeURIComponent(maplibreHtml)}`, [maplibreHtml]);

  return (
    <View style={styles.webMapContainer}>
      <iframe
        title="Crickstreet MapLibre Playground"
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
