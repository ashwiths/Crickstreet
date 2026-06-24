const React = require('react');

const MockComponent = (props) => {
  return React.createElement('div', props, props.children);
};

module.exports = {
  __esModule: true,
  default: MockComponent,
  MapView: MockComponent,
  Marker: MockComponent,
  Callout: MockComponent,
  Polygon: MockComponent,
  Polyline: MockComponent,
  Circle: MockComponent,
  Overlay: MockComponent,
  Heatmap: MockComponent,
  Geojson: MockComponent,
  UrlTile: MockComponent,
  LocalTile: MockComponent,
};
