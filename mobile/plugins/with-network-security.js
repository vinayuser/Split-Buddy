const { withAndroidManifest } = require('@expo/config-plugins');

const withNetworkSecurity = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application) {
      return config;
    }

    const application = manifest.application[0];
    
    // Add networkSecurityConfig if it doesn't exist
    if (!application.$['android:networkSecurityConfig']) {
      application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }

    return config;
  });
};

module.exports = withNetworkSecurity;

