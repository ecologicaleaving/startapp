const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package exports to fix white screen issues with SDK 53
// This resolves the "dual package hazard" where both ESM and CommonJS 
// versions of libraries get loaded simultaneously
config.resolver.unstable_enablePackageExports = false;

module.exports = config;