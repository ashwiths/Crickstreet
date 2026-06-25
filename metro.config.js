const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const metroResolver = require('metro-resolver');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Mock react-native-maps on web
  if (platform === 'web' && (moduleName === 'react-native-maps' || moduleName.startsWith('react-native-maps/'))) {
    return {
      filePath: path.resolve(__dirname, 'src/components/mocks/react-native-maps.js'),
      type: 'sourceFile',
    };
  }
  
  // Directly delegate to Metro's default resolver using metro-resolver
  return metroResolver.resolve(context, moduleName, platform);
};

module.exports = config;
