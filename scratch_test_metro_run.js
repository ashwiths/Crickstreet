try {
  const config = require('./metro.config.js');
  console.log('Successfully loaded metro.config.js');
} catch (e) {
  console.error('Failed to load metro.config.js:', e);
  process.exit(1);
}
