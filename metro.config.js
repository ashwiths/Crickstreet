const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'react-native-maps' || moduleName.startsWith('react-native-maps/'))) {
    return {
      filePath: path.resolve(__dirname, 'src/components/mocks/react-native-maps.js'),
      type: 'sourceFile',
    };
  }
  
  // Delegate to the default Metro resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
